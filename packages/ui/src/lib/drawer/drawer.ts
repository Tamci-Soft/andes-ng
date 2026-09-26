import {
  AndesOverlayContentPrimitive,
  provideAndesOverlay,
  type AndesOverlayEdge,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  ANDES_EDGE_PANEL,
  AndesEdgePanel,
  AndesEdgePanelLazyOutlet,
  type AndesEdgePanelLength,
} from '../sheet/edge-panel';

/**
 * A bottom-anchored panel - shadcn's `Drawer` (Base UI–backed since its migration
 * off `vaul`).
 *
 * Shares its whole behavior with `AndesSheet` (same overlay primitive, `drawer`
 * preset, dismissal, slide-out, `size`/`height`, `push`, `loading`, lazy
 * content…); only the edge is fixed to `bottom`, since a drawer is specifically
 * the bottom-sheet pattern. Use `AndesSheet` for the other three edges.
 *
 * **Not implemented**: swipe-to-dismiss and snap-points - the gesture layer that
 * makes a "drawer" feel different from a bottom-anchored Sheet. The overlay
 * primitive intentionally ships no gesture/swipe handling, and reimplementing
 * pointer/touch gesture recognition is out of scope here; track it as a
 * follow-up before calling Drawer feature-complete against shadcn/Base UI.
 *
 * ```html
 * <andes-drawer>
 *   <button andesDrawerTrigger>Open</button>
 *
 *   <andes-drawer-header>
 *     <andes-drawer-title>Move goal</andes-drawer-title>
 *     <andes-drawer-description>Set your daily activity goal.</andes-drawer-description>
 *   </andes-drawer-header>
 *
 *   <p>Body content…</p>
 *
 *   <andes-drawer-footer>
 *     <button andesDrawerClose>Cancel</button>
 *   </andes-drawer-footer>
 * </andes-drawer>
 * ```
 *
 * Styling hooks, settable on the panel via `panelClass` or globally:
 * `--andes-drawer-size` (height; default 378px), `--andes-drawer-padding`
 * (header/body/footer padding) and `--andes-drawer-push-distance`.
 */
@Component({
  selector: 'andes-drawer',
  imports: [
    AndesOverlayContentPrimitive,
    NgTemplateOutlet,
    AndesEdgePanelLazyOutlet,
  ],
  providers: [
    provideAndesOverlay(),
    { provide: ANDES_EDGE_PANEL, useExisting: AndesDrawer },
  ],
  templateUrl: './drawer.html',
  styleUrl: './drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesDrawer extends AndesEdgePanel {
  protected panelEdge(): AndesOverlayEdge {
    return 'bottom';
  }

  protected explicitSize(): AndesEdgePanelLength | null {
    return this.height();
  }
}
