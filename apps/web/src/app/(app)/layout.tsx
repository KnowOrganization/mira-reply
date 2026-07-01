"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { MiraLogo } from "@/components/MiraLogo";
import { AuthGate } from "@/components/AuthGate";
import { CanvasLayout } from "@/components/CanvasLayout";

const ConnectGate = dynamic(
  () => import("@/components/ConnectGate").then((m) => m.ConnectGate),
  { ssr: false, loading: Boot }
);
const OnboardingBrain = dynamic(
  () => import("@/components/OnboardingBrain").then((m) => m.OnboardingBrain),
  { ssr: false, loading: Boot }
);

type Status = {
  connected: boolean;
  brainReady?: boolean;
  onboardingSkipped?: boolean;
  onboardingStep?: string;
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["ig", "status"],
    queryFn: () => api.get<Status>("/api/ig/status"),
  });

  if (isLoading && !data) return <Boot />;
  if (!data?.connected) return <ConnectGate />;
  const onboardingDone = data.onboardingStep === "done" || data.onboardingSkipped;
  if (!data.brainReady && !onboardingDone) return <OnboardingBrain />;
  return <CanvasLayout>{children}</CanvasLayout>;
}

function Boot() {
  return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: "var(--bg-frame)" }}>
      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
        <MiraLogo size={40} />
      </motion.div>
    </div>
  );
}
