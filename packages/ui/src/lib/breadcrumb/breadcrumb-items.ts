import type { TemplateRef } from '@angular/core';

/**
 * Data model behind `AndesBreadcrumb`'s `[items]` input - the data-driven way to build a trail.
 * Kept in its own file, free of any Angular runtime import, so the path,
 * params and collapse rules below are plain functions that can be unit-tested without a TestBed.
 */

/** Content a separator can render: plain text, or a template for icons/markup. */
export type AndesBreadcrumbSeparatorContent = string | TemplateRef<unknown>;

/** Route parameters interpolated into `path` segments and `title`s (`:id` -> `params.id`). */
export type AndesBreadcrumbParams = Readonly<
  Record<string, string | number | null | undefined>
>;

/**
 * One entry of a crumb's dropdown menu, and of the ellipsis dropdown that lists collapsed crumbs.
 *
 * A plain data shape rather than projected markup: the caller already holds these as data (a route
 * array, a `menu.items` list from a config) and would otherwise have to re-author each of them
 * as a `<andes-dropdown-menu-item>` by hand.
 */
export interface AndesBreadcrumbMenuItem {
  /** Visible text of the entry, also used for typeahead. */
  readonly label: string;
  /**
   * Target of the hyperlink. When set, the entry renders an `<a>` so it keeps real link semantics
   * (middle-click, "copy link address", browser status bar); when omitted, the entry is text-only
   * and navigation is left to `onClick` / the outputs.
   */
  readonly href?: string;
  /** Whether the entry is present but not selectable. */
  readonly disabled?: boolean;
  /**
   * Called when the entry is activated by click, Enter or Space. Always receives a real
   * `MouseEvent` (keyboard activation is forwarded as a click on the entry), so
   * `event.preventDefault()` cancels an `href` entry's native navigation - e.g. to hand it to a
   * router instead.
   */
  readonly onClick?: (event: MouseEvent) => void;
}

/** A crumb of the `[items]` input. */
export interface AndesBreadcrumbRouteItem {
  readonly type?: 'item';
  /** Visible text. `:param` placeholders are replaced from the root's `params`. */
  readonly title?: string;
  /** Target of the crumb's link. Ignored when `path` is set. */
  readonly href?: string;
  /**
   * A path segment joined onto the segments of every previous item that has one, so
   * `[{path: 'users'}, {path: ':id'}]` links to `/users` and `/users/42`. `:param` placeholders are
   * replaced from `params`. Takes precedence over `href`.
   */
  readonly path?: string;
  /** Turns the crumb into a dropdown trigger (label + caret) listing `menu.items`. */
  readonly menu?: { readonly items: readonly AndesBreadcrumbMenuItem[] };
  /** Called when the crumb (or its entry in the collapsed ellipsis menu) is clicked. */
  readonly onClick?: (event: MouseEvent) => void;
  /** Extra class(es) for the crumb's `<li>`. */
  readonly className?: string;
  /** Stable identity for `@for` tracking. Defaults to the item's index. */
  readonly key?: string | number;
}

/**
 * An explicit separator entry. It replaces the automatic separator
 * that would otherwise sit at that position, which is how one position gets a different glyph.
 */
export interface AndesBreadcrumbSeparatorItem {
  readonly type: 'separator';
  /** Defaults to the root's `separator` (or the chevron). */
  readonly separator?: AndesBreadcrumbSeparatorContent;
}

export type AndesBreadcrumbItemType =
  AndesBreadcrumbRouteItem | AndesBreadcrumbSeparatorItem;

/** Template context of the root's `itemRender` template. */
export interface AndesBreadcrumbItemRenderContext {
  /** The crumb being rendered. */
  readonly $implicit: AndesBreadcrumbRouteItem;
  readonly item: AndesBreadcrumbRouteItem;
  /** `title` with `:param` placeholders already replaced. */
  readonly title: string;
  /** The root's `params`. */
  readonly params: AndesBreadcrumbParams;
  /** The root's whole `items` array. */
  readonly items: readonly AndesBreadcrumbItemType[];
  /**
   * Interpolated path segments of this crumb and every one before it that has a `path` - join
   * them for a `routerLink` (`'/' + paths.join('/')`, or pass the array with a leading `'/'`).
   */
  readonly paths: readonly string[];
  /** The resolved link target (`path`-derived or `href`), if any. */
  readonly href: string | undefined;
  /** Whether this is the last crumb, i.e. the current page. */
  readonly last: boolean;
  /**
   * Whether the crumb has a `menu`. Its rendered content then sits INSIDE the dropdown's trigger
   * `<button>`, so render text rather than a link there.
   */
  readonly hasMenu: boolean;
}

/** Click payload of the root's `(itemClick)` output. */
export interface AndesBreadcrumbItemClickEvent {
  readonly item: AndesBreadcrumbRouteItem;
  /** Index of the item in `items`. */
  readonly index: number;
  readonly event: MouseEvent;
}

/** Payload of the root's `(menuClick)` output. */
export interface AndesBreadcrumbMenuClickEvent {
  /** The crumb whose menu the entry belongs to. */
  readonly item: AndesBreadcrumbRouteItem;
  readonly menuItem: AndesBreadcrumbMenuItem;
  readonly event: MouseEvent;
}

/** @internal One crumb after path/params resolution. */
export interface AndesBreadcrumbResolvedCrumb {
  readonly item: AndesBreadcrumbRouteItem;
  readonly index: number;
  readonly key: string | number;
  readonly title: string;
  readonly href: string | undefined;
  readonly paths: readonly string[];
  readonly last: boolean;
}

/** @internal A node of the rendered `<ol>`, in order. */
export type AndesBreadcrumbNode =
  | {
      readonly kind: 'crumb';
      readonly key: string;
      readonly crumb: AndesBreadcrumbResolvedCrumb;
    }
  | {
      readonly kind: 'separator';
      readonly key: string;
      readonly content: AndesBreadcrumbSeparatorContent | undefined;
    }
  | {
      readonly kind: 'ellipsis';
      readonly key: string;
      readonly hidden: readonly AndesBreadcrumbResolvedCrumb[];
    };

/** @internal Collapse configuration, as read from the root's inputs. */
export interface AndesBreadcrumbCollapseOptions {
  readonly maxItems: number | undefined;
  readonly itemsBeforeCollapse: number;
  readonly itemsAfterCollapse: number;
}

export function isSeparatorItem(
  item: AndesBreadcrumbItemType,
): item is AndesBreadcrumbSeparatorItem {
  return item.type === 'separator';
}

/**
 * Replaces every `:key` whose `key` is present in `params` - unknown placeholders are left as
 * written, so a literal `:` in a title survives.
 */
export function interpolateBreadcrumbParams(
  text: string,
  params: AndesBreadcrumbParams,
): string {
  return text.replace(/:([A-Za-z_$][\w$]*)/g, (match, key: string) => {
    const value = Object.prototype.hasOwnProperty.call(params, key)
      ? params[key]
      : undefined;
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Resolves `items` into the ordered nodes the root template renders: crumbs with their
 * interpolated title/href, automatic separators between consecutive crumbs (unless an explicit
 * separator entry already sits there), and - when there are more than `maxItems` crumbs - an
 * ellipsis standing in for the middle ones.
 *
 * `path` hrefs are root-relative (`/a/b`): Angular apps use path-location routing by default,
 * and anyone on a hash strategy renders `routerLink`s through
 * `itemRender` anyway.
 */
export function buildBreadcrumbNodes(
  items: readonly AndesBreadcrumbItemType[],
  params: AndesBreadcrumbParams,
  separator: AndesBreadcrumbSeparatorContent | undefined,
  collapse: AndesBreadcrumbCollapseOptions,
): AndesBreadcrumbNode[] {
  const lastCrumbIndex = findLastCrumbIndex(items);
  const paths: string[] = [];

  interface Segment {
    readonly crumb: AndesBreadcrumbResolvedCrumb;
    /** Explicit separator entries between the previous crumb and this one. */
    readonly before: readonly AndesBreadcrumbSeparatorItem[];
  }
  const segments: Segment[] = [];
  let pending: AndesBreadcrumbSeparatorItem[] = [];

  items.forEach((item, index) => {
    if (isSeparatorItem(item)) {
      pending.push(item);
      return;
    }

    let href = item.href;
    if (item.path !== undefined) {
      // An empty segment (`path: ''`, typically the root crumb) links to `/` but adds nothing to
      // `paths`, so `['/', ...paths]` stays a valid `routerLink` command array.
      const segment = interpolateBreadcrumbParams(item.path, params).replace(
        /^\/+|\/+$/g,
        '',
      );
      if (segment !== '') {
        paths.push(segment);
      }
      href = '/' + paths.join('/');
    }

    segments.push({
      crumb: {
        item,
        index,
        key: item.key ?? index,
        title: interpolateBreadcrumbParams(item.title ?? '', params),
        href,
        paths: [...paths],
        last: index === lastCrumbIndex,
      },
      before: pending,
    });
    pending = [];
  });

  const nodes: AndesBreadcrumbNode[] = [];
  const pushSeparators = (
    explicit: readonly AndesBreadcrumbSeparatorItem[],
    auto: boolean,
    keyBase: string,
  ) => {
    if (explicit.length > 0) {
      explicit.forEach((entry, i) =>
        nodes.push({
          kind: 'separator',
          key: `${keyBase}-${i}`,
          content: entry.separator ?? separator,
        }),
      );
    } else if (auto && separator !== '') {
      nodes.push({ kind: 'separator', key: keyBase, content: separator });
    }
  };

  const { maxItems } = collapse;
  const before = Math.max(0, Math.floor(collapse.itemsBeforeCollapse));
  const after = Math.max(0, Math.floor(collapse.itemsAfterCollapse));
  // Collapsing only pays off when it hides at least one crumb; `before + after` crumbs stay visible.
  const collapsed =
    maxItems !== undefined &&
    maxItems > 0 &&
    segments.length > maxItems &&
    before + after < segments.length;

  segments.forEach((segment, i) => {
    if (collapsed && i >= before && i < segments.length - after) {
      if (i === before) {
        pushSeparators(segment.before, i > 0, `sep-${segment.crumb.key}`);
        nodes.push({
          kind: 'ellipsis',
          key: 'ellipsis',
          hidden: segments
            .slice(before, segments.length - after)
            .map((hidden) => hidden.crumb),
        });
      }
      return;
    }
    pushSeparators(segment.before, i > 0, `sep-${segment.crumb.key}`);
    nodes.push({
      kind: 'crumb',
      key: `crumb-${segment.crumb.key}`,
      crumb: segment.crumb,
    });
  });
  // Separator entries after the last crumb are rendered as written, not dropped.
  pushSeparators(pending, false, 'sep-trailing');

  return nodes;
}

function findLastCrumbIndex(items: readonly AndesBreadcrumbItemType[]): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (!isSeparatorItem(items[i])) {
      return i;
    }
  }
  return -1;
}
