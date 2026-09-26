import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import clsx from 'clsx';

/** The themed presets, each backed by `--andes-color-*` tokens. */
export type AndesTagPresetColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';
/**
 * A preset, or any CSS color string (`#722ed1`, `rgb(...)`, a named color, `var(--x)`).
 * See the custom-color block in tag.css for how its text stays
 * readable in every variant.
 */
// `string & {}` keeps the preset literals in editor autocompletion instead of collapsing the
// whole union to plain `string`.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AndesTagColor = AndesTagPresetColor | (string & {});
/** Visual treatment, independent of `color` - `outlined` (border only) is the default look. */
export type AndesTagVariant = 'outlined' | 'filled' | 'solid';

const TAG_PRESETS: readonly string[] = [
  'default',
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
];

/**
 * Emitted by `closed`. Calling `preventDefault()` synchronously inside the handler vetoes the
 * close - it only has an effect with `hideOnClose`, since without it the tag never removes
 * itself anyway (the consumer removes it, or doesn't).
 */
export class AndesTagCloseEvent {
  private prevented = false;

  constructor(readonly originalEvent: MouseEvent) {}

  get defaultPrevented(): boolean {
    return this.prevented;
  }

  preventDefault(): void {
    this.prevented = true;
  }
}

@Component({
  selector: 'andes-tag',
  imports: [NgTemplateOutlet],
  templateUrl: './tag.html',
  styleUrl: './tag.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesTag {
  readonly color = input<AndesTagColor>('default');
  readonly variant = input<AndesTagVariant>('outlined');
  /** `false` drops the border, keeping the tag's size unchanged. */
  readonly bordered = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Renders a close button. By default the component never removes the tag itself - handle
   * `closed` (or opt into `hideOnClose`).
   */
  readonly closable = input(false, { transform: booleanAttribute });
  /** Custom close-button content. Setting it implies `closable`. */
  readonly closeIcon = input<TemplateRef<unknown> | undefined>(undefined);
  /**
   * Uncontrolled mode: the tag hides itself after `closed` fires, unless a handler called
   * `preventDefault()` on the event.
   */
  readonly hideOnClose = input(false, { transform: booleanAttribute });
  readonly closeAriaLabel = input('Remove');
  /** Renders the tag as an anchor. Ignored when closable - see tag.html. */
  readonly href = input<string | undefined>(undefined);
  readonly target = input<string | undefined>(undefined);
  /**
   * A checkable tag toggles its own pressed state on click and renders as a native
   * `<button>` so Enter/Space work with no extra keyboard handling. `color`/`variant` are
   * ignored while checkable - a checkable tag only ever shows its own neutral/checked look, not an arbitrary color. Ignored
   * entirely when closable or `href` is set - see tag.html.
   */
  readonly checkable = input(false, { transform: booleanAttribute });
  /** Two-way bindable: `[(checked)]`. Toggles on its own when left unbound. */
  readonly checked = model(false);
  /** Plain clickable tag (no pressed state) - also renders as a native `<button>`. */
  readonly clickable = input(false, { transform: booleanAttribute });

  readonly closed = output<AndesTagCloseEvent>();
  readonly tagClick = output<MouseEvent>();

  /** `model()` has no `transform`, so a bare `checked` attribute arrives as `''`. */
  protected readonly isChecked = computed(() =>
    booleanAttribute(this.checked()),
  );

  protected readonly dismissed = signal(false);

  protected readonly isClosable = computed(
    () => this.closable() || !!this.closeIcon(),
  );

  protected readonly isLink = computed(
    () => !!this.href() && !this.isClosable(),
  );

  protected readonly isInteractive = computed(
    () =>
      (this.checkable() || this.clickable()) &&
      !this.isClosable() &&
      !this.isLink(),
  );

  /** Arbitrary CSS color from `color`, applied through `--andes-tag-color`. */
  protected readonly customColor = computed(() => {
    const color = this.color();
    return color && !TAG_PRESETS.includes(color) ? color : null;
  });

  protected readonly classes = computed(() => {
    const skipColorAndVariant = this.checkable();
    return clsx(
      'andes-tag',
      !skipColorAndVariant &&
        (this.customColor()
          ? 'andes-tag--color-custom'
          : `andes-tag--color-${this.color() || 'default'}`),
      !skipColorAndVariant && `andes-tag--${this.variant()}`,
      // Outlined/filled custom colors derive their text from the color itself (tag.css); a
      // separate class, not a `:not(.andes-tag--solid)`, keeps those rules from ever
      // competing on specificity with solid's black/white rule.
      !skipColorAndVariant &&
        this.customColor() &&
        this.variant() !== 'solid' &&
        'andes-tag--custom-tinted',
      !this.bordered() && 'andes-tag--borderless',
      this.isClosable() && 'andes-tag--closable',
      this.isInteractive() && 'andes-tag--interactive',
      this.checkable() && 'andes-tag--checkable',
      this.checkable() && this.isChecked() && 'andes-tag--checked',
      this.disabled() && 'andes-tag--disabled',
    );
  });

  protected onTagClick(event: MouseEvent): void {
    if (this.disabled()) {
      return;
    }

    this.tagClick.emit(event);

    if (this.checkable()) {
      this.checked.set(!this.isChecked());
    }
  }

  protected onClose(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    const closeEvent = new AndesTagCloseEvent(event);
    this.closed.emit(closeEvent);
    if (this.hideOnClose() && !closeEvent.defaultPrevented) {
      this.dismissed.set(true);
    }
  }
}
