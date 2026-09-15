import { DOCUMENT, inject, Injectable } from '@angular/core';

/**
 * Handle for one overlay's claim on an inert background. Releasing it undoes
 * *that claim only*: elements another still-open overlay also depends on stay
 * inert. Releasing twice is a no-op, so a double `close()` cannot under-count.
 */
export interface AndesOverlayInertHandle {
  release(): void;
}

/**
 * Body children that render nothing, so marking them inert would be noise in the
 * DOM with no effect on what a screen reader can reach.
 */
const NON_RENDERED_TAGS: ReadonlySet<string> = new Set([
  'SCRIPT',
  'STYLE',
  'LINK',
  'TEMPLATE',
  'NOSCRIPT',
  'BASE',
  'META',
  'TITLE',
]);

/** Attribute we always apply: the standard, browser-enforced one. */
const INERT_ATTRIBUTE = 'inert';

/**
 * Applied *in addition to* `inert`, and only when the current environment does
 * not implement `inert` at all. It is strictly weaker — it hides content from
 * assistive tech without making it non-interactive — so it is a fallback for
 * older browsers/AT, never the primary mechanism.
 */
const ARIA_HIDDEN_ATTRIBUTE = 'aria-hidden';

interface InertEntry {
  /** How many open overlays currently require this element to stay inert. */
  count: number;
  /** Attributes *we* added, and therefore the only ones we may remove. */
  readonly attributes: readonly string[];
}

/**
 * Reference-counted registry of "everything outside the modal is inert".
 *
 * ## Why this exists
 *
 * A focus trap only governs Tab. A screen-reader user in browse mode (VoiceOver's
 * `VO`-arrow, NVDA/JAWS virtual cursor) walks the accessibility tree directly and
 * happily reads — and activates — content behind an open modal. `aria-modal="true"`
 * on the dialog is a *hint* that browsers and AT do not universally honour on its
 * own, which is why Base UI (shadcn) and Ant Design both additionally mark the rest
 * of the page inert. So does this primitive.
 *
 * ## What gets marked
 *
 * Every **direct child of `<body>`** except the one containing the overlay itself.
 * Not `<body>`, because the overlay's own portal is rendered into the CDK overlay
 * container, which is itself a body child — inerting `<body>` would make the modal
 * unusable.
 *
 * ## Nesting
 *
 * Every andes-ng overlay portals into the *same* CDK overlay container, so a
 * confirm dialog opened on top of a dialog needs the exact same background inert.
 * Rather than re-applying (and then prematurely releasing) it, each open overlay
 * takes a reference on the elements it needs; an element loses `inert` only when
 * the last overlay holding it closes. Closing the inner dialog therefore leaves
 * the outer dialog's background inert, and only the outermost close restores the
 * page.
 *
 * ## What it refuses to touch
 *
 * An element that is *already* inert when we first see it is left alone entirely
 * and never tracked: something outside our control put it there for its own
 * reasons, and it is not ours to clear on close. Same for a pre-existing
 * `aria-hidden`.
 *
 * Provided in root because the reference count is a property of the document, not
 * of any one overlay instance — the same reason CDK's block-scroll strategy keeps
 * its own global count.
 */
@Injectable({ providedIn: 'root' })
export class AndesOverlayInertRegistry {
  private readonly document = inject(DOCUMENT);
  private readonly entries = new Map<Element, InertEntry>();

  /**
   * The elements currently inert *because of us*. Elements that were already
   * inert for their own reasons are deliberately absent. Exposed so a consumer
   * (or a test) can assert on the primitive's footprint rather than on every
   * `[inert]` element in the document.
   */
  get inertElements(): readonly Element[] {
    return [...this.entries.keys()];
  }

  /**
   * Marks every direct child of `<body>` inert, except the subtrees the given
   * elements live in (the overlay's own pane and backdrop). Returns the handle
   * that undoes exactly this claim.
   */
  inertBackgroundExcept(
    exemptElements: readonly (Element | null | undefined)[],
  ): AndesOverlayInertHandle {
    const exempt = new Set<Element>();
    for (const element of exemptElements) {
      const bodyChild = this.bodyChildOf(element);
      if (bodyChild) {
        exempt.add(bodyChild);
      }
    }

    const claimed: Element[] = [];
    for (const target of this.backgroundChildren(exempt)) {
      if (this.claim(target)) {
        claimed.push(target);
      }
    }

    let released = false;
    return {
      release: () => {
        if (released) {
          return;
        }
        released = true;
        for (const target of claimed) {
          this.release(target);
        }
      },
    };
  }

  /**
   * Takes a reference on one element. Returns whether the caller now holds one —
   * `false` for an element that was already inert before we ever saw it, which we
   * deliberately neither track nor modify.
   */
  private claim(target: Element): boolean {
    const existing = this.entries.get(target);
    if (existing) {
      existing.count++;
      return true;
    }

    if (target.hasAttribute(INERT_ATTRIBUTE)) {
      return false;
    }

    const attributes = [INERT_ATTRIBUTE];
    target.setAttribute(INERT_ATTRIBUTE, '');

    if (!this.supportsInert() && !target.hasAttribute(ARIA_HIDDEN_ATTRIBUTE)) {
      target.setAttribute(ARIA_HIDDEN_ATTRIBUTE, 'true');
      attributes.push(ARIA_HIDDEN_ATTRIBUTE);
    }

    this.entries.set(target, { count: 1, attributes });
    return true;
  }

  /** Drops one reference, clearing our attributes only when it was the last. */
  private release(target: Element): void {
    const entry = this.entries.get(target);
    if (!entry) {
      return;
    }
    entry.count--;
    if (entry.count > 0) {
      return;
    }
    for (const attribute of entry.attributes) {
      target.removeAttribute(attribute);
    }
    this.entries.delete(target);
  }

  private backgroundChildren(exempt: ReadonlySet<Element>): Element[] {
    return [...this.document.body.children].filter(
      (child) => !exempt.has(child) && !NON_RENDERED_TAGS.has(child.tagName),
    );
  }

  /**
   * Walks up from an element to the `<body>` child whose subtree contains it, so
   * exempting an overlay pane exempts the whole portal outlet it was rendered into.
   */
  private bodyChildOf(element: Element | null | undefined): Element | null {
    const body = this.document.body;
    let current = element ?? null;
    while (current && current.parentElement && current.parentElement !== body) {
      current = current.parentElement;
    }
    return current?.parentElement === body ? current : null;
  }

  private supportsInert(): boolean {
    const view = this.document.defaultView;
    return !!view && 'inert' in view.HTMLElement.prototype;
  }
}
