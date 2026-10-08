// Control characters other than whitespace (line breaks and tabs count as spaces, R1).
const CONTROL_CHARACTERS = /[\p{Cc}--\s]/gv;
const WHITESPACE_RUNS = /\s+/g;

/** R1/R27: drops control characters, collapses whitespace runs into one space and trims. */
export function normalizeText(text: string): string {
  return text.replace(CONTROL_CHARACTERS, '').replace(WHITESPACE_RUNS, ' ').trim();
}

/** Length in Unicode code points, so an emoji such as 😀 counts as 1. */
export function codePointLength(text: string): number {
  // Code points, not graphemes, on purpose: R1 defines the limit in code points.
  return Array.from(text).length;
}
