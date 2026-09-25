import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Copy,
  Eraser,
  Eye,
  Minus,
  Pencil,
  Plus,
  Repeat2,
  Shuffle,
  Type,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { EmojiPicker } from "@/components/emoji-picker";
import { MatrixGrid } from "@/components/matrix-grid";
import { Button } from "@/components/ui/button";
import { XPostPreview } from "@/components/x-post-preview";
import {
  DEFAULT_BG,
  DEFAULT_FG,
  graphemes,
  limitGraphemes,
  randomEmojiPair,
} from "@/lib/emojis";
import { FONT_5X5, sanitizeText } from "@/lib/font";
import {
  APPS,
  appFor,
  appIdFor,
  type AppId,
  boardFor,
  cellCount,
  clampTestRows,
  colsFor,
  copyToClipboard,
  formatArt,
  maxChars,
  type Mode,
  parseMode,
  ROWS_TEST_DEFAULT,
  ROWS_TEST_MAX,
  ROWS_TEST_MIN,
  rowsFor,
  stampText,
  tweetIntentUrl,
} from "@/lib/matrix";
import {
  composePost,
  PHRASE_MAX,
  tweetLength,
  X_CHAR_LIMIT,
} from "@/lib/tweet-length";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "xcommunicap:v4";
/** Pre-test-board key; read once as a fallback so saved work carries over. */
const LEGACY_STORAGE_KEY = "xcommunicap:v3";

type SavedState = {
  mode: Mode;
  text: string;
  bg: string;
  fg: string;
  cells: boolean[];
  drawing: boolean;
  phrase: string;
  /** Height of the 9-wide test board (v4+). */
  testRows?: number;
};

/** Resize a 9-wide test board, keeping the top rows and padding/trimming the bottom. */
function resizeRows(cells: boolean[], cols: number, rows: number): boolean[] {
  return Array.from({ length: cols * rows }, (_, i) => cells[i] ?? false);
}

const DEFAULT_TEXT = "CAP";

function initialCells(): boolean[] {
  return stampText(DEFAULT_TEXT, "standard");
}

export function XcommuniCapApp() {
  const [mode, setMode] = useState<Mode>("standard");
  const [text, setText] = useState(DEFAULT_TEXT);
  const [bg, setBg] = useState(DEFAULT_BG);
  const [fg, setFg] = useState(DEFAULT_FG);
  const [cells, setCells] = useState<boolean[]>(initialCells);
  const [drawing, setDrawing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testRows, setTestRows] = useState(ROWS_TEST_DEFAULT);
  const skipSave = useRef(true);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ??
        localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedState;
        const nextMode: Mode = parseMode(saved.mode);
        const nextRows = clampTestRows(saved.testRows);
        const nextText = sanitizeText(
          saved.text ?? DEFAULT_TEXT,
          maxChars(nextMode, nextRows),
        );
        setTestRows(nextRows);
        setMode(nextMode);
        setText(nextText);
        if (saved.bg) setBg(saved.bg);
        if (saved.fg) setFg(saved.fg);
        setDrawing(Boolean(saved.drawing));
        if (typeof saved.phrase === "string") {
          setPhrase(limitGraphemes(saved.phrase, PHRASE_MAX));
        }
        if (
          Array.isArray(saved.cells) &&
          saved.cells.length ===
            cellCount(nextMode, nextText.length, nextRows) &&
          saved.cells.every((v) => typeof v === "boolean")
        ) {
          setCells(saved.cells);
        } else {
          setCells(stampText(nextText, nextMode, nextRows));
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const payload: SavedState = {
      mode,
      text,
      bg,
      fg,
      cells,
      drawing,
      phrase,
      testRows,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* quota / private mode */
    }
  }, [mode, text, bg, fg, cells, drawing, phrase, testRows]);

  const cols = colsFor(mode);
  const rows = rowsFor(mode, text.length, testRows);
  const cap = maxChars(mode, testRows);
  const art = useMemo(
    () => formatArt(cells, mode, bg, fg),
    [cells, mode, bg, fg],
  );
  const postBody = useMemo(() => composePost(phrase, art), [phrase, art]);
  const postWeight = tweetLength(postBody);

  const applyText = useCallback(
    (value: string, nextMode: Mode = mode) => {
      const clean = sanitizeText(value, maxChars(nextMode, testRows));
      setText(clean);
      setCells(stampText(clean, nextMode, testRows));
    },
    [mode, testRows],
  );

  function switchMode(next: Mode) {
    if (next === mode) return;
    const clean = sanitizeText(text, maxChars(next, testRows));
    setMode(next);
    setText(clean);
    setCells(stampText(clean, next, testRows));
  }

  /** −/+ on the 9-wide test board. Draw mode keeps the drawing; otherwise letters restamp centered. */
  function changeTestRows(delta: number) {
    if (mode !== "test9") return;
    const next = clampTestRows(testRows + delta);
    if (next === testRows) return;
    const clean = sanitizeText(text, maxChars(mode, next));
    setTestRows(next);
    setText(clean);
    if (drawing) {
      setCells((prev) => resizeRows(prev, cols, next));
    } else {
      setCells(stampText(clean, mode, next));
    }
  }

  function switchApp(id: AppId) {
    if (appIdFor(mode) === id) return;
    const app = APPS.find((a) => a.id === id);
    if (!app) return;
    switchMode(app.boards[0]!.mode);
  }

  const onPaint = useCallback((index: number, value: boolean) => {
    setCells((prev) => {
      if (prev[index] === value) return prev;
      const next = prev.slice();
      next[index] = value;
      return next;
    });
  }, []);

  function invert() {
    setCells((prev) => prev.map((v) => !v));
  }

  function clear() {
    setCells(
      Array.from(
        { length: cellCount(mode, text.length, testRows) },
        () => false,
      ),
    );
  }

  function swap() {
    const next = randomEmojiPair(bg, fg);
    setBg(next.bg);
    setFg(next.fg);
  }

  async function copyArt() {
    const ok = await copyToClipboard(postBody);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast.success(
        phrase.length > 0
          ? "Copied phrase + board"
          : "Copied board — add a 5-character phrase so X doesn’t wrap",
      );
    } else {
      toast.error("Could not copy. Long-press the grid and copy instead.");
    }
  }

  function postToX() {
    const url = tweetIntentUrl(postBody);
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    if (mode === "alt" || postWeight > X_CHAR_LIMIT) {
      toast(
        "This is larger than a single X post. Copied — paste into a thread or Farcaster.",
        { duration: 4000 },
      );
      void copyToClipboard(postBody);
    }
  }

  return (
    <div className="relative min-h-dvh bg-bg text-fg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_80%_80%_at_0%_0%,rgb(186_10_14_/_0.16),transparent_60%)]"
      />
      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          className:
            "!bg-surface !text-fg !border-white/10 !shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]",
        }}
      />

      <div className="relative mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8">
        <Header
          mode={mode}
          onMode={switchMode}
          onApp={switchApp}
          copied={copied}
          onCopy={copyArt}
          onPost={postToX}
          onTest={() => setPreviewOpen(true)}
        />

        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)] lg:gap-6">
          <CanvasCard
            mode={mode}
            rows={rows}
            cols={cols}
            cells={cells}
            bg={bg}
            fg={fg}
            drawing={drawing}
            onPaint={onPaint}
            postWeight={postWeight}
            onRows={changeTestRows}
          />

          <aside className="flex flex-col gap-4">
            <section className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium tracking-wide">Text</h2>
                <span className="font-mono text-xs tabular-nums text-subtle">
                  {text.length}/{cap}
                </span>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="primary"
                  className="font-display text-lg tracking-[0.18em] sm:w-28"
                  onClick={() => applyText("CAP")}
                >
                  CAP
                </Button>
                <div className="flex min-w-0 flex-1 gap-2">
                  <input
                    value={text}
                    maxLength={cap}
                    spellCheck={false}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    placeholder={
                      mode === "alt"
                        ? "UP TO 8"
                        : mode === "stack"
                          ? "UP TO 10"
                          : mode === "test9"
                            ? `UP TO ${cap}`
                            : "ABC"
                    }
                    aria-label="Matrix text"
                    onChange={(e) => applyText(e.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-md bg-bg px-3 font-mono text-sm tracking-[0.28em] text-fg uppercase shadow-[var(--shadow-border)] outline-none placeholder:tracking-normal placeholder:text-subtle focus-visible:shadow-[0_0_0_1px_var(--color-accent)]"
                  />
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    onClick={() => applyText(text)}
                    aria-label="Stamp text onto the matrix"
                  >
                    <Type className="size-4" />
                    Set
                  </Button>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-subtle">
                A–Z, 0–9, space, ! ? $. Set restamps letters after drawing.
              </p>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button
                  variant={drawing ? "primary" : "outline"}
                  onClick={() => setDrawing((v) => !v)}
                  aria-pressed={drawing}
                >
                  <Pencil className="size-4" />
                  Draw
                </Button>
                <Button variant="outline" onClick={invert}>
                  <Repeat2 className="size-4" />
                  Invert
                </Button>
                <Button variant="outline" onClick={clear}>
                  <Eraser className="size-4" />
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={swap}
                  title="Randomize both emojis, keep placements"
                >
                  <Shuffle className="size-4" />
                  Swap
                </Button>
              </div>

              <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="post-phrase" className="text-sm font-medium tracking-wide">
                    Post phrase
                  </label>
                  <span className="font-mono text-xs tabular-nums text-subtle">
                    {graphemes(phrase).length}/{PHRASE_MAX}
                  </span>
                </div>
                <input
                  id="post-phrase"
                  value={phrase}
                  maxLength={PHRASE_MAX * 8}
                  spellCheck={false}
                  placeholder="#test"
                  aria-label="Five-character phrase posted above the board"
                  onChange={(e) => setPhrase(limitGraphemes(e.target.value, PHRASE_MAX))}
                  className="h-11 rounded-md bg-bg px-3 font-mono text-sm tracking-[0.28em] text-fg shadow-[var(--shadow-border)] outline-none placeholder:tracking-normal placeholder:text-subtle focus-visible:shadow-[0_0_0_1px_var(--color-accent)]"
                />
                <p className="text-xs leading-relaxed text-subtle">
                  Phrase on the first line, one enter, then the board. No blank
                  line. Alt text, messenger, and long comments use the same Test
                  cutoff.
                </p>
                <p className="font-mono text-xs tabular-nums text-muted">
                  Post {postWeight}/{X_CHAR_LIMIT}
                  {postWeight > X_CHAR_LIMIT ? " · over limit" : ""}
                </p>
              </div>
            </section>

            <EmojiPicker
              label="Background"
              value={bg}
              onChange={setBg}
              cells={cells}
              bg={bg}
              fg={fg}
              rows={rows}
            />
            <EmojiPicker
              label="Letter"
              value={fg}
              onChange={setFg}
              cells={cells}
              bg={bg}
              fg={fg}
              rows={rows}
            />
          </aside>
        </div>
      </div>
      <XPostPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        phrase={phrase}
        art={art}
        alt={mode === "alt" || mode === "stack"}
        cols={cols}
        label={`${boardFor(mode).name} · ${rows}×${cols}`}
      />
    </div>
  );
}

function Header({
  mode,
  onMode,
  onApp,
  copied,
  onCopy,
  onPost,
  onTest,
}: {
  mode: Mode;
  onMode: (mode: Mode) => void;
  onApp: (id: AppId) => void;
  copied: boolean;
  onCopy: () => void;
  onPost: () => void;
  onTest: () => void;
}) {
  const app = appFor(mode);
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3.5">
        <PixelC />
        <div>
          <h1 className="font-display text-4xl leading-none tracking-wide text-fg sm:text-6xl">
            Xcommuni
            <span className="text-accent [text-shadow:0_0_28px_rgb(186_10_14_/_0.55)]">
              CAP
            </span>
          </h1>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
            Emoji matrix for X, Zora, and messenger. Stamp letters, draw
            freehand, copy the grid, post.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
        <div
          role="tablist"
          aria-label="App"
          className="flex rounded-md bg-surface p-1 shadow-[var(--shadow-border)]"
        >
          {APPS.map((a) => (
            <ModeTab
              key={a.id}
              active={a.id === app.id}
              onClick={() => onApp(a.id)}
            >
              {a.label}
            </ModeTab>
          ))}
        </div>
        <div
          role="tablist"
          aria-label="Board"
          className="flex rounded-md bg-surface p-1 shadow-[var(--shadow-border)]"
        >
          {app.boards.map((b) => (
            <ModeTab
              key={b.mode}
              active={mode === b.mode}
              onClick={() => onMode(b.mode)}
            >
              <span className="flex flex-col items-center leading-tight">
                <span>{b.name}</span>
                <span className="font-mono text-[10px] tracking-wide text-subtle">
                  {b.size}
                </span>
              </span>
            </ModeTab>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <Button variant="secondary" onClick={onCopy} className="w-full sm:w-auto">
            <Copy className="size-4" />
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" onClick={onTest} className="w-full sm:w-auto">
            <Eye className="size-4" />
            Test
          </Button>
          <Button variant="primary" onClick={onPost} className="w-full sm:w-auto">
            <XLogo />
            Post
          </Button>
        </div>
      </div>
    </header>
  );
}

function CanvasCard({
  mode,
  rows,
  cols,
  cells,
  bg,
  fg,
  drawing,
  onPaint,
  postWeight,
  onRows,
}: {
  mode: Mode;
  rows: number;
  cols: number;
  cells: boolean[];
  bg: string;
  fg: string;
  drawing: boolean;
  onPaint: (index: number, value: boolean) => void;
  postWeight: number;
  onRows: (delta: number) => void;
}) {
  const spec = boardFor(mode);
  const app = appFor(mode);
  return (
    <section className="min-w-0 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-glow)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
          <p className="font-mono text-xs tracking-wide text-muted uppercase">
            {app.label} · {spec.name} · {rows}×{cols} · {cells.length} cells
          </p>
        </div>
        {drawing ? (
          <span className="font-mono text-xs tracking-widest text-accent uppercase">
            Drawing
          </span>
        ) : null}
      </div>
      {mode === "test9" ? (
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => onRows(-1)}
              disabled={rows <= ROWS_TEST_MIN}
              aria-label="Remove a row"
            >
              <Minus className="size-3.5" />
            </Button>
            <span
              className="min-w-16 text-center font-mono text-xs tabular-nums text-muted"
              aria-live="polite"
            >
              {rows} rows
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => onRows(1)}
              disabled={rows >= ROWS_TEST_MAX}
              aria-label="Add a row"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              postWeight > X_CHAR_LIMIT ? "text-accent" : "text-subtle",
            )}
          >
            X {postWeight}/{X_CHAR_LIMIT}
            {postWeight > X_CHAR_LIMIT ? " · over" : ""}
          </span>
        </div>
      ) : null}
      <div
        className={cn(
          "bg-bg p-3 sm:p-4",
          (mode === "alt" || mode === "stack" || mode === "test9") &&
            "max-h-[min(70dvh,44rem)] overflow-y-auto",
        )}
      >
        <MatrixGrid
          cells={cells}
          bg={bg}
          fg={fg}
          mode={mode}
          drawing={drawing}
          onPaint={onPaint}
        />
      </div>
    </section>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-sm px-3 py-1.5 font-mono text-xs tracking-wide",
        "transition-[background-color,color,box-shadow] duration-150 ease-out",
        active
          ? "bg-surface-2 text-fg shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]"
          : "text-subtle hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

function PixelC() {
  const bmp = FONT_5X5.C;
  return (
    <div
      aria-hidden
      className="mt-1 grid grid-cols-5 gap-px rounded-sm bg-surface-2 p-1.5 shadow-[var(--shadow-border)]"
    >
      {bmp.flatMap((row, r) =>
        Array.from({ length: 5 }, (_, c) => {
          const on = ((row >> (4 - c)) & 1) === 1;
          return (
            <span
              key={`${r}-${c}`}
              className={cn("size-1.5 sm:size-2", on ? "bg-accent" : "bg-bg")}
            />
          );
        }),
      )}
    </div>
  );
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-current">
      <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.59l-5.16-6.74L5.2 22H1.93l8.02-9.16L1.5 2h6.76l4.66 6.18L18.244 2Zm-1.16 18.06h1.8L7.01 3.84H5.08l12.004 16.22Z" />
    </svg>
  );
}
