import time
import json
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.http import StreamingHttpResponse

from .models import Conversation, Message
from .serializers import ConversationSerializer, ChatRequestSerializer
from .pipeline import normalizer, ontology, rag, llm


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

            # ── Étape 3 : RAG ─────────────────────────────────────────────────
            yield "data: thinking:Recherche dans la base documentaire...|0|30\n\n"
            try:
                rag_result = rag.retrieve(onto_result)
            except Exception:
                rag_result = {"retrieved_docs": [], "rag_context": "", "confidence_level": "none"}

            # ── Étape 3.5 : Émission du RAG score et sources ─────────────
            confidence = rag_result.get("confidence_level", "none")
            # Calcul du score (mock pour l'instant)
            if confidence == "high":
                rag_score = 85
            elif confidence == "medium":
                rag_score = 60
            elif confidence == "low":
                rag_score = 35
            else:
                rag_score = 0
            
            sources = rag_result.get("retrieved_docs", [])
            print(f"[DEBUG BACKEND] RAG Score: {rag_score}, Sources count: {len(sources)}")
            print(f"[DEBUG BACKEND] Sources: {sources}")
            yield f"data: rag_score:{rag_score}|{len(sources)}\n\n"
            
            for src in sources:
                src_name = src.get("title", src.get("url", "Source")).split("/")[-1][:30]
                src_conf = 95 if src.get("source") == "ontology" else 80
                print(f"[DEBUG BACKEND] Emitting source: {src_name} conf:{src_conf}")
                yield f"data: source:{src_name}|{src.get('url', '')}|{src_conf}\n\n"

            # ── Étape 4 : Construction du prompt ──────────────────────────────
            yield "data: thinking:Génération de la réponse...|0|45\n\n"
            full_prompt = llm.build_prompt(
                user_message,
                rag_result.get("rag_context", ""),
                history=[],
                confidence_level=rag_result.get("confidence_level", "none"),
            )

            # ── Étape 5 : Génération streaming ────────────────────────────────
            full_response = ""
            token_count = 0
            for result in llm.stream_generate(full_prompt):
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
        rag_result = {"retrieved_docs": [], "rag_context": ""}
    else:
        # 3. RAG
        try:
            rag_result = rag.retrieve(onto_result)
        except Exception as rag_err:
            import logging
            logging.getLogger(__name__).warning("RAG retrieve error: %s", rag_err)
            rag_result = {"retrieved_docs": [], "rag_context": ""}

        # 4. LLM
        full_context = {**onto_result, **rag_result}
        llm_result = llm.generate(full_context, history=history)
        bot_reply = llm_result["reply"]
        thinking = llm_result.get("thinking", "")
        input_tok = llm_result.get("input_tokens", 0)
        output_tok = llm_result.get("output_tokens", 0)
        llm_latency = llm_result.get("latency_ms", 0)

        # Si disclaimer RAG → l'ajouter en tête de la réponse
        disclaimer = rag_result.get("disclaimer")
        if disclaimer:
            bot_reply = f"{disclaimer}\n\n{bot_reply}"

        pipeline_meta = {
            "guardrail": False,
            "context_tags": onto_result.get("context_tags", []),
            "rag_source": rag_result.get("source", "none"),
            "confidence_level": rag_result.get("confidence_level", "none"),
            "has_data": rag_result.get("has_data", False),
            "docs_retrieved": len(rag_result.get("retrieved_docs", [])),
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
        sources=[d.get("url", "") for d in rag_result.get("retrieved_docs", [])],
        pipeline_meta=pipeline_meta,
    )

    return Response(
        {
            "conversation_id": conversation.pk,
            "reply": bot_reply,
            "thinking": thinking,
            "sources": rag_result.get("retrieved_docs", []),
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
