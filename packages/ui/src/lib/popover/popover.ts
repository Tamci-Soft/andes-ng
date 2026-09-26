import { provideAndesOverlay } from '@andes-ng/primitives';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';

import { AndesPopoverBase } from './popover-base';
import { AndesPopoverContent } from './popover-content';
import type { AndesPopoverRenderable } from './popover-types';

/**
 * Non-modal floating panel anchored to a trigger element (Ant's `Popover`).
 *
 * `AndesPopover` owns the shared `AndesOverlayPrimitive` instance (portal, anchored
 * positioning, escape/outside-click dismissal, focus-in-without-trapping) and
 * exposes it to its content-projected parts:
 *
 * - `[andesPopoverTrigger]` — put on whatever element should open it.
 * - `<andes-popover-content>` — wraps a free-form panel body. Optional: with only
 *   the `title`/`content` inputs, a panel is rendered for you.
 *
 * ```html
 * <andes-popover placement="rightTop" title="Details" [content]="body" trigger="hover">
 *   <button andes-button andesPopoverTrigger>Open</button>
 * </andes-popover>
 * <ng-template #body>Rich <strong>content</strong></ng-template>
 * ```
 *
 * `open` is a `model()`, so it works both uncontrolled (default `false`, driven by
 * the trigger) and controlled (`[(open)]="visible"` from a parent); `(openChange)`
 * reports every change the popover makes itself.
 *
 * Focus: click/context-menu/programmatic opens move focus to the first tabbable
 * element in the panel (not trapped) and return it to the trigger on close;
 * hover/focus opens leave focus where it is.
 */
@Component({
  selector: 'andes-popover',
  imports: [AndesPopoverContent],
  providers: [
    provideAndesOverlay(),
    { provide: AndesPopoverBase, useExisting: AndesPopover },
  ],
  templateUrl: './popover.html',
  styleUrl: './popover.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // `title` is also a global HTML attribute: left on the host, a static
    // `title="..."` would show the browser's native tooltip over the trigger.
    '[attr.title]': 'null',
  },
})
export class AndesPopover extends AndesPopoverBase {
  /** Panel header - text or a template. Labels the dialog (`aria-labelledby`). */
  readonly title = input<AndesPopoverRenderable | null | undefined>(undefined);
  /** Panel body - text or a template. Rendered below the title. */
  readonly content = input<AndesPopoverRenderable | null | undefined>(
    undefined,
  );

  protected readonly panelTemplate = viewChild<TemplateRef<unknown>>('panel');

  /** Whether the consumer projected its own `<andes-popover-content>`. */
  protected readonly projectedContent = contentChild(AndesPopoverContent);

  override readonly panelTitle = computed(() => this.title());
  override readonly panelBody = computed(() => this.content());
  override readonly panelLabelledBy = computed(() =>
    this.title() ? this.titleId : null,
  );
}
