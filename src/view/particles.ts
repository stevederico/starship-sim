import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial
} from 'three';

export interface Puff {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Diameter in meters at birth. */
  size: number;
  /** Diameter gained per second. */
  growth: number;
  life: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
}

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uScale;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(aSize * uScale / max(1.0, -mv.z), 1024.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.15, r) * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Fixed pool of soft round sprites for smoke and fire. */
export class ParticlePool {
  readonly points: Points;
  private readonly capacity: number;
  private readonly position: Float32Array;
  private readonly velocity: Float32Array;
  private readonly color: Float32Array;
  private readonly alpha: Float32Array;
  private readonly size: Float32Array;
  private readonly growth: Float32Array;
  private readonly life: Float32Array;
  private readonly span: Float32Array;
  private readonly peak: Float32Array;
  private readonly material: ShaderMaterial;
  private readonly geometry: BufferGeometry;
  private cursor = 0;

  constructor(capacity: number, glow: boolean) {
    this.capacity = capacity;
    this.position = new Float32Array(capacity * 3);
    this.velocity = new Float32Array(capacity * 3);
    this.color = new Float32Array(capacity * 3);
    this.alpha = new Float32Array(capacity);
    this.size = new Float32Array(capacity);
    this.growth = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.span = new Float32Array(capacity);
    this.peak = new Float32Array(capacity);

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(this.position, 3));
    this.geometry.setAttribute('aColor', new BufferAttribute(this.color, 3));
    this.geometry.setAttribute('aAlpha', new BufferAttribute(this.alpha, 1));
    this.geometry.setAttribute('aSize', new BufferAttribute(this.size, 1));
    this.material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uScale: { value: 800 } },
      transparent: true,
      depthWrite: false,
      blending: glow ? AdditiveBlending : NormalBlending
    });
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = glow ? 6 : 5;
  }

  /** Pixels per meter at one meter away: buffer height over 2 tan(fov / 2). */
  setScale(scale: number): void {
    this.material.uniforms.uScale!.value = scale;
  }

  emit(p: Puff): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    this.position[i * 3] = p.x;
    this.position[i * 3 + 1] = p.y;
    this.position[i * 3 + 2] = p.z;
    this.velocity[i * 3] = p.vx;
    this.velocity[i * 3 + 1] = p.vy;
    this.velocity[i * 3 + 2] = p.vz;
    this.color[i * 3] = p.r;
    this.color[i * 3 + 1] = p.g;
    this.color[i * 3 + 2] = p.b;
    this.size[i] = p.size;
    this.growth[i] = p.growth;
    this.life[i] = p.life;
    this.span[i] = p.life;
    this.peak[i] = p.alpha;
    this.alpha[i] = p.alpha;
  }

  /** Count of particles still alive. */
  update(dt: number, drag: number): number {
    let alive = 0;
    const keep = Math.exp(-drag * dt);
    for (let i = 0; i < this.capacity; i++) {
      const life = this.life[i]!;
      if (life <= 0) continue;
      const left = life - dt;
      this.life[i] = left;
      if (left <= 0) {
        this.alpha[i] = 0;
        this.size[i] = 0;
        continue;
      }
      alive += 1;
      const j = i * 3;
      this.velocity[j] = this.velocity[j]! * keep;
      this.velocity[j + 1] = this.velocity[j + 1]! * keep;
      this.velocity[j + 2] = this.velocity[j + 2]! * keep;
      this.position[j] = this.position[j]! + this.velocity[j]! * dt;
      this.position[j + 1] = this.position[j + 1]! + this.velocity[j + 1]! * dt;
      this.position[j + 2] = this.position[j + 2]! + this.velocity[j + 2]! * dt;
      this.size[i] = this.size[i]! + this.growth[i]! * dt;
      const age = left / this.span[i]!;
      this.alpha[i] = this.peak[i]! * Math.min(1, age * 1.6);
    }
    const attrs = this.geometry.attributes;
    attrs.position!.needsUpdate = true;
    attrs.aAlpha!.needsUpdate = true;
    attrs.aSize!.needsUpdate = true;
    attrs.aColor!.needsUpdate = true;
    return alive;
  }

  clear(): void {
    this.life.fill(0);
    this.alpha.fill(0);
    this.size.fill(0);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/** Fireball and smoke burst for a lost vehicle. */
export function explode(
  fire: ParticlePool,
  smoke: ParticlePool,
  x: number,
  y: number,
  z: number,
  scale: number
): void {
  for (let i = 0; i < 110; i++) {
    const a = Math.random() * Math.PI * 2;
    const up = Math.random() * 2 - 0.6;
    const speed = (25 + Math.random() * 110) * scale;
    const heat = Math.random();
    fire.emit({
      x: x + (Math.random() - 0.5) * 12 * scale,
      y: y + (Math.random() - 0.5) * 50 * scale,
      z: z + (Math.random() - 0.5) * 12 * scale,
      vx: Math.cos(a) * speed,
      vy: up * speed,
      vz: Math.sin(a) * speed * 0.6,
      size: (18 + Math.random() * 30) * scale,
      growth: 30 * scale,
      life: 0.9 + Math.random() * 1.6,
      r: 1,
      g: 0.45 + heat * 0.5,
      b: 0.1 + heat * 0.4,
      alpha: 0.9
    });
  }
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = (10 + Math.random() * 50) * scale;
    const shade = 0.08 + Math.random() * 0.14;
    smoke.emit({
      x,
      y: y + (Math.random() - 0.5) * 40 * scale,
      z,
      vx: Math.cos(a) * speed,
      vy: (Math.random() * 1.4 - 0.3) * speed,
      vz: Math.sin(a) * speed * 0.6,
      size: (30 + Math.random() * 30) * scale,
      growth: 26 * scale,
      life: 2.5 + Math.random() * 3,
      r: shade,
      g: shade,
      b: shade,
      alpha: 0.7
    });
  }
}
