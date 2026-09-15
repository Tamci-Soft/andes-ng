# Drawer / Sheet

shadcn/ui ships **two** distinct components here: `Sheet` (a side panel that extends the Dialog primitive) and `Drawer` (a bottom-sheet-style component, historically built on the third-party `vaul` gesture/animation library). Ant Design's equivalent is the single `Drawer` component. Both shadcn components are covered distinctly below.

**Important, current-as-of-2026 correction to a common assumption**: the shadcn `Drawer` docs now state explicitly that **the Drawer component no longer uses `vaul`** — it has been migrated to **Base UI**'s own `Drawer` component family. The docs read: _"The drawer component now uses Base UI instead of Vaul."_ A dedicated migration guide is linked for projects still on the previous `vaul`-based version. This is a meaningful, recent architectural change and should not be assumed away — do not describe today's shadcn `Drawer` as "built on vaul" without this caveat; it is only true of pre-migration installs.

## 1. Anatomy / compound structure

### shadcn/ui — Sheet

Exported parts (from `@/components/ui/sheet`):

- `Sheet` — root.
- `SheetTrigger` — opens the sheet.
- `SheetContent` — the panel surface; accepts the `side` prop (see §3).
- `SheetHeader` — layout wrapper for title + description.
- `SheetTitle` — heading (`<h2>`).
- `SheetDescription` — description text (`<p>`).
- `SheetFooter` — layout wrapper for footer actions.
- `SheetClose` — closes the sheet.

The docs describe Sheet as extending Dialog: _"Extends the Dialog component to display content that complements the main content of the screen."_ Underlying primitive: same three-variant setup as Dialog (**Base UI** / React Aria / Radix UI), with Base UI shown as the default — the docs point to "the Base UI Dialog documentation" for full API reference, i.e. Sheet is literally Dialog's primitive (Base UI `Dialog`) with different default positioning/animation styling, not a separate headless primitive.

### shadcn/ui — Drawer

Exported parts (from `@/components/ui/drawer`):

- `Drawer` — root.
- `DrawerTrigger` — opens the drawer (supports the `render` prop for custom trigger elements).
- `DrawerPortal` — lower-level portal export.
- `DrawerOverlay` — lower-level backdrop export.
- `DrawerContent` — the panel surface, composed internally from Base UI's portal/overlay/viewport/popup parts.
- `DrawerHeader` — layout wrapper for title + description.
- `DrawerTitle` — heading (`<h2>`).
- `DrawerDescription` — description text (`<p>`).
- `DrawerFooter` — layout wrapper for footer actions.
- `DrawerClose` — closes the drawer (supports `render` prop).
- `DrawerSwipeHandle` — lower-level export exposing a dedicated swipe/drag handle affordance.

Underlying primitive: **Base UI's own `Drawer` component family** (`base-ui.com/react/components/drawer`), not Radix UI and — as of the current docs — not `vaul` either. Base UI's Drawer itself has a much larger internal anatomy than what shadcn re-exports, including: `Drawer.Root`, `Drawer.Trigger`, `Drawer.Portal`, `Drawer.Backdrop`, `Drawer.Viewport` (positioning container, exposes `--drawer-keyboard-inset`), `Drawer.Popup` (content container, exposes swipe/snap CSS variables), `Drawer.Content`, `Drawer.Title`, `Drawer.Description`, `Drawer.Close`, `Drawer.SwipeArea` (an edge zone for swipe-to-open gestures, distinct from the swipe-to-dismiss handle), `Drawer.VirtualKeyboardProvider` (keyboard-aware scrolling for forms inside bottom sheets), `Drawer.Provider`/`Drawer.IndentBackground`/`Drawer.Indent` (coordinate a "background indents/scales" visual effect across nested drawers), and a `Drawer.createHandle()` API for connecting detached triggers to a root imperatively.

### Ant Design — Drawer

Single component, no compound sub-parts exposed as static properties (unlike Modal's `.confirm()`-style family, Drawer does not have an imperative method family) — just `Drawer` itself, controlled via `open`.

## 2. Props / API

### shadcn/ui — Sheet

No dedicated exhaustive props table is published on the Sheet page; it defers to Base UI's Dialog reference. The one Sheet-specific prop documented is:

| Sub-component  | Prop   | Type                                     | Default                                                                                                                                                                                                    | Description                                 |
| -------------- | ------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `SheetContent` | `side` | `"top" \| "right" \| "bottom" \| "left"` | Not explicitly stated on the page — treat as **undocumented**; by Base UI/Radix convention for this pattern it is commonly `"right"`, but verify against the shipped component source rather than assuming | Which screen edge the sheet slides in from. |

All other behavior (open/close, modal, focus trap, Escape, outside-click) is inherited from Base UI `Dialog`'s own props — see the Dialog section of `dialog-modal.md` in this same research set for the full table (`open`, `onOpenChange`, `defaultOpen`, `modal`, `disablePointerDismissal`, `initialFocus`/`finalFocus`, `container`, `keepMounted`).

### shadcn/ui — Drawer

Documented props (Base UI Drawer, surfaced through shadcn's re-export):

| Sub-component                                     | Prop                              | Type                                  | Default                                             | Description                                                                                                                                           |
| ------------------------------------------------- | --------------------------------- | ------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Drawer` (Root)                                   | `open`                            | `boolean`                             | —                                                   | Controls visibility.                                                                                                                                  |
| `Drawer` (Root)                                   | `onOpenChange`                    | `(open: boolean) => void`             | —                                                   | Fires on open/close.                                                                                                                                  |
| `Drawer` (Root)                                   | `swipeDirection`                  | `"up" \| "down" \| "left" \| "right"` | `"down"`                                            | Which direction a swipe gesture dismisses the drawer (replaces the old `vaul`-era `direction` prop, whose `top`/`bottom` values are now `up`/`down`). |
| `Drawer` (Root)                                   | `snapPoints`                      | `number[] \| string[]`                | —                                                   | Preset heights the drawer can rest at; values `0–1` are viewport fractions, values `>1` (or values with `px`/`rem` units) are absolute.               |
| `Drawer` (Root)                                   | `snapPoint` / `onSnapPointChange` | — / `(point) => void`                 | —                                                   | Controlled current snap point and its change callback.                                                                                                |
| `Drawer` (Root)                                   | `modal`                           | `boolean \| "trap-focus"`             | `true`                                              | Same semantics as Dialog's `modal` — enables focus trap (+ scroll lock unless `"trap-focus"`).                                                        |
| `Drawer` (Root)                                   | `disablePointerDismissal`         | `boolean`                             | `false`                                             | Prevents outside-pointer/backdrop dismissal.                                                                                                          |
| `Drawer.SwipeArea` (`DrawerSwipeHandle`-adjacent) | `swipeDirection`                  | same enum                             | defaults to the opposite of Root's `swipeDirection` | Direction for a swipe-to-open gesture from a screen edge.                                                                                             |
| `Drawer.SwipeArea`                                | `disabled`                        | `boolean`                             | `false`                                             | Disables the swipe-to-open edge zone.                                                                                                                 |
| `DrawerPortal`                                    | `container` / `keepMounted`       | as Dialog                             | —                                                   | Same portal semantics as Dialog.                                                                                                                      |
| `DrawerPopup`/`DrawerContent` (Base UI `Popup`)   | `initialFocus` / `finalFocus`     | as Dialog                             | —                                                   | Same focus-management semantics as Dialog.                                                                                                            |

**Removed/no-longer-applicable props** (explicitly called out in the migration guide, since these were `vaul`-specific and have no Base UI equivalent): `handleOnly`, `repositionInputs`, `shouldScaleBackground`. If andes-ng researches "vaul-style Drawer" behavior elsewhere, do not assume these three still exist in current shadcn — they were removed outright, not renamed.

### Ant Design — `Drawer` props

| Prop              | Type                                     | Default             | Description                                                                     |
| ----------------- | ---------------------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `open`            | `boolean`                                | `false`             | Controls visibility.                                                            |
| `onClose`         | `(e) => void`                            | —                   | Callback when the user closes the drawer.                                       |
| `placement`       | `"top" \| "right" \| "bottom" \| "left"` | `"right"`           | Slide-in edge.                                                                  |
| `title`           | `ReactNode`                              | —                   | Header content.                                                                 |
| `footer`          | `ReactNode`                              | —                   | Footer content.                                                                 |
| `closable`        | `boolean \| object`                      | `true`              | Show close button; the object form can configure placement (`'start'`/`'end'`). |
| `mask`            | `boolean \| object`                      | `true`              | Overlay effect; supports `blur`/`closable` sub-options.                         |
| `size`            | `"default" \| "large" \| number`         | `"default"`         | Preset width/height (`378`/`736` px) or a custom numeric dimension.             |
| `keyboard`        | `boolean`                                | `true`              | Whether ESC closes the drawer.                                                  |
| `forceRender`     | `boolean`                                | `false`             | Force pre-render of drawer content.                                             |
| `destroyOnHidden` | `boolean`                                | `false`             | Unmount children on close.                                                      |
| `loading`         | `boolean`                                | `false`             | Skeleton-loading placeholder.                                                   |
| `resizable`       | `boolean \| object`                      | —                   | Enables edge-dragging resize.                                                   |
| `zIndex`          | `number`                                 | `1000`              | Stacking depth.                                                                 |
| `getContainer`    | `HTMLElement \| (() => HTMLElement)`     | `document.body`     | Mount location.                                                                 |
| `className`       | `string`                                 | —                   | Class name for the drawer panel.                                                |
| `styles`          | `object \| function`                     | —                   | Semantic DOM inline styles.                                                     |
| `classNames`      | `object \| function`                     | —                   | Semantic DOM class names.                                                       |
| `afterOpenChange` | `(open: boolean) => void`                | —                   | Callback after each open/close animation completes.                             |
| `drawerRender`    | `(node) => ReactNode`                    | —                   | Custom content renderer.                                                        |
| `push`            | `boolean \| object`                      | `{ distance: 180 }` | Behavior for nested drawers pushing the parent aside.                           |
| `extra`           | `ReactNode`                              | —                   | Extra action content in the header, opposite the title.                         |
| `maxSize`         | `number`                                 | —                   | Maximum size when `resizable`.                                                  |

## 3. Variants, sizes and states

### shadcn/ui — Sheet

- `side`: `"top" | "right" | "bottom" | "left"` — the sheet's exact edge and slide direction; each value changes both position and slide-in animation axis.
- No named `size` enum; width/height are styled via className on `SheetContent`.
- States: `open`/`closed` (via Dialog Root's `open`); modal by default (focus trap + scroll lock); Escape and outside-click dismiss by default (inherits Base UI Dialog's `disablePointerDismissal` opt-out).

### shadcn/ui — Drawer

- `swipeDirection`: `"up" | "down" | "left" | "right"` (default `"down"`) — governs both the visual slide edge and the swipe-to-dismiss gesture direction; note this is a rename+remap from the old vaul `direction` prop, so `"down"` (today) corresponds to what used to be the vaul default `direction="bottom"`.
- `snapPoints`: optional array of intermediate rest heights, enabling a true "bottom sheet" multi-stop drag experience (this is the one place current Drawer clearly still carries vaul's original mobile-bottom-sheet feature set forward, just reimplemented on Base UI).
- States: `open`/`closed`; `modal` (`true`/`"trap-focus"`/presumably `false`); swipe-in-progress (exposed via `data-swiping`, `data-swipe-direction`, `data-expanded` data attributes and `--drawer-swipe-progress`/`--drawer-swipe-movement-x`/`--drawer-swipe-movement-y` CSS variables for custom animation); nested-drawer depth (`--nested-drawers`, `data-nested-drawer-open`, `data-nested-drawer-swiping`).

### Ant Design

- `placement`: `top | right | bottom | left` (default `right`).
- `size`: `default` (378px) | `large` (736px) | a custom `number`.
- States: `open`/`closed`; `loading` (skeleton); `resizable` (drag-to-resize from an edge, with `maxSize` cap); `push` (nested-drawer push-aside behavior, distinct from andes/shadcn's "stacked with indent" visual, controllable via `distance`); mask `closable` toggle independent of `keyboard` (Escape) toggle.

## 4. Accessibility

### shadcn/ui — Sheet (via Base UI Dialog — same primitive as Dialog)

Identical behavior to Dialog (see `dialog-modal.md`): implicit `role="dialog"`, focus trap when modal, focus moves to first tabbable element (or `initialFocus`) on open, focus restores to trigger (or `finalFocus`) on close, Escape and outside-click both dismiss unless `disablePointerDismissal`, document scroll locks while modal, background becomes inert. No Sheet-specific accessibility deviation is documented — it is Dialog with different default motion/position styling.

### shadcn/ui — Drawer (via Base UI Drawer)

- Focus trap: documented explicitly — "user interaction is limited to just the drawer: focus is trapped" when `modal={true}` (the default).
- Escape: closes the drawer by default.
- ARIA: Title/Description are auto-linked to the popup via generated ids (same pattern as Dialog), but Base UI's Drawer docs (as fetched) do not spell out an explicit `role` name the way Dialog/AlertDialog do — treat the exact ARIA role as **not explicitly documented** for Drawer specifically and verify against the rendered DOM rather than assuming `role="dialog"` carries over unchanged, since a bottom-sheet/gesture-driven surface can reasonably use different semantics.
- Pointer dismissal: backdrop clicks close the drawer unless `disablePointerDismissal={true}`.
- Non-modal mode: `modal={false}` allows the drawer to stay open while the user interacts with the rest of the page — documented explicitly as a supported mode, unlike AlertDialog which has no non-modal mode.
- Gesture-specific accessibility gap to flag: drag-to-dismiss/snap-point interactions are inherently pointer/touch-driven; the docs do not describe an equivalent keyboard-only way to move between snap points (e.g. arrow keys), so this should be treated as an open accessibility question for andes-ng's own Drawer, not something to assume is solved upstream.

### Ant Design

- Escape: documented — `keyboard` prop (`true` default) controls ESC-to-close, described as "Whether support press esc to close."
- Focus trap / focus restoration: not spelled out with the same explicit prop-level detail as Modal's `focusable` config — the fetched Drawer docs do not surface an equivalent `focusable` prop, so exact focus-trap/restoration behavior for Drawer should be treated as **less explicitly documented than Modal's** and verified empirically if precise parity is required.
- Scroll lock: not documented via an explicit `scrollLock` prop (unlike Modal) — behavior should be verified rather than assumed identical to Modal's.
- Mask/outside-click dismissal: documented via `mask`'s object form (`{ closable }`), analogous to Modal.

## 5. Design tokens

### shadcn/ui

Both Sheet and Drawer are overlay surfaces and use `--popover`/`--popover-foreground` for their panel background/text, matching Dialog. The backdrop again has no dedicated CSS variable — it's a Tailwind opacity utility over black/`background`, not a themeable `--overlay` token (a gap shared with Dialog/AlertDialog — see that file's §6). `--border` is used for the panel's leading edge/hairline border where visible (e.g. the edge opposite the slide-in direction). `--ring` styles the focus ring on interactive elements inside. Drawer additionally has implicit "elevation" needs (shadow/backdrop blur) that are handled via Tailwind utility classes rather than a dedicated shadow token in the global variable set.

### Ant Design — `Drawer` Design Token table

**Component tokens**

| Token                 | Description                               | Default value |
| --------------------- | ----------------------------------------- | ------------- |
| `draggerSize`         | Size of the resize-handle drag affordance | `4`           |
| `footerPaddingBlock`  | Vertical padding of the footer            | `8`           |
| `footerPaddingInline` | Horizontal padding of the footer          | `16`          |
| `zIndexPopup`         | z-index of the drawer                     | `1000`        |

**Global tokens Drawer draws on**, per the page:

| Token                | Description                                                                                  | Default value         |
| -------------------- | -------------------------------------------------------------------------------------------- | --------------------- |
| `colorBgElevated`    | Background color of the popup layer (slightly brighter than `colorBgContainer` in dark mode) | `#ffffff`             |
| `colorBgMask`        | Backdrop/mask color                                                                          | `rgba(0, 0, 0, 0.45)` |
| `colorBgTextActive`  | Background color of text in active state                                                     | `rgba(0, 0, 0, 0.15)` |
| `colorBgTextHover`   | Background color of text in hover state                                                      | `rgba(0, 0, 0, 0.06)` |
| `colorIcon`          | Weak-action icon color                                                                       | `rgba(0, 0, 0, 0.45)` |
| `colorIconHover`     | Weak-action icon hover color                                                                 | `rgba(0, 0, 0, 0.88)` |
| `colorPrimary`       | Brand color                                                                                  | `#1677ff`             |
| `colorPrimaryBorder` | Stroke color under the primary color gradient                                                | `#91caff`             |
| `colorSplit`         | Separator color                                                                              | `rgba(5, 5, 5, 0.06)` |
| `colorText`          | Default text color                                                                           | `rgba(0, 0, 0, 0.88)` |
| `borderRadiusSM`     | Small border radius                                                                          | `4`                   |
| `fontSizeLG`         | Large font size                                                                              | `16`                  |
| `fontWeightStrong`   | Heading font weight                                                                          | `600`                 |
| `lineHeightLG`       | Large text line height                                                                       | `1.5`                 |
| `lineType`           | Border style                                                                                 | `solid`               |
| `lineWidth`          | Border width                                                                                 | `1`                   |
| `lineWidthFocus`     | Border width in focus state                                                                  | `3`                   |
| `marginXS`           | Small margin                                                                                 | `8`                   |
| `motionDurationMid`  | Medium animation duration                                                                    | `0.2s`                |
| `motionDurationSlow` | Slow animation duration                                                                      | `0.3s`                |
| `padding`            | Standard padding                                                                             | `16`                  |
| `paddingLG`          | Large padding                                                                                | `24`                  |
| `paddingXS`          | Extra-small padding                                                                          | `8`                   |

Note: `zIndexPopup` defaults to `1000`, the same as `zIndexPopupBase` and the same as Modal's default `zIndex` — Drawer, Modal, and Popover all start from the same `zIndexPopupBase` seed and are expected to be manually offset (via each component's own `zIndex` prop) when stacked together, rather than being automatically ordered by the library.

## 6. Notes for andes-ng implementation

- Sheet and Drawer (Base UI–backed) and Ant's Drawer are all, structurally, "Dialog positioned at a screen edge with slide-in motion (and, for Drawer, optional drag gestures)." This strongly argues for andes-ng's Sheet/Drawer sharing the _same_ underlying `@andes-ng/primitives` overlay service as Dialog — positioning/portal, focus trap, focus restoration, Escape handling, scroll lock, z-index — with only the **placement/slide-axis** and **optional gesture/snap-point layer** as genuinely separate concerns layered on top. Do not build Sheet as a copy-pasted Dialog and Drawer as a from-scratch gesture component; build one shared overlay primitive, then a thin "edge-anchored panel" layer for Sheet/Drawer's positioning, and an optional pointer/touch gesture module (drag, snap points, velocity-based dismissal) that only Drawer opts into.
- Because shadcn's own Drawer just migrated off a fully separate gesture library (`vaul`) onto the same primitive (Base UI) that backs Dialog/Sheet/Popover, that is direct external validation for andes-ng consolidating on one shared overlay primitive rather than adopting a separate gesture library the way the _old_ shadcn Drawer did — the ecosystem trend is toward consolidation, not toward more special-cased libraries per overlay type.
- Token mapping to `packages/tokens/src/theme.css`:
  - Panel surface → `--andes-color-popover` / `--andes-color-popover-foreground` (exist).
  - Panel border/hairline → `--andes-color-border` (exists).
  - Radius on the panel's outer corners → `--andes-radius-lg`/`--andes-radius-xl` (exist).
  - Header/body/footer spacing → `--andes-space-3`/`--andes-space-4` (exist; Ant's `footerPaddingBlock: 8`/`footerPaddingInline: 16` map cleanly to `--andes-space-2`/`--andes-space-4`).
  - **Missing, same as Dialog**: an overlay/backdrop color token (`colorBgMask` has no andes-ng equivalent) and a z-index scale (`zIndexPopupBase`/per-component `zIndex` has no andes-ng equivalent). Drawer makes the z-index gap especially concrete: Ant's `push` behavior and nested-drawer support, and Base UI Drawer's `--nested-drawers` counter, both assume the underlying primitive can answer "how many of me are already open, and what z-index/offset should the next one get" — andes-ng's shared overlay primitive needs to own that stacking-context bookkeeping, not leave it to each Drawer instance to guess a z-index.
  - A **resize-handle size token** (Ant's `draggerSize: 4`) has no andes-ng equivalent; only needed if andes-ng's Drawer supports `resizable` like Ant's does — otherwise not a blocking gap.
- Accessibility pitfalls to flag specifically for Sheet/Drawer (beyond the general overlay list in `dialog-modal.md`): (1) verify and explicitly document Drawer's ARIA role (do not assume `role="dialog"` carries over from Dialog/Sheet without checking, since Base UI's own Drawer docs do not state it as plainly as Dialog's do); (2) any drag/swipe-to-dismiss gesture must ship a keyboard-and-screen-reader-usable equivalent (e.g. Escape to close is necessary but not sufficient — moving between `snapPoints` needs a non-pointer path too, which neither reference library documents solving); (3) nested-drawer/`push` stacking must preserve a single, correct focus trap boundary (the _topmost_ open drawer) and correct focus restoration order when multiple are closed in sequence; (4) `aria-controls`/`aria-expanded` on the trigger, same as Dialog, so the trigger ↔ panel relationship is exposed to assistive tech regardless of which edge the panel slides in from.
