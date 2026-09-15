# Roadmap de construcción — complejidad y asignación de modelo

Basado en las 28 guías de `docs/research/components/`. Solo `Button` está construido. El resto se ordena por dependencia (primero lo que otros componentes necesitan) y se le asigna complejidad + modelo recomendado.

**Criterio de asignación:**
- **Opus** — componentes que introducen un patrón nuevo por primera vez (primitivo compartido, primer overlay, primer listbox) o donde un error es caro y difícil de detectar por review superficial (focus trap, cálculos de posición, lógica de rango/fecha).
- **Sonnet** — trabajo de ingeniería "normal": el patrón ya existe (un primitivo ya construido) y se trata de aplicarlo correctamente, con estados/variantes/tokens bien documentados en la guía.
- **Haiku** — presentacional puro: sin primitivo de comportamiento, sin gestión de foco/teclado, la guía ya deja los props/tokens exactos a copiar.

## Fase 0 — Primitivos compartidos (antes que nada)

| Primitivo | Complejidad | Modelo | Por qué | Bloquea a |
|---|---|---|---|---|
| **Overlay** (posicionamiento + portal + focus-trap + scroll-lock + z-index) | Muy alta | **Opus** | Un fallo de foco/scroll-lock es difícil de ver en review y se replica en 6 componentes | Dialog, Drawer/Sheet, Popover, Tooltip, Dropdown Menu, Select, Combobox, Date Picker |
| **Listbox / roving-tabindex + typeahead** | Alta | **Opus** | Define el patrón de estado compartido vía DI (respuesta a la pregunta 1) que todo compound component copiará después | Select, Combobox, Dropdown Menu, Tabs |

Ambos primitivos deberían pasar por una **revisión independiente** (otro agente Opus con contexto fresco, o `/code-review`) antes de que cualquier componente de fases posteriores dependa de ellos — un error aquí es el más caro de arreglar tarde.

## Fase 1 — Presentacional puro (paralelizable, sin dependencias)

| Componente | Complejidad | Modelo | Por qué |
|---|---|---|---|
| Card | Baja | **Haiku** | Layout puro, sin primitivo, sin estado |
| Badge / Tag | Baja | **Haiku** | Solo variantes de color + botón de cierre opcional |
| Alert | Baja | **Haiku** | Estático, variantes de color semántico ya definidas |
| Progress | Baja | **Haiku** | Sin comportamiento, solo `aria-valuenow` + ancho |
| Skeleton | Baja | **Haiku** | CSS puro (`animate-pulse`) |
| Breadcrumb | Baja | **Haiku** | Markup semántico + `aria-current`, sin primitivo |
| Textarea | Baja | **Haiku** | Extiende el patrón de `Input` con `autoSize` |

## Fase 2 — Controles de formulario simples (sin overlay)

| Componente | Complejidad | Modelo | Por qué |
|---|---|---|---|
| Input | Baja-media | **Sonnet** | Sienta el patrón de "form control" (estados de validación, addons) que Textarea ya siguió |
| Checkbox | Media | **Sonnet** | Estado indeterminado (propiedad DOM, no atributo) + `booleanAttribute` |
| Radio Group | Media | **Sonnet** | Con `<input type="radio">` nativo el roving-tabindex lo da el navegador gratis — no necesita el primitivo Listbox |
| Switch | Media | **Sonnet** | Similar a Checkbox, un solo control |
| Pagination | Media | **Sonnet** | Algoritmo de rango/ellipsis (qué números mostrar), sin primitivo de foco |

## Fase 3 — Los "primeros" de cada patrón (mayor riesgo)

| Componente | Complejidad | Modelo | Por qué |
|---|---|---|---|
| **Select** | Muy alta | **Opus** | Primer consumidor real del primitivo Listbox + Overlay juntos — el patrón que todo lo demás de esta fase copia |
| **Slider** | Alta | **Opus** | Matemática de arrastre (drag), modo rango con dos handles, pasos de teclado — fácil de romper en casos borde (RTL, límites) |
| **Dialog / Modal** | Muy alta | **Opus** | Primer consumidor real del primitivo Overlay — focus trap + restauración de foco + scroll-lock deben quedar perfectos aquí |

## Fase 4 — Aplican los patrones ya probados

| Componente | Complejidad | Modelo | Por qué |
|---|---|---|---|
| Combobox / AutoComplete | Alta | **Sonnet** | Reutiliza Select + Overlay, agrega filtrado por texto |
| Popover | Alta | **Sonnet** | Reutiliza Overlay, agrega posicionamiento por anchor |
| Dropdown Menu | Alta | **Sonnet** | Reutiliza Overlay + Listbox (submenús, items checkbox/radio) |
| Tooltip | Media | **Sonnet** | Reutiliza el posicionamiento del Overlay, sin focus-trap (no es modal) |
| Drawer / Sheet | Media-alta | **Sonnet** | Variante de Dialog con posiciones (`left/right/top/bottom`) |
| Tabs | Media-alta | **Sonnet** | Reutiliza el primitivo Listbox para roving-tabindex |
| Accordion / Collapse | Media | **Sonnet** | Estado expandido/colapsado + animación; Base UI confirma que NO lleva roving-focus (no copiar el patrón de Tabs aquí) |
| Avatar | Media | **Sonnet** | Máquina de estados de carga de imagen (loading/error/fallback) |
| Toast / Notification | Alta | **Sonnet** | Cola/stacking manager + auto-dismiss + `aria-live` — estado genuinamente delicado |
| Form | Media-alta | **Sonnet** (con revisión Opus) | Angular ya trae Reactive Forms; el trabajo real es la capa de layout/label/error alrededor — pero define una convención que todo el resto de formularios copiará, vale una revisión extra |

## Fase 5 — Los más grandes, al final (una vez probados los patrones)

| Componente | Complejidad | Modelo | Por qué |
|---|---|---|---|
| **Table** | Muy alta | **Opus** | Mayor superficie de decisiones de arquitectura: ordenamiento, selección, paginación, virtualización — el componente con más lógica de negocio de todos |
| **Date Picker** | Muy alta | **Opus** | Compone Popover + Calendar + lógica de rango + localización — la combinación más propensa a bugs sutiles de todo el catálogo |

## Cómo lo haría (flujo por componente, igual que Button)

1. **Leer la guía** en `docs/research/components/<componente>.md` — no adivinar props/tokens, ya están verificados contra la doc real.
2. **Implementar** el componente + su primitivo en `@andes-ng/primitives` si la guía dice que lo necesita.
3. **Tests unitarios** cubriendo cada variante/estado/prop listado en la sección 2-3 de la guía.
4. **Verificar en vivo en Storybook** (no solo build verde): interactuar con el componente real, revisar el panel de Accessibility, probar light/dark.
5. **Suite completa**: `pnpm exec nx run-many -t lint build test build-storybook` + `format:check`.
6. **Revisión de código** antes de mergear — obligatoria en Fase 0 y Fase 3 (donde se define el patrón); recomendada en el resto. Un agente con contexto fresco (no el que escribió el código) detecta más que el mismo agente releyendo su propio trabajo.
7. **Commit convencional + PR contra `develop`** (nunca commit directo a `develop` — la ironía es que yo mismo me equivoqué en esto hace un momento con el fix de tokens).
8. **Confirmar CI real** (`gh pr checks`) antes de dar el componente por terminado.

Los tokens de esta sesión (`--andes-color-success/warning/info`, `--andes-color-overlay`, `--andes-z-index-*`) ya están en [PR #4](https://github.com/Tamci-Soft/andes-ng/pull/4) — son requisito previo para Fase 1 (Alert/Badge usan success/warning/info) y Fase 3 (Dialog usa overlay/z-index).
