import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  numberAttribute,
  TemplateRef,
  viewChild,
} from '@angular/core';

import type { AndesSplitterSize } from './splitter-layout';

let nextPanelId = 0;

/**
 * One pane of an `andes-splitter`. The pane only declares its constraints; the splitter renders
 * the projected content inside its own pane element so it can place the drag handles between
 * neighbours.
 */
@Component({
  selector: 'andes-splitter-panel',
  template: '<ng-template><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesSplitterPanel {
  /** Initial size: pixels (`240`, `'240px'`), a share (`'30%'`) or `auto` for "what is left". */
  readonly size = input<AndesSplitterSize>(undefined);
  /** Smallest size the pane may be dragged to (pixels or a share). */
  readonly min = input<AndesSplitterSize>(undefined);
  /** Largest size the pane may be dragged to (pixels or a share). */
  readonly max = input<AndesSplitterSize>(undefined);
  /** Lets the pane fold away to `collapsedSize` through the handle button or Enter. */
  readonly collapsible = input(false, { transform: booleanAttribute });
  /** Size, in pixels, a collapsed pane keeps. */
  readonly collapsedSize = input(0, { transform: numberAttribute });
  /** Whether the handles next to this pane may be dragged. */
  readonly resizable = input(true, { transform: booleanAttribute });
  /** Two-way collapsed state (only honoured while `collapsible`). */
  readonly collapsed = model(false);

  readonly id = `andes-splitter-panel-${nextPanelId++}`;

  /** @internal Content rendered by the splitter inside its pane element. */
  readonly content = viewChild.required(TemplateRef<unknown>);
}
