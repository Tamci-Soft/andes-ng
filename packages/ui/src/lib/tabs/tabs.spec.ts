import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AndesTabs } from './tabs';
import { AndesTabsContent } from './tabs-content';
import { AndesTabsList } from './tabs-list';
import { AndesTabsTrigger } from './tabs-trigger';
import { AndesTabsActivationMode, AndesTabsOrientation } from './tabs-types';

/**
 * `ListKeyManager` (used internally by `AndesListNavigation`) reads the deprecated-but-
 * universal `KeyboardEvent.keyCode`, which jsdom leaves at 0 on synthetic events.
 */
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  ArrowLeft: 37,
  ArrowRight: 39,
  Home: 36,
  End: 35,
  Enter: 13,
  ' ': 32,
};

function keyCodeFor(key: string): number {
  return KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0);
}

function pressKey(target: Element, key: string): KeyboardEvent {
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
  imports: [AndesTabs, AndesTabsList, AndesTabsTrigger, AndesTabsContent],
  template: `
    <andes-tabs
      [orientation]="orientation()"
      [activationMode]="activationMode()"
      [(value)]="value"
    >
      <andes-tabs-list>
        <andes-tabs-trigger value="a">Tab A</andes-tabs-trigger>
        <andes-tabs-trigger value="b" [disabled]="bDisabled()"
          >Tab B</andes-tabs-trigger
        >
        <andes-tabs-trigger value="c">Tab C</andes-tabs-trigger>
      </andes-tabs-list>
      <andes-tabs-content value="a">Panel A</andes-tabs-content>
      <andes-tabs-content value="b">Panel B</andes-tabs-content>
      <andes-tabs-content value="c">Panel C</andes-tabs-content>
    </andes-tabs>
  `,
})
class HostComponent {
  readonly orientation = signal<AndesTabsOrientation>('horizontal');
  readonly activationMode = signal<AndesTabsActivationMode>('automatic');
  readonly bDisabled = signal(false);
  readonly value = signal<string | undefined>(undefined);
}

describe('AndesTabs', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return withHelpers(fixture);
  }

  function withHelpers(fixture: ComponentFixture<HostComponent>) {
    const host = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      tablist: host.querySelector('[role="tablist"]') as HTMLElement,
      tabs: () =>
        Array.from(
          host.querySelectorAll('[role="tab"]'),
        ) as HTMLButtonElement[],
      panels: () =>
        Array.from(host.querySelectorAll('[role="tabpanel"]')) as HTMLElement[],
    };
  }

  describe('default selection', () => {
    it('selects the first enabled tab before any interaction', () => {
      const { tabs, panels } = createHost();

      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs()[1].getAttribute('aria-selected')).toBe('false');
      expect(tabs()[2].getAttribute('aria-selected')).toBe('false');
      expect(panels()[0].hidden).toBe(false);
      expect(panels()[1].hidden).toBe(true);
      expect(panels()[2].hidden).toBe(true);
    });
  });

  describe('roles and cross-linking', () => {
    it('sets role="tablist"/"tab"/"tabpanel"', () => {
      const { tablist, tabs, panels } = createHost();

      expect(tablist).toBeTruthy();
      expect(tabs().length).toBe(3);
      expect(panels().length).toBe(3);
    });

    it('cross-links each tab to its panel via aria-controls/aria-labelledby/id', () => {
      const { tabs, panels } = createHost();

      tabs().forEach((tab, i) => {
        const panel = panels()[i];
        expect(tab.getAttribute('aria-controls')).toBe(panel.id);
        expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
        expect(tab.id.length).toBeGreaterThan(0);
        expect(panel.id.length).toBeGreaterThan(0);
      });
    });

    it('gives every tab an explicit aria-selected, true or false', () => {
      const { tabs } = createHost();

      expect(tabs().map((t) => t.getAttribute('aria-selected'))).toEqual([
        'true',
        'false',
        'false',
      ]);
    });
  });

  describe('accessibility tree', () => {
    it('only the active panel is exposed - inactive ones carry the native hidden attribute', () => {
      const { panels } = createHost();

      expect(panels()[0].hasAttribute('hidden')).toBe(false);
      expect(panels()[1].hasAttribute('hidden')).toBe(true);
      expect(panels()[2].hasAttribute('hidden')).toBe(true);
    });
  });

  describe('automatic activation (default)', () => {
    it('moves both focus and the active tab together with the arrow keys', () => {
      const { fixture, tabs, panels } = createHost();
      tabs()[0].focus();

      pressKey(tabs()[0], 'ArrowRight');
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[1]);
      expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
      expect(tabs()[0].getAttribute('aria-selected')).toBe('false');
      expect(panels()[1].hidden).toBe(false);
      expect(panels()[0].hidden).toBe(true);
    });

    it('wraps around and skips disabled tabs', () => {
      const { fixture, tabs } = createHost();
      fixture.componentInstance.bDisabled.set(true);
      fixture.detectChanges();
      tabs()[0].focus();

      pressKey(tabs()[0], 'ArrowRight');
      fixture.detectChanges();

      // b is disabled, so focus/selection should skip straight to c.
      expect(document.activeElement).toBe(tabs()[2]);
      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('manual activation', () => {
    it('moves focus only with arrow keys, leaving selection to Enter/Space', () => {
      const { fixture, tabs, panels } = createHost();
      fixture.componentInstance.activationMode.set('manual');
      fixture.detectChanges();
      tabs()[0].focus();

      pressKey(tabs()[0], 'ArrowRight');
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[1]);
      // Selection has not moved yet.
      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs()[1].getAttribute('aria-selected')).toBe('false');
      expect(panels()[0].hidden).toBe(false);

      pressKey(tabs()[1], 'Enter');
      fixture.detectChanges();

      expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
      expect(panels()[1].hidden).toBe(false);
    });

    it('activates the focused tab on Space too', () => {
      const { fixture, tabs } = createHost();
      fixture.componentInstance.activationMode.set('manual');
      fixture.detectChanges();
      tabs()[0].focus();

      pressKey(tabs()[0], 'ArrowRight');
      pressKey(tabs()[1], ' ');
      fixture.detectChanges();

      expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('Home and End', () => {
    it('jumps to the first and last tab', () => {
      const { fixture, tabs } = createHost();
      tabs()[0].focus();

      pressKey(tabs()[0], 'End');
      fixture.detectChanges();
      expect(document.activeElement).toBe(tabs()[2]);
      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');

      pressKey(tabs()[2], 'Home');
      fixture.detectChanges();
      expect(document.activeElement).toBe(tabs()[0]);
      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('disabled tabs', () => {
    it('are skipped while navigating and are not focusable', () => {
      const { fixture, tabs } = createHost();
      fixture.componentInstance.bDisabled.set(true);
      fixture.detectChanges();

      expect(tabs()[1].disabled).toBe(true);
      expect(tabs()[1].getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('click activation', () => {
    it('selects a tab on click regardless of activation mode', () => {
      const { fixture, tabs, panels } = createHost();
      fixture.componentInstance.activationMode.set('manual');
      fixture.detectChanges();

      tabs()[2].click();
      fixture.detectChanges();

      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
      expect(panels()[2].hidden).toBe(false);
    });
  });

  describe('vertical orientation', () => {
    it('navigates with the vertical arrow keys and ignores horizontal ones', () => {
      const { fixture, tabs } = createHost();
      fixture.componentInstance.orientation.set('vertical');
      fixture.detectChanges();
      tabs()[0].focus();

      expect(pressKey(tabs()[0], 'ArrowRight').defaultPrevented).toBe(false);

      pressKey(tabs()[0], 'ArrowDown');
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[1]);
    });
  });

  describe('controlled value', () => {
    it('supports two-way binding via [(value)]', () => {
      const { fixture, tabs } = createHost();
      fixture.componentInstance.value.set('c');
      fixture.detectChanges();

      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');

      tabs()[0].click();
      fixture.detectChanges();

      expect(fixture.componentInstance.value()).toBe('a');
    });
  });

  // Regression coverage for a bug where nothing seeded the shared `AndesListNavigation`'s
  // roving-tabindex target from the currently-selected tab, so it fell back to the
  // primitive's own default (the first enabled item). Under automatic activation, a plain
  // Tab into the tablist would then focus the first tab - not the selected one - and
  // silently reselect it via the "focus moved, so select" effect, with no arrow key ever
  // pressed. See the WAI-ARIA APG: Tab must move focus to the active/selected tab.
  describe('roving-tabindex target follows the selected tab', () => {
    it('targets the selected tab (not the first one) before any interaction', () => {
      const fixture = TestBed.createComponent(HostComponent);
      // Selects C - not the first tab - before the first `detectChanges`, mirroring a
      // consumer rendering `AndesTabs` with `[(value)]` already bound to a non-first tab.
      fixture.componentInstance.value.set('c');
      fixture.detectChanges();
      const { tabs } = withHelpers(fixture);

      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
      expect(tabs()[0].getAttribute('tabindex')).toBe('-1');
      expect(tabs()[1].getAttribute('tabindex')).toBe('-1');
      expect(tabs()[2].getAttribute('tabindex')).toBe('0');
    });

    it('does not silently change value when Tab moves focus into the tablist', () => {
      const fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.value.set('c');
      fixture.detectChanges();
      const { tabs } = withHelpers(fixture);

      // A real Tab keypress focuses whichever item is the sole roving-tabindex target - a
      // plain `.focus()` on it is the standard way to simulate that in jsdom, since jsdom
      // does not implement native Tab-key traversal.
      const target = tabs().find((tab) => tab.getAttribute('tabindex') === '0');
      expect(target).toBe(tabs()[2]);
      target?.focus();
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[2]);
      expect(fixture.componentInstance.value()).toBe('c');
      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');
    });

    it('updates when a consumer sets [value] programmatically, without breaking automatic activation for subsequent arrow-key navigation', () => {
      const { fixture, tabs } = createHost();

      // Default selection is the first enabled tab; the target starts on A.
      expect(tabs()[0].getAttribute('tabindex')).toBe('0');

      // Not a click, not a keypress - a plain programmatic value change.
      fixture.componentInstance.value.set('c');
      fixture.detectChanges();

      expect(tabs()[2].getAttribute('tabindex')).toBe('0');
      expect(tabs()[0].getAttribute('tabindex')).toBe('-1');
      expect(tabs()[2].getAttribute('aria-selected')).toBe('true');

      // Automatic activation still works normally afterwards: arrowing right from C wraps to A.
      tabs()[2].focus();
      pressKey(tabs()[2], 'ArrowRight');
      fixture.detectChanges();

      expect(document.activeElement).toBe(tabs()[0]);
      expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
      expect(fixture.componentInstance.value()).toBe('a');
    });
  });
});
