"use client";
// t04-neon — gate wiring for the wireframe-terrain hero. The RSC Listing
// builds the pure-CSS perspective-grid poster (SSR/LCP + permanent mobile
// fallback) and passes it here as a JSX node; the gate renders it always and
// upgrades to the lazily-imported Terrain3D scene only on qualifying devices.
import Hero3DGate from "../../_motion/Hero3DGate";

const load = () => import("./Terrain3D");

export default function Hero3D({ accent, poster }: { accent: string; poster: React.ReactNode }) {
  return (
    <Hero3DGate
      poster={poster}
      load={load}
      sceneProps={{ accent }}
      style={{ position: "absolute", inset: 0 }}
    />
  );
}
