import { AndesOverlayPrimitive } from '@andes-ng/primitives';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesCommandDialog } from './command-dialog';
import type {
  AndesCommandEntry,
  AndesCommandItem,
  AndesCommandSelectEvent,
} from './command-types';

/**
 * jsdom reports zero geometry for every element, which makes the overlay's positioning
 * unhappy. A nominal non-zero size is enough to let it attach.
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

const ENTRIES: AndesCommandEntry[] = [
  {
    heading: 'Go to',
    items: [
      { value: 'home', label: 'Home' },
      { value: 'orders', label: 'Orders' },
    ],
  },
  {
    value: 'projects',
    label: 'Projects',
    children: [{ value: 'alpha', label: 'Alpha' }],
  },
];

@Component({
  imports: [AndesCommandDialog],
  template: `
    <button type="button" id="origin">origin</button>
    <andes-command-dialog
      [(open)]="open"
      [(search)]="search"
      [(pages)]="pages"
      [items]="items"
      [hotkey]="hotkey()"
      [closeOnSelect]="closeOnSelect()"
      [resetOnClose]="resetOnClose()"
      [width]="width()"
      label="Command palette"
      (itemSelected)="selected.push($event)"
    />
  `,
})
class HostComponent {
  readonly open = signal(false);
  readonly search = signal('');
  readonly pages = signal<readonly AndesCommandItem[]>([]);
  readonly hotkey = signal<string | null>('mod+k');
  readonly closeOnSelect = signal(true);
  readonly resetOnClose = signal(true);
  readonly width = signal<number | string>('32rem');
  readonly items = ENTRIES;
  readonly selected: AndesCommandSelectEvent[] = [];
}

describe('AndesCommandDialog', () => {
  withElementGeometry();

  function createHost(configure?: (host: HostComponent) => void) {
    const fixture = TestBed.createComponent(HostComponent);
    configure?.(fixture.componentInstance);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const flush = () => {
      fixture.detectChanges();
      fixture.detectChanges();
    };
    const surface = () =>
      document.querySelector('.andes-command-dialog') as HTMLElement | null;
    const input = () =>
      document.querySelector('.andes-command__input') as HTMLInputElement;
    const values = () =>
      Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).map(
        (option) => option.dataset['value'],
      );
    return { fixture, host, flush, surface, input, values };
  }

  type Ctx = ReturnType<typeof createHost>;

  function press(
    ctx: Ctx,
    target: EventTarget,
    key: string,
    init: KeyboardEventInit = {},
  ) {
    const codes: Record<string, number> = {
      Escape: 27,
      Enter: 13,
      ArrowDown: 40,
      Backspace: 8,
      End: 35,
    };
    const event = new KeyboardEvent('keydown', {
      key,
      keyCode: codes[key] ?? 0,
      bubbles: true,
      cancelable: true,
      ...init,
    });
    target.dispatchEvent(event);
    ctx.flush();
    return event;
  }

  const hotkey = (ctx: Ctx, init: KeyboardEventInit = {}) =>
    press(ctx, document.body, 'k', { ctrlKey: true, ...init });

  function type(ctx: Ctx, text: string) {
    const input = ctx.input();
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    ctx.flush();
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('opening and closing', () => {
    it('renders nothing until opened', () => {
      const ctx = createHost();
      expect(ctx.surface()).toBeNull();
    });

    it('opens from the open model as a labelled modal dialog over a scrim', () => {
      const ctx = createHost();
      ctx.host.open.set(true);
      ctx.flush();

      const surface = ctx.surface() as HTMLElement;
      expect(surface).toBeTruthy();
      expect(surface.getAttribute('role')).toBe('dialog');
      expect(surface.getAttribute('aria-modal')).toBe('true');
      expect(surface.getAttribute('aria-label')).toBe('Command palette');
      expect(
        document.querySelector('.cdk-overlay-backdrop.andes-command-backdrop'),
      ).toBeTruthy();
      expect(
        document
          .querySelector('.cdk-overlay-pane')
          ?.classList.contains('andes-command-pane'),
      ).toBe(true);
    });

    it('opens on init when open starts true', () => {
      const ctx = createHost((host) => host.open.set(true));
      ctx.flush();
      expect(ctx.surface()).toBeTruthy();
      expect(ctx.host.open()).toBe(true);
    });

    it('closes from the model', () => {
      const ctx = createHost();
      ctx.host.open.set(true);
      ctx.flush();
      ctx.host.open.set(false);
      ctx.flush();

      expect(ctx.surface()).toBeNull();
    });

    it('focuses the search box and returns focus to where it was on close', async () => {
      const ctx = createHost();
      const origin = ctx.fixture.nativeElement.querySelector(
        '#origin',
      ) as HTMLElement;
      origin.focus();

      ctx.host.open.set(true);
      ctx.flush();
      await ctx.fixture.whenStable();
      expect(document.activeElement).toBe(ctx.input());

      ctx.host.open.set(false);
      ctx.flush();
      expect(document.activeElement).toBe(origin);
    });

    it('closes on Escape and the model follows', () => {
      const ctx = createHost();
      ctx.host.open.set(true);
      ctx.flush();

      press(ctx, ctx.input(), 'Escape');

      expect(ctx.surface()).toBeNull();
      expect(ctx.host.open()).toBe(false);
    });

    it('closes when the scrim is clicked', () => {
      const ctx = createHost();
      ctx.host.open.set(true);
      ctx.flush();

      (
        document.querySelector('.cdk-overlay-backdrop') as HTMLElement
      ).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      ctx.flush();

      expect(ctx.surface()).toBeNull();
      expect(ctx.host.open()).toBe(false);
    });

    it('applies the width input to the pane', () => {
      const ctx = createHost((host) => host.width.set(480));
      ctx.host.open.set(true);
      ctx.flush();

      expect(
        (document.querySelector('.cdk-overlay-pane') as HTMLElement).style
          .width,
      ).toBe('480px');
    });

    it('show(), hide() and toggle() drive it', () => {
      const ctx = createHost();
      const dialog = ctx.fixture.debugElement.children[1]
        .componentInstance as AndesCommandDialog;

      dialog.show();
      ctx.flush();
      expect(ctx.surface()).toBeTruthy();
      dialog.hide();
      ctx.flush();
      expect(ctx.surface()).toBeNull();
      dialog.toggle();
      ctx.flush();
      expect(ctx.surface()).toBeTruthy();
    });
  });

  describe('hotkey', () => {
    it('toggles with Mod+K (Ctrl+K without Apple platform detection) from anywhere', () => {
      const ctx = createHost();

      const open = hotkey(ctx);
      expect(open.defaultPrevented).toBe(true);
      expect(ctx.surface()).toBeTruthy();
      expect(ctx.host.open()).toBe(true);

      hotkey(ctx);
      expect(ctx.surface()).toBeNull();
    });

    it('works while another field has focus', () => {
      const ctx = createHost();
      const field = document.createElement('input');
      document.body.append(field);
      field.focus();

      press(ctx, field, 'k', { ctrlKey: true });

      expect(ctx.surface()).toBeTruthy();
    });

    it('ignores other keys, extra modifiers, key repeat and composition', () => {
      const ctx = createHost();

      press(ctx, document.body, 'j', { ctrlKey: true });
      hotkey(ctx, { shiftKey: true });
      hotkey(ctx, { repeat: true });
      press(ctx, document.body, 'k');
      expect(ctx.surface()).toBeNull();
    });

    it('takes another shortcut, and none at all with null', () => {
      const ctx = createHost((host) => host.hotkey.set('ctrl+shift+p'));
      hotkey(ctx);
      expect(ctx.surface()).toBeNull();
      hotkey(ctx, { shiftKey: true });
      expect(ctx.surface()).toBeNull();
      press(ctx, document.body, 'p', { ctrlKey: true, shiftKey: true });
      expect(ctx.surface()).toBeTruthy();

      press(ctx, document.body, 'p', { ctrlKey: true, shiftKey: true });
      expect(ctx.surface()).toBeNull();

      ctx.host.hotkey.set(null);
      ctx.flush();
      press(ctx, document.body, 'p', { ctrlKey: true, shiftKey: true });
      expect(ctx.surface()).toBeNull();
    });

    it('stops listening once destroyed', () => {
      const ctx = createHost();
      ctx.fixture.destroy();
      const event = hotkey(ctx);

      expect(event.defaultPrevented).toBe(false);
      expect(ctx.surface()).toBeNull();
    });
  });

  describe('content', () => {
    function open(configure?: (host: HostComponent) => void) {
      const ctx = createHost(configure);
      ctx.host.open.set(true);
      ctx.flush();
      return ctx;
    }

    it('passes the items and the search through to the command', () => {
      const ctx = open();
      expect(ctx.values()).toEqual(['home', 'orders', 'projects']);

      type(ctx, 'ord');
      expect(ctx.values()).toEqual(['orders']);
      expect(ctx.host.search()).toBe('ord');
    });

    it('closes after an item is selected, reporting it', () => {
      const ctx = open();
      press(ctx, ctx.input(), 'ArrowDown');
      press(ctx, ctx.input(), 'Enter');

      expect(ctx.host.selected.map((event) => event.item.value)).toEqual([
        'orders',
      ]);
      expect(ctx.surface()).toBeNull();
      expect(ctx.host.open()).toBe(false);
    });

    it('stays open after a selection when closeOnSelect is off', () => {
      const ctx = open((host) => host.closeOnSelect.set(false));
      press(ctx, ctx.input(), 'Enter');

      expect(ctx.host.selected).toHaveLength(1);
      expect(ctx.surface()).toBeTruthy();
    });

    it('does not close when an item opens a nested page', () => {
      const ctx = open();
      press(ctx, ctx.input(), 'End');
      press(ctx, ctx.input(), 'Enter');

      expect(ctx.surface()).toBeTruthy();
      expect(ctx.host.pages().map((page) => page.value)).toEqual(['projects']);
      expect(ctx.values()).toEqual(['alpha']);
    });

    it('goes back a page on Escape and Backspace before Escape closes it', () => {
      const ctx = open();
      press(ctx, ctx.input(), 'End');
      press(ctx, ctx.input(), 'Enter');

      press(ctx, ctx.input(), 'Escape');
      expect(ctx.host.pages()).toEqual([]);
      expect(ctx.surface()).toBeTruthy();

      press(ctx, ctx.input(), 'End');
      press(ctx, ctx.input(), 'Enter');
      press(ctx, ctx.input(), 'Backspace');
      expect(ctx.host.pages()).toEqual([]);

      press(ctx, ctx.input(), 'Escape');
      expect(ctx.surface()).toBeNull();
    });

    it('resets the search and the pages when it closes, unless told not to', () => {
      const ctx = open();
      type(ctx, 'ord');
      ctx.host.open.set(false);
      ctx.flush();
      expect(ctx.host.search()).toBe('');

      ctx.host.open.set(true);
      ctx.flush();
      press(ctx, ctx.input(), 'End');
      press(ctx, ctx.input(), 'Enter');
      ctx.host.open.set(false);
      ctx.flush();
      expect(ctx.host.pages()).toEqual([]);

      ctx.host.resetOnClose.set(false);
      ctx.host.open.set(true);
      ctx.flush();
      type(ctx, 'ho');
      ctx.host.open.set(false);
      ctx.flush();
      expect(ctx.host.search()).toBe('ho');
    });

    it('keeps the page behind it inert while open', () => {
      const ctx = open();
      const origin = ctx.fixture.nativeElement as HTMLElement;
      expect(
        origin.hasAttribute('inert') || origin.closest('[inert]'),
      ).toBeTruthy();
    });
  });

  describe('exit animation', () => {
    it('marks the pane and the scrim as closing while they exit', async () => {
      const ctx = createHost();
      ctx.host.open.set(true);
      ctx.flush();
      const pane = document.querySelector('.cdk-overlay-pane') as HTMLElement;
      const backdrop = document.querySelector(
        '.cdk-overlay-backdrop',
      ) as HTMLElement;
      let finish: () => void = () => undefined;
      const finished = new Promise<void>((resolve) => (finish = resolve));
      const animation = {
        playState: 'running',
        effect: { getComputedTiming: () => ({ endTime: 120 }) },
        finished,
      };
      (pane as unknown as { getAnimations: () => unknown[] }).getAnimations =
        () => [animation];
      (
        backdrop as unknown as { getAnimations: () => unknown[] }
      ).getAnimations = () => [animation];

      ctx.host.open.set(false);
      ctx.flush();

      expect(pane.firstElementChild?.hasAttribute('data-andes-closing')).toBe(
        true,
      );
      expect(backdrop.hasAttribute('data-andes-closing')).toBe(true);
      expect(
        (
          ctx.fixture.debugElement.children[1].componentInstance as {
            overlay: AndesOverlayPrimitive;
          }
        ).overlay.isOpen(),
      ).toBe(false);
      finish();
      await finished;
    });
  });

  describe('styling contract', () => {
    const css = () =>
      readFileSync('packages/ui/src/lib/command/command-dialog.css', 'utf8');

    it('enters with a 150ms fade and a scale from 0.97 to 1', () => {
      const rule =
        /\.andes-command-dialog\s*\{([\s\S]*?)\n\}/.exec(css())?.[1] ?? '';
      expect(rule).toContain('andes-command-dialog-in');
      expect(rule).toContain('var(--andes-motion-duration-mid, 150ms)');
      expect(rule).toContain('cubic-bezier(0.2, 0, 0, 1)');
      expect(css()).toMatch(
        /@keyframes andes-command-dialog-in\s*\{[^@]*scale\(0\.97\)[^@]*scale\(1\)/,
      );
    });

    it('fades the scrim in the same 150ms instead of the 400ms default', () => {
      const rule =
        /\.andes-command-backdrop\s*\{([\s\S]*?)\n\}/.exec(css())?.[1] ?? '';
      expect(rule).toContain(
        'transition-duration: var(--andes-motion-duration-mid, 150ms)',
      );
    });

    it('exits on data-andes-closing in 120ms with ease-in, for the surface and the scrim', () => {
      for (const selector of [
        '.andes-command-dialog[data-andes-closing]',
        '.andes-command-backdrop[data-andes-closing]',
      ]) {
        const start = css().indexOf(`${selector} {`);
        const rule = css().slice(start, css().indexOf('}', start));
        expect(rule).toContain('var(--andes-motion-duration-fast, 120ms)');
        expect(rule).toContain('var(--andes-motion-ease-in, ease-in)');
        expect(rule).toContain('forwards');
        expect(rule).toContain('pointer-events: none');
      }
    });

    it('sits toward the top of the screen rather than the middle', () => {
      expect(css()).toContain(
        '.cdk-global-overlay-wrapper:has(> .andes-command-pane)',
      );
      expect(css()).toContain('align-items: flex-start !important');
    });

    it('drops the scale and both exits under reduced motion', () => {
      const block =
        /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}\n/.exec(
          css(),
        )?.[1] ?? '';
      expect(block).toContain('andes-command-dialog-fade');
      expect(block).toContain('[data-andes-closing]');
      expect(block).toContain('animation: none');
      expect(block).toContain('transition: none');
    });

    it('draws the edge and elevation itself and sets the surface font', () => {
      expect(css()).toContain('--andes-command-border: 0');
      expect(css()).toContain('--andes-shadow-lg');
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
  });
});
