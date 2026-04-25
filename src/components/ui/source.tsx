"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type SourceProps = {
  href: string
  children: React.ReactNode
  className?: string
}

export const Source = ({ href, children, className }: SourceProps) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={cn("inline-block", className)}>
    {children}
  </a>
)

export type SourceTriggerProps = {
  label: string
  showFavicon?: boolean
  children?: React.ReactNode
  className?: string
}

export const SourceTrigger = ({ label, showFavicon, children, className }: SourceTriggerProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-glass)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-glass-hover)] hover:border-[var(--border-accent)] cursor-pointer",
      className
    )}
  >
    {children}
    {!children && <span>{label}</span>}
  </span>
)

export type SourceContentProps = {
  title?: string
  description?: string
  className?: string
}

export const SourceContent = ({ title, description, className }: SourceContentProps) => (
  <div className={cn("rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated,#003D33)] p-3 shadow-lg", className)}>
    {title && <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>}
    {description && <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>}
  </div>
)
