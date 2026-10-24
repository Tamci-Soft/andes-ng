/**
 * Named decorative hues shared by Tag, Badge and Badge ribbon - for categorizing (a project
 * label, a department, a product line) where the semantic presets (`success`, `danger`, ...)
 * would wrongly imply a status. Each name resolves to a themed `--_andes-palette-<name>`
 * custom property declared in palette.css, with its own light and dark value.
 */
export const ANDES_PALETTE_COLORS = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'purple',
  'magenta',
  'pink',
] as const;

export type AndesPaletteColor = (typeof ANDES_PALETTE_COLORS)[number];

/**
 * The themed CSS value for a palette name, or `undefined` for anything else. Components feed
 * the result through the same inline custom property they use for an arbitrary CSS color, so
 * a palette hue gets exactly the auto-contrast treatment a hex color does.
 */
export function resolvePaletteColor(color: string): string | undefined {
  return (ANDES_PALETTE_COLORS as readonly string[]).includes(color)
    ? `var(--_andes-palette-${color})`
    : undefined;
}
