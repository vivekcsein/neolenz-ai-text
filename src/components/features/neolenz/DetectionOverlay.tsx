"use client";

import { motion } from "motion/react";
import neolenzConfig from "@/packages/configs/neolenz.config";
import type { NeolenzRegion } from "@/packages/schemas/neolenz.schema";
import { cn } from "@/packages/utils/cn";

const REGION_COLOR = "var(--neolenz-cyan, var(--ring))";

const visibleRegions = (regions: NeolenzRegion[]) =>
  regions.slice(0, neolenzConfig.limits.maxRegions);

const stepSeconds = neolenzConfig.timing.regionStepMs / 1000;

const kindLabel = (region: NeolenzRegion) =>
  neolenzConfig.regionKindLabels[region.kind];

type RegionLabelProps = {
  region: NeolenzRegion;
  index: number;
};

/** Chip + short connector, anchored to the region's top (or bottom) corner. */
const RegionLabel = ({ region, index }: RegionLabelProps) => {
  const { x, y, width, height } = region.box;
  const above = y >= 0.12;
  const alignRight = x + width / 2 > 0.55;

  return (
    <motion.div
      className={cn(
        "absolute flex max-w-[60%] flex-col",
        alignRight ? "items-end" : "items-start",
      )}
      style={{
        left: alignRight ? undefined : `${x * 100}%`,
        right: alignRight ? `${(1 - (x + width)) * 100}%` : undefined,
        top: `${(above ? y : y + height) * 100}%`,
      }}
      initial={{ opacity: 0, y: above ? "-90%" : -4 }}
      animate={{ opacity: 1, y: above ? "-100%" : 0 }}
      transition={{ delay: index * stepSeconds + 0.15, duration: 0.3 }}
    >
      {!above && <Connector />}
      <span className="max-w-full truncate rounded-md border border-neolenz-cyan/50 bg-neolenz-panel/90 px-2 py-0.5 text-[11px] font-medium leading-5 text-foreground shadow-sm">
        {kindLabel(region)}
        <span className="text-muted-foreground"> · {region.label}</span>
      </span>
      {above && <Connector />}
    </motion.div>
  );
};

const Connector = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    className="mx-2 text-neolenz-cyan"
    aria-hidden="true"
  >
    <line
      x1="1"
      y1="0"
      x2="1"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

type DetectionOverlayProps = {
  regions: NeolenzRegion[];
  showLabels: boolean;
};

/**
 * Highlights regions the analysis actually returned. Boxes are normalized
 * (0 to 1) and the frame is sized to the image's own aspect ratio, so
 * percentages map exactly onto the picture with no letterboxing.
 * Regions appear one after another instead of all at once.
 */
export const DetectionOverlay = ({
  regions,
  showLabels,
}: DetectionOverlayProps) => {
  const shown = visibleRegions(regions);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {shown.map((region, index) => (
          <motion.rect
            key={region.id}
            x={region.box.x * 100}
            y={region.box.y * 100}
            width={region.box.width * 100}
            height={region.box.height * 100}
            fillOpacity={0.1}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{ fill: REGION_COLOR, stroke: REGION_COLOR }}
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={{ delay: index * stepSeconds, duration: 0.4 }}
          />
        ))}
      </svg>

      {showLabels && (
        <div className="absolute inset-0 hidden sm:block">
          {shown.map((region, index) => (
            <RegionLabel key={region.id} region={region} index={index} />
          ))}
        </div>
      )}
    </div>
  );
};

/** Small screens: labels move below the image instead of sitting on it. */
export const DetectionLegend = ({ regions }: { regions: NeolenzRegion[] }) => {
  const shown = visibleRegions(regions);
  if (shown.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-2 sm:hidden">
      {shown.map((region, index) => (
        <motion.li
          key={region.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * stepSeconds, duration: 0.3 }}
          className="max-w-full truncate rounded-md border border-neolenz-cyan/40 bg-neolenz-panel/80 px-2 py-1 text-xs text-foreground"
        >
          {kindLabel(region)}
          <span className="text-muted-foreground"> · {region.label}</span>
        </motion.li>
      ))}
    </ul>
  );
};
