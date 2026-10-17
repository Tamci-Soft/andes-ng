import { Component, signal, viewChild, type TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AndesSelect } from './select';
import { AndesSelectContent } from './select-content';
import { AndesSelectItem } from './select-item';
import { AndesSelectTrigger } from './select-trigger';
import { AndesSelectValue } from './select-value';
import type {
  AndesSelectFieldNames,
  AndesSelectFilterSort,
  AndesSelectMaxTagCount,
  AndesSelectMode,
  AndesSelectPanelContext,
} from './select-state';

/** See `select.spec.ts`: the CDK's key manager reads `keyCode`, which jsdom leaves at 0. */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  Enter: 13,
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

const panelRoot = () =>
  document.querySelector<HTMLElement>('[data-slot="select-panel"]');
const listbox = () =>
  document.querySelector<HTMLElement>('[data-slot="select-content"]');
const options = () =>
  Array.from(listbox()?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
const labels = (elements: HTMLElement[]) =>
  elements.map((element) => element.textContent?.trim());

interface Row {
  readonly id: number;
  readonly name: string;
  readonly hint?: string;
}

@Component({
  imports: [AndesSelect],
  template: `<andes-select
      aria-label="Person"
      [mode]="mode()"
      [showSearch]="showSearch()"
      [options]="options()"
      [fieldNames]="fieldNames()"
      [filterSort]="filterSort()"
      [defaultActiveFirstOption]="defaultActiveFirstOption()"
      [maxTagCount]="maxTagCount()"
      [matchTriggerWidth]="matchTriggerWidth()"
      [loading]="loading()"
      [loadingIcon]="loadingIcon()"
      [optionSelectedIcon]="selectedIcon()"
      [panelHeader]="header()"
      [panelFooter]="footer()"
      [(value)]="value"
      (searchInput)="searches.push($event)"
      (focused)="focusEvents.push('focus')"
      (blurred)="focusEvents.push('blur')"
      (activeOptionChange)="actives.push($event)"
      (inputKeydown)="onKeydown($event)"
      (panelScroll)="scrolls = scrolls + 1"
    />
    <button type="button" data-testid="outside">Outside</button>
    <ng-template #spinner
      ><span data-testid="custom-loading">...</span></ng-template
    >
    <ng-template #check><span data-testid="custom-check">*</span></ng-template>
    <ng-template #headerTpl let-search
      ><span data-testid="panel-header"
        >Searching: {{ search }}</span
      ></ng-template
    >
    <ng-template #footerTpl let-close="close"
      ><input data-testid="footer-input" aria-label="New item" /><button
        type="button"
        data-testid="footer-close"
        (click)="close()"
      >
        Done
      </button></ng-template
    >`,
})
class FeaturesHost {
  readonly mode = signal<AndesSelectMode>('single');
  readonly showSearch = signal<boolean | undefined>(undefined);
  readonly options = signal<readonly object[]>([
    { value: 'cherry', label: 'Cherry', title: 'A red fruit' },
    { value: 'apple', label: 'Apple' },
    {
      label: 'Citrus',
      title: 'Citrus fruit',
      options: [
        { value: 'orange', label: 'Orange' },
        { value: 'lemon', label: 'Lemon' },
      ],
    },
    { value: 'banana', label: 'Banana' },
  ]);
  readonly fieldNames = signal<AndesSelectFieldNames | undefined>(undefined);
  readonly filterSort = signal<AndesSelectFilterSort | undefined>(undefined);
  readonly defaultActiveFirstOption = signal(true);
  readonly maxTagCount = signal<AndesSelectMaxTagCount | undefined>(undefined);
  readonly matchTriggerWidth = signal<boolean | number | undefined>(undefined);
  readonly loading = signal(false);
  readonly loadingIcon = signal<TemplateRef<unknown> | undefined>(undefined);
  readonly selectedIcon = signal<TemplateRef<unknown> | null | undefined>(
    undefined,
  );
  readonly header = signal<TemplateRef<AndesSelectPanelContext> | undefined>(
    undefined,
  );
  readonly footer = signal<TemplateRef<AndesSelectPanelContext> | undefined>(
    undefined,
  );
  readonly value = signal<unknown>(null);
  readonly spinner = viewChild.required<TemplateRef<unknown>>('spinner');
  readonly check = viewChild.required<TemplateRef<unknown>>('check');
  readonly headerTpl =
    viewChild.required<TemplateRef<AndesSelectPanelContext>>('headerTpl');
  readonly footerTpl =
    viewChild.required<TemplateRef<AndesSelectPanelContext>>('footerTpl');

  readonly searches: string[] = [];
  readonly focusEvents: string[] = [];
  readonly actives: unknown[] = [];
  readonly keydowns: string[] = [];
  blockKeys = false;
  scrolls = 0;

  onKeydown(event: KeyboardEvent): void {
    this.keydowns.push(event.key);
    if (this.blockKeys) {
      event.preventDefault();
    }
  }
}

function setup(configure: (host: FeaturesHost) => void = () => undefined) {
  const fixture = TestBed.createComponent(FeaturesHost);
  fixture.detectChanges();
  configure(fixture.componentInstance);
  fixture.detectChanges();
  return helpers(fixture);
}

function helpers(fixture: ComponentFixture<FeaturesHost>) {
  const root = fixture.nativeElement as HTMLElement;
  const detect = () => fixture.detectChanges();
  const box = () =>
    root.querySelector<HTMLElement>('[data-slot="select-trigger"]');
  const combobox = () => root.querySelector<HTMLElement>('[role="combobox"]');
  const openPanel = () => {
    box()?.click();
    detect();
  };
  return {
    fixture,
    host: fixture.componentInstance,
    root,
    detect,
    box,
    combobox,
    openPanel,
  };
}

describe('AndesSelect data options', () => {
  it('reads value, label and children from custom field names', () => {
    const { host, openPanel, detect, combobox } = setup((h) => {
      h.fieldNames.set({ value: 'id', label: 'name', options: 'people' });
      h.options.set([
        { id: 1, name: 'Ada' },
        { name: 'Team', people: [{ id: 2, name: 'Grace' }] },
      ] satisfies readonly (Row | { name: string; people: Row[] })[]);
    });
    openPanel();

    expect(labels(options())).toEqual(['Ada', 'Grace']);
    expect(
      document.querySelector('[data-slot="select-label"]')?.textContent?.trim(),
    ).toBe('Team');

    options()[1].click();
    detect();

    expect(host.value()).toBe(2);
    expect(combobox()?.textContent?.trim()).toBe('Grace');
  });

  it('orders options with filterSort, within their group, given the search text', () => {
    const calls: string[] = [];
    const { openPanel, combobox, detect } = setup((h) => {
      h.showSearch.set(true);
      h.filterSort.set((a, b, info) => {
        calls.push(info.searchValue);
        return a.label.localeCompare(b.label);
      });
    });
    openPanel();

    // Groups keep their slot; the options around them are sorted into theirs.
    expect(labels(options())).toEqual([
      'Apple',
      'Banana',
      'Lemon',
      'Orange',
      'Cherry',
    ]);

    typeInto(combobox() as HTMLInputElement, 'an');
    detect();

    expect(calls).toContain('an');
  });

  it('puts option and group titles on the rendered elements', () => {
    const { openPanel } = setup();
    openPanel();

    expect(options()[0].getAttribute('title')).toBe('A red fruit');
    expect(options()[1].hasAttribute('title')).toBe(false);
    expect(
      document
        .querySelector('[data-slot="select-group"]')
        ?.getAttribute('title'),
    ).toBe('Citrus fruit');
  });
});

describe('AndesSelect projected item title', () => {
  @Component({
    imports: [
      AndesSelect,
      AndesSelectContent,
      AndesSelectItem,
      AndesSelectTrigger,
      AndesSelectValue,
    ],
    template: `<andes-select aria-label="Fruit">
      <andes-select-trigger><andes-select-value /></andes-select-trigger>
      <andes-select-content>
        <andes-select-item value="a" title="Full name">Short</andes-select-item>
      </andes-select-content>
    </andes-select>`,
  })
  class TitleHost {}

  it('moves the title from the host onto the option element', () => {
    const fixture = TestBed.createComponent(TitleHost);
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        '[data-slot="select-trigger"]',
      ) as HTMLElement
    ).click();
    fixture.detectChanges();

    expect(options()[0].getAttribute('title')).toBe('Full name');
    expect(
      document.querySelector('andes-select-item')?.hasAttribute('title'),
    ).toBe(false);
  });
});

describe('AndesSelect search behavior', () => {
  it('emits searchInput only for text the user types', () => {
    const { host, combobox, detect, root } = setup((h) =>
      h.showSearch.set(true),
    );

    typeInto(combobox() as HTMLInputElement, 'ap');
    detect();
    typeInto(combobox() as HTMLInputElement, 'app');
    detect();
    options()
      .find((option) => option.textContent?.trim() === 'Apple')
      ?.click();
    detect();

    expect(host.searches).toEqual(['ap', 'app']);
    expect(root.querySelector('input')?.value).toBe('');
  });

  it('activates the first match by default', () => {
    const { combobox, detect } = setup((h) => h.showSearch.set(true));
    typeInto(combobox() as HTMLInputElement, 'an');
    detect();

    expect(combobox()?.getAttribute('aria-activedescendant')).toBe(
      options().find((option) => !option.hidden)?.id,
    );
  });

  it('leaves no option active with defaultActiveFirstOption off', () => {
    const { host, combobox, detect } = setup((h) => {
      h.showSearch.set(true);
      h.defaultActiveFirstOption.set(false);
    });
    typeInto(combobox() as HTMLInputElement, 'an');
    detect();

    expect(combobox()?.hasAttribute('aria-activedescendant')).toBe(false);

    pressKey(combobox() as HTMLElement, 'Enter');
    detect();

    expect(host.value()).toBeNull();
  });

  it('adds the typed text in tags mode on Enter when no option is active', () => {
    const { host, combobox, detect } = setup((h) => {
      h.mode.set('tags');
      h.defaultActiveFirstOption.set(false);
    });
    typeInto(combobox() as HTMLInputElement, 'Mango');
    detect();
    pressKey(combobox() as HTMLElement, 'Enter');
    detect();

    expect(host.value()).toEqual(['Mango']);
  });
});

describe('AndesSelect events', () => {
  it('emits inputKeydown first, and skips built-in handling when prevented', () => {
    const { host, combobox, detect } = setup((h) => (h.blockKeys = true));

    pressKey(combobox() as HTMLElement, 'ArrowDown');
    detect();

    expect(host.keydowns).toEqual(['ArrowDown']);
    expect(panelRoot()).toBeNull();

    host.blockKeys = false;
    pressKey(combobox() as HTMLElement, 'ArrowDown');
    detect();

    expect(panelRoot()).not.toBeNull();
  });

  it('emits activeOptionChange as the active option moves', () => {
    const { host, combobox, detect } = setup((h) => h.showSearch.set(true));

    pressKey(combobox() as HTMLElement, 'ArrowDown');
    detect();
    pressKey(combobox() as HTMLElement, 'ArrowDown');
    detect();

    expect(host.actives).toEqual(['cherry', 'apple']);
  });

  it('emits panelScroll when the option list scrolls', () => {
    const { host, openPanel } = setup();
    openPanel();

    document
      .querySelector('[data-slot="select-viewport"]')
      ?.dispatchEvent(new Event('scroll'));

    expect(host.scrolls).toBe(1);
  });

  it('emits focused once and blurred only when focus leaves trigger and panel', async () => {
    const { host, combobox, detect, openPanel, root } = setup((h) =>
      h.showSearch.set(true),
    );

    combobox()?.focus();
    openPanel();
    expect(host.focusEvents).toEqual(['focus']);

    // Focus moving into the panel is not a blur.
    host.footer.set(host.footerTpl());
    detect();
    document
      .querySelector<HTMLInputElement>('[data-testid="footer-input"]')
      ?.focus();
    await new Promise((resolve) => setTimeout(resolve));
    expect(host.focusEvents).toEqual(['focus']);

    root.querySelector<HTMLElement>('[data-testid="outside"]')?.focus();
    await new Promise((resolve) => setTimeout(resolve));
    expect(host.focusEvents).toEqual(['focus', 'blur']);
  });
});

describe('AndesSelect panel', () => {
  it('renders header and footer templates around the option list', () => {
    const { host, openPanel, detect, combobox } = setup((h) => {
      h.showSearch.set(true);
      h.header.set(h.headerTpl());
      h.footer.set(h.footerTpl());
    });
    openPanel();
    typeInto(combobox() as HTMLInputElement, 'ch');
    detect();

    const root = panelRoot() as HTMLElement;
    const slots = Array.from(root.children).map((child) =>
      child.getAttribute('data-slot'),
    );
    expect(slots).toEqual([
      'select-panel-header',
      'select-viewport',
      'select-panel-footer',
    ]);
    expect(
      root.querySelector('[data-testid="panel-header"]')?.textContent,
    ).toBe('Searching: ch');

    root.querySelector<HTMLElement>('[data-testid="footer-close"]')?.click();
    detect();

    expect(panelRoot()).toBeNull();
    expect(host.value()).toBeNull();
  });

  it('leaves keys typed in the footer to the footer', () => {
    const { host, openPanel, detect } = setup((h) =>
      h.footer.set(h.footerTpl()),
    );
    openPanel();

    const input = document.querySelector<HTMLInputElement>(
      '[data-testid="footer-input"]',
    ) as HTMLInputElement;
    input.focus();
    const space = pressKey(input, ' ');
    const enter = pressKey(input, 'Enter');
    detect();

    expect(space.defaultPrevented).toBe(false);
    expect(enter.defaultPrevented).toBe(false);
    expect(host.value()).toBeNull();
    expect(panelRoot()).not.toBeNull();
  });

  it('applies listHeight to the scrolling list and a numeric matchTriggerWidth as width', () => {
    const { openPanel } = setup((h) => h.matchTriggerWidth.set(320));
    openPanel();

    const root = panelRoot() as HTMLElement;
    expect(root.style.width).toBe('320px');
    expect(root.hasAttribute('data-match-trigger-width')).toBe(false);
    expect(
      (root.querySelector('[data-slot="select-viewport"]') as HTMLElement).style
        .maxHeight,
    ).toBe('256px');
  });

  it('sizes the panel to its content with matchTriggerWidth false', () => {
    const { openPanel } = setup((h) => h.matchTriggerWidth.set(false));
    openPanel();

    expect(panelRoot()?.hasAttribute('data-match-trigger-width')).toBe(false);
    expect(panelRoot()?.style.width).toBe('');
  });
});

describe('AndesSelect panel placement', () => {
  it('keeps the panel above or below the trigger, never beside it', () => {
    const { fixture, openPanel } = setup((h) => h.mode.set('multiple'));
    openPanel();

    const select = fixture.debugElement.query(By.directive(AndesSelect))
      .componentInstance as AndesSelect;
    const positioning = select.overlay.config().positioning;
    expect(positioning).toMatchObject({
      kind: 'anchored',
      side: 'bottom',
      align: 'start',
      crossSideFallback: false,
      flexibleDimensions: true,
    });
  });

  it('lets the pane shrink to the room on its side instead of covering the trigger', () => {
    const { fixture, openPanel } = setup();
    openPanel();

    const select = fixture.debugElement.query(By.directive(AndesSelect))
      .componentInstance as AndesSelect;
    expect(select.overlay.config().size).toMatchObject({ minHeight: '0px' });
  });
});

describe('AndesSelect icons', () => {
  it('replaces the loading spinner with loadingIcon', () => {
    const { root } = setup((h) => {
      h.loading.set(true);
      h.loadingIcon.set(h.spinner());
    });

    expect(
      root.querySelector(
        '[data-slot="select-loading"] [data-testid="custom-loading"]',
      ),
    ).not.toBeNull();
    expect(root.querySelector('.andes-select__spinner')).toBeNull();
  });

  it('replaces or removes the selected option check mark', () => {
    const { host, openPanel, detect } = setup((h) => {
      h.value.set('apple');
      h.selectedIcon.set(h.check());
    });
    openPanel();
    const selected = () =>
      options().find((option) => option.hasAttribute('data-selected'));

    expect(
      selected()?.querySelector('[data-testid="custom-check"]'),
    ).not.toBeNull();
    expect(selected()?.querySelector('svg')).toBeNull();

    host.selectedIcon.set(null);
    detect();

    expect(
      selected()?.querySelector('[data-testid="custom-check"]'),
    ).toBeNull();
    expect(selected()?.querySelector('svg')).toBeNull();
  });
});

describe('AndesSelect responsive tags', () => {
  const widths = new Map<string, number>();

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        const kind = this.getAttribute('data-measure');
        return kind ? (widths.get(kind) ?? 0) : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('andes-select__selection')
          ? (widths.get('selection') ?? 0)
          : 0;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    widths.clear();
  });

  const visibleTags = (root: HTMLElement) =>
    Array.from(
      root.querySelectorAll<HTMLElement>(
        '.andes-select__selection > [data-slot="select-tag"]',
      ),
    );
  const visibleRest = (root: HTMLElement) =>
    root
      .querySelector('.andes-select__selection > [data-slot="select-tag-rest"]')
      ?.textContent?.trim();

  it('shows as many tags as fit on one row, then "+ N ..."', () => {
    widths.set('tag', 60);
    widths.set('rest', 40);
    // 60 + 60 + 40 fits in 180 once the search input's room is taken off.
    widths.set('selection', 200);
    const { root, box } = setup((h) => {
      h.mode.set('multiple');
      h.maxTagCount.set('responsive');
      h.value.set(['cherry', 'apple', 'banana', 'orange']);
    });

    expect(box()?.hasAttribute('data-responsive')).toBe(true);
    expect(labels(visibleTags(root))).toEqual(['Cherry', 'Apple']);
    expect(visibleRest(root)).toBe('+ 2 ...');
    expect(
      root
        .querySelector('[data-slot="select-tag-measure"]')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('shows every tag when they all fit', () => {
    widths.set('tag', 30);
    widths.set('rest', 40);
    widths.set('selection', 400);
    const { root } = setup((h) => {
      h.mode.set('multiple');
      h.maxTagCount.set('responsive');
      h.value.set(['cherry', 'apple', 'banana']);
    });

    expect(visibleTags(root)).toHaveLength(3);
    expect(visibleRest(root)).toBeUndefined();
  });

  it('keeps at least one tag visible', () => {
    widths.set('tag', 300);
    widths.set('rest', 40);
    widths.set('selection', 120);
    const { root } = setup((h) => {
      h.mode.set('multiple');
      h.maxTagCount.set('responsive');
      h.value.set(['cherry', 'apple']);
    });

    expect(visibleTags(root)).toHaveLength(1);
    expect(visibleRest(root)).toBe('+ 1 ...');
  });
});
