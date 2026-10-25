import neolenzConfig from "@/packages/configs/neolenz.config";
import type { SelectedImage } from "./neolenz.machine";
import { baseName } from "./neolenz.utils";

/**
 * neolenz.crop.ts
 * --------------------------------------------------------------
 * Selection math and canvas export for the review step. Selections are
 * normalized (0 to 1) against the source image, the same coordinate system
 * the analysis uses for regions, so nothing needs converting between them.
 */

export type NeolenzCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CropHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type Point = { x: number; y: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Smallest selectable size per axis, as a fraction of the image. */
export const getMinSize = (width: number, height: number) => {
  const { minSelectionPx } = neolenzConfig.editor;
  return {
    minW: Math.min(1, minSelectionPx / width),
    minH: Math.min(1, minSelectionPx / height),
  };
};

/** True when the selection covers (almost) the whole image. */
export const isFullCrop = (crop: NeolenzCrop | null): boolean => {
  if (!crop) return true;
  const tolerance = neolenzConfig.editor.fullImageTolerance;
  return (
    crop.x <= tolerance &&
    crop.y <= tolerance &&
    crop.width >= 1 - tolerance &&
    crop.height >= 1 - tolerance
  );
};

/** A rectangle from where a drag started to where the pointer is now. */
export const cropFromPoints = (
  start: Point,
  end: Point,
  minW: number,
  minH: number,
): NeolenzCrop => {
  const x1 = clamp(Math.min(start.x, end.x), 0, 1);
  const y1 = clamp(Math.min(start.y, end.y), 0, 1);
  const x2 = clamp(Math.max(start.x, end.x), 0, 1);
  const y2 = clamp(Math.max(start.y, end.y), 0, 1);

  const width = Math.max(x2 - x1, minW);
  const height = Math.max(y2 - y1, minH);
  return {
    x: clamp(x1, 0, 1 - width),
    y: clamp(y1, 0, 1 - height),
    width,
    height,
  };
};

export const moveCrop = (
  crop: NeolenzCrop,
  dx: number,
  dy: number,
): NeolenzCrop => ({
  ...crop,
  x: clamp(crop.x + dx, 0, 1 - crop.width),
  y: clamp(crop.y + dy, 0, 1 - crop.height),
});

export const resizeCrop = (
  crop: NeolenzCrop,
  handle: CropHandle,
  dx: number,
  dy: number,
  minW: number,
  minH: number,
): NeolenzCrop => {
  let left = crop.x;
  let top = crop.y;
  let right = crop.x + crop.width;
  let bottom = crop.y + crop.height;

  if (handle.includes("w")) left = clamp(left + dx, 0, right - minW);
  if (handle.includes("e")) right = clamp(right + dx, left + minW, 1);
  if (handle.includes("n")) top = clamp(top + dy, 0, bottom - minH);
  if (handle.includes("s")) bottom = clamp(bottom + dy, top + minH, 1);

  return { x: left, y: top, width: right - left, height: bottom - top };
};

/** The selection in whole source pixels (never zero-sized). */
export const toPixels = (crop: NeolenzCrop, width: number, height: number) => {
  const sx = clamp(Math.round(crop.x * width), 0, width - 1);
  const sy = clamp(Math.round(crop.y * height), 0, height - 1);
  const sw = clamp(Math.round(crop.width * width), 1, width - sx);
  const sh = clamp(Math.round(crop.height * height), 1, height - sy);
  return { sx, sy, sw, sh };
};

// ---------------------------------------------------------------------------
// Export (browser only)
// ---------------------------------------------------------------------------

type CropResult = { file: File; width: number; height: number };

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Renders the selection at the source's native resolution (capped) and
 * returns it as a new file. PNG first; if that is over the upload limit it
 * falls back to JPEG so the selection still fits.
 */
export const cropImageFile = async (
  original: SelectedImage,
  crop: NeolenzCrop,
): Promise<CropResult> => {
  const { maxExportDimension, jpegQualities } = neolenzConfig.editor;
  const { maxBytes } = neolenzConfig.upload;
  const { sx, sy, sw, sh } = toPixels(crop, original.width, original.height);

  const scale = Math.min(1, maxExportDimension / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const bitmap = await createImageBitmap(original.file);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Your browser could not prepare the selection.");
  }

  const render = (opaque: boolean) => {
    context.clearRect(0, 0, width, height);
    if (opaque) {
      // JPEG has no transparency; avoid a black background.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  };

  try {
    const attempts: { type: string; quality?: number }[] = [
      { type: "image/png" },
      ...jpegQualities.map((quality) => ({ type: "image/jpeg", quality })),
    ];

    for (const attempt of attempts) {
      render(attempt.type === "image/jpeg");
      const blob = await canvasToBlob(canvas, attempt.type, attempt.quality);
      if (blob && blob.size > 0 && blob.size <= maxBytes) {
        const extension = attempt.type === "image/png" ? "png" : "jpg";
        const file = new File(
          [blob],
          `${baseName(original.name)}-selection.${extension}`,
          { type: attempt.type },
        );
        return { file, width, height };
      }
    }
  } finally {
    bitmap.close();
  }

  throw new Error(
    `This selection is larger than ${neolenzConfig.upload.maxMegabytes} MB. Select a smaller area.`,
  );
};
