"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"

export type SystemMessageProps = React.ComponentProps<"div"> & {
  variant?: "action" | "warning" | "error"
  fill?: boolean
  icon?: React.ReactNode
  isIconHidden?: boolean
  cta?: {
    label: string
    onClick?: () => void
    variant?: "solid" | "outline" | "ghost"
  }
}

export function SystemMessage({
  children,
  variant = "action",
  fill = false,
  icon,
  isIconHidden = false,
  cta,
  className,
  ...props
}: SystemMessageProps) {
  const getDefaultIcon = () => {
    if (isIconHidden) return null
    switch (variant) {
      case "error":
        return <AlertCircle className="size-4" />
      case "warning":
        return <AlertTriangle className="size-4" />
      default:
        return <Info className="size-4" />
    }
  }

  const getIconToShow = () => {
    if (isIconHidden) return null
    if (icon) return icon
    return getDefaultIcon()
  }

  const shouldShowIcon = getIconToShow() !== null

  const variantStyles: Record<string, React.CSSProperties> = {
    action: {
      color: "var(--text-secondary)",
      borderColor: fill ? "transparent" : "var(--border-subtle)",
      background: fill ? "var(--bg-elevated, #003D33)" : "transparent",
    },
    warning: {
      color: "var(--warning-500)",
      borderColor: fill ? "transparent" : "rgba(245,158,11,0.4)",
      background: fill ? "rgba(245,158,11,0.1)" : "transparent",
    },
    error: {
      color: "var(--error-500)",
      borderColor: fill ? "transparent" : "rgba(239,68,68,0.4)",
      background: fill ? "rgba(239,68,68,0.1)" : "transparent",
    },
  }

  return (
    <div
      className={cn("flex flex-row items-center gap-3 rounded-xl border py-2.5 pr-2 pl-3", className)}
      style={variantStyles[variant]}
      {...props}
    >
      <div className="flex flex-1 flex-row items-center gap-3 leading-normal">
        {shouldShowIcon && (
          <div className="flex h-[1lh] shrink-0 items-center justify-center self-start">
            {getIconToShow()}
          </div>
        )}
        <div className={cn("flex min-w-0 flex-1 items-center", shouldShowIcon ? "gap-3" : "gap-0")}>
          <div className="text-sm">{children}</div>
        </div>
      </div>

      {cta && (
        <button
          onClick={cta.onClick}
          className="rounded-lg bg-[var(--primary-500)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--primary-600)]"
        >
          {cta.label}
        </button>
      )}
    </div>
  )
}
