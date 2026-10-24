import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  PLATFORM_ID,
  untracked,
  viewChild,
} from '@angular/core';

import { AndesAnchorLink } from './anchor-link';
import {
  andesAnchorActiveHref,
  andesAnchorTargetId,
  type AndesAnchorSection,
} from './anchor-scroll';
import {
  ANDES_ANCHOR,
  type AndesAnchorClickEvent,
  type AndesAnchorHost,
  type AndesAnchorLinkRef,
} from './anchor-token';

export type { AndesAnchorClickEvent, AndesAnchorLinkRef } from './anchor-token';

export type AndesAnchorDirection = 'vertical' | 'horizontal';
export type AndesAnchorHashHistory = 'replace' | 'push';

export interface AndesAnchorItem {
  key: string;
  href: string;
  title: string;
  target?: string;
  /** Nested links; shown as an indented group in vertical anchors, flattened in horizontal ones. */
  children?: AndesAnchorItem[];
}

/** The scroll container that holds the sections: an element, `window`, a selector or a function. */
export type AndesAnchorContainer =
  | Window
  | HTMLElement
  | ElementRef<HTMLElement>
  | string
  | (() => Window | HTMLElement | null | undefined)
  | null
  | undefined;

/** How long scrolling must be quiet before the highlight follows the scroll position again. */
const SCROLL_SETTLE_MS = 120;
/** Safety net: the highlight resumes following the scroll position after this long at most. */
const SCROLL_LOCK_MAX_MS = 1500;

/**
 * Table-of-contents navigation that follows the page: the link of the section being read is
 * highlighted, clicking a link scrolls its section into view, and an ink bar slides to the
 * active link.
 *
 * Supply `items`, or project `andes-anchor-link` elements (they can be nested).
 */
@Component({
  selector: 'andes-anchor',
  imports: [NgTemplateOutlet],
  templateUrl: './anchor.html',
  styleUrls: ['./anchor-link.css', './anchor.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: ANDES_ANCHOR, useExisting: AndesAnchor }],
  host: {
    '[attr.data-affix]': 'affix() ? "" : null',
    '[style.--andes-anchor-offset-top]': 'affix() ? offsetTop() + "px" : null',
  },
})
export class AndesAnchor implements AndesAnchorHost {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly ink = viewChild.required<ElementRef<HTMLElement>>('ink');

  /** Data-driven links; the projected `andes-anchor-link` elements are added after these. */
  readonly items = input<AndesAnchorItem[]>([]);
  /** `href` of the highlighted link. Two-way: set it to highlight a link yourself. */
  readonly activeLink = model<string | undefined>(undefined);
  readonly direction = input<AndesAnchorDirection>('vertical');
  /** Accessible name of the navigation landmark. */
  readonly label = input('On this page');
  /** Distance, in pixels, from the top of the container at which a section counts as reached. */
  readonly offsetTop = input(0, { transform: numberAttribute });
  /** Extra tolerance, in pixels, when deciding that a section has been reached. */
  readonly bounds = input(5, { transform: numberAttribute });
  /** Where a clicked section lands, from the top of the container. Defaults to `offsetTop`. */
  readonly targetOffset = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null || value === ''
        ? undefined
        : numberAttribute(value),
  });
  /** Scroll container that holds the sections; the window when omitted. */
  readonly container = input<AndesAnchorContainer>(undefined);
  /** Keeps the anchor in view with sticky positioning at `offsetTop`. */
  readonly affix = input(false, { transform: booleanAttribute });
  /** Writes the clicked link's hash into the address bar. */
  readonly updateHash = input(false, { transform: booleanAttribute });
  /** Whether the hash replaces the current history entry or adds a new one. */
  readonly hashHistory = input<AndesAnchorHashHistory>('replace');
  /** Scrolls smoothly (always instant under `prefers-reduced-motion`). */
  readonly smooth = input(true, { transform: booleanAttribute });
  /** Moves keyboard focus to the section after a click so reading continues from there. */
  readonly focusTarget = input(true, { transform: booleanAttribute });

  /** Emits the `href` of the newly highlighted link. */
  readonly changed = output<string | undefined>();
  /** Emits for every link activation, before scrolling; call `preventDefault()` to cancel it. */
  readonly clicked = output<AndesAnchorClickEvent>();

  private readonly projected = contentChildren(AndesAnchorLink, {
    descendants: true,
  });

  protected readonly visibleItems = computed(() =>
    this.direction() === 'horizontal' ? flatten(this.items()) : this.items(),
  );

  private readonly hrefs = computed(() => [
    ...flatten(this.items()).map((item) => item.href),
    ...this.projected().map((link) => link.href()),
  ]);

  private attached = false;
  private scrollContainer: Window | HTMLElement | null = null;
  private teardown: (() => void) | null = null;
  private frame: number | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private lockTimer: ReturnType<typeof setTimeout> | undefined;
  private locked = false;
  private inkReady = false;

  constructor() {
    afterNextRender(() => {
      this.attached = true;
      this.attach();
    });

    effect(() => {
      this.container();
      untracked(() => {
        if (this.attached) {
          this.attach();
        }
      });
    });

    effect(() => {
      this.hrefs();
      this.offsetTop();
      this.bounds();
      this.targetOffset();
      untracked(() => this.scheduleSpy());
    });

    // The ink follows the active link once the DOM reflects the new state.
    afterRenderEffect(() => {
      this.activeLink();
      this.visibleItems();
      this.direction();
      this.projected();
      this.placeInk();
    });

    this.destroyRef.onDestroy(() => {
      this.detach();
      this.attached = false;
    });
  }

  isActive(href: string): boolean {
    return this.activeLink() === href;
  }

  /** Scrolls the section a link points at into view, exactly as clicking the link would. */
  scrollTo(href: string): void {
    const element = this.findTarget(href);
    if (!element) {
      return;
    }
    this.lockSpy();
    this.setActive(href);
    this.scrollToElement(element);
  }

  // --- Click ------------------------------------------------------------------------------

  protected onItemClick(event: MouseEvent, item: AndesAnchorItem): void {
    this.handleClick(event, {
      href: item.href,
      title: item.title,
      target: item.target,
    });
  }

  handleClick(event: MouseEvent, link: AndesAnchorLinkRef): void {
    this.clicked.emit({ event, link });
    if (
      event.defaultPrevented ||
      event.button > 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      (link.target && link.target !== '_self')
    ) {
      return;
    }
    const element = this.findTarget(link.href);
    if (!element) {
      // Not a section on this page: let the browser follow the link.
      return;
    }
    event.preventDefault();
    this.lockSpy();
    this.setActive(link.href);
    this.scrollToElement(element);
    if (this.updateHash()) {
      this.writeHash(link.href);
    }
    if (this.focusTarget()) {
      focusWithoutScrolling(element);
    }
  }

  // --- Active link ------------------------------------------------------------------------

  private setActive(href: string | undefined): void {
    if (href === this.activeLink()) {
      return;
    }
    this.activeLink.set(href);
    this.changed.emit(href);
  }

  /** Recomputes which section is being read from the current scroll position. */
  private updateActive(): void {
    if (!this.browser || !this.attached || this.locked) {
      return;
    }
    const top = this.containerTop();
    const sections: AndesAnchorSection[] = [];
    for (const href of this.hrefs()) {
      const element = this.findTarget(href);
      if (element) {
        sections.push({ href, top: element.getBoundingClientRect().top - top });
      }
    }
    const threshold = this.landingOffset() + this.bounds();
    this.setActive(
      andesAnchorActiveHref(sections, threshold, this.atScrollEnd()),
    );
  }

  private scheduleSpy(): void {
    if (!this.browser || !this.attached || this.frame !== null) {
      return;
    }
    if (typeof requestAnimationFrame !== 'function') {
      this.updateActive();
      return;
    }
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.updateActive();
    });
  }

  private atScrollEnd(): boolean {
    const container = this.scrollContainer;
    const view = this.host.nativeElement.ownerDocument.defaultView;
    if (!container || isWindow(container)) {
      const root = this.host.nativeElement.ownerDocument.documentElement;
      return (
        !!view &&
        root.scrollHeight > view.innerHeight &&
        view.scrollY + view.innerHeight >= root.scrollHeight - 1
      );
    }
    return (
      container.scrollHeight > container.clientHeight &&
      container.scrollTop + container.clientHeight >= container.scrollHeight - 1
    );
  }

  private landingOffset(): number {
    return this.targetOffset() ?? this.offsetTop();
  }

  // --- Scrolling --------------------------------------------------------------------------

  private containerTop(): number {
    const container = this.scrollContainer;
    if (!container || isWindow(container)) {
      return 0;
    }
    return container.getBoundingClientRect().top + container.clientTop;
  }

  private findTarget(href: string): HTMLElement | null {
    const doc = this.host.nativeElement.ownerDocument;
    const id = andesAnchorTargetId(
      href,
      doc.defaultView?.location.href ?? 'http://localhost/',
    );
    return id ? doc.getElementById(id) : null;
  }

  private prefersReducedMotion(): boolean {
    const view = this.host.nativeElement.ownerDocument.defaultView;
    return !!view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  private scrollToElement(element: HTMLElement): void {
    const container = this.scrollContainer;
    const behavior: ScrollBehavior =
      this.smooth() && !this.prefersReducedMotion() ? 'smooth' : 'instant';
    const delta =
      element.getBoundingClientRect().top -
      this.containerTop() -
      this.landingOffset();
    if (!container || isWindow(container)) {
      const view = this.host.nativeElement.ownerDocument.defaultView;
      view?.scrollTo({ top: (view.scrollY ?? 0) + delta, behavior });
    } else {
      container.scrollTo({ top: container.scrollTop + delta, behavior });
    }
  }

  /** Holds the highlight steady while a programmatic scroll passes over other sections. */
  private lockSpy(): void {
    this.locked = true;
    clearTimeout(this.lockTimer);
    this.lockTimer = setTimeout(() => this.unlockSpy(), SCROLL_LOCK_MAX_MS);
    this.armSettle();
  }

  private armSettle(): void {
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.unlockSpy(), SCROLL_SETTLE_MS);
  }

  private unlockSpy(): void {
    clearTimeout(this.settleTimer);
    clearTimeout(this.lockTimer);
    this.locked = false;
  }

  private writeHash(href: string): void {
    const view = this.host.nativeElement.ownerDocument.defaultView;
    const hash = href.slice(href.indexOf('#'));
    try {
      if (this.hashHistory() === 'push') {
        view?.history.pushState(null, '', hash);
      } else {
        view?.history.replaceState(null, '', hash);
      }
    } catch {
      // Sandboxed frames can refuse history changes; the scroll still happened.
    }
  }

  // --- Listeners --------------------------------------------------------------------------

  private resolveContainer(): Window | HTMLElement | null {
    const value = this.container();
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

  private attach(): void {
    this.detach();
    if (!this.browser) {
      return;
    }
    const view = this.host.nativeElement.ownerDocument.defaultView;
    const container = this.resolveContainer();
    this.scrollContainer = container;
    const source: EventTarget | null = container ?? view;

    const onScroll = () => {
      if (this.locked) {
        this.armSettle();
        return;
      }
      this.scheduleSpy();
    };
    const onScrollEnd = () => {
      this.unlockSpy();
      this.scheduleSpy();
    };
    const onResize = () => this.scheduleSpy();

    source?.addEventListener('scroll', onScroll, { passive: true });
    source?.addEventListener('scrollend', onScrollEnd);
    view?.addEventListener('resize', onResize);
    this.teardown = () => {
      source?.removeEventListener('scroll', onScroll);
      source?.removeEventListener('scrollend', onScrollEnd);
      view?.removeEventListener('resize', onResize);
    };
    this.updateActive();
  }

  private detach(): void {
    this.teardown?.();
    this.teardown = null;
    this.unlockSpy();
    if (this.frame !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.frame);
    }
    this.frame = null;
  }

  // --- Ink --------------------------------------------------------------------------------

  private placeInk(): void {
    if (!this.browser) {
      return;
    }
    const root = this.host.nativeElement;
    const ink = this.ink().nativeElement;
    const active = this.activeLink();
    // Looked up by href rather than by `aria-current`, which is only written on the next render.
    const link = active
      ? Array.from(root.querySelectorAll<HTMLElement>('a')).find(
          (candidate) => candidate.getAttribute('href') === active,
        )
      : undefined;
    if (!link) {
      ink.removeAttribute('data-visible');
      return;
    }
    const horizontal = this.direction() === 'horizontal';
    const offset = horizontal ? link.offsetLeft : link.offsetTop;
    const size = horizontal ? link.offsetWidth : link.offsetHeight;
    ink.style.transform = horizontal
      ? `translateX(${offset}px)`
      : `translateY(${offset}px)`;
    ink.style.width = horizontal ? `${size}px` : '';
    ink.style.height = horizontal ? '' : `${size}px`;
    ink.setAttribute('data-visible', '');
    if (!this.inkReady) {
      // The first placement jumps into position; only later moves slide.
      this.inkReady = true;
      const enable = () => ink.setAttribute('data-ready', '');
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(enable);
      } else {
        enable();
      }
    }
  }
}

function flatten(items: readonly AndesAnchorItem[]): AndesAnchorItem[] {
  return items.flatMap((item) => [
    { ...item, children: undefined },
    ...flatten(item.children ?? []),
  ]);
}

function isWindow(value: Window | HTMLElement): value is Window {
  // Works across frames, where `instanceof Window` does not.
  return (value as Window).window === value;
}

const NATIVELY_FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]';

function focusWithoutScrolling(element: HTMLElement): void {
  if (!element.matches(NATIVELY_FOCUSABLE)) {
    element.setAttribute('tabindex', '-1');
    element.addEventListener(
      'blur',
      () => element.removeAttribute('tabindex'),
      {
        once: true,
      },
    );
  }
  element.focus({ preventScroll: true });
}
