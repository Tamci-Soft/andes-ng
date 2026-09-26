import { readdirSync, readFileSync } from 'node:fs';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesAccordion,
  type AndesAccordionCollapsible,
  type AndesAccordionExpandIconPosition,
  type AndesAccordionItemConfig,
  type AndesAccordionSize,
  AndesAccordionType,
} from './accordion';
import { AndesAccordionContent } from './accordion-content';
import { AndesAccordionItem } from './accordion-item';
import { AndesAccordionLazy } from './accordion-lazy';
import { AndesAccordionTrigger } from './accordion-trigger';

@Component({
  imports: [
    AndesAccordion,
    AndesAccordionItem,
    AndesAccordionTrigger,
    AndesAccordionContent,
  ],
  template: `<andes-accordion [type]="type()" [disabled]="disabled()">
    <andes-accordion-item value="a" [disabled]="itemADisabled()">
      <andes-accordion-trigger>Section A</andes-accordion-trigger>
      <andes-accordion-content>Content A</andes-accordion-content>
    </andes-accordion-item>
    <andes-accordion-item value="b">
      <andes-accordion-trigger>Section B</andes-accordion-trigger>
      <andes-accordion-content>Content B</andes-accordion-content>
    </andes-accordion-item>
    <andes-accordion-item value="c">
      <andes-accordion-trigger>Section C</andes-accordion-trigger>
      <andes-accordion-content>Content C</andes-accordion-content>
    </andes-accordion-item>
  </andes-accordion>`,
})
class HostComponent {
  readonly type = signal<AndesAccordionType>('single');
  readonly disabled = signal(false);
  readonly itemADisabled = signal(false);
}

describe('AndesAccordion / AndesAccordionItem / AndesAccordionTrigger / AndesAccordionContent', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const items = Array.from(
      fixture.nativeElement.querySelectorAll('andes-accordion-item'),
    ) as HTMLElement[];
    const triggers = Array.from(
      fixture.nativeElement.querySelectorAll('andes-accordion-trigger button'),
    ) as HTMLButtonElement[];
    const panels = Array.from(
      fixture.nativeElement.querySelectorAll('andes-accordion-content'),
    ) as HTMLElement[];
    return { fixture, items, triggers, panels };
  }

  it('renders one item per andes-accordion-item, all closed by default', () => {
    const { triggers } = createHost();

    expect(triggers).toHaveLength(3);
    expect(
      triggers.every((t) => t.getAttribute('aria-expanded') === 'false'),
    ).toBe(true);
  });

  describe('single mode', () => {
    it('opens a panel when its trigger is clicked', () => {
      const { fixture, triggers, panels } = createHost();

      triggers[0].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('true');
      expect(panels[0].getAttribute('data-state')).toBe('open');
    });

    it('closes the previously-open panel when a new one opens', () => {
      const { fixture, triggers, panels } = createHost();

      triggers[0].click();
      fixture.detectChanges();
      triggers[1].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
      expect(panels[0].getAttribute('data-state')).toBe('closed');
      expect(triggers[1].getAttribute('aria-expanded')).toBe('true');
      expect(panels[1].getAttribute('data-state')).toBe('open');
    });

    it('closes the open panel when its own trigger is clicked again', () => {
      const { fixture, triggers } = createHost();

      triggers[0].click();
      fixture.detectChanges();
      triggers[0].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('multiple mode', () => {
    it('allows several panels open at once', () => {
      const { fixture, triggers } = createHost();
      fixture.componentInstance.type.set('multiple');
      fixture.detectChanges();

      triggers[0].click();
      fixture.detectChanges();
      triggers[1].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('true');
      expect(triggers[1].getAttribute('aria-expanded')).toBe('true');
    });

    it('closes only the toggled panel, leaving others open', () => {
      const { fixture, triggers } = createHost();
      fixture.componentInstance.type.set('multiple');
      fixture.detectChanges();

      triggers[0].click();
      fixture.detectChanges();
      triggers[1].click();
      fixture.detectChanges();
      triggers[0].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
      expect(triggers[1].getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('disabled', () => {
    it('cannot toggle a disabled item', () => {
      const { fixture, triggers } = createHost();
      fixture.componentInstance.itemADisabled.set(true);
      fixture.detectChanges();

      expect(triggers[0].disabled).toBe(true);
      triggers[0].click();
      fixture.detectChanges();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
    });

    it('disables every item when the whole accordion is disabled', () => {
      const { fixture, triggers } = createHost();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      expect(triggers.every((t) => t.disabled)).toBe(true);
    });

    it('cannot toggle any item when the whole accordion is disabled', () => {
      const { fixture, triggers } = createHost();
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();

      triggers[1].click();
      fixture.detectChanges();

      expect(triggers[1].getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('accessibility wiring', () => {
    it('sets aria-expanded on the trigger reflecting open state', () => {
      const { fixture, triggers } = createHost();

      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
      triggers[0].click();
      fixture.detectChanges();
      expect(triggers[0].getAttribute('aria-expanded')).toBe('true');
    });

    it('gives the content panel role="region"', () => {
      const { panels } = createHost();

      expect(panels[0].getAttribute('role')).toBe('region');
    });

    it('cross-links aria-controls on the trigger with the panel id', () => {
      const { triggers, panels } = createHost();

      const controlsId = triggers[0].getAttribute('aria-controls');
      expect(controlsId).toBeTruthy();
      expect(panels[0].getAttribute('id')).toBe(controlsId);
    });

    it('cross-links aria-labelledby on the panel with the trigger id', () => {
      const { triggers, panels } = createHost();

      const labelledBy = panels[0].getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(triggers[0].getAttribute('id')).toBe(labelledBy);
    });

    it('gives independent accordion instances their own isolated ids', () => {
      const first = createHost();
      const second = createHost();

      expect(first.triggers[0].id).not.toBe(second.triggers[0].id);
    });
  });

  describe('collapsed/expanded visual state (regression)', () => {
    // These two bugs were both invisible to the existing suite: every assertion above checks
    // `aria-expanded`/`data-state`, and both were always correct - what was broken was the CSS
    // those attributes are supposed to drive. The tests below therefore assert against the
    // *compiled, cascaded* styles rather than the attributes.
    //
    // Note on the environment: this suite runs in jsdom, which does apply component stylesheets
    // and resolve the cascade (so `getComputedStyle` and selector matching are real), but does
    // no layout at all - `offsetHeight`/`getBoundingClientRect()` are always 0. Anything that
    // needs real layout is asserted here via the structural invariant that produced the bug
    // instead, and was additionally verified by hand in a live Storybook.

    it('rotates the trigger chevron only while the item is expanded', () => {
      const { fixture, triggers } = createHost();
      const icon = fixture.nativeElement.querySelector(
        '.andes-accordion-trigger__icon',
      ) as SVGElement;

      // Collapsed: no rotation at all.
      const collapsed = getComputedStyle(icon).transform;
      expect(collapsed === '' || collapsed === 'none').toBe(true);

      triggers[0].click();
      fixture.detectChanges();

      // Expanded: a real 180deg rotation. jsdom reports the declared value, a real browser
      // reports the resolved matrix - accept either so this holds if the suite is ever run
      // with `--browsers`.
      const expanded = getComputedStyle(icon).transform;
      expect(expanded).not.toBe('');
      expect(expanded).not.toBe('none');
      expect(expanded).toMatch(/rotate\(180deg\)|matrix\(-1,\s*0,\s*0,\s*-1/);
    });

    it('keeps every accordion CSS selector on a single line', () => {
      // Angular's emulated-encapsulation shim (ShadowCss) appends the `_ngcontent-*` scope
      // attribute per compound selector by walking the selector text, and treats a newline
      // inside a descendant-combinator chain as the separator it emits the attribute *after*.
      // A selector split across lines therefore compiles to
      // `button[aria-expanded="true"]\n[_ngcontent-x]   .icon[_ngcontent-x]`: the first compound
      // loses its scope attribute and the lone `[_ngcontent-x]` becomes its own descendant step,
      // matching no element, so the rule silently never applies. That is exactly how the chevron
      // rotation was lost.
      //
      // This has to be asserted against the CSS *source*, not the cascade: only pipelines that
      // shim raw source hit it (Storybook's webpack build, where the broken chevron was found).
      // `nx test` and `nx build` both minify the newline away before shimming, so the rule
      // compiles correctly here regardless - a runtime assertion would pass either way and guard
      // nothing.
      const dir = 'packages/ui/src/lib/accordion';
      const offenders: string[] = [];

      for (const file of readdirSync(dir).filter((f) => f.endsWith('.css'))) {
        const source = readFileSync(`${dir}/${file}`, 'utf8').replace(
          /\/\*[\s\S]*?\*\//g,
          '',
        );
        for (const match of source.matchAll(/(?:^|\})([^{}]*)\{/g)) {
          // Breaking a selector *list* after a comma is fine - the shim scopes each part
          // separately. It's a combinator chain broken mid-part that mis-compiles.
          for (const part of match[1].trim().split(',')) {
            if (part.trim().includes('\n')) {
              offenders.push(`${file}: ${part.trim().replace(/\s+/g, ' ')}`);
            }
          }
        }
      }

      expect(offenders).toEqual([]);
    });

    it('collapses a closed panel to a zero-height track and expands an open one', () => {
      const { fixture, triggers, panels } = createHost();

      expect(getComputedStyle(panels[0]).gridTemplateRows).toBe('0fr');

      triggers[0].click();
      fixture.detectChanges();

      expect(getComputedStyle(panels[0]).gridTemplateRows).toBe('1fr');
    });

    it('keeps the collapsing grid item a pure clipping box so a closed panel paints nothing', () => {
      // `overflow: hidden` clips to the PADDING box, not the content box. Any padding on the
      // element that collapses therefore survives the collapse as a band of still-painted
      // content: with `padding-bottom: var(--andes-space-4)` here, a closed panel kept a
      // 16px-tall padding box and the first 16px of its text stayed plainly readable on screen
      // even though `data-state="closed"` and `inert` were both correctly applied. The panel's
      // breathing room must live on an inner, non-clipping box instead.
      const { panels } = createHost();
      const inner = panels[0].querySelector(
        '.andes-accordion-content__inner',
      ) as HTMLElement;
      const body = panels[0].querySelector(
        '.andes-accordion-content__body',
      ) as HTMLElement;

      expect(inner).toBeTruthy();
      expect(body).toBeTruthy();
      // The padded box must sit *inside* the clipping box, so the clip contains it.
      expect(inner.contains(body)).toBe(true);

      const innerStyle = getComputedStyle(inner);
      expect(innerStyle.overflow).toBe('hidden');

      // No padding of any kind on the clipping box - this is the invariant that broke.
      for (const side of [
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
      ] as const) {
        const value = innerStyle[side];
        expect(value === '' || value === '0px').toBe(true);
      }

      // ...while the breathing room is still applied, one level in.
      expect(getComputedStyle(body).paddingBottom).not.toBe('');
    });
  });

  describe('keyboard behavior (no roving tabindex/arrow-key navigation)', () => {
    // Base UI's own docs (the primitive backing shadcn's Accordion) explicitly state that
    // roving-tabindex/arrow-key navigation between headers was deprecated for Accordion,
    // unlike Tabs, which still uses it. Every trigger below is therefore a normal, independently
    // focusable <button> - this suite is a regression guard against ever copying the Tabs
    // roving-tabindex pattern onto this component "for consistency".

    it('keeps every trigger at the default tabindex (no roving tabindex management)', () => {
      const { triggers } = createHost();

      triggers.forEach((trigger) => {
        expect(trigger.hasAttribute('tabindex')).toBe(false);
      });
    });

    it('does nothing special on ArrowDown/ArrowUp - no focus is moved between triggers', () => {
      const { fixture, triggers } = createHost();
      triggers[0].focus();
      expect(document.activeElement).toBe(triggers[0]);

      triggers[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      fixture.detectChanges();

      // Focus stays put and no item toggles open as a side effect of the arrow key.
      expect(document.activeElement).toBe(triggers[0]);
      expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
      expect(triggers[1].getAttribute('aria-expanded')).toBe('false');
    });

    it('moves focus between triggers via native Tab order, not arrow keys', () => {
      const { triggers } = createHost();

      // Native tab order between plain, independently-focusable buttons is exactly what
      // jsdom/the DOM already gives every element with no tabindex management needed on our
      // part - asserting that manually here would just be re-testing the browser. What this
      // component must not do is intercept Tab/Shift+Tab or manage tabindex itself, which the
      // absence of any keydown handling and of a `tabindex` attribute above already confirms.
      triggers[0].focus();
      expect(document.activeElement).toBe(triggers[0]);
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Ant Design Collapse parity
// ---------------------------------------------------------------------------------------------

@Component({
  imports: [
    AndesAccordion,
    AndesAccordionItem,
    AndesAccordionTrigger,
    AndesAccordionContent,
    AndesAccordionLazy,
  ],
  template: `<andes-accordion
    [type]="type()"
    [(activeKey)]="activeKey"
    (activeKeyChange)="changes.push($event)"
    [bordered]="bordered()"
    [ghost]="ghost()"
    [size]="size()"
    [collapsible]="collapsible()"
    [expandIcon]="useCustomIcon() ? customIcon : undefined"
    [expandIconPosition]="iconPosition()"
    [destroyOnHidden]="destroyOnHidden()"
    [arrowNavigation]="arrowNavigation()"
  >
    <ng-template #customIcon let-active let-value="value">
      <span class="custom-icon"
        >{{ value }}:{{ active ? 'open' : 'closed' }}</span
      >
    </ng-template>
    <andes-accordion-item
      value="a"
      [collapsible]="itemACollapsible()"
      [showArrow]="itemAShowArrow()"
    >
      <andes-accordion-trigger>
        Section A
        <button type="button" class="extra-action" andesAccordionExtra>
          Edit
        </button>
      </andes-accordion-trigger>
      <andes-accordion-content>
        Eager A
        <ng-template andesAccordionLazy
          ><span class="lazy-a">Lazy A</span></ng-template
        >
      </andes-accordion-content>
    </andes-accordion-item>
    <andes-accordion-item value="b" [forceRender]="itemBForceRender()">
      <andes-accordion-trigger extra="3 files"
        >Section B</andes-accordion-trigger
      >
      <andes-accordion-content>
        <ng-template andesAccordionLazy
          ><span class="lazy-b">Lazy B</span></ng-template
        >
      </andes-accordion-content>
    </andes-accordion-item>
    <andes-accordion-item value="c" [disabled]="itemCDisabled()">
      <andes-accordion-trigger>Section C</andes-accordion-trigger>
      <andes-accordion-content>Content C</andes-accordion-content>
    </andes-accordion-item>
    <andes-accordion-item value="d">
      <andes-accordion-trigger>Section D</andes-accordion-trigger>
      <andes-accordion-content>Content D</andes-accordion-content>
    </andes-accordion-item>
  </andes-accordion>`,
})
class FeatureHostComponent {
  readonly type = signal<AndesAccordionType>('multiple');
  readonly activeKey = signal<string[]>([]);
  readonly changes: string[][] = [];
  readonly bordered = signal(false);
  readonly ghost = signal(false);
  readonly size = signal<AndesAccordionSize>('md');
  readonly collapsible = signal<AndesAccordionCollapsible | undefined>(
    undefined,
  );
  readonly useCustomIcon = signal(false);
  readonly iconPosition = signal<AndesAccordionExpandIconPosition>('end');
  readonly destroyOnHidden = signal(false);
  readonly arrowNavigation = signal(false);
  readonly itemACollapsible = signal<AndesAccordionCollapsible | undefined>(
    undefined,
  );
  readonly itemAShowArrow = signal(true);
  readonly itemBForceRender = signal(false);
  readonly itemCDisabled = signal(false);
}

@Component({
  imports: [AndesAccordion],
  template: `<andes-accordion
    type="multiple"
    [items]="items()"
    [(activeKey)]="activeKey"
  />`,
})
class ItemsHostComponent {
  readonly activeKey = signal<string[]>([]);
  readonly items = signal<AndesAccordionItemConfig[]>([
    { key: 'one', label: 'First', content: 'First body', extra: 'Extra one' },
    { key: 'two', label: 'Second', content: 'Second body', disabled: true },
    {
      key: 'three',
      label: 'Third',
      content: 'Third body',
      forceRender: true,
      showArrow: false,
    },
  ]);
}

@Component({
  imports: [AndesAccordion],
  template: `<ng-template #label
      ><strong class="rich-label">Rich</strong></ng-template
    >
    <ng-template #body><em class="rich-body">Body</em></ng-template>
    <ng-template #extra
      ><button type="button" class="rich-extra">More</button></ng-template
    >
    <andes-accordion
      [items]="[
        {
          key: 'x',
          label: label,
          content: body,
          extra: extra,
          forceRender: true,
        },
      ]"
    />`,
})
class TemplateItemsHostComponent {}

describe('AndesAccordion - Ant Design Collapse parity', () => {
  function createFeatureHost(setup?: (host: FeatureHostComponent) => void) {
    const fixture = TestBed.createComponent(FeatureHostComponent);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector(
      'andes-accordion',
    ) as HTMLElement;
    const items = () =>
      Array.from(
        root.querySelectorAll('andes-accordion-item'),
      ) as HTMLElement[];
    const headers = () =>
      Array.from(
        root.querySelectorAll('.andes-accordion-trigger__header'),
      ) as HTMLElement[];
    const buttons = () =>
      Array.from(
        root.querySelectorAll(
          '.andes-accordion-trigger__button, .andes-accordion-trigger__icon-button',
        ),
      ) as HTMLButtonElement[];
    const panels = () =>
      Array.from(
        root.querySelectorAll('andes-accordion-content'),
      ) as HTMLElement[];
    const click = (el: Element) => {
      (el as HTMLElement).click();
      fixture.detectChanges();
    };
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      items,
      headers,
      buttons,
      panels,
      click,
    };
  }

  describe('activeKey (two-way) and activeKeyChange', () => {
    it('opens the panels whose values are bound into activeKey', () => {
      const { panels } = createFeatureHost((h) => h.activeKey.set(['b', 'd']));

      expect(panels().map((p) => p.getAttribute('data-state'))).toEqual([
        'closed',
        'open',
        'closed',
        'open',
      ]);
    });

    it('reacts to the parent changing activeKey after init', () => {
      const { fixture, host, panels } = createFeatureHost();

      host.activeKey.set(['c']);
      fixture.detectChanges();

      expect(panels()[2].getAttribute('data-state')).toBe('open');
    });

    it('writes user toggles back into the bound activeKey', () => {
      const { host, buttons, click } = createFeatureHost();

      click(buttons()[0]);
      click(buttons()[3]);
      expect(host.activeKey()).toEqual(['a', 'd']);

      click(buttons()[0]);
      expect(host.activeKey()).toEqual(['d']);
    });

    it('emits activeKeyChange with the full key list on user toggles only', () => {
      const { fixture, host, buttons, click } = createFeatureHost();

      host.activeKey.set(['b']);
      fixture.detectChanges();
      expect(host.changes).toEqual([]);

      click(buttons()[0]);
      expect(host.changes).toEqual([['b', 'a']]);
    });

    it('honors only the first key in single mode', () => {
      const { panels, buttons, host, click } = createFeatureHost((h) => {
        h.type.set('single');
        h.activeKey.set(['b', 'd']);
      });

      expect(panels()[1].getAttribute('data-state')).toBe('open');
      expect(panels()[3].getAttribute('data-state')).toBe('closed');

      click(buttons()[0]);
      expect(host.activeKey()).toEqual(['a']);
    });
  });

  describe('bordered / ghost / size', () => {
    it('is divider-only by default', () => {
      const { root, items } = createFeatureHost();

      expect(root.getAttribute('data-variant')).toBe('default');
      expect(getComputedStyle(root).overflow).not.toBe('hidden');
      expect(items()[0].getAttribute('data-variant')).toBe('default');
      expect(getComputedStyle(items()[0]).borderBottomStyle).not.toBe('none');
    });

    it('renders an outlined, rounded block with tinted headers when bordered', () => {
      const { root, headers, panels } = createFeatureHost((h) =>
        h.bordered.set(true),
      );

      expect(root.getAttribute('data-variant')).toBe('bordered');
      const rootStyle = getComputedStyle(root);
      // (jsdom can't resolve a `border` shorthand holding var(), so the outline itself was
      // verified in a live Storybook; radius + clipping are the computable half.)
      expect(rootStyle.borderRadius).toContain('var(--andes-radius-lg)');
      expect(rootStyle.overflow).toBe('hidden');
      expect(getComputedStyle(headers()[0]).backgroundColor).toContain(
        'var(--andes-color-muted)',
      );
      const body = panels()[0].querySelector(
        '.andes-accordion-content__body',
      ) as HTMLElement;
      expect(body.getAttribute('data-variant')).toBe('bordered');
      expect(getComputedStyle(body).getPropertyValue('padding')).toBe(
        'var(--andes-space-4)',
      );
    });

    it('drops every divider in ghost mode, even with bordered set', () => {
      const { root, items } = createFeatureHost((h) => {
        h.bordered.set(true);
        h.ghost.set(true);
      });

      expect(root.getAttribute('data-variant')).toBe('ghost');
      expect(getComputedStyle(root).overflow).not.toBe('hidden');
      for (const item of items()) {
        expect(getComputedStyle(item).borderBottomStyle).toBe('none');
      }
    });

    it.each([
      ['sm', 'var(--andes-space-2)', '0.875rem'],
      ['md', 'var(--andes-space-4)', '1rem'],
      ['lg', 'var(--andes-space-5)', '1.125rem'],
    ] as const)(
      'applies the %s header padding and font size',
      (size, padding, fontSize) => {
        const { headers } = createFeatureHost((h) => h.size.set(size));
        const style = getComputedStyle(headers()[0]);

        expect(headers()[0].getAttribute('data-size')).toBe(size);
        expect(style.getPropertyValue('padding-block')).toBe(padding);
        expect(style.fontSize).toBe(fontSize);
      },
    );
  });

  describe('expandIcon / expandIconPosition / showArrow', () => {
    it('renders a custom expand icon template with isActive and value', () => {
      const { root, buttons, click } = createFeatureHost((h) =>
        h.useCustomIcon.set(true),
      );
      const icon = () => root.querySelector('.custom-icon') as HTMLElement;

      expect(
        root.querySelector('svg.andes-accordion-trigger__icon'),
      ).toBeNull();
      expect(icon().textContent).toBe('a:closed');

      click(buttons()[0]);
      expect(icon().textContent).toBe('a:open');
    });

    it('places the icon after the text by default and before it with position "start"', () => {
      const order = (button: HTMLElement) =>
        Array.from(button.children).map((c) =>
          c.classList.contains('andes-accordion-trigger__text')
            ? 'text'
            : 'icon',
        );

      const end = createFeatureHost();
      expect(order(end.buttons()[0])).toEqual(['text', 'icon']);

      const start = createFeatureHost((h) => h.iconPosition.set('start'));
      expect(order(start.buttons()[0])).toEqual(['icon', 'text']);
    });

    it('hides the arrow of an item with showArrow=false', () => {
      const { headers } = createFeatureHost((h) => h.itemAShowArrow.set(false));

      expect(
        headers()[0].querySelector('.andes-accordion-trigger__icon'),
      ).toBeNull();
      expect(
        headers()[1].querySelector('.andes-accordion-trigger__icon'),
      ).not.toBeNull();
    });
  });

  describe('collapsible', () => {
    it('makes the whole row the button by default', () => {
      const { buttons } = createFeatureHost();

      // `data-collapsible="full"` is what stretches the button's ::after over the row (jsdom
      // can't compute pseudo-element styles - verified in a live Storybook instead).
      expect(buttons()[0].getAttribute('data-collapsible')).toBe('full');
      expect(
        buttons()[0].querySelector('.andes-accordion-trigger__icon'),
      ).not.toBeNull();
    });

    it('"header": only the text (and the icon) toggle, not the rest of the row', () => {
      const { root, host, headers, buttons, click } = createFeatureHost((h) =>
        h.collapsible.set('header'),
      );
      const button = buttons()[0];

      expect(button.getAttribute('data-collapsible')).toBe('header');
      // The icon lives outside the (shrunk) text button...
      expect(button.querySelector('.andes-accordion-trigger__icon')).toBeNull();

      click(headers()[0]);
      expect(host.activeKey()).toEqual([]);

      click(button);
      expect(host.activeKey()).toEqual(['a']);

      click(
        root.querySelector('.andes-accordion-trigger__icon-toggle') as Element,
      );
      expect(host.activeKey()).toEqual([]);
    });

    it('"icon": only the icon is a button, named by the header text', () => {
      const { host, headers, click } = createFeatureHost((h) =>
        h.collapsible.set('icon'),
      );
      const header = headers()[0];
      const iconButton = header.querySelector(
        '.andes-accordion-trigger__icon-button',
      ) as HTMLButtonElement;
      const text = header.querySelector(
        '.andes-accordion-trigger__text',
      ) as HTMLElement;

      expect(
        header.querySelector('.andes-accordion-trigger__button'),
      ).toBeNull();
      expect(iconButton.getAttribute('aria-labelledby')).toBe(text.id);
      expect(text.textContent).toContain('Section A');
      expect(iconButton.getAttribute('aria-controls')).toBeTruthy();

      click(text);
      expect(host.activeKey()).toEqual([]);

      click(iconButton);
      expect(host.activeKey()).toEqual(['a']);
      expect(iconButton.getAttribute('aria-expanded')).toBe('true');
    });

    it('"icon" without an arrow falls back to "header" so the panel stays operable', () => {
      const { buttons } = createFeatureHost((h) => {
        h.collapsible.set('icon');
        h.itemAShowArrow.set(false);
      });

      expect(buttons()[0].getAttribute('data-collapsible')).toBe('header');
      expect(buttons()[0].textContent).toContain('Section A');
    });

    it('"disabled": the trigger cannot be toggled', () => {
      const { host, buttons, click } = createFeatureHost((h) =>
        h.collapsible.set('disabled'),
      );

      expect(buttons().every((b) => b.disabled)).toBe(true);
      click(buttons()[0]);
      expect(host.activeKey()).toEqual([]);
    });

    it('lets an item override the root collapsible', () => {
      const { buttons } = createFeatureHost((h) => {
        h.collapsible.set('header');
        h.itemACollapsible.set('disabled');
      });

      expect(buttons()[0].disabled).toBe(true);
      expect(buttons()[1].getAttribute('data-collapsible')).toBe('header');
      expect(buttons()[1].disabled).toBe(false);
    });
  });

  describe('extra', () => {
    it('renders projected [andesAccordionExtra] content outside the heading and the button', () => {
      const { host, headers, click } = createFeatureHost();
      const extra = headers()[0].querySelector('.extra-action') as HTMLElement;

      expect(extra.closest('.andes-accordion-trigger__extra')).toBeTruthy();
      expect(extra.closest('h3')).toBeNull();
      expect(extra.closest('.andes-accordion-trigger__button')).toBeNull();

      click(extra);
      expect(host.activeKey()).toEqual([]);
    });

    it('sits above the stretched row button so clicks reach it', () => {
      const { headers } = createFeatureHost();
      const slot = headers()[0].querySelector(
        '.andes-accordion-trigger__extra',
      ) as HTMLElement;

      expect(getComputedStyle(slot).position).toBe('relative');
      expect(getComputedStyle(slot).zIndex).toBe('1');
    });

    it('renders the trigger extra input', () => {
      const { headers } = createFeatureHost();

      expect(
        headers()[1].querySelector('.andes-accordion-trigger__extra')
          ?.textContent,
      ).toContain('3 files');
    });
  });

  describe('lazy content, forceRender and destroyOnHidden', () => {
    it('always renders projected content, but a lazy template only once opened', () => {
      const { root, buttons, click } = createFeatureHost();

      expect(root.textContent).toContain('Eager A');
      expect(root.querySelector('.lazy-a')).toBeNull();

      click(buttons()[0]);
      expect(root.querySelector('.lazy-a')).not.toBeNull();
    });

    it('keeps a lazy body rendered after closing by default', () => {
      const { root, buttons, click } = createFeatureHost();

      click(buttons()[0]);
      click(buttons()[0]);
      expect(root.querySelector('.lazy-a')).not.toBeNull();
    });

    it('renders a lazy body up front with forceRender', () => {
      const { root } = createFeatureHost((h) => h.itemBForceRender.set(true));

      expect(root.querySelector('.lazy-b')).not.toBeNull();
      expect(root.querySelector('.lazy-a')).toBeNull();
    });

    it('destroys a lazy body once its collapse transition ends with destroyOnHidden', () => {
      const { fixture, root, panels, buttons, click } = createFeatureHost((h) =>
        h.destroyOnHidden.set(true),
      );

      click(buttons()[0]);
      expect(root.querySelector('.lazy-a')).not.toBeNull();

      click(buttons()[0]);
      // Still there while the panel animates closed...
      expect(root.querySelector('.lazy-a')).not.toBeNull();

      // ...a transition bubbling up from the body's own content doesn't count...
      root
        .querySelector('.lazy-a')
        ?.dispatchEvent(new Event('transitionend', { bubbles: true }));
      fixture.detectChanges();
      expect(root.querySelector('.lazy-a')).not.toBeNull();

      // ...the panel's own collapse finishing does.
      panels()[0].dispatchEvent(new Event('transitionend', { bubbles: true }));
      fixture.detectChanges();
      expect(root.querySelector('.lazy-a')).toBeNull();
    });

    it('destroys a lazy body even if no transitionend ever fires', async () => {
      const { fixture, root, buttons, click } = createFeatureHost((h) =>
        h.destroyOnHidden.set(true),
      );

      click(buttons()[0]);
      click(buttons()[0]);
      await new Promise((resolve) => setTimeout(resolve, 350));
      fixture.detectChanges();

      expect(root.querySelector('.lazy-a')).toBeNull();
    });

    it('lets destroyOnHidden win over forceRender while closed', () => {
      const { root } = createFeatureHost((h) => {
        h.itemBForceRender.set(true);
        h.destroyOnHidden.set(true);
      });

      expect(root.querySelector('.lazy-b')).toBeNull();
    });
  });

  describe('arrowNavigation (opt-in)', () => {
    function press(target: HTMLElement, key: string) {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(event);
      return event;
    }

    it('moves focus with ArrowDown/ArrowUp (wrapping) and Home/End, skipping disabled triggers', () => {
      const { fixture, buttons } = createFeatureHost((h) => {
        h.arrowNavigation.set(true);
        h.itemCDisabled.set(true);
      });
      const [a, b, , d] = buttons();
      fixture.detectChanges();

      a.focus();
      const event = press(a, 'ArrowDown');
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(b);

      press(b, 'ArrowDown');
      expect(document.activeElement).toBe(d);

      press(d, 'ArrowDown');
      expect(document.activeElement).toBe(a);

      press(a, 'ArrowUp');
      expect(document.activeElement).toBe(d);

      press(d, 'Home');
      expect(document.activeElement).toBe(a);

      press(a, 'End');
      expect(document.activeElement).toBe(d);
    });

    it('never manages tabindex, even when enabled', () => {
      const { buttons } = createFeatureHost((h) => h.arrowNavigation.set(true));

      expect(buttons().some((b) => b.hasAttribute('tabindex'))).toBe(false);
    });

    it('leaves arrow keys alone when disabled (the default)', () => {
      const { buttons } = createFeatureHost();
      const [a] = buttons();

      a.focus();
      const event = press(a, 'ArrowDown');
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(a);
    });
  });

  describe('items input', () => {
    function createItemsHost() {
      const fixture = TestBed.createComponent(ItemsHostComponent);
      fixture.detectChanges();
      const root = fixture.nativeElement.querySelector(
        'andes-accordion',
      ) as HTMLElement;
      return { fixture, root };
    }

    it('renders one item per config entry with its label and extra', () => {
      const { root } = createItemsHost();
      const triggers = Array.from(
        root.querySelectorAll('andes-accordion-trigger'),
      ) as HTMLElement[];

      expect(triggers).toHaveLength(3);
      expect(
        triggers[0].querySelector('.andes-accordion-trigger__text')
          ?.textContent,
      ).toContain('First');
      expect(
        triggers[0].querySelector('.andes-accordion-trigger__extra')
          ?.textContent,
      ).toContain('Extra one');
    });

    it('maps disabled, showArrow and forceRender, and renders content lazily', () => {
      const { root } = createItemsHost();
      const buttons = Array.from(
        root.querySelectorAll('.andes-accordion-trigger__button'),
      ) as HTMLButtonElement[];

      expect(buttons[1].disabled).toBe(true);
      expect(
        buttons[2].querySelector('.andes-accordion-trigger__icon'),
      ).toBeNull();
      expect(root.textContent).not.toContain('First body');
      expect(root.textContent).toContain('Third body');
    });

    it('opens items through the shared activeKey model', () => {
      const { fixture, root } = createItemsHost();
      const button = root.querySelector(
        '.andes-accordion-trigger__button',
      ) as HTMLButtonElement;

      button.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.activeKey()).toEqual(['one']);
      expect(root.textContent).toContain('First body');
    });

    it('accepts TemplateRef labels, content and extra', () => {
      const fixture = TestBed.createComponent(TemplateItemsHostComponent);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;

      expect(
        root.querySelector('.andes-accordion-trigger__button .rich-label'),
      ).not.toBeNull();
      expect(
        root.querySelector('.andes-accordion-trigger__extra .rich-extra'),
      ).not.toBeNull();
      expect(
        root.querySelector('.andes-accordion-content__body .rich-body'),
      ).not.toBeNull();
    });
  });
});
