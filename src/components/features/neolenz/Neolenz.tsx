"use client";

import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
} from "motion/react";
import { useTheme } from "next-themes";
import { Toaster } from "sonner";
import { Button } from "@/components/ui";
import neolenzConfig, {
  type NeolenzStage,
} from "@/packages/configs/neolenz.config";
import { cn } from "@/packages/utils/cn";
import { AnalysisStatus } from "./AnalysisStatus";
import { ContextSummary } from "./ContextSummary";
import { ExtractionPanel } from "./ExtractionPanel";
import { ImageEditor } from "./ImageEditor";
import { ImagePreview } from "./ImagePreview";
import { ImageUploader } from "./ImageUploader";
import { isFullCrop } from "./neolenz.crop";
import { ResultsPanel } from "./ResultsPanel";
import { useNeolenzAnalysis } from "./useNeolenzAnalysis";

const EXTRACTION_STAGES: readonly NeolenzStage[] = [
  "extracting",
  "understanding",
  "revealing",
];
const CONTEXT_STAGES: readonly NeolenzStage[] = ["understanding", "revealing"];

/** One grid whose columns change per phase; Motion animates the change. */
const gridClass = (stage: NeolenzStage) => {
  if (stage === "complete") {
    return "mx-auto max-w-6xl lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]";
  }
  if (EXTRACTION_STAGES.includes(stage)) {
    return "mx-auto max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]";
  }
  return "mx-auto max-w-4xl lg:grid-cols-[minmax(0,1fr)_17rem]";
};

export const Neolenz = () => {
  const {
    state,
    validationError,
    editorError,
    select,
    analyze,
    adjust,
    retry,
    reset,
  } = useNeolenzAnalysis();
  const { resolvedTheme } = useTheme();

  const { stage, original, image, crop, result, error, uploadProgress } = state;
  const analysis = result?.analysis ?? null;
  const showStatus =
    stage !== "complete" && stage !== "error" && stage !== "editing";

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <section
          aria-label="Neolenz image analysis"
          className="mx-auto w-full px-4 py-10 sm:px-6 sm:py-14"
        >
          <AnimatePresence mode="wait" initial={false}>
            {stage === "idle" && (
              <motion.div key="intro" exit={{ opacity: 0 }}>
                <header className="mx-auto mb-8 max-w-2xl text-center">
                  <h1 className="text-balance bg-linear-to-r from-neolenz-cyan via-neolenz-blue to-neolenz-violet bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
                    {neolenzConfig.copy.title}
                  </h1>
                  <p className="mt-3 text-balance text-muted-foreground sm:text-lg">
                    {neolenzConfig.copy.tagline}
                  </p>
                </header>
                <ImageUploader onSelect={select} error={validationError} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {stage === "editing" && original && (
              <ImageEditor
                key="editor"
                original={original}
                initialCrop={crop}
                error={editorError}
                onAnalyze={analyze}
                onCancel={reset}
              />
            )}
          </AnimatePresence>

          {image && stage !== "editing" && (
            <motion.div
              layout
              className={cn("grid items-start gap-6", gridClass(stage))}
            >
              <ImagePreview
                image={image}
                stage={stage}
                regions={analysis?.regions ?? []}
                compact={stage === "complete"}
                cropped={crop !== null && !isFullCrop(crop)}
              />

              <motion.div layout className="min-w-0 space-y-4">
                {showStatus && (
                  <AnalysisStatus
                    stage={stage}
                    uploadProgress={uploadProgress}
                    analysis={analysis}
                    onCancel={reset}
                  />
                )}

                {analysis && EXTRACTION_STAGES.includes(stage) && (
                  <ExtractionPanel analysis={analysis} />
                )}

                {analysis && CONTEXT_STAGES.includes(stage) && (
                  <ContextSummary analysis={analysis} />
                )}

                {result && stage === "complete" && (
                  <ResultsPanel
                    response={result}
                    fileName={image.name}
                    onAdjust={adjust}
                    onReset={reset}
                  />
                )}

                {stage === "error" && (
                  <div
                    role="alert"
                    className="neolenz-glass space-y-4 rounded-2xl border-destructive/50 p-5"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {error}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={retry}>
                        Try again
                      </Button>
                      <Button variant="secondary" size="sm" onClick={adjust}>
                        {neolenzConfig.copy.adjustSelection}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={reset}>
                        Choose another image
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </section>
      </LayoutGroup>

      <Toaster
        position="bottom-center"
        richColors
        closeButton
        theme={resolvedTheme === "light" ? "light" : "dark"}
      />
    </MotionConfig>
  );
};
