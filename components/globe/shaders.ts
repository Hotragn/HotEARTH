/**
 * GLSL for the Earth sphere and the atmosphere shell.
 *
 * Day/night is physically driven: `sunDir` is the Earth-fixed unit vector to
 * the sun from lib/solar.ts (NOAA solar position). Since the globe mesh is
 * unrotated, object-space normals are Earth-fixed too, so
 * dot(normal, sunDir) is exactly the sine of solar elevation at that point.
 * The day->night blend runs through a smoothstep twilight band from -12 deg
 * (nautical twilight) up to just past sunrise, which is both visually soft
 * and physically correct (see .claude/skills/physics-env-simulation).
 */

export const EARTH_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vNormal = normalize(normal); // object space == Earth-fixed (mesh unrotated)
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const EARTH_FRAGMENT = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D overlayMap;
  uniform float overlayStrength;
  uniform vec3 sunDir;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vNormal);
    // sine of solar elevation at this surface point
    float sunDot = dot(n, normalize(sunDir));

    vec3 day = texture2D(dayMap, vUv).rgb;

    // data overlay (LST / precipitation), alpha-composited over the day map
    vec4 overlay = texture2D(overlayMap, vUv);
    day = mix(day, overlay.rgb, overlay.a * overlayStrength);

    // Black Marble night lights, gently boosted and warmed
    vec3 night = texture2D(nightMap, vUv).rgb;
    night = night * vec3(1.32, 1.22, 1.02) * 1.6;
    // keep a faint imprint of the data overlay on the night side
    night = mix(night, overlay.rgb * 0.42, overlay.a * overlayStrength * 0.55);

    // Twilight band: sin(-12 deg) = -0.2079 (nautical) -> just past sunrise
    float daylight = smoothstep(-0.2079, 0.12, sunDot);

    // mild diffuse term: imagery is already sunlit, so keep it gentle
    float diffuse = 0.60 + 0.40 * pow(clamp(sunDot, 0.0, 1.0), 0.55);
    vec3 color = mix(night, day * diffuse, daylight);

    // thin sky-blue fresnel on the lit limb
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 3.0);
    color += vec3(0.30, 0.50, 0.90) * fresnel * 0.32 * max(daylight, 0.12);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export const ATMOSPHERE_VERTEX = /* glsl */ `
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
 * Rendered on a slightly larger BackSide sphere with additive blending.
 * For the visible inner shell, dot(viewDir, normal) runs from ~-0.3 at the
 * planet limb to 0 at the halo's outer edge, so pow(-dot, k) gives a glow
 * hugging the limb and fading outward. Modulated by sun direction so the
 * halo breathes with day/night.
 */
export const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 sunDir;

  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(clamp(-dot(viewDir, n), 0.0, 1.0), 1.35);
    float lit = clamp(dot(n, normalize(sunDir)) * 1.6 + 0.55, 0.06, 1.0);
    vec3 sky = vec3(0.28, 0.50, 0.95);
    gl_FragColor = vec4(sky * rim * lit * 2.4, 1.0);
    #include <colorspace_fragment>
  }
`;
