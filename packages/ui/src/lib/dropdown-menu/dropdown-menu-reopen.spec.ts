import {
  ANDES_OVERLAY_CLOSING_ATTRIBUTE,
  ANDES_OVERLAY_PANE_CLASS,
} from '@andes-ng/primitives';
import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AndesDropdownButton } from './dropdown-button';
import { AndesDropdownMenu } from './dropdown-menu';
import { AndesDropdownMenuContent } from './dropdown-menu-content';
import { AndesDropdownMenuItem } from './dropdown-menu-item';
import { AndesDropdownMenuSub } from './dropdown-menu-sub';
import { AndesDropdownMenuSubContent } from './dropdown-menu-sub-content';
import { AndesDropdownMenuSubTrigger } from './dropdown-menu-sub-trigger';
import { AndesDropdownMenuTrigger } from './dropdown-menu-trigger';

/**
 * jsdom reports zero geometry for every element, which makes CDK's
 * `InteractivityChecker` treat them all as invisible and therefore untabbable - see
 * the identical helper in `dropdown-menu.spec.ts`.
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

/** A Web Animations `Animation` stand-in whose end the test decides. */
class FakeAnimation {
  playState: AnimationPlayState = 'running';
  readonly effect = { getComputedTiming: () => ({ endTime: 120 }) };
  readonly finished: Promise<FakeAnimation>;
  private resolveFinished!: () => void;

  constructor() {
    this.finished = new Promise((resolve) => {
      this.resolveFinished = () => resolve(this);
    });
  }

  finish(): void {
    this.playState = 'finished';
    this.resolveFinished();
  }
}

/**
 * jsdom has no animations, so without this every close is synchronous and the exit
 * path a browser takes is never exercised. Installs `getAnimations` so that a pane
 * marked closing reports one running exit animation - what the
 * `[data-andes-closing]` rule in `dropdown-menu.css` starts in a browser.
 */
function withExitAnimations() {
  const running: FakeAnimation[] = [];
  let byPane = new WeakMap<Element, FakeAnimation>();

  beforeEach(() => {
    running.length = 0;
    byPane = new WeakMap();
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      writable: true,
      value(this: Element) {
        if (
          !this.classList.contains(ANDES_OVERLAY_PANE_CLASS) ||
          !this.hasAttribute(ANDES_OVERLAY_CLOSING_ATTRIBUTE)
        ) {
          return [];
        }
        let animation = byPane.get(this);
        if (!animation) {
          animation = new FakeAnimation();
          byPane.set(this, animation);
          running.push(animation);
        }
        return [animation];
      },
    });
  });

  afterEach(() => {
    delete (Element.prototype as unknown as Record<string, unknown>)[
      'getAnimations'
    ];
  });

  return {
    /** Ends every exit animation started so far. */
    finishAll: () =>
      running.splice(0).forEach((animation) => animation.finish()),
  };
}

/** `ListKeyManager` reads the deprecated-but-universal `KeyboardEvent.keyCode`. */
function pressKey(target: EventTarget, key: 'Escape' | 'Tab' | 'ArrowRight') {
  const keyCode = { Escape: 27, Tab: 9, ArrowRight: 39 }[key];
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'keyCode', { get: () => keyCode });
  target.dispatchEvent(event);
}

const isClosing = (element: Element | null | undefined) =>
  !!element?.hasAttribute(ANDES_OVERLAY_CLOSING_ATTRIBUTE);

/**
 * Several menus in one document, as on a page of examples, each with its content
 * projected - the case where the same content element is reused by every open.
 */
@Component({
  imports: [
    AndesDropdownButton,
    AndesDropdownMenu,
    AndesDropdownMenuTrigger,
    AndesDropdownMenuContent,
    AndesDropdownMenuItem,
    AndesDropdownMenuSub,
    AndesDropdownMenuSubTrigger,
    AndesDropdownMenuSubContent,
  ],
  template: `
    <button type="button" id="outside">Outside</button>
    <andes-dropdown-menu #menuA>
      <button type="button" id="triggerA" andesDropdownMenuTrigger>A</button>
      <andes-dropdown-menu-content data-menu="contentA">
        <andes-dropdown-menu-item id="a1">One</andes-dropdown-menu-item>
        <andes-dropdown-menu-sub>
          <andes-dropdown-menu-sub-trigger id="subTriggerA"
            >More</andes-dropdown-menu-sub-trigger
          >
          <andes-dropdown-menu-sub-content data-menu="subContentA">
            <andes-dropdown-menu-item id="a2">Two</andes-dropdown-menu-item>
          </andes-dropdown-menu-sub-content>
        </andes-dropdown-menu-sub>
      </andes-dropdown-menu-content>
    </andes-dropdown-menu>
    <andes-dropdown-menu>
      <button type="button" id="triggerB" andesDropdownMenuTrigger>B</button>
      <andes-dropdown-menu-content data-menu="contentB">
        <andes-dropdown-menu-item id="b1">One</andes-dropdown-menu-item>
      </andes-dropdown-menu-content>
    </andes-dropdown-menu>
    <andes-dropdown-button id="buttonC">
      Save
      <andes-dropdown-menu-content data-menu="contentC">
        <andes-dropdown-menu-item id="c1">Save as…</andes-dropdown-menu-item>
      </andes-dropdown-menu-content>
    </andes-dropdown-button>
  `,
})
class ManyMenusHost {
  readonly menuA = viewChild.required<AndesDropdownMenu>('menuA');
}

describe('AndesDropdownMenu - opening again after a close', () => {
  withElementGeometry();
  const exits = withExitAnimations();

  let fixture: ComponentFixture<ManyMenusHost>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ManyMenusHost);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  async function settle() {
    fixture.detectChanges();
    await fixture.whenStable();
    // Deferred focus moves, and the exit animations' `finished` continuations.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  const byId = (id: string) =>
    ((fixture.nativeElement as HTMLElement).querySelector(`#${id}`) ??
      document.querySelector(`#${id}`)) as HTMLElement;
  /** The element carrying `aria-expanded` for a menu. */
  const expandedOf = (trigger: HTMLElement) =>
    trigger
      .closest('[andesdropdownmenutrigger]')
      ?.getAttribute('aria-expanded');
  /**
   * The content, if it is currently inside an attached pane. Looked up by
   * `data-menu`, since the overlay gives the content element its own `id`.
   */
  const shownContent = (name: string) =>
    document.querySelector<HTMLElement>(
      `.cdk-overlay-pane [data-menu="${name}"]`,
    );
  const caret = () =>
    byId('buttonC').querySelector<HTMLElement>(
      '[andesdropdownmenutrigger] button',
    ) as HTMLElement;

  /** Opens through the trigger and checks the panel is really there to use. */
  async function openWith(trigger: HTMLElement, menu: string) {
    trigger.click();
    await settle();
    expect(expandedOf(trigger)).toBe('true');
    const content = shownContent(menu);
    expect(content).not.toBeNull();
    // A leftover closing mark would replay the exit animation on the re-opened
    // panel, leaving it faded out and ignoring the pointer.
    expect(isClosing(content)).toBe(false);
    return content as HTMLElement;
  }

  /** Lets an animated close run to the end and checks it detached. */
  async function finishClose(trigger: HTMLElement, menu: string) {
    fixture.detectChanges();
    expect(expandedOf(trigger)).toBe('false');
    exits.finishAll();
    await settle();
    expect(shownContent(menu)).toBeNull();
  }

  const closePaths: readonly {
    readonly name: string;
    readonly close: () => void;
  }[] = [
    { name: 'an outside click', close: () => byId('outside').click() },
    {
      name: 'Escape',
      close: () => pressKey(document.activeElement ?? document.body, 'Escape'),
    },
    { name: 'selecting an item', close: () => byId('a1').click() },
    { name: 'clicking the trigger', close: () => byId('triggerA').click() },
    { name: 'Tab out', close: () => pressKey(byId('a1'), 'Tab') },
    {
      name: 'a programmatic close',
      close: () => fixture.componentInstance.menuA().close(),
    },
  ];

  for (const { name, close } of closePaths) {
    it(`opens usable every time after ${name}`, async () => {
      const trigger = byId('triggerA');
      let first: HTMLElement | null = null;
      for (let cycle = 0; cycle < 3; cycle++) {
        const content = await openWith(trigger, 'contentA');
        // Projected content: every open shows the very same element.
        first ??= content;
        expect(content).toBe(first);

        close();
        fixture.detectChanges();
        // The exit really is animated, so the reused element was marked.
        expect(isClosing(content)).toBe(true);
        await finishClose(trigger, 'contentA');
      }
    });
  }

  it('opens usable again when the trigger is clicked while the exit still runs', async () => {
    const trigger = byId('triggerA');
    await openWith(trigger, 'contentA');
    byId('outside').click();
    fixture.detectChanges();

    await openWith(trigger, 'contentA');
    exits.finishAll();
    await settle();
    expect(isClosing(shownContent('contentA'))).toBe(false);

    byId('outside').click();
    await finishClose(trigger, 'contentA');
    await openWith(trigger, 'contentA');
  });

  it('keeps every menu on the page usable while focus moves between them', async () => {
    const triggerA = byId('triggerA');
    const triggerB = byId('triggerB');
    for (let cycle = 0; cycle < 3; cycle++) {
      await openWith(triggerA, 'contentA');
      // Opening B is an outside click for A.
      await openWith(triggerB, 'contentB');
      expect(expandedOf(triggerA)).toBe('false');
      exits.finishAll();
      await settle();
      expect(shownContent('contentA')).toBeNull();

      await openWith(caret(), 'contentC');
      expect(expandedOf(triggerB)).toBe('false');
      exits.finishAll();
      await settle();

      pressKey(document.activeElement ?? document.body, 'Escape');
      await finishClose(caret(), 'contentC');
    }
  });

  it('opens a submenu usable every time', async () => {
    const trigger = byId('triggerA');
    await openWith(trigger, 'contentA');
    let first: HTMLElement | null = null;
    for (let cycle = 0; cycle < 3; cycle++) {
      byId('subTriggerA').focus();
      pressKey(byId('subTriggerA'), 'ArrowRight');
      await settle();
      const sub = shownContent('subContentA');
      expect(sub).not.toBeNull();
      expect(isClosing(sub)).toBe(false);
      first ??= sub;
      expect(sub).toBe(first);

      pressKey(document.activeElement ?? document.body, 'Escape');
      fixture.detectChanges();
      expect(isClosing(sub)).toBe(true);
      exits.finishAll();
      await settle();
      expect(shownContent('subContentA')).toBeNull();
      expect(shownContent('contentA')).not.toBeNull();
    }
  });
});
