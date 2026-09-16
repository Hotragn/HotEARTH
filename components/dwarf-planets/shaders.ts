/**
 * GLSL for the generic dwarf-planet globe (all six detail bodies share one
 * material: Pluto, Charon, Ceres, Eris, Haumea, Makemake).
 *
 * Construction mirrors components/moons/shaders.ts and components/solar-system/
 * shaders.ts EXACTLY: the mesh's OBJECT-space normals are body-fixed and
 * dot(normal, sunDir) is the sine of solar elevation, the shared
 * dot(P̂, sunDir) > 0 daylight test. `sunDir` is the body-fixed unit vector to
 * the Sun from lib/dwarf-planets.ts dwarfSunDirection.
 *
 * The sub-solar longitude sweeps at each body's REAL rotation rate, so the
 * terminator is a real, computed sweep, not imagery, for every body, imaged or
 * not. For Haumea (the showpiece) the globe additionally SPINS: the mesh is
 * rotated about its short axis and `sunDir` is counter-rotated on the CPU so the
 * terminator stays fixed in world space while the ellipsoid tumbles.
 *
 * Two knobs make it generic:
 *   • `useProcedural` (0/1) swaps the real texture for a tinted, softly-mottled
 *     illustrative sphere so the scene never breaks (and is the ONLY mode for the
 *     never-visited bodies Eris / Haumea / Makemake, no real map exists).
 *   • `twilight` sets the terminator half-width: airless worlds get a HARD
 *     terminator (~0); Pluto, with its thin N₂ haze, gets a slightly softer one.
 *
 * Honesty: no invented colour, the fallback is a neutral tinted, softly-mottled
 * sphere, and the un-imaged bodies are labelled ILLUSTRATIVE in the UI.
 */

export const DWARF_SURFACE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vObjPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normal); // object space == body-fixed
    vObjPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const DWARF_SURFACE_FRAGMENT = /* glsl */ `
  uniform sampler2D dayMap;
  uniform float useProcedural; // 1.0 = no texture, tint procedurally
  uniform vec3 sunDir;
  uniform vec3 tint;           // fallback / illustrative base colour
  uniform float twilight;      // terminator half-width in dot units

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vObjPos;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  vec3 proceduralSurface() {
    // Subtle mottling only: an illustrative icy/rocky sphere, never a pretend map.
    float mottle = noise(vObjPos * 5.0) * 0.6 + noise(vObjPos * 15.0) * 0.4;
    return tint * (0.8 + 0.28 * mottle);
  }

  void main() {
    vec3 n = normalize(vNormal);
    float sunDot = dot(n, normalize(sunDir)); // sine of solar elevation

    vec3 surface = useProcedural > 0.5
      ? proceduralSurface()
      : texture2D(dayMap, vUv).rgb;

    // Real terminator: half-width from the twilight uniform (0 ⇒ razor-hard).
    float daylight = smoothstep(-max(twilight, 0.015), max(twilight, 0.02), sunDot);

    // Diffuse falloff on the lit side; imagery already reads as sunlit.
    float diffuse = 0.52 + 0.48 * pow(clamp(sunDot, 0.0, 1.0), 0.65);
    vec3 lit = surface * diffuse;

    // Night side: no city lights out here, a hair of ambient so the dark limb
    // reads as a sphere, not a void.
    vec3 night = surface * 0.035;

    gl_FragColor = vec4(mix(night, lit, daylight), 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Faint limb rim, dual-purpose via uniforms:
 *   • airless worlds, a VERY faint neutral silver rim (NOT an atmosphere), just
 *     so the sphere separates cleanly from the starfield.
 *   • Pluto: a slightly warmer, broader haze rim (its thin N₂ atmosphere + haze
 *     layers, the one honest atmosphere among these bodies).
 */
export const DWARF_LIMB_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const DWARF_LIMB_FRAGMENT = /* glsl */ `
  uniform vec3 sunDir;
  uniform vec3 glow;
  uniform float intensity;
  uniform float rimPower; // higher = tighter rim (airless); lower = broad haze (Pluto)

  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(clamp(-dot(viewDir, n), 0.0, 1.0), rimPower);
    float lit = clamp(dot(n, normalize(sunDir)) * 1.5 + 0.4, 0.05, 1.0);
    gl_FragColor = vec4(glow * rim * lit * intensity, 1.0);
    #include <colorspace_fragment>
  }
`;
