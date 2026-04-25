import React from 'react';

interface UserMessageProps {
  text: string;
}

export function UserMessage({ text }: UserMessageProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0' }}>
      <div style={{
        maxWidth: '78%',
        background: 'var(--bg-elevated)',
        color: '#FFFFFF',
        borderRadius: 4,
        padding: '14px 18px',
        fontSize: 15,
        lineHeight: 1.55,
        letterSpacing: '-0.005em',
        fontFamily: 'var(--font-body)',
      }}>
        {text}
      </div>
    </div>
  );
}
