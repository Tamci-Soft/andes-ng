import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  numberAttribute,
  TemplateRef,
  viewChild,
} from '@angular/core';

import {
  ANDES_STEPS,
  AndesStepContent,
  AndesStepIconContext,
  AndesStepStatus,
} from './steps-types';

let nextStepId = 0;

/** What the marker shows. */
type StepMarker = 'custom' | 'number' | 'check' | 'cross' | 'dot' | 'none';

/**
 * One stage of an `andes-steps` trail. The status comes from the parent's `current` unless
 * `status` is set. Anything projected into the step renders below its description.
 */
@Component({
  selector: 'andes-step',
  imports: [NgTemplateOutlet],
  templateUrl: './step.html',
  styleUrl: './step.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'listitem',
    'data-slot': 'step',
    '[attr.data-status]': 'resolvedStatus()',
    '[attr.data-orientation]': 'parent.layoutOrientation()',
    '[attr.data-variant]': 'parent.variant()',
    '[attr.data-size]': 'parent.size()',
    '[attr.data-label-placement]': 'parent.layoutLabelPlacement()',
    '[attr.data-clickable]': 'parent.clickable() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-current]': 'isCurrent() ? "" : null',
    '[attr.data-first]': 'index() === 0 ? "" : null',
    '[attr.data-last]': 'isLast() ? "" : null',
    '[attr.aria-current]': 'isCurrent() ? "step" : null',
    // A static `title="..."` would otherwise stay on the host and show a native tooltip that
    // repeats the visible title.
    '[attr.title]': 'null',
  },
})
export class AndesStep {
  protected readonly parent = inject(ANDES_STEPS);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly title = input<AndesStepContent | undefined>(undefined);
  /** Secondary text beside the title. */
  readonly subtitle = input<AndesStepContent | undefined>(undefined);
  readonly description = input<AndesStepContent | undefined>(undefined);
  /** Replaces the numbered marker. Ignored by the `dot`, `navigation` and `inline` variants. */
  readonly icon = input<TemplateRef<AndesStepIconContext> | undefined>(
    undefined,
  );
  /** Overrides the status derived from the parent's `current`. */
  readonly status = input<AndesStepStatus | undefined>(undefined);
  /** A disabled step cannot be selected even when the trail is `clickable`. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** 0-100 ring around this step's marker; defaults to the trail's `percent` for the current step. */
  readonly percent = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      const parsed = numberAttribute(value, NaN);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
  });

  private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger');
  private readonly titleElement =
    viewChild<ElementRef<HTMLElement>>('titleText');

  private readonly uid = `andes-step-${nextStepId++}`;
  protected readonly descriptionId = `${this.uid}-description`;

  readonly index = computed(() => this.parent.indexOf(this));
  readonly isCurrent = computed(() => this.index() === this.parent.current());
  protected readonly isLast = computed(
    () => this.index() === this.parent.count() - 1,
  );

  readonly resolvedStatus = computed<AndesStepStatus>(() => {
    const explicit = this.status();
    if (explicit) {
      return explicit;
    }
    const index = this.index();
    const current = this.parent.current();
    if (index < current) {
      return 'finish';
    }
    return index === current ? this.parent.status() : 'wait';
  });

  /** Whether the step is rendered as a button the user can activate. */
  readonly isInteractive = computed(
    () => this.parent.clickable() && !this.disabled(),
  );

  protected readonly titleTemplate = computed(() => asTemplate(this.title()));
  protected readonly titleString = computed(() => asText(this.title()));
  protected readonly subtitleTemplate = computed(() =>
    asTemplate(this.subtitle()),
  );
  protected readonly subtitleString = computed(() => asText(this.subtitle()));
  protected readonly descriptionTemplate = computed(() =>
    asTemplate(this.description()),
  );
  protected readonly descriptionString = computed(() =>
    asText(this.description()),
  );

  protected readonly statusLabel = computed(
    () => this.parent.resolvedLabels()[this.resolvedStatus()],
  );

  protected readonly showMarker = computed(() => {
    const variant = this.parent.variant();
    return variant === 'default' || variant === 'dot';
  });

  protected readonly marker = computed<StepMarker>(() => {
    const variant = this.parent.variant();
    if (variant === 'dot') {
      return 'dot';
    }
    if (variant !== 'default') {
      return 'none';
    }
    if (this.icon()) {
      return 'custom';
    }
    switch (this.resolvedStatus()) {
      case 'finish':
        return 'check';
      case 'error':
        return 'cross';
      default:
        return 'number';
    }
  });

  protected readonly iconContext = computed<AndesStepIconContext>(() => ({
    $implicit: this.resolvedStatus(),
    status: this.resolvedStatus(),
    index: this.index(),
    current: this.isCurrent(),
  }));

  /** Ring progress, only on an in-progress step of the numbered variant. */
  protected readonly ringPercent = computed<number | null>(() => {
    if (
      this.parent.variant() !== 'default' ||
      this.resolvedStatus() !== 'process'
    ) {
      return null;
    }
    const value =
      this.percent() ?? (this.isCurrent() ? this.parent.percent() : undefined);
    return value === undefined ? null : Math.min(100, Math.max(0, value));
  });

  /** Plain-text title, for announcements and tests. */
  titleText(): string {
    const text = this.titleString();
    if (text) {
      return text;
    }
    return this.titleElement()?.nativeElement.textContent?.trim() ?? '';
  }

  focus(): void {
    this.trigger()?.nativeElement.focus();
  }

  protected activate(): void {
    if (this.isInteractive()) {
      this.parent.select(this.index());
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const rtl =
      getComputedStyle(this.elementRef.nativeElement).direction === 'rtl';
    let move: 'next' | 'previous' | 'first' | 'last' | null = null;
    switch (event.key) {
      case 'ArrowDown':
        move = 'next';
        break;
      case 'ArrowUp':
        move = 'previous';
        break;
      case 'ArrowRight':
        move = rtl ? 'previous' : 'next';
        break;
      case 'ArrowLeft':
        move = rtl ? 'next' : 'previous';
        break;
      case 'Home':
        move = 'first';
        break;
      case 'End':
        move = 'last';
        break;
    }
    if (move) {
      event.preventDefault();
      this.parent.moveFocus(this, move);
    }
  }
}

function asTemplate(
  content: AndesStepContent | undefined,
): TemplateRef<unknown> | null {
  return content instanceof TemplateRef ? content : null;
}

function asText(content: AndesStepContent | undefined): string {
  return typeof content === 'string' ? content : '';
}
