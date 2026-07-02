"use client";
// Capability gate for WebGL hero scenes. Always renders the poster (which is
// therefore the SSR output AND the LCP element); upgrades to the scene only
// when the device qualifies (canRun3D) and the hero is near the viewport.
// The scene unmounts again when scrolled far away — poster stays, GPU rests.
//
// Usage (from a per-template client file, so the loader never crosses the
// RSC boundary):
//   const load = () => import("./Scene3D");
//   <Hero3DGate poster={<Poster/>} load={load} sceneProps={{ accent }} />
import { useEffect, useRef, useState, type ComponentType } from "react";
import { canRun3D } from "./scroll";

type Props = {
  poster: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load: () => Promise<{ default: ComponentType<any> }>;
  sceneProps?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
};

export default function Hero3DGate({ poster, load, sceneProps, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [Scene, setScene] = useState<ComponentType<any> | null>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !canRun3D()) return;
    let loaded = false;
    const io = new IntersectionObserver(
      (entries) => {
        const near = entries[0].isIntersecting;
        setVisible(near);
        if (near && !loaded) {
          loaded = true;
          load().then((m) => setScene(() => m.default));
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  return (
    <div ref={ref} className={className} style={{ position: "relative", ...style }}>
      {poster}
      {Scene && visible ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: ready ? 1 : 0,
            transition: "opacity 1.2s ease",
          }}
        >
          <Scene {...sceneProps} onReady={() => setReady(true)} />
        </div>
      ) : null}
    </div>
  );
}
