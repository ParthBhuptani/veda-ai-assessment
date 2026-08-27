"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import type { PageImage, ExtractedAnswerSegment, BBox } from "@/lib/types";

function HighlightBox({
  bbox,
  label,
  color,
}: {
  bbox: BBox;
  label: string;
  color: "green" | "orange";
}) {
  const style = {
    left: `${bbox.x_min / 10}%`,
    top: `${bbox.y_min / 10}%`,
    width: `${(bbox.x_max - bbox.x_min) / 10}%`,
    height: `${(bbox.y_max - bbox.y_min) / 10}%`,
  };
  const colorClasses =
    color === "green"
      ? "border-emerald-400 bg-emerald-300/10"
      : "border-orange-400 bg-orange-300/10";
  const tagClasses = color === "green" ? "bg-emerald-500" : "bg-orange-500";

  return (
    <div
      className={`absolute border-2 rounded-md pointer-events-none transition-all ${colorClasses}`}
      style={style}
    >
      <span
        className={`absolute -top-2.5 -left-1.5 text-[10px] font-semibold text-white px-1.5 py-0.5 rounded ${tagClasses}`}
      >
        {label}
      </span>
    </div>
  );
}

export function AnswerSheetViewer({
  pages,
  segments,
  activeSegmentIds,
  activeLabel,
}: {
  pages: PageImage[];
  segments: ExtractedAnswerSegment[];
  activeSegmentIds: string[];
  activeLabel: string;
}) {
  const [zoom, setZoom] = useState(100);

  const activeRegionsByPage = useMemo(() => {
    const map = new Map<number, BBox[]>();
    for (const segId of activeSegmentIds) {
      const seg = segments.find((s) => s.id === segId);
      if (!seg) continue;
      for (const region of seg.regions) {
        const list = map.get(region.page) ?? [];
        list.push(region);
        map.set(region.page, list);
      }
    }
    return map;
  }, [activeSegmentIds, segments]);

  // Initial page: the first page containing a highlight for the current
  // selection. The parent remounts this component (via `key`) whenever the
  // selected question changes, so this lazy initializer re-runs per
  // selection without needing an effect + setState.
  const [pageIndex, setPageIndex] = useState(() => {
    const firstPageWithHighlight = Array.from(activeRegionsByPage.keys()).sort(
      (a, b) => a - b
    )[0];
    if (firstPageWithHighlight) {
      const idx = pages.findIndex((p) => p.page === firstPageWithHighlight);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  const currentPage = pages[pageIndex];
  const currentHighlights = currentPage
    ? activeRegionsByPage.get(currentPage.page) ?? []
    : [];
  const hasAnswer = activeSegmentIds.length > 0;

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 flex-wrap px-3 sm:px-4 py-2.5 bg-slate-900 text-white text-sm">
        <span className="font-medium text-slate-300 shrink-0">Answer Sheet</span>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-1 bg-slate-800 rounded-full px-1.5 py-1">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="p-1 rounded-full hover:bg-slate-700"
            >
              <Minus size={13} />
            </button>
            <span className="text-xs w-10 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="p-1 rounded-full hover:bg-slate-700"
            >
              <Plus size={13} />
            </button>
          </div>
          <div className="flex items-center gap-1 bg-slate-800 rounded-full px-1.5 py-1">
            <button
              onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
              disabled={pageIndex === 0}
              className="p-1 rounded-full hover:bg-slate-700 disabled:opacity-30"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-xs w-14 text-center">
              Page {pageIndex + 1}/{pages.length}
            </span>
            <button
              onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
              disabled={pageIndex === pages.length - 1}
              className="p-1 rounded-full hover:bg-slate-700 disabled:opacity-30"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {!hasAnswer && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 border-b border-amber-500/20 text-amber-300 text-xs font-medium">
          <SearchX size={14} />
          No answer found for this question — it appears to be unanswered.
        </div>
      )}

      <div className="flex-1 overflow-auto bg-slate-100 p-6 flex justify-center">
        {currentPage ? (
          <div
            className="relative shrink-0 h-fit shadow-lg"
            style={{ width: `${zoom}%`, maxWidth: "none" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPage.dataUrl}
              alt={`Answer sheet page ${currentPage.page}`}
              className="w-full h-auto block rounded-sm"
            />
            {currentHighlights.map((bbox, i) => (
              <HighlightBox
                key={i}
                bbox={bbox}
                label={activeLabel}
                color="green"
              />
            ))}
          </div>
        ) : (
          <div className="text-slate-400 text-sm py-20">No pages to show</div>
        )}
      </div>
    </div>
  );
}
