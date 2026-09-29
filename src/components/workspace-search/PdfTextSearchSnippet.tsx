import { detectTextDirection } from "../../lib/pdf-text/textDirection";

type PdfTextSearchSnippetProps = {
  before: string;
  match: string;
  after: string;
};

export function PdfTextSearchSnippet({
  before,
  match,
  after,
}: PdfTextSearchSnippetProps) {
  const completeSnippet = `${before}${match}${after}`;
  const direction = detectTextDirection(completeSnippet);

  return (
    <p
      dir={direction}
      data-testid="pdf-search-snippet"
      className={`pdf-text-search-snippet mt-1 block w-full whitespace-normal break-words text-[13px] leading-relaxed text-secondary-text ${
        direction === "rtl" ? "text-right" : "text-left"
      }`}
      style={{ unicodeBidi: "plaintext" }}
    >
      <span className="inline">{before}</span>
      <mark
        dir="inherit"
        className="pdf-text-search-match inline rounded-sm bg-cyan-300/15 text-cyan-100"
      >
        {match}
      </mark>
      <span className="inline">{after}</span>
    </p>
  );
}
