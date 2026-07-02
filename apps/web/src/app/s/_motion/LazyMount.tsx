"use client";
// Defers mounting heavy children until the wrapper nears the viewport
// (IntersectionObserver, generous rootMargin). `placeholder` holds layout
// space so nothing shifts when the real content mounts.
import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  className?: string;
  style?: React.CSSProperties;
};

export default function LazyMount({
  children,
  placeholder = null,
  rootMargin = "200px",
  className,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, show]);

  return (
    <div ref={ref} className={className} style={style}>
      {show ? children : placeholder}
    </div>
  );
}
