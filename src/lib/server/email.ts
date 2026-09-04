import { Resend } from "resend";
import { getAppUrl } from "@/lib/server/app-url";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 送信元アドレス。
 *
 * 既定の `onboarding@resend.dev` は **Resend アカウント所有者にしか配信されない**共有ドメインで、
 * 実ユーザーにはメールが届かない。独自ドメインを Resend で認証（SPF/DKIM）したうえで
 * `RESEND_FROM="Classmino <noreply@mail.classmino.com>"` を設定すること。
 */
const FROM = process.env.RESEND_FROM ?? "Classmino <onboarding@resend.dev>";

/** 返信先。未設定なら Resend 既定（= FROM）に返信されるので、公開連絡先を入れておく。 */
const REPLY_TO = process.env.RESEND_REPLY_TO;

/** HTMLメール本文に値を埋め込む前のエスケープ（表示崩れ・属性脱出/XSS防止）。 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface DeadlineEmail {
  to: string;
  assignmentTitle: string;
  courseName: string;
  timeLabel: string;
  dueDate: Date;
  link?: string;
  scheduledAt?: Date;
}

export async function sendDeadlineEmail({
  to,
  assignmentTitle,
  courseName,
  timeLabel,
  dueDate,
  link,
  scheduledAt,
}: DeadlineEmail) {
  const dueDateStr = dueDate.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const safeTitle = escapeHtml(assignmentTitle);
  const safeCourse = escapeHtml(courseName);
  const linkHtml = link
    ? `<p><a href="${escapeHtml(link)}" style="color:#007AFF;text-decoration:underline;">課題を開く</a></p>`
    : "";

  // 通知の止め方を必ず本文に置く。受信者が止め方を見つけられないと「迷惑メール」報告に直結し、
  // 送信ドメインの評判が落ちて他のユーザーにも届かなくなる。
  const settingsUrl = `${getAppUrl()}/settings`;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
    subject: `[締切${timeLabel}] ${assignmentTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">締切まで${timeLabel}</h2>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;">
          <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#1a1a1a;">${safeTitle}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#666;">${safeCourse}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#333;">締切: ${dueDateStr}</p>
          ${linkHtml}
        </div>
        <p style="margin:16px 0 0;font-size:12px;color:#999;">
          Classmino からの通知です。
          <a href="${settingsUrl}" style="color:#999;text-decoration:underline;">通知設定を変更・停止する</a>
        </p>
      </div>
    `,
    ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
