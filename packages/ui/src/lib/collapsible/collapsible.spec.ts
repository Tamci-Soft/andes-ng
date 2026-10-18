import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesCollapsible } from './collapsible';
import { AndesCollapsibleContent } from './collapsible-content';
import { AndesCollapsibleLazy } from './collapsible-lazy';
import { AndesCollapsibleTrigger } from './collapsible-trigger';

@Component({
  imports: [
    AndesCollapsible,
    AndesCollapsibleTrigger,
    AndesCollapsibleContent,
    AndesCollapsibleLazy,
  ],
  template: `<andes-collapsible
    [(open)]="open"
    [disabled]="disabled()"
    (openChange)="changes.push($event)"
  >
    <button andesCollapsibleTrigger id="native" [disabled]="triggerDisabled()">
      Toggle
    </button>
    <andes-collapsible-trigger id="custom">Custom</andes-collapsible-trigger>
    <div andesCollapsibleTrigger id="div">Div</div>
    <a andesCollapsibleTrigger id="link" href="#x">Link</a>
    <andes-collapsible-content
      [forceMount]="forceMount()"
      [unmountOnClose]="unmountOnClose()"
    >
      <input id="projected" />
      <ng-template andesCollapsibleLazy>
        <span id="lazy">Lazy body</span>
      </ng-template>
    </andes-collapsible-content>
  </andes-collapsible>`,
})
class HostComponent {
  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly triggerDisabled = signal(false);
  readonly forceMount = signal(false);
  readonly unmountOnClose = signal(false);
  readonly changes: boolean[] = [];
}

describe('AndesCollapsible', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const q = <T extends HTMLElement = HTMLElement>(selector: string) =>
      root.querySelector(selector) as T;
    return { fixture, host: fixture.componentInstance, root, q };
  }

  it('starts collapsed with consistent ARIA', () => {
    const { q } = setup();
    const trigger = q('#native');
    const content = q('andes-collapsible-content');

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    expect(content.id).toMatch(/^andes-collapsible-content-\d+$/);
    expect(content.getAttribute('data-state')).toBe('closed');
    expect(content.hasAttribute('inert')).toBe(true);
    expect(q('andes-collapsible').getAttribute('data-state')).toBe('closed');
  });

  it('toggles on click and emits openChange', () => {
    const { fixture, host, q } = setup();
    q('#native').click();
    fixture.detectChanges();

    expect(host.open()).toBe(true);
    expect(host.changes).toEqual([true]);
    expect(q('#native').getAttribute('aria-expanded')).toBe('true');
    expect(q('andes-collapsible-content').getAttribute('data-state')).toBe(
      'open',
    );
    expect(q('andes-collapsible-content').hasAttribute('inert')).toBe(false);

    q('#native').click();
    fixture.detectChanges();
    expect(host.open()).toBe(false);
    expect(host.changes).toEqual([true, false]);
  });

  it('follows the open model set from outside', () => {
    const { fixture, host, q } = setup();
    host.open.set(true);
    fixture.detectChanges();
    expect(q('#div').getAttribute('aria-expanded')).toBe('true');
    expect(host.changes).toEqual([]);
  });

  it('makes a native button a type=button without role or tabindex', () => {
    const { q } = setup();
    const button = q('#native');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.hasAttribute('role')).toBe(false);
    expect(button.hasAttribute('tabindex')).toBe(false);
  });

  it.each(['#custom', '#div', '#link'])(
    'turns %s into a keyboard-operable button',
    (selector) => {
      const { fixture, host, q } = setup();
      const trigger = q(selector);
      expect(trigger.getAttribute('role')).toBe('button');
      expect(trigger.getAttribute('tabindex')).toBe('0');

      trigger.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: ' ',
          bubbles: true,
          cancelable: true,
        }),
      );
      fixture.detectChanges();
      expect(host.open()).toBe(true);
    },
  );

  it('handles Enter on a non-link trigger but leaves a link to its native click', () => {
    const { fixture, host, q } = setup();
    const enter = () =>
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });

    const link = enter();
    q('#link').dispatchEvent(link);
    expect(link.defaultPrevented).toBe(false);
    expect(host.open()).toBe(false);

    const div = enter();
    q('#div').dispatchEvent(div);
    fixture.detectChanges();
    expect(div.defaultPrevented).toBe(true);
    expect(host.open()).toBe(true);
  });

  it('ignores a key pressed inside a trigger child', () => {
    const { fixture, host, q } = setup();
    const child = document.createElement('input');
    q('#div').appendChild(child);
    child.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
    expect(host.open()).toBe(false);
  });

  it('disables every trigger when the root is disabled', () => {
    const { fixture, host, q } = setup();
    host.disabled.set(true);
    fixture.detectChanges();

    expect(q('#native').hasAttribute('disabled')).toBe(true);
    expect(q('#div').getAttribute('aria-disabled')).toBe('true');
    expect(q('#div').getAttribute('tabindex')).toBe('-1');
    expect(q('andes-collapsible').hasAttribute('data-disabled')).toBe(true);

    q('#div').click();
    fixture.detectChanges();
    expect(host.open()).toBe(false);
  });

  it('disables a single trigger on its own', () => {
    const { fixture, host, q } = setup();
    host.triggerDisabled.set(true);
    fixture.detectChanges();
    q('#native').click();
    q('#custom').click();
    fixture.detectChanges();
    expect(host.open()).toBe(true);
  });

  it('exposes imperative expand, collapse and toggle', () => {
    const { fixture } = setup();
    const collapsible = fixture.debugElement.children[0]
      .componentInstance as AndesCollapsible;

    collapsible.expand();
    expect(collapsible.open()).toBe(true);
    collapsible.collapse();
    expect(collapsible.open()).toBe(false);
    collapsible.toggle();
    expect(collapsible.open()).toBe(true);
  });

  it('refuses imperative changes while disabled', () => {
    const { fixture, host } = setup();
    host.disabled.set(true);
    fixture.detectChanges();
    const collapsible = fixture.debugElement.children[0]
      .componentInstance as AndesCollapsible;
    collapsible.expand();
    collapsible.toggle();
    expect(collapsible.open()).toBe(false);
  });

  describe('content', () => {
    it('keeps projected content in the DOM while collapsed', () => {
      const { q } = setup();
      expect(q('#projected')).not.toBeNull();
    });

    it('creates the lazy template on first open and keeps it afterwards', () => {
      const { fixture, host, q } = setup();
      expect(q('#lazy')).toBeNull();

      host.open.set(true);
      fixture.detectChanges();
      expect(q('#lazy')).not.toBeNull();

      host.open.set(false);
      fixture.detectChanges();
      expect(q('#lazy')).not.toBeNull();
    });

    it('creates the lazy template up front with forceMount', () => {
      const { fixture, host, q } = setup();
      host.forceMount.set(true);
      fixture.detectChanges();
      expect(q('#lazy')).not.toBeNull();
    });

    it('destroys the lazy template after closing with unmountOnClose', () => {
      const { fixture, host, q } = setup();
      host.unmountOnClose.set(true);
      host.open.set(true);
      fixture.detectChanges();
      expect(q('#lazy')).not.toBeNull();

      host.open.set(false);
      fixture.detectChanges();
      expect(q('#lazy')).toBeNull();
    });

    it('is not animating without a transition (no layout flicker in instant mode)', () => {
      const { fixture, host, q } = setup();
      host.open.set(true);
      fixture.detectChanges();
      expect(
        q('andes-collapsible-content').hasAttribute('data-animating'),
      ).toBe(false);
    });
  });
});

describe('collapsible stylesheet contract', () => {
  const content = readFileSync(
    'packages/ui/src/lib/collapsible/collapsible-content.css',
    'utf8',
  );

  it('animates a grid row between 0fr and 1fr', () => {
    expect(content).toContain('grid-template-rows: 0fr');
    expect(content).toContain('grid-template-rows: 1fr');
    expect(content).toMatch(/transition:\s*grid-template-rows/);
  });

  it('uses the 200ms slow motion token and no bounce easing', () => {
    expect(content).toContain('--andes-motion-duration-slow, 200ms');
    expect(content).not.toMatch(/cubic-bezier\([^)]*(1\.\d|-\d)/);
  });

  it('hides a collapsed region after the collapse has played', () => {
    expect(content).toContain('visibility 0s linear var(--_duration)');
    expect(content).toContain('visibility: hidden');
  });

  it('removes transitions under reduced motion', () => {
    const reduced = content.slice(content.indexOf('prefers-reduced-motion'));
    expect(reduced).toContain('transition: none');
  });

  it('only clips overflow while animating or closed', () => {
    expect(content).toContain("[data-state='open']:not([data-animating])");
    expect(content).toContain('overflow: visible');
  });
});
