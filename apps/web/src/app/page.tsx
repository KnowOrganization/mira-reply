"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";

// Authenticated users who land at "/" are sent to /dashboard.
// Unauthenticated users see the sign-in gate (rendered by AuthGate).
function GoToDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}

export default function Root() {
  return (
    <AuthGate>
      <GoToDashboard />
    </AuthGate>
  );
}
