import {
  AndesOverlayClosePrimitive,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  andesOverlayPreset,
  provideAndesOverlay,
  type AndesOverlayEdge,
} from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';

/** Which screen edge the sheet slides in from. */
export type AndesSheetSide = AndesOverlayEdge;

/**
 * A side panel that complements the main content of the screen - shadcn's `Sheet`.
 *
 * Built on the same `@andes-ng/primitives` overlay primitive as Dialog, configured
 * with the `drawer` preset (modal semantics: focus trap, scroll lock, backdrop) and
 * `positioning: { kind: 'edge' }` for the slide-in placement. Only the edge and the
 * panel's own sizing differ from a centered Dialog.
 *
 * ```html
 * <andes-sheet #sheet side="right">
 *   <button andesSheetTrigger>Open</button>
 *
 *   <andes-sheet-header>
 *     <h2 andesSheetTitle>Edit profile</h2>
 *     <p andesSheetDescription>Make changes to your profile here.</p>
 *   </andes-sheet-header>
 *
 *   <p>Body content…</p>
 *
 *   <andes-sheet-footer>
 *     <button andesSheetClose>Cancel</button>
 *   </andes-sheet-footer>
 * </andes-sheet>
 * ```
 */
@Component({
  selector: 'andes-sheet',
  imports: [AndesOverlayContentPrimitive, AndesOverlayClosePrimitive],
  providers: [provideAndesOverlay()],
  templateUrl: './sheet.html',
  styleUrl: './sheet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesSheet {
  /** Injected so `AndesSheetTrigger`/parts can reach the shared overlay instance. */
  protected readonly overlay = inject(AndesOverlayPrimitive);

  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  /** Which viewport edge the panel slides in from. Default `'right'`. */
  readonly side = input<AndesSheetSide>('right');
  /** Escape closes the sheet. Default `true`. */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });
  /** A click outside the panel (or on its backdrop) closes the sheet. Default `true`. */
  readonly closeOnOutsideClick = input(true, { transform: booleanAttribute });

  /**
   * Controls visibility. Two-way bindable: `[(open)]="isOpen"`, matching Base UI
   * Dialog's `open`/`onOpenChange`. Leave unbound for uncontrolled use via the
   * trigger, `open()`/`close()`/`toggle()`.
   */
  readonly isOpen = model(false, { alias: 'open' });

  private readonly _titleId = signal<string | null>(null);
  private readonly _descriptionId = signal<string | null>(null);

  protected readonly ariaLabelledBy = computed(
    () => this._titleId() ?? undefined,
  );
  protected readonly ariaDescribedBy = computed(
    () => this._descriptionId() ?? undefined,
  );

  /** Guards against re-entrant writes while syncing `isOpen` from the overlay. */
  private isSyncingFromOverlay = false;

  constructor() {
    this.overlay.configure(andesOverlayPreset('drawer'));

    effect(() => {
      this.overlay.configure({
        positioning: { kind: 'edge', edge: this.side() },
        closeOnEscape: this.closeOnEscape(),
        closeOnOutsideClick: this.closeOnOutsideClick(),
      });
    });

    effect(() => {
      const shouldBeOpen = this.isOpen();
      if (this.isSyncingFromOverlay) {
        return;
      }
      if (shouldBeOpen) {
        this.overlay.open(this.panel());
      } else {
        this.overlay.close('imperative');
      }
    });

    // The overlay can close itself (Escape, outside click, the close button, or
    // being torn down) without anyone touching `isOpen` - keep the model in sync
    // either way so a `[(open)]` consumer never sees a stale `true`.
    this.overlay.closed.subscribe(() => {
      if (!this.isOpen()) {
        return;
      }
      this.isSyncingFromOverlay = true;
      this.isOpen.set(false);
      this.isSyncingFromOverlay = false;
    });
  }

  /** Opens the sheet. A no-op if already open. */
  open(): void {
    this.isOpen.set(true);
  }

  /** Closes the sheet. A no-op if already closed. */
  close(): void {
    this.isOpen.set(false);
  }

  /** Opens the sheet if closed, closes it if open. */
  toggle(): void {
    this.isOpen.update((value) => !value);
  }

  /** Registers the id of the projected `andesSheetTitle`, for `aria-labelledby`. */
  registerTitleId(id: string | null): void {
    this._titleId.set(id);
  }

  /** Registers the id of the projected `andesSheetDescription`, for `aria-describedby`. */
  registerDescriptionId(id: string | null): void {
    this._descriptionId.set(id);
  }
}
