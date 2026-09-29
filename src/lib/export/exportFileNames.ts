export const MAX_EXPORT_FILE_NAME_LENGTH = 180;

const ILLEGAL_FILE_NAME_CHARACTERS = '<>:"/\\|?*';
const TRAILING_PERIODS_OR_SPACES = /[.\s]+$/g;
const LEADING_PERIODS_OR_SPACES = /^[.\s]+/g;
const REPEATED_SEPARATORS = /([_-])\1+/g;
const REPEATED_PDF_EXTENSION = /(?:\.pdf)+$/i;
const REPEATED_ZIP_EXTENSION = /(?:\.zip)+$/i;
const RESERVED_WINDOWS_BASE_NAMES =
  /^(con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])$/i;

export type ExportFileNameValidation =
  | { valid: true; fileName: string }
  | { valid: false; error: string };

function truncateUnicode(value: string, maxLength: number): string {
  return Array.from(value).slice(0, maxLength).join("");
}

function sanitizeBaseName(value: string, fallback: string): string {
  const withoutIllegalCharacters = Array.from(value, (character) =>
    character.charCodeAt(0) <= 0x1f || ILLEGAL_FILE_NAME_CHARACTERS.includes(character)
      ? "-"
      : character
  ).join("");
  let base = withoutIllegalCharacters
    .replace(/\.\.+/g, ".")
    .replace(REPEATED_SEPARATORS, "$1")
    .replace(/\s+/g, " ")
    .replace(LEADING_PERIODS_OR_SPACES, "")
    .replace(TRAILING_PERIODS_OR_SPACES, "")
    .trim();
  if (!base) base = fallback;
  if (RESERVED_WINDOWS_BASE_NAMES.test(base)) {
    base = `${base} Document`;
  }
  return base;
}

function createFileName(
  value: string,
  extension: "pdf" | "zip",
  fallbackBase: string
): string {
  const extensionPattern =
    extension === "pdf" ? REPEATED_PDF_EXTENSION : REPEATED_ZIP_EXTENSION;
  const rawBase = value.trim().replace(extensionPattern, "");
  const maxBaseLength = MAX_EXPORT_FILE_NAME_LENGTH - extension.length - 1;
  const base = truncateUnicode(
    sanitizeBaseName(rawBase, fallbackBase),
    maxBaseLength
  ).replace(TRAILING_PERIODS_OR_SPACES, "");
  return `${base || fallbackBase}.${extension}`;
}

export function createSuggestedPdfFileName(documentName: string): string {
  return createFileName(documentName, "pdf", "Untitled Document");
}

export function normalizePdfOutputFileName(value: string): string {
  return createFileName(value, "pdf", "Untitled Document");
}

export function validatePdfOutputFileName(
  value: string
): ExportFileNameValidation {
  if (!value.trim()) {
    return { valid: false, error: "File name cannot be empty." };
  }
  if (Array.from(value.trim()).length > MAX_EXPORT_FILE_NAME_LENGTH) {
    return {
      valid: false,
      error: `File name must be ${MAX_EXPORT_FILE_NAME_LENGTH} characters or fewer.`,
    };
  }
  return { valid: true, fileName: normalizePdfOutputFileName(value) };
}

export function createSuggestedZipFileName(projectName: string): string {
  const trimmed = projectName.trim().replace(REPEATED_ZIP_EXTENSION, "");
  if (!trimmed) return "PDF Space Export.zip";
  return createFileName(`${trimmed} — PDFs`, "zip", "PDF Space Export");
}
