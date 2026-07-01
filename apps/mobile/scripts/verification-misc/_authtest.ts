// @ts-nocheck — throwaway verification script (node/bun), not part of the app build
import { auth } from "@shaiz/auth";
const h = new Headers({ authorization: "Bearer cc8937a6c37e110ae96676957a2f5641bd27d23345cf96679e3fb164bfbbcd8b" });
try {
  const s = await auth.api.getSession({ headers: h });
  console.log("SESSION:", JSON.stringify(s));
} catch(e:any) {
  console.log("THREW:", e?.message, e?.status, e?.body && JSON.stringify(e.body));
}
process.exit(0);
