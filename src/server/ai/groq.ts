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

const MAX_RETRIES = 3;

// Seconds to wait after a 429: the retry-after header, else the "try again
// in 5.37s" in the message, plus a little slack; at most 25 s.
function retryWaitSeconds(header: string | null, body: string) {
  const fromBody = Number(/try again in ([\d.]+)s/i.exec(body)?.[1]);
  const told = Number(header) || fromBody || 5;
  return Math.min(Math.ceil(told + 0.5), 25);
}

type ChatOptions = {
  name: string; // for the log line, e.g. "read_photo"
  model: string;
  messages: ChatMessage[];
  // Cap on the reply. Groq's free plan refuses a request whose cap is above
  // the model's output-tokens-per-minute limit (1000 for the vision model).
  maxTokens: number;
};

// One JSON-returning chat call. With a schema, the model must match it
// exactly (strict structured output).
export async function chatJson<T>(
  options: ChatOptions & { schema: object },
): Promise<T> {
  const { content } = await chat(options, {
    type: "json_schema",
    json_schema: { name: options.name, strict: true, schema: options.schema },
  });
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new AiError("The AI reply was not valid JSON");
  }
}

// One plain-text chat call. `cut` is true when the reply hit maxTokens.
export async function chatText(
  options: ChatOptions,
): Promise<{ text: string; cut: boolean }> {
  const { content, finish } = await chat(options);
  return { text: content, cut: finish === "length" };
}

// Sends the request, retries once on a rate limit, logs token usage.
async function chat(
  { name, model, messages, maxTokens }: ChatOptions,
  responseFormat?: object,
): Promise<{ content: string; finish: string }> {
  const { key } = aiConfig();
  if (!key) throw new AiError("GROQ_API_KEY is not set");

  const body = JSON.stringify({
    model,
    messages,
    temperature: 0.1,
    max_completion_tokens: maxTokens,
    ...(responseFormat && { response_format: responseFormat }),
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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

    // Free-tier rate limit (tokens per minute): wait as long as Groq says,
    // then try again.
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const wait = retryWaitSeconds(
        res.headers.get("retry-after"),
        await res.text(),
      );
      console.info(`[ai] ${name} rate limited, retrying in ${wait}s`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error(`[ai] ${name} ${model} failed ${res.status}: ${detail}`);
      throw new AiError(
        res.status === 429
          ? "The AI is busy. Please try again in a minute."
          : `AI request failed (${res.status})`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const choice = data.choices?.[0];
    const finish = choice?.finish_reason ?? "?";
    console.info(
      `[ai] ${name} model=${model} in=${data.usage?.prompt_tokens ?? "?"} out=${data.usage?.completion_tokens ?? "?"} finish=${finish} ms=${Date.now() - started}`,
    );
    const content = choice?.message?.content;
    if (!content) throw new AiError("The AI returned an empty reply");
    return { content, finish };
  }
  throw new AiError("The AI is busy. Please try again in a minute.");
}
