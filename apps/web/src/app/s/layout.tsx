// Storefront scroll container. The root <body> is h-screen overflow-hidden (for
// the app shell), which would clip a long storefront in a mobile DM webview. This
// nested layout gives /s/* its own full-height scroll context.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ height: "100dvh", overflowY: "auto", overflowX: "hidden" }}>{children}</div>;
}
