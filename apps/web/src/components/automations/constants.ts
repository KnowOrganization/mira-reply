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

export const MESSAGE_TEMPLATES: Record<string, string[]> = {
  opening_message: [
    "Hey! 👋 Thanks for commenting — sending you the details right now!",
    "Hi there! 😊 Saw your comment — I've got something for you!",
    "Hey! ✨ You just unlocked something special — hold tight!",
  ],
  text_message: [
    "Here's the link you asked for 👇\n[paste your link here]\n\nLet me know if you have any questions! 😊",
    "Here it is! 🔥 Hope this helps — drop me a DM if you need anything else.",
    "Sending it over now 👇\n[your content here]\n\nEnjoy! 🙌",
  ],
  ask_follow: [
    "Hey! 👋 To get exclusive access, follow @[username] first 💜\n\nOnce you do, reply \"done\" and I'll send it right over!",
    "This is just for our community 🙏\n\nFollow @[username] then reply \"following\" and I'll unlock it for you!",
    "Almost there! 🔒\n\nFollow @[username] to get the full details — then come back and reply \"done\" 👇",
  ],
  follow_gate: [
    "Oops! 😅 This is for our community only 💜\n\nFollow @[username] to unlock it!\n\nOnce you've followed, reply \"done\" 👇",
    "Hey! This content is exclusive for followers 💜\n\nFollow @[username] and reply \"following\" when done!",
    "Almost there! 🔒 This is for our fam only.\n\nFollow @[username] first, then come back here and reply \"done\" 👇",
  ],
  lead_form: [
    "What's the best email to send this to? 📩",
    "Drop your WhatsApp number and I'll reach out personally! 📱",
    "What's your name? I'll make this just for you 😊",
  ],
  followup_message: [
    "Hey! 👋 Just checking in — did you get a chance to look at what I sent?",
    "Following up! 😊 Hope it was helpful — any questions at all?",
    "Hey! Just wanted to make sure everything arrived okay ✨ Let me know!",
  ],
};

export const NODE_DEFAULTS: Partial<Record<string, string>> = {
  opening_message: "Hey! 👋 Thanks for commenting — sending you the details right now!",
  text_message: "Here's what you asked for 👇\n[paste your link or content here]\n\nLet me know if you need anything! 😊",
  ask_follow: "Hey! 👋 To get exclusive access, follow @[username] first 💜\n\nOnce you do, reply \"done\" and I'll send it right over!",
  follow_gate: "Hey! 👋 This content is for our community 💜\n\nFollow @[username] to unlock it — once you do, reply \"done\" and I'll send it right over! 🙏",
  lead_form: "What's the best email to send this to? 📩",
  followup_message: "Hey! 👋 Just checking in — did you get a chance to look at what I sent?",
};

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
