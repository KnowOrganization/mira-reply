"use client";
// t03-luxe hero scene — a single transmissive gem turning slowly in the dark.
// Deliberately minimal: transmission materials render the scene twice, so the
// whole scene is ONE icosahedron + three lights (the double pass stays cheap).
// The canvas is alpha — the CSS light-bloom poster underneath shows through.
import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type GemSceneProps = { accent: string; onReady?: () => void };

const RADIUS = 5; // matches camera position [0, 0, 5]
const MAX_TILT = THREE.MathUtils.degToRad(6); // pointer orbits the camera ±6°

function Gem({ accent, onReady }: GemSceneProps) {
  const mesh = useRef<THREE.Mesh>(null);
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

  useFrame(({ camera }) => {
    const m = mesh.current;
    if (m) {
      m.rotation.y += 0.0015;
      m.rotation.x += 0.0006;
    }

    // Subtle pointer orbit: lerp the camera toward a ±6° spherical offset,
    // always looking at the origin.
    const yaw = pointer.current.x * MAX_TILT;
    const pitch = -pointer.current.y * MAX_TILT;
    const cp = Math.cos(pitch);
    const tx = Math.sin(yaw) * cp * RADIUS;
    const ty = Math.sin(pitch) * RADIUS;
    const tz = Math.cos(yaw) * cp * RADIUS;
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.04;
    camera.position.z += (tz - camera.position.z) * 0.04;
    camera.lookAt(0, 0, 0);

    // Signal readiness once the first frame has actually been drawn
    // (this callback runs pre-render, so announce on the second tick).
    frames.current += 1;
    if (frames.current === 2) readyRef.current?.();
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      {/* Key: one bone-white beam from the upper-left — the vitrine spotlight. */}
      <spotLight
        position={[-4, 5, 4]}
        color="#ece7dd"
        intensity={14}
        angle={0.5}
        penumbra={1}
      />
      {/* Accent-tinted glow behind the gem for a rim of owner color. */}
      <pointLight position={[0, 0.4, -3]} color={accent} intensity={8} />
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.4, 1]} />
        <meshPhysicalMaterial
          transmission={1}
          thickness={2}
          roughness={0.08}
          ior={2.4}
          attenuationColor={accent}
          attenuationDistance={2.5}
          clearcoat={1}
        />
      </mesh>
    </>
  );
}

export default function Gem3D({ accent, onReady }: GemSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 5], fov: 40 }}
    >
      <Gem accent={accent} onReady={onReady} />
    </Canvas>
  );
}
