import { ChangeDetectionStrategy, Component } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';

const QUICK_START = `import { AndesVideoPlayer } from '@andes-ng/ui';

@Component({
  imports: [AndesVideoPlayer],
  template: \`
    <andes-video-player
      src="/media/talk.mp4"
      poster="/media/talk.jpg"
      title="Quarterly review"
      [tracks]="[{ kind: 'captions', src: '/media/talk.en.vtt', srclang: 'en', label: 'English', default: true }]"
      [thumbnails]="{ src: '/media/talk.thumbnails.vtt' }"
      persistKey="talks"
      [(currentTime)]="position"
      (completed)="markWatched()"
    />
  \`,
})
export class TalkPage {
  position = 0;
  markWatched() {}
}`;

const CUSTOM = `<andes-video-player [sources]="sources" controls="none">
  <!-- slot="controls" content sits where the default bar would, and auto-hides with it -->
  <div slot="controls" class="my-bar">
    <andes-player-time-slider />
    <div class="my-row">
      <andes-player-play-button />
      <andes-player-seek-button seconds="-15" />
      <andes-player-seek-button seconds="15" />
      <andes-player-time type="remaining" />
      <span class="spacer"></span>
      <andes-player-mute-button />
      <andes-player-volume-slider />
      <andes-player-menu type="captions" />
      <andes-player-menu type="playback-rate" />
      <andes-player-fullscreen-button />
    </div>
  </div>
</andes-video-player>

// Any component placed inside the player can inject the same store the parts use:
@Component({ selector: 'app-chapter-jump', template: '<button (click)="next()">Next chapter</button>' })
export class ChapterJump {
  private readonly store = inject(AndesPlayerStore);
  next() {
    const now = this.store.currentTime();
    const chapter = this.store.chapters().find((c) => c.start > now + 0.5);
    if (chapter) this.store.seek(chapter.start, 'control');
  }
}`;

const ADAPTER = `import {
  type AndesMediaAdapter,
  type AndesMediaAdapterHooks,
  type AndesMediaSource,
  provideAndesMediaAdapters,
} from '@andes-ng/ui';
// Your MSE-based streaming engine (the application's own dependency, never bundled by Andes).
import { StreamingEngine } from 'your-streaming-engine';

export class StreamingAdapter implements AndesMediaAdapter {
  readonly name = 'streaming';
  private engine: StreamingEngine | null = null;

  canPlay(source: AndesMediaSource): boolean {
    const type = source.type ?? '';
    // Leave HLS to browsers that play it natively; take it (and DASH) everywhere else.
    const nativeHls = document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '';
    return (type === 'application/vnd.apple.mpegurl' && !nativeHls) || type === 'application/dash+xml';
  }

  async attach(media: HTMLMediaElement, source: AndesMediaSource, hooks: AndesMediaAdapterHooks) {
    const engine = (this.engine = new StreamingEngine());
    engine.on('levels', (levels) =>
      hooks.setQualities(levels.map((l) => ({ id: String(l.id), height: l.height, bitrate: l.bitrate }))),
    );
    engine.on('level-switched', (id, auto) => hooks.setActiveQuality(String(id), auto));
    engine.on('audio-tracks', (tracks) =>
      hooks.setAudioTracks(tracks.map((t) => ({ id: String(t.id), label: t.name, language: t.lang }))),
    );
    engine.on('live', (info) =>
      hooks.setLive({ streamType: info.window > 60 ? 'live-dvr' : 'live', liveEdge: info.edge, liveEdgeTolerance: 3 * info.targetDuration }),
    );
    engine.on('error', (e) => hooks.reportError({ code: e.network ? 'network' : 'adapter', fatal: e.fatal, cause: e }));
    await engine.load(source.src, media); // the engine feeds the element through MediaSource
  }

  detach(): void {
    this.engine?.destroy();
    this.engine = null;
  }

  selectQuality(id: string | 'auto'): void {
    this.engine?.setLevel(id === 'auto' ? -1 : Number(id));
  }

  selectAudioTrack(id: string): void {
    this.engine?.setAudioTrack(Number(id));
  }
}

// app.config.ts: tried in order before the native adapter, one instance per player.
export const appConfig = { providers: [provideAndesMediaAdapters(() => new StreamingAdapter())] };`;

const LABELS = `import { provideAndesPlayerLabels } from '@andes-ng/ui';

providers: [
  provideAndesPlayerLabels({
    play: 'Reproducir',
    pause: 'Pausar',
    seekValueText: (current, duration) => \`\${current.spoken} de \${duration.spoken}\`,
    hours: (n) => (n === 1 ? '1 hora' : \`\${n} horas\`),
    minutes: (n) => (n === 1 ? '1 minuto' : \`\${n} minutos\`),
    seconds: (n) => (n === 1 ? '1 segundo' : \`\${n} segundos\`),
    errors: { network: 'Un problema de red interrumpió la descarga.' },
  }),
]
// Or per player: <andes-video-player [labels]="spanish" />`;

const THEME = `.course-player {
  --andes-video-radius: 0;
  --andes-video-accent: var(--andes-color-success);
  --andes-video-captions-font-size: 1.25rem;
  --andes-video-captions-background: transparent;
  --andes-video-captions-color: #fff;
  --andes-video-captions-bottom: 10%;
}`;

const VARIABLES: [string, string][] = [
  [
    '--andes-video-radius',
    'Corner radius of the player (fullscreen drops it).',
  ],
  ['--andes-video-backdrop', 'Letterbox colour behind the picture.'],
  ['--andes-video-control-color', 'Icons and text over the picture.'],
  ['--andes-video-control-hover / -active', 'Button hover and press fills.'],
  [
    '--andes-video-scrim',
    'Gradient behind the title and the bar (glass skin), big play fill.',
  ],
  ['--andes-video-bar-background', 'Bar fill of the solid skin.'],
  [
    '--andes-video-accent',
    'Progress, volume level, pressed toggles, checked items.',
  ],
  ['--andes-video-track / -buffered', 'Slider track and buffered range.'],
  [
    '--andes-video-focus-ring',
    'Focus outline colour (focus-ring token by default).',
  ],
  [
    '--andes-video-button-size / -icon-size',
    'Bar control size (set by size and compact).',
  ],
  ['--andes-video-gap / -bar-padding', 'Spacing in the bar.'],
  ['--andes-video-big-play-size', 'Diameter of the centred play button.'],
  [
    '--andes-video-menu-background / -foreground / -width',
    'Menu surface (popover tokens).',
  ],
  [
    '--andes-video-tooltip-background / -foreground',
    'Tooltip and preview labels.',
  ],
  [
    '--andes-video-captions-font-size / -font-family / -color / -background',
    'Caption text.',
  ],
  [
    '--andes-video-captions-bottom / -lift',
    'Caption position, and how far it rises over the bar.',
  ],
  [
    '--andes-video-enter-duration / -exit-duration / -enter-ease / -exit-ease',
    'Motion.',
  ],
  ['--andes-video-glass-blur', 'Backdrop blur of glass surfaces.'],
];

const KEYS: [string, string][] = [
  ['Space, K', 'Play / pause'],
  ['M', 'Mute / unmute'],
  ['F', 'Full screen'],
  ['Esc', 'Leave full screen'],
  ['← / →', 'Seek 5 seconds'],
  ['J / L, Shift+← / Shift+→', 'Seek 10 seconds'],
  ['Home / End', 'Start / end (End jumps to live on live streams)'],
  ['0 – 9', 'Jump to 0% – 90%'],
  ['↑ / ↓', 'Volume ±5%'],
  ['< / >', 'Slower / faster through the speed list'],
  ['C', 'Captions on / off (remembers the language)'],
  ['I', 'Picture in picture'],
];

@Component({
  selector: 'andes-video-player-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      max-width: 860px;
      font-family: var(--andes-font-family), sans-serif;
      font-size: 0.875rem;
      line-height: 1.375rem;
      color: var(--andes-color-foreground);
    }
    h1 {
      font-size: 1.5rem;
      line-height: 2rem;
      margin: 0 0 0.5rem;
    }
    h2 {
      font-size: 1rem;
      line-height: 1.5rem;
      margin: 2rem 0 0.5rem;
      font-weight: 600;
    }
    p,
    li {
      margin: 0 0 0.5rem;
    }
    pre {
      margin: 0.5rem 0 1rem;
      padding: 0.75rem 1rem;
      overflow: auto;
      border: 1px solid var(--andes-color-border);
      border-radius: var(--andes-radius-md);
      background: var(--andes-color-muted);
      font-family: var(--andes-font-family-mono), monospace;
      font-size: 0.75rem;
      line-height: 1.25rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.5rem 0 1rem;
    }
    th,
    td {
      text-align: start;
      padding: 0.375rem 0.5rem;
      border-bottom: 1px solid var(--andes-color-border);
      vertical-align: top;
    }
    th {
      font-weight: 600;
    }
    code {
      font-family: var(--andes-font-family-mono), monospace;
      font-size: 0.75rem;
    }
  `,
  template: `
    <h1>Video player guide</h1>
    <p>
      <code>andes-video-player</code> plays video and audio, on demand and live,
      on top of the native media element. Every control is a standalone part
      driven by one signal store, so the default bar and an app's own layout
      behave the same.
    </p>

    <h2>Quick start</h2>
    <pre><code>{{ quickStart }}</code></pre>
    <p>
      Sources: <code>src</code> (type inferred from the extension) or
      <code>sources</code> (<code>src</code>, <code>type</code>,
      <code>media</code>; the first matching, playable one wins). Two-way:
      <code>currentTime</code>, <code>volume</code>, <code>muted</code>,
      <code>paused</code>, <code>playbackRate</code>. Outputs avoid native event
      names: <code>played</code>, <code>completed</code>, <code>failed</code>,
      <code>metadataLoaded</code>, <code>bufferingChanged</code>,
      <code>fullscreenChanged</code>, <code>pictureInPictureChanged</code>,
      <code>captionsChanged</code>, <code>qualityChanged</code>,
      <code>previousRequested</code>, <code>nextRequested</code>. Methods:
      <code>play()</code>, <code>pause()</code>, <code>togglePlay()</code>,
      <code>load()</code>, <code>seek()</code>, <code>seekBy()</code>,
      <code>retry()</code>, full screen and picture-in-picture,
      <code>captureFrame()</code>, <code>focus()</code>.
    </p>

    <h2>Composing your own controls</h2>
    <p>
      Set <code>controls="none"</code> and project parts with
      <code>slot="controls"</code> (or <code>slot="top"</code> next to the
      title). Parts: play, mute, volume slider, seek bar, time, seek buttons,
      live badge, captions toggle, menus (<code>settings</code>,
      <code>playback-rate</code>, <code>captions</code>, <code>audio</code>,
      <code>quality</code>), picture-in-picture, remote playback, full screen,
      big play, poster, buffering, feedback, error panel, title and the tooltip
      directive.
    </p>
    <pre><code>{{ custom }}</code></pre>

    <h2>Adaptive streaming adapters</h2>
    <p>
      The player ships the native adapter only: it plays whatever the browser
      plays (MP4, WebM, Ogg, audio files, and HLS where the browser supports it
      natively). An application plugs in an MSE-based engine with an
      <code>AndesMediaAdapter</code>: <code>canPlay</code> claims sources,
      <code>attach</code> loads one into the element and reports renditions,
      audio and text tracks, live state and errors through the hooks,
      <code>detach</code> tears it down. Factories are registered with
      <code>provideAndesMediaAdapters()</code> or the
      <code>adapters</code> input. <code>resolveMimeType()</code> maps file
      extensions to types.
    </p>
    <pre><code>{{ adapter }}</code></pre>

    <h2>Live and DVR</h2>
    <p>
      A stream is live when its duration is infinite (or the adapter says so),
      with a DVR window when the seekable range spans at least a minute. The
      seek bar then covers that window, the live badge shows whether playback is
      at the edge (within <code>liveEdgeTolerance</code> seconds) and jumps back
      to it, and the time display shows how far behind live the viewer is. Pure
      live streams have no seek bar and no duration. Force a type with
      <code>streamType</code>.
    </p>

    <h2>Captions</h2>
    <p>
      Captions come from native <code>&lt;track&gt;</code> elements (the
      <code>tracks</code> input) or from an adapter. By default the player draws
      the active cues itself (<code>captionsRenderer="overlay"</code>), so they
      can be styled and rise above the visible bar; <code>"native"</code> leaves
      drawing to the browser, which reads the same colour and size variables
      through <code>::cue</code>. The choice (language or off) is remembered
      across sources, and across visits with <code>persistKey</code>. Chapters
      come from a <code>chapters</code> track or the
      <code>chapters</code> input; storyboard previews from
      <code>thumbnails</code> (a WebVTT sprite map, or a regular grid).
    </p>

    <h2>Theming</h2>
    <p>
      The look is tokens plus <code>--andes-video-*</code> variables, in light
      and dark. Inputs: <code>skin</code> (glass / solid),
      <code>size</code> (bar buttons 32 / 40 / 48px), <code>compact</code> (24 /
      32px), <code>aspectRatio</code>, <code>objectFit</code>,
      <code>audioOnly</code>, <code>background</code>.
    </p>
    <table>
      <thead>
        <tr>
          <th>Variable</th>
          <th>What it styles</th>
        </tr>
      </thead>
      <tbody>
        @for (row of variables; track row[0]) {
          <tr>
            <td>
              <code>{{ row[0] }}</code>
            </td>
            <td>{{ row[1] }}</td>
          </tr>
        }
      </tbody>
    </table>
    <pre><code>{{ theme }}</code></pre>

    <h2>Keyboard</h2>
    <p>
      Hotkeys work while focus is in the player (<code>hotkeys="focus"</code>,
      default), page-wide (<code>"global"</code>) or not at all
      (<code>"off"</code>); <code>keyMap</code> overrides any action. They never
      take keys from text fields, menus, sliders (arrows) or buttons
      (Space/Enter), and are published in <code>aria-keyshortcuts</code>.
    </p>
    <table>
      <thead>
        <tr>
          <th>Keys</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        @for (row of keys; track row[0]) {
          <tr>
            <td>{{ row[0] }}</td>
            <td>{{ row[1] }}</td>
          </tr>
        }
      </tbody>
    </table>
    <p>
      Touch: a tap shows or hides the controls, a double tap on the left or
      right third seeks 10 seconds (in the middle it plays or pauses). Mouse: a
      click plays or pauses, a double click toggles full screen.
    </p>

    <h2>Accessibility</h2>
    <ul>
      <li>
        The player is a labelled region; the native element stays the media
        element.
      </li>
      <li>
        Every control is a real button or a WAI-ARIA slider; the seek bar's
        value text is spoken ("1 minute 5 seconds of 3 minutes 20 seconds");
        menus are menus of radio items.
      </li>
      <li>
        A polite live region announces play, pause, mute, volume, speed,
        captions, quality, full screen and errors caused by the viewer, never
        while scrubbing.
      </li>
      <li>
        Hidden controls stay focusable and reappear on focus; focus is never
        trapped; menus return focus to their button.
      </li>
      <li>
        Reduced motion removes scaling and sliding and holds background video
        still; forced-colours mode keeps sliders and focus visible with system
        colours.
      </li>
      <li>
        The seek bar keeps a left-to-right time axis in right-to-left pages;
        menus and chevrons mirror.
      </li>
    </ul>

    <h2>Labels and i18n</h2>
    <pre><code>{{ labels }}</code></pre>
  `,
})
class VideoPlayerGuide {
  protected readonly quickStart = QUICK_START;
  protected readonly custom = CUSTOM;
  protected readonly adapter = ADAPTER;
  protected readonly labels = LABELS;
  protected readonly theme = THEME;
  protected readonly variables = VARIABLES;
  protected readonly keys = KEYS;
}

const meta: Meta = {
  title: 'Video Player Guide',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;

/** Quick start, custom controls, adapters, live, captions, theming, keyboard, accessibility, i18n. */
export const Guide: StoryObj = {
  render: () => ({
    moduleMetadata: { imports: [VideoPlayerGuide] },
    template: `<andes-video-player-guide />`,
  }),
};
