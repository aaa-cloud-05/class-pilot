import { Resend } from "resend";
import { getAppUrl } from "@/lib/server/app-url";
import { renderDeadlineEmail } from "@/lib/server/email-template";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 送信元アドレス。
 *
 * 既定の `onboarding@resend.dev` は **Resend アカウント所有者にしか配信されない**共有ドメインで、
 * 実ユーザーにはメールが届かない。独自ドメインを Resend で認証（SPF/DKIM）したうえで
 * `RESEND_FROM="UnionFetch <noreply@mail.unionfetch.com>"` を設定すること。
 */
const FROM = process.env.RESEND_FROM ?? "UnionFetch <onboarding@resend.dev>";

/** 返信先。未設定なら Resend 既定（= FROM）に返信されるので、公開連絡先を入れておく。 */
const REPLY_TO = process.env.RESEND_REPLY_TO;

interface DeadlineEmail {
  to: string;
  assignmentTitle: string;
  courseName: string;
  timeLabel: string;
  dueDate: Date;
  link?: string;
  scheduledAt?: Date;
}

export async function sendDeadlineEmail({ to, scheduledAt, ...content }: DeadlineEmail) {
  // 件名・本文の組み立ては email-template.ts（送らずにプレビューできるよう分けてある）
  const { subject, html, text } = renderDeadlineEmail({ ...content, appUrl: getAppUrl() });

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
    subject,
    html,
    text,
    ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
