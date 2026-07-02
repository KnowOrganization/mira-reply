"use client";
// Pointer-tracked 3D tilt card. Applies perspective rotation itself and
// exposes pointer position as CSS vars for template-owned sheen/glint layers:
//   --sf-px / --sf-py   pointer position within the card, 0→1
// Mouse-only; touch devices render children untransformed.
import { useRef } from "react";

type Props = {
  children: React.ReactNode;
  /** max tilt in degrees */
  max?: number;
  /** scale while hovered */
  hoverScale?: number;
  className?: string;
  style?: React.CSSProperties;
};

export default function Tilt({ children, max = 7, hoverScale = 1.02, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.setProperty("--sf-px", "0.5");
    el.style.setProperty("--sf-py", "0.5");
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: "transform .45s cubic-bezier(.16,1,.3,1)",
        transformStyle: "preserve-3d",
        willChange: "transform",
        ...style,
      }}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * max * 2).toFixed(2)}deg) rotateY(${((px - 0.5) * max * 2).toFixed(2)}deg) scale(${hoverScale})`;
        el.style.setProperty("--sf-px", px.toFixed(3));
        el.style.setProperty("--sf-py", py.toFixed(3));
      }}
      onPointerLeave={reset}
    >
      {children}
    </div>
  );
}
