import axios, { type AxiosProgressEvent } from "axios";
import neolenzConfig from "@/packages/configs/neolenz.config";
import {
  type NeolenzResponse,
  neolenzErrorResponseSchema,
  neolenzResponseSchema,
} from "@/packages/schemas/neolenz.schema";
import type { AppError } from "@/packages/utils/errors";

type AnalyzeImageOptions = {
  signal: AbortSignal;
  onUploadProgress?: (event: AxiosProgressEvent) => void;
};

/**
 * Uploads one image and resolves the validated analysis response.
 * Rejects with the raw error; wrap with `asyncHandler` to get an `AppError`.
 */
export const analyzeImage = async (
  file: File,
  { signal, onUploadProgress }: AnalyzeImageOptions,
): Promise<NeolenzResponse> => {
  const body = new FormData();
  body.append(neolenzConfig.api.fieldName, file);

  const response = await axios.post<unknown>(
    neolenzConfig.api.analyzePath,
    body,
    {
      signal,
      timeout: neolenzConfig.api.clientTimeoutMs,
      onUploadProgress,
    },
  );

  return neolenzResponseSchema.parse(response.data);
};

/** Picks the most useful message out of an `AppError` for the UI. */
export const getNeolenzErrorMessage = (error: AppError): string => {
  const server = neolenzErrorResponseSchema.safeParse(error.details);
  if (server.success) return server.data.error.message;

  switch (error.code) {
    case "TIMEOUT":
      return "The analysis took too long. Please try again.";
    case "NETWORK_ERROR":
      return "Couldn't reach the server. Check your connection and try again.";
    case "VALIDATION_ERROR":
      return "The analysis came back in an unexpected format. Please try again.";
    default:
      return "Something went wrong while analyzing the image. Please try again.";
  }
};
