"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { ConnectGate } from "@/components/ConnectGate";
import { CanvasLayout } from "@/components/CanvasLayout";
import { OnboardingBrain } from "@/components/OnboardingBrain";
import { MiraLogo } from "@/components/MiraLogo";
import { AuthGate } from "@/components/AuthGate";

type Status = {
  connected: boolean;
  brainReady?: boolean;
  onboardingSkipped?: boolean;
  onboardingStep?: string;
};

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
    queryFn: () => api.get<Status>("/api/ig/status"),
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

  // 1. Not connected → intro + connect Instagram.
  if (!data?.connected) return <ConnectGate />;

  // 2. Connected but brain not trained yet (and not explicitly skipped/done) →
  //    the compulsory-feeling "train your brain" step. We always build the
  //    brain before unlocking the rest of the app.
  const onboardingDone = data.onboardingStep === "done" || data.onboardingSkipped;
  if (!data.brainReady && !onboardingDone) return <OnboardingBrain />;

  // 3. Brain ready (or skipped) → the full app.
  return <CanvasLayout />;
}
