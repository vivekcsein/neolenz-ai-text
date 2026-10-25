"use client";

import { useEffect, useState } from "react";
import { Button, Icon } from "@/components/ui";
import neolenzConfig, {
  type NeolenzStage,
} from "@/packages/configs/neolenz.config";
import type { NeolenzAnalysis } from "@/packages/schemas/neolenz.schema";
import { cn } from "@/packages/utils/cn";
import { hasContext, hasExtractableContent } from "./neolenz.utils";

type StepId = keyof typeof neolenzConfig.steps;

const STEP_ORDER: readonly StepId[] = [
  "received",
  "scanning",
  "identifying",
  "extracting",
  "understanding",
  "revealing",
];

const WAITING_STAGES: readonly NeolenzStage[] = [
  "uploading",
  "received",
  "scanning",
];

/** Position of the stage in STEP_ORDER. Past the end means finished. */
const getActiveIndex = (stage: NeolenzStage): number => {
  if (stage === "uploading" || stage === "received") return 0;
  if (stage === "complete") return STEP_ORDER.length;
  return STEP_ORDER.indexOf(stage as StepId);
};

/** Only steps that will really happen are listed. */
const getVisibleSteps = (analysis: NeolenzAnalysis | null): StepId[] =>
  STEP_ORDER.filter((id) => {
    if (!analysis)
      return id === "received" || id === "scanning" || id === "revealing";
    if (id === "identifying") return analysis.regions.length > 0;
    if (id === "extracting") return hasExtractableContent(analysis);
    if (id === "understanding") return hasContext(analysis);
    return true;
  });

type AnalysisStatusProps = {
  stage: NeolenzStage;
  /** Real upload progress (0 to 1), or null. */
  uploadProgress: number | null;
  analysis: NeolenzAnalysis | null;
  onCancel: () => void;
};

export const AnalysisStatus = ({
  stage,
  uploadProgress,
  analysis,
  onCancel,
}: AnalysisStatusProps) => {
  const [slow, setSlow] = useState(false);
  const waiting = !analysis && WAITING_STAGES.includes(stage);

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setSlow(true), neolenzConfig.api.slowHintMs);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [waiting]);

  const steps = getVisibleSteps(analysis);
  const activeIndex = getActiveIndex(stage);
  const uploading = stage === "uploading";
  const percent = Math.round((uploadProgress ?? 0) * 100);

  const activeLabel = uploading
    ? `Uploading image… ${percent}%`
    : stage === "complete"
      ? "Done"
      : neolenzConfig.steps[STEP_ORDER[activeIndex] ?? "revealing"];

  return (
    <section
      aria-label="Analysis progress"
      className="neolenz-glass rounded-2xl p-4 sm:p-5"
    >
      <output aria-live="polite" className="sr-only">
        {activeLabel}
      </output>

      <ol className="space-y-3">
        {steps.map((id) => {
          const index = STEP_ORDER.indexOf(id);
          const state =
            index < activeIndex
              ? "done"
              : index === activeIndex
                ? "active"
                : "pending";

          return (
            <li key={id} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border text-[11px]",
                  state === "done" &&
                    "border-success/50 bg-success/15 text-success",
                  state === "active" &&
                    "border-neolenz-cyan bg-neolenz-cyan/15 text-neolenz-cyan",
                  state === "pending" && "border-border text-muted-foreground",
                )}
              >
                {state === "done" ? (
                  <Icon name="check" size={13} strokeWidth={3} />
                ) : (
                  <span
                    className={cn(
                      "size-1.5 rounded-full bg-current",
                      state === "active" && "motion-safe:animate-pulse",
                    )}
                  />
                )}
              </span>
              <span
                className={cn(
                  state === "pending"
                    ? "text-muted-foreground"
                    : "font-medium text-foreground",
                )}
              >
                {id === "received" && uploading
                  ? `Uploading image… ${percent}%`
                  : neolenzConfig.steps[id]}
              </span>
            </li>
          );
        })}
      </ol>

      {(uploading || (waiting && stage === "scanning")) && (
        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-neolenz-panel-2"
          role="progressbar"
          aria-label={uploading ? "Upload progress" : "Analysis in progress"}
          aria-valuemin={uploading ? 0 : undefined}
          aria-valuemax={uploading ? 100 : undefined}
          aria-valuenow={uploading ? percent : undefined}
        >
          {uploading ? (
            <div
              className="h-full origin-left rounded-full bg-neolenz-blue transition-transform duration-200"
              style={{ transform: `scaleX(${uploadProgress ?? 0})` }}
            />
          ) : (
            <div className="neolenz-indeterminate h-full rounded-full bg-neolenz-blue/30" />
          )}
        </div>
      )}

      {waiting && (
        <div className="mt-4 space-y-3">
          {slow && (
            <p className="text-xs text-muted-foreground">
              {neolenzConfig.copy.slowHint}
            </p>
          )}
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </section>
  );
};
