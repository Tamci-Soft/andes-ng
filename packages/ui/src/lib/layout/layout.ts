import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
} from '@angular/core';

import { AndesLayoutSider } from './layout-sider';

/**
 * The page frame: a column of `andes-layout-header`, `andes-layout-content` and
 * `andes-layout-footer`, or a row when it holds an `andes-layout-sider` (detected from its
 * content, or forced with `hasSider`). Layouts nest, so a sider can sit beside a layout that has
 * its own header, content and footer.
 */
@Component({
  selector: 'andes-layout',
  template: '<ng-content />',
  styleUrl: './layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'layout',
    '[attr.data-has-sider]': 'horizontal() ? "" : null',
  },
})
export class AndesLayout {
  /** Lays children out in a row even if the sider is wrapped and cannot be detected. */
  readonly hasSider = input(false, { transform: booleanAttribute });

  private readonly siders = contentChildren(AndesLayoutSider);

  protected readonly horizontal = computed(
    () => this.hasSider() || this.siders().length > 0,
  );
}
