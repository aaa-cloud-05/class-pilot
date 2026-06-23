import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const linkHtml = link
    ? `<p><a href="${link}" style="color:#007AFF;text-decoration:underline;">課題を開く</a></p>`
    : "";

  const { error } = await resend.emails.send({
    from: "Class Pilot <onboarding@resend.dev>",
    to,
    subject: `[締切${timeLabel}] ${assignmentTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">締切まで${timeLabel}</h2>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;">
          <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#1a1a1a;">${assignmentTitle}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#666;">${courseName}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#333;">締切: ${dueDateStr}</p>
          ${linkHtml}
        </div>
        <p style="margin:16px 0 0;font-size:12px;color:#999;">Class Pilot からの通知です</p>
      </div>
    `,
    ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
