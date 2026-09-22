"use client";

import { useSyncExternalStore } from "react";

/** PC レイアウトに切り替わる幅。Tailwind の lg と同じ */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * メディアクエリの一致を購読する。
 * SSR では必ず false を返すので、サーバとクライアントで描き分けが食い違わない。
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
