"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { Assignment } from "@/lib/types";
import { AssignmentCard } from "./AssignmentCard";

interface Props {
  date: Date;
  assignments: Assignment[];
}

export function DayDetail({ date, assignments }: Props) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        {format(date, "M月d日（E）", { locale: ja })}
      </h3>
      {assignments.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">この日の課題はありません</p>
      ) : (
        <div className="flex flex-col gap-2">
          {assignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  );
}
