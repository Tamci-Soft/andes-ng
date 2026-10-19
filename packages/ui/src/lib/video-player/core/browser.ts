/**
 * Typed access to the vendor-prefixed and newer media APIs that the DOM typings leave out. Every
 * helper tolerates the API being absent, so callers never need their own feature checks.
 */

interface PrefixedDocument {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface PrefixedElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface PrefixedVideo {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
  webkitDisplayingFullscreen?: boolean;
  webkitShowPlaybackTargetPicker?: () => void;
}

/** A native `AudioTrack` (only some browsers expose `HTMLMediaElement.audioTracks`). */
export interface NativeAudioTrack {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  enabled: boolean;
}

export interface NativeAudioTrackList extends EventTarget {
  readonly length: number;
  [index: number]: NativeAudioTrack;
}

export function fullscreenElement(doc: Document): Element | null {
  return (
    doc.fullscreenElement ??
    (doc as unknown as PrefixedDocument).webkitFullscreenElement ??
    null
  );
}

export function fullscreenEnabled(doc: Document): boolean {
  return Boolean(
    doc.fullscreenEnabled ??
    (doc as unknown as PrefixedDocument).webkitFullscreenEnabled,
  );
}

export async function requestElementFullscreen(
  element: HTMLElement,
): Promise<boolean> {
  const prefixed = element as unknown as PrefixedElement;
  if (typeof element.requestFullscreen === 'function') {
    await element.requestFullscreen({ navigationUI: 'hide' });
    return true;
  }
  if (typeof prefixed.webkitRequestFullscreen === 'function') {
    await prefixed.webkitRequestFullscreen();
    return true;
  }
  return false;
}

export async function exitDocumentFullscreen(doc: Document): Promise<void> {
  const prefixed = doc as unknown as PrefixedDocument;
  if (typeof doc.exitFullscreen === 'function') {
    await doc.exitFullscreen();
  } else if (typeof prefixed.webkitExitFullscreen === 'function') {
    await prefixed.webkitExitFullscreen();
  }
}

/** The element-level fullscreen of phones that cannot put arbitrary elements in fullscreen. */
export function videoFullscreen(media: HTMLMediaElement | null): {
  supported: boolean;
  active: boolean;
  enter(): void;
  exit(): void;
} {
  const video = (media ?? {}) as PrefixedVideo;
  return {
    supported:
      typeof video.webkitEnterFullscreen === 'function' &&
      video.webkitSupportsFullscreen !== false,
    active: Boolean(video.webkitDisplayingFullscreen),
    enter: () => video.webkitEnterFullscreen?.(),
    exit: () => video.webkitExitFullscreen?.(),
  };
}

export function showPlaybackTargetPicker(media: HTMLMediaElement): boolean {
  const video = media as unknown as PrefixedVideo;
  if (typeof video.webkitShowPlaybackTargetPicker === 'function') {
    video.webkitShowPlaybackTargetPicker();
    return true;
  }
  return false;
}

export function hasPlaybackTargetPicker(media: HTMLMediaElement): boolean {
  return (
    typeof (media as unknown as PrefixedVideo)
      .webkitShowPlaybackTargetPicker === 'function'
  );
}

export function nativeAudioTracks(
  media: HTMLMediaElement,
): NativeAudioTrackList | null {
  const list = (media as unknown as { audioTracks?: NativeAudioTrackList })
    .audioTracks;
  return list && typeof list.length === 'number' ? list : null;
}

/** `screen.orientation.lock`, which only some browsers implement (and only in fullscreen). */
export async function lockOrientation(
  view: Window | null,
  orientation: 'landscape' | 'portrait',
): Promise<boolean> {
  const screenOrientation = view?.screen?.orientation as
    (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
  if (typeof screenOrientation?.lock !== 'function') {
    return false;
  }
  try {
    await screenOrientation.lock(orientation);
    return true;
  } catch {
    return false;
  }
}

export function unlockOrientation(view: Window | null): void {
  try {
    view?.screen?.orientation?.unlock?.();
  } catch {
    // Unlocking an orientation that was never locked throws in some browsers.
  }
}

/** Converts a `TimeRanges` object to plain ranges. */
export function readTimeRanges(
  ranges: TimeRanges | null | undefined,
): { start: number; end: number }[] {
  const result: { start: number; end: number }[] = [];
  if (!ranges) {
    return result;
  }
  for (let index = 0; index < ranges.length; index++) {
    result.push({ start: ranges.start(index), end: ranges.end(index) });
  }
  return result;
}

/** Whether the `matches` call of a CSS selector works (`:focus-visible` is missing in old engines). */
export function safeMatches(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}
