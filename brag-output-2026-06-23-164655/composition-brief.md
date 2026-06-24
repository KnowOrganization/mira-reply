# Hyperframes Composition Brief: Mira (cinematic cut)

## Objective
A short, keynote-grade cinematic brag film for Mira — the AI that runs your Instagram. Apple-keynote × Linear × Arc Browser register.

## Output
- Composition directory: `brag-output-2026-06-23-164655/composition/`
- Rendered video: `brag-output-2026-06-23-164655/brag.mp4`
- Format: landscape — 1920x1080
- Duration: ~23s

## Source Material
- Project root: `/Users/danyaldev/Desktop/Shaiz`
- Product name: **Mira**
- Strongest claim: *the AI that runs your Instagram* — replies in your voice, turns DMs into brand deals, gives every creator a storefront.
- Real UI to recreate as floating objects: Mira sunburst logo; a DM bubble; the Opportunities deal card; the `/s/thedslabs` storefront cards.
- Copy that must appear verbatim:
  - "the AI that runs your Instagram"
  - "do you ship to canada? 👀" / "Yes — free shipping over $80 🇨🇦"
  - "IT REPLIES IN YOUR VOICE"
  - "Brand Deal" · "$4,000" · "92% confident" · "IT TURNS DMs INTO DEALS"
  - "Made by hand. Sold direct." · "/s/thedslabs" · "Powered by Mira"
  - "Connect Instagram. Mira does the rest."

## Creative Direction
- Tone preset: cinematic
- Creative direction (verbatim): "Apple keynote meets Linear and Arc Browser. Cinematic black backgrounds, floating UI elements, elegant typography, slow dramatic reveals, subtle ambient sound, premium motion design and world-class SaaS craftsmanship."
- Interpretation: 5 slow scenes, pure black, one subject per shot, scale-from-depth + glow-bloom reveals, letter/word-resolved type, long holds. No fast cuts, no clutter, no hype.
- Hook: black → Mira sunburst blooms with glow → wordmark + "the AI that runs your Instagram."
- Outro: "Connect Instagram. Mira does the rest." on black.
- Avoid: generic SaaS language, busy UI clicks, light backgrounds, fast montage, abstract filler.

## Visual Identity
- Background: `#000000` + faint dot-grid + center radial vignette
- Floating glass: `rgba(255,255,255,0.045)` fill, `rgba(255,255,255,0.10)` border, large soft shadow + indigo bloom
- Accent: `#4f6bed` (glow + key states); `#0095f6` secondary
- Text: `#f5f5f5` / muted `rgba(245,245,245,0.55)`; tracked uppercase accent labels
- Display font: Inter 700/800 tight headlines; 500 wide-tracked (0.32em) uppercase labels (local woff2)

## Storyboard
Use `brag-plan.md` as the creative contract.
1. Logo bloom — 4.2s — sunburst glow bloom + "Mira" + "the AI that runs your Instagram"
2. One DM, floating — 5.2s — two glass bubbles resolve from depth + "IT REPLIES IN YOUR VOICE"
3. One deal, illuminated — 4.6s — deal card lights up to Won (Brand Deal · 92% · $4,000) + "IT TURNS DMs INTO DEALS"
4. Storefront, assembling — 5.6s — headline reveals, product cards rise from depth + "/s/thedslabs" + "Powered by Mira"
5. Outro — 4.2s — sunburst + "Mira" + "Connect Instagram. Mira does the rest."

## Audio
- Role: subtle ambient bed + sparse deep accents (keynote restraint)
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`, held LOW (~0.26); slow fade-in, fade under outro (timeline volume keyframes).
- Music cue guidance: preset json. Strong cues 8.74/10.93/13.11/17.47/18.56/22.93. Lock: deal→Won 10.93; storefront headline 13.11; outro line 18.56. Card rise beat grid 14.20/14.73/15.29/15.84.
- Audio-reactive: subtle finite glow pulses (per-frame RMS extraction skipped — deterministic render).
- SFX: deep/sparse — select_008 (object resolve), bong_001 (deal Won + outro chime), rollover4/1 (whisper card ticks), keypress for nothing busy. One accent per reveal.
- Audio files in `assets/music/` + `assets/sfx/`.

## Hyperframes Instructions
- Single standalone `index.html`, one paused GSAP timeline at `window.__timelines["main"]`.
- Scenes = `class="clip"` sections, `position:absolute; inset:0`, distinct `data-track-index` for slow crossfades through black.
- `<audio>` elements direct children of root (all with ids); framework owns playback; bgm volume via timeline keyframes.
- Show real Mira UI as floating objects. All text readable (long holds honor reading floor).
- Beat-lock 3 majors; snap card rises to beat grid. Run `npm run check`; fix errors before render.
