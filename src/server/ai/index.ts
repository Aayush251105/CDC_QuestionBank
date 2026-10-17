import "server-only";
import {
  type AiQuestion,
  chunkText,
  MAX_QUESTIONS,
  normaliseAiQuestions,
  questionsSchema,
  splitWithoutAi,
} from "@/lib/aiQuestions";
import { aiConfig, chatJson } from "./groq";
import { READ_PHOTO, STRUCTURE } from "./prompts";

// Every LLM call in the app goes through these functions (CLAUDE.md
// section 7). Without GROQ_API_KEY they fall back to a stub so the submit
// flow still works locally.

export const aiEnabled = () => Boolean(aiConfig().key);

export type PhotoResult = { readable: boolean; text: string };

// Reads one photo of rough notes. The bytes are only held in memory for this
// call and are never stored.
export async function readPhoto(
  image: Buffer,
  mimeType: string,
): Promise<PhotoResult> {
  const { key, visionModel } = aiConfig();
  // No key: nothing can be read; the page says so and offers typing instead.
  if (!key) return { readable: false, text: "" };
  const result = await chatJson<PhotoResult>({
    name: "read_photo",
    model: visionModel,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["readable", "text"],
      properties: { readable: { type: "boolean" }, text: { type: "string" } },
    },
    messages: [
      { role: "system", content: READ_PHOTO },
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe this page." },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${image.toString("base64")}`,
            },
          },
        ],
      },
    ],
  });
  const text =
    typeof result.text === "string" ? result.text.trim().slice(0, 12000) : "";
  return { readable: Boolean(result.readable) && text.length > 0, text };
}

// Splits notes into questions, picks types, tidies wording, suggests topics
// and difficulty. `context` is the round (company, round type, sections) to
// help the model; it is not copied into questions.
export async function structureQuestions(
  notes: string,
  context: string,
  topicNames: string[],
): Promise<AiQuestion[]> {
  const { key, textModel } = aiConfig();
  if (!key) return splitWithoutAi(notes);

  const out: AiQuestion[] = [];
  for (const chunk of chunkText(notes)) {
    const reply = await chatJson<unknown>({
      name: "structure_questions",
      model: textModel,
      schema: questionsSchema(topicNames),
      messages: [
        { role: "system", content: STRUCTURE },
        {
          role: "user",
          content: `Round: ${context}\nAllowed topics: ${topicNames.join(", ")}\n\nNotes:\n"""\n${chunk}\n"""`,
        },
      ],
    });
    out.push(...normaliseAiQuestions(reply, topicNames));
    if (out.length >= MAX_QUESTIONS) break;
  }
  return out.slice(0, MAX_QUESTIONS);
}
