"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSession, signIn } from "@/lib/auth/client";
import { MiraLogo } from "@/components/MiraLogo";

// Gates the app behind Google sign-in (BetterAuth). Session is a cookie, so once
// signed in every same-origin /api request is authenticated automatically — no
// token plumbing, no fetch patching.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) return <Splash />;
  if (!session) return <SignIn />;
  return <>{children}</>;
}

function Splash() {
  return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }}>
        <MiraLogo size={40} />
      </motion.div>
    </div>
  );
}

function SignIn() {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    await signIn.social({ provider: "google", callbackURL: "/" });
  };
  return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-8 px-8"
      >
        <MiraLogo size={56} />
        <div className="text-center">
          <h1 className="text-white text-2xl font-semibold tracking-tight">Welcome to Mira</h1>
          <p className="text-white/50 text-sm mt-2">Sign in to connect your Instagram and automate replies.</p>
        </div>
        <button
          onClick={go}
          disabled={busy}
          className="flex items-center gap-3 bg-white text-black font-medium rounded-full px-6 py-3 hover:bg-white/90 transition disabled:opacity-60"
        >
          <GoogleMark />
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>
      </motion.div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
