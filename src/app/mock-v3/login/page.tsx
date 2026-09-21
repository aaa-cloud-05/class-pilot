"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { useMock } from "../_components/provider"
import { Brand } from "../_components/shell"
import { Button } from "../_components/ui"

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { setControl } = useMock()

  const enter = (loggedIn: boolean) => {
    setControl("loggedIn", loggedIn)
    router.push(loggedIn ? "/mock-v3/start" : "/mock-v3/home")
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[22rem]"
      >
        <Brand size="lg" />
        <h1 className="mt-7 text-[22px] font-semibold leading-snug tracking-[-0.01em]">
          WebClass と Classroom の締切を、ひとつに。
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          課題をまとめて表示し、締切の前に知らせます。
        </p>

        <div className="mt-7 space-y-2">
          <Button variant="primary" size="lg" className="w-full" onClick={() => enter(true)}>
            <GoogleMark />
            Google で続ける
          </Button>
          <Button size="lg" className="w-full" onClick={() => enter(false)}>
            ログインせずに使う
          </Button>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          ログインしない場合、課題はこの端末にだけ保存されます。続けると
          <Link href="/terms" className="text-primary hover:underline">
            利用規約
          </Link>
          と
          <Link href="/privacy" className="text-primary hover:underline">
            プライバシーポリシー
          </Link>
          に同意したものとみなします。
        </p>
        <p className="mt-3 text-[12px] text-muted-foreground">
          Google・WebClass とは関係のない非公式ツールです。課題は読み取り専用で取得します。
        </p>
      </motion.div>
    </main>
  )
}
