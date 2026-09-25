import { useRef } from "react";
import { colsFor, type Mode } from "@/lib/matrix";
import { cn } from "@/lib/utils";

type MatrixGridProps = {
  cells: boolean[];
  bg: string;
  fg: string;
  mode: Mode;
  drawing: boolean;
  onPaint: (index: number, value: boolean) => void;
};

export function MatrixGrid({
  cells,
  bg,
  fg,
  mode,
  drawing,
  onPaint,
}: MatrixGridProps) {
  const paintValue = useRef<boolean | null>(null);
  const cols = colsFor(mode);
  const rows = Math.max(1, Math.floor(cells.length / cols));

  function indexFromEvent(e: React.PointerEvent<HTMLDivElement>): number {
    const el = (e.target as HTMLElement | null)?.closest("[data-i]") as
      | HTMLElement
      | null;
    if (!el) return -1;
    const i = Number(el.dataset.i);
    return Number.isFinite(i) ? i : -1;
  }

  return (
    <div
      role="grid"
      aria-label={`Emoji matrix, ${cols} columns by ${rows} rows`}
      aria-readonly={!drawing}
      className={cn(
        "matrix-grid",
        mode === "alt" && "is-alt",
        mode === "stack" && "is-stack",
        mode === "test9" && "is-test9",
        drawing && "is-drawing",
      )}
      style={
        {
          ["--matrix-cols" as string]: cols,
          touchAction: drawing ? "none" : "pan-y",
        } as React.CSSProperties
      }
      onPointerDown={(e) => {
        if (!drawing) return;
        const i = indexFromEvent(e);
        if (i < 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const next = !cells[i];
        paintValue.current = next;
        onPaint(i, next);
      }}
      onPointerMove={(e) => {
        if (!drawing || paintValue.current === null) return;
        const i = indexFromEvent(e);
        if (i >= 0) onPaint(i, paintValue.current);
      }}
      onPointerUp={() => {
        paintValue.current = null;
      }}
      onPointerCancel={() => {
        paintValue.current = null;
      }}
    >
      {cells.map((on, i) => (
        <span
          key={i}
          data-i={i}
          role="gridcell"
          aria-colindex={(i % cols) + 1}
          className="matrix-cell"
        >
          {on ? fg : bg}
        </span>
      ))}
    </div>
  );
}
