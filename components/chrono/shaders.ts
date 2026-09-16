/**
 * GLSL for the Virtual Earth chrono layers.
 *
 * Two point clouds, both single draw calls (globe-3d-visualization skill,
 * never one mesh per city/event):
 *   - CHRONO_CITY_*   : cities sized/lit by interpolated population at the
 *                       current simulated year; the REAL solar terminator
 *                       (uSunDir from lib/solar) still makes night-side cities
 *                       glow so day/night sweeps as history plays.
 *   - CHRONO_EVENT_*  : dated-event pulses that fade in/out over their span.
 *
 * Both mirror components/living/CityPoints.tsx: aSize is a dynamic attribute
 * updated on a low-frequency cadence (not every frame), uPixelScale converts
 * world size to device pixels, additive blending, depthWrite off so the globe
 * still occludes the far side.
 */

/**
 * Earth sphere for the Virtual Earth tab. Its own material (we do NOT touch the
 * Earth/Living components), physically lit by the same solar terminator: sunDir
 * is the Earth-fixed unit vector to the sun for the *simulated* year. When the
 * real Blue Marble texture is present it's used; otherwise `useProcedural`
 * tints a plain earthy sphere so the scene never breaks. A faint temporal-teal
 * atmosphere rim keeps it in the Virtual Earth accent family.
 */
export const CHRONO_EARTH_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normal); // object space == Earth-fixed (mesh unrotated)
    vObjPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const CHRONO_EARTH_FRAGMENT = /* glsl */ `
  uniform sampler2D dayMap;
  uniform float useProcedural; // 1.0 = no texture yet → tint procedurally
  uniform vec3 sunDir;

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

  // fallback earthy sphere: ocean base with mottled green/tan "land"
  vec3 proceduralEarth() {
    vec3 ocean = vec3(0.06, 0.15, 0.28);
    float n = noise(vObjPos * 3.0) * 0.6 + noise(vObjPos * 9.0) * 0.3;
    float land = smoothstep(0.52, 0.62, n);
    vec3 landCol = mix(vec3(0.22, 0.30, 0.16), vec3(0.35, 0.30, 0.20), noise(vObjPos * 14.0));
    vec3 col = mix(ocean, landCol, land);
    float cap = smoothstep(0.9, 0.99, abs(normalize(vObjPos).y));
    col = mix(col, vec3(0.85, 0.88, 0.92), cap * 0.8);
    return col;
  }

  void main() {
    vec3 n = normalize(vNormal);
    float sunDot = dot(n, normalize(sunDir));

    vec3 surface = useProcedural > 0.5 ? proceduralEarth() : texture2D(dayMap, vUv).rgb;

    float daylight = smoothstep(-0.12, 0.12, sunDot);
    float diffuse = 0.5 + 0.5 * pow(clamp(sunDot, 0.0, 1.0), 0.6);
    vec3 lit = surface * diffuse;
    // night side: dim, cool, city glow comes from the separate points layer
    vec3 night = surface * 0.06 + vec3(0.01, 0.02, 0.04);
    vec3 color = mix(night, lit, daylight);

    // faint temporal-teal limb glow (Virtual Earth accent)
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 3.0);
    color += vec3(0.30, 0.62, 0.66) * fresnel * 0.16 * max(daylight, 0.12);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export const CHRONO_ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const CHRONO_ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 sunDir;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(clamp(-dot(viewDir, n), 0.0, 1.0), 1.7);
    float lit = clamp(dot(n, normalize(sunDir)) * 1.5 + 0.5, 0.06, 1.0);
    // temporal teal-blue sky glow
    vec3 sky = vec3(0.32, 0.66, 0.78);
    gl_FragColor = vec4(sky * rim * lit * 0.95, 1.0);
    #include <colorspace_fragment>
  }
`;

export const CHRONO_CITY_VERTEX = /* glsl */ `
  attribute float aSize;     // dynamic: per-year population-derived size
  attribute float aPhase;
  uniform vec3 uSunDir;
  uniform float uTime;
  uniform float uPixelScale;
  varying float vIntensity;
  varying float vSize;

  void main() {
    vec3 n = normalize(position);
    // sine of solar elevation (mesh unrotated: object space == Earth-fixed)
    float night = smoothstep(0.09, -0.18, dot(n, normalize(uSunDir)));
    float pulse = 0.85 + 0.15 * sin(uTime * 1.6 + aPhase);
    // day side: faint presence; night side: warm "lived-in" glow
    vIntensity = mix(0.14, 0.6 + 0.4 * pulse, night);
    vSize = aSize;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const CHRONO_CITY_FRAGMENT = /* glsl */ `
  varying float vIntensity;
  varying float vSize;

  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float falloff = pow(1.0 - r, 1.8);
    float core = smoothstep(0.5, 0.0, r);
    // warm amber lamp with a whiter hot core (matches the solar accent family)
    vec3 warm = mix(vec3(1.0, 0.66, 0.32), vec3(1.0, 0.94, 0.8), core);
    gl_FragColor = vec4(warm * vIntensity * falloff, 1.0);
    #include <colorspace_fragment>
  }
`;

export const CHRONO_EVENT_VERTEX = /* glsl */ `
  attribute float aIntensity;   // dynamic: 0..1 pulse envelope for the year
  attribute float aHue;         // 0..1 category hue selector
  uniform float uTime;
  uniform float uPixelScale;
  varying float vIntensity;
  varying float vHue;

  void main() {
    vIntensity = aIntensity;
    vHue = aHue;
    // pulsing ring: size breathes; hidden entirely when intensity ~ 0
    float pulse = 0.7 + 0.3 * sin(uTime * 3.0);
    float size = (0.045 + 0.03 * pulse) * step(0.001, aIntensity);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uPixelScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const CHRONO_EVENT_FRAGMENT = /* glsl */ `
  varying float vIntensity;
  varying float vHue;

  // minimal hue→rgb for a small, tasteful category palette
  vec3 categoryColor(float h) {
    // 0 conflict (red-amber), .2 science (teal), .4 exploration (sky),
    // .6 culture (violet), .8 disaster (orange), 1 founding (green)
    if (h < 0.15) return vec3(0.95, 0.42, 0.30);   // conflict
    if (h < 0.35) return vec3(0.36, 0.85, 0.78);    // science (temporal teal)
    if (h < 0.55) return vec3(0.45, 0.70, 0.98);    // exploration
    if (h < 0.75) return vec3(0.72, 0.56, 0.98);    // culture (temporal violet)
    if (h < 0.9)  return vec3(0.98, 0.62, 0.32);    // disaster
    return vec3(0.5, 0.9, 0.6);                      // founding
  }

  void main() {
    if (vIntensity <= 0.001) discard;
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    // ring: bright at the rim, hollow center, reads as an "event pulse"
    float ring = smoothstep(0.55, 0.85, r) * (1.0 - smoothstep(0.92, 1.0, r));
    float core = smoothstep(0.35, 0.0, r) * 0.6;
    float a = (ring + core) * vIntensity;
    vec3 col = categoryColor(vHue);
    gl_FragColor = vec4(col * a, 1.0);
    #include <colorspace_fragment>
  }
`;
