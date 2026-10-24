import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  type OnInit,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';

import {
  ANDES_MENU,
  ANDES_MENU_LEVEL,
  type AndesMenuLabel,
  type AndesMenuLevel,
} from './menu-types';

let nextGroupId = 0;

/**
 * A titled group of entries, announced as a labelled `group`. The default content
 * is the group's entries; the title is the `label` input or a `[slot=label]` element.
 *
 * Entries inside a group sit at the group's own level: they are not indented any
 * further, and in a horizontal bar the whole group counts as one unit that
 * overflows together.
 */
@Component({
  selector: 'andes-menu-group',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #view>
      <div
        class="andes-menu__group"
        role="group"
        [attr.aria-labelledby]="labelId"
      >
        <div
          class="andes-menu__group-label"
          [id]="labelId"
          [style.--andes-menu-indent]="indent()"
        >
          <ng-content select="[slot=label]" />
          @if (labelTemplate(); as tpl) {
            <ng-container [ngTemplateOutlet]="tpl" />
          } @else if (labelText(); as text) {
            {{ text }}
          }
        </div>
        <div class="andes-menu__group-items">
          <ng-content />
        </div>
      </div>
    </ng-template>
    @if (!overflowed()) {
      <ng-container [ngTemplateOutlet]="view" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      // A group is transparent to its entries: same depth, same submenu, same list.
      provide: ANDES_MENU_LEVEL,
      useFactory: (): AndesMenuLevel => {
        const parent = inject(ANDES_MENU_LEVEL, { skipSelf: true });
        return {
          depth: parent.depth,
          sub: parent.sub,
          inPopup: parent.inPopup,
          isRoot: false,
        };
      },
    },
  ],
  host: {
    class: 'andes-menu__node andes-menu__node-group',
    'data-slot': 'menu-group',
    '[attr.role]': 'menu.navigation() ? "listitem" : "none"',
    '[attr.data-overflowed]': 'overflowed() ? "" : null',
  },
})
export class AndesMenuGroup implements OnInit {
  protected readonly menu = inject(ANDES_MENU);
  private readonly parentLevel = inject(ANDES_MENU_LEVEL, { skipSelf: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The group title. */
  readonly label = input<AndesMenuLabel | undefined>(undefined);

  protected readonly labelId = `andes-menu-group-${nextGroupId++}`;
  readonly overflowed = signal(false);
  private readonly view = viewChild<TemplateRef<unknown>>('view');

  protected readonly labelTemplate = computed(() => {
    const label = this.label();
    return label && typeof label !== 'string' ? label : null;
  });
  protected readonly labelText = computed(() => {
    const label = this.label();
    return typeof label === 'string' ? label : '';
  });
  protected readonly indent = computed(() =>
    this.menu.mode() === 'inline' &&
    !this.menu.collapsed() &&
    !this.parentLevel.inPopup()
      ? `${this.parentLevel.depth * this.menu.inlineIndent()}px`
      : null,
  );

  ngOnInit(): void {
    if (this.parentLevel.isRoot) {
      const unit = {
        host: this.host,
        overflowed: this.overflowed,
        view: computed(() => this.view()),
        divider: false,
      };
      this.menu.registerUnit(unit);
      this.destroyRef.onDestroy(() => this.menu.unregisterUnit(unit));
    }
  }
}
