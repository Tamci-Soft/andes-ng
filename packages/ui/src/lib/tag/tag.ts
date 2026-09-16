import { NgTemplateOutlet } from '@angular/common';
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

export type AndesTagColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';
/** Matches Ant Tag's `variant` prop - `outlined` (border only) is the default look. */
export type AndesTagVariant = 'outlined' | 'filled' | 'solid';

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
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Renders a close button; the component itself never removes the tag - handle `closed`. */
  readonly closable = input(false, { transform: booleanAttribute });
  readonly closeAriaLabel = input('Remove');
  /** Renders the tag as an anchor. Ignored when `closable` is set - see tag.html. */
  readonly href = input<string | undefined>(undefined);
  readonly target = input<string | undefined>(undefined);
  /**
   * A checkable tag toggles its own pressed state on click (like antd's CheckableTag) and
   * renders as a native `<button>` so Enter/Space work with no extra keyboard handling.
   * `color`/`variant` are ignored while checkable - like antd's CheckableTag, a checkable
   * tag only ever shows its own neutral/checked look, not an arbitrary color. Ignored
   * entirely when `closable` or `href` is set - see tag.html.
   */
  readonly checkable = input(false, { transform: booleanAttribute });
  readonly checked = input(false, { transform: booleanAttribute });
  /** Plain clickable tag (no pressed state) - also renders as a native `<button>`. */
  readonly clickable = input(false, { transform: booleanAttribute });

  readonly closed = output<void>();
  readonly checkedChange = output<boolean>();
  readonly tagClick = output<MouseEvent>();

  protected readonly checkedState = signal(false);

  protected readonly isLink = computed(() => !!this.href() && !this.closable());

  protected readonly isInteractive = computed(
    () =>
      (this.checkable() || this.clickable()) &&
      !this.closable() &&
      !this.isLink(),
  );

  protected readonly classes = computed(() => {
    const skipColorAndVariant = this.checkable();
    return clsx(
      'andes-tag',
      !skipColorAndVariant && `andes-tag--color-${this.color()}`,
      !skipColorAndVariant && `andes-tag--${this.variant()}`,
      this.closable() && 'andes-tag--closable',
      this.isInteractive() && 'andes-tag--interactive',
      this.checkable() && 'andes-tag--checkable',
      this.checkable() && this.checkedState() && 'andes-tag--checked',
      this.disabled() && 'andes-tag--disabled',
    );
  });

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
