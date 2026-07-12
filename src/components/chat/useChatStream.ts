import { useState, useCallback, useRef } from 'react';
import { getAccessToken } from '@/api/auth';
import { decodeMapActionPayload, type MapAction } from '@/types/mapAction';
import { useMapActionBus } from '@/contexts/MapActionContext';

/**
 * Decodes SSE sentinels placed by the backend (`\n` → `\n`, `|` → `|`).
 * Without this decoding, markdown would render on a single line and tables
 * would be truncated at the first pipe.
 */
function decodeSseToken(s: string): string {
  return s.replace(//g, '\n').replace(//g, '|');
}

/**
 * Reinserts missing Markdown line breaks.
 *
 * The Colab LLM streams text WITHOUT any \n (e.g., "MadagascarThe last..."
 * instead of "Madagascar\nThe last..."). We detect common Markdown markers
 * and force line breaks before them so ReactMarkdown renders
 * headings, lists, and tables correctly.
 *
 * Applied progressively on fullText with each token received.
 */
// Section titles that the Colab LLM often places WITHOUT # markers when they
// should have them. We promote them to h2 if detected adjacent to text.
const SECTION_NAMES = [
  'Summary', 'Summary',
  'Recap', 'Recap',
  'Conclusion',
  'Additional notes', 'Additional notes',
  'Summary( complete)?', 'Summary( complete)?',
  'Synthesis', 'Synthesis',
  'For further reading',
  'In summary', 'In summary',
];
const SECTION_RE = new RegExp(
  `([^\\n#])(${SECTION_NAMES.join('|')})(?=[A-ZÀ-ÖØ-Þ*\\-\\s])`,
  'g'
);

function reformatMarkdown(text: string): string {
  return text
    // ## / ### / etc in mid-text → add two line breaks
    .replace(/([^\n])(##+ )/g, '$1\n\n$2')
    // - X (dash + capital) in mid-text → start of list
    .replace(/([^\n])(- [A-ZÀ-ÖØ-Þ])/g, '$1\n$2')
    // * X (asterisk + capital) in mid-text → start of list
    .replace(/([^\n*])(\* [A-ZÀ-ÖØ-Þ])/g, '$1\n$2')
    // | --- (table separator) in mid-text → break before (unambiguous pattern)
    .replace(/([^\n])(\|[\s-]*-+[\s-]*\|)/g, '$1\n$2')
    // > ** (blockquote)
    .replace(/([^\n])(> \*\*)/g, '$1\n\n$2')
    // > Note (blockquote without bold)
    .replace(/([^\n])(> [A-ZÀ-ÖØ-Þ])/g, '$1\n\n$2')
    // Known section titles (Summary, Conclusion, Notes...) without #
    // → promoted to h2 with \n\n before AND after (clean separation from
    // the following paragraph, no risk of cutting a legitimate title).
    .replace(SECTION_RE, '$1\n\n## $2\n\n')
    // Max 2 consecutive line breaks
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Extracts "(Source: XXX)" / "(Sources: X, Y)" from LLM text,
 * returns them as a ChatSource list and cleans up the markdown.
 *
 * The LLM often slips sources at the end of sentences; the AgriSources
 * component already exists to display them cleanly at the bottom of the message.
 * We move them from prose to the structure for deduplication.
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
    // Cosmetic cleanup: spaces before punctuation, duplicate spaces
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
  /** MapAction emitted by the backend for this message (null if not a geospatial question). */
  mapAction: MapAction | null;
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  /** Last MapAction received (across all conversations), to control the map. */
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
              ? { ...m, text: `Error ${response.status}`, isStreaming: false }
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
            // SSE format: map_action:BASE64_JSON|elapsed|progress
            // The JSON contains `:` and potentially `|`/`\n`, so base64-encoded on the backend.
            const b64 = parts[0].slice('map_action:'.length);
            const payload = decodeMapActionPayload(b64);
            if (payload) {
              setLastMapAction(payload);
              mapActionBus.publish(payload);  // cross-page propagation (3D map)
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
            // Decode sentinels (\n and | escaped by the backend)
            const tokenPart = decodeSseToken(parts[0].replace('token:', ''));
            const time = parseFloat(parts[parts.length - 2]) || 0;
            if (tokenPart) {
              fullText += tokenPart;
              // Progressive reformatting: the Colab LLM forgets \n,
              // we reinsert them before Markdown markers.
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
                // Final reformat: sources extracted THEN line breaks reinserted
                const formatted = reformatMarkdown(cleanText);
                return {
                  ...m,
                  text: formatted || 'Empty response.',
                  sources: [...m.sources, ...newSources],
                  isStreaming: false,
                };
              })
            );
          } else if (parts[0] === 'error') {
            // SSE format: error|elapsed|0|MESSAGE — the message may contain |
            // so we join all parts starting from index 3.
            const errorMessage = parts.slice(3).join('|') || parts[1] || 'Unknown error';
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
              ? { ...m, text: m.text + '\n\n[Generation stopped]', isStreaming: false }
              : m
          )
        );
      } else {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, text: 'Connection error.', isStreaming: false }
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
