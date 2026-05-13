import React from 'react';
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
} from '@/components/ui/chain-of-thought';
import { ThinkingBar } from '@/components/ui/thinking-bar';
import { AgriSources } from './AgriSources';
import { RAGConfidenceBadge } from './RAGConfidenceBadge';
import { MarkdownMessage } from './MarkdownMessage';
import {
  Sprout,
  Search,
  Lightbulb,
  Target,
  Loader2,
  AlertCircle,
  Copy,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Map as MapIcon,
} from 'lucide-react';
import type { ChatMessage } from './useChatStream';
import { useMapActionBus } from '@/contexts/MapActionContext';

interface AssistantMessageProps {
  message: ChatMessage;
  isStreaming: boolean;
  onStop: () => void;
  mode: string;
}

function getStepCategory(step: string): 'research' | 'analysis' | 'solution' {
  const lower = step.toLowerCase();
  if (lower.includes('recherche') || lower.includes('analyse de la question') || lower.includes('normalisation') || lower.includes('validation')) {
    return 'research';
  }
  if (lower.includes('base documentaire') || lower.includes('domaine') || lower.includes('ontologie') || lower.includes('guardrail') || lower.includes('vérification')) {
    return 'analysis';
  }
  return 'solution';
}

function getStepIcon(category: 'research' | 'analysis' | 'solution', isComplete: boolean) {
  if (!isComplete) {
    return <Loader2 size={14} className="animate-spin" style={{ color: 'var(--ai-400)' }} />;
  }
  switch (category) {
    case 'research':
      return <Search size={14} style={{ color: 'var(--primary-400)' }} />;
    case 'analysis':
      return <Lightbulb size={14} style={{ color: 'var(--earth-400, #D4A64B)' }} />;
    case 'solution':
      return <Target size={14} style={{ color: 'var(--agri-400)' }} />;
  }
}

function getStepLabel(category: 'research' | 'analysis' | 'solution'): string {
  switch (category) {
    case 'research': return 'Recherche';
    case 'analysis': return 'Analyse';
    case 'solution': return 'Solution';
  }
}

function getStepDescription(step: string): string[] {
  const lower = step.toLowerCase();
  if (lower.includes('analyse de la question')) {
    return [
      'Extraction des mots-clés de la question',
      'Identification de l\'intention utilisateur',
      'Détection de la langue (français / malgache)',
    ];
  }
  if (lower.includes('validation') || lower.includes('domaine')) {
    return [
      'Vérification que la question relève du domaine agricole',
      'Comparaison avec les concepts de l\'ontologie OWL',
      'Rejet des questions hors domaine (guardrail)',
    ];
  }
  if (lower.includes('recherche') || lower.includes('base documentaire')) {
    return [
      'Recherche vectorielle dans la base FAISS',
      'Calcul de similarité sémantique (embeddings)',
      'Sélection des documents les plus pertinents',
    ];
  }
  if (lower.includes('génération') || lower.includes('réponse')) {
    return [
      'Construction du prompt avec contexte RAG',
      'Injection des faits ontologiques',
      'Génération streaming de la réponse',
    ];
  }
  return [step];
}

export function AssistantMessage({ message, isStreaming, onStop, mode }: AssistantMessageProps) {
  const mapBus = useMapActionBus();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const researchSteps = message.thinkingSteps.filter(s => getStepCategory(s) === 'research');
  const analysisSteps = message.thinkingSteps.filter(s => getStepCategory(s) === 'analysis');
  const solutionSteps = message.thinkingSteps.filter(s => getStepCategory(s) === 'solution');

  const researchComplete = researchSteps.length > 0 && (analysisSteps.length > 0 || solutionSteps.length > 0 || !message.isStreaming);
  const analysisComplete = analysisSteps.length > 0 && (solutionSteps.length > 0 || !message.isStreaming);
  const solutionComplete = solutionSteps.length > 0 && !message.isStreaming;

  const researchActive = message.isStreaming && researchSteps.length > 0 && !analysisComplete;
  const analysisActive = message.isStreaming && analysisSteps.length > 0 && !solutionSteps.length;
  const solutionActive = message.isStreaming && solutionSteps.length > 0;

  return (
    <div className="group" style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '16px 0',
      animation: 'fade-in-up 0.3s ease-out',
    }}>
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--agri-400)' }}>
            CropGPT
          </span>
          {message.ragScore > 0 && <RAGConfidenceBadge score={message.ragScore} />}
          {message.streamingTime > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {message.streamingTime.toFixed(1)}s
            </span>
          )}
        </div>

        {/* Thinking Bar */}
        {message.isStreaming && message.thinkingSteps.length > 0 && !message.text && (
          <div style={{ marginBottom: 12 }}>
            <ThinkingBar
              text="Analyse en cours"
              stopLabel="Répondre maintenant"
              onStop={onStop}
            />
          </div>
        )}

        {/* Chain of Thought — Advanced Reasoning Steps */}
        {mode === 'expert' && message.thinkingSteps.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <ChainOfThought>
              {/* Step 1: Research Phase */}
              {researchSteps.length > 0 && (
                <ChainOfThoughtStep>
                  <ChainOfThoughtTrigger
                    leftIcon={getStepIcon('research', researchComplete)}
                  >
                    <span style={{
                      color: researchComplete ? 'var(--text-secondary)' : researchActive ? 'var(--primary-400)' : 'var(--text-muted)',
                      fontWeight: researchActive ? 500 : 400,
                    }}>
                      Recherche : Compréhension de la question agricole
                    </span>
                  </ChainOfThoughtTrigger>
                  <ChainOfThoughtContent>
                    {researchSteps.map((step, i) => (
                      getStepDescription(step).map((desc, j) => (
                        <ChainOfThoughtItem key={`${i}-${j}`}>
                          {desc}
                        </ChainOfThoughtItem>
                      ))
                    ))}
                  </ChainOfThoughtContent>
                </ChainOfThoughtStep>
              )}

              {/* Step 2: Analysis Phase */}
              {analysisSteps.length > 0 && (
                <ChainOfThoughtStep>
                  <ChainOfThoughtTrigger
                    leftIcon={getStepIcon('analysis', analysisComplete)}
                  >
                    <span style={{
                      color: analysisComplete ? 'var(--text-secondary)' : analysisActive ? 'var(--earth-400, #D4A64B)' : 'var(--text-muted)',
                      fontWeight: analysisActive ? 500 : 400,
                    }}>
                      Analyse : Identification des données pertinentes
                    </span>
                  </ChainOfThoughtTrigger>
                  <ChainOfThoughtContent>
                    {analysisSteps.map((step, i) => (
                      getStepDescription(step).map((desc, j) => (
                        <ChainOfThoughtItem key={`${i}-${j}`}>
                          {desc}
                        </ChainOfThoughtItem>
                      ))
                    ))}
                  </ChainOfThoughtContent>
                </ChainOfThoughtStep>
              )}

              {/* Step 3: Solution Phase */}
              {solutionSteps.length > 0 && (
                <ChainOfThoughtStep isLast={true}>
                  <ChainOfThoughtTrigger
                    leftIcon={getStepIcon('solution', solutionComplete)}
                  >
                    <span style={{
                      color: solutionComplete ? 'var(--text-secondary)' : solutionActive ? 'var(--agri-400)' : 'var(--text-muted)',
                      fontWeight: solutionActive ? 500 : 400,
                    }}>
                      Solution : Génération de la réponse agricole
                    </span>
                  </ChainOfThoughtTrigger>
                  <ChainOfThoughtContent>
                    {solutionSteps.map((step, i) => (
                      getStepDescription(step).map((desc, j) => (
                        <ChainOfThoughtItem key={`${i}-${j}`}>
                          {desc}
                        </ChainOfThoughtItem>
                      ))
                    ))}
                  </ChainOfThoughtContent>
                </ChainOfThoughtStep>
              )}
            </ChainOfThought>
          </div>
        )}

        {/* Off-topic alert (warning orange) */}
        {message.isOffTopic && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: 12, background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10, color: '#F59E0B',
          }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: 14 }}>{message.text}</span>
          </div>
        )}

        {/* Error alert (red — LLM offline, timeout, network error) */}
        {message.isError && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: 12, background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 10, color: '#EF4444',
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>
                Erreur du modèle
              </strong>
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Main response */}
        {message.text && !message.isOffTopic && !message.isError && (
          <div>
            <MarkdownMessage content={message.text} />

            {/* Streaming cursor */}
            {message.isStreaming && (
              <span style={{
                display: 'inline-block', width: 2, height: '1.1em',
                background: 'var(--agri-500)', marginLeft: 2, verticalAlign: 'middle',
                animation: 'blink 1s step-end infinite', borderRadius: 1,
              }} />
            )}
          </div>
        )}

        {/* Sources */}
        {!message.isStreaming && message.sources.length > 0 && (
          <AgriSources sources={message.sources} />
        )}

        {/* MapAction CTA — visible quand le pipeline a produit un plan carte */}
        {!message.isStreaming && message.mapAction && (
          <button
            onClick={() => mapBus.goToMap()}
            title={message.mapAction.explain?.title || 'Voir le résultat sur la carte'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              marginTop: 12, padding: '8px 14px',
              fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
              background: 'rgba(77, 255, 145, 0.10)',
              color: 'var(--agri-400, #4DFF91)',
              border: '1px solid rgba(77, 255, 145, 0.32)',
              borderRadius: 8, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(77, 255, 145, 0.18)';
              e.currentTarget.style.borderColor = 'rgba(77, 255, 145, 0.52)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(77, 255, 145, 0.10)';
              e.currentTarget.style.borderColor = 'rgba(77, 255, 145, 0.32)';
            }}
          >
            <MapIcon size={14} strokeWidth={2} />
            Voir sur la carte
          </button>
        )}

        {/* Actions */}
        {!message.isStreaming && message.text && !message.isOffTopic && !message.isError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, marginTop: 8,
            opacity: 0, transition: 'opacity 0.2s',
          }}
          className="message-actions-wrapper"
          >
            <button
              onClick={handleCopy}
              title={copied ? 'Copié !' : 'Copier'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'transparent', color: copied ? 'var(--agri-400)' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              <Copy size={14} />
            </button>
            <button title="Utile" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-muted)', transition: 'all 0.2s',
            }}>
              <ThumbsUp size={14} />
            </button>
            <button title="Pas utile" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-muted)', transition: 'all 0.2s',
            }}>
              <ThumbsDown size={14} />
            </button>
          </div>
        )}

        {/* Stop button */}
        {message.isStreaming && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={onStop}
              style={{
                fontSize: 11, padding: '4px 10px',
                background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, cursor: 'pointer',
              }}
            >
              Arrêter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
