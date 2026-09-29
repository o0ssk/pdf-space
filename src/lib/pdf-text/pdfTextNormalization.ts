const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/u;
const INVISIBLE_BIDI_CHARACTERS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;
const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

function normalizeCharacter(character: string): string {
  if (character === "ـ" || ARABIC_DIACRITICS.test(character)) return "";
  if ("أإآٱ".includes(character)) return "ا";
  if (character === "ى") return "ي";
  return ARABIC_DIGITS[character] ?? character.toLocaleLowerCase();
}

export function removeInvisibleBidiCharacters(value: string): string {
  return value.replace(INVISIBLE_BIDI_CHARACTERS, "");
}

export function normalizePdfTextForSearch(value: string): string {
  let output = "";
  let pendingSpace = false;
  for (const character of removeInvisibleBidiCharacters(value).normalize("NFKC")) {
    if (/\s/u.test(character)) {
      pendingSpace = output.length > 0;
      continue;
    }
    const normalized = normalizeCharacter(character);
    if (!normalized) continue;
    if (pendingSpace) output += " ";
    pendingSpace = false;
    output += normalized;
  }
  return output.trim();
}

// Kept as the public compatibility name used by the Phase 8.2 modules.
export const normalizePdfSearchText = normalizePdfTextForSearch;

export function normalizePdfSearchTextWithMap(value: string): {
  normalized: string;
  rawIndexes: number[];
} {
  const normalizedCharacters: string[] = [];
  const rawIndexes: number[] = [];
  let pendingSpaceIndex: number | null = null;
  let rawIndex = 0;

  for (const character of removeInvisibleBidiCharacters(value)) {
    const normalizedUnit = character.normalize("NFKC");
    for (const unit of normalizedUnit) {
      if (/\s/u.test(unit)) {
        if (normalizedCharacters.length > 0) pendingSpaceIndex = rawIndex;
        continue;
      }
      const normalized = normalizeCharacter(unit);
      if (!normalized) continue;
      if (pendingSpaceIndex !== null) {
        normalizedCharacters.push(" ");
        rawIndexes.push(pendingSpaceIndex);
        pendingSpaceIndex = null;
      }
      for (const outputCharacter of normalized) {
        normalizedCharacters.push(outputCharacter);
        rawIndexes.push(rawIndex);
      }
    }
    rawIndex += character.length;
  }

  while (normalizedCharacters.at(-1) === " ") {
    normalizedCharacters.pop();
    rawIndexes.pop();
  }
  return { normalized: normalizedCharacters.join(""), rawIndexes };
}
