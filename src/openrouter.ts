// The one edge module that talks to OpenRouter. Every model call in the
// pipeline goes through chatJson: send messages, force a JSON-schema response,
// validate it with the matching Zod schema before anyone touches it.

import { z } from "zod";
import { toJSONSchema } from "zod";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

type ContentPart =
  { type: "text"; text: string } | { type: "video_url"; video_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user";
  content: string | ContentPart[];
}

export interface ChatJsonRequest<Schema extends z.ZodType> {
  model: string;
  messages: ChatMessage[];
  schema: Schema;
  schemaName: string;
}

/** Calls the model once and validates the reply. On a validation failure,
 * retries once with the validation error in the prompt, then throws. */
export async function chatJson<Schema extends z.ZodType>(
  request: ChatJsonRequest<Schema>,
): Promise<z.infer<Schema>> {
  const firstReply = await completeRaw(request);
  const firstParse = request.schema.safeParse(tryParseJson(firstReply));
  if (firstParse.success) return firstParse.data;

  const retryMessages: ChatMessage[] = [
    ...request.messages,
    {
      role: "user",
      content:
        `Your previous reply failed validation: ${firstParse.error.message}\n` +
        "Reply again with ONLY a JSON object that satisfies the schema.",
    },
  ];
  const secondReply = await completeRaw({ ...request, messages: retryMessages });
  const secondParse = request.schema.safeParse(tryParseJson(secondReply));
  if (secondParse.success) return secondParse.data;
  throw new Error(`Model output failed validation twice: ${secondParse.error.message}`);
}

async function completeRaw<Schema extends z.ZodType>(
  request: ChatJsonRequest<Schema>,
): Promise<string> {
  // Manual timer instead of AbortSignal.timeout: a stuck model call must fail
  // the one ad, not the whole scan, and the manual controller has proven more
  // dependable under Bun during long runs.
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${requireApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: toJSONSchema(request.schema),
          },
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenRouter returned ${response.status}: ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenRouter reply had no message content");
    return content;
  } finally {
    clearTimeout(deadline);
  }
}

function tryParseJson(text: string): unknown {
  // Some models wrap JSON in a markdown fence despite response_format.
  const bare = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(bare);
  } catch {
    return null;
  }
}

function requireApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Copy .env.example to .env and add your key — without it no model can watch the ads.",
    );
  }
  return key;
}
