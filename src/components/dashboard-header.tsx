import { Bell } from "lucide-react"
import { SyncLamps } from "@/components/sync-lamps"
import { RefreshControl } from "@/components/quiet-controls"
import type { SyncSource } from "@/lib/dashboard-data"

export function DashboardHeader({
  sources,
  refreshing,
  onRefresh,
  unreadCount,
  onOpenNotifications,
}: {
  sources: SyncSource[]
  refreshing: boolean
  onRefresh: () => void
  unreadCount: number
  onOpenNotifications: () => void
}) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[15px] font-semibold tracking-tight text-foreground">Class Pilot</span>
        <span className="font-mono text-[11px] text-muted-foreground">/今週</span>
      </div>
      <div className="flex items-center gap-1">
        <SyncLamps sources={sources} />
        <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
        <RefreshControl busy={refreshing} onRefresh={onRefresh} />
        {/* 通知履歴（ローディングの右） */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label={unreadCount > 0 ? `通知（未読${unreadCount}件）` : "通知"}
          className="relative flex items-center justify-center rounded-full p-1.5 text-muted-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-[15px] w-[15px]" aria-hidden />
          {unreadCount > 0 && (
            <span
              className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full ring-2 ring-background"
              style={{ backgroundColor: "var(--lamp-red)" }}
              aria-hidden
            />
          )}
        </button>
      </div>
    </header>
  )
}
