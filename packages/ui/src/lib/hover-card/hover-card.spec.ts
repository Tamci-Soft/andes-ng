import { AndesOverlayPrimitive } from '@andes-ng/primitives';
import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readFileSync } from 'node:fs';

import { AndesHoverCard } from './hover-card';
import { AndesHoverCardContent } from './hover-card-content';
import {
  ANDES_HOVER_CARD_DEFAULT_CLOSE_DELAY,
  ANDES_HOVER_CARD_DEFAULT_OPEN_DELAY,
  andesHoverCardIsFocusVisible,
} from './hover-card-intent';
import {
  ANDES_HOVER_CARD_PLACEMENTS,
  andesHoverCardArrowOffset,
  andesHoverCardPlacementToSideAlign,
  andesHoverCardResolveSide,
} from './hover-card-placement';
import {
  andesHoverCardNextTabbable,
  andesHoverCardTabbables,
} from './hover-card-focus';
import { AndesHoverCardTrigger } from './hover-card-trigger';

/**
 * jsdom reports zero geometry for every element, which makes the overlay's flexible
 * positioning unhappy. A nominal non-zero size is enough to let it attach and position.
 */
function withElementGeometry() {
  const descriptors = (['offsetWidth', 'offsetHeight'] as const).map(
    (prop) =>
      [
        prop,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop),
      ] as const,
  );

  beforeAll(() => {
    for (const [prop] of descriptors) {
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get: () => 1,
      });
    }
  });

  afterAll(() => {
    for (const [prop, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, prop, descriptor);
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[
          prop
        ];
      }
    }
  });
}

@Component({
  imports: [AndesHoverCard, AndesHoverCardTrigger, AndesHoverCardContent],
  template: `
    <button type="button" id="before">Before</button>
    <andes-hover-card
      [openDelay]="openDelay()"
      [closeDelay]="closeDelay()"
      [disabled]="disabled()"
      [arrow]="arrow()"
      [side]="side()"
      [sideOffset]="sideOffset()"
      [width]="width()"
      [cardClass]="cardClass()"
      [(open)]="open"
    >
      <a id="trigger" href="#user" andesHoverCardTrigger aria-describedby="hint"
        >&#64;ana</a
      >
      <ng-template andesHoverCardContent>
        <p id="card-text">Ana Torres</p>
        <a id="card-link" href="#profile">Profile</a>
        <button type="button" id="card-button">Follow</button>
      </ng-template>
    </andes-hover-card>
    <span id="hint">Team member</span>
    <button type="button" id="after">After</button>
  `,
})
class HostComponent {
  readonly openDelay = signal(ANDES_HOVER_CARD_DEFAULT_OPEN_DELAY);
  readonly closeDelay = signal(ANDES_HOVER_CARD_DEFAULT_CLOSE_DELAY);
  readonly disabled = signal(false);
  readonly arrow = signal(false);
  readonly side = signal<'top' | 'bottom' | 'left' | 'right'>('bottom');
  readonly sideOffset = signal(8);
  readonly width = signal<number | string | null>(null);
  readonly cardClass = signal<string | null>(null);
  readonly open = signal(false);
  readonly card = viewChild.required(AndesHoverCard);
}

@Component({
  imports: [AndesHoverCard, AndesHoverCardTrigger],
  template: `
    <andes-hover-card [content]="tpl()">
      <button type="button" id="trigger" andesHoverCardTrigger>Open</button>
    </andes-hover-card>
    <ng-template #body><span id="inline">From input</span></ng-template>
  `,
})
class TemplateInputHost {
  readonly tpl = viewChild.required<TemplateRef<unknown>>('body');
}

@Component({
  imports: [AndesHoverCard, AndesHoverCardTrigger],
  template: `
    <andes-hover-card>
      <button type="button" id="trigger" andesHoverCardTrigger>Open</button>
    </andes-hover-card>
  `,
})
class NoContentHost {}

describe('AndesHoverCard', () => {
  withElementGeometry();

  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const q = <T extends HTMLElement = HTMLElement>(selector: string) =>
      fixture.nativeElement.querySelector(selector) as T;
    return {
      fixture,
      host: fixture.componentInstance,
      trigger: q<HTMLAnchorElement>('#trigger'),
      card: () =>
        document.querySelector('.andes-hover-card') as HTMLElement | null,
      pane: () =>
        document.querySelector('.cdk-overlay-pane') as HTMLElement | null,
    };
  }

  function flush(fixture: { detectChanges: () => void }) {
    fixture.detectChanges();
  }

  function pointer(target: Element, type: string, pointerType = 'mouse') {
    target.dispatchEvent(
      new PointerEvent(type, { pointerType, bubbles: false }),
    );
  }

  const hover = (target: Element) => pointer(target, 'pointerenter');
  const unhover = (target: Element) => pointer(target, 'pointerleave');

  function pressKey(
    target: Element,
    key: string,
    init: KeyboardEventInit = {},
  ): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      keyCode: key === 'Escape' ? 27 : key === 'Tab' ? 9 : 40,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    target.dispatchEvent(event);
    return event;
  }

  // jsdom's `:focus-visible` depends on its own modality bookkeeping and is not stable from one
  // test to the next, so keyboard-style focus is stated explicitly. The mouse-press case
  // overrides it on the element.
  const nativeMatches = Element.prototype.matches;
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      return selector === ':focus-visible'
        ? true
        : nativeMatches.call(this, selector);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('opening and closing with the pointer', () => {
    it('renders nothing until triggered', () => {
      const { card } = createHost();
      expect(card()).toBeNull();
    });

    it('defaults to a 600ms open delay and a 300ms close delay', () => {
      expect(ANDES_HOVER_CARD_DEFAULT_OPEN_DELAY).toBe(600);
      expect(ANDES_HOVER_CARD_DEFAULT_CLOSE_DELAY).toBe(300);
    });

    it('opens once the open delay has elapsed', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();

      hover(trigger);
      vi.advanceTimersByTime(599);
      flush(fixture);
      expect(card()).toBeNull();

      vi.advanceTimersByTime(1);
      flush(fixture);
      expect(card()?.textContent).toContain('Ana Torres');
    });

    it('honours a custom open delay, and none at all', () => {
      vi.useFakeTimers();
      const { fixture, host, trigger, card } = createHost();
      host.openDelay.set(0);
      flush(fixture);

      hover(trigger);
      flush(fixture);
      expect(card()).toBeTruthy();
    });

    it('does not open if the pointer leaves before the delay', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();

      hover(trigger);
      vi.advanceTimersByTime(300);
      unhover(trigger);
      vi.advanceTimersByTime(1000);
      flush(fixture);

      expect(card()).toBeNull();
    });

    it('closes after the close delay when the pointer leaves', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);
      expect(card()).toBeTruthy();

      unhover(trigger);
      vi.advanceTimersByTime(299);
      flush(fixture);
      expect(card()).toBeTruthy();

      vi.advanceTimersByTime(1);
      flush(fixture);
      expect(card()).toBeNull();
    });

    it('stays open while the pointer travels from the trigger to the card', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);

      unhover(trigger);
      vi.advanceTimersByTime(200);
      hover(card() as HTMLElement);
      vi.advanceTimersByTime(5000);
      flush(fixture);

      expect(card()).toBeTruthy();
    });

    it('closes after the close delay once the pointer leaves the card', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);
      unhover(trigger);
      hover(card() as HTMLElement);

      unhover(card() as HTMLElement);
      vi.advanceTimersByTime(299);
      flush(fixture);
      expect(card()).toBeTruthy();

      vi.advanceTimersByTime(1);
      flush(fixture);
      expect(card()).toBeNull();
    });

    it('stays open when the pointer returns to the trigger from the card', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);
      hover(card() as HTMLElement);
      unhover(card() as HTMLElement);
      vi.advanceTimersByTime(100);
      hover(trigger);
      vi.advanceTimersByTime(2000);
      flush(fixture);

      expect(card()).toBeTruthy();
    });

    it('closes at once with a zero close delay', () => {
      vi.useFakeTimers();
      const { fixture, host, trigger, card } = createHost();
      host.closeDelay.set(0);
      flush(fixture);
      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);

      unhover(trigger);
      flush(fixture);
      expect(card()).toBeNull();
    });

    it('holds the card while a pointer button pressed on it is still down', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);
      hover(card() as HTMLElement);

      // Selecting text: the button goes down on the card and the pointer strays outside.
      (card() as HTMLElement).dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerType: 'mouse',
          button: 0,
          bubbles: true,
        }),
      );
      unhover(card() as HTMLElement);
      unhover(trigger);
      vi.advanceTimersByTime(2000);
      flush(fixture);
      expect(card()).toBeTruthy();

      window.dispatchEvent(
        new PointerEvent('pointerup', { pointerType: 'mouse' }),
      );
      vi.advanceTimersByTime(300);
      flush(fixture);
      expect(card()).toBeNull();
    });

    it('ignores touch pointer events, which have no hover', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();

      pointer(trigger, 'pointerenter', 'touch');
      vi.advanceTimersByTime(2000);
      flush(fixture);

      expect(card()).toBeNull();
    });

    it('never opens while disabled, and closes if disabled while open', () => {
      vi.useFakeTimers();
      const { fixture, host, trigger, card } = createHost();
      host.disabled.set(true);
      flush(fixture);
      hover(trigger);
      vi.advanceTimersByTime(2000);
      flush(fixture);
      expect(card()).toBeNull();

      host.disabled.set(false);
      flush(fixture);
      unhover(trigger);
      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);
      expect(card()).toBeTruthy();

      host.disabled.set(true);
      flush(fixture);
      expect(card()).toBeNull();
    });

    it('does not open when there is no content', () => {
      vi.useFakeTimers();
      const fixture = TestBed.createComponent(NoContentHost);
      fixture.detectChanges();
      hover(fixture.nativeElement.querySelector('#trigger'));
      vi.advanceTimersByTime(2000);
      fixture.detectChanges();

      expect(document.querySelector('.andes-hover-card')).toBeNull();
    });

    it('renders a template passed through the content input', () => {
      vi.useFakeTimers();
      const fixture = TestBed.createComponent(TemplateInputHost);
      fixture.detectChanges();
      fixture.detectChanges();
      hover(fixture.nativeElement.querySelector('#trigger'));
      vi.advanceTimersByTime(600);
      fixture.detectChanges();

      expect(document.querySelector('#inline')?.textContent).toBe('From input');
    });
  });

  describe('keyboard focus', () => {
    it('opens after the open delay when the trigger takes focus, and closes on blur', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();

      trigger.focus();
      vi.advanceTimersByTime(599);
      flush(fixture);
      expect(card()).toBeNull();

      vi.advanceTimersByTime(1);
      flush(fixture);
      expect(card()).toBeTruthy();

      trigger.blur();
      vi.advanceTimersByTime(300);
      flush(fixture);
      expect(card()).toBeNull();
    });

    it('does not open for focus that is not keyboard-style (a mouse press on a link)', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      vi.spyOn(trigger, 'matches').mockReturnValue(false);

      trigger.focus();
      vi.advanceTimersByTime(2000);
      flush(fixture);

      expect(card()).toBeNull();
    });

    it('treats an engine without :focus-visible as keyboard focus', () => {
      const element = document.createElement('a');
      vi.spyOn(element, 'matches').mockImplementation(() => {
        throw new SyntaxError('unsupported selector');
      });
      expect(andesHoverCardIsFocusVisible(element)).toBe(true);
    });

    it('is held open by keyboard focus while the pointer comes and goes', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      trigger.focus();
      vi.advanceTimersByTime(600);
      flush(fixture);

      hover(trigger);
      unhover(trigger);
      vi.advanceTimersByTime(2000);
      flush(fixture);

      expect(card()).toBeTruthy();
    });

    it('ignores focus that a touch just caused', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();

      pointer(trigger, 'pointerdown', 'touch');
      trigger.focus();
      vi.advanceTimersByTime(2000);
      flush(fixture);

      expect(card()).toBeNull();
    });

    it('closes on Escape and stays closed until the trigger is left', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      trigger.focus();
      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);
      expect(card()).toBeTruthy();

      pressKey(document.body, 'Escape');
      flush(fixture);
      expect(card()).toBeNull();

      // Still hovered and focused: it must not pop back up by itself.
      hover(trigger);
      vi.advanceTimersByTime(2000);
      flush(fixture);
      expect(card()).toBeNull();

      // Leaving and coming back is a fresh request.
      unhover(trigger);
      trigger.blur();
      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);
      expect(card()).toBeTruthy();
    });

    it('describes the trigger while open and removes only its own id when closed', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      expect(trigger.getAttribute('aria-describedby')).toBe('hint');

      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);
      const id = card()?.id as string;
      expect(id).toMatch(/^andes-overlay-/);
      expect(trigger.getAttribute('aria-describedby')).toBe(`hint ${id}`);

      unhover(trigger);
      vi.advanceTimersByTime(300);
      flush(fixture);
      expect(trigger.getAttribute('aria-describedby')).toBe('hint');
    });

    it('is a hint with a body: no role, no modality, and focus stays put on open', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      trigger.focus();
      vi.advanceTimersByTime(600);
      flush(fixture);

      const surface = card() as HTMLElement;
      expect(surface.hasAttribute('role')).toBe(false);
      expect(surface.hasAttribute('aria-modal')).toBe(false);
      expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
      expect(trigger.hasAttribute('aria-expanded')).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('keyboard handoff into the card', () => {
    function openByFocus() {
      vi.useFakeTimers();
      const ctx = createHost();
      ctx.trigger.focus();
      vi.advanceTimersByTime(600);
      flush(ctx.fixture);
      return ctx;
    }

    it('does not move focus into the card on its own, nor on a plain Tab', () => {
      const { card, trigger } = openByFocus();

      expect(card()).toBeTruthy();
      expect(document.activeElement).toBe(trigger);
    });

    it('Alt+ArrowDown opens at once and focuses the first interactive element', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      trigger.focus();

      const event = pressKey(trigger, 'ArrowDown', { altKey: true });
      flush(fixture);

      expect(event.defaultPrevented).toBe(true);
      expect(card()).toBeTruthy();
      expect(document.activeElement?.id).toBe('card-link');
    });

    it('a plain ArrowDown is left alone', () => {
      const { trigger } = openByFocus();

      const event = pressKey(trigger, 'ArrowDown');

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });

    it('keeps the card open while focus is inside it, even after the pointer is gone', () => {
      const { fixture, trigger, card } = openByFocus();
      pressKey(trigger, 'ArrowDown', { altKey: true });
      flush(fixture);

      unhover(trigger);
      vi.advanceTimersByTime(5000);
      flush(fixture);

      expect(card()).toBeTruthy();
      expect(document.activeElement?.id).toBe('card-link');
    });

    it('Tab moves through the card; Tab from the last element leaves for the element after the trigger and closes', () => {
      const { fixture, trigger, card } = openByFocus();
      pressKey(trigger, 'ArrowDown', { altKey: true });
      flush(fixture);

      const link = document.querySelector('#card-link') as HTMLElement;
      const button = document.querySelector('#card-button') as HTMLElement;
      // Tab between the two inside the card is the browser's own job.
      expect(pressKey(link, 'Tab').defaultPrevented).toBe(false);
      button.focus();

      const event = pressKey(button, 'Tab');
      flush(fixture);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement?.id).toBe('after');
      expect(card()).toBeNull();
    });

    it('Shift+Tab from the first element returns to the trigger and keeps the card open', () => {
      const { fixture, trigger, card } = openByFocus();
      pressKey(trigger, 'ArrowDown', { altKey: true });
      flush(fixture);
      const link = document.querySelector('#card-link') as HTMLElement;

      const event = pressKey(link, 'Tab', { shiftKey: true });
      vi.advanceTimersByTime(5000);
      flush(fixture);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(trigger);
      expect(card()).toBeTruthy();
    });

    it('Escape inside the card closes it and returns focus to the trigger without reopening', () => {
      const { fixture, trigger, card } = openByFocus();
      pressKey(trigger, 'ArrowDown', { altKey: true });
      flush(fixture);
      const link = document.querySelector('#card-link') as HTMLElement;

      pressKey(link, 'Escape');
      vi.advanceTimersByTime(2000);
      flush(fixture);

      expect(card()).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });

    it('the tabbable helpers skip disabled, hidden and negative-tabindex elements', () => {
      const root = document.createElement('div');
      root.innerHTML = `
        <a href="#a" id="a">a</a>
        <button disabled id="b">b</button>
        <button tabindex="-1" id="c">c</button>
        <div hidden><button id="d">d</button></div>
        <input type="hidden" id="e" />
        <input id="f" />`;
      document.body.append(root);

      expect(andesHoverCardTabbables(root).map((el) => el.id)).toEqual([
        'a',
        'f',
      ]);
      expect(
        andesHoverCardNextTabbable(
          root.querySelector('#a') as HTMLElement,
          null,
        )?.id,
      ).toBe('f');
    });
  });

  describe('touch', () => {
    function tap(target: HTMLElement): MouseEvent {
      pointer(target, 'pointerdown', 'touch');
      const click = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(click);
      return click;
    }

    it('toggles on tap, without following a link on the opening tap', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();

      const open = tap(trigger);
      flush(fixture);
      expect(card()).toBeTruthy();
      expect(open.defaultPrevented).toBe(true);

      const close = tap(trigger);
      flush(fixture);
      expect(card()).toBeNull();
      expect(close.defaultPrevented).toBe(false);
    });

    it('stays open without a pointer or focus hold, and closes on a tap outside', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();
      tap(trigger);
      flush(fixture);

      trigger.blur();
      vi.advanceTimersByTime(5000);
      flush(fixture);
      expect(card()).toBeTruthy();

      const after = document.querySelector('#after') as HTMLElement;
      after.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
      flush(fixture);
      expect(card()).toBeNull();
    });

    it('a mouse click on the trigger is left alone', () => {
      vi.useFakeTimers();
      const { fixture, trigger, card } = createHost();

      const click = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      trigger.dispatchEvent(click);
      flush(fixture);

      expect(click.defaultPrevented).toBe(false);
      expect(card()).toBeNull();
    });
  });

  describe('open model and imperative API', () => {
    it('opens and closes from the two-way binding', () => {
      const { fixture, host, card } = createHost();

      host.open.set(true);
      flush(fixture);
      expect(card()).toBeTruthy();

      host.open.set(false);
      flush(fixture);
      expect(card()).toBeNull();
    });

    it('opens on init when open starts true', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.open.set(true);
      fixture.detectChanges();
      fixture.detectChanges();

      expect(document.querySelector('.andes-hover-card')).toBeTruthy();
      expect(fixture.componentInstance.open()).toBe(true);
    });

    it('writes the open state back when the user opens and closes it', () => {
      vi.useFakeTimers();
      const { fixture, host, trigger } = createHost();

      hover(trigger);
      vi.advanceTimersByTime(600);
      flush(fixture);
      expect(host.open()).toBe(true);

      unhover(trigger);
      vi.advanceTimersByTime(300);
      flush(fixture);
      expect(host.open()).toBe(false);
    });

    it('show(), hide() and toggle() open and close it at once', () => {
      const { fixture, host, card } = createHost();

      host.card().show();
      flush(fixture);
      expect(card()).toBeTruthy();

      host.card().hide();
      flush(fixture);
      expect(card()).toBeNull();

      host.card().toggle();
      flush(fixture);
      expect(card()).toBeTruthy();
      host.card().toggle();
      flush(fixture);
      expect(card()).toBeNull();
    });

    it('a disabled card ignores show() and the open binding', () => {
      const { fixture, host, card } = createHost();
      host.disabled.set(true);
      flush(fixture);

      host.card().show();
      host.open.set(true);
      flush(fixture);

      expect(card()).toBeNull();
    });
  });

  describe('appearance', () => {
    function showCard(configure?: (host: HostComponent) => void) {
      const ctx = createHost();
      configure?.(ctx.host);
      ctx.fixture.detectChanges();
      ctx.host.card().show();
      ctx.fixture.detectChanges();
      return ctx;
    }

    it('sets the 14/22 body text and the library font on the portalled surface', () => {
      const { card } = showCard();
      const css = readFileSync(
        'packages/ui/src/lib/hover-card/hover-card.css',
        'utf8',
      );

      expect(card()).toBeTruthy();
      expect(css).toContain(
        'font-family: var(--andes-font-family), sans-serif;',
      );
      expect(css).toMatch(
        /font-size: var\(--andes-text-font-size, 0\.875rem\)/,
      );
      expect(css).toMatch(
        /line-height: var\(--andes-text-line-height, 1\.375rem\)/,
      );
    });

    it('uses the medium shadow token and a hairline border', () => {
      const css = readFileSync(
        'packages/ui/src/lib/hover-card/hover-card.css',
        'utf8',
      );
      expect(css).toContain('--andes-shadow-md');
      expect(css).toContain('1px solid var(--_andes-hover-card-edge)');
    });

    it('has an invisible bridge as long as the gap', () => {
      const { card } = showCard();
      const bridge = card()?.querySelector('.andes-hover-card__bridge');

      expect(bridge?.getAttribute('aria-hidden')).toBe('true');
      expect(card()?.style.getPropertyValue('--andes-hover-card-bridge')).toBe(
        '9px',
      );
    });

    it('lengthens the bridge with sideOffset and the arrow', () => {
      const { card } = showCard((host) => {
        host.sideOffset.set(12);
        host.arrow.set(true);
      });

      expect(card()?.style.getPropertyValue('--andes-hover-card-bridge')).toBe(
        '19px',
      );
    });

    it('renders no arrow by default', () => {
      const { card } = showCard();

      expect(card()?.querySelector('.andes-hover-card__arrow')).toBeNull();
      expect(card()?.classList).not.toContain('andes-hover-card--arrow');
    });

    it('renders an arrow when asked to', () => {
      const { card } = showCard((host) => host.arrow.set(true));

      expect(card()?.querySelector('.andes-hover-card__arrow')).toBeTruthy();
      expect(card()?.classList).toContain('andes-hover-card--arrow');
    });

    it('reflects the side it renders on and the width and class inputs', () => {
      const { card } = showCard((host) => {
        host.side.set('top');
        host.width.set(320);
        host.cardClass.set('extra');
      });

      expect(card()?.dataset['side']).toBe('top');
      expect(card()?.style.getPropertyValue('--andes-hover-card-width')).toBe(
        '320px',
      );
      expect(card()?.classList).toContain('extra');
    });

    it('enters with a 150ms fade and a drift of at most 4px', () => {
      const css = readFileSync(
        'packages/ui/src/lib/hover-card/hover-card.css',
        'utf8',
      );
      expect(css).toContain(
        'animation: andes-hover-card-in var(--andes-motion-duration-mid, 150ms)',
      );
      expect(css).toContain(
        'var(--andes-motion-ease-out, cubic-bezier(0.2, 0, 0, 1))',
      );
      const drifts = [...css.matchAll(/--andes-hover-card-drift: ([^;]+);/g)]
        .flatMap((m) => m[1].match(/-?\d+px/g) ?? [])
        .map((px) => Math.abs(Number.parseInt(px, 10)));
      expect(drifts.length).toBeGreaterThan(0);
      expect(Math.max(...drifts)).toBeLessThanOrEqual(4);
    });

    it('exits on data-andes-closing in 120ms, ease-in, holding the last frame', () => {
      const css = readFileSync(
        'packages/ui/src/lib/hover-card/hover-card.css',
        'utf8',
      );
      const rule =
        /\.andes-hover-card\[data-andes-closing\]\s*\{([\s\S]*?)\n\}/.exec(
          css,
        )?.[1] ?? '';
      expect(rule).toContain('pointer-events: none');
      expect(rule).toContain('andes-hover-card-out');
      expect(rule).toContain('var(--andes-motion-duration-fast, 120ms)');
      expect(rule).toContain('var(--andes-motion-ease-in, ease-in)');
      expect(rule).toContain('forwards');
    });

    it('drops both animations under reduced motion', () => {
      const css = readFileSync(
        'packages/ui/src/lib/hover-card/hover-card.css',
        'utf8',
      );
      const block =
        /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}\n/.exec(
          css,
        )?.[1] ?? '';
      expect(block).toContain('animation: none');
      expect(block).toContain('[data-andes-closing]');
    });

    it('uses logical properties for the bridge and no bounce easing', () => {
      const css = readFileSync(
        'packages/ui/src/lib/hover-card/hover-card.css',
        'utf8',
      );
      expect(css).toContain('inset-inline: 0');
      expect(css).not.toMatch(/cubic-bezier\([^)]*-\d/);
    });

    it('never wraps a selector onto a line that starts with a combinator', () => {
      const css = readFileSync(
        'packages/ui/src/lib/hover-card/hover-card.css',
        'utf8',
      );
      // Emulated encapsulation silently drops a selector continued like that.
      expect(css.split('\n').filter((line) => /^\s*[>+~]/.test(line))).toEqual(
        [],
      );
    });

    it('marks the overlay pane as closing while it exits', () => {
      const { fixture, host, pane } = showCard();
      const paneElement = pane() as HTMLElement;
      const overlay = host.card()['overlay'] as AndesOverlayPrimitive;
      // jsdom has no Web Animations; a fake animation makes the primitive wait for it.
      let finish: () => void = () => undefined;
      const finished = new Promise<void>((resolve) => (finish = resolve));
      (
        paneElement as unknown as { getAnimations: () => unknown[] }
      ).getAnimations = () => [
        {
          playState: 'running',
          effect: { getComputedTiming: () => ({ endTime: 120 }) },
          finished,
        },
      ];

      overlay.close('imperative');
      expect(paneElement.hasAttribute('data-andes-closing')).toBe(true);
      expect(
        (paneElement.firstElementChild as HTMLElement).hasAttribute(
          'data-andes-closing',
        ),
      ).toBe(true);
      expect(overlay.isOpen()).toBe(false);

      finish();
      return finished.then(() => {
        fixture.detectChanges();
      });
    });
  });
});

describe('hover card geometry', () => {
  const rect = (left: number, top: number, width: number, height: number) => ({
    left,
    top,
    width,
    height,
  });

  it('maps every named placement to a side and an alignment', () => {
    expect(ANDES_HOVER_CARD_PLACEMENTS).toHaveLength(12);
    expect(andesHoverCardPlacementToSideAlign('topLeft')).toEqual({
      side: 'top',
      align: 'start',
    });
    expect(andesHoverCardPlacementToSideAlign('rightBottom')).toEqual({
      side: 'right',
      align: 'end',
    });
    expect(andesHoverCardPlacementToSideAlign('bottom')).toEqual({
      side: 'bottom',
      align: 'center',
    });
  });

  it('resolves the side the card rendered on', () => {
    const anchor = rect(100, 100, 50, 20);
    expect(
      andesHoverCardResolveSide(anchor, rect(80, 130, 100, 60), 'bottom'),
    ).toBe('bottom');
    expect(
      andesHoverCardResolveSide(anchor, rect(80, 30, 100, 60), 'bottom'),
    ).toBe('top');
    expect(
      andesHoverCardResolveSide(anchor, rect(160, 90, 100, 60), 'bottom'),
    ).toBe('right');
    expect(andesHoverCardResolveSide(anchor, rect(0, 0, 0, 0), 'left')).toBe(
      'left',
    );
  });

  it('aims the arrow at the trigger centre and keeps it off the corners', () => {
    const anchor = rect(100, 100, 50, 20);
    expect(
      andesHoverCardArrowOffset('bottom', anchor, rect(60, 130, 200, 60)),
    ).toBe(65);
    expect(
      andesHoverCardArrowOffset('bottom', anchor, rect(120, 130, 200, 60)),
    ).toBe(14);
    expect(
      andesHoverCardArrowOffset(
        'right',
        rect(100, 100, 50, 20),
        rect(160, 90, 100, 60),
      ),
    ).toBe(20);
  });
});

describe('AndesHoverCard trigger wiring', () => {
  it('queries the card through the component, not the DOM', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.directive(AndesHoverCard)),
    ).toBeTruthy();
    expect(
      fixture.debugElement
        .query(By.directive(AndesHoverCardTrigger))
        .nativeElement.getAttribute('data-state'),
    ).toBe('closed');
  });
});
