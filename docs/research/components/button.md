# Button

## 1. Anatomy / compound structure

### shadcn/ui

Single component, no compound sub-parts. As of the current docs (2026), shadcn's interactive primitives — including Button — are built on **Base UI** (`@base-ui-components/react`), not Radix UI. This is a real, recent shift: Radix UI's own development has slowed since its acquisition by WorkOS, and shadcn has been migrating component-by-component to Base UI. Always verify per-component which primitive underlies it rather than assuming Radix — some older shadcn installs/registries may still be on Radix.

- Uses `class-variance-authority` (cva) to compose `variant` + `size` into class strings.
- No `asChild`/Slot polymorphism documented on the current Button page (that was the Radix-era pattern). The current guidance is explicit: **do not** render it as a link via a Slot-style prop — for link-styled buttons, use the exported `buttonVariants()` class function directly on a plain `<a>`.

### Ant Design

Single component, no compound sub-parts (`Button` only — `Button.Group` exists for grouping but is a separate, simple wrapper).

## 2. Props / API

### shadcn/ui (Button)

| Prop        | Type                                                                                 | Default     | Description                                                                                      |
| ----------- | ------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------ |
| `variant`   | `"default" \| "outline" \| "ghost" \| "destructive" \| "secondary" \| "link"`        | `"default"` | Visual style                                                                                     |
| `size`      | `"default" \| "xs" \| "sm" \| "lg" \| "icon" \| "icon-xs" \| "icon-sm" \| "icon-lg"` | `"default"` | Size, including 4 icon-only sizes                                                                |
| `disabled`  | `boolean`                                                                            | `false`     | Native disabled                                                                                  |
| `data-icon` | `"inline-start" \| "inline-end"`                                                     | —           | Set on an icon child to get correct spacing (not a component prop — a data attribute convention) |

### Ant Design (Button)

| Prop              | Description                                    | Type                                                    | Default           |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------- | ----------------- |
| `autoInsertSpace` | Insert a space between two Chinese characters  | `boolean`                                               | `true`            |
| `block`           | Fit button width to parent width               | `boolean`                                               | `false`           |
| `classNames`      | Customize classes for semantic structures      | `Record` or function                                    | —                 |
| `color`           | Button color                                   | `default \| primary \| danger \| PresetColors`          | `primary` (solid) |
| `danger`          | Set danger status                              | `boolean`                                               | `false`           |
| `disabled`        | Disable button                                 | `boolean`                                               | `false`           |
| `ghost`           | Transparent background, inverted colors        | `boolean`                                               | `false`           |
| `href`            | Redirect URL (renders as `<a>`)                | `string`                                                | —                 |
| `htmlType`        | Native HTML button type                        | `submit \| reset \| button`                             | `button`          |
| `icon`            | Icon node                                      | `ReactNode`                                             | —                 |
| `iconPlacement`   | Icon position                                  | `start \| end`                                          | `start`           |
| `loading`         | Loading state, optional delay/custom icon      | `boolean \| { delay, icon }`                            | `false`           |
| `onClick`         | Click handler                                  | function                                                | —                 |
| `shape`           | Shape                                          | `default \| circle \| round`                            | `default`         |
| `size`            | Size                                           | `large \| medium \| small`                              | `medium`          |
| `styles`          | Customize inline styles per semantic structure | `Record` or function                                    | —                 |
| `target`          | Link target                                    | `string`                                                | —                 |
| `type`            | Type (syntactic sugar over `variant`+`color`)  | `primary \| dashed \| link \| text \| default`          | `default`         |
| `variant`         | Variant                                        | `solid \| outlined \| dashed \| filled \| text \| link` | `solid`           |

## 3. Variants, sizes and states

### shadcn/ui

- Variants: `default` (solid, uses `--primary`), `outline`, `ghost`, `destructive` (uses `--destructive`), `secondary`, `link`.
- Sizes: `default`, `xs`, `sm`, `lg`, plus 4 icon-only sizes `icon`, `icon-xs`, `icon-sm`, `icon-lg` — note this maps almost 1:1 to `AndesButtonSize` already implemented (`xs|sm|md|lg|icon-xs|icon-sm|icon|icon-lg`).
- States: `disabled` via native attribute; no built-in `loading` state — the documented community pattern is a spinner icon (`Loader2` from lucide with a spin animation) placed as a child plus `disabled`, exactly the pattern `AndesButton` already implements natively as first-class API (`loading`, `loadingDelay`, `loadingIcon`).

### Ant Design

- Variants: `solid`, `outlined`, `dashed`, `filled`, `text`, `link` (new unified `variant` prop) — the older `type` prop (`primary|dashed|link|text|default`) is kept as syntactic sugar mapping onto `variant`+`color`.
- Sizes: `large`, `middle` (default), `small`.
- Shapes: `default`, `circle`, `round`.
- States: `disabled`, `loading` (built-in, with optional `delay` and custom `icon` — same shape of feature as `AndesButton.loadingDelay`/`loadingIcon`), `danger` (boolean modifier combinable with any variant/type), `ghost` (transparent + inverted colors — same concept as `AndesButton`'s `ghost` input, confirms that naming choice is idiomatic).

## 4. Accessibility

### shadcn/ui (Base UI)

- Native `<button>` semantics are preserved (no ARIA role override needed for a real button).
- Explicit anti-pattern called out in the docs: rendering the Button as a link via a render-prop (`render={<a />}`) still applies `role="button"`, which breaks link semantics for assistive tech and keyboard (Enter vs Space activation differ between button/link roles) — the documented fix is to skip the Button component entirely for links and apply `buttonVariants()` classes to a plain `<a>`.
- Keyboard: standard native button behavior (Space/Enter activates, is in the tab order unless disabled).

### Ant Design

- Renders a native `<button>` (or `<a>` when `href` is set) — native semantics apply.
- `loading` state: no explicit `aria-busy` documented on the public API page (Ant's accessibility documentation is generally thinner than Base UI/Radix's) — worth verifying in the rendered DOM rather than assuming.
- Keyboard: native button/anchor behavior, nothing custom layered on top.

## 5. Design tokens

### shadcn/ui

Global CSS variables referenced (no Button-specific tokens exist in shadcn — it reuses the shared palette):

- `default` variant → `--primary` / `--primary-foreground`
- `secondary` variant → `--secondary` / `--secondary-foreground`
- `destructive` variant → `--destructive` (paired with white/foreground text)
- `outline`/`ghost` hover states → `--accent` / `--accent-foreground`
- Focus ring → `--ring`
- Corner radius → `--radius`

### Ant Design (component-level Design Tokens, from the Button docs page)

| Token                      | Default value                 |
| -------------------------- | ----------------------------- |
| `contentFontSize`          | `14`                          |
| `contentFontSizeLG`        | `16`                          |
| `contentFontSizeSM`        | `14`                          |
| `dangerColor`              | `#fff`                        |
| `dangerShadow`             | `0 2px 0 rgba(255,38,5,0.06)` |
| `defaultActiveBg`          | `#ffffff`                     |
| `defaultActiveBorderColor` | `#0958d9`                     |
| `defaultActiveColor`       | `#0958d9`                     |
| `defaultBg`                | `#ffffff`                     |
| `defaultBorderColor`       | `#d9d9d9`                     |
| `defaultColor`             | `rgba(0,0,0,0.88)`            |
| `defaultGhostBorderColor`  | `#ffffff`                     |
| `defaultGhostColor`        | `#ffffff`                     |
| `defaultHoverBg`           | `#ffffff`                     |
| `defaultHoverBorderColor`  | `#4096ff`                     |
| `defaultHoverColor`        | `#4096ff`                     |
| `defaultShadow`            | `0 2px 0 rgba(0,0,0,0.02)`    |
| `fontWeight`               | `400`                         |
| `ghostBg`                  | `transparent`                 |
| `iconGap`                  | `8`                           |
| `linkHoverBg`              | `transparent`                 |
| `paddingInline`            | `15`                          |
| `paddingInlineLG`          | `15`                          |
| `paddingInlineSM`          | `7`                           |
| `primaryColor`             | `#fff`                        |
| `primaryShadow`            | `0 2px 0 rgba(5,145,255,0.1)` |
| `solidTextColor`           | `#fff`                        |
| `textHoverBg`              | `rgba(0,0,0,0.04)`            |
| `textTextColor`            | `rgba(0,0,0,0.88)`            |

These derive from global Seed Tokens: `colorPrimary` (→ `primaryColor`/`primaryShadow`), `colorError`/`colorErrorBg` (→ `danger*`), `borderRadius`, `controlHeight`/`sizeStep` (→ `paddingInline*`), `fontSize` (→ `contentFontSize*`).

## 6. Notes for andes-ng implementation

- **Already implemented** — `AndesButton` (`packages/ui/src/lib/button/button.ts`) already covers effectively all of the above: variants, sizes (including the exact 4 icon-only sizes shadcn uses), `loading`/`loadingDelay`/`loadingIcon`, `ghost`, `danger`→`variant="danger"`, `href`, disabled. No primitive-level gap.
- One thing confirmed as correct in hindsight: `AndesButtonPrimitive` in `@andes-ng/primitives` already handles the anchor-vs-button semantic split via `HOST_TAG_NAME` — this matches the exact anti-pattern shadcn's docs warn about (never force `role="button"` onto a real link).
- Token mapping is already 1:1 with `--andes-color-primary*`, `--andes-color-danger*`, `--andes-color-ghost`/`-primary-ghost`/`-danger-ghost` (our dedicated ghost-mode tokens have no Ant or shadcn equivalent — this is an andes-ng original addition, worth keeping as a documented differentiator).
