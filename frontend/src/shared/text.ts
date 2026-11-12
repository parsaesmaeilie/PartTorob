/**
 * Persian text utilities — the foundation of the normalization layer.
 * Crawled listings mix Arabic/Persian letters, Persian/Arabic/Latin digits,
 * zero-width joiners and random spacing. Everything that compares text goes
 * through `normalizeText` first.
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const p = PERSIAN_DIGITS.indexOf(d);
    return String(p >= 0 ? p : ARABIC_DIGITS.indexOf(d));
  });
}

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Canonical form used for matching: Persian letters, Latin digits, lower-case, single spaces. */
export function normalizeText(input: string): string {
  return toLatinDigits(input)
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/[‌‍‎‏]/g, " ") // ZWNJ & friends
    .replace(/[ً-ْ]/g, "") // harakat
    .replace(/[،,؛;:|/\\()\[\]{}«»"'!؟?*+_\-–—]/g, " ")
    .toLowerCase()
    // split glued Persian/digit runs: "206تیپ5" -> "206 تیپ 5", "4لیتری" -> "4 لیتری"
    .replace(/(\d)([؀-ۿ])/g, "$1 $2")
    .replace(/([؀-ۿ])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  return normalizeText(input).split(" ").filter(Boolean);
}

export function formatToman(value: number): string {
  return `${toPersianDigits(Math.round(value).toLocaleString("en-US"))} تومان`;
}

export function formatNumber(value: number): string {
  return toPersianDigits(Math.round(value).toLocaleString("en-US"));
}

/** Deterministic PRNG so seeded data is stable across restarts. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
