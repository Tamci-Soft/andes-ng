import {
  booleanAttribute,
  Directive,
  ElementRef,
  HOST_TAG_NAME,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';

@Directive({
  selector: 'button[andesButtonPrimitive], a[andesButtonPrimitive]',
  host: {
    '[attr.tabindex]': 'disabled() ? -1 : undefined',
    '[attr.disabled]': '!isAnchor && disabled() ? "" : undefined',
    '[attr.data-disabled]': 'disabled() ? "" : undefined',
  },
})
export class AndesButtonPrimitive {
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly isAnchor = inject(HOST_TAG_NAME) === 'a';

  constructor() {
    if (this.isAnchor) {
      const elementRef = inject(ElementRef<HTMLAnchorElement>);
      fromEvent<MouseEvent>(elementRef.nativeElement, 'click')
        .pipe(
          filter(() => this.disabled()),
          takeUntilDestroyed(),
        )
        .subscribe((event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
        });
    }
  }
}
