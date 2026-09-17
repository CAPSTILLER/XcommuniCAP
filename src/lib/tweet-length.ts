import { graphemes } from "@/lib/emojis";

export const X_CHAR_LIMIT = 280;
export const PHRASE_MAX = 5;

const WEIGHT_100: ReadonlyArray<readonly [number, number]> = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];

const FE0F = 0xfe0f;
const ZWJ = 0x200d;
const KEYCAP = 0x20e3;
const RI_START = 0x1f1e6;
const RI_END = 0x1f1ff;

function codePointWeight(cp: number): number {
  for (const [start, end] of WEIGHT_100) {
    if (cp >= start && cp <= end) return 1;
  }
  return 2;
}

function isRI(cp: number): boolean {
  return cp >= RI_START && cp <= RI_END;
}

function cpStr(cp: number): string {
  return String.fromCodePoint(cp);
}

function isEmoji(cp: number): boolean {
  return /\p{Emoji}/u.test(cpStr(cp));
}

function isEmojiPresentation(cp: number): boolean {
  return /\p{Emoji_Presentation}/u.test(cpStr(cp));
}

/**
 * X/twitter-text v3 with emoji parsing.
 * A fully-qualified emoji (including text-default + VS16 like ⚙️) is 2.
 * A redundant VS16 on an already-emoji char (❌️, ⬜️) is +2 extra, so 4.
 */
export function graphemeWeight(g: string): number {
  if (g === "\n" || g === "\r") return 1;
  const cps = [...g].map((c) => c.codePointAt(0)!);
  if (cps.length === 0) return 0;
  if (cps.includes(ZWJ) || cps.includes(KEYCAP)) return 2;
  if (cps.length >= 2 && isRI(cps[0]!) && isRI(cps[1]!)) return 2;
  if (cps.some((c) => c >= 0xe0020 && c <= 0xe007f)) return 2;

  let i = 0;
  let w = 0;
  while (i < cps.length) {
    const cp = cps[i]!;
    if (isEmoji(cp)) {
      const nextVS = cps[i + 1] === FE0F;
      if (!isEmojiPresentation(cp) && nextVS) {
        w += 2;
        i += 2;
        continue;
      }
      w += 2;
      i += 1;
      if (cps[i] === FE0F) {
        w += 2;
        i += 1;
      }
      continue;
    }
    if (cp === FE0F) {
      w += 2;
      i += 1;
      continue;
    }
    w += codePointWeight(cp);
    i += 1;
  }
  return w;
}

export function tweetLength(text: string): number {
  return graphemes(text).reduce((n, g) => n + graphemeWeight(g), 0);
}

export function composePost(phrase: string, art: string): string {
  const p = phrase.replace(/^\n+|\n+$/g, "");
  const a = art.replace(/^\n+|\n+$/g, "");
  if (!p) return a;
  return `${p}\n${a}`;
}

export function truncateTweet(
  text: string,
  limit = X_CHAR_LIMIT,
): { kept: string; cut: string; length: number } {
  const parts = graphemes(text);
  let weight = 0;
  let split = parts.length;
  for (let i = 0; i < parts.length; i++) {
    const w = graphemeWeight(parts[i]!);
    if (weight + w > limit) {
      split = i;
      break;
    }
    weight += w;
  }
  return {
    kept: parts.slice(0, split).join(""),
    cut: parts.slice(split).join(""),
    length: tweetLength(text),
  };
}

export function emojiCellWeight(emoji: string): number {
  return graphemeWeight(emoji);
}
