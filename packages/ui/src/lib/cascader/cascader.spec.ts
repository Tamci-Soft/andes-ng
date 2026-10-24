import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AndesCascader, type AndesCascaderModel } from './cascader';
import type {
  AndesCascaderChange,
  AndesCascaderCheckedStrategy,
  AndesCascaderFieldNames,
  AndesCascaderLoadData,
  AndesCascaderNotFound,
  AndesCascaderOption,
  AndesCascaderSearch,
} from './cascader-types';

const css = (file: string) =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), file), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ');

const KEY_CODES: Record<string, number> = { Escape: 27, Tab: 9, Enter: 13 };

/** The fixture of the current test: state changed by an event needs a render to land. */
let current: ComponentFixture<unknown> | null = null;

function press(
  target: Element,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  Object.defineProperty(event, 'keyCode', { get: () => KEY_CODES[key] ?? 0 });
  target.dispatchEvent(event);
  current?.detectChanges();
  return event;
}

const PLACES: AndesCascaderOption[] = [
  {
    value: 'lima',
    label: 'Lima',
    children: [
      {
        value: 'lima-province',
        label: 'Lima',
        children: [
          { value: 'miraflores', label: 'Miraflores' },
          { value: 'surco', label: 'Santiago de Surco' },
          { value: 'barranco', label: 'Barranco', disabled: true },
        ],
      },
      {
        value: 'huaral',
        label: 'Huaral',
        children: [{ value: 'chancay', label: 'Chancay' }],
      },
    ],
  },
  {
    value: 'cusco',
    label: 'Cusco',
    children: [
      { value: 'wanchaq', label: 'Wanchaq' },
      { value: 'san-blas', label: 'San Blas' },
    ],
  },
  { value: 'callao', label: 'Callao' },
  { value: 'tumbes', label: 'Tumbes', disabled: true },
];

@Component({
  imports: [AndesCascader],
  template: `<andes-cascader
    aria-label="Place"
    [options]="options()"
    [fieldNames]="fieldNames()"
    [(value)]="value"
    [(open)]="open"
    [multiple]="multiple()"
    [changeOnSelect]="changeOnSelect()"
    [expandTrigger]="expandTrigger()"
    [showCheckedStrategy]="strategy()"
    [showSearch]="showSearch()"
    [maxTagCount]="maxTagCount()"
    [loadData]="loadData()"
    [separator]="separator()"
    [placeholder]="placeholder()"
    [notFoundContent]="notFound()"
    [loading]="loading()"
    [size]="size()"
    [variant]="variant()"
    [status]="status()"
    [disabled]="disabled()"
    [allowClear]="allowClear()"
    [placement]="placement()"
    [labels]="labels()"
    (selectionChange)="changes.push($event)"
    (cleared)="cleared = cleared + 1"
    (searchInput)="searches.push($event)"
    (loadError)="loadErrors.push($event)"
  />`,
})
class CascaderHost {
  readonly options = signal<readonly AndesCascaderOption[]>(PLACES);
  readonly fieldNames = signal<AndesCascaderFieldNames | undefined>(undefined);
  readonly value = signal<AndesCascaderModel>(undefined);
  readonly open = signal(false);
  readonly multiple = signal(false);
  readonly changeOnSelect = signal(false);
  readonly expandTrigger = signal<'click' | 'hover'>('click');
  readonly strategy = signal<AndesCascaderCheckedStrategy>('child');
  readonly showSearch = signal<boolean | AndesCascaderSearch>(false);
  readonly maxTagCount = signal<number | undefined>(undefined);
  readonly loadData = signal<AndesCascaderLoadData | undefined>(undefined);
  readonly separator = signal(' / ');
  readonly placeholder = signal('Pick a place');
  readonly notFound = signal<AndesCascaderNotFound>('No data');
  readonly loading = signal(false);
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
  readonly variant = signal<
    'outlined' | 'filled' | 'borderless' | 'underlined'
  >('outlined');
  readonly status = signal<'error' | 'warning' | undefined>(undefined);
  readonly disabled = signal(false);
  readonly allowClear = signal(false);
  readonly placement = signal<
    'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'
  >('bottomLeft');
  readonly labels = signal<Record<string, string>>({});
  readonly changes: AndesCascaderChange[] = [];
  readonly searches: string[] = [];
  readonly loadErrors: { option: AndesCascaderOption; error: unknown }[] = [];
  cleared = 0;
}

@Component({
  imports: [AndesCascader, ReactiveFormsModule],
  template: `<andes-cascader
    aria-label="Place"
    [options]="options"
    [formControl]="control"
  />`,
})
class FormHost {
  readonly options = PLACES;
  readonly control = new FormControl<AndesCascaderModel>(['cusco', 'wanchaq']);
}

describe('AndesCascader', () => {
  afterEach(() => {
    current = null;
  });

  function setup(configure?: (host: CascaderHost) => void) {
    const fixture = TestBed.createComponent(CascaderHost);
    current = fixture;
    configure?.(fixture.componentInstance);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const combobox = () =>
      root.querySelector<HTMLElement>('[role="combobox"]') as HTMLElement;
    const box = () =>
      root.querySelector<HTMLElement>(
        '[data-slot="cascader-trigger"]',
      ) as HTMLElement;
    const panel = () =>
      document.querySelector<HTMLElement>('[data-slot="cascader-panel"]');
    const detect = () => fixture.detectChanges();
    const columns = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>('.andes-cascader__column'),
      );
    const labelsOf = (column: number) =>
      Array.from(
        columns()[column]?.querySelectorAll<HTMLElement>('[role="treeitem"]') ??
          [],
      ).map((item) => item.textContent?.trim());
    const item = (text: string, column?: number) =>
      Array.from(
        (column === undefined
          ? document
          : (columns()[column] as ParentNode)
        ).querySelectorAll<HTMLElement>('[role="treeitem"]'),
      ).find((el) => el.textContent?.trim() === text) as HTMLElement;
    const open = () => {
      combobox().focus();
      combobox().click();
      fixture.detectChanges();
    };
    const active = () => {
      const id = combobox().getAttribute('aria-activedescendant');
      return id
        ? document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim()
        : null;
    };
    const tags = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>('[data-slot="cascader-tag"]'),
      ).map((tag) => tag.textContent?.trim());
    return {
      fixture,
      host,
      root,
      combobox,
      box,
      panel,
      detect,
      columns,
      labelsOf,
      item,
      open,
      active,
      tags,
    };
  }

  describe('field', () => {
    it('is a real button acting as a combobox with a tree popup', () => {
      const { combobox, root } = setup();

      expect(combobox().tagName).toBe('BUTTON');
      expect(combobox().getAttribute('type')).toBe('button');
      expect(combobox().getAttribute('role')).toBe('combobox');
      expect(combobox().getAttribute('aria-haspopup')).toBe('tree');
      expect(combobox().getAttribute('aria-expanded')).toBe('false');
      expect(combobox().getAttribute('aria-label')).toBe('Place');
      expect(combobox().hasAttribute('aria-controls')).toBe(false);
      expect(
        root.querySelector('andes-cascader')?.hasAttribute('aria-label'),
      ).toBe(false);
    });

    it('shows the placeholder until something is selected', () => {
      const { combobox, host, detect, box } = setup();

      expect(combobox().textContent?.trim()).toBe('Pick a place');
      expect(box().hasAttribute('data-placeholder')).toBe(true);

      host.value.set(['cusco', 'wanchaq']);
      detect();

      expect(combobox().textContent?.trim()).toBe('Cusco / Wanchaq');
      expect(box().hasAttribute('data-placeholder')).toBe(false);
    });

    it('joins the labels with a custom separator', () => {
      const { combobox, host, detect } = setup((h) =>
        h.value.set(['lima', 'lima-province', 'miraflores']),
      );
      expect(combobox().textContent?.trim()).toBe('Lima / Lima / Miraflores');

      host.separator.set(' › ');
      detect();
      expect(combobox().textContent?.trim()).toBe('Lima › Lima › Miraflores');
    });

    it('falls back to the raw values for a path the options do not know (yet)', () => {
      const { combobox } = setup((h) => h.value.set(['unknown', 'path']));

      expect(combobox().textContent?.trim()).toBe('unknown / path');
    });

    it('renders a custom display template with the labels and options', () => {
      @Component({
        imports: [AndesCascader],
        template: `
          <ng-template #tpl let-labels let-options="selectedOptions">
            <b class="custom">{{ labels.length }}|{{ options[0].value }}</b>
          </ng-template>
          <andes-cascader
            aria-label="X"
            [options]="options"
            [value]="['cusco', 'wanchaq']"
            [displayRender]="tpl"
          />
        `,
      })
      class DisplayHost {
        readonly options = PLACES;
      }
      const fixture = TestBed.createComponent(DisplayHost);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.custom').textContent).toBe(
        '2|cusco',
      );
    });

    it.each(['sm', 'md', 'lg'] as const)('reflects the %s size', (size) => {
      const { box, host, detect } = setup();
      host.size.set(size);
      detect();

      expect(box().getAttribute('data-size')).toBe(size);
    });

    it.each(['outlined', 'filled', 'borderless', 'underlined'] as const)(
      'reflects the %s variant',
      (variant) => {
        const { box, host, detect } = setup();
        host.variant.set(variant);
        detect();

        expect(box().getAttribute('data-variant')).toBe(variant);
      },
    );

    it('marks error and warning, and announces error as invalid', () => {
      const { box, combobox, host, detect } = setup();

      host.status.set('error');
      detect();
      expect(box().getAttribute('data-status')).toBe('error');
      expect(combobox().getAttribute('aria-invalid')).toBe('true');

      host.status.set('warning');
      detect();
      expect(box().getAttribute('data-status')).toBe('warning');
      expect(combobox().hasAttribute('aria-invalid')).toBe(false);
    });

    it('forwards id so a label can target the combobox', () => {
      const fixture = TestBed.createComponent(AndesCascader);
      fixture.componentRef.setInput('id', 'place');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('button').id).toBe('place');
      expect(fixture.nativeElement.hasAttribute('id')).toBe(false);
    });

    it('does not open while disabled and closes if it becomes disabled', () => {
      const { combobox, host, detect, panel, open } = setup((h) =>
        h.disabled.set(true),
      );
      expect((combobox() as HTMLButtonElement).disabled).toBe(true);
      open();
      expect(panel()).toBeNull();

      host.disabled.set(false);
      detect();
      open();
      expect(panel()).not.toBeNull();

      host.disabled.set(true);
      detect();
      expect(host.open()).toBe(false);
    });

    it('shows a spinner instead of the chevron while loading', () => {
      const { root, host, detect } = setup();
      expect(root.querySelector('.andes-cascader__chevron')).not.toBeNull();

      host.loading.set(true);
      detect();

      expect(
        root.querySelector('[data-slot="cascader-loading"]'),
      ).not.toBeNull();
      expect(root.querySelector('.andes-cascader__chevron')).toBeNull();
    });

    it('can be focused and blurred through the public methods', () => {
      const { combobox, fixture } = setup();
      const picker = fixture.debugElement.children[0]
        .componentInstance as AndesCascader;

      picker.focus();
      expect(document.activeElement).toBe(combobox());
      picker.blur();
      expect(document.activeElement).not.toBe(combobox());
    });
  });

  describe('panel', () => {
    it('opens on click with tree semantics and one column per level', () => {
      const { combobox, panel, open, columns, labelsOf } = setup();
      open();

      expect(combobox().getAttribute('aria-expanded')).toBe('true');
      expect(combobox().getAttribute('aria-controls')).toBe(panel()?.id);
      expect(document.querySelector('[role="tree"]')).not.toBeNull();
      expect(columns().length).toBe(1);
      expect(columns()[0].getAttribute('role')).toBe('group');
      expect(columns()[0].getAttribute('aria-label')).toBe('Level 1');
      expect(labelsOf(0)).toEqual(['Lima', 'Cusco', 'Callao', 'Tumbes']);
    });

    it('describes each option for assistive technology', () => {
      const { open, item } = setup();
      open();

      const lima = item('Lima');
      expect(lima.getAttribute('aria-level')).toBe('1');
      expect(lima.getAttribute('aria-setsize')).toBe('4');
      expect(lima.getAttribute('aria-posinset')).toBe('1');
      expect(lima.getAttribute('aria-expanded')).toBe('false');
      expect(lima.getAttribute('aria-selected')).toBe('false');
      expect(item('Callao').hasAttribute('aria-expanded')).toBe(false);
      expect(item('Tumbes').getAttribute('aria-disabled')).toBe('true');
    });

    it('closes on Escape, returning focus to the field', () => {
      const { combobox, panel, open, host } = setup();
      open();
      expect(host.open()).toBe(true);

      press(combobox(), 'Escape');

      expect(panel()).toBeNull();
      expect(host.open()).toBe(false);
      expect(document.activeElement).toBe(combobox());
    });

    it('closes on Tab and on a click outside, and toggles on a second click', () => {
      const { combobox, panel, open, detect } = setup();
      open();
      press(combobox(), 'Tab');
      expect(panel()).toBeNull();

      open();
      combobox().click();
      detect();
      expect(panel()).toBeNull();

      open();
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      detect();
      expect(panel()).toBeNull();
    });

    it('honours [(open)] and the public methods', () => {
      const { panel, host, detect, fixture } = setup();
      const picker = fixture.debugElement.children[0]
        .componentInstance as AndesCascader;

      host.open.set(true);
      detect();
      expect(panel()).not.toBeNull();
      host.open.set(false);
      detect();
      expect(panel()).toBeNull();

      picker.open();
      detect();
      expect(host.open()).toBe(true);
      picker.toggle();
      detect();
      expect(host.open()).toBe(false);
      picker.toggle();
      picker.close();
      detect();
      expect(panel()).toBeNull();
    });

    it('keeps a press inside the panel from stealing focus from the field', () => {
      const { panel, open } = setup();
      open();

      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      panel()?.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('shows the empty state without options, or nothing when told not to', () => {
      const { panel, open, host, detect } = setup((h) => h.options.set([]));
      open();
      expect(panel()?.textContent).toContain('No data');
      expect(document.querySelector('[role="tree"]')).toBeNull();

      host.notFound.set(null);
      detect();
      expect(panel()?.querySelector('[data-slot="cascader-empty"]')).toBeNull();
    });

    it('renders a template as the empty state', () => {
      @Component({
        imports: [AndesCascader],
        template: `
          <ng-template #empty><em class="empty">Nothing yet</em></ng-template>
          <andes-cascader
            aria-label="X"
            [options]="[]"
            [notFoundContent]="empty"
          />
        `,
      })
      class EmptyHost {}
      const fixture = TestBed.createComponent(EmptyHost);
      fixture.detectChanges();
      fixture.nativeElement.querySelector('button').click();
      fixture.detectChanges();

      expect(document.querySelector('.empty')?.textContent).toBe('Nothing yet');
    });

    it('shows a loading line in an empty panel while loading', () => {
      const { panel, open, host, detect } = setup((h) => {
        h.options.set([]);
        h.loading.set(true);
      });
      open();

      expect(panel()?.textContent).toContain('Loading');
      expect(panel()?.querySelector('[data-slot="cascader-empty"]')).toBeNull();

      host.labels.set({ loading: 'Cargando' });
      detect();
      expect(panel()?.textContent).toContain('Cargando');
    });

    it('lets every string be translated', () => {
      const { open, columns, host, detect, root } = setup((h) => {
        h.allowClear.set(true);
        h.value.set(['callao']);
        h.labels.set({ level: 'Nivel {level}', clear: 'Borrar' });
      });
      open();
      detect();

      expect(columns()[0].getAttribute('aria-label')).toBe('Nivel 1');
      expect(
        root
          .querySelector('[data-slot="cascader-clear"]')
          ?.getAttribute('aria-label'),
      ).toBe('Borrar');
      expect(host.labels()['level']).toBe('Nivel {level}');
    });
  });

  describe('single selection', () => {
    it('opens the next column when an option with children is clicked', () => {
      const { open, item, labelsOf, detect, columns } = setup();
      open();

      item('Lima').click();
      detect();

      expect(columns().length).toBe(2);
      expect(labelsOf(1)).toEqual(['Lima', 'Huaral']);
      expect(item('Lima', 0).getAttribute('aria-expanded')).toBe('true');
      item('Lima', 1).click();
      detect();
      expect(labelsOf(2)).toEqual([
        'Miraflores',
        'Santiago de Surco',
        'Barranco',
      ]);
      expect(columns()[1].getAttribute('aria-label')).toBe('Level 2');
    });

    it('selects a leaf: emits the path and the option objects, then closes', () => {
      const { open, item, detect, host, panel, combobox } = setup();
      open();
      item('Lima').click();
      detect();
      item('Lima', 1).click();
      detect();

      item('Miraflores').click();
      detect();

      expect(host.value()).toEqual(['lima', 'lima-province', 'miraflores']);
      expect(host.changes.length).toBe(1);
      expect(host.changes[0].value).toEqual([
        'lima',
        'lima-province',
        'miraflores',
      ]);
      expect(
        (host.changes[0].selectedOptions as AndesCascaderOption[]).map(
          (option) => option['label'],
        ),
      ).toEqual(['Lima', 'Lima', 'Miraflores']);
      expect(host.changes[0].selectedOptions[2]).toBe(
        PLACES[0].children?.[0].children?.[0],
      );
      expect(panel()).toBeNull();
      expect(combobox().textContent?.trim()).toBe('Lima / Lima / Miraflores');
    });

    it('selects a first-level leaf directly', () => {
      const { open, item, detect, host } = setup();
      open();

      item('Callao').click();
      detect();

      expect(host.value()).toEqual(['callao']);
    });

    it('does not select a branch, and ignores disabled options', () => {
      const { open, item, detect, host, panel } = setup();
      open();

      item('Cusco').click();
      detect();
      expect(host.value()).toBeUndefined();
      expect(panel()).not.toBeNull();

      item('Tumbes').click();
      detect();
      expect(host.value()).toBeUndefined();
      expect(panel()).not.toBeNull();
      expect(item('Tumbes').hasAttribute('data-active')).toBe(false);
    });

    it('does not report a pick of what is already selected', () => {
      const { open, item, detect, host, panel } = setup((h) =>
        h.value.set(['callao']),
      );
      open();

      item('Callao').click();
      detect();

      expect(host.changes.length).toBe(0);
      expect(panel()).toBeNull();
    });

    it('marks the selected path when opening on it', () => {
      const { open, item, active, columns } = setup((h) =>
        h.value.set(['cusco', 'wanchaq']),
      );
      open();

      expect(columns().length).toBe(2);
      expect(active()).toBe('Wanchaq');
      expect(item('Cusco', 0).hasAttribute('data-in-path')).toBe(true);
      expect(item('Wanchaq', 1).getAttribute('aria-selected')).toBe('true');
      expect(item('San Blas', 1).getAttribute('aria-selected')).toBe('false');
    });

    describe('changeOnSelect', () => {
      it('selects a branch on click and keeps the panel open on its children', () => {
        const { open, item, detect, host, panel, labelsOf } = setup((h) =>
          h.changeOnSelect.set(true),
        );
        open();

        item('Cusco').click();
        detect();

        expect(host.value()).toEqual(['cusco']);
        expect(panel()).not.toBeNull();
        expect(labelsOf(1)).toEqual(['Wanchaq', 'San Blas']);

        item('Wanchaq').click();
        detect();
        expect(host.value()).toEqual(['cusco', 'wanchaq']);
        expect(panel()).toBeNull();
      });

      it('picks a branch with Enter', () => {
        const { open, combobox, host, panel } = setup((h) =>
          h.changeOnSelect.set(true),
        );
        open();
        press(combobox(), 'ArrowDown');
        press(combobox(), 'ArrowDown');

        press(combobox(), 'Enter');

        expect(host.value()).toEqual(['cusco']);
        expect(panel()).not.toBeNull();
      });
    });

    describe('expandTrigger hover', () => {
      it('opens the next column when the pointer rests on an option', () => {
        const { open, item, detect, columns, host } = setup((h) =>
          h.expandTrigger.set('hover'),
        );
        open();
        expect(columns().length).toBe(1);

        item('Cusco').dispatchEvent(new MouseEvent('mouseenter'));
        detect();

        expect(columns().length).toBe(2);
        expect(host.value()).toBeUndefined();
      });

      it('does nothing on hover with the default click trigger', () => {
        const { open, item, detect, columns } = setup();
        open();

        item('Cusco').dispatchEvent(new MouseEvent('mouseenter'));
        detect();

        expect(columns().length).toBe(1);
      });
    });

    describe('clearing', () => {
      it('shows a clear button with allowClear and a value only', () => {
        const { root, host, detect } = setup((h) => h.allowClear.set(true));
        expect(root.querySelector('[data-slot="cascader-clear"]')).toBeNull();

        host.value.set(['callao']);
        detect();
        expect(
          root.querySelector('[data-slot="cascader-clear"]'),
        ).not.toBeNull();

        host.allowClear.set(false);
        detect();
        expect(root.querySelector('[data-slot="cascader-clear"]')).toBeNull();
      });

      it('empties the selection and reports it', () => {
        const { root, host, detect, combobox } = setup((h) => {
          h.allowClear.set(true);
          h.value.set(['cusco', 'wanchaq']);
        });

        root
          .querySelector<HTMLButtonElement>('[data-slot="cascader-clear"]')
          ?.click();
        detect();

        expect(host.value()).toEqual([]);
        expect(host.cleared).toBe(1);
        expect(host.changes[0]).toEqual({ value: [], selectedOptions: [] });
        expect(combobox().textContent?.trim()).toBe('Pick a place');
        expect(document.activeElement).toBe(combobox());
      });

      it('does not open the panel when the clear button is clicked', () => {
        const { root, panel } = setup((h) => {
          h.allowClear.set(true);
          h.value.set(['callao']);
        });

        root
          .querySelector<HTMLButtonElement>('[data-slot="cascader-clear"]')
          ?.click();

        expect(panel()).toBeNull();
      });
    });
  });

  describe('keyboard', () => {
    it('opens with ArrowDown on the first option, or the selected one', () => {
      const first = setup();
      first.combobox().focus();
      press(first.combobox(), 'ArrowDown');
      expect(first.panel()).not.toBeNull();
      expect(first.active()).toBe('Lima');
      first.fixture.destroy();

      const selected = setup((h) => h.value.set(['callao']));
      selected.combobox().focus();
      press(selected.combobox(), 'ArrowDown');
      expect(selected.active()).toBe('Callao');
    });

    it('opens with ArrowUp on the last enabled option', () => {
      const { combobox, active, panel } = setup();
      combobox().focus();

      press(combobox(), 'ArrowUp');

      expect(panel()).not.toBeNull();
      expect(active()).toBe('Callao');
    });

    it('opens with Enter and Space', () => {
      const { combobox, panel, fixture } = setup();
      combobox().focus();
      press(combobox(), 'Enter');
      expect(panel()).not.toBeNull();
      press(combobox(), 'Escape');
      expect(panel()).toBeNull();

      press(combobox(), ' ');
      expect(panel()).not.toBeNull();
      fixture.detectChanges();
    });

    it('moves within a column, skipping disabled options and stopping at the ends', () => {
      const { combobox, active } = setup();
      combobox().focus();
      press(combobox(), 'ArrowDown');

      press(combobox(), 'ArrowDown');
      expect(active()).toBe('Cusco');
      press(combobox(), 'ArrowDown');
      expect(active()).toBe('Callao');
      press(combobox(), 'ArrowDown');
      expect(active()).toBe('Callao');
      press(combobox(), 'ArrowUp');
      expect(active()).toBe('Cusco');
      press(combobox(), 'ArrowUp');
      press(combobox(), 'ArrowUp');
      expect(active()).toBe('Lima');
    });

    it('jumps to the first and last enabled option with Home and End', () => {
      const { combobox, active } = setup();
      combobox().focus();
      press(combobox(), 'ArrowDown');

      press(combobox(), 'End');
      expect(active()).toBe('Callao');
      press(combobox(), 'Home');
      expect(active()).toBe('Lima');
    });

    it('expands with ArrowRight, steps back with ArrowLeft', () => {
      const { combobox, active, columns } = setup();
      combobox().focus();
      press(combobox(), 'ArrowDown');

      press(combobox(), 'ArrowRight');
      expect(active()).toBe('Lima');
      // The option under the cursor has children too, so its column is open as well.
      expect(columns().length).toBe(3);
      press(combobox(), 'ArrowDown');
      expect(active()).toBe('Huaral');
      press(combobox(), 'ArrowRight');
      expect(active()).toBe('Chancay');
      press(combobox(), 'ArrowLeft');
      expect(active()).toBe('Huaral');
      press(combobox(), 'ArrowLeft');
      expect(active()).toBe('Lima');
      // Nothing above the first level to go back to.
      press(combobox(), 'ArrowLeft');
      expect(active()).toBe('Lima');
    });

    it('does nothing on ArrowRight over a leaf', () => {
      const { combobox, active } = setup();
      combobox().focus();
      press(combobox(), 'ArrowUp');

      press(combobox(), 'ArrowRight');

      expect(active()).toBe('Callao');
    });

    it('picks the option under the cursor with Enter and closes', () => {
      const { combobox, host, panel } = setup();
      combobox().focus();
      press(combobox(), 'ArrowDown');
      press(combobox(), 'ArrowRight');
      press(combobox(), 'ArrowRight');
      press(combobox(), 'ArrowDown');
      expect(host.value()).toBeUndefined();

      press(combobox(), 'Enter');

      expect(host.value()).toEqual(['lima', 'lima-province', 'surco']);
      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(combobox());
    });

    it('opens the next column with Enter on an option that cannot be picked', () => {
      const { combobox, active, columns, host } = setup();
      combobox().focus();
      press(combobox(), 'ArrowDown');
      press(combobox(), 'ArrowDown');

      press(combobox(), 'Enter');

      expect(host.value()).toBeUndefined();
      expect(active()).toBe('Wanchaq');
      expect(columns().length).toBe(2);
    });

    it('mirrors the horizontal arrows in right-to-left pages', () => {
      const { combobox, active, fixture } = setup();
      fixture.nativeElement.style.direction = 'rtl';
      combobox().focus();
      press(combobox(), 'ArrowDown');

      press(combobox(), 'ArrowRight');
      expect(active()).toBe('Lima');
      press(combobox(), 'ArrowLeft');
      expect(active()).toBe('Lima');
      expect(document.querySelectorAll('.andes-cascader__column').length).toBe(
        2,
      );
      press(combobox(), 'ArrowLeft');
      expect(active()).toBe('Lima');
    });

    it('ignores modified keys', () => {
      const { combobox, panel } = setup();
      combobox().focus();

      press(combobox(), 'ArrowDown', { ctrlKey: true });

      expect(panel()).toBeNull();
    });

    it('keeps real focus on the combobox the whole time', () => {
      const { combobox } = setup();
      combobox().focus();

      press(combobox(), 'ArrowDown');
      press(combobox(), 'ArrowRight');
      press(combobox(), 'ArrowDown');

      expect(document.activeElement).toBe(combobox());
    });
  });

  describe('multiple', () => {
    function multipleSetup(configure?: (host: CascaderHost) => void) {
      return setup((host) => {
        host.multiple.set(true);
        host.value.set([]);
        configure?.(host);
      });
    }

    it('puts a checkbox state on every option', () => {
      const { open, item } = multipleSetup((h) =>
        h.value.set([['lima', 'lima-province', 'miraflores']]),
      );
      open();

      expect(item('Lima', 0).getAttribute('aria-checked')).toBe('mixed');
      expect(item('Cusco').getAttribute('aria-checked')).toBe('false');
      expect(
        item('Lima', 0)
          .querySelector('.andes-cascader__check')
          ?.getAttribute('data-state'),
      ).toBe('indeterminate');
      expect(
        document
          .querySelector('[role="tree"]')
          ?.getAttribute('aria-multiselectable'),
      ).toBe('true');
    });

    it('checks a leaf from a row click, leaving the panel open', () => {
      const { open, item, detect, host, panel } = multipleSetup();
      open();
      item('Cusco').click();
      detect();

      item('Wanchaq').click();
      detect();

      expect(host.value()).toEqual([['cusco', 'wanchaq']]);
      expect(host.changes[0].value).toEqual([['cusco', 'wanchaq']]);
      expect(
        (host.changes[0].selectedOptions as AndesCascaderOption[][])[0].map(
          (option) => option['label'],
        ),
      ).toEqual(['Cusco', 'Wanchaq']);
      expect(panel()).not.toBeNull();
      expect(item('Wanchaq').getAttribute('aria-checked')).toBe('true');
      expect(item('Cusco', 0).getAttribute('aria-checked')).toBe('mixed');
    });

    it('checks every enabled leaf of a branch from its checkbox, and unchecks them', () => {
      const { open, item, detect, host } = multipleSetup();
      open();

      item('Lima', 0)
        .querySelector<HTMLElement>('.andes-cascader__check')
        ?.click();
      detect();
      expect(host.value()).toEqual([
        ['lima', 'lima-province', 'miraflores'],
        ['lima', 'lima-province', 'surco'],
        ['lima', 'huaral', 'chancay'],
      ]);
      // Barranco is disabled, so the branch cannot read as fully checked... but nothing
      // else is left to check.
      expect(item('Lima', 0).getAttribute('aria-checked')).toBe('mixed');

      item('Lima', 0)
        .querySelector<HTMLElement>('.andes-cascader__check')
        ?.click();
      detect();
      expect(host.value()).toEqual([]);
      expect(item('Lima', 0).getAttribute('aria-checked')).toBe('false');
    });

    it('does not open the next column when a checkbox is clicked', () => {
      const { open, item, detect, columns } = multipleSetup();
      open();

      item('Cusco')
        .querySelector<HTMLElement>('.andes-cascader__check')
        ?.click();
      detect();

      expect(columns().length).toBe(1);
    });

    it('expands a branch from a row click', () => {
      const { open, item, detect, columns, host } = multipleSetup();
      open();

      item('Cusco').click();
      detect();

      expect(columns().length).toBe(2);
      expect(host.value()).toEqual([]);
    });

    it('toggles with Enter and Space on the option under the cursor', () => {
      const { combobox, host } = multipleSetup();
      combobox().focus();
      press(combobox(), 'ArrowDown');
      press(combobox(), 'ArrowDown');
      press(combobox(), 'ArrowRight');

      press(combobox(), 'Enter');
      expect(host.value()).toEqual([['cusco', 'wanchaq']]);
      press(combobox(), ' ');
      expect(host.value()).toEqual([]);
    });

    it('shows each path as a removable tag', () => {
      const { tags, root, host, detect } = multipleSetup((h) =>
        h.value.set([['cusco', 'wanchaq'], ['callao']]),
      );

      expect(tags()).toEqual(['Cusco / Wanchaq', 'Callao']);
      expect(
        root
          .querySelector('[data-slot="cascader-tag-remove"]')
          ?.getAttribute('aria-label'),
      ).toBe('Remove Cusco / Wanchaq');
      expect(
        root
          .querySelector('[data-slot="cascader-tag-remove"]')
          ?.getAttribute('tabindex'),
      ).toBe('-1');

      root
        .querySelector<HTMLButtonElement>('[data-slot="cascader-tag-remove"]')
        ?.click();
      detect();

      expect(host.value()).toEqual([['callao']]);
      expect(host.changes[0].value).toEqual([['callao']]);
      expect(tags()).toEqual(['Callao']);
    });

    it('removes the last tag with Backspace, only when the field is empty', () => {
      const { combobox, host } = multipleSetup((h) =>
        h.value.set([['cusco', 'wanchaq'], ['callao']]),
      );
      combobox().focus();

      press(combobox(), 'Backspace');
      expect(host.value()).toEqual([['cusco', 'wanchaq']]);
      press(combobox(), 'Backspace');
      press(combobox(), 'Backspace');
      expect(host.value()).toEqual([]);
    });

    it('collapses tags beyond maxTagCount into a +N tag', () => {
      const { root, tags, host, detect } = multipleSetup((h) => {
        h.maxTagCount.set(1);
        h.value.set([['cusco', 'wanchaq'], ['callao'], ['cusco', 'san-blas']]);
      });

      expect(tags()).toEqual(['Cusco / Wanchaq']);
      const rest = root.querySelector('[data-slot="cascader-tag-rest"]');
      expect(rest?.textContent?.trim()).toBe('+ 2 ...');
      expect(rest?.getAttribute('title')).toBe('Callao, Cusco / San Blas');

      host.maxTagCount.set(undefined);
      detect();
      expect(tags().length).toBe(3);
      expect(root.querySelector('[data-slot="cascader-tag-rest"]')).toBeNull();
    });

    it('lists the checked branch instead of its leaves with the parent strategy', () => {
      const { open, item, detect, host, tags } = multipleSetup((h) =>
        h.strategy.set('parent'),
      );
      open();

      item('Cusco').click();
      detect();
      item('Wanchaq').click();
      detect();
      expect(host.value()).toEqual([['cusco', 'wanchaq']]);

      item('San Blas').click();
      detect();
      expect(host.value()).toEqual([['cusco']]);
      expect(tags()).toEqual(['Cusco']);
      expect(item('Cusco', 0).getAttribute('aria-checked')).toBe('true');

      item('Wanchaq').click();
      detect();
      expect(host.value()).toEqual([['cusco', 'san-blas']]);
    });

    it('understands a parent path in the value as all of its leaves', () => {
      const { open, item, detect } = multipleSetup((h) => {
        h.strategy.set('parent');
        h.value.set([['cusco']]);
      });
      open();
      item('Cusco').click();
      detect();

      expect(item('Cusco', 0).getAttribute('aria-checked')).toBe('true');
      expect(item('Wanchaq').getAttribute('aria-checked')).toBe('true');
    });

    it('keeps a path the options do not know when others change', () => {
      const { open, item, detect, host } = multipleSetup((h) =>
        h.value.set([['ghost', 'path']]),
      );
      open();
      item('Cusco').click();
      detect();

      item('Wanchaq').click();
      detect();

      expect(host.value()).toEqual([
        ['ghost', 'path'],
        ['cusco', 'wanchaq'],
      ]);
    });

    it('renders the display template once per tag', () => {
      @Component({
        imports: [AndesCascader],
        template: `
          <ng-template #tpl let-labels>
            <i class="custom">{{ labels.at(-1) }}</i>
          </ng-template>
          <andes-cascader
            aria-label="X"
            multiple
            [options]="options"
            [value]="[['cusco', 'wanchaq'], ['callao']]"
            [displayRender]="tpl"
          />
        `,
      })
      class TagsHost {
        readonly options = PLACES;
      }
      const fixture = TestBed.createComponent(TagsHost);
      fixture.detectChanges();

      expect(
        Array.from(fixture.nativeElement.querySelectorAll('.custom')).map(
          (el) => (el as HTMLElement).textContent,
        ),
      ).toEqual(['Wanchaq', 'Callao']);
    });
  });

  describe('search', () => {
    function searchSetup(configure?: (host: CascaderHost) => void) {
      const helpers = setup((host) => {
        host.showSearch.set(true);
        configure?.(host);
      });
      const input = () => helpers.combobox() as HTMLInputElement;
      const type = (text: string) => {
        input().focus();
        input().value = text;
        input().dispatchEvent(new Event('input', { bubbles: true }));
        helpers.fixture.detectChanges();
      };
      const results = () =>
        Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-slot="cascader-result"]',
          ),
        );
      const resultTexts = () =>
        results().map((el) => el.textContent?.replace(/\s+/g, ' ').trim());
      return { ...helpers, input, type, results, resultTexts };
    }

    it('turns the field into a text input that is still the combobox', () => {
      const { input } = searchSetup();

      expect(input().tagName).toBe('INPUT');
      expect(input().getAttribute('role')).toBe('combobox');
      expect(input().getAttribute('aria-autocomplete')).toBe('list');
      expect(input().getAttribute('aria-haspopup')).toBe('tree');
      expect(input().getAttribute('aria-label')).toBe('Place');
    });

    it('opens on typing and lists every matching path, ignoring case', () => {
      const { type, resultTexts, host, panel } = searchSetup();

      type('LIMA');

      expect(panel()).not.toBeNull();
      expect(resultTexts()).toEqual([
        'Lima / Lima / Miraflores',
        'Lima / Lima / Santiago de Surco',
        'Lima / Lima / Barranco',
        'Lima / Huaral / Chancay',
      ]);
      expect(host.searches).toEqual(['LIMA']);
    });

    it('highlights what matched', () => {
      const { type, results } = searchSetup();

      type('mira');

      const marks = Array.from(results()[0].querySelectorAll('mark')).map(
        (mark) => mark.textContent,
      );
      expect(marks).toEqual(['Mira']);
    });

    it('announces the number of results and the empty state', () => {
      const { type, panel } = searchSetup();

      type('lima');
      expect(
        panel()?.querySelector('[role="status"]')?.textContent?.trim(),
      ).toBe('4 results');

      type('zzz');
      expect(panel()?.textContent).toContain('No data');
      expect(
        panel()?.querySelector('[role="status"]')?.textContent?.trim(),
      ).toBe('0 results');
    });

    it('moves through results with the arrows, skipping disabled ones, and picks with Enter', () => {
      const { type, input, active, host, panel } = searchSetup();
      type('lima');
      expect(active()).toBe('Lima / Lima / Miraflores');

      press(input(), 'ArrowDown');
      expect(active()).toBe('Lima / Lima / Santiago de Surco');
      press(input(), 'ArrowDown');
      expect(active()).toBe('Lima / Huaral / Chancay');
      press(input(), 'ArrowDown');
      expect(active()).toBe('Lima / Huaral / Chancay');
      press(input(), 'ArrowUp');
      press(input(), 'ArrowUp');
      press(input(), 'ArrowUp');
      expect(active()).toBe('Lima / Lima / Miraflores');

      press(input(), 'ArrowDown');
      press(input(), 'Enter');

      expect(host.value()).toEqual(['lima', 'lima-province', 'surco']);
      expect(panel()).toBeNull();
      expect(input().value).toBe('');
    });

    it('picks a result with a click and ignores a disabled one', () => {
      const { type, results, host, detect, panel } = searchSetup();
      type('lima');

      results()[2].click();
      detect();
      expect(host.value()).toBeUndefined();
      expect(panel()).not.toBeNull();

      results()[3].click();
      detect();
      expect(host.value()).toEqual(['lima', 'huaral', 'chancay']);
    });

    it('clears the text when the panel closes', () => {
      const { type, input, panel } = searchSetup();
      type('lima');

      press(input(), 'Escape');

      expect(panel()).toBeNull();
      expect(input().value).toBe('');
    });

    it('goes back to the columns when the text is cleared', () => {
      const { type, panel } = searchSetup();
      type('lima');
      type('');

      expect(panel()?.querySelectorAll('[role="group"]').length).toBe(1);
      expect(
        document.querySelector('[data-slot="cascader-results"]'),
      ).toBeNull();
    });

    it('browses with the arrow keys while the text is empty', () => {
      const { input, active, panel } = searchSetup();
      input().focus();

      press(input(), 'ArrowDown');
      press(input(), 'ArrowRight');

      expect(panel()).not.toBeNull();
      expect(active()).toBe('Lima');
      expect(document.querySelectorAll('.andes-cascader__column').length).toBe(
        3,
      );
    });

    it('shows the selected path as the placeholder text of the field', () => {
      const { root, host, detect } = searchSetup((h) =>
        h.value.set(['cusco', 'wanchaq']),
      );
      expect(
        root.querySelector('.andes-cascader__ghost')?.textContent?.trim(),
      ).toBe('Cusco / Wanchaq');

      host.value.set(undefined);
      detect();
      expect(
        root.querySelector('.andes-cascader__ghost')?.textContent?.trim(),
      ).toBe('Pick a place');
    });

    it('includes branches in the results with changeOnSelect', () => {
      const { type, resultTexts } = searchSetup((h) =>
        h.changeOnSelect.set(true),
      );

      type('cusco');

      expect(resultTexts()).toEqual([
        'Cusco',
        'Cusco / Wanchaq',
        'Cusco / San Blas',
      ]);
    });

    it('uses a custom filter, sort and limit', () => {
      const { type, resultTexts, host, detect } = searchSetup((h) =>
        h.showSearch.set({
          filter: (text, path) =>
            String(path[path.length - 1]['label'])
              .toLowerCase()
              .startsWith(text.toLowerCase()),
          sort: (a, b) =>
            String(b[b.length - 1]['label']).localeCompare(
              String(a[a.length - 1]['label']),
            ),
        }),
      );

      type('s');
      expect(resultTexts()).toEqual([
        'Lima / Lima / Santiago de Surco',
        'Cusco / San Blas',
      ]);

      host.showSearch.set({ limit: 1 });
      detect();
      type('lima');
      expect(resultTexts().length).toBe(1);
    });

    it('toggles results with multiple, leaving the panel open and clearing the text', () => {
      const { type, results, host, detect, input, panel, tags } = searchSetup(
        (h) => {
          h.multiple.set(true);
          h.value.set([]);
        },
      );
      type('wan');

      results()[0].click();
      detect();

      expect(host.value()).toEqual([['cusco', 'wanchaq']]);
      expect(panel()).not.toBeNull();
      expect(input().value).toBe('');
      expect(tags()).toEqual(['Cusco / Wanchaq']);

      type('wan');
      expect(results()[0].getAttribute('aria-checked')).toBe('true');
      press(input(), 'Enter');
      expect(host.value()).toEqual([]);
    });

    it('does not remove a tag with Backspace while there is text', () => {
      const { type, input, host } = searchSetup((h) => {
        h.multiple.set(true);
        h.value.set([['callao']]);
      });
      type('x');

      press(input(), 'Backspace');

      expect(host.value()).toEqual([['callao']]);
    });
  });

  describe('loading options on demand', () => {
    const ROOTS: AndesCascaderOption[] = [
      { value: 'peru', label: 'Peru' },
      { value: 'chile', label: 'Chile' },
      { value: 'bolivia', label: 'Bolivia', isLeaf: true },
      { value: 'empty', label: 'Empty', children: [] },
    ];

    function loadSetup(load: AndesCascaderLoadData) {
      const helpers = setup((host) => {
        host.options.set(ROOTS.map((option) => ({ ...option })));
        host.loadData.set(load);
      });
      return helpers;
    }

    it('treats an option without children as expandable, except leaves and empty branches', () => {
      const { open, item } = loadSetup(() => undefined);
      open();

      expect(item('Peru').getAttribute('aria-expanded')).toBe('false');
      expect(item('Bolivia').hasAttribute('aria-expanded')).toBe(false);
      expect(item('Empty').hasAttribute('aria-expanded')).toBe(false);
    });

    it('calls loadData with the options down to the expanded one and shows a spinner meanwhile', async () => {
      let resolve: () => void = () => undefined;
      const calls: AndesCascaderOption[][] = [];
      const { open, item, detect, fixture } = loadSetup((selected) => {
        calls.push(selected);
        return new Promise<void>((done) => {
          resolve = () => {
            selected[selected.length - 1].children = [
              { value: 'lima', label: 'Lima', isLeaf: true },
            ];
            done();
          };
        });
      });
      open();

      item('Peru').click();
      detect();

      expect(calls.length).toBe(1);
      expect(calls[0].map((option) => option['value'])).toEqual(['peru']);
      expect(item('Peru').hasAttribute('data-loading')).toBe(true);
      expect(
        item('Peru').querySelector('.andes-cascader__spinner'),
      ).not.toBeNull();

      // A second click while loading does not load again.
      item('Peru').click();
      detect();
      expect(calls.length).toBe(1);

      resolve();
      await fixture.whenStable();
      detect();

      expect(item('Peru').hasAttribute('data-loading')).toBe(false);
      expect(document.querySelectorAll('.andes-cascader__column').length).toBe(
        2,
      );
      expect(item('Lima').textContent?.trim()).toBe('Lima');
    });

    it('loads each option only once', async () => {
      const load = vi.fn(async (selected: AndesCascaderOption[]) => {
        selected[selected.length - 1].children = [
          { value: 'a', label: 'A', isLeaf: true },
        ];
      });
      const { open, item, detect, fixture } = loadSetup(load);
      open();

      item('Peru').click();
      await fixture.whenStable();
      detect();
      item('Chile').click();
      await fixture.whenStable();
      detect();
      item('Peru').click();
      detect();

      expect(load).toHaveBeenCalledTimes(2);
    });

    it('does not load a leaf, or an option that has a children field', () => {
      const load = vi.fn();
      const { open, item, detect, host } = loadSetup(load);
      open();

      item('Empty').click();
      detect();
      expect(load).not.toHaveBeenCalled();
      expect(host.value()).toEqual(['empty']);

      open();
      item('Bolivia').click();
      detect();
      expect(load).not.toHaveBeenCalled();
      expect(host.value()).toEqual(['bolivia']);
    });

    it('accepts a synchronous loadData that adds the children in place', () => {
      const { open, item, detect, labelsOf } = loadSetup((selected) => {
        selected[selected.length - 1].children = [
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y' },
        ];
      });
      open();

      item('Chile').click();
      detect();

      expect(labelsOf(1)).toEqual(['X', 'Y']);
    });

    it('moves into the loaded column when ArrowRight asked for it', async () => {
      const { combobox, active, fixture, detect } = loadSetup(
        async (selected) => {
          selected[selected.length - 1].children = [
            { value: 'first', label: 'First', isLeaf: true },
          ];
        },
      );
      combobox().focus();
      press(combobox(), 'ArrowDown');

      press(combobox(), 'ArrowRight');
      await fixture.whenStable();
      detect();

      expect(active()).toBe('First');
    });

    it('reports a failed load and lets it be tried again', async () => {
      const load = vi
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockImplementation(async (selected: AndesCascaderOption[]) => {
          selected[selected.length - 1].children = [
            { value: 'ok', label: 'Ok', isLeaf: true },
          ];
        });
      const { open, item, detect, fixture, host, labelsOf } = loadSetup(load);
      open();

      item('Peru').click();
      await fixture.whenStable();
      detect();

      expect(host.loadErrors.length).toBe(1);
      expect((host.loadErrors[0].error as Error).message).toBe('offline');
      expect(host.loadErrors[0].option['value']).toBe('peru');
      expect(item('Peru').hasAttribute('data-loading')).toBe(false);

      item('Peru').click();
      await fixture.whenStable();
      detect();
      expect(labelsOf(1)).toEqual(['Ok']);
    });

    it('reports a loadData that throws', () => {
      const { open, item, detect, host } = loadSetup(() => {
        throw new Error('boom');
      });
      open();

      item('Peru').click();
      detect();

      expect(host.loadErrors.length).toBe(1);
    });

    it('selects a loaded leaf', async () => {
      const { open, item, detect, fixture, host } = loadSetup(
        async (selected) => {
          selected[selected.length - 1].children = [
            { value: 'lima', label: 'Lima', isLeaf: true },
          ];
        },
      );
      open();
      item('Peru').click();
      await fixture.whenStable();
      detect();

      item('Lima').click();
      detect();

      expect(host.value()).toEqual(['peru', 'lima']);
    });
  });

  describe('field names and options', () => {
    it('reads other field names', () => {
      const { open, item, detect, host, combobox } = setup((h) => {
        h.fieldNames.set({ value: 'code', label: 'name', children: 'items' });
        h.options.set([
          {
            code: 'fruit',
            name: 'Fruit',
            items: [{ code: 'apple', name: 'Apple' }],
          },
        ]);
      });
      open();

      item('Fruit').click();
      detect();
      item('Apple').click();
      detect();

      expect(host.value()).toEqual(['fruit', 'apple']);
      expect(combobox().textContent?.trim()).toBe('Fruit / Apple');
    });

    it('follows options that change', () => {
      const { host, detect, open, labelsOf } = setup();
      open();
      host.options.set([{ value: 'only', label: 'Only' }]);
      detect();

      expect(labelsOf(0)).toEqual(['Only']);
    });
  });

  describe('placement', () => {
    it('reports the side the panel opens on', () => {
      const { open, panel, host, detect } = setup((h) =>
        h.placement.set('topLeft'),
      );
      open();
      expect(panel()?.getAttribute('data-side')).toBe('top');

      host.placement.set('bottomRight');
      detect();
      open();
    });
  });

  describe('forms', () => {
    function setupForm() {
      const fixture = TestBed.createComponent(FormHost);
      current = fixture;
      fixture.detectChanges();
      const combobox = fixture.nativeElement.querySelector(
        '[role="combobox"]',
      ) as HTMLButtonElement;
      return { fixture, control: fixture.componentInstance.control, combobox };
    }

    it('writes the control value to the field', () => {
      const { fixture, control, combobox } = setupForm();
      expect(combobox.textContent?.trim()).toBe('Cusco / Wanchaq');

      control.setValue(['callao']);
      fixture.detectChanges();
      expect(combobox.textContent?.trim()).toBe('Callao');

      control.setValue(null);
      fixture.detectChanges();
      expect(combobox.textContent?.trim()).toBe('');
    });

    it('updates the control when the user picks and marks it dirty', () => {
      const { fixture, control, combobox } = setupForm();
      combobox.click();
      fixture.detectChanges();
      const callao = Array.from(
        document.querySelectorAll<HTMLElement>('[role="treeitem"]'),
      ).find((el) => el.textContent?.trim() === 'Callao');

      callao?.click();
      fixture.detectChanges();

      expect(control.value).toEqual(['callao']);
      expect(control.dirty).toBe(true);
    });

    it('marks the control touched when the panel closes, and on blur while closed', () => {
      const { fixture, control, combobox } = setupForm();
      combobox.click();
      fixture.detectChanges();
      expect(control.touched).toBe(false);
      press(combobox, 'Escape');
      expect(control.touched).toBe(true);

      control.markAsUntouched();
      combobox.dispatchEvent(new Event('blur'));
      expect(control.touched).toBe(true);
    });

    it('disables from the control', () => {
      const { fixture, control, combobox } = setupForm();

      control.disable();
      fixture.detectChanges();
      expect(combobox.disabled).toBe(true);

      control.enable();
      fixture.detectChanges();
      expect(combobox.disabled).toBe(false);
    });
  });

  describe('styles', () => {
    const style = css('cascader.css');

    it('draws the field box with the single-ring spec', () => {
      expect(style).toMatch(
        /\.andes-cascader__trigger \{[^}]*border: 1px solid var\(--_status-border, var\(--andes-color-input\)\)/,
      );
      expect(style).toMatch(/\.andes-cascader__trigger \{[^}]*outline: none/);
      expect(style).toMatch(
        /\.andes-cascader__trigger:focus-within, \.andes-cascader__trigger\[data-state='open'\] \{[^}]*box-shadow: 0 0 0 2px var\(--_ring\)/,
      );
      expect(style).toMatch(/\.andes-cascader__combobox \{[^}]*outline: none/);
    });

    it('sizes the field 24 / 32 / 40 from the control height tokens', () => {
      expect(style).toContain(
        "[data-size='sm'] { --_padding-x: var(--andes-control-padding-x-sm, 0.4375rem); min-height: var(--andes-control-height-sm, 1.5rem)",
      );
      expect(style).toContain(
        'min-height: var(--andes-control-height-md, 2rem)',
      );
      expect(style).toContain(
        'min-height: var(--andes-control-height-lg, 2.5rem)',
      );
    });

    it('plays the exit animation on the panel root and honours reduced motion', () => {
      expect(style).toMatch(
        /@media \(prefers-reduced-motion: no-preference\) \{[^@]*\.andes-cascader__panel\[data-andes-closing\] \{[^}]*animation: andes-cascader-panel-exit[^}]*forwards/,
      );
      // The enter and exit animations live only inside the no-preference query.
      const outside = style.replace(
        /@media \(prefers-reduced-motion: no-preference\) \{.*?\} \} /,
        '',
      );
      expect(outside).not.toMatch(
        /\.andes-cascader__panel\[data-andes-closing\] \{/,
      );
      expect(style).toMatch(
        /\.andes-cascader__panel \{[^}]*font-family: var\(--andes-font-family\), sans-serif/,
      );
    });

    it('lays options out with logical properties for right-to-left pages', () => {
      expect(style).toContain(
        'border-inline-start: 1px solid var(--andes-color-border)',
      );
      expect(style).not.toMatch(/\b(margin|padding)-(left|right)\b/);
      expect(style).toContain("[dir='rtl'] .andes-cascader__expand");
    });
  });
});
