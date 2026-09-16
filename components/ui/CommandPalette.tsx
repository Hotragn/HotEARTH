"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ArrowElbowDownLeft, MagnifyingGlass } from "@phosphor-icons/react";
import {
  groupSearchResults,
  searchWorlds,
  type WorldTab,
} from "@/lib/worlds";

/**
 * Command palette (⌘K / Ctrl+K). Fuzzy-searches every world by label + keywords
 * (lib/worlds.ts), grouped results, full keyboard control:
 *  - type to filter, ↑/↓ to move, Enter to go, Esc to close, Home/End to jump
 *  - focus is trapped in the input; the listbox is driven via aria-activedescendant
 *
 * Rendered once, globally, from NavShell (which lives on every route) and
 * portalled to <body> so it sits above all HUD chrome regardless of stacking.
 */
export default function CommandPalette({
  open,
  onClose,
  active,
}: {
  open: boolean;
  onClose: () => void;
  active: WorldTab;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => searchWorlds(query), [query]);
  const grouped = useMemo(() => groupSearchResults(results), [results]);

  useEffect(() => setMounted(true), []);

  // Reset query + selection each time the palette opens, and focus the input.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const prev = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      // restore focus to whatever opened the palette
      prev?.focus?.();
    };
  }, [open]);

  // Close on route change (covers browser back/forward while open).
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, results.length]);

  if (!mounted || !open) return null;

  const go = (index: number) => {
    const world = results[index];
    if (!world) return;
    onClose();
    if (world.href !== pathname) router.push(world.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) =>
          results.length ? (i - 1 + results.length) % results.length : 0,
        );
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(Math.max(0, results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        go(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
      case "Tab":
        // trap focus: this is a single-input dialog
        e.preventDefault();
        break;
    }
  };

  const optionId = (id: WorldTab) => `cmdk-opt-${id}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-abyss/70 p-4 pt-[14vh] backdrop-blur-md animate-overlay-in"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search worlds"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="hud-panel w-full max-w-xl overflow-hidden rounded-2xl animate-palette-in"
      >
        {/* search input */}
        <div className="flex items-center gap-3 border-b border-line px-4">
          <MagnifyingGlass
            size={18}
            weight="light"
            aria-hidden
            className="shrink-0 text-faint"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-listbox"
            aria-activedescendant={
              results[activeIndex] ? optionId(results[activeIndex].id) : undefined
            }
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search worlds…"
            className="h-14 w-full bg-transparent text-base text-ice placeholder:text-faint focus:outline-none"
          />
        </div>

        {/* results */}
        <div
          ref={listRef}
          id="cmdk-listbox"
          role="listbox"
          aria-label="Worlds"
          className="hud-scroll max-h-[46vh] overflow-y-auto p-1.5"
        >
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-faint">
              No worlds match “{query.trim()}”.
            </p>
          ) : (
            grouped.map((section) => (
              <div key={section.group.id} role="group" aria-label={section.group.label}>
                <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                  {section.group.label}
                </p>
                {section.worlds.map((world) => {
                  const flatIndex = results.indexOf(world);
                  const isActive = flatIndex === activeIndex;
                  const isCurrent = world.id === active;
                  return (
                    <div
                      key={world.id}
                      id={optionId(world.id)}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onClick={() => go(flatIndex)}
                      onMouseMove={() => setActiveIndex(flatIndex)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 ${
                        isActive ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: world.accent }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-ice">
                            {world.label}
                          </span>
                          {isCurrent && (
                            <span className="shrink-0 rounded-full border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                              current
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-dim">
                          {world.blurb}
                        </span>
                      </span>
                      {isActive && (
                        <ArrowElbowDownLeft
                          size={14}
                          weight="light"
                          aria-hidden
                          className="shrink-0 text-faint"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* hint bar */}
        <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          <span className="flex items-center gap-3">
            <span>↑↓ move</span>
            <span>↵ open</span>
            <span>esc close</span>
            <span className="hidden sm:inline">[ ] prev/next world</span>
          </span>
          <span className="hidden sm:inline">
            {results.length} world{results.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
