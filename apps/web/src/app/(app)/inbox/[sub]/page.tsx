"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MiraLogo } from "@/components/MiraLogo";

const InboxView = dynamic(
  () => import("@/components/InboxView").then((m) => m.InboxView),
  {
    ssr: false,
    loading: () => <PanelBoot />,
  }
);

export default function InboxPage({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = use(params);
  return (
    <div className="flex-1 min-h-0">
      <InboxView tab={sub} />
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
