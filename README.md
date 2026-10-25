# Neolenz

Upload an image, get structured information back: text, key-value fields,
tables and objects. The uploaded image stays on screen through every stage
(upload, scan, identify, extract, understand, results).

## Run

```bash
bun install
cp .env.example .env.local   # set GEMINI_API_KEY (free) or ANTHROPIC_API_KEY
bun dev
```

## How it works

- `POST /api/neolenz/analyze` validates the image (size and real file type from its bytes), sends it to Gemini (free tier available) or Anthropic, and gets a structured JSON answer back. The result is sanitized and validated against `src/packages/schemas/neolenz.schema.ts`.
- The UI lives in `src/components/features/neolenz/`. `useNeolenzAnalysis` runs one request and a stage machine (`neolenz.machine.ts`); timers only pace the reveal after the real response arrives.
- All limits, timings and copy are in `src/packages/configs/neolenz.config.ts`.
- Theme: `neolenz-theme` (OKLCH). Results use a light surface for readability.

## Honesty rules

No fabricated text, confidences or percentages. Highlighted regions are shown only when the model returns them, and are labelled approximate. Upload progress is real; analysis progress is indeterminate.

## Scripts

`bun run verify` (lint, format, check, typecheck).
