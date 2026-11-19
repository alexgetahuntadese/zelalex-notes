import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { listDocs } from "@/lib/docs";
import { highlightParts, searchDocs } from "@/lib/search";

const LIMIT = 7;

export function GlobalSearch() {
  const nav = useNavigate();
  const { data = [] } = useQuery({ queryKey: ["docs"], queryFn: listDocs });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => searchDocs(data, q, LIMIT), [data, q]);

  // "/" anywhere focuses the box, unless the user is already typing somewhere.
  useEffect(() => {
    function onWindowKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el as HTMLElement | null)?.isContentEditable === true;
      if (typing) return;
      e.preventDefault();
      input.current?.focus();
      setOpen(true);
    }
    window.addEventListener("keydown", onWindowKey);
    return () => window.removeEventListener("keydown", onWindowKey);
  }, []);

  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  useEffect(() => setActive(0), [q]);

  function openDoc(id: string) {
    setOpen(false);
    setQ("");
    nav({ to: "/docs/$id", params: { id } });
  }

  function seeAll() {
    setOpen(false);
    nav({ to: "/", search: q.trim() ? { q } : {} });
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const hit = hits[active];
      if (hit) openDoc(hit.doc.id);
      else seeAll();
    }
  }

  const showList = open && q.trim().length > 0;

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={input}
        type="search"
        role="searchbox"
        aria-label="Search entries"
        aria-expanded={showList && hits.length > 0}
        placeholder="Search entries…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
      />
      {q ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setQ("");
            input.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-input px-1 font-mono text-[10px] text-muted-foreground">
          /
        </kbd>
      )}

      {showList && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {hits.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No entry matches “{q.trim()}”.
            </p>
          ) : (
            <ul role="listbox" aria-label="Search results" className="max-h-80 overflow-auto p-1">
              {hits.map((h, i) => (
                <li key={h.doc.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => openDoc(h.doc.id)}
                    className={`w-full rounded-sm px-2 py-1.5 text-left ${i === active ? "bg-accent text-accent-foreground" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-primary">
                        {h.doc.category}
                      </span>
                      <span className="min-w-0 truncate text-sm font-medium">
                        {highlightParts(h.doc.title, q).map((p, j) =>
                          p.hit ? (
                            <mark key={j} className="bg-transparent font-semibold underline">
                              {p.text}
                            </mark>
                          ) : (
                            <span key={j}>{p.text}</span>
                          ),
                        )}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                      {h.where.join(" · ")}
                      {h.doc.system ? ` · ${h.doc.system}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={seeAll}
            className="flex w-full items-center justify-between border-t bg-card px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            <span>Enter to open · ↑↓ to move</span>
            <span>See all matches →</span>
          </button>
        </div>
      )}
    </div>
  );
}
