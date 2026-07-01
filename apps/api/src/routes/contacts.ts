// Contacts — searchable CRM-style list, derived from commenters + conversation
// status (no new table; doc: Mira.dc.html:763-777).
import { Elysia } from "elysia";
import { listContacts } from "@shaiz/db";
import { authPlugin } from "../plugins/auth";

export const contactsRoute = new Elysia()
  .use(authPlugin)
  .get("/api/ig/contacts", async ({ auth, set }) => {
    if (!auth.accountId) { set.status = 404; return { error: "no account" }; }
    return { contacts: await listContacts(auth.accountId) };
  }, { auth: true });
