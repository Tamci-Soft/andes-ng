import type { AndesPlayerLabels } from './player-labels';
import type { AndesPlayerError, AndesPlayerErrorCode } from './player-types';

/** `MediaError.code` (1-4) to the friendly code. */
export function errorCodeFromMediaError(
  code: number | undefined,
): AndesPlayerErrorCode {
  switch (code) {
    case 1:
      return 'aborted';
    case 2:
      return 'network';
    case 3:
      return 'decode';
    case 4:
      return 'unsupported';
    default:
      return 'unknown';
  }
}

/** Builds the player error for a code, with its message from the labels. */
export function createPlayerError(
  code: AndesPlayerErrorCode,
  labels: AndesPlayerLabels,
  extra: Omit<Partial<AndesPlayerError>, 'code' | 'message'> = {},
): AndesPlayerError {
  return { code, message: labels.errors[code], ...extra };
}

/** The player error for whatever the media element reports in `error`. */
export function playerErrorFromMedia(
  media: HTMLMediaElement,
  labels: AndesPlayerLabels,
): AndesPlayerError {
  const mediaError = media.error;
  return createPlayerError(errorCodeFromMediaError(mediaError?.code), labels, {
    mediaErrorCode: mediaError?.code,
    detail: mediaError?.message || undefined,
    cause: mediaError ?? undefined,
  });
}
