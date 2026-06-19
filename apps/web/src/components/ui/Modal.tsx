// Modal — centered Linear-style dialog. Pure shell: backdrop blur, scale-spring
// in/out, Esc + click-outside close. `onClose` is owned by the caller.
"use client";
import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export function Modal({
  open,
  onClose,
  children,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          style={{ background: "rgba(15,18,25,0.32)", backdropFilter: "blur(3px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[86vh] flex flex-col overflow-hidden rounded-2xl"
            style={{ maxWidth: width, background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-pop)" }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: "spring", stiffness: 460, damping: 38 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
