"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CaretDown, Info, MagnifyingGlass, SquaresFour } from "@phosphor-icons/react";
import {
  WORLD_GROUPS,
  adjacentWorlds,
  getWorld,
  getWorldsInGroup,
  groupedWorlds,
  type WorldGroupId,
  type WorldTab,
} from "@/lib/worlds";
import NavGroupMenu from "./NavGroupMenu";
import CommandPalette from "./CommandPalette";
import WorldsOverview from "./WorldsOverview";
import BrandMark from "./BrandMark";

/**
 * WorldTab is defined in lib/worlds.ts (the single source of truth) and
 * re-exported here so the historical import path keeps working.
 */
export type { WorldTab } from "@/lib/worlds";

/**
 * Top HUD bar. The public contract is stable: a default export taking
 * `{ onAbout, active }`, with `active` a WorldTab string literal. Every
 * `*App.tsx` renders `<NavShell onAbout={…} active="…" />` unchanged.
 *
 * Chrome (this file):
 *  - brand block
 *  - desktop (md+): two grouped dropdowns (Earth / Solar System) + a ⌘K search
 *    affordance + an "All worlds" launcher + About
 *  - mobile (< md): a grouped world menu reaching all worlds + search + About
 *  - a command palette (⌘K / Ctrl+K) and worlds overview, mounted once and
 *    portalled to <body>
 */
export default function NavShell({
  onAbout,
  active = "earth",
}: {
  onAbout: () => void;
  active?: WorldTab;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroup, setOpenGroup] = useState<WorldGroupId | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent));
  }, []);

  // Global ⌘K / Ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOverviewOpen(false);
        setOpenGroup(null);
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Step to the previous / next world with [ and ] (site-wide, wraps around).
  // Ignored while typing in a field, when an overlay is open, or with modifiers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" && e.key !== "]") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (paletteOpen || overviewOpen) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) {
        return;
      }
      const adj = adjacentWorlds(active);
      if (!adj) return;
      e.preventDefault();
      router.push(e.key === "[" ? adj.prev.href : adj.next.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, paletteOpen, overviewOpen, router]);

  // Close the group dropdowns on navigation (palette + overview self-close).
  useEffect(() => {
    setOpenGroup(null);
  }, [pathname]);

  const openPalette = () => {
    setOverviewOpen(false);
    setOpenGroup(null);
    setPaletteOpen(true);
  };
  const openOverview = () => {
    setPaletteOpen(false);
    setOpenGroup(null);
    setOverviewOpen(true);
  };

  // `z-40` is load-bearing: several worlds render a full-bleed element (a scroll
  // container or an absolute backdrop) AFTER this header, and without a stacking
  // order those later siblings painted straight over the nav, leaving the world
  // switcher invisible and unclickable on the Interstellar, Gravitational Waves
  // and Stars tabs. Fixing it here rather than per world means a new world cannot
  // reintroduce it. It stays below the overlays, which sit at z-55 (worlds grid,
  // tour hint) and z-60 (command palette, companion).
  //
  // `pointer-events-none` on the header, with `pointer-events-auto` on each
  // child, is the other half: the header spans the full width, so without it the
  // empty padding swallowed drags meant for the globe underneath.
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-4 sm:p-5">
      {/* brand */}
      <div className="pointer-events-auto animate-hud-in">
        <div className="flex items-center gap-2.5">
          <BrandMark size={22} />
          <span className="font-display text-sm font-semibold tracking-[0.24em] text-ice">
            H.O.T EARTH
          </span>
        </div>
        <p className="mt-1.5 hidden max-w-[300px] pl-[32px] text-[11px] leading-snug text-faint sm:block">
          A living digital twin of Earth: real physics, real data
        </p>
      </div>

      {/* desktop grouped nav, centered */}
      <nav
        aria-label="Worlds"
        className="hud-panel pointer-events-auto absolute left-1/2 top-4 hidden -translate-x-1/2 items-center gap-1 rounded-full p-1 animate-hud-in md:flex"
      >
        {WORLD_GROUPS.map((group) => (
          <NavGroupMenu
            key={group.id}
            group={group}
            worlds={getWorldsInGroup(group.id)}
            active={active}
            open={openGroup === group.id}
            onOpen={() => setOpenGroup(group.id)}
            onClose={() => setOpenGroup(null)}
            onNavigate={() => setOpenGroup(null)}
          />
        ))}
      </nav>

      {/* right actions */}
      <div className="pointer-events-auto flex items-center gap-2 animate-hud-in">
        {/* mobile grouped world menu (reaches all worlds) */}
        <MobileWorldMenu active={active} />

        {/* search: desktop pill */}
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search worlds"
          className="hud-panel hidden cursor-pointer items-center gap-2 rounded-full py-2 pl-3.5 pr-2.5 text-xs text-dim transition-colors duration-200 hover:text-ice md:flex"
        >
          <MagnifyingGlass size={15} weight="light" aria-hidden />
          <span className="hidden lg:inline">Search</span>
          <span className="flex items-center gap-0.5" aria-hidden>
            <kbd className="rounded border border-line bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] leading-none text-faint">
              {isMac ? "⌘" : "Ctrl"}
            </kbd>
            <kbd className="rounded border border-line bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] leading-none text-faint">
              K
            </kbd>
          </span>
        </button>

        {/* search: mobile icon */}
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search worlds"
          className="hud-panel flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:text-ice md:hidden"
        >
          <MagnifyingGlass size={17} weight="light" aria-hidden />
        </button>

        {/* all worlds launcher: desktop */}
        <button
          type="button"
          onClick={openOverview}
          aria-label="Open all worlds"
          className="hud-panel hidden h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 text-xs text-dim transition-colors duration-200 hover:text-ice md:flex"
        >
          <SquaresFour size={16} weight="light" aria-hidden />
          <span className="hidden lg:inline">Worlds</span>
        </button>

        <button
          type="button"
          onClick={onAbout}
          aria-label="About the data in this app"
          className="hud-panel flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:text-ice"
        >
          <Info size={18} weight="light" aria-hidden />
        </button>
      </div>

      {/* global overlays, mounted once, portalled to <body> */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        active={active}
      />
      <WorldsOverview
        open={overviewOpen}
        onClose={() => setOverviewOpen(false)}
        active={active}
      />
    </header>
  );
}

/**
 * Mobile grouped world switcher (hidden on md+). Lists ALL worlds in their
 * groups (Earth / Solar System), so every world is reachable at a narrow
 * viewport. Overlays via z-index rather than shifting the side HUD panels, so
 * it never collides with them. Closes on outside click, Escape, or navigation.
 */
function MobileWorldMenu({ active }: { active: WorldTab }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const current = getWorld(active) ?? getWorld("earth")!;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch world"
        aria-haspopup="menu"
        aria-expanded={open}
        className="hud-panel flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs text-dim transition-colors duration-200 hover:text-ice"
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full animate-pulse-dot"
          style={{ backgroundColor: current.accent }}
        />
        <span className="max-w-[7.5rem] truncate">{current.label}</span>
        <CaretDown
          size={12}
          weight="bold"
          aria-hidden
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <nav
          aria-label="Worlds"
          className="hud-scroll hud-panel absolute right-0 top-full mt-2 flex max-h-[min(75dvh,34rem)] w-56 flex-col overflow-y-auto rounded-2xl p-1.5 animate-menu-in"
        >
          {groupedWorlds().map((section) => (
            <div key={section.group.id} className="py-0.5">
              <p className="px-3 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                {section.group.label}
              </p>
              {section.worlds.map((world) =>
                world.id === active ? (
                  <span
                    key={world.id}
                    aria-current="page"
                    className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-ice"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: world.accent }}
                    />
                    {world.label}
                  </span>
                ) : (
                  <Link
                    key={world.id}
                    href={world.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-dim transition-colors duration-200 hover:bg-white/5 hover:text-ice"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full opacity-70"
                      style={{ backgroundColor: world.accent }}
                    />
                    {world.label}
                  </Link>
                ),
              )}
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
