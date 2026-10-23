import { z } from "zod";
import { STYLES_THEME_NAMES } from "../configs/styles.config";
import { parseEnv } from "../utils/parse-env";

// Public Environment Schema
const parsedEnvSchema = z.object({
  // App
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).default("@frenzzofficial"),

  NEXT_PUBLIC_APP_VERSION: z.string().trim().min(1).default("2.0.0"),

  NEXT_PUBLIC_APP_DESCRIPTION: z
    .string()
    .trim()
    .min(1)
    .default(
      "Future-ready 2026 frontend template for creating robust, enterprise-level web applications.",
    ),

  // Site
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

  NEXT_PUBLIC_SITE_TITLE: z
    .string()
    .trim()
    .min(1)
    .default("Top 1% Frontend Template of 2026"),

  NEXT_PUBLIC_LOGO_URL: z.string().trim().min(1).default("/logo.png"),

  NEXT_PUBLIC_OG_IMAGE_URL: z.string().trim().optional(),

  // Theme
  NEXT_PUBLIC_ACTIVE_STYLE: z
    .enum(STYLES_THEME_NAMES)
    .default("cyantrix-theme"),

  // Theme
  NEXT_PUBLIC_ACTIVE_THEME: z
    .enum(["system", "light", "dark"])
    .default("system"),

  // Social
  NEXT_PUBLIC_TWITTER: z
    .string()
    .trim()
    .default("https://twitter.com/frenzzofficial"),

  NEXT_PUBLIC_GITHUB: z
    .string()
    .trim()
    .default("https://github.com/frenzzofficial"),

  NEXT_PUBLIC_LINKEDIN: z
    .string()
    .trim()
    .default("https://www.linkedin.com/company/frenzz/"),

  // Author
  NEXT_PUBLIC_AUTHOR_NAME: z.string().trim().min(1).default("frenzzofficial"),

  NEXT_PUBLIC_AUTHOR_HANDLE: z.string().trim().min(1).default("frenzzofficial"),

  NEXT_PUBLIC_AUTHOR_EMAIL: z.email().default("contact@frenzz.in"),

  // Google Verification
  NEXT_PUBLIC_GOOGLE_VERIFICATION: z
    .string()
    .trim()
    .min(1)
    .default("google-verification-code"),
});

// Validated Public Environment
const parsedEnv = parseEnv(parsedEnvSchema, "public");

// Public Application Config
export const envPublicConfig = Object.freeze({
  // App
  APP_NAME: parsedEnv.NEXT_PUBLIC_APP_NAME,
  APP_VERSION: parsedEnv.NEXT_PUBLIC_APP_VERSION,
  APP_DESCRIPTION: parsedEnv.NEXT_PUBLIC_APP_DESCRIPTION,

  // Site
  SITE_URL: parsedEnv.NEXT_PUBLIC_SITE_URL,
  SITE_TITLE: parsedEnv.NEXT_PUBLIC_SITE_TITLE,
  LOGO_URL: parsedEnv.NEXT_PUBLIC_LOGO_URL,
  OG_IMAGE_URL: parsedEnv.NEXT_PUBLIC_OG_IMAGE_URL,

  // Theme
  ACTIVE_STYLE: parsedEnv.NEXT_PUBLIC_ACTIVE_STYLE,
  ACTIVE_THEME: parsedEnv.NEXT_PUBLIC_ACTIVE_THEME,

  // Social
  TWITTER: parsedEnv.NEXT_PUBLIC_TWITTER,
  LINKEDIN: parsedEnv.NEXT_PUBLIC_LINKEDIN,
  GITHUB: parsedEnv.NEXT_PUBLIC_GITHUB,

  // Author
  AUTHOR_NAME: parsedEnv.NEXT_PUBLIC_AUTHOR_NAME,
  AUTHOR_HANDLE: parsedEnv.NEXT_PUBLIC_AUTHOR_HANDLE,
  AUTHOR_EMAIL: parsedEnv.NEXT_PUBLIC_AUTHOR_EMAIL,

  // Google Verification
  GOOGLE_VERIFICATION: parsedEnv.NEXT_PUBLIC_GOOGLE_VERIFICATION,
});

export type EnvPublicConfig = typeof envPublicConfig;
