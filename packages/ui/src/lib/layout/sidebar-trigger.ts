import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';

import { AndesSidebarProvider } from './sidebar-provider';

/**
 * The button that opens and closes the sidebar (the overlay on mobile, the desktop state
 * otherwise). Shows a panel icon; project your own content to replace it.
 */
@Component({
  selector: 'andes-sidebar-trigger',
  template: `
    <button
      type="button"
      class="andes-sidebar-trigger__button"
      [attr.aria-label]="label()"
      [attr.aria-expanded]="provider.expanded()"
      [attr.aria-controls]="provider.sidebarId()"
      (click)="provider.toggle()"
    >
      <ng-content>
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="2.5" width="12" height="11" rx="2" />
          <path d="M6 2.5v11" />
        </svg>
      </ng-content>
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'andes-sidebar-trigger', 'data-slot': 'sidebar-trigger' },
})
export class AndesSidebarTrigger {
  protected readonly provider = inject(AndesSidebarProvider);

  readonly label = input('Toggle sidebar');
}
