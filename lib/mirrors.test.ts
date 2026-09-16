import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  KNOWN_STAMP_PATHS,
  LIVE_MIRRORS,
  MIRRORS,
  STALE_FACTOR,
  UNDATED_LIVE,
  freshness,
  parseStamp,
  readStamp,
  type Mirror,
} from "./mirrors";
import { WORLDS } from "./worlds";

/**
 * The tests that keep the registry honest.
 *
 * A hand-written registry of forty one files is exactly the kind of thing that
 * rots: somebody adds a world, ships a mirror, and this list quietly stops
 * describing the repository. So the completeness checks run BOTH WAYS. Every
 * file on disk must be declared, and every declaration must point at a file
 * that exists. Adding a mirror without registering it fails here, which is the
 * only reason a page built on this list can be trusted.
 *
 * The same applies to the cron workflows: a scheduled job whose output is not a
 * live mirror, or a live mirror with a cadence and no job to meet it, is a
 * contradiction between two files that nothing else would catch.
 */

const ROOT = process.cwd();
const PUBLIC = join(ROOT, "public");

/** Every JSON file under public/data, as a web path. */
function dataFiles(dir = join(PUBLIC, "data"), prefix = "/data"): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...dataFiles(path, `${prefix}/${entry.name}`));
    else if (entry.name.endsWith(".json")) out.push(`${prefix}/${entry.name}`);
  }
  return out;
}

const ON_DISK = dataFiles().sort();

const payload = (mirror: Mirror): unknown =>
  JSON.parse(readFileSync(join(PUBLIC, mirror.path), "utf8"));

/** Every scheduled workflow, with the data paths it writes. */
function scheduledWorkflows(): Array<{ file: string; crons: string[]; outputs: string[] }> {
  const dir = join(ROOT, ".github", "workflows");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yml"))
    .map((f) => {
      const text = readFileSync(join(dir, f), "utf8");
      return {
        file: f,
        crons: [...text.matchAll(/cron:\s*"([^"]+)"/g)].map((m) => m[1]),
        outputs: [...new Set([...text.matchAll(/public(\/data\/[A-Za-z0-9_./-]+\.json)/g)].map((m) => m[1]))],
      };
    })
    .filter((w) => w.crons.length > 0);
}

describe("the registry describes the repository", () => {
  it("declares every file on disk", () => {
    const declared = new Set(MIRRORS.map((m) => m.path));
    const undeclared = ON_DISK.filter((p) => !declared.has(p));
    // If this fails you added a mirror and did not register it. The /data page
    // is built from this list, so an unregistered file is invisible there.
    expect(undeclared).toEqual([]);
  });

  it("points every declaration at a file that exists", () => {
    const missing = MIRRORS.filter((m) => !existsSync(join(PUBLIC, m.path))).map((m) => m.path);
    expect(missing).toEqual([]);
    expect(MIRRORS.length).toBe(ON_DISK.length);
  });

  it("has no duplicate paths and no empty labels", () => {
    const paths = MIRRORS.map((m) => m.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const m of MIRRORS) {
      expect(m.label.length, m.path).toBeGreaterThan(3);
      expect(m.path.startsWith("/data/"), m.path).toBe(true);
    }
  });

  it("names a world that actually exists, when it names one", () => {
    const tabs = new Set(WORLDS.map((w) => w.id));
    for (const m of MIRRORS) {
      if (m.world !== null) expect(tabs.has(m.world), `${m.path} -> ${m.world}`).toBe(true);
    }
  });

  it("gives a cadence only to live mirrors", () => {
    for (const m of MIRRORS) {
      if (m.kind !== "live") expect(m.cadenceDays, m.path).toBeNull();
      if (m.cadenceDays !== null) expect(m.cadenceDays).toBeGreaterThan(0);
    }
  });
});

describe("every declared timestamp actually resolves", () => {
  it("finds the stamp where the registry says it is", () => {
    // The point of a declared path rather than a search: if a fetch script moves
    // its timestamp, this fails instead of the page quietly reading a different
    // date out of the same file.
    const broken: string[] = [];
    for (const m of MIRRORS) {
      if (m.stampPath === null) continue;
      const stamp = readStamp(payload(m), m.stampPath);
      if (stamp === null || parseStamp(stamp) === null) broken.push(`${m.path} at ${m.stampPath}`);
    }
    expect(broken).toEqual([]);
  });

  it("uses only stamp names the payloads are known to carry", () => {
    const known = new Set<string>(KNOWN_STAMP_PATHS);
    for (const m of MIRRORS) {
      if (m.stampPath !== null) expect(known.has(m.stampPath), m.stampPath).toBe(true);
    }
  });

  it("names the undated live mirrors rather than assuming they are fine", () => {
    // Two live mirrors carry no timestamp. That is a real gap and it is listed,
    // so a third one cannot be added without this count changing.
    expect(UNDATED_LIVE).toHaveLength(2);
    for (const path of UNDATED_LIVE) expect(path.startsWith("/data/sun/")).toBe(true);
    // And every other live mirror is dated.
    const datedLive = LIVE_MIRRORS.filter((m) => m.stampPath !== null);
    expect(datedLive.length).toBe(LIVE_MIRRORS.length - UNDATED_LIVE.length);
  });
});

describe("the scheduled jobs and the registry agree", () => {
  const workflows = scheduledWorkflows();

  it("finds a scheduled job for every dated live mirror", () => {
    // A mirror with a cadence and nothing to meet it would show as stale
    // forever, and the honest fix is a job rather than a looser cadence.
    const scheduled = new Set(workflows.flatMap((w) => w.outputs));
    const unscheduled = LIVE_MIRRORS.filter(
      (m) => m.cadenceDays !== null && !scheduled.has(m.path)
    ).map((m) => m.path);
    expect(unscheduled).toEqual([]);
  });

  it("writes only registered live mirrors from a scheduled job", () => {
    const live = new Set(LIVE_MIRRORS.map((m) => m.path));
    const wrong: string[] = [];
    for (const w of workflows) {
      for (const out of w.outputs) {
        if (!live.has(out)) wrong.push(`${w.file} writes ${out}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("has a job for each cron-shaped mirror and no orphan jobs", () => {
    expect(workflows.length).toBeGreaterThanOrEqual(
      LIVE_MIRRORS.filter((m) => m.cadenceDays !== null).length
    );
    for (const w of workflows) {
      expect(w.crons.length, `${w.file} has no cron`).toBeGreaterThan(0);
    }
  });
});

describe("what an age means", () => {
  const live: Mirror = {
    path: "/data/ozone/ozone.json",
    label: "test",
    world: null,
    kind: "live",
    cadenceDays: 31,
    stampPath: "generated",
  };
  const day = 86_400_000;
  const now = Date.parse("2026-09-16T00:00:00Z");
  const ago = (days: number) => new Date(now - days * day).toISOString();

  it("calls a mirror inside its cadence current", () => {
    expect(freshness(live, ago(0), now).state).toBe("current");
    expect(freshness(live, ago(30), now).state).toBe("current");
    expect(freshness(live, ago(31), now).state).toBe("current");
  });

  it("calls one past its cadence due, not stale, because a run can be late", () => {
    const due = freshness(live, ago(40), now);
    expect(due.state).toBe("due");
    expect(due.needsAttention).toBe(false);
    expect(freshness(live, ago(31 * STALE_FACTOR), now).state).toBe("due");
  });

  it("calls one past the grace stale, and asks for attention", () => {
    const stale = freshness(live, ago(90), now);
    expect(stale.state).toBe("stale");
    expect(stale.needsAttention).toBe(true);
    expect(stale.ageDays!).toBeCloseTo(90, 6);
  });

  it("never calls a published catalogue stale, however old", () => {
    // The easiest wrong thing this page could do. The Messier catalogue is from
    // 1781 and there is nothing to fix.
    const published: Mirror = { ...live, kind: "published", cadenceDays: null };
    const old = freshness(published, ago(4000), now);
    expect(old.state).toBe("published");
    expect(old.needsAttention).toBe(false);
    expect(old.ageDays!).toBeCloseTo(4000, 6);
    const derived = freshness({ ...published, kind: "derived" }, ago(4000), now);
    expect(derived.state).toBe("derived");
    expect(derived.needsAttention).toBe(false);
  });

  it("says undated rather than guessing", () => {
    expect(freshness(live, null, now).state).toBe("undated");
    expect(freshness(live, "not a date", now).state).toBe("undated");
    expect(freshness({ ...live, cadenceDays: null }, ago(1), now).state).toBe("undated");
    expect(freshness(live, null, now).ageDays).toBeNull();
    expect(freshness(live, null, now).needsAttention).toBe(false);
  });

  it("reads a nested stamp and refuses a wrong path", () => {
    const doc = { meta: { generated: "2026-09-01T12:00:00Z" }, generated: 42 };
    expect(readStamp(doc, "meta.generated")).toBe("2026-09-01T12:00:00Z");
    expect(readStamp(doc, "generated")).toBeNull();
    expect(readStamp(doc, "meta.missing")).toBeNull();
    expect(readStamp(doc, "meta.generated.deeper")).toBeNull();
    expect(readStamp(null, "generated")).toBeNull();
    expect(readStamp(doc, null)).toBeNull();
    expect(readStamp([{ generated: "x" }], "0.generated")).toBeNull();
  });

  it("parses the three timestamp shapes the payloads actually use", () => {
    // A Z, an offset, and a bare date. The bare date is read as UTC midnight,
    // which is the right reading for a file written by a scheduled job.
    expect(parseStamp("2026-09-13T01:57:46Z")).toBe(Date.parse("2026-09-13T01:57:46Z"));
    expect(parseStamp("2026-09-05T11:14:33+00:00")).toBe(Date.parse("2026-09-05T11:14:33Z"));
    expect(parseStamp("2026-07-06")).toBe(Date.parse("2026-07-06T00:00:00Z"));
    expect(parseStamp("")).toBeNull();
    expect(parseStamp(null)).toBeNull();
    expect(parseStamp("yesterday")).toBeNull();
  });

  it("reports the real mirrors without any of them being stale today", () => {
    // Read against the committed files. This is the check that would have
    // surfaced a dead cron, and it is deliberately a warning rather than a
    // hard failure on cadence: CI running on an old branch should not go red
    // because a monthly job has not fired yet.
    const now_ = Date.now();
    const states = LIVE_MIRRORS.map((m) => {
      const stamp = m.stampPath ? readStamp(payload(m), m.stampPath) : null;
      return { path: m.path, ...freshness(m, stamp, now_) };
    });
    expect(states.length).toBe(LIVE_MIRRORS.length);
    for (const s of states) {
      expect(["current", "due", "stale", "undated"]).toContain(s.state);
    }
    // Every dated live mirror parses, which is the part that must not rot.
    for (const s of states) {
      if (s.mirror.stampPath !== null) expect(s.ageDays).not.toBeNull();
    }
  });
});
