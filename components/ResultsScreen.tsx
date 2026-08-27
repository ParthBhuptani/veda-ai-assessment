"use client";

import { useState } from "react";
import { QuestionList } from "./QuestionList";
import { AnswerSheetViewer } from "./AnswerSheetViewer";
import type { ProcessedResult } from "@/lib/types";
import clsx from "clsx";

export function ResultsScreen({ result }: { result: ProcessedResult }) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    result.questionPaper.questions[0]?.id ?? null
  );
  const [mobileTab, setMobileTab] = useState<"questions" | "answersheet">(
    "questions"
  );

  const selectedQuestion = result.questionPaper.questions.find(
    (q) => q.id === selectedQuestionId
  );
  const selectedMapping = result.mappings.find(
    (m) => m.questionId === selectedQuestionId
  );

  const { totalQuestions, answered, unanswered, unmatchedAnswers } =
    result.summary;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-slate-100 text-xs">
        <span className="font-semibold text-slate-700">
          {answered}/{totalQuestions} answered
        </span>
        <span className="text-slate-400">•</span>
        <span className="text-amber-600">{unanswered} unanswered</span>
        <span className="text-slate-400">•</span>
        <span className="text-slate-500">{unmatchedAnswers} unmatched answers</span>
        {result.summary.totalMarksPossible != null && (
          <>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-slate-700">
              Score: {result.summary.totalMarksAwarded}/
              {result.summary.totalMarksPossible}
            </span>
          </>
        )}
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden flex gap-1 px-4 py-2 border-b border-slate-100">
        {(["questions", "answersheet"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={clsx(
              "flex-1 text-sm font-medium py-2 rounded-full transition-colors",
              mobileTab === tab
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-500"
            )}
          >
            {tab === "questions" ? "Questions" : "Answer Sheet"}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        <div
          className={clsx(
            "min-h-0 border border-slate-200 rounded-xl bg-white overflow-hidden",
            mobileTab !== "questions" && "hidden md:block"
          )}
        >
          <QuestionList
            questions={result.questionPaper.questions}
            mappings={result.mappings}
            grades={result.grades}
            segments={result.answerSheet.segments}
            unmatchedSegmentIds={result.unmatchedSegmentIds}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={setSelectedQuestionId}
          />
        </div>

        <div
          className={clsx(
            "min-h-0",
            mobileTab !== "answersheet" && "hidden md:block"
          )}
        >
          <AnswerSheetViewer
            key={selectedQuestionId}
            pages={result.answerSheet.pages}
            segments={result.answerSheet.segments}
            activeSegmentIds={selectedMapping?.answerSegmentIds ?? []}
            activeLabel={selectedQuestion?.displayLabel ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
