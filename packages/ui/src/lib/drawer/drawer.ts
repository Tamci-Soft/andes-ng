import {
  AndesOverlayClosePrimitive,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  andesOverlayPreset,
  provideAndesOverlay,
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

/**
 * A bottom-anchored panel - shadcn's `Drawer` (Base UI–backed since its migration
 * off `vaul`), Ant Design's mobile-style `Drawer` placement.
 *
 * Built on the same `@andes-ng/primitives` overlay primitive as Dialog and Sheet,
 * configured with the `drawer` preset and `positioning: { kind: 'edge', edge:
 * 'bottom' }` - fixed, unlike Sheet's configurable `side`, since a drawer is
 * specifically the bottom-sheet pattern.
 *
 * **Scope of this component**: only basic open/close (trigger click, Escape,
 * backdrop click, an in-content close button) is implemented. Swipe-to-dismiss
 * and snap-points - the gesture layer that makes a "drawer" feel different from a
 * bottom-anchored Sheet - are **explicitly deferred**. `@andes-ng/primitives`'
 * overlay primitive intentionally ships no gesture/swipe handling (see its own
 * docs), and reimplementing pointer/touch gesture recognition from scratch is out
 * of scope here; track it as a follow-up before calling Drawer feature-complete
 * against the shadcn/Base UI reference.
 *
 * ```html
 * <andes-drawer #drawer>
 *   <button andesDrawerTrigger>Open</button>
 *
 *   <andes-drawer-header>
 *     <h2 andesDrawerTitle>Move goal</h2>
 *     <p andesDrawerDescription>Set your daily activity goal.</p>
 *   </andes-drawer-header>
 *
 *   <p>Body content…</p>
 *
 *   <andes-drawer-footer>
 *     <button andesDrawerClose>Cancel</button>
 *   </andes-drawer-footer>
 * </andes-drawer>
 * ```
 */
@Component({
  selector: 'andes-drawer',
  imports: [AndesOverlayContentPrimitive, AndesOverlayClosePrimitive],
  providers: [provideAndesOverlay()],
  templateUrl: './drawer.html',
  styleUrl: './drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesDrawer {
  /** Injected so `AndesDrawerTrigger`/parts can reach the shared overlay instance. */
  protected readonly overlay = inject(AndesOverlayPrimitive);

  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  /** Escape closes the drawer. Default `true`. */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });
  /** A click outside the panel (or on its backdrop) closes the drawer. Default `true`. */
  readonly closeOnOutsideClick = input(true, { transform: booleanAttribute });

  /**
   * Controls visibility. Two-way bindable: `[(open)]="isOpen"`, matching Base UI
   * Drawer's `open`/`onOpenChange`. Leave unbound for uncontrolled use via the
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
    this.overlay.configure({
      ...andesOverlayPreset('drawer'),
      positioning: { kind: 'edge', edge: 'bottom' },
    });

    effect(() => {
      this.overlay.configure({
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

  /** Opens the drawer. A no-op if already open. */
  open(): void {
    this.isOpen.set(true);
  }

  /** Closes the drawer. A no-op if already closed. */
  close(): void {
    this.isOpen.set(false);
  }

  /** Opens the drawer if closed, closes it if open. */
  toggle(): void {
    this.isOpen.update((value) => !value);
  }

  /** Registers the id of the projected `andesDrawerTitle`, for `aria-labelledby`. */
  registerTitleId(id: string | null): void {
    this._titleId.set(id);
  }

  /** Registers the id of the projected `andesDrawerDescription`, for `aria-describedby`. */
  registerDescriptionId(id: string | null): void {
    this._descriptionId.set(id);
  }
}
