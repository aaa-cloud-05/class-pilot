import type { CSSProperties } from "react";

/** どちらから来た課題かの札。色は2つを見分けるためだけのもので、各サービスのブランド色は使わない */
export const SOURCE = {
  webclass: { label: "WebClass", bg: "#e8edf7", fg: "#33466b", dot: "#5b76a8" },
  classroom: { label: "Classroom", bg: "#e5f3ea", fg: "#1f6a3b", dot: "#3d9a61" },
} as const;

export type Source = keyof typeof SOURCE;

export function SourceTag({ source, size = 15, style }: { source: Source; size?: number; style?: CSSProperties }) {
  const s = SOURCE[source];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.45,
        padding: `${size * 0.28}px ${size * 0.7}px`,
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        fontSize: size,
        fontWeight: 700,
        whiteSpace: "nowrap",
        lineHeight: 1.2,
        ...style,
      }}
    >
      <span style={{ width: size * 0.45, height: size * 0.45, borderRadius: 99, background: s.dot }} />
      {s.label}
    </span>
  );
}
