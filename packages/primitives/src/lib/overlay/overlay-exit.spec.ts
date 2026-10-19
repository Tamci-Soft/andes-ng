import { Component, inject, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  andesOverlayPreset,
  ANDES_OVERLAY_CLOSING_ATTRIBUTE,
  ANDES_OVERLAY_EXIT_TIMEOUT_MS,
  ANDES_OVERLAY_PANE_CLASS,
  type AndesOverlayCloseReason,
  type AndesOverlayConfig,
} from './overlay-config';
import { AndesOverlayContentPrimitive } from './overlay-content-primitive';
import {
  AndesOverlayPrimitive,
  provideAndesOverlay,
} from './overlay-primitive';
import { AndesOverlayTriggerPrimitive } from './overlay-trigger-primitive';

/**
 * A stand-in for a Web Animations `Animation`: jsdom has no animation support at
 * all, so the test decides when (and whether) the exit animation finishes.
 */
class FakeAnimation {
  playState: AnimationPlayState = 'running';
  readonly effect = {
    getComputedTiming: () => ({ endTime: this.endTime }),
  };
  readonly finished: Promise<FakeAnimation>;
  private resolveFinished!: () => void;

  constructor(private readonly endTime = 120) {
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
 * jsdom reports zero geometry, which CDK's focus utilities read as "not
 * tabbable"; a nominal size lets the overlay move focus inside as it would in a
 * browser.
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

const isClosing = (element: Element | null | undefined) =>
  !!element?.hasAttribute(ANDES_OVERLAY_CLOSING_ATTRIBUTE);

/**
 * Installs `Element.prototype.getAnimations`, reporting the configured exit
 * animations only once the closing attribute is on the pane or backdrop — the
 * way a `[data-andes-closing]` style rule would start them in a browser.
 */
function withFakeAnimations() {
  const state = {
    pane: [] as FakeAnimation[],
    backdrop: [] as FakeAnimation[],
    calls: [] as { element: Element; options?: GetAnimationsOptions }[],
  };

  beforeEach(() => {
    state.pane = [];
    state.backdrop = [];
    state.calls = [];
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      writable: true,
      value(this: Element, options?: GetAnimationsOptions) {
        state.calls.push({ element: this, options });
        if (!isClosing(this)) {
          return [];
        }
        if (this.classList.contains(ANDES_OVERLAY_PANE_CLASS)) {
          return state.pane;
        }
        if (this.classList.contains('cdk-overlay-backdrop')) {
          return state.backdrop;
        }
        return [];
      },
    });
  });

  afterEach(() => {
    delete (Element.prototype as unknown as Record<string, unknown>)[
      'getAnimations'
    ];
  });

  return state;
}

/** Lets the `finished` promises' continuations run. */
const flushMicrotasks = () =>
  new Promise<void>((resolve) => setTimeout(resolve));

@Component({
  imports: [AndesOverlayTriggerPrimitive, AndesOverlayContentPrimitive],
  providers: [provideAndesOverlay()],
  template: `
    <button type="button" id="trigger" andesOverlayTrigger>Open</button>
    <button type="button" id="elsewhere">Elsewhere</button>
    <ng-template #content>
      <div andesOverlayContent class="panel" aria-label="Panel">
        <button type="button" id="first">First</button>
      </div>
      <span class="sibling">Sibling root</span>
    </ng-template>
    <ng-template #other>
      <div andesOverlayContent class="other">Other</div>
    </ng-template>
  `,
})
class ExitHost {
  readonly overlay = inject(AndesOverlayPrimitive);
  readonly content = viewChild.required<TemplateRef<unknown>>('content');
  readonly other = viewChild.required<TemplateRef<unknown>>('other');
}

/**
 * Renders its projected content as the overlay's content, the way Dropdown Menu does.
 * Projected nodes belong to the consumer's view, so the same element is moved into
 * every new pane instead of being created afresh on each open.
 */
@Component({
  selector: 'andes-test-projecting-overlay',
  providers: [provideAndesOverlay()],
  template: `<ng-template #content><ng-content /></ng-template>`,
})
class ProjectingOverlay {
  readonly overlay = inject(AndesOverlayPrimitive);
  readonly content = viewChild.required<TemplateRef<unknown>>('content');
}

@Component({
  imports: [ProjectingOverlay],
  template: `
    <andes-test-projecting-overlay>
      <div class="projected">Projected</div>
    </andes-test-projecting-overlay>
  `,
})
class ProjectedExitHost {
  readonly projecting = viewChild.required(ProjectingOverlay);
}

describe('AndesOverlayPrimitive exit animations', () => {
  withElementGeometry();

  async function createHost(config: Partial<AndesOverlayConfig> = {}) {
    const fixture = TestBed.createComponent(ExitHost);
    const overlay = fixture.componentInstance.overlay;
    overlay.configure(config);
    fixture.detectChanges();

    const reasons: AndesOverlayCloseReason[] = [];
    let openedCount = 0;
    overlay.closed.subscribe((reason) => reasons.push(reason));
    overlay.opened.subscribe(() => openedCount++);

    const trigger = (fixture.nativeElement as HTMLElement).querySelector(
      '#trigger',
    ) as HTMLElement;
    trigger.focus();
    overlay.open(fixture.componentInstance.content());
    fixture.detectChanges();
    await fixture.whenStable();

    const pane = overlay.panelElement() as HTMLElement;
    return {
      fixture,
      overlay,
      trigger,
      pane,
      reasons,
      openedCount: () => openedCount,
    };
  }

  function pressEscape() {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        keyCode: 27,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  describe('without animation support', () => {
    it('detaches synchronously and never sets the closing attribute', async () => {
      const { overlay, pane, reasons, trigger } = await createHost();
      const marked: boolean[] = [];
      new MutationObserver(() => marked.push(isClosing(pane))).observe(pane, {
        attributes: true,
      });

      overlay.close('escape-key');

      expect(pane.isConnected).toBe(false);
      expect(overlay.panelElement()).toBeNull();
      expect(reasons).toEqual(['escape-key']);
      expect(document.activeElement).toBe(trigger);
      await flushMicrotasks();
      expect(marked).not.toContain(true);
    });
  });

  describe('with animation support', () => {
    const animations = withFakeAnimations();

    it('detaches synchronously when the closing attribute starts no animation', async () => {
      const { overlay, pane, reasons } = await createHost();

      overlay.close();

      expect(pane.isConnected).toBe(false);
      expect(reasons).toEqual(['imperative']);
    });

    it('queries the whole pane subtree once the attribute is applied', async () => {
      const { overlay, pane } = await createHost();

      overlay.close();

      const paneCall = animations.calls.find((call) => call.element === pane);
      expect(paneCall?.options).toEqual({ subtree: true });
    });

    it('marks the pane and its direct element children, not deeper descendants', async () => {
      animations.pane = [new FakeAnimation()];
      const { overlay, pane } = await createHost();

      overlay.close();

      expect(isClosing(pane)).toBe(true);
      expect(isClosing(pane.querySelector('.panel'))).toBe(true);
      expect(isClosing(pane.querySelector('.sibling'))).toBe(true);
      expect(isClosing(pane.querySelector('#first'))).toBe(false);
      expect(pane.getAttribute(ANDES_OVERLAY_CLOSING_ATTRIBUTE)).toBe('');
      expect(pane.style.pointerEvents).toBe('none');
    });

    it('keeps the pane attached until the exit animation finishes', async () => {
      const exit = new FakeAnimation();
      animations.pane = [exit];
      const { fixture, overlay, pane, reasons, trigger } = await createHost(
        andesOverlayPreset('popover'),
      );
      expect(document.activeElement).not.toBe(trigger);

      overlay.close('outside-click');
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(false);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(pane.isConnected).toBe(true);
      expect(overlay.panelElement()).toBe(pane);
      expect(reasons).toEqual([]);
      expect(document.activeElement).not.toBe(trigger);

      await flushMicrotasks();
      expect(pane.isConnected).toBe(true);

      exit.finish();
      await flushMicrotasks();

      expect(pane.isConnected).toBe(false);
      expect(overlay.panelElement()).toBeNull();
      expect(reasons).toEqual(['outside-click']);
      expect(document.activeElement).toBe(trigger);
    });

    describe('focus after an animated close', () => {
      it('restores to the trigger when focus stayed inside the pane', async () => {
        const exit = new FakeAnimation();
        animations.pane = [exit];
        const { fixture, overlay, pane, trigger, reasons } = await createHost(
          andesOverlayPreset('popover'),
        );
        expect(pane.contains(document.activeElement)).toBe(true);

        pressEscape();
        fixture.detectChanges();
        expect(overlay.isOpen()).toBe(false);
        exit.finish();
        await flushMicrotasks();

        expect(reasons).toEqual(['escape-key']);
        expect(document.activeElement).toBe(trigger);
      });

      it('restores to the trigger when focus fell back to the body', async () => {
        const exit = new FakeAnimation();
        animations.pane = [exit];
        const { overlay, trigger } = await createHost(
          andesOverlayPreset('popover'),
        );

        overlay.close('close-button');
        (document.activeElement as HTMLElement | null)?.blur();
        expect(document.activeElement).toBe(document.body);
        exit.finish();
        await flushMicrotasks();

        expect(document.activeElement).toBe(trigger);
      });

      it('leaves focus on a page element the user moved to during the exit', async () => {
        const exit = new FakeAnimation();
        animations.pane = [exit];
        const { fixture, overlay, pane, reasons } = await createHost(
          andesOverlayPreset('popover'),
        );
        const elsewhere = (fixture.nativeElement as HTMLElement).querySelector(
          '#elsewhere',
        ) as HTMLElement;

        overlay.close('outside-click');
        elsewhere.focus();
        exit.finish();
        await flushMicrotasks();

        expect(pane.isConnected).toBe(false);
        expect(reasons).toEqual(['outside-click']);
        expect(document.activeElement).toBe(elsewhere);
      });

      it('still restores on a synchronous close, as before', async () => {
        const { fixture, overlay, trigger } = await createHost(
          andesOverlayPreset('popover'),
        );
        const elsewhere = (fixture.nativeElement as HTMLElement).querySelector(
          '#elsewhere',
        ) as HTMLElement;
        elsewhere.focus();

        overlay.close('outside-click');

        expect(document.activeElement).toBe(trigger);
      });
    });

    it('ignores a close requested while already closing', async () => {
      animations.pane = [new FakeAnimation()];
      const { overlay, pane, reasons } = await createHost();

      overlay.close('escape-key');
      overlay.close('imperative');
      animations.pane[0].finish();
      await flushMicrotasks();

      expect(pane.isConnected).toBe(false);
      expect(reasons).toEqual(['escape-key']);
    });

    it('does not wait for animations that already ended or never end', async () => {
      const ended = new FakeAnimation();
      ended.playState = 'finished';
      animations.pane = [ended, new FakeAnimation(Infinity)];
      const { overlay, pane, reasons } = await createHost();

      overlay.close();

      expect(pane.isConnected).toBe(false);
      expect(reasons).toEqual(['imperative']);
    });

    it('detaches after the timeout when an animation never settles', async () => {
      animations.pane = [new FakeAnimation()];
      const { overlay, pane, reasons } = await createHost();

      vi.useFakeTimers();
      try {
        overlay.close();
        vi.advanceTimersByTime(ANDES_OVERLAY_EXIT_TIMEOUT_MS - 1);
        expect(pane.isConnected).toBe(true);

        vi.advanceTimersByTime(1);
        expect(pane.isConnected).toBe(false);
        expect(reasons).toEqual(['imperative']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('closes instantly when the user prefers reduced motion', async () => {
      animations.pane = [new FakeAnimation()];
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: (query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
        }),
      });
      try {
        const { overlay, pane, reasons } = await createHost();

        overlay.close();

        expect(pane.isConnected).toBe(false);
        expect(isClosing(pane)).toBe(false);
        expect(reasons).toEqual(['imperative']);
      } finally {
        delete (window as unknown as Record<string, unknown>)['matchMedia'];
      }
    });

    describe('re-opening during the exit', () => {
      it('cancels the close and keeps the same pane', async () => {
        const exit = new FakeAnimation();
        animations.pane = [exit];
        const { fixture, overlay, pane, reasons, openedCount } =
          await createHost(andesOverlayPreset('popover'));

        overlay.close();
        overlay.open(fixture.componentInstance.content());
        fixture.detectChanges();

        expect(overlay.isOpen()).toBe(true);
        expect(overlay.panelElement()).toBe(pane);
        expect(pane.isConnected).toBe(true);
        expect(
          pane.querySelectorAll(`[${ANDES_OVERLAY_CLOSING_ATTRIBUTE}]`),
        ).toHaveLength(0);
        expect(isClosing(pane)).toBe(false);
        expect(pane.style.pointerEvents).toBe('');

        // The cancelled animation settling, or the cap elapsing, changes nothing.
        exit.finish();
        await new Promise((resolve) =>
          setTimeout(resolve, ANDES_OVERLAY_EXIT_TIMEOUT_MS + 20),
        );
        expect(pane.isConnected).toBe(true);
        expect(reasons).toEqual([]);
        expect(openedCount()).toBe(1);
      });

      it('restores dismissal, so the reopened overlay closes again', async () => {
        animations.pane = [new FakeAnimation()];
        const { fixture, overlay, pane, reasons, trigger } = await createHost(
          andesOverlayPreset('popover'),
        );

        overlay.close();
        overlay.open(fixture.componentInstance.content());
        animations.pane = [];
        pressEscape();

        expect(pane.isConnected).toBe(false);
        expect(reasons).toEqual(['escape-key']);
        expect(document.activeElement).toBe(trigger);
      });

      it('re-applies the inert background and focus trap of a modal', async () => {
        animations.pane = [new FakeAnimation()];
        const { fixture, overlay } = await createHost(
          andesOverlayPreset('dialog'),
        );

        overlay.close();
        expect(overlay.isBackgroundInert()).toBe(false);

        overlay.open(fixture.componentInstance.content());
        expect(overlay.isBackgroundInert()).toBe(true);
      });

      it('detaches the closing pane first when opening different content', async () => {
        animations.pane = [new FakeAnimation()];
        const { fixture, overlay, pane, reasons } = await createHost();

        overlay.close();
        overlay.open(fixture.componentInstance.other());
        fixture.detectChanges();

        expect(pane.isConnected).toBe(false);
        expect(reasons).toEqual(['imperative']);
        expect(overlay.isOpen()).toBe(true);
        expect(overlay.panelElement()?.querySelector('.other')).not.toBeNull();
      });
    });

    describe('content that outlives the pane', () => {
      function createProjectedHost() {
        const fixture = TestBed.createComponent(ProjectedExitHost);
        fixture.detectChanges();
        const { overlay, content } = fixture.componentInstance.projecting();
        const reopen = () => {
          overlay.open(content());
          fixture.detectChanges();
        };
        // Projected nodes stay out of the document until something renders them.
        reopen();
        const projected = overlay
          .panelElement()
          ?.querySelector('.projected') as HTMLElement;
        return { overlay, content, projected, reopen };
      }

      it('clears the closing state when the exit animation finishes', async () => {
        const { overlay, projected, reopen } = createProjectedHost();
        expect(overlay.panelElement()?.contains(projected)).toBe(true);

        const exit = new FakeAnimation();
        animations.pane = [exit];
        overlay.close();
        expect(isClosing(projected)).toBe(true);
        exit.finish();
        await flushMicrotasks();
        expect(overlay.panelElement()).toBeNull();

        // The same element goes into the next pane; a leftover closing attribute
        // would replay the exit animation on it and hide the re-opened panel.
        animations.pane = [];
        reopen();
        expect(overlay.panelElement()?.contains(projected)).toBe(true);
        expect(isClosing(projected)).toBe(false);
      });

      it('clears the closing state when the exit timeout detaches the pane', () => {
        const { overlay, projected } = createProjectedHost();

        animations.pane = [new FakeAnimation()];
        vi.useFakeTimers();
        try {
          overlay.close();
          vi.advanceTimersByTime(ANDES_OVERLAY_EXIT_TIMEOUT_MS);
        } finally {
          vi.useRealTimers();
        }
        expect(overlay.panelElement()).toBeNull();
        expect(isClosing(projected)).toBe(false);
      });

      it('clears the closing state when opening different content ends the exit', () => {
        const { overlay, content, projected } = createProjectedHost();
        animations.pane = [new FakeAnimation()];
        overlay.close();

        // A different context counts as different content: the closing pane is
        // detached first and a fresh one attached.
        overlay.open(content(), { context: {} });

        expect(overlay.panelElement()?.contains(projected)).toBe(true);
        expect(isClosing(projected)).toBe(false);
      });

      it('marks and detaches again on every later close', async () => {
        const { overlay, projected, reopen } = createProjectedHost();
        for (let cycle = 0; cycle < 3; cycle++) {
          if (cycle > 0) {
            reopen();
          }
          expect(isClosing(projected)).toBe(false);
          const exit = new FakeAnimation();
          animations.pane = [exit];
          overlay.close();
          expect(isClosing(projected)).toBe(true);
          expect(overlay.panelElement()).not.toBeNull();
          exit.finish();
          await flushMicrotasks();
          expect(overlay.panelElement()).toBeNull();
          expect(isClosing(projected)).toBe(false);
        }
      });
    });

    it('detaches immediately when the host is destroyed mid-exit', async () => {
      animations.pane = [new FakeAnimation()];
      const { fixture, overlay, pane, reasons } = await createHost();

      overlay.close('escape-key');
      expect(pane.isConnected).toBe(true);

      fixture.destroy();

      expect(pane.isConnected).toBe(false);
      expect(reasons).toEqual(['escape-key']);
    });

    it('does not animate when the host is destroyed while open', async () => {
      animations.pane = [new FakeAnimation()];
      const { fixture, pane, reasons } = await createHost();

      fixture.destroy();

      expect(pane.isConnected).toBe(false);
      expect(isClosing(pane)).toBe(false);
      expect(reasons).toEqual(['destroyed']);
    });

    describe('backdrop', () => {
      it('marks the backdrop and waits for its fade', async () => {
        const fade = new FakeAnimation();
        animations.backdrop = [fade];
        const { overlay, pane, reasons } = await createHost(
          andesOverlayPreset('dialog'),
        );
        const backdrop = overlay.backdropElement() as HTMLElement;

        overlay.close('backdrop-click');

        expect(isClosing(backdrop)).toBe(true);
        expect(backdrop.style.pointerEvents).toBe('none');
        expect(pane.isConnected).toBe(true);
        expect(overlay.isBackgroundInert()).toBe(false);

        fade.finish();
        await flushMicrotasks();

        expect(pane.isConnected).toBe(false);
        expect(reasons).toEqual(['backdrop-click']);
      });

      it('waits for both the panel and the backdrop', async () => {
        const panel = new FakeAnimation();
        const fade = new FakeAnimation();
        animations.pane = [panel];
        animations.backdrop = [fade];
        const { overlay, pane } = await createHost(
          andesOverlayPreset('dialog'),
        );

        overlay.close();
        panel.finish();
        await flushMicrotasks();
        expect(pane.isConnected).toBe(true);

        fade.finish();
        await flushMicrotasks();
        expect(pane.isConnected).toBe(false);
      });
    });
  });
});
