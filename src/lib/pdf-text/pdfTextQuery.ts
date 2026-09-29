import { normalizePdfSearchText } from "./pdfTextNormalization";
import { ParsedPdfTextQuery } from "./pdfTextTypes";

export function parsePdfTextQuery(value: string): ParsedPdfTextQuery {
  const trimmed = value.trim();
  const quoted = trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');
  const queryValue = quoted ? trimmed.slice(1, -1) : trimmed;
  const normalized = normalizePdfSearchText(queryValue);
  return {
    original: value,
    normalized,
    terms: normalized ? normalized.split(" ").filter(Boolean) : [],
    isPhrase: quoted,
  };
}

export function isPdfTextQuerySearchable(
  query: ParsedPdfTextQuery,
  explicitlySubmitted = false
): boolean {
  const compact = query.normalized.replace(/\s/gu, "");
  if (!compact) return false;
  if (/^\d+$/u.test(compact)) return compact.length >= 2;
  return compact.length >= 2 || explicitlySubmitted;
}
