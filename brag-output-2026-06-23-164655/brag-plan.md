# Brag Plan: Mira (cinematic cut)

## What is this app?
Mira is a personal AI that runs your Instagram: it replies to DMs in your own voice, turns sponsorships and brand deals hiding in your inbox into a pipeline, and gives every creator a premium public storefront — all from one connected account.

## The angle
A keynote, not an ad. Pure cinematic black. One idea on screen at a time, each rendered as a single floating piece of UI suspended in space with depth and a soft glow — a DM bubble, a deal card, a storefront — revealed slowly, like product shots under a spotlight. The restraint is the flex: world-class SaaS craft, shown the way Apple/Linear/Arc show theirs. Specific to Mira because every floating object is a real Mira surface, not a stock mockup.

## Hook (first 2-3 seconds)
Black. Silence-adjacent. A faint horizon of light. The Mira sunburst ignites at center with a slow bloom of glow and a near-imperceptible rotation, then the wordmark **Mira** resolves in elegant type. One tracked line underneath: *the AI that runs your Instagram.* Slow. Confident. It sets the whole keynote register.

## Key moments (the middle)
- **One DM, floating** — a single glass message bubble suspended on black; the incoming question, then Mira's reply resolving in. "It replies in your voice."
- **One deal, illuminated** — a single premium deal card floating in spotlight; it quietly lights up to **Won** — Brand Deal · 92% · $4,000. "It turns DMs into deals."
- **The storefront, assembling** — product cards rise out of depth and settle into a row beneath a slowly-revealed headline; `/s/thedslabs`. "And a storefront, built for you."

## Outro / punchline
Black again. The sunburst glows alone, the wordmark beneath it. One line resolves slowly and holds: **Connect Instagram. Mira does the rest.** Fade to black.

## User flow worth showing
Same real flow, staged cinematically (entry → action → result):
1. DM arrives → Mira replies in-voice (floating glass bubble).
2. DM becomes a detected deal → lights up to Won (floating deal card).
3. Products become a live storefront (`/s/thedslabs` cards rising from depth).

## Tone
- Preset: cinematic (mapped from the user's direction)
- Creative direction (verbatim): "Apple keynote meets Linear and Arc Browser. Cinematic black backgrounds, floating UI elements, elegant typography, slow dramatic reveals, subtle ambient sound, premium motion design and world-class SaaS craftsmanship."
- Interpretation: 5 slow scenes, long holds, deep black negative space, one subject per shot. Motion is slow and eased (expo/power2), reveals are scale-from-depth + glow bloom + letter-by-letter type. No clutter, no hype, no fast cuts. The glow and the spacing do the work.

## Format: landscape — 1920x1080
## Duration: ~23s (target)

## Visual identity (from the project)
- Background: pure black `#000000` throughout (cinematic), faint dot-grid + radial vignette
- Surface (floating glass): `rgba(255,255,255,0.045)` fill, `rgba(255,255,255,0.10)` hairline border, large soft shadow + accent bloom
- Accent: `#4f6bed` Mira indigo (glow + key states); Instagram-blue `#0095f6` permitted as a cool secondary
- Text: `#f5f5f5` primary, `rgba(245,245,245,0.55)` muted, tracked uppercase labels in accent
- Display font: Inter — 700/800 tight (-0.035em) for headlines; 500 wide-tracked (0.32em) uppercase for labels
- Strongest visual element: the glowing Mira sunburst; a single floating glass DM bubble; the illuminated deal card; storefront cards rising from depth.

## Share copy (draft)
Mira runs your Instagram — replies in your voice, turns DMs into brand deals, and ships you a storefront. Shot like a keynote because it earns it. 🖤

## Audio direction
- Role: subtle ambient bed + sparse, deep, motion-matched accents (keynote restraint)
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`, held LOW (~0.26) as atmosphere, not a beat track. Slow fade-in over 1.2s; fade under the outro line.
- Music cue guidance: preset `assets/music/...vol-12...music-cues.json`. Strong cues: 8.74, 10.93, 13.11, 17.47, 18.56, 22.93. Lock: deal lights to Won near **10.93**; storefront headline reveal near **13.11**; outro line near **18.56**. Product cards rise on a relaxed beat grid 14.20 / 14.73 / 15.29 / 15.84 (objects, not text — fine to snap).
- Audio-reactive treatment: subtle — sunburst glow + floating-card bloom may breathe; implemented as finite eased glow pulses (audio-reactive extraction skipped for deterministic render).
- SFX posture: very sparse, deep, premium. A soft deep tone as the logo blooms; a low select tick as each floating object resolves; a single warm chime as the deal hits Won; whisper-soft ticks as storefront cards rise; one final low chime on the outro. No busy UI clicks.
- Audio-coupled moments: logo bloom (deep tone), DM reply resolve (soft tick), deal→Won (warm chime on 10.93), storefront cards (soft ticks on beat grid), outro line (low chime near 18.56).
- Restraint rule: audio must stay ambient and sparse. One deep accent per reveal. Never busy, never upbeat-montage.

## Storyboard

### Scene 1 — Cold open / logo bloom — 4.2s
Pure black, faint dot-grid + center vignette. A thin light bleeds in. The Mira sunburst ignites at center with a slow glow bloom (radial), rotating ~10° very slowly; spokes resolve. Wordmark **Mira** fades up beneath in tight display. Tracked line *the AI that runs your Instagram* resolves last. Long hold.
Sequential/interaction: yes — glow blooms, spokes resolve, wordmark, then label.
Audio intent: ambient enters; one deep low tone as the mark blooms.
Audio-coupled idea: deep tone on bloom.
Music: low ambient bed fades in.
Transition mood: slow crossfade (dip through black) → Scene 2

### Scene 2 — One DM, floating — 5.2s
Black. A single glass message bubble floats up from slight depth (scale 0.94→1, soft shadow + faint indigo bloom). Incoming text resolves: "do you ship to canada? 👀". Beat. A second glass bubble (indigo-tinted) resolves Mira's reply: "Yes — free shipping over $80 🇨🇦". Small tracked caption above, slow: **IT REPLIES IN YOUR VOICE**.
Sequential/interaction: yes — incoming bubble resolves, then reply bubble resolves from depth.
Audio intent: intimate, suspended; a soft tick as each bubble settles.
Audio-coupled idea: soft select tick on each bubble resolve.
Music: ambient bed continues, low.
Transition mood: slow crossfade through black → Scene 3

### Scene 3 — One deal, illuminated — 4.6s
Black. A single premium deal card floats center in spotlight (subtle radial light behind it). Card: dot + "Brand Deal", "$4,000", "92% confident", "detected 3m ago". It quietly illuminates — an indigo→green glow sweeps and a **WON** state lights up. Tracked caption: **IT TURNS DMs INTO DEALS**.
Sequential/interaction: yes — card resolves from depth, then the Won state lights up on the cue.
Audio intent: a held breath, then a warm low chime as it lands on Won.
Audio-coupled idea: warm chime on the 10.93 cue.
Music: bed; a barely-there lift toward the cue.
Transition mood: slow crossfade through black → Scene 4

### Scene 4 — The storefront, assembling — 5.6s
Black, then a dark-glass storefront frame. A tracked eyebrow and a large headline reveal slowly ("Made by hand. Sold direct."). Four product cards rise out of depth one by one and settle into a row, each glass with a soft accent bloom and a monogram. A `/s/thedslabs` chip glows. Small line: **A STOREFRONT, BUILT FOR YOU**. "Powered by Mira" whispers at the base.
Sequential/interaction: yes — headline reveals (locked 13.11), then cards rise on the beat grid (14.20 / 14.73 / 15.29 / 15.84).
Audio intent: the quiet swell — the payoff, still restrained.
Audio-coupled idea: whisper-soft ticks as each card settles; bed lifts slightly.
Music: ambient bed at its fullest (still low).
Transition mood: slow fade to black → Scene 5

### Scene 5 — Outro — 4.2s
Pure black. The sunburst glows alone at center; **Mira** resolves beneath. One line resolves slowly and holds: **Connect Instagram. Mira does the rest.** Long hold, slow fade to black.
Sequential/interaction: none — single settled, held reveal.
Audio intent: resolve; one low chime, music fades to silence under the line.
Audio-coupled idea: low chime near 18.56; music fade-out.
Music: fades out under the line.
Transition mood: slow fade → end (black)

**Music mood for this video:** cinematic / ambient (business bed held very low as atmosphere)
**Audio summary:** A low ambient bed fades in under the logo bloom, stays suspended and sparse through each floating reveal, lifts almost imperceptibly as the storefront assembles, then fades to near-silence under a final low chime on the outro line.
