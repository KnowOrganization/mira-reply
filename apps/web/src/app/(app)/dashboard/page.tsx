"use client";

import { PostCanvas } from "@/components/PostCanvas";
import { MiraFeed } from "@/components/MiraFeed";

export default function DashboardPage() {
  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 min-w-0 flex flex-col relative canvas-bg">
        <div className="px-6 pt-5 pb-2 shrink-0">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--text-subtle)" }}>Posts</span>
        </div>
        <PostCanvas />
      </div>
      <div className="w-[280px] shrink-0 flex flex-col px-5 py-5" style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-elev)" }}>
        <MiraFeed />
      </div>
      <style>{`
        .canvas-bg {
          background-color: var(--bg);
          background-image: radial-gradient(circle, var(--border) 1px, transparent 1px);
          background-size: 28px 28px;
        }
      `}</style>
    </div>
  );
}
