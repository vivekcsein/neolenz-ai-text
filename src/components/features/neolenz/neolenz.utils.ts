import neolenzConfig, {
  type NeolenzMediaType,
} from "@/packages/configs/neolenz.config";
import type { NeolenzAnalysis } from "@/packages/schemas/neolenz.schema";

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

type Validation = { ok: true } | { ok: false; message: string };

/** File validation: type and size only. Decoding is checked separately. */
export const validateImageFile = (file: File): Validation => {
  const { acceptedTypes, maxBytes, maxMegabytes, formatLabel } =
    neolenzConfig.upload;

  if (!(file.type in acceptedTypes)) {
    return {
      ok: false,
      message: `Unsupported file type. Use ${formatLabel}.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, message: "This file is empty." };
  }
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `This image is ${formatBytes(file.size)}. The limit is ${maxMegabytes} MB.`,
    };
  }
  return { ok: true };
};

export const isAcceptedType = (type: string): type is NeolenzMediaType =>
  type in neolenzConfig.upload.acceptedTypes;

/** Decodes the image to read its real size. Also rejects corrupt files. */
export const readImageDimensions = async (
  file: File,
): Promise<{ width: number; height: number }> => {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Could not decode image."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const hasExtractableContent = (analysis: NeolenzAnalysis): boolean =>
  Boolean(
    analysis.text ||
      analysis.title ||
      analysis.fields.length ||
      analysis.tables.length ||
      analysis.objects.length,
  );

export const hasContext = (analysis: NeolenzAnalysis): boolean =>
  Boolean(analysis.documentType || analysis.mainSubject || analysis.summary);

export const toStructuredData = (analysis: NeolenzAnalysis) => ({
  title: analysis.title,
  documentType: analysis.documentType,
  mainSubject: analysis.mainSubject,
  summary: analysis.summary,
  fields: analysis.fields,
  tables: analysis.tables,
  objects: analysis.objects,
});

export const baseName = (fileName: string): string =>
  fileName.replace(/\.[^./\\]+$/, "") || "image";

/** Triggers a browser download. Returns false if it could not start. */
export const downloadJson = (fileName: string, data: unknown): boolean => {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Stable keys for static lists without using array indexes: identical
 * entries are told apart by how many times they have already appeared.
 */
export const withKeys = <T extends string | string[]>(
  items: readonly T[],
): { key: string; item: T }[] => {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base: string = typeof item === "string" ? item : item.join("\u241f");
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return { key: `${base}#${count}`, item };
  });
};
