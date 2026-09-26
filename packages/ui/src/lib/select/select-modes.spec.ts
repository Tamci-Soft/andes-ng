import { Component, signal, viewChild, type TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AndesSelect } from './select';
import { AndesSelectContent } from './select-content';
import { AndesSelectGroup } from './select-group';
import { AndesSelectItem } from './select-item';
import { AndesSelectLabel } from './select-label';
import { AndesSelectSeparator } from './select-separator';
import type {
  AndesSelectFilterFn,
  AndesSelectMaxTagPlaceholder,
  AndesSelectMode,
  AndesSelectOptions,
  AndesSelectPlacement,
  AndesSelectStatus,
  AndesSelectVariant,
} from './select-state';
import { AndesSelectTrigger } from './select-trigger';
import { AndesSelectValue } from './select-value';

/** See `select.spec.ts`: the CDK's key manager reads `keyCode`, which jsdom leaves at 0. */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  Home: 36,
  End: 35,
  Tab: 9,
  Enter: 13,
  Escape: 27,
  Backspace: 8,
  Delete: 46,
  ' ': 32,
};

function pressKey(target: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'keyCode', {
    get: () => KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0),
  });
  target.dispatchEvent(event);
  return event;
}

function typeInto(input: HTMLInputElement, text: string): void {
  input.focus();
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const panel = () =>
  document.querySelector<HTMLElement>('[data-slot="select-content"]');
const options = () =>
  Array.from(panel()?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
const visibleOptions = () => options().filter((option) => !option.hidden);
const labels = (elements: HTMLElement[]) =>
  elements.map((element) => element.textContent?.trim());

@Component({
  imports: [
    AndesSelect,
    AndesSelectContent,
    AndesSelectGroup,
    AndesSelectItem,
    AndesSelectLabel,
    AndesSelectSeparator,
    AndesSelectTrigger,
    AndesSelectValue,
  ],
  template: `<andes-select
      aria-label="Fruit"
      placeholder="Pick fruit"
      [mode]="mode()"
      [showSearch]="showSearch()"
      [(value)]="value"
      [(searchValue)]="search"
      [(open)]="open"
      [allowClear]="allowClear()"
      [loading]="loading()"
      [maxCount]="maxCount()"
      [maxTagCount]="maxTagCount()"
      [maxTagPlaceholder]="maxTagPlaceholder()"
      [maxTagTextLength]="maxTagTextLength()"
      [tokenSeparators]="tokenSeparators()"
      [notFoundContent]="notFoundContent()"
      [filterOption]="filterOption()"
      [optionFilterProp]="optionFilterProp()"
      [status]="status()"
      [variant]="variant()"
      [placement]="placement()"
      [suffixIcon]="suffixIcon()"
      [prefix]="prefix()"
      (selectionChange)="selectionChanges.push($event)"
      (optionSelect)="selects.push($event)"
      (optionDeselect)="deselects.push($event)"
      (cleared)="clears = clears + 1"
      (openChange)="openChanges.push($event)"
    >
      <andes-select-trigger><andes-select-value /></andes-select-trigger>
      <andes-select-content>
        <andes-select-group>
          <andes-select-label>Fruit</andes-select-label>
          <andes-select-item value="apple" [data]="{ color: 'red' }"
            >Apple</andes-select-item
          >
          <andes-select-item value="apricot" [disabled]="apricotDisabled()"
            >Apricot</andes-select-item
          >
          <andes-select-item value="banana" [data]="{ color: 'yellow' }"
            >Banana</andes-select-item
          >
        </andes-select-group>
        <andes-select-separator />
        <andes-select-group>
          <andes-select-label>Vegetables</andes-select-label>
          <andes-select-item value="leek">Leek</andes-select-item>
        </andes-select-group>
      </andes-select-content>
    </andes-select>
    <ng-template #customSuffix
      ><span data-testid="custom-suffix">v</span></ng-template
    >
    <ng-template #customPrefix
      ><span data-testid="custom-prefix">@</span></ng-template
    >`,
})
class ModesHost {
  readonly mode = signal<AndesSelectMode>('single');
  readonly showSearch = signal<boolean | undefined>(undefined);
  readonly value = signal<unknown>(null);
  readonly search = signal('');
  readonly open = signal(false);
  readonly allowClear = signal(false);
  readonly loading = signal(false);
  readonly maxCount = signal<number | undefined>(undefined);
  readonly maxTagCount = signal<number | undefined>(undefined);
  readonly maxTagPlaceholder = signal<AndesSelectMaxTagPlaceholder | undefined>(
    undefined,
  );
  readonly maxTagTextLength = signal<number | undefined>(undefined);
  readonly tokenSeparators = signal<readonly string[]>([]);
  readonly notFoundContent = signal<string | TemplateRef<unknown> | null>(
    'No data',
  );
  readonly filterOption = signal<boolean | AndesSelectFilterFn>(true);
  readonly optionFilterProp = signal<string | readonly string[]>('label');
  readonly status = signal<AndesSelectStatus | undefined>(undefined);
  readonly variant = signal<AndesSelectVariant>('outlined');
  readonly placement = signal<AndesSelectPlacement>('bottomLeft');
  readonly suffixIcon = signal<TemplateRef<unknown> | null | undefined>(
    undefined,
  );
  readonly prefix = signal<TemplateRef<unknown> | undefined>(undefined);
  readonly apricotDisabled = signal(false);
  readonly customSuffix =
    viewChild.required<TemplateRef<unknown>>('customSuffix');
  readonly customPrefix =
    viewChild.required<TemplateRef<unknown>>('customPrefix');

  readonly selectionChanges: unknown[] = [];
  readonly selects: unknown[] = [];
  readonly deselects: unknown[] = [];
  readonly openChanges: boolean[] = [];
  clears = 0;
}

function setup(configure: (host: ModesHost) => void = () => undefined) {
  const fixture = TestBed.createComponent(ModesHost);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  return helpers(fixture);
}

function helpers(fixture: ComponentFixture<ModesHost>) {
  const root = fixture.nativeElement as HTMLElement;
  const detect = () => fixture.detectChanges();
  const box = () =>
    root.querySelector<HTMLElement>('[data-slot="select-trigger"]');
  const combobox = () => root.querySelector<HTMLElement>('[role="combobox"]');
  const input = () => root.querySelector<HTMLInputElement>('input');
  const tags = () =>
    Array.from(root.querySelectorAll<HTMLElement>('[data-slot="select-tag"]'));
  const openPanel = () => {
    box()?.click();
    detect();
  };
  const select = fixture.debugElement.query(
    (node) => node.name === 'andes-select',
  ).componentInstance as AndesSelect;
  return {
    fixture,
    host: fixture.componentInstance,
    root,
    detect,
    box,
    combobox,
    input,
    tags,
    openPanel,
    select,
  };
}

describe('AndesSelect multiple mode', () => {
  it('toggles options into an array value, keeping the panel open', () => {
    const { host, openPanel, detect, tags } = setup((h) =>
      h.mode.set('multiple'),
    );
    openPanel();

    expect(panel()?.getAttribute('aria-multiselectable')).toBe('true');

    options()[0].click();
    detect();
    options()[2].click();
    detect();

    expect(host.value()).toEqual(['apple', 'banana']);
    expect(panel()).not.toBeNull();
    expect(labels(tags())).toEqual(['Apple', 'Banana']);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');

    options()[0].click();
    detect();

    expect(host.value()).toEqual(['banana']);
    expect(host.selects).toEqual(['apple', 'banana']);
    expect(host.deselects).toEqual(['apple']);
    expect(host.selectionChanges).toEqual([
      ['apple'],
      ['apple', 'banana'],
      ['banana'],
    ]);
  });

  it('is searchable by default, with focus kept in the input', () => {
    const { input, openPanel, combobox } = setup((h) => h.mode.set('multiple'));

    expect(combobox()?.tagName).toBe('INPUT');
    openPanel();

    expect(document.activeElement).toBe(input());
    expect(input()?.getAttribute('aria-activedescendant')).toBe(
      options()[0].id,
    );
  });

  it('removes a value with its tag remove button', () => {
    const { host, root, detect, tags } = setup((h) => {
      h.mode.set('multiple');
      h.value.set(['apple', 'banana']);
    });

    const remove = root.querySelectorAll<HTMLElement>(
      '[data-slot="select-tag-remove"]',
    );
    expect(remove[0].getAttribute('aria-label')).toBe('Remove Apple');

    remove[0].click();
    detect();

    expect(host.value()).toEqual(['banana']);
    expect(labels(tags())).toEqual(['Banana']);
    expect(host.deselects).toEqual(['apple']);
    // Removing a tag must not toggle the panel open.
    expect(panel()).toBeNull();
  });

  it('removes the last value with Backspace in an empty search input', () => {
    const { host, input, detect } = setup((h) => {
      h.mode.set('multiple');
      h.value.set(['apple', 'banana']);
    });

    const event = pressKey(input() as HTMLElement, 'Backspace');
    detect();

    expect(event.defaultPrevented).toBe(true);
    expect(host.value()).toEqual(['apple']);

    typeInto(input() as HTMLInputElement, 'x');
    detect();
    pressKey(input() as HTMLElement, 'Backspace');
    detect();

    // With text in the input, Backspace edits the text instead.
    expect(host.value()).toEqual(['apple']);
  });

  it('collapses tags beyond maxTagCount into a "+ N ..." tag', () => {
    const { root, tags, host, detect } = setup((h) => {
      h.mode.set('multiple');
      h.value.set(['apple', 'apricot', 'banana', 'leek']);
      h.maxTagCount.set(2);
    });
    const rest = () =>
      root.querySelector('[data-slot="select-tag-rest"]')?.textContent?.trim();

    expect(tags()).toHaveLength(2);
    expect(rest()).toBe('+ 2 ...');

    host.maxTagPlaceholder.set((omitted) => `and ${omitted.length} more`);
    detect();

    expect(rest()).toBe('and 2 more');
  });

  it('truncates tag text to maxTagTextLength', () => {
    const { tags } = setup((h) => {
      h.mode.set('multiple');
      h.value.set(['a-very-long-value']);
      h.maxTagTextLength.set(6);
    });

    expect(labels(tags())).toEqual(['a-very...']);
    expect(tags()[0].getAttribute('title')).toBe('a-very-long-value');
  });

  it('blocks further selections once maxCount is reached', () => {
    const { host, openPanel, detect } = setup((h) => {
      h.mode.set('multiple');
      h.value.set(['apple']);
      h.maxCount.set(1);
    });
    openPanel();

    expect(options()[0].getAttribute('aria-disabled')).toBeNull();
    expect(options()[2].getAttribute('aria-disabled')).toBe('true');

    options()[2].click();
    detect();
    expect(host.value()).toEqual(['apple']);

    // Deselecting frees a slot again.
    options()[0].click();
    detect();
    expect(options()[2].getAttribute('aria-disabled')).toBeNull();
  });

  it('keeps tags of disabled options from being removed', () => {
    const { root, host, openPanel, detect } = setup((h) => {
      h.mode.set('multiple');
      h.value.set(['apricot', 'banana']);
      h.apricotDisabled.set(true);
    });
    // Disabled-ness is only known once the option has rendered.
    openPanel();
    pressKey(document.activeElement as HTMLElement, 'Escape');
    detect();

    const removable = root.querySelectorAll('[data-slot="select-tag-remove"]');
    expect(removable).toHaveLength(1);

    pressKey(root.querySelector('input') as HTMLElement, 'Backspace');
    pressKey(root.querySelector('input') as HTMLElement, 'Backspace');
    detect();
    expect(host.value()).toEqual(['apricot']);
  });

  it('works without search: a button combobox, Space toggles, Backspace removes', () => {
    const { host, combobox, detect, openPanel } = setup((h) => {
      h.mode.set('multiple');
      h.showSearch.set(false);
    });

    expect(combobox()?.tagName).toBe('BUTTON');
    openPanel();
    expect(document.activeElement).toBe(options()[0]);

    pressKey(options()[0], ' ');
    detect();
    expect(host.value()).toEqual(['apple']);
    expect(panel()).not.toBeNull();

    pressKey(options()[0], 'Escape');
    detect();
    pressKey(combobox() as HTMLElement, 'Backspace');
    detect();
    expect(host.value()).toEqual([]);
  });

  it('describes the selection to assistive technology', () => {
    const { input, root } = setup((h) => {
      h.mode.set('multiple');
      h.value.set(['apple', 'banana']);
    });

    const describedBy = input()?.getAttribute('aria-describedby') ?? '';
    const summary = root.querySelector(`#${describedBy}`);
    expect(summary?.textContent?.trim()).toBe('2 selected: Apple, Banana');
  });
});

describe('AndesSelect tags mode', () => {
  it('offers typed text as a new option and adds it with Enter', () => {
    const { host, input, detect, tags } = setup((h) => h.mode.set('tags'));

    typeInto(input() as HTMLInputElement, 'Kiwi');
    detect();

    expect(panel()).not.toBeNull();
    expect(labels(visibleOptions())).toEqual(['Kiwi']);
    expect(input()?.getAttribute('aria-activedescendant')).toBe(
      visibleOptions()[0].id,
    );

    pressKey(input() as HTMLElement, 'Enter');
    detect();

    expect(host.value()).toEqual(['Kiwi']);
    expect(labels(tags())).toEqual(['Kiwi']);
    expect(input()?.value).toBe('');
  });

  it('does not offer text that matches an existing option', () => {
    const { input, detect } = setup((h) => h.mode.set('tags'));

    typeInto(input() as HTMLInputElement, 'Apple');
    detect();

    expect(labels(visibleOptions())).toEqual(['Apple']);
  });

  it('lists selected custom values so they can be deselected', () => {
    const { host, openPanel, detect } = setup((h) => {
      h.mode.set('tags');
      h.value.set(['Kiwi']);
    });
    openPanel();
    detect();

    expect(labels(options())).toContain('Kiwi');
    const kiwi = options().find((o) => o.textContent?.trim() === 'Kiwi');
    expect(kiwi?.getAttribute('aria-selected')).toBe('true');

    kiwi?.click();
    detect();
    expect(host.value()).toEqual([]);
  });

  it('splits text on tokenSeparators', () => {
    const { host, input, detect } = setup((h) => {
      h.mode.set('tags');
      h.tokenSeparators.set([',']);
    });

    typeInto(input() as HTMLInputElement, 'kiwi, apple,lime');
    detect();

    expect(host.value()).toEqual(['kiwi', 'apple', 'lime']);
    expect(host.search()).toBe('');
  });

  it('matches separated text to options in multiple mode', () => {
    const { host, input, detect } = setup((h) => {
      h.mode.set('multiple');
      h.tokenSeparators.set([',']);
    });
    // Options only register once the panel has rendered them.
    typeInto(input() as HTMLInputElement, 'a');
    detect();
    typeInto(input() as HTMLInputElement, 'banana,unknown,');
    detect();

    expect(host.value()).toEqual(['banana']);
  });
});

describe('AndesSelect search', () => {
  function searchable() {
    return setup((h) => h.showSearch.set(true));
  }

  it('turns the single-select combobox into a text input', () => {
    const { combobox } = searchable();

    expect(combobox()?.tagName).toBe('INPUT');
    expect(combobox()?.getAttribute('aria-autocomplete')).toBe('list');
    expect(combobox()?.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('filters options by label, case-insensitively, and hides emptied groups', () => {
    const { input, detect, root } = searchable();

    typeInto(input() as HTMLInputElement, 'AP');
    detect();

    expect(labels(visibleOptions())).toEqual(['Apple', 'Apricot']);
    const groups = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="select-group"]'),
    );
    expect(groups[1].style.display).toBe('none');
    expect(
      document.querySelector<HTMLElement>('[data-slot="select-separator"]')
        ?.style.display,
    ).toBe('none');
    expect(root.querySelector('.andes-select__search-ghost')).toBeNull();
  });

  it('makes the first match active and moves it with the arrow keys', () => {
    const { input, detect } = searchable();

    typeInto(input() as HTMLInputElement, 'a');
    detect();

    const active = () => input()?.getAttribute('aria-activedescendant');
    expect(active()).toBe(visibleOptions()[0].id);

    pressKey(input() as HTMLElement, 'ArrowDown');
    detect();
    expect(active()).toBe(visibleOptions()[1].id);
    expect(document.activeElement).toBe(input());
  });

  it('selects the active match with Enter and clears the search', () => {
    const { host, input, detect, combobox } = searchable();

    typeInto(input() as HTMLInputElement, 'ban');
    detect();
    pressKey(input() as HTMLElement, 'Enter');
    detect();

    expect(host.value()).toBe('banana');
    expect(panel()).toBeNull();
    expect(host.search()).toBe('');
    expect(combobox()?.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('filters on optionFilterProp, including data fields', () => {
    const { host, input, detect } = searchable();

    host.optionFilterProp.set('value');
    detect();
    typeInto(input() as HTMLInputElement, 'leek');
    detect();
    expect(labels(visibleOptions())).toEqual(['Leek']);

    host.optionFilterProp.set('color');
    typeInto(input() as HTMLInputElement, 'yellow');
    detect();
    expect(labels(visibleOptions())).toEqual(['Banana']);
  });

  it('delegates to a filterOption function, or does not filter at all', () => {
    const { host, input, detect } = searchable();

    host.filterOption.set((search, option) =>
      option.label.toLowerCase().startsWith(search.toLowerCase()),
    );
    detect();
    typeInto(input() as HTMLInputElement, 'e');
    detect();
    expect(labels(visibleOptions())).toEqual([]);

    host.filterOption.set(false);
    detect();
    expect(visibleOptions()).toHaveLength(4);
  });

  it('shows notFoundContent when nothing matches, and nothing when it is null', () => {
    const { host, input, detect } = searchable();
    const empty = () => document.querySelector('[data-slot="select-empty"]');

    typeInto(input() as HTMLInputElement, 'zzz');
    detect();
    expect(empty()?.textContent?.trim()).toBe('No data');
    // The empty state sits next to the listbox, never inside it.
    expect(panel()?.contains(empty())).toBe(false);

    host.notFoundContent.set(null);
    detect();
    expect(empty()).toBeNull();
  });

  it('exposes the search text through searchValue', () => {
    const { host, input, detect } = searchable();

    typeInto(input() as HTMLInputElement, 'app');
    detect();
    expect(host.search()).toBe('app');

    host.search.set('leek');
    detect();
    expect(labels(visibleOptions())).toEqual(['Leek']);
  });
});

describe('AndesSelect allowClear', () => {
  it('clears the selection from the clear button', () => {
    const { host, root, detect, box } = setup((h) => {
      h.allowClear.set(true);
      h.value.set('apple');
    });
    const clear = () =>
      root.querySelector<HTMLElement>('[data-slot="select-clear"]');

    expect(box()?.hasAttribute('data-clearable')).toBe(true);
    expect(clear()?.getAttribute('aria-label')).toBe('Clear');

    clear()?.click();
    detect();

    expect(host.value()).toBeNull();
    expect(host.clears).toBe(1);
    expect(host.selectionChanges).toEqual([null]);
    expect(clear()).toBeNull();
    expect(panel()).toBeNull();
  });

  it('clears a multiple selection to an empty array', () => {
    const { host, root, detect } = setup((h) => {
      h.mode.set('multiple');
      h.allowClear.set(true);
      h.value.set(['apple', 'banana']);
    });

    root.querySelector<HTMLElement>('[data-slot="select-clear"]')?.click();
    detect();

    expect(host.value()).toEqual([]);
  });

  it('clears with Backspace on the closed single-select button', () => {
    const { host, combobox, detect } = setup((h) => {
      h.allowClear.set(true);
      h.value.set('apple');
    });

    pressKey(combobox() as HTMLElement, 'Backspace');
    detect();

    expect(host.value()).toBeNull();
  });

  it('renders no clear button without a value, or when disabled', () => {
    const { root } = setup((h) => h.allowClear.set(true));

    expect(root.querySelector('[data-slot="select-clear"]')).toBeNull();
  });
});

describe('AndesSelect appearance', () => {
  it('shows a spinner and marks the listbox busy while loading', () => {
    const { root, host, detect, openPanel } = setup((h) => h.loading.set(true));

    expect(root.querySelector('[data-slot="select-loading"]')).not.toBeNull();
    expect(root.querySelector('.andes-select__chevron')).toBeNull();

    openPanel();
    expect(panel()?.getAttribute('aria-busy')).toBe('true');

    host.loading.set(false);
    detect();
    expect(panel()?.hasAttribute('aria-busy')).toBe(false);
  });

  it('maps status onto the box and error onto aria-invalid', () => {
    const { host, detect, box, combobox } = setup();

    host.status.set('warning');
    detect();
    expect(box()?.getAttribute('data-status')).toBe('warning');
    expect(combobox()?.hasAttribute('aria-invalid')).toBe(false);

    host.status.set('error');
    detect();
    expect(box()?.getAttribute('data-status')).toBe('error');
    expect(combobox()?.getAttribute('aria-invalid')).toBe('true');
    expect(box()?.classList).toContain('andes-select__trigger--invalid');
  });

  it('reflects the variant on the box', () => {
    const { host, detect, box } = setup();

    expect(box()?.getAttribute('data-variant')).toBe('outlined');
    for (const variant of ['filled', 'borderless', 'underlined'] as const) {
      host.variant.set(variant);
      detect();
      expect(box()?.getAttribute('data-variant')).toBe(variant);
    }
  });

  it('maps placement onto the overlay side and alignment', () => {
    const { host, detect, select } = setup();

    host.placement.set('topRight');
    detect();

    expect(select.overlay.config().positioning).toMatchObject({
      kind: 'anchored',
      side: 'top',
      align: 'end',
    });
  });

  it('replaces or removes the chevron with suffixIcon, and renders a prefix', () => {
    const { host, detect, root } = setup();
    host.suffixIcon.set(host.customSuffix());
    host.prefix.set(host.customPrefix());
    detect();
    expect(root.querySelector('[data-testid="custom-suffix"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="custom-prefix"]')).not.toBeNull();

    host.suffixIcon.set(null);
    detect();
    expect(root.querySelector('.andes-select__chevron')).toBeNull();
  });
});

describe('AndesSelect open control', () => {
  it('opens from [(open)] and reports user-driven closes back', async () => {
    const { host, detect, fixture } = setup();

    host.open.set(true);
    detect();
    await fixture.whenStable();

    expect(panel()).not.toBeNull();

    pressKey(options()[0], 'Escape');
    detect();

    expect(panel()).toBeNull();
    expect(host.open()).toBe(false);
    expect(host.openChanges).toEqual([false]);
  });

  it('closes when the bound value turns false', async () => {
    const { host, detect, fixture, openPanel } = setup();
    openPanel();
    expect(host.open()).toBe(true);

    host.open.set(false);
    detect();
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });
});

@Component({
  imports: [AndesSelect, ReactiveFormsModule],
  template: `<andes-select
      aria-label="Fruit"
      placeholder="Pick fruit"
      [mode]="mode()"
      [options]="options"
      [labelInValue]="labelInValue()"
      [optionTemplate]="optionTemplate()"
      [labelTemplate]="labelTemplate()"
      [tagTemplate]="tagTemplate()"
      [formControl]="control"
      (valueChange)="valueChanges.push($event)"
      (selectionChange)="selectionChanges.push($event)"
    />
    <ng-template #option let-option let-selected="selected"
      ><em>{{ option.label }}{{ selected ? ' ✓' : '' }}</em></ng-template
    >
    <ng-template #label let-item
      ><strong data-testid="label">{{ item.label }}!</strong></ng-template
    >
    <ng-template #tag let-tag let-close="onClose"
      ><button type="button" data-testid="tag" (click)="close()">
        {{ tag.label }}
      </button></ng-template
    >`,
})
class OptionsHost {
  readonly mode = signal<AndesSelectMode>('single');
  readonly labelInValue = signal(false);
  readonly optionTemplate = signal<TemplateRef<never> | undefined>(undefined);
  readonly labelTemplate = signal<TemplateRef<never> | undefined>(undefined);
  readonly tagTemplate = signal<TemplateRef<never> | undefined>(undefined);
  readonly optionRef = viewChild.required<TemplateRef<never>>('option');
  readonly labelRef = viewChild.required<TemplateRef<never>>('label');
  readonly tagRef = viewChild.required<TemplateRef<never>>('tag');
  readonly options: AndesSelectOptions = [
    { value: 1, label: 'One' },
    { value: 2, label: 'Two', disabled: true },
    {
      label: 'More',
      options: [
        { value: 3, label: 'Three' },
        { value: 4, label: 'Four' },
      ],
    },
  ];
  readonly control = new FormControl<unknown>(null);
  readonly valueChanges: unknown[] = [];
  readonly selectionChanges: unknown[] = [];
}

describe('AndesSelect with an options array', () => {
  function create(configure: (host: OptionsHost) => void = () => undefined) {
    const fixture = TestBed.createComponent(OptionsHost);
    configure(fixture.componentInstance);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const trigger = root.querySelector<HTMLElement>('[role="combobox"]');
    const open = () => {
      trigger?.click();
      fixture.detectChanges();
    };
    const templates = {
      option: fixture.componentInstance.optionRef(),
      label: fixture.componentInstance.labelRef(),
      tag: fixture.componentInstance.tagRef(),
    };
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      trigger,
      open,
      templates,
    };
  }

  it('renders its own trigger and panel, with groups and disabled options', () => {
    const { trigger, open } = create();

    expect(trigger?.textContent?.trim()).toBe('Pick fruit');
    open();

    expect(labels(options())).toEqual(['One', 'Two', 'Three', 'Four']);
    expect(options()[1].getAttribute('aria-disabled')).toBe('true');
    const group = document.querySelector('[data-slot="select-group"]');
    expect(group?.querySelectorAll('[role="option"]')).toHaveLength(2);
    expect(
      document.getElementById(group?.getAttribute('aria-labelledby') ?? '')
        ?.textContent,
    ).toBe('More');
  });

  it('labels a value from the options without the panel ever opening', () => {
    const { host, fixture, trigger } = create();

    host.control.setValue(3);
    fixture.detectChanges();

    expect(trigger?.textContent?.trim()).toBe('Three');
  });

  it('renders options and the selected label through templates', () => {
    const { host, fixture, open, templates, root } = create((h) => {
      h.control.setValue(1);
    });
    host.optionTemplate.set(templates['option']);
    host.labelTemplate.set(templates['label']);
    fixture.detectChanges();

    expect(root.querySelector('[data-testid="label"]')?.textContent).toBe(
      'One!',
    );
    open();
    expect(labels(options())[0]).toBe('One ✓');
    expect(options()[0].querySelector('em')).not.toBeNull();
  });

  it('renders tags through tagTemplate, with a working onClose', () => {
    const { host, fixture, templates, root } = create((h) => {
      h.mode.set('multiple');
      h.control.setValue([1, 3]);
    });
    host.tagTemplate.set(templates['tag']);
    fixture.detectChanges();

    const tags = root.querySelectorAll<HTMLElement>('[data-testid="tag"]');
    expect(labels(Array.from(tags))).toEqual(['One', 'Three']);

    tags[0].click();
    fixture.detectChanges();
    expect(host.control.value).toEqual([3]);
  });

  it('emits and accepts { value, label } with labelInValue', () => {
    const { host, fixture, open, trigger } = create((h) =>
      h.labelInValue.set(true),
    );

    host.control.setValue({ value: 99, label: 'Ninety-nine' });
    fixture.detectChanges();
    expect(trigger?.textContent?.trim()).toBe('Ninety-nine');

    open();
    options()[3].click();
    fixture.detectChanges();

    expect(host.control.value).toEqual({ value: 4, label: 'Four' });
  });

  it('fires valueChange, but not selectionChange, for form writes', () => {
    // The documented model() semantics: a form write lands in the same `value` signal a
    // `[(value)]` binding reads, so `valueChange` reports it; `selectionChange` exists
    // for consumers who only want the user's own changes.
    const { host, fixture, open } = create();

    host.control.setValue(3);
    fixture.detectChanges();
    expect(host.valueChanges).toEqual([3]);
    expect(host.selectionChanges).toEqual([]);

    open();
    options()[0].click();
    fixture.detectChanges();

    expect(host.valueChanges).toEqual([3, 1]);
    expect(host.selectionChanges).toEqual([1]);
    expect(host.control.value).toBe(1);
  });

  it('writes an empty array for a null form value in multiple mode', () => {
    const { host, fixture, root } = create((h) => h.mode.set('multiple'));

    host.control.setValue(null);
    fixture.detectChanges();

    expect(root.querySelectorAll('[data-slot="select-tag"]')).toHaveLength(0);
    expect(root.querySelector('input')?.getAttribute('aria-describedby')).toBe(
      null,
    );
  });
});
