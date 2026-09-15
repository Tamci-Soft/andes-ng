import { AndesButtonPrimitive } from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
  signal,
} from '@angular/core';
import clsx from 'clsx';

export type AndesButtonVariant =
  'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'link';
export type AndesButtonSize =
  'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg';
export type AndesButtonShape = 'default' | 'full';

const RIPPLE_DURATION_MS = 500;

@Component({
  selector: 'andes-button',
  imports: [AndesButtonPrimitive, NgTemplateOutlet],
  templateUrl: './button.html',
  styleUrl: './button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(pointerdown)': 'onPointerDown($event)',
    // Forwarded to the real button/anchor in the template instead - a screen reader never
    // sees this non-interactive host element, so leaving these here would do nothing.
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesButton {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  readonly variant = input<AndesButtonVariant>('primary');
  readonly size = input<AndesButtonSize>('md');
  readonly shape = input<AndesButtonShape>('default');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly loadingDelay = input(0);
  readonly fullWidth = input(false);
  readonly href = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });
  readonly ariaInvalid = input(false, {
    alias: 'aria-invalid',
    transform: booleanAttribute,
  });

  protected readonly visibleLoading = signal(false);
  private loadingTimeoutId: ReturnType<typeof setTimeout> | undefined;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.visibleLoading(),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-button',
      `andes-button--${this.variant()}`,
      `andes-button--${this.size()}`,
      this.shape() === 'full' && 'andes-button--full',
      this.visibleLoading() && 'andes-button--loading',
      this.fullWidth() && 'andes-button--full-width',
      this.ariaInvalid() && 'andes-button--invalid',
    ),
  );

  constructor() {
    effect((onCleanup) => {
      const loading = this.loading();
      const delay = this.loadingDelay();
      clearTimeout(this.loadingTimeoutId);

      if (!loading || delay <= 0) {
        this.visibleLoading.set(loading);
        return;
      }

      this.loadingTimeoutId = setTimeout(
        () => this.visibleLoading.set(true),
        delay,
      );
      onCleanup(() => clearTimeout(this.loadingTimeoutId));
    });
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.isDisabled()) {
      return;
    }

    const host = this.elementRef.nativeElement.querySelector(
      '[andesbuttonprimitive]',
    ) as HTMLElement | null;
    if (!host) {
      return;
    }

    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = this.renderer.createElement('span') as HTMLSpanElement;
    this.renderer.addClass(ripple, 'andes-button__ripple');
    this.renderer.setStyle(ripple, 'width', `${size}px`);
    this.renderer.setStyle(ripple, 'height', `${size}px`);
    this.renderer.setStyle(
      ripple,
      'left',
      `${event.clientX - rect.left - size / 2}px`,
    );
    this.renderer.setStyle(
      ripple,
      'top',
      `${event.clientY - rect.top - size / 2}px`,
    );
    this.renderer.appendChild(host, ripple);

    setTimeout(() => ripple.remove(), RIPPLE_DURATION_MS);
  }
}
