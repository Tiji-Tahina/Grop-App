"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type PromptInputProps = {
  value?: string
  onValueChange?: (value: string) => void
  onSubmit?: () => void
  isLoading?: boolean
  maxHeight?: number | string
  children: React.ReactNode
  className?: string
}

export const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  ({ value, onValueChange, onSubmit, isLoading, maxHeight = 240, children, className }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-glass)] px-4 py-3 focus-within:border-[var(--primary-500)] focus-within:shadow-[0_0_20px_rgba(77,255,145,0.15)] transition-all",
        isLoading && "opacity-80",
        className
      )}
    >
      {children}
    </div>
  )
)
PromptInput.displayName = "PromptInput"

export type PromptInputTextareaProps = React.ComponentProps<"textarea"> & {
  disableAutosize?: boolean
}

export const PromptInputTextarea = React.forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  ({ className, disableAutosize, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        const form = e.currentTarget.closest("form")
        if (form) form.requestSubmit()
      }
      onKeyDown?.(e as React.KeyboardEvent<HTMLTextAreaElement>)
    }

    return (
      <textarea
        ref={ref}
        rows={1}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex-1 resize-none bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none text-sm leading-relaxed",
          className
        )}
        style={{ maxHeight: disableAutosize ? undefined : 240 }}
        {...props}
      />
    )
  }
)
PromptInputTextarea.displayName = "PromptInputTextarea"

export type PromptInputActionsProps = React.ComponentProps<"div">

export const PromptInputActions = ({ children, className, ...props }: PromptInputActionsProps) => (
  <div className={cn("flex items-center justify-end gap-1 pt-2", className)} {...props}>
    {children}
  </div>
)

export type PromptInputActionProps = {
  tooltip: React.ReactNode
  children: React.ReactNode
  className?: string
  side?: "top" | "bottom" | "left" | "right"
  disabled?: boolean
}

export const PromptInputAction = ({ tooltip, children, className, side = "top", disabled }: PromptInputActionProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(disabled && "opacity-50 pointer-events-none")}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
)
