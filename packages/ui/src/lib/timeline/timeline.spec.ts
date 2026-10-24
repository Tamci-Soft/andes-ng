import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesTimeline } from './timeline';
import { AndesTimelineItem } from './timeline-item';
import {
  AndesTimelineContent,
  AndesTimelineDensity,
  AndesTimelineMode,
  AndesTimelineVariant,
} from './timeline-types';

@Component({
  imports: [AndesTimeline, AndesTimelineItem],
  template: `
    <andes-timeline
      [mode]="mode()"
      [reverse]="reverse()"
      [variant]="variant()"
      [density]="density()"
      [pending]="pending()"
      [pendingDot]="pendingDot()"
      [locale]="locale()"
      [timeFormat]="timeFormat"
      aria-label="Order history"
    >
      <andes-timeline-item>Placed</andes-timeline-item>
      <andes-timeline-item color="success" dotLabel="Paid"
        >Paid</andes-timeline-item
      >
      <andes-timeline-item color="#7c3aed" [position]="position()"
        >Packed</andes-timeline-item
      >
      <andes-timeline-item color="danger" [dot]="dotTpl" label="Mon"
        >Failed</andes-timeline-item
      >
    </andes-timeline>
    <ng-template #dotTpl><b class="custom-dot">!</b></ng-template>
    <ng-template #pendingTpl><u class="pending-rich">Waiting</u></ng-template>
    <ng-template #pendingDotTpl><s class="pending-dot">*</s></ng-template>
  `,
})
class HostComponent {
  readonly mode = signal<AndesTimelineMode>('start');
  readonly reverse = signal(false);
  readonly variant = signal<AndesTimelineVariant>('outlined');
  readonly density = signal<AndesTimelineDensity>('default');
  readonly pending = signal<boolean | AndesTimelineContent | null>(false);
  readonly pendingDot = signal<TemplateRef<unknown> | undefined>(undefined);
  readonly locale = signal<string | undefined>('en-US');
  readonly position = signal<'start' | 'end' | undefined>(undefined);
  readonly timeFormat = { dateStyle: 'medium', timeZone: 'UTC' } as const;
  readonly pendingTpl = viewChild.required<TemplateRef<unknown>>('pendingTpl');
  readonly pendingDotTpl =
    viewChild.required<TemplateRef<unknown>>('pendingDotTpl');
}

@Component({
  imports: [AndesTimeline, AndesTimelineItem],
  template: `
    <andes-timeline
      locale="en-US"
      [timeFormat]="{ dateStyle: 'long', timeZone: 'UTC' }"
    >
      <andes-timeline-item [time]="date">Created</andes-timeline-item>
      <andes-timeline-item [time]="iso" label="Approved by Lucia"
        >Approved</andes-timeline-item
      >
      <andes-timeline-item [time]="'not a date'">Odd</andes-timeline-item>
      <andes-timeline-item [label]="labelTpl">Templated</andes-timeline-item>
    </andes-timeline>
    <ng-template #labelTpl><span class="label-rich">Today</span></ng-template>
  `,
})
class TimesHostComponent {
  readonly date = new Date('2026-03-04T10:30:00Z');
  readonly iso = '2026-03-05T08:00:00Z';
  readonly labelTpl = viewChild.required<TemplateRef<unknown>>('labelTpl');
}

describe('AndesTimeline', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const root = fixture.nativeElement.querySelector(
      'andes-timeline',
    ) as HTMLElement;
    const items = () =>
      Array.from(
        fixture.nativeElement.querySelectorAll('andes-timeline-item'),
      ) as HTMLElement[];
    const sides = () => items().map((el) => el.getAttribute('data-side'));
    return { fixture, host, root, items, sides };
  }

  function flush(fixture: ComponentFixture<unknown>) {
    fixture.detectChanges();
    fixture.detectChanges();
  }

  describe('semantics', () => {
    it('renders an ordered list of list items with the label on the list', () => {
      const { fixture, root, items } = create();
      const list = fixture.nativeElement.querySelector('ol') as HTMLElement;

      expect(list.getAttribute('aria-label')).toBe('Order history');
      expect(root.hasAttribute('aria-label')).toBe(false);
      expect(items()).toHaveLength(4);
      expect(
        items().every((el) => el.getAttribute('role') === 'listitem'),
      ).toBe(true);
      expect(items()[0].parentElement).toBe(list);
    });

    it('hides the axis from assistive tech', () => {
      const { items } = create();

      expect(
        items()[0]
          .querySelector('.andes-timeline-item__axis')
          ?.getAttribute('aria-hidden'),
      ).toBe('true');
    });

    it('prefixes the content with hidden text naming the dot', () => {
      const { items } = create();

      expect(
        items()[1].querySelector('.andes-timeline-item__sr')?.textContent,
      ).toBe('Paid: ');
      expect(items()[0].querySelector('.andes-timeline-item__sr')).toBeNull();
    });

    it('keeps document order when reversed', () => {
      const { fixture, host, items } = create();
      host.reverse.set(true);
      flush(fixture);

      expect(items().map((el) => el.textContent?.trim())[0]).toContain(
        'Placed',
      );
      expect(
        (
          fixture.nativeElement.querySelector('andes-timeline') as HTMLElement
        ).hasAttribute('data-reverse'),
      ).toBe(true);
    });
  });

  describe('mode and layout', () => {
    it('puts content after the axis in start mode', () => {
      const { root, sides } = create();

      expect(root.getAttribute('data-mode')).toBe('start');
      expect(sides().slice(0, 3)).toEqual(['end', 'end', 'end']);
    });

    it('puts content before the axis in end mode', () => {
      const { fixture, host, items } = create();
      host.mode.set('end');
      flush(fixture);

      // The last entry has a label, which forces the two-sided layout; others follow the mode.
      expect(items()[0].getAttribute('data-side')).toBe('start');
      expect(items()[1].getAttribute('data-side')).toBe('start');
    });

    it('uses the two-sided layout when any entry has a label', () => {
      const { root, items } = create();

      expect(root.getAttribute('data-layout')).toBe('split');
      expect(items()[0].getAttribute('data-layout')).toBe('split');
    });

    it('alternates sides in alternate mode', () => {
      const { fixture, host, sides } = create();
      host.mode.set('alternate');
      flush(fixture);

      expect(sides()).toEqual(['end', 'start', 'end', 'start']);
    });

    it('lets an entry choose its side in the two-sided layout', () => {
      const { fixture, host, sides } = create();
      host.position.set('start');
      flush(fixture);

      expect(sides()[2]).toBe('start');
    });

    it('alternates from the visual top when reversed', () => {
      const { fixture, host, sides } = create();
      host.mode.set('alternate');
      host.reverse.set(true);
      flush(fixture);

      // 4 entries: the last one is painted first and gets the first slot.
      expect(sides()).toEqual(['start', 'end', 'start', 'end']);
    });

    it('mirrors variant and density onto parts', () => {
      const { fixture, host, root, items } = create();
      host.variant.set('filled');
      host.density.set('compact');
      flush(fixture);

      expect(root.getAttribute('data-variant')).toBe('filled');
      expect(items()[0].getAttribute('data-variant')).toBe('filled');
      expect(items()[0].getAttribute('data-density')).toBe('compact');
    });
  });

  describe('colour', () => {
    it('defaults to primary', () => {
      const { items } = create();

      expect(items()[0].getAttribute('data-color')).toBe('primary');
    });

    it('maps names to a data attribute', () => {
      const { items } = create();

      expect(items()[1].getAttribute('data-color')).toBe('success');
      expect(items()[3].getAttribute('data-color')).toBe('danger');
    });

    it('passes any other CSS colour through a custom property', () => {
      const { items } = create();

      expect(items()[2].hasAttribute('data-color')).toBe(false);
      expect(items()[2].style.getPropertyValue('--_andes-timeline-color')).toBe(
        '#7c3aed',
      );
    });
  });

  describe('dot', () => {
    it('renders a plain dot by default', () => {
      const { items } = create();

      expect(
        items()[0].querySelector('.andes-timeline-item__dot'),
      ).toBeTruthy();
    });

    it('renders a custom dot template instead', () => {
      const { items } = create();

      expect(items()[3].querySelector('.custom-dot')).toBeTruthy();
      expect(items()[3].querySelector('.andes-timeline-item__dot')).toBeNull();
      expect(items()[3].hasAttribute('data-custom-dot')).toBe(true);
    });
  });

  describe('tail', () => {
    it('draws a tail on every entry except the last', () => {
      const { items } = create();

      expect(
        items().map((el) => !!el.querySelector('.andes-timeline-item__tail')),
      ).toEqual([true, true, true, false]);
    });

    it('moves the missing tail to the first entry when reversed', () => {
      const { fixture, host, items } = create();
      host.reverse.set(true);
      flush(fixture);

      expect(
        items().map((el) => !!el.querySelector('.andes-timeline-item__tail')),
      ).toEqual([false, true, true, true]);
    });
  });

  describe('pending', () => {
    const pendingItem = (fixture: ComponentFixture<HostComponent>) =>
      Array.from(
        fixture.nativeElement.querySelectorAll('andes-timeline-item'),
      ).at(-1) as HTMLElement;

    it('adds nothing by default', () => {
      const { items, fixture } = create();

      expect(items()).toHaveLength(4);
      expect(
        fixture.nativeElement.querySelector('ol').getAttribute('aria-busy'),
      ).toBeNull();
    });

    it('shows an animated ellipsis with hidden text for true', () => {
      const { fixture, host, items } = create();
      host.pending.set(true);
      flush(fixture);

      const last = pendingItem(fixture);
      expect(items()).toHaveLength(5);
      expect(last.hasAttribute('data-pending')).toBe(true);
      expect(last.querySelector('.andes-timeline__ellipsis')).toBeTruthy();
      expect(last.querySelector('.andes-timeline__sr')?.textContent).toBe(
        'Loading',
      );
      expect(
        last.querySelector('svg.andes-timeline-item__spinner'),
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('ol').getAttribute('aria-busy'),
      ).toBe('true');
    });

    it('shows text content', () => {
      const { fixture, host } = create();
      host.pending.set('Awaiting carrier');
      flush(fixture);

      expect(pendingItem(fixture).textContent).toContain('Awaiting carrier');
    });

    it('renders a template', () => {
      const { fixture, host } = create();
      host.pending.set(host.pendingTpl());
      flush(fixture);

      expect(pendingItem(fixture).querySelector('.pending-rich')).toBeTruthy();
    });

    it('accepts a custom pending dot', () => {
      const { fixture, host } = create();
      host.pending.set(true);
      host.pendingDot.set(host.pendingDotTpl());
      flush(fixture);

      expect(pendingItem(fixture).querySelector('.pending-dot')).toBeTruthy();
      expect(
        pendingItem(fixture).querySelector('svg.andes-timeline-item__spinner'),
      ).toBeNull();
    });

    it('extends the line down to the pending entry', () => {
      const { fixture, host, items } = create();
      host.pending.set(true);
      flush(fixture);

      const tails = items().map(
        (el) => !!el.querySelector('.andes-timeline-item__tail'),
      );
      expect(tails).toEqual([true, true, true, true, false]);
    });

    it('puts the pending entry first and ends the line at the oldest when reversed', () => {
      const { fixture, host, items } = create();
      host.pending.set(true);
      host.reverse.set(true);
      flush(fixture);

      const tails = items().map(
        (el) => !!el.querySelector('.andes-timeline-item__tail'),
      );
      expect(tails).toEqual([false, true, true, true, true]);
    });

    it('ignores empty-ish values', () => {
      const { fixture, host, items } = create();
      host.pending.set('');
      flush(fixture);
      expect(items()).toHaveLength(4);
      host.pending.set(null);
      flush(fixture);
      expect(items()).toHaveLength(4);
    });
  });

  describe('labels and time', () => {
    function createTimes() {
      const fixture = TestBed.createComponent(TimesHostComponent);
      fixture.detectChanges();
      const items = Array.from(
        fixture.nativeElement.querySelectorAll('andes-timeline-item'),
      ) as HTMLElement[];
      return { fixture, items };
    }

    it('renders a string label opposite the content', () => {
      const { items } = create();

      expect(
        items()[3]
          .querySelector('.andes-timeline-item__label')
          ?.textContent?.trim(),
      ).toBe('Mon');
    });

    it('wraps time in a time element with a machine-readable value', () => {
      const { items } = createTimes();
      const time = items[0].querySelector('time') as HTMLTimeElement;

      expect(time.getAttribute('datetime')).toBe('2026-03-04T10:30:00.000Z');
    });

    it('formats the time with the timeline locale and options', () => {
      const { items } = createTimes();

      expect(items[0].querySelector('time')?.textContent?.trim()).toBe(
        'March 4, 2026',
      );
      expect(items[1].querySelector('time')?.getAttribute('datetime')).toBe(
        '2026-03-05T08:00:00.000Z',
      );
    });

    it('prefers the label text over the formatted time', () => {
      const { items } = createTimes();

      expect(items[1].querySelector('time')?.textContent?.trim()).toBe(
        'Approved by Lucia',
      );
    });

    it('shows an unparseable time as given', () => {
      const { items } = createTimes();

      expect(items[2].querySelector('time')?.textContent?.trim()).toBe(
        'not a date',
      );
      expect(items[2].querySelector('time')?.getAttribute('datetime')).toBe(
        'not a date',
      );
    });

    it('renders a label template', () => {
      const { items } = createTimes();

      expect(items[3].querySelector('.label-rich')).toBeTruthy();
    });
  });

  describe('stylesheet contract', () => {
    const item = readFileSync(
      'packages/ui/src/lib/timeline/timeline-item.css',
      'utf8',
    );
    const timeline = readFileSync(
      'packages/ui/src/lib/timeline/timeline.css',
      'utf8',
    );

    it('uses logical properties only', () => {
      for (const css of [item, timeline]) {
        expect(css).not.toMatch(/\b(?:margin|padding|border)-(?:left|right)\b/);
        expect(css).not.toMatch(/^\s*(?:left|right)\s*:/m);
        expect(css).not.toMatch(/text-align:\s*(?:left|right)/);
      }
    });

    it('honours reduced motion for every loop', () => {
      expect(item).toContain('@media (prefers-reduced-motion: reduce)');
      expect(timeline).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('paints a reversed list without reordering the document', () => {
      expect(timeline).toContain('column-reverse');
    });
  });
});
