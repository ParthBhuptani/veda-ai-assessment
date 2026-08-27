import { Sparkles } from "lucide-react";
import type { ProcessingStage } from "@/lib/types";

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: "Preparing…",
  rendering: "Reading your files…",
  "extracting-questions": "Extracting questions…",
  "extracting-answers": "Extracting answers…",
  mapping: "Mapping answers to questions…",
  grading: "Grading answers…",
  done: "Done",
  error: "Something went wrong",
};

export function LoadingScreen({ stage }: { stage: ProcessingStage }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl h-[70vh] rounded-2xl border-2 border-orange-300 bg-white flex flex-col items-center justify-center gap-3">
        <Sparkles size={32} className="text-orange-500 animate-pulse" />
        <p className="text-lg font-semibold text-slate-900">
          {STAGE_LABELS[stage]}
        </p>
        <p className="text-sm text-slate-400">This may take a while</p>
      </div>
    </div>
  );
}
