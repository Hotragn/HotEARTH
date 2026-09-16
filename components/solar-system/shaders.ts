/**
 * GLSL for the generic planet globe used by all six "other planets"
 * (Mercury, Venus, Jupiter, Saturn, Uranus, Neptune).
 *
 * Mirrors components/mars/shaders.ts and components/moon/shaders.ts exactly in
 * construction: the mesh is UNROTATED, so object-space normals are body-fixed
 * and dot(normal, sunDir) is the sine of solar elevation, the shared
 * dot(P̂, sunDir) > 0 daylight test. `sunDir` is the body-fixed unit vector to
 * the Sun from lib/planets.ts planetSunDirection. Any visual axial tilt is a
 * rigid rotation of the PARENT group (like MoonGlobe's libration), so it never
 * disturbs the terminator, which is computed in the body-fixed object frame.
 *
 * Two knobs make this generic:
 *   - `useProcedural` (0/1) swaps the real texture for a tinted, softly-banded
 *     fallback sphere so the scene never breaks if a texture 404s.
 *   - `tint` is the per-body fallback base colour; `bands` (0/1) adds gentle
 *     latitude banding for the gas/ice giants; `twilight` widens or tightens
 *     the terminator (airless Mercury = hard, hazy giants = soft).
 */

export const PLANET_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normal); // object space == body-fixed (mesh unrotated)
    vObjPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const PLANET_FRAGMENT = /* glsl */ `
  uniform sampler2D dayMap;
  uniform float useProcedural; // 1.0 = no texture, tint procedurally
  uniform vec3 sunDir;
  uniform vec3 tint;           // fallback base colour
  uniform float bands;         // 1.0 = add gas-giant latitude banding
  uniform float twilight;      // terminator half-width in dot units
  uniform float uvOffsetX;     // longitudinal texture scroll (Venus super-rotation)

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
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
    vec3 n = normalize(vObjPos);
    float mottle = noise(vObjPos * 7.0) * 0.6 + noise(vObjPos * 20.0) * 0.4;
    vec3 col = tint * (0.78 + 0.32 * mottle);
    // Gentle east–west banding for the giants: brightness modulated by latitude
    // (object-space Y), wobbled a touch by noise so it isn't a flat gradient.
    if (bands > 0.5) {
      float lat = n.y;
      float band = 0.5 + 0.5 * sin(lat * 26.0 + noise(vObjPos * 3.0) * 2.0);
      col = mix(col, col * (0.82 + 0.3 * band), 0.6);
    }
    return col;
  }

  void main() {
    vec3 n = normalize(vNormal);
    float sunDot = dot(n, normalize(sunDir)); // sine of solar elevation

    vec3 surface = useProcedural > 0.5
      ? proceduralSurface()
      : texture2D(dayMap, vec2(vUv.x + uvOffsetX, vUv.y)).rgb;

    // Real terminator: half-width from the twilight uniform.
    float daylight = smoothstep(-twilight, twilight, sunDot);

    // Diffuse falloff on the lit side; imagery already looks sunlit.
    float diffuse = 0.55 + 0.45 * pow(clamp(sunDot, 0.0, 1.0), 0.6);
    vec3 lit = surface * diffuse;

    // Night side: no city lights out here, keep a faint ambient so the dark
    // limb reads as a sphere, not a void.
    vec3 night = surface * 0.04;

    gl_FragColor = vec4(mix(night, lit, daylight), 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Faint tinted limb glow for bodies WITH an atmosphere (Venus + all four
 * giants). Same limb-glow construction as Earth/Mars atmospheres but per-body
 * tinted and subtle. Airless Mercury renders WITHOUT this shell (honest: no
 * air, no rim glow), exactly as MoonGlobe omits an atmosphere.
 */
export const PLANET_LIMB_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const PLANET_LIMB_FRAGMENT = /* glsl */ `
  uniform vec3 sunDir;
  uniform vec3 glow;
  uniform float intensity;

  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(clamp(-dot(viewDir, n), 0.0, 1.0), 1.7);
    float lit = clamp(dot(n, normalize(sunDir)) * 1.5 + 0.5, 0.05, 1.0);
    gl_FragColor = vec4(glow * rim * lit * intensity, 1.0);
    #include <colorspace_fragment>
  }
`;
