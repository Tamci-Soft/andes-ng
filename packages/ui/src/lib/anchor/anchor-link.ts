import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
} from '@angular/core';

import { ANDES_ANCHOR } from './anchor-token';

/**
 * A link inside an `andes-anchor`. Nest links to build a hierarchy:
 *
 * ```html
 * <andes-anchor-link href="#guide" title="Guide">
 *   <andes-anchor-link href="#guide-setup" title="Setup" />
 * </andes-anchor-link>
 * ```
 */
@Component({
  selector: 'andes-anchor-link',
  templateUrl: './anchor-link.html',
  styleUrl: './anchor-link.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'listitem',
    'data-slot': 'anchor-link',
  },
})
export class AndesAnchorLink {
  private readonly anchor = inject(ANDES_ANCHOR, { optional: true });

  readonly href = input.required<string>();
  readonly title = input('');
  readonly target = input<string | undefined>(undefined);

  protected readonly children = contentChildren(AndesAnchorLink);
  protected readonly nested = computed(() => this.children().length > 0);
  protected readonly active = computed(
    () => this.anchor?.activeLink() === this.href(),
  );

  protected onClick(event: MouseEvent): void {
    this.anchor?.handleClick(event, {
      href: this.href(),
      title: this.title(),
      target: this.target(),
    });
  }
}
