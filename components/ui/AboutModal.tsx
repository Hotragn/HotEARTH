"use client";

import { useEffect } from "react";
import { ArrowUpRight, X } from "@phosphor-icons/react";
import { GIBS_LAYERS } from "@/lib/gibs";

/**
 * The honesty panel. Every number and pixel in the app traces to a source
 * listed here (physics-env-simulation skill: real physics and real data, or
 * it doesn't ship).
 */
export default function AboutModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-abyss/70 p-4 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
        className="hud-panel flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl animate-hud-in"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5 sm:p-6">
          <div>
            <h2
              id="about-title"
              className="font-display text-xl font-medium tracking-tight text-ice"
            >
              What you are looking at
            </h2>
            <p className="mt-1 text-sm text-dim">
              Real data or documented physics. Nothing invented.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close about panel"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:bg-white/5 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <X size={17} weight="light" aria-hidden />
          </button>
        </div>

        <div className="hud-scroll overflow-y-auto p-5 text-sm leading-relaxed text-dim sm:p-6">
          <p>
            H.O.T Earth is an open digital twin of the planet. Phase 1 is this
            globe: real satellite imagery, a physically computed day/night
            terminator, and live point forecasts anywhere you click.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Imagery — NASA GIBS / Worldview
          </h3>
          <ul className="mt-2 space-y-2">
            {GIBS_LAYERS.map((l) => (
              <li key={l.slug}>
                <span className="text-ice">{l.title}</span> —{" "}
                <span className="font-mono text-xs text-dim">{l.gibsId}</span>
                <span className="text-faint">
                  {" "}
                  · daily, lags ~{l.typicalLagDays} day
                  {l.typicalLagDays > 1 ? "s" : ""}
                </span>
              </li>
            ))}
            <li>
              <span className="text-ice">Base day map</span> —{" "}
              <span className="font-mono text-xs text-dim">
                BlueMarble_ShadedRelief_Bathymetry
              </span>
              <span className="text-faint"> · static composite</span>
            </li>
            <li>
              <span className="text-ice">Night lights</span> —{" "}
              <span className="font-mono text-xs text-dim">
                VIIRS_Black_Marble
              </span>
              <span className="text-faint">
                {" "}
                · 2016 composite, not live
              </span>
            </li>
          </ul>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Day / night terminator
          </h3>
          <p className="mt-2">
            Computed, not imagery: NOAA solar position algorithm (solar
            declination + equation of time) gives the subsolar point for the
            displayed time; the shader blends day to night through a real
            twilight band down to -12° solar elevation. Unit-tested against
            solstice and equinox values.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Forecasts
          </h3>
          <p className="mt-2">
            Point forecasts come from the Open-Meteo API (CC-BY 4.0) and are
            labeled as such. They are Open-Meteo&apos;s weather models — we make
            no forecast claims of our own in this phase.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Wind particles
          </h3>
          <p className="mt-2">
            Real measured-model wind: the latest NOAA/NCEP GFS 1° analysis of
            10 m u/v components (public domain), refreshed every 6 h by a
            pipeline in this repo. Particles are advected by bilinear
            interpolation of that grid; only the animation speed is
            exaggerated (~15 h of wind per second) so motion is visible at
            globe scale. Brightness maps to real wind speed.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Living Earth cities
          </h3>
          <p className="mt-2">
            The 1,200 most populous places from Natural Earth (public
            domain), lit by the same computed solar terminator. The pulsing
            &quot;activity&quot; of each city is a simulation driven by real
            local solar time, day of week and population — clearly labeled,
            never presented as measured data. City weather is live
            Open-Meteo.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Mars — real orbital mechanics
          </h3>
          <p className="mt-2">
            The Mars tab runs the NASA GISS <span className="text-ice">Mars24</span>{" "}
            algorithm (Allison &amp; McEwen 2000): areocentric solar longitude
            (Ls) and season, Mars Sol Date, Coordinated Mars Time, and a
            physically computed day/night terminator from the Mars subsolar
            point — unit-tested against the Mars24 worked example and known
            landing dates. The dust-storm indicator is a{" "}
            <span className="text-ice">climatological season</span> (Ls
            180–360, peak ~240–300), not a prediction of any specific storm. If
            a seasonal climatology dataset is present it is plotted as seasonal
            averages, clearly labeled — never as a live forecast. The seasonal
            surface-pressure plot is real measured Viking Lander data (the ~30%
            annual CO₂ condensation cycle), shown as a seasonal climatology by
            Ls. Terrain is the NASA/JPL/USGS Viking MDIM 2.1 colorized global
            mosaic (public domain).
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Moon — no weather, real geometry
          </h3>
          <p className="mt-2">
            The Moon has essentially no atmosphere, so there is{" "}
            <span className="text-ice">no weather</span> — no wind, clouds,
            precipitation, pressure or storms, and we invent none. What is real
            and dynamic is geometry. Lunar{" "}
            <span className="text-ice">phase, illuminated fraction and the
            day/night terminator</span>{" "}
            are computed client-side from Meeus lunar theory (the Moon analogue
            of Earth&apos;s NOAA terminator and Mars&apos; Mars24 clock), no
            runtime API. <span className="text-ice">Optical libration</span> —
            the Moon&apos;s monthly nod, up to ±~7.9° in longitude and ±~6.9° in
            latitude — is computed the same way; it is why an Earth observer sees
            ~59% of the surface over time, not just 50%. Surface temperature is
            the flagship measured signal: the ~300 K day-night swing (equatorial
            ~392 K at noon, ~95 K before dawn; polar cold traps 25–40 K) from
            NASA&apos;s <span className="text-ice">LRO Diviner</span> radiometer
            (Williams et al. 2017) — shown as a model anchored to those
            measurements (day = radiative equilibrium, night = Diviner-anchored),
            never as a live sensor feed. The basemap is the public-domain LROC
            WAC mosaic (NASA SVS / LROC / ASU); no science is claimed from it.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Virtual Earth — the time machine
          </h3>
          <p className="mt-2">
            A deep-zoomable Earth played through history. The city layer is{" "}
            <span className="text-ice">real data</span>: 1,730 settlements from
            Reba, Reitsma &amp; Seto (2016), &quot;6,000 years of global
            urbanization&quot; (CC-BY 4.0) — cities appear at their founding and
            grow with recorded population. The shifting night sky is{" "}
            <span className="text-ice">computed</span> axial precession (IAU
            2006 constants, uniform single-term model; ~25,772-year cycle). World population, dated events (incl. the
            World Wars, at real coordinates) and industrial-era climate are
            built-in historical estimates, labeled as such. The optional{" "}
            <span className="text-ice">Era Scenes</span> overlay is explicitly
            marked artistic — procedurally generated, not data.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            ISS tracker — real orbit, propagated live
          </h3>
          <p className="mt-2">
            The ISS Tracker (the fourth Earth-group world) shows the real
            International Space Station orbiting Earth live.{" "}
            <span className="text-ice">Measured:</span> a real{" "}
            <span className="text-ice">orbital element set (TLE)</span> for
            catalog #25544 — a US Space Force / 18th Space Defense Squadron
            product redistributed by <span className="text-ice">CelesTrak</span>,
            public domain. A committed mirror is refreshed twice daily; the tab
            also attempts one optional live refresh from CelesTrak
            (CORS-enabled), falling back to the committed set on any failure.{" "}
            <span className="text-ice">Computed:</span> everything you see — the
            sub-satellite point, altitude (~420 km), inertial speed (~7.66 km/s),
            orbital period (~93 min), the ground track (split at the antimeridian),
            the footprint circle, whether the station is sunlit or in Earth&apos;s
            shadow, and the visible passes over your location — is propagated by{" "}
            <span className="text-ice">SGP4 via satellite.js</span> (MIT), the
            standard NORAD analytic model, not a reinvented one. The day/night
            terminator is the same NOAA solar geometry as the Earth tab.
          </p>
          <p className="mt-2">
            <span className="text-ice">Honesty on scale:</span> the ISS orbits at
            only ~1.07 Earth radii, so at{" "}
            <span className="text-ice">true scale</span> (the default) it hugs the
            globe — a real, striking fact, not a bug. An optional, clearly-labelled
            toggle exaggerates the altitude for visibility. The{" "}
            <span className="text-ice">TLE epoch and age</span> are shown
            prominently because SGP4 accuracy is ~1 km near the element epoch and
            degrades ~1–3 km/day; a week-old TLE can be tens of km off. A pass is
            flagged <span className="text-ice">naked-eye visible</span> only when
            the station is sunlit while the observer&apos;s sky is dark (below
            civil twilight) — the real &quot;Spot the Station&quot; criterion;
            daytime and shadow passes are labelled not visible. An optional
            independent live sub-point from{" "}
            <span className="text-ice">wheretheiss.at</span> is cross-checked
            against our own SGP4 position, and any large divergence is surfaced as
            TLE age, never hidden.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Orbital data: US
            Space Force (18 SDS) via CelesTrak (celestrak.org) — US-Government
            work, public domain (17 U.S.C. 105). Propagation: SGP4 via
            satellite.js (MIT). Live sub-point cross-check: wheretheiss.at. Earth
            imagery: NASA Blue Marble / Black Marble (public domain), as on the
            Earth tab.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Solar System — other planets
          </h3>
          <p className="mt-2">
            The orrery places all eight planets at their{" "}
            <span className="text-ice">real heliocentric longitudes</span>,
            computed from JPL&apos;s approximate-positions Keplerian elements
            (Standish, 1800–2050). Angular positions and relative orbital speeds
            are physical; only the radial distances are log-compressed so every
            orbit fits on screen — the app says so on the control. The six
            detail globes (Mercury, Venus, Jupiter, Saturn, Uranus, Neptune) use
            real textures, a computed day/night terminator, and each body&apos;s{" "}
            <span className="text-ice">real axial tilt</span> — Uranus is drawn
            tipped 98° onto its side, Venus and Uranus spin retrograde. Most of
            these worlds have{" "}
            <span className="text-ice">no measurable weather</span>, so we invent
            none: the honest dynamic signals are Mercury&apos;s measured
            day/night temperature extremes, Venus&apos; cloud-top{" "}
            <span className="text-ice">super-rotation</span> (~100 m/s,
            illustrated), the MEASURED gas/ice-giant{" "}
            <span className="text-ice">zonal-wind profiles</span> (Jupiter —
            Barrado-Izagirre et al. 2013; Saturn — García-Melendo et al. 2011;
            Neptune — Sromovsky et al. 1993), Saturn&apos;s rings (drawn from
            occultation-measured radii) and north-polar hexagon, and
            Neptune&apos;s record winds. Neptune&apos;s Great Dark Spot is
            labelled <span className="text-ice">transient</span> (GDS-89 was gone
            by 1994) and is not drawn. Textures for Saturn, Uranus, Neptune and
            Saturn&apos;s rings are by{" "}
            <span className="text-ice">Solar System Scope (solarsystemscope.com),
            CC BY 4.0</span>; Mercury, Venus and Jupiter use public-domain
            NASA/JPL/USGS imagery.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Major moons — orbital mechanics, not weather
          </h3>
          <p className="mt-2">
            The Moons tab covers the major satellites of the giant planets. Each
            parent has a{" "}
            <span className="text-ice">mini-orrery</span>: the moons sit at their
            real orbital angles (from their JPL sidereal periods), so inner moons
            whip around while outer ones amble and{" "}
            <span className="text-ice">Triton visibly orbits retrograde</span> —
            only the radial distances are log-compressed so each system fits on
            screen (the app says so). Jupiter&apos;s Galileans carry a live{" "}
            <span className="text-ice">Laplace-resonance</span> callout: Io :
            Europa : Ganymede orbital periods lock to ≈ 1 : 2 : 4, computed from
            the period table, not asserted. Every major moon here is{" "}
            <span className="text-ice">tidally locked</span>, so its detail globe
            keeps one face to the parent and the day/night terminator is a real
            computed sub-solar sweep (lib/moons), not imagery. The core numbers
            (radius, period, distance, temperature, albedo) are JPL SSD satellite
            parameters; the per-moon feature facts are{" "}
            <span className="text-ice">measured by spacecraft</span> and cited
            individually, with genuinely debated items (Europa/Callisto/Mimas
            oceans, Europa plumes) flagged as such. Most of these worlds have{" "}
            <span className="text-ice">no weather</span>, so we invent none. The
            single exception is <span className="text-ice">Titan</span>, whose
            real methane cycle (clouds, rain, rivers, north-polar seas — Cassini/
            Huygens) is presented as the weather it is. Texture honesty is
            surfaced per moon: Titan&apos;s map is a Cassini{" "}
            <span className="text-ice">near-IR surface map that sees through the
            haze</span> (not the orange visible atmosphere); Triton&apos;s{" "}
            <span className="text-ice">northern hemisphere is USGS synthetic
            interpolation</span> (Voyager 2 imaged only one hemisphere in 1989);
            Europa and Callisto are grayscale mosaics (no colour implied). All
            moon maps this phase are public domain (NASA / JPL / USGS).
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Jupiter&apos;s Moons — computed events, real geometry
          </h3>
          <p className="mt-2">
            The Jupiter&apos;s Moons tab predicts the mutual events of the four
            Galilean satellites (Io, Europa, Ganymede, Callisto) against
            Jupiter&apos;s disk. <span className="text-ice">Computed:</span> each
            moon&apos;s apparent position relative to Jupiter, and every{" "}
            <span className="text-ice">transit</span> (moon in front of the disk),{" "}
            <span className="text-ice">shadow transit</span> (its shadow on the
            cloud tops), <span className="text-ice">occultation</span> (moon behind
            the disk) and <span className="text-ice">eclipse</span> (moon in
            Jupiter&apos;s shadow), come from a published algorithm, Meeus,{" "}
            <span className="text-ice">Astronomical Algorithms</span> (2nd ed.),
            Chapter 44 (the low-accuracy method, from Lieske&apos;s E5 / Sampson
            theory), implemented in our own code with no runtime API, the same
            posture as Mars24, SGP4 and the Meeus lunar theory. A moon and its
            shadow are offset on the disk because the Sun and Earth view Jupiter
            from slightly different directions (the Sun-Jupiter-Earth phase angle):
            the gap is near zero at opposition and widest near quadrature, and that
            geometry is the point of the tab. Jupiter&apos;s sky position (whether
            it is above your horizon) is computed the same way.
          </p>
          <p className="mt-2">
            <span className="text-ice">Accuracy, stated:</span> the low-accuracy
            method places the moons to about a tenth of a Jupiter radius, so transit
            and occultation times are good to about a minute and eclipse and
            shadow-transit times can differ by a few minutes near quadrature. These
            are real, observable events (a shadow transit is a crisp black dot
            amateurs watch in small telescopes), but for critical or
            observing-grade timing the tab points to{" "}
            <span className="text-ice">JPL Horizons</span> and does not claim
            second-level precision. <span className="text-ice">Reused / real:</span>{" "}
            the Jupiter disk (NASA/JPL/SSI Cassini map, a snapshot, the belts
            drift) and the four moon maps (USGS Galileo/Voyager mosaics; Io and
            Ganymede color, Europa and Callisto grayscale) are the same
            public-domain textures from earlier phases, no new download.{" "}
            <span className="text-ice">Illustrative:</span> real Galilean moons are
            only ~1 arcsec across against Jupiter&apos;s ~40 arcsec, so the on-screen
            markers are enlarged for visibility (the positions and timings are to
            scale), and a toggle shows their true angular size.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Saturn&apos;s Moons — ring geometry and seasonal events
          </h3>
          <p className="mt-2">
            The Saturn&apos;s Moons tab is the twin of the Jupiter one, but its
            headline is <span className="text-ice">seasonality</span>. Saturn&apos;s
            seven major moons (Mimas, Enceladus, Tethys, Dione, Rhea, Titan,
            Iapetus) orbit in Saturn&apos;s equatorial plane, which is the ring
            plane, so they only cross in front of the disk (transit), pass behind it
            (occultation) or cast a shadow on the cloud tops (shadow transit) during
            the season around each <span className="text-ice">ring-plane
            crossing</span>, which recurs only about every 15 years. The last was{" "}
            <span className="text-ice">2025-05-06</span>; the rings are opening again
            toward the next, around <span className="text-ice">2038-2039</span>. That
            is why the events list is usually short right now, and the tab says so
            rather than faking events. <span className="text-ice">Computed:</span>{" "}
            each moon&apos;s apparent position is Kepler propagation of real JPL SSD
            &quot;Planetary Satellite Mean Orbital Elements&quot; (SAT441, J2000),
            rotated by Saturn&apos;s IAU pole into the plane of sky (via lib/planets
            for Saturn&apos;s geocentric direction), so the moons string along the
            same tilted ellipse as the rings. The ring opening geometry (B toward
            Earth, B&apos; toward the Sun, position angle P and the apparent ring
            axes) is the published{" "}
            <span className="text-ice">Meeus, Astronomical Algorithms</span> (2nd
            ed.), Chapter 45 method, validated against the book&apos;s 1992-12-16
            worked example. The four phenomena are tested against Saturn&apos;s{" "}
            <span className="text-ice">oblate</span> disk (Saturn is the most oblate
            planet, ~10% flattened), and the events panel is our own coarse
            client-side scan of those positions.
          </p>
          <p className="mt-2">
            <span className="text-ice">Accuracy, stated:</span> Kepler from mean
            elements ignores nodal and apsidal precession (Saturn&apos;s J2 and
            Titan), so positions are good to a fraction of a Saturn radius near
            J2000 and degrade over years; the event windows come from a coarse
            10-minute scan, so short events can be missed and timing is approximate.{" "}
            <span className="text-ice">Iapetus is the least accurate</span> (large,
            tilted, precessing Laplace-plane orbit). For observing-grade timing the
            tab points to <span className="text-ice">JPL Horizons</span> and{" "}
            <span className="text-ice">IMCCE PHESAT</span> and claims no
            second-level precision. <span className="text-ice">Reused / real:</span>{" "}
            Saturn and its rings use{" "}
            <span className="text-ice">Solar System Scope (solarsystemscope.com),
            CC BY 4.0</span> textures (an attribution obligation, credited here, in
            the ring panel and in the footer; the cloud map is artist-tuned and
            drawn as an unlit snapshot), and the seven moon disks are public-domain
            NASA/JPL/USGS/SSI Cassini global mosaics (Titan&apos;s is a near-IR,
            938 nm haze-penetrating product, not its visible orange atmosphere;
            Iapetus carries its real two-tone albedo).{" "}
            <span className="text-ice">Illustrative:</span> real Saturn moons are
            tiny against the disk and rings, so the on-screen markers are enlarged
            for visibility (positions and timings are to scale), with a toggle for
            their true angular size.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Other Moons — a configuration view, not an events clock
          </h3>
          <p className="mt-2">
            The Other Moons tab combines the major moons of{" "}
            <span className="text-ice">Mars</span> (Phobos, Deimos),{" "}
            <span className="text-ice">Uranus</span> (Miranda, Ariel, Umbriel,
            Titania, Oberon) and <span className="text-ice">Neptune</span> (Triton,
            Proteus, Nereid) behind a planet selector. Its most important honest
            caveat leads: unlike Jupiter, these three planets show{" "}
            <span className="text-ice">tiny disks</span> from Earth (Mars ~4 to
            25 arcsec, Uranus ~3.7 arcsec, Neptune ~2.3 arcsec), so a moon
            transiting the disk, casting a shadow on it, or being occulted is{" "}
            <span className="text-ice">rare to effectively unobservable</span>. So
            the tab is a <span className="text-ice">live configuration view</span>,
            not a shadow-transit clock, and it says so. The four phenomenon flags
            are still computed and shown honestly (usually empty), and a coarse
            forward scan is labeled approximate and expected near-empty.{" "}
            <span className="text-ice">Computed:</span> each moon&apos;s apparent
            position is Kepler propagation of real JPL SSD &quot;Planetary Satellite
            Mean Orbital Elements&quot; (Mars set MAR099, the Uranus equatorial set,
            and the Neptune set with Nereid&apos;s eccentric ecliptic-frame orbit),
            oriented by each planet&apos;s IAU WGCCRE pole into the plane of sky (via
            lib/planets for the planet&apos;s geocentric direction), so the close-in
            moons string along the tilted equatorial ellipse. The genuinely striking
            geometry is real, measured and computed: Uranus tipped{" "}
            <span className="text-ice">~98 degrees</span> with its opening swinging
            across the ~84-year season (edge-on 2007, next ~2049), Triton orbiting
            Neptune <span className="text-ice">retrograde</span> (the only large
            retrograde moon), Nereid&apos;s wild eccentricity (e = 0.75), and Phobos
            circling Mars in <span className="text-ice">~7.65 hours</span>, below
            synchronous height, so it rises in the west and is slowly spiraling in.
          </p>
          <p className="mt-2">
            <span className="text-ice">Accuracy, stated:</span> Kepler from mean
            elements reproduces the live layout near the element epoch and degrades
            away from it; this is not observing-grade timing.{" "}
            <span className="text-ice">Triton and Nereid are the least accurate</span>{" "}
            (Triton&apos;s Laplace plane is tilted from Neptune&apos;s equator;
            Nereid is an ecliptic-frame, 2020-epoch, extreme-eccentricity orbit),
            and the tab points to <span className="text-ice">JPL Horizons</span> for
            critical cross-checks and claims no second-level precision.{" "}
            <span className="text-ice">Reused / real:</span> the Uranus and Neptune
            disks use{" "}
            <span className="text-ice">Solar System Scope (solarsystemscope.com),
            CC BY 4.0</span>{" "}
            textures (an attribution obligation, credited here and in the footer;
            stylized, drawn as unlit snapshots, since no public-domain map exists for
            either ice giant); the Mars disk is the NASA/USGS MOLA map (public
            domain, color = elevation, not a visible photo); and Triton plus the
            seven new Phobos, Deimos and Uranian-moon maps are public-domain
            Viking/Voyager mosaics (Phobos and Deimos are irregular bodies, so the
            sphere is an approximation; the five Uranian maps cover mainly the
            southern hemispheres with northern gaps; Triton&apos;s northern
            hemisphere is a synthetic fill).{" "}
            <span className="text-ice">Illustrative:</span> Proteus and Nereid have
            no map and are clearly-labeled tinted spheres, and the on-screen moon
            markers are enlarged for visibility (the positions are to scale) with a
            true-size toggle.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Dwarf Moons — a configuration view, in two honest tiers
          </h3>
          <p className="mt-2">
            The Dwarf Moons tab combines the moon systems of{" "}
            <span className="text-ice">Pluto</span> (Charon, Styx, Nix, Kerberos,
            Hydra), <span className="text-ice">Eris</span> (Dysnomia),{" "}
            <span className="text-ice">Haumea</span> (Hiʻiaka, Namaka, plus its ring)
            and <span className="text-ice">Makemake</span> (MK2) behind a system
            selector. Ceres is the fifth dwarf planet but has no moons, so it does
            not appear. Two honest ideas lead the tab and are made unmissable in the
            UI. First, this is a{" "}
            <span className="text-ice">configuration view, not an events tab</span>:
            these systems are effectively{" "}
            <span className="text-ice">unresolvable from Earth</span> (Pluto&apos;s
            disk is only about 0.1 arcsec across, the moons far fainter), so nothing
            here is an observable transit, shadow or occultation. The one historical
            exception was the Pluto-Charon mutual events, visible in 1985-1990 when
            the orbit was edge-on and again around 2103, which fall straight out of
            the geometry. Second, the data splits into{" "}
            <span className="text-ice">two tiers that are never blurred</span>:{" "}
            <span className="text-ice">Pluto carries real along-orbit positions</span>{" "}
            (full cited mean elements, Brozovic &amp; Jacobson 2024), while Eris,
            Haumea and Makemake show a{" "}
            <span className="text-ice">real orbit with an illustrative
            along-orbit phase</span> (the orbit size, shape, period and inclination
            are real and cited, but the absolute phase and node are an adopted
            convention, since no full ephemeris is published for those moons). Every
            moon is badged accordingly, and Makemake&apos;s MK2 carries an extra{" "}
            <span className="text-ice">orbit poorly constrained</span> flag (seen
            near edge-on in few detections, Parker et al. 2016).
          </p>
          <p className="mt-2">
            The headline is the{" "}
            <span className="text-ice">Pluto-Charon binary</span>. Charon is about
            12.2% of Pluto&apos;s mass, so the barycenter sits about 2128 km from
            Pluto&apos;s centre, <span className="text-ice">outside</span>{" "}
            Pluto&apos;s 1188 km radius: both bodies orbit a point in empty space,
            drawn here with a marked barycenter at the centre and the real wobble as
            you play or scrub. <span className="text-ice">Computed:</span> each
            moon&apos;s apparent position is Kepler propagation of the published mean
            elements, projected into the plane of sky (Pluto&apos;s moons oriented by
            Pluto&apos;s IAU pole), with the parent bodies&apos; real sky positions
            reused from lib/dwarf-planets (JPL SBDB), so the parent RA/Dec, distance
            and horizon check are real for all four. Sources: Brozovic &amp; Jacobson
            (2024) for Pluto, Holler et al. (2021) for Dysnomia, Ragozzine &amp;
            Brown (2009) for Haumea&apos;s moons, Ortiz et al. (2017) for
            Haumea&apos;s ring and shape, and Parker et al. (2016) for MK2.{" "}
            <span className="text-ice">Reused / real:</span> only Pluto and Charon
            carry surface maps, the public-domain New Horizons global mosaics
            (NASA/JHUAPL/SwRI). <span className="text-ice">Illustrative:</span> every
            other body is a clearly-labeled tinted sphere (Haumea&apos;s triaxial egg
            shape and its ring are illustrative geometry from the measured
            dimensions), and the on-screen markers are enlarged for visibility, with
            a true-size toggle for their honest, tiny angular size. For anything
            critical, cross-check <span className="text-ice">JPL Horizons</span>.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Dwarf planets — orbital mechanics, not weather
          </h3>
          <p className="mt-2">
            The Dwarfs tab covers the five IAU dwarf planets (Ceres, Pluto,
            Haumea, Makemake, Eris) plus Pluto&apos;s moon Charon. The{" "}
            <span className="text-ice">mini-orrery</span> places each on its real,
            eccentric orbit (from JPL Small-Body Database elements), at its real
            heliocentric longitude, so relative speeds are physical — only the
            radial distance is log-compressed so Ceres (~2.8 AU) and Eris (~68 AU)
            fit together (the control says so). Neptune&apos;s orbit is drawn as
            the trans-Neptunian reference ring, and Pluto&apos;s traced orbit
            visibly crosses it: Pluto&apos;s{" "}
            <span className="text-ice">3:2 mean-motion resonance</span> with
            Neptune is computed from the period table, not asserted. Each detail
            globe carries a real, computed day/night terminator that sweeps at the
            body&apos;s real rotation rate. Dwarf planets have{" "}
            <span className="text-ice">no weather</span>, so we invent none. Only
            three have ever been imaged up close, so only three have real maps:
            Pluto and Charon (New Horizons, 2015) and Ceres (Dawn, 2015–2018),
            shown as grayscale albedo mosaics (real data, not colourised; the
            single-flyby Pluto/Charon far sides are lower-resolution).{" "}
            <span className="text-ice">Eris, Haumea and Makemake have never been
            visited</span> — there is no surface map, so they are rendered as
            clearly-labelled illustrative spheres, never implying real imagery.
            Haumea is the exception worth the caveat: its{" "}
            <span className="text-ice">triaxial ellipsoid shape</span>{" "}
            (~2100×1680×1074 km, forced by a ~3.9 h spin) and its{" "}
            <span className="text-ice">ring</span> (the first found around a
            trans-Neptunian object, Ortiz et al. 2017) are real, measured geometry
            even though its surface colour is illustrative. Charon shows the
            Pluto–Charon <span className="text-ice">binary</span> (the barycenter
            lies outside Pluto). Core numbers are JPL SBDB / mission values; the
            per-body measured facts are cited individually (Stern et al. 2015,
            Moore et al. 2016, Gladstone et al. 2016, Grundy et al. 2016, Nathues
            2015 / De Sanctis et al. 2016, Sicardy et al. 2011, Ortiz et al.
            2017/2012), with genuinely uncertain items (Eris and Makemake rotation
            periods) flagged. All dwarf maps this phase are public domain.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Comets & asteroids — real orbits, factual hazards
          </h3>
          <p className="mt-2">
            The Comets &amp; Asteroids tab draws real comet and near-Earth-asteroid
            orbits from the <span className="text-ice">JPL Small-Body Database</span>{" "}
            around the Sun, with the planet orbits (Mercury→Jupiter) for reference.
            Every orbital element and physical parameter is a measured SBDB value;
            the classification (near-Earth group, comet family, Tisserand) is
            computed. Bound bodies trace{" "}
            <span className="text-ice">closed ellipses</span>; the hyperbolic and
            interstellar visitors —{" "}
            <span className="text-ice">1I/&apos;Oumuamua</span> and{" "}
            <span className="text-ice">2I/Borisov</span> — trace{" "}
            <span className="text-ice">open arcs</span>, labelled unbound. Radial
            distances are log-compressed (comet aphelia reach tens–thousands of AU)
            and, because the catalogue carries no epoch anchor, bodies are marked at
            perihelion rather than at a faked live position; comet tails are
            illustrative anti-sunward cues, not photometry.
          </p>
          <p className="mt-2">
            Hazard facts are stated plainly, never sensationalised. The{" "}
            <span className="text-ice">Potentially Hazardous Asteroid</span> (PHA)
            flag is the CNEOS definition — Earth MOID ≤ 0.05 AU and absolute
            magnitude H ≤ 22 — reported as the classification it is. The
            close-approach panel lists real CNEOS distances in lunar distances and
            km. <span className="text-ice">Apophis</span>&apos;s 13 April 2029 pass
            is a real close approach — about 31,600 km above Earth&apos;s surface
            (~0.099 lunar distances), bright enough to see with the naked eye — and
            its 2029 / 2036 / 2068 impact scenarios were{" "}
            <span className="text-ice">ruled out</span> after 2021 radar tracking;
            NASA removed Apophis from the Sentry risk list.
          </p>
          <p className="mt-2">
            Appearances follow the honesty rule. Most small bodies have never been
            imaged, so they are{" "}
            <span className="text-ice">illustrative procedural rocks</span>,
            labelled. A few carry real imagery: Eros, Vesta and Bennu as
            equirectangular NASA/USGS mosaics wrapped on a slightly-irregular sphere
            (public domain, shape approximated); Gaspra, Ida, Didymos and{" "}
            67P/Churyumov-Gerasimenko as flat single-view mission photos in the
            detail panel, not wrapped on a sphere. The 67P photo is{" "}
            <span className="text-ice">ESA/Rosetta/NAVCAM, CC BY-SA 3.0 IGO</span>;
            the others are NASA public domain.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Orbits, physical
            parameters and close approaches: NASA/JPL Small-Body Database (SBDB) and
            CNEOS Close-Approach Data — US-Government (NASA/JPL-Caltech) data, freely
            usable; courtesy credit given. Real imagery: NASA / JPL / USGS public
            domain for Eros, Vesta, Bennu, Gaspra, Ida and Didymos (NEAR, Dawn,
            OSIRIS-REx, Galileo, DART). 67P/Churyumov-Gerasimenko photo:{" "}
            ESA/Rosetta/NAVCAM, CC BY-SA 3.0 IGO.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Asteroid Moons: real binary systems, and the comet truth
          </h3>
          <p className="mt-2">
            The Asteroid Moons tab shows the real binary and multiple{" "}
            <span className="text-ice">asteroid</span> systems behind a selector:{" "}
            <span className="text-ice">Didymos</span> and Dimorphos,{" "}
            <span className="text-ice">Ida</span> and Dactyl, the first triple{" "}
            <span className="text-ice">Sylvia</span> (Romulus, Remus), the dog-bone{" "}
            <span className="text-ice">Kleopatra</span> (Alexhelios, Cleoselene), the
            near-equal doubles <span className="text-ice">Antiope</span> and the
            Jupiter Trojan <span className="text-ice">Patroclus</span> and Menoetius,{" "}
            <span className="text-ice">Kalliope</span> and Linus, and{" "}
            <span className="text-ice">Eugenia</span>. The headline honest point leads:{" "}
            <span className="text-ice">comets have no moons</span>. There are zero
            confirmed comet satellites (a nucleus is too small to hold one), so the tab
            invents none. The closest phenomenon, a{" "}
            <span className="text-ice">contact binary</span> (comet 67P, the KBO
            Arrokoth), is one body of two touching lobes, not a moon, and a fragmenting
            comet (73P, Shoemaker-Levy 9) sheds fragments, not moons. The tab says all
            of this plainly.
          </p>
          <p className="mt-2">
            Unlike the Dwarf Moons tab, this is a{" "}
            <span className="text-ice">schematic, face-on mutual-orbit view</span>, not
            a plane-of-sky projection: these systems are unresolvable from Earth and
            were measured only by radar, adaptive optics or spacecraft, and their
            mutual-orbit poles are unknown, so there is no compass and no visibility
            claim. <span className="text-ice">Computed and real, to scale:</span> the
            body diameters, the mutual-orbit separations, the periods and the size
            ratios, from the cited primary papers (Thomas et al. 2023 and Daly et al.
            2023 for Didymos; Belton et al. 1996 for Ida; Marchis, Descamps, Merline,
            Margot and Brown for the others; NASA Lucy for Patroclus, a 2033 flyby
            target), cross-listed against Johnston&apos;s Archive. The highlight is the{" "}
            <span className="text-ice">DART period step change</span>: Dimorphos&apos;s
            orbit around Didymos shortened from 11.921 h to 11.372 h (about 32 minutes)
            after the 2022-09-26 impact, the first time humanity deliberately changed a
            celestial body&apos;s orbit, and scrubbing across that landmark flips the
            live period. ESA&apos;s Hera surveys the aftermath from 2026.{" "}
            <span className="text-ice">Illustrative:</span> the orbit&apos;s orientation
            in space and the along-orbit phase are an adopted convention for every
            system (never a real position on a date), Dactyl&apos;s orbit is
            additionally poorly constrained (single 1993 flyby), the tiniest moon
            markers are enlarged for visibility with a true-scale toggle, and every moon
            and un-mapped primary (Kleopatra&apos;s dog-bone included) is a labeled
            illustrative shape. <span className="text-ice">Reused / real:</span> only
            Didymos (NASA / JHU-APL, DART) and Ida (NASA / JPL, Galileo) carry a photo,
            both public-domain single-view images shown flat; comet 67P&apos;s photo,
            used only in the comet note, is{" "}
            <span className="text-ice">ESA/Rosetta/NAVCAM, CC BY-SA 3.0 IGO</span>.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Meteor showers — real catalog data, idealised rates
          </h3>
          <p className="mt-2">
            The Meteor Showers tab sits beside Comets &amp; Asteroids because a
            shower is the <span className="text-ice">debris of one of those bodies</span>:
            Earth ploughs through a stream shed by a comet or asteroid, and the
            particles&apos; parallel paths appear by perspective to diverge from a
            single point, the <span className="text-ice">radiant</span>.{" "}
            <span className="text-ice">Measured / catalog:</span> each shower&apos;s
            radiant RA/Dec (J2000), activity window, peak date, peak solar longitude,
            entry velocity (V∞) and parent body come from the{" "}
            <span className="text-ice">IAU Meteor Data Center</span> shower database
            (Jopek &amp; Kaňuchová 2017) and the{" "}
            <span className="text-ice">IMO Working List of Visual Meteor Showers</span>{" "}
            (2026 IMO Meteor Shower Calendar), cross-checked with the American Meteor
            Society. The radiants are plotted in the same J2000 celestial frame as the
            Night Sky.
          </p>
          <p className="mt-2">
            <span className="text-ice">ZHR is an idealised peak rate</span> — the
            zenithal hourly rate assumes the radiant at the zenith under a perfect,
            magnitude-6.5 dark sky, so real observed rates are{" "}
            <span className="text-ice">lower</span>. We say so everywhere and compute
            the honest first-order estimate — ZHR·sin(radiant altitude), scaled by an
            illustrative activity profile — for your location and time; a variable /
            outburst-driven shower carries no fixed ZHR and is labelled so, never
            invented. <span className="text-ice">Computed:</span> solar longitude
            λ☉, is-active / days-to-peak, the radiant&apos;s altitude and best
            viewing time, and the <span className="text-ice">moon phase at peak</span>{" "}
            (from the same Meeus lunar theory as the Moon tab) that tells you whether
            moonlight will wash the shower out. Peak dates{" "}
            <span className="text-ice">drift ~1 day per year</span>, so timing is
            keyed to solar longitude (stable), not the calendar. Parent bodies
            cross-link to Comets &amp; Asteroids only when that catalogue actually
            carries the object; the Geminids (asteroid 3200 Phaethon) and Quadrantids
            (asteroid 2003 EH1) are flagged as the unusual asteroid-parent cases.{" "}
            <span className="text-ice">Illustrative:</span> the drawn meteor streaks
            and the debris-stream diagram (real geometry, drawn particles).
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Shower catalog
            (radiants, solar longitude, velocity, parent bodies): IAU Meteor Data
            Center shower database — Jopek &amp; Kaňuchová (2017), Planet. Space Sci.
            143, 3. Activity windows, peak dates, ZHR and population index: IMO
            Working List of Visual Meteor Showers (2026 IMO Meteor Shower Calendar,
            ed. J. Rendtel) — facts used and credited; the IMO Calendar itself is not
            redistributed (its terms are restrictive). Cross-checked with the American
            Meteor Society meteor-shower calendar.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Sun & space weather — real forecasts, attributed
          </h3>
          <p className="mt-2">
            The Sun tab reconnects to the project&apos;s honest-forecasting theme:
            space weather is a genuine operational forecasting domain, so we show{" "}
            <span className="text-ice">NOAA SWPC&apos;s own measurements and
            forecasts</span> and attribute them. We visualize them; we do not
            predict. The disk is real{" "}
            <span className="text-ice">NASA/SDO full-disk imagery</span> in six
            wavelengths — AIA 171 (~600,000 K corona), 193 (~1.2 MK, coronal
            holes), 211 (~2 MK active regions) and 304 Å (~50,000 K chromosphere /
            prominences), plus HMI continuum (visible photosphere, sunspots) and
            the HMI magnetogram (line-of-sight magnetic field). These are{" "}
            <span className="text-ice">square snapshots of the Sun&apos;s
            Earth-facing side</span> — not equirectangular maps, not live (the
            corona changes hour to hour), and the AIA colours are false-colour by
            wavelength — so they are rendered as the observed disk, labelled with
            each image&apos;s real observation time. A single snapshot does not
            rotate, so the disk does not spin.
          </p>
          <p className="mt-2">
            <span className="text-ice">Measured</span> signals are fetched{" "}
            <span className="text-ice">live client-side from NOAA SWPC</span>{" "}
            (public domain, CORS-enabled), with a committed snapshot as a
            defensive fallback and a live / snapshot badge either way: solar-wind
            speed and IMF Bz/Bt (DSCOVR/ACE at L1), estimated planetary Kp with the
            NOAA G-scale, GOES X-ray flux with the A/B/C/M/X flare class, and
            monthly F10.7 and sunspot number.{" "}
            <span className="text-ice">Forecast</span> signals are SWPC&apos;s own
            model output, tagged as theirs: the{" "}
            <span className="text-ice">OVATION aurora nowcast</span> and the
            predicted Solar Cycle 25 curve.{" "}
            <span className="text-ice">Computed</span> values are labelled derived
            — the flare class from the GOES flux, the G-scale from Kp, and the
            rough auroral-oval latitude from Kp (a rule of thumb, approximate). The
            solar-cycle chart plots the observed monthly count against SWPC&apos;s
            predicted curve: Cycle 25 ran hotter than the 2019 panel forecast
            (~115), peaking ~161 around late 2024, shown truthfully. The body facts
            (radius ~109 R⊕ / 695,700 km, T_eff 5772 K, Carrington rotation,
            differential rotation ~24.5→34 d) are IAU-2015 constants and lib/sun
            geometry.
          </p>
          <p className="mt-2">
            <span className="text-ice">Sunspot honesty:</span> two counts exist. We
            display NOAA&apos;s own public-domain sunspot number, not the
            International Sunspot Number from WDC-SILSO, whose CC BY-NC
            (NonCommercial) license we cannot accept for this project.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Imagery: NASA/SDO and
            the AIA, EVE and HMI science teams (public domain). Space-weather data
            and forecasts: NOAA Space Weather Prediction Center (public domain,
            17 U.S.C. 105). SILSO sunspot data (CC BY-NC) was not used.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Exoplanets — measured data, illustrative worlds
          </h3>
          <p className="mt-2">
            The Exoplanets tab (the &quot;Beyond&quot; group) is a system explorer
            for real planetary systems around other stars. Every measured
            number — orbital period, semi-major axis, radius, mass, equilibrium
            temperature, insolation, discovery method/year and the host-star
            properties — is a{" "}
            <span className="text-ice">NASA Exoplanet Archive</span> value
            (Planetary Systems Composite Parameters table); a missing value is
            shown as &quot;not measured&quot;, never filled in. Masses from radial
            velocity are <span className="text-ice">minimum masses</span> (M·sin
            i) and labelled as such. The system architecture places planets on
            their real relative orbits — the order and relative speeds are
            physical, but the radial distances are log-compressed and the absolute
            orbital phase is unknown, so it is seeded illustratively (the app says
            so). The green{" "}
            <span className="text-ice">habitable zone</span> is computed, not
            measured: the Kopparapu et al. (2013) parametrization from the star&apos;s
            luminosity and temperature; composition classes come from the radius
            valley (Fulton et al. 2017). Crucially,{" "}
            <span className="text-ice">no exoplanet has been imaged in surface
            detail</span> — every planet&apos;s appearance here is an illustrative
            temperature/composition cue, not an observation. Even the seven{" "}
            <span className="text-ice">directly-imaged</span> planets (HR 8799 b/c/d/e,
            β Pic b/d, 51 Eri b) were captured only as unresolved points of light,
            not surface maps, and are labelled so. The honest substance is the
            measured parameters, the system architecture and the computed
            habitable zones.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> This research has
            made use of the NASA Exoplanet Archive, which is operated by the
            California Institute of Technology, under contract with the National
            Aeronautics and Space Administration under the Exoplanet Exploration
            Program. Primary citation: Christiansen et al. (2025), Planetary
            Science Journal. This catalogue also includes planets from the WASP
            (Wide Angle Search for Planets) survey — Butters et al. (2010).
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Night Sky — real stars, cultural figures
          </h3>
          <p className="mt-2">
            The Night Sky tab (the second &quot;Beyond&quot; world) is a real star
            map. <span className="text-ice">Measured:</span> about 9,000 stars at
            their real positions, apparent magnitudes, colours (B−V index),
            parallax distances and spectral types — the{" "}
            <span className="text-ice">HYG database v4.4</span> (compiled from
            Hipparcos, the Yale Bright Star Catalog and Gliese). Every star&apos;s
            direction on the celestial sphere is its real J2000 RA/Dec; its size
            comes from apparent magnitude and its colour is the real physical
            black-body colour of its temperature.{" "}
            <span className="text-ice">Computed:</span> the temperature from the
            B−V index (Ballesteros 2012) and the resulting colour, plus — in the{" "}
            <span className="text-ice">&quot;sky from your location&quot;</span>{" "}
            mode — the altitude/azimuth of every star for your latitude, longitude
            and time, from real local-sidereal-time astronomy (Meeus), so stars
            below your horizon are correctly hidden and the current LST is shown.{" "}
            <span className="text-ice">Cultural overlay:</span> the constellation
            stick figures. The stars are real measured objects, but the lines
            joining them into figures are a human construct (the modern IAU /
            Western set); other cultures draw the sky differently. The{" "}
            <span className="text-ice">Milky Way</span> backdrop is an ESO
            panorama in galactic coordinates, rotated into the equatorial frame
            using the standard IAU galactic pole (RA 192.859°, Dec +27.128°) and
            centre (RA 266.405°, Dec −28.936°) so its band registers with the real
            stars. <span className="text-ice">Messier</span> deep-sky objects
            (OpenNGC) are marked at their measured J2000 positions and coloured by
            type (galaxy / nebula / cluster); no deep-sky distances are shipped
            because OpenNGC has no single reliable value for every object. Epoch is
            J2000.0; proper motion and precession are ignored for present-day
            display (sub-arcminute over decades). Nulls are shown as &quot;not
            measured&quot;, never filled in.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Star data: HYG
            database v4.4, astronexus / David Nash, CC BY-SA 4.0 (Hipparcos / Yale
            BSC / Gliese). This subset shared under CC BY-SA 4.0. Constellation
            lines: Marc van der Sluys, &quot;ConstellationLines&quot;, CC BY 4.0
            (DOI 10.5281/zenodo.10397192). Deep-sky objects: OpenNGC, Mattia Verga,
            CC BY-SA 4.0. Star names: IAU WGSN (IAU-CSN). Milky Way: ESO/S. Brunier,
            CC BY 4.0.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Interstellar (real visitors, a live model, a movie-inspired homage)
          </h3>
          <p className="mt-2">
            The Interstellar tab (the third &quot;Beyond&quot; world) is the app&apos;s
            most cinematic page, so its honesty split is stated loudly.{" "}
            <span className="text-ice">Movie-inspired only:</span> it is an original
            homage with <span className="text-ice">zero copyrighted film assets</span>{" "}
            (no score or sound from the 2014 film, no scenes, stills, logos or
            dialogue, and no film robot). The guide robot is an{" "}
            <span className="text-ice">original monolith-style design</span> built from
            simple 3D primitives, labeled as such; the terrain and cinematic visuals
            are original and procedural.
          </p>
          <p className="mt-2">
            <span className="text-ice">Computed / real (The Visitors):</span> the three
            confirmed interstellar objects (1I/&apos;Oumuamua, 2I/Borisov, 3I/ATLAS)
            ride their <span className="text-ice">real hyperbolic trajectories</span>,
            solved from cited osculating orbital elements with the same two-body Kepler
            machinery as the Comets &amp; Asteroids tab (lib/interstellar reusing
            lib/small-bodies). For the selected object the tab draws its path, a live
            marker at the scrubbed date, and its{" "}
            <span className="text-ice">incoming asymptote</span> (the real direction it
            came from, e.g. 3I/ATLAS from the direction of Sagittarius), plus a HUD of
            speed (km/s), Sun and Earth distance, and inbound/outbound phase.{" "}
            <span className="text-ice">Accuracy, stated:</span> these are osculating
            two-body hyperbolae with no planetary perturbations and no
            non-gravitational (outgassing) forces modeled; 1I/&apos;Oumuamua&apos;s
            measured non-gravitational acceleration is real but explicitly not modeled.
            For a precise ephemeris, cross-check{" "}
            <span className="text-ice">JPL Horizons</span>. Elements: NASA/JPL
            Small-Body Database (SBDB) and the Minor Planet Center.
          </p>
          <p className="mt-2">
            <span className="text-ice">Swarm Defense is a live model, not a real
            system:</span> the swarm view runs{" "}
            <span className="text-ice">real, published swarm-robotics algorithms</span>{" "}
            every frame (Reynolds boids flocking, 1987; decentralized greedy/threshold
            multi-robot task allocation; leaderless local consensus with no central
            controller). It is a genuine simulation, never a recording, but it is an{" "}
            <span className="text-ice">educational game</span> applied to an
            illustrative space-defense scenario, <span className="text-ice">not</span> a
            real defense system, not real robots, and not mission telemetry; the 2-D
            physics is simplified point-mass steering. The tab shows this note and the
            algorithm citations in full.
          </p>
          <p className="mt-2">
            <span className="text-ice">Audio:</span> an optional looping soundtrack of{" "}
            <span className="text-ice">real NASA Voyager plasma-wave sounds</span> (public
            domain). It is <span className="text-ice">off by default and never
            autoplays</span>, with a visible credit: NASA / JPL-Caltech, Voyager Plasma
            Wave Science instrument (University of Iowa).
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Interstellar-object
            elements: NASA/JPL Small-Body Database (SBDB) and the Minor Planet Center
            (US-Government data, freely usable). Swarm algorithms: Reynolds (1987, 1999),
            Gerkey &amp; Matari&#263; (2004), Bonabeau, Theraulaz &amp; Deneubourg (1996),
            Olfati-Saber &amp; Murray (2004). Audio: NASA / JPL-Caltech, Voyager Plasma
            Wave Science instrument (University of Iowa), public domain. Movie-inspired
            homage with no copyrighted film assets.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Surfaces (standing on Mars and Titan)
          </h3>
          <p className="mt-2">
            The Surfaces tab is the app&apos;s first ground-level view, and its
            headline honesty statement comes first:{" "}
            <span className="text-ice">&quot;live&quot; means live simulation, not a
            camera</span>. No streaming camera exists on any planetary surface;
            what is live is the computed state (sun position, local time, sol,
            season, day / twilight / night phase). Second:{" "}
            <span className="text-ice">Mars and Titan are different honesty
            tiers</span>, and the UI says which one you are standing on.
          </p>
          <p className="mt-2">
            <span className="text-ice">Computed / real:</span> the Mars sun
            position, local mean solar time, sol count and season (the validated
            NASA GISS Mars24 machinery, Allison &amp; McEwen 2000, in
            lib/mars-time); solar irradiance at both worlds (1361 W/m&#178; scaled
            by the true heliocentric distance); the Saturn-in-Titan&apos;s-sky
            geometry and Saturn&apos;s ~5.65&#176; apparent size (about 11 times
            the Moon); the day / twilight / night phases.{" "}
            <span className="text-ice">Reused / real:</span> the Gale Crater /
            Mount Sharp terrain is the real NASA MOLA MEGDR elevation model at
            true meter scaling (463 m/px, so close-up micro-relief is a rendering
            choice, labeled); the 360&#176; panorama is Curiosity&apos;s real
            Mastcam photograph (PIA25407, sol 3509, colors white-balanced by
            NASA); the Titan surface photo is the real Huygens DISR image
            (PIA07232); the sunset reference is PIA19400 (Curiosity sol 956).{" "}
            <span className="text-ice">Illustrative / labeled:</span> the rendered
            sky palettes (artistic renderings of real, cited phenomena such as
            the blue Mars sunset, not measured spectra), all Titan terrain (no
            human-scale Titan imagery exists), and ambient effects.
          </p>
          <p className="mt-2">
            Three more stated truths: <span className="text-ice">Saturn is below
            the horizon at the real Huygens landing site</span> (about
            &#8722;74&#176;; Titan&apos;s tidal lock keeps Saturn fixed in the
            sky, Saturn-facing hemisphere only), so Saturn is drawn only from an
            explicitly labeled chosen Sub-Saturn viewpoint, where the haze would
            in reality blur it. <span className="text-ice">Titan&apos;s clock
            phase is adopted:</span> the ~15.95 Earth-day solar-day rate is real,
            the &quot;what time is it now&quot; epoch is a labeled convention
            (unlike Mars, whose clock is fully real). And any vertical
            exaggeration of the Mars terrain is a labeled display toggle; 1x is
            the true proportion.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Mars terrain:
            NASA/JPL/GSFC (MOLA Science Team); PDS Geosciences Node (public
            domain). Mars panorama: NASA/JPL-Caltech/MSSS, PIA25407, sol 3509
            (public domain). Titan surface photo: PIA07232, credit{" "}
            <span className="text-ice">NASA/JPL/ESA/University of Arizona</span>{" "}
            (verbatim joint credit, shown beside the image in the tab). Mars
            sunset reference: PIA19400, NASA/JPL-Caltech/MSSS/Texas A&amp;M Univ.
            Clock and sun: NASA GISS Mars24 (Allison &amp; McEwen 2000). Titan
            facts: NASA/ESA Cassini-Huygens.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Exoplanet Surfaces — real sky, imagined ground
          </h3>
          <p className="mt-2">
            The Exoplanet Surfaces tab (the fourth &quot;Beyond&quot; world) is the{" "}
            <span className="text-ice">mirror image</span> of the Mars and Titan
            Surfaces tab. There the ground was the real part and the sky palette
            was illustrative; here it is reversed. The lead honesty point:{" "}
            <span className="text-ice">no exoplanet surface has ever been imaged,
            not one pixel</span>, so on this tab all ground and terrain is
            illustrative and labeled, and the SKY is the real, computed part.{" "}
            <span className="text-ice">Computed and real</span> (from measured NASA
            Exoplanet Archive parameters, via lib/exoplanets and lib/exo-surfaces):
            the host star&apos;s apparent angular size (2&middot;atan(R&#8902;/a) from the
            stellar radius and orbital distance) and illustrative Teff-to-RGB
            colour; the sibling planets seen as discs at their real maximum
            apparent size at closest approach; surface gravity (rocky worlds only);
            irradiance and equilibrium temperature; and the year length (orbital
            period). TRAPPIST-1 e is the showcase: a salmon-red sun about 2.17
            degrees across, roughly 4 times the width of our Sun, with sibling
            worlds that at closest approach loom larger than our full Moon.{" "}
            <span className="text-ice">Reused</span>: the Phase 8 exoplanet
            catalogue and physics helpers, no new fetch, no API key.{" "}
            <span className="text-ice">Illustrative and labeled</span>: all terrain
            and ground, the star and planet colours, and the sky&apos;s fine
            texture.
          </p>
          <p className="mt-2">
            Two things are inferences, not measurements, and are labeled as such.{" "}
            <span className="text-ice">Tidal locking</span> is inferred for close-in
            worlds around low-mass stars (a permanent day side and night side
            follow from that inference); an optional day-side / terminator /
            night-side toggle is labeled inferred. And{" "}
            <span className="text-ice">rotation and day length are not measured</span>,
            so unlike Mars there is no local clock here; only the year (the orbital
            period) is a real time quantity, shown as a year-progress readout. The
            honest counterpart is <span className="text-ice">51 Pegasi b</span>, a
            hot Jupiter: it has <span className="text-ice">no solid surface to stand
            on</span>, so that vantage renders a cloud-top viewpoint, draws no
            ground, and shows no standing-on gravity, said plainly.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> This research has
            made use of the NASA Exoplanet Archive, which is operated by the
            California Institute of Technology, under contract with the National
            Aeronautics and Space Administration under the Exoplanet Exploration
            Program. Primary citation: Christiansen et al. (2025), Planetary
            Science Journal. All terrain is original, illustrative work; no
            exoplanet surface imagery exists, so none is used.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Black Holes — real physics, a render not a photo
          </h3>
          <p className="mt-2">
            The Black Holes tab (the fifth &quot;Beyond&quot; world) leads with its
            load-bearing honesty point: the centrepiece is a{" "}
            <span className="text-ice">physically-based gravitational-lensing
            render, not a photograph</span>. It bends the real ESO Milky Way
            panorama with the <span className="text-ice">point-mass thin-lens
            equation</span> (Schwarzschild weak-field deflection, the same
            4GM/(c&sup2;b) light-bending our lib reproduces at the 1.75 arcsec
            solar-limb test), so the Einstein-ring magnification and the smeared
            starlight are real physics, but every pixel is drawn by our own code.
            The <span className="text-ice">shadow, photon ring and disk inner
            edge</span> sit at the real Schwarzschild ratios (shadow radius
            &radic;27/2 r_s, photon sphere 1.5 r_s, ISCO 3 r_s) of the selected
            object.{" "}
            <span className="text-ice">Illustrative and labeled:</span> the
            accretion disk&apos;s brightness, colour and texture; the overall
            apparent size (a true shadow is microarcseconds); and the geometry is
            the non-spinning Schwarzschild case, not a full Kerr ray-trace.
          </p>
          <p className="mt-2">
            <span className="text-ice">Computed and real</span> (by
            lib/black-holes from the cited masses and distances): the Schwarzschild
            radius, photon sphere, ISCO, shadow angular size (shown{" "}
            <span className="text-ice">computed vs the observed EHT value</span>{" "}
            for Sgr A* and M87*, the headline validation: about 53 vs 51.8 uas and
            about 41 vs 42 uas), gravitational time dilation (the interactive dial,
            exact sqrt(1 - r_s/r)), the spaghettification verdict (horizon tides
            gentle for supermassive holes, lethal for stellar-mass ones), Hawking
            temperature and evaporation time, and the Einstein radius and light
            deflection. <span className="text-ice">Reused / real:</span> the cited
            catalog (Sgr A*, M87*, Cygnus X-1, Gaia BH1, GW150914, TON 618) and the
            ESO Milky Way panorama. The two{" "}
            <span className="text-ice">EHT images</span> (Sgr A* 2022, M87* 2019)
            are shown labeled as{" "}
            <span className="text-ice">radio-interferometric reconstructions from
            2017 data, not optical photographs</span>, credited &quot;EHT
            Collaboration&quot; under CC BY 4.0. Two simplifications are stated
            plainly:{" "}
            <span className="text-ice">Schwarzschild, not Kerr</span> (real black
            holes spin; M87* spins hard at a* about 0.9, cited as a fact but not
            modelled by the render), and{" "}
            <span className="text-ice">Hawking radiation is real theory,
            unobserved</span> (every real black hole here is far colder than the
            2.7 K CMB, so it grows rather than evaporates). Nothing is invented.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Catalog: GRAVITY
            Collaboration (2023), EHT Collaboration (2019, 2022), Miller-Jones et
            al. (2021), El-Badry et al. (2023), LIGO/Virgo Abbott et al. (2016),
            Shemmer et al. (2004). EHT images: EHT Collaboration, CC BY 4.0 (ESO
            eso1907a, eso2208-eht-mwa). Background: ESO/S. Brunier Milky Way
            panorama, CC BY 4.0. GR quantities computed by lib/black-holes.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Neutron Stars — real timing, an illustrative lighthouse
          </h3>
          <p className="mt-2">
            The Neutron Stars tab (the sixth &quot;Beyond&quot; world) leads with
            its load-bearing honesty point: the rotating neutron star with its
            sweeping beam is an{" "}
            <span className="text-ice">illustrative depiction of the real
            lighthouse model, not a photograph or a resolved surface</span>. No
            telescope has ever resolved a neutron star&apos;s surface (they are
            only about 20 to 24 km across at kiloparsec distances), so the beam
            shape, surface texture and colours are our own choice. What is{" "}
            <span className="text-ice">real</span> in that visual is the{" "}
            <span className="text-ice">pulse timing</span>: the flash and the
            scrolling pulse train tick at the pulsar&apos;s real measured spin
            period. Because a real millisecond pulsar (up to 716 Hz) would be an
            invisible blur, the <span className="text-ice">3D mesh spin is
            visually slowed</span> for clarity while the true frequency is shown
            beside it; the timing stays real, only the on-screen rotation is
            scaled, and the tab says so.
          </p>
          <p className="mt-2">
            The optional <span className="text-ice">pulse audio</span> is{" "}
            <span className="text-ice">synthesized in-browser at the real spin
            frequency</span> (a soft click or tone at the true rate), not a
            telescope recording. It is off by default, never autoplays, and starts
            only from an explicit user toggle that resumes the audio context.{" "}
            <span className="text-ice">Computed and real</span> (by
            lib/neutron-stars from the cited measurements): density with the
            sugar-cube comparison, surface gravity, escape velocity as a fraction
            of c, compactness, gravitational redshift, the light-bending visible
            surface fraction, spin frequency and equatorial velocity, the
            characteristic age P/(2P-dot) and spin-down luminosity, and the
            magnetic-field ladder. <span className="text-ice">Reused / real:</span>{" "}
            the cited catalog (PSR B1919+21 the first pulsar, the Crab and Vela
            pulsars, the most massive J0740+6620, the first-exoplanet host
            B1257+12, the J0737-3039 double pulsar, the fastest J1748-2446ad, the
            magnetar SGR 1806-20, the first millisecond pulsar B1937+21) from the
            ATNF Pulsar Catalogue and discovery papers, plus two real telescope
            images: the ESA/Hubble Crab Nebula (CC BY 4.0, the nebula around the
            pulsar, the neutron star itself is not resolved) and the NASA/CXC
            Chandra X-ray of the Vela pulsar and its jet.{" "}
            <span className="text-ice">Illustrative and labeled:</span> the
            Joy Division style stacked pulse-profile plot (real pulsars have such
            profiles and B1919+21&apos;s is the &quot;Unknown Pleasures&quot; cover
            art, but the exact shape drawn is illustrative). Where an object&apos;s
            mass and radius are not both measured, a{" "}
            <span className="text-ice">canonical 1.4 Msun / 12 km model is assumed
            and flagged</span>. The Crab&apos;s characteristic age (about 1250 yr)
            honestly overshoots its true historical age (about 970 yr, SN 1054),
            shown not hidden. Nothing is invented.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Catalog: ATNF Pulsar
            Catalogue (Manchester et al. 2005) and discovery papers (Hewish et al.
            1968, Staelin &amp; Reifenstein 1968, Large et al. 1968, Wolszczan &amp;
            Frail 1992, Backer et al. 1982, Burgay et al. 2003, Lyne et al. 2004,
            Hessels et al. 2006, Fonseca et al. 2021, Palmer et al. 2005). Crab
            image: NASA, ESA and Allison Loll / Jeff Hester (Arizona State
            University), CC BY 4.0. Vela image: NASA/CXC/Univ of Toronto/M. Durant
            et al. (public domain). Stellar-structure quantities computed by
            lib/neutron-stars; pulse audio synthesized in-browser.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Galaxies & Cosmic Web — a real map, in redshift-space
          </h3>
          <p className="mt-2">
            The Galaxies tab (the seventh &quot;Beyond&quot; world) leads with its
            load-bearing honesty point: the 3D cosmic web is a{" "}
            <span className="text-ice">real galaxy map, not a procedural
            fake</span>. Its ~18,000 points are real galaxies from the{" "}
            <span className="text-ice">Sloan Digital Sky Survey (SDSS DR17)</span>,
            each with a measured right ascension, declination and redshift; plotted
            in 3D they reproduce the actual filaments, walls (including the Sloan
            Great Wall) and voids of the universe. <span className="text-ice">
            Computed and real:</span> the RA/Dec + redshift to 3D-Mpc mapping,
            recession velocity and Hubble distance, all by lib/galaxies at the
            adopted H0 = 70 km/s/Mpc, drawn as a single GPU point cloud.
          </p>
          <p className="mt-2">
            Two honest caveats are labelled everywhere. First, the{" "}
            <span className="text-ice">radial axis is redshift-space</span>
            (distance = cz/H0), not a directly measured distance: peculiar
            velocities inside clusters stretch them along the line of sight into
            the classic <span className="text-ice">fingers of God</span>, a real
            distortion present in every redshift survey, and the survey is a thin
            equatorial wedge, so it fans out like a pie slice. Second, the whole
            depth scale moves with the unresolved{" "}
            <span className="text-ice">Hubble tension</span> (Planck 67.4 vs SH0ES
            73 km/s/Mpc; we adopt 70 as a documented mid value, not a claim).{" "}
            <span className="text-ice">Reused / real:</span> ten cited catalog
            galaxies (Andromeda, Triangulum, the Magellanic Clouds, M87, Sombrero,
            Whirlpool, NGC 1300, Centaurus A) with published NED/SIMBAD distances
            and Hubble types (method-dependent, uncertain at 5 to 15 percent; M31
            and M33 are blueshifted and approaching, the Milky Way has no
            heliocentric distance because we are inside it), the large-scale
            structure facts (Virgo/Laniakea, Great Attractor, Sloan Great Wall,
            Bootes Void), a real telescope image for every galaxy in the catalog
            (ESA/Hubble and ESO) and the ESA/Webb JWST
            SMACS 0723 first deep field, all CC BY 4.0.{" "}
            <span className="text-ice">Illustrative and labeled:</span> the
            per-point colour-by-redshift and glow, and the schematic Hubble
            tuning-fork diagram. Nothing is invented.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Cosmic-web catalog:
            SDSS DR17 (Abdurro&apos;uf et al. 2022, ApJS 259, 35) via the SDSS
            SkyServer. Funding for the Sloan Digital Sky Survey has been provided by
            the Alfred P. Sloan Foundation, the U.S. Department of Energy Office of
            Science, and the participating institutions. Galaxy images, all
            CC BY 4.0: ESA/Hubble (Andromeda heic1502a, Whirlpool heic0506a,
            Sombrero opo0328a, M87 heic0815f, Triangulum heic1901a, NGC 1300
            opo0501a), ESO (Large Magellanic Cloud eso1914a ESO/VMC Survey,
            Small Magellanic Cloud eso1714a ESO/VISTA VMC, Centaurus A eso1221a,
            and the ESO/S. Brunier all-sky panorama used for the Milky Way seen
            from inside), and ESA/Webb (SMACS 0723 weic2209a). Catalog
            distances and types: NED / SIMBAD and the cited literature. Cosmology
            (Hubble law, RA/Dec+z to 3D) computed by lib/galaxies; Hubble tension
            per Planck 2020 and Riess et al. 2022.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Stars &mdash; measured photometry, derived astrophysics
          </h3>
          <p className="mt-2">
            The Stars tab plots a real Hertzsprung-Russell diagram and{" "}
            <span className="text-ice">ships no new data at all</span>: it reuses
            the naked-eye catalogue already behind the Night Sky tab (HYG v4.4 from
            Hipparcos, Yale Bright Star and Gliese, CC BY-SA 4.0) and derives
            astrophysics from its measured magnitudes, colour indices and parallax
            distances.
          </p>
          <p className="mt-2">
            <span className="text-ice">Its load-bearing honesty point is the line
            between measured and derived.</span>{" "}
            Magnitude, colour, distance and spectral type are measurements and are
            badged as such in the interface. Temperature (Ballesteros fit on B&minus;V),
            luminosity, radius (Stefan-Boltzmann), luminosity class, mass and
            lifetime are all <em>derived from broadband photometry</em>, with{" "}
            <span className="text-ice">no extinction correction and no bolometric
            correction</span>, so distant stars read cooler and fainter than they
            are and cool supergiant radii are order-of-magnitude (Betelgeuse comes
            out a few hundred solar radii against a measured ~700). Classes are read
            off HR position, which is a weaker claim than a spectroscopic class, and
            worded that way. Where a number would be meaningless we refuse to give
            one: the mass-luminosity relation only holds on the main sequence, so
            mass and lifetime are withheld for evolved stars rather than computed
            anyway.
          </p>
          <p className="mt-2">
            <span className="text-ice">Only stars that can honestly be plotted
            are:</span>{" "}
            8,787 of 9,029 have both a distance and a colour index, and the other
            242 are dropped rather than estimated, because a guessed point on a
            scientific diagram is a fabricated one. 43 unit tests cover it, 39
            against published values (Sirius M_V 1.45 and ~10,000 K, Vega 0.58,
            Proxima ~15.5, the Sun at 1 L and 10 Gyr) and 4 against the real
            shipped catalogue. One of those caught a genuine bug: an early
            main-sequence ridge slope classified Sirius, a textbook main-sequence
            star, as a subgiant.{" "}
            <span className="text-ice">The sample is magnitude limited</span> and
            the tab says so: giants outnumber main-sequence stars 4,112 to 3,624
            because luminous stars are visible from further away, while the real
            red-dwarf majority is almost entirely absent.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Star data: HYG
            database v4.4 (c) astronexus / David Nash, CC BY-SA 4.0, compiled from
            Hipparcos, the Yale Bright Star Catalog and Gliese. Derived subset
            shared under the same licence. Temperature fit: Ballesteros (2012).
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Eclipses &mdash; a published canon, not our prediction
          </h3>
          <p className="mt-2">
            The Eclipses tab (the sixth Earth world) carries every solar and lunar
            eclipse from 2001 to 2100: <span className="text-ice">224 solar</span>{" "}
            (67 of them total) and <span className="text-ice">228 lunar</span>.
          </p>
          <p className="mt-2">
            <span className="text-ice">Its load-bearing honesty point is that we
            do not predict these.</span>{" "}
            Predicting eclipses properly needs Besselian elements and per-observer
            local circumstances, and a naive implementation produces times that
            look plausible and are wrong, which is the exact failure this project
            exists to avoid. So the data is NASA&apos;s Five Millennium Canon
            (Espenak &amp; Meeus) and lib/eclipses computes only what follows from
            it unambiguously (27 unit tests against famous eclipses): which
            eclipse is next, saros grouping, centrality from the tabulated gamma,
            and durations, verified at 2m40s for 2017, 4m28s for 2024 and 6m23s
            for 2027. One check is a genuine test of the data rather than of our
            own code: the mean spacing of a saros series comes out of the
            catalogue at <span className="text-ice">6585.3 days</span>, which is
            the saros.
          </p>
          <p className="mt-2">
            <span className="text-ice">Times are Terrestrial Dynamical Time</span>{" "}
            exactly as tabulated, about 75 seconds ahead of civil time this
            century. We label the scale rather than convert, because a sloppy
            conversion would be a false precision.{" "}
            <span className="text-ice">Not shown:</span> eclipse paths (a canon row
            gives one greatest-eclipse point and a path width, not the track, so
            we plot that point and never draw a path we do not have), local
            circumstances, and visibility. The distance helper answers &quot;how
            far is the greatest-eclipse point&quot; and is captioned as{" "}
            <em>not</em> a visibility calculation, with a link out to NASA&apos;s
            page for that eclipse.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Eclipse predictions
            by Fred Espenak and Jean Meeus, NASA&apos;s Goddard Space Flight
            Center (Five Millennium Canon of Solar and Lunar Eclipses), US
            Government work in the public domain.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Aurora &mdash; where the sky is lit, and whether you are under it
          </h3>
          <p className="mt-2">
            The Sun tab had the source and the Earth tabs had the sky, with
            nothing joining them. The aurora is that join. Four NOAA SWPC feeds,
            live and keyless: the planetary Kp index, the 3-day outlook, the
            solar wind from DSCOVR at L1, and OVATION Prime, NOAA&apos;s own
            aurora model, drawn on the globe at the real 110 km emission
            altitude.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              The load-bearing idea is that your geographic latitude is the wrong
              number.
            </span>{" "}
            Aurora rings the GEOMAGNETIC pole, which currently sits in the
            Canadian Arctic, not the top of the globe. Edinburgh and Moscow share
            a geographic latitude to within a fifth of a degree and are more than
            six degrees apart geomagnetically, which is the entire reason
            Scotland has aurora luck Moscow does not. lib/aurora computes
            centred-dipole geomagnetic coordinates from the IGRF-13 pole, and the
            tab shows both numbers side by side.
          </p>
          <p className="mt-2">
            It also answers a question most space-weather sites skip: an observer
            south of the oval can still see it, because the emission is
            kilometres up and clears their horizon from far away. That is real
            geometry, d = R&nbsp;acos(R/(R+h)), and it separates cleanly: green at
            110 km reaches about 1,175 km, the red emission at 300 km reaches
            about 1,960 km, roughly seven degrees of latitude further. That
            difference is why a severe storm produces red glows reported from
            places the oval never came near. And because a bright oval over a sky
            that never darkens is not an aurora anyone sees, the tab borrows the
            Tonight calculation to check whether it is even dark where you are.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              Building it turned up a disagreement inside this app, which is now
              fixed.
            </span>{" "}
            The Sun tab already carried its own oval rule, boundary = 67 &minus;
            3&nbsp;Kp, which differs from the table NOAA publishes with its
            aurora products by up to eight degrees at high Kp. Two tabs quietly
            disagreeing about where the aurora reaches is exactly what this
            project exists not to do, so lib/sun now delegates to lib/aurora and
            there is one model. The table also decomposes better: the boundary
            can mean just the boundary, because the horizon reach is computed
            separately instead of being folded into it.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Limits, stated on the tab.</span> OVATION
            looks about an hour ahead and cannot look further, because that is
            the solar wind&apos;s travel time from the spacecraft that measures
            it. Kp is a 3-hour PLANETARY index, not a local or instantaneous one.
            The centred dipole differs from operational corrected-geomagnetic
            coordinates by up to about 3 degrees. Beyond an hour, aurora
            forecasting is genuinely poor. And as on Tonight: no cloud cover, no
            light pollution. Acknowledgment: NOAA Space Weather Prediction
            Center, US Government work in the public domain.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Seismic Earth &mdash; the solid planet, live
          </h3>
          <p className="mt-2">
            Every other Earth world in this app is about the sky over the planet:
            light, weather, satellites, eclipses. This one is about the planet
            itself breaking. It reads two USGS GeoJSON feeds live (public domain,
            no key): the last 24 hours for the list, and the magnitude 2.5+ week
            for the statistics, because a single day does not hold enough events
            above the completeness magnitude to fit a slope through honestly.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              We ship no plate-boundary map, and the tab does not need one.
            </span>{" "}
            Plot a week of real epicentres and the boundaries draw themselves,
            which is how they were found in the first place. The feed carries
            only position, depth, magnitude and time; everything else on screen
            is computed by lib/quakes in 47 unit tests against published
            seismology: radiated energy from log10 E = 1.5M + 4.8 (a magnitude 8
            at 6.3&times;10<sup>16</sup> J, one magnitude step 32 times the
            energy, two steps exactly 1000), seismic moment by Hanks &amp;
            Kanamori 1979 checked against the published moments of Tohoku 2011
            and Valdivia 1960, the standard depth bands, great-circle distance
            from wherever you told the Tonight tab you were, and P and S arrival
            times.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              The load-bearing point is the rollover in the frequency-magnitude
              chart.
            </span>{" "}
            The straight part is Gutenberg-Richter, log10 N = a &minus; bM. The
            curve at the small end is NOT a shortage of small earthquakes and NOT
            the law failing: it is the detection limit of the seismometer
            network, so the fit starts at the completeness magnitude and the
            chart shades the part it ignores. A test proves the cost of getting
            this wrong: fitting through the rollover understates b by about 18
            percent while still returning a high r-squared, which is exactly what
            makes it dangerous.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              And the completeness cut is published, not estimated, because
              estimating it from this feed does not work.
            </span>{" "}
            Two standard estimators are implemented, tested and run live: maximum
            curvature returns about 1.1 and b near 0.36, b-value stability
            returns about 2.0 and b near 0.34, and the published global cut of
            4.5 gives b = 0.96 &plusmn; 0.07, the only one inside the published
            0.8 to 1.2. Neither estimator is buggy. A global feed is dozens of
            regional networks with different detection thresholds glued together,
            so no single completeness magnitude makes it complete and every
            data-driven estimator describes the mixture instead. All three
            numbers are shown side by side on the tab, because a confident
            estimator being that wrong is more worth seeing than a tidy number.
          </p>
          <p className="mt-2">
            <span className="text-ice">Refusals:</span> wave travel times are
            declined past about 1,000 km, where the ray leaves the crust and a
            fixed velocity stops being approximately right (doing it properly
            needs a velocity model such as IASP91, which we do not ship). Seismic
            moment is only quoted for events actually measured on a moment scale,
            because applying it to an mb or ml reading is a category error.
            Non-earthquake events in the feed (quarry blasts, explosions) are
            dropped and counted on screen rather than quietly folded into the
            statistics. And nothing here predicts earthquakes: Gutenberg-Richter
            describes a catalogue, it does not forecast the next event.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> U.S. Geological
            Survey, Earthquake Hazards Program. USGS data are in the public
            domain. This is the one tab that commits no mirror of its data on
            purpose: an orbital element set is a stale state you can still
            propagate, but a stale list of earthquakes is just yesterday&apos;s
            events shown as today&apos;s. If USGS cannot be reached, the tab says
            so and shows nothing.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Tides &mdash; a correct theory that gets the answer wrong
          </h3>
          <p className="mt-2">
            Newton&apos;s equilibrium tide is real physics, derived correctly,
            and it is wrong about the sea level at every coast on Earth. This tab
            computes it from the real Moon and Sun and plots it against a live
            NOAA tide gauge, so the gap is visible rather than described. The
            gauge is the only thing fetched; the curve, the spring-neap state and
            the amplification factor are computed by lib/tides from positions the
            app already had.
          </p>
          <p className="mt-2">
            The tide-raising force is a DIFFERENCE in gravity across the Earth
            rather than gravity itself, so it falls off as the CUBE of distance.
            That is why the Moon beats the Sun about two to one despite the Sun
            pulling roughly 178 times harder: it is 390 times further away. The
            (3cos&sup2;&minus;1)/2 term is positive both where the Moon is
            overhead AND where it is underfoot, which is why there are two high
            tides a day rather than one. 29 tests pin the textbook coefficients
            (0.36 m lunar, 0.16 m solar), the 1.4&times; perigee-to-apogee swing,
            springs at both new and full Moon, and&mdash;the strongest one&mdash;
            the PERIOD of the computed curve against the published M2 constituent
            of 12 h 25 m, which exercises the whole chain at once.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              What it gets wrong is the size, and the numbers are the point.
            </span>{" "}
            The theory predicts about half a metre of range everywhere. Eastport,
            at the mouth of the Bay of Fundy, measures seven metres: ten times
            too big. Honolulu measures 0.87 m against a predicted 0.85 m, which
            is almost exactly right. That is not the theory failing at random.
            Mid-ocean, far from any resonant shelf, the sea most nearly resembles
            the global ocean the theory assumes. Everywhere else a tide is a
            RESONANT RESPONSE of a particular basin, which is what harmonic
            analysis exists to capture and what no amount of care with the
            potential will produce.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Do not navigate by it.</span> NOAA
            publishes real predictions for these stations from a harmonic fit to
            each station&apos;s own record. The two traces on the chart are drawn
            on DIFFERENT vertical scales, marked on each side and stated in the
            caption, because the gauge is measured against a local datum and the
            theory is a displacement about zero: only the range and the timing
            were ever comparable.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Climate &mdash; the number is a choice, the trend is not
          </h3>
          <p className="mt-2">
            Two independent analyses of the instrumental record: NASA GISTEMP
            back to 1880 and Met Office HadCRUT5 back to 1850, the latter with
            its published uncertainty. The whole tab is built around one
            interaction, and one provable claim.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              Change the reference period and every headline number moves while
              every trend stays exactly where it was.
            </span>{" "}
            Switching from the IPCC 1850 to 1900 baseline to the current WMO
            1991 to 2020 normal takes the 2026 anomaly from +1.38 C to +0.49 C,
            and leaves all four trend figures byte-identical. That is not a
            coincidence: rebasing subtracts one constant from every year, and a
            constant cannot tilt a line. Asserted to twelve decimal places in the
            tests rather than claimed in prose.
          </p>
          <p className="mt-2">
            <span className="text-ice">Two teams, one planet.</span> For 2024
            NASA published 1.28 C and the Met Office 1.51 C, which looks like a
            0.23 C disagreement between two major climate groups. Put both on a
            common 1961 to 1990 baseline and they read 1.18 and 1.16, and their
            trends since 1975 agree to a thousandth of a degree per decade. About
            nine tenths of the apparent disagreement was a choice of reference
            period; what remains is real and explainable, because GISTEMP
            interpolates into the Arctic and HadCRUT5 historically left more of
            it out, and the Arctic warms fastest.
          </p>
          <p className="mt-2">
            Trends are never quoted without a standard error, because the classic
            abuse is to pick a short window and read a slope off it: the
            fifteen-year error bar here is twenty times wider than the
            full-record one, and fits below ten years are refused outright. The
            IPCC AR6 figure of about 1.09 C for 2011 to 2020 against 1850 to 1900
            is reproduced from HadCRUT5 as 1.11 C.
          </p>
          <p className="mt-2">
            <span className="text-ice">A mistake worth recording.</span> The first
            version of the fetch script asserted HadCRUT5 was on the 1961 to 1990
            normal. It is published against 1850 to 1900, and the check that
            caught it is now permanent: an anomaly relative to X must average to
            ZERO over X, which is what the phrase means. Mislabelling a baseline
            silently shifts every number on the page, so making that error while
            building the tab about exactly that error is recorded rather than
            quietly fixed.
          </p>
          <p className="mt-2">
            <span className="text-ice">Not claimed:</span> absolute temperatures
            (nobody can measure the Earth&apos;s mean to a tenth of a degree, which
            is why the science works in anomalies), attribution to greenhouse
            gases (that needs physics and model experiments far beyond a
            temperature series), and a &quot;1.5 breached&quot; headline, since
            that target is defined on a multi-decade mean rather than one year.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> NASA GISS Surface
            Temperature Analysis (GISTEMP v4), a US Government work in the public
            domain. Met Office Hadley Centre and UEA CRU HadCRUT5, Open Government
            Licence v3. Committed and refreshed monthly, because an annual global
            mean is a state rather than a list of events and neither source sends
            CORS headers; see docs/CLIMATE_PHYSICS.md.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Carbon &mdash; you can hear the planet breathing
          </h3>
          <p className="mt-2">
            The Climate tab measures an effect. This one measures the driver, with
            a completely different kind of instrument: not thousands of stations
            homogenised into a global field, but one analyser 3,400 m up a
            Hawaiian volcano that has read the same air every month since March
            1958. Three NOAA GML records are committed and analysed in the
            browser: CO2 at Mauna Loa, CO2 averaged over marine surface sites
            worldwide from 1979, and methane globally averaged from 1983.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              The wobble on the curve is northern vegetation, and averaging the
              whole planet does not cancel it.
            </span>{" "}
            That last part surprised us. Mauna Loa swings 6.5 ppm a year, down
            through the northern summer as leaves grow and up again through winter
            as they rot. The obvious guess is that a global average would mostly
            cancel that, since the southern hemisphere breathes in antiphase, and
            we wrote the test expecting a ratio above 1.5 and possibly far more.
            Measured, the global marine average still swings 4.40 ppm, a ratio of
            1.47, and it peaks in April rather than May. The hemispheres are not
            symmetric: most of the world&apos;s land, and so most of its
            vegetation, is north of the equator, so the southern cycle trims the
            northern signal instead of opposing it evenly. The northern spring is
            visible in the average CO2 of the entire planet.
          </p>
          <p className="mt-2">
            <span className="text-ice">The rise, and its acceleration.</span> Mean
            growth per decade at Mauna Loa: 0.86 ppm a year in the 1960s, 1.64 in
            the 1980s, 2.40 in the 2010s, 2.62 so far in the 2020s. Not a
            projection, just the mean year-over-year difference of the annual
            means, and a decade needs at least five complete years to appear at
            all. Methane is the more interesting record: it grew 6.8 ppb a year in
            the 1990s, then almost stopped at 2.1 in the 2000s, and is running
            11.6 in the 2020s. That stall is real, visible in the curve, and still
            not fully explained.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              &quot;Methane is 80 times worse than CO2&quot; is a choice of
              horizon, not a fact.
            </span>{" "}
            Methane is a strong absorber that mostly breaks down within about
            twelve years, so any single multiplier has already assumed a time
            window. IPCC AR6 gives fossil methane 79.7 over 20 years, 27.9 over
            100 and 7.95 over 500, and the tab shows all three rather than
            picking. Ask for an unpublished horizon and the function returns null
            instead of interpolating a number that no assessment report contains.
          </p>
          <p className="mt-2">
            The seasonally adjusted line is our own 12-month centred average, and
            it stops six months short of each end rather than being padded out,
            because half a window is not a year and padding puts a spurious wiggle
            exactly where a reader looks first: the present day. NOAA&apos;s own
            deseasonalised series is committed alongside, so the two can be
            compared. Current values as multiples of pre-industrial come out at
            1.53x for CO2 against 280 ppm and 2.68x for methane against 722 ppb,
            and those pre-industrial figures are ice cores rather than
            thermometers: a different instrument, on a different continent,
            measuring air that stopped mixing with the atmosphere centuries ago.
          </p>
          <p className="mt-2">
            <span className="text-ice">Not claimed:</span> any forecast (there is
            no line drawn past the last measured month, because where the curve
            goes is a question about economies rather than about spectroscopy),
            any attribution of the rise to a source (that needs isotopes and
            inventories, not a concentration series), and any temperature
            consequence, which lives one tab over and is measured, not derived
            here.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> NOAA Global
            Monitoring Laboratory, Earth System Research Laboratories, Boulder
            Colorado, a US Government work in the public domain. Mauna Loa CO2 is
            a joint record with the Scripps Institution of Oceanography, begun by
            Charles David Keeling. Committed and refreshed monthly, because a
            monthly mean is a state that gets revised rather than a list of
            events, and NOAA does not send CORS headers; see
            docs/CARBON_PHYSICS.md.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Magnetic &mdash; your compass does not point north
          </h3>
          <p className="mt-2">
            This is the one tab where a 28 KB file expands into a whole planet.
            NOAA supplies 195 numbers per epoch, the IGRF-14 spherical harmonic
            coefficients, and nothing else. The declination where you stand, the
            world map, all three poles, the century of pole drift, the dipole&apos;s
            decline and the South Atlantic Anomaly are computed in your browser
            from those numbers. No tiles, no images, no lookups.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              There are three north poles and none of them is where the needle
              points.
            </span>{" "}
            The geographic pole is where the rotation axis emerges. The
            geomagnetic pole, near 80.9 N, is where the best-fit central dipole
            axis emerges, and it is a closed form in three of the 195
            coefficients; it is also the pole the auroral oval is centred on,
            which is what joins this tab to the aurora one. The dip pole, near
            85.4 N, is where the field is actually vertical, and finding it takes
            all 195 coefficients and an iterative search. Your compass follows
            the local field along a curved field line, so it aims at none of
            them, which is the whole reason declination exists as a quantity.
          </p>
          <p className="mt-2">
            <span className="text-ice">The pole sprinted, then eased off.</span>{" "}
            Computing the north dip pole for every epoch gives about 5 km a year
            through the Canadian Arctic in the 1900s, 46 km a year by 2000, 56 by
            2005, and then 40 by 2025. The tenfold acceleration is famous and
            matches the last ground survey, which measured 55 km a year. The
            recent slowing is in exactly the same data and is quoted far less
            often. Both are on the page; neither is extrapolated.
          </p>
          <p className="mt-2">
            <span className="text-ice">Proved, not asserted.</span> A spherical
            harmonic synthesis with a wrong Legendre recursion, a missing
            geodetic-to-geocentric step or a botched frame rotation still returns
            plausible five-figure numbers, so plausibility proves nothing. The
            45 tests check against the official pyIGRF14 reference
            implementation, run once at twelve places and dates from 1900 to
            2029.9 and up to 500 km altitude, agreeing to 0.05 nanotesla and a
            thousandth of a degree. On top of that, NOAA publishes its own pole
            positions: for 2025 the geomagnetic pole at 80.79 N, 72.76 W with a
            9.21 degree dipole tilt, and the dip pole at 85.762 N, 139.298 E.
            This code computes 80.79 N, 72.76 W, 9.21 degrees, and a dip pole
            about 20 km away from NOAA&apos;s, which is the honest gap between two
            current field models rather than an error in either. The southern dip
            pole agrees to a hundredth of a degree.
          </p>
          <p className="mt-2">
            <span className="text-ice">A mirror with no cron.</span> The climate
            and carbon tabs refresh monthly because an annual mean or a monthly
            mean is a state that gets revised. A generation of IGRF is a frozen
            publication: its numbers will never change, and IGRF-15 will be a
            different file with a different name. So it is fetched once,
            committed, and cited. The right refresh cadence for a document that
            cannot change is none.
          </p>
          <p className="mt-2">
            <span className="text-ice">Not claimed:</span> the crustal field.
            Degree 13 means the shortest wavelength in the model is around 3,000
            km, so the magnetised rock under your feet is absent by construction
            and over volcanic ground the real declination can be degrees away
            from this. Also not claimed: today&apos;s value rather than a
            quiet-day average (the field wobbles by tens of nanotesla daily and
            hundreds in a storm), anything past 2030, where a secular variation
            column is a straight line and this page returns nothing rather than a
            number, and any reversal forecast. The dipole has weakened 7.7% since
            1900, which is fast for a core process and is not a countdown.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> IGRF-14
            coefficients from the International Association of Geomagnetism and
            Aeronomy, Working Group V-MOD, distributed by NOAA NCEI. Validation
            values generated with pyIGRF14 (MIT licence, Ciaran Beggan, British
            Geological Survey), the official reference implementation shipped
            alongside the coefficients. Published pole positions from NOAA NCEI,
            Wandering of the Geomagnetic Poles; see docs/MAGNETIC_PHYSICS.md.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Air &mdash; the same air, scored by two countries that disagree
          </h3>
          <p className="mt-2">
            The Earth worlds cover the sky over the planet, the solid planet, the
            oceans and deep time. This one is the thin layer people actually live
            in. It reads live Copernicus CAMS concentrations through Open-Meteo,
            keyless, and computes everything else itself.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              The load-bearing point is that an air quality index is not a
              measurement.
            </span>{" "}
            It is a national policy judgement wrapped around one: a lookup table
            with straight lines drawn between the rows, and the rows are chosen
            by regulators. The US index crosses out of &quot;Good&quot; at 9.0
            micrograms of PM2.5, the European index not until 10, so the same air
            can be &quot;Moderate, sensitive groups take care&quot; in one place
            and comfortably &quot;Fair&quot; in the other. Neither is lying. The
            tab says so when the two disagree.
          </p>
          <p className="mt-2">
            <span className="text-ice">Both indices are a MAXIMUM, not an average,</span>{" "}
            so the number is silent about what it is describing. The pollutant
            responsible is therefore named beside it, which produced the most
            interesting thing on the tab: a real Delhi reading came out 188
            &quot;Unhealthy&quot; on the US scale driven by OZONE, and
            &quot;Poor&quot; on the European scale driven by PM2.5. The two
            countries disagreed about the culprit, not just the score, from
            identical concentrations.
          </p>
          <p className="mt-2">
            36 unit tests check the published tables against themselves: every
            band edge must map exactly onto its index edge, for the 2024 PM2.5
            revision, PM10, 8-hour ozone and 1-hour NO2. The gas conversions are
            checked against the standard factors at 25 C (ozone 1.96, NO2 1.88,
            SO2 2.62 micrograms per ppb), and one test measures the cost of
            skipping them: 197 micrograms of ozone is 100 ppb, and treating the
            197 as though it were already ppb lands TWO bands too high, with a
            number that looks perfectly plausible. Particulates are refused a ppb
            figure entirely, because PM2.5 is a size class rather than a
            substance and has no molar mass.
          </p>
          <p className="mt-2">
            <span className="text-ice">Not shown, deliberately:</span> a
            conversion into cigarettes. That rule of thumb was built for one
            comparison in one paper, not as a dose model. Also stated rather than
            buried: these are modelled kilometre-scale concentrations and not a
            sensor at your address, and the US PM2.5 table is defined on a
            24-hour average while what is shown is hourly.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Copernicus
            Atmosphere Monitoring Service (CAMS) forecasts, served by Open-Meteo.
            CAMS data are free to use with attribution and neither requires an API
            key. Breakpoints from the US EPA, band edges from the European
            Environment Agency, guidelines from the WHO 2021 global update; see
            docs/AIR_PHYSICS.md.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Tonight &mdash; the one page organised around you, not an object
          </h3>
          <p className="mt-2">
            Every other tab is built around a <em>thing</em>. The Tonight tab is
            built around a <em>place and a moment</em>, which is the question a
            person actually has when they step outside. It fetches{" "}
            <span className="text-ice">no new data</span> and composes four worlds
            that were already here: Sun geometry from lib/solar, the Moon from
            lib/lunar, the planets from lib/planets, the shipped shower catalogue,
            and the committed ISS element set propagated with SGP4.
          </p>
          <p className="mt-2">
            Sunset, the three twilight steps and sunrise are found{" "}
            <span className="text-ice">numerically</span>: sample the real
            computed altitude, then bisect the crossing. Because there is no
            closed-form shortcut and no special-casing, the awkward latitudes fall
            out of the same code and are reported as named states rather than
            missing data: <em>midnight sun</em>, <em>polar night</em>, and{" "}
            <em>no astronomical darkness</em> for the mid-summer band above about
            48.5 degrees. lib/tonight carries 56 unit tests against published
            values, including June-solstice day length for London, Boston and
            Sydney, the 28 and 47 degree elongation caps that keep Mercury and
            Venus out of the midnight sky, the Moon&apos;s 28.7 degree standstill
            limit, and the full Moon rising within an hour of sunset.
          </p>
          <p className="mt-2">
            <span className="text-ice">
              The load-bearing point is that this is sky geometry, not weather.
            </span>{" "}
            It knows exactly where everything will be and how dark the sky can
            get, and it knows nothing about clouds, because this app ships no
            weather data and uses no keys. A perfect darkness score can still be a
            solid overcast where you are standing, and the page says so on screen.
            There is no light pollution model either, so no limiting magnitude is
            ever claimed. The darkness score prints its own two-term formula next
            to the number so it can be checked rather than trusted.
          </p>
          <p className="mt-2">
            <span className="text-ice">Not computed:</span> apparent planet
            magnitudes for tonight (that needs a per-planet phase-angle
            photometric model, so we show the published range and label it),
            topocentric lunar parallax beyond the standard mean allowance (lunar
            rise and set are good to a few minutes), and anything at all about
            transparency or seeing. Meteor rates are ideal-sky estimates and run
            high against real counts.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Your location.</span> Geolocation is
            optional and never required; the tab works from a preset place or
            typed coordinates. Whatever you enter or grant stays in your browser,
            remembered in localStorage. There is no account and no server to send
            it to.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Transits &mdash; the measurement behind the Exoplanets tab
          </h3>
          <p className="mt-2">
            The Transits tab shows <em>how we know</em>. When a planet crosses its
            star, the star dims by the ratio of their disc areas, and that dip is
            where most exoplanet radii come from. It adds{" "}
            <span className="text-ice">no new data</span>: it reads the NASA
            Exoplanet Archive subset already shipped for the Exoplanets tab and
            draws the <span className="text-ice">75</span> planets there that were
            discovered by transit and have both radii measured.
          </p>
          <p className="mt-2">
            <span className="text-ice">Its load-bearing honesty point is that a
            transit measures a ratio, not a planet.</span>{" "}
            Depth gives Rp/Rs and nothing else, so a planet&apos;s absolute size
            inherits its star&apos;s radius error one-for-one (a test asserts that
            a 10% larger star yields a 10% larger planet), and depth says nothing
            about mass. Computed by lib/transits in 35 unit tests against textbook
            and published values: 84 ppm for Earth across the Sun, ~1.1% for
            Jupiter, 1.4% and 3.1 hours for HD 209458 b, 0.74% and 36 minutes for
            TRAPPIST-1 b. The three-number comparison showing why small cool stars
            are surveyed is computed, not asserted.
          </p>
          <p className="mt-2">
            <span className="text-ice">Illustrative and labeled:</span> the light
            curve&apos;s depth and width are computed from measured values, but its
            flat-bottomed shape is schematic because real curves are round-bottomed
            from limb darkening, which we do not model.{" "}
            <span className="text-ice">Not shown:</span> mass, density and
            composition (transits do not measure them), impact parameter and
            inclination (absent from this subset, so durations are the
            central-crossing maximum), and hypothetical transits. Planets found by
            radial velocity or imaging are excluded rather than drawn with an
            invented transit.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Radii, periods and
            orbits from the NASA Exoplanet Archive subset already credited under
            the Exoplanets tab. Geometry computed by lib/transits; see
            docs/TRANSITS_PHYSICS.md.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Satellites &amp; Debris &mdash; the real catalogue, honestly sampled
          </h3>
          <p className="mt-2">
            The Satellites tab (the fifth Earth world) shows{" "}
            <span className="text-ice">14,186 tracked objects</span> across crewed
            stations, Starlink, OneWeb, GPS, the geostationary belt and three real
            fragmentation debris clouds, from CelesTrak GP element sets. Positions
            are propagated live with <span className="text-ice">SGP4</span>, the
            model those element sets are defined for.
          </p>
          <p className="mt-2">
            <span className="text-ice">Its load-bearing honesty point is the
            sampling.</span>{" "}
            Starlink alone is 10,873 tracked objects, which cannot all be
            propagated and drawn in a browser tab, so 1,500 are evenly sampled
            (every nth record, not the first 1,500). The true tracked count is
            stored per group and shown beside the drawn count, so the tab says
            &quot;1,500 of 10,873 drawn&quot; rather than putting 10,873 over a
            picture of 1,500. Every other group is complete, so the debris counts
            are exact. Element-set age is surfaced too: SGP4 error grows roughly
            1-3 km/day from epoch, and the tab states the expected along-track
            error in words instead of implying a precise position.
          </p>
          <p className="mt-2">
            <span className="text-ice">Computed</span> by lib/satellites (30 unit
            tests against real objects): semi-major axis, period, perigee/apogee,
            vis-viva speeds, regime classification and the altitude-shell
            histogram. One subtlety is pinned by test because it is easy to get
            wrong and looks plausible either way: mean motion is revolutions per{" "}
            <em>solar</em> day, which is why geostationary mean motion is 1.0027,
            and using the sidereal day instead puts that orbit 76 km low.{" "}
            <span className="text-ice">Not shown:</span> conjunction or collision
            predictions (public element sets carry no covariance), untracked
            fragments below roughly 10 cm, and object sizes. Markers are a fixed
            size, never physical scale. The altitude exaggeration control is
            labeled, with true scale available.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Orbital data: US
            Space Force (18th Space Defense Squadron) via CelesTrak
            (celestrak.org), a committed mirror fetched once per CelesTrak&apos;s
            usage policy rather than polled. Propagation: satellite.js (SGP4), the
            same library the ISS tab uses.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Gravitational Waves &mdash; real detections, a computed chirp
          </h3>
          <p className="mt-2">
            The Gravitational Waves tab (the eighth &quot;Beyond&quot; world) leads
            with its load-bearing honesty point:{" "}
            <span className="text-ice">
              the detections are real, but the wave you see and hear is computed
            </span>
            . We ship the 282 events from the GWOSC catalogues (GWTC-1 through
            GWTC-5) that publish both component masses and a distance; the other
            109 listed entries lack parameter estimates and are omitted rather
            than filled in. We do <em>not</em> ship the detector strain time
            series, the localisation sky maps, or LIGO&apos;s audio releases, so no
            event is placed on the sky and no recording is played.
          </p>
          <p className="mt-2">
            <span className="text-ice">Real:</span> every mass, distance,
            redshift, remnant mass and network SNR.{" "}
            <span className="text-ice">Computed</span> by lib/gravitational-waves
            (50 unit tests against published values): the chirp mass, the
            leading-order frequency sweep, the strain scale (~1e-21 for GW150914,
            the right order of magnitude, without inclination or antenna pattern),
            and the radiated energy (3.0 solar masses for GW150914).{" "}
            <span className="text-ice">Two stated limits:</span> the Schwarzschild
            ISCO estimate of the merger frequency is a genuine underestimate
            (68 Hz for GW150914 against an observed peak nearer 150-250 Hz), and
            the catalogue publishes no remnant spins at all, so the 291 Hz ringdown
            note is computed with a spin estimated from the mass ratio and is
            labeled &quot;(est.)&quot; beside the measured effective spin.
            Components between 2 and 5 solar masses are called ambiguous rather
            than classified, because the neutron-star/black-hole line is unsettled.
          </p>
          <p className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed">
            <span className="text-ice">Acknowledgment.</span> Event data: LIGO
            Scientific Collaboration, Virgo Collaboration and KAGRA Collaboration,
            via the Gravitational Wave Open Science Center (gwosc.org), released
            for free public use. Ringdown fit: Echeverria (1989) / Berti et al.
            Remnant-spin estimate: Rezzolla et al. (2008) non-spinning fit. The
            opt-in sound is synthesized in-browser at the event&apos;s real
            frequency, stretched in time to be followable, and is not a LIGO audio
            release.
          </p>

          <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Attribution
          </h3>
          <ul className="mt-2 space-y-1.5">
            {[
              ["NASA GIBS / Worldview", "https://worldview.earthdata.nasa.gov/"],
              ["NASA Blue Marble / Black Marble", "https://science.nasa.gov/earth/earth-observatory/collections/blue-marble/"],
              ["Open-Meteo", "https://open-meteo.com/"],
              ["NOAA/NCEP GFS (wind)", "https://www.nco.ncep.noaa.gov/pmb/products/gfs/"],
              ["Natural Earth (cities)", "https://www.naturalearthdata.com/"],
              ["Mars terrain: NASA/USGS Astrogeology", "https://astrogeology.usgs.gov/search/results?pmi-target=mars"],
              ["Mars24 time: NASA GISS", "https://www.giss.nasa.gov/tools/mars24/"],
              ["Mars climatology: NASA PDS (Viking)", "https://pds.nasa.gov/"],
              ["Cities over time: Reba et al. 2016 (CC-BY)", "https://doi.org/10.1038/sdata.2016.34"],
              ["Moon temperature: LRO Diviner (NASA PDS)", "https://pds-geosciences.wustl.edu/missions/lro/diviner.htm"],
              ["Moon basemap: NASA SVS / LROC / ASU", "https://svs.gsfc.nasa.gov/4720"],
              ["Moon phase & libration: computed (Meeus)", "https://en.wikipedia.org/wiki/Jean_Meeus"],
              ["Planet orbits: JPL approximate positions", "https://ssd.jpl.nasa.gov/planets/approx_pos.html"],
              ["Planet facts: NASA NSSDC Fact Sheet", "https://nssdc.gsfc.nasa.gov/planetary/factsheet/"],
              ["Planet & ring textures: Solar System Scope (CC BY 4.0)", "https://www.solarsystemscope.com/textures/"],
              ["Moon orbits & constants: JPL SSD satellite parameters", "https://ssd.jpl.nasa.gov/sats/elem/"],
              ["Moon maps: NASA / JPL / USGS (public domain)", "https://astrogeology.usgs.gov/search"],
              ["Jupiter's Galilean moon events: Meeus, Astronomical Algorithms Ch. 44", "https://en.wikipedia.org/wiki/Jean_Meeus"],
              ["Galilean event cross-check: JPL Horizons", "https://ssd.jpl.nasa.gov/horizons/"],
              ["Saturn moon positions: JPL SSD mean orbital elements (SAT441)", "https://ssd.jpl.nasa.gov/sats/elem/"],
              ["Saturn ring geometry (B/B'/P): Meeus, Astronomical Algorithms Ch. 45", "https://en.wikipedia.org/wiki/Jean_Meeus"],
              ["Saturn satellite event cross-check: IMCCE PHESAT", "https://www.imcce.fr/"],
              ["Enceladus plumes: Porco et al. 2006", "https://doi.org/10.1126/science.1123013"],
              ["Titan surface & methane cycle: Huygens (Fulchignoni et al. 2005)", "https://doi.org/10.1038/nature04314"],
              ["Triton geysers & atmosphere: Voyager 2 (Smith et al. 1989)", "https://doi.org/10.1126/science.246.4936.1422"],
              ["Io heat flow: Veeder et al. 2012", "https://doi.org/10.1016/j.icarus.2012.03.031"],
              ["Dwarf-planet orbits & constants: JPL SBDB", "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html"],
              ["Pluto & Charon maps: NASA/JHU-APL/SwRI (New Horizons, PD)", "https://www.nasa.gov/mission/new-horizons/"],
              ["Ceres map: NASA/JPL-Caltech/UCLA/MPS/DLR/IDA (Dawn, PD)", "https://www.nasa.gov/mission/dawn/"],
              ["Pluto surface: Stern et al. 2015", "https://doi.org/10.1126/science.aad1815"],
              ["Sputnik Planitia: Moore et al. 2016", "https://doi.org/10.1126/science.aad7055"],
              ["Pluto atmosphere/haze: Gladstone et al. 2016", "https://doi.org/10.1126/science.aad8866"],
              ["Charon Mordor Macula: Grundy et al. 2016", "https://doi.org/10.1038/nature19340"],
              ["Ceres Occator salts: De Sanctis et al. 2016", "https://doi.org/10.1038/nature18290"],
              ["Eris size & albedo: Sicardy et al. 2011", "https://doi.org/10.1038/nature10550"],
              ["Haumea ring & shape: Ortiz et al. 2017", "https://doi.org/10.1038/nature24051"],
              ["Makemake occultation: Ortiz et al. 2012", "https://doi.org/10.1038/nature11597"],
              ["Small bodies: JPL Small-Body Database (SBDB)", "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html"],
              ["Close approaches: NASA/JPL CNEOS", "https://cneos.jpl.nasa.gov/"],
              ["Apophis 2029 (impact ruled out): CNEOS", "https://cneos.jpl.nasa.gov/apophis/"],
              ["Comet 67P photo: ESA/Rosetta/NAVCAM (CC BY-SA 3.0 IGO)", "https://www.esa.int/ESA_Multimedia/Sets/Rosetta_NavCam_images/(result_type)/images"],
              ["Asteroid imagery (Eros/Vesta/Bennu/Gaspra/Ida/Didymos): NASA/JPL/USGS (PD)", "https://astrogeology.usgs.gov/search"],
              ["Meteor showers: IAU Meteor Data Center (Jopek & Kaňuchová 2017)", "http://www.ta3.sk/IAUC22DB/MDC2022/Roje/roje_lista.php"],
              ["Meteor showers: IMO Working List (2026 IMO Meteor Shower Calendar)", "https://www.imo.net/files/meteor-shower/cal2026.pdf"],
              ["Meteor cross-check: American Meteor Society calendar", "https://www.amsmeteors.org/meteor-showers/meteor-shower-calendar/"],
              ["Exoplanets: NASA Exoplanet Archive (Caltech/IPAC)", "https://exoplanetarchive.ipac.caltech.edu/"],
              ["Exoplanet Archive PSCompPars: Christiansen et al. 2025", "https://exoplanetarchive.ipac.caltech.edu/docs/pscp_about.html"],
              ["Habitable zones: Kopparapu et al. 2013", "https://doi.org/10.1088/0004-637X/765/2/131"],
              ["Radius valley (composition): Fulton et al. 2017", "https://doi.org/10.3847/1538-3881/aa80eb"],
              ["WASP survey: Butters et al. 2010", "https://doi.org/10.1051/0004-6361/201015655"],
              ["Sun imagery: NASA/SDO (AIA/EVE/HMI teams)", "https://sdo.gsfc.nasa.gov/"],
              ["Space weather: NOAA SWPC", "https://www.swpc.noaa.gov/"],
              ["Aurora forecast: NOAA SWPC OVATION", "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast"],
              ["Solar cycle: NOAA SWPC (observed + predicted)", "https://www.swpc.noaa.gov/products/solar-cycle-progression"],
              ["Star data: HYG database v4.4 (astronexus / David Nash, CC BY-SA 4.0)", "https://codeberg.org/astronexus/hyg"],
              ["Constellation lines: M. van der Sluys, CC BY 4.0 (DOI 10.5281/zenodo.10397192)", "https://doi.org/10.5281/zenodo.10397192"],
              ["Deep-sky objects: OpenNGC, Mattia Verga, CC BY-SA 4.0", "https://github.com/mattiaverga/OpenNGC"],
              ["Star names: IAU WGSN (IAU Catalog of Star Names)", "https://www.iau.org/public/themes/naming_stars/"],
              ["Milky Way panorama: ESO/S. Brunier, CC BY 4.0", "https://www.eso.org/public/images/eso0932a/"],
              ["Black hole M87* image: EHT Collaboration, CC BY 4.0", "https://www.eso.org/public/images/eso1907a/"],
              ["Black hole Sgr A* image: EHT Collaboration, CC BY 4.0", "https://www.eso.org/public/images/eso2208-eht-mwa/"],
              ["Sgr A* mass/distance: GRAVITY Collaboration 2023", "https://doi.org/10.1051/0004-6361/202142465"],
              ["GW150914: LIGO/Virgo Abbott et al. 2016", "https://doi.org/10.1103/PhysRevLett.116.061102"],
              ["Gaia BH1: El-Badry et al. 2023", "https://doi.org/10.1093/mnras/stac3140"],
              ["Pulsar catalog: ATNF Pulsar Catalogue (Manchester et al. 2005)", "https://www.atnf.csiro.au/research/pulsar/psrcat/"],
              ["First pulsar: Hewish, Bell et al. 1968", "https://doi.org/10.1038/217709a0"],
              ["Fastest pulsar (716 Hz): Hessels et al. 2006", "https://doi.org/10.1126/science.1123430"],
              ["Most massive NS: Fonseca et al. 2021 (NICER)", "https://doi.org/10.3847/2041-8213/ac03b8"],
              ["Crab Nebula image: NASA/ESA/Hubble, CC BY 4.0", "https://esahubble.org/images/heic0515a/"],
              ["Vela pulsar image: NASA/CXC (Chandra), public domain", "https://chandra.harvard.edu/photo/2013/vela/"],
              ["ISS orbital data: US Space Force (18 SDS) via CelesTrak", "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544"],
              ["Propagation: SGP4 via satellite.js (MIT)", "https://github.com/shashwatak/satellite-js"],
              ["ISS live sub-point cross-check: wheretheiss.at", "https://wheretheiss.at/w/developer"],
              ["Interstellar objects: NASA/JPL Small-Body Database (SBDB)", "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html"],
              ["3I/ATLAS discovery: NASA / Minor Planet Center", "https://www.minorplanetcenter.net/"],
              ["Swarm algorithms: Reynolds boids (1987)", "https://www.red3d.com/cwr/boids/"],
              ["Interstellar audio: NASA/JPL Voyager Plasma Wave Science (Univ. of Iowa)", "https://voyager.jpl.nasa.gov/"],
              ["Surfaces terrain: NASA MOLA MEGDR (PDS Geosciences Node)", "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html"],
              ["Surfaces panorama: NASA/JPL-Caltech/MSSS (PIA25407)", "https://photojournal.jpl.nasa.gov/catalog/PIA25407"],
              ["Titan surface photo: NASA/JPL/ESA/University of Arizona (PIA07232)", "https://photojournal.jpl.nasa.gov/catalog/PIA07232"],
              ["Mars sunset: NASA/JPL-Caltech/MSSS/Texas A&M Univ. (PIA19400)", "https://photojournal.jpl.nasa.gov/catalog/PIA19400"],
              ["Cosmic web: SDSS DR17 SkyServer (Abdurro'uf et al. 2022)", "https://skyserver.sdss.org/dr17/"],
              ["Galaxy distances & types: NED / SIMBAD", "https://ned.ipac.caltech.edu/"],
              ["Andromeda image: ESA/Hubble heic1502a, CC BY 4.0", "https://esahubble.org/images/heic1502a/"],
              ["Whirlpool image: ESA/Hubble heic0506a, CC BY 4.0", "https://esahubble.org/images/heic0506a/"],
              ["Sombrero image: ESA/Hubble opo0328a, CC BY 4.0", "https://esahubble.org/images/opo0328a/"],
              ["M87 image: ESA/Hubble heic0815f, CC BY 4.0", "https://esahubble.org/images/heic0815f/"],
              ["JWST deep field (SMACS 0723): ESA/Webb weic2209a, CC BY 4.0", "https://esawebb.org/images/weic2209a/"],
              ["Laniakea supercluster: Tully et al. 2014", "https://doi.org/10.1038/nature13674"],
            ].map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-1 text-dim transition-colors duration-200 hover:text-ice"
                >
                  {label}
                  <ArrowUpRight
                    size={12}
                    weight="light"
                    aria-hidden
                    className="opacity-60 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px"
                  />
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-6 border-t border-line pt-4 font-mono text-[10px] leading-relaxed text-faint">
            We are not affiliated with or endorsed by NASA. Imagery courtesy of
            NASA EOSDIS GIBS. Weather data by Open-Meteo.com, CC-BY 4.0.
          </p>
        </div>
      </div>
    </div>
  );
}
