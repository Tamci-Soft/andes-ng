import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { ariaKeyShortcuts, hotkeyHint } from '../core/player-hotkeys';
import { AndesPlayerStore } from '../core/player-store';
import { AndesPlayerIcon } from './player-icon';
import { AndesPlayerTooltip } from './player-tooltip';

let nextUpNextId = 0;

/**
 * Previous entry of the playlist (or back to the start of this one when it is a few seconds
 * in, like a music player). Only present in a playlist of two or more entries.
 */
@Component({
  selector: 'andes-player-previous-button',
  imports: [AndesPlayerIcon, AndesPlayerTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-control',
    '[attr.hidden]': 'store.hasPrevious() ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-button"
      data-slot="previous-button"
      [attr.aria-label]="store.labels().previous"
      [attr.aria-keyshortcuts]="shortcuts()"
      [andesPlayerTooltip]="store.labels().previous"
      [andesPlayerTooltipHint]="hint()"
      (click)="store.previous('control')"
    >
      <andes-player-icon name="previous" />
    </button>
  `,
})
export class AndesPlayerPreviousButton {
  protected readonly store = inject(AndesPlayerStore);
  protected readonly shortcuts = computed(() =>
    ariaKeyShortcuts(this.store.keyMap(), 'previousItem'),
  );
  protected readonly hint = computed(() =>
    hotkeyHint(this.store.keyMap(), 'previousItem'),
  );
}

/**
 * Next entry of the playlist. At the last entry (without `repeat="all"`) it stays visible but
 * reports itself unavailable (`aria-disabled`), so the bar does not shift and keyboard users
 * still find it.
 */
@Component({
  selector: 'andes-player-next-button',
  imports: [AndesPlayerIcon, AndesPlayerTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-control',
    '[attr.hidden]': 'store.playlist().length > 1 ? null : ""',
  },
  template: `
    <button
      type="button"
      class="andes-player-button"
      data-slot="next-button"
      [attr.aria-label]="label()"
      [attr.aria-disabled]="store.hasNext() ? null : 'true'"
      [attr.aria-keyshortcuts]="shortcuts()"
      [andesPlayerTooltip]="label()"
      [andesPlayerTooltipHint]="hint()"
      (click)="store.next('control')"
    >
      <andes-player-icon name="next" />
    </button>
  `,
})
export class AndesPlayerNextButton {
  protected readonly store = inject(AndesPlayerStore);
  /** Names the entry it plays (`Next: Chapter two`), so the destination is known up front. */
  protected readonly label = computed(() => {
    const labels = this.store.labels();
    const index = this.store.nextIndex();
    const item = index === null ? null : this.store.playlist()[index];
    const title = item?.title ?? item?.metadata?.title;
    return title ? `${labels.next}: ${title}` : labels.next;
  });
  protected readonly shortcuts = computed(() =>
    ariaKeyShortcuts(this.store.keyMap(), 'nextItem'),
  );
  protected readonly hint = computed(() =>
    hotkeyHint(this.store.keyMap(), 'nextItem'),
  );
}

/**
 * The "up next" card after an entry ends in a playlist: the next title and poster, a visible
 * countdown, and Play now / Cancel. The live region announces it once (not every second), and
 * it never takes focus: a viewer who walked away is not interrupted, a keyboard user reaches
 * it with Tab.
 */
@Component({
  selector: 'andes-player-up-next',
  imports: [AndesPlayerIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-up-next',
    '[attr.hidden]': 'store.upNext() ? null : ""',
  },
  template: `
    @if (store.upNext(); as upNext) {
      <div
        class="andes-player-up-next__card"
        data-slot="up-next"
        role="group"
        [attr.aria-labelledby]="titleId"
        [style.--andes-player-up-next-duration]="duration() + 's'"
      >
        @if (store.upNextItem()?.poster; as poster) {
          <img
            class="andes-player-up-next__poster"
            [src]="poster"
            alt=""
            decoding="async"
          />
        }
        <div class="andes-player-up-next__text">
          <p class="andes-player-up-next__eyebrow" [id]="titleId">
            {{ store.labels().upNext }}
            <span class="andes-player-sr-only">: {{ title() }}</span>
          </p>
          <p class="andes-player-up-next__title" aria-hidden="true">
            {{ title() }}
          </p>
          <p class="andes-player-up-next__count" aria-hidden="true">
            {{ store.labels().upNextIn(upNext.remaining) }}
          </p>
        </div>
        <div class="andes-player-up-next__actions">
          <button
            type="button"
            class="andes-player-pill andes-player-pill--primary"
            data-slot="up-next-play"
            (click)="store.playUpNextNow('control')"
          >
            <andes-player-icon name="play" />
            {{ store.labels().playNow }}
          </button>
          <button
            type="button"
            class="andes-player-pill"
            data-slot="up-next-cancel"
            (click)="store.cancelUpNext()"
          >
            {{ store.labels().cancel }}
          </button>
        </div>
        <span class="andes-player-up-next__progress" aria-hidden="true"></span>
      </div>
    }
  `,
})
export class AndesPlayerUpNext {
  protected readonly store = inject(AndesPlayerStore);
  protected readonly titleId = `andes-player-up-next-${nextUpNextId++}`;
  protected readonly title = computed(() => {
    const item = this.store.upNextItem();
    const index = this.store.upNext()?.index ?? 0;
    return item?.title ?? item?.metadata?.title ?? `${index + 1}`;
  });
  protected readonly duration = computed(() =>
    Math.max(1, this.store.config().upNextDelay),
  );
}
