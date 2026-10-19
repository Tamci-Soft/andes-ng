import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import type { AndesAvatarFace } from './avatar-face';
import {
  AndesAvatarFaceGrid,
  type AndesAvatarGroupCountLayout,
  faceColumns,
  MAX_VISIBLE_ROWS,
} from './avatar-face-grid';
import type { AndesAvatarShape } from './avatar-group-context';
import {
  type AndesAvatarSizeInput,
  injectAvatarAppearance,
} from './avatar-size';

let nextPanelId = 0;

export type { AndesAvatarGroupCountLayout } from './avatar-face-grid';

/** Edge of a preset step, px - what the panel's faces are scaled from. */
const PRESET_PX = { xs: 20, sm: 24, md: 32, lg: 40, xl: 56 } as const;
/** Faces smaller or larger than this are hard to aim at or waste space. */
const MIN_FACE_PX = 28;
const MAX_FACE_PX = 48;
/** Keep the panel this far (px) from the viewport edge. */
const VIEWPORT_MARGIN = 8;

/** Where the reveal panel opens relative to the `+N` chip (`max.popover.placement`). */
export type AndesAvatarGroupCountPlacement = 'top' | 'bottom';

/**
 * What opens the reveal panel (`max.popover.trigger`).
 *
 * - `hover` (default): pointer hover, plus keyboard focus and tap - a
 *   hover-only trigger would lock keyboard and touch users out. A panel of
 *   faces is reachable from the chip (Tab, or Arrow Down/Up) and counts as
 *   part of it, so the pointer can cross into it and scroll it; a names-only
 *   panel is a WAI-ARIA tooltip: read-only text, described by the trigger.
 * - `focus`: keyboard focus and tap only, never pointer hover - for dense
 *   rows where a panel popping up as the pointer sweeps past is noise.
 * - `click`: toggles on click/Enter/Space and stays open until Escape, a
 *   click outside or focus leaving the chip. The panel is a disclosure
 *   (`aria-expanded` + `aria-controls`) and can hold interactive content,
 *   e.g. a custom `panelTemplate` with links.
 *
 * With faces the trigger is a disclosure button in every mode
 * (`aria-expanded` + `aria-controls`), because the panel holds focusable
 * content and a tooltip must not.
 */
export type AndesAvatarGroupCountTrigger = 'hover' | 'focus' | 'click';

/** Template context of `panelTemplate`. */
export interface AndesAvatarGroupCountPanelContext {
  /** The hidden names (`hiddenNames`), also available as `names`. */
  readonly $implicit: readonly string[];
  readonly names: readonly string[];
  /** The hidden avatars as faces (`hiddenFaces`): name, photo, initials, colors. */
  readonly faces: readonly AndesAvatarFace[];
  /** The `+N` count. */
  readonly count: number;
}

@Component({
  selector: 'andes-avatar-group-count',
  imports: [NgTemplateOutlet, AndesAvatarFaceGrid],
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
  private readonly injector = inject(Injector);

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
   * keyboard focus, because a static `+N` is otherwise a dead end for anyone
   * trying to find out WHO is hidden.
   *
   * Left empty (and with no `panelTemplate`) the chip stays exactly what it
   * was: inert, non-focusable text. That keeps a group whose hidden members
   * have no names to show from advertising an empty panel, and keeps this
   * input additive for existing callers.
   */
  readonly hiddenNames = input<readonly string[]>([]);

  /**
   * The hidden avatars as faces: a photo, else initials, else a person glyph,
   * named for assistive technology and in the caption under the grid. When
   * non-empty (and there is no `panelTemplate`) the panel is a grid of these
   * faces instead of a list of names - a scrolling grid for many, or one
   * line (`panelLayout="row"`) for a few. `AndesAvatarGroup`'s `max` fills it
   * from the hidden avatars.
   */
  readonly hiddenFaces = input<readonly AndesAvatarFace[]>([]);

  /**
   * Heading rendered above the panel's content, e.g. "Also in this project".
   * Left empty, the names list has no heading, and the faces grid shows
   * `moreLabel` as its heading only when it scrolls.
   */
  readonly overflowLabel = input('');

  /**
   * Text for the chip's accessible name, the faces grid's name and the heading
   * of a scrolling faces grid; `{count}` is replaced by the number hidden.
   * Translate it when the app is not English.
   */
  readonly moreLabel = input('+{count} more');

  /**
   * `grid` (default): a wrapping grid, 6-8 faces wide, that scrolls
   * vertically past five rows - fine for any number of faces. `row`: one
   * horizontal line that scrolls sideways and snaps to faces - only for a
   * handful.
   */
  readonly panelLayout = input<AndesAvatarGroupCountLayout>('grid');

  /** Emits each time the panel opens, so a group can refresh `hiddenFaces`. */
  readonly opened = output<void>();

  readonly placement = input<AndesAvatarGroupCountPlacement>('top');
  readonly trigger = input<AndesAvatarGroupCountTrigger>('hover');

  /**
   * Custom panel content, replacing the plain list of names - e.g. the hidden
   * people rendered as avatars with links.
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
    () =>
      this.hiddenNames().length > 0 ||
      this.hiddenFaces().length > 0 ||
      !!this.panelTemplate(),
  );

  /** Whether the panel is the grid of faces (no custom template to replace it). */
  protected readonly facesMode = computed(
    () => this.hiddenFaces().length > 0 && !this.panelTemplate(),
  );

  protected readonly moreText = computed(() =>
    this.moreLabel().replace('{count}', String(this.count())),
  );

  /** Edge of one face in the panel: the chip's own size, kept easy to aim at. */
  protected readonly faceSize = computed(() => {
    const size = this.appearance.size();
    const px = typeof size === 'number' ? size : PRESET_PX[size];
    return Math.min(MAX_FACE_PX, Math.max(MIN_FACE_PX, Math.round(px)));
  });

  /** A heading is shown when the grid scrolls, or when the app supplied one. */
  protected readonly heading = computed(() => {
    if (this.overflowLabel()) {
      return this.overflowLabel();
    }
    const rows = Math.ceil(
      this.hiddenFaces().length / faceColumns(this.faceSize()),
    );
    return this.panelLayout() === 'grid' && rows > MAX_VISIBLE_ROWS
      ? this.moreText()
      : '';
  });

  private readonly grid = viewChild(AndesAvatarFaceGrid);

  /** Horizontal nudge (px) that keeps a wide panel inside the viewport. */
  protected readonly panelShift = signal(0);

  /** Set while Escape hands focus back to the chip, so that focus does not reopen it. */
  private restoringFocus = false;

  protected readonly isClick = computed(() => this.trigger() === 'click');

  protected readonly label = computed(() => `+${this.count()}`);

  protected readonly panelContext = computed<AndesAvatarGroupCountPanelContext>(
    () => ({
      $implicit: this.hiddenNames(),
      names: this.hiddenNames(),
      faces: this.hiddenFaces(),
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

  constructor() {
    // A panel centered on a chip near the edge of the screen would run off it:
    // once it is drawn, measure it and slide it back inside.
    effect(() => {
      if (this.open() && this.facesMode()) {
        afterNextRender(() => this.keepInViewport(), {
          injector: this.injector,
        });
      } else {
        this.panelShift.set(0);
      }
    });
  }

  protected onPointerEnter(): void {
    if (this.interactive() && this.trigger() === 'hover') {
      this.setOpen(true);
    }
  }

  protected onPointerLeave(): void {
    if (this.trigger() !== 'hover') {
      return;
    }
    // A face the keyboard is on keeps the panel open: closing it would drop
    // the focus. It closes when focus leaves instead.
    const active = this.document.activeElement;
    if (
      this.host.nativeElement.contains(active) &&
      !this.isChipButton(active)
    ) {
      return;
    }
    this.setOpen(false);
  }

  protected onFocus(): void {
    if (!this.isClick() && !this.restoringFocus) {
      this.onOpen();
    }
  }

  protected onClick(): void {
    if (this.isClick()) {
      this.setOpen(!this.open());
    }
  }

  /**
   * Arrow Down/Up on the chip moves into the panel of faces, opening it first
   * if Escape or a pointer leaving had closed it.
   */
  protected onTriggerArrow(event: Event): void {
    if (!this.facesMode()) {
      return;
    }
    event.preventDefault();
    this.onOpen();
    const grid = this.grid();
    if (grid) {
      grid.focusFirst();
    } else {
      afterNextRender(() => this.grid()?.focusFirst(), {
        injector: this.injector,
      });
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

  protected onEscape(event: Event, trigger: HTMLButtonElement): void {
    const active = this.document.activeElement;
    const focusWasInPanel =
      this.host.nativeElement.contains(active) && active !== trigger;
    if (this.open()) {
      // The panel took the key: a dialog around the group stays open.
      event.stopPropagation();
    }
    this.onClose();
    // Don't strand keyboard focus on a panel that no longer exists.
    if (focusWasInPanel) {
      this.restoringFocus = true;
      trigger.focus();
      this.restoringFocus = false;
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
      this.setOpen(true);
    }
  }

  protected onClose(): void {
    this.setOpen(false);
  }

  private setOpen(open: boolean): void {
    if (open === this._open()) {
      return;
    }
    this._open.set(open);
    if (open) {
      this.opened.emit();
    }
  }

  private isChipButton(element: Element | null): boolean {
    return (
      element !== null &&
      element.classList.contains('andes-avatar-group-count__trigger')
    );
  }

  private keepInViewport(): void {
    const panel = this.host.nativeElement.querySelector<HTMLElement>(
      '.andes-avatar-group-count__panel',
    );
    const view = this.document.defaultView;
    if (!panel || !view) {
      return;
    }
    const { left, right, width } = panel.getBoundingClientRect();
    if (width === 0) {
      return;
    }
    const shift = this.panelShift();
    // Measured with the current shift in place, so work from the unshifted edges.
    const naturalLeft = left - shift;
    const naturalRight = right - shift;
    const min = VIEWPORT_MARGIN;
    const max = view.innerWidth - VIEWPORT_MARGIN;
    let next = 0;
    if (naturalLeft < min) {
      next = min - naturalLeft;
    } else if (naturalRight > max) {
      next = max - naturalRight;
    }
    this.panelShift.set(Math.round(next));
  }
}
