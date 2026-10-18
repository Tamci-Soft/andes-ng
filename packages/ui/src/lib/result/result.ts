import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  TemplateRef,
} from '@angular/core';
import clsx from 'clsx';

/**
 * `success`, `error`, `info`, `warning` and `processing` draw a tinted status glyph. `403`,
 * `404` and `500` draw a calm line illustration for the matching error page.
 */
export type AndesResultStatus =
  | 'success'
  | 'error'
  | 'info'
  | 'warning'
  | 'processing'
  | '403'
  | '404'
  | '500';

/** `alert` interrupts assistive tech right away; `status` waits for a pause. */
export type AndesResultRole = 'alert' | 'status';

export type AndesResultTitleLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Context handed to the `icon`, `title` and `subTitle` templates. */
export interface AndesResultTemplateContext {
  $implicit: AndesResultStatus;
  status: AndesResultStatus;
}

/** Text inputs take a plain string for the common case and a template for rich content. */
export type AndesResultContent =
  string | TemplateRef<AndesResultTemplateContext> | null | undefined;

const ILLUSTRATED: readonly AndesResultStatus[] = ['403', '404', '500'];

/**
 * Failures that need attention right now are announced assertively; everything else (a finished
 * job, a missing page, a refused permission the user already knows about) is polite. A route
 * that renders a result on load should not shout over the page title.
 */
const ASSERTIVE: readonly AndesResultStatus[] = ['error', '500'];

/**
 * Outcome of an operation or a page: a status glyph (or an illustration for 403 / 404 / 500), a
 * title, a sub title, an optional body block and a row of follow-up actions.
 *
 * Slots: `[slot=title]`, `[slot=subtitle]`, `[slot=extra]` (actions) and the default slot for
 * the body. Each text input wins over its slot.
 */
@Component({
  selector: 'andes-result',
  imports: [NgTemplateOutlet],
  templateUrl: './result.html',
  styleUrl: './result.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // `role` and `title` are inputs here: forwarded to the inner element in the template, so
    // the host must not carry them too (a second live region, a hover tooltip over the page).
    '[attr.role]': 'null',
    '[attr.title]': 'null',
  },
})
export class AndesResult {
  readonly status = input<AndesResultStatus>('info');
  readonly title = input<AndesResultContent>(undefined);
  readonly subTitle = input<AndesResultContent>(undefined);
  /** Replaces the built-in glyph or illustration. */
  readonly icon = input<TemplateRef<AndesResultTemplateContext> | undefined>(
    undefined,
  );
  /** Overrides the role derived from the status. */
  readonly role = input<AndesResultRole | undefined>(undefined);
  /** The title is exposed as a heading of this level. */
  readonly titleLevel = input<AndesResultTitleLevel>(2);
  /** Tighter padding, for a result placed inside a card or a panel. */
  readonly compact = input(false, { transform: booleanAttribute });

  protected readonly illustrated = computed(() =>
    ILLUSTRATED.includes(this.status()),
  );

  protected readonly resolvedRole = computed<AndesResultRole>(
    () =>
      this.role() ?? (ASSERTIVE.includes(this.status()) ? 'alert' : 'status'),
  );

  protected readonly templateContext = computed(
    (): AndesResultTemplateContext => ({
      $implicit: this.status(),
      status: this.status(),
    }),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-result',
      `andes-result--${this.status()}`,
      this.compact() && 'andes-result--compact',
    ),
  );

  protected asTemplate(
    content: AndesResultContent,
  ): TemplateRef<AndesResultTemplateContext> | null {
    return content instanceof TemplateRef ? content : null;
  }

  protected asText(content: AndesResultContent): string {
    return typeof content === 'string' ? content : '';
  }
}
