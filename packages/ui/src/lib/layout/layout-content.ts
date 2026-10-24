import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The main region of an `andes-layout`: takes the remaining space and may shrink below its content. */
@Component({
  selector: 'andes-layout-content',
  template: '<ng-content />',
  styleUrl: './layout-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-slot': 'layout-content' },
})
export class AndesLayoutContent {}
