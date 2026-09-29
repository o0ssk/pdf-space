import React from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileArchive,
  FileText,
  X,
} from "lucide-react";
import { usePdfExportJob } from "../../hooks/usePdfExportJob";

type ExportResultPanelProps = {
  phase: ReturnType<typeof usePdfExportJob>["phase"];
  result: ReturnType<typeof usePdfExportJob>["result"];
};

export const ExportResultPanel: React.FC<ExportResultPanelProps> = ({
  phase,
  result,
}) => {
  if (phase === "cancelled") {
    return (
      <ResultSummary
        icon={<X className="h-5 w-5" aria-hidden="true" />}
        tone="neutral"
        title="Export cancelled"
        description="No download was created. You can adjust the selection and try again."
      />
    );
  }

  if (!result) {
    return (
      <ResultSummary
        icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        tone="error"
        title="Export could not be completed"
        description="The export stopped before a downloadable file could be created."
      />
    );
  }

  const successCount = result.successful.length;
  const failureCount = result.failed.length;
  const hasSuccess = successCount > 0;
  const hasFailures = failureCount > 0;
  const fullySuccessful = hasSuccess && !hasFailures;
  const title = fullySuccessful
    ? "Export complete"
    : hasSuccess
      ? "Export completed with some failures"
      : "Export could not be completed";
  const description = result.download
    ? fullySuccessful
      ? successCount === 1
        ? `${result.download.fileName} was sent to your browser downloads.`
        : `${successCount} PDFs were packaged successfully in ${result.download.fileName}.`
      : `${successCount} ${
          successCount === 1 ? "PDF was" : "PDFs were"
        } exported. ${failureCount} ${
          failureCount === 1 ? "PDF could" : "PDFs could"
        } not be exported.`
    : "No downloadable file was created.";

  return (
    <section aria-live="polite" className="min-h-[290px]">
      <ResultSummary
        icon={
          fullySuccessful ? (
            result.download?.kind === "zip" ? (
              <FileArchive className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Check className="h-5 w-5" strokeWidth={2.8} aria-hidden="true" />
            )
          ) : (
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          )
        }
        tone={fullySuccessful ? "success" : hasSuccess ? "warning" : "error"}
        title={title}
        description={description}
      />

      {(result.successful.length > 0 || result.failed.length > 0) && (
        <div className="mt-4 space-y-2">
          {result.successful.map((item) => (
            <div
              key={item.documentId}
              className="flex items-center gap-3 rounded-xl border border-success-green/15 bg-success-green/[0.045] px-3.5 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-green/10 text-success-green">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[12.5px] font-semibold text-secondary-text"
                  dir="auto"
                >
                  {item.fileName}
                </p>
                <p className="mt-0.5 text-[10.5px] text-muted-text">
                  {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
                </p>
              </div>
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-success-green"
                aria-label="Exported successfully"
              />
            </div>
          ))}

          {result.failed.map((item) => (
            <div
              key={item.documentId}
              className="rounded-xl border border-pdf-red/20 bg-pdf-red/[0.045] px-3.5 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pdf-red/10 text-pdf-red">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p
                    className="truncate text-[12.5px] font-semibold text-primary-text"
                    dir="auto"
                  >
                    {item.fileName}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-pdf-red">
                    {item.uiError.title}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-4 text-muted-text">
                    {item.uiError.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

function ResultSummary({
  icon,
  tone,
  title,
  description,
}: {
  icon: React.ReactNode;
  tone: "success" | "warning" | "error" | "neutral";
  title: string;
  description: string;
}) {
  const tones = {
    success:
      "border-success-green/20 bg-success-green/[0.055] text-success-green",
    warning: "border-amber-400/20 bg-amber-400/[0.055] text-amber-300",
    error: "border-pdf-red/20 bg-pdf-red/[0.055] text-pdf-red",
    neutral: "border-border-main bg-panel-elevated/45 text-secondary-text",
  };

  return (
    <div className="rounded-2xl border border-border-main bg-panel-elevated/30 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:p-6">
      <span
        className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}
      >
        {icon}
      </span>
      <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-primary-text">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-[12px] leading-5 text-muted-text">
        {description}
      </p>
    </div>
  );
}
