import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  effect,
  inject,
  input,
  signal,
  TemplateRef,
} from '@angular/core';

import { ANDES_TABS } from './tabs-types';

/**
 * Marks an `<ng-template>` inside `<andes-tabs-content>` as that panel's *lazy* content:
 *
 * ```html
 * <andes-tabs-content value="report">
 *   <ng-template andesTabsContentLazy><app-expensive-report /></ng-template>
 * </andes-tabs-content>
 * ```
 *
 * Lazy content is created the first time its panel is shown - not up front - and is then
 * kept alive (state included) while the panel is hidden, unless `destroyOnHidden` asks for
 * it to be torn down instead. Plain projected content, by contrast, is created by the
 * consumer's own template before Tabs ever sees it, so it is always rendered and can only be
 * hidden, never destroyed.
 */
@Directive({ selector: '[andesTabsContentLazy]' })
export class AndesTabsContentLazy {
  readonly templateRef = inject(TemplateRef);
}

/** `booleanAttribute`, except that an unset value stays `undefined` (meaning "inherit"). */
function optionalBoolean(value: unknown): boolean | undefined {
  return value === undefined || value === null
    ? undefined
    : booleanAttribute(value);
}

/**
 * The `role="tabpanel"` shown when its `value` matches the parent `AndesTabs`'s active tab.
 *
 * Inactive panels stay mounted but carry the native `hidden` attribute rather than being
 * merely visually hidden with CSS - `hidden` removes them from the accessibility tree (and
 * from hit-testing/tab order) the same way fully unmounting them would, while preserving
 * their component state across tab switches. Content inside an `andesTabsContentLazy`
 * template additionally renders on first activation and can be destroyed when hidden.
 */
@Component({
  selector: 'andes-tabs-content',
  imports: [NgTemplateOutlet],
  template: `
    <ng-content />
    @if (lazy(); as lazyContent) {
      @if (renderLazy()) {
        <ng-container [ngTemplateOutlet]="lazyContent.templateRef" />
      }
    }
  `,
  styleUrl: './tabs-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'tabpanel',
    tabindex: '0',
    '[id]': 'panelId()',
    '[attr.aria-labelledby]': 'tabId()',
    '[hidden]': '!isActive()',
    '[class.andes-tabs-content--animated]': 'tabs.tabPaneAnimated()',
  },
})
export class AndesTabsContent {
  protected readonly tabs = inject(ANDES_TABS);

  /** Matches the `AndesTabsTrigger` whose panel this is. */
  readonly value = input.required<string>();

  /** Overrides the parent Tabs' `destroyOnHidden` for this panel's lazy content. */
  readonly destroyOnHidden = input<boolean | undefined, unknown>(undefined, {
    transform: optionalBoolean,
  });

  /** Render lazy content before the panel is first shown, instead of on first activation. */
  readonly forceRender = input(false, { transform: booleanAttribute });

  protected readonly lazy = contentChild(AndesTabsContentLazy);

  protected readonly isActive = computed(
    () => this.tabs.activeValue() === this.value(),
  );
  protected readonly panelId = computed(() => this.tabs.panelId(this.value()));
  protected readonly tabId = computed(() =>
    this.tabs.triggerElementId(this.value()),
  );

  /** Whether this panel has ever been shown - lazy content, once created, is kept. */
  private readonly visited = signal(false);

  protected readonly renderLazy = computed(() => {
    if (this.isActive()) {
      return true;
    }
    if (this.destroyOnHidden() ?? this.tabs.destroyOnHidden()) {
      return false;
    }
    return this.visited() || this.forceRender();
  });

  constructor() {
    effect(() => {
      if (this.isActive()) {
        this.visited.set(true);
      }
    });
  }
}
