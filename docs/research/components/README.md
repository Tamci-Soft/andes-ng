# Guía de referencia por componente — shadcn/ui vs Ant Design

Documentación de implementación para agentes que construyan cada componente de `@andes-ng/ui`. Cada archivo cubre, para **shadcn/ui** y **Ant Design**: anatomía/sub-componentes, API completa, variantes/tamaños/estados, accesibilidad (ARIA + teclado) y tokens de diseño exactos — verificado contra la documentación real (WebFetch), no memoria aproximada. Termina con notas concretas de qué falta en `packages/tokens/src/theme.css` y si el componente necesita un primitivo de comportamiento en `@andes-ng/primitives`.

## Hallazgos transversales importantes

- **shadcn migró de Radix UI a Base UI** (`@base-ui-components/react`) como primitivo por defecto en casi todos sus componentes interactivos (Select, Checkbox, Switch, Radio, Slider, Tooltip, Popover, Dialog, Tabs, Accordion, Progress, Avatar, Menu). Radix sigue disponible como tab alternativo en la doc, pero ya no es el default — no asumir Radix sin verificar.
- **shadcn Drawer migró de `vaul` a un primitivo `Drawer` propio de Base UI** (props como `handleOnly`, `shouldScaleBackground` fueron removidas sin reemplazo documentado).
- **shadcn Toast fue reemplazado**: la URL `/docs/components/sonner` ahora resuelve a un componente "Toast" nativo (`toast.add()`, `@/components/ui/toast`) construido sobre un primitivo Toast de Base UI — ya no es un wrapper de la librería `sonner`.
- **shadcn Combobox** ahora usa el primitivo `Autocomplete` propio de Base UI, no el patrón histórico Popover + `cmdk`.
- **Gap de tokens semánticos confirmado y repetido**: `packages/tokens/src/theme.css` solo tiene `primary`/`secondary`/`danger`. Para tener paridad real con Alert, Badge/Tag y Message/Notification de Ant Design hace falta agregar `--andes-color-success`, `--andes-color-warning` y `--andes-color-info` (con sus variantes hover/active/foreground). shadcn tiene el mismo hueco (solo `--destructive` existe ahí también).
- **Falta un token de overlay/z-index**: ningún componente de overlay (Dialog, Drawer, Popover, Dropdown Menu) tiene hoy un token de color de backdrop ni una escala de z-index en andes-ng — necesario antes de construir cualquiera de esos.
- **Ant Design documenta accesibilidad de forma desigual**: varios componentes (Radio, Switch, Slider, DatePicker, Alert, Message) no publican tabla de roles ARIA/teclado en su doc oficial — cada archivo lo marca explícitamente como "no documentado" en vez de inventarlo.

## Índice

### Forms / Data Entry
- [Input](input.md)
- [Textarea](textarea.md)
- [Select](select.md)
- [Combobox / AutoComplete](combobox-autocomplete.md)
- [Checkbox](checkbox.md)
- [Radio Group](radio-group.md)
- [Switch](switch.md)
- [Slider](slider.md)
- [Date Picker](date-picker.md)
- [Form](form.md)

### Overlays
- [Dialog / Modal](dialog-modal.md)
- [Drawer / Sheet](drawer-sheet.md)
- [Popover](popover.md)
- [Tooltip](tooltip.md)
- [Dropdown Menu](dropdown-menu.md)

### Data Display
- [Table](table.md)
- [Card](card.md)
- [Avatar](avatar.md)
- [Badge / Tag](badge-tag.md)

### Feedback
- [Alert](alert.md)
- [Toast / Notification](toast-notification.md)
- [Progress](progress.md)
- [Skeleton](skeleton.md)

### Navigation / Disclosure
- [Tabs](tabs.md)
- [Accordion / Collapse](accordion-collapse.md)
- [Breadcrumb](breadcrumb.md)
- [Pagination](pagination.md)

### Ya implementado
- [Button](button.md) — referencia de cómo se ve esta guía aplicada a un componente ya construido en `AndesButton`.

Ver también [../component-library-comparison.md](../component-library-comparison.md) para el panorama general de librerías y la matriz resumen componente × librería.
