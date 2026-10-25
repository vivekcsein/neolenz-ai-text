"use client";

import { motion } from "motion/react";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button, Icon } from "@/components/ui";
import neolenzConfig from "@/packages/configs/neolenz.config";
import { cn } from "@/packages/utils/cn";

type ImageUploaderProps = {
  onSelect: (file: File) => void;
  /** Validation message for the last attempted file. */
  error: string | null;
};

export const ImageUploader = ({ onSelect, error }: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const errorId = useId();
  const { copy, upload } = neolenzConfig;

  // Screenshots: let people paste straight from the clipboard.
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
        item.type.startsWith("image/"),
      );
      if (file) onSelect(file);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onSelect]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onSelect(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onSelect(file);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false);
    }
  };

  return (
    <motion.div
      key="uploader"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto w-full max-w-2xl"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target only; the Choose Image button is the keyboard path */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "neolenz-frame neolenz-glass flex flex-col items-center gap-5 px-6 py-12 text-center transition-transform duration-300 sm:px-12 sm:py-16",
          dragging && "scale-[1.015]",
        )}
      >
        <div
          className={cn(
            "grid size-16 place-items-center rounded-2xl border border-neolenz-blue/40 bg-neolenz-panel-2/70 text-neolenz-cyan transition-colors",
            dragging && "border-neolenz-cyan",
          )}
        >
          <Icon name="image-up" size={30} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {copy.dropTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{copy.dropHint}</p>
        </div>

        <Button
          size="lg"
          onClick={() => inputRef.current?.click()}
          aria-describedby={error ? errorId : undefined}
        >
          <Icon name="upload" size={18} className="mr-2" />
          {copy.chooseLabel}
        </Button>

        <p className="text-xs text-muted-foreground">
          {upload.formatLabel} · up to {upload.maxMegabytes} MB
        </p>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="max-w-sm text-balance text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={upload.acceptAttribute}
          onChange={handleChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </motion.div>
  );
};
