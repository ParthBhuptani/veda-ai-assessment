import type {
  ExtractedQuestion,
  ExtractedAnswerSegment,
  QuestionMapping,
} from "./types";

/** Normalizes a printed/handwritten label like "Q11(b)", "11 - b", "q.11b" for comparison. */
function normalizeLabel(
  raw: string
): { number: string; subpart: string | null } | null {
  const cleaned = raw
    .toLowerCase()
    .replace(/^q(uestion|n)?\.?\s*/i, "")
    .replace(/^ans(wer)?\.?\s*/i, "")
    .replace(/^no\.?\s*/i, "")
    .trim();

  // Matches "11", "11 a", "11(a)", "(11a)", "11-a", "11.a", "11b", "11 - b"
  const match = cleaned.match(
    /^\(?(\d+)\)?\s*[\.\-\s]?\s*\(?([a-z])?\)?\.?$/
  );
  if (!match) return null;

  const [, number, subpart] = match;
  return { number, subpart: subpart || null };
}

function questionKey(number: string, subpart: string | null) {
  return `${number}::${subpart ?? ""}`;
}

/**
 * Deterministic first pass: match answer segments to questions using the
 * label the student actually wrote. Returns:
 * - mappings: question id -> mapping (answered ones populated)
 * - unlabeledSegmentIds: segments with no label at all
 * - ambiguousSegmentIds: segments whose label names a question number
 *   that has multiple sub-parts, without specifying which one (e.g. wrote
 *   "Q3" when the paper has 3(a) and 3(b)) -- these need content-based
 *   disambiguation, not a straight "unmatched".
 */
export function mapByLabel(
  questions: ExtractedQuestion[],
  segments: ExtractedAnswerSegment[]
): {
  mappings: Map<string, QuestionMapping>;
  unlabeledSegmentIds: string[];
  ambiguousSegmentIds: string[];
} {
  const questionByKey = new Map(
    questions.map((q) => [questionKey(q.number, q.subpart), q])
  );

  // Track which printed numbers have more than one sub-part, so a bare
  // "Q3" (no subpart) can be recognized as ambiguous rather than either a
  // false exact-match or a silent drop.
  const subpartCountByNumber = new Map<string, number>();
  for (const q of questions) {
    subpartCountByNumber.set(
      q.number,
      (subpartCountByNumber.get(q.number) ?? 0) + 1
    );
  }

  const mappings = new Map<string, QuestionMapping>();
  for (const q of questions) {
    mappings.set(q.id, {
      questionId: q.id,
      answerSegmentIds: [],
      matchType: "none",
      confidence: 0,
    });
  }

  const unlabeledSegmentIds: string[] = [];
  const ambiguousSegmentIds: string[] = [];

  for (const seg of segments) {
    if (!seg.labelSeen) {
      unlabeledSegmentIds.push(seg.id);
      continue;
    }
    const parsed = normalizeLabel(seg.labelSeen);
    if (!parsed) {
      // Label present but unparseable (e.g. garbled OCR) -> let the
      // content-based fallback take a shot at it.
      unlabeledSegmentIds.push(seg.id);
      continue;
    }

    // Bare number, but that number has multiple sub-parts -> ambiguous.
    if (
      !parsed.subpart &&
      (subpartCountByNumber.get(parsed.number) ?? 0) > 1
    ) {
      ambiguousSegmentIds.push(seg.id);
      continue;
    }

    const question = questionByKey.get(
      questionKey(parsed.number, parsed.subpart)
    );

    if (question) {
      const m = mappings.get(question.id)!;
      m.answerSegmentIds.push(seg.id);
      m.matchType = "labeled";
      m.confidence = 1;
    } else {
      // Label present but doesn't match any known question -> let the
      // fallback pass try content matching before giving up on it.
      unlabeledSegmentIds.push(seg.id);
    }
  }

  return { mappings, unlabeledSegmentIds, ambiguousSegmentIds };
}

/** Applies LLM-inferred matches (for previously unlabeled/ambiguous segments) onto the mapping set. */
export function applyInferredMatches(
  mappings: Map<string, QuestionMapping>,
  inferred: { segmentId: string; questionId: string | null; confidence: number }[],
  minConfidence = 0.5
): { unmatchedSegmentIds: string[] } {
  const unmatchedSegmentIds: string[] = [];

  for (const match of inferred) {
    if (!match.questionId || match.confidence < minConfidence) {
      unmatchedSegmentIds.push(match.segmentId);
      continue;
    }
    const m = mappings.get(match.questionId);
    if (!m) {
      unmatchedSegmentIds.push(match.segmentId);
      continue;
    }
    m.answerSegmentIds.push(match.segmentId);
    if (m.matchType !== "labeled") {
      m.matchType = "inferred";
      m.confidence = Math.max(m.confidence, match.confidence);
    }
  }

  return { unmatchedSegmentIds };
}
