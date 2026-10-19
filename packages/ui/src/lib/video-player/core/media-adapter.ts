import { InjectionToken, type Provider } from '@angular/core';

import type {
  AndesAudioTrackInfo,
  AndesMediaSource,
  AndesPlayerErrorCode,
  AndesQualityRendition,
  AndesStreamType,
  AndesTextTrackInfo,
} from './player-types';

/** Live details an adaptive engine knows better than the media element. */
export interface AndesLiveInfo {
  readonly streamType: AndesStreamType;
  /** Latest playable position in seconds; defaults to the end of the seekable range. */
  readonly liveEdge?: number;
  /** How close to the edge still counts as "live", in seconds (e.g. three segment durations). */
  readonly liveEdgeTolerance?: number;
}

/** An error reported by an adapter. Non-fatal errors are logged into `detail` only. */
export interface AndesAdapterError {
  readonly code?: AndesPlayerErrorCode;
  readonly detail?: string;
  /** Fatal errors stop playback and show the error panel. Defaults to `true`. */
  readonly fatal?: boolean;
  readonly cause?: unknown;
}

/**
 * Callbacks the player hands to an adapter on `attach`. The adapter calls them whenever its
 * engine learns something: the player store turns each call into signal state the controls read.
 */
export interface AndesMediaAdapterHooks {
  /** Video renditions; an empty list hides the quality menu. */
  setQualities(renditions: readonly AndesQualityRendition[]): void;
  /** The rendition playing now; `auto` = the engine is choosing by itself. */
  setActiveQuality(id: string | null, auto: boolean): void;
  /** Alternative audio tracks; an adapter that reports none leaves native tracks in charge. */
  setAudioTracks(tracks: readonly AndesAudioTrackInfo[]): void;
  setActiveAudioTrack(id: string | null): void;
  /** Subtitle tracks carried by the stream itself (not `<track>` elements). */
  setTextTracks(tracks: readonly AndesTextTrackInfo[]): void;
  setActiveTextTrack(id: string | null): void;
  setLive(info: AndesLiveInfo): void;
  reportError(error: AndesAdapterError): void;
}

/**
 * The contract between the player and a playback engine. The player always owns a native
 * `<video>`/`<audio>` element; an adapter decides how a source gets into it. The built-in
 * native adapter just sets `src`. An adaptive streaming adapter (an MSE-based engine such as the
 * application's own streaming library) creates its engine in `attach`, feeds the element from it,
 * reports renditions/tracks/live state through the hooks, and tears everything down in `detach`.
 *
 * One adapter instance serves one player at a time: register factories, not instances.
 */
export interface AndesMediaAdapter {
  /** Short name for logs and `data-adapter` (e.g. `native`). */
  readonly name: string;
  /** Whether this adapter should play the source. Checked in registration order. */
  canPlay(source: AndesMediaSource): boolean;
  /** Starts loading the source into the element. May be async; a rejection becomes an error. */
  attach(
    media: HTMLMediaElement,
    source: AndesMediaSource,
    hooks: AndesMediaAdapterHooks,
  ): void | Promise<void>;
  /** Stops the engine and releases the element (the player clears `src` afterwards). */
  detach(): void;
  selectQuality?(id: string | 'auto'): void;
  selectAudioTrack?(id: string): void;
  selectTextTrack?(id: string | null): void;
}

/** Creates one adapter for one player. */
export type AndesMediaAdapterFactory = () => AndesMediaAdapter;

/**
 * Adapter factories available to every player below this injector, tried in order before the
 * native adapter. Prefer `provideAndesMediaAdapters()`.
 */
export const ANDES_MEDIA_ADAPTERS = new InjectionToken<
  readonly AndesMediaAdapterFactory[]
>('ANDES_MEDIA_ADAPTERS');

/** Registers adapter factories (tried in the order given, before the native adapter). */
export function provideAndesMediaAdapters(
  ...factories: AndesMediaAdapterFactory[]
): Provider {
  return { provide: ANDES_MEDIA_ADAPTERS, useValue: factories };
}

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  m3u8: 'application/vnd.apple.mpegurl',
  mpd: 'application/dash+xml',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  weba: 'audio/webm',
};

/**
 * The MIME type for a media URL, from its file extension (query and hash ignored). Returns
 * `undefined` for an unknown extension. `audio` picks the audio type for ambiguous containers
 * (`.ogg`, `.webm`, `.mp4`).
 */
export function resolveMimeType(
  src: string,
  audio = false,
): string | undefined {
  const path = src.split(/[?#]/, 1)[0] ?? '';
  const match = /\.([a-z0-9]+)$/i.exec(path);
  if (!match) {
    return undefined;
  }
  const extension = match[1].toLowerCase();
  const type = MIME_BY_EXTENSION[extension];
  if (audio && type?.startsWith('video/')) {
    return type === 'video/quicktime' ? type : type.replace('video/', 'audio/');
  }
  return type;
}

/** Whether a MIME type names an HLS playlist (which some browsers play natively). */
export function isHlsType(type: string | undefined): boolean {
  return (
    type === 'application/vnd.apple.mpegurl' ||
    type === 'application/x-mpegurl' ||
    type === 'audio/mpegurl'
  );
}

/**
 * The built-in adapter: hands the URL to the media element. Plays everything the browser plays
 * by itself, including HLS where the browser supports it natively.
 */
export class AndesNativeMediaAdapter implements AndesMediaAdapter {
  readonly name = 'native';
  private media: HTMLMediaElement | null = null;

  canPlay(source: AndesMediaSource): boolean {
    const type = source.type ?? resolveMimeType(source.src);
    if (!type) {
      // Unknown extension: let the browser try.
      return true;
    }
    if (typeof document === 'undefined') {
      return false;
    }
    const probe = document.createElement('video');
    return typeof probe.canPlayType === 'function'
      ? probe.canPlayType(type) !== ''
      : !isHlsType(type);
  }

  attach(media: HTMLMediaElement, source: AndesMediaSource): void {
    this.media = media;
    media.src = source.src;
    // The element would load on its own after `src` changes; an explicit load also resets a
    // previous error so a retry starts clean.
    try {
      media.load?.();
    } catch {
      // Environments without a media pipeline: the `src` change is all there is.
    }
  }

  detach(): void {
    const media = this.media;
    this.media = null;
    if (!media) {
      return;
    }
    media.removeAttribute('src');
    try {
      media.load?.();
    } catch {
      // Some environments have no media pipeline to reset; detaching is best effort.
    }
  }
}

/** The source to play from a list: the first whose `media` query matches (or has none). */
export function pickSource(
  sources: readonly AndesMediaSource[],
  matches: (query: string) => boolean,
): AndesMediaSource[] {
  return sources.filter((source) => !source.media || matches(source.media));
}
