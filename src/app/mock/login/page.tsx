"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellRing, CalendarDays, Layers } from "lucide-react"
import { useMock } from "../_components/provider"
import { Brand } from "../_components/shell"
import { Button } from "../_components/ui"

const POINTS = [
  { icon: Layers, title: "WebClass と Classroom をひとつに", desc: "2つの課題を締切順にまとめて表示します" },
  { icon: BellRing, title: "締切の前に知らせる", desc: "プッシュ通知とメールで、出し忘れを防ぎます" },
  { icon: CalendarDays, title: "1週間の予定がすぐ分かる", desc: "カレンダーで忙しい日をひと目で確認" },
]

function GoogleMark() {
  // Google 公式ロゴ（ブランドガイドラインの配色）
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function MockLoginPage() {
  const router = useRouter()
  const { setControl } = useMock()

  const enter = (loggedIn: boolean) => {
    setControl("loggedIn", loggedIn)
    if (loggedIn) setControl("data", "normal")
    router.push("/mock/home")
  }

  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-surface p-12 lg:flex">
        <Brand size="lg" />
        <div>
          <h2 className="max-w-md text-[40px] font-bold leading-[1.3] tracking-[-0.02em]">課題の締切を、ひとつの場所で。</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand-text">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-[17px] font-bold">{title}</span>
                  <span className="mt-0.5 block text-[15px] text-ink-2">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[13px] text-ink-3">UnionFetch は Google・WebClass とは関係のない非公式ツールです。</p>
      </section>

      <section className="flex min-h-dvh flex-col px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)] lg:items-center lg:justify-center">
        <div className="flex flex-1 flex-col lg:w-full lg:max-w-sm lg:flex-none">
          <div className="lg:hidden">
            <Brand />
          </div>

          <div className="flex flex-1 flex-col justify-center py-10 lg:flex-none lg:py-0">
            {/* イラスト枠：素材が決まったらここに入れる（スマホのみ） */}
            <div className="mb-8 flex aspect-[4/3] w-full items-center justify-center rounded-sheet border border-dashed border-line-strong text-[13px] text-ink-3 lg:hidden">
              イラスト枠
            </div>
            <h1 className="text-[28px] font-bold leading-snug tracking-[-0.02em] lg:text-[26px]">
              <span className="lg:hidden">課題の締切を、ひとつの場所で。</span>
              <span className="hidden lg:inline">ログイン</span>
            </h1>
            <p className="mt-3 text-[16px] leading-[1.75] text-ink-2">
              WebClass と Google Classroom の課題をまとめて、締切の前に通知します。
            </p>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={() => enter(true)}
                className="flex h-[52px] w-full items-center justify-center gap-3 rounded-control bg-surface text-[16px] font-semibold text-ink shadow-card outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-signal active:scale-[0.98]"
              >
                <GoogleMark />
                Google でログイン
              </button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => enter(false)}>
                ログインせずに使う
              </Button>
            </div>
            <p className="mt-3 text-center text-[13px] leading-relaxed text-ink-3">
              ログインしない場合、課題はこの端末にだけ保存されます。
            </p>
          </div>

          <p className="text-center text-[13px] leading-relaxed text-ink-3">
            ログインすると
            <Link href="/terms" className="font-semibold text-brand-text hover:underline">
              利用規約
            </Link>
            と
            <Link href="/privacy" className="font-semibold text-brand-text hover:underline">
              プライバシーポリシー
            </Link>
            に同意したものとみなします。課題は読み取り専用で取得します。
          </p>
        </div>
      </section>
    </main>
  )
}
