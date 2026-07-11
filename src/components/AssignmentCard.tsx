"use client";

import type { Assignment } from "@/lib/types";
import { relativeDeadline, formatDate, formatTime } from "@/lib/date-utils";
import { isSafeHttpUrl } from "@/lib/webclass";
import { isPast } from "date-fns";
import { useState } from "react";
import { MoreVertical, Bell, BellOff } from "lucide-react";
import { Lamp } from "@/components/lamp";
import type { LampTone } from "@/lib/lamp";
import { cn } from "@/lib/utils";

interface AssignmentCardProps {
  assignment: Assignment;
  muted?: boolean;
  onToggleMute?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function AssignmentCard({ assignment, muted, onToggleMute, onEdit, onDelete }: AssignmentCardProps) {
  const a = assignment;
  const overdue = a.dueDate && isPast(a.dueDate) && a.submissionState === "not_submitted";
  const submitted = a.submissionState === "submitted";
  const unknown = a.submissionState === "unknown";
  const [menuOpen, setMenuOpen] = useState(false);

  const tone: LampTone = submitted ? "green" : unknown ? "muted" : overdue ? "red" : "amber";
  const toneLabel = submitted ? "提出済" : unknown ? "不明" : overdue ? "締切超過" : "未提出";
  const href = isSafeHttpUrl(a.link) ? a.link : undefined;

  return (
    <div className="relative">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "block rounded-2xl border p-4 transition active:scale-[0.98]",
          overdue
            ? "border-destructive/30 bg-destructive/5"
            : submitted
              ? "border-border bg-card opacity-60"
              : "border-border bg-card",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: a.courseColor }}
              />
              <span className="truncate text-[11.5px] text-muted-foreground">{a.courseName}</span>
            </div>
            <h3 className="text-[13.5px] font-medium leading-snug text-foreground">{a.title}</h3>
            {a.dueDate && (
              <p className={cn("mt-1 text-[11px]", overdue ? "text-destructive" : "text-muted-foreground")}>
                <span className="font-mono tabular-nums">
                  {formatDate(a.dueDate)} {formatTime(a.dueDate)}
                </span>
                <span className="ml-2">{relativeDeadline(a.dueDate)}</span>
              </p>
            )}
          </div>
          <div className="mt-0.5 flex shrink-0 items-center gap-1">
            {onToggleMute && !submitted && !unknown && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleMute(a.id);
                }}
                className="rounded p-1 text-muted-foreground/60 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                title={muted ? "通知ミュート解除" : "通知をミュート"}
              >
                {muted ? <BellOff className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />}
              </button>
            )}
            {(onEdit || onDelete) && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                aria-label="操作"
                className="rounded p-1 text-muted-foreground/60 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MoreVertical className="h-4 w-4" aria-hidden />
              </button>
            )}
            <span className="ml-0.5 flex w-3 justify-center" title={toneLabel}>
              <Lamp tone={tone} size="sm" pulse={tone === "amber"} />
            </span>
          </div>
        </div>
      </a>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-2 top-12 z-40 min-w-[120px] overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-md">
            {onEdit && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(a.id);
                }}
                className="w-full px-4 py-2 text-left text-[13px] text-popover-foreground transition-colors hover:bg-muted"
              >
                編集
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(a.id);
                }}
                className="w-full px-4 py-2 text-left text-[13px] text-destructive transition-colors hover:bg-muted"
              >
                削除
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
