import { WORLDS, WORLD_GROUPS, getGroup } from "../worlds";
import type { WorldTab } from "../worlds";

/**
 * One grounding fact the companion is allowed to speak from. Retrieval selects
 * a handful of these per question and they are the ONLY substrate the local
 * model (or the scripted fallback) may answer from, so the robot stays honest
 * about the worlds that actually ship instead of inventing physics. (The count
 * is read from the registry rather than written here, so it cannot go stale.)
 */
export interface KnowledgeCard {
  /** Stable id, for de-duping and tests. */
  id: string;
  /** Human title, shown when the answer links out. */
  title: string;
  /** The fact itself, in plain language. Kept short so a tiny model can use it. */
  body: string;
  /** Words that should match this card during retrieval. */
  terms: string[];
  /** Optional in-app destination the answer can point at. */
  href?: string;
  /** The world this card is about, when it maps to one. */
  world?: WorldTab;
}

/**
 * Curated, source-anchored facts about the project as a whole. These are the
 * honesty mandate and the "how do I use this" answers. Everything here is a
 * plain statement of how the app actually works, not marketing.
 */
const APP_CARDS: KnowledgeCard[] = [
  {
    id: "about-app",
    title: "About H.O.T EARTH",
    body: "H.O.T EARTH is an open-source, honest digital twin of Earth and the cosmos. Everything is built on real physics and real public data, with no fabrication. Anything illustrative is clearly labelled as such, and every image, video and dataset is licensed and credited.",
    terms: ["about", "what is this", "hot earth", "app", "project", "honest", "digital twin", "open source", "mission", "purpose"],
    href: "/",
  },
  {
    id: "keyless",
    title: "No API keys",
    body: "The app runs keyless: there are no secret API keys and no heavy server compute, only thin public data proxies. That is why the companion runs a small open-source language model directly in your browser instead of calling a paid cloud service.",
    terms: ["keyless", "api key", "server", "private", "offline", "cost", "free", "how does the robot work", "llm", "model", "ai"],
  },
  {
    id: "companion-honesty",
    title: "About this companion",
    body: "I am a small open-source language model running locally in your browser. I answer only from this app's own data about its worlds, and I can still be wrong, so treat me as a guide and check the panels for the real numbers.",
    terms: ["who are you", "companion", "robot", "assistant", "trust", "wrong", "mistake", "accurate", "hallucinate", "reliable"],
  },
  {
    id: "navigate",
    title: "Getting around",
    body: "Use the grouped menus at the top (Earth, Solar System, Beyond) to pick a world. Press Cmd/Ctrl+K to search all worlds, click the Worlds grid to see them all, or press [ and ] to step to the previous and next world.",
    terms: ["navigate", "navigation", "menu", "find", "search", "how do i get to", "move", "switch", "go to", "shortcut", "keyboard", "tabs"],
  },
  {
    id: "groups",
    title: "The three groups",
    body: `The worlds are organised into three groups. ${WORLD_GROUPS.map((g) => `${g.label}: ${g.blurb}`).join(" ")}`,
    terms: ["groups", "sections", "categories", "earth", "solar system", "beyond", "organised", "how many groups"],
  },
  {
    id: "count",
    title: "How many worlds",
    body: `There are ${WORLDS.length} worlds in total: ${WORLD_GROUPS.map(
      (g) => `${WORLDS.filter((w) => w.group === g.id).length} in ${g.label}`,
    ).join(", ")}.`,
    terms: ["how many", "count", "number of worlds", "total", "list", "everything"],
  },
];

/**
 * Build one grounding card per world from the registry, so the knowledge base
 * always matches what actually ships (single source of truth stays lib/worlds).
 */
function worldCards(): KnowledgeCard[] {
  return WORLDS.map((w) => {
    const group = getGroup(w.group);
    return {
      id: `world-${w.id}`,
      title: w.label,
      body: `${w.label} (in ${group?.label ?? w.group}): ${w.blurb}`,
      terms: [w.label.toLowerCase(), ...w.keywords],
      href: w.href,
      world: w.id,
    };
  });
}

/**
 * The full knowledge base: curated app facts plus one card per world. This is
 * the entire universe of things the companion is allowed to state.
 */
export const KNOWLEDGE_CARDS: readonly KnowledgeCard[] = [
  ...APP_CARDS,
  ...worldCards(),
];
