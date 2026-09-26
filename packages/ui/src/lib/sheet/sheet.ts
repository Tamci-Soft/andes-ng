import {
  AndesOverlayContentPrimitive,
  provideAndesOverlay,
  type AndesOverlayEdge,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  ANDES_EDGE_PANEL,
  AndesEdgePanel,
  AndesEdgePanelLazyOutlet,
  type AndesEdgePanelLength,
} from './edge-panel';

/** Which screen edge the sheet slides in from. */
export type AndesSheetSide = AndesOverlayEdge;

/**
 * A side panel that complements the main content of the screen - shadcn's
 * `Sheet`.
 *
 * Built on the same `@andes-ng/primitives` overlay primitive as Dialog, configured
 * with the `drawer` preset (modal semantics: focus trap, scroll lock, backdrop) and
 * `positioning: { kind: 'edge' }` for the slide-in placement.
 *
 * The header and footer parts are laid out around a scrolling body, so they stay
 * put while long content scrolls. Body content is either projected directly
 * (always rendered, owned by your view) or put in an
 * `<ng-template andesSheetContent>` to render it lazily on first open - see
 * `destroyOnHidden`.
 *
 * ```html
 * <andes-sheet side="right" size="large">
 *   <button andesSheetTrigger>Open</button>
 *
 *   <andes-sheet-header>
 *     <andes-sheet-title>Edit profile</andes-sheet-title>
 *     <andes-sheet-description>Make changes to your profile here.</andes-sheet-description>
 *     <button andesSheetExtra>Help</button>
 *   </andes-sheet-header>
 *
 *   <p>Body content…</p>
 *
 *   <andes-sheet-footer>
 *     <button andesSheetClose>Cancel</button>
 *   </andes-sheet-footer>
 * </andes-sheet>
 * ```
 *
 * Styling hooks, settable on the panel via `panelClass` or globally:
 * `--andes-sheet-size` (width for left/right, height for top/bottom; default
 * 378px), `--andes-sheet-padding` (header/body/footer padding) and
 * `--andes-sheet-push-distance`.
 */
@Component({
  selector: 'andes-sheet',
  imports: [
    AndesOverlayContentPrimitive,
    NgTemplateOutlet,
    AndesEdgePanelLazyOutlet,
  ],
  providers: [
    provideAndesOverlay(),
    { provide: ANDES_EDGE_PANEL, useExisting: AndesSheet },
  ],
  templateUrl: './sheet.html',
  styleUrl: './sheet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesSheet extends AndesEdgePanel {
  /** Which viewport edge the panel slides in from. Default `'right'`. */
  readonly side = input<AndesSheetSide>('right');

  /**
   * Explicit width (number = px, or a CSS length). Wins over `size` when the
   * panel slides horizontally (left/right); ignored for top/bottom.
   */
  readonly width = input<AndesEdgePanelLength | null>(null);

  protected panelEdge(): AndesOverlayEdge {
    return this.side();
  }

  protected explicitSize(): AndesEdgePanelLength | null {
    const side = this.side();
    return side === 'left' || side === 'right' ? this.width() : this.height();
  }
}
