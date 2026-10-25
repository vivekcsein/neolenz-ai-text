"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  analyzeImage,
  getNeolenzErrorMessage,
} from "@/packages/api/neolenz.api";
import { useReducedMotion } from "@/packages/hooks/useReducedMotion";
import { asyncHandler } from "@/packages/utils/async-handler";
import { cropImageFile, isFullCrop, type NeolenzCrop } from "./neolenz.crop";
import {
  getStageDelay,
  initialState,
  type NeolenzState,
  reducer,
  type SelectedImage,
} from "./neolenz.machine";
import { readImageDimensions, validateImageFile } from "./neolenz.utils";

export type NeolenzControls = {
  state: NeolenzState;
  /** Problem with the file the user just tried to add. */
  validationError: string | null;
  /** Problem preparing the selection in the review step. */
  editorError: string | null;
  /** Validate a file and open the review step. */
  select: (file: File) => Promise<void>;
  /** Send the whole image, or just the selection, for analysis. */
  analyze: (crop: NeolenzCrop | null) => Promise<void>;
  /** Return to the review step with the previous selection. */
  adjust: () => void;
  /** Re-send the same image after an error. */
  retry: () => void;
  reset: () => void;
};

/**
 * Owns the whole workflow: validation, the human review step, the single
 * analysis request, the stage machine and the paced reveal afterwards.
 * Real completion always drives the state; timers only pace presentation.
 */
export const useNeolenzAnalysis = (): NeolenzControls => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const controllerRef = useRef<AbortController | null>(null);
  const runCounterRef = useRef(0);
  const originalUrlRef = useRef<string | null>(null);
  const sentUrlRef = useRef<string | null>(null);

  /** A cropped copy has its own URL; the original's URL must outlive it. */
  const releaseSentUrl = useCallback(() => {
    if (sentUrlRef.current && sentUrlRef.current !== originalUrlRef.current) {
      URL.revokeObjectURL(sentUrlRef.current);
    }
    sentUrlRef.current = null;
  }, []);

  const releaseAllUrls = useCallback(() => {
    releaseSentUrl();
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    originalUrlRef.current = null;
  }, [releaseSentUrl]);

  const run = useCallback(
    async (image: SelectedImage, crop: NeolenzCrop | null, runId: number) => {
      const controller = new AbortController();
      controllerRef.current = controller;

      dispatch({ type: "start", image, crop, runId });

      const [error, data] = await asyncHandler(
        analyzeImage(image.file, {
          signal: controller.signal,
          onUploadProgress: (event) => {
            if (!event.total) return;
            dispatch({
              type: "progress",
              runId,
              value: Math.min(1, event.loaded / event.total),
            });
          },
        }),
      );

      // Replaced, cancelled or reset while waiting: ignore the outcome.
      if (controller.signal.aborted || runId !== runCounterRef.current) return;

      if (error) {
        dispatch({
          type: "fail",
          runId,
          message: getNeolenzErrorMessage(error),
        });
        return;
      }
      dispatch({ type: "resolved", runId, result: data });
    },
    [],
  );

  const select = useCallback(
    async (file: File) => {
      setValidationError(null);
      setEditorError(null);

      const check = validateImageFile(file);
      if (!check.ok) {
        setValidationError(check.message);
        return;
      }

      const runId = ++runCounterRef.current;
      controllerRef.current?.abort();

      let size: { width: number; height: number };
      try {
        size = await readImageDimensions(file);
      } catch {
        if (runId === runCounterRef.current) {
          setValidationError("This file couldn't be read as an image.");
        }
        return;
      }
      if (runId !== runCounterRef.current) return;

      releaseAllUrls();
      const url = URL.createObjectURL(file);
      originalUrlRef.current = url;

      dispatch({
        type: "edit",
        original: { file, url, name: file.name, size: file.size, ...size },
        runId,
      });
    },
    [releaseAllUrls],
  );

  const analyze = useCallback(
    async (crop: NeolenzCrop | null) => {
      const { original } = state;
      if (!original) return;

      setEditorError(null);
      controllerRef.current?.abort();
      const runId = ++runCounterRef.current;

      let image: SelectedImage = original;
      let appliedCrop: NeolenzCrop | null = null;

      if (crop && !isFullCrop(crop)) {
        try {
          const cropped = await cropImageFile(original, crop);
          if (runId !== runCounterRef.current) return;
          image = {
            file: cropped.file,
            url: URL.createObjectURL(cropped.file),
            name: cropped.file.name,
            size: cropped.file.size,
            width: cropped.width,
            height: cropped.height,
          };
          appliedCrop = crop;
        } catch (error) {
          if (runId !== runCounterRef.current) return;
          setEditorError(
            error instanceof Error
              ? error.message
              : "Couldn't prepare the selection.",
          );
          return;
        }
      }

      releaseSentUrl();
      sentUrlRef.current = image.url;
      await run(image, appliedCrop, runId);
    },
    [state, releaseSentUrl, run],
  );

  const adjust = useCallback(() => {
    controllerRef.current?.abort();
    runCounterRef.current += 1;
    releaseSentUrl();
    setEditorError(null);
    dispatch({ type: "reopen" });
  }, [releaseSentUrl]);

  const retry = useCallback(() => {
    if (!state.image) return;
    controllerRef.current?.abort();
    const runId = ++runCounterRef.current;
    void run(state.image, state.crop, runId);
  }, [run, state.image, state.crop]);

  const reset = useCallback(() => {
    runCounterRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    releaseAllUrls();
    setValidationError(null);
    setEditorError(null);
    dispatch({ type: "reset" });
  }, [releaseAllUrls]);

  // Paced reveal. Only runs once a real result (or the received beat) exists.
  const { stage, result, runId } = state;
  useEffect(() => {
    const delay = getStageDelay(
      { ...initialState, stage, result },
      reducedMotion,
    );
    if (delay === null) return;

    const timer = setTimeout(() => dispatch({ type: "advance", runId }), delay);
    return () => clearTimeout(timer);
  }, [stage, result, runId, reducedMotion]);

  // Unmount: stop the request and free every preview URL.
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      if (sentUrlRef.current && sentUrlRef.current !== originalUrlRef.current) {
        URL.revokeObjectURL(sentUrlRef.current);
      }
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = null;
      sentUrlRef.current = null;
    },
    [],
  );

  return {
    state,
    validationError,
    editorError,
    select,
    analyze,
    adjust,
    retry,
    reset,
  };
};
