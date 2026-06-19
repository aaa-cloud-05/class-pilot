"use client";

import type { Assignment } from "@/lib/types";
import { relativeDeadline, formatDate, formatTime } from "@/lib/date-utils";
import { isPast } from "date-fns";

interface AssignmentCardProps {
  assignment: Assignment;
  muted?: boolean;
  onToggleMute?: (id: string) => void;
}

export function AssignmentCard({ assignment, muted, onToggleMute }: AssignmentCardProps) {
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
        <div className="flex-shrink-0 mt-1 flex items-center gap-1.5">
          {onToggleMute && !submitted && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleMute(a.id);
              }}
              className="p-1 rounded text-gray-300 hover:text-gray-500"
              title={muted ? "通知ミュート解除" : "通知をミュート"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                {muted ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m3.155 6.852a3 3 0 005.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.9 23.9 0 003.225-1.36 8.964 8.964 0 00-1.4-6.914m-1.825 8.274a23.856 23.856 0 01-5.455-1.31M3.124 7.5A8.969 8.969 0 015.292 3m13.416 13.416l2.292-2.292" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                )}
              </svg>
            </button>
          )}
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
