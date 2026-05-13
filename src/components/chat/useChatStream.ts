import { useState, useCallback, useRef } from 'react';
import { getAccessToken } from '@/api/auth';
import { decodeMapActionPayload, type MapAction } from '@/types/mapAction';
import { useMapActionBus } from '@/contexts/MapActionContext';

/**
 * Décode les sentinels SSE posés par le backend (`` → `\n`, `` → `|`).
 * Sans ce décodage, le markdown sortirait sur une seule ligne et les tableaux
 * seraient tronqués au premier pipe.
 */
function decodeSseToken(s: string): string {
  return s.replace(//g, '\n').replace(//g, '|');
}

/**
 * Reinsere les sauts de ligne Markdown manquants.
 *
 * Le LLM Colab streame le texte SANS aucun \n (ex : "MadagascarLe dernier..."
 * au lieu de "Madagascar\nLe dernier..."). On detecte les marqueurs Markdown
 * usuels et on force des sauts de ligne devant pour que ReactMarkdown rende
 * correctement les titres, listes et tableaux.
 *
 * Applique progressivement sur fullText a chaque token recu.
 */
// Section titles que le LLM Colab pose souvent SANS marqueur # alors qu'elles
// devraient en avoir. On les promeut en h2 si on les detecte collees au texte.
const SECTION_NAMES = [
  'Récapitulation', 'Recapitulation',
  'Récapitulatif', 'Recapitulatif',
  'Conclusion',
  'Notes? supplémentaires', 'Notes? supplementaires',
  'Résumé( complet)?', 'Resume( complet)?',
  'Synthèse', 'Synthese',
  'Pour aller plus loin',
  'En résumé', 'En resume',
];
const SECTION_RE = new RegExp(
  `([^\\n#])(${SECTION_NAMES.join('|')})(?=[A-ZÀ-ÖØ-Þ*\\-\\s])`,
  'g'
);

function reformatMarkdown(text: string): string {
  return text
    // ## / ### / etc en milieu de texte → ajoute deux sauts de ligne
    .replace(/([^\n])(##+ )/g, '$1\n\n$2')
    // - X (tiret + majuscule) en milieu de texte → debut de liste
    .replace(/([^\n])(- [A-ZÀ-ÖØ-Þ])/g, '$1\n$2')
    // * X (asterisque + majuscule) en milieu de texte → debut de liste
    .replace(/([^\n*])(\* [A-ZÀ-ÖØ-Þ])/g, '$1\n$2')
    // | --- (separateur table) en milieu → coupe avant (pattern non ambigu)
    .replace(/([^\n])(\|[\s-]*-+[\s-]*\|)/g, '$1\n$2')
    // > ** (blockquote)
    .replace(/([^\n])(> \*\*)/g, '$1\n\n$2')
    // > Note (blockquote sans gras)
    .replace(/([^\n])(> [A-ZÀ-ÖØ-Þ])/g, '$1\n\n$2')
    // Section titles connues (Récapitulation, Conclusion, Notes...) sans #
    // → promues en h2 avec \n\n devant ET derriere (separation propre du
    // paragraphe qui suit, sans risque de couper un titre legitime).
    .replace(SECTION_RE, '$1\n\n## $2\n\n')
    // Max 2 sauts de ligne consecutifs
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Extrait les "(Source : XXX)" / "(Sources : X, Y)" du texte LLM,
 * les renvoie en liste ChatSource et nettoie le markdown.
 *
 * Le LLM glisse souvent les sources en bout de phrase ; le composant
 * AgriSources existe deja pour les afficher proprement en bas du message.
 * On les remonte de la prose vers la structure pour deduplication.
 */
const SOURCE_RE = /\(Sources?\s*:\s*([^)]+)\)/gi;

function extractSourcesFromText(
  text: string,
  existing: ChatSource[]
): { cleanText: string; newSources: ChatSource[] } {
  const seen = new Set(existing.map(s => s.name.toLowerCase()));
  const newSources: ChatSource[] = [];

  const cleanText = text
    .replace(SOURCE_RE, (_match, captured: string) => {
      captured
        .split(/[,;]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(name => {
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            newSources.push({ name, url: '', confidence: 70 });
          }
        });
      return '';
    })
    // nettoyage cosmetique : espaces avant ponctuation, doublons d'espaces
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return { cleanText, newSources };
}

export interface ChatSource {
  name: string;
  url: string;
  confidence: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  thinkingSteps: string[];
  ragScore: number;
  sources: ChatSource[];
  isStreaming: boolean;
  isOffTopic: boolean;
  isError: boolean;
  streamingTime: number;
  /** MapAction emis par le backend pour ce message (null si question non geospatiale). */
  mapAction: MapAction | null;
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  /** Dernier MapAction recu (toutes conversations confondues), pour piloter la carte. */
  const [lastMapAction, setLastMapAction] = useState<MapAction | null>(null);
  const mapActionBus = useMapActionBus();
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text,
      sender: 'user',
      thinkingSteps: [],
      ragScore: 0,
      sources: [],
      isStreaming: false,
      isOffTopic: false,
      isError: false,
      streamingTime: 0,
      mapAction: null,
    };
    setMessages(prev => [...prev, userMsg]);

    const assistantId = `ai-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: assistantId,
        text: '',
        sender: 'assistant',
        thinkingSteps: [],
        ragScore: 0,
        sources: [],
        isStreaming: true,
        isOffTopic: false,
        isError: false,
        streamingTime: 0,
        mapAction: null,
      },
    ]);

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = getAccessToken();
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

      const response = await fetch(`${API_BASE}/api/chat/stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, text: `Erreur ${response.status}`, isStreaming: false }
              : m
          )
        );
        setIsStreaming(false);
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          const parts = data.split('|');

          if (parts[0].startsWith('thinking:')) {
            const step = parts[0].replace('thinking:', '');
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, thinkingSteps: [...m.thinkingSteps, step] }
                  : m
              )
            );
          } else if (parts[0].startsWith('rag_score:')) {
            const score = parseInt(parts[0].split(':')[1]) || 0;
            setMessages(prev =>
              prev.map(m => (m.id === assistantId ? { ...m, ragScore: score } : m))
            );
          } else if (parts[0].startsWith('source:')) {
            const name = parts[0].replace('source:', '');
            const url = parts[1] || '';
            const confidence = parseInt(parts[2]) || 80;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, sources: [...m.sources, { name, url, confidence }] }
                  : m
              )
            );
          } else if (parts[0].startsWith('map_action:')) {
            // Format SSE : map_action:BASE64_JSON|elapsed|progress
            // Le JSON contient `:` et potentiellement `|`/`\n`, donc base64 cote backend.
            const b64 = parts[0].slice('map_action:'.length);
            const payload = decodeMapActionPayload(b64);
            if (payload) {
              setLastMapAction(payload);
              mapActionBus.publish(payload);  // propagation cross-page (carte 3D)
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, mapAction: payload } : m
                )
              );
            }
          } else if (parts[0].startsWith('offtopic:')) {
            const rejectText = parts[0].replace('offtopic:', '');
            fullText = rejectText;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, text: rejectText, isOffTopic: true } : m
              )
            );
          } else if (parts[0].startsWith('token:')) {
            // Décode les sentinels (\n et | echappes par le backend)
            const tokenPart = decodeSseToken(parts[0].replace('token:', ''));
            const time = parseFloat(parts[parts.length - 2]) || 0;
            if (tokenPart) {
              fullText += tokenPart;
              // Reformatage progressif : le LLM Colab oublie les \n,
              // on les remet devant les marqueurs Markdown.
              const formatted = reformatMarkdown(fullText);
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, text: formatted, streamingTime: time }
                    : m
                )
              );
            }
          } else if (parts[0] === 'end') {
            setIsStreaming(false);
            setMessages(prev =>
              prev.map(m => {
                if (m.id !== assistantId) return m;
                const { cleanText, newSources } = extractSourcesFromText(
                  fullText, m.sources
                );
                // Reformat final : sources extraites PUIS sauts de ligne réinsérés
                const formatted = reformatMarkdown(cleanText);
                return {
                  ...m,
                  text: formatted || 'Réponse vide.',
                  sources: [...m.sources, ...newSources],
                  isStreaming: false,
                };
              })
            );
          } else if (parts[0] === 'error') {
            // Format SSE : error|elapsed|0|MESSAGE — le message peut contenir des |
            // donc on rejoint tous les parts à partir de l'index 3.
            const errorMessage = parts.slice(3).join('|') || parts[1] || 'Erreur inconnue';
            setIsStreaming(false);
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, text: errorMessage, isStreaming: false, isError: true }
                  : m
              )
            );
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, text: m.text + '\n\n[Génération arrêtée]', isStreaming: false }
              : m
          )
        );
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, text: 'Erreur de connexion.', isStreaming: false }
              : m
          )
        );
      }
      setIsStreaming(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return { messages, isStreaming, sendMessage, stopStreaming, lastMapAction };
}
