import neolenzConfig, {
  NEOLENZ_PRESENTATION_STAGES,
  type NeolenzStage,
} from "@/packages/configs/neolenz.config";
import type { NeolenzResponse } from "@/packages/schemas/neolenz.schema";
import type { NeolenzCrop } from "./neolenz.crop";
import { hasContext, hasExtractableContent } from "./neolenz.utils";

export type SelectedImage = {
  file: File;
  url: string;
  name: string;
  size: number;
  width: number;
  height: number;
};

export type NeolenzState = {
  stage: NeolenzStage;
  /** The file the user chose. The review step always works on this. */
  original: SelectedImage | null;
  /** The selection the user made (normalized), or null for the whole image. */
  crop: NeolenzCrop | null;
  /** What was actually sent for analysis (the original or a cropped copy). */
  image: SelectedImage | null;
  /** Real upload progress, 0 to 1. `null` when the browser can't report it. */
  uploadProgress: number | null;
  result: NeolenzResponse | null;
  error: string | null;
  /** Identifies the active run. Actions from older runs are ignored. */
  runId: number;
};

export const initialState: NeolenzState = {
  stage: "idle",
  original: null,
  crop: null,
  image: null,
  uploadProgress: null,
  result: null,
  error: null,
  runId: 0,
};

export type NeolenzAction =
  | { type: "edit"; original: SelectedImage; runId: number }
  | {
      type: "start";
      image: SelectedImage;
      crop: NeolenzCrop | null;
      runId: number;
    }
  | { type: "reopen" }
  | { type: "progress"; runId: number; value: number }
  | { type: "resolved"; runId: number; result: NeolenzResponse }
  | { type: "advance"; runId: number }
  | { type: "fail"; runId: number; message: string }
  | { type: "reset" };

/** Every legal stage change. Anything else is ignored. */
const transitions: Record<NeolenzStage, readonly NeolenzStage[]> = {
  idle: ["editing"],
  editing: ["uploading", "idle"],
  uploading: ["received", "error", "idle"],
  received: ["scanning", "error", "idle"],
  scanning: [
    "identifying",
    "extracting",
    "understanding",
    "revealing",
    "complete",
    "error",
    "idle",
  ],
  identifying: [
    "extracting",
    "understanding",
    "revealing",
    "complete",
    "idle",
    "error",
  ],
  extracting: ["understanding", "revealing", "complete", "idle", "error"],
  understanding: ["revealing", "complete", "idle", "error"],
  revealing: ["complete", "idle", "error"],
  complete: ["idle", "uploading", "editing"],
  error: ["idle", "uploading", "editing"],
};

export const canTransition = (from: NeolenzStage, to: NeolenzStage) =>
  transitions[from].includes(to);

const isApplicable = (stage: NeolenzStage, result: NeolenzResponse) => {
  const { analysis } = result;
  switch (stage) {
    case "identifying":
      return analysis.regions.length > 0;
    case "extracting":
      return hasExtractableContent(analysis);
    case "understanding":
      return hasContext(analysis);
    default:
      return true;
  }
};

/** Next stage that has something real to show, skipping the rest. */
export const getNextStage = (
  current: NeolenzStage,
  result: NeolenzResponse | null,
): NeolenzStage | null => {
  if (current === "received") return "scanning";
  if (!result) return null;

  const order: readonly NeolenzStage[] = NEOLENZ_PRESENTATION_STAGES;
  const position = order.indexOf(current);
  if (current !== "scanning" && position === -1) return null;

  const start = current === "scanning" ? 0 : position + 1;
  return (
    order.slice(start).find((stage) => isApplicable(stage, result)) ?? null
  );
};

/** How long a stage stays on screen before the next one. `null` = wait. */
export const getStageDelay = (
  state: NeolenzState,
  reducedMotion: boolean,
): number | null => {
  const { stage, result } = state;
  const { timing, limits } = neolenzConfig;

  if (stage === "received") {
    return reducedMotion ? timing.reducedMotionMs : timing.receivedMs;
  }
  if (!result) return null;
  if (reducedMotion) return timing.reducedMotionMs;

  switch (stage) {
    case "scanning":
      return timing.scanSettleMs;
    case "identifying": {
      const shown = Math.min(result.analysis.regions.length, limits.maxRegions);
      return shown * timing.regionStepMs + timing.regionHoldMs;
    }
    case "extracting":
      return timing.extractMs;
    case "understanding":
      return timing.understandMs;
    case "revealing":
      return timing.revealMs;
    default:
      return null;
  }
};

export const reducer = (
  state: NeolenzState,
  action: NeolenzAction,
): NeolenzState => {
  switch (action.type) {
    case "reset":
      return { ...initialState, runId: state.runId + 1 };

    // Choosing an image restarts the workflow from any stage.
    case "edit":
      return {
        ...initialState,
        stage: "editing",
        original: action.original,
        runId: action.runId,
      };

    case "start":
      if (!canTransition(state.stage, "uploading")) return state;
      return {
        ...state,
        stage: "uploading",
        crop: action.crop,
        image: action.image,
        uploadProgress: 0,
        result: null,
        error: null,
        runId: action.runId,
      };

    // Back to the review step with the previous selection intact.
    case "reopen":
      if (!state.original || !canTransition(state.stage, "editing")) {
        return state;
      }
      return {
        ...state,
        stage: "editing",
        image: null,
        uploadProgress: null,
        result: null,
        error: null,
        runId: state.runId + 1,
      };

    default:
      break;
  }

  // Everything below belongs to a specific run; drop stale ones.
  if (action.runId !== state.runId) return state;

  switch (action.type) {
    case "progress":
      if (state.stage !== "uploading") return state;
      // All bytes sent: the server now has the image.
      if (action.value >= 1) {
        return { ...state, uploadProgress: 1, stage: "received" };
      }
      return { ...state, uploadProgress: action.value };

    case "resolved":
      return {
        ...state,
        result: action.result,
        // A very fast response can beat the final progress event.
        stage: state.stage === "uploading" ? "received" : state.stage,
        uploadProgress: 1,
      };

    case "advance": {
      const next = getNextStage(state.stage, state.result);
      if (!next || !canTransition(state.stage, next)) return state;
      return { ...state, stage: next };
    }

    case "fail":
      if (!canTransition(state.stage, "error")) return state;
      return { ...state, stage: "error", error: action.message };

    default:
      return state;
  }
};
