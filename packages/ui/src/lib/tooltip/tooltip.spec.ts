import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesTooltip } from './tooltip';
import { AndesTooltipContent } from './tooltip-content';
import { AndesTooltipTrigger } from './tooltip-trigger';

/**
 * jsdom reports zero geometry for every element, which makes CDK's flexible
 * positioning strategy (and its viewport-collision math) unhappy. Real
 * pixels are not the point of these tests, so a nominal, non-zero size is
 * enough to let the overlay attach and position without throwing - the same
 * approach `overlay-primitive.spec.ts` uses.
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
  imports: [AndesTooltip, AndesTooltipTrigger, AndesTooltipContent],
  template: `
    <andes-tooltip
      [content]="content()"
      [disabled]="disabled()"
      [openDelay]="openDelay()"
      [closeDelay]="closeDelay()"
      [instantReopenWindow]="instantReopenWindow()"
    >
      <button type="button" id="trigger" andesTooltipTrigger>Hover me</button>
      @if (useRichContent()) {
        <ng-template andesTooltipContent
          ><strong id="rich">Rich hint</strong></ng-template
        >
      }
    </andes-tooltip>
  `,
})
class HostComponent {
  readonly content = signal('Helpful hint');
  readonly disabled = signal(false);
  readonly openDelay = signal(600);
  readonly closeDelay = signal(0);
  readonly instantReopenWindow = signal(400);
  readonly useRichContent = signal(false);
}

describe('AndesTooltip', () => {
  withElementGeometry();

  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      '#trigger',
    ) as HTMLButtonElement;
    const panel = () =>
      document.querySelector('.andes-tooltip') as HTMLElement | null;
    return { fixture, trigger, panel };
  }

  function hover(trigger: HTMLElement) {
    trigger.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'mouse' }),
    );
  }

  function unhover(trigger: HTMLElement) {
    trigger.dispatchEvent(
      new PointerEvent('pointerleave', { pointerType: 'mouse' }),
    );
  }

  function touchHover(trigger: HTMLElement) {
    trigger.dispatchEvent(
      new PointerEvent('pointerenter', { pointerType: 'touch' }),
    );
  }

  function pressEscape() {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        keyCode: 27,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render the tooltip panel until triggered', () => {
    const { panel } = createHost();

    expect(panel()).toBeNull();
  });

  it('opens after the hover delay elapses', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();

    hover(trigger);
    fixture.detectChanges();
    expect(panel()).toBeNull();

    vi.advanceTimersByTime(599);
    fixture.detectChanges();
    expect(panel()).toBeNull();

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(panel()?.textContent?.trim()).toBe('Helpful hint');
  });

  it('does not open before the delay if the pointer leaves first', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();

    hover(trigger);
    fixture.detectChanges();
    unhover(trigger);
    fixture.detectChanges();

    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('closes on mouse-leave', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();

    hover(trigger);
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    unhover(trigger);
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('opens on keyboard focus and closes on blur', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();

    trigger.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(panel()).toBeNull();

    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    trigger.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('ignores touch pointer events - no hover-open on touch devices', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();

    touchHover(trigger);
    fixture.detectChanges();
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('opens instantly, skipping the delay, right after another tooltip closed', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();

    hover(trigger);
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    unhover(trigger);
    fixture.detectChanges();
    expect(panel()).toBeNull();

    vi.advanceTimersByTime(50);
    hover(trigger);
    fixture.detectChanges();

    expect(panel()).toBeTruthy();
  });

  it('pays the full delay again once the grouping window has elapsed', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();

    hover(trigger);
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    unhover(trigger);
    fixture.detectChanges();

    vi.advanceTimersByTime(500);
    hover(trigger);
    fixture.detectChanges();
    expect(panel()).toBeNull();

    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(panel()).toBeTruthy();
  });

  it('never opens while disabled', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    hover(trigger);
    vi.advanceTimersByTime(600);
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('closes immediately if disabled flips true while open', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();

    hover(trigger);
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('is dismissed by Escape', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();

    hover(trigger);
    vi.advanceTimersByTime(600);
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    pressEscape();
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('renders projected rich content instead of the plain-text content input', () => {
    vi.useFakeTimers();
    const { fixture, trigger, panel } = createHost();
    fixture.componentInstance.useRichContent.set(true);
    fixture.detectChanges();

    hover(trigger);
    vi.advanceTimersByTime(600);
    fixture.detectChanges();

    expect(panel()?.querySelector('#rich')).toBeTruthy();
    expect(panel()?.textContent?.trim()).toBe('Rich hint');
  });

  describe('aria-describedby wiring', () => {
    it('has no aria-describedby while closed', () => {
      const { trigger } = createHost();

      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    });

    it('points aria-describedby at the tooltip panel id once open', () => {
      vi.useFakeTimers();
      const { fixture, trigger, panel } = createHost();

      hover(trigger);
      vi.advanceTimersByTime(600);
      fixture.detectChanges();

      const describedBy = trigger.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(panel()?.id).toBe(describedBy);
    });

    it('uses role="tooltip" on the content, not aria-labelledby on the trigger', () => {
      vi.useFakeTimers();
      const { fixture, trigger, panel } = createHost();

      hover(trigger);
      vi.advanceTimersByTime(600);
      fixture.detectChanges();

      expect(panel()?.getAttribute('role')).toBe('tooltip');
      expect(trigger.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('clears aria-describedby again once closed', () => {
      vi.useFakeTimers();
      const { fixture, trigger } = createHost();

      hover(trigger);
      vi.advanceTimersByTime(600);
      fixture.detectChanges();
      unhover(trigger);
      fixture.detectChanges();

      expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    });
  });
});
