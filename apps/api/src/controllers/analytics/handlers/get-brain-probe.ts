import { Elysia } from "elysia";
import { authPlugin } from "../../../plugins/auth";
import { getBrainProbe } from "../../../services/analytics-service";

export const getBrainProbeHandler = new Elysia().use(authPlugin).get(
  "/api/ig/brain-probe",
  async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return getBrainProbe();
  },
  { auth: true }
);
