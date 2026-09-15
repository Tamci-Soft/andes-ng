# Comparativa de librerías de componentes UI

Investigación de referencia para priorizar qué componentes construir en `@andes-ng/ui` después de `Button`. Cubre librerías populares en general (no solo Angular) y compara Ant Design, shadcn/ui y MUI (Material UI) componente por componente.

## 1. Panorama de librerías más usadas (no solo Angular)

| Librería | Framework | Tipo | Popularidad (2026) | Estilo | Licencia | Mejor para |
|---|---|---|---|---|---|---|
| **MUI (Material UI)** | React | Componentes con estilo + theming | ~6.7M descargas/semana en npm — la más descargada | Emotion/CSS-in-JS, Material Design | MIT | Apps enterprise, mayor cobertura de componentes |
| **Radix UI** | React | Headless (primitivos sin estilo) | ~130M descargas/mes — headless más usado | Sin estilo, solo comportamiento/A11y | MIT | Base para diseños custom (es el motor debajo de shadcn) |
| **shadcn/ui** | React | Código que se copia al proyecto (no es paquete npm tradicional) | ~75k GitHub stars, crecimiento más rápido, default en proyectos Next.js/Tailwind | Tailwind CSS, basado en Radix | MIT | Equipos que quieren dueño total del código, sin dependencia de versión |
| **Ant Design** | React (+ NG-ZORRO para Angular, Vue) | Componentes con estilo | Muy usado en dashboards/admin enterprise, especialmente en China | CSS-in-JS propio (`cssinjs`) | MIT | Paneles admin, back-office, apps data-heavy |
| **Chakra UI** | React | Componentes con estilo, accesible por defecto | Popular en startups | Emotion/CSS-in-JS, sistema de props | MIT | Prototipado rápido con buena accesibilidad |
| **Mantine** | React | Componentes con estilo | 100+ componentes, 50+ hooks — el más completo después de MUI | CSS Modules / vanilla-extract | MIT | Alternativa moderna a MUI, buen DX |
| **Headless UI** | React, Vue | Headless | Mantenido por Tailwind Labs | Sin estilo | MIT | Complemento headless para proyectos Tailwind |
| **Fluent UI** | React | Componentes con estilo | Usado internamente por Microsoft (Office, Teams) | CSS-in-JS (Griffel) | MIT | Apps que necesitan verse "Microsoft 365" |
| **Bootstrap / React-Bootstrap** | Framework-agnostic / React | Componentes con estilo | Décadas de uso, sigue siendo enorme en sitios tradicionales | CSS clásico (Sass) | MIT | Sitios donde no importa un look genérico |
| **Angular Material** | Angular | Componentes con estilo | Librería oficial de Google para Angular | SCSS + CDK | MIT | Apps Angular que quieren Material Design "oficial" |
| **PrimeNG / PrimeReact / PrimeVue** | Angular / React / Vue | Componentes con estilo | 90+ componentes, el catálogo más grande | CSS + temas intercambiables | MIT | Cuando se necesita un componente muy específico (OrganizationChart, TreeTable, etc.) |
| **NG-ZORRO** | Angular | Componentes con estilo | Port oficial de Ant Design a Angular, mismo equipo | Less | MIT | Ver "Ant Design ya resuelto en Angular" |

**Conclusión clave:** MUI es la librería con estilo más usada en general (no solo la más completa), shadcn es la de más crecimiento y Radix es el motor headless que casi todos terminan usando por debajo. Por eso la comparación detallada abajo usa **Ant Design, shadcn/ui y MUI** — las tres representan tres enfoques distintos (data-heavy/enterprise, código propio sobre Tailwind, y componentes con theming tradicional).

---

## 2. Tabla resumen — quién tiene qué

`✓` = lo tiene nativo · `~` = existe mezclando otros componentes/props · `—` = no existe

| Componente | Ant Design | shadcn/ui | MUI |
|---|:---:|:---:|:---:|
| Button | ✓ | ✓ | ✓ |
| Input / Text Field | ✓ | ✓ | ✓ |
| Textarea | ~ (`Input.TextArea`) | ✓ | ✓ (`TextField multiline`) |
| Select | ✓ | ✓ | ✓ |
| Autocomplete / Combobox | ✓ | ✓ (`Combobox`) | ✓ |
| Checkbox | ✓ | ✓ | ✓ |
| Radio / Radio Group | ✓ | ✓ | ✓ |
| Switch | ✓ | ✓ | ✓ |
| Slider | ✓ | ✓ | ✓ |
| Date / Time Picker | ✓ | ~ (`Calendar` + `Popover`) | ✓ (paquete separado `x-date-pickers`) |
| Form (validación) | ✓ | ✓ (`Field` + react-hook-form) | ~ (sin wrapper propio, se integra con RHF) |
| Dialog / Modal | ✓ | ✓ | ✓ |
| Drawer / Sheet | ✓ | ✓ (`Sheet`) | ✓ |
| Popover | ✓ | ✓ | ✓ (`Popover`/`Popper`) |
| Tooltip | ✓ | ✓ | ✓ |
| Dropdown Menu | ✓ | ✓ | ✓ |
| Context Menu | ~ (`Dropdown trigger="contextMenu"`) | ✓ | — |
| Table / Data Table | ✓ | ✓ (`Table` + TanStack Table) | ✓ |
| Card | ✓ | ✓ | ✓ (+ `Paper`) |
| Avatar | ✓ | ✓ | ✓ |
| Badge / Tag / Chip | ✓ (`Badge` + `Tag`) | ✓ (`Badge`) | ✓ (`Badge` + `Chip`) |
| Alert | ✓ | ✓ | ✓ |
| Toast / Notification | ✓ (`Message`, `Notification`) | ✓ (`Toast`, vía `sonner`) | ✓ (`Snackbar`) |
| Progress | ✓ | ✓ | ✓ |
| Skeleton | ✓ | ✓ | ✓ |
| Tabs | ✓ | ✓ | ✓ |
| Accordion / Collapse | ✓ (`Collapse`) | ✓ | ✓ |
| Breadcrumb | ✓ | ✓ | ✓ |
| Pagination | ✓ | ✓ | ✓ |
| Stepper / Steps | ✓ | — | ✓ |
| Carousel | ✓ | ✓ | — |
| Command palette (Cmd+K) | — | ✓ | — |
| Tree / TreeSelect | ✓ | — | ✓ (`SimpleTreeView`) |
| Transfer | ✓ | — | ✓ (`Transfer List`) |
| Rate | ✓ | — | ✓ (`Rating`) |
| Timeline | ✓ | — | ✓ (Lab) |
| Statistic | ✓ | — | — |
| Result | ✓ | — | — |
| Watermark | ✓ | — | — |
| QRCode | ✓ | — | — |
| Speed Dial / Float Button | ✓ (`FloatButton`) | — | ✓ (`SpeedDial`) |
| Sidebar (app shell) | — | ✓ | — (se arma con `Drawer` + `AppBar`) |

---

## 3. Tablas detalladas por componente

### Button

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Variantes | `primary`, `default`, `dashed`, `text`, `link` | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` | `text`, `contained`, `outlined` |
| Colores semánticos | `danger`, colores del theme (`colorPrimary`, etc.) | vía `variant` + Tailwind classes | `primary`, `secondary`, `error`, `warning`, `info`, `success` |
| Tamaños | `large`, `middle`, `small` | `default`, `sm`, `lg`, `icon` | `small`, `medium`, `large` |
| Forma | `shape="circle"`, `shape="round"` | clases custom | `Fab` (circular) como componente aparte |
| Loading state | ✓ (`loading` prop, spinner integrado) | manual (se compone) | ✓ (`loading` prop desde v6, o patrón manual con `CircularProgress`) |
| Icon-only | ✓ | ✓ (`size="icon"`) | ✓ (`IconButton` como componente aparte) |
| Como link (`<a>`) | ✓ (`href` prop) | ✓ (`asChild` + `<a>`) | ✓ (`component="a"`) |
| Grupo de botones | ✓ (`Button.Group`) | ✓ (`Button Group`, nuevo) | ✓ (`ButtonGroup`) |
| Polimorfismo (`asChild`/`component`) | no | ✓ (`asChild` vía Radix Slot) | ✓ (`component` prop) |

### Input / Text Field

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Variantes visuales | `outlined`, `borderless`, `filled` | una sola (se customiza con clases) | `outlined`, `filled`, `standard` |
| Tamaños | `large`, `middle`, `small` | vía clases | `small`, `medium` |
| Prefijo/sufijo (iconos) | ✓ (`prefix`, `suffix`) | ~ (se compone manualmente con `Input Group`) | ✓ (`InputAdornment`) |
| Contador de caracteres | ✓ (`showCount`) | — | — |
| Clear button | ✓ (`allowClear`) | — | — |
| Estados de validación | `status="error"|"warning"` | vía `aria-invalid` + estilos propios | `error` prop + `helperText` |
| Label flotante | — | — | ✓ (variante `standard`/`filled`) |
| Grupo de inputs (addon) | ✓ (`Input.Group`, `addonBefore/After`) | ✓ (`Input Group`, nuevo) | ~ (se compone con `InputAdornment`) |

### Select

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Búsqueda integrada | ✓ (`showSearch`) | ✓ (usa `Command` internamente) | ✓ (via `Autocomplete`, el `Select` base no busca) |
| Multi-selección | ✓ (`mode="multiple"`, con tags) | ~ (se construye a mano) | ✓ (`multiple` prop) |
| Virtualización (listas largas) | ✓ | — (no nativo) | ✓ (`Autocomplete` soporta virtualización) |
| Opciones agrupadas | ✓ (`OptGroup`) | ✓ (`SelectGroup`) | ✓ (`ListSubheader`) |
| Carga asíncrona / remoto | ✓ (patrón documentado) | manual | manual |
| Selección con checkbox visual | ✓ | ✓ (`Combobox` con check) | ✓ (`Checkbox` dentro de `MenuItem`) |

### Checkbox / Radio Group

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Estado indeterminado | ✓ | ✓ | ✓ |
| Grupo con layout automático | ✓ (`Checkbox.Group`, `Radio.Group`) | manual (se itera) | ✓ (`RadioGroup` + `FormGroup`) |
| Variante "botón" (radio como tabs) | ✓ (`Radio.Button`) | — | — |
| Tamaños | — | — | ✓ (`small`, `medium`) |

### Switch

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Texto dentro del switch | ✓ (`checkedChildren`/`unCheckedChildren`) | — | — |
| Loading state | ✓ | — | — |
| Tamaños | `default`, `small` | — | `small`, `medium` |

### Slider

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Rango (dos handles) | ✓ (`range` prop) | ✓ (array de valores) | ✓ (array de valores) |
| Marks/steps etiquetados | ✓ (`marks`) | — | ✓ (`marks`) |
| Vertical | ✓ | ✓ (`orientation`) | ✓ (`orientation`) |
| Tooltip de valor | ✓ (integrado) | manual | ✓ (`valueLabelDisplay`) |

### Date / Time Picker

| Aspecto | Ant Design | shadcn/ui | MUI (`x-date-pickers`) |
|---|---|---|---|
| Rango de fechas | ✓ (`RangePicker`) | ~ (se compone con dos `Calendar`) | ✓ (`DateRangePicker`, Pro) |
| Selección de hora | ✓ (`TimePicker`, o `showTime`) | — (solo fecha vía `Calendar`) | ✓ (`TimePicker`, `DateTimePicker`) |
| Localización | ✓ (dayjs) | depende de `date-fns`/librería usada | ✓ (adapters intercambiables: date-fns, dayjs, luxon) |
| Presets rápidos ("Hoy", "Últimos 7 días") | ✓ | manual | ✓ (Pro) |
| Vista de calendario embebida | ✓ | ✓ (`Calendar` es el componente base) | ✓ (`DateCalendar`) |

### Form (validación)

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Wrapper propio | ✓ (`Form`, `Form.Item`) | ✓ (`Field`, integrado con react-hook-form + zod) | no tiene wrapper propio, se integra manual con RHF/Formik |
| Validación por schema | ✓ (reglas propias tipo `rules={[...]}`) | ✓ (zod/yup vía RHF) | manual |
| Layout automático de labels/errores | ✓ | ✓ | manual con `FormControl`/`FormHelperText` |

### Dialog / Modal

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Confirmación rápida (`confirm()`) | ✓ (`Modal.confirm`, API imperativa) | — (todo declarativo) | — |
| Tamaños predefinidos | ✓ | — (se define con clases) | ✓ (`maxWidth`) |
| Fullscreen | ✓ | ~ (manual) | ✓ (`fullScreen`) |
| Draggable | ~ (ejemplo documentado, no built-in) | — | — |
| Variante "destructiva" con foco reforzado | — | ✓ (`AlertDialog`, componente separado del `Dialog` normal) | — |

### Drawer / Sheet

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Posiciones | `top`, `right`, `bottom`, `left` | `top`, `right`, `bottom`, `left` | `left`, `right`, `top`, `bottom` |
| Anidable (drawers dentro de drawers) | ✓ | ~ (posible, sin soporte especial) | ~ |
| Variant permanente/persistente (para sidebars) | — | ✓ (`Sidebar` usa este patrón) | ✓ (`variant="permanent"`) |

### Popover / Tooltip

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Trigger configurable (hover/click/focus) | ✓ | ✓ (via Radix) | ✓ |
| Auto-posicionamiento (colisión con viewport) | ✓ | ✓ (Radix Popper) | ✓ (Popper.js) |
| Contenido rico (formularios dentro) | ✓ (`Popover`) | ✓ | ✓ |
| Tooltip con HTML enriquecido | ✓ | ✓ | ✓ (`title` acepta ReactNode) |

### Dropdown Menu / Context Menu

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Submenús anidados | ✓ | ✓ | ✓ |
| Items con checkbox/radio | ✓ | ✓ (`DropdownMenuCheckboxItem`/`RadioItem`) | ✓ |
| Menú contextual (click derecho) dedicado | ~ (mismo componente con `trigger`) | ✓ (`ContextMenu`, componente separado) | — (no nativo) |
| Atajos de teclado mostrados | — | ✓ (`DropdownMenuShortcut`) | manual |

### Table / Data Table

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Ordenamiento/filtrado integrado | ✓ (built-in, sin librería externa) | requiere TanStack Table (no es built-in) | ✓ (`DataGrid`, paquete separado `x-data-grid`) |
| Selección de filas | ✓ (`rowSelection`) | manual (vía TanStack Table) | ✓ (`checkboxSelection` en `DataGrid`) |
| Paginación integrada | ✓ | manual | ✓ (en `DataGrid`) |
| Columnas fijas (sticky) | ✓ | manual | ✓ (`DataGrid` Pro) |
| Expansión de filas | ✓ | manual | ✓ (`DataGrid` Pro) |
| Edición inline | ✓ | manual | ✓ (`DataGrid` Pro) |
| Virtualización | ✓ | manual (TanStack Virtual) | ✓ (nativo en `DataGrid`) |

### Card

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Secciones (header/body/footer/actions) | ✓ | ✓ (`CardHeader`, `CardContent`, `CardFooter`) | ✓ (`CardHeader`, `CardContent`, `CardActions`) |
| Hoverable con sombra | ✓ (`hoverable`) | manual (clase) | ✓ (`Card` + `raised` o custom) |
| Loading skeleton integrado | ✓ (`loading` prop) | — (se compone con `Skeleton`) | — (se compone con `Skeleton`) |
| Cover / media | ✓ (`cover`) | manual | ✓ (`CardMedia`) |

### Avatar

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Fallback (iniciales/icono si falla imagen) | ✓ | ✓ (`AvatarFallback`) | ✓ |
| Grupo de avatares apilados | ✓ (`Avatar.Group`) | manual | ✓ (`AvatarGroup`) |
| Formas | `circle`, `square` | circular por defecto (customizable) | `circular`, `rounded`, `square` |

### Badge / Tag / Chip

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Contador numérico (notificaciones) | ✓ (`Badge count`) | manual | ✓ (`Badge badgeContent`) |
| Punto de estado (dot) | ✓ | ✓ | ✓ (`variant="dot"`) |
| Etiqueta removible/cerrable | ✓ (`Tag closable`) | manual | ✓ (`Chip onDelete`) |
| Clickable/seleccionable | ✓ (`Tag.CheckableTag`) | manual | ✓ (`Chip clickable`) |

### Alert

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Tipos semánticos | `success`, `info`, `warning`, `error` | `default`, `destructive` (menos granular) | `success`, `info`, `warning`, `error` |
| Cerrable | ✓ (`closable`) | manual | ✓ (`onClose`) |
| Con acción embebida (botón) | ✓ (`action`) | manual | ✓ (`action` prop) |
| Banner (ancho completo, sin bordes) | ✓ (`banner`) | manual | manual |

### Toast / Notification / Snackbar

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| API imperativa (`toast.success(...)`) | ✓ (`message.success`, `notification.open`) | ✓ (vía `sonner`, no es 100% propio) | manual (`Snackbar` es declarativo, se orquesta con estado) |
| Posición configurable | ✓ | ✓ | ✓ |
| Stack de múltiples toasts | ✓ | ✓ | manual (una a la vez por defecto) |
| Con acción (deshacer, etc.) | ✓ | ✓ | ✓ (`action` prop) |

### Progress / Skeleton

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Circular + lineal | ✓ (`type="circle"|"line"|"dashboard"`) | ✓ (lineal nativo; circular se compone) | ✓ (`CircularProgress`, `LinearProgress`) |
| Indeterminado | ✓ | ✓ | ✓ |
| Skeleton con formas predefinidas (avatar+texto) | ✓ (`Skeleton avatar paragraph`) | manual (bloques genéricos) | manual (`variant="text"|"circular"|"rectangular"`) |

### Tabs

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Posición (top/left/right/bottom) | ✓ | ~ (manual con flex) | manual |
| Variante tipo "card" | ✓ (`type="card"`) | manual | manual |
| Cerrables (como pestañas de editor) | ✓ (`type="editable-card"`) | — | — |
| Scroll cuando hay muchas tabs | ✓ | manual | ✓ (`variant="scrollable"`) |

### Accordion / Collapse

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Múltiples paneles abiertos a la vez | ✓ (`accordion` prop controla si es exclusivo) | ✓ (`type="multiple"`) | ✓ (controlado manualmente) |
| Estilo "ghost" (sin bordes) | ✓ (`ghost`) | por defecto minimalista | manual |
| Animación de expansión | ✓ | ✓ | ✓ |

### Breadcrumb / Pagination

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Separador custom | ✓ | ✓ (`BreadcrumbSeparator`) | ✓ (`separator` prop) |
| Colapso de items intermedios ("...") | ~ (manual con `itemRender`) | ✓ (`BreadcrumbEllipsis`) | — |
| Pagination con salto rápido a página | ✓ (`showQuickJumper`) | manual | manual |
| Selector de tamaño de página | ✓ (`showSizeChanger`) | manual | ✓ (via `TablePagination`) |

### Stepper / Steps

| Aspecto | Ant Design | shadcn/ui | MUI |
|---|---|---|---|
| Existe nativo | ✓ (`Steps`) | — (no existe, se construiría con `@andes-ng/primitives`) | ✓ (`Stepper`) |
| Vertical | ✓ | — | ✓ |
| Con contenido expandible por paso | ✓ | — | ✓ (`StepContent`) |
| Progreso con porcentaje | ✓ (`percent` en el step activo) | — | — |

---

## 4. Componentes exclusivos por librería (no comparables, referencia)

**Solo en Ant Design:** Anchor, Affix, Cascader, ColorPicker, Mentions, Rate (Rating es su equivalente en MUI), Transfer, TreeSelect, Tour (onboarding guiado), Statistic, Result (páginas de éxito/error), Watermark, QRCode, Descriptions, Segmented, Splitter, Masonry, ConfigProvider (theming global runtime).

**Solo en shadcn/ui:** Command (paleta de comandos Cmd+K), Sidebar (patrón de app shell completo), Resizable (paneles redimensionables), Scroll Area (scrollbar custom), Aspect Ratio, Input OTP, Kbd (tecla de teclado estilizada), Chart (wrapper sobre Recharts), Empty (estado vacío), Item/Field (primitivos de layout de formulario), Attachment/Bubble/Message (componentes para UI de chat con IA — tendencia 2025-2026).

**Solo en MUI:** Speed Dial, Backdrop, Transfer List, Image List, Masonry (Lab), Timeline (Lab), Click-Away Listener, Popper/Portal (utilidades de bajo nivel expuestas como API pública), `useMediaQuery` (hook de breakpoints).

---

## 5. Lectura para `andes-ng`

- El **80% del valor** para un dashboard/back-office típico está en los ~20 componentes de la sección 3 marcados con más filas de features (Select, Table, Date Picker, Dialog, Form).
- Los más caros de construir bien (posicionamiento + foco + teclado) son **Select, Combobox, Date Picker, Dialog/Drawer, Dropdown/Context Menu, Table** — candidatos naturales para invertir en primitivos reutilizables en `@andes-ng/primitives` (positioning, focus-trap, portal) antes de construirlos, siguiendo el mismo patrón usado para `AndesButtonPrimitive`.
- Ant Design es la referencia más fuerte para **Table, Form y Date Picker** (más features nativas que shadcn o MUI base).
- shadcn/ui es la referencia más fuerte para **Command, Sidebar y patrones de composición** (su enfoque de componer primitivos pequeños en vez de un componente monolítico).
- MUI es la referencia más fuerte para **Data Grid, Stepper y utilidades de bajo nivel** (Popper, Portal) si se necesita ese nivel de control.
