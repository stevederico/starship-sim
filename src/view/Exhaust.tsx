import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from 'three';
import type { Group, PointLight } from 'three';

export interface ExhaustHandle {
  /** power 0..1 from throttle. spread widens the plume in thin air, 1 at sea level. */
  set: (power: number, spread: number) => void;
}

interface ExhaustProps {
  /** Radius at the engine plane, meters. */
  radius: number;
  length: number;
}

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uHot;
  uniform vec3 uCool;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;

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

  void main() {
    // uv.y runs 1 at the engines to 0 at the tail.
    float along = 1.0 - vUv.y;
    float streak = noise(vec2(vUv.x * 14.0, along * 5.0 - uTime * 7.0));
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float body = pow(1.0 - along, 1.5) * pow(facing, 0.9);
    float alpha = body * (0.7 + 0.5 * streak) * uPower;
    vec3 color = mix(uCool, uHot, pow(1.0 - along, 2.6));
    gl_FragColor = vec4(color * alpha * 1.6, alpha);
  }
`;

function shell(hot: Color, cool: Color): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uPower: { value: 0 },
      uHot: { value: hot },
      uCool: { value: cool }
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false
  });
}

/** Engine plume as two glowing shells. Hangs below its origin along -y. */
const Exhaust = forwardRef<ExhaustHandle, ExhaustProps>(function Exhaust(
  { radius, length },
  ref
) {
  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const power = useRef(0);
  const outer = useMemo(() => shell(new Color(1, 0.86, 0.62), new Color(1, 0.36, 0.1)), []);
  const inner = useMemo(() => shell(new Color(1, 1, 1), new Color(0.75, 0.8, 1)), []);

  useEffect(
    () => () => {
      outer.dispose();
      inner.dispose();
    },
    [outer, inner]
  );

  useImperativeHandle(ref, () => ({
    set(next: number, spread: number) {
      power.current = next;
      const g = group.current;
      if (!g) return;
      g.visible = next > 0.01;
      const stretch = 0.45 + 0.55 * next;
      g.scale.set(spread, stretch * (0.8 + 0.2 * spread), spread);
    }
  }));

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const flicker = 0.9 + Math.sin(t * 41) * 0.06 + Math.sin(t * 17.3) * 0.04;
    outer.uniforms.uTime!.value = t;
    inner.uniforms.uTime!.value = t * 1.4;
    outer.uniforms.uPower!.value = power.current * flicker;
    inner.uniforms.uPower!.value = power.current * flicker;
    if (light.current) light.current.intensity = power.current * flicker * radius * 900;
  });

  return (
    <group>
      <group ref={group} visible={false}>
        <mesh material={outer} position={[0, -length / 2, 0]} renderOrder={8}>
          <cylinderGeometry args={[radius, radius * 1.9, length, 32, 1, true]} />
        </mesh>
        <mesh material={inner} position={[0, -length * 0.26, 0]} renderOrder={9}>
          <cylinderGeometry args={[radius * 0.78, radius * 0.5, length * 0.52, 24, 1, true]} />
        </mesh>
      </group>
      <pointLight
        ref={light}
        color="#ffb070"
        intensity={0}
        distance={radius * 60}
        decay={1.6}
        position={[0, -radius * 2, 0]}
      />
    </group>
  );
});

export default Exhaust;
