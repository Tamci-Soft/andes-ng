# Tooltip

## 1. Anatomy / compound structure

### shadcn/ui

As of the current (2026) docs, shadcn's Tooltip is built on **Base UI** (`@base-ui-components/react`), not Radix UI — the docs page explicitly offers Base UI, React Aria, and Radix UI as alternative underlying-primitive tabs, but the Base UI tab is the default/primary one shown, and the API Reference section links out to "the Base UI Tooltip documentation" for full details. Always re-verify per component; this one has migrated.

Exported wrapper parts (from `@/components/ui/tooltip`, thin wrappers around Base UI's `Tooltip.*` parts):

- `Tooltip` — root; groups all tooltip parts, renders no DOM element itself, owns open/closed state.
- `TooltipTrigger` — the interactive element (renders as a `<button>` by default) that opens the tooltip on hover/focus.
- `TooltipContent` — the popup/content container that displays the hint text (wraps Base UI's `Tooltip.Portal` + `Tooltip.Positioner` + `Tooltip.Popup`).
- `TooltipProvider` — required root-level provider supplying shared delay/grouping configuration so adjacent tooltips can open instantly once one is already open.

The full underlying Base UI primitive (`@base-ui-components/react/tooltip`) exposes a richer part list than shadcn's thin wrapper surfaces directly: `Tooltip.Provider`, `Tooltip.Root`, `Tooltip.Trigger`, `Tooltip.Portal`, `Tooltip.Positioner`, `Tooltip.Popup`, `Tooltip.Arrow`, `Tooltip.Viewport` (an optional transition container used when multiple triggers share one tooltip instance).

### Ant Design

Single component, no compound sub-parts/static properties — `Tooltip` is used directly, wrapping a single child element.

## 2. Props / API

### shadcn/ui

shadcn does not publish its own prop table for Tooltip; it delegates to the underlying Base UI primitive's documentation. The wrapper components pass props straight through. Documented/relevant props (from the Base UI `Tooltip.*` parts that `@/components/ui/tooltip` wraps):

**`Tooltip` (wraps `Tooltip.Root`, plus implicitly composes `Tooltip.Provider` defaults)**

| Prop                    | Type                                     | Default  | Description                                                                                                                                                                 |
| ----------------------- | ---------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultOpen`           | `boolean`                                | `false`  | Initial open state (uncontrolled)                                                                                                                                           |
| `open`                  | `boolean`                                | —        | Controlled open state                                                                                                                                                       |
| `onOpenChange`          | `(open: boolean, event, reason) => void` | —        | Fires when open state changes; `reason` is one of `trigger-hover`, `trigger-focus`, `trigger-press`, `outside-press`, `escape-key`, `disabled`, `imperative-action`, `none` |
| `trackCursorAxis`       | `"none" \| "x" \| "y" \| "both"`         | `"none"` | Makes the tooltip follow the cursor along an axis                                                                                                                           |
| `disabled`              | `boolean`                                | `false`  | Disables the tooltip entirely                                                                                                                                               |
| `disableHoverablePopup` | `boolean`                                | `false`  | Prevents the user from moving the pointer into the popup itself                                                                                                             |
| `delay`                 | `number`                                 | —        | Provider-level open delay in ms (settable via `TooltipProvider`)                                                                                                            |
| `closeDelay`            | `number`                                 | —        | Provider-level close delay in ms                                                                                                                                            |

**`TooltipTrigger`**

| Prop           | Type                       | Default | Description                                                            |
| -------------- | -------------------------- | ------- | ---------------------------------------------------------------------- |
| `delay`        | `number`                   | `600`   | Hover delay (ms) before this trigger's tooltip opens                   |
| `closeDelay`   | `number`                   | `0`     | Delay (ms) before closing                                              |
| `closeOnClick` | `boolean`                  | `true`  | Whether clicking the trigger closes the tooltip                        |
| `disabled`     | `boolean`                  | `false` | Disables this trigger without applying the native `disabled` attribute |
| `render`       | `ReactElement \| function` | —       | Render-prop for polymorphic rendering onto a custom element            |

**`TooltipContent` (wraps `Tooltip.Positioner` + `Tooltip.Popup`)**

| Prop                | Type                                                                                         | Default                | Description                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `side`              | `"top" \| "bottom" \| "left" \| "right"` (Base UI also supports `inline-end`/`inline-start`) | `"top"`                | Preferred placement side                                                                                            |
| `sideOffset`        | `number`                                                                                     | `0`                    | Distance in px from the anchor                                                                                      |
| `align`             | `"start" \| "center" \| "end"`                                                               | `"center"`             | Alignment along the side                                                                                            |
| `alignOffset`       | `number`                                                                                     | `0`                    | Additional offset along the alignment axis                                                                          |
| `collisionPadding`  | `number \| object`                                                                           | `5`                    | Space kept from the collision boundary edge                                                                         |
| `collisionBoundary` | `Boundary`                                                                                   | `"clipping-ancestors"` | Area constraining popup visibility                                                                                  |
| `sticky`            | `boolean`                                                                                    | `false`                | Keeps the popup in the viewport after the anchor scrolls out                                                        |
| `arrow`             | —                                                                                            | —                      | Not a prop; a separate `Tooltip.Arrow`-derived arrow element is composed inside `TooltipContent` in shadcn's markup |

**`TooltipProvider`**

| Prop         | Type     | Default | Description                                                                                                            |
| ------------ | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `delay`      | `number` | —       | Global default hover-open delay (ms) for all descendant tooltips                                                       |
| `closeDelay` | `number` | —       | Global default close delay (ms)                                                                                        |
| `timeout`    | `number` | `400`   | Window (ms) during which a second tooltip opens instantly (no delay) after a prior one closes, for adjacent-tooltip UX |

### Ant Design

| Property               | Description                                                                                                                          | Type                                                                                            | Default               | Version |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | --------------------- | ------- |
| `title`                | The text shown in the tooltip                                                                                                        | `ReactNode \| () => ReactNode`                                                                  | —                     | —       |
| `color`                | Background color; text color adapts automatically when set                                                                           | `string`                                                                                        | —                     | 5.27.0  |
| `classNames`           | Semantic DOM class overrides                                                                                                         | `Record<SemanticDOM, string> \| (info: { props }) => Record<SemanticDOM, string>`               | —                     | 5.23.0  |
| `styles`               | Semantic DOM inline style overrides                                                                                                  | `Record<SemanticDOM, CSSProperties> \| (info: { props }) => Record<SemanticDOM, CSSProperties>` | —                     | 5.23.0  |
| `align`                | Fine-tune positioning (see dom-align settings)                                                                                       | `object`                                                                                        | —                     | —       |
| `arrow`                | Arrow visibility / whether it points at the target's center                                                                          | `boolean \| { pointAtCenter: boolean }`                                                         | `true`                | 5.2.0   |
| `autoAdjustOverflow`   | Auto-adjust placement when the popup would go off-screen                                                                             | `boolean`                                                                                       | `true`                | —       |
| `defaultOpen`          | Whether the tooltip is open by default                                                                                               | `boolean`                                                                                       | `false`               | 4.23.0  |
| `destroyTooltipOnHide` | Destroy the popup DOM when closed (superseded)                                                                                       | `boolean`                                                                                       | `false`               | —       |
| `destroyOnHidden`      | Destroy the popup DOM when closed                                                                                                    | `boolean`                                                                                       | `false`               | 5.25.0  |
| `fresh`                | Keep content updating even while closed (by default content is cached when closed)                                                   | `boolean`                                                                                       | `false`               | 5.10.0  |
| `getPopupContainer`    | DOM container for the popup                                                                                                          | `(triggerNode: HTMLElement) => HTMLElement`                                                     | `() => document.body` | —       |
| `mouseEnterDelay`      | Delay (seconds) before showing on mouse enter                                                                                        | `number`                                                                                        | `0.1`                 | 6.6.0   |
| `mouseLeaveDelay`      | Delay (seconds) before hiding on mouse leave                                                                                         | `number`                                                                                        | `0.1`                 | 6.6.0   |
| `overlayClassName`     | Class name of the tooltip card (use `classNames.root` instead)                                                                       | `string`                                                                                        | —                     | —       |
| `overlayStyle`         | Style of the tooltip card (use `styles.root` instead)                                                                                | `React.CSSProperties`                                                                           | —                     | —       |
| `overlayInnerStyle`    | Style of the tooltip's inner content (use `styles.container` instead)                                                                | `React.CSSProperties`                                                                           | —                     | —       |
| `placement`            | Position relative to target: `top left right bottom topLeft topRight bottomLeft bottomRight leftTop leftBottom rightTop rightBottom` | `string`                                                                                        | `top`                 | —       |
| `trigger`              | Trigger mode(s)                                                                                                                      | `"hover" \| "focus" \| "click" \| "contextMenu" \| Array<string>`                               | `hover`               | 6.1.0   |
| `open`                 | Controlled open state (was `visible` before 4.23.0)                                                                                  | `boolean`                                                                                       | `false`               | 4.23.0  |
| `zIndex`               | z-index override                                                                                                                     | `number`                                                                                        | —                     | —       |
| `onOpenChange`         | Callback fired when visibility changes                                                                                               | `(open: boolean) => void`                                                                       | —                     | 4.23.0  |

## 3. Variants, sizes and states

### shadcn/ui

No `variant`/`size` string enums — visual style comes entirely from Tailwind classes applied to `TooltipContent`, and positioning options are `side` (`top`/`right`/`bottom`/`left`) and `align` (`start`/`center`/`end`). States: `open`/`closed` (exposed as `data-open`/`data-closed` attributes on `Positioner`, `Popup`, and `Arrow`), `disabled` (per-trigger or whole-tooltip), animation-transition states via `data-starting-style`/`data-ending-style`/`data-instant`, and `data-anchor-hidden`/`data-uncentered` for edge cases where the anchor scrolls away or the arrow can't stay centered.

### Ant Design

No `variant`/`size` props. Placement has 12 named values (see table above). `color` accepts Ant's preset color palette or a custom color string, changing the tooltip's background (and auto-adjusting text color). States: `open`/`defaultOpen` (controlled/uncontrolled), `arrow` on/off or pointed-at-center, `disabled` is not a first-class Tooltip prop (disable by not rendering, or by disabling the child trigger element itself, since a disabled child may not fire hover events).

## 4. Accessibility

### shadcn/ui (via Base UI)

- Base UI's own docs state tooltips are **visual-only by default** and are _not_ automatically accessible to touch or screen-reader users: "The tooltip's trigger must have an `aria-label` attribute that closely matches the tooltip's content" — i.e., the implementer is responsible for adding an accessible name to the trigger; the popup text is not wired up as the accessible name/description automatically in all cases and must be verified.
- No single documented `role="tooltip"` line was found on the API reference itself; accessibility instead flows through trigger focus/hover semantics.
- Keyboard/interaction behavior (from documented `ChangeEventReason` values, not a formal keyboard table):
  | Interaction         | Behavior                                                             |
  | ------------------- | -------------------------------------------------------------------- |
  | Hover trigger       | Opens after `delay` (default 600ms); disabled on touch devices       |
  | Focus trigger (Tab) | Opens the tooltip (reason `trigger-focus`)                           |
  | Escape              | Closes the tooltip (reason `escape-key`)                             |
  | Click/press trigger | Opens or closes depending on `closeOnClick` (reason `trigger-press`) |
  | Click outside       | Closes (reason `outside-press`)                                      |
- No exhaustive keyboard interaction table is published by Base UI for Tooltip beyond the above.

### Ant Design

- No explicit ARIA role or keyboard table is documented on the public Tooltip API page — Ant's accessibility documentation is generally thinner here than Base UI's. Treat this as **undocumented**; verify actual rendered `role`/`aria-*` attributes in the DOM rather than assuming `role="tooltip"` is wired to `aria-describedby` on the trigger.
- Interaction is driven by `trigger` (hover/focus/click/contextMenu), `mouseEnterDelay`/`mouseLeaveDelay`.

## 5. Design tokens

### shadcn/ui

Global CSS variables it plausibly draws on (shadcn has no Tooltip-specific tokens):

- `--popover` / `--popover-foreground` — typical background/text pairing for a floating surface like `TooltipContent` (some shadcn tooltip recipes instead hardcode a dark surface via `bg-primary`/`text-primary-foreground` to visually distinguish it from popovers; check the generated component's classes since the CLI-emitted code, not a token file, decides this).
- `--border` — subtle outline if the content uses one.
- `--radius` — corner rounding of the popup.
- No `--ring` (tooltip isn't a focusable/interactive surface itself).

### Ant Design

**Component Token**

| Token         | Description              | Type     | Default |
| ------------- | ------------------------ | -------- | ------- |
| `maxWidth`    | Max width of the tooltip | `number` | `250`   |
| `zIndexPopup` | z-index of the tooltip   | `number` | `1070`  |

**Global tokens the component consumes (per the page's "Global Token" section)**

| Token                 | Description                                                                             | Type     | Default                                |
| --------------------- | --------------------------------------------------------------------------------------- | -------- | -------------------------------------- |
| `colorBgSpotlight`    | Background used to draw strong attention — currently only used for Tooltip's background | `string` | `rgba(0,0,0,0.85)`                     |
| `colorText`           | Default text color (darkest neutral)                                                    | `string` | `rgba(0,0,0,0.88)`                     |
| `colorTextLightSolid` | Highlight text color on colored/solid backgrounds (also used by Primary Button)         | `string` | `#fff`                                 |
| `borderRadius`        | Base border radius                                                                      | `number` | `6`                                    |
| `borderRadiusXS`      | Extra-small border radius (small components like the arrow)                             | `number` | `2`                                    |
| `controlHeight`       | Height of basic controls                                                                | `number` | `32`                                   |
| `fontFamily`          | Default font stack                                                                      | `string` | system font stack                      |
| `fontSize`            | Base font size, source of the text scale                                                | `number` | `14`                                   |
| `lineHeight`          | Text line height                                                                        | `number` | `1.5714285714285714`                   |
| `motionDurationFast`  | Fast animation duration                                                                 | `string` | `0.1s`                                 |
| `motionDurationMid`   | Medium animation duration                                                               | `string` | `0.2s`                                 |
| `motionDurationSlow`  | Slow animation duration                                                                 | `string` | `0.3s`                                 |
| `motionEaseInOutCirc` | Preset motion curve                                                                     | `string` | `cubic-bezier(0.78, 0.14, 0.15, 0.86)` |
| `motionEaseOutCirc`   | Preset motion curve                                                                     | `string` | `cubic-bezier(0.08, 0.82, 0.17, 1)`    |
| `paddingSM`           | Small padding                                                                           | `number` | `12`                                   |
| `paddingXS`           | Extra-small padding                                                                     | `number` | `8`                                    |
| `sizePopupArrow`      | Size of the popup arrow                                                                 | `number` | `16`                                   |

Per `https://ant.design/docs/react/customize-theme`, these Alias/Global tokens derive from Seed tokens as: `colorBgSpotlight` is itself a Map/Alias token seeded indirectly from the neutral color scale (not directly from `colorPrimary`); `borderRadius`/`borderRadiusXS` derive from the `borderRadius` Seed (default `6`) via the Map-token algorithm (`borderRadiusXS`=2, `borderRadiusSM`=4, `borderRadiusLG`=8); `controlHeight` is itself a Seed token (default `32`) from which `controlHeightSM`/`LG`/`XS` are derived; `fontSize` is a Seed token (default `14`) from which `fontSizeSM`/`LG`/`XL`/heading sizes derive; `paddingSM`/`paddingXS` derive from the `sizeStep`/`sizeUnit` Seed pair (both default `4`) through the size scale (`size`, `sizeXS`, `sizeSM`, `sizeMD`, `sizeLG`...) that also generates the `padding*`/`margin*` alias tokens.

## 6. Notes for andes-ng implementation

- Needs a dedicated **positioning primitive** in `@andes-ng/primitives` — floating-element placement (side/align/offset, collision detection/flip, arrow centering, `position: fixed`/`absolute` choice) is non-trivial and shared with Dropdown Menu and any future Popover/Select. Model it after Base UI's `Positioner` contract (`side`, `sideOffset`, `align`, `alignOffset`, `collisionBoundary`, `collisionPadding`, `sticky`, `positionMethod`) so it can be reused rather than reimplemented per component (CDK Overlay's `ConnectedPosition` API is the natural Angular analogue to build this on).
- Also needs a small **hover/focus-intent primitive**: open-delay, close-delay, "instant reopen" grouping window (Base UI's `timeout`, default 400ms) so multiple tooltips on a toolbar feel responsive after the first one opens, plus disabling hover-open on touch devices.
- Token mapping: `--andes-color-popover` / `--andes-color-popover-foreground` are the natural fit for the tooltip surface (andes-ng already has this pair in `packages/tokens/src/theme.css`); `--andes-radius-md` or `-sm` for corner rounding; `--andes-color-focus-ring` is irrelevant here since the tooltip itself isn't focusable. No token currently exists for a dedicated "spotlight"/high-contrast tooltip background akin to Ant's `colorBgSpotlight` (Ant deliberately makes Tooltip near-black regardless of theme) — decide whether andes-ng tooltips should use the neutral `--andes-color-popover` (theme-following) or add a new fixed high-contrast token; flag this as a design decision, not an oversight.
- Accessibility pitfall: per Base UI's own admonition, do not assume the popup text becomes the trigger's accessible name/description for free — the Angular directive should programmatically wire `aria-describedby` (pointing at the popup's id) onto the trigger, and document that callers should still give icon-only triggers an explicit `aria-label` for non-hover/non-visual users. Also ensure Escape closes and focus-triggering (not just hover) is supported for keyboard-only and screen-reader users, since Ant's docs don't guarantee this and it is easy to build a hover-only tooltip that is invisible to keyboard users.
