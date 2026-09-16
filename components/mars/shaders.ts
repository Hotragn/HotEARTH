/**
 * GLSL for the Mars sphere and its thin dusty atmosphere shell.
 *
 * Mirrors components/globe/shaders.ts. Day/night is physically driven: `sunDir`
 * is the Mars-fixed unit vector to the sun from lib/mars-time.ts (Mars24
 * subsolar point). The globe mesh is unrotated, so object-space normals are
 * Mars-fixed and dot(normal, sunDir) is the sine of solar elevation.
 *
 * Two differences from Earth:
 *  - `useProcedural` (0/1) switches between the real MOLA/colorized texture and
 *    a procedurally-tinted rusty sphere, so the scene never breaks if the real
 *    texture 404s before the data agent drops it in.
 *  - The night side is genuinely dark (Mars has no city lights); we only lift
 *    it to a faint ambient so the unlit limb isn't pure black, and the
 *    atmosphere rim is a faint tan/pink instead of Earth's bright blue.
 */

export const MARS_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normal); // object space == Mars-fixed (mesh unrotated)
    vObjPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const MARS_FRAGMENT = /* glsl */ `
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

  vec3 proceduralMars() {
    // Rusty base (#b5561f) with layered noise mottling and a hint of the
    // brighter southern-highland / darker northern-lowland split.
    vec3 base = vec3(0.71, 0.34, 0.12);
    float n = noise(vObjPos * 6.0) * 0.6 + noise(vObjPos * 18.0) * 0.3
            + noise(vObjPos * 48.0) * 0.1;
    vec3 col = base * (0.72 + 0.5 * n);
    // subtle bright polar caps
    float cap = smoothstep(0.86, 0.98, abs(normalize(vObjPos).y));
    col = mix(col, vec3(0.86, 0.82, 0.78), cap * 0.7);
    return col;
  }

  void main() {
    vec3 n = normalize(vNormal);
    float sunDot = dot(n, normalize(sunDir)); // sine of solar elevation

    vec3 surface = useProcedural > 0.5
      ? proceduralMars()
      : texture2D(dayMap, vUv).rgb;

    // Real terminator: smoothstep twilight band. Mars twilight is short (thin
    // air) but not zero: a narrow band keeps the terminator physically soft.
    float daylight = smoothstep(-0.12, 0.10, sunDot);

    // Diffuse falloff on the lit side; imagery/albedo already looks sunlit.
    float diffuse = 0.55 + 0.45 * pow(clamp(sunDot, 0.0, 1.0), 0.6);
    vec3 lit = surface * diffuse;

    // Night side: no city lights on Mars. Keep a faint cool ambient so the
    // dark limb reads as a sphere, not a void.
    vec3 night = surface * 0.045;

    vec3 color = mix(night, lit, daylight);

    // faint warm dust-scatter on the lit limb (fresnel), much subtler than
    // Earth's blue sky glow
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 3.0);
    color += vec3(0.55, 0.36, 0.26) * fresnel * 0.18 * max(daylight, 0.06);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export const MARS_ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

/**
 * Thin dusty rim: same limb-glow construction as Earth's atmosphere, but a
 * tan/pink tint at much lower intensity, Mars' atmosphere is ~1% of Earth's.
 */
export const MARS_ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 sunDir;

  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(clamp(-dot(viewDir, n), 0.0, 1.0), 1.6);
    float lit = clamp(dot(n, normalize(sunDir)) * 1.5 + 0.5, 0.05, 1.0);
    // dusty tan / salmon (butterscotch Martian sky), faint
    vec3 sky = vec3(0.80, 0.55, 0.40);
    gl_FragColor = vec4(sky * rim * lit * 0.9, 1.0);
    #include <colorspace_fragment>
  }
`;
