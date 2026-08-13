"use client";

import { METEOR_ATTRIBUTIONS } from "@/lib/meteor-facts";

/**
 * Meteor Showers attribution footer. Credits the IAU Meteor Data Center (Jopek &
 * Kaňuchová 2017) for the catalog facts and the IMO Working List for the activity
 * windows / ZHR — with the explicit note that the IMO Calendar itself is not
 * redistributed (its terms are restrictive); we ship only the underlying measured
 * facts and credit the source. The full set also appears in the About panel.
 * Shown on md+.
 */
export default function MeteorAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute bottom-5 corner-safe-right hidden max-w-[340px] animate-hud-in md:block">
      <ul className="space-y-0.5 text-right font-mono text-[9px] leading-relaxed tracking-wide text-faint">
        {METEOR_ATTRIBUTIONS.map((a) => (
          <li key={a.href}>
            <a
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto transition-colors duration-200 hover:text-dim"
            >
              {a.text}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
