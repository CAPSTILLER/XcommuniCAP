import { memo, useState } from "react";
import {
  ALL_CATEGORIES,
  POPULAR_EMOJIS,
  firstGrapheme,
} from "@/lib/emojis";
import { COLS, ROWS_STANDARD } from "@/lib/matrix";
import { cn } from "@/lib/utils";

type Tab = "popular" | "all";

type EmojiPickerProps = {
  label: string;
  value: string;
  onChange: (emoji: string) => void;
  cells: boolean[];
  bg: string;
  fg: string;
  rows: number;
};

export function EmojiPicker({
  label,
  value,
  onChange,
  cells,
  bg,
  fg,
  rows,
}: EmojiPickerProps) {
  const [tab, setTab] = useState<Tab>("popular");
  const [cat, setCat] = useState(0);
  const [custom, setCustom] = useState("");
  const category = ALL_CATEGORIES[cat] ?? ALL_CATEGORIES[0];
  const list = tab === "popular" ? POPULAR_EMOJIS : category.emojis;

  function applyCustom(raw: string) {
    setCustom(raw);
    const g = firstGrapheme(raw);
    if (g) onChange(g);
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <header className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-lg shadow-[var(--shadow-border)]"
          >
            {value}
          </span>
          <h2 className="text-sm font-medium tracking-wide text-fg">{label}</h2>
        </div>
        <div className="flex rounded-sm bg-bg p-0.5 shadow-[var(--shadow-border)]">
          <TabButton active={tab === "popular"} onClick={() => setTab("popular")}>
            Popular
          </TabButton>
          <TabButton active={tab === "all"} onClick={() => setTab("all")}>
            All
          </TabButton>
        </div>
        <MiniMatrix cells={cells} bg={bg} fg={fg} rows={rows} />
      </header>

      {tab === "all" ? (
        <div className="grid grid-cols-8 gap-1" role="tablist" aria-label="Emoji categories">
          {ALL_CATEGORIES.map((c, i) => {
            const active = i === cat;
            return (
              <button
                key={c.icon}
                type="button"
                role="tab"
                title={c.name}
                aria-label={c.name}
                aria-selected={active}
                onClick={() => setCat(i)}
                className={cn(
                  "flex aspect-square min-h-10 items-center justify-center rounded-sm text-lg",
                  "transition-[background-color,box-shadow] duration-150 ease-out",
                  "active:scale-[0.96]",
                  active
                    ? "bg-surface-2 shadow-[0_0_0_1px_var(--color-accent),0_0_12px_rgb(186_10_14_/_0.35)]"
                    : "bg-bg shadow-[var(--shadow-border)] hover:bg-surface-2",
                )}
              >
                {c.icon}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        className={cn(
          "grid grid-cols-6 gap-1 overflow-y-auto pr-0.5 sm:grid-cols-8",
          tab === "all" ? "max-h-48" : "max-h-none",
        )}
      >
        {list.map((emoji, i) => {
          const selected = emoji === value;
          return (
            <button
              key={`${emoji}-${i}`}
              type="button"
              aria-label={`Use ${emoji}`}
              aria-pressed={selected}
              onClick={() => onChange(emoji)}
              className={cn(
                "flex aspect-square min-h-11 items-center justify-center rounded-xs text-lg",
                "transition-[background-color,box-shadow,scale] duration-150 ease-out",
                "active:scale-[0.96]",
                selected
                  ? "bg-surface-2 shadow-[0_0_0_1px_var(--color-accent),0_0_12px_rgb(186_10_14_/_0.35)]"
                  : "hover:bg-surface-2",
              )}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-wide text-subtle uppercase">
          Custom
        </span>
        <input
          value={custom}
          onChange={(e) => applyCustom(e.target.value)}
          placeholder="Paste any emoji"
          aria-label={`${label} custom emoji`}
          className="h-11 rounded-md bg-bg px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-subtle focus-visible:shadow-[0_0_0_1px_var(--color-accent)]"
        />
      </label>
    </section>
  );
}

const MiniMatrix = memo(function MiniMatrix({
  cells,
  bg,
  fg,
  rows,
}: {
  cells: boolean[];
  bg: string;
  fg: string;
  rows: number;
}) {
  const scaleY = rows > ROWS_STANDARD ? ROWS_STANDARD / rows : 1;
  const cols =
    rows > 0 && cells.length % rows === 0 ? cells.length / rows : COLS;
  return (
    <div className="mini-matrix-wrap ml-auto" aria-hidden title="Art preview">
      <div
        className="mini-matrix"
        style={{
          gridTemplateColumns: `repeat(${cols}, 4px)`,
          gridTemplateRows: `repeat(${rows}, 4px)`,
          transform: scaleY === 1 ? undefined : `scaleY(${scaleY})`,
        }}
      >
        {cells.map((on, i) => (
          <span key={i}>{on ? fg : bg}</span>
        ))}
      </div>
    </div>
  );
});

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 rounded-xs px-2.5 text-xs font-medium tracking-wide",
        "transition-[background-color,color] duration-150 ease-out",
        active ? "bg-surface-2 text-fg" : "text-subtle hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
