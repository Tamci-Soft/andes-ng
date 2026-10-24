import {
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  type AndesOverlayAlign,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';

import { AndesSelectGroup } from './select-group';
import { AndesSelectItem } from './select-item';
import { AndesSelectLabel } from './select-label';
import { AndesSelectState, matchTriggerWidthAttribute } from './select-state';

/**
 * The panel holding the options: a `role="listbox"` element, plus the loading and empty
 * states next to it (a listbox may only own options and groups).
 *
 * It renders nothing in place: its content is a template the select hands to the overlay
 * primitive when it opens, so the panel ends up in the overlay container (outside this
 * component's DOM subtree) where it cannot be clipped by an ancestor's `overflow`. That
 * is also why the combobox's `aria-controls` and the listbox's `id` are wired explicitly
 * rather than relying on DOM containment.
 *
 * Besides its projected items it renders the select's `options` array, the typed value
 * offered in `tags` mode, and the `tags`-mode values no option carries.
 */
@Component({
  selector: 'andes-select-content',
  imports: [
    AndesOverlayContentPrimitive,
    AndesSelectGroup,
    AndesSelectItem,
    AndesSelectLabel,
    NgTemplateOutlet,
  ],
  templateUrl: './select-content.html',
  styleUrl: './select-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesSelectContent {
  protected readonly select = inject(AndesSelectState);
  private readonly overlay = inject(AndesOverlayPrimitive);

  /** Preferred side of the trigger to render on. Flips when it does not fit. Defaults to the select's `placement`. */
  readonly side = input<AndesOverlaySide | undefined>(undefined);
  /** Alignment along that side. Defaults to the select's `placement`. */
  readonly align = input<AndesOverlayAlign | undefined>(undefined);
  /** Gap in px between trigger and panel. */
  readonly sideOffset = input(4);
  /**
   * Panel width: `true` sizes it to the trigger, as a native `<select>` does; `false`
   * sizes it to its own content; a number sets it in px. Defaults to the select's own
   * `matchTriggerWidth`, and to `true` when neither is set.
   */
  readonly matchTriggerWidth = input<boolean | number | undefined, unknown>(
    undefined,
    { transform: matchTriggerWidthAttribute },
  );

  /** @internal The resolved panel width rule. */
  protected readonly widthRule = computed(
    () => this.matchTriggerWidth() ?? this.select.matchTriggerWidth() ?? true,
  );
  protected readonly matchesTrigger = computed(() => this.widthRule() === true);
  protected readonly fixedWidth = computed(() => {
    const rule = this.widthRule();
    return typeof rule === 'number' ? rule : null;
  });

  /** @internal The template `AndesSelect` opens. */
  readonly panelTemplate = viewChild.required(TemplateRef);

  protected readonly notFoundTemplate = computed(() => {
    const content = this.select.notFoundContent();
    return content instanceof TemplateRef ? content : null;
  });

  protected readonly notFoundText = computed(() => {
    const content = this.select.notFoundContent();
    return typeof content === 'string' ? content : '';
  });

  constructor() {
    effect(() => {
      this.overlay.configure({
        positioning: {
          kind: 'anchored',
          side: this.side() ?? this.select.placementSide(),
          align: this.align() ?? this.select.placementAlign(),
          sideOffset: this.sideOffset(),
          matchAnchorWidth: this.matchesTrigger(),
          // The list belongs above or below its field, never beside it: when neither side
          // has room for all of it, the panel shrinks to the larger one and its options
          // scroll (the `size.minHeight` set by `AndesSelect` lets CDK shrink the pane).
          crossSideFallback: false,
          flexibleDimensions: true,
        },
      });
    });
  }
}
