/**
 * The element that paints the watermark, plus the tamper protection around it: if the overlay
 * is removed, moved, hidden or restyled from outside, it is put back.
 *
 * This is a deterrent, not a security boundary: anyone with full control of the page can
 * still strip it. It stops casual edits in the element inspector and accidental overrides.
 */

export interface AndesWatermarkPaint {
  url: string;
  /** Width and height of the repeating pattern, in CSS pixels. */
  width: number;
  height: number;
  offset: readonly [number, number];
  zIndex: number;
}

const OVERLAY_ATTRIBUTES: Record<string, string> = {
  'data-slot': 'watermark-overlay',
  'aria-hidden': 'true',
};

export function andesWatermarkOverlayStyle(
  paint: AndesWatermarkPaint,
  fixed: boolean,
): string {
  // `!important` on inline declarations beats any stylesheet rule that tries to hide it.
  return [
    `position: ${fixed ? 'fixed' : 'absolute'} !important`,
    'inset: 0 !important',
    'display: block !important',
    'visibility: visible !important',
    'opacity: 1 !important',
    'pointer-events: none !important',
    'user-select: none !important',
    `z-index: ${paint.zIndex} !important`,
    'background-repeat: repeat !important',
    `background-image: url("${paint.url}") !important`,
    `background-size: ${paint.width}px ${paint.height}px !important`,
    `background-position: ${paint.offset[0]}px ${paint.offset[1]}px !important`,
  ].join('; ');
}

export class AndesWatermarkOverlay {
  private element: HTMLElement | null = null;
  private expectedStyle = '';
  private fixed = false;
  private parentObserver: MutationObserver | undefined;
  private selfObserver: MutationObserver | undefined;

  constructor(
    private readonly parent: HTMLElement,
    private readonly doc: Document,
  ) {}

  /** The overlay node, once painted. */
  get node(): HTMLElement | null {
    return this.element;
  }

  /** Paints (or repaints) the watermark. */
  paint(paint: AndesWatermarkPaint, fixed = false): void {
    this.fixed = fixed;
    this.expectedStyle = andesWatermarkOverlayStyle(paint, fixed);
    if (!this.element) {
      this.element = this.doc.createElement('div');
    }
    this.restore();
    this.observe();
  }

  /** Removes the overlay and stops protecting it. */
  destroy(): void {
    this.parentObserver?.disconnect();
    this.selfObserver?.disconnect();
    this.parentObserver = undefined;
    this.selfObserver = undefined;
    this.element?.remove();
    this.element = null;
  }

  /** Puts the overlay back exactly as it should be. Only writes what differs. */
  private restore(): void {
    const element = this.element;
    if (!element) {
      return;
    }
    if (element.parentNode !== this.parent) {
      this.parent.appendChild(element);
    } else if (this.parent.lastElementChild !== element && this.fixed) {
      // Keeps a full-page overlay above content appended later.
      this.parent.appendChild(element);
    }
    for (const name of element.getAttributeNames()) {
      if (name !== 'style' && !(name in OVERLAY_ATTRIBUTES)) {
        element.removeAttribute(name);
      }
    }
    for (const [name, value] of Object.entries(OVERLAY_ATTRIBUTES)) {
      if (element.getAttribute(name) !== value) {
        element.setAttribute(name, value);
      }
    }
    if (element.getAttribute('style') !== this.expectedStyle) {
      element.setAttribute('style', this.expectedStyle);
    }
    if (element.childNodes.length > 0) {
      element.replaceChildren();
    }
  }

  private observe(): void {
    const element = this.element;
    if (!element) {
      return;
    }
    const View = this.doc.defaultView;
    if (!View?.MutationObserver) {
      return;
    }
    this.parentObserver ??= new View.MutationObserver(() =>
      this.restoreIfTampered(),
    );
    this.selfObserver ??= new View.MutationObserver(() =>
      this.restoreIfTampered(),
    );
    this.parentObserver.disconnect();
    this.selfObserver.disconnect();
    this.parentObserver.observe(this.parent, { childList: true });
    this.selfObserver.observe(element, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  private restoreIfTampered(): void {
    const element = this.element;
    if (!element || !this.isIntact(element)) {
      this.restore();
    }
  }

  private isIntact(element: HTMLElement): boolean {
    if (element.parentNode !== this.parent) {
      return false;
    }
    if (element.getAttribute('style') !== this.expectedStyle) {
      return false;
    }
    if (element.childNodes.length > 0) {
      return false;
    }
    const names = element.getAttributeNames();
    return (
      names.length === Object.keys(OVERLAY_ATTRIBUTES).length + 1 &&
      Object.entries(OVERLAY_ATTRIBUTES).every(
        ([name, value]) => element.getAttribute(name) === value,
      )
    );
  }
}
