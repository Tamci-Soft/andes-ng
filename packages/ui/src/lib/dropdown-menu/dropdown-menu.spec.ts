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
});
