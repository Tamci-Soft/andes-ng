# Form

## 1. Anatomy / compound structure

### shadcn/ui
shadcn/ui's Form is **not a self-contained validation engine** — it is architecturally different from Ant Design's Form. It is a thin wrapper/composition pattern that glues together a headless form-state library with shadcn's own field-display primitives and a schema validator. This is an important distinction to call out explicitly: Ant's `Form` owns validation, field registration, and layout end-to-end as one integrated component tree; shadcn's "Form" is really "how to compose `react-hook-form` (or, per the current docs, also TanStack Form / Formisch) with shadcn's `Field` components," and the resulting code lives in the consumer's own project (it's copied in via the CLI, not imported from a fixed package surface).

As of the current (2026) shadcn docs, the top-level `/docs/components/form` entry point has been reorganized into a **"Forms" section** that lets you pick the state-management library:
- **React Hook Form** — `/docs/forms/react-hook-form` (the historical/most common choice)
- **TanStack Form** — `/docs/forms/tanstack-form`
- **Formisch** — `/docs/forms/formisch`
- **React `useActionState`** — listed as "coming soon"

Documented sub-parts (from the React Hook Form guide), which are shadcn's own copy-in components, not a single vendored library:
- `Field` — container/wrapper for one form control; carries `data-invalid` when the field state is invalid.
- `FieldLabel` — label element, associated to the control via `htmlFor={field.name}` / matching `id`.
- `FieldDescription` — helper/description text rendered below the control.
- `FieldError` — renders validation error message(s); takes `errors={[fieldState.error]}`.
- `FieldGroup` — groups multiple `Field`s together (layout grouping).
- `Controller` — this is `react-hook-form`'s own controlled-component wrapper, re-exported/used directly, not a shadcn-authored part. It receives `name`, `control`, and a `render({ field, fieldState })` function.

Underlying libraries wrapped (quoted from the docs): "Uses React Hook Form's `useForm` hook for form state management. `<Controller />` component for controlled inputs. `<Field />` components for building accessible forms. Client-side validation using Zod with `zodResolver`." Concretely:
- `react-hook-form` — form state, registration, submission, and field-level render-prop API (`Controller`).
- `zod` (v3, per the docs) — schema definition for validation rules.
- `@hookform/resolvers/zod` (`zodResolver`) — bridges the Zod schema into react-hook-form's `resolver` option.
- The `Field*` components themselves are shadcn/ui's own building blocks (labels/description/error slots), independent of Radix or Base UI — they are plain styled HTML wrappers, not a headless-UI primitive.

There is no formal "props table" for `Field`/`FieldLabel`/`FieldDescription`/`FieldError` published on the guide page; they are illustrated only through the anatomy code sample:

```tsx
<Controller
  name="title"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Bug Title</FieldLabel>
      <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
      <FieldDescription>Description text</FieldDescription>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

### Ant Design
Ant's Form **is** the validation engine — a single integrated component family with these exported parts:
- `Form` — root component; owns the `FormInstance`, layout (`horizontal`/`vertical`/`inline`), label/wrapper column sizing, and submit lifecycle.
- `Form.Item` — field wrapper: binds a `name` to the form's data model, declares `rules`, renders label/help/error/feedback icon, and clones its child control to inject `value`/`onChange` (or whatever `valuePropName`/`trigger` specify).
- `Form.List` — manages an array field (add/remove/move dynamic sub-fields) via a render-prop `children(fields, operation, meta)`.
- `Form.ErrorList` — standalone renderer for a list of error messages (v4.7.0+), useful outside the normal per-item error slot.
- `Form.Provider` — links multiple independent `<Form>` trees so they can notify each other of field/value changes and coordinated submission.
- `Form.useForm()` — hook that creates/returns a `FormInstance` (imperative get/set/validate/reset API) to hand to `<Form form={...}>`.
- `Form.useFormInstance()` — hook to read the current form's `FormInstance` from context inside a descendant (v4.20.0+), useful when composing custom field controls without prop-drilling the instance.
- `Form.useWatch()` — hook to reactively watch one or more field values, with selector support (v5.12.0+).
- `Form.Item.useStatus()` — hook to read the validation status of the enclosing `Form.Item` (v4.22.0+), for building custom status-aware sub-controls.

## 2. Props / API

### shadcn/ui
There is no vendored/fixed component library to produce a canonical props table from — `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup` are plain copy-in components without a documented formal prop list on the guide page. The two "props" that matter are conventions rather than a typed API:

| Prop / attribute | Where used | Type | Description |
|---|---|---|---|
| `data-invalid` | `<Field>` | `boolean` | Set from `fieldState.invalid`; drives invalid-state styling on the wrapper. |
| `htmlFor` | `<FieldLabel>` | `string` | Matches the control's `id` (conventionally `field.name`) for label association. |
| `aria-invalid` | the underlying control (`<Input>`, `<SelectTrigger>`, etc.) | `boolean` | Set from `fieldState.invalid`; must be added manually per the docs ("Add the `aria-invalid` prop to the form control"). |
| `errors` | `<FieldError>` | `Array<FieldError \| undefined>` | Renders the react-hook-form error object(s) for that field. |

Validation timing is controlled entirely by react-hook-form's own `mode` option passed to `useForm({ mode })`, not by a shadcn prop:

| Mode | Description |
|---|---|
| `"onChange"` | Validation triggers on every change. |
| `"onBlur"` | Validation triggers on blur. |
| `"onSubmit"` (default) | Validation triggers on submit. |
| `"onTouched"` | Validates on first blur, then on every change. |
| `"all"` | Validates on both blur and change. |

### Ant Design

**`Form` props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `classNames` | `Record<SemanticDOM, string>` \| function | — | Semantic DOM class names (v6.0.0). |
| `colon` | `boolean` | `true` | Configure whether the label is followed by a colon. |
| `component` | `ComponentType` \| `false` | `form` | Set the component used as the root node; `false` renders no wrapper element. |
| `disabled` | `boolean` | `false` | Disable all form controls within the form (v4.21.0). |
| `feedbackIcons` | `FeedbackIcons` | — | Customize the icons used for validation feedback (v5.9.0). |
| `fields` | `FieldData[]` | — | Control fields' state imperatively (name/value/errors/touched). |
| `form` | `FormInstance` | — | The form instance created by `Form.useForm()`; auto-created if omitted. |
| `initialValues` | `object` | — | Initial values for all fields. |
| `labelAlign` | `left \| right` | `right` | Label text alignment (v6.4.0). |
| `labelCol` | `object` (grid `span`/`offset` etc.) | — | Label layout, same as `Col` props. |
| `labelWrap` | `boolean` | `false` | Allow label text to wrap (v4.18.0). |
| `layout` | `horizontal \| vertical \| inline` | `horizontal` | Form layout. |
| `name` | `string` | — | Form name; becomes a prefix for field ids. |
| `preserve` | `boolean` | `true` | Whether to keep field value when the field is removed from the tree (v4.4.0). |
| `requiredMark` | `boolean \| "optional" \| ((label, info) => ReactNode)` | `true` | Style/customize the required-field mark (v4.8.0). |
| `scrollToFirstError` | `boolean \| Options` | `{ focus: boolean }` | Auto-scroll to the first invalid field on submit failure (v5.2.0). |
| `size` | `small \| middle \| large` | — | Set the size of all form controls inside. |
| `styles` | `Record<SemanticDOM, CSSProperties>` \| function | — | Semantic DOM inline styles (v6.0.0). |
| `tooltip` | `TooltipProps & { icon?: ReactNode }` | — | Default tooltip config used by `Form.Item`'s `tooltip` prop (v6.3.0). |
| `validateMessages` | `ValidateMessages` | — | Templates for validation error messages, with `${...}` interpolation (v4.0.0). |
| `validateTrigger` | `string \| string[]` | `onChange` | Default event(s) that trigger validation for descendant items (v4.3.0). |
| `variant` | `outlined \| borderless \| filled \| underlined` | `filled` (per fetched docs; historically `outlined`) | Default appearance of controls within the form (v5.19.0). |
| `wrapperCol` | `object` | — | Control-wrapper layout, same as `Col` props. |
| `onFieldsChange` | `(changedFields, allFields) => void` | — | Callback fired when any field's state changes. |
| `onFinish` | `(values) => void` | — | Callback fired on successful submit. |
| `onFinishFailed` | `({ values, errorFields, outOfDate }) => void` | — | Callback fired on failed submit. |
| `onValuesChange` | `(changedValues, allValues) => void` | — | Callback fired when any field's value changes. |
| `clearOnDestroy` | `boolean` | `false` | Clear form state when the `Form` unmounts (v5.18.0). |

**`Form.Item` props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `colon` | `boolean` | `true` | Colon display after the label. |
| `dependencies` | `NamePath[]` | — | Names of other fields this item depends on for re-validation/re-render. |
| `extra` | `ReactNode` | — | Extra help text rendered below the control. |
| `getValueFromEvent` | `(...args) => any` | — | Map the control's change-event args to the stored value. |
| `getValueProps` | `(value) => Record<string, any>` | — | Map the stored value to the props injected into the child control. |
| `hasFeedback` | `boolean \| { icons: FeedbackIcons }` | `false` | Show a validation status icon. |
| `help` | `ReactNode` | — | Help text; overrides generated validation message when set. |
| `hidden` | `boolean` | `false` | Hide the field visually while it still participates in validation/data. |
| `htmlFor` | `string` | — | `htmlFor` attribute of the generated `<label>`. |
| `initialValue` | `any` | — | Field default value (must not conflict with `Form`'s `initialValues` for the same path). |
| `label` | `ReactNode` | — | Field label. |
| `labelAlign` | `left \| right` | `right` | Label alignment for this item. |
| `labelCol` | `object` | — | Label layout for this item. |
| `messageVariables` | `Record<string, string>` | — | Variables for message template interpolation. |
| `name` | `NamePath` | — | Field path/identifier — required to bind to the form's data model. |
| `normalize` | `(value, prevValue, prevValues) => any` | — | Normalize the value before storing it. |
| `noStyle` | `boolean` | `false` | Strip all `Form.Item` layout/styling, keeping only the data-binding behavior. |
| `preserve` | `boolean` | `true` | Keep this field's value when it's removed from the tree. |
| `required` | `boolean` | — | Manually force/override the required-mark display. |
| `rules` | `Rule[]` | — | Validation rules for this field. |
| `shouldUpdate` | `boolean \| ((prevValues, curValues) => boolean)` | `false` | Custom control over when this item re-renders. |
| `tooltip` | `ReactNode \| (TooltipProps & { icon?: ReactNode })` | — | Tooltip icon/content next to the label. |
| `trigger` | `string` | `onChange` | Event name on the child control that updates the value. |
| `validateDebounce` | `number` | — | Debounce (ms) before validation runs. |
| `validateFirst` | `boolean \| "parallel"` | `false` | Stop at the first rule failure (or validate rules in parallel). |
| `validateStatus` | `success \| warning \| error \| validating` | — | Manually override the validation status/icon. |
| `validateTrigger` | `string \| string[]` | `onChange` | Event(s) that trigger validation for this item. |
| `valuePropName` | `string` | `value` | Prop name used to pass the stored value into the child control (e.g. `checked` for switches/checkboxes). |
| `wrapperCol` | `object` | — | Control-wrapper layout for this item. |
| `layout` | `horizontal \| vertical` | — | Per-item layout override. |

**`Form.List` props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `(fields, operation, meta) => ReactNode` | — | Render function receiving the current fields array and `{ add, remove, move }` operations. |
| `initialValue` | `any[]` | — | Initial array value. |
| `name` | `NamePath` | — | Array field path. |
| `rules` | `{ validator, message }[]` | — | Validation rules applied to the whole array (e.g. min/max item count). |

`Form.List` render-prop operations: `add(defaultValue?, insertIndex?)`, `remove(index | number[])`, `move(from, to)`.

**`Form.ErrorList` props**

| Prop | Type | Description |
|---|---|---|
| `errors` | `ReactNode[]` | The list of error messages to render. |

**`Form.Provider` props**

| Prop | Type | Description |
|---|---|---|
| `onFormChange` | `(formName, { changedFields, forms }) => void` | Fired when any linked form's fields change. |
| `onFormFinish` | `(formName, { values, forms }) => void` | Fired when any linked form finishes submitting. |

**Validation rule (`Rule`) shape**

| Property | Type | Description |
|---|---|---|
| `defaultField` | `Rule` | Rule applied to each element of an array field. |
| `enum` | `any[]` | Value must be one of this set. |
| `fields` | `Record<string, Rule>` | Per-key rules for nested object/array validation. |
| `len` | `number` | Exact length constraint. |
| `max` | `number` | Maximum length/value. |
| `min` | `number` | Minimum length/value. |
| `message` | `string \| ReactElement` | Custom error message. |
| `pattern` | `RegExp` | Regex the value must match. |
| `required` | `boolean` | Field is mandatory. |
| `transform` | `(value) => any` | Transform the value before validating it. |
| `type` | `string` | Value type (`string`, `number`, `email`, `url`, `tel`, etc.). |
| `validateTrigger` | `string \| string[]` | Override trigger event for this rule. |
| `validator` | `(rule, value) => Promise` | Custom async validator. |
| `warningOnly` | `boolean` | Report as a warning without blocking submit. |
| `whitespace` | `boolean` | Fail if the value is whitespace-only. |

## 3. Variants, sizes and states

### shadcn/ui
- No "variant" concept for the Form pattern itself — visual variants belong to the individual input components (`Input`, `Select`, etc.) used inside a `Field`.
- "Sizes": none specific to Form; inherits whatever size props the composed input components expose.
- States: field-level `invalid` (driven by `fieldState.invalid` from react-hook-form/Zod), `disabled` (native, per control), `touched`/`dirty` (available from `fieldState` but not surfaced by a dedicated shadcn prop — consumer reads it directly off react-hook-form's `fieldState`/`formState`).
- Because there are 3 supported state-management backends (React Hook Form, TanStack Form, Formisch), the "variant" that matters most architecturally is *which library* backs the form — each has its own anatomy guide with the same `Field`/`FieldLabel`/`FieldDescription`/`FieldError` surface but different glue code (`Controller` vs. TanStack's `form.Field` vs. Formisch's equivalent).

### Ant Design
- Layout variants: `horizontal` (default), `vertical`, `inline`.
- Size variants: `small`, `middle` (default), `large` — cascades to all descendant form controls via `Form`'s `size` prop.
- Appearance `variant` (v5.19.0+): `outlined`, `borderless`, `filled`, `underlined` — cascades as the default variant for descendant inputs.
- States: per-field `validateStatus` (`success | warning | error | validating`), `disabled` (cascadable from `Form` or per-item), `hidden` (participates in data/validation but not rendered), required (visual asterisk via `requiredMark`/`rules[].required`).

## 4. Accessibility

### shadcn/ui (via react-hook-form + plain HTML — no Base UI/Radix primitive involved)
Form is not built on Base UI or Radix UI at all — it's composed from plain HTML elements (`<label>`, native inputs) plus react-hook-form's state, so there is no focus-trap/portal/keyboard-interaction table to report (those apply to the overlay primitives, not Form). Documented accessibility guidance is minimal and manual:
- `data-invalid` should be set on `<Field>` from `fieldState.invalid` for state-based styling.
- `aria-invalid` must be added manually to the underlying control (`<Input>`, `<SelectTrigger>`, etc.) from `fieldState.invalid` — this is **not automatic**, the docs explicitly instruct the developer to wire it themselves per field.
- `<FieldLabel htmlFor={field.name}>` paired with `id={field.name}` on the control gives standard label/control association (native HTML semantics, not ARIA).
- No documented `aria-describedby` wiring between `<FieldDescription>`/`<FieldError>` and the control was found on the fetched guide — if andes-ng implements this pattern, wiring `aria-describedby` from the control to the description/error ids should be treated as a gap to close explicitly rather than assumed present upstream.

### Ant Design
- Uses native `<label>` elements associated to controls via `id`/`htmlFor`, giving native click-to-focus label behavior; the docs note `htmlFor={null}` can disable this (discouraged).
- Validation state surfaces via `Form.Item`'s generated status classes/icons (`hasFeedback`) rather than a documented explicit `aria-invalid`/`role="alert"` contract — the fetched docs do not spell out ARIA attributes for error announcement, so this should be treated as **undocumented** rather than assumed compliant; verify actual DOM output before relying on screen-reader announcement behavior.
- `FormInstance.scrollToFirstError()` — programmatic convenience to move keyboard/visual focus toward the first invalid field after a failed submit, improving discoverability of errors for sighted keyboard users, but is not itself an ARIA live-region announcement.
- No documented focus-trap/scroll-lock/Escape behavior — none applies, since `Form` is not an overlay.

## 5. Design tokens

### shadcn/ui
Form has no dedicated CSS variables of its own. It inherits whichever global tokens the composed input/label components use — typically `--foreground` (label text), `--muted-foreground` (description text), `--destructive` (error text/invalid ring), `--border`/`--input` (control borders), and `--ring` (focus ring on the control). There is no `--form-*` or `--field-*` variable defined by shadcn's global CSS variable set.

### Ant Design

**Component tokens (Form)**

| Token | Description | Default value |
|---|---|---|
| `inlineItemMarginBottom` | Margin bottom of `Form.Item` in `inline` layout | `0` |
| `itemMarginBottom` | Margin bottom of `Form.Item` | `24` |
| `labelColonMarginInlineEnd` | Margin inline end of the colon after label text | `8` |
| `labelColonMarginInlineStart` | Margin inline start of the colon after label text | `2` |
| `labelColor` | Label text color | `rgba(0, 0, 0, 0.88)` |
| `labelFontSize` | Label font size | `14` |
| `labelHeight` | Label height | `32` |
| `labelRequiredMarkColor` | Color of the required-field asterisk | `#ff4d4f` |
| `verticalLabelMargin` | Margin of label in vertical layout | `0` |
| `verticalLabelPadding` | Padding of label in vertical layout | `0 0 8px` |

These component tokens derive from global **Alias/Map Tokens**: `labelColor` derives from `colorText`, `labelRequiredMarkColor` derives from `colorError`, `labelFontSize` derives from `fontSize`, and `labelHeight`/spacing tokens derive from `controlHeight` and the `margin`/`sizeStep` scale — consistent with the general Seed → Map → Alias derivation model described in Ant's theme customization docs (see the shared Seed Token list below).

**Global tokens Form's own tokens (and its rendered controls) derive from**, as referenced on the page: `colorBorder`, `colorError`, `colorPrimary`, `colorSuccess`, `colorText`, `colorTextDescription`, `colorWarning`, `controlHeight`, `controlHeightLG`, `controlHeightSM`, `controlOutline`, `controlOutlineWidth`, `fontFamily`, `fontSize`, `fontSizeLG`, `lineHeight`, `lineType`, `lineWidth`, `margin`, `marginLG`, `marginXXS`, `motionDurationFast`, `motionDurationMid`, `motionEaseInOut`, `motionEaseOut`, `motionEaseOutBack`, `paddingSM`, plus the `screenXSMax`/`screenSMMax`/`screenMDMax`/`screenLGMax` breakpoints (used for responsive label/wrapper column behavior).

## 6. Notes for andes-ng implementation
- Form is the **odd one out** among this batch — it is not an overlay, so it does not need `@andes-ng/primitives`' overlay/portal/focus-trap/Escape/scroll-lock/z-index machinery at all. Treat it as a separate primitive concern: a (thin, react-hook-form-style) form-state/validation layer plus a set of `Field`/`FieldLabel`/`FieldDescription`/`FieldError` display components, versus Ant's fully-integrated `Form`/`Form.Item` model. Decide explicitly which architecture andes-ng wants — a thin wrapper around Angular's own `ReactiveFormsModule`/`FormGroup` (closer to shadcn's philosophy: Angular already owns form state, so andes-ng would only supply the display/error/label components) versus a self-contained validation-owning component akin to Ant's `Form`/`Form.Item`. This is a foundational decision that should be made before implementing, since it changes the public API shape entirely.
- Suggested token mapping if andes-ng builds the shadcn-style thin-wrapper approach: label text → `--andes-color-foreground`, description text → `--andes-color-muted-foreground`, error text/invalid ring → `--andes-color-danger`, control border → `--andes-color-border`/`--andes-color-input`, focus ring → `--andes-color-focus-ring`. All of these already exist in `packages/tokens/src/theme.css`; no new tokens are needed for a shadcn-style Form.
- If andes-ng instead builds an Ant-style integrated Form, it would need new spacing tokens equivalent to `itemMarginBottom` (vertical rhythm between fields) and `labelHeight`/`verticalLabelPadding` — andes-ng's existing `--andes-space-*` scale (1–5, i.e. 0.25rem–1.25rem) does not currently include a value matching Ant's `itemMarginBottom: 24` (1.5rem) — that would be a gap to fill (either reuse `--andes-space-4` at 1rem or add a new step).
- Accessibility pitfalls to flag regardless of architecture: (1) `aria-invalid` and `aria-describedby` wiring from control → error/description text is manual/undocumented upstream in shadcn and not spelled out in Ant's docs either — andes-ng should make this automatic and testable rather than relying on consumers to wire it by hand; (2) error-message announcement to screen readers (e.g. via `role="alert"` or an ARIA live region on the `FieldError`/error slot) is not documented by either reference library and should be an explicit, tested design decision for andes-ng, not an assumption; (3) label association must use real `id`/`for` pairs (native semantics) rather than relying solely on ARIA, matching both references' approach.
