"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { SCROLLER_ID, prefersReducedMotion } from "./scroll";

// ── Act I: "from chaos to conversation", literally ──────────────────────
// Thousands of message-particles swarm in curl-like turbulence (the unread
// flood). As the visitor scrolls through the hero + manifesto, uProgress
// pulls every particle into an ordered lattice — Mira organizing the chaos.

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform vec2  uPointer;
  uniform float uScrollVel;
  uniform float uSize;

  attribute vec3  aChaos;
  attribute vec3  aOrder;
  attribute float aSeed;
  attribute float aHue;

  varying float vHue;
  varying float vTwinkle;

  // cheap pseudo-curl: layered trig flow fields (full simplex not needed
  // for a background at this particle count)
  vec3 flow(vec3 p, float t) {
    float s = aSeed * 6.2831;
    vec3 q = p * 0.55 + t * 0.12;
    return vec3(
      sin(q.y * 1.7 + s) + cos(q.z * 1.3 + t * 0.4),
      sin(q.z * 1.9 + s * 1.3) + cos(q.x * 1.1 - t * 0.3),
      sin(q.x * 1.3 + s * 0.7) + cos(q.y * 1.7 + t * 0.5)
    );
  }

  void main() {
    vHue = aHue;
    float t = uTime;

    // chaos: home position + drifting flow field, agitated by scroll velocity
    vec3 chaos = aChaos + flow(aChaos, t) * (0.55 + uScrollVel * 0.6);

    // order: lattice breathing gently, rows ripple like a stream of replies
    vec3 order = aOrder;
    order.y += sin(t * 0.6 + aOrder.x * 0.8) * 0.05;
    order.z += sin(t * 0.4 + aOrder.y * 1.2) * 0.05;

    // per-particle stagger so the lattice assembles in a wave, not a snap
    float p = smoothstep(0.0, 1.0, clamp(uProgress * 1.35 - aSeed * 0.35, 0.0, 1.0));
    vec3 pos = mix(chaos, order, p);

    // pointer parallax push
    pos.x += uPointer.x * (0.4 + aSeed * 0.5);
    pos.y += uPointer.y * (0.3 + aSeed * 0.4);

    vTwinkle = 0.65 + 0.35 * sin(t * (1.5 + aSeed * 2.0) + aSeed * 40.0);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (0.6 + aSeed) * (28.0 / -mv.z) * (1.0 + p * 0.4);
  }
`;

const FRAG = /* glsl */ `
  uniform float uFade;
  varying float vHue;
  varying float vTwinkle;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float alpha = smoothstep(0.5, 0.05, d) * vTwinkle * uFade;
    if (alpha < 0.01) discard;

    // palette: signal blue dominates; magenta + amber glints
    vec3 blue    = vec3(0.0, 0.584, 0.965);
    vec3 magenta = vec3(1.0, 0.176, 0.47);
    vec3 amber   = vec3(1.0, 0.706, 0.263);
    vec3 col = blue;
    if (vHue > 0.86) col = magenta;
    if (vHue > 0.95) col = amber;
    col += smoothstep(0.18, 0.0, d) * 0.35; // hot core

    gl_FragColor = vec4(col, alpha * 0.85);
  }
`;

// deterministic PRNG — render must stay pure (and the cloud looks the same
// every visit, which is what a brand wants anyway)
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Particles({ count }: { count: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const { positions, chaos, order, seeds, hues } = useMemo(() => {
    const rand = mulberry32(20260613);
    const positions = new Float32Array(count * 3);
    const chaos = new Float32Array(count * 3);
    const order = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const hues = new Float32Array(count);

    // lattice: a wide, shallow wall of rows — an ordered "inbox" of lights
    const cols = Math.ceil(Math.sqrt(count * 2.2));
    const rows = Math.ceil(count / cols);

    for (let i = 0; i < count; i++) {
      // chaos cloud: thick torus-ish shell so the headline stays readable
      const a = rand() * Math.PI * 2;
      const r = 3.2 + rand() * 4.2;
      const y = (rand() - 0.5) * 5.5;
      chaos[i * 3] = Math.cos(a) * r;
      chaos[i * 3 + 1] = y;
      chaos[i * 3 + 2] = Math.sin(a) * r - 1.5;

      const ci = i % cols;
      const ri = Math.floor(i / cols);
      order[i * 3] = (ci / (cols - 1) - 0.5) * 11.0;
      order[i * 3 + 1] = (ri / Math.max(rows - 1, 1) - 0.5) * 6.0;
      order[i * 3 + 2] = -1.2 + Math.sin(ci * 0.5) * 0.3;

      positions[i * 3] = chaos[i * 3];
      positions[i * 3 + 1] = chaos[i * 3 + 1];
      positions[i * 3 + 2] = chaos[i * 3 + 2];

      seeds[i] = rand();
      hues[i] = rand();
    }
    return { positions, chaos, order, seeds, hues };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: reduced ? 0.5 : 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uScrollVel: { value: 0 },
      uFade: { value: 1 },
      uSize: { value: 1 },
    }),
    [reduced]
  );

  const pointer = useRef({ x: 0, y: 0 });
  const lastScroll = useRef(0);
  const vel = useRef(0);

  useFrame((state, delta) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    u.uTime.value += reduced ? 0 : delta;

    // pointer drift (eased)
    pointer.current.x += (state.pointer.x - pointer.current.x) * 0.04;
    pointer.current.y += (state.pointer.y - pointer.current.y) * 0.04;
    u.uPointer.value.set(pointer.current.x, pointer.current.y);

    const scroller = document.getElementById(SCROLLER_ID);
    if (scroller && !reduced) {
      const vh = window.innerHeight;
      const top = scroller.scrollTop;

      // chaos→order across hero + problem, settling during the manifesto
      // (hero ends ~1vh, problem ~4.2vh, manifesto runs 4.2→8.2vh)
      u.uProgress.value = THREE.MathUtils.clamp(top / (vh * 5.5), 0, 1);

      // scroll velocity agitates the swarm
      const dv = Math.abs(top - lastScroll.current) / Math.max(delta * 1000, 1);
      vel.current += (Math.min(dv, 3) - vel.current) * 0.08;
      u.uScrollVel.value = vel.current;
      lastScroll.current = top;

      // hand the stage to the DOM as the manifesto ends
      u.uFade.value = THREE.MathUtils.clamp(1 - (top - vh * 7.2) / (vh * 0.8), 0, 1);
    }

    u.uSize.value = THREE.MathUtils.clamp(viewport.width / 11, 0.7, 1.3);
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aChaos" args={[chaos, 3]} />
        <bufferAttribute attach="attributes-aOrder" args={[order, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        <bufferAttribute attach="attributes-aHue" args={[hues, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function Scene() {
  const count =
    typeof window !== "undefined" && window.innerWidth < 768 ? 2500 : 8000;

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 50 }}
        dpr={[1, 1.8]}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
      >
        <Particles count={count} />
      </Canvas>
    </div>
  );
}
