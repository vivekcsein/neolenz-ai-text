import { analyzeImage } from "@/packages/ai/neolenz.analyzer";
import neolenzConfig from "@/packages/configs/neolenz.config";
import { envAiConfig } from "@/packages/env/ai.env";
import { AppError, toAppError } from "@/packages/utils/errors";

export const maxDuration = 90;

const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

const respond = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const fail = (code: string, message: string, status: number) =>
  respond({ error: { code, message } }, status);

type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

/** The file's real format comes from its bytes, never from its declared type. */
const sniffMediaType = (bytes: Uint8Array): SniffedType | null => {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return "image/webp";
  return null;
};

export async function POST(request: Request) {
  if (!envAiConfig.isConfigured) {
    return fail(
      "NOT_CONFIGURED",
      "Image analysis is not configured on this server.",
      503,
    );
  }

  const { maxBytes, maxMegabytes, formatLabel } = neolenzConfig.upload;

  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maxBytes + MULTIPART_OVERHEAD_BYTES
  ) {
    return fail(
      "FILE_TOO_LARGE",
      `Images can be up to ${maxMegabytes} MB.`,
      413,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("BAD_REQUEST", "Send the image as multipart form data.", 400);
  }

  const file = form.get(neolenzConfig.api.fieldName);
  if (!(file instanceof File) || file.size === 0) {
    return fail("BAD_REQUEST", "No image was provided.", 400);
  }
  if (file.size > maxBytes) {
    return fail(
      "FILE_TOO_LARGE",
      `Images can be up to ${maxMegabytes} MB.`,
      413,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mediaType = sniffMediaType(bytes);
  if (!mediaType) {
    return fail(
      "UNSUPPORTED_TYPE",
      `Unsupported or unreadable image. Use ${formatLabel}.`,
      415,
    );
  }

  try {
    const result = await analyzeImage({
      bytes,
      mediaType,
      signal: request.signal,
    });
    return respond(result, 200);
  } catch (error) {
    const appError = error instanceof AppError ? error : toAppError(error);
    return fail(appError.code, appError.message, appError.status ?? 500);
  }
}
