// CRM routes (spec Phase 1): contacts + conversations + window-gated send.
import { Elysia } from "elysia";
import { crmController } from "../controllers/crm";

export const crmRoute = new Elysia().use(crmController);
