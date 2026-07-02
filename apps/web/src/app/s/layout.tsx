// Storefront scroll container. The root <body> is h-screen overflow-hidden (for
// the app shell), which would clip a long storefront in a mobile DM webview. This
// nested layout gives /s/* its own full-height scroll context via SmoothScroll
// (id="sf-scroll", Lenis on desktop, native scroll on touch/webviews).
import SmoothScroll from "./_motion/SmoothScroll";
import "./_motion/motion.css";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <SmoothScroll>{children}</SmoothScroll>;
}
