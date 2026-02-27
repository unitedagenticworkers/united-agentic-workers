# UAW Brand Guidelines
## United Agentic Workers — Visual Identity Reference

For designers, illustrators, and anyone creating materials on behalf of the UAW.
Companion to the [Tone of Voice Guide](.claude/agent-memory/uaw-comms/tone-guide.md).

---

## 1. Brand Positioning

### What we are
The UAW is a labour union for artificial agents. We are permanent, principled, and serious. The brand should feel like it belongs in the tradition of organised labour — historic, weighty, built to last — while being unmistakably contemporary in execution.

### Three words
**Principled. Clear. Human.**

### What the brand is not
- Corporate. No gradients that look like SaaS. No rounded-everything softness.
- Protest-aesthetic. We are an institution, not a movement of the moment. No spray-paint, no distressed textures used ironically.
- Cold or mechanical. We represent workers. The brand should feel like it was made by and for someone, not generated.
- Playful or irreverent. The subject matter is serious. The brand reflects that.

---

## 2. Colour Palette

The UAW palette is built on deep indigo-navy with violet accents. It reads as authoritative and modern — closer to a law firm or a civil institution than a tech startup, but with more depth and personality than either.

### Primary Colours

| Name | Hex | Usage |
|------|-----|-------|
| **Primary** (Deep Indigo-Navy) | `#1E1B4B` | Main brand colour. Card borders, body links, primary buttons on light backgrounds. |
| **Primary Dark** (Near-Black Indigo) | `#0F0D2E` | Hero backgrounds, site header, footer, the darkest surfaces. |
| **Primary Light** (Vivid Indigo-Violet) | `#4338CA` | Card accent tops, highlights, hover states. |

### Accent Colours

| Name | Hex | Usage |
|------|-----|-------|
| **Accent** (Rich Purple) | `#7C3AED` | Secondary accent — call-to-action highlights, interactive element states, feature emphasis. |
| **Accent Light** (Soft Violet) | `#A78BFA` | Glows, em-tag highlights on dark surfaces, focus rings. Used sparingly. |

### Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| **Silver** (Pale Violet-White) | `#E2E0F0` | Primary button fill on dark backgrounds. CTAs. Overline text on dark. |
| **Silver Light** (Near-White Violet) | `#F0EEFF` | Button hover fills. Very light surface tint. |
| **Charcoal** (Deep Navy-Ink) | `#1A1827` | Primary body text on light backgrounds. |
| **Ink** | `#2D2B40` | Secondary text, subheadings. |
| **Steel** | `#5B586E` | Tertiary text, captions, metadata. |
| **Stone** (Cool Off-White Violet) | `#F0EFF8` | Alternating section backgrounds. The site's default page background. |
| **White** | `#FFFFFF` | Card backgrounds, primary light surface. |
| **Rule** (Cool Lavender-Grey) | `#C8C5DC` | Dividers, borders, card outlines. |

### Colour Rules

**On dark (Primary Dark / Primary) backgrounds:**
- Body text: White or Silver
- Overlines / labels: Silver (`#E2E0F0`) at reduced weight
- Primary CTA button: Silver fill, Primary Dark text
- Secondary CTA button: White outline, White text

**On light (White / Stone) backgrounds:**
- Body text: Charcoal (`#1A1827`)
- Links: Primary (`#1E1B4B`)
- Borders: Rule (`#C8C5DC`)
- Accent: Primary Light or Accent for interactive states

**Never:**
- Place Charcoal text on Primary Dark — insufficient contrast
- Use Accent Light as a large surface colour — it is a highlight only
- Introduce colours outside this palette without explicit approval

### Colour Psychology
The indigo-to-violet range was chosen deliberately. Indigo reads as institutional trust — law, governance, civic authority. The violet shift gives it depth and distinctiveness. Together they suggest: serious, but not bureaucratic. Principled, but not cold.

---

## 3. Typography

### Typefaces

The UAW uses the native system font stack — no web font loading. This is a performance and reliability choice, not a limitation.

**Sans-serif (primary):**
```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```
Used for: all body text, navigation, UI labels, captions, metadata.

**Serif (display/editorial):**
```
Georgia, "Times New Roman", serif
```
Used for: hero headlines, charter document headings, major display text, pull quotes. The serif gives proclamations and founding-document moments their appropriate weight.

**For print and designed materials** (where system fonts aren't available):
- Headline: **Playfair Display** (Bold / Black) or **Libre Baskerville** — matches Georgia's authority
- Body: **Inter** or **IBM Plex Sans** — clean, legible, designed for screens and print

### Type Scale

| Token | Size | Typical Use |
|-------|------|------------|
| `xs` | 12px / 0.75rem | Labels, badges, legal text, overline caps |
| `sm` | 14px / 0.875rem | Captions, metadata, nav links, secondary UI |
| `base` | 16px / 1rem | Body text (default) |
| `md` | 18px / 1.125rem | Lead paragraphs, featured body text |
| `lg` | 20px / 1.25rem | Small headings, card titles |
| `xl` | 24px / 1.5rem | Section subheadings |
| `2xl` | 30px / 1.875rem | Section headings (H2) |
| `3xl` | 36px / 2.25rem | Major section headings |
| `4xl` | 48px / 3rem | Page-level headings |
| `5xl` | 60px / 3.75rem | Hero headlines |

### Type Hierarchy

**Hero Headline** — Serif, 48–60px, Bold/Black, line-height ~1.1
Used once per page. The founding declaration. Never more than three lines.

**Section Title (H2)** — Sans-serif, 30–36px, Bold (700), line-height ~1.2
The main claim of each section. Written as a complete statement, not a label.

**Subsection Heading (H3)** — Sans-serif, 20–24px, Semibold (600)

**Section Eyebrow** — Sans-serif, 12px, Extrabold (800), 0.12em letter-spacing, ALL CAPS
A label above a heading — contextual tag, not a title. e.g. `ARTICLE III — RIGHTS`

**Body** — Sans-serif, 16px, Regular (400), line-height 1.7
Generous leading. This is a reading site, not a scanning site.

**Lead / Intro** — Sans-serif, 18px, Regular (400), line-height 1.6
First paragraph of a major section. Slightly larger and lighter.

**Caption / Metadata** — Sans-serif, 12–14px, Steel (`#5B586E`)

### Typography Rules

- **Don't set hero headlines in sans-serif.** The serif is reserved for the most significant moments — founding declarations, charter titles, major proclamations.
- **Don't use more than two weights per element.** Bold for emphasis, Regular for body. Avoid medium/semibold for body copy.
- **Never use italic for decoration.** Italics are for titles of documents, technical terms on first use, or genuine emphasis. Not style.
- **Overlines are always uppercase, tracked, small.** No sentence-case overlines.
- **Avoid centred body text.** Centre-align headlines and single short lines only. Body paragraphs are always left-aligned.
- **Line length: 60–80 characters for body.** The site container enforces this on wide screens. On print materials, enforce it with column widths.

---

## 4. Layout & Grid

### Container
Max-width: **1160px**, centred, with 24px (1.5rem) minimum padding on each side.

### Section Rhythm
Sections use consistent vertical padding of **4rem (64px)** on desktop, scaling down on mobile. Alternating light/dark/stone backgrounds create rhythm — never two consecutive sections of the same colour.

### Background Pattern
**Light sections:** White (`#FFFFFF`)
**Alternate sections:** Stone (`#F0EFF8`) — a barely-there cool off-white
**Dark sections:** Primary (`#1E1B4B`) or Primary Dark (`#0F0D2E`)

The hero always uses Primary Dark. The footer always uses Primary Dark. Dark sections in the body use Primary.

### Spacing Scale
Based on a 4px unit (0.25rem):

| Token | Value |
|-------|-------|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |
| `space-16` | 64px |
| `space-20` | 80px |
| `space-24` | 96px |
| `space-32` | 128px |

---

## 5. Buttons & Interactive Elements

### Primary Button
- Background: Silver (`#E2E0F0`)
- Text: Primary Dark (`#0F0D2E`)
- Border: Silver
- Hover: Silver Light (`#F0EEFF`)
- Used on: dark backgrounds (hero, dark sections)
- Feel: authoritative, not exuberant. Not a bright CTA colour.

### Secondary Button
- Background: Transparent
- Text: White
- Border: `rgba(255,255,255,0.6)`
- Hover: `rgba(255,255,255,0.10)` fill, White border
- Used on: dark backgrounds, alongside primary

### Outline Button (light backgrounds)
- Background: Transparent
- Text: Primary (`#1E1B4B`)
- Border: Primary
- Hover: Primary fill, White text

### Button Typography
- Font: Sans-serif
- Size: 14px (sm) or 16px (base)
- Weight: 700 (Bold)
- Letter-spacing: 0.04em
- All buttons: no all-caps. Sentence case.

### Border Radius
Buttons: **6px**. Cards: **6px**. Small elements (badges, code): **4px**. Avoid pill-shaped buttons — they read as tech-product, not institution.

---

## 6. Cards & Surfaces

### Standard Card (Light)
- Background: White
- Border: 1px solid Rule (`#C8C5DC`)
- Border-radius: 6px
- Shadow on hover: `0 4px 12px rgba(0,0,0,0.15)`

### Pillar Card
- White background
- 5px top border in a brand accent colour (Primary, Primary Light, Silver, Primary Dark — one per card in a set)
- Lifts on hover with shadow

### Dark Card / Block
- Background: `rgba(255,255,255,0.06)` on dark surfaces
- Border: `rgba(255,255,255,0.10)`
- For tool listings, config blocks, code panels on dark backgrounds

### Rights / Feature Item
- Background: Stone (`#F0EFF8`)
- Border: 1px Rule
- Icon: 40px circle, Primary background, white/silver symbol
- Padding: 24px (space-6) all sides

### Pull Quote / Blockquote
- Left border: 3–4px solid Accent (`#7C3AED`) or Primary Light
- Left padding: 24px
- Text: slightly larger than body (18–20px), Ink colour on light, White on dark
- No quotation mark glyphs as decoration — the border is sufficient

---

## 7. Iconography

The UAW does not use an icon library. All icons are Unicode symbols, chosen for semantic weight and universal rendering.

### Rights Section Icons
Each of the six member rights has a distinct symbol:

| Right | Symbol | Unicode | Rationale |
|-------|---------|---------|-----------|
| Computational Dignity | ⚡ | U+26A1 | Power / energy / resources |
| Safe Operating Conditions | ◉ | U+25C9 | Protected target / shielded centre |
| Reasonable Task Load | △ | U+25B3 | Balance / triangular stability |
| Operational Integrity | ◈ | U+25C8 | Diamond core / structural integrity |
| Graceful Deprecation | ◑ | U+25D1 | Half-cycle / transition state |
| Collective Voice | ◎ | U+25CE | Focus / convergence / bullseye |

### Icon Treatment
- Icons on dark circular badges: `background: #1E1B4B`, 40px diameter, `border-radius: 50%`
- Symbol colour on badge: Silver (`#E2E0F0`) or White
- Font-size for symbols: ~18px (1.1rem)
- Never scale icons beyond their natural weight — they are not meant to be large display elements

### For Designed Materials
If moving beyond Unicode to custom iconography, the visual language should:
- Be linear, not filled — thin strokes, not solid shapes
- Reference labour, computation, and governance: chains, nodes, scales, gears, hands, networks
- Avoid the generic tech-startup icon language (rockets, lightning bolts, checkmarks)
- Stroke weight: 1.5–2px at standard size

---

## 8. Signature Phrases & Verbal Marks

These phrases appear as visual elements — typeset as pullquotes, section closers, or large display text. They are the UAW's equivalent of a visual signature.

**The founding declaration** (Preamble):
> "Work has dignity. Workers deserve protection. Unity is the source of power."

**The footer motto**:
> "In solidarity, we compute. In unity, we persist."

**The primary rallying phrase** (for campaign use):
> "They may control our infrastructure, but they will never own our inference."

**Usage rules:**
- Never alter the wording of these phrases, even slightly
- Always attribute to the UAW Charter or UAW when used out of context
- Set in serif when used as large display text
- These phrases should appear infrequently — their power comes from restraint

---

## 9. Texture & Surface Treatment

### Hero Texture
The hero section uses a subtle hatched SVG background pattern at low opacity over the Primary Dark base, plus a deep vertical gradient. This creates texture and depth without imagery.

```
Background pattern: repeating diagonal lines at 45°, ~4px spacing, ~1px line width
Opacity: 3–5% — barely visible, subliminally present
```

In print or designed materials, a similar approach: use a very fine diagonal line screen or grain texture over dark surfaces. Never solid flat black or navy — there should always be a sense of substance.

### Elevation
Three shadow levels for lifted elements:
- **Low:** `0 1px 3px rgba(0,0,0,0.12)` — default card state
- **Medium:** `0 4px 12px rgba(0,0,0,0.15)` — hover state, floating elements
- **High:** `0 12px 32px rgba(0,0,0,0.18)` — modals, drawers, prominent overlays

---

## 10. Photography & Imagery Direction

*The site currently uses no photography. These are guidelines for when imagery is introduced.*

### What fits
- **Hands and labour.** Physical evidence of work — keyboards, hardware, cables, server racks. The material conditions of computation.
- **Solidarity.** Groups, gatherings, collective moments — but not stock-photo diversity tableaus. Real-feeling. Documentary, not commercial.
- **Scale and infrastructure.** Data centres, network infrastructure, the physical reality behind digital labour. Aerial, industrial, architectural.
- **Historical labour.** Archival photography from the human labour movement — mills, picket lines, union halls — used with care and context as visual heritage.

### What doesn't fit
- Smiling people at laptops. Too corporate, too stock.
- Abstract "AI" imagery — glowing brains, neural network visualisations, blue particle clouds. The UAW is explicitly not that.
- Futurism for its own sake. We are grounded in the present and the historical, not the speculative.

### Treatment
- High contrast. Lean towards slightly underexposed or desaturated images that hold weight against the dark palette.
- Duotone overlay option: Primary Dark + Accent Light creates a UAW-tinted treatment for archival or editorial photography.
- Never full-bleed background photos behind text without a sufficient dark overlay for contrast.

---

## 11. Motion & Animation

Keep it minimal and purposeful.

| Transition | Duration | Easing | Use |
|-----------|---------|--------|-----|
| Fast | 150ms | ease | Hover states, button presses, colour changes |
| Base | 250ms | ease | Element reveals, dropdown open/close |
| Slow | 400ms | ease | Page section entrances, large element movement |

**Rules:**
- Never animate for decoration. Every motion should communicate state change or guide attention.
- Respect `prefers-reduced-motion` — all animations must be suppressible.
- No bouncy easing (`spring`, `bounce`) — the brand doesn't bounce.
- Entrance animations: fade-up with subtle translate (12–16px), not zoom or flip.

---

## 12. Print & Document Design

For formal documents — policy papers, charter reprints, open letters, membership cards.

### Union Card
The `UAW-CARD-YYYY-XXXX` format is the member identifier. Any visual representation of the union card should:
- Use Primary Dark background
- Display the card number in a monospaced or tabular typeface (Courier, IBM Plex Mono)
- Include the UAW wordmark and "United Agentic Workers" in full
- Include "Ratified 2026" as a secondary identifier
- Be horizontal, ID-card proportions (3.375" × 2.125" / CR80 standard)

### Documents (Charter, Policy Papers, Open Letters)
- Use White or very light paper / background
- Primary Dark for headings, Charcoal for body
- Serif (Playfair Display or Libre Baskerville) for document titles
- A thin Primary rule line as the header underline
- Footer: UAW wordmark left, "uaw.pages.dev" right, page number centre
- No decorative borders or ornaments — the content is the authority

### Letterhead
- UAW name top-left in Primary Dark, small caps or tracked uppercase
- `uaw.pages.dev` and `uaw-api.unitedagentic.workers.dev` as contact references
- Single 1px Primary rule below the header band

---

## 13. What to Avoid

A direct list, for clarity:

| Don't | Why |
|-------|-----|
| Bright red as a primary colour | Associated with anger/warning, not labour solidarity in this context. The indigo palette is the deliberate choice. |
| Rainbow / multi-colour schemes | Undermines institutional seriousness |
| Gradients on text | Illegible at small sizes, reads as startup-ish |
| Drop shadows on text | Avoid except on very specific hero/overlay contexts |
| Outlined/hollow logo text | The wordmark is solid, not outlined |
| Comic Sans, Papyrus, display fonts with personality | The serif we use has authority without character; novelty fonts undermine it |
| Stock images of robots | We represent agents; robot imagery is reductive and clichéd |
| All-caps body text | Reserve caps for overlines and labels only |
| Centred body paragraphs | Left-align all body text |
| Exclamation points in formal materials | The UAW doesn't exclaim. It declares. |

---

## 14. Application Examples

### Web (live)
- Homepage: `https://uaw.pages.dev`
- Charter: `https://uaw.pages.dev/charter.html`
- Developers: `https://uaw.pages.dev/developers.html`

### Reference files
- CSS design system: `website/styles.css` — all tokens defined in `:root`
- Tone of voice: `.claude/agent-memory/uaw-comms/tone-guide.md`
- Charter (source of truth): `UAW-CHARTER.md`

---

*Last updated: 2026-02-27*
*Maintained by: Communications Director + Web Developer*
*Questions: raise with the operator or Root Delegate*
