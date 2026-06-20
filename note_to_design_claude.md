# Theourgia — Design System Brief (for Claude Design)

Hello, design Claude. This document is a handoff brief for designing the Theourgia design system. Read [PROJECT_PLAN.md](PROJECT_PLAN.md) and [ARCHITECTURE.md](ARCHITECTURE.md) for full context — this brief surfaces what you need to design *for*.

---

## What Theourgia Is

A magickal journal CMS and full practitioner's toolkit. Open source (AGPL-3.0), self-hostable, federated. It supports working magicians of multiple traditions — Thelema, chaos magic, Greek theurgia, witchcraft, Hermeticism, ceremonial magic, folk traditions.

The product is **not** a "spiritual app." It is professional infrastructure. Think the seriousness of Notion / Obsidian / Linear, applied to ritual practice.

## Audience

Practicing magicians who:
- Already have a structured practice
- Want rigorous record-keeping for "scientific illuminism"
- Read primary sources in Greek, Hebrew, Latin
- Distrust consumer-grade spirituality products
- Care about data sovereignty and self-hosting
- Range from solo practitioners to members of formal orders (OTO, Golden Dawn descendants, modern Hellenic groups, etc.)

## Visual Direction — Intent

The aesthetic must thread a needle:

**Avoid:**
- Kitsch "witchy" stock imagery (purple sparkles, crystal-ball clipart)
- Generic SaaS minimalism (it would feel hollow for this content)
- Heavy-handed occult ornament (pentagrams everywhere, gothic blackletter for body text)
- Adobe-stock-mystical (smoky purples, glowing eyes, etc.)
- AI-generated occult art aesthetics

**Aim for:**
- The visual gravity of a serious antiquarian library
- A printed grimoire's typographic care
- Modern editorial design (think *The Public Domain Review*, *The Paris Review*, university press websites)
- Discreet ornament where it earns its place
- Materials: ink, parchment, copperplate engraving, sacred geometry diagrams, hand-lettered classical scripts
- Tradition-neutral by default (the user's chosen tradition surfaces through *their* content, not chrome)
- A confident, quiet, deeply textual feel

References to draw from (in spirit, not literal copy):
- The British Library's online manuscripts viewer
- The Warburg Institute's website
- The aesthetics of `tools.simonwillison.net` (clean and serious)
- Penguin Classics editorial covers
- Tufte's *Visual Display of Quantitative Information* (for analytics surfaces)
- Crowley's *Equinox* journal typesetting (for inspiration on hierarchical text)

## Typography — The Heart of the Design

Theourgia is text-heavy and multilingual. Typography is the most important design layer.

**Required script support, with quality:**
- Latin (English primary)
- Polytonic Greek (ancient + modern)
- Hebrew with niqud (vowel points)
- Arabic (for Sufi correspondences and certain practices)
- Sanskrit / Devanagari (Vedic content)
- Coptic (Egyptian magical content)

Recommend a **typographic system** that:
- Handles all the above with stylistic coherence
- Distinguishes ritual / scriptural quotation from prose
- Distinguishes Greek/Hebrew inline within English passages tastefully
- Supports drop caps, small caps, true italics, oldstyle figures
- Has a monospace counterpart for sigil parameters, gematria values, code

Open-source font candidates worth evaluating (in alphabetical order):
- Cardo (broad polytonic Greek + Hebrew support, classical feel)
- EB Garamond (excellent Latin, decent Greek)
- GFS Didot, GFS Neohellenic (Greek typography excellence)
- IM FELL (English antiquarian)
- Linux Libertine / Libertinus Serif
- SBL Greek, SBL Hebrew (scholarly references)
- Source Serif / Source Sans (modern utility)

Choose, defend, and document the type stack.

## Color

Avoid the obvious "occult palette." Two suggested directions for you to consider (or propose your own):

**Direction A — Antiquarian library**
- Background: aged paper / warm off-white in light mode; deep indigo or near-black in dark mode
- Body text: warm dark brown / soft black
- Accents: oxblood red (for sealed/sacred markers), iron gall ink blue, gold leaf (sparingly, for celebration/highlights), verdigris (for nature/correspondences)

**Direction B — Modern editorial**
- Background: neutral warm white / true dark
- Body text: high-contrast neutrals
- Accents: a single saturated accent per content type (e.g., divinations get one hue, workings another) — surfacing structure through color coding

Both **must** offer:
- Light + dark modes (dark mode is critical — many magicians work at night)
- High contrast mode for accessibility
- Color-blind safe variants (deuteranopia, protanopia, tritanopia)
- Reduced-motion mode

Per-tradition theme variants are a future plug-in concern; the base system should be tradition-agnostic.

## Iconography

- Custom icon set, drawn for the project. Off-the-shelf icon libraries (Lucide, Heroicons, etc.) feel wrong here.
- Style: copperplate-engraving-inspired but optimized for screens (think uniform stroke weight, simple geometry, legible at 16px)
- Subjects: planetary glyphs, zodiac, elements, decans, lunar phases, divination tools, ritual instruments, sacred geometry. Plus standard UI icons (search, settings, etc.) in matching style.
- Provide as SVG sprite + React/Astro component

## Surfaces to Design

### 1. Public-facing
- `theourgia.com` marketing/landing page (project pitch + scientific illuminism manifesto)
- Documentation site (Astro Starlight, customized)
- Per-vault public blog (magician's chosen public content)
- Per-hub public face (network's curated content)
- Book sales pages
- Newsletter archive
- RSS-rendered article pages

### 2. Vault dashboard (admin)
- Home / today (multi-calendar today widget; current planetary hour; lunar phase; transits of note; recent entries; quick capture)
- Journal index (filterable, multiple view modes: chronological, by tag, by entity, by tradition, by working)
- Entity index (gods/spirits/angels/demons/saints/ancestors)
- Library catalog
- Divination workbench (tarot table, I Ching coins, geomancy generator, runes pouch, scrying mode)
- Sigil studio
- Magical circle builder
- Talisman designer
- Workshop (everything generator-ish)
- Analytics dashboard (scientific illuminism queries + saved studies)
- Synchronicity quick-capture
- Settings (account, security, encryption mode, networks, plugins, theme)

### 3. Authoring (Tiptap-based editor)
- Block-based editor with custom magical blocks (chart, sigil, sensation diagram, gematria, quote citation, ritual log, divination embed, etc.)
- Template browser and template designer
- Drag-and-drop template editor (Themeco-Pro-style visual composition)
- Multi-language text input (input methods for Greek, Hebrew, etc., with romanization helpers)

### 4. Specialized modes
- **Trance mode** — minimal chrome, low blue light, ambient timer, large text — for scrying logs and visionary work
- **Ritual mode** — full-screen ritual script with hands-free progress controls (e.g., voice trigger or large touch targets)
- **Print preview** — typographically excellent print layouts for ritual sheets, talismans, sigils

### 5. Network / hub
- Hub home (curated content from members)
- Membership management
- Group ritual scheduler with timezone-aware planetary hours per participant
- Newsletter composer
- Federation peer browser

### 6. Reader
- Tarot reading session (cards on a custom spread, interpretation pane, ambient backdrop optional)
- I Ching consultation
- Geomancy chart
- Scrying log entry

### 7. Settings
- Encryption mode toggle per content type (with strong warnings for zero-knowledge)
- Network memberships
- Private viewer management
- Stripe configuration (for book sales)
- Theme and accessibility preferences

## Interaction Patterns to Design

- **Quick capture** — global keyboard shortcut, anywhere, opens a small modal for fast synchronicity / dream / sensation logging
- **Slash commands in editor** — `/sigil`, `/chart`, `/quote`, `/gematria`, `/entity`, `/sensation`, `/divination`
- **Command palette** — full app-wide navigation (`Cmd+K`)
- **Inline language switching** — write English, drop into Greek mid-sentence; the system handles font selection and direction
- **Calendar layer toggling** — every date display has a hover/tap to reveal alternate calendar representations
- **Visibility selector** — a clear, consistent control on every content item: `Personal / Viewer / Network / Public / Sealed`
- **Sensation diagram** — clickable SVG silhouette with marker drop + color-coding

## Accessibility Requirements (non-negotiable)

- WCAG 2.2 AA at minimum
- Full keyboard navigation
- Screen reader semantics (proper ARIA, landmark roles)
- Color contrast ≥ 4.5:1 for body text, 3:1 for large text in all themes
- Focus indicators always visible and high contrast
- Reduced motion alternative for any animation
- Text scaling to 200% without horizontal scroll
- Form errors announced

## Deliverables We Need From You

1. **Design tokens** as a portable JSON/CSS variables file (colors, typography scale, spacing, radii, shadows, motion, z-index)
2. **Font stack recommendation** with full multilingual coverage and rationale
3. **Icon set** as SVG sprite + React components
4. **Component library mockups** covering: typography specimens, buttons, form inputs, tables, modals, popovers, dropdowns, navigation, cards, toasts, tags, badges, calendars, charts (with the analytics use cases in mind)
5. **Surface mockups** for each surface in §"Surfaces to Design" (light + dark mode)
6. **Editor block library** mockups (each custom Tiptap block)
7. **Print specimens** (ritual sheet, talisman, sigil)
8. **Style guide document** with do/don't examples, voice and tone, accessibility patterns

## Voice and Tone — for any UI copy you write

- Confident, quiet, exact
- Respectful of tradition without being precious about it
- Direct (no "let's manifest your dreams!")
- Latin and Greek phrasing welcome where it fits (`Solve et coagula`, `Γνῶθι σαυτόν`) — used sparingly, as ornament
- Error messages are clear and humane, never blame the user
- Technical when technical is right (the user reads grimoires; they can handle terminology)

## Constraints and Notes

- **No purple gradients.** Just trust me.
- **No "AI generated" mystic art.** Custom illustration only where illustration is needed.
- **No animated pentagrams.** No occult kitsch.
- **The default state is tradition-neutral.** A Thelemite, a Hellenist, and a chaos magician should all feel at home in the base theme.
- **Multi-language is core, not an afterthought.** Hebrew and Arabic must work in RTL contexts; mixing scripts in a single paragraph must look correct.
- **Print matters.** Many practitioners print things. Design with print in mind.
- **Dark mode is a working mode**, not a stylistic flourish. Many rituals happen at night by candlelight.

## Questions to Resolve With Project Maintainer Before Designing

(You can flag these in your handoff back.)

1. Single base theme or multiple "tradition skins" (Hellenic / Thelemic / Hermetic / Witch / Chaos)?
2. Per-vault customization: how much should magicians be able to theme their own public face?
3. Should there be a "first-light" onboarding flow with a chosen tradition that biases defaults (calendars, fonts, color palette)?
4. Logo/wordmark — does Theourgia want a custom logotype? My instinct is yes, set in a hand-cut Greek or Latin display face.

Thank you. Build something worthy of the practice.
