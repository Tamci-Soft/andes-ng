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
});
