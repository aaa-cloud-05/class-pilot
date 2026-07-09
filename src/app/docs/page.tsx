import { AppHeader } from "@/components/app-header";
import { NavBar } from "@/components/NavBar";

export default function DocsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center px-4 pb-24 pt-10 text-center">
        <p className="text-sm text-muted-foreground">ガイドは準備中です。</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          オンボーディングや使い方の記事をここに追加予定です。
        </p>
      </main>
      <NavBar />
    </div>
  );
}
