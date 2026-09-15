# Avatar

## 1. Anatomy / compound structure

### shadcn/ui
Compound component composed of:
- **Avatar** — root container; fixed-size circular/square box that clips its content.
- **AvatarImage** — the `<img>`; handles load/error state internally (only renders once the image has successfully loaded).
- **AvatarFallback** — rendered while the image is loading or after it fails to load (e.g. initials or an icon). Typically supports a `delayMs` so the fallback doesn't flash for a fast-loading image.
- **AvatarBadge** — optional small overlay indicator (e.g. presence/status dot) positioned at a corner of the avatar.
- **AvatarGroup** / **AvatarGroupCount** — wrapper for a stacked/overlapping row of avatars, with `AvatarGroupCount` rendering a "+N" overflow indicator as the last item in the stack.

Underlying primitive: as of the current (2026) docs, shadcn's Avatar is built on a headless avatar primitive with real async image-loading state machine logic (image-loading-status handling), not plain markup — this is one of the few "simple-looking" components that legitimately needs a primitive because of the load/error timing behavior. The fetched docs explicitly reference "Base UI Avatar props," indicating the current default implementation is **Base UI** (`@base-ui-components/react`). shadcn's docs site now also lets you view the same component built on alternate registries (React Aria, Radix UI) via a site-wide implementation switcher — so verify which registry a given andes-ng consumer's copy-pasted snippet came from; do not assume Radix UI's `@radix-ui/react-avatar` is still the default.

### Ant Design
Not a compound/sub-component API in the React-children sense; instead a single component plus one static property:
- **Avatar** — the avatar itself; can show an image (`src`), a custom element, an icon, or text/initials children, with configurable shape and size.
- **Avatar.Group** — groups multiple `Avatar`s with overlap spacing and an optional "+N" overflow indicator (via the `max` config), analogous to shadcn's `AvatarGroup`/`AvatarGroupCount` combined into one prop-driven API rather than separate sub-components.

## 2. Props / API

### shadcn/ui
| Component | Prop | Type | Default | Description |
|---|---|---|---|---|
| `Avatar` | `size` | `"default" \| "sm" \| "lg"` | `"default"` | Overall box size |
| `Avatar` | `className` | `string` | — | Style override |
| `AvatarImage` | `src` | `string` | — | Image URL |
| `AvatarImage` | `alt` | `string` | — | Accessible alt text |
| `AvatarImage` | `className` | `string` | — | Style override |
| `AvatarFallback` | `className` | `string` | — | Style override |
| `AvatarFallback` | (children) | `ReactNode` | — | Initials/icon shown while no image is displayed |
| `AvatarBadge` | `className` | `string` | — | Positioning/color override (e.g. `bg-green-600` for an "online" dot) |
| `AvatarGroup` | `className` | `string` | — | Style override for the stacked container |
| `AvatarGroupCount` | `className` | `string` | — | Style override for the "+N" overflow chip |

Each part additionally accepts the full underlying-primitive prop set for its corresponding part (e.g. `AvatarImage` accepts whatever the headless primitive's Image part accepts for load-state callbacks) — the docs defer to the primitive's own reference for anything beyond the above.

### Ant Design
| Prop | Type | Default | Description |
|---|---|---|---|
| `alt` | `string` | — | Alternative text describing the image, used for image load failure or screen readers |
| `crossOrigin` | `'anonymous' \| 'use-credentials' \| ''` | — | CORS setting passed to the `<img>` |
| `draggable` | `boolean \| 'true' \| 'false'` | `false`/browser default | Whether the image is draggable |
| `gap` | `number` | `4` | Letter spacing/margin from the edge when content is text |
| `icon` | `ReactNode` | — | Custom icon element shown when no image/text is supplied |
| `shape` | `'circle' \| 'square'` | `'circle'` | Avatar shape |
| `size` | `number \| 'large' \| 'small' \| 'default' \| { xs, sm, md, lg, xl, xxl }` (responsive object) | `'default'` | Avatar dimensions, can be responsive per breakpoint |
| `src` | `string \| ReactNode` | — | Image source, or a custom element (e.g. `<img>`-like) to render |
| `srcSet` | `string` | — | Multi-resolution image source set |
| `onError` | `() => boolean` | — | Called on image load error; return `false` to prevent the default fallback-content behavior |

**Avatar.Group** props:
| Prop | Type | Default | Description |
|---|---|---|---|
| `max` | `{ count?: number; style?: CSSProperties; popover?: PopoverProps }` | — | Configures the maximum visible avatars and the overflow "+N" indicator's popover |
| `shape` | `'circle' \| 'square'` | `'circle'` | Shape applied to all avatars in the group |
| `size` | `number \| 'large' \| 'small' \| 'default'` | `'default'` | Size applied to all avatars in the group |

## 3. Variants, sizes and states

### shadcn/ui
- Sizes: `default`, `sm`, `lg` (exact string values via the `size` prop).
- States: image-loading → fallback shown; image loaded → `AvatarImage` shown; image error → falls back to `AvatarFallback` (initials/icon). An optional `AvatarBadge` overlays a small status indicator (color customized via `className`, e.g. green for "online"). Grouped/stacked avatars via `AvatarGroup` with an overflow count via `AvatarGroupCount`.

### Ant Design
- Shapes: `circle` (default), `square`.
- Sizes: `large`, `default`, `small`, any custom `number` (pixels), or a responsive object keyed by breakpoint (`xs`/`sm`/`md`/`lg`/`xl`/`xxl`).
- Content states: image (`src`), custom element (`src` as `ReactNode`), icon (`icon`), or text/initials (children) — text auto-shrinks to fit via internal scale calculation using `gap`.
- Error state: `onError` callback fires on image load failure; returning `false` from it suppresses Ant's default fallback-to-icon/text behavior (letting the app decide what to render instead).
- Group overflow: `Avatar.Group`'s `max.count` caps visible avatars and shows a "+N" avatar, which can open a `Popover` (`max.popover`) listing the rest.

## 4. Accessibility

### shadcn/ui
No explicit ARIA role documented for Avatar itself in the fetched docs (it is a presentational image/text container, not a live region or interactive control). `AvatarImage` accepts a standard `alt` prop for image accessibility. No keyboard interaction is documented (Avatar is not focusable/interactive by default). Undocumented: exact fallback-timing accessibility behavior (e.g. whether `aria-busy` is applied during the loading state) — not stated in the docs, so do not assume it.

### Ant Design
No dedicated ARIA role is documented for `Avatar` in the fetched docs. `alt` is explicitly documented as accessible text "for screen readers" as well as the image-error fallback text. No keyboard interaction is documented since Avatar is non-interactive by default (it is not a button/link unless the app wraps it in one). `Avatar.Group`'s overflow "+N" avatar can host a `Popover`, which carries `Popover`'s own accessibility behavior (not detailed on the Avatar page itself).

## 5. Design tokens

### shadcn/ui
No dedicated Avatar tokens exist. Based on the component's role, it draws on:
- `--muted` — fallback background (initials/icon box color).
- `--foreground` / `--muted-foreground` — fallback text/icon color.
- `--border` — optional ring/border around the avatar in some usage examples.
- `--radius` — corner rounding (fully round for circular avatars is typically a fixed `rounded-full`, independent of `--radius`).

### Ant Design
Full component Design Token table (from the Avatar docs page):
| Token | Description | Default value |
|---|---|---|
| `containerSize` | Default container size (px) | `32` |
| `containerSizeLG` | Large container size (px) | `40` |
| `containerSizeSM` | Small container size (px) | `24` |
| `groupBorderColor` | Border color between grouped avatars | `#ffffff` |
| `groupOverlapping` | Overlap offset between grouped avatars | `-8` |
| `groupSpace` | Spacing between grouped avatars | `4` |
| `iconFontSize` | Icon size for default avatar | `18` |
| `iconFontSizeLG` | Icon size for large avatar | `24` |
| `iconFontSizeSM` | Icon size for small avatar | `14` |
| `textFontSize` | Text font size for default avatar | `14` |
| `textFontSizeLG` | Text font size for large avatar | `18` |
| `textFontSizeSM` | Text font size for small avatar | `12` |

These derive from global tokens: `colorText`/`colorTextLightSolid` (text/icon color on the avatar surface), `colorTextPlaceholder` (fallback surface color family), `borderRadius`-family tokens (for `square` shape corner rounding), and the base `fontFamily`/`lineWidth`/`lineType` tokens (border between grouped avatars).

## 6. Notes for andes-ng implementation
- Not yet implemented in `packages/ui/src/lib` (only `button` exists today) — this is greenfield.
- **Behavior primitive needed in `@andes-ng/primitives`**: an *image-load-state* primitive (loading → loaded → error) that the Avatar component consumes to decide whether to render the image or the fallback slot, with an optional delay before showing the fallback (to avoid flashing initials during a fast image load). This is genuinely non-trivial behavior (unlike Badge/Alert, which need no primitive) and should live as a small headless helper (e.g. `createAvatarImageState()` or an Angular directive) in `packages/primitives`, mirroring why shadcn itself needed Base UI/Radix here.
- Token mapping to `packages/tokens/src/theme.css`:
  - Fallback background → `--andes-color-muted` (does not exist yet — andes-ng currently only has `--andes-color-secondary`/`--andes-color-accent`/`--andes-color-card`, no generic `--andes-color-muted`; `--andes-color-secondary` or `--andes-color-accent` is the closest existing stand-in, but consider adding a dedicated muted token to match both shadcn's and Ant's naming for "neutral/placeholder surface").
  - Fallback text/icon color → `--andes-color-muted-foreground` (also does not exist yet; `--andes-color-secondary-foreground` is the closest existing stand-in).
  - Border between grouped avatars → `--andes-color-background` (as the "ring" color so avatars visually separate from each other) or `--andes-color-border`.
  - Corner radius for `square` shape → `--andes-radius-md`/`--andes-radius-lg`; circular shape is a fixed full round (`--andes-radius-full`), not derived from the radius scale.
  - Sizes should be defined as fixed px/rem steps (Ant's `containerSize`/`containerSizeLG`/`containerSizeSM` = 32/40/24px) rather than reusing the generic `--andes-space-*` scale, since these are box dimensions, not gaps.
- Accessibility pitfall: ensure `alt` (or an Angular equivalent input) is mandatory/encouraged in the component's public API — an avatar image with no `alt` and no visible-text fallback is invisible to screen reader users, and Ant explicitly documents `alt` as doing double duty (accessibility text + error-fallback text).
