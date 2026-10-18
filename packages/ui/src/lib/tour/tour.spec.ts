import { readFileSync } from 'node:fs';

import { Directionality } from '@angular/cdk/bidi';
import { Component, signal, type TemplateRef, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AndesTour } from './tour';
import type {
  AndesTourCloseEvent,
  AndesTourGap,
  AndesTourIndicators,
  AndesTourLabels,
  AndesTourMask,
  AndesTourPlacement,
  AndesTourStep,
  AndesTourType,
} from './tour-types';

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    left,
    top,
    width,
    height,
    x: left,
    y: top,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}

@Component({
  imports: [AndesTour],
  template: `
    <ng-template #titleTpl let-index="index" let-total="total">
      <em id="title-tpl">Step {{ index + 1 }}/{{ total }}</em>
    </ng-template>
    <ng-template #bodyTpl let-next="next"
      ><button type="button" id="body-tpl" (click)="next()">
        Custom body
      </button></ng-template
    >
    <ng-template #indicatorTpl let-current let-total="total"
      ><b id="indicator-tpl">{{ current }} of {{ total }}</b></ng-template
    >
    <button type="button" id="outside">Outside</button>
    <div id="search"></div>
    <div id="create"></div>
    <div id="stats"></div>
    <andes-tour
      [steps]="steps()"
      [(open)]="open"
      [(current)]="current"
      [mask]="mask()"
      [type]="type()"
      [gap]="gap()"
      [placement]="placement()"
      [arrow]="arrow()"
      [targetClickable]="targetClickable()"
      [closeOnMaskClick]="closeOnMaskClick()"
      [closeOnEscape]="closeOnEscape()"
      [keyboard]="keyboard()"
      [showSkip]="showSkip()"
      [showClose]="showClose()"
      [indicators]="indicators()"
      [indicatorsTemplate]="useIndicatorTemplate() ? indicatorTemplate() : null"
      [scrollIntoView]="scrollIntoView()"
      [labels]="labels()"
      (stepChange)="changes.push($event)"
      (closed)="closes.push($event)"
      (finish)="finishes = finishes + 1"
    />
  `,
})
class Host {
  readonly tour = viewChild.required(AndesTour);
  readonly titleTemplate = viewChild.required<TemplateRef<never>>('titleTpl');
  readonly bodyTemplate = viewChild.required<TemplateRef<never>>('bodyTpl');
  readonly indicatorTemplate =
    viewChild.required<TemplateRef<never>>('indicatorTpl');
  readonly steps = signal<AndesTourStep[]>([
    { target: '#search', title: 'Search', description: 'Find things.' },
    { target: '#create', title: 'Create', description: 'Make things.' },
    { target: '#stats', title: 'Stats', description: 'See things.' },
  ]);
  readonly open = signal(false);
  readonly current = signal(0);
  readonly mask = signal<AndesTourMask>(true);
  readonly type = signal<AndesTourType>('default');
  readonly gap = signal<AndesTourGap>({ offset: 6, radius: 6 });
  readonly placement = signal<AndesTourPlacement>('bottom');
  readonly arrow = signal(true);
  readonly targetClickable = signal(false);
  readonly closeOnMaskClick = signal(false);
  readonly closeOnEscape = signal(true);
  readonly keyboard = signal(true);
  readonly showSkip = signal(true);
  readonly showClose = signal(true);
  readonly indicators = signal<AndesTourIndicators>('dots');
  readonly useIndicatorTemplate = signal(false);
  readonly scrollIntoView = signal<boolean | ScrollIntoViewOptions>(true);
  readonly labels = signal<AndesTourLabels | null>(null);
  readonly changes: number[] = [];
  readonly closes: AndesTourCloseEvent[] = [];
  finishes = 0;
}

function setup(configure?: (host: Host) => void) {
  const fixture = TestBed.createComponent(Host);
  const element = fixture.nativeElement as HTMLElement;
  const place = (id: string, box: DOMRect) => {
    (element.querySelector(`#${id}`) as HTMLElement).getBoundingClientRect =
      () => box;
  };
  place('search', rect(100, 100, 200, 32));
  place('create', rect(600, 100, 100, 32));
  place('stats', rect(100, 300, 400, 120));
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  return fixture;
}

function begin(fixture: ComponentFixture<Host>, index = 0) {
  fixture.componentInstance.current.set(index);
  fixture.componentInstance.open.set(true);
  fixture.detectChanges();
  fixture.detectChanges();
}

const q = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector);
const all = (selector: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(selector));
const popup = () => q('.andes-tour__popup') as HTMLElement;
const slot = (name: string) => q<HTMLButtonElement>(`[data-slot="${name}"]`);
const title = () => q('.andes-tour__title')?.textContent?.trim();
const spotlight = () => q('.andes-tour__spotlight') as HTMLElement;
const px = (value: string) => Number.parseFloat(value);
const box = (element: HTMLElement) => [
  px(element.style.left),
  px(element.style.top),
  px(element.style.width),
  px(element.style.height),
];

function press(key: string, init: KeyboardEventInit = {}) {
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      keyCode: key === 'Escape' ? 27 : 0,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

describe('AndesTour', () => {
  describe('opening and the card', () => {
    it('shows nothing until opened', () => {
      setup();
      expect(q('.andes-tour')).toBeNull();
    });

    it('is a dialog named by its title and described by its text', () => {
      const f = setup();
      begin(f);
      expect(popup().getAttribute('role')).toBe('dialog');
      const labelled = popup().getAttribute('aria-labelledby') as string;
      expect(document.getElementById(labelled)?.textContent?.trim()).toBe(
        'Search',
      );
      const described = popup().getAttribute('aria-describedby') as string;
      expect(document.getElementById(described)?.textContent?.trim()).toBe(
        'Find things.',
      );
      expect(popup().hasAttribute('aria-label')).toBe(false);
    });

    it('falls back to a plain name when a step has no title', () => {
      const f = setup((h) => h.steps.set([{ description: 'Only text' }]));
      begin(f);
      expect(popup().getAttribute('aria-label')).toBe('Guided tour');
      expect(popup().hasAttribute('aria-labelledby')).toBe(false);
    });

    it('is modal unless the target is clickable', () => {
      const f = setup();
      begin(f);
      expect(popup().getAttribute('aria-modal')).toBe('true');
      f.componentInstance.targetClickable.set(true);
      f.detectChanges();
      f.componentInstance.open.set(false);
      f.detectChanges();
      begin(f);
      expect(popup().hasAttribute('aria-modal')).toBe(false);
    });

    it('does not open with no steps', () => {
      const f = setup((h) => h.steps.set([]));
      begin(f);
      expect(q('.andes-tour')).toBeNull();
      expect(f.componentInstance.open()).toBe(false);
    });

    it('starts at a given step with start()', () => {
      const f = setup();
      f.componentInstance.tour().start(2);
      f.detectChanges();
      f.detectChanges();
      expect(title()).toBe('Stats');
    });

    it('announces the step to screen readers politely', () => {
      const f = setup();
      begin(f);
      const live = q('.andes-tour__sr');
      expect(live?.getAttribute('role')).toBe('status');
      expect(live?.getAttribute('aria-live')).toBe('polite');
      expect(live?.textContent?.trim()).toBe('Step 1 of 3: Search');
    });

    it('colours the card per step type', () => {
      const f = setup((h) => {
        h.type.set('primary');
        h.steps.update((steps) => [{ ...steps[0], type: 'default' }, steps[1]]);
      });
      begin(f);
      expect(popup().dataset['type']).toBe('default');
      slot('tour-next')?.click();
      f.detectChanges();
      expect(popup().dataset['type']).toBe('primary');
    });
  });

  describe('buttons', () => {
    it('steps forward and back, hiding Previous on the first step', () => {
      const f = setup();
      begin(f);
      expect(slot('tour-previous')).toBeNull();
      slot('tour-next')?.click();
      f.detectChanges();
      expect(title()).toBe('Create');
      expect(f.componentInstance.current()).toBe(1);
      expect(f.componentInstance.changes).toEqual([1]);
      slot('tour-previous')?.click();
      f.detectChanges();
      expect(title()).toBe('Search');
      expect(f.componentInstance.changes).toEqual([1, 0]);
    });

    it('turns Next into Finish on the last step, which finishes then closes', () => {
      const f = setup();
      begin(f, 2);
      expect(slot('tour-next')?.textContent?.trim()).toBe('Finish');
      expect(slot('tour-skip')).toBeNull();
      slot('tour-next')?.click();
      f.detectChanges();
      expect(f.componentInstance.finishes).toBe(1);
      expect(f.componentInstance.closes).toEqual([
        { reason: 'finish', current: 2 },
      ]);
      expect(q('.andes-tour')).toBeNull();
      expect(f.componentInstance.open()).toBe(false);
    });

    it('skips from any step but the last', () => {
      const f = setup();
      begin(f, 1);
      slot('tour-skip')?.click();
      f.detectChanges();
      expect(f.componentInstance.closes).toEqual([
        { reason: 'skip', current: 1 },
      ]);
      expect(f.componentInstance.finishes).toBe(0);
    });

    it('closes with the corner button', () => {
      const f = setup();
      begin(f);
      expect(slot('tour-close')?.getAttribute('aria-label')).toBe('Close tour');
      slot('tour-close')?.click();
      f.detectChanges();
      expect(f.componentInstance.closes).toEqual([
        { reason: 'close-button', current: 0 },
      ]);
    });

    it('can leave out Skip and the close button', () => {
      const f = setup((h) => {
        h.showSkip.set(false);
        h.showClose.set(false);
      });
      begin(f);
      expect(slot('tour-skip')).toBeNull();
      expect(slot('tour-close')).toBeNull();
    });

    it('localises every label', () => {
      const f = setup((h) =>
        h.labels.set({
          previous: 'Anterior',
          next: 'Siguiente',
          finish: 'Terminar',
          skip: 'Omitir',
          close: 'Cerrar',
          dialog: 'Recorrido',
          step: (c, t) => `Paso ${c} de ${t}`,
        }),
      );
      begin(f, 1);
      expect(slot('tour-previous')?.textContent?.trim()).toBe('Anterior');
      expect(slot('tour-next')?.textContent?.trim()).toBe('Siguiente');
      expect(slot('tour-skip')?.textContent?.trim()).toBe('Omitir');
      expect(slot('tour-close')?.getAttribute('aria-label')).toBe('Cerrar');
      expect(q('.andes-tour__sr')?.textContent?.trim()).toBe(
        'Paso 2 de 3: Create',
      );
      slot('tour-next')?.click();
      f.detectChanges();
      expect(slot('tour-next')?.textContent?.trim()).toBe('Terminar');
    });

    it('applies per-step button props', () => {
      const f = setup((h) =>
        h.steps.update((steps) => [
          { ...steps[0], nextButton: { label: 'Go on', disabled: true } },
          {
            ...steps[1],
            prevButton: { label: 'Back', hidden: true },
            nextButton: { hidden: true },
          },
          steps[2],
        ]),
      );
      begin(f);
      expect(slot('tour-next')?.textContent?.trim()).toBe('Go on');
      expect(slot('tour-next')?.disabled).toBe(true);
      f.componentInstance.current.set(1);
      f.detectChanges();
      expect(slot('tour-previous')).toBeNull();
      expect(slot('tour-next')).toBeNull();
    });

    it('lets a handler keep the user on the step by returning false', () => {
      let calls = 0;
      const f = setup((h) =>
        h.steps.update((steps) => [
          {
            ...steps[0],
            nextButton: {
              onClick: (context) => {
                calls++;
                expect(context.index).toBe(0);
                expect(context.total).toBe(3);
                return calls > 1;
              },
            },
          },
          ...steps.slice(1),
        ]),
      );
      begin(f);
      slot('tour-next')?.click();
      f.detectChanges();
      expect(title()).toBe('Search');
      slot('tour-next')?.click();
      f.detectChanges();
      expect(title()).toBe('Create');
    });
  });

  describe('focus', () => {
    // jsdom lays nothing out, which makes every element unfocusable to the focus trap; a
    // nominal size lets it run. It says nothing about the component itself.
    const sizes = (['offsetWidth', 'offsetHeight'] as const).map(
      (prop) =>
        [
          prop,
          Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop),
        ] as const,
    );
    beforeAll(() => {
      for (const [prop] of sizes) {
        Object.defineProperty(HTMLElement.prototype, prop, {
          configurable: true,
          get: () => 1,
        });
      }
    });
    afterAll(() => {
      for (const [prop, descriptor] of sizes) {
        if (descriptor) {
          Object.defineProperty(HTMLElement.prototype, prop, descriptor);
        } else {
          delete (HTMLElement.prototype as unknown as Record<string, unknown>)[
            prop
          ];
        }
      }
    });

    it('moves focus into the card on open and back to the opener on close', () => {
      const f = setup();
      const opener = (f.nativeElement as HTMLElement).querySelector(
        '#outside',
      ) as HTMLButtonElement;
      opener.focus();
      begin(f);
      expect(popup().contains(document.activeElement)).toBe(true);
      expect(document.activeElement?.classList).toContain('andes-tour__body');

      press('Escape');
      f.detectChanges();
      expect(document.activeElement).toBe(opener);
    });

    it('keeps focus in the card when the focused button disappears', () => {
      const f = setup();
      begin(f, 1);
      (slot('tour-previous') as HTMLButtonElement).focus();
      expect(document.activeElement).toBe(slot('tour-previous'));
      slot('tour-previous')?.click();
      f.detectChanges();
      f.detectChanges();
      // Previous is hidden on the first step; focus must not fall to the page.
      expect(slot('tour-previous')).toBeNull();
      expect(popup().contains(document.activeElement)).toBe(true);
    });
  });

  describe('keyboard', () => {
    it('closes with Escape, and not when that is switched off', () => {
      const f = setup();
      begin(f);
      press('Escape');
      f.detectChanges();
      expect(f.componentInstance.closes).toEqual([
        { reason: 'escape-key', current: 0 },
      ]);

      f.componentInstance.closeOnEscape.set(false);
      f.detectChanges();
      begin(f);
      press('Escape');
      f.detectChanges();
      expect(q('.andes-tour')).not.toBeNull();
    });

    it('steps with the arrow keys', () => {
      const f = setup();
      begin(f);
      press('ArrowRight');
      f.detectChanges();
      expect(title()).toBe('Create');
      press('ArrowLeft');
      f.detectChanges();
      expect(title()).toBe('Search');
    });

    it('does not run past the ends', () => {
      const f = setup();
      begin(f);
      press('ArrowLeft');
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(0);
      begin(f, 2);
      press('ArrowRight');
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(2);
      expect(q('.andes-tour')).not.toBeNull();
    });

    it('swaps the arrows in right-to-left', () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Directionality,
            useValue: {
              value: 'rtl',
              change: of(),
              ngOnDestroy: () => undefined,
            },
          },
        ],
      });
      const f = setup();
      begin(f);
      press('ArrowLeft');
      f.detectChanges();
      expect(title()).toBe('Create');
    });

    it('is off when keyboard is off, and ignores modifiers', () => {
      const f = setup();
      begin(f);
      press('ArrowRight', { ctrlKey: true });
      f.detectChanges();
      expect(title()).toBe('Search');
      f.componentInstance.keyboard.set(false);
      f.detectChanges();
      press('ArrowRight');
      f.detectChanges();
      expect(title()).toBe('Search');
    });
  });

  describe('indicators', () => {
    it('shows one dot per step with the current one marked', () => {
      const f = setup();
      begin(f, 1);
      const dots = all('.andes-tour__dot');
      expect(dots).toHaveLength(3);
      expect(
        dots.map((d) => d.classList.contains('andes-tour__dot--active')),
      ).toEqual([false, true, false]);
      expect(
        q('[data-slot="tour-indicators"]')?.getAttribute('aria-hidden'),
      ).toBe('true');
    });

    it('shows a count, nothing, or a template', () => {
      const f = setup((h) => h.indicators.set('count'));
      begin(f, 1);
      expect(q('.andes-tour__count')?.textContent?.trim()).toBe('2 / 3');
      f.componentInstance.indicators.set('none');
      f.detectChanges();
      expect(q('.andes-tour__count')).toBeNull();
      expect(all('.andes-tour__dot')).toHaveLength(0);
      f.componentInstance.useIndicatorTemplate.set(true);
      f.detectChanges();
      expect(q('#indicator-tpl')?.textContent).toBe('2 of 3');
    });
  });

  describe('content', () => {
    it('renders templates for the title and description, with the step context', () => {
      const f = setup();
      f.componentInstance.steps.set([
        {
          target: '#search',
          title: f.componentInstance.titleTemplate(),
          description: f.componentInstance.bodyTemplate(),
        },
        { title: 'Two' },
      ]);
      begin(f);
      expect(q('#title-tpl')?.textContent).toBe('Step 1/2');
      q<HTMLButtonElement>('#body-tpl')?.click();
      f.detectChanges();
      expect(title()).toBe('Two');
    });

    it('shows a cover image or a template above the text', () => {
      const f = setup((h) =>
        h.steps.set([
          { title: 'A', cover: '/cover.png', coverAlt: 'A chart' },
          { title: 'B' },
        ]),
      );
      begin(f);
      const image = q<HTMLImageElement>('img.andes-tour__cover');
      expect(image?.getAttribute('src')).toBe('/cover.png');
      expect(image?.getAttribute('alt')).toBe('A chart');
      f.componentInstance.current.set(1);
      f.detectChanges();
      expect(q('.andes-tour__cover')).toBeNull();
    });
  });

  describe('the mask', () => {
    it('cuts a spotlight around the target, grown by the gap', () => {
      const f = setup();
      begin(f);
      // Target 100,100 200x32; default offset 6.
      expect(box(spotlight())).toEqual([94, 94, 212, 44]);
      expect(
        q('.andes-tour')?.style.getPropertyValue('--andes-tour-radius'),
      ).toBe('6px');
    });

    it('takes a custom gap, and a per-step one', () => {
      const f = setup((h) => {
        h.gap.set({ offset: [10, 2], radius: 12 });
        h.steps.update((steps) => [
          steps[0],
          { ...steps[1], gap: { offset: 0, radius: 0 } },
          steps[2],
        ]);
      });
      begin(f);
      expect(box(spotlight())).toEqual([90, 98, 220, 36]);
      expect(
        q('.andes-tour')?.style.getPropertyValue('--andes-tour-radius'),
      ).toBe('12px');
      f.componentInstance.current.set(1);
      f.detectChanges();
      expect(box(spotlight())).toEqual([600, 100, 100, 32]);
      expect(
        q('.andes-tour')?.style.getPropertyValue('--andes-tour-radius'),
      ).toBe('0px');
    });

    it('dims the rest of the page with four strips around the spotlight', () => {
      const f = setup();
      begin(f);
      const strips = all('.andes-tour__strip').map(box);
      expect(strips).toEqual([
        [0, 0, 1024, 94],
        [0, 138, 1024, 630],
        [0, 94, 94, 44],
        [306, 94, 718, 44],
      ]);
    });

    it('dims everything and stays centred for a step with no target', () => {
      const f = setup((h) => h.steps.set([{ title: 'Welcome' }]));
      begin(f);
      expect(box(spotlight())).toEqual([512, 384, 0, 0]);
      expect(popup().dataset['side']).toBe('center');
      expect(q('.andes-tour__arrow')).toBeNull();
    });

    it('treats a target that is not on the page as no target', () => {
      const f = setup((h) =>
        h.steps.set([{ target: '#missing', title: 'Gone' }]),
      );
      begin(f);
      expect(popup().dataset['side']).toBe('center');
    });

    it('takes a colour, per step as well', () => {
      const f = setup((h) => {
        h.mask.set({ color: 'rgb(1 2 3 / 50%)' });
        h.steps.update((steps) => [
          steps[0],
          { ...steps[1], mask: { color: 'red' } },
          steps[2],
        ]);
      });
      begin(f);
      expect(
        q('.andes-tour')?.style.getPropertyValue('--andes-tour-mask-color'),
      ).toBe('rgb(1 2 3 / 50%)');
      f.componentInstance.current.set(1);
      f.detectChanges();
      expect(
        q('.andes-tour')?.style.getPropertyValue('--andes-tour-mask-color'),
      ).toBe('red');
    });

    it('can be switched off, leaving a ring and an usable page', () => {
      const f = setup((h) => h.mask.set(false));
      begin(f);
      expect(q('.andes-tour__mask')).toBeNull();
      expect(q('.andes-tour__strip')).toBeNull();
      expect(box(q('.andes-tour__ring') as HTMLElement)).toEqual([
        94, 94, 212, 44,
      ]);
    });

    it('can be switched off for one step only', () => {
      const f = setup((h) =>
        h.steps.update((steps) => [
          steps[0],
          { ...steps[1], mask: false },
          steps[2],
        ]),
      );
      begin(f);
      expect(q('.andes-tour__mask')).not.toBeNull();
      f.componentInstance.current.set(1);
      f.detectChanges();
      expect(q('.andes-tour__mask')).toBeNull();
    });

    it('blocks clicks on the highlighted element unless it is clickable', () => {
      const f = setup();
      begin(f);
      expect(q('.andes-tour__hole')).not.toBeNull();
      f.componentInstance.targetClickable.set(true);
      f.detectChanges();
      expect(q('.andes-tour__hole')).toBeNull();
    });

    it('lets one step override clickability', () => {
      const f = setup((h) =>
        h.steps.update((steps) => [
          { ...steps[0], targetClickable: true },
          ...steps.slice(1),
        ]),
      );
      begin(f);
      expect(q('.andes-tour__hole')).toBeNull();
      f.componentInstance.current.set(1);
      f.detectChanges();
      expect(q('.andes-tour__hole')).not.toBeNull();
    });

    it('closes on a click on the dimmed area only when asked to', () => {
      const f = setup();
      begin(f);
      q('.andes-tour__strip')?.click();
      f.detectChanges();
      expect(q('.andes-tour')).not.toBeNull();

      f.componentInstance.closeOnMaskClick.set(true);
      f.detectChanges();
      q('.andes-tour__hole')?.click();
      f.detectChanges();
      expect(q('.andes-tour')).not.toBeNull();
      q('.andes-tour__strip')?.click();
      f.detectChanges();
      expect(f.componentInstance.closes).toEqual([
        { reason: 'mask-click', current: 0 },
      ]);
    });
  });

  describe('placing the card', () => {
    it('sits below the target by default, with an arrow pointing up at it', () => {
      const f = setup();
      begin(f);
      expect(popup().dataset['side']).toBe('bottom');
      // Spotlight bottom is 138; the card keeps 12px away.
      expect(popup().style.transform).toBe('translate(40px, 150px)');
    });

    it('follows the step and tour placement', () => {
      const f = setup((h) => {
        h.placement.set('top');
        h.steps.update((steps) => [
          steps[0],
          { ...steps[1], placement: 'right' },
          steps[2],
        ]);
      });
      begin(f, 2);
      expect(popup().dataset['side']).toBe('top');
      f.componentInstance.current.set(1);
      f.detectChanges();
      expect(popup().dataset['side']).toBe('left');
    });

    it('points the arrow at the target and can leave it out', () => {
      const f = setup();
      begin(f);
      expect(q('.andes-tour__arrow')).not.toBeNull();
      expect(
        popup().style.getPropertyValue('--andes-tour-arrow-offset'),
      ).not.toBe('');
      f.componentInstance.arrow.set(false);
      f.detectChanges();
      expect(q('.andes-tour__arrow')).toBeNull();
    });
  });

  describe('following the page', () => {
    it('re-measures when the window resizes or anything scrolls', () => {
      const f = setup();
      begin(f);
      const target = (f.nativeElement as HTMLElement).querySelector(
        '#search',
      ) as HTMLElement;
      target.getBoundingClientRect = () => rect(200, 150, 200, 32);
      f.componentInstance.tour().updatePosition();
      f.detectChanges();
      expect(box(spotlight())).toEqual([194, 144, 212, 44]);
    });

    it('measures again on a scroll event', () => {
      vi.useFakeTimers();
      try {
        const f = setup();
        begin(f);
        const target = (f.nativeElement as HTMLElement).querySelector(
          '#search',
        ) as HTMLElement;
        target.getBoundingClientRect = () => rect(100, 60, 200, 32);
        document.dispatchEvent(new Event('scroll', { bubbles: true }));
        vi.advanceTimersByTime(50);
        f.detectChanges();
        expect(box(spotlight())).toEqual([94, 54, 212, 44]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('resolves a function target each time', () => {
      let element: Element | null = null;
      const f = setup((h) =>
        h.steps.set([{ target: () => element, title: 'Late' }]),
      );
      element = (f.nativeElement as HTMLElement).querySelector('#create');
      begin(f);
      expect(box(spotlight())).toEqual([594, 94, 112, 44]);
    });

    it('stops listening when closed', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      const f = setup();
      begin(f);
      expect(add.mock.calls.map((c) => c[0])).toEqual(
        expect.arrayContaining(['resize', 'scroll']),
      );
      f.componentInstance.open.set(false);
      f.detectChanges();
      expect(remove.mock.calls.map((c) => c[0])).toEqual(
        expect.arrayContaining(['resize', 'scroll']),
      );
      add.mockRestore();
      remove.mockRestore();
    });
  });

  describe('scrolling the target into view', () => {
    function stubScroll(f: ComponentFixture<Host>, id: string, box: DOMRect) {
      const element = (f.nativeElement as HTMLElement).querySelector(
        `#${id}`,
      ) as HTMLElement;
      element.getBoundingClientRect = () => box;
      const scroll = vi.fn();
      element.scrollIntoView = scroll;
      return scroll;
    }

    it('scrolls a target that is off screen, smoothly and centred', () => {
      const f = setup();
      const scroll = stubScroll(f, 'search', rect(100, 2000, 200, 32));
      begin(f);
      expect(scroll).toHaveBeenCalledWith({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      });
    });

    it('leaves a target that is already visible alone', () => {
      const f = setup();
      const scroll = stubScroll(f, 'search', rect(100, 100, 200, 32));
      begin(f);
      expect(scroll).not.toHaveBeenCalled();
    });

    it('does not scroll when told not to, or takes custom options', () => {
      const f = setup((h) => h.scrollIntoView.set(false));
      const scroll = stubScroll(f, 'search', rect(100, 2000, 200, 32));
      begin(f);
      expect(scroll).not.toHaveBeenCalled();

      const g = setup((h) => h.scrollIntoView.set({ block: 'start' }));
      const custom = stubScroll(g, 'search', rect(100, 2000, 200, 32));
      begin(g);
      expect(custom).toHaveBeenCalledWith({ block: 'start' });
    });

    it('lets a step override the tour', () => {
      const f = setup((h) =>
        h.steps.update((steps) => [
          { ...steps[0], scrollIntoView: false },
          ...steps.slice(1),
        ]),
      );
      const scroll = stubScroll(f, 'search', rect(100, 2000, 200, 32));
      begin(f);
      expect(scroll).not.toHaveBeenCalled();
    });

    it('jumps instead of gliding under reduced motion', () => {
      const original = window.matchMedia;
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: () => ({
          matches: true,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }),
      });
      try {
        const f = setup();
        const scroll = stubScroll(f, 'search', rect(100, 2000, 200, 32));
        begin(f);
        expect(scroll).toHaveBeenCalledWith({
          block: 'center',
          inline: 'nearest',
          behavior: 'auto',
        });
      } finally {
        Object.defineProperty(window, 'matchMedia', {
          configurable: true,
          value: original,
        });
      }
    });
  });

  describe('state', () => {
    it('reports changes made through the model too', () => {
      const f = setup();
      begin(f);
      f.componentInstance.current.set(2);
      f.detectChanges();
      expect(f.componentInstance.changes).toEqual([2]);
      expect(title()).toBe('Stats');
    });

    it('moves with goTo, next and previous, within range', () => {
      const f = setup();
      begin(f);
      const tour = f.componentInstance.tour();
      tour.goTo(2);
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(2);
      tour.next();
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(2);
      tour.goTo(-1);
      tour.previous();
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(1);
    });

    it('closes from outside, reporting an imperative close', () => {
      const f = setup();
      begin(f);
      f.componentInstance.open.set(false);
      f.detectChanges();
      expect(f.componentInstance.closes).toEqual([
        { reason: 'imperative', current: 0 },
      ]);
      expect(q('.andes-tour')).toBeNull();
    });

    it('completes and closes through the methods', () => {
      const f = setup();
      begin(f);
      f.componentInstance.tour().complete();
      f.detectChanges();
      expect(f.componentInstance.finishes).toBe(1);
      expect(f.componentInstance.closes[0].reason).toBe('finish');

      begin(f);
      f.componentInstance.tour().close('skip');
      f.detectChanges();
      expect(f.componentInstance.closes[1].reason).toBe('skip');
    });

    it('ignores complete and close while closed', () => {
      const f = setup();
      f.componentInstance.tour().complete();
      f.componentInstance.tour().close();
      expect(f.componentInstance.finishes).toBe(0);
      expect(f.componentInstance.closes).toEqual([]);
    });
  });

  describe('stylesheet', () => {
    const css = readFileSync('packages/ui/src/lib/tour/tour.css', 'utf8');

    it('lets the page through except on the mask and the card', () => {
      expect(css).toMatch(
        /\.andes-tour-pane\s*\{\s*pointer-events: none !important/,
      );
      expect(css).toMatch(
        /\.andes-tour__strip,\s*\.andes-tour__hole\s*\{[^}]*pointer-events: auto/,
      );
      expect(css).toMatch(
        /\.andes-tour__popup\s*\{[\s\S]*pointer-events: auto/,
      );
    });

    it('dims with the spotlight shadow so the cut-out keeps its radius', () => {
      expect(css).toMatch(
        /\.andes-tour__spotlight\s*\{[^}]*box-shadow: 0 0 0 100vmax var\(--andes-tour-mask-color/,
      );
      expect(css).toMatch(/border-radius: var\(--andes-tour-radius/);
    });

    it('fades in over 150ms and out over 120ms ease-in via the closing attribute', () => {
      expect(css).toMatch(
        /animation: andes-tour-fade-in var\(--andes-motion-duration-mid, 150ms\)/,
      );
      expect(css).toMatch(
        /\.andes-tour\[data-andes-closing\]\s*\{[^}]*animation: andes-tour-fade-out var\(--andes-motion-duration-fast, 120ms\)[^;]*forwards/,
      );
    });

    it('moves the spotlight and card between steps, but not before the first layout', () => {
      expect(css).toMatch(
        /\.andes-tour\[data-ready\] \.andes-tour__popup\s*\{\s*transition: transform/,
      );
      expect(css).toMatch(/\.andes-tour\[data-ready\] \.andes-tour__spotlight/);
    });

    it('drops every animation and transition for reduced motion', () => {
      const reduced = css.slice(
        css.indexOf('@media (prefers-reduced-motion: reduce)'),
      );
      expect(reduced).toMatch(
        /\.andes-tour\[data-andes-closing\][\s\S]*animation: none/,
      );
      expect(reduced).toMatch(
        /\.andes-tour\[data-ready\] \.andes-tour__popup[\s\S]*transition: none/,
      );
    });

    it('keeps a visible focus ring on its controls', () => {
      expect(css).toMatch(
        /\.andes-tour__button:focus-visible,\s*\.andes-tour__close:focus-visible\s*\{[^}]*outline: 2px solid var\(--andes-color-focus-ring/,
      );
    });

    it('sets the font on the card root and keeps no hard-coded colour outside a token fallback', () => {
      expect(css).toMatch(
        /font-family: var\(--andes-font-family\), sans-serif/,
      );
      const bare = css.replace(/var\([^()]*(?:\([^()]*\)[^()]*)*\)/g, 'var()');
      expect(bare).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
    });
  });
});
