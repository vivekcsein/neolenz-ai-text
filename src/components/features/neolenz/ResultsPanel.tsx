"use client";

import { motion } from "motion/react";
import { toast } from "sonner";
import { Button, Icon, type IconName } from "@/components/ui";
import neolenzConfig from "@/packages/configs/neolenz.config";
import { useCopyToClipboard } from "@/packages/hooks/useCopyToClipboard";
import type { NeolenzResponse } from "@/packages/schemas/neolenz.schema";
import {
  baseName,
  downloadJson,
  hasContext,
  hasExtractableContent,
  toStructuredData,
  withKeys,
} from "./neolenz.utils";

type ResultsPanelProps = {
  response: NeolenzResponse;
  fileName: string;
  /** Back to the review step with the same selection. */
  onAdjust: () => void;
  onReset: () => void;
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-neolenz-result-muted">
      {title}
    </h3>
    {children}
  </section>
);

type ActionProps = {
  icon: IconName;
  onClick: () => void;
  children: React.ReactNode;
};

const ActionButton = ({ icon, onClick, children }: ActionProps) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-neolenz-result-border bg-neolenz-result px-3 text-sm font-medium text-neolenz-result-foreground transition-colors hover:bg-neolenz-result-border/50 focus-visible:outline-2 focus-visible:outline-neolenz-blue"
  >
    <Icon name={icon} size={15} />
    {children}
  </button>
);

export const ResultsPanel = ({
  response,
  fileName,
  onAdjust,
  onReset,
}: ResultsPanelProps) => {
  const { analysis, meta } = response;
  const { copy } = useCopyToClipboard();
  const empty = !hasExtractableContent(analysis) && !hasContext(analysis);

  const copyText = async (text: string, label: string) => {
    const ok = await copy(text);
    if (ok) toast.success(`${label} copied`);
    else
      toast.error(
        `Couldn't copy ${label.toLowerCase()}. Try selecting it manually.`,
      );
  };

  const handleDownload = () => {
    const ok = downloadJson(`${baseName(fileName)}-neolenz.json`, {
      source: fileName,
      model: meta.model,
      analysis,
    });
    if (ok) toast.success("JSON downloaded");
    else toast.error("Couldn't start the download.");
  };

  return (
    <motion.section
      aria-label="Results"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="min-w-0 space-y-6 rounded-2xl border border-neolenz-result-border bg-neolenz-result p-5 text-neolenz-result-foreground shadow-xl sm:p-7"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">Results</h2>
          {analysis.title && (
            <p className="mt-0.5 text-sm text-neolenz-result-muted [overflow-wrap:anywhere]">
              {analysis.title}
            </p>
          )}
        </div>
        <Button size="sm" onClick={onReset}>
          <Icon name="refresh" size={15} className="mr-2" />
          Analyze another
        </Button>
      </header>

      {empty ? (
        <p className="rounded-lg border border-neolenz-result-border p-4 text-sm text-neolenz-result-muted">
          {neolenzConfig.copy.emptyResult}
        </p>
      ) : (
        <>
          {hasContext(analysis) && (
            <Section title="Summary">
              <div className="space-y-1 text-sm [overflow-wrap:anywhere]">
                {(analysis.documentType || analysis.mainSubject) && (
                  <p className="font-medium">
                    {[analysis.documentType, analysis.mainSubject]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {analysis.summary && (
                  <p className="text-neolenz-result-muted">
                    {analysis.summary}
                  </p>
                )}
              </div>
            </Section>
          )}

          {analysis.fields.length > 0 && (
            <Section title="Key information">
              <dl className="divide-y divide-neolenz-result-border rounded-lg border border-neolenz-result-border text-sm">
                {analysis.fields.map((field) => (
                  <div
                    key={`${field.label}:${field.value}`}
                    className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-4"
                  >
                    <dt className="text-neolenz-result-muted [overflow-wrap:anywhere]">
                      {field.label}
                    </dt>
                    <dd className="font-medium [overflow-wrap:anywhere]">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {analysis.tables.map((table, tableIndex) => (
            <Section
              key={`table-${table.title ?? tableIndex}`}
              title={table.title ?? `Table ${tableIndex + 1}`}
            >
              <div className="overflow-x-auto rounded-lg border border-neolenz-result-border">
                <table className="w-full min-w-max border-collapse text-left text-sm">
                  {table.headers.length > 0 && (
                    <thead className="bg-neolenz-result-border/40">
                      <tr>
                        {withKeys(table.headers).map(({ key, item }) => (
                          <th key={key} className="px-3 py-2 font-semibold">
                            {item}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {withKeys(table.rows).map(({ key, item: row }) => (
                      <tr
                        key={key}
                        className="border-t border-neolenz-result-border"
                      >
                        {withKeys(row).map(({ key: cellKey, item: cell }) => (
                          <td key={cellKey} className="px-3 py-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          ))}

          {analysis.objects.length > 0 && (
            <Section title="Detected objects">
              <ul className="space-y-1.5 text-sm">
                {analysis.objects.map((object) => (
                  <li key={object.name} className="[overflow-wrap:anywhere]">
                    <span className="font-medium">{object.name}</span>
                    {object.description && (
                      <span className="text-neolenz-result-muted">
                        {" "}
                        · {object.description}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {analysis.text && (
            <Section title="Extracted text">
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-neolenz-result-border bg-neolenz-result-border/20 p-3 font-sans text-sm leading-relaxed [overflow-wrap:anywhere]">
                {analysis.text}
              </pre>
            </Section>
          )}
        </>
      )}

      <footer className="flex flex-wrap gap-2 border-t border-neolenz-result-border pt-4">
        {analysis.text && (
          <ActionButton
            icon="copy"
            onClick={() => copyText(analysis.text, "Text")}
          >
            Copy text
          </ActionButton>
        )}
        <ActionButton
          icon="code"
          onClick={() =>
            copyText(
              JSON.stringify(toStructuredData(analysis), null, 2),
              "Structured data",
            )
          }
        >
          Copy data
        </ActionButton>
        <ActionButton icon="download" onClick={handleDownload}>
          Download JSON
        </ActionButton>
        <ActionButton icon="crop" onClick={onAdjust}>
          {neolenzConfig.copy.adjustSelection}
        </ActionButton>
      </footer>
    </motion.section>
  );
};
