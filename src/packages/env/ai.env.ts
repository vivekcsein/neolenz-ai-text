import { z } from "zod";
import { parseEnv } from "../utils/parse-env";

// AI (server-only) Environment Schema
const parsedEnvSchema = z.object({
  // Both keys are optional on purpose: the route answers 503 instead of crashing.
  ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),
  GEMINI_API_KEY: z.string().trim().min(1).optional(),

  // Leave unset to use whichever key is present (Anthropic wins if both are).
  NEOLENZ_PROVIDER: z.enum(["anthropic", "gemini"]).optional(),

  NEOLENZ_MODEL: z.string().trim().min(1).default("claude-sonnet-5-5"),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-2.5-flash"),

  NEOLENZ_ANALYSIS_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(5_000, "NEOLENZ_ANALYSIS_TIMEOUT_MS must be at least 5000")
    .max(120_000, "NEOLENZ_ANALYSIS_TIMEOUT_MS must be at most 120000")
    .default(60_000),
});

// Validated AI Environment
const parsedEnv = parseEnv(parsedEnvSchema, "ai");

const keys = {
  anthropic: parsedEnv.ANTHROPIC_API_KEY,
  gemini: parsedEnv.GEMINI_API_KEY,
} as const;

const provider =
  parsedEnv.NEOLENZ_PROVIDER ??
  (keys.anthropic ? "anthropic" : keys.gemini ? "gemini" : undefined);

// AI Environment Config
export const envAiConfig = Object.freeze({
  provider,
  apiKey: provider ? keys[provider] : undefined,
  model:
    provider === "gemini" ? parsedEnv.GEMINI_MODEL : parsedEnv.NEOLENZ_MODEL,
  timeoutMs: parsedEnv.NEOLENZ_ANALYSIS_TIMEOUT_MS,
  isConfigured: Boolean(provider && keys[provider]),
});

export type EnvAiConfig = typeof envAiConfig;
