import React from 'react';
import { Source, SourceTrigger } from '@/components/ui/source';
import { FileText, BookOpen, Database } from 'lucide-react';
import type { ChatSource } from './useChatStream';

function getSourceIcon(name: string) {
  if (name.includes('ontology')) return <BookOpen size={12} style={{ color: 'var(--ai-400)' }} />;
  if (name.includes('fofifa') || name.includes('FOFIFA')) return <Database size={12} style={{ color: 'var(--primary-400)' }} />;
  return <FileText size={12} style={{ color: 'var(--agri-400)' }} />;
}

function getSourceType(name: string): string {
  if (name.includes('ontology')) return 'Ontologie';
  if (name.includes('fofifa') || name.includes('FOFIFA')) return 'FOFIFA';
  if (name.includes('pratiques')) return 'Pratiques locales';
  return 'Document';
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const color = confidence >= 80 ? 'var(--agri-400)' : confidence >= 50 ? 'var(--warning-500)' : 'var(--error-500)';
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />;
}

interface AgriSourcesProps {
  sources: ChatSource[];
}

export function AgriSources({ sources }: AgriSourcesProps) {
  if (sources.length === 0) return null;

  return (
    <div style={{
      marginTop: 12, padding: 12,
      background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)',
      borderRadius: 12,
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        Sources ({sources.length})
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {sources.map((source, i) => (
          <Source key={i} href={source.url || '#'}>
            <SourceTrigger label={source.name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {getSourceIcon(source.name)}
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{source.name}</span>
                <ConfidenceDot confidence={source.confidence} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{source.confidence}%</span>
              </div>
            </SourceTrigger>
          </Source>
        ))}
      </div>
    </div>
  );
}
