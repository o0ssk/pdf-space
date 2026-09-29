import { PdfTextIndexCache } from "./pdfTextIndexCache";
import { buildPdfSearchRepresentations } from "./pdfTextExtraction";
import { createPdfTextSearchSnippet, countPdfTextMatches } from "./pdfTextSnippets";
import {
  ExtractedPdfPageText,
  ParsedPdfTextQuery,
  PdfTextMatchedRepresentation,
  PdfTextSearchResult,
  WorkspaceTextSearchOccurrence,
} from "./pdfTextTypes";

type PdfTextMatch = {
  representation: PdfTextMatchedRepresentation;
  text: string;
  needle: string;
  exactPhrase: boolean;
};

function compact(value: string): string {
  return value.replace(/\s/gu, "");
}

export function findPdfTextMatch(
  extracted: ExtractedPdfPageText,
  query: ParsedPdfTextQuery
): PdfTextMatch | null {
  const representations =
    extracted.searchRepresentations ??
    buildPdfSearchRepresentations(
      extracted.logicalText,
      extracted.textItems.map((item) => item.text)
    );
  const compactQuery = compact(query.normalized);
  const candidates: Array<{
    representation: PdfTextMatchedRepresentation;
    text: string;
    compactQuery: boolean;
  }> = [
    { representation: "normal", text: representations.normal, compactQuery: false },
    { representation: "dehyphenated", text: representations.dehyphenated, compactQuery: false },
    { representation: "whitespaceRemoved", text: representations.whitespaceRemoved, compactQuery: true },
    { representation: "adjacentItems", text: compact(representations.adjacentItems), compactQuery: true },
  ];

  for (const candidate of candidates) {
    const needle = candidate.compactQuery ? compactQuery : query.normalized;
    const terms = candidate.compactQuery ? query.terms.map(compact) : query.terms;
    const exactPhrase = Boolean(needle) && candidate.text.includes(needle);
    const allTermsMatch = terms.every((term) => candidate.text.includes(term));
    if (query.isPhrase ? exactPhrase : allTermsMatch) {
      return { ...candidate, needle, exactPhrase };
    }
  }
  return null;
}

export function searchExtractedPdfText({
  query,
  cache,
  occurrences,
  limit = 100,
}: {
  query: ParsedPdfTextQuery;
  cache: PdfTextIndexCache;
  occurrences: readonly WorkspaceTextSearchOccurrence[];
  limit?: number;
}): { results: PdfTextSearchResult[]; totalMatches: number } {
  const matches: PdfTextSearchResult[] = [];
  for (const occurrence of occurrences) {
    const extracted = cache.get(occurrence.sourcePageKey);
    if (!extracted || extracted.status !== "ready") continue;
    const match = findPdfTextMatch(extracted, query);
    if (!match) continue;
    const matchQuery = {
      ...query,
      normalized: match.needle,
      terms: match.needle ? [match.needle] : [],
    };
    const matchCount = Math.max(1, countPdfTextMatches(match.text, matchQuery));
    matches.push({
      ...occurrence,
      snippet: createPdfTextSearchSnippet({ logicalText: extracted.logicalText, query }),
      matchCount,
      score: match.exactPhrase ? 200 + matchCount : 100 + matchCount,
      matchedRepresentation: match.representation,
    });
  }
  matches.sort(
    (left, right) =>
      left.documentIndex - right.documentIndex || left.pageIndex - right.pageIndex
  );
  return { results: matches.slice(0, limit), totalMatches: matches.length };
}
