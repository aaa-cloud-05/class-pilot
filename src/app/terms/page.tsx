import Link from "next/link";

export const metadata = {
  title: "利用規約 | Class Pilot",
};

const UPDATED = "2026年7月1日";
const CONTACT = "f.ord10.5k@gmail.com";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-5 pt-14 pb-16 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">利用規約</h1>
      <p className="text-xs text-gray-400 mb-8">最終更新日: {UPDATED}</p>

      <div className="space-y-7 text-sm leading-relaxed text-gray-700">
        <p>
          本規約は、個人開発アプリ Class Pilot（以下「本サービス」）の利用条件を定めるものです。
          本サービスを利用することで、本規約に同意したものとみなされます。
        </p>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">1. サービス内容</h2>
          <p>
            本サービスは、Google Classroom および WebClass の課題を集約して表示し、締切リマインダーを
            提供します。個人が無償で提供するものであり、機能の継続・正常動作を保証しません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">2. データの正確性</h2>
          <p>
            表示される課題・締切は Google Classroom や WebClass から取得した時点の情報、またはユーザー
            入力に基づきます。取得漏れ・遅延・誤りが生じる可能性があるため、
            <strong>提出期限は必ず公式の情報源で確認してください</strong>。本サービスの情報に起因する
            提出遅れ等について、開発者は責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">3. 禁止事項</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>法令または公序良俗に反する行為</li>
            <li>本サービスやサーバーに過度な負荷をかける行為、不正アクセス</li>
            <li>他者のアカウント・データへの不正な取得・利用</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">4. 免責</h2>
          <p>
            本サービスは「現状有姿」で提供され、明示・黙示を問わずいかなる保証も行いません。
            本サービスの利用または利用不能から生じた損害について、開発者は一切の責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">5. 変更・終了</h2>
          <p>
            開発者は、事前の通知なく本サービスの内容を変更・中断・終了できるものとします。
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">6. 規約の変更</h2>
          <p>本規約は必要に応じて改定されることがあります。改定後の規約は本ページに掲載した時点で効力を生じます。</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">7. お問い合わせ</h2>
          <p>
            本規約に関するお問い合わせは{" "}
            <a href={`mailto:${CONTACT}`} className="text-blue-600 underline">
              {CONTACT}
            </a>{" "}
            までご連絡ください。
          </p>
        </section>
      </div>

      <div className="mt-10 flex gap-4 text-sm">
        <Link href="/" className="text-blue-600">
          ← ホームへ
        </Link>
        <Link href="/privacy" className="text-blue-600">
          プライバシーポリシー
        </Link>
      </div>
    </div>
  );
}
