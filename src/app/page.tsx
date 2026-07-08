import Link from "next/link";
import { Dashboard } from "@/components/dashboard";
import { NavBar } from "@/components/NavBar";

export default function Page() {
  return (
    <div className="min-h-dvh bg-background">
      <Dashboard />

      {/* 課題を追加（FAB） */}
      <Link
        href="/add"
        aria-label="課題を追加"
        className="fixed right-5 bottom-20 z-20 mb-[env(safe-area-inset-bottom)] flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>

      <NavBar />
    </div>
  );
}
