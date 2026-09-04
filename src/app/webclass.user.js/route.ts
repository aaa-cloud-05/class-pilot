import { buildUserscriptCode } from "@/lib/webclass-script";
import { getAppUrl } from "@/lib/server/app-url";

/**
 * ユーザースクリプトを `.user.js` として配信する。
 *
 * Tampermonkey / Violentmonkey は **URL が .user.js で終わる**とインストール画面を
 * 自動で開く。これにより利用者は「新規スクリプトを作成してコードを貼る」という
 * 手順を踏まずに、リンクを1回踏むだけで導入できる。
 *
 * `@updateURL` もここを指しているので、こちらが直せば各自の環境に自動配信される
 * （拡張機能ストアの審査待ちが無いのが、この方式の利点）。
 */
export function GET() {
  const code = buildUserscriptCode(getAppUrl());

  return new Response(code, {
    headers: {
      // text/javascript だとブラウザが実行/表示してしまうことがあるため、
      // ユーザースクリプトの慣例どおり明示する
      "Content-Type": "application/javascript; charset=utf-8",
      // 更新チェックが毎回サーバに届くようにする（内容は毎回生成される）
      "Cache-Control": "no-store",
    },
  });
}
