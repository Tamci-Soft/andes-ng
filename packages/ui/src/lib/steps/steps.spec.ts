import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesStep } from './step';
import { AndesSteps } from './steps';
import {
  AndesStepStatus,
  AndesStepsLabelPlacement,
  AndesStepsOrientation,
  AndesStepsSize,
  AndesStepsVariant,
} from './steps-types';

@Component({
  imports: [AndesSteps, AndesStep],
  template: `
    <andes-steps
      [(current)]="current"
      [orientation]="orientation()"
      [variant]="variant()"
      [size]="size()"
      [labelPlacement]="labelPlacement()"
      [clickable]="clickable()"
      [status]="status()"
      [percent]="percent()"
      [responsive]="responsive()"
      [breakpoint]="breakpoint()"
      [announce]="announce()"
      aria-label="Checkout progress"
      (changed)="changes.push($event)"
    >
      <andes-step
        title="Account"
        subtitle="2 min"
        description="Create a login"
      />
      <andes-step title="Billing" [disabled]="billingDisabled()" />
      <andes-step title="Review" [status]="reviewStatus()" />
      <andes-step [title]="titleTpl" [icon]="iconTpl">
        <b class="extra">Extra</b>
      </andes-step>
    </andes-steps>
    <ng-template #titleTpl><em class="rich">Done</em></ng-template>
    <ng-template #iconTpl let-status let-index="index" let-current="current"
      ><i class="custom-icon"
        >{{ status }}-{{ index }}-{{ current }}</i
      ></ng-template
    >
  `,
})
class HostComponent {
  readonly current = signal(1);
  readonly orientation = signal<AndesStepsOrientation>('horizontal');
  readonly variant = signal<AndesStepsVariant>('default');
  readonly size = signal<AndesStepsSize>('default');
  readonly labelPlacement = signal<AndesStepsLabelPlacement>('horizontal');
  readonly clickable = signal(false);
  readonly status = signal<AndesStepStatus>('process');
  readonly percent = signal<number | undefined>(undefined);
  readonly responsive = signal(true);
  readonly breakpoint = signal(480);
  readonly announce = signal(true);
  readonly billingDisabled = signal(false);
  readonly reviewStatus = signal<AndesStepStatus | undefined>(undefined);
  readonly changes: number[] = [];
  readonly titleTpl = viewChild.required<TemplateRef<unknown>>('titleTpl');
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  disconnected = false;
  constructor(private readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  observe() {
    /* noop */
  }
  disconnect() {
    this.disconnected = true;
  }
  trigger() {
    this.callback();
  }
}

describe('AndesSteps', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const root = fixture.nativeElement.querySelector(
      'andes-steps',
    ) as HTMLElement;
    const items = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('andes-step'),
      ) as HTMLElement[];
    const buttons = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('button.andes-step__trigger'),
      ) as HTMLButtonElement[];
    return { fixture, host, root, items, buttons };
  }

  function flush(fixture: ComponentFixture<HostComponent>) {
    fixture.detectChanges();
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    FakeResizeObserver.instances = [];
  });

  describe('semantics', () => {
    it('renders an ordered list of list items labelled by the consumer', () => {
      const { fixture, items } = create();
      const list = fixture.nativeElement.querySelector('ol') as HTMLElement;

      expect(list).toBeTruthy();
      expect(list.getAttribute('aria-label')).toBe('Checkout progress');
      expect(items()).toHaveLength(4);
      expect(
        items().every((el) => el.getAttribute('role') === 'listitem'),
      ).toBe(true);
      expect(items()[0].parentElement).toBe(list);
    });

    it('does not leave the aria-label on the host element', () => {
      const { root } = create();

      expect(root.hasAttribute('aria-label')).toBe(false);
    });

    it('marks only the current step with aria-current="step"', () => {
      const { fixture, host, items } = create();

      expect(items().map((el) => el.getAttribute('aria-current'))).toEqual([
        null,
        'step',
        null,
        null,
      ]);

      host.current.set(2);
      flush(fixture);

      expect(items().map((el) => el.getAttribute('aria-current'))).toEqual([
        null,
        null,
        'step',
        null,
      ]);
    });

    it('does not keep a static title attribute on the step host', () => {
      const { items } = create();

      expect(items()[0].hasAttribute('title')).toBe(false);
    });

    it('announces the status as visually hidden text', () => {
      const { items } = create();
      const text = (i: number) =>
        items()[i].querySelector('.andes-step__title')?.textContent?.trim();

      expect(text(0)).toContain('Account');
      expect(text(0)).toContain('Completed');
      expect(text(1)).toContain('In progress');
      expect(text(2)).toContain('Upcoming');
    });

    it('hides decorative markers from assistive tech', () => {
      const { items } = create();

      expect(
        items()[0]
          .querySelector('.andes-step__marker')
          ?.getAttribute('aria-hidden'),
      ).toBe('true');
      expect(
        items()[0]
          .querySelector('.andes-step__tail')
          ?.getAttribute('aria-hidden'),
      ).toBe('true');
    });

    it('describes a clickable step with its description', () => {
      const { fixture, host, buttons } = create();
      host.clickable.set(true);
      flush(fixture);

      const button = buttons()[0];
      const description = fixture.nativeElement.querySelector(
        `#${button.getAttribute('aria-describedby')}`,
      ) as HTMLElement;

      expect(description.textContent).toContain('Create a login');
    });
  });

  describe('status', () => {
    it('derives finish / process / wait from current', () => {
      const { items } = create();

      expect(items().map((el) => el.getAttribute('data-status'))).toEqual([
        'finish',
        'process',
        'wait',
        'wait',
      ]);
    });

    it('re-derives when current changes', () => {
      const { fixture, host, items } = create();
      host.current.set(3);
      flush(fixture);

      expect(items().map((el) => el.getAttribute('data-status'))).toEqual([
        'finish',
        'finish',
        'finish',
        'process',
      ]);
    });

    it('applies the trail status to the current step only', () => {
      const { fixture, host, items } = create();
      host.status.set('error');
      flush(fixture);

      expect(items().map((el) => el.getAttribute('data-status'))).toEqual([
        'finish',
        'error',
        'wait',
        'wait',
      ]);
    });

    it('lets a step override the derived status', () => {
      const { fixture, host, items } = create();
      host.reviewStatus.set('error');
      flush(fixture);

      expect(items()[2].getAttribute('data-status')).toBe('error');
      expect(items()[2].textContent).toContain('Error');
    });

    it('treats an out-of-range current as everything finished', () => {
      const { fixture, host, items } = create();
      host.current.set(9);
      flush(fixture);

      expect(
        items().every((el) => el.getAttribute('data-status') === 'finish'),
      ).toBe(true);
    });
  });

  describe('markers', () => {
    it('shows the number for upcoming and in-progress steps', () => {
      const { items } = create();

      expect(items()[1].querySelector('.andes-step__number')?.textContent).toBe(
        '2',
      );
      expect(items()[2].querySelector('.andes-step__number')?.textContent).toBe(
        '3',
      );
    });

    it('shows an inline svg check for finished and cross for error', () => {
      const { fixture, host, items } = create();

      expect(items()[0].querySelector('svg.andes-step__glyph')).toBeTruthy();
      expect(items()[0].querySelector('.andes-step__number')).toBeNull();

      host.status.set('error');
      flush(fixture);

      const path = items()[1].querySelector('svg.andes-step__glyph path');
      expect(path?.getAttribute('d')).toContain('m0-7');
    });

    it('renders a custom icon template with status, index and current', () => {
      const { items } = create();

      expect(items()[3].querySelector('.custom-icon')?.textContent).toBe(
        'wait-3-false',
      );
      expect(items()[3].querySelector('.andes-step__number')).toBeNull();
    });

    it('renders a template title and projected content', () => {
      const { items } = create();

      expect(items()[3].querySelector('.rich')?.textContent).toBe('Done');
      expect(items()[3].querySelector('.extra')).toBeTruthy();
    });

    it('renders subtitle and description text', () => {
      const { items } = create();

      expect(
        items()[0].querySelector('.andes-step__subtitle')?.textContent,
      ).toBe('2 min');
      expect(
        items()[0].querySelector('.andes-step__description')?.textContent,
      ).toContain('Create a login');
      expect(items()[1].querySelector('.andes-step__subtitle')).toBeNull();
    });

    it('leaves an empty description wrapper collapsible', () => {
      const { items } = create();
      const description = items()[1].querySelector(
        '.andes-step__description',
      ) as HTMLElement;

      expect(description.textContent?.trim()).toBe('');
    });

    it('omits the tail after the last step', () => {
      const { items } = create();

      expect(items()[2].querySelector('.andes-step__tail')).toBeTruthy();
      expect(items()[3].querySelector('.andes-step__tail')).toBeNull();
      expect(items()[3].hasAttribute('data-last')).toBe(true);
      expect(items()[0].hasAttribute('data-first')).toBe(true);
    });
  });

  describe('variants and layout attributes', () => {
    it('mirrors orientation, variant and size onto host and steps', () => {
      const { fixture, host, root, items } = create();
      host.orientation.set('vertical');
      host.variant.set('navigation');
      host.size.set('small');
      flush(fixture);

      expect(root.getAttribute('data-orientation')).toBe('vertical');
      expect(root.getAttribute('data-variant')).toBe('navigation');
      expect(root.getAttribute('data-size')).toBe('small');
      expect(items()[0].getAttribute('data-orientation')).toBe('vertical');
      expect(items()[0].getAttribute('data-variant')).toBe('navigation');
      expect(items()[0].getAttribute('data-size')).toBe('small');
    });

    it('puts the title below the marker for the dot variant', () => {
      const { fixture, host, items } = create();
      host.variant.set('dot');
      flush(fixture);

      expect(items()[0].getAttribute('data-label-placement')).toBe('vertical');
      expect(items()[0].querySelector('.andes-step__number')).toBeNull();
      expect(items()[0].querySelector('.andes-step__marker')).toBeTruthy();
    });

    it('renders no marker for the navigation and inline variants', () => {
      const { fixture, host, items } = create();

      for (const variant of ['navigation', 'inline'] as const) {
        host.variant.set(variant);
        flush(fixture);
        expect(items()[0].querySelector('.andes-step__marker')).toBeNull();
        expect(items()[0].textContent).toContain('Account');
      }
    });

    it('honours labelPlacement for the default variant', () => {
      const { fixture, host, items } = create();
      host.labelPlacement.set('vertical');
      flush(fixture);

      expect(items()[0].getAttribute('data-label-placement')).toBe('vertical');
    });
  });

  describe('percent ring', () => {
    it('draws a ring on the current step when percent is set', () => {
      const { fixture, host, items } = create();
      host.percent.set(40);
      flush(fixture);

      const arc = items()[1].querySelector('.andes-step__ring-arc');
      expect(arc?.getAttribute('stroke-dasharray')).toBe('40 100');
      expect(items()[1].textContent).toContain('40%');
      expect(items()[0].querySelector('.andes-step__ring')).toBeNull();
      expect(items()[2].querySelector('.andes-step__ring')).toBeNull();
    });

    it('clamps out-of-range values and omits the ring without percent', () => {
      const { fixture, host, items } = create();

      expect(items()[1].querySelector('.andes-step__ring')).toBeNull();

      host.percent.set(250);
      flush(fixture);
      expect(
        items()[1]
          .querySelector('.andes-step__ring-arc')
          ?.getAttribute('stroke-dasharray'),
      ).toBe('100 100');

      host.percent.set(-5);
      flush(fixture);
      expect(
        items()[1]
          .querySelector('.andes-step__ring-arc')
          ?.getAttribute('stroke-dasharray'),
      ).toBe('0 100');
    });

    it('does not draw a ring on an errored current step', () => {
      const { fixture, host, items } = create();
      host.percent.set(40);
      host.status.set('error');
      flush(fixture);

      expect(items()[1].querySelector('.andes-step__ring')).toBeNull();
    });
  });

  describe('clickable', () => {
    it('renders plain containers when not clickable', () => {
      const { fixture, buttons } = create();

      expect(buttons()).toHaveLength(0);
      expect(
        fixture.nativeElement.querySelector('div.andes-step__trigger'),
      ).toBeTruthy();
    });

    it('renders a button per step when clickable', () => {
      const { fixture, host, buttons } = create();
      host.clickable.set(true);
      flush(fixture);

      expect(buttons()).toHaveLength(4);
      expect(buttons()[0].type).toBe('button');
    });

    it('selects the clicked step, updates current and emits changed', () => {
      const { fixture, host, items, buttons } = create();
      host.clickable.set(true);
      flush(fixture);

      buttons()[2].click();
      flush(fixture);

      expect(host.current()).toBe(2);
      expect(host.changes).toEqual([2]);
      expect(items()[2].getAttribute('aria-current')).toBe('step');
    });

    it('does not emit when the current step is clicked again', () => {
      const { fixture, host, buttons } = create();
      host.clickable.set(true);
      flush(fixture);

      buttons()[1].click();

      expect(host.changes).toEqual([]);
    });

    it('disables steps that opt out', () => {
      const { fixture, host, items, buttons } = create();
      host.clickable.set(true);
      host.billingDisabled.set(true);
      flush(fixture);

      expect(buttons()[1].disabled).toBe(true);
      expect(items()[1].hasAttribute('data-disabled')).toBe(true);

      buttons()[1].click();
      expect(host.changes).toEqual([]);
    });

    it('moves focus with arrow keys, Home and End, skipping disabled steps', () => {
      const { fixture, host, buttons } = create();
      host.clickable.set(true);
      host.billingDisabled.set(true);
      flush(fixture);

      buttons()[0].focus();
      const press = (key: string) =>
        buttons()
          .find((b) => b === document.activeElement)
          ?.dispatchEvent(
            new KeyboardEvent('keydown', {
              key,
              bubbles: true,
              cancelable: true,
            }),
          );

      press('ArrowRight');
      expect(document.activeElement).toBe(buttons()[2]);
      press('ArrowDown');
      expect(document.activeElement).toBe(buttons()[3]);
      press('ArrowDown');
      expect(document.activeElement).toBe(buttons()[3]);
      press('ArrowLeft');
      expect(document.activeElement).toBe(buttons()[2]);
      press('Home');
      expect(document.activeElement).toBe(buttons()[0]);
      press('End');
      expect(document.activeElement).toBe(buttons()[3]);
      press('ArrowUp');
      expect(document.activeElement).toBe(buttons()[2]);
    });

    it('swaps horizontal arrows under right-to-left', () => {
      const { fixture, host, buttons } = create();
      const original = window.getComputedStyle.bind(window);
      vi.spyOn(window, 'getComputedStyle').mockImplementation(
        (element: Element, pseudo?: string | null) => {
          const style = original(element, pseudo);
          return new Proxy(style, {
            get: (target, key) =>
              key === 'direction'
                ? 'rtl'
                : Reflect.get(target, key) instanceof Function
                  ? (Reflect.get(target, key) as () => unknown).bind(target)
                  : Reflect.get(target, key),
          });
        },
      );
      host.clickable.set(true);
      flush(fixture);

      buttons()[1].focus();
      buttons()[1].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );

      expect(document.activeElement).toBe(buttons()[2]);
    });

    it('ignores arrows combined with modifier keys', () => {
      const { fixture, host, buttons } = create();
      host.clickable.set(true);
      flush(fixture);

      buttons()[0].focus();
      buttons()[0].dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          ctrlKey: true,
          bubbles: true,
        }),
      );

      expect(document.activeElement).toBe(buttons()[0]);
    });
  });

  describe('announcements', () => {
    const live = (fixture: ComponentFixture<HostComponent>) =>
      fixture.nativeElement.querySelector('.andes-steps__live') as HTMLElement;

    it('is a polite status region, empty on first render', () => {
      const { fixture } = create();

      expect(live(fixture).getAttribute('role')).toBe('status');
      expect(live(fixture).getAttribute('aria-live')).toBe('polite');
      expect(live(fixture).textContent).toBe('');
    });

    it('announces the new step after current changes', () => {
      const { fixture, host } = create();
      host.current.set(2);
      flush(fixture);

      expect(live(fixture).textContent).toBe('Step 3 of 4: Review');
    });

    it('stays quiet when announcements are turned off', () => {
      const { fixture, host } = create();
      host.announce.set(false);
      flush(fixture);
      host.current.set(2);
      flush(fixture);

      expect(live(fixture).textContent).toBe('');
    });
  });

  describe('responsive collapse', () => {
    function stubWidth(root: HTMLElement, width: number) {
      root.getBoundingClientRect = () =>
        ({
          width,
          height: 40,
          top: 0,
          left: 0,
          right: width,
          bottom: 40,
        }) as DOMRect;
    }

    it('switches a horizontal trail to vertical in a narrow container', () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      const fixture = TestBed.createComponent(HostComponent);
      const root = fixture.nativeElement.querySelector(
        'andes-steps',
      ) as HTMLElement;
      stubWidth(root, 320);
      fixture.detectChanges();
      flush(fixture);

      expect(root.getAttribute('data-orientation')).toBe('vertical');
      expect(root.hasAttribute('data-collapsed')).toBe(true);

      stubWidth(root, 900);
      FakeResizeObserver.instances[0].trigger();
      flush(fixture);

      expect(root.getAttribute('data-orientation')).toBe('horizontal');
      expect(root.hasAttribute('data-collapsed')).toBe(false);
    });

    it('keeps the compact inline variant horizontal', () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      const fixture = TestBed.createComponent(HostComponent);
      const root = fixture.nativeElement.querySelector(
        'andes-steps',
      ) as HTMLElement;
      stubWidth(root, 200);
      fixture.componentInstance.variant.set('inline');
      fixture.detectChanges();
      flush(fixture);

      expect(root.getAttribute('data-orientation')).toBe('horizontal');
    });

    it('does not collapse when responsive is off', () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      const fixture = TestBed.createComponent(HostComponent);
      const root = fixture.nativeElement.querySelector(
        'andes-steps',
      ) as HTMLElement;
      stubWidth(root, 200);
      fixture.componentInstance.responsive.set(false);
      fixture.detectChanges();
      flush(fixture);

      expect(root.getAttribute('data-orientation')).toBe('horizontal');
    });

    it('disconnects the observer on destroy', () => {
      vi.stubGlobal('ResizeObserver', FakeResizeObserver);
      const fixture = TestBed.createComponent(HostComponent);
      fixture.detectChanges();
      fixture.destroy();

      expect(FakeResizeObserver.instances[0].disconnected).toBe(true);
    });

    it('works without ResizeObserver', () => {
      const { root } = create();

      expect(root.getAttribute('data-orientation')).toBe('horizontal');
    });
  });

  describe('stylesheet contract', () => {
    const step = readFileSync('packages/ui/src/lib/steps/step.css', 'utf8');
    const steps = readFileSync('packages/ui/src/lib/steps/steps.css', 'utf8');

    it('uses logical properties, never physical left/right offsets', () => {
      expect(step).not.toMatch(/\b(?:margin|padding)-(?:left|right)\b/);
      expect(step).not.toMatch(/^\s*(?:left|right)\s*:/m);
    });

    it('honours reduced motion', () => {
      expect(step).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('draws a visible focus ring on the trigger', () => {
      expect(step).toContain('.andes-step__trigger:focus-visible');
      expect(step).toContain('--andes-color-focus-ring');
    });

    it('keeps the live region out of the layout', () => {
      expect(steps).toContain('.andes-steps__live');
      expect(steps).toContain('clip-path: inset(50%)');
    });

    it('flips the navigation chevron under right-to-left', () => {
      expect(step).toContain(':dir(rtl)');
    });
  });
});
