import { describe, expect, it } from "vitest";
import { parseUtcTimestamp } from "./utils";

/**
 * `parseUtcTimestamp` exists because of one specific JavaScript trap, and these
 * tests document it: V8's `Date` parser is lenient enough to salvage garbage
 * into a real date rather than an Invalid Date, so a corrupt row from a feed
 * sails straight past a `Number.isFinite(d.getTime())` guard and lands on a
 * chart looking plausible.
 *
 * Both NOAA feeds this app reads (SWPC space weather, CO-OPS tide gauges) send
 * timestamps with no zone marker, which is exactly the shape that invites the
 * bug.
 */
describe("parseUtcTimestamp", () => {
  it("reads the NOAA shapes, with and without seconds or a Z", () => {
    expect(parseUtcTimestamp("2026-08-13 00:12")!.toISOString()).toBe(
      "2026-08-13T00:12:00.000Z"
    );
    expect(parseUtcTimestamp("2026-08-13T00:12")!.toISOString()).toBe(
      "2026-08-13T00:12:00.000Z"
    );
    expect(parseUtcTimestamp("2026-08-13T00:12:34")!.toISOString()).toBe(
      "2026-08-13T00:12:34.000Z"
    );
    expect(parseUtcTimestamp("2026-08-13T00:12:34Z")!.toISOString()).toBe(
      "2026-08-13T00:12:34.000Z"
    );
    expect(parseUtcTimestamp("  2026-08-13 00:12  ")!.toISOString()).toBe(
      "2026-08-13T00:12:00.000Z"
    );
  });

  it("REJECTS the garbage that new Date() would happily salvage", () => {
    // Documents the trap itself: this is a real date, not an Invalid Date.
    expect(Number.isNaN(new Date("badTtime:00Z").getTime())).toBe(false);
    // And the parser refuses it.
    expect(parseUtcTimestamp("bad time")).toBeNull();
    expect(parseUtcTimestamp("")).toBeNull();
    expect(parseUtcTimestamp("2026")).toBeNull();
    expect(parseUtcTimestamp("2026-08")).toBeNull();
    expect(parseUtcTimestamp("13-08-2026 00:12")).toBeNull();
    expect(parseUtcTimestamp("2026-08-13")).toBeNull();
  });

  it("rejects impossible dates rather than rolling them over", () => {
    expect(parseUtcTimestamp("2026-02-31 00:00")).toBeNull();
    expect(parseUtcTimestamp("2026-13-01 00:00")).toBeNull();
    expect(parseUtcTimestamp("2026-00-10 00:00")).toBeNull();
    expect(parseUtcTimestamp("2026-08-13 25:00")).toBeNull();
    expect(parseUtcTimestamp("2026-08-13 00:75")).toBeNull();
  });

  it("accepts a real leap day and rejects a fake one", () => {
    expect(parseUtcTimestamp("2024-02-29 12:00")).not.toBeNull();
    expect(parseUtcTimestamp("2026-02-29 12:00")).toBeNull();
  });

  it("returns null for non-strings", () => {
    for (const bad of [null, undefined, 42, {}, [], true]) {
      expect(parseUtcTimestamp(bad)).toBeNull();
    }
  });
});
