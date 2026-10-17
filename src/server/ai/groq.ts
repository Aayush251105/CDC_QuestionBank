import "server-only";

// Groq's OpenAI-compatible chat API (CLAUDE.md 2a.10), called with fetch so
// there is no SDK. Only this folder may call an LLM.
const URL = "https://api.groq.com/openai/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user";
  content:
    | string
    | (
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      )[];
};

export const aiConfig = () => ({
  key: process.env.GROQ_API_KEY?.trim() || null,
  textModel: process.env.AI_MODEL?.trim() || "openai/gpt-oss-120b",
  visionModel: process.env.AI_VISION_MODEL?.trim() || "qwen/qwen3.8-27b",
});

export class AiError extends Error {}

// One JSON-returning chat call. With a schema, the model must match it
// exactly (strict structured output). Logs token usage per call.
export async function chatJson<T>({
  name,
  model,
  messages,
  schema,
  maxTokens,
}: {
  name: string; // for the log line, e.g. "read-photo"
  model: string;
  messages: ChatMessage[];
  schema: object;
  // Cap on the reply. Groq's free plan refuses a request whose cap is above
  // the model's output-tokens-per-minute limit (1000 for the vision model).
  maxTokens: number;
}): Promise<T> {
  const { key } = aiConfig();
  if (!key) throw new AiError("GROQ_API_KEY is not set");

  const body = JSON.stringify({
    model,
    messages,
    temperature: 0.1,
    max_completion_tokens: maxTokens,
    response_format: {
      type: "json_schema",
      json_schema: { name, strict: true, schema },
    },
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(60_000),
    });

    // Free-tier rate limit: wait as told (up to 10 s) and try once more.
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(Number(res.headers.get("retry-after")) || 5, 10);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error(`[ai] ${name} ${model} failed ${res.status}: ${detail}`);
      throw new AiError(`AI request failed (${res.status})`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    console.info(
      `[ai] ${name} model=${model} in=${data.usage?.prompt_tokens ?? "?"} out=${data.usage?.completion_tokens ?? "?"} ms=${Date.now() - started}`,
    );
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new AiError("The AI returned an empty reply");
    try {
      return JSON.parse(content) as T;
    } catch {
      throw new AiError("The AI reply was not valid JSON");
    }
  }
  throw new AiError("The AI is busy. Please try again in a minute.");
}
