import { BidiModule } from '@angular/cdk/bidi';
import {
  Component,
  PLATFORM_ID,
  signal,
  viewChild,
  type Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AndesChoiceGroup } from './choice-group';
import { AndesChoiceItem } from './choice-group-item';
import {
  ANDES_CHOICE_ROLE_MAPPINGS,
  AndesChoiceGroupRole,
  AndesChoiceMode,
  AndesChoiceValue,
} from './choice-group-types';

/**
 * The key manager under the group reads the deprecated-but-universal `KeyboardEvent.keyCode`,
 * which jsdom leaves at 0 on synthetic events, so tests populate it the way a browser would.
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

function dispatchKey(
  type: 'keydown' | 'keyup',
  target: Element,
  key: string,
  modifiers: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
  const event = new KeyboardEvent(type, {
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
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const FRUIT: readonly Option[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'damson', label: 'Damson' },
];

/** The radio-group shape: native-looking buttons, selection follows focus. */
@Component({
  imports: [AndesChoiceGroup, AndesChoiceItem],
  template: `
    <div
      andesChoiceGroup
      role="radiogroup"
      aria-label="Fruit"
      [(value)]="value"
      [required]="required()"
      [disabled]="disabled()"
      [wrap]="wrap()"
      [compareWith]="compareWith()"
      (changed)="changes.push($event)"
    >
      @for (option of options(); track option.value) {
        <button
          type="button"
          andesChoiceItem
          [value]="option.value"
          [disabled]="option.disabled ?? false"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
class RadioHarness {
  readonly group = viewChild.required(AndesChoiceGroup);
  readonly value = signal<unknown>(null);
  readonly options = signal<readonly Option[]>(FRUIT);
  readonly required = signal(false);
  readonly disabled = signal(false);
  readonly wrap = signal(true);
  readonly compareWith = signal<(a: unknown, b: unknown) => boolean>(Object.is);
  readonly changes: unknown[] = [];
}

/** The tabs shape: a tablist, `aria-controls` hooks and a switchable activation mode. */
@Component({
  imports: [AndesChoiceGroup, AndesChoiceItem],
  template: `
    <div
      andesChoiceGroup
      role="tablist"
      [(value)]="value"
      [selectionFollowsFocus]="automatic()"
      [orientation]="orientation()"
      (changed)="changes.push($event)"
    >
      @for (tab of tabs(); track tab.value) {
        <button
          type="button"
          andesChoiceItem
          [value]="tab.value"
          [disabled]="tab.disabled ?? false"
          [controls]="'panel-' + tab.value"
        >
          {{ tab.label }}
        </button>
      }
    </div>
    @for (tab of tabs(); track tab.value) {
      <div
        role="tabpanel"
        [id]="'panel-' + tab.value"
        [hidden]="value() !== tab.value"
      >
        {{ tab.label }} panel
      </div>
    }
  `,
})
class TabsHarness {
  readonly value = signal<unknown>('apple');
  readonly tabs = signal<readonly Option[]>(FRUIT);
  readonly automatic = signal(true);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly changes: unknown[] = [];
}

/** The toggle-group shape: pressed buttons, single or multiple, activated manually. */
@Component({
  imports: [AndesChoiceGroup, AndesChoiceItem],
  template: `
    <div
      andesChoiceGroup
      [role]="role()"
      [mode]="mode()"
      [(value)]="value"
      [required]="required()"
      aria-label="Formatting"
      (changed)="changes.push($event)"
    >
      @for (option of options; track option.value) {
        <button type="button" andesChoiceItem [value]="option.value">
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
class ToggleHarness {
  readonly options = FRUIT;
  readonly role = signal<AndesChoiceGroupRole>('group');
  readonly mode = signal<AndesChoiceMode>('single');
  readonly value = signal<AndesChoiceValue<unknown>>(null);
  readonly required = signal(false);
  readonly changes: unknown[] = [];
}

/** The segmented shape: horizontal radios in a right-to-left page. */
@Component({
  imports: [AndesChoiceGroup, AndesChoiceItem, BidiModule],
  template: `
    <div dir="rtl">
      <div andesChoiceGroup role="radiogroup" [(value)]="value">
        @for (option of options; track option.value) {
          <div andesChoiceItem [value]="option.value">{{ option.label }}</div>
        }
      </div>
    </div>
  `,
})
class SegmentedRtlHarness {
  readonly options = FRUIT;
  readonly value = signal<unknown>('banana');
}

/** A listbox-style picker with typeahead and an explicit text direction override. */
@Component({
  imports: [AndesChoiceGroup, AndesChoiceItem],
  template: `
    <div
      andesChoiceGroup
      role="listbox"
      [mode]="mode()"
      [typeahead]="true"
      [textDirection]="direction()"
      [orientation]="orientation()"
      [(value)]="value"
    >
      @for (option of options; track option.value) {
        <div andesChoiceItem [value]="option.value">{{ option.label }}</div>
      }
    </div>
  `,
})
class ListboxHarness {
  readonly options = FRUIT;
  readonly mode = signal<AndesChoiceMode>('single');
  readonly direction = signal<'ltr' | 'rtl'>('ltr');
  readonly orientation = signal<'horizontal' | 'vertical'>('vertical');
  readonly value = signal<AndesChoiceValue<unknown>>(null);
}

function setup<T>(component: Type<T>) {
  const fixture: ComponentFixture<T> = TestBed.createComponent(component);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;

  const helpers = {
    fixture,
    host,
    group: () => host.querySelector('[andesChoiceGroup]') as HTMLElement,
    items: () =>
      Array.from(host.querySelectorAll('[andesChoiceItem]')) as HTMLElement[],
    texts: () => helpers.items().map((item) => item.textContent?.trim()),
    attr: (name: string) =>
      helpers.items().map((item) => item.getAttribute(name)),
    focused: () => document.activeElement?.textContent?.trim() ?? null,
    flush: () => {
      fixture.detectChanges();
      fixture.detectChanges();
    },
    focus: (index: number) => {
      helpers.items()[index].focus();
      helpers.flush();
    },
    click: (index: number) => {
      helpers.items()[index].click();
      helpers.flush();
    },
    press: (key: string, modifiers?: Partial<KeyboardEventInit>) => {
      const target = (document.activeElement ?? helpers.items()[0]) as Element;
      const event = dispatchKey('keydown', target, key, modifiers);
      helpers.flush();
      return event;
    },
  };
  helpers.flush();
  return helpers;
}

describe('AndesChoiceGroup', () => {
  describe('radio group', () => {
    it('publishes the radiogroup / radio roles with aria-checked and data-state', () => {
      const { group, attr, items } = setup(RadioHarness);

      expect(group().getAttribute('role')).toBe('radiogroup');
      expect(attr('role')).toEqual(['radio', 'radio', 'radio', 'radio']);
      expect(attr('aria-checked')).toEqual([
        'false',
        'false',
        'false',
        'false',
      ]);
      expect(attr('data-state')).toEqual([
        'unchecked',
        'unchecked',
        'unchecked',
        'unchecked',
      ]);
      expect(items()[0].hasAttribute('aria-selected')).toBe(false);
      expect(items()[0].hasAttribute('aria-pressed')).toBe(false);
      expect(group().hasAttribute('aria-orientation')).toBe(false);
    });

    it('reflects the value on the items, with the tab stop on the selected one', () => {
      const { fixture, attr } = setup(RadioHarness);
      fixture.componentInstance.value.set('cherry');
      fixture.detectChanges();
      fixture.detectChanges();

      expect(attr('aria-checked')).toEqual(['false', 'false', 'true', 'false']);
      expect(attr('data-state')).toEqual([
        'unchecked',
        'unchecked',
        'checked',
        'unchecked',
      ]);
      expect(attr('tabindex')).toEqual(['-1', '-1', '0', '-1']);
    });

    it('puts the tab stop on the first item while nothing is selected', () => {
      const { attr } = setup(RadioHarness);

      expect(attr('tabindex')).toEqual(['0', '-1', '-1', '-1']);
    });

    it('gives every item an id, keeping an authored one', () => {
      const { items } = setup(RadioHarness);
      const ids = items().map((item) => item.id);

      expect(new Set(ids).size).toBe(4);
      ids.forEach((id) => expect(id).toMatch(/^andes-choice-item-\d+$/));
    });

    it('selects the next item with ArrowRight/ArrowDown and moves focus there', () => {
      const { fixture, focus, press, attr, focused } = setup(RadioHarness);
      focus(0);

      const event = press('ArrowRight');
      expect(event.defaultPrevented).toBe(true);
      expect(focused()).toBe('Banana');
      expect(fixture.componentInstance.value()).toBe('banana');

      press('ArrowDown');
      expect(focused()).toBe('Cherry');
      expect(fixture.componentInstance.value()).toBe('cherry');
      expect(attr('aria-checked')).toEqual(['false', 'false', 'true', 'false']);
      expect(attr('tabindex')).toEqual(['-1', '-1', '0', '-1']);
    });

    it('selects the previous item with ArrowLeft/ArrowUp', () => {
      const { fixture, focus, press, focused } = setup(RadioHarness);
      fixture.componentInstance.value.set('cherry');
      focus(2);

      press('ArrowLeft');
      expect(focused()).toBe('Banana');
      press('ArrowUp');
      expect(focused()).toBe('Apple');
      expect(fixture.componentInstance.value()).toBe('apple');
    });

    it('wraps from the last item to the first and back', () => {
      const { fixture, focus, press, focused } = setup(RadioHarness);
      focus(3);

      press('ArrowRight');
      expect(focused()).toBe('Apple');
      expect(fixture.componentInstance.value()).toBe('apple');

      press('ArrowLeft');
      expect(focused()).toBe('Damson');
    });

    it('stops at the ends when wrap is off', () => {
      const { fixture, focus, press, focused } = setup(RadioHarness);
      fixture.componentInstance.wrap.set(false);
      fixture.detectChanges();
      focus(3);

      press('ArrowRight');

      expect(focused()).toBe('Damson');
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('jumps to the first and last items with Home and End', () => {
      const { fixture, focus, press, focused } = setup(RadioHarness);
      focus(1);

      press('End');
      expect(focused()).toBe('Damson');
      expect(fixture.componentInstance.value()).toBe('damson');

      press('Home');
      expect(focused()).toBe('Apple');
      expect(fixture.componentInstance.value()).toBe('apple');
    });

    it('skips disabled items, never selecting them', () => {
      const { fixture, focus, press, focused } = setup(RadioHarness);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana', disabled: true },
        { value: 'cherry', label: 'Cherry' },
      ]);
      fixture.detectChanges();
      focus(0);

      press('ArrowRight');

      expect(focused()).toBe('Cherry');
      expect(fixture.componentInstance.value()).toBe('cherry');
    });

    it('selects the focused item on Space and Enter', () => {
      const { fixture, focus, press } = setup(RadioHarness);
      focus(1);
      expect(fixture.componentInstance.value()).toBeNull();

      const space = press(' ');
      expect(space.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.value()).toBe('banana');

      fixture.componentInstance.value.set(null);
      fixture.detectChanges();
      press('Enter');
      expect(fixture.componentInstance.value()).toBe('banana');
    });

    it('cancels the click a button fires when Space is released', () => {
      const { focus, items } = setup(RadioHarness);
      focus(1);

      const keyup = dispatchKey('keyup', items()[1], ' ');

      expect(keyup.defaultPrevented).toBe(true);
    });

    it('ignores activation keys carrying a modifier', () => {
      const { fixture, focus, press } = setup(RadioHarness);
      focus(1);

      const event = press(' ', { ctrlKey: true });

      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('does not select an item just because Tab focused it', () => {
      const { fixture, focus } = setup(RadioHarness);

      focus(0);

      expect(fixture.componentInstance.value()).toBeNull();
      expect(fixture.componentInstance.changes).toEqual([]);
    });

    it('selects on click, moves the tab stop and emits changed', () => {
      const { fixture, click, attr } = setup(RadioHarness);

      click(2);

      expect(fixture.componentInstance.value()).toBe('cherry');
      expect(fixture.componentInstance.changes).toEqual(['cherry']);
      expect(attr('tabindex')).toEqual(['-1', '-1', '0', '-1']);
    });

    it('does not clear or re-emit when the selected radio is clicked again', () => {
      const { fixture, click } = setup(RadioHarness);
      click(1);
      click(1);

      expect(fixture.componentInstance.value()).toBe('banana');
      expect(fixture.componentInstance.changes).toEqual(['banana']);
    });

    it('emits changed for keyboard selection with the new value', () => {
      const { fixture, focus, press } = setup(RadioHarness);
      focus(0);
      press('ArrowRight');
      press('ArrowRight');

      expect(fixture.componentInstance.changes).toEqual(['banana', 'cherry']);
    });

    it('does not emit changed for programmatic value changes', () => {
      const { fixture } = setup(RadioHarness);
      fixture.componentInstance.value.set('damson');
      fixture.detectChanges();

      expect(fixture.componentInstance.changes).toEqual([]);
    });

    it('publishes aria-required only when required', () => {
      const { fixture, group } = setup(RadioHarness);
      expect(group().hasAttribute('aria-required')).toBe(false);

      fixture.componentInstance.required.set(true);
      fixture.detectChanges();

      expect(group().getAttribute('aria-required')).toBe('true');
    });

    it('moves the tab stop with a programmatic value change', () => {
      const { fixture, attr } = setup(RadioHarness);
      fixture.componentInstance.value.set('banana');
      fixture.detectChanges();
      fixture.detectChanges();
      expect(attr('tabindex')).toEqual(['-1', '0', '-1', '-1']);

      fixture.componentInstance.value.set('damson');
      fixture.detectChanges();
      fixture.detectChanges();
      expect(attr('tabindex')).toEqual(['-1', '-1', '-1', '0']);
    });

    it('moves the tab stop off a selected item that becomes disabled', () => {
      const { fixture, attr } = setup(RadioHarness);
      fixture.componentInstance.value.set('banana');
      fixture.detectChanges();
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana', disabled: true },
      ]);
      fixture.detectChanges();
      fixture.detectChanges();

      expect(attr('tabindex')).toEqual(['0', '-1']);
      expect(attr('aria-checked')).toEqual(['false', 'true']);
    });

    it('compares values with compareWith', () => {
      const { fixture, click, attr } = setup(RadioHarness);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
      ]);
      fixture.componentInstance.compareWith.set(
        (a, b) => String(a).toLowerCase() === String(b).toLowerCase(),
      );
      fixture.componentInstance.value.set('BANANA');
      fixture.detectChanges();
      fixture.detectChanges();

      expect(attr('aria-checked')).toEqual(['false', 'true']);
      click(0);
      expect(attr('aria-checked')).toEqual(['true', 'false']);
    });

    it('survives its selected item being removed', () => {
      const { fixture, attr } = setup(RadioHarness);
      fixture.componentInstance.value.set('cherry');
      fixture.detectChanges();
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
      ]);
      fixture.detectChanges();
      fixture.detectChanges();

      expect(attr('tabindex')).toEqual(['0', '-1']);
      expect(attr('aria-checked')).toEqual(['false', 'false']);
    });

    it('focus() lands on the selected item, or the first when nothing is selected', () => {
      const { fixture, focused } = setup(RadioHarness);
      fixture.componentInstance.group().focus();
      expect(focused()).toBe('Apple');

      fixture.componentInstance.value.set('cherry');
      fixture.detectChanges();
      fixture.detectChanges();
      fixture.componentInstance.group().focus();
      expect(focused()).toBe('Cherry');
    });

    it('tears down while an item is active', () => {
      const { fixture, focus, press } = setup(RadioHarness);
      focus(0);
      press('ArrowRight');

      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  describe('disabled group', () => {
    it('disables every item and publishes the state', () => {
      const { fixture, group, attr, items } = setup(RadioHarness);
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      fixture.detectChanges();

      expect(group().getAttribute('aria-disabled')).toBe('true');
      expect(group().hasAttribute('data-disabled')).toBe(true);
      expect(attr('aria-disabled')).toEqual(['true', 'true', 'true', 'true']);
      expect(attr('tabindex')).toEqual(['-1', '-1', '-1', '-1']);
      expect(items().every((item) => item.hasAttribute('disabled'))).toBe(true);
    });

    it('ignores keys and clicks', () => {
      const { fixture, click, items } = setup(RadioHarness);
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      const event = dispatchKey('keydown', items()[0], 'ArrowRight');
      fixture.detectChanges();
      click(1);
      dispatchKey('keydown', items()[1], ' ');

      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.value()).toBeNull();
      expect(fixture.componentInstance.changes).toEqual([]);
    });

    it('can be disabled from outside through setDisabledState', () => {
      const { fixture, group, click } = setup(RadioHarness);
      fixture.componentInstance.group().setDisabledState(true);
      fixture.detectChanges();
      expect(group().getAttribute('aria-disabled')).toBe('true');
      click(0);
      expect(fixture.componentInstance.value()).toBeNull();

      fixture.componentInstance.group().setDisabledState(false);
      fixture.detectChanges();
      click(0);
      expect(fixture.componentInstance.value()).toBe('apple');
    });

    it('ignores clicks on a single disabled item and marks it', () => {
      const { fixture, click, items } = setup(RadioHarness);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana', disabled: true },
      ]);
      fixture.detectChanges();
      fixture.detectChanges();

      click(1);

      expect(fixture.componentInstance.value()).toBeNull();
      expect(items()[1].getAttribute('data-disabled')).toBe('');
      expect(items()[0].hasAttribute('data-disabled')).toBe(false);
    });
  });

  describe('tabs', () => {
    it('publishes tablist / tab roles with aria-selected and aria-controls', () => {
      const { group, attr } = setup(TabsHarness);

      expect(group().getAttribute('role')).toBe('tablist');
      expect(group().getAttribute('aria-orientation')).toBe('horizontal');
      expect(attr('role')).toEqual(['tab', 'tab', 'tab', 'tab']);
      expect(attr('aria-selected')).toEqual([
        'true',
        'false',
        'false',
        'false',
      ]);
      expect(attr('aria-controls')).toEqual([
        'panel-apple',
        'panel-banana',
        'panel-cherry',
        'panel-damson',
      ]);
      expect(attr('data-state')).toEqual([
        'active',
        'inactive',
        'inactive',
        'inactive',
      ]);
      expect(attr('aria-checked')).toEqual([null, null, null, null]);
    });

    it('omits aria-controls when no panel is given', () => {
      const { fixture, attr } = setup(RadioHarness);

      expect(fixture.nativeElement).toBeTruthy();
      expect(attr('aria-controls')).toEqual([null, null, null, null]);
    });

    it('does not publish aria-required on a tablist', () => {
      const { fixture, group } = setup(ToggleHarness);
      fixture.componentInstance.role.set('tablist');
      fixture.componentInstance.required.set(true);
      fixture.detectChanges();

      expect(group().hasAttribute('aria-required')).toBe(false);
    });

    it('selects the focused tab as arrow keys move (automatic activation)', () => {
      const { fixture, focus, press, focused } = setup(TabsHarness);
      focus(0);

      press('ArrowRight');
      expect(focused()).toBe('Banana');
      expect(fixture.componentInstance.value()).toBe('banana');

      press('End');
      expect(fixture.componentInstance.value()).toBe('damson');
      expect(fixture.componentInstance.changes).toEqual(['banana', 'damson']);
    });

    it('only moves focus in manual mode, selecting on Space or Enter', () => {
      const { fixture, focus, press, focused, attr } = setup(TabsHarness);
      fixture.componentInstance.automatic.set(false);
      fixture.detectChanges();
      focus(0);

      press('ArrowRight');
      press('ArrowRight');
      expect(focused()).toBe('Cherry');
      expect(fixture.componentInstance.value()).toBe('apple');
      expect(attr('aria-selected')).toEqual([
        'true',
        'false',
        'false',
        'false',
      ]);

      press('Enter');
      expect(fixture.componentInstance.value()).toBe('cherry');
      expect(attr('aria-selected')).toEqual([
        'false',
        'false',
        'true',
        'false',
      ]);

      press('ArrowLeft');
      press(' ');
      expect(fixture.componentInstance.value()).toBe('banana');
    });

    it('returns the tab stop to the selected tab when focus leaves (manual mode)', () => {
      const { fixture, focus, press, attr, items } = setup(TabsHarness);
      fixture.componentInstance.automatic.set(false);
      fixture.detectChanges();
      focus(0);
      press('ArrowRight');
      press('ArrowRight');
      expect(attr('tabindex')).toEqual(['-1', '-1', '0', '-1']);

      items()[2].blur();
      items()[2].dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
      );
      fixture.detectChanges();

      expect(attr('tabindex')).toEqual(['0', '-1', '-1', '-1']);
    });

    it('keeps the tab stop when focus moves between tabs', () => {
      const { fixture, focus, items, attr } = setup(TabsHarness);
      fixture.componentInstance.automatic.set(false);
      fixture.detectChanges();
      focus(1);

      items()[1].dispatchEvent(
        new FocusEvent('focusout', {
          bubbles: true,
          relatedTarget: items()[2],
        }),
      );
      fixture.detectChanges();

      expect(attr('tabindex')).toEqual(['-1', '0', '-1', '-1']);
    });

    it('follows the vertical orientation', () => {
      const { fixture, group, focus, press, focused } = setup(TabsHarness);
      fixture.componentInstance.orientation.set('vertical');
      fixture.detectChanges();
      focus(0);

      expect(group().getAttribute('aria-orientation')).toBe('vertical');
      expect(press('ArrowRight').defaultPrevented).toBe(false);
      expect(focused()).toBe('Apple');
      press('ArrowDown');
      expect(focused()).toBe('Banana');
    });

    it('skips disabled tabs', () => {
      const { fixture, focus, press, focused } = setup(TabsHarness);
      fixture.componentInstance.tabs.set([
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana', disabled: true },
        { value: 'cherry', label: 'Cherry' },
      ]);
      fixture.detectChanges();
      focus(0);

      press('ArrowRight');

      expect(focused()).toBe('Cherry');
    });

    it('never deselects the active tab', () => {
      const { fixture, click } = setup(TabsHarness);

      click(0);

      expect(fixture.componentInstance.value()).toBe('apple');
      expect(fixture.componentInstance.changes).toEqual([]);
    });
  });

  describe('toggle group', () => {
    it('publishes group / button roles with aria-pressed', () => {
      const { group, attr } = setup(ToggleHarness);

      expect(group().getAttribute('role')).toBe('group');
      expect(group().hasAttribute('aria-orientation')).toBe(false);
      expect(attr('role')).toEqual(['button', 'button', 'button', 'button']);
      expect(attr('aria-pressed')).toEqual([
        'false',
        'false',
        'false',
        'false',
      ]);
      expect(attr('data-state')).toEqual(['off', 'off', 'off', 'off']);
      expect(attr('aria-checked')).toEqual([null, null, null, null]);
      expect(attr('aria-selected')).toEqual([null, null, null, null]);
    });

    it('supports the toolbar role with its orientation', () => {
      const { fixture, group } = setup(ToggleHarness);
      fixture.componentInstance.role.set('toolbar');
      fixture.detectChanges();

      expect(group().getAttribute('role')).toBe('toolbar');
      expect(group().getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('moves focus with the arrows without pressing anything', () => {
      const { fixture, focus, press, focused } = setup(ToggleHarness);
      focus(0);

      press('ArrowRight');
      press('ArrowRight');

      expect(focused()).toBe('Cherry');
      expect(fixture.componentInstance.value()).toBeNull();
      expect(fixture.componentInstance.changes).toEqual([]);
    });

    it('presses on Space and releases on a second press (single)', () => {
      const { fixture, focus, press, attr } = setup(ToggleHarness);
      focus(1);

      press(' ');
      expect(fixture.componentInstance.value()).toBe('banana');
      expect(attr('aria-pressed')).toEqual(['false', 'true', 'false', 'false']);
      expect(attr('data-state')).toEqual(['off', 'on', 'off', 'off']);

      press(' ');
      expect(fixture.componentInstance.value()).toBeNull();
      expect(fixture.componentInstance.changes).toEqual(['banana', null]);
    });

    it('replaces the pressed item in single mode', () => {
      const { fixture, click } = setup(ToggleHarness);

      click(0);
      click(2);

      expect(fixture.componentInstance.value()).toBe('cherry');
    });

    it('cannot be cleared when required', () => {
      const { fixture, click } = setup(ToggleHarness);
      fixture.componentInstance.required.set(true);
      fixture.detectChanges();

      click(0);
      click(0);

      expect(fixture.componentInstance.value()).toBe('apple');
      expect(fixture.componentInstance.changes).toEqual(['apple']);
    });

    it('does not publish aria-required for the group role even when required', () => {
      const { fixture, group } = setup(ToggleHarness);
      fixture.componentInstance.required.set(true);
      fixture.detectChanges();

      expect(group().hasAttribute('aria-required')).toBe(false);
    });

    it('holds an array and toggles items independently in multiple mode', () => {
      const { fixture, click, attr } = setup(ToggleHarness);
      fixture.componentInstance.mode.set('multiple');
      fixture.detectChanges();

      click(0);
      click(2);
      expect(fixture.componentInstance.value()).toEqual(['apple', 'cherry']);
      expect(attr('aria-pressed')).toEqual(['true', 'false', 'true', 'false']);

      click(0);
      expect(fixture.componentInstance.value()).toEqual(['cherry']);
      expect(fixture.componentInstance.changes).toEqual([
        ['apple'],
        ['apple', 'cherry'],
        ['cherry'],
      ]);
    });

    it('can empty a multiple group even when required', () => {
      const { fixture, click } = setup(ToggleHarness);
      fixture.componentInstance.mode.set('multiple');
      fixture.componentInstance.required.set(true);
      fixture.detectChanges();

      click(1);
      click(1);

      expect(fixture.componentInstance.value()).toEqual([]);
    });

    it('never selects as focus moves in multiple mode, even for a radiogroup', () => {
      const { fixture, focus, press } = setup(ToggleHarness);
      fixture.componentInstance.role.set('radiogroup');
      fixture.componentInstance.mode.set('multiple');
      fixture.detectChanges();
      focus(0);

      press('ArrowRight');

      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('reads a bare value as a one-item selection in multiple mode', () => {
      const { fixture, attr } = setup(ToggleHarness);
      fixture.componentInstance.mode.set('multiple');
      fixture.componentInstance.value.set('banana');
      fixture.detectChanges();
      fixture.detectChanges();

      expect(attr('aria-pressed')).toEqual(['false', 'true', 'false', 'false']);
    });

    it('puts the tab stop on the first pressed item', () => {
      const { fixture, attr } = setup(ToggleHarness);
      fixture.componentInstance.mode.set('multiple');
      fixture.componentInstance.value.set(['cherry', 'damson']);
      fixture.detectChanges();
      fixture.detectChanges();

      expect(attr('tabindex')).toEqual(['-1', '-1', '0', '-1']);
    });
  });

  describe('listbox role', () => {
    it('publishes listbox / option roles with aria-selected', () => {
      const { group, attr } = setup(ListboxHarness);

      expect(group().getAttribute('role')).toBe('listbox');
      expect(group().getAttribute('aria-orientation')).toBe('vertical');
      expect(attr('role')).toEqual(['option', 'option', 'option', 'option']);
      expect(attr('aria-selected')).toEqual([
        'false',
        'false',
        'false',
        'false',
      ]);
      expect(attr('data-state')).toEqual([
        'unselected',
        'unselected',
        'unselected',
        'unselected',
      ]);
      expect(group().hasAttribute('aria-multiselectable')).toBe(false);
    });

    it('announces multiselectable only in multiple mode', () => {
      const { fixture, group } = setup(ListboxHarness);
      fixture.componentInstance.mode.set('multiple');
      fixture.detectChanges();

      expect(group().getAttribute('aria-multiselectable')).toBe('true');
    });

    it('moves focus on vertical arrows and selects with Space', () => {
      const { fixture, focus, press, focused } = setup(ListboxHarness);
      focus(0);

      press('ArrowDown');
      expect(focused()).toBe('Banana');
      expect(fixture.componentInstance.value()).toBeNull();
      press(' ');
      expect(fixture.componentInstance.value()).toBe('banana');
    });

    it('moves focus by typeahead without treating Space as activation mid-query', () => {
      vi.useFakeTimers();
      try {
        const { fixture, focus, press, focused } = setup(ListboxHarness);
        focus(0);

        press('d');
        vi.advanceTimersByTime(250);
        fixture.detectChanges();

        expect(focused()).toBe('Damson');
        expect(fixture.componentInstance.value()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('role mapping', () => {
    it('exposes a mapping for every role', () => {
      expect(Object.keys(ANDES_CHOICE_ROLE_MAPPINGS).sort()).toEqual([
        'group',
        'listbox',
        'radiogroup',
        'tablist',
        'toolbar',
      ]);
    });

    it('lets roleMapping override single fields of the role default', () => {
      @Component({
        imports: [AndesChoiceGroup, AndesChoiceItem],
        template: `
          <div
            andesChoiceGroup
            role="toolbar"
            [roleMapping]="{
              toggles: false,
              stateAttribute: 'aria-checked',
              itemRole: 'radio',
            }"
            [(value)]="value"
          >
            <button type="button" andesChoiceItem value="a">A</button>
            <button type="button" andesChoiceItem value="b">B</button>
          </div>
        `,
      })
      class OverrideHarness {
        readonly value = signal<unknown>('a');
      }
      const { fixture, click, attr } = setup(OverrideHarness);

      expect(attr('role')).toEqual(['radio', 'radio']);
      expect(attr('aria-checked')).toEqual(['true', 'false']);
      expect(attr('aria-pressed')).toEqual([null, null]);
      click(0);
      expect(fixture.componentInstance.value()).toBe('a');
    });

    it('lets deselectable and selectionFollowsFocus override the role default', () => {
      @Component({
        imports: [AndesChoiceGroup, AndesChoiceItem],
        template: `
          <div
            andesChoiceGroup
            role="radiogroup"
            [deselectable]="true"
            [selectionFollowsFocus]="false"
            [(value)]="value"
          >
            <button type="button" andesChoiceItem value="a">A</button>
            <button type="button" andesChoiceItem value="b">B</button>
          </div>
        `,
      })
      class OptionsHarness {
        readonly value = signal<unknown>('a');
      }
      const { fixture, click, focus, press } = setup(OptionsHarness);

      focus(0);
      press('ArrowRight');
      expect(fixture.componentInstance.value()).toBe('a');
      click(0);
      expect(fixture.componentInstance.value()).toBeNull();
    });
  });

  describe('right-to-left', () => {
    it('mirrors the horizontal arrows under dir="rtl"', () => {
      const { fixture, focus, press, focused } = setup(SegmentedRtlHarness);
      focus(1);

      press('ArrowLeft');
      expect(focused()).toBe('Cherry');
      expect(fixture.componentInstance.value()).toBe('cherry');

      press('ArrowRight');
      expect(focused()).toBe('Banana');
      expect(fixture.componentInstance.value()).toBe('banana');
    });

    it('works on non-button items, using aria-disabled only', () => {
      const { items, fixture } = setup(SegmentedRtlHarness);

      expect(items()[0].tagName).toBe('DIV');
      expect(items()[0].hasAttribute('disabled')).toBe(false);
      expect(fixture.nativeElement).toBeTruthy();
    });

    it('lets textDirection override the surrounding direction', () => {
      const { fixture, focus, press, focused } = setup(ListboxHarness);
      fixture.componentInstance.orientation.set('horizontal');
      fixture.componentInstance.direction.set('rtl');
      fixture.detectChanges();
      focus(1);

      press('ArrowLeft');
      expect(focused()).toBe('Cherry');

      fixture.componentInstance.direction.set('ltr');
      fixture.detectChanges();
      press('ArrowLeft');
      expect(focused()).toBe('Banana');
    });
  });

  describe('imperative API', () => {
    it('select / deselect / toggle / clear act as the user would and emit changed', () => {
      const { fixture } = setup(RadioHarness);
      const group = fixture.componentInstance.group();

      group.select('apple');
      group.select('apple');
      expect(fixture.componentInstance.value()).toBe('apple');
      expect(fixture.componentInstance.changes).toEqual(['apple']);

      group.toggle('banana');
      expect(fixture.componentInstance.value()).toBe('banana');

      group.deselect('banana');
      expect(fixture.componentInstance.value()).toBeNull();

      group.deselect('banana');
      group.clear();
      expect(fixture.componentInstance.changes).toEqual([
        'apple',
        'banana',
        null,
      ]);
    });

    it('refuses to clear a required single group', () => {
      const { fixture } = setup(RadioHarness);
      fixture.componentInstance.required.set(true);
      fixture.componentInstance.value.set('apple');
      fixture.detectChanges();
      const group = fixture.componentInstance.group();

      group.clear();
      group.deselect('apple');

      expect(fixture.componentInstance.value()).toBe('apple');
    });

    it('does nothing while the group is disabled', () => {
      const { fixture } = setup(RadioHarness);
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      const group = fixture.componentInstance.group();

      group.select('apple');
      group.clear();

      expect(fixture.componentInstance.changes).toEqual([]);
    });

    it('clears a multiple group in one step', () => {
      const { fixture } = setup(ToggleHarness);
      fixture.componentInstance.mode.set('multiple');
      fixture.componentInstance.value.set(['apple', 'banana']);
      fixture.detectChanges();
      const group =
        fixture.debugElement.children[0].injector.get(AndesChoiceGroup);

      group.clear();
      group.clear();

      expect(fixture.componentInstance.value()).toEqual([]);
      expect(fixture.componentInstance.changes).toEqual([[]]);
    });

    it('lists its items in DOM order and reports the selected one', () => {
      const { fixture } = setup(RadioHarness);
      fixture.componentInstance.value.set('cherry');
      fixture.detectChanges();
      fixture.detectChanges();
      const group = fixture.componentInstance.group();

      expect(group.items().length).toBe(4);
      expect(group.selectedItem()?.element.textContent?.trim()).toBe('Cherry');
      expect(group.values()).toEqual(['cherry']);
    });
  });

  describe('server rendering', () => {
    it('renders and reacts to value changes without a browser platform', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const { fixture, attr } = setup(RadioHarness);
      fixture.componentInstance.value.set('banana');
      fixture.detectChanges();
      fixture.detectChanges();

      expect(attr('aria-checked')).toEqual(['false', 'true', 'false', 'false']);
      expect(() => fixture.destroy()).not.toThrow();
    });
  });
});
