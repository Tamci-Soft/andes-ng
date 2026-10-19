import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { AndesPlayerStore } from './core/player-store';
import { AndesPlayerMenu } from './menus/player-menu';
import {
  AndesPlayerCaptionsButton,
  AndesPlayerFullscreenButton,
  AndesPlayerLiveButton,
  AndesPlayerMuteButton,
  AndesPlayerPipButton,
  AndesPlayerPlayButton,
  AndesPlayerRemoteButton,
  AndesPlayerSeekButton,
} from './parts/buttons';
import { AndesPlayerTimeDisplay } from './parts/displays';
import {
  AndesPlayerNextButton,
  AndesPlayerPreviousButton,
} from './parts/playlist-parts';
import { AndesPlayerTimeSlider } from './parts/time-slider';
import { AndesPlayerVolumeSlider } from './parts/volume-slider';

/** Arrangement of the default control bar. */
export type AndesPlayerBarLayout = 'default' | 'minimal' | 'audio';

/**
 * The player's default control bar, composed from the same public parts an app can arrange
 * itself. `default`: seek bar above one row of controls. `minimal`: one row with the essentials.
 * `audio`: a compact row for audio-only players. Playlist controls (previous, next, the playlist
 * menu) appear only with a playlist. Hovering it keeps the controls from auto-hiding.
 */
@Component({
  selector: 'andes-player-control-bar',
  imports: [
    AndesPlayerPlayButton,
    AndesPlayerMuteButton,
    AndesPlayerVolumeSlider,
    AndesPlayerSeekButton,
    AndesPlayerTimeSlider,
    AndesPlayerTimeDisplay,
    AndesPlayerLiveButton,
    AndesPlayerCaptionsButton,
    AndesPlayerMenu,
    AndesPlayerPipButton,
    AndesPlayerRemoteButton,
    AndesPlayerFullscreenButton,
    AndesPlayerPreviousButton,
    AndesPlayerNextButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-bar',
    'data-slot': 'control-bar',
    '[attr.data-layout]': 'layout()',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'store.pointerOverControls.set(false)',
  },
  template: `
    @switch (layout()) {
      @case ('minimal') {
        <div class="andes-player-bar__row">
          <andes-player-play-button />
          <andes-player-time-slider class="andes-player-bar__grow" />
          <andes-player-live-button />
          <andes-player-time type="remaining" />
          <andes-player-mute-button class="andes-player-bar__push" />
          <andes-player-fullscreen-button />
        </div>
      }
      @case ('audio') {
        <div class="andes-player-bar__row">
          <andes-player-previous-button class="andes-player-bar__optional" />
          <andes-player-play-button />
          <andes-player-next-button class="andes-player-bar__optional" />
          <andes-player-time type="current" />
          <andes-player-time-slider class="andes-player-bar__grow" />
          <andes-player-live-button />
          <andes-player-time type="duration" />
          <div class="andes-player-bar__volume">
            <andes-player-mute-button />
            <andes-player-volume-slider />
          </div>
          <andes-player-menu type="settings" />
          <andes-player-remote-button />
        </div>
      }
      @default {
        <andes-player-time-slider />
        <div class="andes-player-bar__row">
          <div class="andes-player-bar__group">
            <andes-player-previous-button />
            <andes-player-play-button />
            <andes-player-next-button />
            <andes-player-seek-button
              class="andes-player-bar__optional"
              [seconds]="-seekStep()"
            />
            <andes-player-seek-button
              class="andes-player-bar__optional"
              [seconds]="seekStep()"
            />
            <div class="andes-player-bar__volume">
              <andes-player-mute-button />
              <andes-player-volume-slider />
            </div>
            <andes-player-live-button />
            <andes-player-time />
            @if (store.currentChapter(); as chapter) {
              <span class="andes-player-bar__chapter" data-slot="chapter-title">
                <span class="andes-player-sr-only">{{
                  store.labels().chapter
                }}</span>
                {{ chapter.title }}
              </span>
            }
          </div>
          <div class="andes-player-bar__group andes-player-bar__group--end">
            <andes-player-captions-button />
            <andes-player-menu type="settings" />
            <andes-player-menu type="playlist" />
            <andes-player-pip-button class="andes-player-bar__optional" />
            <andes-player-remote-button />
            <andes-player-fullscreen-button />
          </div>
        </div>
      }
    }
  `,
})
export class AndesPlayerControlBar {
  protected readonly store = inject(AndesPlayerStore);

  readonly layout = input<AndesPlayerBarLayout>('default');

  protected readonly seekStep = computed(
    () => this.store.config().seekStepLarge,
  );

  protected onPointerEnter(event: PointerEvent): void {
    // A finger resting on the bar is a tap, not hovering; only mice and pens hold it open.
    if (event.pointerType !== 'touch') {
      this.store.pointerOverControls.set(true);
    }
  }
}
