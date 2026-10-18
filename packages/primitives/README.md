# @andes-ng/primitives

Andes NG's own accessible, unstyled Angular behavior directives — the layer `@andes-ng/ui` builds components on top of.

Grown incrementally: a primitive is added here only when an `@andes-ng/ui` component needs it, never speculatively ahead of one.

## Choice group

`AndesChoiceGroup` + `AndesChoiceItem` are the shared behavior of every "choose from a set" control: one tab stop, arrow keys move between items, `Space`/`Enter` (or focus itself) select. They own the selection and the roving focus, publish the ARIA that goes with them, and set no CSS. Roving focus is [`AndesListNavigation`](src/lib/listbox)'s — the group provides its own instance — so arrow keys, `Home`/`End`, wrap-around and disabled-item skipping are not re-implemented per component.

One primitive serves every pattern because the pattern is data. The group's `role` selects a role mapping:

| `role`       | item `role` | selected state  | `data-state` | selection follows focus | arrows     | deselects on re-press |
| ------------ | ----------- | --------------- | ------------ | ----------------------- | ---------- | --------------------- |
| `radiogroup` | `radio`     | `aria-checked`  | checked      | yes                     | all four   | no                    |
| `tablist`    | `tab`       | `aria-selected` | active       | yes (automatic tabs)    | horizontal | no                    |
| `toolbar`    | `button`    | `aria-pressed`  | on           | no                      | horizontal | yes                   |
| `group`      | `button`    | `aria-pressed`  | on           | no                      | horizontal | yes                   |
| `listbox`    | `option`    | `aria-selected` | selected     | no                      | vertical   | no                    |

Every column is a default: `selectionFollowsFocus`, `orientation`, `deselectable` and `roleMapping` override it per group (manual-activation tabs are `selectionFollowsFocus=false`; a vertical tablist is `orientation="vertical"`). In `multiple` mode items always toggle and moving focus never selects.

```ts
@Component({
  selector: 'app-view-switcher',
  imports: [AndesChoiceGroup, AndesChoiceItem],
  template: `
    <div
      andesChoiceGroup
      role="tablist"
      aria-label="View"
      [(value)]="view"
      [selectionFollowsFocus]="false"
      (changed)="viewChanged.emit($event)"
    >
      @for (tab of tabs; track tab.value) {
        <button
          type="button"
          andesChoiceItem
          [value]="tab.value"
          [disabled]="tab.disabled"
          [controls]="'panel-' + tab.value"
        >
          {{ tab.label }}
        </button>
      }
    </div>
  `,
})
export class ViewSwitcher {
  readonly view = model<unknown>('list');
  readonly viewChanged = output<unknown>();
}
```

- **State.** `value` is a `model()`: one item's value or `null` in `single` mode, an array in `multiple` mode. `required` stops a `single` group from being cleared (and publishes `aria-required` on roles that support it). `compareWith` compares object values. `disabled` (or `setDisabledState()` for a `ControlValueAccessor` wrapper) disables the whole group.
- **Output.** `changed` emits the new value when the _user_ changes the selection (click, `Space`/`Enter`, or navigation that selects). Writing `value` is silent, so a wrapper can tell form writes from user input. The imperative `select()`/`deselect()`/`toggle()`/`clear()` act as the user would and do emit.
- **Items** expose `selected`, `disabled` and `active` signals and the `data-state`, `data-disabled` and `data-active` host attributes as styling hooks; `[controls]` publishes `aria-controls` for a tab's panel. Put `andesChoiceItem` on the focusable element — a `<button>` also gets native `disabled`; any other element gets `aria-disabled` only.
- **Right-to-left** is read from the surrounding `dir` (CDK `Directionality`), or forced with `textDirection`.
- **Activation.** The group handles `Space`/`Enter` itself and cancels the default action, so a `<button>` does not also fire a click and a `<div role="radio">` behaves the same as a button. The tab stop returns to the selected item whenever focus leaves the group, so manual-activation tabs and toggle groups re-enter where the choice is.

### Which components should adopt this

Paths are under `packages/ui/src/lib/`.

- **`segmented/`** — `segmented.ts` `onKeydown` (filters enabled options, mirrors left/right for RTL, wraps, handles `Home`/`End`, then focuses and selects), the `tabbable` computed and `AndesSegmentedOption.tabIndex`/`button` role="radio" logic. Replace with `andesChoiceGroup role="radiogroup"` on the host and `andesChoiceItem` on the option's `<button>`; keep the sliding thumb measuring against `group.items()`/`selectedItem()`. Keep the hidden form input and `compareWith` pass-through.
- **`toggle/`** — `toggle-group.ts` (`onKeydown` focus-only roving, `tabbable`, `toggle()`, `isPressed`, the `single`/`multiple` + `allowEmpty` value rules) and `toggle.ts` `tabIndex`. Replace with `andesChoiceGroup role="group"` + `[mode]` + `[required]` (`allowEmpty` is the inverse of `required`), and `andesChoiceItem` on the inner `<button>`. A standalone `<andes-toggle>` stays as it is.
- **`tabs/`** — `tabs-trigger.ts` (the automatic-activation `effect` that selects when the trigger becomes the active item, plus its `aria-selected`/`aria-controls` bindings) and the tab-stop sync in `tabs.ts` (`syncActiveItem`, the effect around line 475). `AndesTabsList` already forwards keys to `AndesListNavigation`; swap that for `andesChoiceGroup role="tablist"` (`selectionFollowsFocus` = `activationMode() === 'automatic'`) and the trigger's `<button>` for `andesChoiceItem`. The fallback-to-first-enabled-tab rule, overflow menu, drag-reorder and editable-card removal stay in `AndesTabs`.
- **`radio-group/`** — a lower-priority adopter: it uses native `<input type="radio">`, which already provide roving focus and form participation, so there is no hand-written `keydown` to remove. Adopt only for the `optionType="button"` face if it should stop depending on hidden native inputs.

Not a fit, deliberately: **`rate/`** is a `role="slider"` over a number (`onKeydown` steps a value by 1 or 0.5, and digit keys set it) — a different pattern with no item set to choose from. **`accordion/`** triggers keep every trigger in the natural tab order and optionally move focus with the arrows (`accordion.ts` `onKeydown`); there is no selection, only `aria-expanded` per item, so it should adopt `AndesListNavigation` directly rather than this.
