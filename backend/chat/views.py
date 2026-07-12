import base64
import time
import json
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.http import StreamingHttpResponse

from .models import Conversation, Message
from .serializers import ConversationSerializer, ChatRequestSerializer
from .pipeline import normalizer, ontology, llm, intent
from data_werehouse import ch_facts


def _sse_map_action(payload: dict, elapsed: float, progress: int) -> str:
    """Serializes a MapAction for SSE in base64.

    The JSON may contain `:`, `|`, line breaks — base64 makes it opaque
    to the pipe-separated SSE protocol delimiters. The frontend decodes via atob().
    """
    encoded = base64.b64encode(json.dumps(payload).encode("utf-8")).decode("ascii")
    return f"data: map_action:{encoded}|{elapsed}|{progress}\n\n"


# Sentinels to escape characters that break the pipe-delimited SSE format:
#   `\n` would split `data: token:...` into two lines (remainder would be orphaned)
#   `|` would be split by the frontend, losing the end of TEXT (broken tables)
# Choice: control characters U+0001/U+0002 — impossible in normal LLM text.
_SSE_NL_SENTINEL = ""
_SSE_PIPE_SENTINEL = ""


def _encode_sse_text(text: str) -> str:
    """Escapes \\n and | in a text fragment before SSE insertion."""
    if not text:
        return text
    return (
        text
        .replace("\r", "")  # Mac line endings — drop them
        .replace("\n", _SSE_NL_SENTINEL)
        .replace("|", _SSE_PIPE_SENTINEL)
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def stream_chat(request):
    """
    POST /api/chat/stream/
    Full streaming pipeline: normalizer → ontology (guardrail) → RAG → LLM.
    SSE protocol:
      data: start|0|0
      data: thinking:STAGE|ELAPSED|PROGRESS
      data: token:TEXT|ELAPSED|PROGRESS
      data: end|ELAPSED|100
      data: error|0|0|MESSAGE
    """
    user_message = request.data.get("message", "").strip()

    if not user_message:
        return Response(
            {"error": 'The "message" field is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Early bail-out: LLM not configured ──
    # Skip running ontology + RAG for nothing and clearly tell
    # the user that the model is not connected.
    if not getattr(llm, "COLAB_LLM_URL", "").strip():
        def _llm_offline():
            yield "data: start|0|0\n\n"
            yield (
                "data: error|0|0|"
                "The LLM model is not yet connected. "
                "Configure COLAB_LLM_URL in Render → Environment.\n\n"
            )
        return StreamingHttpResponse(_llm_offline(), content_type="text/event-stream")

    def generate():
        start_time = time.time()
        yield "data: start|0|0\n\n"

        try:
            # ── Step 1: Normalization ───────────────────────────────────────
            yield "data: thinking:Analyzing the question...|0|5\n\n"
            normalized = normalizer.normalize(user_message)

            # ── Step 2: Ontological validation (off-topic guardrail) ───────
            yield "data: thinking:Validating agricultural domain...|0|15\n\n"
            onto_result = ontology.validate_and_enrich(normalized)

            if not onto_result["is_valid"]:
                # Question out of domain → return rejection message
                rejection = onto_result["rejection_reason"]
                elapsed = round(time.time() - start_time, 1)
                yield f"data: offtopic:{rejection}|{elapsed}|100\n\n"
                yield f"data: end|{elapsed}|100\n\n"
                return

            # ── Step 3: ClickHouse lookup (factual figures) ───────────────
            # RAG (embed + FAISS) now runs on Colab. Render
            # additionally provides CH facts to anchor the response to
            # official data warehouse data.
            yield "data: thinking:Consulting official data...|0|30\n\n"
            try:
                ch_block = ch_facts.fetch_facts(
                    onto_result.get("context_tags", []),
                    onto_result.get("matched_keywords", []),
                )
            except Exception:
                ch_block = ""

            # Indicative score for the frontend ("data" chip)
            rag_score = 75 if ch_block else 0
            yield f"data: rag_score:{rag_score}|0\n\n"
            if ch_block:
                yield f"data: source:ClickHouse Madagascar|data_warehouse|90\n\n"

            # ── Step 4: Intent pipeline with map_action + LLM generation ──
            # `intent.run_intent` orchestrates:
            #   - extract_rules: rules → partial MapAction
            #   - confidence_level: decides fast-path / slow-path / bypass
            #   - fetch_map_data: enriches with ClickHouse data
            #   - LLM streaming (with or without <map_action> instructions)
            yield "data: thinking:Generating response...|0|45\n\n"
            onto_with_ch = {**onto_result, "ch_facts": ch_block}

            last_progress = 45
            for ev in intent.run_intent(onto_with_ch, user_message, history=[]):
                elapsed = round(time.time() - start_time, 1)
                kind = ev["event"]

                if kind == "thinking":
                    yield f"data: thinking:{ev['stage']}|{elapsed}|{last_progress}\n\n"
                elif kind == "map_action":
                    yield _sse_map_action(ev["payload"], elapsed, last_progress)
                elif kind == "token":
                    # LLM progress 0-100 → band 45-99 of global progress
                    progress = min(45 + int(ev.get("progress", 0) * 0.54), 99)
                    last_progress = progress
                    safe_text = _encode_sse_text(ev["text"])
                    yield f"data: token:{safe_text}|{elapsed}|{progress}\n\n"
                elif kind == "error":
                    yield f"data: error|{elapsed}|0|{ev['message']}\n\n"
                    return

            elapsed = round(time.time() - start_time, 1)
            yield f"data: end|{elapsed}|100\n\n"

        except Exception as e:
            yield f"data: error|0|0|{str(e)}\n\n"

    return StreamingHttpResponse(generate(), content_type="text/event-stream")


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def chat(request):
    """
    POST /api/chat/
    Executes the full pipeline: normalizer → ontology → RAG → LLM
    """
    serializer = ChatRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user_message = serializer.validated_data["message"]
    conversation_id = serializer.validated_data.get("conversation_id")

    # Retrieve or create the conversation
    if conversation_id:
        try:
            conversation = Conversation.objects.get(
                pk=conversation_id, user=request.user
            )
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND
            )
    else:
        title = user_message[:60] + ("…" if len(user_message) > 60 else "")
        conversation = Conversation.objects.create(user=request.user, title=title)

    # Conversation history for the LLM
    history = list(
        conversation.messages.values("role", "content").order_by("created_at")
    )

    # === Pipeline ===
    t0 = time.time()

    # 1. Normalization
    normalized = normalizer.normalize(user_message)

    # 2. Ontology
    onto_result = ontology.validate_and_enrich(normalized)

    thinking = ""

    if not onto_result["is_valid"]:
        # Guardrail: question out of domain
        bot_reply = onto_result["rejection_reason"]
        pipeline_meta = {
            "guardrail": True,
            "latency_ms": round((time.time() - t0) * 1000),
        }
        ch_block = ""
    else:
        # 3. ClickHouse facts (official yields/prices)
        try:
            ch_block = ch_facts.fetch_facts(
                onto_result.get("context_tags", []),
                onto_result.get("matched_keywords", []),
            )
        except Exception as ch_err:
            import logging
            logging.getLogger(__name__).warning("CH facts error: %s", ch_err)
            ch_block = ""

        # 4. LLM (Colab handles RAG internally with its vector_store)
        full_context = {**onto_result, "ch_facts": ch_block}
        llm_result = llm.generate(full_context, history=history)
        bot_reply = llm_result["reply"]
        thinking = llm_result.get("thinking", "")
        input_tok = llm_result.get("input_tokens", 0)
        output_tok = llm_result.get("output_tokens", 0)
        llm_latency = llm_result.get("latency_ms", 0)

        pipeline_meta = {
            "guardrail": False,
            "context_tags": onto_result.get("context_tags", []),
            "has_ch_facts": bool(ch_block),
            "language": normalized["language"],
            "latency_ms": round((time.time() - t0) * 1000),
            "input_tokens": input_tok,
            "output_tokens": output_tok,
            "llm_latency_ms": llm_latency,
        }

    # Save messages
    Message.objects.create(
        conversation=conversation,
        role=Message.ROLE_USER,
        content=user_message,
        pipeline_meta={},
    )
    Message.objects.create(
        conversation=conversation,
        role=Message.ROLE_ASSISTANT,
        content=bot_reply,
        sources=["ClickHouse Madagascar"] if ch_block else [],
        pipeline_meta=pipeline_meta,
    )

    return Response(
        {
            "conversation_id": conversation.pk,
            "reply": bot_reply,
            "thinking": thinking,
            "sources": [{"title": "ClickHouse Madagascar", "source": "data_warehouse"}] if ch_block else [],
            "meta": pipeline_meta,
        }
    )


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user).prefetch_related(
            "messages"
        )
