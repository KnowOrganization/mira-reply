// Pure data constants for the Automations feature (no JSX)
// RESPONSE_TYPES (contains JSX icons) lives in responseTypes.tsx

export const BUTTON_SUGGESTIONS = [
  "Send me the link 🔗",
  "Get access ✨",
  "Show me more 👇",
  "Claim my spot 🙋",
  "Yes, I'm in! 🙌",
  "Tell me more 💬",
  "Download now ⬇️",
  "Book a call 📞",
];

export const TRIGGER_OPTIONS = [
  { value: "comment_post", label: "User Comments on your post or reel" },
  { value: "dm",           label: "User DMs to you" },
  { value: "live_comment", label: "User Comments on your LIVE" },
  { value: "story_reply",  label: "User replies to your stories" },
];

export const DELAY_OPTS = [1, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1410];

// SmartGridCanvas layout constants
export const SG_NODE_W = 288;
export const SG_HGAP   = 56;
export const SG_VGAP   = 56;
export const SG_PAD_X  = 56;
export const SG_PAD_Y  = 48;
