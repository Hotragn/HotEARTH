"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { groupedWorlds, type World, type WorldTab } from "@/lib/worlds";

/**
 * "All worlds" launcher: a grouped grid of every world with a shipped-texture
 * thumbnail (loaded defensively, falling back to an accent tile), label, blurb
 * and accent. Portalled to <body>, focus-trapped, Esc / outside-click to close.
 */
export default function WorldsOverview({
  open,
  onClose,
  active,
}: {
  open: boolean;
  onClose: () => void;
  active: WorldTab;
}) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-autofocus]")
        ?.focus();
    });
    return () => {
      cancelAnimationFrame(id);
      prev?.focus?.();
    };
  }, [open]);

  // Close on navigation.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!mounted || !open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    // simple focus trap across the dialog's focusable elements
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-abyss/75 p-4 py-[8vh] backdrop-blur-md animate-overlay-in"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="worlds-overview-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="hud-panel w-full max-w-4xl overflow-hidden rounded-3xl animate-palette-in"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
          <div>
            <h2
              id="worlds-overview-title"
              className="font-display text-xl font-medium tracking-tight text-ice"
            >
              All worlds
            </h2>
            <p className="mt-1 text-sm text-dim">
              Every view in the twin. Pick one to launch it.
            </p>
          </div>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close worlds overview"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:bg-white/5 hover:text-ice"
          >
            <X size={17} weight="light" aria-hidden />
          </button>
        </div>

        <div className="hud-scroll max-h-[70dvh] overflow-y-auto p-5 sm:p-6">
          {groupedWorlds().map((section) => (
            <section key={section.group.id} className="mb-7 last:mb-0">
              <div className="mb-3 flex items-baseline gap-3">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
                  {section.group.label}
                </h3>
                <span className="h-px flex-1 bg-line" aria-hidden />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.worlds.map((world) => (
                  <WorldCard
                    key={world.id}
                    world={world}
                    current={world.id === active}
                    onNavigate={onClose}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function WorldCard({
  world,
  current,
  onNavigate,
}: {
  world: World;
  current: boolean;
  onNavigate: () => void;
}) {
  const [imgBroken, setImgBroken] = useState(false);
  const showImg = world.thumb && !imgBroken;

  return (
    <Link
      href={world.href}
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-colors duration-200 ${
        current
          ? "border-white/25 bg-white/[0.06]"
          : "border-line bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]"
      }`}
    >
      {/* thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={world.thumb}
            alt={
              world.thumbBody
                ? `${world.thumbBody}, shown for ${world.label}`
                : `${world.label} texture`
            }
            loading="lazy"
            decoding="async"
            onError={() => setImgBroken(true)}
            className="h-full w-full object-cover opacity-85 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] group-hover:opacity-100"
          />
        ) : (
          // accent-tinted fallback tile when the texture is absent
          <div
            aria-hidden
            className="h-full w-full"
            style={{
              background: `radial-gradient(120% 120% at 30% 20%, ${world.accent}55, transparent 60%), linear-gradient(160deg, ${world.accent}22, rgba(5,6,10,0.9))`,
            }}
          />
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(5,6,10,0.92) 0%, rgba(5,6,10,0.35) 45%, transparent 100%)",
          }}
        />
        {world.thumbBody && showImg && (
          <span className="absolute bottom-2 right-2 rounded-full bg-abyss/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-faint backdrop-blur-sm">
            {world.thumbBody} shown
          </span>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: world.accent }}
          />
          <span className="text-sm font-medium text-ice">{world.label}</span>
          {current && (
            <span className="ml-auto rounded-full border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              current
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-dim">{world.blurb}</p>
      </div>
    </Link>
  );
}
