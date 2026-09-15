# Pagination

## 1. Anatomy / compound structure

### shadcn/ui

Like Breadcrumb, the current (2026) Pagination doc page ships three parallel variants (Base UI / Radix UI / React Aria) with frontmatter `base: base` on the canonical page — i.e. **Base UI is the default/primary variant presented**. Verified directly from the shipped registry source (`registry/bases/base/ui/pagination.tsx` and the still-installed `registry/new-york-v4/ui/pagination.tsx`):

- Pagination has **no headless interactive primitive underneath it at all** — no keyboard roving-tabindex, no state machine, no focus management beyond what native `<a>`/`<button>` elements give for free. It is plain styled markup composed from the existing `Button`/`buttonVariants` styling (not behavior) of the Button component.
- The only difference between the Base UI and Radix/new-york-v4 variants is, again, purely about **polymorphic composition of the underlying Button**: the Base UI variant's `PaginationLink` renders Base UI's `<Button nativeButton={false} render={<a .../>} />` (composition via Base UI's `render` prop), while the Radix/new-york-v4 variant renders a plain `<a className={buttonVariants(...)} />` styled with the `cva`-based `buttonVariants` helper and Radix's `Slot` only inside `Button` itself (not used directly in Pagination).
- Exported parts (identical set across variants):
  - `Pagination` — root `<nav role="navigation" aria-label="pagination">` landmark wrapper, horizontally centers its content.
  - `PaginationContent` — the `<ul>` flex row holding all pagination items.
  - `PaginationItem` — an `<li>` wrapping one control (a page link, ellipsis, or prev/next button).
  - `PaginationLink` — an `<a>` styled like a `Button` (via `buttonVariants`), representing one page number; carries `isActive`.
  - `PaginationPrevious` — a `PaginationLink` preconfigured with a left-chevron icon, `aria-label="Go to previous page"`, and text (default `"Previous"`, hidden below `sm` breakpoint).
  - `PaginationNext` — the mirror of `PaginationPrevious` (`aria-label="Go to next page"`, default text `"Next"`, right chevron).
  - `PaginationEllipsis` — a non-interactive `<span aria-hidden>` "more pages" indicator (icon + `sr-only` text "More pages").
- Pagination is entirely **presentational/uncontrolled** — there is no built-in page-state management, no automatic ellipsis-collapsing algorithm, and no `onChange` callback; the consuming app is responsible for computing which page numbers/ellipses to render and wiring `href`/`onClick` per link. (The docs' own "Next.js" section shows swapping the rendered `<a>` for a router `<Link>` by hand-editing the copied source.)

### Ant Design

- `Pagination` — the single exported component; it is a fully controlled/uncontrolled **stateful** widget (accepts `current`/`defaultCurrent`, `pageSize`/`defaultPageSize`, fires `onChange`), unlike shadcn's presentational-only building blocks.
- No documented static sub-components (no `Pagination.Item`, no `Pagination.Options`). The `components` prop (6.6.0+) allows overriding only the internal `sizeChanger` sub-part component, but this is a customization escape hatch, not a set of composable exported parts.
- `simple` mode collapses the whole control into a compact "prev / current-of-total (as an editable input) / next" layout; `showQuickJumper` and `showSizeChanger` are optional built-in composed sub-controls (a jump-to-page input+button, and a page-size `<Select>`) rather than separate components you compose yourself.

## 2. Props / API

### shadcn/ui

The current doc page's "API Reference" section (present for Breadcrumb) is **not present for Pagination** — no props table is published on the page itself. The table below is reconstructed directly from the shipped, current source (`registry/bases/base/ui/pagination.tsx` / `registry/new-york-v4/ui/pagination.tsx`), which is the actual public surface once installed into a consumer's `components/ui/pagination.tsx`.

| Sub-component        | Prop                      | Type                                                     | Default             | Description                                                                                                      |
| -------------------- | ------------------------- | -------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Pagination`         | `className`               | `string`                                                 | —                   | Extra classes on the root `<nav>`                                                                                |
| `Pagination`         | ...native `<nav>` props   | —                                                        | —                   | Spread onto the root element                                                                                     |
| `PaginationContent`  | `className`               | `string`                                                 | —                   | Extra classes on the `<ul>`                                                                                      |
| `PaginationItem`     | ...native `<li>` props    | —                                                        | —                   | No component-specific props; plain `<li>` wrapper                                                                |
| `PaginationLink`     | `href`                    | `string`                                                 | —                   | Navigation target (native anchor prop)                                                                           |
| `PaginationLink`     | `isActive`                | `boolean`                                                | `false` (undefined) | Marks this link as the current page; sets `aria-current="page"` and swaps visual variant to `outline`            |
| `PaginationLink`     | `size`                    | `"default" \| "sm" \| "lg" \| "icon" \| ...Button sizes` | `"icon"`            | Re-uses `Button`'s `size` variant for styling (page-number links default to the square `icon` size)              |
| `PaginationLink`     | `className`               | `string`                                                 | —                   | Extra classes                                                                                                    |
| `PaginationPrevious` | `text`                    | `string`                                                 | `"Previous"`        | Label text next to the chevron (hidden below `sm` breakpoint); added specifically to support RTL/i18n relabeling |
| `PaginationPrevious` | `className`               | `string`                                                 | —                   | Extra classes                                                                                                    |
| `PaginationPrevious` | ...`PaginationLink` props | —                                                        | —                   | Inherits `href`, `isActive`, etc. (`size` is fixed to `"default"` internally)                                    |
| `PaginationNext`     | `text`                    | `string`                                                 | `"Next"`            | Label text next to the chevron (hidden below `sm` breakpoint)                                                    |
| `PaginationNext`     | `className`               | `string`                                                 | —                   | Extra classes                                                                                                    |
| `PaginationNext`     | ...`PaginationLink` props | —                                                        | —                   | Inherits `href`, `isActive`, etc. (`size` is fixed to `"default"` internally)                                    |
| `PaginationEllipsis` | `className`               | `string`                                                 | —                   | Extra classes                                                                                                    |

### Ant Design

Full official `Pagination` props table:

| Prop                           | Description                                                                                          | Type                                                                                            | Default             | Version                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------- |
| `align`                        | Alignment of the pagination                                                                          | `start \| center \| end`                                                                        | `end`               | 5.19.0                                 |
| `classNames`                   | Customize class for each semantic structure inside the component. Supports object or function        | `Record<SemanticDOM, string> \| (info: { props }) => Record<SemanticDOM, string>`               | —                   | 6.0.0                                  |
| `components`                   | Customize internal components                                                                        | `{ sizeChanger?: React.ComponentType }`                                                         | —                   | 6.6.0                                  |
| `current`                      | Current page number                                                                                  | `number`                                                                                        | —                   | —                                      |
| `defaultCurrent`               | Default initial page number                                                                          | `number`                                                                                        | `1`                 | —                                      |
| `defaultPageSize`              | Default number of data items per page                                                                | `number`                                                                                        | `10`                | —                                      |
| `disabled`                     | Disable pagination                                                                                   | `boolean`                                                                                       | —                   | —                                      |
| `hideOnSinglePage`             | Whether to hide pager when there is only one page                                                    | `boolean`                                                                                       | `false`             | —                                      |
| `itemRender`                   | Customize the item's innerHTML                                                                       | `(page, type: 'page' \| 'prev' \| 'next', originalElement) => ReactNode`                        | —                   | —                                      |
| `pageSize`                     | Number of data items per page                                                                        | `number`                                                                                        | —                   | —                                      |
| `pageSizeOptions`              | Specify the sizeChanger options                                                                      | `number[]`                                                                                      | `[10, 20, 50, 100]` | —                                      |
| `responsive`                   | If `size` is not specified, `Pagination` resizes according to window width                           | `boolean`                                                                                       | —                   | —                                      |
| `showLessItems`                | Show fewer page items                                                                                | `boolean`                                                                                       | `false`             | —                                      |
| `showQuickJumper`              | Whether the user can jump to pages directly                                                          | `boolean \| { goButton: ReactNode }`                                                            | `false`             | —                                      |
| `showSizeChanger`              | Whether to show the page-size `Select`                                                               | `boolean \| SelectProps`                                                                        | —                   | 4.21.0 (`SelectProps` support: 5.21.0) |
| `showTitle`                    | Show each page item's `title` attribute                                                              | `boolean`                                                                                       | `true`              | —                                      |
| `showTotal`                    | Display the total number and range of data items                                                     | `function(total, range)`                                                                        | —                   | —                                      |
| `simple`                       | Whether to use the simplified/compact mode                                                           | `boolean \| { readOnly?: boolean }`                                                             | —                   | —                                      |
| `size`                         | Component size                                                                                       | `large \| medium \| small`                                                                      | `medium`            | —                                      |
| `styles`                       | Customize inline style for each semantic structure inside the component. Supports object or function | `Record<SemanticDOM, CSSProperties> \| (info: { props }) => Record<SemanticDOM, CSSProperties>` | —                   | 6.0.0                                  |
| `total`                        | Total number of data items                                                                           | `number`                                                                                        | `0`                 | —                                      |
| `totalBoundaryShowSizeChanger` | When `total` is larger than this, `showSizeChanger` is forced `true`                                 | `number`                                                                                        | `50`                | 6.2.0                                  |
| `onChange`                     | Called when the page number or `pageSize` changes                                                    | `function(page, pageSize)`                                                                      | —                   | —                                      |
| `onShowSizeChange`             | Called when `pageSize` changes                                                                       | `function(current, size)`                                                                       | —                   | —                                      |

No `usePagination` hook is documented/exported by Ant Design (that is a shadcn/Radix-ecosystem naming convention, not present here).

## 3. Variants, sizes and states

### shadcn/ui

- No `variant` enum exists at the `Pagination` level; `PaginationLink` reuses `Button`'s `variant` internally but only ever passes `"outline"` (when `isActive`) or `"ghost"` (otherwise) — these two are not user-facing options, they're the hardcoded active/inactive look.
- `size` on `PaginationLink` reuses whatever size strings `Button`/`buttonVariants` defines (see `button.md`: `"default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"`); page-number links default to `"icon"` (square), while `PaginationPrevious`/`PaginationNext` force `"default"` (text+icon width).
- States handled:
  - **Current page**: `isActive` prop on `PaginationLink` → `aria-current="page"`, `data-active` attribute, and `outline` visual variant instead of `ghost`.
  - **Ellipsis/collapsed items**: `PaginationEllipsis` — purely decorative "more pages" marker; there is no built-in algorithm to decide when to collapse — the consuming app computes the page list (including where to insert ellipses) itself.
  - **Disabled prev/next**: not built in as a prop — the docs' "Icons Only" example and general pattern rely on the consumer conditionally omitting/disabling the `href`/`onClick` (or wrapping in a disabled-styled state) when on the first/last page; there is no `disabled` prop on `PaginationPrevious`/`PaginationNext` in the shipped source.
  - RTL: dedicated RTL example; `text` prop on prev/next exists specifically to support this, and icons flip via an RTL-flip class in the Base UI variant.
  - "Simple"/"Icons only" variant: shown as a compositional example (omit the numbered `PaginationLink`s, keep only `PaginationPrevious`/`PaginationNext`) rather than a distinct prop/mode.

### Ant Design

- `size`: `"large" | "medium" (default) | "small"` (top-level prop, distinct from shadcn's per-link size).
- `simple` mode: boolean (or `{ readOnly?: boolean }`) — compact prev/current-input/next/total layout, used e.g. for mobile.
- `responsive`: auto-shrinks to small size based on window width when `size` isn't explicitly set.
- States handled:
  - **Current page**: `current`/`defaultCurrent` drive which item is visually active; no explicit `aria-current` documented (see Accessibility).
  - **Disabled**: `disabled` prop disables the entire control (all page links, prev/next, jumper, size changer) at once — coarser-grained than shadcn, which has no built-in disabled concept at all.
  - **Ellipsis/collapsed items**: built-in and automatic — Ant Design computes and renders "jump previous"/"jump next" ellipsis controls itself once there are more pages than fit; `showLessItems` reduces how many page numbers are shown around the current page before collapsing to an ellipsis.
  - **Hide on single page**: `hideOnSinglePage` removes the whole control when only one page of data exists.
  - **Quick jumper / size changer**: `showQuickJumper` and `showSizeChanger` are opt-in built-in composed sub-controls, not separate primitives to assemble.

## 4. Accessibility

### shadcn/ui

Verified directly from the shipped source (identical across the Base UI and Radix/new-york-v4 variants):

- `Pagination` renders `<nav role="navigation" aria-label="pagination">` — an explicitly labeled navigation landmark (the `role="navigation"` is redundant on a `<nav>` but present in the source regardless, functioning as a belt-and-braces attribute).
- `PaginationLink` sets `aria-current={isActive ? "page" : undefined}` — correctly following the "only present when true" ARIA pattern rather than `aria-current="false"`.
- `PaginationPrevious`/`PaginationNext` each carry an explicit `aria-label` ("Go to previous page" / "Go to next page") so the icon-plus-responsive-text button is still announced meaningfully even when the text label is hidden at narrow viewports (`hidden sm:block`).
- `PaginationEllipsis` is `aria-hidden` with `sr-only` text "More pages" for context if it were ever exposed.
- No custom keyboard handling — native anchor/button tab order and Enter/Space activation apply throughout; there is no roving-tabindex or arrow-key paging.

### Ant Design

- The current docs page does **not document any ARIA attributes** (no mention of `aria-current`, landmark roles, or keyboard interaction) for Pagination — this is explicitly undocumented on Ant's public API reference, not merely omitted here. Given the component is a fully custom-rendered `<ul>`/button-like structure with built-in state, the lack of documented `aria-current` on the active page item is a real, notable gap to double check against the rendered DOM rather than assume compliant.

## 5. Design tokens

### shadcn/ui

Pagination has no design tokens of its own; the CSS variables actually referenced (via the `Button`/`buttonVariants` classes it reuses, plus its own layout classes) are:

- `--muted-foreground` — inherited indirectly through `Button`'s `ghost` variant default text color in the unselected state (same mechanism Button uses).
- `--accent` / `--accent-foreground` — `ghost`-variant hover background/text (inactive page links).
- `--border` — `outline`-variant border (active page link, since `isActive` switches to `variant="outline"`).
- `--background` — `outline`-variant background.
- `--ring` — focus-visible ring on any focused link/button.
- `--radius` — corner radius on each pill/square link (via `Button`'s own radius classes).
  No `--primary`, `--secondary`, `--destructive`, `--input`, `--card`, or `--popover` tokens are touched — Pagination never renders a "selected = primary color" look out of the box; the active state is only the `outline` variant (border + normal text), not a filled primary background.

### Ant Design

Full component-specific Design Token table (from the "Design Token" section of the docs page):

| Token                       | Description                                          | Default value      |
| --------------------------- | ---------------------------------------------------- | ------------------ |
| `itemActiveBg`              | Background color of active Pagination item           | `#ffffff`          |
| `itemActiveBgDisabled`      | Background color of disabled active Pagination item  | `rgba(0,0,0,0.15)` |
| `itemActiveColor`           | Text color of active Pagination item                 | `#1677ff`          |
| `itemActiveColorDisabled`   | Text color of disabled active Pagination item        | `rgba(0,0,0,0.25)` |
| `itemActiveColorHover`      | Text color of active Pagination item on hover        | `#4096ff`          |
| `itemBg`                    | Background color of Pagination item                  | `#ffffff`          |
| `itemInputBg`               | Background color of the input (quick jumper)         | `#ffffff`          |
| `itemLinkBg`                | Background color of Pagination item link (prev/next) | `#ffffff`          |
| `itemSize`                  | Size of Pagination item                              | `32`               |
| `itemSizeLG`                | Size of large Pagination item                        | `40`               |
| `itemSizeSM`                | Size of small Pagination item                        | `24`               |
| `miniOptionsSizeChangerTop` | Top offset of the size changer in mini/simple mode   | `0`                |

Derivation from global Seed/Alias tokens (per `ant.design/docs/react/customize-theme`): `itemActiveColor`/`itemActiveColorHover` derive straight from the global Seed token `colorPrimary` (`#1677ff`) and its hover map-token shade (`#4096ff`) — Pagination is one of the components that visibly ties its "selected" state to the brand color, unlike shadcn's neutral `outline` default. `itemActiveColorDisabled`/`itemActiveBgDisabled` derive from the disabled-state Alias tokens seeded off `colorTextDisabled`/neutral-scale opacity steps. `itemBg`/`itemLinkBg`/`itemInputBg` default to the global `colorBgContainer` Alias token (`#ffffff`). `itemSize`/`itemSizeLG`/`itemSizeSM` are Pagination-specific pixel values conceptually aligned with (but not directly bound to) the global `controlHeight`/`controlHeightLG`/`controlHeightSM` Seed/Alias tokens (32/40/24 match Ant's standard control-height scale exactly). `borderRadius` (global Seed token) governs the corner rounding of each item even though it isn't re-exposed as its own Pagination component token.

## 6. Notes for andes-ng implementation

- **A thin behavior primitive is arguably useful here, unlike Breadcrumb** — not for keyboard/focus management (neither reference library implements any), but for the **page-range/ellipsis computation algorithm** (given `current`, `total`, `pageSize`, `showLessItems`/boundary counts, produce the ordered list of page numbers and where ellipses go). shadcn deliberately leaves this to the consumer; Ant Design implements it internally. Since andes-ng likely wants a batteries-included `AndesPagination` (closer to Ant's model) rather than a bag of unstyled parts, this range-computation logic is a good candidate for a small pure function in `@andes-ng/primitives` (no DOM/host dependency, purely computational) so it's unit-testable independent of rendering.
- Token mapping to `packages/tokens/src/theme.css`: inactive items → `--andes-color-muted-foreground` (text) / transparent-to-`--andes-color-accent` on hover; active item → `--andes-color-primary` for text/border if following Ant's brand-tied convention, or `--andes-color-foreground`/`--andes-color-border` if following shadcn's neutral-outline convention — **this is a real design decision to make explicitly**, since the two reference libraries disagree (Ant ties "selected page" to brand color, shadcn does not). Item sizing (`itemSize`/`itemSizeLG`/`itemSizeSM` = 32/40/24) maps cleanly to a control-height concept, but **`packages/tokens/src/theme.css` currently has no `--andes-control-height-*` scale at all** (only `--andes-radius-*` and `--andes-space-*`) — this is a genuine gap to flag if `AndesPagination` needs Ant-parity size variants. Corner radius maps to `--andes-radius-md`/`--andes-radius-full` depending on whether square or pill-shaped items are chosen; focus ring maps to `--andes-color-focus-ring` (already existing under that exact name, matching shadcn's `--ring` concept 1:1).
- Accessibility pitfalls to flag: (1) omitting `aria-current="page"` on the active page item — Ant's own docs don't document this either, so it must be added deliberately in andes-ng rather than copied from either reference; (2) not giving the prev/next controls a descriptive `aria-label` when they are icon-only (both libraries' "icons only" pattern needs this, easy to drop when compacting for mobile); (3) rendering the whole control as a bare `<div>` of `<span>`s instead of a `<nav aria-label="pagination">` (or, if using real `<button>`s that submit no navigation, at minimum a landmark/labeled group) — losing the landmark is an easy regression when converting Ant's fully custom-rendered DOM into a component.
