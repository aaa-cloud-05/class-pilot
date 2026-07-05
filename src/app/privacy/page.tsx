import Link from "next/link";

export const metadata = {
  title: "プライバシーポリシー | Class Pilot",
};

const UPDATED = "2026年7月1日";
const CONTACT = "f.ord10.5k@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-5 pt-14 pb-16 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">プライバシーポリシー</h1>
      <p className="text-xs text-gray-400 mb-8">最終更新日: {UPDATED}</p>

      <div className="space-y-7 text-sm leading-relaxed text-gray-700">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <strong>本サービスは個人が開発・運営する非公式のツールです。</strong>
          Google LLC、日本データパシフィック株式会社（WebClass 提供元）その他いかなる組織とも
          提携・関係していません。各サービスの名称・商標は各権利者に帰属します。
        </div>

        <p>
          Class Pilot（以下「本サービス」）は、Google Classroom および WebClass の課題を集約し、
          締切リマインダーを提供する個人開発の Web アプリケーションです。本ポリシーは、本サービスが
          取得する情報とその取り扱いについて説明します。
        </p>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">1. 取得する情報</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Google アカウント情報（メールアドレス、氏名、プロフィール画像）</li>
            <li>
              Google Classroom のデータ（受講コース名、課題のタイトル・説明・締切・課題ページへのリンク、提出状況）。
              <strong>読み取り専用</strong>で取得し、Classroom 側のデータを変更することはありません。
            </li>
            <li>WebClass から取り込んだデータ（コース名、教材、締切、コースページへのリンク、状態）</li>
            <li>ユーザーが本サービス内で作成・編集した課題、および通知設定</li>
          </ul>

          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="font-semibold text-gray-900 mb-1">取得・保存しない情報</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>成績・点数</strong>（Classroom の評点、WebClass の最高点）は取得・保存しません。
              </li>
              <li>締切管理に不要な情報（WebClass の実施日など）は取り込みません。</li>
              <li>
                上記以外の Google データ（ドライブ、Gmail の本文、連絡先など）にはアクセスしません。
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">2. 利用目的</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>課題を一覧・カレンダー・統計として表示するため</li>
            <li>締切前のリマインダー（メール・ブラウザ通知）を送信するため</li>
          </ul>
          <p className="mt-2">
            取得した情報を、上記目的以外で利用したり、広告目的で第三者に販売・提供することはありません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">3. 保存場所</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>サーバーのデータベース（Supabase / PostgreSQL）</li>
            <li>ご利用の端末・ブラウザ内のローカルストレージ（IndexedDB）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">4. 利用する外部サービス</h2>
          <p>本サービスは以下の外部サービスを利用します。各社のポリシーが適用されます。</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Google（認証・Google Classroom API）</li>
            <li>Vercel（ホスティング）</li>
            <li>Supabase（データベース）</li>
            <li>Resend（メール送信）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            5. Google ユーザーデータの取り扱い
          </h2>
          <p>
            本サービスによる Google API から受け取った情報の利用および他者への移転は、
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Google API Services User Data Policy
            </a>
            （限定使用に関する要件を含む）に準拠します。Google Classroom のデータは、ユーザーへの
            課題表示およびリマインダー送信の目的にのみ使用します。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">6. データの削除</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>端末内のデータは、設定画面の「ローカルデータを全消去」で削除できます。</li>
            <li>
              アカウントおよびサーバー上のデータは、設定画面の「アカウントを削除」から
              ご自身でいつでも完全に削除できます（削除後は復元できません）。
            </li>
            <li>
              Google アカウントとの連携は、
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Google アカウントの権限設定
              </a>
              からいつでも解除できます。
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">7. お問い合わせ</h2>
          <p>
            本ポリシーに関するお問い合わせは{" "}
            <a href={`mailto:${CONTACT}`} className="text-blue-600 underline">
              {CONTACT}
            </a>{" "}
            までご連絡ください。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">8. 改定</h2>
          <p>
            本ポリシーは必要に応じて改定されることがあります。重要な変更がある場合は本ページ上で告知します。
          </p>
        </section>
      </div>

      <div className="mt-10 flex gap-4 text-sm">
        <Link href="/" className="text-blue-600">
          ← ホームへ
        </Link>
        <Link href="/terms" className="text-blue-600">
          利用規約
        </Link>
      </div>
    </div>
  );
}
