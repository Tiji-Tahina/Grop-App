"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type ThinkingBarProps = {
  text?: string
  stopLabel?: string
  onStop?: () => void
  onClick?: () => void
  className?: string
}

export function ThinkingBar({ text = "Analyse en cours", stopLabel = "Répondre maintenant", onStop, onClick, className }: ThinkingBarProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-gradient-to-r from-[var(--ai-500)]/10 to-[var(--primary-500)]/10 px-4 py-2.5 cursor-pointer",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--ai-400)]" />
        <span className="text-sm text-[var(--text-secondary)]">{text}</span>
      </div>
      {onStop && (
        <button
          onClick={(e) => { e.stopPropagation(); onStop(); }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {stopLabel}
        </button>
      )}
    </div>
  )
}
