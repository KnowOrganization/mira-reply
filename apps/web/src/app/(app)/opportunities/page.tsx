"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MiraLogo } from "@/components/MiraLogo";

const OpportunitiesView = dynamic(
  () => import("@/components/OpportunitiesView").then((m) => m.OpportunitiesView),
  {
    ssr: false,
    loading: () => <PanelBoot />,
  }
);

export default function OpportunitiesPage() {
  return (
    <div className="flex-1 min-h-0">
      <OpportunitiesView />
    </div>
  );
}

function PanelBoot() {
  return (
    <div className="flex-1 h-full flex items-center justify-center" style={{ background: "var(--bg-frame)" }}>
      <motion.div animate={{ opacity: [0.25, 0.7, 0.25] }} transition={{ duration: 1.6, repeat: Infinity }}>
        <MiraLogo size={30} color="var(--text-subtle)" />
      </motion.div>
    </div>
  );
}
