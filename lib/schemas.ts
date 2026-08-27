// Gemini responseSchema objects (OpenAPI-subset format Gemini expects,
// hence the UPPERCASE type strings). Passing these alongside
// responseMimeType: "application/json" makes Gemini's structured output
// far more reliable than prompt wording alone.

export const QUESTION_EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          number: { type: "STRING" },
          subpart: { type: "STRING", nullable: true },
          text: { type: "STRING" },
          marks: { type: "NUMBER", nullable: true },
          page: { type: "INTEGER" },
          box_2d: {
            type: "ARRAY",
            items: { type: "INTEGER" },
            description:
              "[y_min, x_min, y_max, x_max] normalized 0-1000, relative to the page image.",
          },
        },
        required: ["number", "subpart", "text", "marks", "page", "box_2d"],
      },
    },
  },
  required: ["questions"],
};

export const ANSWER_EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    segments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          labelSeen: { type: "STRING", nullable: true },
          transcribedText: { type: "STRING" },
          regions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                page: { type: "INTEGER" },
                box_2d: {
                  type: "ARRAY",
                  items: { type: "INTEGER" },
                  description: "[y_min, x_min, y_max, x_max] normalized 0-1000.",
                },
              },
              required: ["page", "box_2d"],
            },
          },
        },
        required: ["labelSeen", "transcribedText", "regions"],
      },
    },
  },
  required: ["segments"],
};

export const MAPPING_FALLBACK_SCHEMA = {
  type: "OBJECT",
  properties: {
    matches: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          segmentId: { type: "STRING" },
          questionId: { type: "STRING", nullable: true },
          confidence: { type: "NUMBER" },
        },
        required: ["segmentId", "questionId", "confidence"],
      },
    },
  },
  required: ["matches"],
};

export const GRADING_SCHEMA = {
  type: "OBJECT",
  properties: {
    grades: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          questionId: { type: "STRING" },
          verdict: {
            type: "STRING",
            enum: ["correct", "partial", "incorrect", "ungraded"],
          },
          marksAwarded: { type: "NUMBER", nullable: true },
          feedback: { type: "STRING" },
        },
        required: ["questionId", "verdict", "marksAwarded", "feedback"],
      },
    },
  },
  required: ["grades"],
};
