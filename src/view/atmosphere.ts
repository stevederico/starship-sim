import { Color, Vector3 } from 'three';
import type { Texture } from 'three';
import { clamp } from '../game/physics.ts';

/** Uniforms shared by the sky dome and the ground so their haze matches. */
export interface Atmosphere {
  uAlt: { value: number };
  uSpace: { value: Texture };
  uSunDir: { value: Vector3 };
  uHaze: { value: Color };
}

export const SUN_DIRECTION = new Vector3(0.5, 0.55, 0.67).normalize();

const HAZE_LOW = new Color('#bcd7f0');
const HAZE_HIGH = new Color('#5c9cff');

export function createAtmosphere(spaceMap: Texture): Atmosphere {
  return {
    uAlt: { value: 0 },
    uSpace: { value: spaceMap },
    uSunDir: { value: SUN_DIRECTION.clone() },
    uHaze: { value: HAZE_LOW.clone() }
  };
}

/** 0 on the ground, 1 once the sky has gone black. */
export function spaceFactor(altitude: number): number {
  const t = clamp((altitude - 14_000) / 52_000, 0, 1);
  return t * t * (3 - 2 * t);
}

export function updateAtmosphere(atmosphere: Atmosphere, altitude: number): void {
  atmosphere.uAlt.value = Math.max(0, altitude);
  atmosphere.uHaze.value.copy(HAZE_LOW).lerp(HAZE_HIGH, spaceFactor(altitude));
}

export const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SKY_FRAGMENT = /* glsl */ `
  uniform float uAlt;
  uniform sampler2D uSpace;
  uniform vec3 uSunDir;
  uniform vec3 uHaze;
  varying vec3 vDir;

  const float PI = 3.14159265;
  const float EARTH = 6371000.0;

  void main() {
    vec3 dir = normalize(vDir);
    float dip = acos(EARTH / (EARTH + uAlt));
    float elev = asin(clamp(dir.y, -1.0, 1.0)) + dip;
    float t = clamp((uAlt - 14000.0) / 52000.0, 0.0, 1.0);
    float space = t * t * (3.0 - 2.0 * t);

    vec3 zenith = mix(vec3(0.10, 0.30, 0.72), vec3(0.0, 0.004, 0.015), space);
    float band = mix(0.5, 0.05, space);
    float rise = clamp(elev / band, 0.0, 1.0);
    vec3 sky = mix(uHaze, zenith, pow(rise, mix(0.55, 0.8, space)));

    vec2 uv = vec2(atan(dir.z, dir.x) / (2.0 * PI) + 0.5, asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5);
    vec3 stars = texture2D(uSpace, uv).rgb;
    sky += stars * smoothstep(0.55, 1.0, space) * smoothstep(0.0, band, elev);

    float sun = max(dot(dir, normalize(uSunDir)), 0.0);
    sky += vec3(1.0, 0.93, 0.8) * (pow(sun, 900.0) * 6.0 + pow(sun, 24.0) * mix(0.22, 0.05, space));

    // Below the horizon only shows past the edge of the ground mesh.
    sky = mix(uHaze * mix(0.9, 0.35, space), sky, smoothstep(-0.02, 0.0, elev));

    gl_FragColor = vec4(sky, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const GROUND_VERTEX = /* glsl */ `
  varying vec3 vSite;
  varying float vDist;
  void main() {
    vSite = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = length(mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const GROUND_FRAGMENT = /* glsl */ `
  uniform float uAlt;
  uniform vec3 uHaze;
  varying vec3 vSite;
  varying float vDist;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Octaves fade out once they are smaller than a pixel, which stops shimmer.
  float layered(vec2 p, float wavelength, float footprint) {
    float sum = 0.0;
    float weight = 0.5;
    float total = 0.0;
    for (int i = 0; i < 6; i++) {
      float keep = 1.0 - smoothstep(0.3, 0.9, footprint / wavelength);
      sum += noise(p / wavelength + float(i) * 17.3) * weight * keep;
      sum += 0.5 * weight * (1.0 - keep);
      total += weight;
      weight *= 0.5;
      wavelength *= 0.42;
    }
    return sum / total;
  }

  void main() {
    vec2 p = vSite.xz;
    float footprint = max(length(fwidth(p)), 0.5);

    float wobble = (layered(p, 60000.0, footprint) - 0.5) * 30000.0
      + (layered(p + 900.0, 3000.0, footprint) - 0.5) * 1500.0;
    float shore = p.x - 1700.0 + wobble;

    float tone = layered(p + 5000.0, 9000.0, footprint);
    float patchy = layered(p - 3000.0, 700.0, footprint);
    vec3 sand = vec3(0.62, 0.55, 0.40);
    vec3 scrub = vec3(0.30, 0.37, 0.20);
    vec3 marsh = vec3(0.20, 0.27, 0.17);
    vec3 land = mix(sand, scrub, smoothstep(0.35, 0.65, tone));
    land = mix(land, marsh, smoothstep(0.55, 0.8, patchy) * 0.6);
    land = mix(land, sand * 1.15, smoothstep(-500.0, 0.0, shore));

    float depth = smoothstep(0.0, 9000.0, shore);
    vec3 sea = mix(vec3(0.10, 0.42, 0.50), vec3(0.02, 0.12, 0.30), depth);
    sea *= 0.9 + 0.2 * layered(p, 400.0, footprint);
    float surf = smoothstep(60.0, 0.0, abs(shore - 25.0)) * (1.0 - smoothstep(30.0, 200.0, footprint));
    sea = mix(sea, vec3(0.85, 0.9, 0.9), surf * 0.6);

    float edge = clamp(footprint, 1.0, 400.0);
    vec3 color = mix(land, sea, smoothstep(-edge, edge, shore));

    // Launch site: apron, road inland, scorched ring under the mount.
    float site = length(p);
    float aa = footprint * 1.5;
    vec3 concrete = vec3(0.56, 0.56, 0.54) * (0.92 + 0.12 * noise(p / 6.0));
    float road = (1.0 - smoothstep(9.0, 9.0 + aa, abs(p.y))) * step(p.x, 0.0) * step(-6000.0, p.x);
    color = mix(color, vec3(0.34, 0.34, 0.33), road);
    float apron = 1.0 - smoothstep(190.0, 190.0 + aa, max(abs(p.x + 40.0), abs(p.y)));
    color = mix(color, concrete, apron);
    float scorch = 1.0 - smoothstep(25.0, 70.0, site);
    color = mix(color, vec3(0.12, 0.11, 0.10), scorch * 0.75);

    // Haze grows with the air the view ray crosses.
    float k = uAlt / 8000.0;
    float mean = k < 0.01 ? 1.0 : (1.0 - exp(-k)) / k;
    float haze = 1.0 - exp(-vDist * mean / 90000.0);
    color = mix(color, uHaze, clamp(haze, 0.0, 0.88));

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
