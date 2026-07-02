"use client";
// t04-neon hero scene — infinite synthwave wireframe terrain scrolling toward
// the horizon. ONE plane (60×60 world units, 90×90 segments ≈ 8.2k verts),
// meshBasicMaterial wireframe in the owner accent, scene fog fading it into
// the poster's #070912 sky. Vertices are displaced every frame with a cheap
// hash-based 2D value noise sampled at (x, z + time·speed): mountains rise at
// the flanks, a flat corridor runs down the middle toward the camera. Pointer
// pans the camera ±3° (lerped) so the grid parallaxes under the headline.
import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type TerrainProps = { accent: string; onReady?: () => void };

const SPEED = 1.6;        // world units/sec the terrain flows toward the camera
const AMP = 2.6;          // peak mountain height
const FREQ = 0.16;        // noise frequency (larger = busier ridges)
const CORRIDOR = 2.4;     // half-width of the flat center lane
const RAMP = 9;           // distance over which flanks ramp up to full height
const MAX_PAN = THREE.MathUtils.degToRad(3); // pointer pan, per spec
const CAM_R = 4.2;

// ── deterministic 2D value noise (no Math.random — same field every frame) ──
function hash2(ix: number, iz: number): number {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}
/** two octaves, recentered to roughly ±1 */
function ridge(x: number, z: number): number {
  return (vnoise(x * FREQ, z * FREQ) * 0.72 + vnoise(x * FREQ * 2.3, z * FREQ * 2.3) * 0.28) * 2 - 1;
}
/** 0 in the corridor, easing to 1 on the flanks */
function flank(x: number): number {
  const t = Math.min(1, Math.max(0, (Math.abs(x) - CORRIDOR) / RAMP));
  return t * t * (3 - 2 * t);
}

function Terrain({ accent, onReady }: TerrainProps) {
  const geo = useRef<THREE.PlaneGeometry>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const frames = useRef(0);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ camera, clock }) => {
    const g = geo.current;
    if (g) {
      const t = clock.getElapsedTime() * SPEED;
      const pos = g.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      // Plane is rotated -PI/2 about X, so local (x, y) is the ground plane
      // (local +y → world -z) and local z is height. Scrolling the noise field
      // along local y makes ridges flow out of the fog toward the camera.
      for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        arr[i + 2] = ridge(x, y + t) * AMP * flank(x);
      }
      pos.needsUpdate = true;
    }

    // Pointer pan: yaw the camera ±3° around the corridor, gently lerped.
    const yaw = pointer.current.x * MAX_PAN;
    const ty = 1.2 - pointer.current.y * 0.18;
    camera.position.x += (Math.sin(yaw) * CAM_R - camera.position.x) * 0.045;
    camera.position.z += (Math.cos(yaw) * CAM_R - camera.position.z) * 0.045;
    camera.position.y += (ty - camera.position.y) * 0.045;
    camera.lookAt(0, 0.9, -9);

    // Announce readiness after the first frame has actually been drawn
    // (useFrame runs pre-render, so signal on the second tick).
    frames.current += 1;
    if (frames.current === 2) readyRef.current?.();
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -12]}>
      <planeGeometry ref={geo} args={[60, 60, 90, 90]} />
      <meshBasicMaterial wireframe color={accent} transparent opacity={0.62} />
    </mesh>
  );
}

export default function Terrain3D({ accent, onReady }: TerrainProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 1.2, 4.2], fov: 62 }}
    >
      <fog attach="fog" args={["#070912", 4, 26]} />
      <Terrain accent={accent} onReady={onReady} />
    </Canvas>
  );
}
