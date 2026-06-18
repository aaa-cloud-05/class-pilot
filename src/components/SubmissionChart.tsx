"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ChartItem {
  name: string;
  count: number;
  color: string;
}

interface Props {
  data: ChartItem[];
}

export function SubmissionChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 mb-3">科目別 課題数</p>
      <ResponsiveContainer width="100%" height={data.length * 40 + 16}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 12, fill: "#86868b" }}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
