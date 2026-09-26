import { NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  ApplicationRef,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  type EmbeddedViewRef,
  forwardRef,
  inject,
  InjectionToken,
  Injector,
  input,
  numberAttribute,
  output,
  Renderer2,
  type Signal,
  TemplateRef,
  untracked,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDropdownMenu } from '../dropdown-menu/dropdown-menu';
import { AndesDropdownMenuContent } from '../dropdown-menu/dropdown-menu-content';
import { AndesDropdownMenuItem } from '../dropdown-menu/dropdown-menu-item';
import { AndesDropdownMenuTrigger } from '../dropdown-menu/dropdown-menu-trigger';
import {
  type AndesBreadcrumbItemClickEvent,
  type AndesBreadcrumbItemRenderContext,
  type AndesBreadcrumbItemType,
  type AndesBreadcrumbMenuClickEvent,
  type AndesBreadcrumbMenuItem,
  type AndesBreadcrumbParams,
  type AndesBreadcrumbResolvedCrumb,
  type AndesBreadcrumbSeparatorContent,
  buildBreadcrumbNodes,
} from './breadcrumb-items';

/**
 * Breadcrumb is a compound set of small parts that communicate purely through DOM nesting and
 * content projection - there is no shared state or behavior between them (no focus trap, no
 * open/close state, no roving tabindex), so unlike `AndesButton` none of this needs a behavior
 * primitive from `@andes-ng/primitives`. The one exception is the root's `separator`, which empty
 * `andesBreadcrumbSeparator`s inherit through the `ANDES_BREADCRUMB` token below.
 *
 * Only the root (`AndesBreadcrumb`) and the optional collapse indicator (`AndesBreadcrumbEllipsis`)
 * are full `@Component`s with their own element selector - a component always renders its own tag
 * as the DOM node, and `AndesBreadcrumb` needs somewhere to own the shared stylesheet the way
 * `AndesButton` owns `button.css`. Every part that has to be a specific native list element
 * (`andesBreadcrumbList`, `andesBreadcrumbItem`, `andesBreadcrumbLink`, `andesBreadcrumbPage`,
 * `andesBreadcrumbSeparator`) is instead a plain attribute directive on that native tag (`ol`,
 * `li`, `a`, `span`) - the same technique `AndesButtonPrimitive` uses for `button`/`a`. That
 * matters more here than usual: an intervening custom-element wrapper between `<ol>` and `<li>`
 * would still look right but breaks the list/listitem relationship assistive tech relies on
 * (axe's "list" rule flags any `<ol>`/`<ul>` child that isn't an `<li>`, regardless of CSS) -
 * directives avoid that entirely, since the rendered DOM is exactly the tags the author wrote.
 *
 * That same directive-on-consumer-markup technique breaks Angular's default emulated view
 * encapsulation for `breadcrumb.css`: emulated encapsulation only rewrites a stylesheet's
 * selectors to match elements carrying ITS OWN component's `_ngcontent-*`/`_nghost-*` attribute,
 * and the `<ol>`/`<li>`/`<a>`/`<span>` these directives attach to are declared in the CONSUMER's
 * template, projected in via `<ng-content>` - they never carry `AndesBreadcrumb`'s attribute (a
 * `:host(...)` selector cannot reach them either, since `:host()` only ever matches an actual
 * component host element, and none of these directive-hosted elements are one). Unlike
 * `AndesCard`/`AndesRadioGroup`, where every styled part is its own `@Component` and `:host()`
 * therefore works, most of Breadcrumb's parts must stay directives (see above), so the only way
 * for `breadcrumb.css` to reach them at all is to opt the `@Component`s that own that stylesheet
 * out of scoping entirely via `encapsulation: ViewEncapsulation.None` - the plain class selectors
 * in `breadcrumb.css` then match by class name globally, the same way they would in a
 * hand-written global stylesheet.
 *
 * The root is declared LAST in this file because its template renders every other part (in
 * `[items]` mode), and a standalone `imports` array cannot reference a class declared below it.
 */

/**
 * What the parts need from the root. An injection token rather than injecting `AndesBreadcrumb`
 * directly: the root is declared after (and imports) the parts, so a part referencing the root's
 * class would be a use-before-declaration.
 */
interface AndesBreadcrumbContext {
  readonly separator: Signal<AndesBreadcrumbSeparatorContent | undefined>;
}

const ANDES_BREADCRUMB = new InjectionToken<AndesBreadcrumbContext>(
  'ANDES_BREADCRUMB',
);

/** The `<ol>` that lays out crumbs in a row and wraps them on overflow. */
@Directive({
  selector: 'ol[andesBreadcrumbList]',
  host: { class: 'andes-breadcrumb-list' },
})
export class AndesBreadcrumbList {}

/** An `<li>` wrapping one crumb - a link, the current page, a separator, or an ellipsis. */
@Directive({
  selector: 'li[andesBreadcrumbItem]',
  host: { class: 'andes-breadcrumb-item' },
})
export class AndesBreadcrumbItem {}

/**
 * The clickable `<a>` for a non-current crumb. A plain styling attribute, deliberately not a
 * polymorphic primitive - apply it directly to a router's own anchor (e.g. `routerLink`) the same
 * way `andesButtonPrimitive` attaches to a plain `<a>`.
 */
@Directive({
  selector: 'a[andesBreadcrumbLink]',
  host: { class: 'andes-breadcrumb-link' },
})
export class AndesBreadcrumbLink {}

/**
 * A non-interactive `<span>` representing the current/last crumb. Carries `role="link"`,
 * `aria-disabled="true"` and `aria-current="page"` so it visually matches the rest of the trail
 * while assistive tech still gets an explicit "this is where you are" signal - an accessibility
 * detail that is easy to miss.
 */
@Directive({
  selector: 'span[andesBreadcrumbPage]',
  host: {
    class: 'andes-breadcrumb-page',
    role: 'link',
    '[attr.aria-disabled]': 'true',
    '[attr.aria-current]': "'page'",
  },
})
export class AndesBreadcrumbPage {}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * An `<li role="presentation" aria-hidden="true">` divider between items.
 *
 * What it renders, in order of precedence:
 * 1. Its own static children (an icon, `/`, `>`, ...) - never touched.
 * 2. Its own `[andesBreadcrumbSeparator]` value - a string or a `TemplateRef` - which is how a
 *    single position overrides the trail's separator.
 * 3. The enclosing `AndesBreadcrumb`'s `separator` input (an empty string renders nothing).
 * 4. A default chevron icon.
 *
 * A plain `@Directive` has no template of its own to project into, so 2-4 are inserted
 * imperatively via `Renderer2` - the same technique `AndesButton` already uses for its ripple -
 * and only when the host was still empty after the first render, so an author-provided separator
 * is never touched. It re-renders when the input or the root's `separator` changes.
 */
@Directive({
  selector: 'li[andesBreadcrumbSeparator]',
  host: {
    class: 'andes-breadcrumb-separator',
    role: 'presentation',
    '[attr.aria-hidden]': 'true',
  },
})
export class AndesBreadcrumbSeparator {
  /**
   * This separator's own content, overriding the root's `separator`. The bare attribute
   * (`<li andesBreadcrumbSeparator>`) binds `''`, which means "inherit".
   */
  readonly content = input<AndesBreadcrumbSeparatorContent | undefined>(
    undefined,
    { alias: 'andesBreadcrumbSeparator' },
  );

  private readonly root = inject(ANDES_BREADCRUMB, { optional: true });
  private readonly host =
    inject<ElementRef<HTMLLIElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(Injector);

  /** `undefined` = the chevron; `''` = nothing. */
  private readonly resolved = computed(() => {
    const own = this.content();
    return own !== undefined && own !== '' ? own : this.root?.separator();
  });

  /** Decided once, on the first render: did the author project their own separator? */
  private ownsContent: boolean | undefined;
  private renderedNodes: Node[] = [];
  private renderedView: EmbeddedViewRef<unknown> | undefined;

  constructor() {
    afterRenderEffect(() => {
      const content = this.resolved();
      untracked(() => this.render(content));
    });
    inject(DestroyRef).onDestroy(() => this.clear());
  }

  private render(content: AndesBreadcrumbSeparatorContent | undefined): void {
    this.ownsContent ??= this.host.childNodes.length === 0;
    if (!this.ownsContent) {
      return;
    }
    this.clear();

    if (content instanceof TemplateRef) {
      const view = content.createEmbeddedView({}, this.injector);
      this.appRef.attachView(view);
      view.detectChanges();
      this.renderedView = view;
      this.append(...view.rootNodes);
    } else if (typeof content === 'string') {
      if (content !== '') {
        this.append(this.renderer.createText(content));
      }
    } else {
      this.append(this.createChevron());
    }
  }

  private append(...nodes: Node[]): void {
    for (const node of nodes) {
      this.renderer.appendChild(this.host, node);
    }
    this.renderedNodes = nodes;
  }

  private clear(): void {
    if (this.renderedView) {
      this.appRef.detachView(this.renderedView);
      this.renderedView.destroy();
      this.renderedView = undefined;
    }
    for (const node of this.renderedNodes) {
      if (node.parentNode === this.host) {
        this.renderer.removeChild(this.host, node);
      }
    }
    this.renderedNodes = [];
  }

  private createChevron(): Node {
    const svg = this.renderer.createElement('svg', SVG_NS);
    this.renderer.setAttribute(
      svg,
      'class',
      'andes-breadcrumb-separator__icon',
    );
    this.renderer.setAttribute(svg, 'viewBox', '0 0 24 24');
    this.renderer.setAttribute(svg, 'fill', 'none');
    this.renderer.setAttribute(svg, 'stroke', 'currentColor');
    this.renderer.setAttribute(svg, 'stroke-width', '2');
    this.renderer.setAttribute(svg, 'stroke-linecap', 'round');
    this.renderer.setAttribute(svg, 'stroke-linejoin', 'round');
    // Explicit size, not left to `.andes-breadcrumb-separator__icon` in breadcrumb.css alone:
    // an unsized `<svg>` is a replaced element that falls back to the browser's default
    // replaced-element size (~300x150px) the instant it renders, before any stylesheet has
    // necessarily been applied - setting it here guarantees the icon is never briefly (or, if
    // the stylesheet somehow failed to load, permanently) oversized.
    this.renderer.setAttribute(svg, 'width', '14');
    this.renderer.setAttribute(svg, 'height', '14');

    const path = this.renderer.createElement('path', SVG_NS);
    this.renderer.setAttribute(path, 'd', 'm9 18 6-6-6-6');
    this.renderer.appendChild(svg, path);
    return svg;
  }
}

/**
 * One crumb hidden behind an `AndesBreadcrumbEllipsis`, as passed to its `items` input - the
 * same shape as a crumb's dropdown `menu` entry.
 */
export type AndesBreadcrumbEllipsisItem = AndesBreadcrumbMenuItem;

/** @internal Payload of `AndesBreadcrumbDropdown`'s `(selected)`. */
interface AndesBreadcrumbDropdownSelection {
  readonly item: AndesBreadcrumbMenuItem;
  readonly event: MouseEvent;
}

/**
 * @internal A trigger `<button>` (whose content is projected) opening an `AndesDropdownMenu` of
 * `AndesBreadcrumbMenuItem`s. Shared by the ellipsis and by `[items]` crumbs that have a `menu`,
 * so both get the same entry rendering and the same click/keyboard activation rules. Not exported
 * from the package: consumers compose `AndesDropdownMenu` themselves for anything bespoke.
 *
 * The dropdown is deliberately assembled from the public `AndesDropdownMenu` parts rather than a
 * bespoke popup: dismissal (Escape, outside click), positioning, focus return to the trigger and
 * arrow-key/typeahead navigation all come from the shared `@andes-ng/primitives` overlay + listbox
 * primitives that component already wires together, so Breadcrumb adds no behavior of its own.
 *
 * Every entry renders an inner element - an `<a>` for an `href` entry, a `<span>` otherwise - and
 * that element's `click` is the single place an activation is reported, so consumers always get a
 * real `MouseEvent` (and can `preventDefault()` an `href` entry to route it themselves).
 */
@Component({
  selector: 'andes-breadcrumb-dropdown',
  imports: [
    AndesDropdownMenu,
    AndesDropdownMenuTrigger,
    AndesDropdownMenuContent,
    AndesDropdownMenuItem,
    AndesBreadcrumbLink,
  ],
  template: `
    <andes-dropdown-menu>
      <button
        type="button"
        andesDropdownMenuTrigger
        [class]="triggerClass()"
        [attr.aria-current]="current() ? 'page' : null"
      >
        <ng-content />
      </button>
      <andes-dropdown-menu-content>
        @for (entry of items(); track $index) {
          <!-- The two branches differ only by the inner element, but cannot be collapsed into
               one item with a conditional child: a template reference variable declared inside
               an @if block is scoped to that block, so #target would be out of scope for the
               (activated) binding if that binding sat on a shared parent outside it. -->
          @if (entry.href) {
            <andes-dropdown-menu-item
              [disabled]="entry.disabled ?? false"
              [typeaheadLabel]="entry.label"
              (activated)="onActivated(target)"
            >
              <a
                #target
                andesBreadcrumbLink
                class="andes-breadcrumb-menu-entry"
                tabindex="-1"
                [href]="entry.href"
                (click)="onEntryClick(entry, $event)"
                >{{ entry.label }}</a
              >
            </andes-dropdown-menu-item>
          } @else {
            <andes-dropdown-menu-item
              [disabled]="entry.disabled ?? false"
              [typeaheadLabel]="entry.label"
              (activated)="onActivated(target)"
            >
              <!-- Keyboard activation (and focus) belongs to the role="menuitem" parent, which
                   forwards Enter/Space here as a click - see onActivated. -->
              <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
              <span
                #target
                class="andes-breadcrumb-menu-entry"
                (click)="onEntryClick(entry, $event)"
                >{{ entry.label }}</span
              >
            </andes-dropdown-menu-item>
          }
        }
      </andes-dropdown-menu-content>
    </andes-dropdown-menu>
  `,
  styleUrl: './breadcrumb.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'andes-breadcrumb-dropdown' },
})
export class AndesBreadcrumbDropdown {
  readonly items = input.required<readonly AndesBreadcrumbMenuItem[]>();
  readonly triggerClass = input('');
  /** Marks the trigger as the current page (a last crumb that has a menu). */
  readonly current = input(false, { transform: booleanAttribute });
  readonly selected = output<AndesBreadcrumbDropdownSelection>();

  /**
   * A real pointer click lands on the inner element first; the SAME click then bubbles to the
   * `role="menuitem"` host, whose own handler fires `activated`. Recording the hit here is what
   * stops `onActivated` from synthesizing a second click on an anchor the browser is already
   * following (which a router directive would see as a duplicate navigation).
   */
  private clickHandled = false;

  protected onEntryClick(
    entry: AndesBreadcrumbMenuItem,
    event: MouseEvent,
  ): void {
    if (entry.disabled) {
      // The menu item already ignores the activation; also keep a disabled `href` entry from
      // navigating natively.
      event.preventDefault();
      return;
    }
    this.clickHandled = true;
    entry.onClick?.(event);
    this.selected.emit({ item: entry, event });
  }

  protected onActivated(target: HTMLElement): void {
    if (this.clickHandled) {
      this.clickHandled = false;
      return;
    }
    // Enter/Space on the focused menu item (or a click on its padding): forward the activation
    // to the inner element so it navigates exactly as a click on it would, including through
    // whatever router directive the consumer put on it. Runs before `AndesDropdownMenuItem`
    // closes the menu, so the element is still in the DOM.
    target.click();
  }
}

/**
 * A collapsed-state indicator for long trails, meant to sit inside an `andesBreadcrumbItem`
 * (`<li andesBreadcrumbItem><andes-breadcrumb-ellipsis /></li>`) - visually a "more" icon with
 * `sr-only` text. `AndesBreadcrumb`'s `maxItems` renders one automatically in `[items]` mode.
 *
 * It has two modes, and which one applies is decided entirely by whether `items` is non-empty, so
 * the interactive mode is purely additive:
 *
 * - **Static (default, `items` empty).** A decorative glyph: `role="presentation"` /
 *   `aria-hidden="true"` on the host make the whole thing invisible to assistive tech (so the
 *   `sr-only` text is not exposed either), matching the upstream shadcn/ui source exactly. This is
 *   still the right mode when the consumer wants to wrap the ellipsis in their OWN
 *   `[andesDropdownMenuTrigger]` and author the menu themselves.
 * - **Interactive (`items` non-empty).** The glyph becomes the trigger of an `AndesDropdownMenu`
 *   listing the hidden crumbs. The decorative `role`/`aria-hidden` are dropped (a focusable
 *   control inside an `aria-hidden` subtree is exactly the "hidden but focusable" error axe flags),
 *   and the `sr-only` text becomes the trigger's accessible name.
 *
 * @example Interactive - the ellipsis owns the menu
 * <li andesBreadcrumbItem>
 *   <andes-breadcrumb-ellipsis [items]="hiddenCrumbs" (itemSelected)="go($event)" />
 * </li>
 */
@Component({
  selector: 'andes-breadcrumb-ellipsis',
  imports: [NgTemplateOutlet, AndesBreadcrumbDropdown],
  template: `
    @if (hasMenu()) {
      <andes-breadcrumb-dropdown
        triggerClass="andes-breadcrumb-ellipsis__trigger"
        [items]="items()"
        (selected)="itemSelected.emit($event.item)"
      >
        <ng-container [ngTemplateOutlet]="glyph" />
        <span class="andes-breadcrumb-ellipsis__sr-only">{{ label() }}</span>
      </andes-breadcrumb-dropdown>
    } @else {
      <ng-container [ngTemplateOutlet]="glyph" />
      <span class="andes-breadcrumb-ellipsis__sr-only">{{ label() }}</span>
    }

    <!-- The glyph lives in a template rather than being written out in both branches above
         because it wraps the component's single ng-content: two ng-content elements with the
         same (default) selector do NOT each get a copy of the projected nodes - the first one in
         template order silently wins, even when @if means it is the branch that never renders. A
         template instantiated from exactly one live branch has no such ambiguity. -->
    <ng-template #glyph>
      <ng-content>
        <svg
          class="andes-breadcrumb-ellipsis__icon"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </ng-content>
    </ng-template>
  `,
  styleUrl: './breadcrumb.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // See the file-level comment above for why breadcrumb.css needs this.
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'andes-breadcrumb-ellipsis',
    // Decorative only while there is nothing to open - see the class comment. `null` removes the
    // attribute entirely rather than writing `role=""`/`aria-hidden="false"`.
    '[attr.role]': 'hasMenu() ? null : "presentation"',
    '[attr.aria-hidden]': 'hasMenu() ? null : true',
  },
})
export class AndesBreadcrumbEllipsis {
  /**
   * The crumbs collapsed behind this "...". Empty (the default) keeps the static, non-interactive
   * glyph; anything else turns it into a dropdown menu trigger.
   */
  readonly items = input<readonly AndesBreadcrumbEllipsisItem[]>([]);

  /**
   * Accessible name of the trigger, and the `sr-only` text of the static glyph. Defaults to
   * `'More'` (the upstream shadcn/ui wording); override it for localization, the same way
   * `AndesBreadcrumb`'s own `aria-label` is overridden.
   */
  readonly label = input('More');

  /** Emits the hidden crumb that was activated, by click, Enter or Space. */
  readonly itemSelected = output<AndesBreadcrumbEllipsisItem>();

  protected readonly hasMenu = computed(() => this.items().length > 0);
}

/** @internal A resolved crumb plus what the root template needs to render it. */
interface CrumbView extends AndesBreadcrumbResolvedCrumb {
  readonly menuItems: readonly AndesBreadcrumbMenuItem[] | undefined;
  readonly context: AndesBreadcrumbItemRenderContext;
}

type NodeView =
  | { readonly kind: 'crumb'; readonly key: string; readonly crumb: CrumbView }
  | {
      readonly kind: 'separator';
      readonly key: string;
      readonly content: AndesBreadcrumbSeparatorContent | undefined;
    }
  | {
      readonly kind: 'ellipsis';
      readonly key: string;
      readonly entries: readonly AndesBreadcrumbMenuItem[];
    };

function optionalNumberAttribute(value: unknown): number | undefined {
  return value === undefined || value === null || value === ''
    ? undefined
    : numberAttribute(value);
}

/**
 * Root of a breadcrumb trail. Renders a `<nav>` landmark, defaulting `aria-label` to
 * `"breadcrumb"` per the ARIA Authoring Practices convention shadcn/ui also
 * follows; override it for localization (e.g. `aria-label="Ruta de navegación"`).
 *
 * Two ways to fill it:
 *
 * - **Projected parts** - author the `<ol andesBreadcrumbList>` yourself (full control, e.g.
 *   `routerLink` on each `<a andesBreadcrumbLink>`).
 * - **`[items]`** - data-driven API: pass an array of crumbs (`title`, `href`/`path`,
 *   `menu`, `onClick`, `className`) and separator entries, and the root renders the list, marks
 *   the last crumb as the current page, and collapses long trails into an ellipsis dropdown when
 *   `maxItems` is set. Projected content is ignored while `items` is set.
 *
 * @example Projected parts
 * <andes-breadcrumb>
 *   <ol andesBreadcrumbList>
 *     <li andesBreadcrumbItem><a andesBreadcrumbLink href="/">Home</a></li>
 *     <li andesBreadcrumbSeparator></li>
 *     <li andesBreadcrumbItem><span andesBreadcrumbPage>Settings</span></li>
 *   </ol>
 * </andes-breadcrumb>
 *
 * @example Items, with router links via `itemRender`
 * <andes-breadcrumb [items]="crumbs" [params]="{ id: 42 }" [itemRender]="crumb" />
 * <ng-template #crumb let-item let-title="title" let-paths="paths" let-last="last">
 *   @if (last) { <span andesBreadcrumbPage>{{ title }}</span> }
 *   @else { <a andesBreadcrumbLink [routerLink]="['/'].concat(paths)">{{ title }}</a> }
 * </ng-template>
 */
@Component({
  selector: 'andes-breadcrumb',
  imports: [
    NgTemplateOutlet,
    AndesBreadcrumbList,
    AndesBreadcrumbItem,
    AndesBreadcrumbLink,
    AndesBreadcrumbPage,
    AndesBreadcrumbSeparator,
    AndesBreadcrumbEllipsis,
    AndesBreadcrumbDropdown,
  ],
  template: `
    <nav [attr.aria-label]="ariaLabel()">
      @if (items() !== undefined) {
        <ol andesBreadcrumbList>
          @for (node of nodes(); track node.key) {
            @if (node.kind === 'separator') {
              <li [andesBreadcrumbSeparator]="node.content ?? ''"></li>
            } @else if (node.kind === 'ellipsis') {
              <li andesBreadcrumbItem>
                <andes-breadcrumb-ellipsis
                  [items]="node.entries"
                  [label]="ellipsisLabel()"
                />
              </li>
            } @else {
              <li andesBreadcrumbItem [class]="node.crumb.item.className ?? ''">
                @if (node.crumb.menuItems) {
                  <andes-breadcrumb-dropdown
                    triggerClass="andes-breadcrumb-menu-trigger"
                    [current]="node.crumb.last"
                    [items]="node.crumb.menuItems"
                    (selected)="
                      onMenuSelected(node.crumb, $event.item, $event.event)
                    "
                  >
                    <ng-container
                      [ngTemplateOutlet]="crumbText"
                      [ngTemplateOutletContext]="{ $implicit: node.crumb }"
                    />
                    @if (dropdownIcon(); as icon) {
                      <ng-container [ngTemplateOutlet]="icon" />
                    } @else {
                      <svg
                        class="andes-breadcrumb-menu-trigger__icon"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    }
                  </andes-breadcrumb-dropdown>
                } @else if (itemRender()) {
                  <ng-container
                    [ngTemplateOutlet]="crumbText"
                    [ngTemplateOutletContext]="{ $implicit: node.crumb }"
                  />
                } @else if (node.crumb.last) {
                  <span andesBreadcrumbPage>{{ node.crumb.title }}</span>
                } @else if (node.crumb.href !== undefined) {
                  <a
                    andesBreadcrumbLink
                    [href]="node.crumb.href"
                    (click)="onCrumbClick(node.crumb, $event)"
                    >{{ node.crumb.title }}</a
                  >
                } @else if (node.crumb.item.onClick) {
                  <button
                    type="button"
                    class="andes-breadcrumb-link andes-breadcrumb-link--button"
                    (click)="onCrumbClick(node.crumb, $event)"
                  >
                    {{ node.crumb.title }}
                  </button>
                } @else {
                  <span class="andes-breadcrumb-text">{{
                    node.crumb.title
                  }}</span>
                }
              </li>
            }
          }
        </ol>
      } @else {
        <ng-content />
      }
    </nav>

    <!-- A crumb's content: the consumer's itemRender template, or its interpolated title. -->
    <ng-template #crumbText let-crumb>
      @if (itemRender(); as render) {
        <ng-container
          [ngTemplateOutlet]="render"
          [ngTemplateOutletContext]="crumb.context"
        />
      } @else {
        {{ crumb.title }}
      }
    </ng-template>
  `,
  styleUrl: './breadcrumb.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // See the file-level comment above for why this can't be the (default) Emulated mode.
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: ANDES_BREADCRUMB,
      useExisting: forwardRef(() => AndesBreadcrumb),
    },
  ],
  host: {
    class: 'andes-breadcrumb',
    // The `aria-label` input is forwarded onto the real `<nav>` in the template below. Without
    // this, Angular would ALSO write the same static/bound value onto this host element (any
    // attribute matching an input's alias lands on both), producing two elements in the a11y
    // tree with the same accessible name - the same pitfall `AndesButton` avoids for its own
    // ARIA inputs (see button.ts).
    '[attr.aria-label]': 'null',
  },
})
export class AndesBreadcrumb implements AndesBreadcrumbContext {
  readonly ariaLabel = input('breadcrumb', { alias: 'aria-label' });

  /**
   * Data-driven crumbs. While set, the root renders the list itself and
   * ignores projected content; leave it unset to author the parts by hand.
   */
  readonly items = input<readonly AndesBreadcrumbItemType[] | undefined>(
    undefined,
  );

  /** Values for `:param` placeholders in `items`' `path`s and `title`s. */
  readonly params = input<AndesBreadcrumbParams>({});

  /**
   * The trail's separator: text (`'/'`, `'>'`) or a template (an icon). Defaults to a chevron;
   * `''` renders none. Applies to `[items]` mode and to every empty `andesBreadcrumbSeparator`
   * in projected mode.
   */
  readonly separator = input<AndesBreadcrumbSeparatorContent | undefined>(
    undefined,
  );

  /**
   * Renders each `[items]` crumb's content instead of the default link/page - typically
   * to use `routerLink`. Receives `AndesBreadcrumbItemRenderContext`.
   * The template owns the whole crumb, so it also decides how the `last` one looks (use
   * `andesBreadcrumbPage` for `aria-current`) and handles its own clicks.
   */
  readonly itemRender = input<
    TemplateRef<AndesBreadcrumbItemRenderContext> | undefined
  >(undefined);

  /** Replaces the caret of crumbs that have a `menu`. */
  readonly dropdownIcon = input<TemplateRef<unknown> | undefined>(undefined);

  /**
   * Collapses the middle of the trail into an ellipsis dropdown when there are more than this
   * many crumbs. Unset (the default) never collapses.
   */
  readonly maxItems = input<number | undefined, unknown>(undefined, {
    transform: optionalNumberAttribute,
  });

  /** Crumbs kept before the ellipsis when collapsed. Default `1`. */
  readonly itemsBeforeCollapse = input(1, { transform: numberAttribute });

  /** Crumbs kept after the ellipsis when collapsed. Default `1`. */
  readonly itemsAfterCollapse = input(1, { transform: numberAttribute });

  /** Accessible name of the collapse ellipsis. Defaults to `'More'`. */
  readonly ellipsisLabel = input('More');

  /**
   * Emits when a default-rendered `[items]` crumb is clicked - including from the collapse
   * ellipsis' dropdown. Fires after the item's own `onClick`.
   */
  readonly itemClick = output<AndesBreadcrumbItemClickEvent>();

  /** Emits when an entry of a crumb's `menu` is activated. Fires after the entry's `onClick`. */
  readonly menuClick = output<AndesBreadcrumbMenuClickEvent>();

  protected readonly nodes = computed<NodeView[]>(() => {
    const items = this.items() ?? [];
    const params = this.params();
    const view = (crumb: AndesBreadcrumbResolvedCrumb): CrumbView => ({
      ...crumb,
      menuItems: crumb.item.menu?.items.length
        ? crumb.item.menu.items
        : undefined,
      context: {
        $implicit: crumb.item,
        item: crumb.item,
        title: crumb.title,
        params,
        items,
        paths: crumb.paths,
        href: crumb.href,
        last: crumb.last,
        hasMenu: !!crumb.item.menu?.items.length,
      },
    });

    return buildBreadcrumbNodes(items, params, this.separator(), {
      maxItems: this.maxItems(),
      itemsBeforeCollapse: this.itemsBeforeCollapse(),
      itemsAfterCollapse: this.itemsAfterCollapse(),
    }).map((node): NodeView => {
      switch (node.kind) {
        case 'crumb':
          return { ...node, crumb: view(node.crumb) };
        case 'ellipsis':
          return {
            kind: 'ellipsis',
            key: node.key,
            entries: node.hidden.map((crumb) => ({
              label: crumb.title,
              href: crumb.href,
              onClick: (event: MouseEvent) => this.onCrumbClick(crumb, event),
            })),
          };
        default:
          return node;
      }
    });
  });

  protected onCrumbClick(
    crumb: AndesBreadcrumbResolvedCrumb,
    event: MouseEvent,
  ): void {
    crumb.item.onClick?.(event);
    this.itemClick.emit({ item: crumb.item, index: crumb.index, event });
  }

  protected onMenuSelected(
    crumb: AndesBreadcrumbResolvedCrumb,
    menuItem: AndesBreadcrumbMenuItem,
    event: MouseEvent,
  ): void {
    this.menuClick.emit({ item: crumb.item, menuItem, event });
  }
}
