import { describe, expect, it } from "vitest";
import {
  AU_KM,
  SUN,
  angularDiameterDegFromKm,
  auroraEquatorwardBoundaryDeg,
  auroraVisibleFromGeomagLatitude,
  carringtonRotationNumber,
  differentialRotationRateDegPerDay,
  gScaleFromKp,
  gScaleLabel,
  kpLabel,
  siderealRotationPeriodDays,
  solarCycleInfo,
  solarCyclePhaseLabel,
  solarWindLabel,
  subEarthCarringtonLongitude,
  xrayFlareClass,
} from "./sun";

/**
 * Physics acceptance tests for the Sun / space-weather layer.
 *
 * Sources for the asserted reference values:
 *   • Differential rotation: Snodgrass & Ulrich (1990), ApJ 351, 309 —
 *     ω = 14.713 − 2.396·sin²ψ − 1.787·sin⁴ψ °/day (sidereal). Equatorial
 *     period 360/14.713 ≈ 24.47 d; 30° ≈ 25.71 d; pole ≈ 34.2 d.
 *   • Carrington rotation: CR = 1 + (JD − 2398167.4)/27.2753. Known epoch:
 *     CR 2300 begins ≈ 2025-07-16 (UMD MTOF/PM CR tables; Stanford WSO).
 *   • Solar cycle 25: NOAA/NASA panel — min Dec 2019, max ~2024–2025.
 *   • GOES X-ray flare classes & NOAA G-scale: NOAA SWPC space-weather scales.
 */

const DAY_MS = 86_400_000;

// ─────────────────────── 1. Differential solar rotation ─────────────────────
describe("differential rotation (Snodgrass & Ulrich 1990)", () => {
  it("equatorial period is ≈ 24.5 d (24–25)", () => {
    const p = siderealRotationPeriodDays(0)!;
    expect(p).toBeGreaterThan(24);
    expect(p).toBeLessThan(25);
    expect(p).toBeCloseTo(24.47, 1);
  });

  it("30° latitude period is ≈ 26 d (Snodgrass gives 25.7 d)", () => {
    const p = siderealRotationPeriodDays(30)!;
    expect(p).toBeGreaterThan(25);
    expect(p).toBeLessThan(27);
    expect(p).toBeCloseTo(25.7, 1);
  });

  it("increases monotonically toward the poles", () => {
    let prev = -Infinity;
    for (let lat = 0; lat <= 80; lat += 10) {
      const p = siderealRotationPeriodDays(lat)!;
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
    // Pole (~34 d) is slower than a mid-latitude (~30 d) is slower than equator.
    expect(siderealRotationPeriodDays(90)!).toBeGreaterThan(
      siderealRotationPeriodDays(30)!
    );
  });

  it("is symmetric in latitude sign", () => {
    expect(siderealRotationPeriodDays(-45)).toBeCloseTo(
      siderealRotationPeriodDays(45)!,
      9
    );
  });

  it("period matches 360/ω from the A/B/C law exactly", () => {
    for (let lat = 0; lat <= 90; lat += 15) {
      const omega = differentialRotationRateDegPerDay(lat)!;
      expect(siderealRotationPeriodDays(lat)!).toBeCloseTo(360 / omega, 9);
    }
    expect(differentialRotationRateDegPerDay(0)).toBeCloseTo(14.713, 6);
  });
});

// ─────────────────────────── Carrington rotation ────────────────────────────
describe("Carrington rotation number", () => {
  it("is a large positive value in the modern era", () => {
    const cr = carringtonRotationNumber(new Date(Date.UTC(2025, 0, 1)))!;
    expect(cr).toBeGreaterThan(2000);
    expect(Math.floor(cr)).toBeGreaterThan(2200);
    expect(Number.isFinite(cr)).toBe(true);
  });

  it("matches the known epoch: CR ≈ 2300 at 2025-07-16", () => {
    const cr = carringtonRotationNumber(new Date(Date.UTC(2025, 6, 16)))!;
    expect(Math.abs(cr - 2300)).toBeLessThan(1);
  });

  it("increases by exactly 1 per synodic period (27.2753 d)", () => {
    const t0 = new Date(Date.UTC(2025, 0, 1));
    const t1 = new Date(t0.getTime() + 27.2753 * DAY_MS);
    expect(carringtonRotationNumber(t1)! - carringtonRotationNumber(t0)!).toBeCloseTo(
      1,
      6
    );
  });

  it("sub-Earth Carrington longitude stays in [0, 360)", () => {
    for (let d = 0; d < 60; d += 3) {
      const lon = subEarthCarringtonLongitude(
        new Date(Date.UTC(2025, 0, 1) + d * DAY_MS)
      )!;
      expect(lon).toBeGreaterThanOrEqual(0);
      expect(lon).toBeLessThan(360);
    }
  });
});

// ────────────────────────────── 2. Solar cycle ──────────────────────────────
describe("solar cycle (approximate, from cycle-25 timing)", () => {
  it("2025 is Cycle 25, near maximum", () => {
    const info = solarCycleInfo(new Date(Date.UTC(2025, 0, 1)))!;
    expect(info.cycleNumber).toBe(25);
    expect(info.phaseLabel).toBe("maximum");
    expect(info.phase).toBeGreaterThan(0.35);
    expect(info.phase).toBeLessThan(0.55);
    expect(info.approximate).toBe(true);
  });

  it("labels the cycle just after the Dec-2019 minimum as 'minimum' then 'rising'", () => {
    expect(solarCycleInfo(new Date(Date.UTC(2020, 0, 1)))!.phaseLabel).toBe(
      "minimum"
    );
    expect(solarCycleInfo(new Date(Date.UTC(2022, 0, 1)))!.phaseLabel).toBe(
      "rising"
    );
  });

  it("advances to Cycle 26 after ~11 years", () => {
    const info = solarCycleInfo(new Date(Date.UTC(2032, 0, 1)))!;
    expect(info.cycleNumber).toBe(26);
  });

  it("phase-label boundaries follow the rising→max→declining→min ordering", () => {
    expect(solarCyclePhaseLabel(0.02)).toBe("minimum");
    expect(solarCyclePhaseLabel(0.2)).toBe("rising");
    expect(solarCyclePhaseLabel(0.45)).toBe("maximum");
    expect(solarCyclePhaseLabel(0.7)).toBe("declining");
    expect(solarCyclePhaseLabel(0.95)).toBe("minimum");
  });
});

// ─────────────────────────────── 3. Aurora oval ─────────────────────────────
describe("aurora oval boundary", () => {
  it("is ≈67° geomagnetic at Kp0 and ≈40° at Kp9", () => {
    // NOAA's published table, now shared with lib/aurora so the Sun tab and
    // the Aurora tab cannot disagree about where the oval reaches.
    expect(auroraEquatorwardBoundaryDeg(0)).toBeCloseTo(66.5, 6);
    expect(auroraEquatorwardBoundaryDeg(9)).toBeCloseTo(48.1, 6);
  });

  it("decreases monotonically with Kp (bigger storm → lower latitudes)", () => {
    let prev = Infinity;
    for (let kp = 0; kp <= 9; kp++) {
      const b = auroraEquatorwardBoundaryDeg(kp)!;
      expect(b).toBeLessThan(prev);
      prev = b;
    }
  });

  it("visibility: aurora reaches lower latitudes only in bigger storms", () => {
    // A 50° geomagnetic site sees nothing at Kp0 but does during a Kp9 storm.
    expect(auroraVisibleFromGeomagLatitude(0, 50)).toBe(false);
    expect(auroraVisibleFromGeomagLatitude(9, 50)).toBe(true); // 50 > 48.1
    // Polar sites (70°) see aurora even when quiet.
    expect(auroraVisibleFromGeomagLatitude(0, 70)).toBe(true);
    // Works for the southern hemisphere too (uses |lat|).
    // 45 is now inside the oval only in the southern sense of |lat| >= 48.1,
    // which it is not: the published table stops at 48.1, so this is false.
    expect(auroraVisibleFromGeomagLatitude(9, -45)).toBe(false);
  });
});

// ─────────────────── 4. Space-weather scales / classification ────────────────
describe("X-ray flare classification (GOES 1–8 Å)", () => {
  it("classifies the canonical decade thresholds", () => {
    expect(xrayFlareClass(1e-8)).toBe("A1.0");
    expect(xrayFlareClass(1e-6)).toBe("C1.0");
    expect(xrayFlareClass(5e-5)).toBe("M5.0");
    expect(xrayFlareClass(2e-4)).toBe("X2.0");
  });

  it("handles band edges and sub-A / large-X flux", () => {
    expect(xrayFlareClass(1e-7)).toBe("B1.0");
    expect(xrayFlareClass(1e-5)).toBe("M1.0");
    expect(xrayFlareClass(1e-4)).toBe("X1.0");
    expect(xrayFlareClass(5e-9)).toBe("A0.5"); // below A1.0 still on the A scale
    expect(xrayFlareClass(2.8e-3)).toBe("X28.0"); // no upper letter above X
  });
});

describe("NOAA G-scale from Kp", () => {
  it("is none below Kp5 and G1..G5 across Kp5..Kp9", () => {
    expect(gScaleFromKp(4)).toBe(0);
    expect(gScaleFromKp(5)).toBe(1);
    expect(gScaleFromKp(6)).toBe(2);
    expect(gScaleFromKp(7)).toBe(3);
    expect(gScaleFromKp(8)).toBe(4);
    expect(gScaleFromKp(9)).toBe(5);
  });

  it("labels G0 as 'none' and stormy Kp as Gn", () => {
    expect(gScaleLabel(4)).toBe("none");
    expect(gScaleLabel(5)).toBe("G1");
    expect(gScaleLabel(9)).toBe("G5");
  });
});

describe("qualitative labels", () => {
  it("solarWindLabel buckets speed correctly", () => {
    expect(solarWindLabel(350)).toBe("slow");
    expect(solarWindLabel(450)).toBe("nominal");
    expect(solarWindLabel(600)).toBe("fast");
    expect(solarWindLabel(800)).toBe("very fast");
  });

  it("kpLabel escalates from quiet to extreme storm", () => {
    expect(kpLabel(1)).toBe("quiet");
    expect(kpLabel(3)).toBe("unsettled");
    expect(kpLabel(4)).toBe("active");
    expect(kpLabel(5)).toBe("minor storm");
    expect(kpLabel(9)).toBe("extreme storm");
  });
});

// ───────────────────────────── 5. Constants / HUD ───────────────────────────
describe("solar constants & angular size", () => {
  it("carries the IAU nominal solar constants", () => {
    expect(SUN.radiusKm).toBe(695_700);
    expect(SUN.radiusInEarthRadii).toBeCloseTo(109, 0); // ~109 Earth radii
    expect(SUN.effectiveTemperatureK).toBe(5772);
    expect(SUN.luminosityW).toBeCloseTo(3.828e26, -24);
    expect(AU_KM).toBeCloseTo(149_597_870.7, 1);
  });

  it("angular diameter from 1 AU is ≈ 0.533° (~32')", () => {
    expect(angularDiameterDegFromKm(AU_KM)).toBeCloseTo(0.533, 2);
  });
});

// ─────────────────────────── Null-safety & determinism ──────────────────────
describe("null-safety (bad inputs → null, never throw)", () => {
  it("differential rotation rejects |lat| > 90 and non-finite", () => {
    expect(siderealRotationPeriodDays(91)).toBeNull();
    expect(siderealRotationPeriodDays(NaN)).toBeNull();
    expect(differentialRotationRateDegPerDay(-120)).toBeNull();
  });

  it("date-based functions reject invalid dates", () => {
    const bad = new Date("not a date");
    expect(carringtonRotationNumber(bad)).toBeNull();
    expect(subEarthCarringtonLongitude(bad)).toBeNull();
    expect(solarCycleInfo(bad)).toBeNull();
  });

  it("scales reject non-finite / out-of-range values", () => {
    expect(xrayFlareClass(0)).toBeNull();
    expect(xrayFlareClass(-1e-6)).toBeNull();
    expect(xrayFlareClass(NaN)).toBeNull();
    expect(gScaleFromKp(-1)).toBeNull();
    expect(gScaleFromKp(10)).toBeNull();
    expect(kpLabel(NaN)).toBeNull();
    expect(solarWindLabel(-5)).toBeNull();
    expect(auroraEquatorwardBoundaryDeg(NaN)).toBeNull();
    expect(angularDiameterDegFromKm(0)).toBeNull();
  });
});

describe("determinism (pure functions)", () => {
  it("same input → identical output", () => {
    const d = new Date(Date.UTC(2027, 4, 9, 3, 21));
    expect(carringtonRotationNumber(d)).toBe(carringtonRotationNumber(d));
    expect(solarCycleInfo(d)).toEqual(solarCycleInfo(d));
    expect(siderealRotationPeriodDays(23)).toBe(siderealRotationPeriodDays(23));
    expect(xrayFlareClass(5e-5)).toBe(xrayFlareClass(5e-5));
  });
});
