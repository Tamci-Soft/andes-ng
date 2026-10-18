import { Component, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AndesListNavigation } from './list-navigation';
import { AndesListNavigationItem } from './list-navigation-item';
import { AndesListNavigationKeys } from './list-navigation-keys';
import { AndesListNavigationConfig } from './list-navigation-types';

/**
 * `ListKeyManager` reads the deprecated-but-universal `KeyboardEvent.keyCode`, which jsdom
 * leaves at 0 on synthetic events, so tests have to populate it the way a browser would.
 */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  ArrowLeft: 37,
  ArrowRight: 39,
  Home: 36,
  End: 35,
  Tab: 9,
  Enter: 13,
  ' ': 32,
};

function keyCodeFor(key: string): number {
  return KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0);
}

function pressKey(
  target: Element,
  key: string,
  modifiers: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  Object.defineProperty(event, 'keyCode', { get: () => keyCodeFor(key) });
  target.dispatchEvent(event);
  return event;
}

interface Option {
  readonly label: string;
  readonly disabled?: boolean;
}

const OPTIONS: readonly Option[] = [
  { label: 'Apple' },
  { label: 'Apricot' },
  { label: 'Banana' },
  { label: 'Cherry' },
];

/** A `role="listbox"` whose items are genuinely focusable — the Tabs/Dropdown Menu shape. */
@Component({
  imports: [AndesListNavigationItem, AndesListNavigationKeys],
  providers: [AndesListNavigation],
  template: `
    <div andesListNavigationKeys role="listbox" tabindex="-1">
      @for (option of options(); track option.label) {
        <button
          type="button"
          role="option"
          aria-selected="false"
          andesListNavigationItem
          [disabled]="option.disabled ?? false"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
class RovingHost {
  readonly navigation = inject(AndesListNavigation);
  readonly options = signal<readonly Option[]>(OPTIONS);
}

/** A combobox shape: the input keeps focus, the list below is addressed via ARIA only. */
@Component({
  imports: [AndesListNavigationItem, AndesListNavigationKeys],
  providers: [AndesListNavigation],
  template: `
    <input
      andesListNavigationKeys
      role="combobox"
      aria-controls="suggestions"
      aria-expanded="true"
    />
    <div id="suggestions" role="listbox">
      @for (option of options(); track option.label) {
        <div
          role="option"
          aria-selected="false"
          andesListNavigationItem
          [disabled]="option.disabled ?? false"
        >
          {{ option.label }}
        </div>
      }
    </div>
  `,
})
class ActiveDescendantHost {
  readonly navigation = inject(AndesListNavigation);
  readonly options = signal<readonly Option[]>(OPTIONS);

  constructor() {
    this.navigation.configure({ focusMode: 'active-descendant' });
  }
}

describe('AndesListNavigation', () => {
  function createRovingHost(config?: AndesListNavigationConfig) {
    const fixture = TestBed.createComponent(RovingHost);
    if (config) {
      fixture.componentInstance.navigation.configure(config);
    }
    fixture.detectChanges();
    return withHelpers(fixture, 'button', '[role="listbox"]');
  }

  function createActiveDescendantHost(config?: AndesListNavigationConfig) {
    const fixture = TestBed.createComponent(ActiveDescendantHost);
    if (config) {
      fixture.componentInstance.navigation.configure(config);
    }
    fixture.detectChanges();
    return withHelpers(fixture, '[role="option"]', 'input');
  }

  function withHelpers<T extends RovingHost | ActiveDescendantHost>(
    fixture: ComponentFixture<T>,
    itemSelector: string,
    keyHostSelector: string,
  ) {
    const host = fixture.nativeElement as HTMLElement;
    const navigation = fixture.componentInstance.navigation;
    return {
      fixture,
      navigation,
      keyHost: host.querySelector(keyHostSelector) as HTMLElement,
      items: () =>
        Array.from(host.querySelectorAll(itemSelector)) as HTMLElement[],
      activeLabel: () => navigation.activeItem()?.getLabel() ?? null,
      press: (key: string, modifiers?: Partial<KeyboardEventInit>) => {
        const event = pressKey(
          host.querySelector(keyHostSelector) as HTMLElement,
          key,
          modifiers,
        );
        fixture.detectChanges();
        return event;
      },
    };
  }

  describe('item registration', () => {
    it('registers every item in DOM order', () => {
      const { navigation } = createRovingHost();

      expect(navigation.items().map((item) => item.getLabel())).toEqual([
        'Apple',
        'Apricot',
        'Banana',
        'Cherry',
      ]);
    });

    it('unregisters items that are removed from the template', () => {
      const { fixture, navigation } = createRovingHost();
      fixture.componentInstance.options.set([
        { label: 'Apple' },
        { label: 'Cherry' },
      ]);
      fixture.detectChanges();

      expect(navigation.items().map((item) => item.getLabel())).toEqual([
        'Apple',
        'Cherry',
      ]);
    });

    it('clears the active item when the active item is removed', () => {
      const { fixture, navigation, press } = createRovingHost();
      press('ArrowDown');
      press('ArrowDown');
      expect(navigation.activeItem()?.getLabel()).toBe('Apricot');

      fixture.componentInstance.options.set([
        { label: 'Apple' },
        { label: 'Cherry' },
      ]);
      fixture.detectChanges();

      expect(navigation.activeItem()).toBeNull();
      expect(navigation.activeIndex()).toBe(-1);
    });

    it('tears down cleanly while an item is active', () => {
      const { fixture, press } = createRovingHost();
      press('ArrowDown');

      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  describe('vertical orientation (the default)', () => {
    it('moves down and up with the vertical arrow keys', () => {
      const { press, activeLabel } = createRovingHost();

      expect(press('ArrowDown').defaultPrevented).toBe(true);
      expect(activeLabel()).toBe('Apple');

      press('ArrowDown');
      expect(activeLabel()).toBe('Apricot');

      press('ArrowUp');
      expect(activeLabel()).toBe('Apple');
    });

    it('ignores the horizontal arrow keys', () => {
      const { press, activeLabel } = createRovingHost();
      press('ArrowDown');

      expect(press('ArrowRight').defaultPrevented).toBe(false);
      expect(press('ArrowLeft').defaultPrevented).toBe(false);
      expect(activeLabel()).toBe('Apple');
    });
  });

  describe('horizontal orientation', () => {
    it('moves with the horizontal arrow keys', () => {
      const { press, activeLabel } = createRovingHost({
        orientation: 'horizontal',
      });

      press('ArrowRight');
      expect(activeLabel()).toBe('Apple');

      press('ArrowRight');
      expect(activeLabel()).toBe('Apricot');

      press('ArrowLeft');
      expect(activeLabel()).toBe('Apple');
    });

    it('ignores the vertical arrow keys', () => {
      const { press, activeLabel } = createRovingHost({
        orientation: 'horizontal',
      });
      press('ArrowRight');

      expect(press('ArrowDown').defaultPrevented).toBe(false);
      expect(activeLabel()).toBe('Apple');
    });

    it('mirrors the horizontal arrow keys in RTL', () => {
      const { press, activeLabel } = createRovingHost({
        orientation: 'horizontal',
        textDirection: 'rtl',
      });

      press('ArrowLeft');
      expect(activeLabel()).toBe('Apple');

      press('ArrowLeft');
      expect(activeLabel()).toBe('Apricot');

      press('ArrowRight');
      expect(activeLabel()).toBe('Apple');
    });
  });

  describe('both orientations', () => {
    it('navigates the same flat list with every arrow key', () => {
      const { press, activeLabel } = createRovingHost({ orientation: 'both' });

      press('ArrowDown');
      press('ArrowRight');
      expect(activeLabel()).toBe('Apricot');

      press('ArrowUp');
      expect(activeLabel()).toBe('Apple');

      press('ArrowLeft');
      expect(activeLabel()).toBe('Cherry');
    });
  });

  describe('wrap-around', () => {
    it('wraps at both ends by default', () => {
      const { press, activeLabel } = createRovingHost();

      press('ArrowUp');
      expect(activeLabel()).toBe('Cherry');

      press('ArrowDown');
      expect(activeLabel()).toBe('Apple');

      press('ArrowUp');
      expect(activeLabel()).toBe('Cherry');
    });

    it('stops at the ends when wrapping is turned off', () => {
      const { press, activeLabel } = createRovingHost({ wrap: false });

      press('ArrowDown');
      expect(activeLabel()).toBe('Apple');

      press('ArrowUp');
      expect(activeLabel()).toBe('Apple');

      for (let i = 0; i < 5; i++) {
        press('ArrowDown');
      }
      expect(activeLabel()).toBe('Cherry');

      press('ArrowDown');
      expect(activeLabel()).toBe('Cherry');
    });
  });

  describe('Home and End', () => {
    it('jumps to the first and last item', () => {
      const { press, activeLabel } = createRovingHost();

      expect(press('End').defaultPrevented).toBe(true);
      expect(activeLabel()).toBe('Cherry');

      expect(press('Home').defaultPrevented).toBe(true);
      expect(activeLabel()).toBe('Apple');
    });

    it('can be turned off', () => {
      const { press, navigation } = createRovingHost({ homeAndEnd: false });

      expect(press('End').defaultPrevented).toBe(false);
      expect(navigation.activeItem()).toBeNull();
    });

    it('skips over disabled items at the ends', () => {
      const { fixture, press, activeLabel } = createRovingHost();
      fixture.componentInstance.options.set([
        { label: 'Apple', disabled: true },
        { label: 'Apricot' },
        { label: 'Banana' },
        { label: 'Cherry', disabled: true },
      ]);
      fixture.detectChanges();

      press('Home');
      expect(activeLabel()).toBe('Apricot');

      press('End');
      expect(activeLabel()).toBe('Banana');
    });
  });

  describe('disabled items', () => {
    it('skips disabled items while navigating', () => {
      const { fixture, press, activeLabel } = createRovingHost();
      fixture.componentInstance.options.set([
        { label: 'Apple' },
        { label: 'Apricot', disabled: true },
        { label: 'Banana', disabled: true },
        { label: 'Cherry' },
      ]);
      fixture.detectChanges();

      press('ArrowDown');
      expect(activeLabel()).toBe('Apple');

      press('ArrowDown');
      expect(activeLabel()).toBe('Cherry');

      press('ArrowUp');
      expect(activeLabel()).toBe('Apple');
    });

    it('navigates onto disabled items when skipping is turned off', () => {
      const { fixture, press, activeLabel } = createRovingHost({
        skipDisabled: false,
      });
      fixture.componentInstance.options.set([
        { label: 'Apple' },
        { label: 'Apricot', disabled: true },
        { label: 'Banana' },
        { label: 'Cherry' },
      ]);
      fixture.detectChanges();

      press('ArrowDown');
      press('ArrowDown');
      expect(activeLabel()).toBe('Apricot');
    });

    it('marks disabled items with data-disabled', () => {
      const { fixture, items } = createRovingHost();
      fixture.componentInstance.options.set([
        { label: 'Apple' },
        { label: 'Apricot', disabled: true },
      ]);
      fixture.detectChanges();

      expect(items()[0].hasAttribute('data-disabled')).toBe(false);
      expect(items()[1].getAttribute('data-disabled')).toBe('');
    });
  });

  describe('typeahead', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function settle(fixture: ComponentFixture<unknown>) {
      vi.advanceTimersByTime(250);
      fixture.detectChanges();
    }

    it('jumps to the first item matching a typed character', () => {
      const { fixture, press, activeLabel } = createRovingHost();

      press('b');
      settle(fixture);

      expect(activeLabel()).toBe('Banana');
    });

    it('cycles through matches when the same character is pressed again', () => {
      const { fixture, press, activeLabel } = createRovingHost();

      press('a');
      settle(fixture);
      expect(activeLabel()).toBe('Apple');

      press('a');
      settle(fixture);
      expect(activeLabel()).toBe('Apricot');

      // Wraps back round to the first match rather than stalling on the last one.
      press('a');
      settle(fixture);
      expect(activeLabel()).toBe('Apple');
    });

    it('matches a multi-character prefix typed within the debounce window', () => {
      const { fixture, press, activeLabel } = createRovingHost();

      press('a');
      press('p');
      press('r');
      settle(fixture);

      expect(activeLabel()).toBe('Apricot');
    });

    it('skips disabled items when matching', () => {
      const { fixture, press, activeLabel } = createRovingHost();
      fixture.componentInstance.options.set([
        { label: 'Apple', disabled: true },
        { label: 'Apricot' },
        { label: 'Banana' },
      ]);
      fixture.detectChanges();

      press('a');
      settle(fixture);

      expect(activeLabel()).toBe('Apricot');
    });

    it('reports whether a query is buffered and can cancel it', () => {
      const { fixture, navigation, press, activeLabel } = createRovingHost();

      press('b');
      expect(navigation.isTyping()).toBe(true);

      navigation.cancelTypeahead();
      settle(fixture);

      expect(navigation.isTyping()).toBe(false);
      expect(activeLabel()).toBeNull();
    });

    it('does nothing when typeahead is turned off', () => {
      const { fixture, press, activeLabel } = createRovingHost({
        typeahead: false,
      });

      press('b');
      settle(fixture);

      expect(activeLabel()).toBeNull();
    });

    it('never starts a query from the Space key', () => {
      const { fixture, press, activeLabel } = createRovingHost();

      expect(press(' ').defaultPrevented).toBe(false);
      settle(fixture);

      expect(activeLabel()).toBeNull();
    });
  });

  describe('roving-tabindex focus mode', () => {
    it('gives the first item tabindex 0 and the rest -1 before anything is active', () => {
      const { items } = createRovingHost();

      expect(items().map((item) => item.getAttribute('tabindex'))).toEqual([
        '0',
        '-1',
        '-1',
        '-1',
      ]);
    });

    it('starts the roving tabindex on the first enabled item', () => {
      const { fixture, items } = createRovingHost();
      fixture.componentInstance.options.set([
        { label: 'Apple', disabled: true },
        { label: 'Apricot' },
      ]);
      fixture.detectChanges();

      expect(items().map((item) => item.getAttribute('tabindex'))).toEqual([
        '-1',
        '0',
      ]);
    });

    it('moves real DOM focus and the tabindex onto the active item', () => {
      const { press, items } = createRovingHost();

      press('ArrowDown');
      press('ArrowDown');

      expect(document.activeElement).toBe(items()[1]);
      expect(items().map((item) => item.getAttribute('tabindex'))).toEqual([
        '-1',
        '0',
        '-1',
        '-1',
      ]);
    });

    it('marks the active item with data-active', () => {
      const { press, items } = createRovingHost();

      press('ArrowDown');

      expect(items()[0].getAttribute('data-active')).toBe('');
      expect(items()[1].hasAttribute('data-active')).toBe(false);
    });

    it('never publishes aria-activedescendant', () => {
      const { press, keyHost } = createRovingHost();

      press('ArrowDown');

      expect(keyHost.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('follows focus that the user moved directly, e.g. by clicking an item', () => {
      const { fixture, navigation, items } = createRovingHost();

      items()[2].dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      fixture.detectChanges();

      expect(navigation.activeItem()?.getLabel()).toBe('Banana');
      expect(items().map((item) => item.getAttribute('tabindex'))).toEqual([
        '-1',
        '-1',
        '0',
        '-1',
      ]);
    });
  });

  describe('active-descendant focus mode', () => {
    it('leaves real DOM focus on the keyboard host', () => {
      const { keyHost, press, items } = createActiveDescendantHost();
      keyHost.focus();

      press('ArrowDown');

      expect(document.activeElement).toBe(keyHost);
      expect(document.activeElement).not.toBe(items()[0]);
    });

    it('publishes the active item id as aria-activedescendant', () => {
      const { keyHost, press, items } = createActiveDescendantHost();

      press('ArrowDown');
      expect(keyHost.getAttribute('aria-activedescendant')).toBe(items()[0].id);

      press('ArrowDown');
      expect(keyHost.getAttribute('aria-activedescendant')).toBe(items()[1].id);
    });

    it('gives every item a stable, unique id and no tabindex', () => {
      const { items } = createActiveDescendantHost();
      const ids = items().map((item) => item.id);

      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => id.length > 0)).toBe(true);
      expect(items().some((item) => item.hasAttribute('tabindex'))).toBe(false);
    });

    it('drops aria-activedescendant once the active item is cleared', () => {
      const { fixture, navigation, keyHost, press } =
        createActiveDescendantHost();

      press('ArrowDown');
      expect(keyHost.hasAttribute('aria-activedescendant')).toBe(true);

      navigation.clearActive();
      fixture.detectChanges();

      expect(keyHost.hasAttribute('aria-activedescendant')).toBe(false);
      expect(navigation.activeItem()).toBeNull();
    });

    it('scrolls the active item into view, since real focus does not move', () => {
      const { press, items } = createActiveDescendantHost();
      const scrollIntoView = vi.fn();
      items().forEach((item) => {
        item.scrollIntoView = scrollIntoView;
      });

      press('ArrowDown');

      expect(scrollIntoView).toHaveBeenCalledWith({
        block: 'nearest',
        inline: 'nearest',
      });
    });

    it('navigates and skips disabled items exactly as the roving mode does', () => {
      const { fixture, press, navigation } = createActiveDescendantHost();
      fixture.componentInstance.options.set([
        { label: 'Apple' },
        { label: 'Apricot', disabled: true },
        { label: 'Banana' },
      ]);
      fixture.detectChanges();

      press('ArrowDown');
      press('ArrowDown');

      expect(navigation.activeItem()?.getLabel()).toBe('Banana');
    });
  });

  describe('imperative API', () => {
    it('exposes focusFirst, focusLast, focusNext and focusPrevious', () => {
      const { fixture, navigation } = createRovingHost();

      navigation.focusFirst();
      expect(navigation.activeItem()?.getLabel()).toBe('Apple');

      navigation.focusNext();
      expect(navigation.activeItem()?.getLabel()).toBe('Apricot');

      navigation.focusPrevious();
      expect(navigation.activeItem()?.getLabel()).toBe('Apple');

      navigation.focusLast();
      expect(navigation.activeItem()?.getLabel()).toBe('Cherry');
      fixture.detectChanges();

      expect(navigation.activeIndex()).toBe(3);
    });

    it('focuses a specific item, moving real focus in roving mode', () => {
      const { fixture, navigation, items } = createRovingHost();

      navigation.focusItem(navigation.items()[2]);
      fixture.detectChanges();

      expect(navigation.activeItem()?.getLabel()).toBe('Banana');
      expect(document.activeElement).toBe(items()[2]);
    });

    it('sets the active item silently, without moving real focus', () => {
      const { fixture, navigation, items } = createRovingHost();
      const before = document.activeElement;

      navigation.setActiveItemSilently(navigation.items()[2]);
      fixture.detectChanges();

      expect(navigation.activeItem()?.getLabel()).toBe('Banana');
      expect(document.activeElement).toBe(before);
      expect(items()[2].getAttribute('tabindex')).toBe('0');
    });
  });

  describe('tabOut', () => {
    it('emits when Tab is pressed so a popup can close', () => {
      const { navigation, press } = createRovingHost();
      const emissions: number[] = [];
      navigation.tabOut.subscribe(() => emissions.push(1));

      press('Tab');

      expect(emissions.length).toBe(1);
    });
  });

  describe('reconfiguration at runtime', () => {
    it('keeps the active item when the focus mode changes', () => {
      const { fixture, navigation, press, keyHost } = createRovingHost();

      press('ArrowDown');
      press('ArrowDown');
      expect(navigation.activeItem()?.getLabel()).toBe('Apricot');

      navigation.configure({ focusMode: 'active-descendant' });
      press('ArrowDown');
      fixture.detectChanges();

      expect(navigation.activeItem()?.getLabel()).toBe('Banana');
      expect(keyHost.getAttribute('aria-activedescendant')).toBe(
        navigation.activeItem()?.itemId,
      );
    });

    it('only overwrites the options it was given', () => {
      const { navigation } = createRovingHost({ orientation: 'horizontal' });

      navigation.configure({ wrap: false });

      expect(navigation.orientation()).toBe('horizontal');
      expect(navigation.wrap()).toBe(false);
      expect(navigation.typeahead()).toBe(true);
    });
  });

  describe('modifier keys', () => {
    it('leaves modified arrow presses to the browser', () => {
      const { press, navigation } = createRovingHost();

      expect(press('ArrowDown', { ctrlKey: true }).defaultPrevented).toBe(
        false,
      );
      expect(navigation.activeItem()).toBeNull();
    });
  });
});
