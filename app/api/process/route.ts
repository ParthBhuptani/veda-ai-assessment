import { NextRequest, NextResponse } from "next/server";
import { callGeminiJSON } from "@/lib/gemini";
import {
  QUESTION_EXTRACTION_SYSTEM,
  ANSWER_EXTRACTION_SYSTEM,
  MAPPING_FALLBACK_SYSTEM,
  GRADING_SYSTEM,
} from "@/lib/prompts";
import {
  QUESTION_EXTRACTION_SCHEMA,
  ANSWER_EXTRACTION_SCHEMA,
  MAPPING_FALLBACK_SCHEMA,
  GRADING_SCHEMA,
} from "@/lib/schemas";
import { mapByLabel, applyInferredMatches } from "@/lib/mapping";
import type {
  PageImage,
  ExtractedQuestion,
  ExtractedAnswerSegment,
  ProcessedResult,
  QuestionGrade,
  BBox,
} from "@/lib/types";

export const maxDuration = 120;

interface RawQuestion {
  number: string;
  subpart: string | null;
  text: string;
  marks: number | null;
  page: number;
  box_2d: [number, number, number, number]; // [y_min, x_min, y_max, x_max], 0-1000
}

interface RawRegion {
  page: number;
  box_2d: [number, number, number, number];
}

interface RawSegment {
  labelSeen: string | null;
  transcribedText: string;
  regions: RawRegion[];
}

/** Converts Gemini's native [y_min, x_min, y_max, x_max] box into our named BBox, clamping and fixing swapped bounds defensively. */
function boxToBBox(page: number, box: [number, number, number, number]): BBox {
  let [y_min, x_min, y_max, x_max] = box;
  const clamp = (n: number) => Math.max(0, Math.min(1000, n));
  y_min = clamp(y_min);
  x_min = clamp(x_min);
  y_max = clamp(y_max);
  x_max = clamp(x_max);
  if (y_min > y_max) [y_min, y_max] = [y_max, y_min];
  if (x_min > x_max) [x_min, x_max] = [x_max, x_min];
  return { page, x_min, y_min, x_max, y_max };
}

export async function POST(req: NextRequest) {
  try {
    const { questionPaperPages, answerSheetPages, gradingEnabled } =
      (await req.json()) as {
        questionPaperPages: PageImage[];
        answerSheetPages: PageImage[];
        gradingEnabled: boolean;
      };

    if (!questionPaperPages?.length || !answerSheetPages?.length) {
      return NextResponse.json(
        { error: "Both questionPaperPages and answerSheetPages are required." },
        { status: 400 }
      );
    }

    // 1 & 2. Extract questions and extract answers -- these are fully
    // independent of each other, so run them concurrently instead of
    // waiting on one before starting the other. This roughly halves the
    // wall-clock time of the extraction phase.
    const [questionResult, answerResult] = (await Promise.all([
      callGeminiJSON({
        systemPrompt: QUESTION_EXTRACTION_SYSTEM,
        userPrompt:
          "Here are the question paper pages, in order. Extract every question as specified.",
        pages: questionPaperPages,
        schema: QUESTION_EXTRACTION_SCHEMA,
      }),
      callGeminiJSON({
        systemPrompt: ANSWER_EXTRACTION_SYSTEM,
        userPrompt:
          "Here are the student's answer sheet pages, in order. Extract every answer segment as specified.",
        pages: answerSheetPages,
        schema: ANSWER_EXTRACTION_SCHEMA,
      }),
    ])) as [{ questions: RawQuestion[] }, { segments: RawSegment[] }];

    const questions: ExtractedQuestion[] = questionResult.questions.map(
      (q, idx) => ({
        id: `q-${idx}-${q.number}${q.subpart ? `-${q.subpart}` : ""}`,
        number: q.number,
        subpart: q.subpart,
        displayLabel: q.subpart ? `${q.number} (${q.subpart})` : q.number,
        text: q.text,
        marks: q.marks,
        order: idx,
        bbox: q.box_2d ? boxToBBox(q.page, q.box_2d) : null,
      })
    );

    const segments: ExtractedAnswerSegment[] = answerResult.segments.map(
      (s, idx) => ({
        id: `s-${idx}`,
        labelSeen: s.labelSeen,
        transcribedText: s.transcribedText,
        regions: s.regions.map((r) => boxToBBox(r.page, r.box_2d)),
      })
    );

    // 3. Deterministic label-based mapping
    const { mappings, unlabeledSegmentIds, ambiguousSegmentIds } = mapByLabel(
      questions,
      segments
    );

    // 4. LLM fallback for unlabeled/ambiguous segments
    let unmatchedSegmentIds: string[] = [];
    const fallbackCandidateIds = [...unlabeledSegmentIds, ...ambiguousSegmentIds];
    if (fallbackCandidateIds.length > 0) {
      const candidateSegments = segments.filter((s) =>
        fallbackCandidateIds.includes(s.id)
      );
      try {
        const fallbackResult = (await callGeminiJSON({
          systemPrompt: MAPPING_FALLBACK_SYSTEM,
          userPrompt: JSON.stringify({
            questions: questions.map((q) => ({
              id: q.id,
              number: q.number,
              subpart: q.subpart,
              text: q.text,
            })),
            segments: candidateSegments.map((s) => ({
              id: s.id,
              transcribedText: s.transcribedText,
              rawLabel: s.labelSeen,
            })),
          }),
          pages: [],
          schema: MAPPING_FALLBACK_SCHEMA,
        })) as {
          matches: { segmentId: string; questionId: string | null; confidence: number }[];
        };

        const { unmatchedSegmentIds: stillUnmatched } = applyInferredMatches(
          mappings,
          fallbackResult.matches
        );
        unmatchedSegmentIds = stillUnmatched;
      } catch {
        // If the fallback call fails, treat all candidates as unmatched
        // rather than failing the whole request.
        unmatchedSegmentIds = fallbackCandidateIds;
      }
    }

    const mappingList = Array.from(mappings.values());

    // 5. Optional grading pass
    let grades: QuestionGrade[] = [];
    if (gradingEnabled) {
      const segmentById = new Map(segments.map((s) => [s.id, s]));
      const gradingInput = questions.map((q) => {
        const mapping = mappings.get(q.id);
        const answerText = mapping?.answerSegmentIds.length
          ? mapping.answerSegmentIds
              .map((id) => segmentById.get(id)?.transcribedText ?? "")
              .join("\n")
          : null;
        return {
          questionId: q.id,
          questionText: q.text,
          maxMarks: q.marks,
          answerText, // null => unanswered
        };
      });

      try {
        const gradeResult = (await callGeminiJSON({
          systemPrompt: GRADING_SYSTEM,
          userPrompt: JSON.stringify({ items: gradingInput }),
          pages: [],
          schema: GRADING_SCHEMA,
        })) as { grades: (QuestionGrade & { marksTotal?: number })[] };

        // Attach marksTotal from the question's printed marks so the UI
        // can render "2/3" style chips without trusting the model to echo
        // it back exactly.
        const marksByQ = new Map(questions.map((q) => [q.id, q.marks]));
        grades = gradeResult.grades.map((g) => ({
          questionId: g.questionId,
          verdict: g.verdict,
          marksAwarded: g.marksAwarded,
          marksTotal: marksByQ.get(g.questionId) ?? null,
          feedback: g.feedback,
        }));
      } catch {
        grades = [];
      }
    }

    // 6. Assemble summary
    const answered = mappingList.filter(
      (m) => m.answerSegmentIds.length > 0
    ).length;
    const unanswered = mappingList.length - answered;
    const marksAwarded = grades.reduce(
      (sum, g) => (g.marksAwarded != null ? sum + g.marksAwarded : sum),
      0
    );
    const hasMarks = questions.some((q) => q.marks != null);
    const marksPossible = questions.reduce(
      (sum, q) => (q.marks != null ? sum + q.marks : sum),
      0
    );

    const result: ProcessedResult = {
      questionPaper: { pages: questionPaperPages, questions },
      answerSheet: { pages: answerSheetPages, segments },
      mappings: mappingList,
      unmatchedSegmentIds,
      grades,
      summary: {
        totalQuestions: questions.length,
        answered,
        unanswered,
        unmatchedAnswers: unmatchedSegmentIds.length,
        totalMarksAwarded: gradingEnabled ? marksAwarded : null,
        totalMarksPossible: gradingEnabled && hasMarks ? marksPossible : null,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Processing error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
