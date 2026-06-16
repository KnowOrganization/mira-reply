"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { prefersReducedMotion } from "./scroll";

// ── Act II: the signal field ────────────────────────────────────────────
// A full-bleed GLSL plane — layered value-noise interference that bends
// toward the pointer. The "noise of the feed" rendered as something
// beautiful, sitting behind "Built India-first."

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2  uRes;
  uniform vec2  uPointer;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.05 + vec2(13.7, 7.3);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 2.2;

    float d = distance(uv, uPointer * 0.5 + 0.5);
    float pull = smoothstep(0.7, 0.0, d) * 0.6;

    float t = uTime * 0.08;
    float n = fbm(p + vec2(t, -t * 0.6) + fbm(p * 0.8 - t) * (1.1 + pull));

    // horizontal signal bands sliced by the noise field
    float bands = sin((uv.y + n * 0.35) * 60.0);
    float line = smoothstep(0.0, 0.9, bands) * smoothstep(2.0, 0.9, bands);

    vec3 blue    = vec3(0.0, 0.584, 0.965);
    vec3 magenta = vec3(1.0, 0.176, 0.47);
    vec3 amber   = vec3(1.0, 0.706, 0.263);

    vec3 col = vec3(0.012);
    col += blue * line * (0.10 + n * 0.32);
    col += magenta * line * smoothstep(0.8, 1.0, n) * 0.38;
    col += amber * line * smoothstep(0.0, 0.18, pull) * 0.35;

    // vignette
    col *= smoothstep(1.0, 0.3, distance(uv, vec2(0.5)));

    gl_FragColor = vec4(col, 1.0);
  }
`;

const VERT = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

function WavePlane() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { size, gl } = useThree();
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const pointer = useRef({ x: 0, y: 0 });

  const uniforms = useMemo(
    () => ({
      uTime: { value: reduced ? 12 : 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0, 0) },
    }),
    [reduced]
  );

  useFrame((state, delta) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    if (!reduced) u.uTime.value += delta;
    u.uRes.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio());
    pointer.current.x += (state.pointer.x - pointer.current.x) * 0.05;
    pointer.current.y += (state.pointer.y - pointer.current.y) * 0.05;
    u.uPointer.value.set(pointer.current.x, pointer.current.y);
  });

  return (
    <mesh>
      {/* fullscreen triangle-ish quad in clip space — vertex shader passes through */}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat} vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} />
    </mesh>
  );
}

// Mounts its WebGL context only while the section is near the viewport.
export function SignalWave() {
  const host = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setLive(entries[0].isIntersecting),
      { rootMargin: "40% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className="absolute inset-0" aria-hidden>
      {live && (
        <Canvas dpr={[1, 1.5]} gl={{ antialias: false, alpha: false }}>
          <WavePlane />
        </Canvas>
      )}
    </div>
  );
}
