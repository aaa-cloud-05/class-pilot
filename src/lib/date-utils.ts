import {
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isThisWeek,
  isPast,
  differenceInHours,
} from "date-fns";
import { ja } from "date-fns/locale";

export function relativeDeadline(date: Date): string {
  const now = new Date();
  const hoursLeft = differenceInHours(date, now);

  if (isPast(date)) {
    return `${formatDistanceToNow(date, { locale: ja })}前に締切`;
  }
  if (hoursLeft < 1) {
    return "まもなく締切";
  }
  if (hoursLeft <= 24) {
    return `あと${hoursLeft}時間`;
  }
  return formatDistanceToNow(date, { addSuffix: true, locale: ja });
}

export function groupLabel(date: Date | null): string {
  if (!date) return "締切なし";
  if (isPast(date)) return "締切超過";
  if (isToday(date)) return "今日";
  if (isTomorrow(date)) return "明日";
  if (isThisWeek(date, { weekStartsOn: 1 })) return "今週";
  return "それ以降";
}

export const GROUP_ORDER = ["締切超過", "今日", "明日", "今週", "それ以降", "締切なし"];

export function formatDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
