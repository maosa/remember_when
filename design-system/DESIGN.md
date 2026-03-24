# DESIGN.md — Remember When

## Product Identity

**App name:** Remember When  
**Tagline:** The place where the people who lived a moment come together to make sure it's never forgotten.  
**Platform:** Web (desktop + mobile responsive) and mobile web  
**What it is:** A private, collaborative memory book. Users capture meaningful moments from their lives, write about them, add photos, videos, and audio, and share them with the people who were there. It is not a social network — there are no public feeds, no likes, no follower counts. It is calm, intimate, and built for reflection.

---

## Design Principles

1. **Calm over busy.** Every screen should feel unhurried. Generous white space. Nothing competes for attention.
2. **The content is the hero.** Photos, memories, and names of people are the emotional centrepiece — the UI steps back and frames them.
3. **Warm, not clinical.** This is a personal app, not a productivity tool. The aesthetic should feel like a beautifully kept home, not a dashboard.
4. **Minimal but considered.** No decoration for decoration's sake. Every visual element earns its place.
5. **Readable at a glance.** Information hierarchy is clear. The most important thing on any screen is immediately obvious.

---

## Colour Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#F5F2ED` | Main page background — warm linen |
| `--color-surface` | `#EDEAE4` | Cards, modals, sidebars — slightly darker than bg |
| `--color-surface-raised` | `#E6E2DB` | Elevated surfaces, popovers |
| `--color-text-primary` | `#2C2A25` | Primary body text and headings |
| `--color-text-muted` | `#7C7670` | Secondary text, timestamps, labels |
| `--color-text-placeholder` | `#A8A39D` | Input placeholders |
| `--color-accent` | `#5C7A6B` | Primary brand accent — muted sage-teal green. Used for primary buttons, active nav states, links, selected states |
| `--color-accent-hover` | `#4A6659` | Darker variant for hover/pressed accent states |
| `--color-accent-subtle` | `#D4E0DA` | Very light tint of accent for backgrounds on selected items, tags |
| `--color-blue` | `#7C96A8` | Quiet dusty blue-grey — used sparingly for read states, unread badges, secondary highlights |
| `--color-blue-subtle` | `#E0E8ED` | Very light blue tint for notification backgrounds, pending states |
| `--color-border` | `#D6D1CB` | Default borders, dividers, input outlines |
| `--color-border-subtle` | `#E8E4DE` | Subtle dividers, card inner borders |
| `--color-danger` | `#C0392B` | Destructive actions — delete, leave, remove |
| `--color-danger-subtle` | `#FDECEA` | Danger zone section backgrounds |
| `--color-white` | `#FFFFFF` | Text on dark/accent backgrounds |

**Palette character:** Warm, muted, natural. Predominantly linen and stone neutrals. Sage-teal as the primary personality colour. Dusty blue used sparingly for informational states. No orange, no bright saturation.

---

## Typography

| Role | Font | Weight | Size (desktop) | Size (mobile) |
|---|---|---|---|---|
| App name / wordmark | Lora | 600 | 20px | 18px |
| Moment names (h1 on moment page) | Lora | 400 | 32px | 26px |
| Page headings (h1) | Lora | 600 | 28px | 24px |
| Section headings (h2) | Lora | 600 | 20px | 18px |
| Card titles | DM Sans | 600 | 16px | 15px |
| Body text | DM Sans | 400 | 15px | 14px |
| UI labels, buttons, tags | DM Sans | 500 | 13px | 13px |
| Timestamps, metadata | DM Sans | 400 | 12px | 12px |
| Captions | DM Sans | 400 | 11px | 11px |

**Typography character:** Lora brings elegance and warmth to the personal, emotional content (moment names, page titles). DM Sans handles all functional UI — it is clean, round, and light without feeling sterile. The combination creates a subtle but meaningful distinction between "the product" and "the memory."

**Line height:** 1.6 for body text, 1.3 for headings.  
**Letter spacing:** Slightly loose on UI labels (0.01em). Default for body and headings.

---

## Spacing & Layout

- **Base unit:** 4px
- **Default content max-width:** 720px (centred on desktop for reading-heavy screens)
- **Wide content max-width:** 1100px (for home page grid)
- **Page padding:** 24px horizontal on desktop, 16px on mobile
- **Card padding:** 20px
- **Section spacing:** 40px between major sections
- **Element spacing:** 12px between related elements, 24px between groups

---

## Border Radius

| Element | Radius |
|---|---|
| Cards | 12px |
| Buttons | 8px |
| Input fields | 8px |
| Tags / chips | 999px (pill) |
| Avatars | 50% (circle) |
| Modals | 16px |
| Popovers | 10px |
| Images in posts | 10px |

---

## Shadows & Elevation

- **Cards:** `0 1px 3px rgba(44, 42, 37, 0.08)` — very subtle, warm-toned
- **Modals:** `0 8px 32px rgba(44, 42, 37, 0.16)` — present but not harsh
- **Popovers:** `0 4px 16px rgba(44, 42, 37, 0.12)`
- **No harsh drop shadows.** Everything should feel like it rests gently on the surface.

---

## Component Guidelines

### Buttons

- **Primary:** Background `--color-accent`, white text, 8px radius. Hover: `--color-accent-hover`. Slightly elevated feel.
- **Secondary / outline:** 1px border `--color-border`, `--color-text-primary` text, transparent background.
- **Ghost:** No border, no background. `--color-text-muted` text. Used for icon buttons and inline actions.
- **Destructive:** Background `--color-danger`, white text. Only for confirm-delete actions.
- **Destructive outline:** 1px border `--color-danger`, `--color-danger` text, `--color-danger-subtle` background. Used for danger zone CTAs before final confirmation.
- **Size:** Default 36px height, 14px horizontal padding. Small: 28px height.

### Input Fields

- Background: `--color-surface`
- Border: 1px solid `--color-border`
- Focus ring: 2px `--color-accent` with slight glow
- Placeholder: `--color-text-placeholder`
- Radius: 8px
- Height: 40px (default), 36px (compact)

### Cards (Moment Cards)

- Background: `--color-surface`
- Border: 1px solid `--color-border-subtle`
- Radius: 12px
- Shadow: subtle warm shadow
- Cover photo area: 16:9 aspect ratio at top of card
- Gradient overlay on cover photo: linear gradient from transparent (top) to `rgba(44,42,37,0.7)` (bottom)
- Moment name: DM Sans 600, white, positioned bottom-left over gradient
- Role badge: small pill, `--color-accent-subtle` background, `--color-accent` text
- Tags: small pills, `--color-surface-raised` background, `--color-text-muted` text
- `[...]` menu: ghost icon button, visible on hover only (desktop)

### Tags / Chips

- Pill shape (999px radius)
- Background: `--color-accent-subtle`
- Text: `--color-accent`, DM Sans 500, 12px
- Remove X: small, ghost, `--color-text-muted`

### Avatars

- Circular
- Profile photo if set; else initials on `--color-accent-subtle` background with `--color-accent` text
- Overlapping stack: -8px negative margin, white 2px ring between avatars

### Navigation

**Desktop (top bar, fixed, h-14):**
- Background: `--color-bg` with subtle bottom border
- Logo "Remember When": Lora 600, `--color-text-primary`
- Nav links: DM Sans 500, `--color-text-muted`, active state `--color-accent`
- Notification bell: icon button with small `--color-blue` unread dot
- Account avatar: circular, top-right

**Mobile (bottom tab bar, fixed, h-16):**
- Background: `--color-bg` with subtle top border
- 4 tabs: Home, Friends, Alerts (bell), Account
- Active tab: `--color-accent` icon and label
- Inactive tab: `--color-text-muted`

### Modals / Dialogs

- Overlay: `rgba(44, 42, 37, 0.4)` backdrop blur
- Modal card: `--color-bg`, 16px radius, 24px padding
- Header: title in Lora 600 18px, close X top-right ghost button
- Footer: right-aligned button row, Cancel (secondary) + Confirm (primary or destructive)

### Notifications / Banners

- Pending invite banner: `--color-blue-subtle` background, `--color-blue` left border accent, bell icon
- Success inline: `--color-accent-subtle` background, `--color-accent` text
- Error inline: `--color-danger-subtle` background, `--color-danger` text
- Info / amber: warm amber tint (`#FEF3C7` background, `#92400E` text)

### Danger Zone (Account page, Moment Settings)

- Section has `--color-danger-subtle` background, 1px `--color-danger` border with low opacity (40%)
- "Danger zone" label in `--color-danger`, DM Sans 600 12px, uppercase
- Destructive outline button as primary CTA

---

## Moment Page — Cover Photo Treatment

- Full-width cover photo with `object-fit: cover`
- Dark gradient overlay: `linear-gradient(to top, rgba(44,42,37,0.75) 0%, rgba(44,42,37,0.3) 50%, transparent 100%)`
- Moment name, date, and location in white text over the gradient
- Text has subtle `text-shadow` for legibility on varied photos
- Fallback (no cover photo): gradient placeholder using `--color-surface` to `--color-surface-raised`

---

## Empty States

- Centered in the available space
- Simple icon (outlined, `--color-text-placeholder`)
- Short heading in Lora 600 16px, `--color-text-muted`
- Optional supporting text in DM Sans 400 14px, `--color-text-placeholder`
- Optional CTA button (primary) below

---

## Tone of Voice (UI copy)

- Warm and personal, never clinical
- Short sentences. No jargon.
- Use "moment" not "record" or "entry"
- Buttons are action-oriented: "Add a post", "Create moment", "Leave moment", "Save changes"
- Confirmation dialogs are honest but calm: "This cannot be undone." Not "Warning: Irreversible action!"
- Empty states are inviting: "No moments yet. Start by capturing something you'll want to remember."

---

## What This App Is Not

- Not a social network (no likes, reactions, follower counts, public profiles)
- Not a photo album (the writing and story matter as much as the images)
- Not a productivity tool (no task management, no dashboards, no metrics)
- Not loud or attention-seeking (no notification badges except where truly needed, no gamification)
