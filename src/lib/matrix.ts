import { FONT_4X5, FONT_5X5 } from "@/lib/font";

export const COLS = 19;
export const COLS_ZORA = 20;
export const COLS_STACK = 6;
export const ROWS_STANDARD = 7;
export const ROWS_ALT = 52;
export const CHAR_SIZE = 5;
export const CHAR_STACK_WIDTH = 4;
export const CHAR_GAP = 1;
export const MAX_STACK_CHARS = 10;

export type Mode = "standard" | "alt" | "zora" | "stack";
export type AppId = "x" | "zora" | "messenger";

export type BoardSpec = {
  mode: Mode;
  name: string;
  size: string;
};

export type AppSpec = {
  id: AppId;
  label: string;
  boards: readonly BoardSpec[];
};

export const APPS: readonly AppSpec[] = [
  {
    id: "x",
    label: "X",
    boards: [
      { mode: "standard", name: "Standard post", size: "19×7" },
      { mode: "alt", name: "Alt text", size: "19×52" },
    ],
  },
  {
    id: "zora",
    label: "Zora",
    boards: [{ mode: "zora", name: "Comments", size: "20×7" }],
  },
  {
    id: "messenger",
    label: "Messenger",
    boards: [{ mode: "stack", name: "Messenger", size: "6×word" }],
  },
];

export function appIdFor(mode: Mode): AppId {
  if (mode === "zora") return "zora";
  if (mode === "stack") return "messenger";
  return "x";
}

export function appFor(mode: Mode): AppSpec {
  return APPS.find((a) => a.id === appIdFor(mode)) ?? APPS[0]!;
}

export function boardFor(mode: Mode): BoardSpec {
  const app = appFor(mode);
  return app.boards.find((b) => b.mode === mode) ?? app.boards[0]!;
}

export function colsFor(mode: Mode): number {
  if (mode === "stack") return COLS_STACK;
  if (mode === "zora") return COLS_ZORA;
  return COLS;
}

export function rowsFor(mode: Mode, letters = 1): number {
  if (mode === "alt") return ROWS_ALT;
  if (mode === "stack") {
    const n = Math.max(1, Math.min(MAX_STACK_CHARS, letters));
    return n * (CHAR_SIZE + CHAR_GAP) + 1;
  }
  return ROWS_STANDARD;
}

export function cellCount(mode: Mode, letters = 1): number {
  return colsFor(mode) * rowsFor(mode, letters);
}

export function maxChars(mode: Mode): number {
  if (mode === "alt") return 8;
  if (mode === "stack") return MAX_STACK_CHARS;
  return 3;
}

export function emptyMatrix(mode: Mode, letters = 1): boolean[] {
  return Array.from({ length: cellCount(mode, letters) }, () => false);
}

function stampChar(
  grid: boolean[],
  ch: string,
  col: number,
  row: number,
  totalRows: number,
  cols: number,
  font: Record<string, readonly number[]>,
  glyphWidth: number,
): void {
  const bmp = font[ch];
  if (!bmp) return;
  for (let r = 0; r < CHAR_SIZE; r++) {
    for (let c = 0; c < glyphWidth; c++) {
      if ((bmp[r]! >> (glyphWidth - 1 - c)) & 1) {
        const x = col + c;
        const y = row + r;
        if (x >= 0 && x < cols && y >= 0 && y < totalRows) {
          grid[y * cols + x] = true;
        }
      }
    }
  }
}

function letterColumns(count: number, cols: number): number[] {
  if (count <= 1) return [Math.floor((cols - CHAR_SIZE) / 2)];
  if (count === 2) {
    const width = CHAR_SIZE * 2 + CHAR_GAP;
    const start = Math.floor((cols - width) / 2);
    return [start, start + CHAR_SIZE + CHAR_GAP];
  }
  const width = CHAR_SIZE * 3 + CHAR_GAP * 2;
  const start = Math.floor((cols - width) / 2);
  return [
    start,
    start + CHAR_SIZE + CHAR_GAP,
    start + (CHAR_SIZE + CHAR_GAP) * 2,
  ];
}

export function stampText(text: string, mode: Mode): boolean[] {
  const chars = Array.from(text.toUpperCase()).filter((ch) => ch in FONT_5X5);

  if (mode === "stack") {
    const used = chars.slice(0, MAX_STACK_CHARS);
    const grid = emptyMatrix(mode, used.length);
    const totalRows = rowsFor(mode, used.length);
    used.forEach((ch, i) => {
      stampChar(
        grid,
        ch,
        1,
        1 + i * (CHAR_SIZE + CHAR_GAP),
        totalRows,
        COLS_STACK,
        FONT_4X5,
        CHAR_STACK_WIDTH,
      );
    });
    return grid;
  }

  const grid = emptyMatrix(mode);
  if (chars.length === 0) return grid;
  const cols = colsFor(mode);
  const rows = rowsFor(mode);

  if (mode === "alt") {
    const used = chars.slice(0, 8);
    const height = used.length * CHAR_SIZE + (used.length - 1) * CHAR_GAP;
    const startRow = Math.floor((ROWS_ALT - height) / 2);
    used.forEach((ch, i) => {
      stampChar(
        grid,
        ch,
        7,
        startRow + i * (CHAR_SIZE + CHAR_GAP),
        ROWS_ALT,
        COLS,
        FONT_5X5,
        CHAR_SIZE,
      );
    });
    return grid;
  }

  const used = chars.slice(0, 3);
  const starts = letterColumns(used.length, cols);
  used.forEach((ch, i) =>
    stampChar(grid, ch, starts[i]!, 1, rows, cols, FONT_5X5, CHAR_SIZE),
  );
  return grid;
}

export function formatArt(
  grid: boolean[],
  mode: Mode,
  bg: string,
  fg: string,
): string {
  const cols = colsFor(mode);
  const rows = Math.max(1, Math.floor(grid.length / cols));
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      line += grid[r * cols + c] ? fg : bg;
    }
    lines.push(line);
  }
  return lines.join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to textarea fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function tweetIntentUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function parseMode(value: unknown): Mode {
  if (value === "alt" || value === "stack" || value === "zora") return value;
  return "standard";
}
