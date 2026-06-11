"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { ConnectGate } from "@/components/ConnectGate";
import { CanvasLayout } from "@/components/CanvasLayout";
import { MiraLogo } from "@/components/MiraLogo";
import { AuthGate } from "@/components/AuthGate";

export default function Home() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}

function AppShell() {
  const { data, isLoading } = useQuery({
    queryKey: ["ig", "status"],
    queryFn: () => api.get<{ connected: boolean }>("/api/ig/status"),
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <MiraLogo size={40} />
        </motion.div>
      </div>
    );
  }

  if (!data?.connected) return <ConnectGate />;
  return <CanvasLayout />;
}
