import { Sparkles, TriangleAlert, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Variant = "info" | "error" | "loading"

const ICON = {
  info: Sparkles,
  error: TriangleAlert,
  loading: Loader2,
}

export function AiInsight({ message, variant = "info" }: { message: string; variant?: Variant }) {
  const Icon = ICON[variant]
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3",
        variant === "error" ? "border-destructive/30 bg-destructive/5" : "border-border bg-card",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          variant === "error" ? "text-destructive" : "text-muted-foreground",
          variant === "loading" && "animate-spin",
        )}
        aria-hidden
      />
      <p
        className={cn(
          "text-pretty text-[13px] leading-relaxed",
          variant === "error" ? "text-destructive" : "text-card-foreground",
        )}
      >
        {message}
      </p>
    </div>
  )
}
