import { z } from "zod";
import { parseEnv } from "../utils/parse-env";

// Client Environment Schema
const parsedEnvSchema = z.object({
  NEXT_PUBLIC_CLIENT_ORIGIN: z.url().trim().default("http://localhost:7164"),

  NEXT_PUBLIC_CLIENT_PREFIX: z.string().trim().default("/app"),
});

// Validated Client Environment
const parsedEnv = parseEnv(parsedEnvSchema, "client");

// Application Client Config
export const envClientConfig = Object.freeze({
  clientOrigin: parsedEnv.NEXT_PUBLIC_CLIENT_ORIGIN,
  clientPrefix: parsedEnv.NEXT_PUBLIC_CLIENT_PREFIX,
});

export type EnvClientConfig = typeof envClientConfig;
