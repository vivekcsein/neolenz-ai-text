import { z } from "zod";

/**
 * neolenz.schema.ts
 * --------------------------------------------------------------
 * Shared contract between the analysis route and the client.
 *
 * Two layers on purpose:
 *  - `neolenzModelOutputSchema`: lenient, what we ask the model to return.
 *  - `neolenzAnalysisSchema`: strict, what the route sends and the UI trusts.
 * The server sanitizes the first into the second, so one badly scaled
 * bounding box never fails a whole analysis.
 */

export const REGION_KINDS = [
  "heading",
  "text",
  "price",
  "date",
  "table",
  "object",
  "logo",
  "other",
] as const;

export const FIELD_KINDS = [
  "text",
  "title",
  "date",
  "company",
  "price",
  "contact",
  "identifier",
  "other",
] as const;

export type RegionKind = (typeof REGION_KINDS)[number];
export type FieldKind = (typeof FIELD_KINDS)[number];

// ---------------------------------------------------------------------------
// Strict schemas (route output / client input)
// ---------------------------------------------------------------------------

export const neolenzBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().gt(0).max(1),
  height: z.number().gt(0).max(1),
});

export const neolenzRegionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(REGION_KINDS),
  label: z.string().min(1),
  box: neolenzBoxSchema,
});

export const neolenzFieldSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  kind: z.enum(FIELD_KINDS).optional(),
  regionId: z.string().optional(),
});

export const neolenzTableSchema = z.object({
  title: z.string().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

export const neolenzObjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  regionId: z.string().optional(),
});

export const neolenzAnalysisSchema = z.object({
  text: z.string(),
  title: z.string().optional(),
  documentType: z.string().optional(),
  mainSubject: z.string().optional(),
  summary: z.string().optional(),
  fields: z.array(neolenzFieldSchema),
  tables: z.array(neolenzTableSchema),
  objects: z.array(neolenzObjectSchema),
  regions: z.array(neolenzRegionSchema),
});

export const neolenzResponseSchema = z.object({
  analysis: neolenzAnalysisSchema,
  meta: z.object({
    model: z.string(),
    durationMs: z.number(),
  }),
});

export const neolenzErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type NeolenzBox = z.infer<typeof neolenzBoxSchema>;
export type NeolenzRegion = z.infer<typeof neolenzRegionSchema>;
export type NeolenzField = z.infer<typeof neolenzFieldSchema>;
export type NeolenzTable = z.infer<typeof neolenzTableSchema>;
export type NeolenzObject = z.infer<typeof neolenzObjectSchema>;
export type NeolenzAnalysis = z.infer<typeof neolenzAnalysisSchema>;
export type NeolenzResponse = z.infer<typeof neolenzResponseSchema>;

// ---------------------------------------------------------------------------
// Lenient schema (model tool input)
// ---------------------------------------------------------------------------

export const neolenzModelOutputSchema = z.object({
  text: z
    .string()
    .describe(
      "All readable text in the image, in reading order. Empty string if none.",
    ),
  title: z
    .string()
    .optional()
    .describe("The main title or heading, only if one is visible."),
  documentType: z
    .string()
    .optional()
    .describe(
      "What kind of image this is (e.g. invoice, receipt, screenshot, photo). Omit if unclear.",
    ),
  mainSubject: z
    .string()
    .optional()
    .describe("The main subject of the image in a few words. Omit if unclear."),
  summary: z
    .string()
    .optional()
    .describe(
      "One or two sentences describing what the image contains. Omit if unclear.",
    ),
  fields: z
    .array(
      z.object({
        label: z.string().describe("Field name, e.g. 'Invoice number'."),
        value: z.string().describe("Value exactly as it appears in the image."),
        kind: z.enum(FIELD_KINDS).optional(),
        regionId: z
          .string()
          .optional()
          .describe("Id of the region this field comes from, if any."),
      }),
    )
    .describe("Key-value information visible in the image. Empty if none."),
  tables: z
    .array(
      z.object({
        title: z.string().optional(),
        headers: z.array(z.string()),
        rows: z.array(z.array(z.string())),
      }),
    )
    .describe("Tables visible in the image. Empty if none."),
  objects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        regionId: z.string().optional(),
      }),
    )
    .describe("Notable physical objects or visual elements. Empty if none."),
  regions: z
    .array(
      z.object({
        id: z.string().describe("Short unique id, e.g. 'r1'."),
        kind: z.enum(REGION_KINDS),
        label: z.string().describe("Short description of the region."),
        box: z.object({
          x: z.number().describe("Left edge, 0 to 1, from the image's left."),
          y: z.number().describe("Top edge, 0 to 1, from the image's top."),
          width: z.number().describe("Width, 0 to 1 of the image width."),
          height: z.number().describe("Height, 0 to 1 of the image height."),
        }),
      }),
    )
    .describe(
      "Locations of the most important elements. Include a region ONLY if you can place it with reasonable confidence; otherwise return an empty array.",
    ),
});

export type NeolenzModelOutput = z.infer<typeof neolenzModelOutputSchema>;
