/**
 * GLSL for the Moon sphere.
 *
 * Mirrors components/mars/shaders.ts, with the key physical difference: the
 * Moon has NO atmosphere, so there is NO atmospheric rim glow (no wind, clouds,
 * pressure, nothing). This airless look is what visually distinguishes the
 * Moon from Earth and Mars. The terminator is HARD: with no air to scatter
 * light there is essentially no twilight, so day flips to night across a very
 * narrow band (a razor-sharp terminator is itself an honest lunar signal).
 *
 * Day/night is physically driven: `sunDir` is the Moon-fixed unit vector to the
 * Sun from lib/lunar.ts (Meeus sub-solar point). The globe mesh is unrotated,
 * so object-space normals are Moon-fixed and dot(normal, sunDir) is the sine of
 * solar elevation: the same shared dot(P̂, sunDir) > 0 daylight test used by
 * Earth and Mars.
 *
 * `useProcedural` (0/1) switches between the real LROC/Kaguya basemap texture
 * and a procedural grey cratered-looking sphere (subtle noise + darker maria
 * patches), so the scene never breaks if the real texture 404s before the data
 * pipeline drops it in.
 */

export const MOON_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normal); // object space == Moon-fixed (mesh unrotated)
    vObjPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const MOON_FRAGMENT = /* glsl */ `
  uniform sampler2D dayMap;
  uniform float useProcedural; // 1.0 = no texture yet, tint procedurally
  uniform vec3 sunDir;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjPos;

  // cheap value noise so the fallback sphere isn't a flat billiard ball
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
  float fbm(vec3 p) {
    return noise(p) * 0.55 + noise(p * 2.7) * 0.28 + noise(p * 6.3) * 0.17;
  }

  vec3 proceduralMoon() {
    // Grey regolith base with layered noise mottling.
    vec3 highland = vec3(0.62, 0.61, 0.60);
    float n = fbm(vObjPos * 5.0);
    vec3 col = highland * (0.72 + 0.5 * n);

    // Darker maria (the "seas": basaltic plains) as broad low-frequency
    // patches, biased toward the near-side face (+X in the Moon-fixed frame).
    float m = fbm(vObjPos * 1.7 + vec3(3.1, 1.7, 0.4));
    float nearSide = smoothstep(-0.1, 0.7, normalize(vObjPos).x);
    float maria = smoothstep(0.52, 0.72, m) * (0.35 + 0.65 * nearSide);
    col = mix(col, vec3(0.30, 0.30, 0.31), maria * 0.75);

    // Sprinkle of small bright/dark speckles → crater-like texture.
    float craters = fbm(vObjPos * 22.0);
    col *= 0.9 + 0.2 * craters;
    return col;
  }

  void main() {
    vec3 n = normalize(vNormal);
    float sunDot = dot(n, normalize(sunDir)); // sine of solar elevation

    vec3 surface = useProcedural > 0.5
      ? proceduralMoon()
      : texture2D(dayMap, vUv).rgb;

    // Real terminator, but HARD: airless body → essentially no twilight. A very
    // narrow smoothstep keeps it from aliasing without inventing an atmosphere.
    float daylight = smoothstep(-0.02, 0.03, sunDot);

    // Diffuse falloff on the lit side.
    float diffuse = 0.5 + 0.5 * pow(clamp(sunDot, 0.0, 1.0), 0.7);
    vec3 lit = surface * diffuse;

    // Night side: no city lights, no airglow, earthshine only lifts it a hair
    // so the dark limb reads as a sphere, not a void.
    vec3 night = surface * 0.03;

    vec3 color = mix(night, lit, daylight);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * A VERY faint neutral edge (limb): NOT an atmosphere. Airless bodies have no
 * limb glow; this is a barely-there rim so the sphere separates cleanly from
 * the starfield, kept neutral grey and extremely dim so it never reads as air.
 */
export const MOON_EDGE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const MOON_EDGE_FRAGMENT = /* glsl */ `
  uniform vec3 sunDir;

  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    // tight rim only at the very limb
    float rim = pow(clamp(-dot(viewDir, n), 0.0, 1.0), 4.0);
    float lit = clamp(dot(n, normalize(sunDir)) * 1.5 + 0.4, 0.05, 1.0);
    // cool neutral silver, extremely faint (NOT an atmosphere)
    vec3 edge = vec3(0.60, 0.63, 0.70);
    gl_FragColor = vec4(edge * rim * lit * 0.25, 1.0);
    #include <colorspace_fragment>
  }
`;
