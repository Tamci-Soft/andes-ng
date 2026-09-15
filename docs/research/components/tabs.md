# Tabs

## 1. Anatomy / compound structure

### shadcn/ui

The canonical doc URL `https://ui.shadcn.com/docs/components/tabs` redirects to `https://ui.shadcn.com/docs/components/base/tabs` (verified via `curl -L`, `200`). This page shows a single implementation (no separate Radix UI / React Aria alternates on this specific page).

- **Underlying primitive: Base UI** (`@base-ui/react/tabs`), verified from the live registry source served on the docs page: `import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"`.
- Exported parts (registry file `components/ui/tabs.tsx`):
  - `Tabs` — wraps `TabsPrimitive.Root`; the top-level state container (`data-slot="tabs"`, forwards `data-orientation`).
  - `TabsList` — wraps `TabsPrimitive.List`; the row/column of triggers (`data-slot="tabs-list"`, has its own `variant` prop — see below).
  - `TabsTrigger` — wraps `TabsPrimitive.Tab`; an individual clickable tab (`data-slot="tabs-trigger"`).
  - `TabsContent` — wraps `TabsPrimitive.Panel`; the panel shown for the active tab (`data-slot="tabs-content"`).
  - `tabsListVariants` — the `cva()` variants object for `TabsList`, also exported for reuse.
- Base UI itself additionally exposes a `Tabs.Indicator` part (an animated highlight that tracks the active tab's position/size) which the shadcn registry component does **not** currently wrap/use — it is available for a consumer to add manually if a sliding-indicator effect is wanted.

### Ant Design

- **Main component:** `Tabs` (`import { Tabs } from 'antd'`).
- **`TabPane`** — the legacy way of declaring individual tabs as JSX children; superseded by the `items` prop (available since v4.23.0) but still present as an export.
- Tabs are configured today primarily via the `items: TabItemType[]` prop rather than `TabPane` children.
- No other static properties/sub-components are exported.

## 2. Props / API

### shadcn/ui

**`Tabs` (⇒ Base UI `Tabs.Root`)**

| Prop                             | Type                             | Default        | Description                                                                                                                                                                                                                       |
| -------------------------------- | -------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultValue`                   | `Tabs.Tab.Value`                 | `0`            | Uncontrolled initial active tab value                                                                                                                                                                                             |
| `value`                          | `Tabs.Tab.Value`                 | —              | Controlled active tab value                                                                                                                                                                                                       |
| `onValueChange`                  | `(value, event, reason) => void` | —              | Fires when the active tab changes; `reason` is `'none'` (click/keyboard), `'initial'` (first automatic selection), `'disabled'` or `'missing'` (automatic fallback when the previously active tab becomes disabled or is removed) |
| `orientation`                    | `'horizontal' \| 'vertical'`     | `'horizontal'` | Layout/keyboard-navigation axis; the shadcn wrapper also mirrors this onto `data-orientation`                                                                                                                                     |
| `className` / `style` / `render` | usual Base UI shapes             | —              | Static or state-derived customization                                                                                                                                                                                             |

**`TabsList` (⇒ Base UI `Tabs.List`, plus a shadcn-only `variant`)**

| Prop                             | Type                  | Default     | Description                                                                                                             |
| -------------------------------- | --------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `variant`                        | `'default' \| 'line'` | `'default'` | shadcn-added visual variant (cva) — `default` is a pill-style segmented control, `line` is an underline-indicator style |
| `activateOnFocus`                | `boolean`             | `false`     | Whether arrow-key focus also immediately activates (selects) the tab, vs. requiring Enter/Space                         |
| `loopFocus`                      | `boolean`             | `true`      | Whether arrow-key focus wraps from the last tab back to the first (and vice versa)                                      |
| `className` / `style` / `render` | usual Base UI shapes  | —           | Static or state-derived customization                                                                                   |

**`TabsTrigger` (⇒ Base UI `Tabs.Tab`)**

| Prop                             | Type                 | Default      | Description                                                                                |
| -------------------------------- | -------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `value`                          | `Tabs.Tab.Value`     | — (required) | Identifies which panel this trigger controls                                               |
| `disabled`                       | `boolean`            | `false`      | Disables the trigger                                                                       |
| `nativeButton`                   | `boolean`            | `true`       | Whether the underlying element is a real `<button>` (relevant when combined with `render`) |
| `className` / `style` / `render` | usual Base UI shapes | —            | Static or state-derived customization                                                      |

**`TabsContent` (⇒ Base UI `Tabs.Panel`)**

| Prop                             | Type                 | Default      | Description                                                                             |
| -------------------------------- | -------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `value`                          | `Tabs.Tab.Value`     | — (required) | Matches the `TabsTrigger` whose panel this is                                           |
| `keepMounted`                    | `boolean`            | `false`      | Keep the panel mounted in the DOM (hidden) even when inactive, instead of unmounting it |
| `className` / `style` / `render` | usual Base UI shapes | —            | Static or state-derived customization                                                   |

**`Tabs.Indicator`** (Base UI part, not currently used by the shadcn registry file, but available)

| Prop                             | Type                 | Default | Description                                                                                                  |
| -------------------------------- | -------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `renderBeforeHydration`          | `boolean`            | `false` | Render the indicator's inline position styles before hydration to avoid a flash of an unpositioned indicator |
| `className` / `style` / `render` | usual Base UI shapes | —       | Static or state-derived customization                                                                        |

Exposes CSS custom properties for manual positioning: `--active-tab-left`, `--active-tab-top`, `--active-tab-right`, `--active-tab-bottom`, `--active-tab-width`, `--active-tab-height`.

### Ant Design

**`Tabs`**

| Prop                                    | Type                                                                                     | Default                                            | Description                                      | Version             |
| --------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------ | ------------------- |
| `activeKey`                             | `string`                                                                                 | –                                                  | Current active `TabPane`'s key                   |                     |
| `addIcon`                               | `ReactNode`                                                                              | `<PlusOutlined />`                                 | Custom add icon, `type="editable-card"` only     | 4.4.0               |
| `animated`                              | `boolean \| { inkBar: boolean, tabPane: boolean }`                                       | `{ inkBar: true, tabPane: false }`                 | Whether to animate tab switching                 |                     |
| `centered`                              | `boolean`                                                                                | `false`                                            | Centers the tab bar                              | 4.4.0               |
| `classNames`                            | `Record<SemanticDOM, string> \| (info) => Record<SemanticDOM, string>`                   | –                                                  | Per-semantic-DOM class names                     | 6.0.0               |
| `defaultActiveKey`                      | `string`                                                                                 | key of the first tab                               | Initial active key when uncontrolled             |                     |
| `hideAdd`                               | `boolean`                                                                                | `false`                                            | Hide the add icon, `type="editable-card"` only   |                     |
| `indicator`                             | `{ size?: number \| (origin: number) => number; align: 'start' \| 'center' \| 'end' }`   | –                                                  | Customize the active indicator's size/alignment  | 5.13.0              |
| `items`                                 | `TabItemType[]`                                                                          | `[]`                                               | Configures tab content                           | 4.23.0              |
| `more`                                  | `MoreProps`                                                                              | `{ icon: <EllipsisOutlined />, trigger: 'hover' }` | Configures the overflow "more" dropdown          | `more.icon`: 5.17.0 |
| `removeIcon`                            | `ReactNode`                                                                              | `<CloseOutlined />`                                | Custom remove icon, `type="editable-card"` only  | 5.15.0              |
| `popupClassName` _(deprecated)_         | `string`                                                                                 | –                                                  | Use `classNames.popup` instead                   | 4.21.0              |
| `renderTabBar`                          | `(props: DefaultTabBarProps, DefaultTabBar: React.ComponentClass) => React.ReactElement` | –                                                  | Replace the entire tab bar                       |                     |
| `size`                                  | `large \| medium \| small`                                                               | `medium`                                           | Preset tab bar size                              |                     |
| `styles`                                | `Record<SemanticDOM, CSSProperties> \| (info) => Record<SemanticDOM, CSSProperties>`     | –                                                  | Per-semantic-DOM inline styles                   | 6.0.0               |
| `tabBarExtraContent`                    | `ReactNode \| { left?: ReactNode, right?: ReactNode }`                                   | –                                                  | Extra content in the tab bar                     | object form: 4.6.0  |
| `tabBarGutter`                          | `number`                                                                                 | –                                                  | Gap between tabs                                 |                     |
| `tabBarStyle`                           | `CSSProperties`                                                                          | –                                                  | Inline style for the tab bar                     |                     |
| `tabPlacement`                          | `top \| end \| bottom \| start`                                                          | `top`                                              | Placement of the tab bar                         |                     |
| `tabPosition` _(deprecated)_            | `top \| right \| bottom \| left`                                                         | `top`                                              | Use `tabPlacement` instead                       |                     |
| `destroyInactiveTabPane` _(deprecated)_ | `boolean`                                                                                | `false`                                            | Use `destroyOnHidden` instead                    |                     |
| `destroyOnHidden`                       | `boolean`                                                                                | `false`                                            | Destroy inactive `TabPane` DOM when switching    | 5.25.0              |
| `type`                                  | `line \| card \| editable-card`                                                          | `line`                                             | Basic visual style of the tabs                   |                     |
| `onChange`                              | `(activeKey: string) => void`                                                            | –                                                  | Fires when the active tab changes                |                     |
| `onEdit`                                | `(action === 'add' ? event : targetKey, action) => void`                                 | –                                                  | Fires on add/remove, `type="editable-card"` only |                     |
| `onTabClick`                            | `(key: string, event: MouseEvent) => void`                                               | –                                                  | Fires when a tab is clicked                      |                     |
| `onTabScroll`                           | `({ direction: left \| right \| top \| bottom }) => void`                                | –                                                  | Fires when the tab bar scrolls                   | 4.3.0               |

**`TabItemType`** (the shape of each entry in `items`)

| Prop                                    | Type        | Default | Description                                                        | Version |
| --------------------------------------- | ----------- | ------- | ------------------------------------------------------------------ | ------- |
| `key`                                   | `string`    | –       | Tab's unique key                                                   |         |
| `label`                                 | `ReactNode` | –       | Tab header text/element                                            |         |
| `icon`                                  | `ReactNode` | –       | Tab header icon                                                    | 5.12.0  |
| `children`                              | `ReactNode` | –       | Tab panel content                                                  |         |
| `disabled`                              | `boolean`   | `false` | Disable this tab                                                   |         |
| `closable`                              | `boolean`   | `true`  | Show the close (×) button, `type="editable-card"` only             |         |
| `closeIcon`                             | `ReactNode` | –       | Custom close icon; `null`/`false` hides the button                 | 5.7.0   |
| `destroyInactiveTabPane` _(deprecated)_ | `boolean`   | `false` | Use `destroyOnHidden` instead                                      | 5.11.0  |
| `destroyOnHidden`                       | `boolean`   | `false` | Destroy this pane's DOM when inactive                              | 5.25.0  |
| `forceRender`                           | `boolean`   | `false` | Pre-render content instead of lazily rendering on first activation |         |

**`MoreProps`** (the overflow-menu configuration)

| Prop          | Type                                                                                   | Default | Description                                   | Version |
| ------------- | -------------------------------------------------------------------------------------- | ------- | --------------------------------------------- | ------- |
| `icon`        | `ReactNode`                                                                            | –       | Custom "more" icon                            |         |
| `popupRender` | `(menu: ReactElement, info: { restTabs: Tab[], onClose: () => void }) => ReactElement` | –       | Customize the dropdown menu render            | 6.6.0   |
| _(inherits)_  | —                                                                                      | —       | Also accepts other `Dropdown` component props |         |

## 3. Variants, sizes and states

### shadcn/ui

- `TabsList` `variant`: `"default"` (pill/segmented, `bg-muted` background) or `"line"` (transparent background, animated underline via an `after:` pseudo-element on the active trigger).
- `orientation`: `"horizontal"` (default) or `"vertical"` — controlled on `Tabs`, propagated as `data-orientation` and consumed by Tailwind `group-data-*` selectors in `TabsList`/`TabsTrigger` to flip flex direction, sizing, and which edge the active-indicator pseudo-element sits on.
- No dedicated `size` prop — sizing is purely via `className` overrides on `TabsTrigger`/`TabsList`.
- States (as `data-*` attributes): active tab → `data-state="active"`/`data-active`; disabled trigger → `data-disabled` (and `aria-disabled`); inactive panel → `data-hidden` (from Base UI's `Tabs.Panel`); orientation is mirrored as `data-orientation` on every part.

### Ant Design

- `type`: `line` (default, underline indicator), `card` (enclosed card-style tabs — does **not** support vertical placement), `editable-card` (card tabs with add/remove buttons).
- `tabPlacement`: `top` (default), `bottom`, `start` (vertical, left in LTR), `end` (vertical, right in LTR). Legacy `tabPosition` uses physical `left`/`right` instead of logical `start`/`end`.
- `size`: `large | medium | small`, default `medium`.
- States: active tab (`activeKey`), disabled tab (`items[].disabled`), closable/close-button visibility (`items[].closable`, `editable-card` only), animated switching (`animated` — separately controls the ink-bar slide and the pane cross-fade).

## 4. Accessibility

### shadcn/ui (via Base UI)

- ARIA roles: Base UI's Tabs implementation renders the WAI-ARIA "Tabs" pattern — a `tablist` container, `tab` elements (with `aria-selected`), and `tabpanel` elements — confirmed by the rendered demo markup on `base-ui.com` (`role="tablist"`, `role="tab"`, `aria-selected` all present in the live demos).
- Keyboard interaction is governed by two `Tabs.List` props rather than published as a fixed key-by-key table on the Base UI docs page:
  - **Arrow keys** (Left/Right when `orientation="horizontal"`, Up/Down when `orientation="vertical"`) move focus between tabs.
  - **`activateOnFocus`** (default `false`): when `true`, moving focus with the arrow keys immediately activates that tab too ("automatic" activation per the WAI-ARIA APG); when `false` (the default), arrow keys only move focus and the user must press **Enter** or **Space** to activate the focused tab ("manual" activation).
  - **`loopFocus`** (default `true`): arrow-key focus wraps from the last tab to the first and vice versa.
  - Base UI's own docs do not publish an explicit Home/End row for this component; Home/End "jump to first/last tab" is the WAI-ARIA APG convention for tabs but is **not independently confirmed** from the fetched docs text — verify against the rendered widget before assuming it, rather than treating it as documented.
- `Tabs.Panel` sets `data-hidden` (and is removed from the accessibility tree) when its tab isn't active, unless `keepMounted` is used.

### Ant Design

- The rendered demo markup exposes `role="tab"` and `role="tabpanel"` on the tab headers and panels respectively (confirmed directly from the docs page HTML — 143 and 21 occurrences respectively across the page's live demos).
- No `role="tablist"`, explicit keyboard-interaction table, or `aria-selected`/`aria-controls` wiring is documented in prose on the page — treat those as **unconfirmed** (plausible given the `tab`/`tabpanel` roles already found, but not verified in the fetched content) rather than assumed.

## 5. Design tokens

### shadcn/ui

Global CSS variables referenced (from the actual registry source):

- `TabsList` background (`variant="default"`) → `bg-muted` (i.e. `--muted`); text → `text-muted-foreground` (i.e. `--muted-foreground`)
- Active trigger background (`variant="default"`) → `bg-background`/`bg-input/30` (dark) (i.e. `--background`/`--input`); active text → `text-foreground` (i.e. `--foreground`)
- Trigger hover text → `text-foreground`
- Focus-visible ring → `border-ring` / `ring-ring/50` (i.e. `--ring`)
- Disabled → reduced opacity, no dedicated variable
- `variant="line"` active-tab underline → `after:bg-foreground` (i.e. `--foreground`)
- Dark-mode active trigger border → `dark:border-input` (i.e. `--input`)

### Ant Design

Component-specific Design Token table (full, from the Tabs docs page):

| Token                     | Description                            | Default value      |
| ------------------------- | -------------------------------------- | ------------------ |
| `cardBg`                  | Background of card-style tabs          | `rgba(0,0,0,0.02)` |
| `cardGutter`              | Gutter between card tabs               | `2`                |
| `cardHeight`              | Height of a card tab                   | `40`               |
| `cardHeightLG`            | Height of a large card tab             | `48`               |
| `cardHeightSM`            | Height of a small card tab             | `32`               |
| `cardPadding`             | Padding of a card tab                  | `8px 16px`         |
| `cardPaddingLG`           | Padding of a large card tab            | `11px 16px`        |
| `cardPaddingSM`           | Padding of a small card tab            | `4px 8px`          |
| `horizontalItemGutter`    | Gutter of horizontal tabs              | `32`               |
| `horizontalItemMargin`    | Margin of a horizontal tab item        | (empty)            |
| `horizontalItemMarginRTL` | Margin of a horizontal tab item (RTL)  | (empty)            |
| `horizontalItemPadding`   | Padding of a horizontal tab item       | `12px 0`           |
| `horizontalItemPaddingLG` | Padding of a large horizontal tab item | `16px 0`           |
| `horizontalItemPaddingSM` | Padding of a small horizontal tab item | `8px 0`            |
| `horizontalMargin`        | Margin of the horizontal tab bar       | `0 0 16px 0`       |
| `inkBarColor`             | Color of the active indicator          | `#1677ff`          |
| `itemActiveColor`         | Text color of the active (pressed) tab | `#0958d9`          |
| `itemColor`               | Text color of a tab                    | `rgba(0,0,0,0.88)` |
| `itemHoverColor`          | Text color of a hovered tab            | `#4096ff`          |
| `itemSelectedColor`       | Text color of the selected tab         | `#1677ff`          |
| `titleFontSize`           | Font size of the tab title             | `14`               |
| `titleFontSizeLG`         | Font size of a large tab title         | `16`               |
| `titleFontSizeSM`         | Font size of a small tab title         | `14`               |
| `verticalItemMargin`      | Margin of a vertical tab item          | `16px 0 0 0`       |
| `verticalItemPadding`     | Padding of a vertical tab item         | `8px 24px`         |
| `zIndexPopup`             | z-index of the overflow dropdown       | `1050`             |

Global Seed/Alias tokens this component's tokens derive from (per the docs page and the shared `customize-theme` reference):

| Token                                                                | Description                                                         | Default value                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `colorBgContainer`                                                   | Container background                                                | `#ffffff`                                                                                         |
| `colorBorder` / `colorBorderSecondary`                               | Divider under the tab bar (`line` type)                             | `#d9d9d9` / `#f0f0f0`                                                                             |
| `colorIcon`                                                          | Weak-action icons (e.g. the "more" overflow icon)                   | `rgba(0,0,0,0.45)`                                                                                |
| `colorPrimaryBorder`                                                 | Stroke accents                                                      | `#91caff`                                                                                         |
| `colorText` / `colorTextDisabled` / `colorTextHeading`               | Text colors that `itemColor`/`itemActiveColor` etc. are seeded from | `rgba(0,0,0,0.88)` / `rgba(0,0,0,0.25)` / `rgba(0,0,0,0.88)`                                      |
| `borderRadius` / `borderRadiusLG`                                    | Corner rounding for card tabs                                       | `6` / `8`                                                                                         |
| `boxShadowSecondary`                                                 | Shadow for the overflow dropdown                                    | `0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12), 0 9px 28px 8px rgba(0,0,0,0.05)` |
| `controlHeight` / `controlHeightLG`                                  | Base control heights informing `cardHeight`/`cardHeightLG`          | `32` / `40`                                                                                       |
| `controlItemBgHover`                                                 | Hover background for the overflow menu's items                      | `rgba(0,0,0,0.04)`                                                                                |
| `fontFamily`, `fontSize`, `fontSizeSM`, `lineHeight`, `lineHeightLG` | Base typography                                                     | as in Progress's table                                                                            |
| `lineType`, `lineWidth`, `lineWidthBold`, `lineWidthFocus`           | Border style/width scale for the ink bar and dividers               | `solid` / `1` / `2` / `3`                                                                         |
| `margin`, `marginSM`, `marginXS`, `marginXXS`                        | Spacing scale feeding the `*Margin`/`*Gutter` tokens                | `16` / `12` / `8` / `4`                                                                           |
| `motionDurationMid` / `motionDurationSlow`                           | Drive the ink-bar slide and pane cross-fade (`animated` prop)       | `0.2s` / `0.3s`                                                                                   |
| `motionEaseInOut` / `motionEaseInQuint` / `motionEaseOutQuint`       | Easing curves for the same animations                               | see Accordion/Collapse table for exact curve values                                               |
| `paddingLG`, `paddingSM`, `paddingXXS`                               | Padding scale feeding the `*Padding` tokens                         | `24` / `12` / `4`                                                                                 |

`inkBarColor` / `itemSelectedColor` default directly to `colorPrimary`'s default (`#1677ff`), and `itemActiveColor`/`itemHoverColor` are `colorPrimary`'s "active"/"hover" map-token shades — i.e. these are effectively `colorPrimary`-derived even though listed as flat component tokens.

## 6. Notes for andes-ng implementation

- **This needs a dedicated behavior primitive**: a roving-tabindex keyboard-navigation controller for the `tablist`/`tab` pair, implementing the WAI-ARIA APG "Tabs" pattern — Arrow keys move a single shared `tabindex="0"` between tab buttons (all others get `tabindex="-1"`), with a configurable "automatic" (activate on arrow-focus) vs. "manual" (activate on Enter/Space) mode, `loop`-at-the-ends behavior, and Home/End jumping to the first/last non-disabled tab. This should live in `@andes-ng/primitives` (e.g. `AndesRovingTabindex` or similar) since the exact same mechanism is needed again for Accordion headers and any future toolbar/menu-like widget — do not special-case it inside the Tabs component alone.
- Token mapping to `packages/tokens/src/theme.css`: `TabsList` background → `--andes-color-muted`; active trigger background → `--andes-color-background`; active/selected text → `--andes-color-primary` (parity with both libraries picking primary for the active-tab indicator/text); inactive tab text → `--andes-color-muted-foreground`; disabled → reduced opacity; focus ring → `--andes-color-focus-ring`. Missing token to flag: no shared `--andes-motion-duration-*`/`--andes-motion-ease-*` tokens exist yet in `theme.css` (same gap noted in progress.md and accordion-collapse.md) — needed for the ink-bar slide / underline transition and for any `animated` pane cross-fade; add these once, shared across Tabs/Accordion/Progress, rather than per-component ad hoc durations.
- Accessibility pitfall to flag explicitly: **keyboard navigation must move focus AND selection together only in "automatic" activation mode, and must move focus alone (activation deferred to Enter/Space) in "manual" mode** — this is the core WAI-ARIA APG distinction Base UI models via `activateOnFocus`. A naive Angular implementation that just wires `(keydown.arrowRight)` to "focus and select the next tab" unconditionally would only satisfy one of the two documented behaviors and would diverge from what both shadcn (via Base UI) and the WAI-ARIA APG pattern define as correct. Also ensure the panel's `id`/`aria-labelledby` and the tab's `aria-controls`/`id` are cross-linked — neither reference library's fetched docs text explicitly confirmed this wiring in prose, so it must be implemented deliberately rather than assumed to "come for free."
