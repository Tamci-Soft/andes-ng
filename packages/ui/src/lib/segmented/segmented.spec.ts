import { Directionality } from '@angular/cdk/bidi';
import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { readFileSync } from 'node:fs';

import { AndesSegmented } from './segmented';
import { AndesSegmentedOption } from './segmented-option';
import {
  AndesSegmentedChange,
  AndesSegmentedOptionInput,
  AndesSegmentedShape,
  AndesSegmentedSize,
} from './segmented-types';

@Component({
  imports: [AndesSegmented],
  template: `<andes-segmented
    aria-label="View"
    [(value)]="value"
    [options]="options()"
    [size]="size()"
    [shape]="shape()"
    [block]="block()"
    [vertical]="vertical()"
    [disabled]="disabled()"
    [name]="name()"
    (selectionChange)="changes.push($event)"
  />`,
})
class OptionsHostComponent {
  readonly value = signal<string | number | null>('week');
  readonly options = signal<AndesSegmentedOptionInput<string | number>[]>([
    'day',
    'week',
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year', disabled: true },
    {
      value: 'all',
      label: 'All',
      tooltip: 'Everything',
      ariaLabel: 'All time',
    },
  ]);
  readonly size = signal<AndesSegmentedSize>('md');
  readonly shape = signal<AndesSegmentedShape>('default');
  readonly block = signal(false);
  readonly vertical = signal(false);
  readonly disabled = signal(false);
  readonly name = signal<string | undefined>(undefined);
  readonly changes: AndesSegmentedChange<string | number>[] = [];
}

@Component({
  imports: [AndesSegmented, AndesSegmentedOption],
  template: `<andes-segmented aria-label="Layout" [(value)]="value">
    <andes-segmented-option value="list" tooltip="List"
      ><svg slot="icon" width="12" height="12"></svg>
      List</andes-segmented-option
    >
    <andes-segmented-option value="grid" aria-label="Grid only">
      <svg slot="icon" width="12" height="12"></svg>
    </andes-segmented-option>
    <andes-segmented-option value="map" disabled>Map</andes-segmented-option>
  </andes-segmented>`,
})
class ProjectedHostComponent {
  readonly value = signal<string | null>(null);
}

@Component({
  imports: [AndesSegmented],
  template: `<ng-template #icon><svg id="tpl-icon"></svg></ng-template>
    <ng-template #label let-option let-checked="checked"
      ><b>{{ option.label }}{{ checked ? '*' : '' }}</b></ng-template
    >
    <andes-segmented
      aria-label="Custom"
      [options]="options"
      [optionLabel]="label"
      value="a"
    />`,
})
class TemplateHostComponent {
  readonly icon = viewChild.required<TemplateRef<unknown>>('icon');
  options = [
    { label: 'A', value: 'a' },
    { label: 'B', value: 'b' },
  ];
}

@Component({
  imports: [AndesSegmented, ReactiveFormsModule],
  template: `<andes-segmented
    aria-label="Plan"
    [formControl]="control"
    [options]="['a', 'b', 'c']"
  />`,
})
class ReactiveHostComponent {
  readonly control = new FormControl<string | null>('b');
}

@Component({
  imports: [AndesSegmented, FormsModule],
  template: `<andes-segmented
    aria-label="Plan"
    [(ngModel)]="plan"
    [options]="['a', 'b', 'c']"
  />`,
})
class NgModelHostComponent {
  plan: string | null = 'a';
}

function radios(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll('button[role="radio"]'));
}

function key(target: HTMLElement, name: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

describe('AndesSegmented', () => {
  async function setup() {
    const fixture = TestBed.createComponent(OptionsHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      group: root.querySelector('andes-segmented') as HTMLElement,
      buttons: () => radios(root),
    };
  }

  it('renders strings, numbers and objects as radios in a labelled radiogroup', async () => {
    const { group, buttons } = await setup();
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('View');
    expect(buttons().map((b) => b.textContent?.trim())).toEqual([
      'day',
      'week',
      'Month',
      'Year',
      'All',
    ]);
  });

  it('marks only the selected option as checked', async () => {
    const { buttons } = await setup();
    expect(buttons().map((b) => b.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
      'false',
      'false',
    ]);
  });

  it('uses a roving tab stop on the selected option', async () => {
    const { buttons } = await setup();
    expect(buttons().map((b) => b.getAttribute('tabindex'))).toEqual([
      '-1',
      '0',
      '-1',
      '-1',
      '-1',
    ]);
  });

  it('puts the first enabled option in the tab order when nothing is selected', async () => {
    const { fixture, host, buttons } = await setup();
    host.value.set(null);
    fixture.detectChanges();
    expect(buttons().map((b) => b.getAttribute('tabindex'))).toEqual([
      '0',
      '-1',
      '-1',
      '-1',
      '-1',
    ]);
  });

  it('selects on click, updates the model and emits selectionChange once', async () => {
    const { fixture, host, buttons } = await setup();
    buttons()[2].click();
    fixture.detectChanges();

    expect(host.value()).toBe('month');
    expect(buttons()[2].getAttribute('aria-checked')).toBe('true');
    expect(host.changes).toHaveLength(1);
    expect(host.changes[0].value).toBe('month');

    buttons()[2].click();
    fixture.detectChanges();
    expect(host.changes).toHaveLength(1);
  });

  it('does not select a disabled option', async () => {
    const { fixture, host, buttons } = await setup();
    expect(buttons()[3].disabled).toBe(true);
    buttons()[3].click();
    fixture.detectChanges();
    expect(host.value()).toBe('week');
  });

  it('applies tooltip and aria-label from the option object', async () => {
    const { buttons } = await setup();
    expect(buttons()[4].getAttribute('title')).toBe('Everything');
    expect(buttons()[4].getAttribute('aria-label')).toBe('All time');
  });

  describe('keyboard', () => {
    it('moves and selects with the arrow keys, skipping disabled options', async () => {
      const { fixture, host, buttons } = await setup();
      buttons()[1].focus();

      const next = key(buttons()[1], 'ArrowRight');
      fixture.detectChanges();
      expect(next.defaultPrevented).toBe(true);
      expect(host.value()).toBe('month');
      expect(document.activeElement).toBe(buttons()[2]);

      key(buttons()[2], 'ArrowRight');
      fixture.detectChanges();
      expect(host.value()).toBe('all');

      key(buttons()[4], 'ArrowDown');
      fixture.detectChanges();
      expect(host.value()).toBe('day');
      expect(document.activeElement).toBe(buttons()[0]);

      key(buttons()[0], 'ArrowUp');
      fixture.detectChanges();
      expect(host.value()).toBe('all');

      key(buttons()[4], 'ArrowLeft');
      fixture.detectChanges();
      expect(host.value()).toBe('month');
    });

    it('jumps with Home and End', async () => {
      const { fixture, host, buttons } = await setup();
      buttons()[1].focus();
      key(buttons()[1], 'End');
      fixture.detectChanges();
      expect(host.value()).toBe('all');
      key(buttons()[4], 'Home');
      fixture.detectChanges();
      expect(host.value()).toBe('day');
    });

    it('mirrors the horizontal arrows in right-to-left layouts', async () => {
      TestBed.overrideProvider(Directionality, {
        useValue: {
          value: 'rtl',
          change: { subscribe: () => ({ unsubscribe: () => undefined }) },
        },
      });
      const { fixture, host, buttons } = await setup();
      buttons()[1].focus();
      key(buttons()[1], 'ArrowLeft');
      fixture.detectChanges();
      expect(host.value()).toBe('month');
      key(buttons()[2], 'ArrowRight');
      fixture.detectChanges();
      expect(host.value()).toBe('week');
    });

    it('ignores keys with modifiers and unrelated keys', async () => {
      const { fixture, host, buttons } = await setup();
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        altKey: true,
        bubbles: true,
        cancelable: true,
      });
      buttons()[1].dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(key(buttons()[1], 'a').defaultPrevented).toBe(false);
      fixture.detectChanges();
      expect(host.value()).toBe('week');
    });
  });

  it('disables the whole group', async () => {
    const { fixture, host, group, buttons } = await setup();
    host.disabled.set(true);
    fixture.detectChanges();

    expect(group.getAttribute('aria-disabled')).toBe('true');
    expect(buttons().every((b) => b.disabled)).toBe(true);
    buttons()[0].click();
    key(buttons()[1], 'ArrowRight');
    expect(host.value()).toBe('week');
  });

  it('exposes size, shape, block and orientation as data attributes', async () => {
    const { fixture, host, group } = await setup();
    host.size.set('lg');
    host.shape.set('round');
    host.block.set(true);
    host.vertical.set(true);
    fixture.detectChanges();

    expect(group.getAttribute('data-size')).toBe('lg');
    expect(group.getAttribute('data-shape')).toBe('round');
    expect(group.hasAttribute('data-block')).toBe(true);
    expect(group.getAttribute('data-orientation')).toBe('vertical');
  });

  it('renders a hidden input for native form submission when named', async () => {
    const { fixture, host, group } = await setup();
    expect(group.querySelector('input[type="hidden"]')).toBeNull();
    host.name.set('range');
    fixture.detectChanges();
    const input = group.querySelector(
      'input[type="hidden"]',
    ) as HTMLInputElement;
    expect(input.name).toBe('range');
    expect(input.value).toBe('week');
  });

  it('renders the sliding thumb as a decorative element', async () => {
    const { group } = await setup();
    const thumb = group.querySelector(
      '[data-slot="segmented-thumb"]',
    ) as HTMLElement;
    expect(thumb).not.toBeNull();
    expect(thumb.getAttribute('aria-hidden')).toBe('true');
    expect(group.getAttribute('data-thumb')).toMatch(/pending|ready/);
  });

  it('hides the thumb when no option is selected', async () => {
    const { fixture, host, group } = await setup();
    host.value.set(null);
    fixture.detectChanges();
    const thumb = group.querySelector(
      '[data-slot="segmented-thumb"]',
    ) as HTMLElement;
    expect(thumb.style.opacity).toBe('0');
  });
});

describe('AndesSegmented with projected options', () => {
  async function setup() {
    const fixture = TestBed.createComponent(ProjectedHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      buttons: () => radios(root),
    };
  }

  it('collects projected options as radios', async () => {
    const { buttons } = await setup();
    expect(buttons()).toHaveLength(3);
    expect(buttons()[0].textContent).toContain('List');
    expect(buttons()[0].getAttribute('title')).toBe('List');
    expect(buttons()[1].getAttribute('aria-label')).toBe('Grid only');
    expect(buttons()[2].disabled).toBe(true);
  });

  it('keeps the host element presentational and the icon decorative', async () => {
    const { root } = await setup();
    const option = root.querySelector('andes-segmented-option') as HTMLElement;
    expect(option.getAttribute('role')).toBe('none');
    expect(option.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
  });

  it('selects by click and arrow key', async () => {
    const { fixture, host, buttons } = await setup();
    buttons()[1].click();
    fixture.detectChanges();
    expect(host.value()).toBe('grid');

    key(buttons()[1], 'ArrowRight');
    fixture.detectChanges();
    // the disabled "map" option is skipped, wrapping to "list"
    expect(host.value()).toBe('list');
  });
});

describe('AndesSegmented templates', () => {
  it('renders a custom option label with the checked state', async () => {
    const fixture = TestBed.createComponent(TemplateHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('b'),
    ).map((b) => b.textContent);
    expect(labels).toEqual(['A*', 'B']);
  });
});

describe('AndesSegmented forms integration', () => {
  it('writes a reactive control value and reports user changes', async () => {
    const fixture = TestBed.createComponent(ReactiveHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const buttons = radios(fixture.nativeElement);
    expect(buttons[1].getAttribute('aria-checked')).toBe('true');

    buttons[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.control.value).toBe('c');
    expect(fixture.componentInstance.control.dirty).toBe(true);

    fixture.componentInstance.control.setValue('a');
    fixture.detectChanges();
    expect(buttons[0].getAttribute('aria-checked')).toBe('true');
  });

  it('follows a disabled reactive control', async () => {
    const fixture = TestBed.createComponent(ReactiveHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(radios(fixture.nativeElement).every((b) => b.disabled)).toBe(true);
  });

  it('marks the control touched when focus leaves the group', async () => {
    const fixture = TestBed.createComponent(ReactiveHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const group = fixture.nativeElement.querySelector(
      'andes-segmented',
    ) as HTMLElement;
    expect(fixture.componentInstance.control.touched).toBe(false);
    group.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
    expect(fixture.componentInstance.control.touched).toBe(true);
  });

  it('works with ngModel', async () => {
    const fixture = TestBed.createComponent(NgModelHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const buttons = radios(fixture.nativeElement);
    expect(buttons[0].getAttribute('aria-checked')).toBe('true');
    buttons[2].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.plan).toBe('c');
  });
});

describe('segmented stylesheet contract', () => {
  const group = readFileSync(
    'packages/ui/src/lib/segmented/segmented.css',
    'utf8',
  );
  const option = readFileSync(
    'packages/ui/src/lib/segmented/segmented-option.css',
    'utf8',
  );

  it('sizes the segments so the control is 24 / 32 / 40px', () => {
    expect(group).toContain('--_pad: 2px');
    expect(group).toContain('--_h: 1.75rem');
    expect(group).toMatch(/data-size='sm'\]\)\s*\{[^}]*--_h: 1.25rem/);
    expect(group).toMatch(/data-size='lg'\]\)\s*\{[^}]*--_h: 2.25rem/);
  });

  it('slides the thumb in 180ms without bounce and not before first placement', () => {
    expect(group).toContain('180ms');
    expect(group).not.toMatch(/cubic-bezier\([^)]*(1\.\d|-\d)/);
    expect(group).toContain("[data-thumb='ready']) .andes-segmented__thumb");
  });

  it('removes the slide under reduced motion', () => {
    const reduced = group.slice(group.indexOf('prefers-reduced-motion'));
    expect(reduced).toContain('transition: none');
    expect(option.slice(option.indexOf('prefers-reduced-motion'))).toContain(
      'transition: none',
    );
  });

  it('draws the focus ring on the segment', () => {
    expect(option).toContain('.andes-segmented-option__button:focus-visible');
    expect(option).toContain('--andes-color-focus-ring');
  });

  it('is built from tokens', () => {
    expect(group).toContain('--andes-color-muted');
    expect(group).toContain('--andes-radius-md');
    expect(group).toContain('--andes-radius-full');
    expect(group).toContain('--andes-color-background');
  });
});
