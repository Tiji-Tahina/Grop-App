import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, fontSize: 15, fontFamily: 'var(--font-body)' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '1.5rem 0 0.75rem', color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: '#FFFFFF', lineHeight: 1.25, letterSpacing: '-0.01em', fontFamily: 'var(--font-display)' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '1rem 0 0.4rem', color: 'rgba(255,255,255,0.92)', lineHeight: 1.3 }}>{children}</h3>,
          p: ({ children }) => <p style={{ margin: '0 0 0.85rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, fontSize: '0.95rem' }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: '0.5rem 0 1rem 1.25rem', paddingLeft: '0.5rem', color: 'rgba(255,255,255,0.78)', listStyleType: 'disc' }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: '0.5rem 0 1rem 1.25rem', paddingLeft: '0.5rem', color: 'rgba(255,255,255,0.78)', listStyleType: 'decimal' }}>{children}</ol>,
          li: ({ children, ...props }) => <li style={{ margin: '0.35rem 0', lineHeight: 1.65, fontSize: '0.95rem', color: 'rgba(255,255,255,0.78)' }} {...props}>{children}</li>,
          strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#FFFFFF' }}>{children}</strong>,
          em: ({ children }) => <em style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.55)' }}>{children}</em>,
          code: ({ className, children, ...props }) => {
            const isBlock = className?.startsWith('language-');
            if (isBlock) {
              return <code style={{ display: 'block', background: 'transparent', color: '#5EE890', padding: '0.85rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', lineHeight: 1.6, margin: '0.75rem 0' }} {...props}>{children}</code>;
            }
            return <code style={{ color: '#5EE890', fontSize: '0.875em', fontFamily: 'var(--font-mono)', fontWeight: 500 }} {...props}>{children}</code>;
          },
          pre: ({ children }) => <pre style={{ background: 'transparent', margin: 0 }}>{children}</pre>,
          blockquote: ({ children }) => <blockquote style={{ borderLeft: '2px solid rgba(255,255,255,0.30)', paddingLeft: '1rem', margin: '0.75rem 0', color: 'rgba(255,255,255,0.55)', fontStyle: 'normal' }}>{children}</blockquote>,
          a: ({ href, children }) => <a href={href} style={{ color: '#FFFFFF', textDecoration: 'underline', textDecorationColor: 'rgba(77,255,145,0.5)', textUnderlineOffset: 3, fontWeight: 500 }} target="_blank" rel="noopener noreferrer">{children}</a>,
          hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1.5rem 0' }} />,
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '1rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          th: ({ children }) => <th style={{ padding: '10px 16px 10px 0', textAlign: 'left', fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', borderBottom: '1px solid var(--border-subtle)' }}>{children}</th>,
          td: ({ children }) => <td style={{ padding: '10px 16px 10px 0', color: 'rgba(255,255,255,0.78)', fontSize: '0.875rem' }}>{children}</td>,
          tr: ({ children }) => <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>{children}</tr>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
