import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
  output,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import {
  andesAffixPosition,
  andesAffixStuckPosition,
  andesAffixViewport,
  type AndesAffixPosition,
  type AndesAffixViewport,
} from './affix-geometry';

/** Scroll container to pin inside: an element, `window`, a selector, or a function returning one. */
export type AndesAffixTarget =
  | Window
  | HTMLElement
  | ElementRef<HTMLElement>
  | string
  | (() => Window | HTMLElement | null | undefined)
  | null
  | undefined;

/**
 * `sticky` lets the browser do the pinning (bounded by the parent's box); `fixed` pins to the
 * viewport or target regardless of the parent and leaves a placeholder; `auto` picks `sticky`
 * unless the target is not an ancestor, where sticky cannot work.
 */
export type AndesAffixMode = 'auto' | 'sticky' | 'fixed';

interface FixedBox {
  left: number;
  width: number;
}

/**
 * Pins its content to the viewport (or to a scroll container) once the page has scrolled past
 * it, keeping its original space so nothing shifts.
 *
 * Because the host is `display: contents` in sticky mode, classes and styles on the
 * `andes-affix` element itself do not apply; style the projected content instead.
 */
@Component({
  selector: 'andes-affix',
  templateUrl: './affix.html',
  styleUrl: './affix.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'affix',
    '[attr.data-mode]': 'resolvedMode()',
    '[attr.data-state]': 'position() ?? "idle"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[style.height.px]': 'placeholderHeight()',
  },
})
export class AndesAffix {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');

  /** Distance from the top of the viewport (or target) at which the content pins. */
  readonly offsetTop = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });
  /** Distance from the bottom at which the content pins; used alone it pins to the bottom. */
  readonly offsetBottom = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });
  /** Scroll container the content pins inside; the window when omitted. */
  readonly target = input<AndesAffixTarget>(undefined);
  readonly mode = input<AndesAffixMode>('auto');
  /** Stacking order of the pinned content (defaults to `--andes-affix-z-index`, 10). */
  readonly zIndex = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Emits `true` when the content becomes pinned and `false` when it is released. */
  readonly changed = output<boolean>();

  private readonly positionState = signal<AndesAffixPosition>(null);
  /** Where the content is pinned right now, or `null`. */
  readonly position = this.positionState.asReadonly();
  /** Whether the content is currently pinned. */
  readonly affixed = computed(() => this.positionState() !== null);

  protected readonly resolvedMode = signal<'sticky' | 'fixed'>('sticky');
  protected readonly placeholderHeight = signal<number | null>(null);
  private readonly fixedBox = signal<FixedBox | null>(null);

  protected readonly boxStyle = computed<Record<string, string | null>>(() => {
    const top = this.offsetTop();
    const bottom = this.offsetBottom();
    const zIndex = this.zIndex();
    const z = zIndex === undefined ? null : String(zIndex);
    // With no offsets at all the content pins to the top edge.
    const effectiveTop = top ?? (bottom === undefined ? 0 : undefined);
    const position = this.positionState();
    const fixed = this.fixedBox();
    if (this.resolvedMode() === 'sticky' || !position || !fixed) {
      return {
        position: null,
        left: null,
        width: null,
        top: effectiveTop === undefined ? null : `${effectiveTop}px`,
        bottom: bottom === undefined ? null : `${bottom}px`,
        'z-index': z,
      };
    }
    const viewport = this.currentViewport();
    return {
      position: 'fixed',
      top:
        position === 'top' ? `${viewport.top + (effectiveTop ?? 0)}px` : null,
      bottom:
        position === 'bottom'
          ? `${this.windowHeight() - (viewport.bottom - (bottom ?? 0))}px`
          : null,
      left: `${fixed.left}px`,
      width: `${fixed.width}px`,
      'z-index': z ?? 'var(--andes-affix-z-index, 10)',
    };
  });

  private attached = false;
  private scrollTarget: Window | HTMLElement | null = null;
  private teardown: (() => void) | null = null;
  private frame: number | null = null;

  constructor() {
    afterNextRender(() => {
      this.attached = true;
      this.attach();
    });

    effect(() => {
      this.target();
      this.mode();
      untracked(() => {
        if (this.attached) {
          this.attach();
        }
      });
    });

    effect(() => {
      this.offsetTop();
      this.offsetBottom();
      this.disabled();
      untracked(() => this.schedule());
    });

    this.destroyRef.onDestroy(() => {
      this.detach();
      this.attached = false;
    });
  }

  /** Recomputes the pinned state immediately (it normally follows scroll and resize on its own). */
  update(): void {
    if (!this.browser || !this.attached) {
      return;
    }
    const mode = this.resolvedMode();
    const top = this.offsetTop();
    const bottom = this.offsetBottom();
    const effectiveTop = top ?? (bottom === undefined ? 0 : undefined);
    const host = this.host.nativeElement;
    const box = this.box().nativeElement;
    let position: AndesAffixPosition = null;

    if (!this.disabled()) {
      const viewport = this.currentViewport();
      position =
        mode === 'sticky'
          ? andesAffixStuckPosition(
              box.getBoundingClientRect(),
              viewport,
              effectiveTop,
              bottom,
            )
          : andesAffixPosition(
              host.getBoundingClientRect(),
              viewport,
              effectiveTop,
              bottom,
            );
    }

    if (mode === 'fixed') {
      this.syncFixed(position, host, box);
    } else {
      this.placeholderHeight.set(null);
      this.fixedBox.set(null);
    }

    if ((position !== null) !== (this.positionState() !== null)) {
      this.positionState.set(position);
      this.changed.emit(position !== null);
    } else if (position !== this.positionState()) {
      this.positionState.set(position);
    }
  }

  /** Fixed strategy: keep the placeholder as tall as the box and the box as wide as its slot. */
  private syncFixed(
    position: AndesAffixPosition,
    host: HTMLElement,
    box: HTMLElement,
  ): void {
    if (!position) {
      this.placeholderHeight.set(null);
      this.fixedBox.set(null);
      return;
    }
    const natural = host.getBoundingClientRect();
    // Measured every pass: the box has the same height whether it is in flow or pinned.
    this.placeholderHeight.set(box.getBoundingClientRect().height);
    this.fixedBox.set({ left: natural.left, width: natural.width });
  }

  private schedule(): void {
    if (!this.browser || !this.attached || this.frame !== null) {
      return;
    }
    if (typeof requestAnimationFrame !== 'function') {
      this.update();
      return;
    }
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.update();
    });
  }

  // --- Target and listeners ---------------------------------------------------------------

  private windowHeight(): number {
    return this.host.nativeElement.ownerDocument.defaultView?.innerHeight ?? 0;
  }

  private currentViewport(): AndesAffixViewport {
    const target = this.scrollTarget;
    if (!target || isWindow(target)) {
      return andesAffixViewport(null, this.windowHeight());
    }
    // Native sticky measures its offsets from the container's content box (inside border and
    // padding), so the fixed strategy does the same to line up with it.
    const rect = target.getBoundingClientRect();
    const style = target.ownerDocument.defaultView?.getComputedStyle(target);
    const paddingTop = Number.parseFloat(style?.paddingTop ?? '') || 0;
    const paddingBottom = Number.parseFloat(style?.paddingBottom ?? '') || 0;
    const paddingEdgeTop = rect.top + target.clientTop;
    const paddingEdgeBottom = target.clientHeight
      ? paddingEdgeTop + target.clientHeight
      : rect.bottom;
    return andesAffixViewport(
      {
        top: paddingEdgeTop + paddingTop,
        bottom: paddingEdgeBottom - paddingBottom,
      },
      this.windowHeight(),
    );
  }

  private resolveTarget(): Window | HTMLElement | null {
    const value = this.target();
    const doc = this.host.nativeElement.ownerDocument;
    let resolved: Window | HTMLElement | null | undefined;
    if (typeof value === 'function') {
      resolved = value();
    } else if (typeof value === 'string') {
      resolved = doc.querySelector<HTMLElement>(value);
    } else if (value instanceof ElementRef) {
      resolved = value.nativeElement;
    } else {
      resolved = value;
    }
    return resolved ?? null;
  }

  private resolveMode(target: Window | HTMLElement | null): 'sticky' | 'fixed' {
    const mode = this.mode();
    if (mode !== 'auto') {
      return mode;
    }
    if (!target || isWindow(target)) {
      return 'sticky';
    }
    // Sticky only works inside an ancestor scroll container.
    return target.contains(this.host.nativeElement) ? 'sticky' : 'fixed';
  }

  private attach(): void {
    this.detach();
    if (!this.browser) {
      return;
    }
    const doc = this.host.nativeElement.ownerDocument;
    const view = doc.defaultView;
    const target = this.resolveTarget();
    this.scrollTarget = target && !isWindow(target) ? target : null;
    this.resolvedMode.set(this.resolveMode(target));

    const onChange = () => this.schedule();
    const listenTo: EventTarget[] = [];
    if (view) {
      listenTo.push(view);
    }
    if (this.scrollTarget) {
      listenTo.push(this.scrollTarget);
    }
    for (const source of listenTo) {
      source.addEventListener('scroll', onChange, { passive: true });
    }
    view?.addEventListener('resize', onChange);

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(onChange);
      observer.observe(this.host.nativeElement);
      observer.observe(this.box().nativeElement);
    }

    this.teardown = () => {
      for (const source of listenTo) {
        source.removeEventListener('scroll', onChange);
      }
      view?.removeEventListener('resize', onChange);
      observer?.disconnect();
    };
    this.update();
  }

  private detach(): void {
    this.teardown?.();
    this.teardown = null;
    if (this.frame !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.frame);
    }
    this.frame = null;
  }
}

function isWindow(value: Window | HTMLElement): value is Window {
  // Works across frames, where `instanceof Window` does not.
  return (value as Window).window === value;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = numberAttribute(value, Number.NaN);
  return Number.isNaN(parsed) ? undefined : parsed;
}
