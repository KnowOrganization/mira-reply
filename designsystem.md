# Haze — Design System

A minimal, premium design system for an Instagram automation app.
Monochrome UI on off-white, with a near-invisible ambient gradient that fills empty
space, and a single rose accent reserved for interactive states.

---

## 1. Principles

- **Minimal and premium.** Near-black ink and grays on off-white. Generous whitespace.
  The interface should feel calm and expensive — never busy, never cute.
- **The gradient is ambient, not decorative.** One soft radial gradient sits _behind_
  the app and pools color into empty space so screens never feel hollow — but at
  ~3–4% saturation it's barely noticeable. It belongs to the app background only.
- **One accent per region.** A single rose/magenta accent appears only on interactive
  or active states (active nav item, selection, toggles, unread dots, key links).
  Everything else is monochrome. Two competing accent moments on one screen = a bug.
- **Black is the primary action,** not a color. Primary buttons are near-black with
  white text. The accent _fill_ is reserved for at most one critical CTA per screen.
- **No Instagram cosplay.** Never use the literal Instagram rainbow gradient. The vibe
  is a faint warm-pastel whisper for _feel_ — not a copy of any one brand.

---

## 2. Tokens

```css
:root {
  /* Ambient & surfaces */
  --bg-ambient: radial-gradient(
    150% 100% at 100% 100%,
    #f6f5fc 0%,
    #fbf6f6 45%,
    #ffffff 82%
  );
  --surface: #ffffff; /* cards, panels, modals */
  --surface-sunken: #fafafa; /* inputs, wells, secondary bg */
  --surface-hover: #f4f4f5; /* row / item hover */

  /* Text */
  --text-primary: #18181b;
  --text-secondary: #6b6b70;
  --text-tertiary: #9c9ca1;
  --text-disabled: #c4c4c8;
  --text-on-dark: #ffffff; /* on ink buttons / accent fills */

  /* Borders */
  --border-subtle: #efefef; /* dividers, hairlines */
  --border: #dbdbdb; /* inputs, cards */
  --border-strong: #c4c4c8; /* hover / focus */

  /* Accent — single chromatic (rose) */
  --accent: #d9477a; /* active item, icon, indicator, fill */
  --accent-hover: #c53c6c;
  --accent-pressed: #b0335f;
  --accent-text: #b0335f; /* accent text on white (AA-safe) */
  --accent-tint: #fae9ef; /* active row bg, badges */
  --accent-tint-hover: #f5d3e0;

  /* Actions */
  --btn-primary-bg: #18181b;
  --btn-primary-bg-hover: #2a2a2e; /* white text */
  --btn-secondary-bg: #ffffff;
  --btn-secondary-border: #dbdbdb; /* ink text */
  --btn-ghost-hover: #f4f4f5;

  /* Semantic — use as text-on-tint pairs */
  --success: #1f9d6b;
  --success-tint: #e7f5ee;
  --warning: #b8791c;
  --warning-tint: #faf0dd;
  --danger: #d14343;
  --danger-tint: #fbe9e9;

  /* Optional brand gradient — logo / avatar ring only */
  --brand-gradient: linear-gradient(135deg, #d9477a 0%, #8b5cf0 100%);

  /* Foundations */
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-pill: 999px;
  --shadow-sm: 0 1px 2px rgba(24, 24, 27, 0.05);
  --shadow-md: 0 4px 16px rgba(24, 24, 27, 0.08);
  --shadow-lg: 0 12px 32px rgba(24, 24, 27, 0.1);
}
```

> The shipped `--bg-ambient` is much softer than mockups usually show. For an even
> quieter feel, push the inner stops toward `#FAF9FD` / `#FCF8F8`.

---

## 3. Type & icons

- **Font:** Inter (Google Fonts). Closest free match to the premium-humanist feel.
  Geist is a slightly cooler alternative if you want it.
  - Weights: **400** body, **500** for labels / emphasis / buttons. Never heavier than 500.
  - Load: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet">`
- **Icons:** Tabler Icons, **outline only**, MIT-licensed. 18–20px in navigation.
  - Web font / CDN: `https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css`
- **Sentence case everywhere.** No ALL CAPS, no Title Case except proper nouns.

---

## 4. Usage rules

- The ambient gradient is the **app background only** — never on a card. Cards, panels
  and modals are solid `--surface` white so they read above it.
- ~95% of every screen is ink / graphite / mute text on white.
- Accent text on white → `--accent-text` (#B0335F) for contrast.
  Accent fills, icons, indicators → `--accent` (#D9477A).
- Separate elements with hairline borders (`--border-subtle`) before reaching for
  shadows. Keep shadows soft and rare — reserve `--shadow-md`+ for floating elements.
- Corner radius: `--radius-md` (10px) for controls, `--radius-lg` (14px) for cards.
  Pills only when deliberate.
- Semantic colors are **text-on-tint** pairs (e.g. danger text on danger-tint), not
  large fills.
- `--brand-gradient` appears only on the logo mark and avatar rings — never on buttons
  or backgrounds.
- **Default to the quietest option.** If a screen looks busy, remove color before
  adding it.

---

## 5. Paste-ready prompt for Claude

Copy everything in the block below into Claude (or Claude Code) to build UI in this system.

```
You are designing UI for my Instagram automation app. Follow this design system exactly.

AESTHETIC
- Minimal and premium. Monochrome UI — near-black ink and grays on off-white. Generous
  whitespace. Calm and expensive, never busy or cute.
- A single soft ambient gradient sits behind the app and pools color into empty space so
  screens never feel hollow, but it's barely noticeable (~3-4% saturation). App
  background only — never on cards.
- Exactly one chromatic accent (rose) per region, and only on interactive/active states
  (active nav item, selection, toggles, unread dots, key links). Everything else is
  monochrome.
- Primary buttons are near-black (#18181B) with white text, NOT colored. Reserve the
  accent fill for at most one critical CTA per screen.
- Never use the literal Instagram rainbow gradient. The vibe is a faint warm-pastel
  whisper, not Instagram cosplay.

TOKENS
:root {
  --bg-ambient: radial-gradient(150% 100% at 100% 100%, #F6F5FC 0%, #FBF6F6 45%, #FFFFFF 82%);
  --surface:#FFFFFF; --surface-sunken:#FAFAFA; --surface-hover:#F4F4F5;
  --text-primary:#18181B; --text-secondary:#6B6B70; --text-tertiary:#9C9CA1;
  --text-disabled:#C4C4C8; --text-on-dark:#FFFFFF;
  --border-subtle:#EFEFEF; --border:#DBDBDB; --border-strong:#C4C4C8;
  --accent:#D9477A; --accent-hover:#C53C6C; --accent-pressed:#B0335F;
  --accent-text:#B0335F; --accent-tint:#FAE9EF; --accent-tint-hover:#F5D3E0;
  --btn-primary-bg:#18181B; --btn-primary-bg-hover:#2A2A2E;
  --btn-secondary-bg:#FFFFFF; --btn-secondary-border:#DBDBDB; --btn-ghost-hover:#F4F4F5;
  --success:#1F9D6B; --success-tint:#E7F5EE;
  --warning:#B8791C; --warning-tint:#FAF0DD;
  --danger:#D14343;  --danger-tint:#FBE9E9;
  --brand-gradient: linear-gradient(135deg, #D9477A 0%, #8B5CF0 100%);
  --radius-sm:8px; --radius-md:10px; --radius-lg:14px; --radius-pill:999px;
  --shadow-sm:0 1px 2px rgba(24,24,27,.05);
  --shadow-md:0 4px 16px rgba(24,24,27,.08);
  --shadow-lg:0 12px 32px rgba(24,24,27,.10);
}

TYPE & ICONS
- Font: Inter (Google Fonts). Weights 400 body, 500 for labels/emphasis/buttons. Never
  heavier than 500.
- Icons: Tabler Icons, outline style only, 18-20px in navigation.
- Sentence case everywhere. No ALL CAPS, no Title Case except proper nouns.

RULES
- Cards/panels/modals are solid white (--surface) so they read above the ambient
  gradient. Separate with hairline borders (--border-subtle) before using shadows; keep
  shadows soft and rare.
- Accent text on white uses --accent-text (#B0335F); --accent (#D9477A) is for fills,
  icons, indicators.
- Semantic colors are text-on-tint pairs, not large fills.
- Corner radius: --radius-md (10px) for controls, --radius-lg (14px) for cards. Pills
  only when deliberate.
- --brand-gradient appears only on the logo mark and avatar rings — never on buttons or
  backgrounds.

When I ask for a screen or component, output clean code using these tokens. Default to
the quietest option; if it looks busy, remove color before adding it.
```
