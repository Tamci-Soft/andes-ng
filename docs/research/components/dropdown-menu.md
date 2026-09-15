# Dropdown Menu

## 1. Anatomy / compound structure

### shadcn/ui

As of the current (2026) docs, shadcn's Dropdown Menu is built on **Base UI** (`@base-ui-components/react`), not Radix UI. The docs page lists Base UI, React Aria, and Radix UI as available implementation tabs, with Base UI shown as the default; the API Reference section links to "the Base UI documentation" (`/docs/components/base/dropdown-menu` style link) for the full API. No migration/deprecation notice for Radix is stated on the page — Radix is simply offered as an alternative tab, not flagged legacy.

Exported wrapper parts (from `@/components/ui/dropdown-menu`):

- `DropdownMenu` — root; groups all parts, owns open/closed state.
- `DropdownMenuTrigger` — element (button) that opens the menu.
- `DropdownMenuContent` — the popup surface containing menu items (wraps Base UI's `Menu.Portal` + `Menu.Positioner` + `Menu.Popup`).
- `DropdownMenuGroup` — groups related items together (no visual change by itself, semantic/structural).
- `DropdownMenuLabel` — non-interactive heading/label text for a group.
- `DropdownMenuItem` — a single selectable/clickable action.
- `DropdownMenuCheckboxItem` — toggle-style item with a checked/unchecked indicator.
- `DropdownMenuRadioGroup` — container coordinating a set of mutually-exclusive radio items.
- `DropdownMenuRadioItem` — one option within a `DropdownMenuRadioGroup`.
- `DropdownMenuSeparator` — visual divider line between groups.
- `DropdownMenuShortcut` — right-aligned text slot for displaying a keyboard shortcut hint (purely presentational, not functional).
- `DropdownMenuSub` — container for a nested submenu.
- `DropdownMenuSubTrigger` — the item that opens a nested submenu (renders an arrow indicator).
- `DropdownMenuSubContent` — the popup surface for the nested submenu's items.
- `DropdownMenuPortal` — (re-exported) portals content to `document.body` by default.

The underlying Base UI primitive is actually named **`Menu`** (`@base-ui-components/react/menu`), not "DropdownMenu" — shadcn's dropdown-menu wrapper is effectively Base UI `Menu.*` renamed/re-exported with a trigger-button convention layered on. Base UI's own part list includes additional parts shadcn's wrapper doesn't surface directly: `Menu.Backdrop` (overlay beneath the popup), `Menu.Viewport` (content-transition container), `Menu.Arrow`, `Menu.LinkItem` (an `<a>`-rendering item for navigation), `Menu.CheckboxItemIndicator`/`Menu.RadioItemIndicator`, `Menu.GroupLabel`, and `Menu.SubmenuRoot`.

### Ant Design

- `Dropdown` — the root component; wraps a single trigger child and shows a menu overlay on hover/click/contextMenu.
- `Dropdown.Button` — a compound convenience variant combining a primary action button with an attached dropdown-trigger button (split button pattern). **Note:** the current live Dropdown docs page's own API tables only document the plain `Dropdown` component; no separate `Dropdown.Button` props table exists on the page as of this fetch (only a usage demo titled "Button with dropdown menu" is shown). Historically (older Ant Design major versions) `Dropdown.Button` did have its own documented prop set (`type`, `danger`, `icon`, `loading`, `htmlType`, `buttonsRender`, etc.); treat that historical shape as a reference only, not as verified current API — confirm directly in the installed `antd` version's TypeScript types before relying on it.
- The menu content itself is supplied via the `menu` prop (an Ant Design `Menu`/`MenuProps` configuration object — items array with `key`, `label`, `icon`, `danger`, `disabled`, `children` for submenus, etc.) — Dropdown does not define its own item sub-components; it composes the separate `Menu` component's data-driven API.

## 2. Props / API

### shadcn/ui

No component-specific prop table is published by shadcn (it defers to Base UI's `Menu` docs). Notable/documented props seen across the composition examples and inherited from Base UI `Menu.*`:

| Sub-component                                    | Prop                                | Type                                        | Default     | Description                                                                           |
| ------------------------------------------------ | ----------------------------------- | ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `DropdownMenu` (`Menu.Root`)                     | `open`                              | `boolean`                                   | —           | Controlled open state                                                                 |
|                                                  | `defaultOpen`                       | `boolean`                                   | `false`     | Initial open state                                                                    |
|                                                  | `onOpenChange`                      | `(open, event, reason) => void`             | —           | Open-state change callback                                                            |
|                                                  | `modal`                             | `boolean`                                   | `true`      | Whether the menu enters a modal state (traps focus, adds an inert backdrop) when open |
|                                                  | `loopFocus`                         | `boolean`                                   | `true`      | Whether arrow-key navigation loops from the last item back to the first               |
| `DropdownMenuTrigger` (`Menu.Trigger`)           | `openOnHover`                       | `boolean`                                   | `false`     | Also open the menu on hover, not just click                                           |
|                                                  | `delay`                             | `number`                                    | `100`       | Hover-open delay in ms (used when `openOnHover` is set)                               |
|                                                  | `disabled`                          | `boolean`                                   | `false`     | Disables the trigger                                                                  |
| `DropdownMenuItem` (`Menu.Item`)                 | `closeOnClick`                      | `boolean`                                   | `true`      | Whether selecting the item closes the menu                                            |
|                                                  | `disabled`                          | `boolean`                                   | `false`     | Ignores user interaction                                                              |
|                                                  | `label`                             | `string`                                    | —           | Overrides the text used for keyboard typeahead matching                               |
|                                                  | `inset`                             | `boolean` (shadcn-added styling prop)       | `false`     | Adds left padding to align with items that have an icon, when this item has none      |
|                                                  | `variant`                           | `"default" \| "destructive"` (shadcn-added) | `"default"` | Styles the item red for destructive actions                                           |
| `DropdownMenuCheckboxItem` (`Menu.CheckboxItem`) | `checked`                           | `boolean`                                   | —           | Current checked state                                                                 |
|                                                  | `onCheckedChange`                   | `(checked: boolean) => void`                | —           | Checked-state change handler                                                          |
|                                                  | `closeOnClick`                      | `boolean`                                   | —           | Whether clicking closes the menu                                                      |
| `DropdownMenuRadioGroup` (`Menu.RadioGroup`)     | `value`                             | `any`                                       | —           | Currently selected value                                                              |
|                                                  | `onValueChange`                     | `(value) => void`                           | —           | Selection change handler                                                              |
| `DropdownMenuRadioItem` (`Menu.RadioItem`)       | `value`                             | `any` (required)                            | —           | The value this item represents within its `RadioGroup`                                |
|                                                  | `label`                             | `string`                                    | —           | Typeahead override                                                                    |
| `DropdownMenuSub` (`Menu.SubmenuRoot`)           | `open`/`defaultOpen`/`onOpenChange` | same shape as root                          | —           | Submenu's own open state                                                              |

### Ant Design

**`Dropdown` props**

| Property             | Description                                                           | Type                                             | Default         |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------ | --------------- |
| `arrow`              | Visibility of the dropdown arrow, optionally pointed at target center | `boolean \| { pointAtCenter: boolean }`          | `false`         |
| `autoAdjustOverflow` | Auto-adjust placement when the popup would go off-screen              | `boolean`                                        | `true`          |
| `autoFocus`          | Focus the dropdown menu when opened                                   | `boolean`                                        | —               |
| `classNames`         | Semantic DOM class overrides                                          | `Record<SemanticDOM, string> \| function`        | —               |
| `styles`             | Semantic DOM inline style overrides                                   | `Record<SemanticDOM, CSSProperties> \| function` | —               |
| `disabled`           | Disable the dropdown                                                  | `boolean`                                        | —               |
| `destroyOnHidden`    | Destroy the popup DOM when hidden                                     | `boolean`                                        | `false`         |
| `popupRender`        | Customize the popup's rendered content                                | `(menus: ReactNode) => ReactNode`                | —               |
| `getPopupContainer`  | Container element for the popup                                       | `(triggerNode: HTMLElement) => HTMLElement`      | `document.body` |
| `menu`               | Menu configuration (items, selection, etc.)                           | `MenuProps`                                      | —               |
| `placement`          | Popup position (12 options, e.g. `bottomLeft`, `topRight`, etc.)      | `string`                                         | `bottomLeft`    |
| `trigger`            | Activation mode(s)                                                    | `Array<"click" \| "hover" \| "contextMenu">`     | `['hover']`     |
| `open`               | Controlled open state                                                 | `boolean`                                        | —               |
| `onOpenChange`       | Open-state change callback, receives the trigger source               | `(open: boolean, info: { source }) => void`      | —               |

Deprecated props still present for back-compat: `overlayClassName`, `overlayStyle`, `dropdownRender` (renamed `popupRender`), `destroyPopupOnHide` (renamed `destroyOnHidden`).

Semantic DOM parts exposed for `classNames`/`styles` customization: `root`, `itemTitle`, `item`, `itemContent`, `itemIcon`.

**`Dropdown.Button`** — not documented with its own props table on the current live docs page (see anatomy section above); usage is demonstrated but the formal API reference for this compound variant could not be verified from the fetched page content. Flag as **undocumented on the current page** rather than guessing its exact prop list.

## 3. Variants, sizes and states

### shadcn/ui

No `variant`/`size` string enum on the menu itself — visual styling is via Tailwind utility classes, with only `DropdownMenuItem`'s `variant` (`default`/`destructive`) as a meaningful enum. States: `open`/`closed` (root and each `Positioner`/`Popup`/`Item` expose `data-open`/`data-closed`), `disabled` (per trigger or per item), `checked`/`unchecked` for `CheckboxItem` (`data-checked`), selected value for `RadioItem` (`data-checked` on the active radio), submenu `open` state independent of the parent menu's, and `highlighted`/active-item state during keyboard navigation (`data-highlighted`).

### Ant Design

No `variant`/`size` props on `Dropdown` itself (size, if any, would come through the composed `Menu`'s own configuration). States: `open`/controlled via `open`+`onOpenChange`, `disabled` (whole dropdown), `arrow` on/off, and whichever states the underlying `Menu` items carry (`disabled`, `danger`, selected `key`, nested `children` for submenu open/closed).

## 4. Accessibility

### shadcn/ui (via Base UI Menu)

- ARIA roles: `role="menu"` on the popup container, `role="menuitem"` on plain items, `role="menuitemcheckbox"` on checkbox items, `role="menuitemradio"` on radio items.
- Focus management: `modal` (default `true`) traps focus within the open menu and marks background content inert; `loopFocus` (default `true`) wraps arrow-key navigation from last item back to first.
- Documented keyboard behavior (Base UI's docs do **not** provide one single exhaustive table; the following is assembled from the scattered prop/behavior descriptions found):
  | Key                       | Behavior                                                                                                           |
  | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
  | `Enter` / `Space`         | Activates the focused/highlighted item                                                                             |
  | `Arrow Up` / `Arrow Down` | Move focus between items (direction depends on `orientation`, default vertical)                                    |
  | `Arrow Right`             | Opens a highlighted item's submenu (when the item is a `SubmenuTrigger`)                                           |
  | `Arrow Left`              | Closes the current submenu and returns focus to its trigger                                                        |
  | `Escape`                  | Closes the menu (and, per `closeParentOnEsc`, optionally the parent menu when inside a submenu)                    |
  | `Home` / `End`            | Implied by `loopFocus`-adjacent list-navigation behavior but not explicitly itemized in the docs (verify directly) |
  | Typing characters         | Typeahead: moves focus to the next item whose text (or explicit `label` override) starts with the typed characters |
- Base UI's own docs explicitly acknowledge this keyboard table is **not fully exhaustive/structured** on the Menu page — flag this as a known documentation gap rather than an andes-ng oversight if the Angular implementation can't find a canonical source.

### Ant Design

- No explicit ARIA role/attribute table is published on the Dropdown docs page. Given it composes `Menu`, the popup should render Menu's own `role="menu"`/`role="menuitem"` semantics, but this is **not directly documented on the Dropdown page itself** — verify in the rendered DOM.
- `trigger` supports `click`, `hover`, `contextMenu` combinations; keyboard interaction (arrow-key navigation, Escape to close, Enter to select) is expected by convention from the composed `Menu` component but likewise not itemized in a keyboard table on this page.

## 5. Design tokens

### shadcn/ui

No Dropdown-Menu-specific tokens exist. Global CSS variables it plausibly uses:

- `--popover` / `--popover-foreground` — the menu surface background/text (a floating "popover-like" surface, same as Tooltip/Select/Combobox content).
- `--accent` / `--accent-foreground` — hover/highlighted item background and text.
- `--destructive` — `DropdownMenuItem variant="destructive"` text/icon color.
- `--border` — separator lines (`DropdownMenuSeparator`) and/or the popup's outline.
- `--ring` — focus ring on the trigger button when keyboard-focused.
- `--radius` — corner rounding of the popup.

### Ant Design

**Component Token**

| Token          | Description                            | Default                                      |
| -------------- | -------------------------------------- | -------------------------------------------- |
| `paddingBlock` | Vertical padding of the dropdown popup | `undefined` (falls back to internal default) |
| `zIndexPopup`  | z-index of the dropdown popup          | `1050`                                       |

**Global tokens it derives from / consumes** (per the page's Global Token section and cross-referenced with `https://ant.design/docs/react/customize-theme`): `colorBgElevated` (elevated-surface background, itself an Alias token built on the neutral background scale, not `colorPrimary`), `colorError`, `colorIcon`, `colorPrimary` (selected/active menu item accents), `colorText`, `colorTextDescription`, `colorTextDisabled`, `colorTextLightSolid`, `borderRadiusLG`/`borderRadiusSM`/`borderRadiusXS` (Map tokens derived from the `borderRadius` Seed, default `6`: LG=8, SM=4, XS=2), `boxShadowSecondary` (elevation shadow), `controlHeightLG` (derived from the `controlHeight` Seed, default `32` → LG `40`), `controlItemBgActive`/`controlItemBgActiveHover`/`controlItemBgHover` (Alias tokens for interactive-item backgrounds), `controlPaddingHorizontal`, `fontFamily`, `fontSize`/`fontSizeSM`/`fontSizeIcon` (derived from the `fontSize` Seed, default `14`), `lineHeight`, `lineWidthFocus`, `marginXS`/`marginXXS` (derived from the `sizeStep`/`sizeUnit` Seed pair, default `4`/`4`), motion-duration/curve tokens, `padding`/`paddingXS`/`paddingXXS` (same size-scale derivation), `sizePopupArrow`.

Note: this is a notably small component-token surface (only 2 rows) compared to Table or Card — most of Dropdown's visual identity is inherited wholesale from global/alias tokens plus whatever the composed `Menu` component contributes (Menu has its own separate, larger Design Token table not captured here since Menu is a distinct component from Dropdown).

## 6. Notes for andes-ng implementation

- This is the component that most needs a dedicated **menu behavior primitive** in `@andes-ng/primitives`: roving-tabindex (or `aria-activedescendant`) focus management within the open popup, arrow-key navigation with looping, typeahead-by-first-character, Escape-to-close with focus return to the trigger, nested-submenu open/close on `ArrowRight`/`ArrowLeft` with a hover-intent delay, and modal focus-trapping. This should be built as a reusable primitive since Select/Combobox-style components will need overlapping (not identical) behavior later.
- It shares the **positioning primitive** described in `tooltip.md` (side/align/offset/collision/flip) — the popup surface (`DropdownMenuContent`) and Tooltip's `TooltipContent` should sit on the same underlying positioning directive/service rather than duplicating floating-UI-style logic.
- Needs an explicit **checked/radio-group value primitive** for `CheckboxItem`/`RadioItem`/`RadioGroup` semantics (`aria-checked`, mutually-exclusive selection, controlled/uncontrolled value) — likely shareable with a future in-app `RadioGroup`/`CheckboxGroup` component's core state logic.
- Token mapping: `--andes-color-popover`/`-popover-foreground` for the menu surface; `--andes-color-accent`/`-accent-hover`/`-accent-foreground` for highlighted/hovered items (andes-ng's tokens file has `--andes-color-accent-hover` already, which is a closer match to Ant's `controlItemBgHover` than shadcn's plain `--accent` gives); `--andes-color-danger`/`-danger-foreground` for a destructive item variant; `--andes-color-border` for `DropdownMenuSeparator`; `--andes-radius-md` for the popup's corner rounding; `--andes-color-focus-ring` for the trigger's focus ring. No current token equivalent for Ant's `zIndexPopup`/elevation `boxShadowSecondary` — andes-ng's theme.css has no shadow or z-index scale yet; this is a real gap worth flagging since Tooltip, Dropdown Menu, and any future Popover/Select/Dialog will all need a shared elevation/z-index token set.
- Accessibility pitfall to flag: Base UI's own docs admit the keyboard table for Menu isn't exhaustive — the Angular implementer should not assume parity is "verified" just because it matches Base UI's partial documentation; cross-check against the WAI-ARIA Authoring Practices Menu Button pattern (Home/End behavior, `aria-expanded` on the trigger, `aria-haspopup="menu"`) since neither shadcn/Base UI nor Ant Design fully spells these out on their public pages.
