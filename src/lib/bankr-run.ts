import { DEFAULT_BG, DEFAULT_FG, limitGraphemes } from "@/lib/emojis";
import { sanitizeText } from "@/lib/font";
import { formatArt, maxChars, stampText, type Mode } from "@/lib/matrix";
import { parseTrigger } from "@/lib/trigger";
import {
  composePost,
  PHRASE_MAX,
  tweetLength,
} from "@/lib/tweet-length";

export type BankrRunOk = {
  ok: true;
  text: string;
  artBoard: string;
  prompt: string;
  stamp: string;
  phrase: string;
  mode: Mode;
  bg: string;
  fg: string;
  weight: number;
  rows: number;
  cols: 19;
  trigger: boolean;
};

export type BankrRunFail = {
  ok: false;
  error: string;
  text: string;
};

export type RunCapOpts = {
  fg?: string;
  bg?: string;
  word?: string;
  /** Webhook replies are the 7-line board only — no phrase prefix. */
  artOnly?: boolean;
};

/** Same stamp → format path the UI uses. */
export function runCap(
  prompt: string,
  opts: RunCapOpts = {},
): BankrRunOk | BankrRunFail {
  const raw = prompt.trim();
  const parsed = parseTrigger(raw);
  const fg = (opts.fg?.trim() || parsed?.fg || DEFAULT_FG).trim();
  const bg = (opts.bg?.trim() || parsed?.bg || DEFAULT_BG).trim();
  const wordSource = opts.word?.trim() || parsed?.word || raw;

  if (!raw && !wordSource) {
    return {
      ok: false,
      error: "missing_prompt",
      text: "Need a prompt to stamp.",
    };
  }

  const mode: Mode = "standard";
  const stamp = sanitizeText(wordSource, maxChars(mode));
  if (!stamp) {
    return {
      ok: false,
      error: "invalid_prompt",
      text: "Couldn’t stamp that. Use A–Z, 0–9, space, ! ? $.",
    };
  }

  const phrase = limitGraphemes(raw || stamp, PHRASE_MAX);
  const cells = stampText(stamp, mode);
  const artBoard = formatArt(cells, mode, bg, fg);
  const trigger = Boolean(parsed || (opts.fg && opts.bg && opts.word));
  const artOnly = opts.artOnly ?? trigger;
  const text = artOnly ? artBoard : composePost(phrase, artBoard);

  return {
    ok: true,
    text,
    artBoard,
    prompt: raw || stamp,
    stamp,
    phrase,
    mode,
    bg,
    fg,
    weight: tweetLength(text),
    rows: 7,
    cols: 19,
    trigger,
  };
}

export function normalizeHandle(handle: unknown): string | undefined {
  if (typeof handle !== "string") return undefined;
  const trimmed = handle.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}
