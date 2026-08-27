// Core data model shared by extraction, mapping, grading and UI.

/** A single rendered page of an uploaded PDF/image file. */
export interface PageImage {
  page: number; // 1-indexed
  dataUrl: string; // base64 PNG data URL, used for display
  width: number; // rendered pixel width
  height: number; // rendered pixel height
}

/** Normalized bounding box, values 0-1000 (Gemini-style), relative to the page it was found on. */
export interface BBox {
  page: number; // 1-indexed page this box belongs to
  x_min: number; // 0-1000
  y_min: number; // 0-1000
  x_max: number; // 0-1000
  y_max: number; // 0-1000
}

export interface ExtractedQuestion {
  id: string; // stable id, e.g. "q11-a"
  number: string; // printed number, e.g. "11"
  subpart: string | null; // e.g. "a", null if no subpart
  displayLabel: string; // e.g. "11 (a)" or "3"
  text: string;
  marks: number | null; // max marks if printed on the paper, else null
  order: number; // printed order index, 0-based
  bbox: BBox | null;
}

export interface ExtractedAnswerSegment {
  id: string;
  /** The label the student actually wrote next to the answer, if any (e.g. "Q3", "11 b"). Null if unlabeled. */
  labelSeen: string | null;
  transcribedText: string;
  /** One or more regions this single answer occupies (supports multi-page answers). */
  regions: BBox[];
}

export type MatchType = "labeled" | "inferred" | "unmatched" | "none";

export interface QuestionMapping {
  questionId: string;
  /** Answer segment ids mapped to this question, in the order they should be read. */
  answerSegmentIds: string[];
  matchType: MatchType; // "none" = unanswered
  confidence: number; // 0-1
}

export type GradeVerdict = "correct" | "partial" | "incorrect" | "ungraded";

export interface QuestionGrade {
  questionId: string;
  verdict: GradeVerdict;
  marksAwarded: number | null;
  marksTotal: number | null;
  feedback: string;
}

export interface ProcessedResult {
  questionPaper: {
    pages: PageImage[];
    questions: ExtractedQuestion[];
  };
  answerSheet: {
    pages: PageImage[];
    segments: ExtractedAnswerSegment[];
  };
  mappings: QuestionMapping[];
  /** Answer segments that could not be confidently mapped to any question. */
  unmatchedSegmentIds: string[];
  grades: QuestionGrade[];
  summary: {
    totalQuestions: number;
    answered: number;
    unanswered: number;
    unmatchedAnswers: number;
    totalMarksAwarded: number | null;
    totalMarksPossible: number | null;
  };
}

export type ProcessingStage =
  | "idle"
  | "rendering"
  | "extracting-questions"
  | "extracting-answers"
  | "mapping"
  | "grading"
  | "done"
  | "error";
