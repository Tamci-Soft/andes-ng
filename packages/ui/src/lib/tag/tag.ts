import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import clsx from 'clsx';

export type AndesTagVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline';

@Component({
  selector: 'andes-tag',
  templateUrl: './tag.html',
  styleUrl: './tag.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesTag {
  readonly variant = input<AndesTagVariant>('default');
  readonly bordered = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Renders a close button; the component itself never removes the tag - handle `closed`. */
  readonly closable = input(false, { transform: booleanAttribute });
  readonly closeAriaLabel = input('Remove');
  /**
   * A checkable tag toggles its own pressed state on click (like antd's CheckableTag) and
   * renders as a native `<button>` so Enter/Space work with no extra keyboard handling.
   * Ignored when `closable` is set, since a close button can't be nested inside another
   * interactive control - see tag.html.
   */
  readonly checkable = input(false, { transform: booleanAttribute });
  readonly checked = input(false, { transform: booleanAttribute });
  /** Plain clickable tag (no pressed state) - also renders as a native `<button>`. */
  readonly clickable = input(false, { transform: booleanAttribute });

  readonly closed = output<void>();
  readonly checkedChange = output<boolean>();
  readonly tagClick = output<MouseEvent>();

  protected readonly checkedState = signal(false);

  protected readonly isInteractive = computed(
    () => (this.checkable() || this.clickable()) && !this.closable(),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-tag',
      `andes-tag--${this.variant()}`,
      !this.bordered() && 'andes-tag--borderless',
      this.closable() && 'andes-tag--closable',
      this.isInteractive() && 'andes-tag--interactive',
      this.checkable() && this.checkedState() && 'andes-tag--checked',
      this.disabled() && 'andes-tag--disabled',
    ),
  );

  constructor() {
    effect(() => {
      this.checkedState.set(this.checked());
    });
  }

  protected onTagClick(event: MouseEvent): void {
    if (this.disabled()) {
      return;
    }

    this.tagClick.emit(event);

    if (this.checkable()) {
      const next = !this.checkedState();
      this.checkedState.set(next);
      this.checkedChange.emit(next);
    }
  }

  protected onClose(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled()) {
      return;
    }
    this.closed.emit();
  }
}
