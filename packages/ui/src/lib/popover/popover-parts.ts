import { AndesOverlayClosePrimitive } from '@andes-ng/primitives';
import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { AndesPopoverBase } from './popover-base';

let nextLabelId = 0;

/**
 * Registers the host element as the popover panel's label or description.
 *
 * Reuses an author-supplied `id` when there is one, so a consumer that already
 * wires `aria-labelledby` by hand keeps their own id rather than having it
 * silently replaced.
 */
function registerPopoverLabel(part: 'title' | 'description'): string {
  const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const popover = inject(AndesPopoverBase);
  const id = element.id || `andes-popover-${part}-${nextLabelId++}`;

  if (part === 'title') {
    popover.registerTitleId(id);
    inject(DestroyRef).onDestroy(() => popover.registerTitleId(null));
  } else {
    popover.registerDescriptionId(id);
    inject(DestroyRef).onDestroy(() => popover.registerDescriptionId(null));
  }

  return id;
}

/** Layout wrapper for a popover's title and description. */
@Directive({
  selector: '[andesPopoverHeader]',
  host: {
    class: 'andes-popover-header',
    '[attr.data-slot]': '"popover-header"',
  },
})
export class AndesPopoverHeader {}

/**
 * The popover's heading, wired as the panel's `aria-labelledby`. Put it on a real
 * heading element (`<h3>`) when the panel has a document outline of its own - the
 * directive only wires the labelling relationship, it does not invent semantics.
 *
 * Shares its styling with the header the `title` input renders, so composed and
 * input-driven panels look the same.
 */
@Directive({
  selector: '[andesPopoverTitle]',
  host: {
    class: 'andes-popover-title',
    '[attr.id]': 'id',
    '[attr.data-slot]': '"popover-title"',
  },
})
export class AndesPopoverTitle {
  /** Id the panel's `aria-labelledby` points at. */
  readonly id = registerPopoverLabel('title');
}

/** Supporting copy, wired as the panel's `aria-describedby`. */
@Directive({
  selector: '[andesPopoverDescription]',
  host: {
    class: 'andes-popover-description',
    '[attr.id]': 'id',
    '[attr.data-slot]': '"popover-description"',
  },
})
export class AndesPopoverDescription {
  /** Id the panel's `aria-describedby` points at. */
  readonly id = registerPopoverLabel('description');
}

/**
 * Closes the popover when activated, reporting `'close-button'` as the reason.
 * Focus returns wherever the other close paths would send it: to the trigger
 * for a click-opened panel, nowhere for a hover/focus-opened one.
 */
@Directive({
  selector: '[andesPopoverClose]',
  exportAs: 'andesPopoverClose',
  hostDirectives: [AndesOverlayClosePrimitive],
  host: {
    '[attr.data-slot]': '"popover-close"',
  },
})
export class AndesPopoverClose {}
