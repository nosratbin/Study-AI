"use client";
// Text field with a searchable suggestion dropdown (WAI-ARIA APG "combobox with list autocomplete"). The typed text is
// the value: suggestions help, but anything can be entered. Styled like VengeanceUI's command items; hand-built because
// cmdk keeps aria-expanded="true" and expects its list always mounted, which misreports a dropdown that closes.

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type ComboOption = { value: string; hint?: ReactNode };

export interface ComboboxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Suggestions for the typed text. Called after a short pause; stale answers are dropped. Keep it stable (module scope or useCallback). */
  search: (query: string) => Promise<ComboOption[]> | ComboOption[];
  /** Characters needed before suggesting. */
  minChars?: number;
  placeholder?: string;
  invalid?: boolean;
  autoComplete?: string;
  className?: string;
}

const DEBOUNCE_MS = 180;

export function Combobox({ id, value, onChange, search, minChars = 2, placeholder, invalid, autoComplete = "off", className }: ComboboxProps) {
  const listId = `${useId()}-list`;
  const [options, setOptions] = useState<ComboOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  // Only search after the user types; a prefilled value (settings) shouldn't pop the list open.
  const [query, setQuery] = useState<string | null>(null);
  const latest = useRef(0);

  const q = query?.trim() ?? "";
  const searching = query !== null && q.length >= minChars;

  useEffect(() => {
    const ticket = ++latest.current;
    if (!searching) return;
    const timer = setTimeout(async () => {
      try {
        const found = await search(q);
        if (ticket !== latest.current) return;
        // Hide the list when the only suggestion is exactly what's typed.
        setOptions(found.length === 1 && found[0].value.toLowerCase() === q.toLowerCase() ? [] : found);
        setActive(-1);
      } catch {
        if (ticket === latest.current) setOptions([]);  // suggestions are optional; typing still works
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q, searching, search]);

  const shown = searching ? options : [];
  const expanded = open && shown.length > 0;

  function choose(option: ComboOption) {
    onChange(option.value);
    setQuery(null);
    setOptions([]);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!shown.length) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (expanded ? (i + step + shown.length) % shown.length : step === 1 ? 0 : shown.length - 1));
    } else if (e.key === "Enter" && expanded && active >= 0) {
      e.preventDefault(); // pick the highlighted suggestion instead of submitting the form
      choose(shown[active]);
    } else if (e.key === "Escape" && expanded) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className={clsx("relative", className)}>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        autoComplete={autoComplete}
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          setQuery(next);
          setOpen(true);
          setLoading(next.trim().length >= minChars);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        className={clsx(
          "h-11 w-full rounded-xl border bg-card px-3.5 pr-10 text-[15px] text-ink placeholder:text-muted/70 transition-colors",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30",
          invalid ? "border-danger" : "border-line",
        )}
      />
      {loading && searching && (
        <Loader2 aria-hidden className="pointer-events-none absolute right-3.5 top-3.5 size-4 animate-spin text-muted motion-reduce:animate-none" />
      )}
      <ul
        id={listId}
        role="listbox"
        hidden={!expanded}
        // Keep focus in the input while clicking an option, so blur doesn't close the list first.
        onMouseDown={(e) => e.preventDefault()}
        className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-line bg-card p-1 shadow-card"
      >
        {shown.map((o, i) => (
          <li
            key={o.value}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onClick={() => choose(o)}
            onMouseMove={() => i !== active && setActive(i)}
            className={clsx(
              "flex cursor-pointer items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-sm",
              i === active ? "bg-muted-bg text-ink" : "text-ink",
            )}
          >
            <span className="min-w-0">{o.value}</span>
            {o.hint ? <span className="shrink-0 text-xs text-muted">{o.hint}</span> : null}
          </li>
        ))}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {expanded ? `${shown.length} suggestion${shown.length === 1 ? "" : "s"}. Use the arrow keys to choose.` : ""}
      </p>
    </div>
  );
}
