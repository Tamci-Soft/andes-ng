# Breadcrumb

## 1. Anatomy / compound structure

### shadcn/ui
As of the current (2026) docs, shadcn/ui ships **three parallel implementations** of every interactive-ish component, selectable at the top of the component doc page: **Base UI** (`base`), **Radix UI** (`radix`), and **React Aria** (`aria`). The frontmatter of the canonical Breadcrumb doc page (`content/docs/components/base/breadcrumb.mdx`) declares `base: base`, i.e. **Base UI is the primary/default variant shown**. Verified by reading the actual registry source (`registry/bases/base/ui/breadcrumb.tsx` and the older, still-shipped `registry/new-york-v4/ui/breadcrumb.tsx`, which is what `npx shadcn add breadcrumb` currently installs):

- Breadcrumb has **no stateful/interactive headless primitive underneath it at all** — it is plain styled markup (`<nav>`, `<ol>`, `<li>`, `<a>`, `<span>`). There is nothing to open/close, focus-trap, or keyboard-navigate, so neither Base UI nor Radix contributes behavior.
- The only primitive-library touchpoint is for **polymorphic composition** (rendering `BreadcrumbLink` as something other than a plain `<a>`, e.g. a router `<Link>`):
  - Base UI variant: `BreadcrumbLink` uses Base UI's `useRender` + `mergeProps` (`@base-ui/react/use-render`, `@base-ui/react/merge-props`) and exposes a `render` prop.
  - Radix/new-york-v4 variant: `BreadcrumbLink` uses Radix's `Slot` (`import { Slot } from "radix-ui"`) and exposes an `asChild` boolean instead of `render`.
- Exported parts (identical set across all three variants):
  - `Breadcrumb` — root `<nav aria-label="breadcrumb">` landmark wrapper.
  - `BreadcrumbList` — the `<ol>` that lays out items in a row and wraps on overflow.
  - `BreadcrumbItem` — an `<li>` wrapping one crumb (a link, the current page, or an ellipsis).
  - `BreadcrumbLink` — the clickable `<a>` (or custom render target) for a non-current crumb.
  - `BreadcrumbPage` — a non-interactive `<span>` representing the current/last crumb.
  - `BreadcrumbSeparator` — an `<li role="presentation" aria-hidden="true">` divider between items, defaults to a chevron icon, accepts custom `children`.
  - `BreadcrumbEllipsis` — a `<span role="presentation" aria-hidden="true">` collapsed-state indicator (visually a "more" icon with `sr-only` text "More"); meant to be composed with a `DropdownMenu` for the collapsed/dropdown pattern, not a component with its own dropdown logic.

### Ant Design
- `Breadcrumb` — the root component. Since v5.3.0 the idiomatic API is data-driven via the `items` prop (an array of `ItemType`); rendering breadcrumbs as JSX children is the legacy pattern.
- `Breadcrumb.Item` — legacy static sub-component for a single crumb (children-based API, pre-5.3.0 style, still supported).
- `Breadcrumb.Separator` — legacy static sub-component for a custom separator between `Breadcrumb.Item`s (children-based API).
- The current docs page focuses entirely on the `items`/`ItemType` array API and does not give `Breadcrumb.Item`/`Breadcrumb.Separator` their own dedicated prop tables — they are mentioned only as the pre-5.3.0 alternative. Each entry in `items` can itself carry a `menu`/`dropdownProps` (Ant `Dropdown` config), which is how Ant Design implements the "breadcrumb item with a dropdown" pattern, and each entry can also be a `SeparatorType` object (`{ type: 'separator', separator }`) to inject a custom separator at a specific position in the array.

## 2. Props / API

### shadcn/ui
All parts are unstyled-HTML wrappers; the only documented prop on the API Reference section of the doc page is `className` (plus native passthrough props of the underlying element, and `children` where noted). This table also folds in the composition-only prop (`render`/`asChild`) found in the source, which the docs describe under "Link component" rather than the API Reference table.

| Sub-component | Prop | Type | Default | Description |
|---|---|---|---|---|
| `Breadcrumb` | `className` | `string` | — | Extra classes on the root `<nav>` |
| `Breadcrumb` | ...native `<nav>` props | — | — | Spread onto the root element |
| `BreadcrumbList` | `className` | `string` | — | Extra classes on the `<ol>` |
| `BreadcrumbItem` | `className` | `string` | — | Extra classes on the `<li>` |
| `BreadcrumbLink` | `className` | `string` | — | Extra classes on the link |
| `BreadcrumbLink` (Base UI variant) | `render` | `ReactElement` | — | Renders the link as a different element/component (e.g. a router `<Link>`) instead of `<a>` |
| `BreadcrumbLink` (Radix/new-york-v4 variant) | `asChild` | `boolean` | `false` | Merges props onto its single child via Radix `Slot` instead of rendering an `<a>` |
| `BreadcrumbPage` | `className` | `string` | — | Extra classes on the current-page `<span>` |
| `BreadcrumbSeparator` | `children` | `React.ReactNode` | chevron icon | Custom separator content |
| `BreadcrumbSeparator` | `className` | `string` | — | Extra classes |
| `BreadcrumbEllipsis` | `className` | `string` | — | Extra classes |

### Ant Design
Full official `Breadcrumb` props table:

| Prop | Description | Type | Default | Version |
|---|---|---|---|---|
| `classNames` | Customize class for each semantic structure inside the component. Supports object or function | `Record<SemanticDOM, string> \| (info: { props }) => Record<SemanticDOM, string>` | — | 6.0.0 |
| `dropdownIcon` | Custom dropdown icon | `ReactNode` | `<DownOutlined />` | 6.2.0 |
| `items` | The routing stack information of router (>=5.3.0 recommended; use `Breadcrumb.Item` children for older versions) | `ItemType[]` | — | 5.3.0 |
| `itemRender` | Custom item renderer, works with react-router | `(route, params, routes, paths) => ReactNode` | — | — |
| `params` | Routing parameters | `object` | — | — |
| `separator` | Custom separator | `ReactNode` | `/` | — |
| `styles` | Customize inline style for each semantic structure inside the component. Supports object or function | `Record<SemanticDOM, CSSProperties> \| (info: { props }) => Record<SemanticDOM, CSSProperties>` | — | 6.0.0 |

`ItemType` (= `Omit<RouteItemType, 'title' | 'path'> | SeparatorType`) — `RouteItemType` props:

| Prop | Description | Type | Default | Version |
|---|---|---|---|---|
| `className` | The additional css class | `string` | — | — |
| `dropdownProps` | The dropdown props | `Dropdown` props | — | — |
| `href` | Target of hyperlink. Cannot work with `path` | `string` | — | — |
| `path` | Connected path. Each path connects with the previous one. Cannot work with `href` | `string` | — | — |
| `menu` | The menu props (renders a dropdown for this item) | `MenuProps` | — | 4.24.0 |
| `onClick` | Click event handler | `(e: MouseEvent) => void` | — | — |
| `title` | Item name | `ReactNode` | — | 5.3.0 |

`SeparatorType` props:

| Prop | Description | Type | Default | Version |
|---|---|---|---|---|
| `type` | Mark this array entry as a separator | `'separator'` | — | 5.3.0 |
| `separator` | Custom separator content | `ReactNode` | `/` | 5.3.0 |

The legacy `Breadcrumb.Item`/`Breadcrumb.Separator` static sub-components are still supported for pre-5.3.0-style usage but are not given their own prop table on the current docs page (only referenced as the older alternative to `items`).

## 3. Variants, sizes and states

### shadcn/ui
- No `variant`/`size` string enums exist for Breadcrumb — it is unstyled structural markup styled with Tailwind utility classes baked into each part, not a `cva`-driven component.
- States handled:
  - **Current page**: `BreadcrumbPage` — rendered as a non-link `<span>` with `role="link"`, `aria-disabled="true"`, `aria-current="page"`.
  - **Collapsed/ellipsis**: `BreadcrumbEllipsis` — a visual "more" indicator; the "Dropdown" example composes a `BreadcrumbItem` + `DropdownMenu` + `BreadcrumbEllipsis` to let the user expand the hidden middle crumbs. There's also a dedicated "Collapsed" example showing the ellipsis in a shortened trail, and a "Responsive" example (`breadcrumb-responsive.tsx` in the registry) that collapses crumbs based on viewport width.
  - **Disabled prev/next**: not applicable — Breadcrumb has no prev/next controls (that's Pagination).
  - RTL: a dedicated RTL example exists; the separator icon flips via a `cn-rtl-flip`-style class in the Base UI variant.

### Ant Design
- No explicit `size`/`variant` prop on `Breadcrumb` itself.
- States handled:
  - **Current/last item**: styled automatically via the `lastItemColor` design token (darker/more prominent than other items); Ant's docs do not explicitly document setting `aria-current` on it (see Accessibility below).
  - **Dropdown item**: any `items[i].menu` (or legacy per-item `overlay`) turns that crumb into a clickable dropdown trigger, shown with `dropdownIcon` (default `<DownOutlined />`).
  - **Separator override**: global via `separator` prop, or per-item via a `SeparatorType` entry in `items`.
  - No "collapsed/ellipsis" behavior is built in — unlike shadcn, Ant Design's Breadcrumb does not auto-collapse long trails; that would need to be composed manually.

## 4. Accessibility

### shadcn/ui
Verified directly from the shipped source (both Base UI and Radix/new-york-v4 variants are identical here):
- `Breadcrumb` renders `<nav aria-label="breadcrumb">` — a labeled navigation landmark.
- `BreadcrumbPage` (current crumb) gets `role="link"`, `aria-disabled="true"`, and `aria-current="page"` — explicitly marking it as the current page for assistive tech while visually looking like the rest of the trail.
- `BreadcrumbSeparator` and `BreadcrumbEllipsis` both get `role="presentation"` and `aria-hidden="true"`, removing purely decorative glyphs from the accessibility tree; `BreadcrumbEllipsis` additionally carries an `sr-only` text node ("More") for the icon-only affordance.
- No custom keyboard interaction is implemented (nor needed) — it's native `<nav>`/`<a>` semantics throughout; the dropdown-composition example inherits whatever keyboard behavior the composed `DropdownMenu` primitive provides.

### Ant Design
- The current docs page does not document any ARIA attributes or keyboard-interaction behavior for Breadcrumb — treat this as **explicitly undocumented** rather than assumed absent. In practice Ant renders an `<ol>`/`<span>`-based structure but the public docs make no accessibility claims (no landmark, no `aria-current` mentioned), which is a real gap relative to shadcn's docs.

## 5. Design tokens

### shadcn/ui
Global CSS variables the rendered markup relies on (via Tailwind utility classes in the source):
- `--muted-foreground` — default text color for `BreadcrumbList`/non-current items.
- `--foreground` — text color for `BreadcrumbPage` (current crumb) and link hover state (`hover:text-foreground`).
- No `--border`, `--ring`, `--radius`, `--background`, `--primary`, `--accent`, `--destructive`, or `--input` tokens are referenced — Breadcrumb only touches the text-color pair above (it has no background, border, or focus ring of its own).

### Ant Design
Full component-specific Design Token table (from the "Design Token" section of the docs page):

| Token | Description | Default value |
|---|---|---|
| `iconFontSize` | Icon size | `14` |
| `itemColor` | Text color of Breadcrumb item | `rgba(0,0,0,0.45)` |
| `lastItemColor` | Text color of the last item | `rgba(0,0,0,0.88)` |
| `linkColor` | Text color of link | `rgba(0,0,0,0.45)` |
| `linkHoverColor` | Color of hovered link | `rgba(0,0,0,0.88)` |
| `separatorColor` | Color of separator | `rgba(0,0,0,0.45)` |
| `separatorMargin` | Margin of separator | `8` |

Derivation from global Seed/Alias tokens (per `ant.design/docs/react/customize-theme`): `itemColor`/`linkColor`/`separatorColor` derive from the global Alias token `colorTextDescription`/`colorTextSecondary` family seeded off `colorText` (itself seeded off the neutral color scale, not `colorPrimary`); `lastItemColor`/`linkHoverColor` derive from the stronger `colorText` alias (`rgba(0,0,0,0.88)` is Ant's standard "primary text" alias value); `iconFontSize` derives from the global `fontSize` Seed token; `separatorMargin` is a fixed component value in the same units as the global `marginXS`/`sizeStep` spacing scale (not itself a spacing alias token). Breadcrumb notably does **not** derive anything from `colorPrimary`, `controlHeight`, or `borderRadius` — it has no background, border, or control-height surface.

## 6. Notes for andes-ng implementation
- **No dedicated behavior primitive needed in `@andes-ng/primitives`.** Both reference libraries confirm Breadcrumb has zero interactive/stateful behavior of its own (no focus trap, no open/close state, no roving tabindex) — it's pure structural markup. The only thing worth a shared primitive is the **polymorphic "render as anchor or custom element" pattern** already needed for `AndesButtonPrimitive` (per `button.md`'s notes) — reuse that same `HOST_TAG_NAME`-style approach for `BreadcrumbLink` instead of inventing a new one.
- Token mapping to `packages/tokens/src/theme.css`: map `linkColor`/`itemColor` → `--andes-color-muted-foreground`, `lastItemColor`/`linkHoverColor` → `--andes-color-foreground`, separator glyph color → `--andes-color-muted-foreground` as well (shadcn doesn't distinguish separator color from item color; Ant does via `separatorColor`, which currently has no dedicated andes-ng equivalent — reuse `--andes-color-muted-foreground` rather than adding a new token). `separatorMargin`/`iconFontSize` map to the existing `--andes-space-*` scale and a to-be-added font-size scale respectively — **note: `packages/tokens/src/theme.css` currently has no `--andes-font-size-*` tokens at all** (only `--andes-font-family` and `--andes-font-weight-medium`), so `iconFontSize`/`separatorMargin`-equivalent sizing will need either a new token or a hardcoded rem value tied to `--andes-space-2`.
- Accessibility pitfalls to flag: (1) forgetting `aria-current="page"` on the active/last crumb — Ant Design's own docs don't document doing this, so andes-ng must not silently inherit that gap; (2) rendering the whole trail as a bare `<div>`/`<ul>` instead of a labeled `<nav aria-label="breadcrumb">` landmark, which both reference libraries treat as baseline; (3) forgetting `aria-hidden="true"`/`role="presentation"` on separator and ellipsis glyphs so screen readers don't announce decorative chevrons/dots between every crumb.
