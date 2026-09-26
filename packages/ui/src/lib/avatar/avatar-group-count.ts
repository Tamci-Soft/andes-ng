import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  signal,
  type TemplateRef,
} from '@angular/core';
import clsx from 'clsx';

import type { AndesAvatarShape } from './avatar-group-context';
import {
  type AndesAvatarSizeInput,
  injectAvatarAppearance,
} from './avatar-size';

let nextPanelId = 0;

/** Where the reveal panel opens relative to the `+N` chip (Ant's `max.popover.placement`). */
export type AndesAvatarGroupCountPlacement = 'top' | 'bottom';

/**
 * What opens the reveal panel (Ant's `max.popover.trigger`).
 *
 * - `hover` (default): pointer hover, plus keyboard focus and tap - a
 *   hover-only trigger would lock keyboard and touch users out. The panel is a
 *   WAI-ARIA tooltip: read-only text, described by the trigger.
 * - `click`: toggles on click/Enter/Space and stays open until Escape, a
 *   click outside or focus leaving the chip. The panel is a disclosure
 *   (`aria-expanded` + `aria-controls`) and can hold interactive content,
 *   e.g. a custom `panelTemplate` with links.
 */
export type AndesAvatarGroupCountTrigger = 'hover' | 'click';

/** Template context of `panelTemplate`. */
export interface AndesAvatarGroupCountPanelContext {
  /** The hidden names (`hiddenNames`), also available as `names`. */
  readonly $implicit: readonly string[];
  readonly names: readonly string[];
  /** The `+N` count. */
  readonly count: number;
}

@Component({
  selector: 'andes-avatar-group-count',
  imports: [NgTemplateOutlet],
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
    '[attr.data-placement]': 'placement()',
    '[style.width.px]': 'appearance.px()',
    '[style.height.px]': 'appearance.px()',
    '[style.font-size.px]': 'appearance.fontPx()',
    '(mouseenter)': 'onPointerEnter()',
    '(mouseleave)': 'onPointerLeave()',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class AndesAvatarGroupCount {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);

  /** Number of avatars hidden past the visible group - rendered as `+count`. */
  readonly count = input.required<number>();
  /** Left unset, follows the enclosing `AndesAvatarGroup`, else `circular`. */
  readonly shape = input<AndesAvatarShape | undefined>(undefined);
  /**
   * Same values as `AndesAvatar.size`. Left unset, follows the enclosing
   * `AndesAvatarGroup`, else `md`.
   */
  readonly size = input<AndesAvatarSizeInput | undefined>(undefined);

  protected readonly appearance = injectAvatarAppearance(this.size, this.shape);

  /**
   * Names of the avatars this chip stands in for. When non-empty the chip
   * turns into a real focusable trigger that reveals them on hover and on
   * keyboard focus - the behaviour Ant Design's `Avatar.Group` gives its
   * `maxCount` overflow indicator (`maxPopoverTrigger`), where a static `+N`
   * is otherwise a dead end for anyone trying to find out WHO is hidden.
   *
   * Left empty (and with no `panelTemplate`) the chip stays exactly what it
   * was: inert, non-focusable text. That keeps a group whose hidden members
   * have no names to show from advertising an empty panel, and keeps this
   * input additive for existing callers.
   */
  readonly hiddenNames = input<readonly string[]>([]);

  /**
   * Optional heading rendered above the names inside the panel, e.g.
   * "4 more people". Not defaulted, because any default would be an
   * untranslated English string baked into every consuming app.
   */
  readonly overflowLabel = input('');

  readonly placement = input<AndesAvatarGroupCountPlacement>('top');
  readonly trigger = input<AndesAvatarGroupCountTrigger>('hover');

  /**
   * Custom panel content, replacing the plain list of names - e.g. the hidden
   * people rendered as avatars with links, which is what Ant's popover shows.
   * Receives the names and count (`AndesAvatarGroupCountPanelContext`). With
   * the `hover` trigger the panel is a tooltip, so keep it non-interactive;
   * use `trigger="click"` for links or buttons.
   */
  readonly panelTemplate = input<
    TemplateRef<AndesAvatarGroupCountPanelContext> | undefined
  >(undefined);

  protected readonly panelId = `andes-avatar-group-count-${nextPanelId++}`;

  private readonly _open = signal(false);
  protected readonly open = this._open.asReadonly();

  protected readonly interactive = computed(
    () => this.hiddenNames().length > 0 || !!this.panelTemplate(),
  );

  protected readonly isClick = computed(() => this.trigger() === 'click');

  protected readonly label = computed(() => `+${this.count()}`);

  protected readonly panelContext = computed<AndesAvatarGroupCountPanelContext>(
    () => ({
      $implicit: this.hiddenNames(),
      names: this.hiddenNames(),
      count: this.count(),
    }),
  );

  protected readonly classes = computed(() => {
    const preset = this.appearance.preset();
    return clsx(
      'andes-avatar-group-count',
      `andes-avatar-group-count--${this.appearance.shape()}`,
      preset
        ? `andes-avatar-group-count--${preset}`
        : 'andes-avatar-group-count--custom-size',
      `andes-avatar-group-count--${this.placement()}`,
      this.interactive() && 'andes-avatar-group-count--interactive',
    );
  });

  protected onPointerEnter(): void {
    if (this.interactive() && !this.isClick()) {
      this._open.set(true);
    }
  }

  protected onPointerLeave(): void {
    if (!this.isClick()) {
      this._open.set(false);
    }
  }

  protected onFocus(): void {
    if (!this.isClick()) {
      this.onOpen();
    }
  }

  protected onClick(): void {
    if (this.isClick()) {
      this._open.update((open) => !open);
    }
  }

  /**
   * Focus moving to somewhere else inside the chip - the click-mode panel is
   * focusable (`tabindex="-1"`) exactly so that clicking into it lands here -
   * keeps the panel open; anywhere else closes it.
   */
  protected onFocusLeave(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) {
      return;
    }
    this.onClose();
  }

  protected onEscape(trigger: HTMLButtonElement): void {
    const active = this.document.activeElement;
    const focusWasInPanel =
      this.host.nativeElement.contains(active) && active !== trigger;
    this.onClose();
    // Don't strand keyboard focus on a panel that no longer exists.
    if (focusWasInPanel) {
      trigger.focus();
    }
  }

  /**
   * Safari doesn't focus a `<button>` on click, so in click mode a click
   * outside never blurs anything - close explicitly instead.
   */
  protected onDocumentPointerDown(event: Event): void {
    if (
      this.open() &&
      !this.host.nativeElement.contains(event.target as Node | null)
    ) {
      this.onClose();
    }
  }

  protected onOpen(): void {
    if (this.interactive()) {
      this._open.set(true);
    }
  }

  protected onClose(): void {
    this._open.set(false);
  }
}
