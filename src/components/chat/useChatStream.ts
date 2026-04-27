import { useState, useCallback, useRef } from 'react';
import { getAccessToken } from '@/api/auth';

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
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
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
        streamingTime: 0,
      },
    ]);

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = getAccessToken();
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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
          } else if (parts[0].startsWith('offtopic:')) {
            const rejectText = parts[0].replace('offtopic:', '');
            fullText = rejectText;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, text: rejectText, isOffTopic: true } : m
              )
            );
          } else if (parts[0].startsWith('token:')) {
            const tokenPart = parts[0].replace('token:', '');
            const time = parseFloat(parts[1]) || 0;
            if (tokenPart) {
              fullText += tokenPart;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, text: fullText, streamingTime: time }
                    : m
                )
              );
            }
          } else if (parts[0] === 'end') {
            setIsStreaming(false);
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, text: fullText || 'Réponse vide.', isStreaming: false }
                  : m
              )
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

  return { messages, isStreaming, sendMessage, stopStreaming };
}
