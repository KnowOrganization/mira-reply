"use client";
import { createAuthClient } from "better-auth/react";

// Browser auth client. baseURL omitted → uses the current origin (works on
// localhost and the ngrok tunnel alike). Sessions are cookies, so no token
// plumbing is needed elsewhere.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
