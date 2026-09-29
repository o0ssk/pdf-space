export type TextDirection = "ltr" | "rtl";

const LETTER_PATTERN = /\p{Letter}/u;
const LATIN_SCRIPT_PATTERN = /\p{Script=Latin}/u;
const RTL_SCRIPT_BLOCK_PATTERN = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/u;

/**
 * Resolves text direction from the first strong Arabic, Hebrew, or Latin letter.
 * Numbers, punctuation, symbols, whitespace, and combining marks are ignored.
 */
export function detectTextDirection(value: string): TextDirection {
  for (const character of value) {
    if (!LETTER_PATTERN.test(character)) continue;
    if (RTL_SCRIPT_BLOCK_PATTERN.test(character)) return "rtl";
    if (LATIN_SCRIPT_PATTERN.test(character)) return "ltr";
  }

  return "ltr";
}
