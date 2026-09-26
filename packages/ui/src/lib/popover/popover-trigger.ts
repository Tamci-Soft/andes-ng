import {
  AndesOverlayPrimitive,
  AndesOverlayTriggerPrimitive,
} from '@andes-ng/primitives';
import {
  afterNextRender,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';

import { AndesPopoverBase } from './popover-base';

/** Matches the elements a browser will actually move focus to. */
const FOCUSABLE_SELECTOR =
  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const DISABLED_SELECTOR = ':disabled, [aria-disabled="true"]';

/**
 * Marks an element as the popover's (or popconfirm's) trigger. Composes
 * `AndesOverlayTriggerPrimitive` for anchor registration and ARIA
 * (`aria-haspopup`/`aria-expanded`/`aria-controls`, plus `data-state`), and
 * forwards the pointer/focus/context-menu events the owning component's
 * `trigger` input listens to.
 *
 * Works on any host - a native `<button>`, an `andes-button`, an icon wrapper -
 * so consumers are not forced into a specific trigger element. A disabled
 * trigger (`disabled`, `aria-disabled="true"`, or an `andes-button` whose inner
 * button is disabled) never opens the panel.
 */
@Directive({
  selector: '[andesPopoverTrigger], [andesPopconfirmTrigger]',
  hostDirectives: [
    { directive: AndesOverlayTriggerPrimitive, inputs: ['ariaAttachment'] },
  ],
  host: {
    '(click)': 'popover.handleTriggerClick(isDisabled())',
    '(contextmenu)': 'popover.handleTriggerContextMenu($event, isDisabled())',
    '(pointerdown)': 'popover.handleTriggerPointerDown()',
    '(mouseenter)': 'popover.handleTriggerEnter(isDisabled())',
    '(mouseleave)': 'popover.handleTriggerLeave()',
    '(focusin)': 'popover.handleTriggerFocusIn(isDisabled())',
    '(focusout)': 'popover.handleFocusOut($event)',
  },
})
export class AndesPopoverTrigger {
  protected readonly popover = inject(AndesPopoverBase);
  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly triggerPrimitive = inject(AndesOverlayTriggerPrimitive);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The focusable element inside a non-focusable wrapper host, if any. */
  private readonly innerTarget = signal<HTMLElement | null>(null);

  private readonly innerAria = computed(() => {
    if (this.triggerPrimitive.ariaAttachment() !== 'expanded') {
      return null;
    }
    const role = this.overlay.config().role;
    const open = this.overlay.isOpen();
    return {
      'aria-haspopup':
        role === 'alertdialog' || role === 'dialog'
          ? 'dialog'
          : role === 'menu' || role === 'listbox'
            ? role
            : null,
      'aria-expanded': String(open),
      'aria-controls': open ? this.overlay.contentId : null,
    };
  });

  constructor() {
    const host = this.elementRef.nativeElement;
    this.popover.registerTriggerHost(host);

    // `AndesOverlayTriggerPrimitive` registers *this* host as the element focus
    // returns to on close. That is right for `<button andesPopoverTrigger>`, but
    // the directive is just as legitimately composed onto a wrapper component -
    // `<andes-button andesPopoverTrigger>` - whose host element is a
    // non-focusable custom element with the real `<button>` inside its template.
    // `focus()` on such a host silently no-ops, so closing the popover would
    // strand focus on `<body>`. Re-anchor to the inner focusable element once the
    // wrapper has rendered its content.
    afterNextRender(() => {
      if (host.tabIndex >= 0 || host.matches(FOCUSABLE_SELECTOR)) {
        return;
      }
      const focusable = host.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable) {
        this.overlay.registerAnchor(focusable);
        this.innerTarget.set(focusable);
      }
    });

    // The ARIA the primitive puts on a wrapper host is invisible to assistive
    // tech - the inner button is what gets focused and announced. Mirror it.
    effect(() => {
      const target = this.innerTarget();
      const aria = this.innerAria();
      if (!target) {
        return;
      }
      for (const name of [
        'aria-haspopup',
        'aria-expanded',
        'aria-controls',
      ] as const) {
        const value = aria?.[name] ?? null;
        if (value === null) {
          target.removeAttribute(name);
        } else {
          target.setAttribute(name, value);
        }
      }
    });
  }

  /**
   * Checked at event time. The wrapper case only looks at the inner element of
   * a custom-element host (`andes-button`), so wrapping a disabled native
   * button in a plain `<span andesPopoverTrigger>` still works as a way to
   * explain why it is disabled.
   */
  protected isDisabled(): boolean {
    const host = this.elementRef.nativeElement;
    if (host.matches(DISABLED_SELECTOR)) {
      return true;
    }
    const inner = this.innerTarget();
    return (
      !!inner &&
      host.localName.includes('-') &&
      inner.matches(DISABLED_SELECTOR)
    );
  }
}

/**
 * `AndesPopoverTrigger` under the name that reads naturally inside an
 * `<andes-popconfirm>` - the same directive (its selector matches both
 * attributes), exported twice for import ergonomics.
 */
export const AndesPopconfirmTrigger = AndesPopoverTrigger;
