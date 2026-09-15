# Accordion / Collapse

## 1. Anatomy / compound structure

### shadcn/ui

The canonical doc URL `https://ui.shadcn.com/docs/components/accordion` redirects to `https://ui.shadcn.com/docs/components/base/accordion` (verified via `curl -L`, `200`). This page shows a single implementation (no separate Radix UI / React Aria alternates on this specific page).

- **Underlying primitive: Base UI** (`@base-ui/react/accordion`), verified from the live registry source served on the docs page: `import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"`.
- Exported parts (registry file `components/ui/accordion.tsx`):
  - `Accordion` — wraps `AccordionPrimitive.Root`; the top-level state container (`data-slot="accordion"`).
  - `AccordionItem` — wraps `AccordionPrimitive.Item`; groups one header + panel pair (`data-slot="accordion-item"`).
  - `AccordionTrigger` — wraps `AccordionPrimitive.Header` (a `<h3>`) containing `AccordionPrimitive.Trigger` (a `<button>`); the clickable header that toggles the panel (`data-slot="accordion-trigger"`). It also renders both a `ChevronDownIcon` and a `ChevronUpIcon` from `lucide-react`, toggling which is visible via `group-aria-expanded/accordion-trigger:*` Tailwind selectors.
  - `AccordionContent` — wraps `AccordionPrimitive.Panel`; the collapsible content region (`data-slot="accordion-content"`), with an inner `<div>` that reads the CSS custom property `--accordion-panel-height` to drive the open/close height animation.
- Base UI's own part inventory (which the wrapper is built from) is `Accordion.Root`, `Accordion.Item`, `Accordion.Header`, `Accordion.Trigger`, `Accordion.Panel` — all five are used by the shadcn wrapper.

### Ant Design

The reference component here is **Collapse** (Ant Design has no separate "Accordion" component — `accordion` is a _mode_ of `Collapse`).

- **Main component:** `Collapse` (`import { Collapse } from 'antd'`).
- **`Collapse.Panel`** — the legacy way of declaring individual panels as JSX children; **deprecated** in favor of the `items` prop (available since v5.6.0), but still exported.
- No other static properties/sub-components are exported.

## 2. Props / API

### shadcn/ui

**`Accordion` (⇒ Base UI `Accordion.Root`)**

| Prop                             | Type                                     | Default      | Description                                                                                                                                                       |
| -------------------------------- | ---------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultValue`                   | `Value[]`                                | —            | Uncontrolled initial set of open item value(s)                                                                                                                    |
| `value`                          | `Value[]`                                | —            | Controlled set of open item value(s)                                                                                                                              |
| `onValueChange`                  | `(value: Value[], eventDetails) => void` | —            | Fires when an item expands or collapses                                                                                                                           |
| `multiple`                       | `boolean`                                | `false`      | Allow more than one panel open at once                                                                                                                            |
| `disabled`                       | `boolean`                                | `false`      | Disables the whole accordion                                                                                                                                      |
| `hiddenUntilFound`               | `boolean`                                | `false`      | Use `hidden="until-found"` so closed panels remain reachable via the browser's native find-in-page (Ctrl/Cmd+F), auto-expanding when a match is found inside them |
| `keepMounted`                    | `boolean`                                | `false`      | Keep closed panels' DOM mounted (ignored when `hiddenUntilFound` is set, since that requires mounting anyway)                                                     |
| `orientation`                    | `'horizontal' \| 'vertical'`             | `'vertical'` | **Deprecated** — no longer affects keyboard behavior (see Accessibility)                                                                                          |
| `loopFocus`                      | `boolean`                                | —            | **Deprecated** following an APG guidance update that removed roving-focus looping semantics from this component                                                   |
| `className` / `style` / `render` | usual Base UI shapes                     | —            | Static or state-derived customization                                                                                                                             |

**`AccordionItem` (⇒ Base UI `Accordion.Item`)**

| Prop                             | Type                                    | Default        | Description                                                        |
| -------------------------------- | --------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `value`                          | `any`                                   | auto-generated | Unique identifier for the item; generated automatically if omitted |
| `onOpenChange`                   | `(open: boolean, eventDetails) => void` | —              | Fires when this specific item opens or closes                      |
| `disabled`                       | `boolean`                               | `false`        | Disables this item only                                            |
| `className` / `style` / `render` | usual Base UI shapes                    | —              | Static or state-derived customization                              |

**`AccordionTrigger`** — composed from `Accordion.Header` + `Accordion.Trigger`:

_`Accordion.Header`_

| Prop                             | Type                 | Default | Description                           |
| -------------------------------- | -------------------- | ------- | ------------------------------------- |
| `className` / `style` / `render` | usual Base UI shapes | —       | Static or state-derived customization |

_`Accordion.Trigger`_

| Prop                             | Type                 | Default | Description                                                                                |
| -------------------------------- | -------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `nativeButton`                   | `boolean`            | `true`  | Whether the underlying element is a real `<button>` (relevant when combined with `render`) |
| `className` / `style` / `render` | usual Base UI shapes | —       | Static or state-derived customization                                                      |

**`AccordionContent` (⇒ Base UI `Accordion.Panel`)**

| Prop                             | Type                 | Default | Description                                               |
| -------------------------------- | -------------------- | ------- | --------------------------------------------------------- |
| `hiddenUntilFound`               | `boolean`            | `false` | Same semantics as the Root-level prop, settable per panel |
| `keepMounted`                    | `boolean`            | `false` | Keep this panel's DOM mounted while closed                |
| `className` / `style` / `render` | usual Base UI shapes | —       | Static or state-derived customization                     |

### Ant Design

**`Collapse`**

| Property                              | Description                                                                                              | Type                                                                                 | Default                                                       | Version |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------- |
| `accordion`                           | Renders as an accordion — only one panel can be expanded at a time                                       | `boolean`                                                                            | `false`                                                       |         |
| `activeKey`                           | Key(s) of the active panel(s)                                                                            | `string[] \| string \| number[] \| number`                                           | none — in accordion mode defaults to the first panel's key    |         |
| `bordered`                            | Toggles the border around the collapse block                                                             | `boolean`                                                                            | `true`                                                        |         |
| `classNames`                          | Per-semantic-DOM class names                                                                             | `Record<SemanticDOM, string> \| (info) => Record<SemanticDOM, string>`               | –                                                             | 6.0.0   |
| `collapsible`                         | How a panel is triggered: by clicking the icon, by clicking anywhere in the header, or disabled entirely | `header \| icon \| disabled`                                                         | `disabled` (i.e. header click triggers by default when unset) | 4.9.0   |
| `defaultActiveKey`                    | Key(s) of the initially active panel(s)                                                                  | `string[] \| string \| number[] \| number`                                           | –                                                             |         |
| `destroyInactivePanel` _(deprecated)_ | Destroy inactive panel content                                                                           | `boolean`                                                                            | `false`                                                       |         |
| `destroyOnHidden`                     | Destroy inactive panel content                                                                           | `boolean`                                                                            | `false`                                                       | 5.25.0  |
| `expandIcon`                          | Custom expand-icon renderer                                                                              | `(panelProps) => ReactNode`                                                          | –                                                             | 5.15.0  |
| `expandIconPlacement`                 | Placement of the expand icon                                                                             | `start \| end`                                                                       | `start`                                                       |         |
| `expandIconPosition` _(deprecated)_   | Use `expandIconPlacement` instead                                                                        | `start \| end`                                                                       | –                                                             | 4.21.0  |
| `ghost`                               | Transparent, borderless style                                                                            | `boolean`                                                                            | `false`                                                       | 4.4.0   |
| `size`                                | Size of the collapse                                                                                     | `large \| medium \| small`                                                           | `medium`                                                      | 5.2.0   |
| `styles`                              | Per-semantic-DOM inline styles                                                                           | `Record<SemanticDOM, CSSProperties> \| (info) => Record<SemanticDOM, CSSProperties>` | –                                                             | 6.0.0   |
| `onChange`                            | Fires when the active panel(s) change                                                                    | `function`                                                                           | –                                                             |         |
| `items`                               | Panel configuration array                                                                                | `ItemType[]`                                                                         | –                                                             | 5.6.0   |

**`ItemType`** (the shape of each entry in `items`)

| Property      | Description                                                                    | Type                                        | Default | Version |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------- | ------- | ------- |
| `classNames`  | Semantic class names for this panel (`header`/`body`)                          | `Record<'header' \| 'body', string>`        | –       | 5.21.0  |
| `collapsible` | Override the trigger area for this panel specifically                          | `header \| icon \| disabled`                | –       |         |
| `children`    | Body content                                                                   | `ReactNode`                                 | –       |         |
| `extra`       | Element rendered in the header's top-right corner                              | `ReactNode`                                 | –       |         |
| `forceRender` | Force-render this panel's content immediately rather than lazily on first open | `boolean`                                   | `false` |         |
| `key`         | Unique key identifying the panel                                               | `string \| number`                          | –       |         |
| `label`       | Title of the panel                                                             | `ReactNode`                                 | –       |         |
| `showArrow`   | Show/hide the collapse arrow icon (`false` forbids `collapsible="icon"`)       | `boolean`                                   | `true`  |         |
| `styles`      | Semantic inline styles for this panel                                          | `Record<'header' \| 'body', CSSProperties>` | –       | 5.21.0  |

**`Collapse.Panel`** _(deprecated, use `items`)_ — same fields as `ItemType` above (`collapsible`, `extra`, `forceRender`, `header` instead of `label`, `key`, `showArrow`).

## 3. Variants, sizes and states

### shadcn/ui

- `multiple` (boolean, default `false`) is the single/multiple-open switch — **note the naming difference from Radix's old `type="single" | "multiple"` prop**: the current Base UI-backed API is a plain boolean, not a `type` enum. There is no separate "collapsible" concept exposed as a prop the way Radix's `Accordion` had (`collapsible` allowing a single-mode accordion to fully close) — since Base UI models open state as an array of values, an empty array naturally represents "all closed," so single-mode-with-full-close is just the default behavior of `multiple={false}` plus toggling the same item off.
- No `size`/`variant` prop; visual style comes entirely from Tailwind classes in the registry file (a bottom border per item, `not-last:border-b` to omit the border after the final item).
- States, as `data-*` attributes:
  - Root: `data-disabled` when disabled.
  - `AccordionItem`/`Accordion.Header`/`Accordion.Trigger`: `data-open` (item), `data-panel-open` (trigger specifically), `data-disabled`, `data-index`.
  - `AccordionContent`/`Accordion.Panel`: `data-open`, `data-orientation`, `data-disabled`, `data-index`, plus animation-phase markers `data-starting-style` (entering) and `data-ending-style` (exiting) that the registry's Tailwind classes hook into (`data-open:animate-accordion-down`, `data-closed:animate-accordion-up`) together with the `h-(--accordion-panel-height)` CSS-variable-driven height.
- Browser find-in-page integration (`hiddenUntilFound`) is a feature neither the older Radix-based accordion nor Ant Design's Collapse has documented — worth calling out as a genuinely new capability from the Base UI migration.

### Ant Design

- `accordion` mode: only one panel open at a time (equivalent in spirit to shadcn/Base UI's `multiple={false}`, but expressed as its own boolean rather than being the default).
- `bordered` (default `true`) vs `ghost` (transparent/borderless) — two independent visual variants.
- `size`: `large | medium | small`, default `medium`.
- `collapsible`: `header` (whole header row toggles), `icon` (only the icon toggles), `disabled` (panel cannot be toggled by the user at all) — settable globally on `Collapse` or per-panel via `items[].collapsible`.
- `expandIconPlacement`: `start` (default) or `end`.
- States: expanded/collapsed (`activeKey`), disabled (via `collapsible="disabled"` per panel, not a dedicated `disabled` prop), lazy-rendered vs. `forceRender`-ed panel content.

## 4. Accessibility

### shadcn/ui (via Base UI)

- Base UI's own docs state the pattern generically ("A set of collapsible panels with headings") without spelling out ARIA roles/attributes verbatim in prose; the well-known, expected implementation (and what `Accordion.Header` being an `<h3>` plus `Accordion.Trigger` being a `<button>` implies) is: each trigger is a native `<button>` inside a heading element, with `aria-expanded` reflecting open state and `aria-controls`/`aria-labelledby` cross-linking the trigger and its panel, and the panel itself exposed as a `region` landmark labelled by its trigger when there are few enough panels (the WAI-ARIA APG explicitly recommends _not_ always using `region` for every panel to avoid landmark clutter on accordions with many items). **This is the standard pattern, not a line quoted from the fetched docs text — flag it as inferred convention, and verify against the rendered DOM before relying on a specific attribute name.**
- Keyboard interaction: the Base UI docs explicitly say keyboard-focus behavior was **"deprecated following the APG guidance update to remove roving focus,"** and that `loopFocus` and `orientation` "no longer affect keyboard focus behavior." In other words, Base UI's Accordion has intentionally moved away from a Tabs-style roving-tabindex/arrow-key model for header navigation — headers are just part of the normal Tab order today (Tab/Shift+Tab move between them like any other button), and no dedicated ArrowUp/ArrowDown/Home/End table is published for this component in the current docs. **Toggling** a focused trigger uses the native `<button>` activation keys, Enter and Space.
- `--accordion-panel-height` / `--accordion-panel-width` CSS custom properties are exposed on `Accordion.Panel` specifically to let CSS-only height animations respect the content's real, dynamic size (the classic "animate to `height: auto`" problem) — combined with `data-starting-style`/`data-ending-style` for enter/exit transition hooks.

### Ant Design

- The rendered header markup carries `role="button"`, `aria-expanded="true"/"false"`, `aria-disabled="false"`, and `tabindex="0"` — confirmed directly from the live docs page HTML (`<div class="ant-collapse-header" role="button" aria-expanded="true" aria-disabled="false" tabindex="0">`).
- No `role="region"` on the content panel and no `aria-controls` linking the header to its panel were found anywhere in the fetched page — this is a **confirmed gap** in what Ant Design ships/documents, not merely an unverified absence.
- No keyboard-interaction table is documented; since the header is `role="button"` with `tabindex="0"`, the applicable convention is the native/ARIA "button" activation keys (Enter, Space) — Tab order moves between headers sequentially like any other focusable element, with no dedicated arrow-key navigation documented or observed.

## 5. Design tokens

### shadcn/ui

No component-specific tokens exist. Global CSS variables referenced (from the actual registry source):

- Item separator border → default `border` color (i.e. `--border`, via `not-last:border-b`)
- Focus-visible ring on the trigger → `border-ring` / `ring-ring/50` (i.e. `--ring`)
- Chevron icon → `text-muted-foreground` (i.e. `--muted-foreground`)
- Trigger text → inherits `--foreground` (no explicit override); underline-on-hover uses the browser's default text-decoration color (inherits current text color)
- Disabled → reduced opacity, no dedicated variable
- Links inside panel content (`[&_a]`) → `underline-offset-3`, hover → `hover:text-foreground` (i.e. `--foreground`)

### Ant Design

Component-specific Design Token table (full, from the Collapse docs page):

| Token                      | Description                                         | Type                        | Default value         |
| -------------------------- | --------------------------------------------------- | --------------------------- | --------------------- |
| `borderlessContentBg`      | Background of content in borderless (`ghost`) style | `string`                    | `transparent`         |
| `borderlessContentPadding` | Padding of content in borderless (`ghost`) style    | `Padding<string \| number>` | `4px 16px 16px`       |
| `contentBg`                | Background of the content area                      | `string`                    | `#ffffff`             |
| `contentPadding`           | Padding of the content area                         | `Padding<string \| number>` | `16px 16px`           |
| `contentPaddingLG`         | Padding of the content area, large size             | `Padding<string \| number>` | `24`                  |
| `contentPaddingSM`         | Padding of the content area, small size             | `Padding<string \| number>` | `12`                  |
| `headerBg`                 | Background of the header                            | `string`                    | `rgba(0,0,0,0.02)`    |
| `headerPadding`            | Padding of the header                               | `Padding<string \| number>` | `12px 16px`           |
| `headerPaddingLG`          | Padding of the header, large size                   | `Padding<string \| number>` | `16px 24px 16px 16px` |
| `headerPaddingSM`          | Padding of the header, small size                   | `Padding<string \| number>` | `8px 12px 8px 8px`    |

Global Seed/Alias tokens this component's tokens derive from (per the docs page and the shared `customize-theme` reference):

| Token                                                  | Description                                                                | Default value                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `colorBorder`                                          | Divider color between panels and around the block (`bordered`)             | `#d9d9d9`                                                        |
| `colorPrimaryBorder`                                   | Primary-gradient stroke accents                                            | `#91caff`                                                        |
| `colorText` / `colorTextDisabled` / `colorTextHeading` | Header/body text and disabled-state text                                   | `rgba(0,0,0,0.88)` / `rgba(0,0,0,0.25)` / `rgba(0,0,0,0.88)`     |
| `borderRadiusLG`                                       | Corner rounding of the whole collapse block                                | `8`                                                              |
| `fontFamily`, `fontSize`, `fontSizeIcon`, `fontSizeLG` | Base typography (header text, the expand-icon size)                        | see values in Tabs/Progress tables (`fontSizeIcon` here is `12`) |
| `lineHeight` / `lineHeightLG`                          | Text line-height                                                           | `1.5714285714285714` / `1.5`                                     |
| `lineType` / `lineWidth` / `lineWidthFocus`            | Border style/width for panel dividers and the focus outline                | `solid` / `1` / `3`                                              |
| `marginSM`                                             | Spacing feeding some padding tokens                                        | `12`                                                             |
| `motionDurationMid` / `motionDurationSlow`             | Drive the expand/collapse height transition and the arrow-rotate animation | `0.2s` / `0.3s`                                                  |
| `motionEaseInOut`                                      | Easing curve for the same animations                                       | `cubic-bezier(0.645, 0.045, 0.355, 1)`                           |
| `padding`, `paddingLG`, `paddingSM`, `paddingXS`       | Spacing scale feeding the `*Padding` tokens                                | `16` / `24` / `12` / `8`                                         |

`headerBg`/`contentBg` are fixed neutral values (not literally re-derived from `colorPrimary`), consistent with Collapse being a structural/layout component rather than a brand-colored control — the primary-color seed mainly shows up indirectly via `colorPrimaryBorder` and the shared focus/border alias tokens.

## 6. Notes for andes-ng implementation

- **This needs a dedicated behavior primitive**, in two parts, both good candidates for `@andes-ng/primitives`:
  1. An **expand/collapse animation state machine** that tracks `starting` → `open`/`closed` → `ending` transition phases (mirroring Base UI's `data-starting-style`/`data-ending-style` and its `--accordion-panel-height`/`--accordion-panel-width` custom properties) so panels can animate to their real intrinsic height instead of an animation to a hardcoded/guessed pixel value. This is a reusable pattern beyond Accordion (e.g. any future disclosure/drawer component), so it should not be built as Accordion-only logic.
  2. Standard focusable-button semantics for each header/trigger (`role`-appropriate element, `aria-expanded`, `aria-controls`) — but explicitly **not** a roving-tabindex/arrow-key controller here, since Base UI's current (2026) guidance deliberately removed that pattern from Accordion specifically (see Accessibility above). Do not reuse the Tabs roving-tabindex primitive for Accordion headers — that would actively diverge from the primitive both reference implementations currently document.
- Token mapping to `packages/tokens/src/theme.css`: panel/item divider → `--andes-color-border` (exists); header background (if an Ant-Design-like tinted header is wanted) → `--andes-color-muted` or `--andes-color-accent` (andes-ng has no dedicated "header background," reuse one of these rather than inventing a new token); focus ring → `--andes-color-focus-ring`; chevron/icon → `--andes-color-muted-foreground`; corner rounding of the block → `--andes-radius-lg` (matches AntD's `borderRadiusLG: 8` and is a reasonable analogue for shadcn's per-item look too, even though shadcn's default has no rounded block corners). Missing token to flag: no shared `--andes-motion-duration-*`/`--andes-motion-ease-*` tokens exist yet (same gap as flagged in progress.md and tabs.md) — required for both the height-expand transition and the chevron-rotate transition; define once and reuse across all three components rather than duplicating ad hoc `transition-duration` values per component.
- Accessibility pitfall to flag: unlike Tabs, do **not** implement roving tabindex / arrow-key navigation between accordion headers by default — that pattern was the _old_ (Radix-era) APG guidance and Base UI's docs explicitly call out its removal for this component. An Angular implementation that copies the Tabs keyboard primitive onto Accordion headers "for consistency" would be implementing a stale, no-longer-recommended pattern rather than the current one. Also make sure `aria-controls` on the trigger and a matching `id` on the panel are wired explicitly — neither library's fetched docs text confirmed this cross-linking exists out of the box, so it must be deliberately implemented, not assumed.
