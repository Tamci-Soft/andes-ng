import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
} from '@angular/core';

import { AndesStep } from './step';
import {
  ANDES_STEPS,
  ANDES_STEPS_DEFAULT_LABELS,
  AndesStepStatus,
  AndesStepsContext,
  AndesStepsLabelPlacement,
  AndesStepsLabels,
  AndesStepsOrientation,
  AndesStepsSize,
  AndesStepsVariant,
} from './steps-types';

/** Appended to repeat an identical announcement, which a live region would otherwise skip. */
const NBSP = String.fromCharCode(160);

/**
 * A progress trail for multi-stage flows such as wizards, onboarding or order tracking.
 *
 * Compose it with `andes-step` children. Every step derives its status from `current`
 * (earlier steps are finished, the current one is in progress, later ones are upcoming) unless
 * the step sets `status` itself. With `clickable`, steps become buttons: clicking one updates
 * `current` and emits `changed`.
 *
 * @example
 * <andes-steps [(current)]="index" clickable>
 *   <andes-step title="Account" description="Create your login" />
 *   <andes-step title="Billing" />
 *   <andes-step title="Review" />
 * </andes-steps>
 */
@Component({
  selector: 'andes-steps',
  templateUrl: './steps.html',
  styleUrl: './steps.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ANDES_STEPS, useExisting: forwardRef(() => AndesSteps) },
  ],
  host: {
    'data-slot': 'steps',
    '[attr.data-orientation]': 'layoutOrientation()',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[attr.data-label-placement]': 'layoutLabelPlacement()',
    '[attr.data-clickable]': 'clickable() ? "" : null',
    '[attr.data-collapsed]': 'collapsed() ? "" : null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
  },
})
export class AndesSteps implements AndesStepsContext {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Zero-based index of the step in progress. Two-way bindable. */
  readonly current = model(0);
  /** Layout axis. Horizontal collapses to vertical in a narrow container (see `responsive`). */
  readonly orientation = input<AndesStepsOrientation>('horizontal');
  readonly variant = input<AndesStepsVariant>('default');
  readonly size = input<AndesStepsSize>('default');
  /** Title below (`vertical`) or beside (`horizontal`) the marker. The `dot` variant is always below. */
  readonly labelPlacement = input<AndesStepsLabelPlacement>('horizontal');
  /** Turns every step into a button that selects it. */
  readonly clickable = input(false, { transform: booleanAttribute });
  /** Status of the current step, e.g. `error` when its validation failed. */
  readonly status = input<AndesStepStatus>('process');
  /** 0-100. Draws a progress ring around the current step's marker. */
  readonly percent = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      const parsed = numberAttribute(value, NaN);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
  });
  /** Switch a horizontal trail to vertical when the container is narrower than `breakpoint` (not the compact `inline` variant). */
  readonly responsive = input(true, { transform: booleanAttribute });
  /** Container width in px below which the responsive collapse applies. */
  readonly breakpoint = input(480, { transform: numberAttribute });
  /** Override the visually hidden status words and the announcement template. */
  readonly labels = input<AndesStepsLabels | undefined>(undefined);
  /** Announce the new step politely when `current` changes after the first render. */
  readonly announce = input(true, { transform: booleanAttribute });
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  /** Emits the zero-based index of a step the user selected (click or Enter/Space). */
  readonly changed = output<number>();

  private readonly steps = contentChildren(AndesStep);
  private readonly narrow = signal(false);
  protected readonly liveMessage = signal('');

  readonly count = computed(() => this.steps().length);
  readonly resolvedLabels = computed(() => ({
    ...ANDES_STEPS_DEFAULT_LABELS,
    ...this.labels(),
  }));
  protected readonly collapsed = computed(
    () =>
      this.orientation() === 'horizontal' &&
      this.variant() !== 'inline' &&
      this.responsive() &&
      this.narrow(),
  );
  readonly layoutOrientation = computed<AndesStepsOrientation>(() =>
    this.collapsed() ? 'vertical' : this.orientation(),
  );
  readonly layoutLabelPlacement = computed<AndesStepsLabelPlacement>(() =>
    this.variant() === 'dot' ? 'vertical' : this.labelPlacement(),
  );

  private lastAnnounced: number | null = null;

  constructor() {
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const element = this.host.nativeElement;
      const measure = () =>
        this.narrow.set(
          element.getBoundingClientRect().width < this.breakpoint(),
        );
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    effect(() => {
      const current = this.current();
      const steps = this.steps();
      untracked(() => {
        if (this.lastAnnounced === null) {
          this.lastAnnounced = current;
          return;
        }
        if (current === this.lastAnnounced) {
          return;
        }
        this.lastAnnounced = current;
        const step = steps[current];
        if (!this.announce() || !step) {
          return;
        }
        // The same text twice in a row would not re-announce, so toggle a trailing space.
        const message = this.resolvedLabels()
          .stepOf.replace('{index}', String(current + 1))
          .replace('{count}', String(steps.length))
          .replace('{title}', step.titleText());
        this.liveMessage.update((previous) =>
          previous === message ? `${message}${NBSP}` : message,
        );
      });
    });
  }

  indexOf(step: unknown): number {
    return this.steps().indexOf(step as AndesStep);
  }

  select(index: number): void {
    if (index === this.current()) {
      return;
    }
    this.current.set(index);
    this.changed.emit(index);
  }

  moveFocus(step: unknown, key: 'next' | 'previous' | 'first' | 'last'): void {
    const steps = this.steps();
    const enabled = steps.filter((candidate) => candidate.isInteractive());
    if (enabled.length === 0) {
      return;
    }
    const position = enabled.indexOf(step as AndesStep);
    let target: AndesStep | undefined;
    switch (key) {
      case 'first':
        target = enabled[0];
        break;
      case 'last':
        target = enabled[enabled.length - 1];
        break;
      case 'next':
        target = enabled[Math.min(position + 1, enabled.length - 1)];
        break;
      case 'previous':
        target = enabled[Math.max(position - 1, 0)];
        break;
    }
    target?.focus();
  }
}
