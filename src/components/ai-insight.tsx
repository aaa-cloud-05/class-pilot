import { Sparkles, TriangleAlert, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Variant = "info" | "error" | "loading"

const ICON = {
  info: Sparkles,
  error: TriangleAlert,
  loading: Loader2,
}

// 脱カード化：枠・背景なしの素の一行（アイコン＋テキスト）
export function AiInsight({ message, variant = "info" }: { message: string; variant?: Variant }) {
  const Icon = ICON[variant]
  return (
    <div className="flex items-start gap-2.5 px-1">
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
          variant === "error" ? "text-destructive" : "text-foreground",
        )}
      >
        {message}
      </p>
    </div>
  )
}
