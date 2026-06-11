import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getDigest } from "../../../services/analytics-service";

export const getDigestHandler = new Elysia().use(authPlugin).get(
  "/api/ig/digest",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getDigest(auth.accountId);
  },
  { auth: true }
);
