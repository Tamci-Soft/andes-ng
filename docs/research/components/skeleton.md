# Skeleton

## 1. Anatomy / compound structure

### shadcn/ui
The canonical doc URL `https://ui.shadcn.com/docs/components/skeleton` redirects to `https://ui.shadcn.com/docs/components/base/skeleton` (verified via `curl -L`, `200`).

- Single exported component, `Skeleton` — `import { Skeleton } from "@/components/ui/skeleton"`.
- **No headless primitive underlies it at all.** Confirmed directly from the live registry source served on the docs page:
  ```tsx
  import { cn } from "cn"

  function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
    return (
      <div
        data-slot="skeleton"
        className={cn("animate-pulse rounded-md bg-muted", className)}
        {...props}
      />
    )
  }

  export { Skeleton }
  ```
  It is plain styled markup: a `<div>` with a Tailwind `animate-pulse` class and a `bg-muted` fill. There is no Base UI, Radix UI, or React Aria package involved — this matches the task's expectation that Skeleton has no headless primitive.
- No compound sub-parts. Usage patterns shown in the docs (avatar placeholder, card layout, paragraph lines, form-field skeleton, table rows) are all just multiple `<Skeleton>` `<div>`s arranged with regular layout classes (flex/grid/space-y), not separate exported components.

### Ant Design
- **Main component:** `Skeleton` (`import { Skeleton } from 'antd'`) — a composite placeholder with optional `avatar`, `title`, and `paragraph` sections.
- **Static properties (sub-components):**
  - `Skeleton.Avatar` — standalone circular/square avatar placeholder.
  - `Skeleton.Button` — standalone button-shaped placeholder.
  - `Skeleton.Input` — standalone input-shaped placeholder.
  - `Skeleton.Element` — documented as an exported member (its own anchor exists on the docs page, `#skeletonelement`) but the page provides **no props table and no description** for it — it appears to be the shared internal building block behind `Avatar`/`Button`/`Input` rather than something meant for direct standalone use. Flagging this as a genuine documentation gap rather than an oversight on our part — do not assume its API from inference.
  - Older Ant Design major versions additionally shipped `Skeleton.Image` and `Skeleton.Node`; neither appears as a distinct anchor on the **current** docs page fetched for this research (only Avatar/Button/Input/Element are listed) — treat `Image`/`Node` as legacy/uncertain for the current version rather than asserting they still exist.

## 2. Props / API

### shadcn/ui

**`Skeleton`**

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | — | Tailwind classes to size/shape the placeholder (e.g. `h-4 w-[250px]`, `rounded-full`) |
| `...props` | `React.ComponentProps<"div">` | — | All native `<div>` attributes/props are forwarded (no custom props beyond `className`) |

That is the component's entire API — it is intentionally minimal.

### Ant Design

**`Skeleton`**

| Property | Description | Type | Default |
|---|---|---|---|
| `active` | Show animation effect | `boolean` | `false` |
| `avatar` | Show avatar placeholder | `boolean \| SkeletonAvatarProps` | `false` |
| `loading` | Display the skeleton when `true` (renders `children` when `false`) | `boolean` | – |
| `paragraph` | Show paragraph placeholder | `boolean \| SkeletonParagraphProps` | `true` |
| `round` | Show paragraph and title with rounded corners | `boolean` | `false` |
| `title` | Show title placeholder | `boolean \| SkeletonTitleProps` | `true` |
| `classNames` | Customize class name for each semantic DOM section (object or function) | `Record<SemanticDOM, string> \| (info: { props }) => Record<SemanticDOM, string>` | – (6.0.0+) |
| `styles` | Customize inline style for each semantic DOM section (object or function) | `Record<SemanticDOM, CSSProperties> \| (info: { props }) => Record<SemanticDOM, CSSProperties>` | – (6.0.0+) |

**`SkeletonTitleProps`**

| Property | Description | Type | Default |
|---|---|---|---|
| `width` | Width of the title | `number \| string` | – |

**`SkeletonParagraphProps`**

| Property | Description | Type | Default |
|---|---|---|---|
| `rows` | Row count of the paragraph | `number` | – |
| `width` | Width of the paragraph; when an array, sets each row's width individually, otherwise only the last row's width | `number \| string \| Array<number \| string>` | – |

**`Skeleton.Avatar`**

| Property | Description | Type | Default |
|---|---|---|---|
| `active` | Show animation effect (only relevant when used standalone) | `boolean` | `false` |
| `shape` | Shape of the avatar | `circle \| square` | `circle` |
| `size` | Size of the avatar | `number \| large \| medium \| small` | `medium` |

**`Skeleton.Button`**

| Property | Description | Type | Default | Version |
|---|---|---|---|---|
| `active` | Show animation effect | `boolean` | `false` | |
| `block` | Fit button width to its parent width | `boolean` | `false` | 4.17.0 |
| `shape` | Shape of the button | `circle \| round \| square \| default` | – | |
| `size` | Size of the button | `large \| medium \| small` | `medium` | |

**`Skeleton.Input`**

| Property | Description | Type | Default |
|---|---|---|---|
| `active` | Show animation effect | `boolean` | `false` |
| `size` | Size of the input | `large \| medium \| small` | `medium` |

**`Skeleton.Element`** — no props documented on the current docs page (see note above).

## 3. Variants, sizes and states

### shadcn/ui
- No variant/size props whatsoever — every visual variation (avatar circle, button shape, table row, paragraph line) is achieved purely through `className` (e.g. `rounded-full` for a circle, explicit `h-*`/`w-*` for dimensions).
- Only one behavioral "state": animated (`animate-pulse`, always on) vs whatever a consumer overrides via `className` (e.g. removing the animation by overriding the class). There is no `active`/`loading` prop — a Skeleton is simply rendered or not rendered by the consumer's own conditional logic (`{isLoading ? <Skeleton /> : <RealContent />}`).

### Ant Design
- `Skeleton.Avatar` shapes: `circle` (default), `square`.
- `Skeleton.Button` shapes: `circle`, `round`, `square`, `default`.
- Sizes across Avatar/Button/Input: `large | medium | small` (or a `number` for Avatar).
- States: `active` (shimmer animation on/off, default `false`), `loading` (on the composite `Skeleton`, toggles between skeleton and real `children`), `round` (rounds the title/paragraph bars' corners).
- Composable sections on the main `Skeleton`: `avatar` + `title` + `paragraph`, each independently togglable/configurable — a combination not available at all in shadcn's single-`<div>` primitive (shadcn achieves the same visual composition only by manually stacking multiple `<Skeleton>` elements).

## 4. Accessibility

### shadcn/ui
- No ARIA attributes, roles, or keyboard behavior are documented or present in the source — it is a plain, non-interactive `<div>`. Consumers are responsible for exposing loading state to assistive technology themselves, e.g. wrapping the skeleton group in a container with `role="status"`/`aria-live="polite"` and `aria-busy="true"`, or applying `aria-hidden="true"` to the decorative bars while an `sr-only` "Loading…" text is announced instead. The docs page does not prescribe a specific pattern.

### Ant Design
- No ARIA role or attribute documentation is present on the Skeleton page, and no `aria-*`/`role` attributes were observed on the component's own rendered markup in the fetched page (the `aria-*`/`role` tokens found elsewhere on the page belong to unrelated global site chrome, e.g. `role="switch"`, `role="radiogroup"` from navigation widgets, not the Skeleton demos themselves) — this is a documentation and implementation gap, not something to assume exists.

## 5. Design tokens

### shadcn/ui
No component-specific tokens exist. Global CSS variables referenced by the current (Base UI-era) registry source:
- Fill color → `bg-muted` (i.e. `--muted`)
- Shape → `rounded-md` (Tailwind's `--radius`-derived utility, not a component-specific variable)
- No color for the animation itself — `animate-pulse` is a pure opacity keyframe (Tailwind's built-in `pulse` animation), it doesn't reference a separate token.

(Note: an older/legacy `new-york-v4` registry style used `bg-accent` instead of `bg-muted` for the same component — only relevant for projects still on that older style.)

### Ant Design

Component-specific Design Token table (full, from the Skeleton docs page):

| Token | Description | Type | Default value |
|---|---|---|---|
| `blockRadius` | Border radius of the skeleton block | `number` | `4` |
| `gradientFromColor` | Start color of the shimmer gradient | `string` | `rgba(0,0,0,0.06)` |
| `gradientToColor` | End color of the shimmer gradient | `string` | `rgba(0,0,0,0.15)` |
| `paragraphLiHeight` | Line height of the paragraph skeleton row | `number` | `16` |
| `paragraphMarginTop` | Margin above the paragraph skeleton | `number` | `28` |
| `titleHeight` | Height of the title skeleton bar | `string \| number` | `16` |

Global Seed/Alias tokens this component's tokens derive from (per the docs page and the shared `customize-theme` reference):

| Token | Description | Default value |
|---|---|---|
| `borderRadiusSM` | Small-size border radius; used as the basis for skeleton block corners in small-size components | `4` |
| `controlHeight` | Basic control height, informs default row heights | `32` |
| `controlHeightLG` | Large control height (used by large-size Avatar/Button/Input skeletons) | `40` |
| `controlHeightSM` | Small control height | `24` |
| `controlHeightXS` | Extra-small control height | `16` |
| `marginSM` | Medium-small spacing between skeleton sections (avatar/title/paragraph gaps) | `12` |
| `padding` | Base padding scale | `16` |

The shimmer gradient (`gradientFromColor`/`gradientToColor`) is intentionally theme-neutral (fixed alpha-black values) rather than derived from `colorPrimary`, so it looks correct on both light and dark container backgrounds without extra theming work.

## 6. Notes for andes-ng implementation
- No behavior primitive is needed in `@andes-ng/primitives` — Skeleton (in both libraries, and especially in shadcn's minimal form) is purely presentational. The only thing worth centralizing is a small `AndesSkeleton` component/directive that applies the pulse animation class and exposes `shape`/size via `[class]`/`[ngStyle]` bindings or CSS custom properties, mirroring shadcn's "just a styled div" approach rather than building an elaborate composite like Ant Design's.
- Token mapping to `packages/tokens/src/theme.css`: fill color → `--andes-color-muted` (exists, matches shadcn's current choice); radius → `--andes-radius-md` (exists, matches `rounded-md`) with `--andes-radius-full` available for circular avatar-shaped skeletons. If Ant Design-style visual parity (a subtle gradient shimmer, not a flat pulse) is desired, andes-ng needs **new** tokens: nothing today defines a shimmer gradient — would need e.g. `--andes-skeleton-gradient-from` / `--andes-skeleton-gradient-to` (or reuse `--andes-color-muted` + a lighter derived stop) plus an animation keyframe, since `theme.css` has no motion/animation tokens at all yet (see the same gap flagged in progress.md and accordion-collapse.md).
- Accessibility pitfall to flag: because neither reference library documents an ARIA pattern for Skeleton, whoever implements `AndesSkeleton` should not silently ship it with no screen-reader story. The safe default is to require (or default) an `aria-hidden="true"` on each decorative bar and let the *consumer* wrap the loading region in `role="status" aria-live="polite" aria-busy="true"` with an `sr-only` "Loading…" label — document this contract explicitly in the component's own docs since neither shadcn nor Ant Design does it for you, and a naive one-to-one port would carry the same gap forward.
