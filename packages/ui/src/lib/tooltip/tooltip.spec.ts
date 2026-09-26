import { AndesOverlayPrimitive } from '@andes-ng/primitives';
import { Component, signal, type TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AndesButton } from '../button/button';
import { AndesTooltip } from './tooltip';
import { AndesTooltipContent } from './tooltip-content';
import {
  ANDES_TOOLTIP_LONG_PRESS_DELAY,
  ANDES_TOOLTIP_TOUCH_HIDE_DELAY,
  type AndesTooltipTriggerAction,
} from './tooltip-hover-intent';
import {
  ANDES_TOOLTIP_ARROW_HEIGHT,
  ANDES_TOOLTIP_ARROW_INSET,
  ANDES_TOOLTIP_PLACEMENTS,
  andesTooltipArrowAttribute,
  andesTooltipArrowOffset,
  andesTooltipPlacementToSideAlign,
  andesTooltipPointAtCenterOffset,
  andesTooltipResolveSide,
  type AndesTooltipArrowInput,
  type AndesTooltipPlacement,
} from './tooltip-placement';
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

describe('tooltip placement helpers', () => {
  const rect = (left: number, top: number, width: number, height: number) => ({
    left,
    top,
    width,
    height,
  });

  it('maps all 12 Ant placements onto side/align', () => {
    expect(ANDES_TOOLTIP_PLACEMENTS).toHaveLength(12);
    const expected: Record<AndesTooltipPlacement, string> = {
      top: 'top/center',
      topLeft: 'top/start',
      topRight: 'top/end',
      bottom: 'bottom/center',
      bottomLeft: 'bottom/start',
      bottomRight: 'bottom/end',
      left: 'left/center',
      leftTop: 'left/start',
      leftBottom: 'left/end',
      right: 'right/center',
      rightTop: 'right/start',
      rightBottom: 'right/end',
    };
    for (const placement of ANDES_TOOLTIP_PLACEMENTS) {
      const { side, align } = andesTooltipPlacementToSideAlign(placement);
      expect(`${side}/${align}`).toBe(expected[placement]);
    }
  });

  it('normalizes the arrow input', () => {
    const cases: [AndesTooltipArrowInput, unknown][] = [
      [true, { pointAtCenter: false }],
      ['', { pointAtCenter: false }],
      ['true', { pointAtCenter: false }],
      [false, false],
      ['false', false],
      [null, false],
      [{ pointAtCenter: true }, { pointAtCenter: true }],
    ];
    for (const [input, output] of cases) {
      expect(andesTooltipArrowAttribute(input)).toEqual(output);
    }
  });

  it('reads back a flipped side from the rendered geometry', () => {
    const anchor = rect(100, 0, 80, 30);
    // Requested top, but rendered below the anchor (flipped).
    expect(andesTooltipResolveSide(anchor, rect(100, 40, 60, 20), 'top')).toBe(
      'bottom',
    );
    // Requested side honoured when it holds.
    expect(
      andesTooltipResolveSide(anchor, rect(100, 40, 60, 20), 'bottom'),
    ).toBe('bottom');
    // Rendered to the right (a perpendicular fallback).
    expect(andesTooltipResolveSide(anchor, rect(190, 0, 60, 20), 'top')).toBe(
      'right',
    );
    // An unmeasured panel falls back to the request.
    expect(andesTooltipResolveSide(anchor, rect(0, 0, 0, 0), 'left')).toBe(
      'left',
    );
  });

  it('points the arrow at the trigger center, following a viewport shift', () => {
    const anchor = rect(0, 100, 40, 30);
    // Centered tooltip pushed right to x=8 by the viewport margin.
    const panel = rect(8, 60, 120, 30);
    expect(andesTooltipArrowOffset('top', 'center', false, anchor, panel)).toBe(
      12,
    );
  });

  it('places an edge-aligned arrow just inside the aligned edge', () => {
    const anchor = rect(100, 100, 200, 30);
    const startPanel = rect(100, 60, 120, 30);
    expect(
      andesTooltipArrowOffset('top', 'start', false, anchor, startPanel),
    ).toBe(ANDES_TOOLTIP_ARROW_INSET);
    const endPanel = rect(180, 60, 120, 30);
    expect(andesTooltipArrowOffset('top', 'end', false, anchor, endPanel)).toBe(
      120 - ANDES_TOOLTIP_ARROW_INSET,
    );
  });

  it('clamps the arrow clear of the rounded corners', () => {
    const anchor = rect(0, 100, 10, 30);
    const panel = rect(200, 60, 120, 30);
    expect(andesTooltipArrowOffset('top', 'center', false, anchor, panel)).toBe(
      10,
    );
  });

  it('computes the pointAtCenter shift for edge-aligned placements', () => {
    const size = { width: 100, height: 40 };
    expect(andesTooltipPointAtCenterOffset('top', 'start', size)).toBe(
      50 - ANDES_TOOLTIP_ARROW_INSET,
    );
    expect(andesTooltipPointAtCenterOffset('bottom', 'end', size)).toBe(
      -(50 - ANDES_TOOLTIP_ARROW_INSET),
    );
    expect(andesTooltipPointAtCenterOffset('left', 'start', size)).toBe(
      20 - ANDES_TOOLTIP_ARROW_INSET,
    );
    expect(andesTooltipPointAtCenterOffset('top', 'center', size)).toBe(0);
  });
});

@Component({
  imports: [AndesTooltip, AndesTooltipTrigger],
  template: `
    <andes-tooltip
      [content]="useTemplate() ? tpl : content()"
      [placement]="placement()"
      [arrow]="arrow()"
      [autoAdjustOverflow]="autoAdjustOverflow()"
      [trigger]="trigger()"
      [openDelay]="0"
      [(open)]="open"
      (openChange)="changes.push($event)"
      [color]="color()"
      [maxWidth]="maxWidth()"
      [tooltipClass]="tooltipClass()"
      [zIndex]="zIndex()"
      [destroyOnHidden]="destroyOnHidden()"
      [fresh]="fresh()"
    >
      <button
        type="button"
        id="trigger"
        andesTooltipTrigger
        aria-describedby="own-hint"
        [disabled]="triggerDisabled()"
      >
        Trigger
      </button>
    </andes-tooltip>
    <ng-template #tpl><em id="tpl-content">Templated</em></ng-template>
  `,
})
class FeatureHostComponent {
  readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
  readonly content = signal('Hint');
  readonly useTemplate = signal(false);
  readonly placement = signal<AndesTooltipPlacement | null>(null);
  readonly arrow = signal<AndesTooltipArrowInput>(true);
  readonly autoAdjustOverflow = signal(true);
  readonly trigger = signal<
    AndesTooltipTriggerAction | AndesTooltipTriggerAction[]
  >(['hover', 'focus']);
  readonly open = signal(false);
  readonly changes: boolean[] = [];
  readonly color = signal<string | null>(null);
  readonly maxWidth = signal<number | string | null>(null);
  readonly tooltipClass = signal<string | null>(null);
  readonly zIndex = signal<number | null>(null);
  readonly destroyOnHidden = signal(false);
  readonly fresh = signal(false);
  readonly triggerDisabled = signal(false);
}

@Component({
  imports: [AndesTooltip, AndesTooltipTrigger, AndesButton],
  template: `
    <andes-tooltip content="Save changes" [openDelay]="0">
      <andes-button andesTooltipTrigger [disabled]="disabled()">
        Save
      </andes-button>
    </andes-tooltip>
  `,
})
class AndesButtonHostComponent {
  readonly disabled = signal(false);
}

describe('AndesTooltip (Ant Design parity)', () => {
  withElementGeometry();

  function createHost() {
    const fixture = TestBed.createComponent(FeatureHostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const trigger = fixture.nativeElement.querySelector(
      '#trigger',
    ) as HTMLButtonElement;
    const tooltipHost = fixture.nativeElement.querySelector(
      'andes-tooltip',
    ) as HTMLElement;
    const overlay = fixture.debugElement
      .query(By.directive(AndesTooltip))
      .injector.get(AndesOverlayPrimitive);
    const panel = () =>
      document.querySelector('.andes-tooltip') as HTMLElement | null;
    const settle = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { fixture, host, trigger, tooltipHost, overlay, panel, settle };
  }

  function pointer(
    element: HTMLElement,
    type: string,
    pointerType = 'mouse',
  ): PointerEvent {
    const event = new PointerEvent(type, {
      pointerType,
      bubbles: type !== 'pointerenter' && type !== 'pointerleave',
      cancelable: true,
    });
    element.dispatchEvent(event);
    return event;
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('placement', () => {
    it('resolves an Ant placement into the overlay positioning', () => {
      const { fixture, host, overlay } = createHost();
      host.placement.set('rightBottom');
      fixture.detectChanges();

      const positioning = overlay.config().positioning;
      expect(positioning).toMatchObject({
        kind: 'anchored',
        side: 'right',
        align: 'end',
        flip: true,
        shift: true,
      });
    });

    it('marks the rendered side on the tooltip', () => {
      const { fixture, host, trigger, panel } = createHost();
      host.placement.set('bottomLeft');
      fixture.detectChanges();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();

      expect(panel()?.getAttribute('data-side')).toBe('bottom');
    });

    it('turns flip and shift off with autoAdjustOverflow=false', () => {
      const { fixture, host, overlay } = createHost();
      host.autoAdjustOverflow.set(false);
      fixture.detectChanges();

      expect(overlay.config().positioning).toMatchObject({
        flip: false,
        shift: false,
      });
    });
  });

  describe('arrow', () => {
    it('renders an arrow by default and leaves room for it', () => {
      const { fixture, trigger, overlay, panel } = createHost();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();

      expect(panel()?.querySelector('.andes-tooltip__arrow')).toBeTruthy();
      expect(overlay.config().positioning).toMatchObject({
        sideOffset: 6 + ANDES_TOOLTIP_ARROW_HEIGHT,
      });
    });

    it('omits the arrow with arrow=false', () => {
      const { fixture, host, trigger, overlay, panel } = createHost();
      host.arrow.set(false);
      fixture.detectChanges();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();

      expect(panel()?.querySelector('.andes-tooltip__arrow')).toBeNull();
      expect(overlay.config().positioning).toMatchObject({ sideOffset: 6 });
    });

    it('shifts an edge-aligned tooltip so the arrow points at the trigger center', () => {
      const { fixture, host, trigger, overlay } = createHost();
      host.placement.set('topLeft');
      host.arrow.set({ pointAtCenter: true });
      fixture.detectChanges();
      vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 100, 32),
      );

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();

      expect(overlay.config().positioning).toMatchObject({
        align: 'start',
        alignOffset: 50 - ANDES_TOOLTIP_ARROW_INSET,
      });
    });
  });

  describe('trigger', () => {
    it('toggles on click, with no delay, when trigger is "click"', () => {
      const { fixture, host, trigger, panel } = createHost();
      host.trigger.set('click');
      fixture.detectChanges();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();
      expect(panel()).toBeNull();

      trigger.click();
      fixture.detectChanges();
      expect(panel()).toBeTruthy();

      trigger.click();
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('closes on an outside click only when opened by click', () => {
      const { fixture, host, trigger, panel } = createHost();
      const outsideClick = () => {
        pointer(document.body, 'pointerdown');
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();
      };

      // Hover/focus tooltip opened programmatically: a page click leaves it.
      host.open.set(true);
      fixture.detectChanges();
      outsideClick();
      expect(panel()).toBeTruthy();
      host.open.set(false);
      fixture.detectChanges();

      host.trigger.set('click');
      fixture.detectChanges();
      trigger.click();
      fixture.detectChanges();
      expect(panel()).toBeTruthy();
      outsideClick();
      expect(panel()).toBeNull();
      expect(host.open()).toBe(false);
    });

    it('opens on right-click and suppresses the native menu for "contextMenu"', () => {
      const { fixture, host, trigger, panel } = createHost();
      host.trigger.set('contextMenu');
      fixture.detectChanges();

      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      trigger.dispatchEvent(event);
      fixture.detectChanges();

      expect(event.defaultPrevented).toBe(true);
      expect(panel()).toBeTruthy();
    });

    it('ignores hover when only "focus" is a trigger', () => {
      const { fixture, host, trigger, panel } = createHost();
      host.trigger.set(['focus']);
      fixture.detectChanges();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();
      expect(panel()).toBeNull();

      trigger.focus();
      fixture.detectChanges();
      expect(panel()).toBeTruthy();
    });

    it('opens on a touch long-press and hides a while after the finger lifts', () => {
      vi.useFakeTimers();
      const { fixture, trigger, panel } = createHost();

      pointer(trigger, 'pointerdown', 'touch');
      vi.advanceTimersByTime(ANDES_TOOLTIP_LONG_PRESS_DELAY - 1);
      fixture.detectChanges();
      expect(panel()).toBeNull();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(panel()).toBeTruthy();

      pointer(trigger, 'pointerup', 'touch');
      vi.advanceTimersByTime(ANDES_TOOLTIP_TOUCH_HIDE_DELAY - 1);
      fixture.detectChanges();
      expect(panel()).toBeTruthy();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('ignores the focus a tap causes, so the long-press hide still applies', () => {
      vi.useFakeTimers();
      const { fixture, trigger, panel } = createHost();

      pointer(trigger, 'pointerdown', 'touch');
      vi.advanceTimersByTime(ANDES_TOOLTIP_LONG_PRESS_DELAY);
      pointer(trigger, 'pointerup', 'touch');
      trigger.focus();
      fixture.detectChanges();
      expect(panel()).toBeTruthy();

      vi.advanceTimersByTime(ANDES_TOOLTIP_TOUCH_HIDE_DELAY);
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('does not open on a short tap, even though the tap focuses the trigger', () => {
      vi.useFakeTimers();
      const { fixture, trigger, panel } = createHost();

      pointer(trigger, 'pointerdown', 'touch');
      vi.advanceTimersByTime(100);
      pointer(trigger, 'pointerup', 'touch');
      trigger.focus();
      vi.advanceTimersByTime(ANDES_TOOLTIP_LONG_PRESS_DELAY);
      fixture.detectChanges();

      expect(panel()).toBeNull();
    });
  });

  describe('open / openChange', () => {
    it('opens and closes programmatically', () => {
      const { fixture, host, panel } = createHost();

      host.open.set(true);
      fixture.detectChanges();
      expect(panel()).toBeTruthy();

      host.open.set(false);
      fixture.detectChanges();
      expect(panel()).toBeNull();
      expect(host.changes).toEqual([]);
    });

    it('reports user-driven changes through openChange and the two-way binding', () => {
      const { fixture, host, trigger } = createHost();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();
      expect(host.open()).toBe(true);

      pointer(trigger, 'pointerleave');
      fixture.detectChanges();
      expect(host.open()).toBe(false);
      expect(host.changes).toEqual([true, false]);
    });

    it('reports an Escape dismissal', () => {
      const { fixture, host, panel } = createHost();
      host.open.set(true);
      fixture.detectChanges();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          bubbles: true,
        }),
      );
      fixture.detectChanges();

      expect(panel()).toBeNull();
      expect(host.open()).toBe(false);
      expect(host.changes).toEqual([false]);
    });
  });

  describe('content', () => {
    it('accepts a TemplateRef as content', () => {
      const { fixture, host, trigger, panel } = createHost();
      host.useTemplate.set(true);
      fixture.detectChanges();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();

      expect(panel()?.querySelector('#tpl-content')?.textContent).toBe(
        'Templated',
      );
    });

    it('never opens with empty content', () => {
      const { fixture, host, trigger, panel } = createHost();
      host.content.set('  ');
      fixture.detectChanges();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();

      expect(panel()).toBeNull();
    });
  });

  describe('styling', () => {
    it('applies a semantic color preset as a modifier class', () => {
      const { fixture, host, trigger, panel } = createHost();
      host.color.set('danger');
      fixture.detectChanges();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();

      expect(panel()?.classList).toContain('andes-tooltip--danger');
      expect(
        panel()?.style.getPropertyValue('--andes-tooltip-background'),
      ).toBe('');
    });

    it('applies an arbitrary color through the background custom property', () => {
      const { fixture, host, trigger, panel } = createHost();
      host.color.set('#7c3aed');
      fixture.detectChanges();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();

      expect(panel()?.classList).toContain('andes-tooltip--custom-color');
      expect(
        panel()?.style.getPropertyValue('--andes-tooltip-background'),
      ).toBe('#7c3aed');
    });

    it('sets maxWidth and tooltipClass on the tooltip element', () => {
      const { fixture, host, trigger, panel } = createHost();
      host.maxWidth.set(180);
      host.tooltipClass.set('my-tooltip');
      fixture.detectChanges();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();

      expect(panel()?.style.getPropertyValue('--andes-tooltip-max-width')).toBe(
        '180px',
      );
      expect(panel()?.classList).toContain('my-tooltip');
      expect(panel()?.classList).toContain('andes-tooltip');
    });

    it('overrides the overlay z-index with zIndex', () => {
      const { fixture, host, trigger, overlay } = createHost();
      host.zIndex.set(4242);
      fixture.detectChanges();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();

      expect(overlay.panelElement()?.parentElement?.style.zIndex).toBe('4242');
    });
  });

  describe('destroyOnHidden / fresh', () => {
    function openAndGetBody(
      fixture: ReturnType<typeof createHost>['fixture'],
      trigger: HTMLElement,
    ) {
      pointer(trigger, 'pointerenter');
      fixture.detectChanges();
      return document.querySelector('.andes-tooltip__body') as HTMLElement;
    }

    function close(
      fixture: ReturnType<typeof createHost>['fixture'],
      trigger: HTMLElement,
    ) {
      pointer(trigger, 'pointerleave');
      fixture.detectChanges();
    }

    it('keeps the rendered content across openings by default', () => {
      const { fixture, trigger } = createHost();

      const first = openAndGetBody(fixture, trigger);
      close(fixture, trigger);
      const second = openAndGetBody(fixture, trigger);

      expect(second).toBe(first);
    });

    it('re-renders the content on each opening with destroyOnHidden', () => {
      const { fixture, host, trigger } = createHost();
      host.destroyOnHidden.set(true);
      fixture.detectChanges();

      const first = openAndGetBody(fixture, trigger);
      close(fixture, trigger);
      const second = openAndGetBody(fixture, trigger);

      expect(second).not.toBe(first);
      expect(first.isConnected).toBe(false);
    });

    it('pauses hidden content until reopened, unless fresh', () => {
      const { fixture, host, trigger } = createHost();

      const body = openAndGetBody(fixture, trigger);
      close(fixture, trigger);
      host.content.set('Updated');
      fixture.detectChanges();
      expect(body.textContent?.trim()).toBe('Hint');

      openAndGetBody(fixture, trigger);
      expect(body.textContent?.trim()).toBe('Updated');
    });

    it('keeps hidden content updating with fresh', () => {
      const { fixture, host, trigger } = createHost();
      host.fresh.set(true);
      fixture.detectChanges();

      const body = openAndGetBody(fixture, trigger);
      close(fixture, trigger);
      host.content.set('Updated');
      fixture.detectChanges();

      expect(body.textContent?.trim()).toBe('Updated');
    });
  });

  describe('accessibility', () => {
    it("adds its id to the trigger's own aria-describedby and removes only it", () => {
      const { fixture, trigger, overlay } = createHost();

      pointer(trigger, 'pointerenter');
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-describedby')).toBe(
        `own-hint ${overlay.contentId}`,
      );

      pointer(trigger, 'pointerleave');
      fixture.detectChanges();
      expect(trigger.getAttribute('aria-describedby')).toBe('own-hint');
    });
  });

  describe('disabled trigger', () => {
    it('hands hover over to the wrapper while the trigger is disabled', async () => {
      const { host, trigger, tooltipHost, overlay, panel, settle } =
        createHost();
      host.triggerDisabled.set(true);
      await settle();

      expect(trigger.style.pointerEvents).toBe('none');
      expect(tooltipHost.hasAttribute('data-disabled-trigger')).toBe(true);

      // The trigger's own events are ignored (browsers may not send them)...
      pointer(trigger, 'pointerenter');
      await settle();
      expect(panel()).toBeNull();

      // ...and the wrapper's are handled, anchored to the wrapper.
      pointer(tooltipHost, 'pointerenter');
      await settle();
      expect(panel()).toBeTruthy();
      expect(overlay.anchor()).toBe(tooltipHost);

      pointer(tooltipHost, 'pointerleave');
      await settle();
      expect(panel()).toBeNull();
    });

    it('restores the trigger once re-enabled', async () => {
      const { host, trigger, tooltipHost, settle } = createHost();
      host.triggerDisabled.set(true);
      await settle();
      host.triggerDisabled.set(false);
      await settle();

      expect(trigger.style.pointerEvents).toBe('');
      expect(tooltipHost.hasAttribute('data-disabled-trigger')).toBe(false);
    });
  });

  describe('custom-element trigger (andes-button)', () => {
    function createButtonHost() {
      const fixture = TestBed.createComponent(AndesButtonHostComponent);
      fixture.detectChanges();
      const inner = fixture.nativeElement.querySelector(
        'andes-button button',
      ) as HTMLButtonElement;
      const overlay = fixture.debugElement
        .query(By.directive(AndesTooltip))
        .injector.get(AndesOverlayPrimitive);
      return { fixture, inner, overlay };
    }

    it('opens on focus of the inner button and describes it', () => {
      const { fixture, inner, overlay } = createButtonHost();

      inner.focus();
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(true);
      expect(inner.getAttribute('aria-describedby')).toBe(overlay.contentId);
      expect(overlay.anchor()).toBe(inner);
      expect(
        fixture.nativeElement
          .querySelector('andes-button')
          .hasAttribute('aria-describedby'),
      ).toBe(false);
    });

    it('treats a disabled andes-button as a disabled trigger', async () => {
      const { fixture, inner } = createButtonHost();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(inner.style.pointerEvents).toBe('none');
      expect(
        fixture.nativeElement
          .querySelector('andes-tooltip')
          .hasAttribute('data-disabled-trigger'),
      ).toBe(true);
    });
  });
});
