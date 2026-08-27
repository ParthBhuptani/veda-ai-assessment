"use client";

import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import clsx from "clsx";
import type { ExtractedQuestion, QuestionMapping, QuestionGrade } from "@/lib/types";

function ScoreChip({ grade, mapping }: { grade?: QuestionGrade; mapping?: QuestionMapping }) {
  if (!mapping || mapping.matchType === "none") {
    return (
      <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-400">
        Unanswered
      </span>
    );
  }
  if (!grade || grade.marksTotal == null || grade.marksAwarded == null) {
    const color =
      grade?.verdict === "correct"
        ? "bg-emerald-50 text-emerald-600"
        : grade?.verdict === "incorrect"
        ? "bg-red-50 text-red-500"
        : "bg-amber-50 text-amber-600";
    if (!grade) return null;
    return (
      <span className={clsx("text-xs font-medium px-2 py-1 rounded-full", color)}>
        {grade.verdict}
      </span>
    );
  }
  const ratio = grade.marksTotal > 0 ? grade.marksAwarded / grade.marksTotal : 0;
  const color =
    ratio >= 0.7
      ? "bg-emerald-50 text-emerald-600"
      : ratio >= 0.4
      ? "bg-amber-50 text-amber-600"
      : "bg-red-50 text-red-500";
  return (
    <span className={clsx("text-xs font-semibold px-2 py-1 rounded-full", color)}>
      {grade.marksAwarded}/{grade.marksTotal}
    </span>
  );
}

export function QuestionCard({
  question,
  index,
  mapping,
  grade,
  isSelected,
  isExpanded,
  isUnmatchedFlagged,
  onSelect,
  onToggleExpand,
}: {
  question: ExtractedQuestion;
  index: number;
  mapping?: QuestionMapping;
  grade?: QuestionGrade;
  isSelected: boolean;
  isExpanded: boolean;
  isUnmatchedFlagged?: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
}) {
  const unanswered = !mapping || mapping.matchType === "none";

  return (
    <div
      onClick={onSelect}
      className={clsx(
        "rounded-xl border bg-white cursor-pointer transition-colors mb-2.5",
        isSelected
          ? "border-orange-400 ring-2 ring-orange-200 shadow-sm"
          : "border-slate-200 hover:border-slate-300"
      )}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div
          className={clsx(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5",
            isSelected
              ? "bg-orange-500 text-white"
              : unanswered
              ? "bg-slate-100 text-slate-400"
              : "bg-slate-800 text-white"
          )}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400">
              {question.displayLabel}
            </span>
            {mapping?.matchType === "inferred" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-500 font-medium">
                inferred match
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700 leading-snug mt-0.5">
            {question.text}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ScoreChip grade={grade} mapping={mapping} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mx-3.5 mb-3.5 rounded-lg bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-500 mb-1">
            AI Feedback
          </p>
          <p className="text-sm text-slate-600 leading-snug">
            {grade?.feedback ??
              (unanswered
                ? "This question was not attempted."
                : "Feedback not available for this answer.")}
          </p>
          {isUnmatchedFlagged && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
              <AlertCircle size={12} /> Matched with low confidence — please
              verify.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
