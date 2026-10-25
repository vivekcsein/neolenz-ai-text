import { z } from "zod";
import { envAiConfig } from "@/packages/env/ai.env";
import {
  type NeolenzResponse,
  neolenzModelOutputSchema,
  neolenzResponseSchema,
} from "@/packages/schemas/neolenz.schema";
import { AppError } from "@/packages/utils/errors";
import { sanitizeAnalysis } from "./neolenz.sanitize";

/**
 * neolenz.analyzer.ts
 * --------------------------------------------------------------
 * Server-only. Sends one image to the configured provider (Anthropic or
 * Gemini) and gets a structured answer back. The JSON Schema sent to the
 * provider is generated from the same Zod schema the route validates
 * against, so the contract lives in one place. Whatever a provider
 * returns is validated and sanitized the same way.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const TOOL_NAME = "report_image_analysis";
const MAX_OUTPUT_TOKENS = 4096;

export type AnalyzerMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

const SYSTEM_PROMPT = `You analyze a single image and report what is actually visible in it.

Rules:
- Report only what you can see. Never guess, infer hidden values, or invent text.
- Copy text exactly as written, including numbers, currency symbols and dates.
- If something is absent, return an empty array or omit the optional field.
- Fields are key-value facts visible in the image (for example "Total": "$42.00").
- Regions are optional. Include a region only when you can place it with reasonable confidence. Boxes are normalized to the image: x and y are the top-left corner, all values between 0 and 1.
- Link a field or object to a region with regionId only when that region exists.`;

const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(
  neolenzModelOutputSchema,
) as Record<string, unknown>;

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

// ---------------------------------------------------------------------------
// Shared transport
// ---------------------------------------------------------------------------

const post = async (
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal,
): Promise<Response> => {
  const timeoutSignal = AbortSignal.timeout(envAiConfig.timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.any([signal, timeoutSignal]),
    });
  } catch (error) {
    if (timeoutSignal.aborted) {
      throw new AppError("The analysis took too long. Please try again.", {
        code: "TIMEOUT",
        status: 504,
        cause: error,
      });
    }
    if (signal.aborted) {
      throw new AppError("The request was cancelled.", {
        code: "UNKNOWN",
        status: 499,
        cause: error,
      });
    }
    throw new AppError("Could not reach the analysis service.", {
      code: "NETWORK_ERROR",
      status: 502,
      cause: error,
    });
  }
};

const unreadable = () =>
  new AppError("The analysis service returned an unreadable answer.", {
    code: "VALIDATION_ERROR",
    status: 502,
  });

const tooMuchContent = () =>
  new AppError(
    "This image has more content than could be analyzed in one pass.",
    { code: "VALIDATION_ERROR", status: 422 },
  );

const misconfigured = () =>
  new AppError("The analysis service is not set up correctly.", {
    code: "SERVER_ERROR",
    status: 502,
  });

const busy = () =>
  new AppError(
    "The analysis service is busy right now. Please try again shortly.",
    { code: "SERVER_ERROR", status: 429 },
  );

const unreadableImage = (details?: string) =>
  new AppError("The analysis service could not read this image.", {
    code: "VALIDATION_ERROR",
    status: 422,
    details,
  });

const failed = (details?: string) =>
  new AppError("The analysis service failed. Please try again.", {
    code: "SERVER_ERROR",
    status: 502,
    details,
  });

const providerErrorSchema = z.object({
  error: z.object({ message: z.string().optional() }).optional(),
});

const readProviderMessage = async (response: Response) => {
  const parsed = providerErrorSchema.safeParse(
    await response.json().catch(() => null),
  );
  return parsed.success ? (parsed.data.error?.message ?? "") : "";
};

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

const anthropicResponseSchema = z.object({
  stop_reason: z.string().nullish(),
  content: z.array(
    z.object({
      type: z.string(),
      name: z.string().optional(),
      input: z.unknown().optional(),
    }),
  ),
});

const callAnthropic = async (
  apiKey: string,
  bytes: Uint8Array,
  mediaType: AnalyzerMediaType,
  signal: AbortSignal,
): Promise<unknown> => {
  const response = await post(
    ANTHROPIC_URL,
    { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
    {
      model: envAiConfig.model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: `${SYSTEM_PROMPT}\n- Always answer by calling the ${TOOL_NAME} tool.`,
      tools: [
        {
          name: TOOL_NAME,
          description:
            "Report the structured analysis of the image. Call exactly once.",
          input_schema: jsonSchema,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: toBase64(bytes),
              },
            },
            { type: "text", text: "Analyze this image." },
          ],
        },
      ],
    },
    signal,
  );

  if (!response.ok) {
    const message = await readProviderMessage(response);
    const { status } = response;
    if (status === 400) throw unreadableImage(message);
    if (status === 401 || status === 403) throw misconfigured();
    if (status === 429 || status === 529) throw busy();
    throw failed(message);
  }

  const payload = anthropicResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!payload.success) throw unreadable();
  if (payload.data.stop_reason === "max_tokens") throw tooMuchContent();

  return payload.data.content.find(
    (block) => block.type === "tool_use" && block.name === TOOL_NAME,
  )?.input;
};

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

const geminiResponseSchema = z.object({
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({
            parts: z.array(z.object({ text: z.string().optional() })),
          })
          .optional(),
      }),
    )
    .optional(),
});

const callGemini = async (
  apiKey: string,
  bytes: Uint8Array,
  mediaType: AnalyzerMediaType,
  signal: AbortSignal,
): Promise<unknown> => {
  const response = await post(
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(envAiConfig.model)}:generateContent`,
    { "x-goog-api-key": apiKey },
    {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mediaType, data: toBase64(bytes) } },
            { text: "Analyze this image." },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    },
    signal,
  );

  if (!response.ok) {
    const message = await readProviderMessage(response);
    const { status } = response;
    // Gemini reports a bad API key as a 400, so check the message first.
    if (/api key/i.test(message) || status === 401 || status === 403) {
      throw misconfigured();
    }
    if (status === 429) throw busy();
    if (status === 400) throw unreadableImage(message);
    throw failed(message);
  }

  const payload = geminiResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!payload.success) throw unreadable();

  if (payload.data.promptFeedback?.blockReason) {
    throw new AppError("The analysis service declined to process this image.", {
      code: "VALIDATION_ERROR",
      status: 422,
    });
  }

  const candidate = payload.data.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") throw tooMuchContent();

  const text = candidate?.content?.parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw unreadable();

  try {
    return JSON.parse(text);
  } catch {
    throw unreadable();
  }
};

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

type AnalyzeInput = {
  bytes: Uint8Array;
  mediaType: AnalyzerMediaType;
  /** Aborts when the browser disconnects or cancels. */
  signal: AbortSignal;
};

export const analyzeImage = async ({
  bytes,
  mediaType,
  signal,
}: AnalyzeInput): Promise<NeolenzResponse> => {
  const { provider, apiKey } = envAiConfig;
  if (!provider || !apiKey) {
    throw new AppError("Image analysis is not configured on this server.", {
      code: "SERVER_ERROR",
      status: 503,
    });
  }

  const startedAt = Date.now();
  const raw =
    provider === "gemini"
      ? await callGemini(apiKey, bytes, mediaType, signal)
      : await callAnthropic(apiKey, bytes, mediaType, signal);

  const modelOutput = neolenzModelOutputSchema.safeParse(raw);
  if (!modelOutput.success) {
    throw new AppError("The analysis result was incomplete. Please retry.", {
      code: "VALIDATION_ERROR",
      status: 502,
      details: modelOutput.error.issues,
    });
  }

  return neolenzResponseSchema.parse({
    analysis: sanitizeAnalysis(modelOutput.data),
    meta: { model: envAiConfig.model, durationMs: Date.now() - startedAt },
  });
};
