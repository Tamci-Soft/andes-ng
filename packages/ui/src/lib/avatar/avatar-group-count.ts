import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import clsx from 'clsx';

import type { AndesAvatarShape, AndesAvatarSize } from './avatar';

let nextPanelId = 0;

@Component({
  selector: 'andes-avatar-group-count',
  imports: [],
  templateUrl: './avatar-group-count.html',
  styleUrl: './avatar-group-count.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Same root cause and fix as AndesAvatar (see avatar.ts): avatar-group-
  // count.css's shape/size rules target this component's own host element,
  // so they're written as `:host(.andes-avatar-group-count--xxx)` rather
  // than plain class selectors, which Emulated encapsulation (the default,
  // restored here) rewrites to match the host correctly. `ViewEncapsulation
  // .None`, used here previously, emits the stylesheet verbatim into a
  // global stylesheet where a `:host` selector - meaningful only inside a
  // real shadow root - matches nothing, dropping every rule in the file.
  host: {
    '[class]': 'classes()',
    '[attr.data-slot]': "'avatar-group-count'",
    '[attr.data-open]': "open() ? '' : null",
    '(mouseenter)': 'onOpen()',
    '(mouseleave)': 'onClose()',
  },
})
export class AndesAvatarGroupCount {
  /** Number of avatars hidden past the visible group - rendered as `+count`. */
  readonly count = input.required<number>();
  readonly shape = input<AndesAvatarShape>('circular');
  readonly size = input<AndesAvatarSize>('md');

  /**
   * Names of the avatars this chip stands in for. When non-empty the chip
   * turns into a real focusable trigger that reveals them on hover and on
   * keyboard focus - the behaviour Ant Design's `Avatar.Group` gives its
   * `maxCount` overflow indicator (`maxPopoverTrigger`), where a static `+N`
   * is otherwise a dead end for anyone trying to find out WHO is hidden.
   *
   * Left empty the chip stays exactly what it was: inert, non-focusable text.
   * That keeps a group whose hidden members have no names to show from
   * advertising an empty panel, and keeps this input additive for existing
   * callers.
   */
  readonly hiddenNames = input<readonly string[]>([]);

  /**
   * Optional heading rendered above the names inside the panel, e.g.
   * "4 more people". Not defaulted, because any default would be an
   * untranslated English string baked into every consuming app.
   */
  readonly overflowLabel = input('');

  protected readonly panelId = `andes-avatar-group-count-${nextPanelId++}`;

  private readonly _open = signal(false);
  protected readonly open = this._open.asReadonly();

  protected readonly interactive = computed(
    () => this.hiddenNames().length > 0,
  );

  protected readonly label = computed(() => `+${this.count()}`);

  protected readonly classes = computed(() =>
    clsx(
      'andes-avatar-group-count',
      `andes-avatar-group-count--${this.shape()}`,
      `andes-avatar-group-count--${this.size()}`,
      this.interactive() && 'andes-avatar-group-count--interactive',
    ),
  );

  protected onOpen(): void {
    if (this.interactive()) {
      this._open.set(true);
    }
  }

  protected onClose(): void {
    this._open.set(false);
  }
}
