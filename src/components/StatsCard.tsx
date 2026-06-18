"use client";

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export function StatsCard({ label, value, sub, color = "#007AFF" }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
