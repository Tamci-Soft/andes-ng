import { AndesOverlayPrimitive } from '@andes-ng/primitives';
import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { readFileSync } from 'node:fs';

import {
  AndesMentions,
  type AndesMentionsOptions,
  type AndesMentionsPlacement,
  type AndesMentionsSearchEvent,
  type AndesMentionsSelectEvent,
} from './mentions';
import type {
  AndesMentionFilter,
  AndesMentionOption,
  AndesMentionValidateSearch,
} from './mentions-context';

/**
 * jsdom reports zero geometry for every element, which makes the overlay's flexible
 * positioning unhappy. A nominal non-zero size is enough to let it attach and position.
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

const PEOPLE: AndesMentionOption[] = [
  { value: 'ana', label: 'Ana Torres' },
  { value: 'andres', label: 'Andres Vega' },
  { value: 'luis', label: 'Luis Rojas', disabled: true },
  { value: 'maria', label: 'Maria Soto' },
];

@Component({
  imports: [AndesMentions],
  template: `
    <andes-mentions
      [(value)]="text"
      [options]="options()"
      [prefix]="prefix()"
      [split]="split()"
      [loading]="loading()"
      [filterOption]="filterOption()"
      [validateSearch]="validateSearch()"
      [notFoundContent]="notFound()"
      [placement]="placement()"
      [type]="type()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [maxLength]="maxLength()"
      [showCount]="showCount()"
      [status]="status()"
      [size]="size()"
      [optionTemplate]="custom() ? optionTpl : null"
      placeholder="Write something"
      (searched)="searches.push($event)"
      (optionSelected)="picks.push($event)"
      (openChanged)="openChanges.push($event)"
    />
    <button type="button" id="outside">outside</button>
    <ng-template #optionTpl let-option let-query="query" let-prefix="prefix">
      <b class="custom-option">{{ prefix }}{{ option.value }}|{{ query }}</b>
    </ng-template>
  `,
})
class HostComponent {
  readonly text = signal('');
  readonly options = signal<AndesMentionsOptions>(PEOPLE);
  readonly prefix = signal<string | readonly string[]>('@');
  readonly split = signal(' ');
  readonly loading = signal(false);
  readonly filterOption = signal<AndesMentionFilter | false | undefined>(
    undefined,
  );
  readonly validateSearch = signal<AndesMentionValidateSearch | undefined>(
    undefined,
  );
  readonly notFound = signal<string | TemplateRef<unknown> | null>(
    'No matches found',
  );
  readonly placement = signal<AndesMentionsPlacement>('bottom');
  readonly type = signal<'textarea' | 'input'>('textarea');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly maxLength = signal<number | undefined>(undefined);
  readonly showCount = signal(false);
  readonly status = signal<'error' | 'warning' | undefined>(undefined);
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
  readonly custom = signal(false);
  readonly searches: AndesMentionsSearchEvent[] = [];
  readonly picks: AndesMentionsSelectEvent[] = [];
  readonly openChanges: boolean[] = [];
  readonly mentions = viewChild.required(AndesMentions);
}

@Component({
  imports: [AndesMentions, ReactiveFormsModule],
  template: `<andes-mentions [formControl]="control" [options]="options" />`,
})
class ReactiveHost {
  readonly control = new FormControl('start', { nonNullable: true });
  readonly options = PEOPLE;
}

@Component({
  imports: [AndesMentions, FormsModule],
  template: `<andes-mentions [(ngModel)]="text" [options]="options" />`,
})
class NgModelHost {
  text = 'hello';
  readonly options = PEOPLE;
}

describe('AndesMentions', () => {
  withElementGeometry();

  function createHost(configure?: (host: HostComponent) => void) {
    const fixture = TestBed.createComponent(HostComponent);
    configure?.(fixture.componentInstance);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const field = () =>
      fixture.nativeElement.querySelector('.andes-mentions__control') as
        HTMLTextAreaElement | HTMLInputElement;
    const panel = () =>
      document.querySelector('.andes-mentions-panel') as HTMLElement | null;
    const rows = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>('.andes-mentions-option'),
      );
    const labels = () => rows().map((row) => row.textContent?.trim());
    return { fixture, host, field, panel, rows, labels };
  }

  type Ctx = ReturnType<typeof createHost>;

  /** Types `text` into the field the way a user would: focused, value set, caret at the end. */
  function type(ctx: Ctx, text: string, caret = text.length) {
    const field = ctx.field();
    if (document.activeElement !== field) {
      field.focus();
    }
    field.value = text;
    field.setSelectionRange(caret, caret);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    ctx.fixture.detectChanges();
    ctx.fixture.detectChanges();
  }

  function key(
    ctx: Ctx,
    name: string,
    init: KeyboardEventInit = {},
  ): KeyboardEvent {
    const codes: Record<string, number> = {
      ArrowDown: 40,
      ArrowUp: 38,
      Enter: 13,
      Tab: 9,
      Escape: 27,
      ArrowLeft: 37,
      ArrowRight: 39,
      Home: 36,
      End: 35,
    };
    const event = new KeyboardEvent('keydown', {
      key: name,
      keyCode: codes[name] ?? 0,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    ctx.field().dispatchEvent(event);
    ctx.fixture.detectChanges();
    return event;
  }

  function activeId(ctx: Ctx) {
    return ctx.field().getAttribute('aria-activedescendant');
  }

  function activeLabel(ctx: Ctx) {
    return ctx
      .rows()
      .find((row) => row.id === activeId(ctx))
      ?.textContent?.trim();
  }

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('opening and filtering', () => {
    it('renders a textarea field and nothing else until a trigger is typed', () => {
      const ctx = createHost();

      expect(ctx.field().tagName).toBe('TEXTAREA');
      expect(ctx.panel()).toBeNull();
      type(ctx, 'hello');
      expect(ctx.panel()).toBeNull();
    });

    it('opens when the trigger is typed, listing every option', () => {
      const ctx = createHost();
      type(ctx, '@');

      expect(ctx.panel()).toBeTruthy();
      expect(ctx.labels()).toEqual([
        'Ana Torres',
        'Andres Vega',
        'Luis Rojas',
        'Maria Soto',
      ]);
    });

    it('opens after whitespace but not inside a word', () => {
      const ctx = createHost();
      type(ctx, 'mail to ana@');
      expect(ctx.panel()).toBeNull();

      type(ctx, 'mail to @');
      expect(ctx.panel()).toBeTruthy();
    });

    it('filters live by what follows the trigger', () => {
      const ctx = createHost();
      type(ctx, 'hi @an');
      expect(ctx.labels()).toEqual(['Ana Torres', 'Andres Vega']);

      type(ctx, 'hi @and');
      expect(ctx.labels()).toEqual(['Andres Vega']);

      type(ctx, 'hi @VEG');
      expect(ctx.labels()).toEqual(['Andres Vega']);
    });

    it('shows the not-found text when nothing matches, and nothing when it is null', () => {
      const ctx = createHost();
      type(ctx, '@zzz');
      expect(ctx.panel()?.textContent?.trim()).toBe('No matches found');
      expect(ctx.rows()).toHaveLength(0);

      ctx.host.notFound.set(null);
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();
      expect(ctx.panel()).toBeNull();
    });

    it('closes once the text after the trigger is no longer a search', () => {
      const ctx = createHost();
      type(ctx, '@ana');
      expect(ctx.panel()).toBeTruthy();

      type(ctx, '@ana ');
      expect(ctx.panel()).toBeNull();
    });

    it('follows the caret: moving it out of the mention closes the list', () => {
      const ctx = createHost();
      type(ctx, 'hey @an later');
      expect(ctx.panel()).toBeNull();

      const field = ctx.field();
      field.setSelectionRange(7, 7);
      field.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();
      expect(ctx.labels()).toEqual(['Ana Torres', 'Andres Vega']);

      field.setSelectionRange(2, 2);
      field.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();
      expect(ctx.panel()).toBeNull();
    });

    it('re-evaluates on a click into the text', () => {
      const ctx = createHost();
      type(ctx, 'hey @an later');
      const field = ctx.field();
      field.setSelectionRange(7, 7);
      field.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();

      expect(ctx.panel()).toBeTruthy();
    });

    it('supports several triggers, with a list per trigger', () => {
      const ctx = createHost((host) => {
        host.prefix.set(['@', '#']);
        host.options.set({
          '@': [{ value: 'ana' }],
          '#': [{ value: 'urgent' }, { value: 'billing' }],
        });
      });

      type(ctx, 'to @');
      expect(ctx.labels()).toEqual(['ana']);
      type(ctx, 'to @ana and #');
      expect(ctx.labels()).toEqual(['urgent', 'billing']);
      type(ctx, 'to @ana and #bi');
      expect(ctx.labels()).toEqual(['billing']);
    });

    it('accepts a custom filter, and no filter at all for server-filtered lists', () => {
      const ctx = createHost((host) => {
        host.filterOption.set((query, option) =>
          option.value.startsWith(query),
        );
      });
      type(ctx, '@a');
      expect(ctx.labels()).toEqual(['Ana Torres', 'Andres Vega']);
      type(ctx, '@nd');
      expect(ctx.labels()).toEqual([]);

      ctx.host.filterOption.set(false);
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();
      expect(ctx.labels()).toHaveLength(4);
    });

    it('accepts a custom validateSearch', () => {
      const ctx = createHost((host) => {
        host.validateSearch.set((query) => query.length <= 2);
      });
      type(ctx, '@ana');
      expect(ctx.panel()).toBeNull();
      type(ctx, '@an');
      expect(ctx.panel()).toBeTruthy();
    });

    it('never opens while disabled or read-only', () => {
      const disabled = createHost((host) => host.disabled.set(true));
      expect(disabled.field().disabled).toBe(true);
      disabled.field().value = '@';
      disabled.field().dispatchEvent(new Event('input', { bubbles: true }));
      disabled.fixture.detectChanges();
      expect(disabled.panel()).toBeNull();
      disabled.fixture.destroy();

      const readonly = createHost((host) => host.readonly.set(true));
      type(readonly, '@');
      expect(readonly.panel()).toBeNull();
    });

    it('closes when the field loses focus', () => {
      const ctx = createHost();
      type(ctx, '@a');
      expect(ctx.panel()).toBeTruthy();

      ctx.field().blur();
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();
      expect(ctx.panel()).toBeNull();
    });
  });

  describe('searched output and async options', () => {
    it('emits the typed text with its trigger, once per change', () => {
      const ctx = createHost();
      type(ctx, '@');
      type(ctx, '@a');
      type(ctx, '@an');
      type(ctx, '@an');

      expect(ctx.host.searches).toEqual([
        { query: '', prefix: '@' },
        { query: 'a', prefix: '@' },
        { query: 'an', prefix: '@' },
      ]);
    });

    it('does not emit for text that is not a mention', () => {
      const ctx = createHost();
      type(ctx, 'plain text');
      expect(ctx.host.searches).toEqual([]);
    });

    it('shows a loading row in place of the options while loading', () => {
      const ctx = createHost((host) => host.loading.set(true));
      type(ctx, '@a');

      expect(ctx.rows()).toHaveLength(0);
      expect(ctx.panel()?.textContent).toContain('Loading…');

      ctx.host.loading.set(false);
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();
      expect(ctx.rows().length).toBeGreaterThan(0);
    });

    it('opens for a loading search that has no options yet, and shows results when they arrive', () => {
      const ctx = createHost((host) => {
        host.options.set([]);
        host.filterOption.set(false);
        host.notFound.set(null);
        host.loading.set(true);
      });
      type(ctx, '@a');
      expect(ctx.panel()).toBeTruthy();

      ctx.host.loading.set(false);
      ctx.host.options.set([{ value: 'ana', label: 'Ana (server)' }]);
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();
      expect(ctx.labels()).toEqual(['Ana (server)']);
      expect(activeLabel(ctx)).toBe('Ana (server)');
    });

    it('renders a custom option template with the option, the query and the trigger', () => {
      const ctx = createHost((host) => host.custom.set(true));
      type(ctx, '@an');

      const custom = Array.from(document.querySelectorAll('.custom-option'));
      expect(custom.map((el) => el.textContent)).toEqual([
        '@ana|an',
        '@andres|an',
      ]);
    });
  });

  describe('combobox semantics', () => {
    it('is a combobox that announces its popup', () => {
      const ctx = createHost();
      const field = ctx.field();

      expect(field.getAttribute('role')).toBe('combobox');
      expect(field.getAttribute('aria-haspopup')).toBe('listbox');
      expect(field.getAttribute('aria-autocomplete')).toBe('list');
      expect(field.getAttribute('aria-expanded')).toBe('false');
      expect(field.hasAttribute('aria-controls')).toBe(false);

      type(ctx, '@');
      expect(field.getAttribute('aria-expanded')).toBe('true');
      const list = ctx.panel() as HTMLElement;
      expect(field.getAttribute('aria-controls')).toBe(list.id);
      expect(list.getAttribute('role')).toBe('listbox');
    });

    it('marks rows as options, with the disabled one flagged', () => {
      const ctx = createHost();
      type(ctx, '@');

      const rows = ctx.rows();
      expect(rows.every((row) => row.getAttribute('role') === 'option')).toBe(
        true,
      );
      expect(rows[2].getAttribute('aria-disabled')).toBe('true');
      expect(rows[0].hasAttribute('aria-disabled')).toBe(false);
    });

    it('points aria-activedescendant at the highlighted row, starting with the first', () => {
      const ctx = createHost();
      type(ctx, '@');

      expect(activeLabel(ctx)).toBe('Ana Torres');
      expect(ctx.rows()[0].getAttribute('aria-selected')).toBe('true');
      expect(ctx.rows()[1].getAttribute('aria-selected')).toBe('false');
    });

    it('keeps focus in the field the whole time', () => {
      const ctx = createHost();
      type(ctx, '@');
      key(ctx, 'ArrowDown');

      expect(document.activeElement).toBe(ctx.field());
    });

    it('announces the number of suggestions in a live region', () => {
      const ctx = createHost();
      const live = () =>
        ctx.fixture.nativeElement
          .querySelector('.andes-mentions__live')
          ?.textContent?.trim();
      expect(live()).toBe('');

      type(ctx, '@');
      expect(live()).toBe('4 suggestions available');
      type(ctx, '@and');
      expect(live()).toBe('1 suggestion available');
      type(ctx, '@zzz');
      expect(live()).toBe('No matches found');
    });

    it('forwards the id, name and aria inputs to the field, not the host', () => {
      @Component({
        imports: [AndesMentions],
        template: `<andes-mentions
          id="comment"
          name="comment"
          aria-label="Comment"
          aria-describedby="hint"
          [aria-invalid]="true"
        />`,
      })
      class AttrHost {}

      const fixture = TestBed.createComponent(AttrHost);
      fixture.detectChanges();
      const hostEl = fixture.nativeElement.querySelector('andes-mentions');
      const field = hostEl.querySelector('textarea');

      expect(hostEl.hasAttribute('id')).toBe(false);
      expect(field.id).toBe('comment');
      expect(field.name).toBe('comment');
      expect(field.getAttribute('aria-label')).toBe('Comment');
      expect(field.getAttribute('aria-describedby')).toBe('hint');
      expect(field.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('keyboard', () => {
    it('moves the highlight with ArrowDown and ArrowUp, skipping disabled rows and wrapping', () => {
      const ctx = createHost();
      type(ctx, '@');

      expect(key(ctx, 'ArrowDown').defaultPrevented).toBe(true);
      expect(activeLabel(ctx)).toBe('Andres Vega');
      key(ctx, 'ArrowDown');
      expect(activeLabel(ctx)).toBe('Maria Soto');
      key(ctx, 'ArrowDown');
      expect(activeLabel(ctx)).toBe('Ana Torres');
      key(ctx, 'ArrowUp');
      expect(activeLabel(ctx)).toBe('Maria Soto');
    });

    it('leaves arrows, Home and End to the caret while the list is closed', () => {
      const ctx = createHost();
      type(ctx, 'plain');

      expect(key(ctx, 'ArrowDown').defaultPrevented).toBe(false);
      expect(key(ctx, 'Enter').defaultPrevented).toBe(false);
      expect(key(ctx, 'Tab').defaultPrevented).toBe(false);
    });

    it('leaves Home and End to the caret even while open', () => {
      const ctx = createHost();
      type(ctx, '@');

      expect(key(ctx, 'Home').defaultPrevented).toBe(false);
      expect(key(ctx, 'End').defaultPrevented).toBe(false);
      expect(activeLabel(ctx)).toBe('Ana Torres');
    });

    it('lets the caret move when there is nothing to navigate', () => {
      const ctx = createHost();
      type(ctx, '@zzz');

      expect(key(ctx, 'ArrowDown').defaultPrevented).toBe(false);
    });

    it('picks the highlighted option on Enter', () => {
      const ctx = createHost();
      type(ctx, 'hello @an');
      key(ctx, 'ArrowDown');

      const event = key(ctx, 'Enter');

      expect(event.defaultPrevented).toBe(true);
      expect(ctx.field().value).toBe('hello @andres ');
      expect(ctx.host.text()).toBe('hello @andres ');
      expect(ctx.panel()).toBeNull();
      expect(document.activeElement).toBe(ctx.field());
      expect(ctx.field().selectionStart).toBe('hello @andres '.length);
    });

    it('picks on Tab too, keeping focus where it is', () => {
      const ctx = createHost();
      type(ctx, '@mar');

      const event = key(ctx, 'Tab');

      expect(event.defaultPrevented).toBe(true);
      expect(ctx.host.text()).toBe('@maria ');
      expect(document.activeElement).toBe(ctx.field());
    });

    it('ignores Enter with a modifier, and Enter during IME composition', () => {
      const ctx = createHost();
      type(ctx, '@');

      expect(key(ctx, 'Enter', { shiftKey: true }).defaultPrevented).toBe(
        false,
      );
      expect(key(ctx, 'Enter', { isComposing: true }).defaultPrevented).toBe(
        false,
      );
      expect(ctx.host.text()).toBe('@');
    });

    it('closes on Escape without letting the event reach anything behind', () => {
      const ctx = createHost();
      type(ctx, '@');
      const reached = vi.fn();
      document.body.addEventListener('keydown', reached);

      const event = key(ctx, 'Escape');
      ctx.fixture.detectChanges();

      expect(event.defaultPrevented).toBe(true);
      expect(reached).not.toHaveBeenCalled();
      expect(ctx.panel()).toBeNull();
      expect(document.activeElement).toBe(ctx.field());
      document.body.removeEventListener('keydown', reached);
    });

    it('lets Escape through while the list is closed', () => {
      const ctx = createHost();
      type(ctx, 'plain');
      const reached = vi.fn();
      document.body.addEventListener('keydown', reached);

      key(ctx, 'Escape');

      expect(reached).toHaveBeenCalled();
      document.body.removeEventListener('keydown', reached);
    });

    it('stays closed after Escape until the text changes', () => {
      const ctx = createHost();
      type(ctx, '@a');
      key(ctx, 'Escape');
      ctx.fixture.detectChanges();

      ctx
        .field()
        .dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
      ctx.fixture.detectChanges();
      expect(ctx.panel()).toBeNull();

      type(ctx, '@an');
      expect(ctx.panel()).toBeTruthy();
    });

    it('does not pick a disabled option', () => {
      const ctx = createHost();
      type(ctx, '@lu');
      expect(ctx.labels()).toEqual(['Luis Rojas']);
      expect(activeId(ctx)).toBeNull();

      expect(key(ctx, 'Enter').defaultPrevented).toBe(false);
      expect(ctx.host.text()).toBe('@lu');
    });
  });

  describe('picking', () => {
    it('picks with the mouse without taking focus from the field', () => {
      const ctx = createHost();
      type(ctx, 'see @mar');
      const row = ctx.rows()[0];

      const down = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      row.dispatchEvent(down);
      ctx.fixture.detectChanges();

      expect(down.defaultPrevented).toBe(true);
      expect(ctx.host.text()).toBe('see @maria ');
      expect(document.activeElement).toBe(ctx.field());
    });

    it('highlights the row under the pointer', () => {
      const ctx = createHost();
      type(ctx, '@');
      ctx
        .rows()[3]
        .dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      ctx.fixture.detectChanges();

      expect(activeLabel(ctx)).toBe('Maria Soto');
    });

    it('does nothing when a disabled row is pressed', () => {
      const ctx = createHost();
      type(ctx, '@');
      ctx
        .rows()[2]
        .dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
        );
      ctx.fixture.detectChanges();

      expect(ctx.host.text()).toBe('@');
      expect(ctx.host.picks).toEqual([]);
    });

    it('emits the picked option with its trigger', () => {
      const ctx = createHost();
      type(ctx, '@an');
      key(ctx, 'Enter');

      expect(ctx.host.picks).toEqual([{ option: PEOPLE[0], prefix: '@' }]);
    });

    it('replaces only the mention under the caret and keeps the rest', () => {
      const ctx = createHost();
      type(ctx, 'a @an, b', 5);
      key(ctx, 'Enter');

      expect(ctx.host.text()).toBe('a @ana , b');
      expect(ctx.field().selectionStart).toBe(7);
    });

    it('inserts the configured split, or nothing', () => {
      const comma = createHost((host) => host.split.set(', '));
      type(comma, '@mar');
      key(comma, 'Enter');
      expect(comma.host.text()).toBe('@maria, ');
      comma.fixture.destroy();
      document.body.innerHTML = '';

      const none = createHost((host) => host.split.set(''));
      type(none, '@mar');
      key(none, 'Enter');
      expect(none.host.text()).toBe('@maria');
      // The caret is still inside the word, but the list must not pop straight back open.
      expect(none.panel()).toBeNull();
    });

    it('works for the second trigger of a multi-trigger field', () => {
      const ctx = createHost((host) => {
        host.prefix.set(['@', '#']);
        host.options.set({
          '@': [{ value: 'ana' }],
          '#': [{ value: 'urgent' }],
        });
      });
      type(ctx, 'tag #ur');
      key(ctx, 'Enter');

      expect(ctx.host.text()).toBe('tag #urgent ');
      expect(ctx.host.picks[0].prefix).toBe('#');
    });

    it('uses the editing pipeline where the browser offers it, so Undo keeps working', () => {
      const exec = vi.fn((command: string, _ui: boolean, text: string) => {
        const field = document.activeElement as HTMLTextAreaElement;
        field.setRangeText(
          text,
          field.selectionStart,
          field.selectionEnd,
          'end',
        );
        field.dispatchEvent(new Event('input', { bubbles: true }));
        return command === 'insertText';
      });
      (document as unknown as { execCommand: unknown }).execCommand = exec;
      try {
        const ctx = createHost();
        type(ctx, 'hi @an');
        key(ctx, 'Enter');
        ctx.fixture.detectChanges();

        expect(exec).toHaveBeenCalledWith('insertText', false, '@ana ');
        expect(ctx.host.text()).toBe('hi @ana ');
        expect(ctx.panel()).toBeNull();
      } finally {
        delete (document as unknown as { execCommand?: unknown }).execCommand;
      }
    });

    it('refuses a pick that would pass maxLength', () => {
      const ctx = createHost((host) => host.maxLength.set(8));
      type(ctx, 'hi @ma');
      key(ctx, 'Enter');

      expect(ctx.host.text()).toBe('hi @ma');
      expect(ctx.panel()).toBeNull();
    });
  });

  describe('single-line input', () => {
    it('renders an input with the same behaviour', () => {
      const ctx = createHost((host) => host.type.set('input'));

      expect(ctx.field().tagName).toBe('INPUT');
      expect(ctx.field().hasAttribute('rows')).toBe(false);
      type(ctx, 'to @an');
      key(ctx, 'ArrowDown');
      key(ctx, 'Enter');
      expect(ctx.host.text()).toBe('to @andres ');
    });
  });

  describe('placement and animation', () => {
    it('puts a bottom list on the bottom side', () => {
      const ctx = createHost();
      type(ctx, '@');
      ctx.fixture.detectChanges();

      expect(ctx.panel()?.dataset['side']).toBe('bottom');
    });

    it('puts a top list on the top side', () => {
      const ctx = createHost((host) => host.placement.set('top'));
      type(ctx, '@');
      ctx.fixture.detectChanges();

      expect(ctx.panel()?.dataset['side']).toBe('top');
    });

    it('marks the pane as closing while it exits', async () => {
      const ctx = createHost();
      type(ctx, '@');
      const pane = document.querySelector('.cdk-overlay-pane') as HTMLElement;
      let finish: () => void = () => undefined;
      const finished = new Promise<void>((resolve) => (finish = resolve));
      (pane as unknown as { getAnimations: () => unknown[] }).getAnimations =
        () => [
          {
            playState: 'running',
            effect: { getComputedTiming: () => ({ endTime: 120 }) },
            finished,
          },
        ];

      key(ctx, 'Escape');

      expect(pane.hasAttribute('data-andes-closing')).toBe(true);
      expect(pane.firstElementChild?.hasAttribute('data-andes-closing')).toBe(
        true,
      );
      finish();
      await finished;
    });
  });

  describe('field spec', () => {
    it('applies size, variant and status classes and the invalid state', () => {
      const ctx = createHost((host) => {
        host.size.set('lg');
        host.status.set('error');
      });
      const wrapper = ctx.fixture.nativeElement.querySelector(
        '.andes-mentions-wrapper',
      ) as HTMLElement;

      expect(wrapper.classList).toContain('andes-mentions-wrapper--lg');
      expect(wrapper.classList).toContain('andes-mentions-wrapper--outlined');
      expect(wrapper.classList).toContain('andes-mentions-wrapper--invalid');
      expect(ctx.field().getAttribute('aria-invalid')).toBe('true');
    });

    it('flags a warning without marking the field invalid', () => {
      const ctx = createHost((host) => host.status.set('warning'));
      const wrapper = ctx.fixture.nativeElement.querySelector(
        '.andes-mentions-wrapper',
      ) as HTMLElement;

      expect(wrapper.classList).toContain('andes-mentions-wrapper--warning');
      expect(ctx.field().hasAttribute('aria-invalid')).toBe(false);
    });

    it('shows a counter and flags it past maxLength', () => {
      const ctx = createHost((host) => {
        host.showCount.set(true);
        host.maxLength.set(5);
      });
      const count = () =>
        ctx.fixture.nativeElement.querySelector(
          '.andes-mentions__count',
        ) as HTMLElement;

      type(ctx, 'abc');
      expect(count().textContent?.trim()).toBe('3/5');
      expect(count().classList).not.toContain(
        'andes-mentions__count--exceeded',
      );
      expect(ctx.field().getAttribute('aria-describedby')).toBe(count().id);

      ctx.host.text.set('abcdefg');
      ctx.fixture.detectChanges();
      expect(count().classList).toContain('andes-mentions__count--exceeded');
      expect(ctx.field().getAttribute('aria-invalid')).toBe('true');
    });

    it('uses the single-ring focus, never an outline offset from a bordered box', () => {
      const css = readFileSync(
        'packages/ui/src/lib/mentions/mentions.css',
        'utf8',
      );
      const focus =
        /\.andes-mentions-wrapper:focus-within\s*\{([\s\S]*?)\}/.exec(
          css,
        )?.[1] ?? '';

      expect(focus).toContain(
        'border-color: var(--_andes-mentions-border-focus)',
      );
      expect(focus).toContain(
        'box-shadow: 0 0 0 2px var(--_andes-mentions-ring)',
      );
      expect(focus).toContain('outline: none');
      expect(css).not.toContain('outline-offset');
      expect(css).toMatch(/\.andes-mentions__control\s*\{[^}]*outline: 0/);
    });

    it('has the field heights: 14/22 text, 32 default, 24 small, 40 large', () => {
      const css = readFileSync(
        'packages/ui/src/lib/mentions/mentions.css',
        'utf8',
      );

      expect(css).toContain(
        'font-size: var(--andes-control-font-size-md, 0.875rem)',
      );
      expect(css).toContain('--_andes-mentions-line: 1.375rem');
      expect(css).toContain(
        'font-size: var(--andes-control-font-size-lg, 1rem)',
      );
      expect(css).toContain('--_andes-mentions-line: 1.5rem');
      expect(css).toMatch(/--_andes-mentions-line: 1\.5rem/);
    });

    it('styles the popup like the other suggestion lists: 14/22 text, token shadow, 150ms enter', () => {
      const css = readFileSync(
        'packages/ui/src/lib/mentions/mentions.css',
        'utf8',
      );
      const panel =
        /\.andes-mentions-panel\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

      expect(panel).toContain(
        'font-family: var(--andes-font-family), sans-serif',
      );
      expect(panel).toContain('--andes-shadow-md');
      expect(panel).toContain('var(--andes-motion-duration-mid, 150ms)');
      expect(css).toMatch(
        /@keyframes andes-mentions-enter\s*\{[^}]*scale\(0\.97\)/,
      );
    });

    it('exits on data-andes-closing in 120ms and drops it under reduced motion', () => {
      const css = readFileSync(
        'packages/ui/src/lib/mentions/mentions.css',
        'utf8',
      );
      const rule =
        /\.andes-mentions-panel\[data-andes-closing\]\s*\{([\s\S]*?)\n\}/.exec(
          css,
        )?.[1] ?? '';

      expect(rule).toContain('andes-mentions-exit');
      expect(rule).toContain('var(--andes-motion-duration-fast, 120ms)');
      expect(rule).toContain('forwards');
      const reduced =
        /@media \(prefers-reduced-motion: reduce\) \{\s*\.andes-mentions-panel,[\s\S]*?\n\}\n/.exec(
          css,
        )?.[0] ?? '';
      expect(reduced).toContain('[data-andes-closing]');
      expect(reduced).toContain('animation: none');
    });

    it('never wraps a selector onto a line that starts with a combinator', () => {
      const css = readFileSync(
        'packages/ui/src/lib/mentions/mentions.css',
        'utf8',
      );
      expect(css.split('\n').filter((line) => /^\s*[>+~]/.test(line))).toEqual(
        [],
      );
    });
  });

  describe('forms', () => {
    it('writes a reactive control value into the field and reports typing back', () => {
      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      const field = fixture.nativeElement.querySelector(
        'textarea',
      ) as HTMLTextAreaElement;
      expect(field.value).toBe('start');

      fixture.componentInstance.control.setValue('changed');
      fixture.detectChanges();
      expect(field.value).toBe('changed');

      field.focus();
      field.value = 'changed @ma';
      field.setSelectionRange(11, 11);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      expect(fixture.componentInstance.control.value).toBe('changed @ma');

      field.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          bubbles: true,
          cancelable: true,
        }),
      );
      fixture.detectChanges();
      expect(fixture.componentInstance.control.value).toBe('changed @maria ');
    });

    it('disables the field from the control and marks it touched on blur', () => {
      const fixture = TestBed.createComponent(ReactiveHost);
      fixture.detectChanges();
      const field = fixture.nativeElement.querySelector(
        'textarea',
      ) as HTMLTextAreaElement;
      const control = fixture.componentInstance.control;

      field.focus();
      field.blur();
      expect(control.touched).toBe(true);

      control.disable();
      fixture.detectChanges();
      expect(field.disabled).toBe(true);
    });

    it('works with ngModel', async () => {
      const fixture = TestBed.createComponent(NgModelHost);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const field = fixture.nativeElement.querySelector(
        'textarea',
      ) as HTMLTextAreaElement;
      expect(field.value).toBe('hello');

      field.value = 'hello there';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      expect(fixture.componentInstance.text).toBe('hello there');
    });
  });

  describe('composition', () => {
    it('waits for the end of an IME composition before looking for a mention', () => {
      const ctx = createHost();
      const field = ctx.field();
      field.focus();
      field.dispatchEvent(new CompositionEvent('compositionstart'));
      field.value = '@an';
      field.setSelectionRange(3, 3);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      ctx.fixture.detectChanges();
      expect(ctx.panel()).toBeNull();
      expect(ctx.host.text()).toBe('@an');

      field.dispatchEvent(new CompositionEvent('compositionend'));
      ctx.fixture.detectChanges();
      ctx.fixture.detectChanges();
      expect(ctx.panel()).toBeTruthy();
    });
  });

  describe('imperative api', () => {
    it('focuses the field and places the caret', () => {
      const ctx = createHost();
      type(ctx, 'abcdef');
      ctx.field().blur();

      ctx.host.mentions().focus({ cursor: 'start' });
      expect(document.activeElement).toBe(ctx.field());
      expect(ctx.field().selectionStart).toBe(0);

      ctx.host.mentions().blur();
      expect(document.activeElement).not.toBe(ctx.field());
    });

    it('exposes the overlay it opens for the list', () => {
      const ctx = createHost();
      type(ctx, '@');
      const overlay = ctx.host.mentions()['overlay'] as AndesOverlayPrimitive;

      expect(overlay.isOpen()).toBe(true);
      expect(ctx.host.openChanges).toEqual([true]);
      key(ctx, 'Escape');
      expect(overlay.isOpen()).toBe(false);
      expect(ctx.host.openChanges).toEqual([true, false]);
    });
  });
});
