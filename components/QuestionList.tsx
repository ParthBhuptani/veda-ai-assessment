"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { QuestionCard } from "./QuestionCard";
import type {
  ExtractedQuestion,
  QuestionMapping,
  QuestionGrade,
  ExtractedAnswerSegment,
} from "@/lib/types";

export function QuestionList({
  questions,
  mappings,
  grades,
  segments,
  unmatchedSegmentIds,
  selectedQuestionId,
  onSelectQuestion,
}: {
  questions: ExtractedQuestion[];
  mappings: QuestionMapping[];
  grades: QuestionGrade[];
  segments: ExtractedAnswerSegment[];
  unmatchedSegmentIds: string[];
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string) => void;
}) {
  const [expandAll, setExpandAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const mappingByQ = new Map(mappings.map((m) => [m.questionId, m]));
  const gradeByQ = new Map(grades.map((g) => [g.questionId, g]));
  const segmentById = new Map(segments.map((s) => [s.id, s]));

  const isExpanded = (id: string) => expandAll || expandedIds.has(id);
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const unmatchedSegments = unmatchedSegmentIds
    .map((id) => segmentById.get(id))
    .filter((s): s is ExtractedAnswerSegment => !!s);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500">
          Extracted Questions (from question paper)
        </p>
        <button
          onClick={() => setExpandAll((v) => !v)}
          className="text-xs font-medium text-slate-500 border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-50"
        >
          {expandAll ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {questions.map((q, idx) => {
          const mapping = mappingByQ.get(q.id);
          const grade = gradeByQ.get(q.id);
          return (
            <QuestionCard
              key={q.id}
              index={idx}
              question={q}
              mapping={mapping}
              grade={grade}
              isSelected={selectedQuestionId === q.id}
              isExpanded={isExpanded(q.id)}
              isUnmatchedFlagged={mapping?.matchType === "inferred" && mapping.confidence < 0.75}
              onSelect={() => onSelectQuestion(q.id)}
              onToggleExpand={() => toggleExpand(q.id)}
            />
          );
        })}

        {unmatchedSegments.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
              <AlertTriangle size={13} />
              Unmatched answers ({unmatchedSegments.length})
            </p>
            <p className="text-xs text-amber-700/80 mb-2">
              These answer segments didn&apos;t clearly match any question on
              the paper.
            </p>
            <div className="space-y-1.5">
              {unmatchedSegments.map((s) => (
                <div
                  key={s.id}
                  className="text-xs text-slate-600 bg-white rounded-lg border border-amber-100 px-2.5 py-2 line-clamp-2"
                >
                  {s.labelSeen && (
                    <span className="font-semibold text-slate-400 mr-1">
                      &ldquo;{s.labelSeen}&rdquo;
                    </span>
                  )}
                  {s.transcribedText}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
