# VedaAI — AI Assessment Extraction & Answer Mapping

A teacher uploads a question paper and one student's handwritten answer
sheet (PDF or images). The app extracts every question (including labelled
sub-parts like `11 (a)` / `11 (b)`), extracts the student's answers, maps
each answer to its question, and displays them side by side — clicking a
question highlights the exact region of the answer on the sheet. Grading
and AI feedback are included.

## How it works

```
Upload (PDF/images)
   |
   v
Render every page to an image client-side (pdf.js)          [lib/fileToPages.ts]
   |
   v
POST /api/process                                            [app/api/process/route.ts]
   |
   +-- 1. Extract questions from the question-paper images via Gemini,
   |      preserving printed order and splitting sub-parts into
   |      separate entries.                                  [lib/prompts.ts]
   |
   +-- 2. Extract answer segments from the answer-sheet images via Gemini:
   |      transcription + the label the student wrote (if any) + bounding
   |      box(es), supporting multi-page answers.
   |
   +-- 3. Map answers to questions:
   |      a) Deterministic pass -- match by the label the student wrote
   |         (normalizes "Q11(b)", "11 - b", "11b", etc).      [lib/mapping.ts]
   |      b) LLM fallback pass -- for segments with no usable label,
   |         ask the model to match by content, or return null if no
   |         question is a plausible match. Confidence-gated.
   |      c) Anything left over -> "unmatched answers". Any question with
   |         no mapped segment -> "unanswered".
   |
   +-- 4. Optional grading pass -- per question, ask for a verdict, marks
          (if max marks were printed), and short feedback.
   |
   v
Results screen -- question list (left) + answer sheet viewer (right),
with click-to-highlight and multi-page/zoom support.
```

## Tech stack

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS**
- **pdf.js** (`pdfjs-dist`) -- renders PDF pages to images entirely client-side
  (no server-side binary dependencies, so it deploys cleanly to Vercel)
- **Google Gemini API** (`gemini-3.6-flash` by default) -- vision + structured
  JSON for extraction, mapping fallback, and grading. Free tier is
  sufficient for this assignment. If this model is later deprecated,
  set `GEMINI_MODEL` in `.env.local` to whatever Google's current stable
  Flash model is (see https://ai.google.dev/gemini-api/docs/models).
- **In-memory only** -- no database. All state lives in the browser tab for
  the duration of one session, matching the assignment constraints.

## Running locally

```bash
npm install
cp .env.example .env.local
# then put your Gemini API key in .env.local:
# GEMINI_API_KEY=your-key-here
npm run dev
```

Open http://localhost:3000. Get a free Gemini API key at
https://aistudio.google.com/app/apikey.

## Deploying

1. Push this repo to GitHub.
2. Import it on [Vercel](https://vercel.com/new).
3. Add the `GEMINI_API_KEY` environment variable in the Vercel project
   settings.
4. Deploy. No other configuration is required (no database, no auth).

## Design notes / how this maps to the requirements

- **Preserving printed order & sub-parts**: the extraction prompt
  explicitly instructs the model to keep document order as array order and
  to split `11 (a)` / `11 (b)` into two entries sharing the number `11`
  with `subpart: "a" | "b"`.
- **Out-of-order answers**: mapping is keyed by question id, not by answer
  position -- an answer to Q2 appearing after the answer to Q5 on the sheet
  still maps correctly, because matching is by label/content, not order.
- **Unanswered questions**: any question with zero mapped answer segments
  is rendered with an "Unanswered" chip and is counted in the summary
  strip.
- **Answers that don't match any question**: shown in a dedicated
  "Unmatched answers" panel at the bottom of the question list rather than
  silently dropped or forced onto the nearest question.
- **Multi-page answers**: an answer segment can carry multiple bounding
  boxes (`regions[]`), one per page it appears on; the viewer highlights
  all of them and jumps to the first page containing a highlight when you
  select that question.
- **Highlighting**: bounding boxes are normalized 0-1000 per axis (relative
  to the source page image), so they scale correctly regardless of zoom
  level or original file resolution.

## AI model / API used

Google **Gemini 3.6 Flash** via the `generateContent` REST endpoint, used
for three separate calls: question extraction, answer extraction, and
(optionally) an unlabeled-answer mapping fallback + grading. Chosen for its
free tier and native support for JSON-mode structured output alongside
image inputs.

## Assumptions & known limitations

- Bounding-box accuracy depends on the vision model's spatial grounding
  and on handwriting legibility; messy handwriting or dense pages can
  reduce precision. Mapping confidence is exposed in the UI (`labeled` vs
  `inferred`) so low-confidence matches are visible rather than hidden.
- The mapping fallback pass is intentionally conservative: if the model
  isn't reasonably confident, the segment is left "unmatched" rather than
  force-assigned, per the assignment's emphasis on correct edge-case
  handling over forcing every answer to map somewhere.
- Rotated or out-of-order scanned pages are not auto-corrected; pages are
  processed in upload order.
- Only one student's answer sheet is supported per run (as specified), and
  processing is single-session/in-memory -- refreshing the page loses the
  current result.
- Grading is model-based and should be treated as a first-pass aid for the
  teacher, not an authoritative score.
