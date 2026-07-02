"use client";
// t07-drop hero scene — the drop image on a distortion plane. One fullscreen
// quad (the vertex shader bypasses the camera entirely), cover-fit UV math in
// the fragment shader. Pointer moves kick uImpulse (decays every frame) and
// radiate a sine ripple from uMouse; scroll velocity on #sf-scroll drives an
// RGB split with a faint accent tint riding the split edges. No drei.
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

type Props = { imageUrl: string; accent: string; onReady?: () => void };

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uMouse;
uniform float uImpulse;
uniform float uTime;
uniform float uVelocity;
uniform float uCanvasAspect;
uniform float uImageAspect;
uniform vec3 uAccent;

// cover-fit: sample a canvas-aspect window out of the image, centered.
vec2 coverUv(vec2 uv) {
  vec2 s = uCanvasAspect > uImageAspect
    ? vec2(1.0, uImageAspect / uCanvasAspect)
    : vec2(uCanvasAspect / uImageAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec2 uv = vUv;

  // radial ripple from the pointer — aspect-corrected distance so rings stay round
  vec2 toMouse = uv - uMouse;
  float dist = length(toMouse * vec2(uCanvasAspect, 1.0));
  float wave = sin(dist * 42.0 - uTime * 7.5) * exp(-dist * 5.0) * uImpulse * 0.035;
  vec2 dir = dist > 0.0005 ? normalize(toMouse) : vec2(0.0);
  uv += dir * wave;

  // scroll-velocity RGB split along x (impulse adds a touch on hover too)
  float split = clamp(uVelocity, 0.0, 1.0) * 0.012 + uImpulse * 0.003;
  float r = texture2D(uTex, coverUv(uv + vec2(split, 0.0))).r;
  float g = texture2D(uTex, coverUv(uv)).g;
  float b = texture2D(uTex, coverUv(uv - vec2(split, 0.0))).b;
  vec3 col = vec3(r, g, b);

  // faint accent tint multiplied onto the split edges
  float edge = clamp(abs(r - b) * 2.4, 0.0, 1.0) * clamp(uVelocity * 1.6 + uImpulse * 0.4, 0.0, 1.0);
  col = mix(col, col * (uAccent * 1.35 + 0.12), edge * 0.6);

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToVec3(hex: string): THREE.Vector3 {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0xccff00;
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function RipplePlane({ imageUrl, accent, onReady }: Props) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  const { gl, size } = useThree();
  const sim = useRef({
    target: new THREE.Vector2(0.5, 0.5),
    last: null as THREE.Vector2 | null,
    impulse: 0,
    vel: 0,
    scroll: null as number | null,
    frames: 0,
  });
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  const uniforms = useMemo(
    () => ({
      uTex: { value: null as THREE.Texture | null },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uImpulse: { value: 0 },
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uAccent: { value: hexToVec3(accent) },
      uCanvasAspect: { value: 1 },
      uImageAspect: { value: 1 },
    }),
    // must stay referentially stable across renders; accent is fixed per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    uniforms.uTex.value = texture;
    const img = texture.image as
      | { naturalWidth?: number; width?: number; naturalHeight?: number; height?: number }
      | undefined;
    const w = img?.naturalWidth || img?.width || 1;
    const h = img?.naturalHeight || img?.height || 1;
    uniforms.uImageAspect.value = w / h;
  }, [texture, uniforms]);

  // pointermove / touchmove → uMouse (normalized to the canvas) + impulse kick
  useEffect(() => {
    const s = sim.current;
    const point = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const next = new THREE.Vector2(
        (clientX - rect.left) / rect.width,
        1 - (clientY - rect.top) / rect.height,
      );
      s.impulse = Math.min(1.25, s.impulse + (s.last ? next.distanceTo(s.last) * 5 : 0.4));
      s.last = next;
      s.target.copy(next);
    };
    const onPointer = (e: PointerEvent) => point(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) point(t.clientX, t.clientY);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const s = sim.current;
    const d = Math.min(dt || 0.016, 0.05);
    uniforms.uTime.value += d;

    // impulse decays; mouse eases toward the last pointer position
    s.impulse *= Math.exp(-d * 2.4);
    uniforms.uImpulse.value = s.impulse;
    uniforms.uMouse.value.lerp(s.target, 0.16);

    // scroll velocity off the storefront scroller — abs delta, lerp-smoothed
    const scroller = document.getElementById("sf-scroll");
    const top = scroller ? scroller.scrollTop : 0;
    if (s.scroll == null) s.scroll = top;
    const raw = Math.min(1, Math.abs(top - s.scroll) / 55);
    s.scroll = top;
    s.vel += (raw - s.vel) * (raw > s.vel ? 0.3 : 0.055);
    uniforms.uVelocity.value = s.vel;

    uniforms.uCanvasAspect.value = size.height ? size.width / size.height : 1;

    // announce readiness once a frame has actually been drawn
    s.frames += 1;
    if (s.frames === 2) readyRef.current?.();
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function Ripple3D({ imageUrl, accent, onReady }: Props) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <RipplePlane imageUrl={imageUrl} accent={accent} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
