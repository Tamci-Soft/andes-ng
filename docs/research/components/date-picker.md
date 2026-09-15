# Date Picker

## 1. Anatomy / compound structure

### shadcn/ui
There is **no monolithic `DatePicker` component** in shadcn/ui. The docs state explicitly: *"A date picker is built from `Popover` and `Calendar` (there is no `DatePicker` root component)."* It's a composition recipe, not a registry component you `add` by that name. The documented composition:

```
Popover
├── PopoverTrigger  →  Button (styled to look like a text input, shows the formatted selected date + a calendar icon)
└── PopoverContent
    └── Calendar     →  built on react-day-picker
```

- `Popover` / `PopoverTrigger` / `PopoverContent` — from `@/components/ui/popover`, itself built on **Base UI**'s `Popover` primitive (`Popover.Root`, `Trigger`, `Positioner`, `Popup`, `Title`, `Description`, `Close`, `Arrow`, plus `Portal`/`Backdrop`/`Viewport`) as of the current (2026) docs — verify per-installation since Radix/React Aria builds also exist.
- `Calendar` — from `@/components/ui/calendar`, a thin wrapper around **react-day-picker** (`DayPicker`). This is the actual date-grid rendering engine; a Persian-calendar variant is available by importing from `react-day-picker/persian` instead of the default Gregorian build.
- `Button` — from `@/components/ui/button`, used purely as the trigger's visual style.
- Other pieces used across the docs' example variants: `format` from `date-fns` (display formatting), `Calendar as CalendarIcon` from `lucide-react` (trigger icon), and `chrono-node` (third-party) for the natural-language-input example.
- Documented example variants: basic single date, date range (two-value selection), "date of birth" (adds a `captionLayout="dropdown"` month/year picker in the caption instead of arrows-only), an input-field variant (typing a date directly, with the calendar as a supplementary picker), a date+time variant (Calendar plus a separate time `<input>`), a natural-language variant (free-text parsed via `chrono-node`), and an RTL example.

### Ant Design
- `DatePicker` — the main component; behavior for week/month/quarter/year selection is controlled by its `picker` prop (`date` (default) `| week | month | quarter | year`), **not** via separate exported components. (Older Ant Design major versions exposed `WeekPicker`/`MonthPicker` etc. as distinct components; the current docs describe these exclusively as `picker` prop values, e.g. `DatePicker[picker='month']`.)
- `DatePicker.RangePicker` — static property; two-input range selector sharing most of `DatePicker`'s API plus range-specific props.
- No other static properties/sub-components are documented on the current page.

## 2. Props / API

### shadcn/ui
Since there is no `DatePicker` component, the relevant API surface is `Calendar`'s props (react-day-picker) plus `Popover`'s open/close props.

**`Calendar`**

| Prop | Type | Default | Description |
|---|---|---|---|
| `mode` | `"single" \| "multiple" \| "range"` | `"single"` | Selection behavior |
| `selected` | `Date \| Date[] \| { from, to }` | — | Currently selected date(s), shape depends on `mode` |
| `onSelect` | function (shape depends on `mode`) | — | Fires when the selection changes |
| `disabled` | `Date[] \| Matcher \| Matcher[] \| (date) => boolean` | — | Marks dates as unselectable |
| `numberOfMonths` | `number` | `1` | How many month grids to render side by side |
| `showOutsideDays` | `boolean` | `true` | Show/hide leading/trailing days from adjacent months |
| `captionLayout` | `"label" \| "dropdown" \| "dropdown-months" \| "dropdown-years"` | `"label"` | Plain text caption vs. month/year `<select>` dropdown(s) |
| `timeZone` | `string` | — | IANA time zone for correct date handling across zones |
| `className` | `string` | — | Root element class |

**`Popover` (relevant props for a date picker trigger)**

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | — | Controlled open state |
| `onOpenChange` | `(open) => void` | — | Fires when the popover opens/closes (e.g. to close it right after a date is picked) |
| `modal` | `boolean` | `false` | Whether the popover traps focus / is modal |

### Ant Design

**Common API** (shared by `DatePicker` and `DatePicker.RangePicker`)

| Property | Description | Type | Default |
|---|---|---|---|
| `allowClear` | Customize the clear button | `boolean \| { clearIcon?: ReactNode }` | `true` |
| `autoFocus` | Focus the input on mount | `boolean` | `false` |
| `className` | Picker class name | `string` | — |
| `classNames` | Semantic class overrides | `Record \| (info) => Record` | — |
| `cellRender` | Custom rendering for picker cells | `(current, info) => ReactNode` | — |
| `components` | Custom sub-panels | `Record` | — |
| `defaultOpen` | Initial open state | `boolean` | — |
| `defaultValue` | Initial selected date | `dayjs` | — |
| `disabled` | Disable the picker | `boolean` | `false` |
| `disabledDate` | Specify dates that cannot be selected | `(currentDate, info) => boolean` | — |
| `format` | Date display/parsing format(s) | `string \| string[] \| function` | `YYYY-MM-DD` (varies by `picker`) |
| `getPopupContainer` | Mount point for the popup | `(triggerNode) => HTMLElement` | — |
| `inputReadOnly` | Make the input `readonly` (useful on mobile to suppress the virtual keyboard) | `boolean` | `false` |
| `locale` | Localization config | `object` | built-in default |
| `minDate` | Minimum selectable date | `dayjs` | — |
| `maxDate` | Maximum selectable date | `dayjs` | — |
| `needConfirm` | Require a confirm click before the value commits | `boolean` | — |
| `nextIcon` | Custom "next" icon | `ReactNode` | — |
| `open` | Controlled open state | `boolean` | — |
| `panelRender` | Customize the whole panel's rendering | `(panelNode) => ReactNode` | — |
| `picker` | Panel type | `date \| week \| month \| quarter \| year` | `date` |
| `placeholder` | Input placeholder | `string \| [string, string]` | — |
| `placement` | Popup position relative to the input | `bottomLeft \| bottomRight \| topLeft \| topRight` | `bottomLeft` |
| `prefix` | Custom prefix content | `ReactNode` | — |
| `presets` | Preset ranges/values for quick selection | `Array<{ label, value }>` | — |
| `prevIcon` | Custom "previous" icon | `ReactNode` | — |
| `previewValue` | Whether hovering a cell temporarily previews its value | `false \| "hover"` | `"hover"` |
| `size` | Input box size | `large \| medium \| small` | — |
| `status` | Validation status styling | `error \| warning` | — |
| `style` | Inline style of the input box | `CSSProperties` | `{}` |
| `styles` | Semantic inline-style overrides | `Record \| (info) => Record` | — |
| `suffixIcon` | Custom suffix icon | `ReactNode` | — |
| `superNextIcon` | Custom "jump forward further" icon (e.g. next year in date panel) | `ReactNode` | — |
| `superPrevIcon` | Custom "jump back further" icon | `ReactNode` | — |
| `value` | Controlled selected date | `dayjs` | — |
| `variant` | Visual variant of the input box | `outlined \| borderless \| filled \| underlined` | `outlined` |
| `onChange` | Fires when the value changes | `(date, dateString) => void` | — |
| `onClear` | Fires when the clear button is clicked | `() => void` | — |
| `onOpenChange` | Fires when the popup opens/closes | `(open) => void` | — |
| `onPanelChange` | Fires when the panel's mode/view changes | `(value, mode) => void` | — |
| `showTime` | Enable time selection within the panel | `boolean \| object` | — |
| `showNow` | Show a "Now" shortcut button when `showTime` is enabled | `boolean` | — |
| `showToday` | Show a "Today" shortcut button | `boolean` | — |

**`DatePicker.RangePicker`-specific additions**

| Property | Description | Type | Default |
|---|---|---|---|
| `allowEmpty` | Allow the start and/or end input to remain empty | `[boolean, boolean]` | `[false, false]` |
| `disabled` | Disable start/end independently | `[boolean, boolean]` | — |
| `separator` | Custom divider between the two inputs | `ReactNode` | `<SwapRightOutlined />` |
| `id` | ids for the start/end inputs | `{ start: string, end: string }` | — |
| `showTime.defaultOpenValue` | Default time-panel value per side | `[dayjs, dayjs]` | `[dayjs(), dayjs()]` |
| `presets` | Same as common `presets`, but callback-based dynamic ranges are common here | `Array<{ label, value: () => [dayjs, dayjs] }>` | — |
| `onCalendarChange` | Fires as either boundary of the range changes (before both are committed) | `(dates, dateStrings, info) => void` | — |
| `onFocus` / `onBlur` | Include which side (`range: 'start' \| 'end'`) triggered the event | `(event, info: { range }) => void` | — |

## 3. Variants, sizes and states

### shadcn/ui
- No formal "variant" system; each documented example (single/range/multiple/vertical/dropdown-caption/input-combo/with-time/natural-language/RTL) is a different composition of `mode`, `captionLayout`, and surrounding markup rather than a prop enum on one component.
- `Calendar` states are the react-day-picker convention, expressed as CSS class names (not confirmed as `data-*` attributes in the fetched docs — react-day-picker's own styling docs describe them as class names, e.g. `selected`, `today`, `outside`, `disabled`, `range_start`, `range_middle`, `range_end`; treat exact attribute-vs-class mechanics as needing verification against the installed react-day-picker version rather than assumed).
- `Popover` open/closed state is standard Base UI popover behavior (see Accessibility below).

### Ant Design
- Picker "variant" is really the `picker` prop: `date | week | month | quarter | year`; there is no visually distinct "style variant" beyond the input's `variant` prop (`outlined | borderless | filled | underlined`).
- Sizes: `large | medium | small` via `size`.
- States: `disabled`, `status` (`error | warning`), open/closed (`open`/`onOpenChange`), range-mode with independently-disabled/empty-allowed sides on `RangePicker`.

## 4. Accessibility

### shadcn/ui (via Base UI Popover + react-day-picker)
- The `Popover` popup uses `role="dialog"` (per Base UI's Popover docs). Escape closes it; when `modal` is enabled, focus is trapped inside and returns to the trigger on close (or to a `finalFocus` target if specified); by default, focus moves to the first focusable element inside the popup on open, except on touch input where the popup itself receives focus.
- Popover exported parts relevant to a date picker: `Root`, `Trigger`, `Positioner`, `Popup`, `Title`, `Description`, `Close`, `Arrow` (plus `Portal`/`Backdrop`/`Viewport` for advanced cases).
- react-day-picker (per its dedicated accessibility guide, which follows the [WAI-ARIA datepicker-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)) documents this keyboard table for the calendar grid:

| Key | Behavior |
|---|---|
| Arrow Up | Move focus to the same day, previous week |
| Shift + Arrow Up | Move focus to the same day, previous year |
| Arrow Down | Move focus to the same day, next week |
| Shift + Arrow Down | Move focus to the same day, next year |
| Arrow Left | Move focus to the previous day |
| Shift + Arrow Left | Move focus to the same day, previous month |
| Arrow Right | Move focus to the next day |
| Shift + Arrow Right | Move focus to the same day, next month |
| Page Up | Move focus to the same day, previous month |
| Page Down | Move focus to the same day, next month |
| Shift + Page Up | Move focus to the same day, previous year |
| Shift + Page Down | Move focus to the same day, next year |
| Home | Move focus to the first day of the week |
| End | Move focus to the last day of the week |
| Enter / Space | Select the focused day |

- react-day-picker's `role` option accepts `"application"` or `"dialog"` for the overall widget, but the exact default role and whether individual day cells use `gridcell`/`grid` roles was not confirmed verbatim from the fetched docs excerpt — verify against the installed version before relying on it.

### Ant Design
- No ARIA role or attribute documentation is present anywhere on the DatePicker docs page (confirmed by an explicit search for "aria"/"accessib" turning up nothing) — a stated documentation gap, not a confirmed absence. Verify in the rendered DOM before relying on any specific role/attribute.

## 5. Design tokens

### shadcn/ui
No component-specific tokens exist (and no dedicated "DatePicker" tokens either, since it's a composition). Global CSS variables referenced by its parts:
- `Popover`/`PopoverContent` → `--popover` / `--popover-foreground` (surface background/text), `--border` (panel border)
- Trigger `Button` → `--primary`/`--secondary`/etc. per whichever Button variant is used (typically `outline`)
- `Calendar` selected day → `--primary` / `--primary-foreground`; today marker → `--accent`/`--accent-foreground` or a subtle `--muted` treatment; range-middle fill → `--accent`; outside-month days → `--muted-foreground`; disabled days → reduced-opacity `--muted-foreground`
- Focus-visible ring on a focused day cell or the trigger → `--ring`
- Corner radius of the popover panel and day cells → `--radius`

### Ant Design
Full component Design Token table (from the DatePicker docs page):

| Token | Description | Default value |
|---|---|---|
| `activeBg` | Background when the input is activated | `#ffffff` |
| `activeBorderColor` | Border color when active | `#1677ff` |
| `activeShadow` | Box-shadow when active | `0 0 0 2px rgba(5,145,255,0.1)` |
| `addonBg` | Background of the addon | `rgba(0,0,0,0.02)` |
| `cellActiveWithRangeBg` | Background of a cell inside a selected range | `#e6f4ff` |
| `cellBgDisabled` | Background of a disabled cell | `rgba(0,0,0,0.04)` |
| `cellHeight` | Height of a cell | `24` |
| `cellHoverBg` | Background of a hovered cell | `rgba(0,0,0,0.04)` |
| `cellHoverWithRangeBg` | Background of a hovered cell inside a range | `#cbe0fd` |
| `cellRangeBorderColor` | Border color of range-boundary cells | `#82b4f9` |
| `cellWidth` | Width of a cell | `36` |
| `errorActiveShadow` | Box-shadow when active in error status | `0 0 0 2px rgba(255,38,5,0.06)` |
| `hoverBg` | Background of the input on hover | `#ffffff` |
| `hoverBorderColor` | Border color of the input on hover | `#4096ff` |
| `inputFontSize` | Font size of the input | `14` |
| `inputFontSizeLG` | Font size of the large input | `16` |
| `inputFontSizeSM` | Font size of the small input | `14` |
| `multipleItemBg` | Background of a multiple-selection tag | `rgba(0,0,0,0.06)` |
| `multipleItemBorderColor` | Border color of a multiple-selection tag | `transparent` |
| `multipleItemBorderColorDisabled` | Border color of a disabled tag | `transparent` |
| `multipleItemColorDisabled` | Text color of a disabled tag | `rgba(0,0,0,0.25)` |
| `multipleItemHeight` | Height of a tag | `24` |
| `multipleItemHeightLG` | Height of a large tag | `32` |
| `multipleItemHeightSM` | Height of a small tag | `16` |
| `multipleSelectorBgDisabled` | Background of a disabled multiple selector | `rgba(0,0,0,0.04)` |
| `paddingBlock` | Vertical padding of the input | `4` |
| `paddingBlockLG` | Vertical padding of the large input | `7` |
| `paddingBlockSM` | Vertical padding of the small input | `0` |
| `paddingInline` | Horizontal padding of the input | `11` |
| `paddingInlineLG` | Horizontal padding of the large input | `11` |
| `paddingInlineSM` | Horizontal padding of the small input | `7` |
| `presetsMaxWidth` | Max width of the presets sidebar | `200` |
| `presetsWidth` | Width of the presets sidebar | `120` |
| `textHeight` | Height of cell text | `40` |
| `timeCellHeight` | Height of a time-column cell | `28` |
| `timeColumnHeight` | Height of a time column | `224` |
| `timeColumnWidth` | Width of a time column | `56` |
| `warningActiveShadow` | Box-shadow when active in warning status | `0 0 0 2px rgba(255,215,5,0.1)` |
| `withoutTimeCellHeight` | Cell height for decade/year/month/week panels (no time column) | `66` |
| `zIndexPopup` | z-index of the popup panel | `1050` |

These derive from global tokens: `colorPrimary` (→ `activeBorderColor`/`hoverBorderColor`/`cellRangeBorderColor` family), `colorError`/`colorWarning` (→ `errorActiveShadow`/`warningActiveShadow`), `colorBgContainer`/base white (→ `activeBg`/`hoverBg`), `fontSize`/`sizeStep` (→ `inputFontSize*`, `cellWidth`/`cellHeight`, `paddingInline*`/`paddingBlock*`), `controlHeight`/`controlHeightLG`/`controlHeightSM` (→ `multipleItemHeight*`), and `zIndexPopupBase` (→ `zIndexPopup`).

## 6. Notes for andes-ng implementation
- This is the component in this batch most clearly needing a **positioning primitive** in `@andes-ng/primitives` (floating/anchored panel placement, viewport-overflow flipping, `placement` options matching Ant's `bottomLeft/bottomRight/topLeft/topRight`) plus a **focus-trap/dismiss primitive** (Escape to close, click-outside to close, return focus to the trigger on close) — exactly what Base UI's Popover centralizes for shadcn. If andes-ng doesn't already have a popover/overlay primitive, building the date picker is the forcing function to add one, since both a custom Andes DatePicker panel and any future Select/Combobox/Tooltip-style component would reuse it.
- A second, calendar-specific primitive is needed for the day-grid itself: month/year navigation, keyboard grid navigation (the Arrow/Page/Home/End table above), single/multiple/range selection modes, and disabled-date predicates. This is meaningfully different logic from the positioning primitive and should likely be its own `AndesCalendarPrimitive` (or similar) rather than folded into the popover primitive.
- Token mapping to `packages/tokens/src/theme.css`: panel surface → `--andes-color-popover`/`--andes-color-card` equivalents (flag: andes-ng's tokens currently have `--andes-color-card`/`--andes-color-card-foreground` but **no dedicated `--andes-color-popover*` pair** the way shadcn does — worth adding if the popover surface should differ from card surfaces, e.g. needing its own elevation/shadow treatment); selected day → `--andes-color-primary`/`--andes-color-primary-foreground`; range-fill → `--andes-color-accent` (existing) or a new lighter primary tint (Ant's `cellActiveWithRangeBg`/`cellHoverWithRangeBg` are distinct light-blue tints with no direct andes-ng equivalent today — flag as a possible token gap, e.g. `--andes-color-primary-subtle`); today marker → `--andes-color-border`/`--andes-color-accent` outline; disabled/outside-month days → `--andes-color-muted-foreground`; focus ring on a focused day cell → `--andes-color-focus-ring`.
- Accessibility pitfalls to flag: (1) the trigger button must expose `aria-haspopup="dialog"` and `aria-expanded` reflecting the panel's open state, and the panel itself needs `role="dialog"` with focus properly trapped/returned — a purely CSS-driven show/hide without these ARIA/focus semantics would silently break screen-reader and keyboard users even though it "looks" fine visually; (2) each day cell's selected/disabled/today state must be exposed via real `aria-selected`/`aria-disabled`/`aria-current="date"` (or equivalent) on the actual focusable/interactive cell element, not just a CSS class — the same class of bug already found and fixed in `AndesButton` (attributes on a non-interactive host not reaching the real control); (3) boolean inputs like `disabled`, `open` (if exposed as an input), and range-mode's per-side `disabled`/`allowEmpty` should use Angular's `booleanAttribute`/array-input transforms so bare-attribute and tuple-like usages behave predictably, consistent with the `<x-switch checked>` pattern noted for Switch.
