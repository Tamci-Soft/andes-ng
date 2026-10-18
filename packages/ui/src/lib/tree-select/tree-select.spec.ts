import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AndesOverlayPrimitive } from '@andes-ng/primitives';

import { AndesTreeNodeTemplate } from '../tree/tree-node-template';
import type {
  AndesTreeCheckedStrategy,
  AndesTreeFieldNames,
  AndesTreeKey,
  AndesTreeLoadData,
  AndesTreeNode,
} from '../tree/tree-types';
import { AndesTreeSelect } from './tree-select';
import type {
  AndesTreeSelectMaxTagPlaceholder,
  AndesTreeSelectPlacement,
  AndesTreeSelectSearchPlacement,
  AndesTreeSelectSize,
  AndesTreeSelectStatus,
  AndesTreeSelectValue,
  AndesTreeSelectVariant,
} from './tree-select-types';

function sample(): AndesTreeNode[] {
  return [
    {
      key: 'lima',
      title: 'Lima',
      children: [
        { key: 'lima-a', title: 'Zona A' },
        { key: 'lima-b', title: 'Zona B' },
        { key: 'lima-c', title: 'Zona C', disabled: true },
      ],
    },
    {
      key: 'cusco',
      title: 'Cusco',
      children: [{ key: 'cusco-a', title: 'Zona A Cusco' }],
    },
    { key: 'iquitos', title: 'Iquitos' },
  ];
}

@Component({
  imports: [AndesTreeSelect, AndesTreeNodeTemplate, ReactiveFormsModule],
  template: `
    @if (useForm()) {
      <andes-tree-select
        aria-label="Region"
        [nodes]="nodes()"
        [formControl]="control"
        [multiple]="multiple()"
        [checkable]="checkable()"
        placeholder="Pick"
      />
    } @else {
      <andes-tree-select
        #select
        id="region"
        name="region"
        aria-label="Region"
        aria-describedby="hint"
        [nodes]="nodes()"
        [fieldNames]="fieldNames()"
        [(value)]="value"
        [(expandedKeys)]="expanded"
        [multiple]="multiple()"
        [checkable]="checkable()"
        [checkStrictly]="checkStrictly()"
        [showCheckedStrategy]="strategy()"
        [size]="size()"
        [variant]="variant()"
        [status]="status()"
        [disabled]="disabled()"
        [allowClear]="allowClear()"
        [loading]="loading()"
        [showSearch]="showSearch()"
        [searchPlacement]="searchPlacement()"
        [treeDefaultExpandAll]="defaultExpandAll()"
        [loadData]="loadData()"
        [maxTagCount]="maxTagCount()"
        [maxTagPlaceholder]="maxTagPlaceholder()"
        [placement]="placement()"
        [labels]="labels()"
        placeholder="Pick a region"
        (openChange)="opens.push($event)"
        (searched)="searches.push($event)"
        (cleared)="clears = clears + 1"
      >
        @if (customNode()) {
          <ng-template andesTreeNode let-node>
            <b class="custom">{{ node.title }}</b>
          </ng-template>
        }
      </andes-tree-select>
    }
    <ng-template #rest let-omitted>+{{ omitted.length }} more</ng-template>
    <span id="hint">Hint</span>
    <button id="after">after</button>
  `,
})
class HostComponent {
  readonly select = viewChild(AndesTreeSelect);
  readonly restTemplate = viewChild<TemplateRef<unknown>>('rest');

  readonly useForm = signal(false);
  readonly control = new FormControl<AndesTreeSelectValue>(null);
  readonly nodes = signal<AndesTreeNode[]>(sample());
  readonly fieldNames = signal<AndesTreeFieldNames | undefined>(undefined);
  readonly value = signal<AndesTreeSelectValue>(null);
  readonly expanded = signal<AndesTreeKey[]>([]);
  readonly multiple = signal(false);
  readonly checkable = signal(false);
  readonly checkStrictly = signal(false);
  readonly strategy = signal<AndesTreeCheckedStrategy>('child');
  readonly size = signal<AndesTreeSelectSize>('md');
  readonly variant = signal<AndesTreeSelectVariant>('outlined');
  readonly status = signal<AndesTreeSelectStatus | undefined>(undefined);
  readonly disabled = signal(false);
  readonly allowClear = signal(false);
  readonly loading = signal(false);
  readonly showSearch = signal(false);
  readonly searchPlacement = signal<AndesTreeSelectSearchPlacement>('panel');
  readonly defaultExpandAll = signal(false);
  readonly loadData = signal<AndesTreeLoadData | undefined>(undefined);
  readonly maxTagCount = signal<number | undefined>(undefined);
  readonly maxTagPlaceholder = signal<
    AndesTreeSelectMaxTagPlaceholder | undefined
  >(undefined);
  readonly placement = signal<AndesTreeSelectPlacement>('bottomLeft');
  readonly labels = signal({});
  readonly customNode = signal(false);

  opens: boolean[] = [];
  searches: string[] = [];
  clears = 0;
}

type Fixture = ComponentFixture<HostComponent>;

function setup(configure?: (host: HostComponent) => void): Fixture {
  const fixture = TestBed.createComponent(HostComponent);
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  document.body.appendChild(fixture.nativeElement);
  return fixture;
}

const box = (f: Fixture) =>
  f.nativeElement.querySelector('.andes-tree-select__trigger') as HTMLElement;
const input = (f: Fixture) =>
  f.nativeElement.querySelector(
    '.andes-tree-select__input',
  ) as HTMLInputElement;
const panel = () =>
  document.querySelector('.andes-tree-select__panel') as HTMLElement | null;
const tags = (f: Fixture) =>
  [
    ...f.nativeElement.querySelectorAll(
      '[data-slot="tree-select-tag"] .andes-tree-select__tag-label',
    ),
  ].map((t) => (t as HTMLElement).textContent?.trim());

function node(title: string): HTMLElement {
  const items = [
    ...document.querySelectorAll('.andes-tree-select__panel [role="treeitem"]'),
  ] as HTMLElement[];
  const found = items.find(
    (el) =>
      el
        .querySelector(':scope > .andes-tree__row .andes-tree__title')
        ?.textContent?.trim() === title,
  );
  if (!found) {
    throw new Error(`No node "${title}" in the panel`);
  }
  return found;
}

const row = (el: HTMLElement) =>
  el.querySelector(':scope > .andes-tree__row') as HTMLElement;
const switcher = (el: HTMLElement) =>
  el.querySelector(
    ':scope > .andes-tree__row .andes-tree__switcher',
  ) as HTMLElement;
const checkbox = (el: HTMLElement) =>
  el.querySelector(
    ':scope > .andes-tree__row .andes-tree__checkbox',
  ) as HTMLElement;

function key(el: HTMLElement, name: string, init: KeyboardEventInit = {}) {
  el.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: name,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

function open(f: Fixture) {
  box(f).click();
  f.detectChanges();
}

function type(el: HTMLInputElement, text: string) {
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('AndesTreeSelect', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('field and ARIA', () => {
    it('renders a focusable combobox that announces the tree popup', () => {
      const fixture = setup();
      const field = box(fixture);
      expect(field.getAttribute('role')).toBe('combobox');
      expect(field.getAttribute('tabindex')).toBe('0');
      expect(field.getAttribute('aria-haspopup')).toBe('tree');
      expect(field.getAttribute('aria-expanded')).toBe('false');
      expect(field.getAttribute('aria-label')).toBe('Region');
      expect(field.id).toBe('region');
      expect(field.hasAttribute('aria-controls')).toBe(false);
    });

    it('keeps the host out of the accessibility tree', () => {
      const fixture = setup();
      const host = fixture.nativeElement.querySelector(
        'andes-tree-select',
      ) as HTMLElement;
      for (const attribute of [
        'id',
        'aria-label',
        'aria-describedby',
        'aria-invalid',
        'name',
      ]) {
        expect(host.hasAttribute(attribute)).toBe(false);
      }
    });

    it('describes the field by the selection summary after the consumer description', () => {
      const fixture = setup((h) => h.value.set('iquitos'));
      const described = box(fixture).getAttribute('aria-describedby') as string;
      const [consumer, summary] = described.split(' ');
      expect(consumer).toBe('hint');
      expect(
        fixture.nativeElement.querySelector(`#${summary}`).textContent,
      ).toBe('Iquitos');
    });

    it('shows the placeholder until there is a value, then the selected title', () => {
      const fixture = setup();
      expect(box(fixture).hasAttribute('data-placeholder')).toBe(true);
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__placeholder')
          .textContent,
      ).toBe('Pick a region');
      fixture.componentInstance.value.set('cusco-a');
      fixture.detectChanges();
      expect(box(fixture).hasAttribute('data-placeholder')).toBe(false);
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__value')
          .textContent,
      ).toBe('Zona A Cusco');
    });

    it('exposes size, variant and status as data attributes', () => {
      const fixture = setup((h) => {
        h.size.set('lg');
        h.variant.set('filled');
        h.status.set('warning');
      });
      expect(box(fixture).getAttribute('data-size')).toBe('lg');
      expect(box(fixture).getAttribute('data-variant')).toBe('filled');
      expect(box(fixture).getAttribute('data-status')).toBe('warning');
    });

    it('is not focusable and does not open when disabled', () => {
      const fixture = setup((h) => h.disabled.set(true));
      expect(box(fixture).hasAttribute('tabindex')).toBe(false);
      expect(box(fixture).getAttribute('aria-disabled')).toBe('true');
      box(fixture).click();
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('marks status error as invalid', () => {
      const fixture = setup((h) => h.status.set('error'));
      expect(box(fixture).getAttribute('aria-invalid')).toBe('true');
    });

    it('shows a spinner instead of the chevron while loading', () => {
      const fixture = setup((h) => h.loading.set(true));
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__spinner'),
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__chevron'),
      ).toBeNull();
    });
  });

  describe('opening and closing', () => {
    it('opens on click and wires aria-expanded and aria-controls to the panel', () => {
      const fixture = setup();
      open(fixture);
      expect(panel()).toBeTruthy();
      expect(box(fixture).getAttribute('aria-expanded')).toBe('true');
      expect(box(fixture).getAttribute('aria-controls')).toBe(panel()?.id);
      expect(panel()?.querySelector('[role="tree"]')).toBeTruthy();
      expect(fixture.componentInstance.opens).toEqual([true]);
    });

    it('closes on a second click, Escape and an outside click', () => {
      const fixture = setup();
      open(fixture);
      box(fixture).click();
      fixture.detectChanges();
      expect(panel()).toBeNull();
      expect(box(fixture).getAttribute('aria-expanded')).toBe('false');

      open(fixture);
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          bubbles: true,
        }),
      );
      fixture.detectChanges();
      expect(panel()).toBeNull();

      open(fixture);
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(panel()).toBeNull();
      expect(fixture.componentInstance.opens).toEqual([
        true,
        false,
        true,
        false,
        true,
        false,
      ]);
    });

    it.each(['ArrowDown', 'Enter', ' '])('opens with %s', (name) => {
      const fixture = setup();
      box(fixture).focus();
      key(box(fixture), name);
      fixture.detectChanges();
      expect(panel()).toBeTruthy();
    });

    it('moves into the tree with ArrowDown once open', () => {
      const fixture = setup();
      box(fixture).focus();
      key(box(fixture), 'ArrowDown');
      fixture.detectChanges();
      key(box(fixture), 'ArrowDown');
      expect(document.activeElement?.getAttribute('role')).toBe('treeitem');
    });

    it('closes with Alt+ArrowUp', () => {
      const fixture = setup();
      open(fixture);
      key(box(fixture), 'ArrowUp', { altKey: true });
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('lets Tab leave: the panel closes and focus is on the field for the browser to move on', () => {
      const fixture = setup();
      box(fixture).focus();
      open(fixture);
      const first = panel()?.querySelector('[role="treeitem"]') as HTMLElement;
      first.focus();
      key(first, 'Tab');
      fixture.detectChanges();
      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(box(fixture));
    });

    it('closes when Tab is pressed on the field', () => {
      const fixture = setup();
      box(fixture).focus();
      open(fixture);
      key(box(fixture), 'Tab');
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('returns focus to the field after Escape', () => {
      const fixture = setup();
      box(fixture).focus();
      open(fixture);
      (panel()?.querySelector('[role="treeitem"]') as HTMLElement).focus();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          bubbles: true,
        }),
      );
      fixture.detectChanges();
      expect(document.activeElement).toBe(box(fixture));
    });

    it('exposes open, close, toggle and focus', () => {
      const fixture = setup();
      const select = fixture.componentInstance.select() as AndesTreeSelect;
      select.open();
      fixture.detectChanges();
      expect(select.isOpen()).toBe(true);
      select.close();
      expect(select.isOpen()).toBe(false);
      select.toggle();
      expect(select.isOpen()).toBe(true);
      select.close();
      select.focus();
      expect(document.activeElement).toBe(box(fixture));
    });

    it('opens above or below the field only, never beside it', () => {
      const fixture = setup();
      const select = fixture.componentInstance.select() as AndesTreeSelect;
      select.open();
      fixture.detectChanges();
      const overlay = fixture.debugElement.children[0].injector.get(
        AndesOverlayPrimitive,
      );
      const positioning = overlay.config().positioning;
      expect(positioning).toMatchObject({
        kind: 'anchored',
        side: 'bottom',
        crossSideFallback: false,
        flip: true,
        matchAnchorWidth: true,
      });
    });

    it.each([
      ['bottomLeft', 'bottom', 'start'],
      ['bottomRight', 'bottom', 'end'],
      ['topLeft', 'top', 'start'],
      ['topRight', 'top', 'end'],
    ] as const)('places the panel %s', (placement, side, align) => {
      const fixture = setup((h) => h.placement.set(placement));
      (fixture.componentInstance.select() as AndesTreeSelect).open();
      fixture.detectChanges();
      const overlay = fixture.debugElement.children[0].injector.get(
        AndesOverlayPrimitive,
      );
      expect(overlay.config().positioning).toMatchObject({
        side,
        align,
        crossSideFallback: false,
      });
      expect(panel()?.getAttribute('data-side')).toBe(side);
    });
  });

  describe('single selection', () => {
    it('picks a node, closes and reports the key', () => {
      const fixture = setup();
      open(fixture);
      row(node('Iquitos')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toBe('iquitos');
      expect(panel()).toBeNull();
      expect(box(fixture).textContent).toContain('Iquitos');
    });

    it('opens the branch of the current value and marks it selected', () => {
      const fixture = setup((h) => h.value.set('cusco-a'));
      open(fixture);
      expect(fixture.componentInstance.expanded()).toEqual(['cusco']);
      expect(node('Zona A Cusco').getAttribute('aria-selected')).toBe('true');
      expect(node('Zona A Cusco').getAttribute('tabindex')).toBe('0');
    });

    it('lets any node be picked, parents included, but not disabled ones', () => {
      const fixture = setup((h) => h.expanded.set(['lima']));
      open(fixture);
      row(node('Zona C')).click();
      fixture.detectChanges();
      expect(panel()).toBeTruthy();
      expect(fixture.componentInstance.value()).toBeNull();
      row(node('Lima')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toBe('lima');
    });

    it('closes without changing anything when the selected node is clicked again', () => {
      const fixture = setup((h) => h.value.set('iquitos'));
      open(fixture);
      row(node('Iquitos')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toBe('iquitos');
      expect(panel()).toBeNull();
    });

    it('does not close when a switcher is clicked', () => {
      const fixture = setup();
      open(fixture);
      switcher(node('Lima')).click();
      fixture.detectChanges();
      expect(panel()).toBeTruthy();
      expect(fixture.componentInstance.expanded()).toEqual(['lima']);
    });

    it('picks with the keyboard from the tree', () => {
      const fixture = setup();
      box(fixture).focus();
      key(box(fixture), 'ArrowDown');
      fixture.detectChanges();
      const iquitos = node('Iquitos');
      iquitos.focus();
      key(iquitos, 'Enter');
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toBe('iquitos');
      expect(panel()).toBeNull();
    });

    it('clears with the clear button and reports it', () => {
      const fixture = setup((h) => {
        h.allowClear.set(true);
        h.value.set('iquitos');
      });
      const clear = fixture.nativeElement.querySelector(
        '.andes-tree-select__clear',
      ) as HTMLElement;
      expect(clear.getAttribute('aria-label')).toBe('Clear');
      clear.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toBeNull();
      expect(fixture.componentInstance.clears).toBe(1);
      expect(panel()).toBeNull();
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__clear'),
      ).toBeNull();
    });

    it('shows no clear button without allowClear or without a value', () => {
      const fixture = setup((h) => h.value.set('iquitos'));
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__clear'),
      ).toBeNull();
      fixture.componentInstance.allowClear.set(true);
      fixture.componentInstance.value.set(null);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__clear'),
      ).toBeNull();
    });

    it('keeps a selected label when its node leaves the data', () => {
      const fixture = setup((h) => h.value.set('iquitos'));
      fixture.componentInstance.nodes.set([{ key: 'other', title: 'Other' }]);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__value')
          .textContent,
      ).toBe('Iquitos');
    });

    it('falls back to the key for a node it has never seen', () => {
      const fixture = setup((h) => h.value.set('ghost'));
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__value')
          .textContent,
      ).toBe('ghost');
    });
  });

  describe('multiple selection and tags', () => {
    it('toggles nodes without closing and shows a tag each', () => {
      const fixture = setup((h) => {
        h.multiple.set(true);
        h.expanded.set(['lima']);
      });
      open(fixture);
      row(node('Zona A')).click();
      row(node('Zona B')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual(['lima-a', 'lima-b']);
      expect(tags(fixture)).toEqual(['Zona A', 'Zona B']);
      expect(panel()).toBeTruthy();
      expect(
        panel()
          ?.querySelector('[role="tree"]')
          ?.getAttribute('aria-multiselectable'),
      ).toBe('true');

      row(node('Zona A')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual(['lima-b']);
    });

    it('removes a tag with its button', () => {
      const fixture = setup((h) => {
        h.multiple.set(true);
        h.value.set(['lima-a', 'iquitos']);
      });
      const remove = fixture.nativeElement.querySelector(
        '.andes-tree-select__tag-remove',
      ) as HTMLElement;
      expect(remove.getAttribute('aria-label')).toBe('Remove Zona A');
      expect(remove.getAttribute('tabindex')).toBe('-1');
      remove.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual(['iquitos']);
      expect(panel()).toBeNull();
    });

    it('removes the last tag with Backspace', () => {
      const fixture = setup((h) => {
        h.multiple.set(true);
        h.value.set(['lima-a', 'iquitos']);
      });
      box(fixture).focus();
      key(box(fixture), 'Backspace');
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual(['lima-a']);
    });

    it('shows a tag-less placeholder when empty and no remove buttons when disabled', () => {
      const fixture = setup((h) => {
        h.multiple.set(true);
        h.value.set(['iquitos']);
        h.disabled.set(true);
      });
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__tag-remove'),
      ).toBeNull();
    });

    it('collapses tags past maxTagCount into a "+ N ..." tag', () => {
      const fixture = setup((h) => {
        h.multiple.set(true);
        h.value.set(['lima-a', 'lima-b', 'iquitos']);
        h.maxTagCount.set(1);
      });
      expect(tags(fixture)).toEqual(['Zona A']);
      const rest = fixture.nativeElement.querySelector(
        '[data-slot="tree-select-tag-rest"]',
      ) as HTMLElement;
      expect(rest.textContent?.trim()).toBe('+ 2 ...');
    });

    it('formats the collapsed tag with a function or a template', () => {
      const fixture = setup((h) => {
        h.multiple.set(true);
        h.value.set(['lima-a', 'lima-b', 'iquitos']);
        h.maxTagCount.set(1);
        h.maxTagPlaceholder.set(
          (omitted) => `${omitted.map((o) => o.title).join(' & ')}`,
        );
      });
      const rest = () =>
        fixture.nativeElement.querySelector(
          '[data-slot="tree-select-tag-rest"]',
        ) as HTMLElement;
      expect(rest().textContent?.trim()).toBe('Zona B & Iquitos');

      fixture.componentInstance.maxTagPlaceholder.set(
        fixture.componentInstance.restTemplate() as TemplateRef<{
          $implicit: never[];
        }>,
      );
      fixture.detectChanges();
      expect(rest().textContent?.trim()).toBe('+2 more');
    });

    it('translates the labels', () => {
      const fixture = setup((h) => {
        h.multiple.set(true);
        h.value.set(['lima-a', 'lima-b']);
        h.maxTagCount.set(0);
        h.labels.set({ more: (n: number) => `${n} más` });
      });
      expect(
        (
          fixture.nativeElement.querySelector(
            '[data-slot="tree-select-tag-rest"]',
          ) as HTMLElement
        ).textContent?.trim(),
      ).toBe('2 más');
    });
  });

  describe('checkable selection', () => {
    function checkable(strategy?: AndesTreeCheckedStrategy) {
      return (h: HostComponent) => {
        h.checkable.set(true);
        h.expanded.set(['lima', 'cusco']);
        if (strategy) {
          h.strategy.set(strategy);
        }
      };
    }

    it('shows checkboxes, cascades and reports leaf keys by default', () => {
      const fixture = setup(checkable());
      open(fixture);
      expect(
        panel()
          ?.querySelector('[role="tree"]')
          ?.getAttribute('aria-multiselectable'),
      ).toBe('true');
      checkbox(node('Cusco')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual(['cusco-a']);
      expect(tags(fixture)).toEqual(['Zona A Cusco']);
      expect(node('Cusco').getAttribute('aria-checked')).toBe('true');
      expect(panel()).toBeTruthy();
    });

    it('reports the topmost checked nodes with the parent strategy', () => {
      const fixture = setup(checkable('parent'));
      open(fixture);
      checkbox(node('Cusco')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual(['cusco']);
      expect(tags(fixture)).toEqual(['Cusco']);
    });

    it('reports every checked node with the all strategy', () => {
      const fixture = setup(checkable('all'));
      open(fixture);
      checkbox(node('Cusco')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual(['cusco', 'cusco-a']);
    });

    it('applies the strategy to a value the consumer set', () => {
      const fixture = setup((h) => {
        checkable('parent')(h);
        h.value.set(['cusco', 'cusco-a', 'iquitos']);
      });
      expect(tags(fixture)).toEqual(['Cusco', 'Iquitos']);
    });

    it('shows the checked state in the panel from the value', () => {
      const fixture = setup((h) => {
        checkable()(h);
        h.value.set(['lima-a']);
      });
      open(fixture);
      expect(node('Zona A').getAttribute('aria-checked')).toBe('true');
      expect(node('Lima').getAttribute('aria-checked')).toBe('mixed');
    });

    it('unchecks a node and its subtree when its tag is removed', () => {
      const fixture = setup((h) => {
        checkable('parent')(h);
        h.value.set(['lima']);
      });
      // Zona C is disabled and stays out of the cascade: `lima` still stands for the others.
      expect(tags(fixture)).toEqual(['Lima']);
      (
        fixture.nativeElement.querySelector(
          '.andes-tree-select__tag-remove',
        ) as HTMLElement
      ).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual([]);
    });

    it('removes just one leaf when a leaf tag is removed', () => {
      const fixture = setup((h) => {
        checkable('child')(h);
        h.value.set(['lima-a', 'lima-b']);
      });
      (
        fixture.nativeElement.querySelector(
          '.andes-tree-select__tag-remove',
        ) as HTMLElement
      ).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual(['lima-b']);
    });

    it('makes nodes independent with checkStrictly', () => {
      const fixture = setup((h) => {
        checkable()(h);
        h.checkStrictly.set(true);
      });
      open(fixture);
      checkbox(node('Cusco')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual(['cusco']);
      expect(node('Zona A Cusco').getAttribute('aria-checked')).toBe('false');
    });

    it('keeps keys whose nodes are not loaded yet', () => {
      const fixture = setup((h) => {
        checkable()(h);
        h.value.set(['not-loaded']);
      });
      open(fixture);
      checkbox(node('Iquitos')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toEqual([
        'iquitos',
        'not-loaded',
      ]);
    });
  });

  describe('search', () => {
    it('adds a search box to the panel that filters the tree and focuses first', () => {
      const fixture = setup((h) => h.showSearch.set(true));
      open(fixture);
      const search = panel()?.querySelector(
        '.andes-tree-select__search-input',
      ) as HTMLInputElement;
      expect(search).toBeTruthy();
      expect(search.getAttribute('aria-label')).toBe('Search the options');
      type(search, 'cusco');
      fixture.detectChanges();
      expect(fixture.componentInstance.searches).toEqual(['cusco']);
      const titles = [
        ...(panel() as HTMLElement).querySelectorAll('.andes-tree__title'),
      ].map((t) => t.textContent?.trim());
      expect(titles).toEqual(['Cusco', 'Zona A Cusco']);
    });

    it('moves to the tree with ArrowDown from the search box', () => {
      const fixture = setup((h) => h.showSearch.set(true));
      open(fixture);
      const search = panel()?.querySelector(
        '.andes-tree-select__search-input',
      ) as HTMLInputElement;
      key(search, 'ArrowDown');
      expect(document.activeElement?.getAttribute('role')).toBe('treeitem');
    });

    it('clears the search when the panel closes', () => {
      const fixture = setup((h) => h.showSearch.set(true));
      open(fixture);
      type(
        panel()?.querySelector(
          '.andes-tree-select__search-input',
        ) as HTMLInputElement,
        'iq',
      );
      fixture.detectChanges();
      box(fixture).click();
      fixture.detectChanges();
      expect(
        (fixture.componentInstance.select() as AndesTreeSelect).searchValue(),
      ).toBe('');
      open(fixture);
      expect(
        (
          panel()?.querySelector(
            '.andes-tree-select__search-input',
          ) as HTMLInputElement
        ).value,
      ).toBe('');
    });

    it('shows the empty state when nothing matches', () => {
      const fixture = setup((h) => h.showSearch.set(true));
      open(fixture);
      type(
        panel()?.querySelector(
          '.andes-tree-select__search-input',
        ) as HTMLInputElement,
        'zzz',
      );
      fixture.detectChanges();
      expect(
        panel()?.querySelector('.andes-tree__empty')?.textContent,
      ).toContain('No data');
    });

    describe('in the field', () => {
      function inField(configure?: (h: HostComponent) => void) {
        return setup((h) => {
          h.showSearch.set(true);
          h.searchPlacement.set('trigger');
          configure?.(h);
        });
      }

      it('makes the input the combobox and the box only the frame', () => {
        const fixture = inField();
        expect(box(fixture).hasAttribute('role')).toBe(false);
        expect(box(fixture).hasAttribute('tabindex')).toBe(false);
        expect(input(fixture).getAttribute('role')).toBe('combobox');
        expect(input(fixture).getAttribute('aria-haspopup')).toBe('tree');
        expect(input(fixture).id).toBe('region');
        expect(input(fixture).getAttribute('aria-label')).toBe('Region');
        expect(input(fixture).getAttribute('name')).toBe('region');
        expect(input(fixture).getAttribute('placeholder')).toBe(
          'Pick a region',
        );
      });

      it('opens when typing and filters the tree without a search box in the panel', () => {
        const fixture = inField();
        input(fixture).focus();
        type(input(fixture), 'iqu');
        fixture.detectChanges();
        expect(panel()).toBeTruthy();
        expect(
          panel()?.querySelector('.andes-tree-select__search-input'),
        ).toBeNull();
        expect(
          [
            ...(panel() as HTMLElement).querySelectorAll('.andes-tree__title'),
          ].map((t) => t.textContent?.trim()),
        ).toEqual(['Iquitos']);
      });

      it('opens on click and with ArrowDown, then moves into the tree', () => {
        const fixture = inField();
        input(fixture).focus();
        key(input(fixture), 'ArrowDown');
        fixture.detectChanges();
        expect(panel()).toBeTruthy();
        key(input(fixture), 'ArrowDown');
        expect(document.activeElement?.getAttribute('role')).toBe('treeitem');
      });

      it('keeps space and enter for the text', () => {
        const fixture = inField();
        const space = new KeyboardEvent('keydown', {
          key: ' ',
          bubbles: true,
          cancelable: true,
        });
        input(fixture).dispatchEvent(space);
        expect(space.defaultPrevented).toBe(false);
        expect(panel()).toBeNull();
      });

      it('shows the selected label behind the input and hides it while typing', () => {
        const fixture = inField((h) => h.value.set('iquitos'));
        const value = () =>
          fixture.nativeElement.querySelector(
            '.andes-tree-select__value',
          ) as HTMLElement;
        expect(value().textContent).toBe('Iquitos');
        expect(value().hasAttribute('data-hidden')).toBe(false);
        expect(input(fixture).hasAttribute('placeholder')).toBe(false);
        type(input(fixture), 'c');
        fixture.detectChanges();
        expect(value().hasAttribute('data-hidden')).toBe(true);
      });

      it('puts the input after the tags in a multiple select', () => {
        const fixture = inField((h) => {
          h.multiple.set(true);
          h.value.set(['iquitos']);
        });
        const selection = fixture.nativeElement.querySelector(
          '.andes-tree-select__selection',
        ) as HTMLElement;
        expect(selection.lastElementChild).toBe(input(fixture));
        expect(tags(fixture)).toEqual(['Iquitos']);
      });

      it('returns focus to the input after picking', () => {
        const fixture = inField();
        input(fixture).focus();
        type(input(fixture), 'iq');
        fixture.detectChanges();
        row(node('Iquitos')).click();
        fixture.detectChanges();
        expect(fixture.componentInstance.value()).toBe('iquitos');
        expect(document.activeElement).toBe(input(fixture));
      });
    });
  });

  describe('data', () => {
    it('opens every branch the first time options arrive with treeDefaultExpandAll', () => {
      const fixture = setup((h) => h.defaultExpandAll.set(true));
      expect(fixture.componentInstance.expanded()).toEqual(['lima', 'cusco']);
      open(fixture);
      expect(node('Zona A').getAttribute('aria-level')).toBe('2');
    });

    it('keeps the open branches between openings', () => {
      const fixture = setup();
      open(fixture);
      switcher(node('Lima')).click();
      fixture.detectChanges();
      box(fixture).click();
      fixture.detectChanges();
      open(fixture);
      expect(node('Lima').getAttribute('aria-expanded')).toBe('true');
    });

    it('reads renamed fields', () => {
      const fixture = setup((h) => {
        h.fieldNames.set({ key: 'id', title: 'name', children: 'items' });
        h.nodes.set([
          { id: 1, name: 'Raíz', items: [{ id: 2, name: 'Hoja' }] },
        ] as AndesTreeNode[]);
        h.value.set(2);
      });
      expect(
        fixture.nativeElement.querySelector('.andes-tree-select__value')
          .textContent,
      ).toBe('Hoja');
      open(fixture);
      expect(node('Hoja').getAttribute('aria-selected')).toBe('true');
    });

    it('loads children on demand through the panel', async () => {
      const fixture = setup((h) => {
        h.nodes.set([{ key: 'root', title: 'Servidor' }]);
        h.loadData.set(async (loaded: AndesTreeNode) => {
          h.nodes.update((nodes) =>
            nodes.map((n) =>
              n.key === loaded.key
                ? { ...n, children: [{ key: 'kid', title: 'Hijo' }] }
                : n,
            ),
          );
        });
      });
      open(fixture);
      switcher(node('Servidor')).click();
      await fixture.whenStable();
      fixture.detectChanges();
      row(node('Hijo')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.value()).toBe('kid');
    });

    it('shows the loading state in the panel while there are no options yet', () => {
      const fixture = setup((h) => {
        h.nodes.set([]);
        h.loading.set(true);
        h.labels.set({ loading: 'Cargando' });
      });
      open(fixture);
      expect(
        panel()?.querySelector('.andes-tree__empty')?.textContent,
      ).toContain('Cargando');
    });

    it('shows a translated empty state', () => {
      const fixture = setup((h) => {
        h.nodes.set([]);
        h.labels.set({ empty: 'Sin datos' });
      });
      open(fixture);
      expect(
        panel()?.querySelector('.andes-tree__empty')?.textContent,
      ).toContain('Sin datos');
    });

    it('draws custom node content in the panel', () => {
      const fixture = setup((h) => h.customNode.set(true));
      open(fixture);
      expect(panel()?.querySelector('.custom')?.textContent).toBe('Lima');
    });
  });

  describe('forms', () => {
    function formFixture(configure?: (h: HostComponent) => void) {
      return setup((h) => {
        h.useForm.set(true);
        configure?.(h);
      });
    }

    it('writes the control value to the field', () => {
      const fixture = formFixture();
      fixture.componentInstance.control.setValue('iquitos');
      fixture.detectChanges();
      expect(box(fixture).textContent).toContain('Iquitos');
    });

    it('updates the control when the user picks', () => {
      const fixture = formFixture();
      open(fixture);
      row(node('Iquitos')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.control.value).toBe('iquitos');
      expect(fixture.componentInstance.control.dirty).toBe(true);
    });

    it('updates the control with an array for a multiple select', () => {
      const fixture = formFixture((h) => h.multiple.set(true));
      open(fixture);
      row(node('Iquitos')).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.control.value).toEqual(['iquitos']);
    });

    it('writes null as empty, and an array in a multiple select', () => {
      const fixture = formFixture((h) => h.multiple.set(true));
      fixture.componentInstance.control.setValue(['iquitos']);
      fixture.detectChanges();
      expect(tags(fixture)).toEqual(['Iquitos']);
      fixture.componentInstance.control.setValue(null);
      fixture.detectChanges();
      expect(tags(fixture)).toEqual([]);
    });

    it('disables from the control and closes an open panel', () => {
      const fixture = formFixture();
      open(fixture);
      fixture.componentInstance.control.disable();
      fixture.detectChanges();
      expect(panel()).toBeNull();
      expect(box(fixture).getAttribute('aria-disabled')).toBe('true');
    });

    it('marks the control touched when the panel closes and when the field blurs closed', () => {
      const fixture = formFixture();
      open(fixture);
      box(fixture).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.control.touched).toBe(true);

      fixture.componentInstance.control.markAsUntouched();
      box(fixture).dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
      );
      expect(fixture.componentInstance.control.touched).toBe(true);
    });

    it('does not mark touched when focus only moves into the panel', () => {
      const fixture = formFixture();
      open(fixture);
      const item = panel()?.querySelector('[role="treeitem"]') as HTMLElement;
      box(fixture).dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: item }),
      );
      expect(fixture.componentInstance.control.touched).toBe(false);
    });

    it('honours a required validator', () => {
      const fixture = formFixture();
      fixture.componentInstance.control.addValidators(Validators.required);
      fixture.componentInstance.control.updateValueAndValidity();
      expect(fixture.componentInstance.control.invalid).toBe(true);
      fixture.componentInstance.control.setValue('iquitos');
      expect(fixture.componentInstance.control.valid).toBe(true);
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(join(__dirname, 'tree-select.css'), 'utf8');

    it('draws focus as one border and one 2px ring, with no outline ring', () => {
      expect(css).toMatch(
        /\.andes-tree-select__trigger:focus-within,[^{]*\{\s*border-color: var\(--_status-border, var\(--andes-color-primary, #2563eb\)\);\s*box-shadow: 0 0 0 2px var\(--_ring\);/,
      );
      expect(css).toContain('outline: none;');
    });

    it('sizes the field 24, 32 and 40px with literal fallbacks', () => {
      expect(css).toContain('var(--andes-control-height-sm, 1.5rem)');
      expect(css).toContain('var(--andes-control-height-md, 2rem)');
      expect(css).toContain('var(--andes-control-height-lg, 2.5rem)');
    });

    it('covers every variant and status', () => {
      for (const variant of ['filled', 'borderless', 'underlined']) {
        expect(css).toContain(`[data-variant='${variant}']`);
      }
      expect(css).toContain("[data-status='warning']");
      expect(css).toContain("[data-status='error']");
      expect(css).toContain('[data-invalid]');
    });

    it('exits the panel in 100-120ms with ease-in when the overlay marks it closing', () => {
      expect(css).toMatch(
        /\.andes-tree-select__panel\[data-andes-closing\]\s*\{[^}]*animation: andes-tree-select-panel-exit\s+var\(--andes-motion-duration-fast, 120ms\)\s+var\(--andes-motion-ease-in, ease-in\) forwards/,
      );
      expect(css).toMatch(
        /@keyframes andes-tree-select-panel-exit[^}]*\}[^}]*opacity: 0;\s*transform: scale\(0\.97\)/,
      );
    });

    it('enters the panel in 150ms from 97% scale and only when motion is allowed', () => {
      const motion = css.slice(
        css.indexOf('@media (prefers-reduced-motion: no-preference)'),
      );
      expect(motion).toMatch(
        /andes-tree-select-panel-enter\s+var\(--andes-motion-duration-mid, 150ms\)/,
      );
      expect(motion).toContain('andes-tree-select-panel-exit');
      const before = css.slice(
        0,
        css.indexOf('@media (prefers-reduced-motion: no-preference)'),
      );
      expect(before).not.toMatch(/animation: andes-tree-select-panel/);
      expect(css).not.toMatch(/scale\(0\.[0-8]/);
    });

    it('sets the font on the panel root, which renders outside the host', () => {
      expect(css).toMatch(
        /\.andes-tree-select__panel\s*\{[^}]*font-family: var\(--andes-font-family\), sans-serif/,
      );
    });

    it('never continues a selector on a new line that starts with a combinator', () => {
      expect(css).not.toMatch(/^\s*[>+~]\s/m);
    });

    it('uses logical properties only', () => {
      expect(css).not.toMatch(/(^|[\s;{])(margin|padding)-(left|right)\s*:/);
      expect(css).not.toMatch(/(^|[\s;{])(left|right)\s*:/);
    });
  });

  it('is exported from the package entry point', async () => {
    const barrel = await import('../../index');
    expect(barrel.AndesTreeSelect).toBe(AndesTreeSelect);
  });
});
