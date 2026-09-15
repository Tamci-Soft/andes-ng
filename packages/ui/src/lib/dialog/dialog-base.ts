import {
  andesOverlayPreset,
  AndesOverlayPrimitive,
  type AndesOverlayCloseReason,
  type AndesOverlayConfig,
  type AndesOverlayPreset,
} from '@andes-ng/primitives';
import {
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Max-width step of a dialog surface. Neither reference library exposes a size
 * enum (shadcn styles `DialogContent` with utility classes, Ant takes a free-form
 * `width`), but a token-driven scale is the andes-ng equivalent of both and keeps
 * consumers off magic pixel values.
 */
export type AndesDialogSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Extra class both dialog roots put on their backdrop, so `dialog.css` can retime the
 * scrim's fade without reaching the backdrop of every other overlay through the shared
 * `andes-overlay-backdrop` hook.
 */
export const ANDES_DIALOG_BACKDROP_CLASS = 'andes-dialog-backdrop';

/**
 * The root of a dialog compound, as seen by its sub-parts.
 *
 * Both `AndesDialog` and `AndesAlertDialog` provide themselves under this token, so
 * a trigger/close/action directive drives whichever root it happens to sit inside
 * without importing either of them (and without a circular import).
 */
export abstract class AndesDialogRoot {
  /** Whether the dialog is currently open. */
  abstract readonly isOpen: Signal<boolean>;
  /** The surface's max-width step. */
  abstract readonly size: Signal<AndesDialogSize>;
  /** Opens the dialog. */
  abstract show(): void;
  /** Closes the dialog, reporting `reason` on the `closed` output. */
  abstract hide(reason?: AndesOverlayCloseReason): void;
  /** Opens the dialog if closed, closes it if open. */
  abstract toggle(): void;
}

/**
 * The surface element of a dialog compound, as seen by the parts rendered inside
 * it. Title and description register their ids here so the surface can point
 * `aria-labelledby`/`aria-describedby` at them — the relationship both reference
 * libraries treat as mandatory rather than optional for a dialog.
 */
export abstract class AndesDialogSurface {
  /** Registers (or, with `null`, clears) the element labelling the surface. */
  abstract registerTitleId(id: string | null): void;
  /** Registers (or, with `null`, clears) the element describing the surface. */
  abstract registerDescriptionId(id: string | null): void;
}

/**
 * Everything `AndesDialog` and `AndesAlertDialog` share: the overlay instance, the
 * open-state contract and the mapping from inputs onto the overlay's behavior
 * config. Subclasses only choose an overlay preset and say where their surface
 * template comes from.
 */
@Directive({
  host: {
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
  },
})
export abstract class AndesDialogRootBase implements AndesDialogRoot {
  /** The overlay this root owns. Provided by the concrete component. */
  protected readonly overlay = inject(AndesOverlayPrimitive);

  /** Two-way open state, the equivalent of shadcn's `open`/`onOpenChange`. */
  readonly open = model(false);
  /** Escape closes the dialog. Mirrors Ant's `keyboard`. */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });
  /** Block document scroll while open. Mirrors Ant's `scrollLock`. */
  readonly lockScroll = input(true, { transform: booleanAttribute });
  /** Max-width step of the surface. */
  readonly size = input<AndesDialogSize>('md');
  /**
   * Element focus returns to on close, overriding the trigger. The equivalent of
   * Base UI's `finalFocus`.
   */
  readonly restoreFocusTo = input<HTMLElement | null>(null);

  /** Emits after the dialog has opened. */
  readonly opened = output<void>();
  /** Emits why the dialog closed, after it has closed. */
  readonly closed = output<AndesOverlayCloseReason>();

  /** Whether the dialog is currently open. */
  readonly isOpen = this.overlay.isOpen;

  /** Which overlay preset this root drives. */
  protected abstract overlayPreset(): AndesOverlayPreset;

  /** The surface template to portal, once the consumer has declared one. */
  protected abstract surfaceTemplate(): TemplateRef<void> | undefined;

  /**
   * Config a subclass layers on top of its preset and the shared inputs. Read
   * inside an effect, so it may read signals.
   */
  protected configOverrides(): Partial<AndesOverlayConfig> {
    return {};
  }

  constructor() {
    // The presets were designed for exactly these two components; deriving the
    // config field by field here would be a second, drifting source of truth.
    this.overlay.configure(andesOverlayPreset(this.overlayPreset()));

    effect(() => {
      this.overlay.configure({
        closeOnEscape: this.closeOnEscape(),
        lockScroll: this.lockScroll(),
        ...this.configOverrides(),
      });
    });

    effect(() => {
      const shouldOpen = this.open();
      const template = this.surfaceTemplate();

      if (!shouldOpen) {
        this.overlay.close();
        return;
      }
      // A `show()` that lands before the content query has resolved is not lost:
      // this effect re-runs when the template arrives.
      if (template) {
        this.overlay.open(template, {
          restoreFocusTo: this.restoreFocusTo(),
        });
      }
    });

    this.overlay.opened
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.opened.emit());

    // Every close path - Escape, backdrop, close button, destruction - funnels
    // through here, so the two-way `open` cannot drift out of sync with reality.
    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe((reason) => {
      this.open.set(false);
      this.closed.emit(reason);
    });
  }

  show(): void {
    this.open.set(true);
  }

  hide(reason: AndesOverlayCloseReason = 'imperative'): void {
    this.overlay.close(reason);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.hide('trigger');
    } else {
      this.show();
    }
  }
}

/**
 * Shared surface behavior: collecting the ids of the title and description parts
 * rendered inside, so the concrete surface can expose them as
 * `aria-labelledby`/`aria-describedby`.
 */
@Directive({})
export abstract class AndesDialogSurfaceBase implements AndesDialogSurface {
  private readonly _titleId = signal<string | null>(null);
  private readonly _descriptionId = signal<string | null>(null);

  /** Id of the registered title part, if any. */
  readonly titleId = this._titleId.asReadonly();
  /** Id of the registered description part, if any. */
  readonly descriptionId = this._descriptionId.asReadonly();

  registerTitleId(id: string | null): void {
    this._titleId.set(id);
  }

  registerDescriptionId(id: string | null): void {
    this._descriptionId.set(id);
  }
}

let nextLabelId = 0;

/**
 * Registers the host element as a dialog surface's label or description.
 *
 * Reuses an author-supplied `id` when there is one, so a consumer that already
 * wires `aria-labelledby` by hand keeps their own id rather than having it
 * silently replaced.
 */
export function registerDialogLabel(part: 'title' | 'description'): string {
  const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const surface = inject(AndesDialogSurface);
  const id = element.id || `andes-dialog-${part}-${nextLabelId++}`;

  if (part === 'title') {
    surface.registerTitleId(id);
    inject(DestroyRef).onDestroy(() => surface.registerTitleId(null));
  } else {
    surface.registerDescriptionId(id);
    inject(DestroyRef).onDestroy(() => surface.registerDescriptionId(null));
  }

  return id;
}
