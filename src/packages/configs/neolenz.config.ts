/**
 * neolenz.config.ts
 * --------------------------------------------------------------
 * Single source of truth for the Neolenz image-analysis workflow:
 * upload limits, endpoint, stage order, presentation timings and the
 * user-facing copy. Components and the API route read from here only.
 */

export const NEOLENZ_STAGES = [
  "idle",
  "editing",
  "uploading",
  "received",
  "scanning",
  "identifying",
  "extracting",
  "understanding",
  "revealing",
  "complete",
  "error",
] as const;

export type NeolenzStage = (typeof NEOLENZ_STAGES)[number];

/** Stages that play after the response arrives, in order. */
export const NEOLENZ_PRESENTATION_STAGES = [
  "identifying",
  "extracting",
  "understanding",
  "revealing",
  "complete",
] as const;

const ACCEPTED_TYPES = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/gif": "GIF",
} as const;

export type NeolenzMediaType = keyof typeof ACCEPTED_TYPES;

const MAX_BYTES = 5 * 1024 * 1024;

const neolenzConfig = {
  api: {
    analyzePath: "/api/neolenz/analyze",
    fieldName: "image",
    /** Client-side ceiling. The server has its own, shorter timeout. */
    clientTimeoutMs: 90_000,
    /** Show a "taking longer than usual" hint after this long. */
    slowHintMs: 12_000,
  },

  upload: {
    maxBytes: MAX_BYTES,
    maxMegabytes: MAX_BYTES / (1024 * 1024),
    acceptedTypes: ACCEPTED_TYPES,
    acceptAttribute: Object.keys(ACCEPTED_TYPES).join(","),
    formatLabel: Object.values(ACCEPTED_TYPES).join(", "),
  },

  /** Presentation delays (ms). They only pace the reveal after real data exists. */
  timing: {
    receivedMs: 700,
    scanSettleMs: 500,
    regionStepMs: 450,
    regionHoldMs: 700,
    extractMs: 1300,
    understandMs: 1500,
    revealMs: 800,
    reducedMotionMs: 120,
  },

  /** Human review step: crop, zoom and select before anything is sent. */
  editor: {
    zoom: { min: 1, max: 4, step: 0.25 },
    /** Smallest selectable side, in pixels of the source image. */
    minSelectionPx: 32,
    /** A selection covering (almost) everything is sent as the original file. */
    fullImageTolerance: 0.004,
    /** Longest side of an exported crop, in pixels. */
    maxExportDimension: 4096,
    /** Tried in order when a PNG crop exceeds the upload limit. */
    jpegQualities: [0.9, 0.75],
    /** Arrow-key step, as a fraction of the image (Shift resizes). */
    keyboardStep: 0.01,
  },

  limits: {
    maxRegions: 8,
    extractionPreviewFields: 8,
    extractionPreviewChars: 280,
  },

  regionKindLabels: {
    heading: "Heading detected",
    text: "Text block",
    price: "Price identified",
    date: "Date found",
    table: "Table detected",
    object: "Object detected",
    logo: "Logo detected",
    other: "Region of interest",
  },

  copy: {
    title: "Neolenz",
    tagline: "Drop in an image. Get back structured information.",
    dropTitle: "Drop your image here",
    dropHint: "or paste a screenshot",
    chooseLabel: "Choose Image",
    receivedBadge: "Image received",
    regionsNote: "Highlighted regions are approximate.",
    editorTitle: "Select what to analyze",
    editorHint:
      "Drag on the image to select the part you want. A tighter selection gives cleaner results.",
    analyzeSelection: "Analyze selection",
    analyzeImage: "Analyze image",
    analyzeFull: "Analyze full image",
    adjustSelection: "Adjust selection",
    emptyResult: "No readable content was found in this image.",
    slowHint:
      "This is taking longer than usual. You can keep waiting or cancel.",
  },

  steps: {
    received: "Image received",
    scanning: "Analyzing image",
    identifying: "Identifying regions",
    extracting: "Extracting information",
    understanding: "Understanding context",
    revealing: "Preparing results",
  },
} as const;

export default neolenzConfig;
