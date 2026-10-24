import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesCommand } from './command';
import type {
  AndesCommandEntry,
  AndesCommandFilter,
  AndesCommandItem,
  AndesCommandSelectEvent,
} from './command-types';

const ran: string[] = [];

const ENTRIES: AndesCommandEntry[] = [
  {
    heading: 'Suggestions',
    items: [
      { value: 'calendar', label: 'Calendar', icon: '📅', shortcut: 'Mod+K' },
      {
        value: 'search-emoji',
        label: 'Search Emoji',
        description: 'Pick a glyph',
      },
      { value: 'calculator', label: 'Calculator', disabled: true },
    ],
  },
  { separator: true },
  {
    heading: 'Settings',
    items: [
      {
        value: 'profile',
        label: 'Profile',
        shortcut: ['Mod', 'Shift', 'P'],
        action: (item) => ran.push(item.value),
      },
      { value: 'appearance', label: 'Appearance', keywords: ['theme', 'dark'] },
      { value: 'settings', label: 'Open settings' },
    ],
  },
  { value: 'help', label: 'Help' },
  {
    value: 'projects',
    label: 'Search projects…',
    placeholder: 'Find a project',
    children: [
      { value: 'alpha', label: 'Alpha' },
      { value: 'beta', label: 'Beta' },
      {
        value: 'sub',
        label: 'More',
        children: [{ value: 'deep', label: 'Deep item' }],
      },
    ],
  },
];

@Component({
  imports: [AndesCommand],
  template: `
    <andes-command
      [items]="items()"
      [(search)]="search"
      [(value)]="value"
      [(pages)]="pages"
      [shouldFilter]="shouldFilter()"
      [filter]="filter()"
      [loop]="loop()"
      [loading]="loading()"
      [highlight]="highlight()"
      [vimBindings]="vim()"
      [itemTemplate]="custom() ? tpl : null"
      (itemSelected)="selected.push($event)"
    />
    <ng-template #tpl let-item let-search="search" let-active="active">
      <b class="custom-row">{{ item.value }}|{{ search }}|{{ active }}</b>
    </ng-template>
  `,
})
class HostComponent {
  readonly items = signal<readonly AndesCommandEntry[]>(ENTRIES);
  readonly search = signal('');
  readonly value = signal<string | null>(null);
  readonly pages = signal<readonly AndesCommandItem[]>([]);
  readonly shouldFilter = signal(true);
  readonly filter = signal<AndesCommandFilter | undefined>(undefined);
  readonly loop = signal(true);
  readonly loading = signal(false);
  readonly highlight = signal(true);
  readonly vim = signal(false);
  readonly custom = signal(false);
  readonly selected: AndesCommandSelectEvent[] = [];
}

describe('AndesCommand', () => {
  function createHost(configure?: (host: HostComponent) => void) {
    const fixture = TestBed.createComponent(HostComponent);
    configure?.(fixture.componentInstance);
    fixture.detectChanges();
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const input = () => root.querySelector('input') as HTMLInputElement;
    const options = () =>
      Array.from(root.querySelectorAll<HTMLElement>('[role="option"]'));
    const labels = () =>
      options().map((option) =>
        option
          .querySelector('.andes-command__label')
          ?.textContent?.replace(/\s+/g, ''),
      );
    const values = () => options().map((option) => option.dataset['value']);
    return { fixture, host, root, input, options, labels, values };
  }

  type Ctx = ReturnType<typeof createHost>;

  function type(ctx: Ctx, text: string) {
    const input = ctx.input();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    ctx.fixture.detectChanges();
    ctx.fixture.detectChanges();
  }

  function key(ctx: Ctx, name: string, init: KeyboardEventInit = {}) {
    const codes: Record<string, number> = {
      ArrowDown: 40,
      ArrowUp: 38,
      Home: 36,
      End: 35,
      Enter: 13,
      Backspace: 8,
      Escape: 27,
    };
    const event = new KeyboardEvent('keydown', {
      key: name,
      keyCode: codes[name] ?? 0,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    ctx.input().dispatchEvent(event);
    ctx.fixture.detectChanges();
    ctx.fixture.detectChanges();
    return event;
  }

  const active = (ctx: Ctx) => ctx.host.value();

  beforeEach(() => {
    ran.length = 0;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('structure and semantics', () => {
    it('renders a combobox search box that owns a listbox', () => {
      const ctx = createHost();
      const input = ctx.input();
      const list = ctx.root.querySelector('[role="listbox"]') as HTMLElement;

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      expect(input.getAttribute('aria-controls')).toBe(list.id);
      expect(input.getAttribute('aria-label')).toBe('Command menu');
      expect(list.getAttribute('aria-label')).toBe('Command menu');
      expect(input.getAttribute('placeholder')).toBe(
        'Type a command or search…',
      );
    });

    it('focuses the search box when it first renders', () => {
      const ctx = createHost();
      expect(document.activeElement).toBe(ctx.input());
    });

    it('lists the items in order, under labelled groups, with a separator', () => {
      const ctx = createHost();

      expect(ctx.labels()).toEqual([
        'Calendar',
        'SearchEmoji',
        'Calculator',
        'Profile',
        'Appearance',
        'Opensettings',
        'Help',
        'Searchprojects…',
      ]);
      const groups = Array.from(
        ctx.root.querySelectorAll<HTMLElement>('[role="group"]'),
      );
      expect(groups).toHaveLength(2);
      for (const group of groups) {
        const heading = ctx.root.querySelector(
          `#${group.getAttribute('aria-labelledby')}`,
        );
        expect(heading?.textContent?.trim()).toBeTruthy();
      }
      expect(ctx.root.querySelectorAll('[role="separator"]')).toHaveLength(1);
    });

    it('marks disabled items, and shows icons, descriptions and shortcuts', () => {
      const ctx = createHost();
      const options = ctx.options();
      const icon = options[0].querySelector('.andes-command__icon');

      expect(options[2].getAttribute('aria-disabled')).toBe('true');
      expect(options[2].hasAttribute('data-disabled')).toBe(true);
      expect(icon?.textContent?.trim()).toBe('📅');
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
      expect(
        options[1].querySelector('.andes-command__description')?.textContent,
      ).toBe('Pick a glyph');
      expect(options[3].querySelectorAll('kbd')).toHaveLength(3);
      expect(options[3].getAttribute('aria-keyshortcuts')).toMatch(
        /^(Control|Meta)\+Shift\+P$/,
      );
      expect(options[7].querySelector('.andes-command__chevron')).toBeTruthy();
    });

    it('exposes each row as an option with a unique id', () => {
      const ctx = createHost();
      const ids = ctx.options().map((option) => option.id);

      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('filtering and ranking', () => {
    it('filters by what is typed and hides empty groups and separators', () => {
      const ctx = createHost();
      type(ctx, 'sett');

      expect(ctx.values()).toEqual(['settings']);
      expect(ctx.root.querySelectorAll('[role="separator"]')).toHaveLength(0);
      expect(ctx.root.querySelectorAll('[role="group"]')).toHaveLength(1);

      type(ctx, '');
      expect(ctx.options()).toHaveLength(8);
      expect(ctx.root.querySelectorAll('[role="separator"]')).toHaveLength(1);
    });

    it('is fuzzy, ignoring case and accents', () => {
      const ctx = createHost();
      type(ctx, 'CLC');
      expect(ctx.values()).toEqual(['calculator']);

      type(ctx, 'cldr');
      expect(ctx.values()).toEqual(['calendar']);
    });

    it('ranks the best match first', () => {
      const ctx = createHost();
      type(ctx, 'pro');

      expect(ctx.values()[0]).toBe('profile');
      expect(ctx.values()).toContain('projects');
    });

    it('matches keywords and descriptions that are not shown in the label', () => {
      const ctx = createHost();
      type(ctx, 'theme');
      expect(ctx.values()).toEqual(['appearance']);

      type(ctx, 'glyph');
      expect(ctx.values()).toEqual(['search-emoji']);
    });

    it('highlights what matched', () => {
      const ctx = createHost();
      type(ctx, 'cal');

      const marks = Array.from(ctx.root.querySelectorAll('mark')).map(
        (m) => m.textContent,
      );
      expect(marks).toContain('Cal');
    });

    it('can turn the highlight off', () => {
      const ctx = createHost((host) => host.highlight.set(false));
      type(ctx, 'cal');
      expect(ctx.root.querySelectorAll('mark')).toHaveLength(0);
    });

    it('shows every item as given when shouldFilter is off, still reporting the search', () => {
      const ctx = createHost((host) => host.shouldFilter.set(false));
      type(ctx, 'zzz');

      expect(ctx.options()).toHaveLength(8);
      expect(ctx.host.search()).toBe('zzz');
      expect(ctx.root.querySelectorAll('mark')).toHaveLength(0);
    });

    it('takes a custom scoring function: 0 hides, higher ranks first', () => {
      const ctx = createHost((host) =>
        host.filter.set((item) =>
          item.value === 'help' ? 5 : item.value === 'profile' ? 9 : 0,
        ),
      );
      type(ctx, 'anything');

      expect(ctx.values()).toEqual(['profile', 'help']);
    });

    it('shows the empty message when nothing matches, and announces it', () => {
      const ctx = createHost();
      type(ctx, 'zzzz');

      expect(ctx.options()).toHaveLength(0);
      expect(ctx.root.textContent).toContain('No results found.');
      expect(
        ctx.root.querySelector('.andes-command__live')?.textContent?.trim(),
      ).toBe('No results found.');
      expect(
        (ctx.root.querySelector('[role="listbox"]') as HTMLElement).hidden,
      ).toBe(true);
    });

    it('announces how many results the search found', () => {
      const ctx = createHost();
      const live = () =>
        ctx.root.querySelector('.andes-command__live')?.textContent?.trim();
      type(ctx, 'cal');
      expect(live()).toBe('3 results');
      type(ctx, 'calen');
      expect(live()).toBe('1 result');
    });

    it('shows a loading row and marks the list busy', () => {
      const ctx = createHost((host) => host.loading.set(true));
      const list = () => ctx.root.querySelector('[role="listbox"]');

      expect(ctx.root.textContent).toContain('Loading…');
      expect(list()?.getAttribute('aria-busy')).toBe('true');

      ctx.host.loading.set(false);
      ctx.fixture.detectChanges();
      expect(list()?.hasAttribute('aria-busy')).toBe(false);
    });
  });

  describe('active item and keyboard', () => {
    it('starts with the first enabled item active', () => {
      const ctx = createHost();

      expect(active(ctx)).toBe('calendar');
      expect(ctx.input().getAttribute('aria-activedescendant')).toBe(
        ctx.options()[0].id,
      );
      expect(ctx.options()[0].getAttribute('aria-selected')).toBe('true');
      expect(ctx.options()[1].getAttribute('aria-selected')).toBe('false');
    });

    it('moves with ArrowDown and ArrowUp, skipping disabled items and wrapping', () => {
      const ctx = createHost();

      expect(key(ctx, 'ArrowDown').defaultPrevented).toBe(true);
      expect(active(ctx)).toBe('search-emoji');
      key(ctx, 'ArrowDown');
      expect(active(ctx)).toBe('profile');
      key(ctx, 'ArrowUp');
      expect(active(ctx)).toBe('search-emoji');
      key(ctx, 'ArrowUp');
      expect(active(ctx)).toBe('calendar');
      key(ctx, 'ArrowUp');
      expect(active(ctx)).toBe('projects');
      key(ctx, 'ArrowDown');
      expect(active(ctx)).toBe('calendar');
    });

    it('stops at the ends when loop is off', () => {
      const ctx = createHost((host) => host.loop.set(false));

      key(ctx, 'ArrowUp');
      expect(active(ctx)).toBe('calendar');
      key(ctx, 'End');
      expect(active(ctx)).toBe('projects');
      key(ctx, 'ArrowDown');
      expect(active(ctx)).toBe('projects');
    });

    it('jumps to the first and last items with Home and End and with Meta+arrows', () => {
      const ctx = createHost();

      key(ctx, 'End');
      expect(active(ctx)).toBe('projects');
      key(ctx, 'Home');
      expect(active(ctx)).toBe('calendar');
      key(ctx, 'ArrowDown', { metaKey: true });
      expect(active(ctx)).toBe('projects');
      key(ctx, 'ArrowUp', { metaKey: true });
      expect(active(ctx)).toBe('calendar');
    });

    it('leaves Home and End to the caret with a modifier', () => {
      const ctx = createHost();
      expect(key(ctx, 'End', { shiftKey: true }).defaultPrevented).toBe(false);
    });

    it('moves the active item to the first match when the search changes', () => {
      const ctx = createHost();
      key(ctx, 'ArrowDown');
      key(ctx, 'ArrowDown');
      expect(active(ctx)).toBe('profile');

      type(ctx, 'cal');
      expect(active(ctx)).toBe(ctx.values()[0]);
      expect(ctx.input().getAttribute('aria-activedescendant')).toBe(
        ctx.options()[0].id,
      );
    });

    it('keeps the active item when the list changes but it is still there', () => {
      const ctx = createHost();
      key(ctx, 'ArrowDown');
      key(ctx, 'ArrowDown');
      expect(active(ctx)).toBe('profile');

      ctx.host.items.set([...ENTRIES]);
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();

      expect(active(ctx)).toBe('profile');
    });

    it('follows a value written from outside', () => {
      const ctx = createHost();
      ctx.host.value.set('help');
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();

      expect(ctx.input().getAttribute('aria-activedescendant')).toBe(
        ctx.options().find((option) => option.dataset['value'] === 'help')?.id,
      );
    });

    it('ignores a value that names a disabled item', () => {
      const ctx = createHost();
      ctx.host.value.set('calculator');
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();

      expect(ctx.input().getAttribute('aria-activedescendant')).not.toBe(
        ctx.options()[2].id,
      );
    });

    it('keeps focus in the search box throughout', () => {
      const ctx = createHost();
      key(ctx, 'ArrowDown');
      expect(document.activeElement).toBe(ctx.input());
    });

    it('moves the active item under the pointer, but not onto a disabled one', () => {
      const ctx = createHost();
      ctx
        .options()[4]
        .dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      ctx.fixture.detectChanges();
      expect(active(ctx)).toBe('appearance');

      ctx
        .options()[2]
        .dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      ctx.fixture.detectChanges();
      expect(active(ctx)).toBe('appearance');
    });

    it('supports Ctrl+N/J and Ctrl+P/K when vimBindings is on, and only then', () => {
      const off = createHost();
      expect(key(off, 'n', { ctrlKey: true }).defaultPrevented).toBe(false);
      off.fixture.destroy();

      const on = createHost((host) => host.vim.set(true));
      key(on, 'n', { ctrlKey: true });
      expect(active(on)).toBe('search-emoji');
      key(on, 'j', { ctrlKey: true });
      expect(active(on)).toBe('profile');
      key(on, 'p', { ctrlKey: true });
      expect(active(on)).toBe('search-emoji');
      key(on, 'k', { ctrlKey: true });
      expect(active(on)).toBe('calendar');
    });

    it('leaves arrow keys alone when there is nothing to move through', () => {
      const ctx = createHost();
      type(ctx, 'zzzz');
      expect(key(ctx, 'ArrowDown').defaultPrevented).toBe(false);
    });
  });

  describe('selecting', () => {
    it('runs the item on Enter: its action, then itemSelected', () => {
      const ctx = createHost();
      key(ctx, 'ArrowDown');
      key(ctx, 'ArrowDown');

      const event = key(ctx, 'Enter');

      expect(event.defaultPrevented).toBe(true);
      expect(ran).toEqual(['profile']);
      expect(ctx.host.selected.map((e) => e.item.value)).toEqual(['profile']);
      expect(ctx.host.selected[0].pages).toEqual([]);
    });

    it('selects on click without taking focus from the search box', () => {
      const ctx = createHost();
      const down = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      ctx.options()[5].dispatchEvent(down);
      ctx
        .options()[5]
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(down.defaultPrevented).toBe(true);
      expect(ctx.host.selected.map((e) => e.item.value)).toEqual(['settings']);
      expect(document.activeElement).toBe(ctx.input());
    });

    it('does not select a disabled item', () => {
      const ctx = createHost();
      ctx
        .options()[2]
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(ctx.host.selected).toEqual([]);
    });

    it('ignores Enter during IME composition and with modifiers', () => {
      const ctx = createHost();

      key(ctx, 'Enter', { isComposing: true });
      key(ctx, 'Enter', { shiftKey: true });
      expect(ctx.host.selected).toEqual([]);
    });

    it('does nothing on Enter when nothing matches', () => {
      const ctx = createHost();
      type(ctx, 'zzzz');
      expect(key(ctx, 'Enter').defaultPrevented).toBe(false);
      expect(ctx.host.selected).toEqual([]);
    });
  });

  describe('nested pages', () => {
    function openProjects(ctx: Ctx) {
      key(ctx, 'End');
      key(ctx, 'Enter');
    }

    it('opens the page of an item with children instead of selecting it', () => {
      const ctx = createHost();
      type(ctx, 'proj');
      key(ctx, 'Enter');

      expect(ctx.host.pages().map((page) => page.value)).toEqual(['projects']);
      expect(ctx.host.selected).toEqual([]);
      expect(ctx.values()).toEqual(['alpha', 'beta', 'sub']);
      expect(ctx.host.search()).toBe('');
      expect(ctx.input().value).toBe('');
      expect(ctx.input().getAttribute('placeholder')).toBe('Find a project');
    });

    it('shows the trail of pages and a back button', () => {
      const ctx = createHost();
      openProjects(ctx);

      expect(
        ctx.root.querySelector('.andes-command__crumb')?.textContent?.trim(),
      ).toBe('Search projects…');
      const back = ctx.root.querySelector(
        '.andes-command__back',
      ) as HTMLButtonElement;
      expect(back.getAttribute('aria-label')).toBe('Back');

      back.click();
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();
      expect(ctx.host.pages()).toEqual([]);
      expect(ctx.options()).toHaveLength(8);
      expect(document.activeElement).toBe(ctx.input());
    });

    it('goes back on Backspace in an empty search box, but not when it has text', () => {
      const ctx = createHost();
      openProjects(ctx);

      type(ctx, 'a');
      expect(key(ctx, 'Backspace').defaultPrevented).toBe(false);
      expect(ctx.host.pages()).toHaveLength(1);

      type(ctx, '');
      expect(key(ctx, 'Backspace').defaultPrevented).toBe(true);
      expect(ctx.host.pages()).toEqual([]);
    });

    it('does nothing on Backspace at the root', () => {
      const ctx = createHost();
      expect(key(ctx, 'Backspace').defaultPrevented).toBe(false);
    });

    it('goes back one page at a time, and reports the pages in a selection', () => {
      const ctx = createHost();
      openProjects(ctx);
      key(ctx, 'End');
      key(ctx, 'Enter');
      expect(ctx.host.pages().map((p) => p.value)).toEqual(['projects', 'sub']);

      key(ctx, 'Enter');
      expect(ctx.host.selected[0].item.value).toBe('deep');
      expect(ctx.host.selected[0].pages.map((p) => p.value)).toEqual([
        'projects',
        'sub',
      ]);

      key(ctx, 'Backspace');
      expect(ctx.host.pages().map((p) => p.value)).toEqual(['projects']);
    });

    it('goes back on Escape without letting it reach a surrounding dialog, but lets it through at the root', () => {
      const ctx = createHost();
      const reached = vi.fn();
      document.body.addEventListener('keydown', reached);

      expect(key(ctx, 'Escape').defaultPrevented).toBe(false);
      expect(reached).toHaveBeenCalledTimes(1);

      openProjects(ctx);
      reached.mockClear();
      expect(key(ctx, 'Escape').defaultPrevented).toBe(true);
      expect(reached).not.toHaveBeenCalled();
      expect(ctx.host.pages()).toEqual([]);
      document.body.removeEventListener('keydown', reached);
    });

    it('can be driven from outside through the pages model', () => {
      const ctx = createHost();
      ctx.host.pages.set([ENTRIES[4] as AndesCommandItem]);
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();

      expect(ctx.values()).toEqual(['alpha', 'beta', 'sub']);
    });

    it('resets to the root with an empty search through reset()', () => {
      const ctx = createHost();
      openProjects(ctx);
      type(ctx, 'al');
      const command = ctx.fixture.debugElement.children[0]
        .componentInstance as AndesCommand;

      command.reset();
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();

      expect(ctx.host.pages()).toEqual([]);
      expect(ctx.host.search()).toBe('');
    });
  });

  describe('custom rows', () => {
    it('renders the item template with the item, the search and the active flag', () => {
      const ctx = createHost((host) => host.custom.set(true));
      type(ctx, 'cal');

      const rows = Array.from(ctx.root.querySelectorAll('.custom-row')).map(
        (el) => el.textContent,
      );
      expect(rows[0]).toBe(`${ctx.values()[0]}|cal|true`);
      expect(rows.length).toBe(ctx.options().length);
    });
  });

  describe('styling contract', () => {
    const css = () =>
      readFileSync('packages/ui/src/lib/command/command.css', 'utf8');

    it('gives the search box the single-ring focus of the field spec', () => {
      const field =
        /\.andes-command__field:focus-within\s*\{([\s\S]*?)\}/.exec(
          css(),
        )?.[1] ?? '';

      expect(field).toContain('border-color: var(--andes-color-primary');
      expect(field).toContain('box-shadow: 0 0 0 2px');
      expect(field).toContain('outline: none');
      expect(
        /\.andes-command__input\s*\{([\s\S]*?)\}/.exec(css())?.[1],
      ).toContain('outline: 0');
    });

    it('uses a 32px field, 14/22 text and 32px rows', () => {
      expect(css()).toContain('height: var(--andes-control-height-md, 2rem)');
      expect(css()).toContain('var(--andes-text-font-size, 0.875rem)');
      expect(css()).toContain('var(--andes-text-line-height, 1.375rem)');
      expect(
        /\.andes-command__item\s*\{([\s\S]*?)\}/.exec(css())?.[1],
      ).toContain('min-height: var(--andes-control-height-md, 2rem)');
    });

    it('sets the surface font', () => {
      expect(css()).toContain(
        'font-family: var(--andes-font-family), sans-serif',
      );
    });

    it('never wraps a selector onto a line that starts with a combinator', () => {
      expect(
        css()
          .split('\n')
          .filter((line) => /^\s*[>+~]/.test(line)),
      ).toEqual([]);
    });

    it('slows the spinner under reduced motion', () => {
      expect(css()).toMatch(
        /prefers-reduced-motion: reduce\) \{\s*\.andes-command__spinner \{\s*animation-duration: 1\.5s/,
      );
    });
  });
});
