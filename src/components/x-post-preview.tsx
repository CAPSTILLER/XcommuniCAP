import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { graphemes } from "@/lib/emojis";
import { COLS } from "@/lib/matrix";
import {
  composePost,
  truncateTweet,
  X_CHAR_LIMIT,
} from "@/lib/tweet-length";
import { cn } from "@/lib/utils";

type XPostPreviewProps = {
  open: boolean;
  onClose: () => void;
  phrase: string;
  art: string;
  alt?: boolean;
  cols?: number;
  label?: string;
};

export function XPostPreview({
  open,
  onClose,
  phrase,
  art,
  alt = false,
  cols = COLS,
  label,
}: XPostPreviewProps) {
  const composed = composePost(phrase, art);
  const { kept, cut, length } = truncateTweet(composed);
  const over = length > X_CHAR_LIMIT;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (open) setExpanded(false);
  }, [open, composed]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const body = over && !expanded ? kept : composed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="x-preview-title"
        className="flex max-h-[min(92dvh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-glow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
          <div>
            <h2 id="x-preview-title" className="text-sm font-medium tracking-wide">
              Test on X
            </h2>
            <p className="mt-0.5 text-xs text-subtle">
              {label ?? (alt ? "19×52 banner" : "19×7 board")} · timeline card ·
              280 cutoff
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <article className="mx-auto w-full rounded-2xl bg-black px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255_/_0.12)]">
            <div className="flex gap-3">
              <span
                aria-hidden
                className="size-10 shrink-0 rounded-full bg-accent/80"
              />
              <div className="x-tweet-col min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-1 text-[15px] leading-5">
                  <span className="truncate font-bold text-white">You</span>
                  <span className="truncate text-[#71767b]">@you</span>
                  <span className="text-[#71767b]">·</span>
                  <span className="shrink-0 text-[#71767b]">now</span>
                </p>
                <TweetBody body={body} hasPhrase={phrase.length > 0} cols={cols} />
                {over && !expanded ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="mt-0.5 text-left text-[15px] leading-5 text-[#1d9bf0] hover:underline"
                  >
                    Show more
                  </button>
                ) : null}
                {over && expanded ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="mt-0.5 text-left text-[15px] leading-5 text-[#1d9bf0] hover:underline"
                  >
                    Show less
                  </button>
                ) : null}
                <div className="mt-3 flex justify-between pr-6 text-[#71767b]">
                  <span className="text-[13px]">Reply</span>
                  <span className="text-[13px]">Repost</span>
                  <span className="text-[13px]">Like</span>
                  <span className="text-[13px]">View</span>
                </div>
              </div>
            </div>
          </article>

          <div className="mx-auto mt-4 w-full">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-mono tabular-nums text-muted">
                {length}/{X_CHAR_LIMIT}
              </span>
              <span
                className={cn(
                  "text-right font-medium",
                  over ? "text-accent" : "text-muted",
                )}
              >
                {over
                  ? alt
                    ? "Exceeds 280 · X shows the top of the banner"
                    : "Exceeds 280 · X hides the rest behind Show more"
                  : "Fits a single X post"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn(
                  "h-full rounded-full transition-[width,background-color] duration-200",
                  over ? "bg-accent" : "bg-emerald-500",
                )}
                style={{
                  width: `${Math.min(100, (length / X_CHAR_LIMIT) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-subtle">
              Same layout as X: phrase, one enter, then the board with no wrap.
              Over 280, the last visible line stops where X cuts — even mid-row
              — then Show more.
            </p>
            {over && cut ? (
              <p className="mt-2 text-xs leading-relaxed text-accent">
                Hidden: {hiddenSummary(cut, cols)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function TweetBody({
  body,
  hasPhrase,
  cols,
}: {
  body: string;
  hasPhrase: boolean;
  cols: number;
}) {
  const lines = body.split("\n");
  const phraseLine = hasPhrase ? (lines[0] ?? "") : "";
  const artLines = hasPhrase ? lines.slice(1) : lines;
  return (
    <>
      {hasPhrase ? <p className="x-tweet-phrase">{phraseLine}</p> : null}
      {artLines.length > 0 ? (
        <div className="x-tweet-art">
          {artLines.map((line, r) => (
            <div
              key={r}
              className="x-tweet-row"
              style={{ ["--tweet-cols" as string]: cols }}
            >
              {graphemes(line).map((emoji, c) => (
                <span key={c}>{emoji}</span>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function hiddenSummary(cut: string, cols: number): string {
  const lines = cut.split("\n");
  const nonempty = lines.filter((l) => l.length > 0);
  if (nonempty.length === 0) return "the rest of the board";
  const firstPartial = graphemes(nonempty[0]!).length;
  if (firstPartial === cols || lines[0] === "") {
    const rows = nonempty.length;
    return `${rows} row${rows === 1 ? "" : "s"}`;
  }
  const rest = nonempty.length - 1;
  const bits = [`${firstPartial} cells on the cut row`];
  if (rest > 0) bits.push(`${rest} more row${rest === 1 ? "" : "s"}`);
  return bits.join(" · ");
}
