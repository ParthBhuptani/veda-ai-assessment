"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X, ArrowRight, Eye, Loader2 } from "lucide-react";
import clsx from "clsx";
import { fileToPageImages } from "@/lib/fileToPages";
import type { PageImage } from "@/lib/types";

interface SlotState {
  file: File;
  pages: PageImage[];
  status: "rendering" | "ready" | "error";
  error?: string;
}

interface UploadSlotProps {
  label: string;
  slot: SlotState | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  onPreview: () => void;
}

function UploadSlot({ label, slot, onSelect, onClear, onPreview }: UploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onSelect(f);
      }}
      onClick={() => !slot && inputRef.current?.click()}
      className={clsx(
        "relative flex items-center gap-3 rounded-2xl border-2 border-dashed p-4 min-h-[128px] w-full sm:w-72 cursor-pointer transition-colors bg-white",
        dragOver ? "border-orange-400 bg-orange-50/50" : "border-slate-200",
        slot && "border-solid border-slate-200 cursor-default"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
      {slot ? (
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (slot.status === "ready") onPreview();
            }}
            className={clsx(
              "relative w-14 h-[72px] rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0",
              slot.status === "ready" && "cursor-zoom-in group"
            )}
          >
            {slot.status === "rendering" && (
              <Loader2 size={18} className="animate-spin text-slate-400" />
            )}
            {slot.status === "error" && (
              <FileText size={18} className="text-red-400" />
            )}
            {slot.status === "ready" && slot.pages[0] && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slot.pages[0].dataUrl}
                  alt={`${label} preview`}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                  <Eye
                    size={16}
                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">
              {slot.file.name}
            </p>
            <p className="text-xs text-slate-400">
              {slot.status === "rendering" && "Preparing preview…"}
              {slot.status === "error" && (slot.error ?? "Couldn't read file")}
              {slot.status === "ready" &&
                `${(slot.file.size / (1024 * 1024)).toFixed(2)} MB · ${
                  slot.pages.length
                } page${slot.pages.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400 self-start"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 w-full">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Upload size={16} className="text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-800">
            Upload <span className="text-orange-500">{label}</span>
          </p>
          <p className="text-xs text-slate-400">Max 15MB</p>
        </div>
      )}
    </div>
  );
}

function PreviewModal({
  slot,
  onClose,
}: {
  slot: SlotState;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 sticky top-0 bg-white">
          <p className="text-sm font-medium text-slate-700 truncate">
            {slot.file.name}
          </p>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {slot.pages.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.page}
              src={p.dataUrl}
              alt={`Page ${p.page}`}
              className="w-full h-auto rounded-lg border border-slate-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function UploadScreen({
  onStart,
}: {
  onStart: (questionPaper: PageImage[], answerSheet: PageImage[]) => void;
}) {
  const [questionSlot, setQuestionSlot] = useState<SlotState | null>(null);
  const [answerSlot, setAnswerSlot] = useState<SlotState | null>(null);
  const [previewing, setPreviewing] = useState<"question" | "answer" | null>(
    null
  );

  async function handleSelect(
    file: File,
    setSlot: (s: SlotState | null) => void
  ) {
    setSlot({ file, pages: [], status: "rendering" });
    try {
      const pages = await fileToPageImages(file);
      setSlot({ file, pages, status: "ready" });
    } catch (err) {
      setSlot({
        file,
        pages: [],
        status: "error",
        error: err instanceof Error ? err.message : "Couldn't read file",
      });
    }
  }

  const canStart =
    questionSlot?.status === "ready" && answerSlot?.status === "ready";

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div
        className={clsx(
          "w-full max-w-xl rounded-3xl p-10 text-center transition-all",
          canStart
            ? "ring-2 ring-violet-400 bg-gradient-to-b from-white to-slate-50"
            : "bg-gradient-to-b from-slate-50 to-slate-200"
        )}
      >
        <h1 className="text-2xl font-semibold text-slate-900">
          Upload{" "}
          <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">
            Question Paper &amp; Answer Sheets
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Upload both files to get started
        </p>

        <div className="my-8 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl">
            🧑‍🏫
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <UploadSlot
            label="Question Paper"
            slot={questionSlot}
            onSelect={(f) => handleSelect(f, setQuestionSlot)}
            onClear={() => setQuestionSlot(null)}
            onPreview={() => setPreviewing("question")}
          />
          <UploadSlot
            label="Answer Sheet"
            slot={answerSlot}
            onSelect={(f) => handleSelect(f, setAnswerSlot)}
            onClear={() => setAnswerSlot(null)}
            onPreview={() => setPreviewing("answer")}
          />
        </div>

        <button
          disabled={!canStart}
          onClick={() =>
            canStart && onStart(questionSlot.pages, answerSlot.pages)
          }
          className={clsx(
            "mt-8 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-colors",
            canStart
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          Start Mapping <ArrowRight size={15} />
        </button>
        <p className="text-xs text-slate-400 mt-3">
          Once both files are uploaded, you&apos;ll be able to map answers with
          questions
        </p>
      </div>

      {previewing === "question" && questionSlot?.status === "ready" && (
        <PreviewModal slot={questionSlot} onClose={() => setPreviewing(null)} />
      )}
      {previewing === "answer" && answerSlot?.status === "ready" && (
        <PreviewModal slot={answerSlot} onClose={() => setPreviewing(null)} />
      )}
    </div>
  );
}
