# Table

## 1. Anatomy / compound structure

### shadcn/ui

shadcn actually ships **two distinct things** under "table," and the distinction matters:

**Plain `Table` (`docs/components/table`)** — just semantic HTML table wrappers with Tailwind classes, no behavior/state at all, no underlying primitive library:

- `Table` — wraps `<table>`, the container for tabular data.
- `TableHeader` — wraps `<thead>`, groups header row(s).
- `TableBody` — wraps `<tbody>`, groups data rows.
- `TableFooter` — wraps `<tfoot>`, groups footer row(s).
- `TableRow` — wraps `<tr>`, a horizontal row container.
- `TableHead` — wraps `<th>`, a header cell.
- `TableCell` — wraps `<td>`, a data cell.
- `TableCaption` — wraps `<caption>`, a title/description for the table.

The docs explicitly say you can use `<Table />` to build more complex data tables but recommend pairing it with `@tanstack/react-table` for sorting/filtering/pagination, linking out to the separate Data Table page.

**`Data Table` (`docs/components/data-table`)** — the real-world pattern, built on **TanStack Table** (`@tanstack/react-table`, the headless logic/state layer — this is explicitly a "headless" library with zero rendering opinions; shadcn's `Table` primitives above are typically used as the actual rendering layer on top of it). The current guide targets **TanStack Table v9**, which introduces a `tableFeatures()` tree-shakeable feature-registration pattern (a change from earlier v8-style "all features built in" architecture). Composed pieces shown in the guide:

- `columns.tsx` — `ColumnDef`/`createColumnHelper`-based column definitions (client component).
- `data-table.tsx` — the `DataTable` wrapper component that calls the table hook (`useTable` in v9 nomenclature) and renders `<Table>`/`<TableHeader>`/`<TableBody>`/`<TableRow>`/`<TableCell>` from the plain Table primitives, driven by `table.getHeaderGroups()` / `table.getRowModel().rows` / `table.getVisibleCells()` / a `flexRender` helper.
- `DataTableColumnHeader` — a sortable, hideable column header, typically with its own dropdown menu for sort/hide controls (built by composing Dropdown Menu).
- `DataTablePagination` — pagination controls: first/previous/next/last page buttons, page-size selector, and a "N of M rows selected" summary.
- `DataTableViewOptions` — a dropdown menu for toggling column visibility.
- Per-row actions — typically an inline `DropdownMenu` per row (not a single named exported component in the current guide) for actions like "copy ID" / "view details."
- The guide does not name dedicated `DataTableToolbar`/`DataTableRowActions`/`DataTableFacetedFilter` components (these existed in older versions of the shadcn examples repo but are not called out by those exact names in the current live guide) — treat those as optional patterns to compose yourself, not as documented exports.

### Ant Design

- `Table` — the main component; displays rows of data with built-in sorting, filtering, pagination, row selection, expandable rows, and fixed columns/headers.
- `Table.Column` — declarative alternative to the `columns` prop, for defining a column as JSX.
- `Table.ColumnGroup` — declarative grouped/multi-level column header, as JSX.
- `Table.Summary` — renders a fixed summary row (e.g. totals) pinned above/below the scrollable body.
- Internally, Table composes the separate `Pagination` component for its pagination UI and (for row selection) `Checkbox`/`Radio`.

## 2. Props / API

### shadcn/ui

**Plain `Table` parts** — no component-specific props beyond standard HTML attributes (`className`, native table/row/cell attributes) passed through; there is no dedicated props table because these are unstyled-logic-free wrappers.

**Data Table** — props exist at the TanStack Table hook level, not as a fixed component API. Key surface used by the pattern:

| API                                                                                               | Type / Shape                                                                                   | Description                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `columns`                                                                                         | `ColumnDef<TData, TValue>[]` (built via `createColumnHelper<TData>().accessor()`/`.display()`) | Column shape: id, header renderer, cell renderer, sizing, sorting/filtering hooks                                       |
| `data`                                                                                            | `TData[]`                                                                                      | Row data array                                                                                                          |
| table hook (`useTable` in v9, `useReactTable` in v8-era guides)                                   | —                                                                                              | Initializes the table instance from `columns`, `data`, a `tableFeatures()` registration object, and row-model factories |
| `getCoreRowModel()`                                                                               | row-model factory                                                                              | Always required; produces the base row model                                                                            |
| `createSortedRowModel()`                                                                          | row-model factory                                                                              | Enables sorting                                                                                                         |
| `createFilteredRowModel()`                                                                        | row-model factory                                                                              | Enables column filtering                                                                                                |
| `createPaginatedRowModel()`                                                                       | row-model factory                                                                              | Enables client-side pagination                                                                                          |
| `state.sorting`                                                                                   | `SortingState`                                                                                 | Controlled sorting state                                                                                                |
| `state.columnFilters`                                                                             | `ColumnFiltersState`                                                                           | Controlled filter state                                                                                                 |
| `state.columnVisibility`                                                                          | `ColumnVisibilityState`/`VisibilityState`                                                      | Controlled show/hide-column state                                                                                       |
| `state.rowSelection`                                                                              | object keyed by row id                                                                         | Controlled row-selection state                                                                                          |
| `onSortingChange` / `onColumnFiltersChange` / `onColumnVisibilityChange` / `onRowSelectionChange` | callbacks                                                                                      | Sync controlled state back from the table instance                                                                      |

Selected instance/column/row methods used throughout the guide: `table.getHeaderGroups()`, `table.getRowModel().rows`, `table.getVisibleCells()`, `table.previousPage()`/`table.nextPage()`, `table.getCanPreviousPage()`/`table.getCanNextPage()`, `table.setPageSize()`, `table.getPageCount()`, `table.setPageIndex()`, `table.getAllColumns()`, `table.getColumn(id)`, `table.getFilteredSelectedRowModel()`, `table.getFilteredRowModel()`, `table.getIsAllPageRowsSelected()`, `table.toggleAllPageRowsSelected()`; `column.toggleSorting()`, `column.getIsSorted()`, `column.toggleVisibility()`, `column.getCanHide()`, `column.getCanSort()`, `column.getFilterValue()`, `column.setFilterValue()`; `row.original`, `row.getIsSelected()`, `row.toggleSelected()`.

### Ant Design

**`Table` props**

| Property            | Description                                                       | Type                                             | Default                                    |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------ |
| `bordered`          | Show all table borders                                            | `boolean`                                        | `false`                                    |
| `classNames`        | Semantic DOM class overrides                                      | `Record<SemanticDOM, string> \| function`        | —                                          |
| `column`            | Shared props applied to every column                              | `Partial<ColumnType>`                            | —                                          |
| `columns`           | Column definitions                                                | `ColumnsType[]`                                  | —                                          |
| `components`        | Override default `<table>` DOM elements (for custom rendering)    | `TableComponents`                                | —                                          |
| `dataSource`        | Data record array                                                 | `object[]`                                       | —                                          |
| `expandable`        | Expandable-row configuration (see nested table below)             | `expandable` object                              | —                                          |
| `footer`            | Footer renderer                                                   | `(currentPageData) => ReactNode`                 | —                                          |
| `getPopupContainer` | Container for dropdowns (e.g. filter menus)                       | `(triggerNode) => HTMLElement`                   | table's own DOM node                       |
| `loading`           | Loading state                                                     | `boolean \| SpinProps`                           | `false`                                    |
| `locale`            | i18n text (filter/sort/empty-state copy)                          | `object`                                         | default English locale                     |
| `pagination`        | Pagination config (see nested table below), or `false` to disable | `object \| false`                                | —                                          |
| `rowClassName`      | Per-row class                                                     | `(record, index) => string`                      | —                                          |
| `rowKey`            | Unique row identifier                                             | `string \| ((record) => string)`                 | `"key"`                                    |
| `rowSelection`      | Row (checkbox/radio) selection config (see nested table below)    | `object`                                         | —                                          |
| `rowHoverable`      | Enable row hover highlight                                        | `boolean`                                        | `true`                                     |
| `scroll`            | Scroll config (see nested table below)                            | `object`                                         | —                                          |
| `showHeader`        | Show the table header                                             | `boolean`                                        | `true`                                     |
| `showSorterTooltip` | Show a tooltip on sortable column headers                         | `boolean \| TooltipProps`                        | `{ target: 'full-header' }`                |
| `size`              | Table density                                                     | `"large" \| "middle" \| "small"`                 | `"large"`                                  |
| `sortDirections`    | Supported sort-cycle directions                                   | `Array<"ascend"\|"descend">`                     | `['ascend', 'descend']`                    |
| `sticky`            | Sticky header (and optionally sticky scrollbar) config            | `boolean \| object`                              | —                                          |
| `styles`            | Semantic DOM inline-style overrides                               | `Record<SemanticDOM, CSSProperties> \| function` | —                                          |
| `summary`           | Fixed summary-row renderer                                        | `(currentData) => ReactNode`                     | —                                          |
| `tableLayout`       | CSS `table-layout`                                                | `"auto" \| "fixed"`                              | `"fixed"` (auto in some cases per version) |
| `title`             | Title renderer                                                    | `(currentPageData) => ReactNode`                 | —                                          |
| `virtual`           | Enable virtual scrolling for large datasets                       | `boolean`                                        | —                                          |
| `onChange`          | Fires on pagination/filter/sort change                            | `(pagination, filters, sorter, extra) => void`   | —                                          |
| `onHeaderRow`       | Set props on each header row                                      | `(columns, index) => object`                     | —                                          |
| `onRow`             | Set props on each body row                                        | `(record, index) => object`                      | —                                          |
| `onScroll`          | Body scroll callback                                              | `(event) => void`                                | —                                          |

**`Column` props**

| Property               | Description                                                                                                         | Type                                                        | Default                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| `align`                | Cell/header alignment                                                                                               | `"left" \| "right" \| "center"`                             | `"left"`                    |
| `className`            | Column class                                                                                                        | `string`                                                    | —                           |
| `colSpan`              | Header column span                                                                                                  | `number`                                                    | —                           |
| `dataIndex`            | Field to display, supports nested-path arrays                                                                       | `string \| string[]`                                        | —                           |
| `defaultFilteredValue` | Default filter values                                                                                               | `string[]`                                                  | —                           |
| `defaultSortOrder`     | Default sort order                                                                                                  | `"ascend" \| "descend"`                                     | —                           |
| `ellipsis`             | Truncate cell content with ellipsis                                                                                 | `boolean \| { showTitle?: boolean }`                        | `false`                     |
| `filterDropdown`       | Custom filter overlay content                                                                                       | `ReactNode \| ((props) => ReactNode)`                       | —                           |
| `filtered`             | Mark the column's dataSource as currently filtered (styling hint)                                                   | `boolean`                                                   | `false`                     |
| `filteredValue`        | Controlled filter value                                                                                             | `string[]`                                                  | —                           |
| `filterIcon`           | Custom filter icon                                                                                                  | `ReactNode \| ((filtered: boolean) => ReactNode)`           | —                           |
| `filterOnClose`        | Trigger filtering when the filter menu closes                                                                       | `boolean`                                                   | `true`                      |
| `filterMultiple`       | Allow multiple filter selections                                                                                    | `boolean`                                                   | `true`                      |
| `filterMode`           | Filter UI style                                                                                                     | `"menu" \| "tree"`                                          | `"menu"`                    |
| `filterSearch`         | Searchable filter menu                                                                                              | `boolean \| ((input, record) => boolean)`                   | `false`                     |
| `filters`              | Filter menu options                                                                                                 | `object[]`                                                  | —                           |
| `filterDropdownProps`  | Props forwarded to the filter's `Dropdown`                                                                          | `DropdownProps`                                             | —                           |
| `fixed`                | Pin column to an edge while scrolling                                                                               | `boolean \| "start" \| "end"` (formerly `"left"`/`"right"`) | `false`                     |
| `key`                  | Unique column identifier                                                                                            | `string`                                                    | —                           |
| `render`               | Cell content renderer                                                                                               | `(value, record, index) => ReactNode`                       | —                           |
| `responsive`           | Breakpoints at which the column is visible                                                                          | `Breakpoint[]`                                              | —                           |
| `rowScope`             | `scope` attribute on the cell                                                                                       | `"row" \| "rowgroup"`                                       | —                           |
| `shouldCellUpdate`     | Custom re-render guard for perf                                                                                     | `(record, prevRecord) => boolean`                           | —                           |
| `showSorterTooltip`    | Per-column override of the sorter tooltip                                                                           | `boolean \| TooltipProps`                                   | `{ target: 'full-header' }` |
| `sortDirections`       | Per-column override of supported sort directions                                                                    | `Array<"ascend"\|"descend">`                                | inherits Table's            |
| `sorter`               | Sort comparator, or `true` to defer sorting to `onChange`, or `{ multiple: number }` for multi-column sort priority | `function \| boolean \| { multiple: number }`               | —                           |
| `sortOrder`            | Controlled current sort order                                                                                       | `"ascend" \| "descend" \| null`                             | `null`                      |
| `sortIcon`             | Custom sort icon renderer                                                                                           | `(props) => ReactNode`                                      | —                           |
| `title`                | Column header content                                                                                               | `ReactNode \| ((props) => ReactNode)`                       | —                           |
| `width`                | Column width                                                                                                        | `string \| number`                                          | —                           |
| `minWidth`             | Minimum column width                                                                                                | `number`                                                    | —                           |
| `hidden`               | Hide the column                                                                                                     | `boolean`                                                   | `false`                     |
| `onCell`               | Extra props/attrs applied per cell                                                                                  | `(record, rowIndex) => object`                              | —                           |
| `onFilter`             | Filter predicate                                                                                                    | `(value, record) => boolean`                                | —                           |
| `onHeaderCell`         | Extra props/attrs applied to the header cell                                                                        | `(column) => object`                                        | —                           |

**`rowSelection` config**

| Property                  | Description                                                            | Type                                                | Default      |
| ------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- | ------------ |
| `type`                    | Checkbox or radio selection                                            | `"checkbox" \| "radio"`                             | `"checkbox"` |
| `selectedRowKeys`         | Controlled selected keys                                               | `(string\|number)[]`                                | `[]`         |
| `defaultSelectedRowKeys`  | Default selected keys                                                  | `(string\|number)[]`                                | `[]`         |
| `onChange`                | Selection change callback                                              | `(selectedRowKeys, selectedRows, info) => void`     | —            |
| `getCheckboxProps`        | Per-row extra checkbox/radio props                                     | `(record) => object`                                | —            |
| `getTitleCheckboxProps`   | Header ("select all") checkbox extra props                             | `() => object`                                      | —            |
| `onSelect`                | Single row select/deselect callback                                    | `(record, selected, selectedRows) => void`          | —            |
| `columnWidth`             | Width of the selection column                                          | `string \| number`                                  | `"32px"`     |
| `columnTitle`             | Custom header content for the selection column                         | `ReactNode \| function`                             | —            |
| `fixed`                   | Pin the selection column                                               | `boolean`                                           | —            |
| `hideSelectAll`           | Hide the "select all" header checkbox                                  | `boolean`                                           | `false`      |
| `checkStrictly`           | Decouple parent/child row selection in tree data                       | `boolean`                                           | `true`       |
| `preserveSelectedRowKeys` | Keep selected keys for rows removed from the current dataset           | `boolean`                                           | —            |
| `renderCell`              | Custom renderer for the selection cell                                 | `(checked, record, index, originNode) => ReactNode` | —            |
| `selections`              | Extra "selection" dropdown options (select all/invert/none, or custom) | `object[] \| boolean`                               | —            |
| `onCell`                  | Extra props on the selection cell                                      | `(record, rowIndex) => object`                      | —            |
| `align`                   | Alignment of the selection column                                      | `"left" \| "center" \| "right"`                     | `"left"`     |

**`expandable` config**

| Property                 | Description                                           | Type                                             | Default      |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------------ | ------------ |
| `childrenColumnName`     | Field holding nested child rows                       | `string`                                         | `"children"` |
| `columnTitle`            | Header of the expand column                           | `ReactNode`                                      | —            |
| `columnWidth`            | Width of the expand column                            | `string \| number`                               | —            |
| `defaultExpandAllRows`   | Expand all rows initially                             | `boolean`                                        | `false`      |
| `defaultExpandedRowKeys` | Default expanded keys                                 | `string[]`                                       | —            |
| `expandedRowClassName`   | Class for the expanded content row                    | `string \| ((record, index, indent) => string)`  | —            |
| `expandedRowKeys`        | Controlled expanded keys                              | `string[]`                                       | —            |
| `expandedRowRender`      | Renderer for the expanded row's content               | `(record, index, indent, expanded) => ReactNode` | —            |
| `expandIcon`             | Custom expand-icon renderer                           | `(props) => ReactNode`                           | —            |
| `expandRowByClick`       | Expand when clicking anywhere in the row              | `boolean`                                        | `false`      |
| `fixed`                  | Pin the expand icon column                            | `boolean \| "left" \| "right"`                   | `false`      |
| `forceRender`            | Render expanded content before it's actually expanded | `boolean`                                        | `false`      |
| `indentSize`             | Indent (px) per tree-data level                       | `number`                                         | `15`         |
| `rowExpandable`          | Predicate controlling whether a row can expand        | `(record) => boolean`                            | —            |
| `showExpandColumn`       | Show the expand column at all                         | `boolean`                                        | `true`       |
| `onExpand`               | Fires when a row's expand icon is clicked             | `(expanded, record) => void`                     | —            |
| `onExpandedRowsChange`   | Fires when the set of expanded rows changes           | `(expandedRows) => void`                         | —            |

**`scroll` config**

| Property                   | Description                              | Type                       | Default |
| -------------------------- | ---------------------------------------- | -------------------------- | ------- |
| `x`                        | Horizontal scroll / scroll-area width    | `string \| number \| true` | —       |
| `y`                        | Vertical scroll / scroll-area height     | `string \| number`         | —       |
| `scrollToFirstRowOnChange` | Scroll to top on page/sort/filter change | `boolean`                  | —       |

**`pagination`** — accepts the full `Pagination` component's own prop set (not restated here; the Table docs simply defer to it), plus a Table-specific `placement` prop:

| Property    | Description                               | Type                                                                                           | Default         |
| ----------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------- |
| `placement` | Where to render the pagination control(s) | `Array<"topStart"\|"topCenter"\|"topEnd"\|"bottomStart"\|"bottomCenter"\|"bottomEnd"\|"none">` | `['bottomEnd']` |

## 3. Variants, sizes and states

### shadcn/ui

Plain `Table` has no variant/size concept at all — purely structural markup. Data Table's "variants" are really feature toggles composed via TanStack Table's `tableFeatures()` registration (sorting, filtering, pagination, row selection, column visibility are each opt-in). States handled by the pattern: sorted column (`column.getIsSorted()` → `"asc"|"desc"|false`), hidden/visible column (`column.getCanHide()`/`toggleVisibility()`), selected row(s) (`row.getIsSelected()`/`toggleSelected()`, `table.getIsAllPageRowsSelected()`), current page / page size, and per-row disabled/loading states are left entirely to the consumer's own column/cell renderers (not built in).

### Ant Design

- `size`: `"large"` (default), `"middle"`, `"small"` — controls cell padding/font-size density.
- `bordered`: boolean, toggles all-cell borders.
- `tableLayout`: `"auto"` vs `"fixed"`.
- `loading`: boolean or full `Spin` props (shows an overlay spinner).
- States: sorted column (`sortOrder`: `"ascend"|"descend"|null`, with multi-column sort priority via `sorter: { multiple: n }`), filtered column (`filteredValue`, `filtered` flag), fixed/pinned column (`fixed: "start"|"end"` or legacy `"left"|"right"`), selected row(s) via `rowSelection` (`checkbox`/`radio` type), expanded row via `expandable` (`expandedRowKeys`), sticky header/scrollbar (`sticky`), disabled row/cell via `onRow`/`onCell` custom props or `getCheckboxProps`, virtual-scrolled large datasets (`virtual`).

## 4. Accessibility

### shadcn/ui (semantic HTML / via TanStack Table)

- Plain `Table` relies entirely on **native HTML table semantics**: the browser/AT exposes the implicit ARIA roles `table` (on `<table>`), `rowgroup` (on `<thead>`/`<tbody>`/`<tfoot>`), `row` (on `<tr>`), `columnheader` (on `<th>`), and `cell`/`gridcell` (on `<td>`) automatically — no explicit `role` attributes are added or needed as long as real `<table>`/`<th>`/`<td>` elements are used (which they are).
- `TableCaption` maps to `<caption>`, giving the table an accessible name/description for screen readers.
- Data Table's documented accessibility notes are narrow and example-specific: selection checkboxes carry explicit `aria-label` text — `"Select all"` on the header checkbox and `"Select row"` on each row checkbox — and icon-only buttons (e.g. a row's "open menu" trigger) include visually-hidden `<span className="sr-only">Open menu</span>` text. TanStack Table itself is headless/logic-only and defines no ARIA behavior; all accessibility is the responsibility of whatever markup the columns render (in this guide, the plain `Table` HTML primitives).
- No documented keyboard-navigation table (e.g. arrow-key cell navigation, `role="grid"` semantics) — this pattern renders a plain `<table>`, not an interactive `grid`, so there is no built-in keyboard traversal beyond native tab order through interactive cell content (checkboxes, buttons, links).

### Ant Design

- No explicit ARIA role/attribute table is published on the Table docs page. Table renders a real HTML `<table>` structure internally, so the same implicit native roles likely apply, but this is **not explicitly documented** by Ant — verify in the rendered DOM rather than assuming full parity (e.g. whether sorted-column headers get `aria-sort`, or selection checkboxes get descriptive `aria-label`s, is undocumented and should be checked directly).
- `showSorterTooltip` adds a tooltip hint on sortable headers but this is a UX affordance, not a documented accessibility feature.

## 5. Design tokens

### shadcn/ui

No Table-specific tokens exist (plain `Table` is unstyled structural markup + Tailwind border/text-muted classes; Data Table's chrome — pagination buttons, dropdown menus — reuses whatever tokens those composed components use). Global CSS variables plausibly referenced by the default generated styles:

- `--border` — row/cell border lines.
- `--muted` / `--muted-foreground` — header row background and header text, and/or zebra-striping if added.
- `--background` / `--foreground` — base table surface and text.
- `--accent` — row hover highlight (if implemented, typically a Tailwind hover utility rather than a fixed variable).
- `--radius` — corner rounding when the table is wrapped in a bordered container.

### Ant Design

**Component Token**

| Token                         | Description                                              | Type               | Default            |
| ----------------------------- | -------------------------------------------------------- | ------------------ | ------------------ |
| `headerBg`                    | Table header background                                  | `string`           | `#fafafa`          |
| `headerColor`                 | Header text color                                        | `string`           | `rgba(0,0,0,0.88)` |
| `headerBorderRadius`          | Header corner radius                                     | `number`           | `8`                |
| `headerSplitColor`            | Divider color between header cells                       | `string`           | `#f0f0f0`          |
| `headerFilterHoverBg`         | Filter icon/button hover background                      | `string`           | `rgba(0,0,0,0.06)` |
| `headerSortActiveBg`          | Sorted-column header background                          | `string`           | `#f0f0f0`          |
| `headerSortHoverBg`           | Sorted-column header hover background                    | `string`           | `#f0f0f0`          |
| `fixedHeaderSortActiveBg`     | Sorted header background when the header is fixed/sticky | `string`           | `#f0f0f0`          |
| `bodyBg`                      | Table body background                                    | `string`           | `#ffffff`          |
| `bodySortBg`                  | Sorted-column body background                            | `string`           | `#fafafa`          |
| `footerBg`                    | Footer background                                        | `string`           | `#fafafa`          |
| `footerColor`                 | Footer text color                                        | `string`           | `rgba(0,0,0,0.88)` |
| `rowHoverBg`                  | Row hover background                                     | `string`           | `#fafafa`          |
| `rowSelectedBg`               | Selected row background                                  | `string`           | `#e6f4ff`          |
| `rowSelectedHoverBg`          | Selected row hover background                            | `string`           | `#bae0ff`          |
| `rowExpandedBg`               | Expanded row (detail panel) background                   | `string`           | `rgba(0,0,0,0.02)` |
| `cellPaddingBlock`            | Vertical cell padding, `size="large"`                    | `number`           | `16`               |
| `cellPaddingBlockMD`          | Vertical cell padding, `size="middle"`                   | `number`           | `12`               |
| `cellPaddingBlockSM`          | Vertical cell padding, `size="small"`                    | `number`           | `8`                |
| `cellPaddingInline`           | Horizontal cell padding, `size="large"`                  | `number`           | `16`               |
| `cellPaddingInlineMD`         | Horizontal cell padding, `size="middle"`                 | `number`           | `8`                |
| `cellPaddingInlineSM`         | Horizontal cell padding, `size="small"`                  | `number`           | `8`                |
| `cellFontSize`                | Cell font size, `size="large"`                           | `number`           | `14`               |
| `cellFontSizeMD`              | Cell font size, `size="middle"`                          | `number`           | `14`               |
| `cellFontSizeSM`              | Cell font size, `size="small"`                           | `number`           | `14`               |
| `borderColor`                 | Border color between cells/rows                          | `string`           | `#f0f0f0`          |
| `expandIconBg`                | Expand-icon button background                            | `string`           | `#ffffff`          |
| `filterDropdownBg`            | Filter dropdown popup background                         | `string`           | `#ffffff`          |
| `filterDropdownMenuBg`        | Filter dropdown's menu item background                   | `string`           | `#ffffff`          |
| `selectionColumnWidth`        | Width of the row-selection column                        | `string \| number` | `32`               |
| `stickyScrollBarBg`           | Sticky scrollbar thumb background                        | `string`           | `rgba(0,0,0,0.25)` |
| `stickyScrollBarBorderRadius` | Sticky scrollbar thumb radius                            | `number`           | `100`              |

**Relevant Global/Alias tokens it derives from** (per the page's Global Token section, cross-referenced with `https://ant.design/docs/react/customize-theme`): `colorBgContainer` (base container background — feeds `bodyBg`), `colorFillQuaternary` (weakest neutral fill — feeds `rowExpandedBg`'s subtle tint), `colorText`/`colorTextDisabled`, `borderRadius` (Seed, default `6` → `headerBorderRadius`'s `8` is actually `borderRadiusLG`, the Map-token derivation), `fontSize`/`fontSizeSM` (Seed-derived scale feeding all the `cellFontSize*` rows, which — notably — are all `14` regardless of density, meaning Table's font-size doesn't actually shrink with `size`, only padding does), `lineHeight`. `rowSelectedBg`/`rowSelectedHoverBg` derive from the primary color scale (`colorPrimary` Seed → light-tint Alias tokens), not from a Table-specific seed.

## 6. Notes for andes-ng implementation

- This is the component most in need of a genuinely new **state-machine primitive** in `@andes-ng/primitives`: a headless sorting/filtering/pagination/row-selection engine analogous to TanStack Table's row-model pipeline, decoupled from rendering. Given Angular's CDK already ships `@angular/cdk/table` (a headless `CdkTable` with its own data-source abstraction) and `@angular/cdk/collections` (`SelectionModel`), the pragmatic path is likely: build `AndesTable` on top of `CdkTable` for the rendering/virtualization backbone, and use (or wrap) `SelectionModel` for row selection rather than reinventing TanStack's row-model concept from scratch. Sorting/filtering state (current sort column+direction, active filter predicates, multi-column sort priority) still needs its own small state container mirroring `SortingState`/`ColumnFiltersState`.
- A second, smaller primitive is needed for **column visibility/reordering** state (`ColumnVisibilityState` equivalent) if andes-ng wants feature parity with the Data Table pattern's `DataTableViewOptions`.
- Expandable rows (Ant's `expandable`) and TanStack's tree-data/sub-row support both imply a **row-expansion state primitive** (expanded-key set, indent level for nested rows) — worth deciding whether andes-ng's first Table release scopes this in or explicitly defers it, since it's a meaningfully separate feature from sorting/filtering/pagination.
- Token mapping: `--andes-color-muted` / `-muted-foreground` is the natural fit for the header background/text (closest existing pair to Ant's `headerBg`/`headerColor`); `--andes-color-accent-hover` for row hover (Ant's `rowHoverBg`); `--andes-color-primary` at low opacity, or a new derived token, for selected-row background (andes-ng has no light-tint primary background token today — Ant's `rowSelectedBg`/`rowSelectedHoverBg` are exactly this kind of tinted-primary token and there is currently no `--andes-color-primary-bg`/`-primary-bg-hover` equivalent in `packages/tokens/src/theme.css`; this is a real gap to flag, not just a naming exercise). `--andes-color-border` for cell/row borders. No existing andes-ng token for cell padding density presets (`cellPaddingBlock*`/`cellPaddingInline*` in Ant) — `--andes-space-*` exists and could be mapped to a `compact`/`default`/`comfortable` density scale for the eventual `size` input.
- Accessibility pitfall: if andes-ng's Table ever renders anything beyond a plain `<table>` (e.g. virtualized rows via `cdk-virtual-scroll-viewport`, which commonly breaks native table semantics because virtualization tends to remove rows from the DOM outside the viewport, and can require `role="table"`/`role="row"`/`role="cell"` to be applied manually plus `aria-rowcount`/`aria-rowindex` to communicate the true dataset size to assistive tech) — flag this explicitly to whoever implements virtual scrolling, since neither shadcn's Data Table guide nor Ant's docs give a real answer for this (Ant's own `virtual` prop has no documented accessibility notes at all).
