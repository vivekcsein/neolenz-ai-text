"use client";

import { motion } from "motion/react";
import { Icon } from "@/components/ui";
import neolenzConfig, {
  type NeolenzStage,
} from "@/packages/configs/neolenz.config";
import type { NeolenzRegion } from "@/packages/schemas/neolenz.schema";
import { cn } from "@/packages/utils/cn";
import { DetectionLegend, DetectionOverlay } from "./DetectionOverlay";
import type { SelectedImage } from "./neolenz.machine";
import { formatBytes } from "./neolenz.utils";
import { ScanOverlay } from "./ScanOverlay";

const REGION_STAGES: readonly NeolenzStage[] = [
  "identifying",
  "extracting",
  "understanding",
  "revealing",
  "complete",
];

type ImagePreviewProps = {
  image: SelectedImage;
  stage: NeolenzStage;
  regions: NeolenzRegion[];
  /** Smaller preview once results are showing. */
  compact: boolean;
  /** The image sent was a user-selected part of the original. */
  cropped: boolean;
};

export const ImagePreview = ({
  image,
  stage,
  regions,
  compact,
  cropped,
}: ImagePreviewProps) => {
  const ratio = image.width / image.height;
  const maxHeight = compact ? "38vh" : "62vh";
  const scanning = stage === "scanning";
  const showRegions = regions.length > 0 && REGION_STAGES.includes(stage);

  return (
    <motion.div
      layout
      layoutId="neolenz-image"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="min-w-0"
    >
      {/* The frame matches the image's aspect ratio, so overlay percentages
          line up with the picture exactly and nothing shifts on load. */}
      <div
        className="neolenz-frame mx-auto w-full"
        style={{
          aspectRatio: ratio,
          maxWidth: `calc(${maxHeight} * ${ratio})`,
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-neolenz-panel">
          {/* biome-ignore lint/performance/noImgElement: local blob preview, not optimizable */}
          <img
            src={image.url}
            alt={`Uploaded image: ${image.name}`}
            width={image.width}
            height={image.height}
            draggable={false}
            className={cn(
              "size-full select-none object-contain transition-opacity duration-300",
              stage === "uploading" && "opacity-75",
            )}
          />
          {scanning && <ScanOverlay />}
        </div>

        {showRegions && (
          <DetectionOverlay
            regions={regions}
            showLabels={stage !== "complete"}
          />
        )}
      </div>

      {showRegions && stage !== "complete" && (
        <DetectionLegend regions={regions} />
      )}

      <div className="mx-auto mt-3 flex w-full max-w-full items-center justify-between gap-3 text-xs">
        <div className="min-w-0">
          <p
            className="truncate font-medium text-foreground"
            title={image.name}
          >
            {image.name}
          </p>
          <p className="text-muted-foreground">
            {formatBytes(image.size)} · {image.width}×{image.height}
            {cropped && " · selection"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 font-medium text-success">
          <Icon name="check-circle" size={13} />
          {neolenzConfig.copy.receivedBadge}
        </span>
      </div>

      {showRegions && stage !== "complete" && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {neolenzConfig.copy.regionsNote}
        </p>
      )}
    </motion.div>
  );
};
