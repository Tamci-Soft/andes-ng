import {
  andesOverlayPreset,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  provideAndesOverlay,
} from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  inject,
  input,
  model,
  output,
  type TemplateRef,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import clsx from 'clsx';

import { AndesCommand } from './command';
import {
  andesCommandMatchesHotkey,
  andesCommandParseHotkey,
} from './command-keys';
import type {
  AndesCommandEntry,
  AndesCommandFilter,
  AndesCommandItem,
  AndesCommandItemContext,
  AndesCommandSelectEvent,
} from './command-types';

/** Class of the overlay pane, the hook the stylesheet uses to place the dialog. */
export const ANDES_COMMAND_PANE_CLASS = 'andes-command-pane';
/** Class of the scrim, the hook the stylesheet uses to retime its fade. */
export const ANDES_COMMAND_BACKDROP_CLASS = 'andes-command-backdrop';

/**
 * A command palette in a modal dialog: `andes-command` over a scrim, opened from anywhere with
 * a keyboard shortcut.
 *
 * ```html
 * <andes-command-dialog [(open)]="open" [items]="items" (itemSelected)="run($event.item)" />
 * ```
 *
 * `Mod+K` (Command+K on Apple platforms, Ctrl+K elsewhere) toggles it by default; `hotkey`
 * takes another shortcut (`'ctrl+shift+p'`) or `null` for none. Focus is trapped inside while it
 * is open and returns to where it was on close; the page behind is inert. It closes on Escape
 * (which first leaves a nested page, if one is open), on a click on the scrim, and after an
 * item is selected unless `closeOnSelect` is off. The search, the nested pages and the active
 * item are reset when it closes.
 *
 * It takes the same inputs as `andes-command` and passes them through.
 */
@Component({
  selector: 'andes-command-dialog',
  imports: [AndesOverlayContentPrimitive, AndesCommand],
  templateUrl: './command-dialog.html',
  styleUrl: './command-dialog.css',
  // The pane, its wrapper and the scrim are created by the overlay outside this component's
  // view, so the stylesheet that places them cannot be scoped to it.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideAndesOverlay()],
})
export class AndesCommandDialog {
  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly document = inject(DOCUMENT);
  private readonly panel = viewChild<TemplateRef<unknown>>('panel');

  /** Whether the dialog is open. Two-way bindable. */
  readonly open = model(false);
  /**
   * The shortcut that toggles it from anywhere on the page: `'mod+k'` by default, `'ctrl+k'`,
   * `'alt+shift+p'`, ... or `null` for none.
   */
  readonly hotkey = input<string | null>('mod+k');
  /** Close after an item is selected. An item that opens a nested page never closes it. */
  readonly closeOnSelect = input(true, { transform: booleanAttribute });
  /** Clear the search, the nested pages and the active item when it closes. Default `true`. */
  readonly resetOnClose = input(true, { transform: booleanAttribute });
  /** Width of the dialog: px as a number, or any CSS length. Default `32rem`. */
  readonly width = input<number | string>('32rem');
  /** Extra classes on the dialog surface. */
  readonly panelClass = input<string | readonly string[] | null>(null);

  // The command's own inputs, passed straight through.
  readonly items = input<readonly AndesCommandEntry[]>([]);
  readonly pages = model<readonly AndesCommandItem[]>([]);
  readonly search = model('');
  readonly value = model<string | null>(null);
  readonly shouldFilter = input(true, { transform: booleanAttribute });
  readonly filter = input<AndesCommandFilter | null | undefined>(undefined);
  readonly loop = input(true, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly highlight = input(true, { transform: booleanAttribute });
  readonly vimBindings = input(false, { transform: booleanAttribute });
  readonly placeholder = input('Type a command or search…');
  readonly emptyText = input('No results found.');
  readonly loadingText = input('Loading…');
  /** The accessible name of the dialog, the search box and the list. */
  readonly label = input('Command menu');
  readonly backLabel = input('Back');
  readonly resultsLabel = input<(count: number) => string>((count) =>
    count === 1 ? '1 result' : `${count} results`,
  );
  readonly itemTemplate = input<
    TemplateRef<AndesCommandItemContext> | null | undefined
  >(undefined);

  /** An item was selected. */
  readonly itemSelected = output<AndesCommandSelectEvent>();

  protected readonly panelClasses = computed(() =>
    clsx('andes-command-dialog', this.panelClass()),
  );

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('dialog'),
      panelClass: ANDES_COMMAND_PANE_CLASS,
      backdropClass: ANDES_COMMAND_BACKDROP_CLASS,
      autoFocus: 'first-tabbable',
    });

    effect(() => {
      const width = this.width();
      this.overlay.configure({
        size: {
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: 'calc(100vw - 2rem)',
        },
      });
    });

    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe((reason) => {
      if (reason !== 'destroyed' && this.resetOnClose()) {
        this.pages.set([]);
        this.search.set('');
        this.value.set(null);
      }
    });

    // `open` -> overlay.
    effect(() => {
      const wanted = this.open();
      // Tracked, so an initial `open = true` waits for the template query.
      const panel = this.panel();
      untracked(() => {
        if (wanted && panel && !this.overlay.isOpen()) {
          this.overlay.open(panel);
        } else if (!wanted && this.overlay.isOpen()) {
          this.overlay.close();
        }
      });
    });

    // overlay -> `open`, the moment a close is requested (Escape, the scrim). Only genuine
    // changes are mirrored, so an initial `open = true` that has not opened yet is not undone.
    let wasOpen = false;
    effect(() => {
      const isOpen = this.overlay.isOpen();
      untracked(() => {
        if (isOpen !== wasOpen) {
          wasOpen = isOpen;
          if (this.open() !== isOpen) {
            this.open.set(isOpen);
          }
        }
      });
    });

    // The global shortcut.
    effect((onCleanup) => {
      const hotkey = andesCommandParseHotkey(this.hotkey());
      if (!hotkey) {
        return;
      }
      const listener = (event: KeyboardEvent) => {
        if (
          event.repeat ||
          event.isComposing ||
          !andesCommandMatchesHotkey(event, hotkey)
        ) {
          return;
        }
        event.preventDefault();
        this.open.update((open) => !open);
      };
      this.document.addEventListener('keydown', listener);
      onCleanup(() => this.document.removeEventListener('keydown', listener));
    });
  }

  /** Opens the dialog. */
  show(): void {
    this.open.set(true);
  }

  /** Closes the dialog. */
  hide(): void {
    this.open.set(false);
  }

  /** Opens it if closed, closes it if open. */
  toggle(): void {
    this.open.update((open) => !open);
  }

  protected onItemSelected(event: AndesCommandSelectEvent): void {
    this.itemSelected.emit(event);
    if (this.closeOnSelect()) {
      this.open.set(false);
    }
  }
}
