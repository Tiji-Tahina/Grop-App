import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, ArrowDown } from 'lucide-react';
import { PromptInput } from '@/components/ui/prompt-input';
import { PromptInputTextarea } from '@/components/ui/prompt-input';
import { PromptInputActions } from '@/components/ui/prompt-input';
import { PromptInputAction } from '@/components/ui/prompt-input';
import { WelcomeScreen } from './WelcomeScreen';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { useChatStream } from './useChatStream';

function ModeToggle({ mode, setMode }: { mode: string; setMode: (m: string) => void }) {
  const tabs = [
    { key: 'paysan', label: 'Paysan' },
    { key: 'expert', label: 'Expert' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {tabs.map(t => {
        const active = mode === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setMode(t.key)}
            style={{
              position: 'relative',
              padding: '10px 0',
              marginLeft: t.key === 'expert' ? 28 : 0,
              fontSize: 11, fontWeight: 600,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              cursor: 'pointer', border: 'none', background: 'transparent',
              color: active ? '#FFFFFF' : 'rgba(255,255,255,0.40)',
              transition: 'color 0.18s ease',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
          >
            {t.label}
            {active && (
              <span style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 1,
                background: '#4DFF91',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AgriculturalChat() {
  const [inputValue, setInputValue] = useState('');
  const [userMode, setUserMode] = useState('expert');
  const { messages, isStreaming, sendMessage, stopStreaming } = useChatStream();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const handleSend = () => {
    if (!inputValue.trim() || isStreaming) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollTop + clientHeight < scrollHeight - 100);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const agriculturalSuggestions = [
    { label: 'Variétés riz sol rouge Analamanga', subtitle: 'Conseils de plantation' },
    { label: 'Maladies du riz par région', subtitle: 'Diagnostic & traitement' },
    { label: 'Prévisions météo agricoles', subtitle: 'Climat & saisons' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--bg-deep)', position: 'relative' }}>
      {/* Header — only shown when no messages yet (welcome state) */}
      {messages.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '32px 56px 0', borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div>
            <p style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
              margin: 0, marginBottom: 6,
            }}>
              Chat · Assistant agricole IA
            </p>
          </div>
          <ModeToggle mode={userMode} setMode={setUserMode} />
        </div>
      )}
      {/* Compact bar when chatting */}
      {messages.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 56px', borderBottom: '1px solid var(--border-subtle)',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)',
            margin: 0,
          }}>
            Conversation en cours
          </p>
          <ModeToggle mode={userMode} setMode={setUserMode} />
        </div>
      )}

      {/* Chat Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        data-chat-container
        style={{
          flex: 1, overflowY: 'auto',
          padding: messages.length === 0 ? '0' : '32px 56px',
          position: 'relative',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center' }}>
            <WelcomeScreen suggestions={agriculturalSuggestions} onSelect={sendMessage} />
          </div>
        ) : (
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map(msg =>
              msg.sender === 'user' ? (
                <UserMessage key={msg.id} text={msg.text} />
              ) : (
                <AssistantMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming}
                  onStop={stopStreaming}
                  mode={userMode}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Scroll to bottom — flat circular */}
      {showScrollBtn && (
        <div style={{ position: 'absolute', bottom: 132, right: 56, zIndex: 10 }}>
          <button
            onClick={scrollToBottom}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              color: 'rgba(255,255,255,0.65)', cursor: 'pointer',
              transition: 'color 0.18s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
          >
            <ArrowDown size={14} />
          </button>
        </div>
      )}

      {/* Prompt Input — clean, prominent CTA */}
      <div style={{
        padding: '20px 56px 28px',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <PromptInput isLoading={isStreaming} className="border-[var(--border-subtle)] bg-transparent">
              <PromptInputTextarea
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
                placeholder="Posez votre question agricole…"
                className="text-[var(--text-primary)] placeholder:text-[rgba(255,255,255,0.40)] text-[15px]"
              />
              <PromptInputActions>
                <PromptInputAction tooltip="Dictée vocale">
                  <button
                    type="button"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'transparent', border: 'none',
                      color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
                      transition: 'color 0.18s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
                  >
                    <Mic size={16} />
                  </button>
                </PromptInputAction>
                <PromptInputAction tooltip="Envoyer · Entrée">
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isStreaming}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 36, height: 36, borderRadius: '50%',
                      background: !inputValue.trim() || isStreaming ? 'rgba(77, 255, 145, 0.20)' : '#4DFF91',
                      color: '#001A10', border: 'none',
                      cursor: !inputValue.trim() || isStreaming ? 'not-allowed' : 'pointer',
                      transition: 'background 0.18s ease, transform 0.15s ease',
                    }}
                    onMouseEnter={e => { if (inputValue.trim() && !isStreaming) e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Send size={15} strokeWidth={2.5} />
                  </button>
                </PromptInputAction>
              </PromptInputActions>
            </PromptInput>
            {/* Keyboard hint */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 10, color: 'rgba(255,255,255,0.32)',
              letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 500,
            }}>
              <span>
                <kbd style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  padding: '2px 6px', borderRadius: 3,
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
                  letterSpacing: '0.02em', textTransform: 'none', marginRight: 6,
                }}>↵</kbd>
                envoyer
                <span style={{ margin: '0 10px', opacity: 0.4 }}>·</span>
                <kbd style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  padding: '2px 6px', borderRadius: 3,
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)',
                  letterSpacing: '0.02em', textTransform: 'none', marginRight: 6,
                }}>⇧↵</kbd>
                nouvelle ligne
              </span>
              <span>{userMode === 'expert' ? 'Mode expert' : 'Mode paysan'}</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
