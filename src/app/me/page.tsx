"use client";

import { AppHeader } from "@/components/app-header";
import { NavBar } from "@/components/NavBar";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function MePage() {
  const { status } = useSession();
  const loggedIn = status === "authenticated";

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />

      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-4">
        <Link
          href={loggedIn ? "/settings" : "/login"}
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-[13px] text-card-foreground transition-colors hover:bg-muted/40"
        >
          <span>設定・アカウント</span>
          <span className="text-muted-foreground">›</span>
        </Link>
      </main>

      <NavBar />
    </div>
  );
}
