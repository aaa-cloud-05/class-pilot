"use client";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export function StatsCard({ label, value, sub, color }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-1 text-[11px] text-muted-foreground">{label}</p>
      <p
        className="text-2xl font-semibold tracking-tight tabular-nums text-foreground"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
