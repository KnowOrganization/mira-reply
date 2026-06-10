"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ConnectGate } from "@/components/ConnectGate";
import { CanvasLayout } from "@/components/CanvasLayout";
import { MiraLogo } from "@/components/MiraLogo";

export default function Home() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/ig/status")
      .then((r) => r.json())
      .then((d) => setConnected(!!d.connected))
      .catch(() => setConnected(false));
  }, []);

  if (connected === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <MiraLogo size={40} />
        </motion.div>
      </div>
    );
  }

  if (!connected) return <ConnectGate />;

  return <CanvasLayout />;
}
