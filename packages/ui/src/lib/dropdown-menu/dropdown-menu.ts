import {
  AndesListNavigation,
  andesOverlayPreset,
  AndesOverlayCloseReason,
  AndesOverlayPrimitive,
  provideAndesOverlay,
} from '@andes-ng/primitives';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Signal,
  signal,
  TemplateRef,
  viewChild,
  WritableSignal,
} from '@angular/core';

/**
 * A menu of actions, triggered by a button, positioned relative to it and navigated
 * with the arrow keys.
 *
 * Built on the shared `@andes-ng/primitives` overlay (portal, positioning, dismissal,
 * focus-return) and listbox (roving-tabindex arrow-key navigation, typeahead)
 * primitives rather than reimplementing either: this component wires the two
 * together and provides the styled anatomy (`AndesDropdownMenuContent`,
 * `AndesDropdownMenuItem`, etc.) that the rest of `@andes-ng/ui` builds on.
 *
 * `providers` (not `viewProviders`) is what makes `AndesOverlayPrimitive` and
 * `AndesListNavigation` resolvable by every sub-part below, even though they are all
 * authored as *content children* of `<andes-dropdown-menu>` rather than inside its
 * own template — content-projected descendants can see a component's `providers`,
 * just not its `viewProviders`.
 *
 * ```html
 * <andes-dropdown-menu>
 *   <button type="button" andesDropdownMenuTrigger>Options</button>
 *   <andes-dropdown-menu-content>
 *     <andes-dropdown-menu-item (activated)="edit()">Edit</andes-dropdown-menu-item>
 *     <andes-dropdown-menu-separator />
 *     <andes-dropdown-menu-item variant="destructive" (activated)="remove()">
 *       Delete
 *     </andes-dropdown-menu-item>
 *   </andes-dropdown-menu-content>
 * </andes-dropdown-menu>
 * ```
 *
 * Submenus (`AndesDropdownMenuSub`/`SubTrigger`/`SubContent`) are not implemented -
 * see the package README / PR description for why.
 */
@Component({
  selector: 'andes-dropdown-menu',
  template: `
    <ng-content select="[andesDropdownMenuTrigger]" />
    <ng-template #contentTemplate>
      <ng-content />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideAndesOverlay(), AndesListNavigation],
})
export class AndesDropdownMenu {
  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly navigation = inject(AndesListNavigation);

  private readonly contentTemplate =
    viewChild.required<TemplateRef<unknown>>('contentTemplate');

  /** Whether the menu is currently open. */
  readonly isOpen: Signal<boolean> = this.overlay.isOpen;

  private readonly radioGroupValues = new Map<
    string,
    WritableSignal<unknown>
  >();

  constructor() {
    this.overlay.configure(andesOverlayPreset('menu'));
    this.navigation.configure({
      orientation: 'vertical',
      focusMode: 'roving-tabindex',
      wrap: true,
    });

    // `keydownEvents` only ever emits for the topmost overlay, which is exactly
    // what is needed here (and what will keep a future submenu's own navigation
    // from also reacting to keys meant for it).
    this.overlay.keydownEvents
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.navigation.onKeydown(event));

    this.overlay.closed
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.navigation.clearActive());
  }

  /** Opens the menu, focusing its first enabled item. A no-op if already open. */
  open(): void {
    this.overlay.open(this.contentTemplate());
  }

  /**
   * Opens the menu, focusing its last enabled item - `ArrowUp` on a closed trigger.
   * A no-op if already open.
   */
  openFocusingLast(): void {
    if (this.overlay.isOpen()) {
      return;
    }
    this.overlay.open(this.contentTemplate());
    // The overlay's own `first-tabbable` autofocus (from the `menu` preset) runs as
    // part of opening and may resolve asynchronously; deferring one macrotask lets
    // this override land after it instead of racing it.
    setTimeout(() => this.navigation.focusLast());
  }

  /** Closes the menu. A no-op if already closed. */
  close(reason: AndesOverlayCloseReason = 'trigger'): void {
    this.overlay.close(reason);
  }

  /** Opens the menu if closed, closes it if open. */
  toggle(): void {
    if (this.overlay.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * @internal Current value of the named radio group. Used by
   * `AndesDropdownMenuRadioItem` - there is no separate `AndesDropdownMenuRadioGroup`
   * component, so grouping is by matching `name`, the same as native radio inputs.
   */
  radioGroupValue(name: string): Signal<unknown> {
    return this.radioGroupSignal(name).asReadonly();
  }

  /** @internal Selects `value` within the named radio group. */
  setRadioGroupValue(name: string, value: unknown): void {
    this.radioGroupSignal(name).set(value);
  }

  private radioGroupSignal(name: string): WritableSignal<unknown> {
    let value = this.radioGroupValues.get(name);
    if (!value) {
      value = signal<unknown>(undefined);
      this.radioGroupValues.set(name, value);
    }
    return value;
  }
}
