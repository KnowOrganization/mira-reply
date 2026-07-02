"use client";
// t03-luxe — mounts the WebGL gem over the hero's CSS light-bloom poster.
// poster={null}: the poster layers already live in Listing.tsx (SSR/LCP);
// the gate only adds the lazily-loaded scene layer when the device qualifies.
import Hero3DGate from "../../_motion/Hero3DGate";

const load = () => import("./Gem3D");

export default function Hero3D({ accent }: { accent: string }) {
  return (
    <Hero3DGate
      poster={null}
      load={load}
      sceneProps={{ accent }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    />
  );
}
