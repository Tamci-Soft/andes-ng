# Card

## 1. Anatomy / compound structure

### shadcn/ui
Card is a purely presentational composition of `<div>`s — it is not built on Radix UI or Base UI at all (there is no interactive/behavioral primitive involved; it's static structural markup with Tailwind classes and `data-slot` attributes for styling hooks). Exported sub-components:
- `Card` — root container.
- `CardHeader` — groups the title, description, and an optional header-corner action; internally uses a grid layout so `CardAction` can sit in the top-right without extra markup juggling.
- `CardTitle` — the primary heading text.
- `CardDescription` — supporting/secondary text beneath the title.
- `CardAction` — places content (e.g. a button, badge, or menu trigger) in the header's top-right corner.
- `CardContent` — main body area for the card's primary content.
- `CardFooter` — bottom section, typically for actions or secondary content.

Composition hierarchy:
```
Card
├── CardHeader
│   ├── CardTitle
│   ├── CardDescription
│   └── CardAction
├── CardContent
└── CardFooter
```
Each part carries a `data-slot="card" | "card-header" | "card-title" | "card-description" | "card-action" | "card-content" | "card-footer"` attribute for targeted styling/testing, rather than relying on class-name matching alone. The root exposes a `--card-spacing` CSS custom property controlling internal inset consistently, and a `data-size` attribute (`"default"` or `"sm"`) that proportionally reduces that spacing. Edge-to-edge content (e.g. a table or image bleeding to the card's edges) is achieved with negative margins keyed to the same variable (`-mx-(--card-spacing)`, `-mb-(--card-spacing)`) rather than one-off overrides. Placing an image element before `CardHeader` is the documented pattern for a card-with-cover-image layout (there is no separate `CardImage`/`CardCover` sub-component).

### Ant Design
- `Card` — the root container; supports title, extra content, cover image, tabs, actions list, loading state, and hoverable elevation.
- `Card.Grid` — a static-property sub-component for building a grid of bordered cells inside a card (an alternative internal layout mode, not a separate card).
- `Card.Meta` — a static-property sub-component for a standard avatar+title+description metadata block, typically placed inside a card alongside a cover image.

## 2. Props / API

### shadcn/ui
| Sub-component | Prop | Type | Default | Description |
|---|---|---|---|---|
| `Card` | `className` | `string` | — | Standard Tailwind class passthrough (no other component-specific props are documented) |
| `CardHeader` | `className` | `string` | — | — |
| `CardTitle` | `className` | `string` | — | — |
| `CardDescription` | `className` | `string` | — | — |
| `CardAction` | `className` | `string` | — | Positions its children in the header's top-right corner via grid placement |
| `CardContent` | `className` | `string` | — | — |
| `CardFooter` | `className` | `string` | — | — |

None of the sub-components expose typed behavioral props (no `open`, `disabled`, etc.) — Card is styling/layout only. The only documented non-`className` knobs are the `data-size` attribute (`"default"`/`"sm"`, set directly as an HTML attribute rather than a typed React prop in the current docs) and the `--card-spacing` CSS variable.

### Ant Design
**`Card` props**
| Property | Description | Type | Default |
|---|---|---|---|
| `actions` | Action list, shown at the bottom of the card | `Array<ReactNode>` | — |
| `activeTabKey` | Current active tab's key (controlled) | `string` | — |
| `bordered` | **Deprecated** — use `variant` instead | `boolean` | `true` |
| `bodyStyle` | **Deprecated** — use `styles.body` instead | `CSSProperties` | — |
| `variant` | Card style variant | `"outlined" \| "borderless"` | `"outlined"` |
| `classNames` | Semantic DOM class overrides | `Record<SemanticDOM, string> \| function` | — |
| `cover` | Card cover content (e.g. an image) | `ReactNode` | — |
| `defaultActiveTabKey` | Initial active tab key (uncontrolled), if `activeTabKey` isn't set | `string` | first tab's key |
| `extra` | Content rendered in the top-right corner of the card | `ReactNode` | — |
| `headStyle` | **Deprecated** — use `styles.header` instead | `CSSProperties` | — |
| `hoverable` | Lift the card (shadow) on hover | `boolean` | `false` |
| `loading` | Show a loading skeleton/indicator while content loads | `boolean` | `false` |
| `size` | Card size | `"medium" \| "small"` (per the fetched page; historically also documented as `"default"|"small"`) | `"medium"` |
| `tabBarExtraContent` | Extra content in the tab bar | `ReactNode` | — |
| `tabList` | List of tab-pane head configs | `TabItemType[]` | — |
| `tabProps` | Props forwarded to the internal `Tabs` component | `TabsProps` | — |
| `title` | Card title | `ReactNode` | — |
| `type` | Card style type — `"inner"` for a nested/inset look, or unset | `string` | — |
| `styles` | Semantic DOM inline-style overrides | `Record<SemanticDOM, CSSProperties> \| function` | — |
| `onTabChange` | Fires when the active tab changes | `(key: string) => void` | — |

**`Card.Grid` props**
| Property | Description | Type | Default |
|---|---|---|---|
| `hoverable` | Lift the grid cell on hover | `boolean` | `true` |
| `className` | Custom class | `string` | — |
| `style` | Inline style | `CSSProperties` | — |

**`Card.Meta` props**
| Property | Description | Type | Default |
|---|---|---|---|
| `avatar` | Avatar or icon element | `ReactNode` | — |
| `description` | Description content | `ReactNode` | — |
| `title` | Title content | `ReactNode` | — |

## 3. Variants, sizes and states

### shadcn/ui
- No `variant` prop/enum at all — visual differences (bordered vs. not, shadowed vs. flat) are achieved purely via `className` overrides on `Card`, not a typed variant system (unlike `Button`'s `cva`-based `variant`/`size`).
- Sizing: only the two-value `data-size` (`"default"` / `"sm"`) attribute, which scales the shared `--card-spacing` value; there is no `"lg"` size documented.
- States: none are built in (no `disabled`/`loading`/`selected` state) — any interactive or loading state (e.g. a skeleton) must be composed by the consumer using other primitives (e.g. a `Skeleton` component) inside `CardContent`.

### Ant Design
- `variant`: `"outlined"` (default) vs `"borderless"` (the modern replacement for the deprecated boolean `bordered`).
- `size`: `"medium"` (default) vs `"small"` — affects header height/padding/font-size (see Design Token table).
- `type`: unset (default) vs `"inner"` — a nested-card visual style intended for cards placed inside other cards.
- States: `hoverable` (elevates with a shadow on hover), `loading` (shows a built-in skeleton/placeholder instead of children), tabbed state via `tabList`/`activeTabKey`/`defaultActiveTabKey` (a card can host an internal tab strip that switches its own content region).

## 4. Accessibility

### shadcn/ui
- Since Card renders plain `<div>` elements with no ARIA roles or attributes added, it carries **no implicit accessible semantics of its own** — it is a purely visual grouping. If `CardTitle` should be understood as a heading by assistive technology, the consumer is responsible for either using an actual heading element/`role="heading"` with `aria-level`, or ensuring the rendered tag (via `render`/`asChild`-style composition elsewhere in shadcn, not documented specifically for Card) is a real `<h2>`–`<h6>`. No keyboard interaction applies since the component is non-interactive by itself; any interactive elements placed inside (buttons in `CardAction`/`CardFooter`) carry their own native semantics.

### Ant Design
- No explicit ARIA role/attribute documentation is published for Card. It renders as a plain container `<div>` structure with a title/head region; whether the title renders as a real heading tag or a `<div>` with visual heading styling is **not documented** and should be verified in the rendered DOM rather than assumed. The internal `loading` skeleton state and `tabList` tab-switching behavior likely carry some accessibility affordances inherited from the composed `Skeleton`/`Tabs` components, but this is not spelled out on the Card page itself.

## 5. Design tokens

### shadcn/ui
No Card-specific tokens exist. Global CSS variables it uses:
- `--card` / `--card-foreground` — the component's own dedicated background/text pair (Card is one of the few shadcn primitives with tokens named directly after it, rather than reusing `--background`/`--popover`).
- `--border` — the card's outline when not using a shadow-only style.
- `--radius` — corner rounding.
- `--muted-foreground` — often used for `CardDescription`'s de-emphasized text color (by convention in generated Tailwind classes, not a hardcoded binding).
- `--card-spacing` — a Card-local (not global-palette) CSS variable controlling internal padding uniformly across header/content/footer, introduced specifically so consumers can override density without hunting down multiple padding utility classes.

### Ant Design
**Component Token**
| Token | Description | Type | Default |
|---|---|---|---|
| `actionsBg` | Background color of the actions list at the bottom of the card | `string` | `#ffffff` |
| `actionsLiMargin` | Margin of each item within the actions list | `string` | `12px 0` |
| `bodyPadding` | Padding of the card body | `number` | `24` |
| `bodyPaddingSM` | Padding of the card body, small size | `number` | `12` |
| `extraColor` | Text color of the `extra` (top-right) area | `string` | `rgba(0,0,0,0.88)` |
| `headerBg` | Background color of the card header | `string` | `transparent` |
| `headerFontSize` | Font size of the card header | `string \| number` | `16` |
| `headerFontSizeSM` | Font size of the card header, small size | `string \| number` | `14` |
| `headerHeight` | Height of the card header | `string \| number` | `56` |
| `headerHeightSM` | Height of the card header, small size | `string \| number` | `38` |
| `headerPadding` | Padding of the card header | `number` | `24` |
| `headerPaddingSM` | Padding of the card header, small size | `number` | `12` |
| `tabsMarginBottom` | Margin below the internal tab bar | `number` | `-17` |

**Relevant Global/Alias tokens it derives from** (per the page's Global Token section, cross-referenced with `https://ant.design/docs/react/customize-theme`): `colorBgContainer` (card surface background), `colorBorderSecondary` (the card's outline in `"outlined"` variant — a lighter/secondary border tone, distinct from the primary `colorBorder`), `colorFillAlter` (subtle alternating fill, e.g. for `type="inner"` nested cards), `colorIcon`, `colorPrimary` (active-tab indicator color when `tabList` is used), `colorText`/`colorTextDescription`/`colorTextHeading`, `borderRadiusLG` (Map token derived from the `borderRadius` Seed, default `6` → `8`), `boxShadowTertiary` (the `hoverable` elevation shadow), `fontFamily`, `fontSize`/`fontSizeLG` (Seed-derived scale feeding `headerFontSize`/`headerFontSizeSM`), `fontWeightStrong`, `lineHeight`, `lineType`/`lineWidth` (border style/width), `marginXS`/`marginXXS` (size-scale tokens derived from the `sizeStep`/`sizeUnit` Seed pair, default `4`), `motionDurationMid` (hover-lift transition speed), `padding`/`paddingLG` (feeding `bodyPadding`/`headerPadding`, both derived from the same size-scale as `marginXS` etc.).

## 6. Notes for andes-ng implementation

- Card needs **no new behavior primitive** in `@andes-ng/primitives` — both reference implementations agree it's a static compositional/layout component with no interaction state machine (unlike Tooltip/Dropdown/Table). The only thing worth centralizing is a shared "semantic slot" convention (mirroring shadcn's `data-slot` attributes) so `CardHeader`/`CardContent`/`CardFooter` etc. are reliably targetable in tests and by consumer CSS overrides — this is a documentation/convention decision, not a primitive.
- Token mapping: andes-ng's `packages/tokens/src/theme.css` already has a dedicated `--andes-color-card` / `--andes-color-card-foreground` pair — this maps directly onto both shadcn's `--card`/`--card-foreground` and, functionally, Ant's `colorBgContainer`-derived header/body backgrounds. `--andes-color-border` is the natural fit for the outlined variant's border (closest to Ant's `colorBorderSecondary`, though andes-ng currently only has one border token, not a primary/secondary pair — worth flagging if a lighter "secondary" border tone is wanted for Card specifically vs. Input/Table's border). `--andes-radius-lg` for corner rounding. No current andes-ng token for a hover-elevation shadow (Ant's `boxShadowTertiary`) — same elevation/shadow-scale gap already flagged in `tooltip.md`/`dropdown-menu.md`; Card's `hoverable` prop would need it too, so this is a good candidate to resolve once, centrally, rather than per component.
- Suggested API surface, synthesizing both references: `variant` (`"outlined" | "borderless"`, following Ant's modern naming over the deprecated `bordered` boolean, since that mirrors `AndesButton`'s existing `variant` string-enum convention already used elsewhere in the library), a `size`/`data-size` density toggle (`"default" | "sm"`, following shadcn's two-value simplicity over Ant's header-height-driven `medium`/`small`), and a `hoverable` boolean (Ant's naming, no shadcn equivalent) for the elevate-on-hover affordance.
- Accessibility pitfall to flag: neither reference documents whether the title renders as a real heading element. When implementing `AndesCardTitle`, default to rendering a semantic heading (or exposing a `level`/`as` input controlling `h2`–`h6`) rather than a plain `div`, so cards compose correctly into a page's heading outline — this is an easy thing for both reference libraries to get away with (visual-only headings) that Angular consumers building accessible dashboards will actually need.
