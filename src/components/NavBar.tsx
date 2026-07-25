"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Bell, Plus, BookOpen, User } from "lucide-react";
import { getUnreadCount } from "@/lib/notification-store";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "ホーム", Icon: Home },
  { href: "/activity", label: "アクティビティ", Icon: Bell, badge: true },
  { href: "/new", label: "追加", Icon: Plus },
  { href: "/docs", label: "ガイド", Icon: BookOpen },
  { href: "/me", label: "アカウント", Icon: User },
];

// SSRでは no-op、クライアントでは描画前に走る（ピル位置の測定で一瞬のズレを防ぐ）。
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();

  const activeIndex = tabs.findIndex((t) =>
    t.href === "/" ? pathname === "/" : pathname.startsWith(t.href),
  );

  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pressing = useRef(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [unread, setUnread] = useState(0);

  // 表示中のハイライト位置。ドラッグ中は指の位置、通常はアクティブなタブ。
  const shownIndex = dragIndex ?? activeIndex;
  const pillVisible = shownIndex >= 0;

  // 未読数を取得（画面遷移のたびに取り直して既読反映する）。
  useEffect(() => {
    let cancelled = false;
    getUnreadCount().then((c) => {
      if (!cancelled) setUnread(c);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // 対象ボタンの実寸からピルの left/width を測る。
  const measure = useCallback((i: number) => {
    const el = btnRefs.current[i];
    if (!el) return;
    setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, []);

  useIsoLayoutEffect(() => {
    if (pillVisible) measure(shownIndex);
  }, [shownIndex, pillVisible, measure]);

  useEffect(() => {
    const onResize = () => {
      if (pillVisible) measure(shownIndex);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [shownIndex, pillVisible, measure]);

  // 指/ポインタの X から、その位置にあるタブの index を求める（等幅前提）。
  const indexFromClientX = (clientX: number): number => {
    const list = listRef.current;
    if (!list) return Math.max(0, activeIndex);
    const rect = list.getBoundingClientRect();
    const rel = clientX - rect.left;
    const slot = rect.width / tabs.length;
    return Math.max(0, Math.min(tabs.length - 1, Math.floor(rel / slot)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pressing.current = true;
    setDragIndex(indexFromClientX(e.clientX));
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pressing.current) return;
    const i = indexFromClientX(e.clientX);
    setDragIndex((prev) => (prev === i ? prev : i));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pressing.current) return;
    pressing.current = false;
    const i = indexFromClientX(e.clientX);
    // dragIndex はターゲットのまま保持（即 null にすると一瞬アクティブへ戻り往復するため）。
    // 下の effect が、パス変更で activeIndex が追いついたら解除する。
    setDragIndex(i);
    router.push(tabs[i].href);
  };

  const onPointerCancel = () => {
    pressing.current = false;
    setDragIndex(null);
  };

  // 遷移が完了して activeIndex がドラッグ先に追いついたら、保持していた dragIndex を解除。
  useEffect(() => {
    if (dragIndex !== null && activeIndex === dragIndex) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDragIndex(null);
    }
  }, [activeIndex, dragIndex]);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]">
      <div
        ref={listRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ touchAction: "none" }}
        className={cn(
          "pointer-events-auto relative grid w-full max-w-[20rem] touch-none select-none grid-cols-5 items-center p-1.5",
          "rounded-full border border-border/50 bg-background/55 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.25)] backdrop-blur-2xl",
          "ring-1 ring-white/10 supports-[backdrop-filter]:bg-background/45",
        )}
      >
        {/* にゅるっと動く選択ピル（中央の追加ボタン以外） */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1.5 bottom-1.5 rounded-full bg-foreground/10 shadow-inner",
            "transition-[left,width,opacity] duration-300 ease-out",
            pillVisible ? "opacity-100" : "opacity-0",
          )}
          style={pill ? { left: pill.left, width: pill.width } : undefined}
        />

        {tabs.map(({ href, label, Icon, badge }, i) => {
          const highlighted = i === shownIndex;

          return (
            <button
              key={href}
              type="button"
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              aria-label={badge && unread > 0 ? `${label}（未読${unread}件）` : label}
              aria-current={i === activeIndex ? "page" : undefined}
              onClick={(e) => {
                if (e.detail === 0) router.push(href);
              }}
              className={cn(
                "relative z-10 flex h-11 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                highlighted ? "text-foreground" : "text-muted-foreground/60",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {badge && unread > 0 && i !== activeIndex && (
                <span
                  className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full ring-2 ring-background"
                  style={{ backgroundColor: "var(--lamp-red)" }}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
