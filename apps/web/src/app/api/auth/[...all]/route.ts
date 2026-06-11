// Mounts BetterAuth at /api/auth/* (sign-in, callback, session, sign-out).
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@shaiz/auth";

export const { GET, POST } = toNextJsHandler(auth);
