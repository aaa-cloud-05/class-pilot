import { cn } from "@/lib/utils"
import { TONE_COLOR, type LampTone } from "@/lib/lamp"

const SIZES = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
}

export function Lamp({
  tone,
  size = "md",
  glow = true,
  pulse = false,
  className,
}: {
  tone: LampTone
  size?: keyof typeof SIZES
  glow?: boolean
  pulse?: boolean
  className?: string
}) {
  const color = TONE_COLOR[tone]
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 rounded-full",
        SIZES[size],
        pulse && tone !== "muted" && "animate-lamp-pulse",
        className,
      )}
      style={{
        backgroundColor: color,
        boxShadow: glow && tone !== "muted" ? `0 0 0 1px color-mix(in oklch, ${color} 35%, transparent), 0 0 8px color-mix(in oklch, ${color} 55%, transparent)` : undefined,
      }}
    >
      <span className="sr-only">{tone}</span>
    </span>
  )
}
