import { BRAIN_TOPICS } from "../BrainGraph";
import type { Question } from "./types";

export const SPRING = { type: "spring" as const, stiffness: 320, damping: 30 };

// the guided interview — niche-agnostic and mostly tap-to-select, so any creator
// (food, fashion, fitness, travel, tech, comedy, music, moto — anyone) builds a
// strong brain in seconds. Only name / links / FAQ answers need real typing.
// Curated for the facts Mira actually uses to answer follower DMs + comments:
// who you are, what you offer, where to buy, collabs, gear, voice, top FAQ.
export const QUESTIONS: Question[] = [
  {
    topic: "personal",
    q: "What's your name, and where are you based?",
    kind: "text",
    fields: [
      { key: "name", label: "Name", placeholder: "Your name" },
      { key: "location", label: "Based in", placeholder: "City, country" },
    ],
  },
  {
    topic: "general",
    q: "What's your account about?",
    kind: "multi",
    allowOther: true,
    options: [
      "Fitness", "Fashion & Style", "Food", "Travel", "Tech", "Beauty",
      "Business & Finance", "Comedy", "Music", "Art & Design", "Photography",
      "Gaming", "Education", "Lifestyle", "Health & Wellness", "Automotive",
      "Sports", "Parenting",
    ],
  },
  {
    topic: "shop",
    q: "What do you do or offer here?",
    kind: "multi",
    allowOther: true,
    options: [
      "Sell physical products", "Digital products / courses",
      "Services / freelance", "Coaching / consulting",
      "Just content & entertainment", "Brand promos",
      "Affiliate / recommendations",
    ],
  },
  {
    topic: "shop",
    q: "Where can people buy, book, or find more?",
    kind: "text",
    optional: true,
    fields: [
      { key: "shop", label: "Website / shop", placeholder: "yoursite.com" },
      { key: "booking", label: "Booking / contact", placeholder: "email or link" },
      { key: "social", label: "Best other social", placeholder: "@handle or link" },
    ],
  },
  {
    topic: "general",
    q: "Open to brand collabs or paid partnerships?",
    kind: "single",
    options: ["Yes, love them", "Selective / depends", "Not right now"],
    otherLabel: "How should brands reach you? (optional)",
  },
  {
    topic: "gear",
    q: "What do you create with?",
    kind: "multi",
    allowOther: true,
    optional: true,
    options: [
      "Phone camera", "DSLR / mirrorless", "GoPro", "Drone", "Mic",
      "Ring light", "Lightroom", "CapCut", "Premiere Pro", "Final Cut",
      "Canva", "Photoshop",
    ],
  },
  {
    topic: "personal",
    q: "Your personality & content vibe?",
    kind: "multi",
    options: [
      "Funny", "Chill", "Energetic", "Professional", "Inspirational",
      "Educational", "Bold", "Wholesome", "Aesthetic", "Warm", "Real / raw",
      "Playful",
    ],
  },
  {
    topic: "general",
    q: "What do followers ask you most?",
    kind: "multi",
    options: [
      "Prices", "Where to buy", "How to start", "Your gear", "Your location",
      "Collabs", "Recommendations", "Tutorials",
    ],
    otherLabel: "The short answer they need (optional)",
  },
  {
    topic: "general",
    q: "Anything else Mira should know?",
    kind: "longtext",
    optional: true,
  },
];

export const TOPIC = Object.fromEntries(BRAIN_TOPICS.map((t) => [t.key, t]));
