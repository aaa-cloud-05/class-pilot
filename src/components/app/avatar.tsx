"use client"

import Image from "next/image"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { AVATARS, avatarSrc } from "@/lib/avatar"
import { useApp } from "@/components/app/provider"
import { Sheet } from "@/components/app/ui"

/** いまのアイコン。未ログインなら灰色。画像の角はもともと透明なので丸めない */
export function Avatar({ size, className }: { size: number; className?: string }) {
  const { avatarId } = useApp()
  return (
    <Image
      src={avatarSrc(avatarId)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    />
  )
}

/** アイコンを選ぶシート。押したらその場で変わって閉じる */
export function AvatarPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { avatarId, setAvatarId } = useApp()
  return (
    <Sheet open={open} onClose={onClose} title="アイコン">
      <div role="radiogroup" aria-label="アイコン" className="grid grid-cols-4 gap-3 pb-2 pt-1">
        {AVATARS.map((a) => {
          const on = a.id === avatarId
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={a.label}
              onClick={() => {
                setAvatarId(a.id)
                onClose()
              }}
              className={cn(
                "relative rounded-[24%] p-1 outline-none transition-transform active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/40",
                on && "ring-2 ring-primary",
              )}
            >
              <Image src={avatarSrc(a.id)} alt="" width={96} height={96} unoptimized className="h-auto w-full" />
              {on && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
