import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AndesLink } from './link';
import { AndesParagraph } from './paragraph';
import { AndesText } from './text';
import { AndesTitle } from './title';
import {
  AndesTypographyCopyConfig,
  AndesTypographyEditConfig,
  AndesTypographyEllipsisConfig,
  AndesTypographyTag,
  AndesTypographyType,
} from './typography-types';

const css = readFileSync(
  join(process.cwd(), 'packages/ui/src/lib/typography/typography.css'),
  'utf8',
);

/** Records every observer so a test can fire the callback after faking the layout. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  constructor(private readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  observe(): void {
    /* nothing to observe */
  }
  unobserve(): void {
    /* nothing to observe */
  }
  disconnect(): void {
    FakeResizeObserver.instances = FakeResizeObserver.instances.filter(
      (item) => item !== this,
    );
  }
  fire(): void {
    this.callback();
  }
}

function fakeLayout(
  el: HTMLElement,
  metrics: Partial<
    Record<
      'scrollWidth' | 'clientWidth' | 'scrollHeight' | 'clientHeight',
      number
    >
  >,
): void {
  for (const [key, value] of Object.entries(metrics)) {
    Object.defineProperty(el, key, { configurable: true, get: () => value });
  }
}

function fireObservers(): void {
  for (const observer of [...FakeResizeObserver.instances]) {
    observer.fire();
  }
}

@Component({
  imports: [AndesText],
  template: `<andes-text
    [type]="type()"
    [size]="size()"
    [disabled]="disabled()"
    [strong]="strong()"
    [italic]="italic()"
    [underline]="underline()"
    [delete]="deleted()"
    [mark]="mark()"
    [code]="code()"
    [keyboard]="keyboard()"
    [as]="tag()"
    >Quarterly report</andes-text
  >`,
})
class TextHostComponent {
  readonly type = signal<AndesTypographyType | undefined>(undefined);
  readonly size = signal<'md' | 'sm'>('md');
  readonly disabled = signal(false);
  readonly strong = signal(false);
  readonly italic = signal(false);
  readonly underline = signal(false);
  readonly deleted = signal(false);
  readonly mark = signal(false);
  readonly code = signal(false);
  readonly keyboard = signal(false);
  readonly tag = signal<AndesTypographyTag | undefined>(undefined);
}

@Component({
  imports: [AndesTitle],
  template: `<andes-title [level]="level()" [as]="tag()"
    >Invoices</andes-title
  >`,
})
class TitleHostComponent {
  readonly level = signal<unknown>(1);
  readonly tag = signal<AndesTypographyTag | undefined>(undefined);
}

@Component({
  imports: [AndesParagraph],
  template: `<andes-paragraph>Body copy</andes-paragraph>`,
})
class ParagraphHostComponent {}

@Component({
  imports: [AndesText],
  template: `<andes-text
    [ellipsis]="ellipsis()"
    [(expanded)]="expanded"
    (truncated)="truncatedEvents.push($event)"
    >A very long description that does not fit in its container</andes-text
  >`,
})
class EllipsisHostComponent {
  readonly ellipsis = signal<boolean | AndesTypographyEllipsisConfig>(true);
  readonly expanded = signal(false);
  readonly truncatedEvents: boolean[] = [];
}

@Component({
  imports: [AndesText],
  template: `<andes-text
    [copyable]="copyable()"
    (copied)="copiedValues.push($event)"
    >Invoice F001-000123</andes-text
  >`,
})
class CopyHostComponent {
  readonly copyable = signal<boolean | AndesTypographyCopyConfig>(true);
  readonly copiedValues: string[] = [];
}

@Component({
  imports: [AndesText],
  template: `<andes-text
    [editable]="editable()"
    [(editing)]="editing"
    [(text)]="value"
    (edit)="events.push('edit:' + $event)"
    (editChange)="events.push('change:' + $event)"
    (save)="events.push('save:' + $event)"
    (editCancel)="events.push('cancel')"
    >Draft name</andes-text
  >`,
})
class EditHostComponent {
  readonly editable = signal<boolean | AndesTypographyEditConfig>(true);
  readonly editing = signal(false);
  readonly value = signal<string | undefined>(undefined);
  readonly events: string[] = [];
}

@Component({
  imports: [AndesLink],
  template: `<andes-link
    [href]="href()"
    [external]="external()"
    [target]="target()"
    [disabled]="disabled()"
    [type]="type()"
    [copyable]="copyable()"
    >Open dashboard</andes-link
  >`,
})
class LinkHostComponent {
  readonly href = signal<string | undefined>('/dashboard');
  readonly external = signal(false);
  readonly target = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly type = signal<AndesTypographyType | undefined>(undefined);
  readonly copyable = signal(false);
}

function setup<T>(component: new () => T): {
  fixture: ComponentFixture<T>;
  host: T;
  el: HTMLElement;
} {
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return {
    fixture,
    host: fixture.componentInstance,
    el: fixture.nativeElement as HTMLElement,
  };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('typography', () => {
  describe('AndesTitle', () => {
    it('renders the level as the matching heading', () => {
      const { fixture, host, el } = setup(TitleHostComponent);

      for (const level of [1, 2, 3, 4, 5]) {
        host.level.set(level);
        fixture.detectChanges();
        expect(el.querySelector(`h${level}`)?.textContent).toContain(
          'Invoices',
        );
        expect(
          el.querySelector('andes-title')?.getAttribute('data-level'),
        ).toBe(String(level));
      }
    });

    it('accepts a level written as an attribute string and clamps it to 1-5', () => {
      const { fixture, host, el } = setup(TitleHostComponent);

      host.level.set('3');
      fixture.detectChanges();
      expect(el.querySelector('h3')).toBeTruthy();

      host.level.set(9);
      fixture.detectChanges();
      expect(el.querySelector('h5')).toBeTruthy();

      host.level.set(0);
      fixture.detectChanges();
      expect(el.querySelector('h1')).toBeTruthy();
    });

    it('renders another element with `as` without changing the level look', () => {
      const { fixture, host, el } = setup(TitleHostComponent);
      host.level.set(2);
      host.tag.set('div');
      fixture.detectChanges();

      expect(el.querySelector('h2')).toBeNull();
      expect(el.querySelector('div.andes-typography__text')).toBeTruthy();
      expect(el.querySelector('andes-title')?.getAttribute('data-level')).toBe(
        '2',
      );
    });

    it('sets the type scale and weight on the host', () => {
      const scale: Record<string, [string, string]> = {
        '1': ['1.5rem', '2rem'],
        '2': ['1.25rem', '1.75rem'],
        '3': ['1.125rem', '1.625rem'],
        '4': ['1rem', '1.5rem'],
        '5': ['0.875rem', '1.375rem'],
      };
      for (const [level, [size, line]] of Object.entries(scale)) {
        const rule = css.match(
          new RegExp(
            `:host\\(\\.andes-typography--title\\[data-level='${level}'\\]\\)\\s*\\{([^}]*)\\}`,
          ),
        )?.[1];
        expect(rule).toContain(`font-size: ${size}`);
        expect(rule).toContain(`line-height: ${line}`);
      }
      expect(css).toMatch(
        /:host\(\.andes-typography--title\)\s*\{[^}]*font-weight: 600/,
      );
    });
  });

  describe('AndesParagraph', () => {
    it('renders a p element', () => {
      const { el } = setup(ParagraphHostComponent);

      expect(el.querySelector('p')?.textContent).toContain('Body copy');
      expect(
        el.querySelector('andes-paragraph')?.getAttribute('data-slot'),
      ).toBe('paragraph');
    });
  });

  describe('AndesText', () => {
    it('renders a span with the projected text', () => {
      const { el } = setup(TextHostComponent);

      expect(el.querySelector('span.andes-typography__text')?.textContent).toBe(
        'Quarterly report',
      );
    });

    it('reflects type, size and disabled on the host', () => {
      const { fixture, host, el } = setup(TextHostComponent);
      const text = () => el.querySelector('andes-text') as HTMLElement;

      host.type.set('danger');
      host.size.set('sm');
      host.disabled.set(true);
      fixture.detectChanges();

      expect(text().getAttribute('data-type')).toBe('danger');
      expect(text().getAttribute('data-size')).toBe('sm');
      expect(text().hasAttribute('data-disabled')).toBe(true);
      expect(
        el
          .querySelector('.andes-typography__text')
          ?.getAttribute('aria-disabled'),
      ).toBe('true');
    });

    it('wraps the text in the semantic element of every modifier, in a fixed order', () => {
      const { fixture, host, el } = setup(TextHostComponent);
      host.strong.set(true);
      host.italic.set(true);
      host.underline.set(true);
      host.deleted.set(true);
      host.mark.set(true);
      host.code.set(true);
      host.keyboard.set(true);
      fixture.detectChanges();

      const chain = ['strong', 'em', 'u', 'del', 'mark', 'code', 'kbd'];
      let node: Element | null = el.querySelector('.andes-typography__text');
      for (const tag of chain) {
        node = node?.firstElementChild ?? null;
        expect(node?.tagName.toLowerCase()).toBe(tag);
      }
      expect(node?.textContent).toBe('Quarterly report');
    });

    it('renders only the modifiers that are on', () => {
      const { fixture, host, el } = setup(TextHostComponent);
      host.code.set(true);
      fixture.detectChanges();

      expect(el.querySelector('code')?.textContent).toBe('Quarterly report');
      expect(el.querySelector('strong, em, u, del, mark, kbd')).toBeNull();
    });

    it('renders in the element `as` names', () => {
      const { fixture, host, el } = setup(TextHostComponent);
      host.tag.set('h3');
      fixture.detectChanges();

      expect(el.querySelector('h3.andes-typography__text')).toBeTruthy();
    });

    it('shows the `text` value instead of projected content', async () => {
      const { fixture, el } = setup(EditHostComponent);
      const host = fixture.componentInstance;
      host.value.set('Controlled value');
      await settle(fixture);

      expect(el.querySelector('.andes-typography__text')?.textContent).toBe(
        'Controlled value',
      );
    });
  });

  describe('ellipsis', () => {
    beforeEach(() => {
      FakeResizeObserver.instances = [];
      (
        document.defaultView as unknown as { ResizeObserver: unknown }
      ).ResizeObserver = FakeResizeObserver;
    });

    afterEach(() => {
      delete (document.defaultView as unknown as { ResizeObserver?: unknown })
        .ResizeObserver;
    });

    async function createEllipsis(
      ellipsis: boolean | AndesTypographyEllipsisConfig = true,
    ) {
      const result = setup(EllipsisHostComponent);
      result.host.ellipsis.set(ellipsis);
      await settle(result.fixture);
      const textEl = result.el.querySelector(
        '.andes-typography__text',
      ) as HTMLElement;
      return { ...result, textEl };
    }

    function hover(el: HTMLElement): void {
      el.dispatchEvent(new MouseEvent('mouseenter'));
    }

    it('truncates to a single line by default', async () => {
      const { textEl, el } = await createEllipsis();

      expect(textEl.classList).toContain('andes-typography__text--ellipsis');
      expect(textEl.classList).not.toContain(
        'andes-typography__text--multiline',
      );
      expect(el.querySelector('andes-text')?.getAttribute('data-state')).toBe(
        'collapsed',
      );
    });

    it('clamps to the requested number of rows', async () => {
      const { textEl, el } = await createEllipsis({ rows: 3 });

      expect(textEl.classList).toContain('andes-typography__text--multiline');
      expect(
        (el.querySelector('andes-text') as HTMLElement).style.getPropertyValue(
          '--andes-typography-rows',
        ),
      ).toBe('3');
    });

    it('detects a cut-off single line from the scroll width and reports it', async () => {
      const { fixture, host, textEl } = await createEllipsis({
        expandable: true,
      });
      fakeLayout(textEl, { scrollWidth: 400, clientWidth: 200 });
      fireObservers();
      await settle(fixture);

      expect(host.truncatedEvents).toEqual([true]);
      expect(
        fixture.nativeElement.querySelector('.andes-typography__expander'),
      ).toBeTruthy();

      fakeLayout(textEl, { scrollWidth: 200, clientWidth: 200 });
      fireObservers();
      await settle(fixture);

      expect(host.truncatedEvents).toEqual([true, false]);
      expect(
        fixture.nativeElement.querySelector('.andes-typography__expander'),
      ).toBeNull();
    });

    it('detects a cut-off multi-line text from the scroll height', async () => {
      const { fixture, host, textEl } = await createEllipsis({
        rows: 2,
        expandable: true,
      });
      fakeLayout(textEl, { scrollHeight: 66, clientHeight: 44 });
      fireObservers();
      await settle(fixture);

      expect(host.truncatedEvents).toEqual([true]);
    });

    it('shows no expander while the text fits', async () => {
      const { fixture, textEl } = await createEllipsis({ expandable: true });
      fakeLayout(textEl, { scrollWidth: 200, clientWidth: 200 });
      fireObservers();
      await settle(fixture);

      expect(
        fixture.nativeElement.querySelector('.andes-typography__expander'),
      ).toBeNull();
    });

    it('expands and collapses with the more / less toggle', async () => {
      const { fixture, host, el, textEl } = await createEllipsis({
        rows: 2,
        expandable: true,
      });
      fakeLayout(textEl, { scrollHeight: 66, clientHeight: 44 });
      fireObservers();
      await settle(fixture);

      const toggle = () =>
        el.querySelector('.andes-typography__expander') as HTMLButtonElement;
      expect(toggle().textContent?.trim()).toBe('more');
      expect(toggle().getAttribute('aria-expanded')).toBe('false');
      expect(toggle().getAttribute('aria-controls')).toBe(textEl.id);

      toggle().click();
      await settle(fixture);

      expect(host.expanded()).toBe(true);
      expect(toggle().textContent?.trim()).toBe('less');
      expect(toggle().getAttribute('aria-expanded')).toBe('true');
      expect(textEl.classList).toContain('andes-typography__text--expanded');

      toggle().click();
      await settle(fixture);

      expect(host.expanded()).toBe(false);
      expect(toggle().textContent?.trim()).toBe('more');
    });

    it('keeps the less toggle while expanded even though nothing is cut any more', async () => {
      const { fixture, host, el, textEl } = await createEllipsis({
        expandable: true,
      });
      fakeLayout(textEl, { scrollWidth: 400, clientWidth: 200 });
      fireObservers();
      host.expanded.set(true);
      await settle(fixture);
      fakeLayout(textEl, { scrollWidth: 200, clientWidth: 200 });
      fireObservers();
      await settle(fixture);

      expect(el.querySelector('.andes-typography__expander')).toBeTruthy();
    });

    it('uses custom toggle labels', async () => {
      const { fixture, el, textEl } = await createEllipsis({
        expandable: true,
        expandText: 'Show more',
        collapseText: 'Show less',
      });
      fakeLayout(textEl, { scrollWidth: 400, clientWidth: 200 });
      fireObservers();
      await settle(fixture);

      expect(
        el.querySelector('.andes-typography__expander')?.textContent?.trim(),
      ).toBe('Show more');
    });

    it('shows the full text in a popup only while the text is cut', async () => {
      const { fixture, el, textEl } = await createEllipsis({ tooltip: true });
      const host = el.querySelector('andes-text') as HTMLElement;

      hover(host);
      await settle(fixture);
      expect(el.querySelector('.andes-typography__tooltip')).toBeNull();

      fakeLayout(textEl, { scrollWidth: 400, clientWidth: 200 });
      fireObservers();
      await settle(fixture);
      hover(host);
      await settle(fixture);

      const tooltip = el.querySelector('.andes-typography__tooltip');
      expect(tooltip?.textContent).toContain(
        'A very long description that does not fit in its container',
      );
      expect(tooltip?.getAttribute('aria-hidden')).toBe('true');

      host.dispatchEvent(new MouseEvent('mouseleave'));
      await settle(fixture);
      expect(el.querySelector('.andes-typography__tooltip')).toBeNull();
    });

    it('flips the popup below the text when there is no room above it', async () => {
      const { fixture, el, textEl } = await createEllipsis({ tooltip: true });
      const host = el.querySelector('andes-text') as HTMLElement;
      fakeLayout(textEl, { scrollWidth: 400, clientWidth: 200 });
      fireObservers();
      await settle(fixture);

      const rect = (top: number) =>
        ({
          top,
          bottom: top + 22,
          left: 0,
          right: 100,
          width: 100,
          height: 22,
        }) as DOMRect;
      vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(rect(2));
      hover(host);
      await settle(fixture);
      expect(
        el.querySelector('.andes-typography__tooltip--bottom'),
      ).toBeTruthy();

      host.dispatchEvent(new MouseEvent('mouseleave'));
      await settle(fixture);
      vi.spyOn(host, 'getBoundingClientRect').mockReturnValue(rect(400));
      hover(host);
      await settle(fixture);
      expect(el.querySelector('.andes-typography__tooltip')).toBeTruthy();
      expect(el.querySelector('.andes-typography__tooltip--bottom')).toBeNull();
    });

    it('opens the popup on focus and closes it on Escape', async () => {
      const { fixture, el, textEl } = await createEllipsis({ tooltip: true });
      const host = el.querySelector('andes-text') as HTMLElement;
      fakeLayout(textEl, { scrollWidth: 400, clientWidth: 200 });
      fireObservers();
      await settle(fixture);

      host.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await settle(fixture);
      expect(el.querySelector('.andes-typography__tooltip')).toBeTruthy();

      host.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await settle(fixture);
      expect(el.querySelector('.andes-typography__tooltip')).toBeNull();
    });

    it('lets a string replace the popup text and skips the popup when `tooltip` is off', async () => {
      const first = await createEllipsis({ tooltip: 'Custom hint' });
      fakeLayout(first.textEl, { scrollWidth: 400, clientWidth: 200 });
      fireObservers();
      await settle(first.fixture);
      hover(first.el.querySelector('andes-text') as HTMLElement);
      await settle(first.fixture);
      expect(
        first.el.querySelector('.andes-typography__tooltip')?.textContent,
      ).toContain('Custom hint');
    });

    it('does not show the popup for a text that is not truncating', async () => {
      const { fixture, el } = await createEllipsis({ tooltip: false });
      hover(el.querySelector('andes-text') as HTMLElement);
      await settle(fixture);

      expect(el.querySelector('.andes-typography__tooltip')).toBeNull();
    });

    it('stops observing when ellipsis is turned off', async () => {
      const { fixture, host, el } = await createEllipsis();
      expect(FakeResizeObserver.instances.length).toBeGreaterThan(0);

      host.ellipsis.set(false);
      await settle(fixture);

      expect(FakeResizeObserver.instances).toHaveLength(0);
      expect(el.querySelector('.andes-typography__text--ellipsis')).toBeNull();
    });

    it('works where ResizeObserver does not exist', async () => {
      delete (document.defaultView as unknown as { ResizeObserver?: unknown })
        .ResizeObserver;
      const { fixture, el } = await createEllipsis({ expandable: true });
      await settle(fixture);

      expect(
        el.querySelector('.andes-typography__text--ellipsis'),
      ).toBeTruthy();
    });
  });

  describe('copyable', () => {
    let writeText: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers();
      writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
    });

    const button = (el: HTMLElement) =>
      el.querySelector('.andes-typography__copy') as HTMLButtonElement;

    it('renders a labelled copy button', () => {
      const { el } = setup(CopyHostComponent);

      expect(button(el).getAttribute('aria-label')).toBe('Copy');
      expect(button(el).getAttribute('title')).toBe('Copy');
      expect(button(el).getAttribute('type')).toBe('button');
    });

    it('copies the visible text, emits `copied` and announces it', async () => {
      const { fixture, host, el } = setup(CopyHostComponent);

      button(el).click();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      expect(writeText).toHaveBeenCalledWith('Invoice F001-000123');
      expect(host.copiedValues).toEqual(['Invoice F001-000123']);
      expect(
        el.querySelector('.andes-typography__status')?.textContent,
      ).toContain('Copied');
      expect(button(el).getAttribute('title')).toBe('Copied');
      expect(button(el).classList).toContain('andes-typography__action--done');
    });

    it('goes back to the copy icon after two seconds', async () => {
      const { fixture, el } = setup(CopyHostComponent);

      button(el).click();
      await vi.advanceTimersByTimeAsync(1900);
      fixture.detectChanges();
      expect(button(el).classList).toContain('andes-typography__action--done');

      await vi.advanceTimersByTimeAsync(200);
      fixture.detectChanges();
      expect(button(el).classList).not.toContain(
        'andes-typography__action--done',
      );
      expect(
        el.querySelector('.andes-typography__status')?.textContent?.trim(),
      ).toBe('');
    });

    it('restarts the two seconds when copied again', async () => {
      const { fixture, el } = setup(CopyHostComponent);

      button(el).click();
      await vi.advanceTimersByTimeAsync(1500);
      button(el).click();
      await vi.advanceTimersByTimeAsync(1500);
      fixture.detectChanges();

      expect(button(el).classList).toContain('andes-typography__action--done');
    });

    it('copies custom text and uses custom labels', async () => {
      const { fixture, host, el } = setup(CopyHostComponent);
      host.copyable.set({
        text: 'F001-000123',
        label: 'Copy number',
        copiedLabel: 'Number copied',
      });
      fixture.detectChanges();

      expect(button(el).getAttribute('aria-label')).toBe('Copy number');
      button(el).click();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      expect(writeText).toHaveBeenCalledWith('F001-000123');
      expect(
        el.querySelector('.andes-typography__status')?.textContent,
      ).toContain('Number copied');
    });

    it('can drop the native tooltip', () => {
      const { fixture, host, el } = setup(CopyHostComponent);
      host.copyable.set({ tooltip: false });
      fixture.detectChanges();

      expect(button(el).hasAttribute('title')).toBe(false);
      expect(button(el).getAttribute('aria-label')).toBe('Copy');
    });

    it('falls back to a hidden textarea and execCommand without the clipboard API', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
      const execCommand = vi.fn().mockReturnValue(true);
      Object.defineProperty(document, 'execCommand', {
        configurable: true,
        value: execCommand,
      });
      const { fixture, host, el } = setup(CopyHostComponent);

      button(el).click();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      expect(execCommand).toHaveBeenCalledWith('copy');
      expect(host.copiedValues).toEqual(['Invoice F001-000123']);
      expect(document.querySelector('body > textarea')).toBeNull();
    });

    it('falls back when the async API rejects, and stays quiet when both fail', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      const execCommand = vi.fn().mockReturnValue(false);
      Object.defineProperty(document, 'execCommand', {
        configurable: true,
        value: execCommand,
      });
      const { fixture, host, el } = setup(CopyHostComponent);

      button(el).click();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      expect(execCommand).toHaveBeenCalled();
      expect(host.copiedValues).toEqual([]);
      expect(button(el).classList).not.toContain(
        'andes-typography__action--done',
      );
    });

    it('disables the button and copies nothing when the text is disabled', async () => {
      @Component({
        imports: [AndesText],
        template: `<andes-text copyable disabled>Locked</andes-text>`,
      })
      class DisabledCopyHost {}
      const { fixture, el } = setup(DisabledCopyHost);

      expect(button(el).disabled).toBe(true);
      button(el).click();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();

      expect(writeText).not.toHaveBeenCalled();
    });

    it('has a live region that is polite', () => {
      const { el } = setup(CopyHostComponent);
      const region = el.querySelector('.andes-typography__status');

      expect(region?.getAttribute('role')).toBe('status');
      expect(region?.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('editable', () => {
    const editButton = (el: HTMLElement) =>
      el.querySelector('.andes-typography__edit') as HTMLButtonElement;
    const field = (el: HTMLElement) =>
      el.querySelector(
        'textarea.andes-typography__field',
      ) as HTMLTextAreaElement;

    function type(el: HTMLElement, value: string): void {
      field(el).value = value;
      field(el).dispatchEvent(new Event('input', { bubbles: true }));
    }

    function press(el: HTMLElement, key: string, init: KeyboardEventInit = {}) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      });
      field(el).dispatchEvent(event);
      return event;
    }

    it('shows a pencil button with an accessible name', () => {
      const { el } = setup(EditHostComponent);

      expect(editButton(el).getAttribute('aria-label')).toBe('Edit');
      expect(field(el)).toBeNull();
    });

    it('swaps the text for a field holding the current text and focuses it', async () => {
      const { fixture, host, el } = setup(EditHostComponent);

      editButton(el).click();
      await settle(fixture);

      expect(host.editing()).toBe(true);
      expect(field(el).value).toBe('Draft name');
      expect(document.activeElement).toBe(field(el));
      expect(host.events).toEqual(['edit:Draft name']);
      expect(el.querySelector('.andes-typography__text')).toBeNull();
      expect(el.querySelector('andes-text')?.getAttribute('data-state')).toBe(
        'editing',
      );
    });

    it('emits the draft on every keystroke', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      editButton(el).click();
      await settle(fixture);

      type(el, 'Draft name 2');
      type(el, 'Final');

      expect(host.events.slice(1)).toEqual([
        'change:Draft name 2',
        'change:Final',
      ]);
    });

    it('saves on Enter, shows the new text and gives focus back to the pencil', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      editButton(el).click();
      await settle(fixture);
      type(el, 'Final name');

      const event = press(el, 'Enter');
      await settle(fixture);

      expect(event.defaultPrevented).toBe(true);
      expect(host.editing()).toBe(false);
      expect(host.value()).toBe('Final name');
      expect(host.events).toContain('save:Final name');
      expect(el.querySelector('.andes-typography__text')?.textContent).toBe(
        'Final name',
      );
      expect(field(el)).toBeNull();
      expect(document.activeElement).toBe(editButton(el));
    });

    it('does not save on Shift+Enter or while composing', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      editButton(el).click();
      await settle(fixture);

      expect(press(el, 'Enter', { shiftKey: true }).defaultPrevented).toBe(
        false,
      );
      expect(press(el, 'Enter', { isComposing: true }).defaultPrevented).toBe(
        false,
      );
      expect(host.editing()).toBe(true);
    });

    it('saves when the field loses focus', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      editButton(el).click();
      await settle(fixture);
      type(el, 'Blurred value');

      field(el).dispatchEvent(new FocusEvent('blur'));
      await settle(fixture);

      expect(host.editing()).toBe(false);
      expect(host.events).toContain('save:Blurred value');
      expect(host.value()).toBe('Blurred value');
      expect(document.activeElement).not.toBe(editButton(el));
    });

    it('cancels on Escape without saving and keeps the old text', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      editButton(el).click();
      await settle(fixture);
      type(el, 'Discard me');

      press(el, 'Escape');
      await settle(fixture);

      expect(host.editing()).toBe(false);
      expect(host.events).toContain('cancel');
      expect(host.events.some((item) => item.startsWith('save'))).toBe(false);
      expect(host.value()).toBeUndefined();
      expect(el.querySelector('.andes-typography__text')?.textContent).toBe(
        'Draft name',
      );
      expect(document.activeElement).toBe(editButton(el));
    });

    it('does not fire save twice when Enter is followed by the blur the removal causes', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      editButton(el).click();
      await settle(fixture);
      const input = field(el);

      press(el, 'Enter');
      input.dispatchEvent(new FocusEvent('blur'));
      await settle(fixture);

      expect(
        host.events.filter((item) => item.startsWith('save')),
      ).toHaveLength(1);
    });

    it('applies maxLength and shows a counter', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      host.editable.set({ maxLength: 20 });
      editButton(el).click();
      await settle(fixture);

      expect(field(el).getAttribute('maxlength')).toBe('20');
      expect(
        el.querySelector('.andes-typography__count')?.textContent,
      ).toContain('10 / 20');
      type(el, 'abc');
      fixture.detectChanges();
      expect(
        el.querySelector('.andes-typography__count')?.textContent,
      ).toContain('3 / 20');
    });

    it('names the field and starts from custom text', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      host.editable.set({ fieldLabel: 'Document name', text: 'From config' });
      fixture.detectChanges();
      editButton(el).click();
      await settle(fixture);

      expect(field(el).getAttribute('aria-label')).toBe('Document name');
      expect(field(el).value).toBe('From config');
    });

    it('keeps a fixed height when autoSize is off', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      host.editable.set({ autoSize: false });
      editButton(el).click();
      await settle(fixture);

      expect(field(el).classList).toContain('andes-typography__field--fixed');
    });

    it('can be opened and closed from outside', async () => {
      const { fixture, host, el } = setup(EditHostComponent);

      host.editing.set(true);
      await settle(fixture);
      expect(field(el)).toBeTruthy();
      expect(field(el).value).toBe('Draft name');
      expect(host.events).toEqual(['edit:Draft name']);

      host.editing.set(false);
      await settle(fixture);
      expect(field(el)).toBeNull();
    });

    it('opens from the text itself with the text trigger, by click and by Enter', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      host.editable.set({ triggerType: 'text' });
      await settle(fixture);
      const text = () =>
        el.querySelector('.andes-typography__text') as HTMLElement;

      expect(editButton(el)).toBeNull();
      expect(text().getAttribute('tabindex')).toBe('0');

      text().click();
      await settle(fixture);
      expect(host.editing()).toBe(true);

      host.editing.set(false);
      await settle(fixture);
      text().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await settle(fixture);
      expect(host.editing()).toBe(true);
    });

    it('keeps both triggers with `both`', async () => {
      const { fixture, host, el } = setup(EditHostComponent);
      host.editable.set({ triggerType: 'both' });
      await settle(fixture);

      expect(editButton(el)).toBeTruthy();
      expect(
        el.querySelector('.andes-typography__text')?.getAttribute('tabindex'),
      ).toBe('0');
    });

    it('closes the editor without saving when the text becomes disabled', async () => {
      @Component({
        imports: [AndesText],
        template: `<andes-text
          editable
          [disabled]="disabled()"
          (save)="saves = saves + 1"
          >x</andes-text
        >`,
      })
      class DisableHost {
        readonly disabled = signal(false);
        saves = 0;
      }
      const { fixture, host, el } = setup(DisableHost);
      editButton(el).click();
      await settle(fixture);
      expect(field(el)).toBeTruthy();

      host.disabled.set(true);
      await settle(fixture);

      expect(field(el)).toBeNull();
      expect(host.saves).toBe(0);
      expect(editButton(el).disabled).toBe(true);
    });
  });

  describe('AndesLink', () => {
    const anchor = (el: HTMLElement) =>
      el.querySelector('a') as HTMLAnchorElement;

    it('renders an anchor with the href', () => {
      const { el } = setup(LinkHostComponent);

      expect(anchor(el).getAttribute('href')).toBe('/dashboard');
      expect(anchor(el).textContent).toBe('Open dashboard');
      expect(el.querySelector('andes-link')?.getAttribute('data-slot')).toBe(
        'link',
      );
    });

    it('opens external links safely in a new tab with an announced glyph', () => {
      const { fixture, host, el } = setup(LinkHostComponent);
      host.external.set(true);
      fixture.detectChanges();

      expect(anchor(el).getAttribute('target')).toBe('_blank');
      expect(anchor(el).getAttribute('rel')).toBe('noopener noreferrer');
      const glyph = el.querySelector('.andes-link__external');
      expect(glyph?.getAttribute('role')).toBe('img');
      expect(glyph?.getAttribute('aria-label')).toBe('(opens in a new tab)');
    });

    it('does not copy the glyph label with the link text', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
      const { fixture, host, el } = setup(LinkHostComponent);
      host.external.set(true);
      host.copyable.set(true);
      fixture.detectChanges();

      (
        el.querySelector('.andes-typography__copy') as HTMLButtonElement
      ).click();
      await fixture.whenStable();

      expect(writeText).toHaveBeenCalledWith('Open dashboard');
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
    });

    it('lets an explicit target win', () => {
      const { fixture, host, el } = setup(LinkHostComponent);
      host.external.set(true);
      host.target.set('_self');
      fixture.detectChanges();

      expect(anchor(el).getAttribute('target')).toBe('_self');
      expect(anchor(el).hasAttribute('rel')).toBe(false);
    });

    it('drops the href and says so when disabled', () => {
      const { fixture, host, el } = setup(LinkHostComponent);
      host.disabled.set(true);
      fixture.detectChanges();

      expect(anchor(el).hasAttribute('href')).toBe(false);
      expect(anchor(el).getAttribute('aria-disabled')).toBe('true');
      expect(anchor(el).getAttribute('role')).toBe('link');
    });

    it('swallows clicks while disabled', () => {
      const { fixture, host, el } = setup(LinkHostComponent);
      host.disabled.set(true);
      fixture.detectChanges();
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      anchor(el).dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('passes the type through to the label colour', () => {
      const { fixture, host, el } = setup(LinkHostComponent);
      host.type.set('danger');
      fixture.detectChanges();

      expect(el.querySelector('andes-link')?.getAttribute('data-type')).toBe(
        'danger',
      );
      expect(el.querySelector('andes-text')?.getAttribute('data-type')).toBe(
        'danger',
      );
    });
  });

  describe('stylesheet contract', () => {
    it('sets the body text to 14px / 22px and the small size to 12px / 20px', () => {
      expect(css).toMatch(
        /:host\s*\{[^}]*font-size: 0\.875rem;[^}]*line-height: 1\.375rem/,
      );
      expect(css).toMatch(
        /:host\(\[data-size='sm'\]\)\s*\{[^}]*font-size: 0\.75rem;[^}]*line-height: 1\.25rem/,
      );
    });

    it('takes the semantic text colours from the -text tokens', () => {
      for (const type of ['success', 'warning', 'danger']) {
        expect(css).toContain(
          `var(--andes-color-${type}-text, var(--andes-color-${type}))`,
        );
      }
    });

    it('clamps multi-line text with the rows variable', () => {
      expect(css).toMatch(
        /-webkit-line-clamp: var\(--andes-typography-rows, 2\)/,
      );
    });

    it('draws the editor with the single-ring field spec', () => {
      const focus = css.match(
        /\.andes-typography__field:focus\s*\{([^}]*)\}/,
      )?.[1];

      expect(focus).toContain('border-color: var(--andes-color-primary)');
      expect(focus).toContain('0 0 0 2px');
      expect(focus).toContain('outline: none');
      expect(css).toMatch(
        /\.andes-typography__field\s*\{[^}]*border: 1px solid var\(--andes-color-input\)/,
      );
    });

    it('drops the transitions and the popup animation under prefers-reduced-motion', () => {
      const block = css.match(
        /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/,
      )?.[0];

      expect(block).toMatch(/transition: none/);
      expect(block).toMatch(
        /\.andes-typography__tooltip\s*\{\s*animation: none/,
      );
    });

    it('uses logical properties only', () => {
      expect(css).not.toMatch(/margin-(left|right|top|bottom)\s*:/);
      expect(css).not.toMatch(/padding-(left|right|top|bottom)\s*:/);
      expect(css).not.toMatch(/\b(left|right):/);
    });

    it('hides the popup from assistive tech in the template', () => {
      const html = readFileSync(
        join(process.cwd(), 'packages/ui/src/lib/typography/typography.html'),
        'utf8',
      );

      expect(html).toMatch(
        /class="andes-typography__tooltip"[^>]*aria-hidden="true"/,
      );
    });
  });
});
