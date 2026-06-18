"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { Assignment } from "@/lib/types";
import { DayDetail } from "./DayDetail";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

interface Props {
  assignments: Assignment[];
}

export function CalendarGrid({ assignments }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (!a.dueDate) continue;
      const key = format(a.dueDate, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [assignments]);

  const selectedAssignments = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, "yyyy-MM-dd");
    return assignmentsByDate.get(key) ?? [];
  }, [selectedDay, assignmentsByDate]);

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-semibold">
          {format(currentMonth, "yyyy年 M月", { locale: ja })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayAssignments = assignmentsByDate.get(key) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDay && isSameDay(day, selectedDay);

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center py-2 rounded-xl transition ${
                selected
                  ? "bg-blue-50"
                  : "hover:bg-gray-50"
              } ${!inMonth ? "opacity-30" : ""}`}
            >
              <span
                className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${
                  today
                    ? "bg-blue-600 text-white font-semibold"
                    : selected
                    ? "text-blue-600 font-semibold"
                    : "text-gray-700"
                }`}
              >
                {format(day, "d")}
              </span>
              {/* Dots */}
              <div className="flex gap-0.5 mt-1 h-1.5">
                {dayAssignments.slice(0, 3).map((a, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: a.courseColor }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <DayDetail
          date={selectedDay}
          assignments={selectedAssignments}
        />
      )}
    </div>
  );
}
