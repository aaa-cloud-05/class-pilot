"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "ホーム", Icon: Home },
  { href: "/calendar", label: "カレンダー", Icon: Calendar },
  { href: "/docs", label: "ガイド", Icon: BookOpen },
  { href: "/me", label: "アカウント", Icon: User },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-md items-center justify-around px-2">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
