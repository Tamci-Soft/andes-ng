# Dialog / Modal

shadcn/ui ships **two** related but distinct components here — `Dialog` (general-purpose overlay) and `AlertDialog` (confirmation overlay that demands an explicit response) — both covered below. Ant Design's equivalent is the single `Modal` component (plus its imperative `Modal.method()` family, which itself covers the "alert/confirm" use case that shadcn splits into a separate component).

## 1. Anatomy / compound structure

### shadcn/ui — Dialog
Exported parts (from `@/components/ui/dialog`):
- `Dialog` — root; holds open/close state, not itself an HTML element.
- `DialogTrigger` — element that opens the dialog (supports the `render` prop pattern for rendering as a different underlying element, e.g. a `Button`).
- `DialogPortal` — moves the popup content to a different part of the DOM (defaults to `<body>`).
- `DialogOverlay` — the backdrop rendered beneath the popup.
- `DialogContent` — the actual dialog surface/container; includes the built-in close button unless `showCloseButton={false}` is passed.
- `DialogHeader` — layout wrapper for title + description.
- `DialogTitle` — the dialog's heading (renders `<h2>` at the primitive level).
- `DialogDescription` — supporting/descriptive text (renders `<p>` at the primitive level).
- `DialogFooter` — layout wrapper for footer actions.
- `DialogClose` — button that closes the dialog.

Underlying primitive: the docs page now offers three implementation variants — **Base UI**, **React Aria**, and **Radix UI** — with **Base UI** (`@base-ui-components/react`) shown as the primary/default implementation on the current docs. The docs state: "A window overlaid on either the primary window or another dialog window, rendering the content underneath inert," and link out to the Base UI Dialog reference for the full API. This confirms the ongoing shadcn migration away from Radix UI as the default; Radix UI remains available as an explicit alternative variant, not the default.

### shadcn/ui — Alert Dialog
Exported parts (from `@/components/ui/alert-dialog`):
- `AlertDialog` — root.
- `AlertDialogTrigger` — opens the dialog.
- `AlertDialogPortal` — portals the popup content (lower-level export, mirrors Dialog's).
- `AlertDialogOverlay` — backdrop (lower-level export).
- `AlertDialogContent` — dialog surface/container.
- `AlertDialogHeader` — layout wrapper for title + description.
- `AlertDialogTitle` — heading (`<h2>`).
- `AlertDialogDescription` — description text (`<p>`).
- `AlertDialogFooter` — layout wrapper for footer actions.
- `AlertDialogAction` — the primary/affirmative action button (a styled `<button>` that also closes the dialog).
- `AlertDialogCancel` — the secondary/dismiss action button.

Underlying primitive: same three-variant setup as Dialog — **Base UI**, **React Aria**, **Radix UI** — with Base UI as the default shown implementation, via Base UI's dedicated `AlertDialog` component family (a distinct primitive from `Dialog`, not just a styled reuse of it, so that it can enforce `role="alertdialog"` semantics and stricter dismissal rules).

### Ant Design — Modal
Exported static properties/methods on `Modal`:
- `Modal` — the primary declarative component (controlled via `open`).
- `Modal.useModal()` — hook returning `[modal, contextHolder]`; the recommended way to trigger imperative modals while staying inside React context (theme/locale) instead of the static `Modal.confirm()` family.
- `Modal.confirm(config)` — imperative confirmation dialog with OK/Cancel.
- `Modal.info(config)` — imperative informational dialog (OK only).
- `Modal.success(config)` — imperative success dialog (OK only).
- `Modal.error(config)` — imperative error dialog (OK only).
- `Modal.warning(config)` — imperative warning dialog (OK only).
- `Modal.destroyAll()` — force-destroys all currently open imperative modals at once (useful on route change).

## 2. Props / API

### shadcn/ui — Dialog
No fixed exhaustive props table is published on the shadcn page itself for each part; it defers to the underlying primitive's own docs ("See the Base UI documentation for more information"). Documented/notable props:

| Sub-component | Prop | Type | Default | Description |
|---|---|---|---|---|
| `Dialog` (Root) | `open` | `boolean` | — | Controls whether the dialog is open. |
| `Dialog` (Root) | `onOpenChange` | `(open: boolean) => void` | — | Fires when open state changes. |
| `Dialog` (Root) | `defaultOpen` | `boolean` | `false` | Initial open state (uncontrolled). |
| `Dialog` (Root) | `modal` | `boolean \| "trap-focus"` | `true` | Enables modal behavior (focus trap + scroll lock + inert background) or focus-trap-only mode. |
| `Dialog` (Root) | `disablePointerDismissal` | `boolean` | `false` | Prevents closing via outside pointer interaction. |
| `DialogContent` | `showCloseButton` | `boolean` | `true` | Whether the built-in close ("x") button is rendered. |
| `DialogContent` (Popup, per Base UI) | `initialFocus` | `boolean \| RefObject \| function` | — | Controls which element receives focus on open. |
| `DialogContent` (Popup, per Base UI) | `finalFocus` | `boolean \| RefObject \| function` | — | Controls which element receives focus on close. |
| `DialogPortal` | `container` | `HTMLElement \| ShadowRoot \| RefObject` | `document.body` | Portal target. |
| `DialogPortal` | `keepMounted` | `boolean` | `false` | Keep the portal content mounted in the DOM while hidden. |

### shadcn/ui — Alert Dialog
Same underlying-primitive-driven shape as Dialog, with these differences/additions:

| Sub-component | Prop | Type | Default | Description |
|---|---|---|---|---|
| `AlertDialog` (Root) | `open` / `onOpenChange` / `defaultOpen` | as above | — | Same semantics as Dialog Root. |
| `AlertDialog` (Root) | `actionsRef` | `RefObject` | — | Imperative actions handle (e.g. programmatic unmount/close). |
| `AlertDialogTrigger` | `nativeButton` | `boolean` | `true` | Whether the trigger renders as a native `<button>`. |
| `AlertDialogAction` | — | styled `<button>` | — | No dialog-specific props beyond standard button props; clicking it closes the dialog as the "confirm" path. |
| `AlertDialogCancel` | — | styled `<button>` | — | No dialog-specific props beyond standard button props; clicking it closes the dialog as the "cancel" path. |

### Ant Design — `Modal` component props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | `false` | Whether the modal is visible. |
| `title` | `ReactNode` | — | Modal title. |
| `onOk` | `(e) => void` | — | Callback when the OK button is clicked. |
| `onCancel` | `(e) => void` | — | Callback when Cancel/mask/close (x) is clicked. |
| `footer` | `ReactNode \| ((originNode, { OkBtn, CancelBtn }) => ReactNode)` | OK & Cancel buttons | Footer content; set to `null` to hide entirely. |
| `confirmLoading` | `boolean` | `false` | Loading state on the OK button. |
| `width` | `string \| number` | `520` | Modal width. |
| `centered` | `boolean` | `false` | Vertically center the modal. |
| `closable` | `boolean \| ClosableType` | `true` | Show/configure the close ("x") button. |
| `closeIcon` | `ReactNode` | `<CloseOutlined />` | Custom close icon. |
| `destroyOnHidden` | `boolean` | `false` | Unmount child components when the modal closes (formerly `destroyOnClose`). |
| `mask` | `boolean \| object` | `true` | Whether/how to render the mask (supports `blur`, `closable` sub-options). |
| `keyboard` | `boolean` | `true` | Whether ESC closes the modal. |
| `zIndex` | `number` | `1000` | CSS `z-index` of the modal. |
| `afterClose` | `() => void` | — | Callback after the close animation finishes. |
| `afterOpenChange` | `(open: boolean) => void` | — | Callback after each open/close animation finishes. |
| `forceRender` | `boolean` | `false` | Force pre-rendering of the modal content. |
| `getContainer` | `HTMLElement \| (() => HTMLElement) \| false` | `document.body` | Mount container for the modal. |
| `style` | `CSSProperties` | — | Inline style for the floating layer. |
| `wrapClassName` | `string` | — | Class name for the modal's outer container. |
| `styles` | `Record<SemanticDOM, CSSProperties> \| function` | — | Semantic DOM inline styles. |
| `classNames` | `Record<SemanticDOM, string> \| function` | — | Semantic DOM class names. |
| `okButtonProps` | `ButtonProps` | — | Props applied to the OK button. |
| `cancelButtonProps` | `ButtonProps` | — | Props applied to the Cancel button. |
| `okText` | `ReactNode` | `"OK"` | OK button text. |
| `cancelText` | `ReactNode` | `"Cancel"` | Cancel button text. |
| `okType` | `string` | `primary` | Button `type`/style applied to OK. |
| `scrollLock` | `boolean` | `true` | Lock page scroll while the modal is open. |
| `loading` | `boolean` | — | Displays a skeleton-loading placeholder inside the modal. |
| `focusable` | `object` (e.g. `{ trap, autoFocusButton, focusTriggerAfterClose }`) | — | Focus-management configuration. |
| `modalRender` | `(node: ReactNode) => ReactNode` | — | Custom renderer wrapping the modal's content node. |

**`Modal.method()` config props** (shared shape for `Modal.info/success/error/warning/confirm`):

| Property | Type | Default | Description |
|---|---|---|---|
| `title` | `ReactNode` | — | Title. |
| `content` | `ReactNode` | — | Body content. |
| `onOk` | `(close) => void \| Promise` | — | OK callback; returning a promise controls when the modal closes. |
| `onCancel` | `(close) => void \| Promise` | — | Cancel callback. |
| `okText` | `string` | `"OK"` | OK button text. |
| `cancelText` | `string` | `"Cancel"` | Cancel button text. |
| `okType` | `string` | `primary` | OK button type. |
| `okButtonProps` | `ButtonProps` | — | Props for the OK button. |
| `cancelButtonProps` | `ButtonProps` | — | Props for the Cancel button. |
| `icon` | `ReactNode` | `<ExclamationCircleFilled />` | Icon (defaults vary per method — info/success/error/warning each default to their matching icon). |
| `width` | `string \| number` | `416` | Modal width. |
| `centered` | `boolean` | `false` | Vertically center. |
| `closable` | `boolean \| ClosableType` | `false` | Show close button (defaults to hidden for the imperative variants). |
| `closeIcon` | `ReactNode` | `undefined` | Custom close icon. |
| `keyboard` | `boolean` | `true` | ESC to close. |
| `mask` | `boolean \| object` | `true` | Mask effect. |
| `zIndex` | `number` | `1000` | z-index. |
| `style` | `CSSProperties` | — | Floating layer style. |
| `wrapClassName` | `string` | — | Outer container class. |
| `getContainer` | `HTMLElement \| function` | `document.body` | Mount location. |
| `afterClose` | `() => void` | — | Callback after close completes. |
| `scrollLock` | `boolean` | `true` | Lock body scroll. |
| `focusable.autoFocusButton` | `null \| "ok" \| "cancel"` | `"cancel"` | Which button auto-receives focus on open. |

**`ClosableType`**

| Property | Type | Default | Description |
|---|---|---|---|
| `closeIcon` | `ReactNode` | `undefined` | Custom close icon. |
| `disabled` | `boolean` | `false` | Disable the close button without hiding it. |
| `onClose` | `Function` | `undefined` | Callback specific to the close-button trigger. |

## 3. Variants, sizes and states

### shadcn/ui
- **Dialog**: no named size/placement variants exported as props — sizing is done via className/Tailwind on `DialogContent` directly, not a `size` enum. States: `open`/`closed` (via `open`/`onOpenChange` or uncontrolled `defaultOpen`); `modal` (`true` default, or `"trap-focus"` for focus-trap-without-scroll-lock, or presumably `false` for non-modal — Root's `modal` prop). Outside-click and Escape both dismiss by default unless `disablePointerDismissal` is set.
- **Alert Dialog**: same open/closed state shape as Dialog, but is intentionally more restrictive: outside-click dismissal is disabled by design (the docs frame this as the whole point of AlertDialog vs. Dialog — "interrupts the user with important content and expects a response"), and it always renders with `role="alertdialog"` instead of `role="dialog"`.

### Ant Design
- Size: controlled via the free-form `width` prop (px or CSS string), not an enum of named sizes; `centered` toggles vertical centering.
- The declarative `Modal` and the five imperative `Modal.method()` variants (`info`/`success`/`warning`/`error`/`confirm`) are effectively "semantic variants" differing in default icon, default `closable` (hidden for the static methods), and default footer buttons (`info`/`success`/`warning`/`error` show OK only; `confirm` shows OK + Cancel).
- States: `open` (declarative)/imperative promise-based lifecycle for `Modal.method()`; `confirmLoading` (loading indicator on OK); `loading` (skeleton placeholder state for the whole body); `mask`/`maskClosable`-style dismissal toggle (exposed as `mask: { closable }` in the current API); `keyboard` toggles Escape-to-close.

## 4. Accessibility

### shadcn/ui (via Base UI — confirmed as the default primitive)
**Dialog** (Base UI `Dialog`):
- ARIA role: implicit `role="dialog"` semantics on the popup; requires an explicit `Dialog.Title`/`Dialog.Description` (i.e. shadcn's `DialogTitle`/`DialogDescription`) for the dialog to be properly announced — omitting them is an accessibility regression, not just a style choice.
- Focus trap: when `modal: true` (default) or `"trap-focus"`, Tab/Shift+Tab cycles focus within the dialog only.
- Initial focus: moves automatically to the first tabbable element on open, or to whatever `initialFocus` specifies.
- Focus restoration: focus returns to the trigger (or wherever `finalFocus` specifies) when the dialog closes.
- Escape: requests the dialog to close, unless `disablePointerDismissal` is set.
- Outside pointer click: closes the dialog, unless `disablePointerDismissal` is set.
- Scroll lock: document scroll is locked while a modal dialog is open.
- Background inert: background content becomes pointer-inert and (per Base UI's implementation) is marked inert for assistive tech while a modal dialog is open.
- Documented caveat: when `modal` is enabled, Base UI's own guidance says to "render `<Dialog.Close>` inside `<Dialog.Popup>` so touch screen readers can escape" — i.e. always include a close affordance inside the popup itself, not only an outside-click/Escape path, for touch screen-reader users.

Keyboard interaction table (as documented):

| Key | Behavior |
|---|---|
| `Escape` | Requests dialog close (unless `disablePointerDismissal`). |
| `Tab` / `Shift+Tab` | Cycles focus within the dialog when modal. |

**Alert Dialog** (Base UI `AlertDialog`, a distinct component from `Dialog`):
- ARIA role: `role="alertdialog"`.
- Focus trap: always on (no non-modal mode documented — alert dialogs are inherently modal/blocking).
- Outside-click dismissal: intentionally disabled by design, reinforcing that the user must make an explicit choice via `AlertDialogAction`/`AlertDialogCancel`.
- Escape: closes the dialog (the docs mention a "Close confirmation" pattern for cases where Escape should itself require confirmation, implying Escape-to-close is the default but can be intercepted).
- Focus management: same `initialFocus`/`finalFocus` props as Dialog.

### Ant Design
- ARIA: not explicitly itemized as an ARIA table in the fetched docs, but standard modal-dialog semantics are implied by the component's role in the framework; treat exact ARIA role/attribute output as **undocumented** rather than assumed WAI-ARIA-complete — verify actual rendered markup if strict ARIA compliance is required.
- Escape: documented explicitly — `keyboard` prop (`true` default) controls whether ESC closes the modal.
- Focus management: documented via the `focusable` prop — supports trapping focus and `focusTriggerAfterClose`-style restoration, and (for imperative methods) `autoFocusButton` to choose which button receives initial focus (`"cancel"` by default for confirm-style dialogs, arguably safer than defaulting to the destructive OK action).
- Scroll lock: documented via `scrollLock` (`true` default) — locks body scroll while a modal is open.
- Mask/outside-click dismissal: documented via `mask`'s `closable` sub-option (distinct from the deprecated top-level `maskClosable` naming in older versions).

## 5. Design tokens

### shadcn/ui
Both Dialog and AlertDialog are overlay surfaces, so they draw on the `--popover`/`--popover-foreground` pair for their surface background/text (consistent with shadcn's convention that floating/overlay surfaces use the `popover` tokens rather than `background`/`card`). The backdrop itself is typically an opacity-modified `black`/`background`-derived value applied via Tailwind utility classes (e.g. `bg-black/50`) rather than a dedicated `--overlay`/`--backdrop` CSS variable — shadcn's global token set has no such variable. `--border` is used for any hairline border on the dialog surface, and `--ring` for the focus ring on focusable elements inside. `AlertDialogAction`/`AlertDialogCancel` reuse the `Button` component's own variant tokens (`--primary`/`--primary-foreground`, `--secondary`/`--secondary-foreground`, `--destructive`) rather than defining new ones.

### Ant Design — `Modal` Design Token table

**Component tokens**

| Token | Description | Default value |
|---|---|---|
| `contentBg` | Background color of content | `#ffffff` |
| `footerBg` | Background color of footer | `transparent` |
| `headerBg` | Background color of header | `transparent` |
| `titleColor` | Font color of title | `rgba(0, 0, 0, 0.88)` |
| `titleFontSize` | Font size of title | `16` |
| `titleLineHeight` | Line height of title | `1.5` |

**Global (Seed/Map/Alias) tokens Modal draws on**, per the page:

| Token | Description | Default value |
|---|---|---|
| `colorBgMask` | Background color of the mask, covering content below | `rgba(0, 0, 0, 0.45)` |
| `colorBgTextActive` | Background color of text in active state | `rgba(0, 0, 0, 0.15)` |
| `colorBgTextHover` | Background color of text in hover state | `rgba(0, 0, 0, 0.06)` |
| `colorIcon` | Weak-action icon color (e.g. close button) | `rgba(0, 0, 0, 0.45)` |
| `colorIconHover` | Weak-action icon hover color | `rgba(0, 0, 0, 0.88)` |
| `colorPrimaryBorder` | Stroke color under the primary color gradient | `#91caff` |
| `colorSplit` | Separator color | `rgba(5, 5, 5, 0.06)` |
| `colorText` | Default text color | `rgba(0, 0, 0, 0.88)` |
| `borderRadiusLG` | Large border radius (Card/Modal-scale components) | `8` |
| `borderRadiusSM` | Small border radius | `4` |
| `boxShadow` | Box shadow of the modal surface | `0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12), 0 9px 28px 8px rgba(0,0,0,0.05)` |
| `controlHeight` | Height of basic controls (e.g. footer buttons) | `32` |
| `fontFamily` | Font family | system font stack |
| `fontSize` | Base font size | `14` |
| `fontSizeHeading5` | h5 font size | `16` |
| `fontSizeLG` | Large font size | `16` |
| `fontWeightStrong` | Heading font weight | `600` |
| `lineHeight` | Text line height | `1.5714285714285714` |
| `lineHeightHeading5` | h5 line height | `1.5` |
| `lineType` | Border style | `solid` |
| `lineWidth` | Border width | `1` |
| `lineWidthFocus` | Border width in focus state | `3` |
| `margin` | Medium margin | `16` |
| `marginXS` | Small margin | `8` |
| `motionDurationMid` | Medium animation duration | `0.2s` |
| `motionDurationSlow` | Slow animation duration | `0.3s` |
| `motionEaseInOutCirc` | Preset motion curve | `cubic-bezier(0.78, 0.14, 0.15, 0.86)` |
| `motionEaseOutCirc` | Preset motion curve | `cubic-bezier(0.08, 0.82, 0.17, 1)` |
| `padding` | Standard padding | `16` |
| `screenLGMin` / `screenMDMin` / `screenSMMax` / `screenSMMin` / `screenXLMin` / `screenXSMin` / `screenXXLMin` / `screenXXXLMin` | Breakpoints used for responsive modal width/behavior | `992` / `768` / `767` / `576` / `1200` / `480` / `1600` / `1920` |
| `zIndexPopupBase` | Base z-index that overlay components (Modal included) stack from | `1000` |

Note: `zIndex` on `Modal` itself defaults to `1000`, matching `zIndexPopupBase` directly — Modal is effectively the reference consumer of `zIndexPopupBase` among overlay components, with Drawer/Popover layering above/below it as needed for nesting.

## 6. Notes for andes-ng implementation
- Dialog and AlertDialog (and, by extension, Drawer/Sheet/Popover) are all instances of the same underlying need: a shared **overlay primitive** in `@andes-ng/primitives`, analogous to Angular CDK's `Overlay` service, that provides:
  - **Positioning/portal**: attach the overlay's DOM to a fixed root (e.g. `<body>` or an app-configured container, mirroring shadcn's `Portal`/`container` and Ant's `getContainer`), independent of where the trigger lives in the component tree.
  - **Focus trap**: constrain Tab/Shift+Tab cycling to the overlay while it is modal — this needs to be a reusable directive/service, not reimplemented per component, given how consistently both reference libraries treat it as core behavior.
  - **Focus restoration**: remember and restore focus to the triggering element (or an explicitly configured target, mirroring Base UI's `finalFocus`/Ant's `focusTriggerAfterClose`) on close.
  - **Escape handling**: a single keyboard listener contract with an opt-out (mirroring `disablePointerDismissal`/`keyboard={false}`), rather than each component wiring its own `keydown` listener.
  - **Scroll lock**: lock/unlock `document`/`body` scroll, with reference counting so nested overlays (e.g. a confirm AlertDialog opened from within a Dialog) don't unlock prematurely when the inner one closes.
  - **Z-index management**: a managed stacking-context/z-index scale so nested or simultaneously-open overlays (Dialog opening a Popover, a Drawer with a nested confirm dialog) layer correctly without ad hoc magic numbers per component — this directly mirrors Ant's `zIndexPopupBase`/`zIndexBase` seed-token model and is the single biggest structural gap in andes-ng today (see below).
- Token mapping to `packages/tokens/src/theme.css`:
  - Dialog/AlertDialog surface → `--andes-color-popover` / `--andes-color-popover-foreground` (already exist, and match shadcn's own convention of using `popover`, not `card`, for floating surfaces).
  - Surface border (if any) → `--andes-color-border` (exists).
  - Radius → `--andes-radius-lg` (exists; Ant's `borderRadiusLG` for Modal is `8` which matches andes-ng's `0.5rem` at a typical `16px` base).
  - Spacing (header/body/footer padding) → `--andes-space-3`/`--andes-space-4` (exist).
  - Confirm/cancel action buttons → reuse existing `--andes-color-primary*`/`--andes-color-danger*`/`--andes-color-secondary*` button tokens rather than inventing dialog-specific action-button colors, matching both reference libraries' approach of reusing Button's own tokens/variants.
  - **Missing tokens** (do not exist yet in `theme.css` and should be added before implementing any overlay component): (1) an **overlay/backdrop color token** (e.g. `--andes-color-overlay` or `--andes-overlay-backdrop`) — Ant has `colorBgMask` (`rgba(0,0,0,0.45)`) as an explicit, themeable token; andes-ng currently has no equivalent, so any overlay backdrop today would be a magic/inline color. (2) a **z-index scale** (e.g. `--andes-z-overlay`, `--andes-z-popover`, `--andes-z-toast`, or a single `--andes-z-popup-base` in the spirit of Ant's `zIndexPopupBase`/`zIndexBase`) — andes-ng currently has no z-index tokens at all, which will cause real stacking bugs the moment two overlay components (e.g. Dialog + Popover, or nested Dialogs) are used together without a shared, coordinated primitive owning z-index assignment.
- Accessibility pitfalls to flag explicitly for implementation and testing: (1) focus-trap correctness under dynamic content (content that changes tabbable elements while open must not let focus escape); (2) reliably returning focus to the exact triggering element on close, including when the trigger has since been removed from the DOM (needs a documented fallback); (3) background scroll prevention that correctly nests/un-nests for stacked overlays; (4) wiring `aria-controls`/`aria-expanded` (or the Base UI–documented `data-popup-open` attribute equivalent) on the trigger element so assistive tech can correctly relate trigger ↔ content, matching the trigger/content relationship both Base UI (`data-popup-open`) and Ant implicitly rely on; (5) AlertDialog specifically must render `role="alertdialog"` (not the plain `role="dialog"` Dialog uses) and must not offer outside-click dismissal, matching the semantic distinction both reference libraries make deliberate and explicit.
