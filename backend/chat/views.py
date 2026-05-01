import time
import json
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.http import StreamingHttpResponse

from .models import Conversation, Message
from .serializers import ConversationSerializer, ChatRequestSerializer
from .pipeline import normalizer, ontology, llm
from data_werehouse import ch_facts


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def stream_chat(request):
    """
    POST /api/chat/stream/
    Pipeline complet en streaming : normalizer → ontologie (guardrail) → RAG → LLM.
    Protocole SSE :
      data: start|0|0
      data: thinking:ETAPE|ELAPSED|PROGRESS
      data: token:TEXT|ELAPSED|PROGRESS
      data: end|ELAPSED|100
      data: error|0|0|MESSAGE
    """
    user_message = request.data.get("message", "").strip()

    if not user_message:
        return Response(
            {"error": 'Le champ "message" est requis.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Bail-out précoce : LLM pas configuré ──
    # On évite de faire tourner ontology + RAG pour rien et on dit clairement
    # à l'utilisateur que le modèle n'est pas branché.
    if not getattr(llm, "COLAB_LLM_URL", "").strip():
        def _llm_offline():
            yield "data: start|0|0\n\n"
            yield (
                "data: error|0|0|"
                "Le modèle LLM n'est pas encore connecté. "
                "Configurez COLAB_LLM_URL dans Render → Environment.\n\n"
            )
        return StreamingHttpResponse(_llm_offline(), content_type="text/event-stream")

    def generate():
        start_time = time.time()
        yield "data: start|0|0\n\n"

        try:
            # ── Étape 1 : Normalisation ───────────────────────────────────────
            yield "data: thinking:Analyse de la question...|0|5\n\n"
            normalized = normalizer.normalize(user_message)

            # ── Étape 2 : Validation ontologique (guardrail hors-sujet) ───────
            yield "data: thinking:Validation du domaine agricole...|0|15\n\n"
            onto_result = ontology.validate_and_enrich(normalized)

            if not onto_result["is_valid"]:
                # Question hors domaine → renvoyer le message de rejet
                rejection = onto_result["rejection_reason"]
                elapsed = round(time.time() - start_time, 1)
                yield f"data: offtopic:{rejection}|{elapsed}|100\n\n"
                yield f"data: end|{elapsed}|100\n\n"
                return

            # ── Étape 3 : Lookup ClickHouse (chiffres factuels) ───────────────
            # Le RAG (embed + FAISS) tourne côté Colab désormais. Render
            # fournit en plus les faits CH pour ancrer la réponse sur les
            # données officielles du data warehouse.
            yield "data: thinking:Consultation des données officielles...|0|30\n\n"
            try:
                ch_block = ch_facts.fetch_facts(
                    onto_result.get("context_tags", []),
                    onto_result.get("matched_keywords", []),
                )
            except Exception:
                ch_block = ""

            # Score indicatif pour le frontend (chip "données")
            rag_score = 75 if ch_block else 0
            yield f"data: rag_score:{rag_score}|0\n\n"
            if ch_block:
                yield f"data: source:ClickHouse Madagascar|data_warehouse|90\n\n"

            # ── Étape 4 : Génération streaming (RAG fait dans Colab) ─────────
            yield "data: thinking:Génération de la réponse...|0|45\n\n"
            payload = llm.build_colab_payload(
                {**onto_result, "ch_facts": ch_block},
                history=[],
            )

            full_response = ""
            token_count = 0
            for result in llm.stream_generate(payload):
                elapsed = round(time.time() - start_time, 1)

                # Erreur LLM (offline, timeout, etc.) → emit SSE error et stop
                if result.get("error"):
                    yield f"data: error|{elapsed}|0|{result['error']}\n\n"
                    return

                # Progress : 45–99% pendant la génération
                progress = min(45 + int(result.get("progress", 0) * 0.54), 99)
                token = result.get("token", "")
                if token:
                    full_response += token
                    token_count += 1
                    yield f"data: token:{token}|{elapsed}|{progress}\n\n"
                if result.get("done") or token_count >= 512:
                    yield f"data: end|{elapsed}|100\n\n"
                    break

        except Exception as e:
            yield f"data: error|0|0|{str(e)}\n\n"

    return StreamingHttpResponse(generate(), content_type="text/event-stream")


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def chat(request):
    """
    POST /api/chat/
    Execute le pipeline complet : normalizer -> ontologie -> RAG -> LLM
    """
    serializer = ChatRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user_message = serializer.validated_data["message"]
    conversation_id = serializer.validated_data.get("conversation_id")

    # Récupérer ou créer la conversation
    if conversation_id:
        try:
            conversation = Conversation.objects.get(
                pk=conversation_id, user=request.user
            )
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation introuvable."}, status=status.HTTP_404_NOT_FOUND
            )
    else:
        title = user_message[:60] + ("…" if len(user_message) > 60 else "")
        conversation = Conversation.objects.create(user=request.user, title=title)

    # Historique de la conversation pour le LLM
    history = list(
        conversation.messages.values("role", "content").order_by("created_at")
    )

    # === Pipeline ===
    t0 = time.time()

    # 1. Normalisation
    normalized = normalizer.normalize(user_message)

    # 2. Ontologie
    onto_result = ontology.validate_and_enrich(normalized)

    thinking = ""

    if not onto_result["is_valid"]:
        # Guardrail : question hors domaine
        bot_reply = onto_result["rejection_reason"]
        pipeline_meta = {
            "guardrail": True,
            "latency_ms": round((time.time() - t0) * 1000),
        }
        ch_block = ""
    else:
        # 3. ClickHouse facts (rendements/prix officiels)
        try:
            ch_block = ch_facts.fetch_facts(
                onto_result.get("context_tags", []),
                onto_result.get("matched_keywords", []),
            )
        except Exception as ch_err:
            import logging
            logging.getLogger(__name__).warning("CH facts error: %s", ch_err)
            ch_block = ""

        # 4. LLM (Colab fait le RAG en interne avec son vector_store)
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

    # Sauvegarder les messages
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
