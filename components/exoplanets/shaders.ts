/**
 * GLSL for the EXOPLANETS phase. Everything here is EXPLICITLY ILLUSTRATIVE:
 * no exoplanet has been imaged in surface detail, so there is no real texture to
 * sample. The planet sphere is a procedural cue only: a soft day/night
 * terminator (from a supplied sun direction), a tint from lib/exoplanets
 * planetTint (temperature + composition), gentle latitude bands for gaseous
 * worlds or smooth mottling for rocky ones, an optional incandescent self-glow
 * for very hot worlds, and a fresnel limb. Mirrors the shader shape used by the
 * dwarf-planet / planet globes but samples NO imagery.
 */

export const EXO_PLANET_VERTEX = /* glsl */ `
  varying vec3 vObjNormal;
  varying vec3 vObjPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  void main() {
    vObjNormal = normalize(normal);
    vObjPos = normalize(position);
    vViewNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

export const EXO_PLANET_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec3 vObjNormal;
  varying vec3 vObjPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  uniform vec3 sunDir;      // object-space sun direction (unit)
  uniform vec3 tint;        // illustrative base colour
  uniform vec3 rimColor;    // limb glow colour
  uniform float gaseous;    // 1.0 for gaseous worlds, 0.0 for rocky/unknown
  uniform float hot;        // 1.0 for incandescent (very hot) worlds
  uniform float rimStrength;

  // Smooth blobby "mottle" from layered sines: cheap, seamless, no texture.
  float mottle(vec3 p) {
    float a = sin(p.x * 8.0) * sin(p.y * 10.0) * sin(p.z * 7.0);
    float b = sin(p.x * 17.0 + 1.7) * sin(p.z * 15.0 - 0.6);
    return 0.5 + 0.35 * a + 0.15 * b;
  }

  void main() {
    // Day/night with a soft terminator band.
    float ndl = dot(normalize(vObjNormal), normalize(sunDir));
    float day = smoothstep(-0.08, 0.32, ndl);
    float ambient = 0.12;
    float lit = ambient + (1.0 - ambient) * day;

    vec3 col = tint;

    if (gaseous > 0.5) {
      // Banded gas-giant look: brightness varies with latitude.
      float lat = clamp(vObjNormal.y, -1.0, 1.0);
      float bands = sin(lat * 15.0) * 0.5 + 0.5;
      float belts = smoothstep(0.35, 0.65, bands);
      col *= 0.80 + 0.20 * bands;
      col = mix(col, col * 0.86, belts * 0.5);
    } else {
      // Rocky/unknown: subtle smooth mottling.
      float m = mottle(vObjPos);
      col *= 0.84 + 0.18 * m;
    }

    col *= lit;

    // Incandescent self-emission for very hot worlds (glows on the night side too).
    col += hot * tint * (0.22 + 0.5 * day);

    // Fresnel limb glow, a touch stronger on the lit hemisphere.
    vec3 vDir = normalize(-vViewPos);
    float fres = pow(1.0 - max(dot(vDir, normalize(vViewNormal)), 0.0), 3.0);
    col += rimColor * fres * rimStrength * (0.45 + 0.55 * day);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Additive back-side limb halo (atmosphere hint): vertex. */
export const EXO_LIMB_VERTEX = /* glsl */ `
  varying vec3 vObjNormal;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  void main() {
    vObjNormal = normalize(normal);
    vViewNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

/** Additive back-side limb halo: fragment. Brightest on the sunlit limb. */
export const EXO_LIMB_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec3 vObjNormal;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  uniform vec3 glow;
  uniform vec3 sunDir;
  uniform float intensity;
  void main() {
    vec3 vDir = normalize(-vViewPos);
    float rim = pow(1.0 - max(dot(vDir, normalize(vViewNormal)), 0.0), 2.4);
    float day = clamp(dot(normalize(vObjNormal), normalize(sunDir)) * 0.5 + 0.5, 0.0, 1.0);
    float a = rim * intensity * (0.35 + 0.65 * day);
    gl_FragColor = vec4(glow * a, a);
  }
`;
