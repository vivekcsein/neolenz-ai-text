"use client";

import { motion } from "motion/react";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { Button, Icon } from "@/components/ui";
import neolenzConfig from "@/packages/configs/neolenz.config";
import { cn } from "@/packages/utils/cn";
import {
  type CropHandle,
  cropFromPoints,
  getMinSize,
  isFullCrop,
  moveCrop,
  type NeolenzCrop,
  resizeCrop,
  toPixels,
} from "./neolenz.crop";
import type { SelectedImage } from "./neolenz.machine";

type Tool = "select" | "pan";

type Drag =
  | { mode: "draw"; start: { x: number; y: number } }
  | {
      mode: "move";
      start: { x: number; y: number };
      from: NeolenzCrop;
    }
  | {
      mode: "resize";
      handle: CropHandle;
      start: { x: number; y: number };
      from: NeolenzCrop;
    }
  | {
      mode: "pan";
      startX: number;
      startY: number;
      scrollLeft: number;
      scrollTop: number;
    };

const HANDLES: { id: CropHandle; className: string }[] = [
  { id: "nw", className: "left-0 top-0 cursor-nwse-resize" },
  { id: "n", className: "left-1/2 top-0 cursor-ns-resize" },
  { id: "ne", className: "left-full top-0 cursor-nesw-resize" },
  { id: "e", className: "left-full top-1/2 cursor-ew-resize" },
  { id: "se", className: "left-full top-full cursor-nwse-resize" },
  { id: "s", className: "left-1/2 top-full cursor-ns-resize" },
  { id: "sw", className: "left-0 top-full cursor-nesw-resize" },
  { id: "w", className: "left-0 top-1/2 cursor-ew-resize" },
];

type ImageEditorProps = {
  original: SelectedImage;
  /** Selection to start from (set when returning to adjust). */
  initialCrop: NeolenzCrop | null;
  error: string | null;
  onAnalyze: (crop: NeolenzCrop | null) => void;
  onCancel: () => void;
};

export const ImageEditor = ({
  original,
  initialCrop,
  error,
  onAnalyze,
  onCancel,
}: ImageEditorProps) => {
  const { editor, copy } = neolenzConfig;
  const [crop, setCrop] = useState<NeolenzCrop | null>(initialCrop);
  const [zoom, setZoom] = useState<number>(editor.zoom.min);
  const [tool, setTool] = useState<Tool>("select");

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);

  const ratio = original.width / original.height;
  const { minW, minH } = getMinSize(original.width, original.height);
  const full = isFullCrop(crop);
  const pixels =
    crop && !full ? toPixels(crop, original.width, original.height) : null;

  /** Pointer position as a 0..1 point on the (zoomed) image. */
  const toPoint = (event: PointerEvent) => {
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const viewport = viewportRef.current;
    const part = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-crop-part]",
    );

    if (tool === "pan") {
      if (!viewport) return;
      dragRef.current = {
        mode: "pan",
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop,
      };
    } else if (crop && part?.dataset.cropPart === "handle") {
      dragRef.current = {
        mode: "resize",
        handle: part.dataset.handle as CropHandle,
        start: toPoint(event),
        from: crop,
      };
    } else if (crop && part?.dataset.cropPart === "box") {
      dragRef.current = { mode: "move", start: toPoint(event), from: crop };
    } else {
      dragRef.current = { mode: "draw", start: toPoint(event) };
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "pan") {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
      viewport.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
      return;
    }

    const point = toPoint(event);
    if (drag.mode === "draw") {
      const dx = Math.abs(point.x - drag.start.x) * original.width;
      const dy = Math.abs(point.y - drag.start.y) * original.height;
      // Ignore tiny movements so a plain click doesn't create a selection.
      if (dx < 4 && dy < 4) return;
      setCrop(cropFromPoints(drag.start, point, minW, minH));
    } else if (drag.mode === "move") {
      setCrop(
        moveCrop(drag.from, point.x - drag.start.x, point.y - drag.start.y),
      );
    } else {
      setCrop(
        resizeCrop(
          drag.from,
          drag.handle,
          point.x - drag.start.x,
          point.y - drag.start.y,
          minW,
          minH,
        ),
      );
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /** Arrow keys move the selection; Shift+arrows resize it. */
  const handleBoxKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!crop) return;
    const step = editor.keyboardStep;
    const delta = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[event.key];
    if (!delta) return;

    event.preventDefault();
    const [dx, dy] = delta;
    setCrop(
      event.shiftKey
        ? resizeCrop(crop, "se", dx, dy, minW, minH)
        : moveCrop(crop, dx, dy),
    );
  };

  /** Zoom around the centre of what's currently visible. */
  const changeZoom = (next: number) => {
    const viewport = viewportRef.current;
    const clamped = Math.min(editor.zoom.max, Math.max(editor.zoom.min, next));
    if (!viewport) {
      setZoom(clamped);
      return;
    }
    const centerX =
      (viewport.scrollLeft + viewport.clientWidth / 2) / viewport.scrollWidth;
    const centerY =
      (viewport.scrollTop + viewport.clientHeight / 2) / viewport.scrollHeight;

    setZoom(clamped);
    requestAnimationFrame(() => {
      viewport.scrollLeft =
        centerX * viewport.scrollWidth - viewport.clientWidth / 2;
      viewport.scrollTop =
        centerY * viewport.scrollHeight - viewport.clientHeight / 2;
    });
  };

  const primaryLabel = full ? copy.analyzeImage : copy.analyzeSelection;

  return (
    <motion.section
      aria-label="Review image before analysis"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto w-full max-w-4xl space-y-4"
    >
      <header className="space-y-1 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {copy.editorTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{copy.editorHint}</p>
      </header>

      {/* Toolbar */}
      <div className="neolenz-glass flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2">
        <div
          className="flex items-center gap-1.5"
          role="toolbar"
          aria-label="Tools"
        >
          <ToolButton
            active={tool === "select"}
            onClick={() => setTool("select")}
            icon="crop"
            label="Select"
          />
          <ToolButton
            active={tool === "pan"}
            onClick={() => setTool("pan")}
            icon="hand"
            label="Pan"
          />
        </div>

        <div className="flex items-center gap-2">
          <IconStepButton
            icon="zoom-out"
            label="Zoom out"
            disabled={zoom <= editor.zoom.min}
            onClick={() => changeZoom(zoom - editor.zoom.step)}
          />
          <input
            type="range"
            aria-label="Zoom"
            min={editor.zoom.min}
            max={editor.zoom.max}
            step={editor.zoom.step}
            value={zoom}
            onChange={(event) => changeZoom(Number(event.target.value))}
            className="w-24 accent-neolenz-blue sm:w-36"
          />
          <IconStepButton
            icon="zoom-in"
            label="Zoom in"
            disabled={zoom >= editor.zoom.max}
            onClick={() => changeZoom(zoom + editor.zoom.step)}
          />
          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Viewport: native scrolling provides the panning at high zoom. */}
      <div
        ref={viewportRef}
        className="neolenz-frame neolenz-glass max-h-[62vh] overflow-auto overscroll-contain rounded-2xl"
      >
        <div className="p-3">
          <div
            ref={contentRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={cn(
              "relative mx-auto select-none touch-none",
              tool === "pan"
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-crosshair",
            )}
            style={{
              aspectRatio: ratio,
              width: `calc(min(100%, 62vh * ${ratio}) * ${zoom})`,
            }}
          >
            {/* biome-ignore lint/performance/noImgElement: local blob preview, not optimizable */}
            <img
              src={original.url}
              alt={`Preview of ${original.name}`}
              width={original.width}
              height={original.height}
              draggable={false}
              className="pointer-events-none size-full select-none"
            />

            {crop && (
              <>
                <button
                  type="button"
                  data-crop-part="box"
                  onKeyDown={handleBoxKeyDown}
                  aria-label={`Selection ${pixels ? `${pixels.sw} by ${pixels.sh} pixels` : "covers the whole image"}. Arrow keys move it, Shift plus arrow keys resize it.`}
                  className={cn(
                    "absolute border-2 border-neolenz-cyan bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-neolenz-blue",
                    tool === "select" ? "cursor-move" : "pointer-events-none",
                  )}
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.width * 100}%`,
                    height: `${crop.height * 100}%`,
                    // Dims everything outside the selection.
                    boxShadow: "0 0 0 9999px rgb(5 8 20 / 0.62)",
                  }}
                />
                {tool === "select" && (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: `${crop.x * 100}%`,
                      top: `${crop.y * 100}%`,
                      width: `${crop.width * 100}%`,
                      height: `${crop.height * 100}%`,
                    }}
                  >
                    {HANDLES.map((handle) => (
                      <span
                        key={handle.id}
                        data-crop-part="handle"
                        data-handle={handle.id}
                        className={cn(
                          "pointer-events-auto absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-neolenz-cyan bg-neolenz-panel sm:size-3",
                          handle.className,
                        )}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p aria-live="polite">
          {pixels
            ? `Selection: ${pixels.sw} × ${pixels.sh} px`
            : `Whole image: ${original.width} × ${original.height} px`}
        </p>
        {crop && (
          <button
            type="button"
            onClick={() => setCrop(null)}
            className="cursor-pointer font-medium text-foreground underline underline-offset-4 hover:text-neolenz-cyan"
          >
            Clear selection
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Choose another image
        </Button>
        <div className="flex flex-wrap gap-2">
          {!full && (
            <Button variant="secondary" onClick={() => onAnalyze(null)}>
              {copy.analyzeFull}
            </Button>
          )}
          <Button onClick={() => onAnalyze(crop)}>
            <Icon name="scan" size={16} className="mr-2" />
            {primaryLabel}
          </Button>
        </div>
      </div>
    </motion.section>
  );
};

type ToolButtonProps = {
  active: boolean;
  onClick: () => void;
  icon: "crop" | "hand";
  label: string;
};

const ToolButton = ({ active, onClick, icon, label }: ToolButtonProps) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-neolenz-blue",
      active
        ? "border-neolenz-cyan bg-neolenz-cyan/15 text-foreground"
        : "border-border text-muted-foreground hover:text-foreground",
    )}
  >
    <Icon name={icon} size={15} />
    {label}
  </button>
);

type IconStepButtonProps = {
  icon: "zoom-in" | "zoom-out";
  label: string;
  disabled: boolean;
  onClick: () => void;
};

const IconStepButton = ({
  icon,
  label,
  disabled,
  onClick,
}: IconStepButtonProps) => (
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-neolenz-blue"
  >
    <Icon name={icon} size={16} />
  </button>
);
