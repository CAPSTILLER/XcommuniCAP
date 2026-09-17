export type CapTrigger = {
  fg: string;
  bg: string;
  word: string;
};

const URL_RE = /https?:\/\/\S+/gi;
const MENTION_RE = /@[A-Za-z0-9_]+/g;
const WORD_CHAR = /^[A-Za-z0-9]$/;

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function graphemes(value: string): string[] {
  if (!value) return [];
  if (segmenter) {
    return Array.from(segmenter.segment(value), (s) => s.segment);
  }
  return Array.from(value);
}

/** Pull `[fg][bg][3-letter word]` out of a mention or raw input (`🟥⬛cap`). */
export function parseTrigger(raw: string): CapTrigger | null {
  if (!raw.trim()) return null;
  const cleaned = raw.replace(URL_RE, " ").replace(MENTION_RE, " ");
  const gs = graphemes(cleaned).filter((g) => g !== " " && g !== "\n" && g !== "\t");
  if (gs.length < 5) return null;

  const letters: string[] = [];
  let i = gs.length - 1;
  while (i >= 0 && letters.length < 3) {
    const g = gs[i]!;
    if (WORD_CHAR.test(g)) {
      letters.unshift(g.toUpperCase());
      i -= 1;
      continue;
    }
    break;
  }
  if (letters.length !== 3) return null;

  const rest = gs.slice(0, i + 1).filter((g) => g.trim());
  if (rest.length < 2) return null;
  const bg = rest[rest.length - 1]!;
  const fg = rest[rest.length - 2]!;
  if (WORD_CHAR.test(fg) || WORD_CHAR.test(bg)) return null;

  return { fg, bg, word: letters.join("") };
}
