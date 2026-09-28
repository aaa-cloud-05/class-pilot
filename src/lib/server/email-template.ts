/**
 * 締切通知メールの中身（件名・HTML・テキスト）を組み立てる。送信は email.ts。
 * import を持たない純粋な関数にしてあるので、送らずにプレビューを書き出せる。
 *
 * メールクライアントは CSS の対応がまちまちなので、レイアウトは table とインライン style だけで組む。
 */

export interface DeadlineEmailContent {
  assignmentTitle: string;
  courseName: string;
  /** 「24時間」「3時間」「45分」など。件名と見出しで「あと〜」として使う */
  timeLabel: string;
  dueDate: Date;
  /** 課題ページ（WebClass / Classroom）。手動で追加した課題には無い */
  link?: string;
  /** 本番の URL（https://unionfetch.com など）。末尾のスラッシュは無し */
  appUrl: string;
}

/** HTMLメール本文に値を埋め込む前のエスケープ（表示崩れ・属性脱出/XSS防止）。 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT = `-apple-system,BlinkMacSystemFont,"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",Meiryo,sans-serif`;
const C = {
  page: "#f2f3f5",
  card: "#ffffff",
  text: "#1a1a1a",
  sub: "#6b7280",
  faint: "#9ca3af",
  line: "#e5e7eb",
  primary: "#007AFF",
  // アプリの「24時間以内」と同じ色（src/lib/status.ts の soon）
  soon: "#e3b169",
  soonText: "#b7791f",
};

/** 締切日時を日本時間の「9月30日(水) 23:59」にする。メールとプッシュで同じ書き方にする */
export function formatDueJst(d: Date): string {
  return d.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function renderDeadlineEmail({ assignmentTitle, courseName, timeLabel, dueDate, link, appUrl }: DeadlineEmailContent) {
  const due = formatDueJst(dueDate);
  // 通知の止め方を必ず本文に置く。受信者が止め方を見つけられないと「迷惑メール」報告に直結し、
  // 送信ドメインの評判が落ちて他のユーザーにも届かなくなる。
  const settingsUrl = `${appUrl}/settings/notifications`;

  const subject = `【締切まであと${timeLabel}】${assignmentTitle}`;
  // 受信トレイの一覧で件名の横に出る1行
  const preheader = `${courseName}「${assignmentTitle}」の締切は ${due} です。`;

  const title = escapeHtml(assignmentTitle);
  const course = escapeHtml(courseName);
  const safeLink = link ? escapeHtml(link) : "";

  const button = safeLink
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
          <tr><td style="border-radius:10px;background:${C.primary};">
            <a href="${safeLink}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">課題を開く</a>
          </td></tr>
        </table>`
    : "";

  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};font-family:${FONT};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
      <tr><td style="padding:0 4px 16px;">
        <a href="${appUrl}" style="text-decoration:none;color:${C.text};">
          <img src="${appUrl}/icons/icon-192.png" width="24" height="24" alt="" style="vertical-align:middle;border:0;border-radius:6px;">
          <span style="vertical-align:middle;margin-left:6px;font-size:16px;font-weight:700;letter-spacing:-0.02em;">UnionFetch</span>
        </a>
      </td></tr>

      <tr><td style="background:${C.card};border-radius:16px;padding:28px 24px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:${C.soonText};">締切まで</p>
        <p style="margin:2px 0 0;font-size:30px;font-weight:700;line-height:1.2;color:${C.text};letter-spacing:-0.02em;">あと${escapeHtml(timeLabel)}</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;">
          <tr>
            <td width="4" style="background:${C.soon};border-radius:2px;"></td>
            <td style="padding:2px 0 2px 14px;">
              <p style="margin:0;font-size:13px;color:${C.sub};">${course}</p>
              <p style="margin:4px 0 0;font-size:17px;font-weight:700;line-height:1.45;color:${C.text};">${title}</p>
              <p style="margin:8px 0 0;font-size:14px;color:${C.text};">締切 <strong>${due}</strong></p>
            </td>
          </tr>
        </table>

        ${button}

        <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid ${C.line};font-size:13px;line-height:1.7;color:${C.sub};">
          もう提出していたら、<a href="${appUrl}" style="color:${C.primary};text-decoration:none;font-weight:600;">UnionFetch</a>
          で提出済みにすると、この課題のメールは止まります（WebClass は取り込み直しでも反映されます）。
        </p>
      </td></tr>

      <tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.8;color:${C.faint};">
        WebClass と Google Classroom の締切を、UnionFetch がお知らせしています。<br>
        <a href="${settingsUrl}" style="color:${C.faint};text-decoration:underline;">通知のタイミングを変える・通知を止める</a><br>
        UnionFetch は Google・WebClass とは関係のない非公式ツールです。
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  // HTML を表示しないクライアント向け。テキスト版があると迷惑メール判定も受けにくい
  const text = [
    `締切まであと${timeLabel}`,
    "",
    assignmentTitle,
    courseName,
    `締切: ${due}`,
    ...(link ? ["", `課題を開く: ${link}`] : []),
    "",
    `もう提出していたら、UnionFetch（${appUrl}）で提出済みにすると、この課題のメールは止まります（WebClass は取り込み直しでも反映されます）。`,
    "",
    "―",
    "WebClass と Google Classroom の締切を、UnionFetch がお知らせしています。",
    `通知のタイミングを変える・通知を止める: ${settingsUrl}`,
    "UnionFetch は Google・WebClass とは関係のない非公式ツールです。",
  ].join("\n");

  return { subject, html, text };
}
