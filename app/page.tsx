"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { UploadScreen } from "@/components/UploadScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import type { PageImage, ProcessedResult, ProcessingStage } from "@/lib/types";

export default function Home() {
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(
    questionPaperPages: PageImage[],
    answerSheetPages: PageImage[]
  ) {
    setError(null);
    setStage("extracting-questions");
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionPaperPages,
          answerSheetPages,
          gradingEnabled: true,
        }),
      });

      setStage("mapping");

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with ${res.status}`);
      }

      const data = (await res.json()) as ProcessedResult;
      setStage("grading");
      setResult(data);
      setStage("done");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        {stage === "idle" && <UploadScreen onStart={handleStart} />}
        {(stage === "rendering" ||
          stage === "extracting-questions" ||
          stage === "extracting-answers" ||
          stage === "mapping" ||
          stage === "grading") && <LoadingScreen stage={stage} />}
        {stage === "error" && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center">
              <p className="text-red-500 font-medium mb-2">
                Something went wrong
              </p>
              <p className="text-sm text-slate-500 mb-4">{error}</p>
              <button
                onClick={() => setStage("idle")}
                className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-full"
              >
                Try again
              </button>
            </div>
          </div>
        )}
        {stage === "done" && result && <ResultsScreen result={result} />}
      </div>
    </div>
  );
}
