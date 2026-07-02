/**
 * Platform colour-palette themes.
 *
 * Single source of truth for the theme picker UI (dropdown labels, helper copy,
 * and the preview swatch squares). The *applied* palette tokens live in
 * app/globals.css as `[data-theme="<slug>"]` blocks — keep the two in sync.
 *
 * `slug` matches both the DB `users.theme` value and the CSS selector.
 * 'default' is the original light theme and carries no `data-theme` attribute.
 */

export interface Theme {
  slug: string
  label: string
  /** Subtle helper line shown under the dropdown. */
  description: string
  /** Representative hexes shown as preview squares (light → dark, danger last). */
  swatches: string[]
}

export const THEMES: readonly Theme[] = [
  {
    slug: 'default',
    label: 'Default',
    description: 'The original Remember When look — warm linen with a calm sage accent.',
    swatches: ['#F5F2ED', '#EDEAE4', '#D4E0DA', '#5C7A6B', '#7C96A8', '#2C2A25', '#C0392B'],
  },
  {
    slug: 'ocean-sapphire',
    label: 'Ocean Sapphire Morning',
    description: 'Cool, airy morning blues with a sapphire accent, applied across the whole platform.',
    swatches: ['#EEF3F8', '#E4EBF2', '#D5E3F2', '#2E6CB0', '#4F94A8', '#1B2A3A', '#C0392B'],
  },
  {
    slug: 'amethyst-wisteria',
    label: 'Amethyst Wisteria Twilight',
    description: 'A soft blush ground with plum and wisteria tones for a dusky, romantic feel.',
    swatches: ['#F6F1F5', '#EFE7ED', '#EAD8E6', '#8A4A79', '#9A7BB8', '#2C2432', '#BE3A50'],
  },
  {
    slug: 'autumn-ruby',
    label: 'Autumn Ruby Harmony',
    description: 'Warm cream with a ruby accent and copper highlights — cosy and nostalgic.',
    swatches: ['#F8F2EC', '#F0E8DF', '#F1D9D6', '#A62E3B', '#C67B3E', '#33251E', '#B03A2E'],
  },
  {
    slug: 'royal-gemstone',
    label: 'Royal Gemstone Dusk',
    description: 'Jewel-toned dusk: a royal indigo accent paired with emerald-teal over cool pearl.',
    swatches: ['#F1F0F6', '#E7E5EF', '#E1DCF1', '#4B3F8F', '#2E8F86', '#211E2E', '#C0392B'],
  },
] as const

export const DEFAULT_THEME = 'default'

export const THEME_SLUGS = THEMES.map((t) => t.slug)

export function isThemeSlug(value: unknown): value is string {
  return typeof value === 'string' && THEME_SLUGS.includes(value)
}

export function getTheme(slug: string | null | undefined): Theme {
  return THEMES.find((t) => t.slug === slug) ?? THEMES[0]
}
