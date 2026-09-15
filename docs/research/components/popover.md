# Popover

## 1. Anatomy / compound structure

### shadcn/ui

Exported parts (from `@/components/ui/popover`):

- `Popover` — root; holds open/close state.
- `PopoverTrigger` — element that opens the popover (supports the `render` prop, e.g. `<PopoverTrigger render={<Button variant="outline" />}>`).
- `PopoverContent` — the floating panel surface.
- `PopoverHeader` — layout wrapper for title + description (present in the current usage example, alongside the historically-simpler Content-only anatomy).
- `PopoverTitle` — heading inside the header.
- `PopoverDescription` — supporting text inside the header.
- `PopoverAnchor` — (lower-level export, standard to this family of primitives) lets positioning reference a different element than the trigger.
- `PopoverPortal` — (lower-level export) portals the popup content, defaulting to `<body>`.

Underlying primitive: the docs page offers the same three-variant setup as Dialog/Sheet/Drawer — **Base UI**, **React Aria**, **Radix UI** — with **Base UI** shown as the default/primary implementation in the current docs flow (confirmed via the installation/usage example importing from shadcn's own `@/components/ui/popover`, which wraps Base UI's `Popover` family and defers to "the Base UI Popover documentation" for the full API). This is consistent with the same migration pattern seen across Dialog, AlertDialog, Sheet, and Drawer — do not assume Popover is still Radix-based by default.

Base UI's own Popover primitive (which shadcn's parts wrap) has a richer internal anatomy than what shadcn re-exports directly: `Popover.Root`, `Popover.Trigger`, `Popover.Portal`, `Popover.Positioner` (handles side/align/collision), `Popover.Popup`, `Popover.Arrow`, `Popover.Title`, `Popover.Description`, `Popover.Close`, `Popover.Viewport` (handles content-transition animation when the popover's anchor/trigger changes), plus a `Popover.createHandle()` API for detached/imperative triggers.

### Ant Design

Single component, no compound sub-parts exposed as static properties — just `Popover` itself. Ant explicitly documents that Popover's API is largely shared with two sibling components: **Tooltip** (base hover/click-triggered floating layer behavior — `mouseEnterDelay`, `mouseLeaveDelay`, `getPopupContainer`, `destroyOnHidden`, etc. are inherited from Tooltip's API surface) and **Popconfirm** (which further layers a confirm/cancel action pair on top of the same positioning engine). Popover itself is best understood as "Tooltip plus a `title` and richer `content`," not a standalone primitive.

## 2. Props / API

### shadcn/ui

No full exhaustive props table is published directly on the Popover page; it defers to Base UI's own Popover reference. Documented/notable props (`Popover.Positioner`, which underlies `PopoverContent`'s positioning-related props):

| Sub-component                 | Prop                          | Type                                                                       | Default                | Description                                                                                        |
| ----------------------------- | ----------------------------- | -------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| `Popover` (Root)              | `open`                        | `boolean`                                                                  | —                      | Controls open state.                                                                               |
| `Popover` (Root)              | `onOpenChange`                | `(open: boolean) => void`                                                  | —                      | Fires on open/close.                                                                               |
| `Popover` (Root)              | `defaultOpen`                 | `boolean`                                                                  | `false`                | Initial open state (uncontrolled).                                                                 |
| `Popover` (Root)              | `modal`                       | `boolean \| "trap-focus"`                                                  | —                      | Enables modal-style focus trapping (non-modal is the more typical popover default, unlike Dialog). |
| `PopoverTrigger`              | `openOnHover`                 | `boolean`                                                                  | `false`                | Open on hover instead of (or in addition to) click.                                                |
| `PopoverTrigger`              | `delay`                       | `number`                                                                   | `300` (ms)             | Hover-open delay when `openOnHover` is set.                                                        |
| `PopoverTrigger`              | `nativeButton`                | `boolean`                                                                  | `true`                 | Renders as a native `<button>`.                                                                    |
| `PopoverContent` (Positioner) | `side`                        | `"top" \| "bottom" \| "left" \| "right" \| "inline-start" \| "inline-end"` | `"bottom"`             | Which side of the anchor the popover renders on.                                                   |
| `PopoverContent` (Positioner) | `sideOffset`                  | `number \| function`                                                       | `0`                    | Distance (px) from the anchor along the `side` axis.                                               |
| `PopoverContent` (Positioner) | `align`                       | `"start" \| "center" \| "end"`                                             | `"center"`             | Alignment along the side.                                                                          |
| `PopoverContent` (Positioner) | `alignOffset`                 | `number \| function`                                                       | `0`                    | Additional alignment offset.                                                                       |
| `PopoverContent` (Positioner) | `arrowPadding`                | `number`                                                                   | `5`                    | Minimum distance the arrow keeps from the popup's edge.                                            |
| `PopoverContent` (Positioner) | `collisionBoundary`           | —                                                                          | `"clipping-ancestors"` | Boundary used for collision/flip detection.                                                        |
| `PopoverContent` (Positioner) | `collisionPadding`            | `number`                                                                   | `5`                    | Padding kept from the collision boundary.                                                          |
| `PopoverContent` (Positioner) | `sticky`                      | `boolean`                                                                  | `false`                | Keep the popover visible/attached after the anchor scrolls partially out of view.                  |
| `PopoverContent`/`Popup`      | `initialFocus` / `finalFocus` | `boolean \| RefObject \| function`                                         | —                      | Focus-on-open / focus-on-close targets, same pattern as Dialog.                                    |
| `PopoverPortal`               | `container` / `keepMounted`   | — / `boolean` (`false`)                                                    | —                      | Portal target / whether to keep the DOM node mounted while closed.                                 |

### Ant Design — `Popover` props

| Prop                   | Type                                                                                                                                                             | Default               | Description                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `classNames`           | `Record<SemanticDOM, string> \| function`                                                                                                                        | —                     | Semantic DOM class names (v5.23.0).                                                                        |
| `content`              | `ReactNode \| (() => ReactNode)`                                                                                                                                 | —                     | Card content.                                                                                              |
| `title`                | `ReactNode \| (() => ReactNode)`                                                                                                                                 | —                     | Card title.                                                                                                |
| `styles`               | `Record<SemanticDOM, CSSProperties> \| function`                                                                                                                 | —                     | Semantic DOM inline styles (v5.23.0).                                                                      |
| `align`                | `object` (dom-align config)                                                                                                                                      | —                     | Fine-grained alignment, per the `dom-align` library's settings.                                            |
| `arrow`                | `boolean \| { pointAtCenter: boolean }`                                                                                                                          | `true`                | Show the arrow, and whether it points at the target's center (v5.2.0).                                     |
| `autoAdjustOverflow`   | `boolean`                                                                                                                                                        | `true`                | Automatically flip/adjust placement when the popup would go off-screen.                                    |
| `color`                | `string`                                                                                                                                                         | —                     | Background color of the card (v4.3.0).                                                                     |
| `defaultOpen`          | `boolean`                                                                                                                                                        | `false`               | Initial visibility, uncontrolled (v4.23.0).                                                                |
| `destroyTooltipOnHide` | `boolean`                                                                                                                                                        | `false`               | Destroy the DOM node when closed (older name).                                                             |
| `destroyOnHidden`      | `boolean`                                                                                                                                                        | `false`               | Destroy the DOM node when closed (v5.25.0 rename of the above).                                            |
| `fresh`                | `boolean`                                                                                                                                                        | `false`               | Keep content live-updating even while closed, instead of using the cached last-rendered content (v5.10.0). |
| `getPopupContainer`    | `(triggerNode) => HTMLElement`                                                                                                                                   | `() => document.body` | Mount container for the popup DOM.                                                                         |
| `mouseEnterDelay`      | `number`                                                                                                                                                         | `0.1`                 | Delay in seconds before showing on hover.                                                                  |
| `mouseLeaveDelay`      | `number`                                                                                                                                                         | `0.1`                 | Delay in seconds before hiding on mouse leave.                                                             |
| `overlayClassName`     | `string`                                                                                                                                                         | —                     | Class name for the popup card (superseded by `classNames.root`).                                           |
| `overlayStyle`         | `CSSProperties`                                                                                                                                                  | —                     | Inline style for the popup card (superseded by `styles.root`).                                             |
| `overlayInnerStyle`    | `CSSProperties`                                                                                                                                                  | —                     | Inline style for the popup's inner content (superseded by `styles.container`).                             |
| `placement`            | `"top" \| "left" \| "right" \| "bottom" \| "topLeft" \| "topRight" \| "bottomLeft" \| "bottomRight" \| "leftTop" \| "leftBottom" \| "rightTop" \| "rightBottom"` | `"top"`               | Position of the popup relative to the target — 12 total placements.                                        |
| `trigger`              | `"hover" \| "focus" \| "click" \| "contextMenu"` \| array                                                                                                        | `"hover"`             | Trigger mode(s); can combine multiple via an array (v6.1.0).                                               |
| `open`                 | `boolean`                                                                                                                                                        | `false`               | Controlled visibility (the `visible` alias was removed pre-4.23.0).                                        |
| `zIndex`               | `number`                                                                                                                                                         | —                     | z-index of the popup.                                                                                      |
| `onOpenChange`         | `(open: boolean) => void`                                                                                                                                        | —                     | Callback fired when visibility changes.                                                                    |

## 3. Variants, sizes and states

### shadcn/ui

- `side`: `top | bottom | left | right | inline-start | inline-end` (default `bottom`) — logical `inline-start`/`inline-end` values additionally support RTL layouts without swapping explicit `left`/`right` values.
- `align`: `start | center | end` (default `center`).
- No named `size` variant — width/height are styled via className on `PopoverContent`.
- States: `open`/`closed`; `modal` off by default (non-modal is the popover-typical default, in contrast to Dialog defaulting to modal `true`) — when `modal: true` and a `Popover.Close` is rendered inside, focus is trapped; `sticky` (stay visible during partial anchor scroll) as a positioning state; hover-open state via `openOnHover`/`delay` on the trigger.

### Ant Design

- `placement`: 12 values as listed above (`top`, `topLeft`, `topRight`, `left`, `leftTop`, `leftBottom`, `right`, `rightTop`, `rightBottom`, `bottom`, `bottomLeft`, `bottomRight`).
- `trigger`: `hover` (default), `focus`, `click`, `contextMenu`, or an array combining several.
- No explicit `size` prop — content dictates size; `titleMinWidth` design token sets a floor on the header's width.
- States: `open`/`closed` (controlled via `open`/`onOpenChange`, or `defaultOpen` uncontrolled); `arrow` shown/hidden/center-pointed; `autoAdjustOverflow` collision-avoidance toggle; `fresh` toggles whether content is cached-while-closed vs. always live.

## 4. Accessibility

### shadcn/ui (via Base UI — confirmed as the default primitive)

- ARIA role: Base UI's docs (as fetched) describe the Popover as implementing "proper accessibility semantics" without spelling out the literal role string as explicitly as Dialog's `role="dialog"`/AlertDialog's `role="alertdialog"` — treat the exact ARIA role as **not as explicitly documented** for Popover and verify against rendered markup (commonly this pattern uses `role="dialog"` on the popup with `aria-labelledby`/`aria-describedby` pointing at Title/Description, but that specific role string was not found verbatim in the fetched content for Popover specifically).
- Escape: closes the popover.
- Focus management: `initialFocus`/`finalFocus` control focus-on-open/close, defaulting to the first tabbable element on open; focus trapping only activates when `modal: true` (or `"trap-focus"`) **and** a `Popover.Close` is rendered inside the popup — otherwise the popover is non-modal by default and does not trap focus, a meaningful difference from Dialog's modal-by-default behavior.
- `'trap-focus'` mode: traps focus without also locking page scroll — useful for a popover that should behave modally for keyboard users without blocking scroll interaction with the rest of the page.
- Touch accessibility: the docs note focus behavior differs for touch vs. mouse activation, and virtual-keyboard handling is accounted for (consistent with the same concern documented for Dialog/Drawer).
- Keyboard: trigger is reachable/activatable via standard keyboard focus + Enter/Space (native button semantics via `nativeButton`); no separate keyboard-interaction table beyond Escape-to-close and Tab-cycling-when-trapped was found in the fetched content.

### Ant Design

- ARIA role/attributes: not itemized explicitly in the fetched docs — treat as **undocumented**, consistent with Modal/Drawer; do not assume a specific ARIA role without verifying the rendered DOM.
- Escape/keyboard dismissal: not called out with an explicit prop the way Modal's `keyboard` or Drawer's `keyboard` are — Popover's dismissal model is trigger-mode-driven (`hover`/`focus`/`click`/`contextMenu`) rather than exposing an ESC-specific toggle, so exact Escape behavior should be verified rather than assumed to mirror Modal/Drawer.
- Focus trap/scroll lock: no documented equivalent to Modal's `focusable`/`scrollLock` props — Popover is a lightweight, typically non-modal floating layer, and the fetched docs do not describe it locking scroll or trapping focus the way Modal does.
- Delay-based show/hide (`mouseEnterDelay`/`mouseLeaveDelay`) is itself a usability/accessibility consideration for hover-triggered popovers (too-short delays can be unusable for users with motor impairments); the trigger prop supports switching to `click`/`focus` for a more keyboard/assistive-tech-friendly interaction model when needed.

## 5. Design tokens

### shadcn/ui

Popover uses `--popover`/`--popover-foreground` for its surface background/text — this is the canonical example of these two variables' purpose in shadcn's global token set (the naming literally matches the component). `--border` styles any hairline border on the popup, and `--ring` styles the focus ring on interactive elements inside. There is no dedicated arrow-color variable — the arrow (`Popover.Arrow`) is styled to match the popup surface via `--popover` directly, and no backdrop/overlay token applies since Popover, unlike Dialog/Sheet/Drawer, typically has no backdrop at all (it's non-modal by default).

### Ant Design — `Popover` Design Token table

**Component tokens**

| Token           | Description                                      | Default value |
| --------------- | ------------------------------------------------ | ------------- |
| `titleMinWidth` | Minimum width of the popover's title/header area | `177`         |
| `zIndexPopup`   | z-index of the popover                           | `1030`        |

**Global tokens Popover draws on**, per the page:

| Token                 | Description                                                                                      | Default value                          |
| --------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `colorBgElevated`     | Container background of the popup layer (slightly brighter than `colorBgContainer` in dark mode) | `#ffffff`                              |
| `colorText`           | Default text color                                                                               | `rgba(0, 0, 0, 0.88)`                  |
| `colorTextHeading`    | Heading font color                                                                               | `rgba(0, 0, 0, 0.88)`                  |
| `borderRadiusLG`      | Large border radius (Card/Modal-scale components)                                                | `8`                                    |
| `borderRadiusXS`      | Extra-small border radius (small elements like Segmented, Arrow)                                 | `2`                                    |
| `fontFamily`          | Font family                                                                                      | system font stack                      |
| `fontSize`            | Base font size                                                                                   | `14`                                   |
| `fontWeightStrong`    | Heading font weight                                                                              | `600`                                  |
| `lineHeight`          | Text line height                                                                                 | `1.5714285714285714`                   |
| `motionDurationMid`   | Medium animation duration                                                                        | `0.2s`                                 |
| `motionEaseInOutCirc` | Preset motion curve                                                                              | `cubic-bezier(0.78, 0.14, 0.15, 0.86)` |
| `motionEaseOutCirc`   | Preset motion curve                                                                              | `cubic-bezier(0.08, 0.82, 0.17, 1)`    |
| `sizePopupArrow`      | Size of the arrow                                                                                | `16`                                   |

Note: `zIndexPopup` defaults to `1030`, meaningfully _higher_ than Modal's/Drawer's `1000` default — Popover is expected to layer above modals/drawers when it appears from within one (e.g. a select or popover triggered from inside an open Modal), consistent with `zIndexPopupBase` (`1000`) being the shared seed but each overlay component adding its own offset on top so nested-from-within-another-overlay cases stack correctly by default.

## 6. Notes for andes-ng implementation

- Popover is the clearest case in this batch for **non-modal-by-default** overlay behavior: it should reuse the same `@andes-ng/primitives` overlay primitive as Dialog/Sheet/Drawer for positioning/portal, Escape handling, and z-index management, but the primitive must support a _non-trapping, non-scroll-locking_ mode as the default (mirroring Base UI's `modal` defaulting away from `true` here, unlike Dialog), with focus-trap/scroll-lock as an explicit opt-in (`modal: true`/`'trap-focus'`) rather than baked in — i.e. the shared overlay service's focus-trap and scroll-lock behaviors need to be **composable/optional**, not hardwired into the base positioning logic.
- Positioning is the one area where Popover needs materially more from the shared primitive than Dialog/AlertDialog do: `side`/`align`/offsets/collision-boundary/`sticky` flip-and-shift logic (anchor-relative floating positioning) is Popover/Sheet's core value-add and should live in the shared primitive as a reusable "anchored positioning" module (conceptually equivalent to Angular CDK's `FlexibleConnectedPositionStrategy`), so Popover doesn't reimplement collision detection independently from wherever Sheet/Drawer might also need edge-anchored positioning.
- Token mapping to `packages/tokens/src/theme.css`:
  - Popup surface → `--andes-color-popover` / `--andes-color-popover-foreground` (exist, and this is the single cleanest 1:1 mapping in the whole research set — shadcn's own naming already matches).
  - Border → `--andes-color-border` (exists).
  - Radius → `--andes-radius-md`/`--andes-radius-lg` depending on how closely andes-ng wants to match Ant's `borderRadiusLG: 8`.
  - Arrow color → reuse `--andes-color-popover` (no separate token needed, matching both reference libraries' approach of not giving the arrow an independent color).
  - **Missing token**: a z-index scale, same gap flagged in `dialog-modal.md` and `drawer-sheet.md` — Popover is actually the strongest evidence for why this scale needs to be a genuine _ordered scale_ rather than a single value: Ant's own numbers (`zIndexPopupBase: 1000`, Modal `zIndex: 1000`, Drawer `zIndexPopup: 1000`, Popover `zIndexPopup: 1030`) show that popovers are expected to render _above_ modals/drawers by default (so a popover triggered from inside a modal is visible), which a single shared `--andes-z-overlay` token cannot express — andes-ng needs at minimum tiered tokens (e.g. `--andes-z-overlay` for Dialog/Drawer and a higher `--andes-z-popover` for Popover/tooltip-like content), owned and incremented correctly by the shared overlay primitive rather than hand-set per component instance.
- Accessibility pitfalls to flag specifically for Popover: (1) do not default to a focus trap — most popovers (especially hover-triggered ones) should not steal keyboard focus, so the shared primitive's focus-trap opt-in must default to _off_ for Popover even though it defaults to _on_ for Dialog/AlertDialog; (2) hover-triggered popovers need a real `mouseEnterDelay`/`mouseLeaveDelay`-equivalent (or `openOnHover`/`delay`) so hover alone isn't the only way to reach the content — always also support `click`/`focus` triggering for keyboard and motor-accessibility parity, matching both references' explicit multi-trigger-mode support; (3) `aria-controls`/`aria-expanded` (or Base UI's `data-popup-open` attribute) on the trigger is just as necessary here as for Dialog, arguably more so since Popover triggers are often small icon-only buttons without visible text explaining what they open.
