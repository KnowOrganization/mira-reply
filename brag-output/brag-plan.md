# Brag Plan: Mira

## What is this app?
Mira is a personal AI that runs your Instagram: it watches your comments and DMs, replies in your own voice while you sleep, quietly surfaces sponsorships and brand deals into a Kanban pipeline, and spins up a premium public storefront for your products — all from one connected account.

## The angle
Not "an Instagram tool." Mira is the operator behind the account. The video shows the account *running itself*: a real DM gets a real, on-brand reply; a brand deal materializes and lands in "Won"; a storefront builds itself at `/s/thedslabs`. The premise is calm confidence — you connect Instagram once, and the work just happens. Specific to Mira because every beat is an actual Mira surface (the indigo DM bubble, the Opportunities Kanban with confidence %, the "Powered by Mira" storefront), not a generic SaaS dashboard.

## Hook (first 2-3 seconds)
The Mira sunburst logo draws itself spoke-by-spoke on a near-black dot-grid canvas and rotates into place. The wordmark **Mira** settles in heavy display type, with one quiet subline: *the AI that runs your Instagram.* The mark is distinctive and the line is a promise — that earns the next 18 seconds.

## Key moments (the middle)
- **A DM answering itself** — an incoming grey bubble "do you ship to canada? 👀" then Mira's indigo reply types out "Yes — free shipping over $80, here's the link 🇨🇦". The product *doing* its core job.
- **A brand deal closing** — an Opportunities Kanban; a card slides from "Needs Review" to "Won": **Brand Deal · 92% · $4,000**. Mira found money in the DMs.
- **A storefront building itself** — the premium `/s/thedslabs` page assembles: big hero headline, then product cards pop in one by one with the real 4/5 image cards, "Powered by Mira" in the footer.

## Outro / punchline
Back to black. The sunburst centers with the wordmark. One line lands and holds: **Connect Instagram. Mira does the rest.**

## User flow worth showing
The real working-app flow, entry → action → result:
1. **DM arrives → Mira replies in-voice** (Inbox 3-panel bubbles).
2. **DM becomes a detected deal → moves to Won** (Opportunities Kanban card with confidence + value).
3. **Products become a live storefront** (`/s/thedslabs` grid of 4/5 product cards).
These three are the centerpiece. The logo hook and outro frame them.

## Tone
- Preset: polished
- Creative direction: a quiet premium product film — "the AI that quietly runs your Instagram"
- Interpretation: fewer scenes, longer holds, confident restraint. Motion is smooth (soft slides, crossfades), type is large and calm, the indigo accent does the talking. No hype words, no fast flashing.

## Format: landscape — 1920x1080
## Duration: 20s (target)

## Visual identity (from the project)
- Background: `#ffffff` surface on `#f9f9fb` frame (light); near-black `#0c0c0f`/dot-grid for hook + outro
- Accent: `#4f6bed` (Mira indigo). DM "sent" bubbles + CTAs use it.
- Text: `#1a1a1f` primary, `#6b6f76` muted, `#9ca0a8` subtle
- Display font: Inter, weight 800, letter-spacing -0.04em (the `.display` style)
- Body font: Inter
- Strongest visual element: the **Mira sunburst logo** (32-spoke, 6px core, accent squares every 3rd tip), the **indigo DM bubble**, the **Opportunities Kanban card**, and the **premium storefront grid**.

## Share copy (draft)
Mira runs your Instagram for you — replies in your voice, turns DMs into brand deals, and spins up a storefront. You just press connect. 🪩

## Audio direction
- Role: warm professional bed with sparse motion-matched accents
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (~110 BPM, calm-confident business mood)
- Music treatment: start at 0, low bed (~0.5), gentle swell into the storefront reveal, fade under the final logo line.
- Music cue guidance: bundled preset `cues/...vol-12...music-cues.json`. Strong cues in window: 8.74, 13.11, 17.47, 18.56, 22.93. Target the deal-card slam near **8.74**, the storefront reveal near **13.11**, the outro wordmark near **17.47/18.56**. Beat grid for the sequential product cards: 13.64 / 14.20 / 14.73 / 15.29 (images, not text — fine to snap each beat).
- Audio-reactive treatment: subtle — sunburst logo glow and storefront hero presence breathe with music RMS. No waveforms/equalizers.
- SFX posture: sparse, polished. Soft key ticks under the typed reply, a soft UI tick on bubble send, a card "thunk" + a short announcement cue on the deal landing in Won, gentle pops on product cards, one soft logo hit on the outro.
- Audio-coupled moments: typed DM reply (key ticks), deal card move (thunk on the strong cue), product cards (pops on beat grid), outro logo (single hit).
- Restraint rule: audio must not get busy or hypey. One accent per moment, music stays a bed, never a beat-drop montage.

## Storyboard

### Scene 1 — Logo hook — 3s
Near-black `#0c0c0f` canvas with faint dot-grid (28px, 1px dots). The Mira sunburst draws spoke-by-spoke (~0.8s) and rotates ~24° into rest. Wordmark **Mira** fades up in display 800 beside/below it; subline *the AI that runs your Instagram* settles under it. Hold ~1s.
Sequential/interaction: yes — sunburst spokes draw in sequence, then wordmark, then subline.
Audio intent: music enters soft; a single low presence as the mark lands.
Audio-coupled idea: gentle logo settle tick.
Music: low warm bed begins.
Transition mood: soft crossfade → Scene 2

### Scene 2 — A DM answering itself — 5.5s
Light surface, an inbox conversation crop (thread header "@thedslabs", a couple muted bubbles). Incoming grey bubble bottom-left: "do you ship to canada? 👀". Beat. Then Mira's **indigo** reply bubble types out bottom-right: "Yes — free shipping over $80, here's the link 🇨🇦" with a tiny "mira · now ✓" meta. Caption settles top: **Replies in your voice. While you sleep.**
Sequential/interaction: yes — incoming bubble appears, then the reply types character-by-character.
Audio intent: intimate, human; the reply feels alive.
Audio-coupled idea: soft key ticks during typing, one UI tick on send.
Music: bed continues under.
Transition mood: soft slide → Scene 3

### Scene 3 — A brand deal closing — 4.5s
Opportunities Kanban: columns "Needs Review · Open · In Progress · Won". A card sits in Needs Review: a colored dot + **Brand Deal**, **92%** confidence badge, **$4,000** value, "detected 3m ago". On the strong cue it slides across and snaps into **Won** with a soft flash. Caption: **Turns DMs into deals.**
Sequential/interaction: yes — simulate the card moving column → column, settling in Won.
Audio intent: a satisfying, understated "closed" moment.
Audio-coupled idea: card thunk + short announcement cue as it lands in Won, on the 8.74s strong cue.
Music: bed; small lift approaching the cue.
Transition mood: clean crossfade → Scene 4

### Scene 4 — A storefront building itself — 5s
The premium `/s/thedslabs` storefront. Sticky header with accent dot + "thedslabs" + "Shop". Hero headline in big display type ("Made by hand. Sold direct." style) with eyebrow "Welcome" and an accent pill CTA. Then the product grid: 4/5 image cards pop in one by one (title + price, e.g. "Studio Tee · $48"), one card image scales on hover. Footer "Powered by Mira". A small URL chip reads **/s/thedslabs**.
Sequential/interaction: yes — hero first (locked near 13.11 strong cue), then product cards arrive one by one on the beat grid (13.64 / 14.20 / 14.73 / 15.29).
Audio intent: the swell — the product paying off.
Audio-coupled idea: gentle pops as each card lands on the beat grid; music swells under the hero reveal.
Music: gentle swell, fullest point of the bed.
Transition mood: soft fade to black → Scene 5

### Scene 5 — Outro — 2.5s
Black/dot-grid again. The sunburst centers with the **Mira** wordmark. One line: **Connect Instagram. Mira does the rest.** Hold, then a slow fade.
Sequential/interaction: none — single settled hold.
Audio intent: resolve; one soft logo hit, music fades out under the line.
Audio-coupled idea: single logo hit near 17.47/18.56 strong cue; music fade-out.
Music: fade under the final line.
Transition mood: slow fade → end

**Music mood for this video:** polished / warm-confident business bed (not upbeat-hype)
**Audio summary:** A calm warm bed enters under the logo, stays intimate through the DM reply, lifts slightly as the deal closes, swells once under the storefront reveal, then fades to a single soft logo hit on the outro line.
