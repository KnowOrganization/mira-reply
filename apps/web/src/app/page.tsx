"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { MiraLogo } from "@/components/MiraLogo";
import { AuthGate } from "@/components/AuthGate";

// Heavy view trees are split out of the initial bundle — the gate only needs the
// status decision to paint. The chosen view streams in with a themed fallback,
// so the first byte of interactive UI no longer waits on PostCanvas / Automations
// / the brain editor all being parsed up front.
const ConnectGate = dynamic(() => import("@/components/ConnectGate").then((m) => m.ConnectGate), {
  ssr: false,
  loading: Boot,
});
const OnboardingBrain = dynamic(() => import("@/components/OnboardingBrain").then((m) => m.OnboardingBrain), {
  ssr: false,
  loading: Boot,
});
const CanvasLayout = dynamic(() => import("@/components/CanvasLayout").then((m) => m.CanvasLayout), {
  ssr: false,
  loading: Boot,
});

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

  // With the persisted cache `data` is already present on reload, so this only
  // shows on a genuine cold start (cleared cache) — themed, never a black flash.
  if (isLoading && !data) return <Boot />;

  // 1. Not connected → intro + connect Instagram.
  if (!data?.connected) return <ConnectGate />;

  // 2. Connected but brain not trained yet (and not explicitly skipped/done) →
  //    the compulsory-feeling "train your brain" step.
  const onboardingDone = data.onboardingStep === "done" || data.onboardingSkipped;
  if (!data.brainReady && !onboardingDone) return <OnboardingBrain />;

  // 3. Brain ready (or skipped) → the full app.
  return <CanvasLayout />;
}

// Themed first-paint + lazy-view fallback. Uses theme tokens so it blends into
// light or dark instead of flashing a hardcoded black panel.
function Boot() {
  return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: "var(--bg-frame)" }}>
      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
        <MiraLogo size={40} />
      </motion.div>
    </div>
  );
}
