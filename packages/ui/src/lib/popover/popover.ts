import {
  andesOverlayPreset,
  AndesOverlayPrimitive,
  provideAndesOverlay,
  type AndesOverlayAlign,
  type AndesOverlaySide,
} from '@andes-ng/primitives';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  TemplateRef,
  viewChild,
} from '@angular/core';

/**
 * Non-modal floating panel anchored to a trigger element.
 *
 * `AndesPopover` owns the shared `AndesOverlayPrimitive` instance (portal, anchored
 * positioning, escape/outside-click dismissal, focus-in-without-trapping) and
 * exposes it to its two content-projected parts:
 *
 * - `[andesPopoverTrigger]` — put on whatever element should open it.
 * - `<andes-popover-content>` — wraps the panel body.
 *
 * ```html
 * <andes-popover side="right" align="start">
 *   <button andes-button andesPopoverTrigger>Open</button>
 *   <andes-popover-content>Panel body</andes-popover-content>
 * </andes-popover>
 * ```
 *
 * `open` is a `model()`, so it works both uncontrolled (default `false`, driven by
 * the trigger) and controlled (`[(open)]="visible"` from a parent).
 */
@Component({
  selector: 'andes-popover',
  providers: [provideAndesOverlay()],
  templateUrl: './popover.html',
  styleUrl: './popover.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesPopover {
  private readonly overlay = inject(AndesOverlayPrimitive);

  private readonly contentTemplate = viewChild<TemplateRef<unknown>>('content');

  /** Side of the trigger the panel prefers to render on. Default `'bottom'`. */
  readonly side = input<AndesOverlaySide>('bottom');
  /** Alignment along that side. Default `'center'`. */
  readonly align = input<AndesOverlayAlign>('center');
  /** Gap in px between the trigger and the panel. Default `8`. */
  readonly sideOffset = input(8);
  /** Extra px offset along the alignment axis. Default `0`. */
  readonly alignOffset = input(0);
  /** Renders a small pointer element on the panel, on the anchored side. Default `false`. */
  readonly showArrow = input(false, { transform: booleanAttribute });

  /** Open state. Two-way bindable for controlled usage; uncontrolled otherwise. */
  readonly open = model(false);

  constructor() {
    effect(() => {
      this.overlay.configure({
        ...andesOverlayPreset('popover'),
        positioning: {
          kind: 'anchored',
          side: this.side(),
          align: this.align(),
          sideOffset: this.sideOffset(),
          alignOffset: this.alignOffset(),
        },
      });
    });

    effect(() => {
      const isOpen = this.open();
      const template = this.contentTemplate();
      if (!template) {
        return;
      }
      if (isOpen) {
        this.overlay.open(template);
      } else {
        this.overlay.close();
      }
    });

    // The overlay can close itself (Escape, outside click, its own close
    // affordance) without the model ever being told - keep it in sync so a
    // controlled consumer's `visible` signal doesn't lie.
    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.open()) {
        this.open.set(false);
      }
    });
  }

  /** Opens if closed, closes if open. Called by `AndesPopoverTrigger`. */
  toggle(): void {
    this.open.update((value) => !value);
  }
}
