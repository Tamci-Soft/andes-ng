import {
  ChangeDetectionStrategy,
  Component,
  input,
  booleanAttribute,
  ViewEncapsulation,
} from '@angular/core';

export type AndesSpaceCompactDirection = 'horizontal' | 'vertical';

/**
 * Joins adjacent controls - buttons, inputs, selects, date pickers - into one visually
 * continuous group: the inner corners are squared and the shared borders collapse onto one line
 * (the next control is pulled over the previous one's border by 1px). The control under the
 * pointer or with focus is raised above its neighbours so its ring is never covered.
 *
 * It works on the **direct children** of the group and on the first element inside each of them,
 * so it needs no knowledge of the control: a native `<button>`, `andes-button` (whose `<button>`
 * is that first element), a field wrapper `<div>` holding an `<input>`, or any other `andes-*`
 * control - as long as it draws its own border and radius on the child or the child's first
 * element. Put `data-grow` on a child to make it take the remaining width (`block` does so for
 * text inputs and selects on its own).
 *
 * ```html
 * <andes-space-compact aria-label="Search">
 *   <andes-input placeholder="Search invoices" />
 *   <andes-button>Search</andes-button>
 * </andes-space-compact>
 * ```
 */
@Component({
  selector: 'andes-space-compact',
  template: '<ng-content />',
  styleUrl: './space-compact.css',
  // The rules reach the projected controls and the elements inside them, which emulated
  // encapsulation cannot select.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-space-compact',
    role: 'group',
    'data-slot': 'space-compact',
    '[attr.data-direction]': 'direction()',
    '[class.andes-space-compact--horizontal]': 'direction() === "horizontal"',
    '[class.andes-space-compact--vertical]': 'direction() === "vertical"',
    '[class.andes-space-compact--block]': 'block()',
  },
})
export class AndesSpaceCompact {
  readonly direction = input<AndesSpaceCompactDirection>('horizontal');
  /** Fills the available width (or height, when vertical) instead of fitting its content. */
  readonly block = input(false, { transform: booleanAttribute });
}
