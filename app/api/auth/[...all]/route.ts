// Mounts BetterAuth at /api/auth/* (sign-in, callback, session, sign-out).
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/server";

export const { GET, POST } = toNextJsHandler(auth);
