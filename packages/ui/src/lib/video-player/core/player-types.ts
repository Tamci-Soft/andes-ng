/** One playable source. `type` is the MIME type; leave it out to infer it from the extension. */
export interface AndesMediaSource {
  readonly src: string;
  readonly type?: string;
  /** A media query the source is meant for (e.g. a smaller file under `(max-width: 600px)`). */
  readonly media?: string;
}

/** A `<track>` rendered inside the media element. */
export interface AndesMediaTrack {
  readonly src: string;
  readonly kind:
    'subtitles' | 'captions' | 'chapters' | 'descriptions' | 'metadata';
  /** BCP 47 language tag of the track text (`en`, `es-PE`...). */
  readonly srclang?: string;
  /** Name shown in the captions menu. Falls back to the language tag. */
  readonly label?: string;
  /** Selected when the viewer has no remembered caption choice. */
  readonly default?: boolean;
}

/** A continuous `[start, end]` window in seconds, as read from a `TimeRanges` object. */
export interface AndesTimeRange {
  readonly start: number;
  readonly end: number;
}

/** How the stream behaves in time: a file, a live stream, or a live stream with a seekable window. */
export type AndesStreamType = 'unknown' | 'on-demand' | 'live' | 'live-dvr';

/** A subtitle or caption track the viewer can turn on. */
export interface AndesTextTrackInfo {
  /** Stable key of the track within the current source. */
  readonly id: string;
  readonly kind: 'subtitles' | 'captions';
  readonly label: string;
  readonly language: string;
  /** Whether the track asked to be on by default. */
  readonly default?: boolean;
}

/** An alternative audio track (another language, commentary, audio description). */
export interface AndesAudioTrackInfo {
  readonly id: string;
  readonly label: string;
  readonly language: string;
  readonly kind?: string;
}

/** One video rendition the adaptive engine can switch to. */
export interface AndesQualityRendition {
  readonly id: string;
  /** Visible label. Defaults to `<height>p` when left out. */
  readonly label?: string;
  readonly width?: number;
  readonly height?: number;
  /** Bits per second. */
  readonly bitrate?: number;
}

/** A named section of the timeline. */
export interface AndesChapter {
  readonly start: number;
  readonly end: number;
  readonly title: string;
}

/** One timeline preview image: a tile of a sprite (or a whole image) shown for `[start, end)`. */
export interface AndesThumbnail {
  readonly start: number;
  readonly end: number;
  readonly src: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Where timeline previews come from: a WebVTT storyboard (each cue's text is
 * `image.jpg#xywh=x,y,w,h`), or one sprite sheet cut into a regular grid.
 */
export type AndesThumbnailsConfig =
  | { readonly src: string }
  | {
      readonly src: string;
      readonly width: number;
      readonly height: number;
      readonly columns: number;
      /** Seconds covered by each tile. */
      readonly interval: number;
      /** Number of tiles in the sheet; defaults to as many as the duration needs. */
      readonly count?: number;
    };

/** Friendly error codes; the labels object maps each one to a message. */
export type AndesPlayerErrorCode =
  'aborted' | 'network' | 'decode' | 'unsupported' | 'adapter' | 'unknown';

export interface AndesPlayerError {
  readonly code: AndesPlayerErrorCode;
  /** The friendly message from the labels. */
  readonly message: string;
  /** The browser's or the adapter's own detail, for logs. */
  readonly detail?: string;
  /** The `MediaError.code` (1-4) when the error came from the media element. */
  readonly mediaErrorCode?: number;
  readonly cause?: unknown;
}

/** Media Session metadata; `title` falls back to the player's `title` input. */
export interface AndesPlayerMetadata {
  readonly title?: string;
  readonly artist?: string;
  readonly album?: string;
  readonly artwork?: readonly { src: string; sizes?: string; type?: string }[];
}

/** What a transient on-screen indicator shows. */
export type AndesPlayerFeedbackKind =
  | 'play'
  | 'pause'
  | 'volume'
  | 'mute'
  | 'seek-forward'
  | 'seek-backward'
  | 'rate'
  | 'captions'
  | 'frame'
  | 'chapter'
  | 'repeat'
  | 'link';

export interface AndesPlayerFeedback {
  readonly kind: AndesPlayerFeedbackKind;
  /** Text shown with the icon (`+10s`, `60%`, `1.5×`). */
  readonly text?: string;
  /** Which side a double-tap seek ripple sits on. */
  readonly side?: 'start' | 'end';
  /** Increments on each new indicator so an identical one restarts its animation. */
  readonly id: number;
}

/** Where a state change came from; only some origins are announced to assistive tech. */
export type AndesPlayerChangeOrigin =
  'api' | 'control' | 'slider' | 'hotkey' | 'gesture' | 'media';

/** The remote playback (casting) connection state. */
export type AndesRemotePlaybackState =
  'disconnected' | 'connecting' | 'connected';

/** Which built-in chrome the player renders. */
export type AndesPlayerControls = 'default' | 'minimal' | 'none';

/** Control size: bar buttons of 32/40/48px (24/32px in the compact density). */
export type AndesPlayerSize = 'sm' | 'md' | 'lg';

export type AndesPlayerSkin = 'glass' | 'solid';

/** Where hotkeys listen: only while focus is inside the player, the whole page, or nowhere. */
export type AndesPlayerHotkeysMode = 'focus' | 'global' | 'off';

/** How captions are drawn: an overlay styled by CSS variables, or the browser's own renderer. */
export type AndesCaptionsRenderer = 'overlay' | 'native';

/** `'auto'` (from the video's own size once known) or a ratio such as `'16/9'`, `'4/3'`, `'9/16'`. */
export type AndesPlayerAspectRatio = string;

export type AndesPlayerObjectFit = 'contain' | 'cover' | 'fill';

/**
 * One entry of a playlist. Only a source is required; everything else falls back to the
 * player's own inputs (so a playlist of plain URLs still gets the player's `tracks` and poster).
 */
export interface AndesPlaylistItem {
  /** Stable key; defaults to the source URL. */
  readonly id?: string;
  /** One media URL (its type is inferred from the extension). Ignored when `sources` is set. */
  readonly src?: string;
  readonly sources?: readonly AndesMediaSource[];
  readonly title?: string;
  readonly poster?: string;
  readonly tracks?: readonly AndesMediaTrack[];
  readonly thumbnails?: AndesThumbnailsConfig | null;
  readonly chapters?: readonly AndesChapter[] | null;
  /** Media Session metadata for this entry (`title` falls back to the entry's `title`). */
  readonly metadata?: AndesPlayerMetadata;
  /** Seconds, shown next to the title in the playlist menu before the media loads. */
  readonly duration?: number;
}

/**
 * What happens when an entry ends: `off` stops after the last entry, `all` wraps around to the
 * first one, `one` replays the current entry (the single-video loop).
 */
export type AndesPlayerRepeat = 'off' | 'all' | 'one';

/** Where the viewer left off, offered when the same source loads again (`persistKey`). */
export type AndesPlayerResume = 'prompt' | 'auto' | 'off';

/** Caption text sizes, as a percentage of the player's caption size. */
export type AndesCaptionSize = 50 | 75 | 100 | 150 | 200;

/** Named caption colours (they map to fixed, high-contrast values). */
export type AndesCaptionColor =
  'white' | 'yellow' | 'green' | 'cyan' | 'blue' | 'magenta' | 'red' | 'black';

/** How caption letters are outlined against the picture. */
export type AndesCaptionEdge =
  'none' | 'shadow' | 'raised' | 'depressed' | 'outline';

export type AndesCaptionFont = 'default' | 'sans-serif' | 'serif' | 'monospace';

/** Caption background opacity, percent. */
export type AndesCaptionOpacity = 0 | 25 | 50 | 75 | 100;

/**
 * The viewer's caption appearance. `null` fields keep the theme's own value (the
 * `--andes-video-captions-*` variables), so an app's styling stays until the viewer changes it.
 */
export interface AndesCaptionStyle {
  readonly size: AndesCaptionSize | null;
  readonly color: AndesCaptionColor | null;
  readonly background: AndesCaptionColor | null;
  readonly backgroundOpacity: AndesCaptionOpacity | null;
  readonly edge: AndesCaptionEdge | null;
  readonly font: AndesCaptionFont | null;
}
