export const ig = {
  appId: process.env.META_APP_ID || "",
  appSecret: process.env.META_APP_SECRET || "",
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001",
  verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || "",
  redirectPath: "/api/ig/callback",
  scopes: [
    "instagram_business_basic",
    "instagram_business_manage_comments",
    "instagram_business_manage_messages",
    "instagram_business_manage_insights",
  ],
};

export function redirectUri() {
  return `${ig.baseUrl}${ig.redirectPath}`;
}

export function isConfigured() {
  return !!(ig.appId && ig.appSecret);
}
