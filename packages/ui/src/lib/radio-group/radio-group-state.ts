import { computed, Injectable, Signal } from '@angular/core';

export type AndesRadioGroupOrientation = 'vertical' | 'horizontal';
/** `default` renders the classic circle + dot; `button` renders a segmented-control face
 *  (Ant Design's `Radio.Button` / `optionType="button"`). */
export type AndesRadioOptionType = 'default' | 'button';
/** Only affects `optionType="button"`: `outline` tints the checked segment's border/text,
 *  `solid` fills it with the primary color. */
export type AndesRadioButtonStyle = 'outline' | 'solid';
/** Only affects `optionType="button"` - heights mirror `AndesButton`'s sm/md/lg. */
export type AndesRadioSize = 'sm' | 'md' | 'lg';
export type AndesRadioLabelPlacement = 'end' | 'start';

/**
 * What an `AndesRadioGroup` exposes to its items. The group owns every signal (its inputs
 * and its `value` model are the single source of truth); the items only ever read them and
 * report user selection back through `select()`.
 */
export interface AndesRadioGroupSource {
  readonly name: Signal<string>;
  readonly value: Signal<unknown>;
  readonly disabled: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly optionType: Signal<AndesRadioOptionType>;
  readonly buttonStyle: Signal<AndesRadioButtonStyle>;
  readonly size: Signal<AndesRadioSize>;
  readonly orientation: Signal<AndesRadioGroupOrientation>;
  readonly block: Signal<boolean>;
  readonly labelPlacement: Signal<AndesRadioLabelPlacement>;
  select(value: unknown, event: Event): void;
}

/**
 * DI-scoped shared state for one `AndesRadioGroup` instance and its `AndesRadio` children.
 *
 * `AndesRadioGroup` provides a fresh instance of this service in its own `providers: [...]`
 * array (see radio-group.ts) and `connect()`s itself to it from its constructor; every
 * `AndesRadio` - whether projected by the consumer or generated from the group's `options`
 * input - injects that same instance via the normal element-injector hierarchy. This is
 * Angular's equivalent of React Context - no `@ContentChildren` query or manual parent/child
 * registration is needed, and each group on the page gets its own isolated instance.
 *
 * The state reads straight through to the group's signals rather than mirroring them via
 * `effect()`s, so a `writeValue()`/`value.set()` is visible to the items synchronously, with
 * no change-detection round-trip in between.
 */
@Injectable()
export class AndesRadioGroupState {
  private source: AndesRadioGroupSource | undefined;

  readonly name = computed(() => this.group.name());
  readonly value = computed(() => this.group.value());
  readonly disabled = computed(() => this.group.disabled());
  readonly required = computed(() => this.group.required());
  readonly optionType = computed(() => this.group.optionType());
  readonly buttonStyle = computed(() => this.group.buttonStyle());
  readonly size = computed(() => this.group.size());
  readonly orientation = computed(() => this.group.orientation());
  readonly block = computed(() => this.group.block());
  readonly labelPlacement = computed(() => this.group.labelPlacement());

  /** Called once by `AndesRadioGroup`'s constructor - always before any item is created,
   *  since the group's host component is instantiated before its content/view children. */
  connect(source: AndesRadioGroupSource): void {
    this.source = source;
  }

  /** Called by an `AndesRadio` item when the user selects it (a real user interaction). */
  select(value: unknown, event: Event): void {
    this.group.select(value, event);
  }

  private get group(): AndesRadioGroupSource {
    if (!this.source) {
      throw new Error(
        'AndesRadioGroupState used before an AndesRadioGroup connected to it - ' +
          '<andes-radio> must be placed inside an <andes-radio-group>.',
      );
    }
    return this.source;
  }
}
