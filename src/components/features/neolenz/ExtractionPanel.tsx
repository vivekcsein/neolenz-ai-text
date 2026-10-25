"use client";

import { motion, type Variants } from "motion/react";
import { Icon, type IconName } from "@/components/ui";
import { Grid } from "@/components/ui/layouts";
import neolenzConfig from "@/packages/configs/neolenz.config";
import type {
  FieldKind,
  NeolenzAnalysis,
} from "@/packages/schemas/neolenz.schema";

const MotionGrid = motion.create(Grid);

const FIELD_ICONS: Record<FieldKind, IconName> = {
  text: "align-left",
  title: "file-text",
  date: "calendar",
  company: "boxes",
  price: "credit-card",
  contact: "mail",
  identifier: "tag",
  other: "sparkles",
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

type CardProps = {
  icon: IconName;
  label: string;
  children: React.ReactNode;
};

const ExtractionCard = ({ icon, label, children }: CardProps) => (
  <motion.div
    variants={item}
    className="neolenz-glass min-w-0 rounded-xl p-3.5"
  >
    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      <Icon name={icon} size={14} className="text-neolenz-cyan" />
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-1.5 text-sm text-foreground [overflow-wrap:anywhere]">
      {children}
    </div>
  </motion.div>
);

type ExtractionPanelProps = {
  analysis: NeolenzAnalysis;
};

/** Extracted content as cards. Only fields the analysis returned appear. */
export const ExtractionPanel = ({ analysis }: ExtractionPanelProps) => {
  const { extractionPreviewFields, extractionPreviewChars } =
    neolenzConfig.limits;

  const fields = analysis.fields.slice(0, extractionPreviewFields);
  const hiddenFields = analysis.fields.length - fields.length;
  const preview =
    analysis.text.length > extractionPreviewChars
      ? `${analysis.text.slice(0, extractionPreviewChars).trimEnd()}…`
      : analysis.text;

  return (
    <motion.section
      aria-label="Extracted information"
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {analysis.title && (
        <ExtractionCard icon="file-text" label="Title">
          <span className="text-base font-semibold">{analysis.title}</span>
        </ExtractionCard>
      )}

      {fields.length > 0 && (
        <MotionGrid minItemWidth="13rem" gap="sm" variants={container}>
          {fields.map((field) => (
            <ExtractionCard
              key={`${field.label}:${field.value}`}
              icon={FIELD_ICONS[field.kind ?? "other"]}
              label={field.label}
            >
              {field.value}
            </ExtractionCard>
          ))}
        </MotionGrid>
      )}

      {hiddenFields > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          +{hiddenFields} more in the results
        </p>
      )}

      {analysis.objects.length > 0 && (
        <ExtractionCard icon="box" label="Objects">
          <ul className="flex flex-wrap gap-1.5">
            {analysis.objects.map((object) => (
              <li
                key={object.name}
                className="rounded-md border border-border bg-neolenz-panel-2/60 px-2 py-0.5 text-xs"
              >
                {object.name}
              </li>
            ))}
          </ul>
        </ExtractionCard>
      )}

      {analysis.tables.length > 0 && (
        <ExtractionCard icon="table" label="Tables">
          {analysis.tables.length === 1
            ? "1 table"
            : `${analysis.tables.length} tables`}{" "}
          found
        </ExtractionCard>
      )}

      {preview && (
        <ExtractionCard icon="align-left" label="Text">
          <p className="line-clamp-6 whitespace-pre-line">{preview}</p>
        </ExtractionCard>
      )}
    </motion.section>
  );
};
