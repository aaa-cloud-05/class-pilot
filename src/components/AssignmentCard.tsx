"use client";

import type { Assignment } from "@/lib/types";
import { relativeDeadline, formatDate, formatTime } from "@/lib/date-utils";
import { isPast } from "date-fns";

export function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const a = assignment;
  const overdue = a.dueDate && isPast(a.dueDate) && a.submissionState === "not_submitted";
  const submitted = a.submissionState === "submitted" || a.submissionState === "returned";

  return (
    <a
      href={a.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-2xl border p-4 transition active:scale-[0.98] ${
        overdue
          ? "border-red-200 bg-red-50/50"
          : submitted
          ? "border-gray-100 bg-gray-50/50 opacity-60"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: a.courseColor }}
            />
            <span className="text-xs text-gray-500 truncate">{a.courseName}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{a.title}</h3>
          {a.dueDate && (
            <p className={`text-xs mt-1 ${overdue ? "text-red-500" : "text-gray-400"}`}>
              {formatDate(a.dueDate)} {formatTime(a.dueDate)}
              <span className="ml-2">{relativeDeadline(a.dueDate)}</span>
            </p>
          )}
        </div>
        <div className="flex-shrink-0 mt-1">
          {submitted ? (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              提出済
            </span>
          ) : overdue ? (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              未提出
            </span>
          ) : (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              未提出
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
