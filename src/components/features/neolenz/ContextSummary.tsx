"use client";

import { motion } from "motion/react";
import type { NeolenzAnalysis } from "@/packages/schemas/neolenz.schema";

type ContextSummaryProps = {
  analysis: NeolenzAnalysis;
};

/**
 * Only what the analysis actually reports about context. The connector
 * draws from the extracted cards down to the summary to show that the
 * summary is derived from them.
 */
export const ContextSummary = ({ analysis }: ContextSummaryProps) => {
  const { documentType, mainSubject, summary } = analysis;
  if (!documentType && !mainSubject && !summary) return null;

  return (
    <motion.section
      aria-label="Context"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-start"
    >
      <svg
        width="12"
        height="28"
        viewBox="0 0 12 28"
        className="ml-6 text-neolenz-violet"
        aria-hidden="true"
      >
        <motion.path
          d="M6 0 V28"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.circle
          cx="6"
          cy="26"
          r="2.5"
          fill="currentColor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.2 }}
        />
      </svg>

      <div className="neolenz-glass w-full min-w-0 rounded-xl border-neolenz-violet/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {documentType && (
            <span className="rounded-full border border-neolenz-violet/50 bg-neolenz-violet/15 px-2.5 py-0.5 text-xs font-medium text-foreground">
              {documentType}
            </span>
          )}
          {mainSubject && (
            <h3 className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
              {mainSubject}
            </h3>
          )}
        </div>
        {summary && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {summary}
          </p>
        )}
      </div>
    </motion.section>
  );
};
