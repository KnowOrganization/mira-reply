"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MiraLogo } from "@/components/MiraLogo";

const ProductsView = dynamic(
  () => import("@/components/products/ProductsView").then((m) => m.ProductsView),
  {
    ssr: false,
    loading: () => <PanelBoot />,
  }
);

export default function StorePage() {
  return (
    <div className="flex-1 min-h-0">
      <ProductsView />
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
