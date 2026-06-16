import type { Metadata } from "next";
import { Archivo, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { LandingPage } from "@/components/landing/LandingPage";

const display = Archivo({
  subsets: ["latin"],
  variable: "--font-m-display",
  // variable axis — we use weights 300→900 across the page
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-m-serif",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-m-mono",
});

export const metadata: Metadata = {
  title: "Mira — The OS for your DMs",
  description:
    "Mira turns the flood of Instagram comments, mentions and messages into conversations, customers and closed deals — in your voice, on the official API.",
  openGraph: {
    title: "Mira — The OS for your DMs",
    description:
      "AI drafts. A human sends. Instagram business conversations, run like a business.",
    type: "website",
  },
};

export default function Landing() {
  return (
    <div className={`${display.variable} ${serif.variable} ${mono.variable}`}>
      <LandingPage />
    </div>
  );
}
