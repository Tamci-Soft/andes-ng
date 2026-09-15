import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesDropdownMenu } from './dropdown-menu';
import { AndesDropdownMenuCheckboxItem } from './dropdown-menu-checkbox-item';
import { AndesDropdownMenuContent } from './dropdown-menu-content';
import { AndesDropdownMenuItem } from './dropdown-menu-item';
import { AndesDropdownMenuLabel } from './dropdown-menu-label';
import { AndesDropdownMenuRadioItem } from './dropdown-menu-radio-item';
import { AndesDropdownMenuSeparator } from './dropdown-menu-separator';
import { AndesDropdownMenuShortcut } from './dropdown-menu-shortcut';
import { AndesDropdownMenuTrigger } from './dropdown-menu-trigger';

/**
 * jsdom reports zero geometry for every element, which makes CDK's
 * `InteractivityChecker` treat them all as invisible and therefore untabbable - see
 * the identical helper in `overlay-primitive.spec.ts`.
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

/** `ListKeyManager` reads the deprecated-but-universal `KeyboardEvent.keyCode`. */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  Home: 36,
  End: 35,
  Tab: 9,
  Enter: 13,
  Escape: 27,
  ' ': 32,
};

function keyCodeFor(key: string): number {
  return KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0);
}

function pressKey(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'keyCode', { get: () => keyCodeFor(key) });
  target.dispatchEvent(event);
  return event;
}

@Component({
  imports: [
    AndesDropdownMenu,
    AndesDropdownMenuTrigger,
    AndesDropdownMenuContent,
    AndesDropdownMenuItem,
    AndesDropdownMenuCheckboxItem,
    AndesDropdownMenuRadioItem,
    AndesDropdownMenuSeparator,
    AndesDropdownMenuLabel,
    AndesDropdownMenuShortcut,
  ],
  template: `
    <button type="button" id="outside">Outside</button>
    <andes-dropdown-menu>
      <button type="button" id="trigger" andesDropdownMenuTrigger>
        Options
      </button>
      <andes-dropdown-menu-content>
        <andes-dropdown-menu-item id="edit" (activated)="edited.set(true)">
          <svg id="editIcon" slot="icon-start" viewBox="0 0 24 24"></svg>
          Edit
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-item
          id="duplicate"
          [disabled]="duplicateDisabled()"
        >
          Duplicate
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-item id="archive"
          >Archive</andes-dropdown-menu-item
        >
        <andes-dropdown-menu-separator />
        <andes-dropdown-menu-checkbox-item
          id="showHidden"
          [(checked)]="showHidden"
        >
          Show hidden
        </andes-dropdown-menu-checkbox-item>
        <andes-dropdown-menu-label>Sort by</andes-dropdown-menu-label>
        <andes-dropdown-menu-radio-item id="sortName" name="sort" value="name">
          Name
        </andes-dropdown-menu-radio-item>
        <andes-dropdown-menu-radio-item id="sortDate" name="sort" value="date">
          Date
        </andes-dropdown-menu-radio-item>
        <andes-dropdown-menu-item id="delete" variant="destructive">
          Delete
          <andes-dropdown-menu-shortcut>⌘⌫</andes-dropdown-menu-shortcut>
        </andes-dropdown-menu-item>
      </andes-dropdown-menu-content>
    </andes-dropdown-menu>
  `,
})
class HostComponent {
  readonly duplicateDisabled = signal(false);
  readonly showHidden = signal(false);
  readonly edited = signal(false);
}

describe('AndesDropdownMenu', () => {
  withElementGeometry();

  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const byId = (id: string) =>
      (root.querySelector(`#${id}`) ??
        document.querySelector(`#${id}`)) as HTMLElement | null;

    return {
      fixture,
      host: fixture.componentInstance,
      trigger: () => byId('trigger')!,
      outside: () => byId('outside')!,
      menu: () => document.querySelector('[role="menu"]') as HTMLElement | null,
      item: (id: string) => byId(id)!,
    };
  }

  async function open(fixture: ReturnType<typeof createHost>['fixture']) {
    fixture.detectChanges();
    await fixture.whenStable();
    // Lets any deferred (setTimeout-based) focus overrides settle too.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  describe('open / close', () => {
    it('is closed until the trigger is clicked', () => {
      const { menu } = createHost();
      expect(menu()).toBeNull();
    });

    it('opens on trigger click and renders role="menu"', async () => {
      const { fixture, trigger, menu } = createHost();
      trigger().click();
      await open(fixture);

      expect(menu()).toBeTruthy();
    });

    it('closes on a second trigger click', async () => {
      const { fixture, trigger, menu } = createHost();
      trigger().click();
      await open(fixture);
      trigger().click();
      fixture.detectChanges();

      expect(menu()).toBeNull();
    });

    it('focuses the first enabled item on open', async () => {
      const { fixture, trigger, item } = createHost();
      trigger().click();
      await open(fixture);

      expect(document.activeElement).toBe(item('edit'));
    });

    it('ArrowUp on the closed trigger opens the menu focusing the last item', async () => {
      const { fixture, trigger, item } = createHost();
      pressKey(trigger(), 'ArrowUp');
      await open(fixture);

      expect(document.activeElement).toBe(item('delete'));
    });

    it('closes on Escape and returns focus to the trigger', async () => {
      const { fixture, trigger, menu } = createHost();
      trigger().focus();
      trigger().click();
      await open(fixture);

      pressKey(document.body, 'Escape');
      fixture.detectChanges();

      expect(menu()).toBeNull();
      expect(document.activeElement).toBe(trigger());
    });
  });

  describe('roles', () => {
    it('exposes role="menu" on the content and role="menuitem" on plain items', async () => {
      const { fixture, trigger, menu, item } = createHost();
      trigger().click();
      await open(fixture);

      expect(menu()?.getAttribute('role')).toBe('menu');
      expect(item('edit').getAttribute('role')).toBe('menuitem');
    });

    it('exposes role="menuitemcheckbox" and role="menuitemradio"', async () => {
      const { fixture, trigger, item } = createHost();
      trigger().click();
      await open(fixture);

      expect(item('showHidden').getAttribute('role')).toBe('menuitemcheckbox');
      expect(item('sortName').getAttribute('role')).toBe('menuitemradio');
    });
  });

  describe('arrow-key navigation', () => {
    it('moves focus down and skips a disabled item', async () => {
      const { fixture, host, trigger, item } = createHost();
      host.duplicateDisabled.set(true);
      fixture.detectChanges();
      trigger().click();
      await open(fixture);

      pressKey(item('edit'), 'ArrowDown');
      fixture.detectChanges();

      expect(document.activeElement).toBe(item('archive'));
    });

    it('moves focus up', async () => {
      const { fixture, host, trigger, item } = createHost();
      host.duplicateDisabled.set(true);
      fixture.detectChanges();
      trigger().click();
      await open(fixture);

      pressKey(item('edit'), 'ArrowDown');
      fixture.detectChanges();
      pressKey(item('archive'), 'ArrowUp');
      fixture.detectChanges();

      expect(document.activeElement).toBe(item('edit'));
    });
  });

  describe('typeahead', () => {
    it('jumps to the item whose text starts with the typed character', async () => {
      const { fixture, trigger, item } = createHost();
      trigger().click();
      await open(fixture);

      pressKey(item('edit'), 'a');
      // Typeahead matching is debounced by the CDK's `ListKeyManager`.
      await new Promise((resolve) => setTimeout(resolve, 250));
      fixture.detectChanges();

      expect(document.activeElement).toBe(item('archive'));
    });
  });

  describe('activation', () => {
    it('Enter activates the focused item and closes the menu', async () => {
      const { fixture, host, trigger, item, menu } = createHost();
      trigger().click();
      await open(fixture);

      pressKey(item('edit'), 'Enter');
      fixture.detectChanges();

      expect(host.edited()).toBe(true);
      expect(menu()).toBeNull();
    });

    it('Space activates the focused item and closes the menu', async () => {
      const { fixture, host, trigger, item, menu } = createHost();
      trigger().click();
      await open(fixture);

      pressKey(item('edit'), ' ');
      fixture.detectChanges();

      expect(host.edited()).toBe(true);
      expect(menu()).toBeNull();
    });

    it('a disabled item does not activate on click', async () => {
      const { fixture, host, trigger, item } = createHost();
      host.duplicateDisabled.set(true);
      fixture.detectChanges();
      trigger().click();
      await open(fixture);

      item('duplicate').click();
      fixture.detectChanges();

      expect(host.edited()).toBe(false);
      expect(document.querySelector('[role="menu"]')).toBeTruthy();
    });
  });

  describe('checkbox item', () => {
    it('toggles checked state without closing the menu', async () => {
      const { fixture, host, trigger, item, menu } = createHost();
      trigger().click();
      await open(fixture);

      item('showHidden').click();
      fixture.detectChanges();

      expect(host.showHidden()).toBe(true);
      expect(item('showHidden').getAttribute('aria-checked')).toBe('true');
      expect(menu()).toBeTruthy();

      item('showHidden').click();
      fixture.detectChanges();

      expect(host.showHidden()).toBe(false);
      expect(item('showHidden').getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('radio item', () => {
    it('selecting one radio item deselects its sibling', async () => {
      const { fixture, trigger, item } = createHost();
      trigger().click();
      await open(fixture);

      item('sortName').click();
      fixture.detectChanges();
      expect(item('sortName').getAttribute('aria-checked')).toBe('true');
      expect(item('sortDate').getAttribute('aria-checked')).toBe('false');

      item('sortDate').click();
      fixture.detectChanges();
      expect(item('sortName').getAttribute('aria-checked')).toBe('false');
      expect(item('sortDate').getAttribute('aria-checked')).toBe('true');
    });
  });

  // Regression coverage for dropdown-menu.css being dead CSS: every sub-component puts
  // its BEM class only in `host: { class: ... }`, which Angular's default (Emulated)
  // view encapsulation can never match (see the comment on `AndesDropdownMenuContent`).
  // A test asserting `menu()!.classList.toContain('andes-dropdown-menu__content')` (as
  // other tests in this file do, for structural coverage) would stay green even if
  // every rule in dropdown-menu.css were dead, because it never asks the browser/jsdom
  // CSS engine to actually resolve a selector - only real computed styles, read off the
  // actually-compiled component, can catch that regression.
  describe('applies real layout/color styles to the open panel (not dead CSS)', () => {
    it('gives the content panel a real background, border-radius, padding and shadow', async () => {
      const { fixture, trigger, menu } = createHost();
      trigger().click();
      await open(fixture);

      const style = getComputedStyle(menu()!);

      expect(style.display).toBe('flex');
      expect(style.flexDirection).toBe('column');
      // jsdom's UA default for an unstyled element is transparent - proving the
      // background is no longer that is enough to show `.andes-dropdown-menu__content`
      // actually matched, without hard-coding a resolved custom-property value jsdom
      // won't compute anyway.
      expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(style.backgroundColor).not.toBe('');
      expect(style.borderRadius).not.toBe('0px');
      expect(style.padding).not.toBe('0px');
      expect(style.boxShadow).not.toBe('none');
      expect(style.boxShadow).not.toBe('');
    });

    it('lays a menu item out as a flex row with real padding, not inline text', async () => {
      const { fixture, trigger, item } = createHost();
      trigger().click();
      await open(fixture);

      const style = getComputedStyle(item('edit'));

      // `display: inline` (the browser default for an unstyled custom element) has no
      // box to apply padding/gap to at all - proving it is no longer `inline` is what
      // actually distinguishes a real match from dead CSS.
      expect(style.display).toBe('flex');
      expect(style.alignItems).toBe('center');
      expect(style.padding).not.toBe('0px');
      expect(style.cursor).toBe('pointer');
    });

    it('gives the separator a real height and background, not a collapsed empty element', async () => {
      const { fixture, trigger, menu } = createHost();
      trigger().click();
      await open(fixture);

      const separator = menu()!.querySelector(
        '[role="separator"]',
      ) as HTMLElement;
      const style = getComputedStyle(separator);

      expect(style.height).toBe('1px');
      expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(style.backgroundColor).not.toBe('');
    });

    // The checked state of a checkbox/radio item is the one part of this component
    // that is *only* visual - `aria-checked` already carries it for assistive tech,
    // so an indicator that is in the DOM but renders as a zero-size or `display:
    // none` box fails silently for sighted users while every structural assertion
    // above it stays green.
    it('renders a real, laid-out check mark only while a checkbox item is checked', async () => {
      const { fixture, host, trigger, item } = createHost();
      trigger().click();
      await open(fixture);

      const indicator = () =>
        item('showHidden').querySelector(
          '.andes-dropdown-menu__indicator',
        ) as HTMLElement;

      expect(indicator().querySelector('svg')).toBeNull();

      host.showHidden.set(true);
      fixture.detectChanges();

      expect(indicator().querySelector('svg')).toBeTruthy();
      // `inline` is what an unstyled `<span>` computes to, so proving it is
      // `inline-flex` proves the indicator rule actually matched.
      expect(getComputedStyle(indicator()).display).toBe('inline-flex');
      expect(getComputedStyle(indicator()).width).not.toBe('auto');
      expect(getComputedStyle(indicator()).height).not.toBe('auto');
    });

    it('renders a real, laid-out dot only on the selected radio item', async () => {
      const { fixture, trigger, item } = createHost();
      trigger().click();
      await open(fixture);

      const dot = (id: string) =>
        item(id).querySelector('.andes-dropdown-menu__indicator svg');

      expect(dot('sortName')).toBeNull();
      expect(dot('sortDate')).toBeNull();

      item('sortName').click();
      fixture.detectChanges();

      expect(dot('sortName')).toBeTruthy();
      expect(dot('sortDate')).toBeNull();
    });

    it('sizes an icon projected into an item instead of letting it render at its intrinsic size', async () => {
      const { fixture, trigger } = createHost();
      trigger().click();
      await open(fixture);

      const icon = document.querySelector('#editIcon') as SVGElement;
      const style = getComputedStyle(icon);

      expect(style.width).toBe('1em');
      expect(style.height).toBe('1em');
      expect(style.flexShrink).toBe('0');
    });
  });

  describe('Tab key', () => {
    it('closes the menu and clears aria-expanded when Tab is pressed on a focused item', async () => {
      const { fixture, trigger, item, menu } = createHost();
      trigger().click();
      await open(fixture);
      expect(menu()).toBeTruthy();
      expect(trigger().getAttribute('aria-expanded')).toBe('true');

      pressKey(item('edit'), 'Tab');
      fixture.detectChanges();

      expect(menu()).toBeNull();
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
    });

    it("returns focus to the trigger so Tab's own default action continues from there", async () => {
      const { fixture, trigger, item } = createHost();
      trigger().click();
      await open(fixture);

      pressKey(item('edit'), 'Tab');
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger());
    });
  });
});
