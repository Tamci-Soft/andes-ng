import {
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  type AndesOverlayAlign,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';

import { AndesSelectState } from './select-state';

/**
 * The `role="listbox"` panel holding the options.
 *
 * It renders nothing in place: its content is a template the select hands to the overlay
 * primitive when it opens, so the panel ends up in the overlay container (outside this
 * component's DOM subtree) where it cannot be clipped by an ancestor's `overflow`. That
 * is also why the trigger's `aria-controls` and the panel's `id` are wired explicitly by
 * the primitive rather than relying on DOM containment.
 */
@Component({
  selector: 'andes-select-content',
  imports: [AndesOverlayContentPrimitive],
  templateUrl: './select-content.html',
  styleUrl: './select-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesSelectContent {
  protected readonly select = inject(AndesSelectState);
  private readonly overlay = inject(AndesOverlayPrimitive);

  /** Preferred side of the trigger to render on. Flips when it does not fit. */
  readonly side = input<AndesOverlaySide>('bottom');
  /** Alignment along that side. */
  readonly align = input<AndesOverlayAlign>('start');
  /** Gap in px between trigger and panel. */
  readonly sideOffset = input(4);
  /** Size the panel to the trigger's width, as a native `<select>` does. */
  readonly matchTriggerWidth = input(true, { transform: booleanAttribute });

  /** @internal The template `AndesSelect` opens. */
  readonly panelTemplate = viewChild.required(TemplateRef);

  constructor() {
    effect(() => {
      this.overlay.configure({
        positioning: {
          kind: 'anchored',
          side: this.side(),
          align: this.align(),
          sideOffset: this.sideOffset(),
          matchAnchorWidth: this.matchTriggerWidth(),
        },
      });
    });
  }
}
