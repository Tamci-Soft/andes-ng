import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Glyphs the image and preview draw. */
export type AndesImageIconName =
  | 'zoomIn'
  | 'zoomOut'
  | 'rotateLeft'
  | 'rotateRight'
  | 'flipX'
  | 'flipY'
  | 'reset'
  | 'download'
  | 'close'
  | 'previous'
  | 'next'
  | 'eye'
  | 'imageOff';

/**
 * Decorative 24px stroke icon. Inline SVG keeps the image component free of an icon-font or
 * icon-library dependency; the host is always `aria-hidden`.
 */
@Component({
  selector: 'andes-image-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (name()) {
        @case ('zoomIn') {
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
        }
        @case ('zoomOut') {
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3M8 11h6" />
        }
        @case ('rotateLeft') {
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        }
        @case ('rotateRight') {
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        }
        @case ('flipX') {
          <path
            d="m3 7 5 5-5 5V7M21 7l-5 5 5 5V7M12 20v2M12 14v2M12 8v2M12 2v2"
          />
        }
        @case ('flipY') {
          <path
            d="m17 3-5 5-5-5h10M17 21l-5-5-5 5h10M4 12H2M10 12H8M16 12h-2M22 12h-2"
          />
        }
        @case ('reset') {
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        }
        @case ('download') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m7 10 5 5 5-5M12 15V3" />
        }
        @case ('close') {
          <path d="M18 6 6 18M6 6l12 12" />
        }
        @case ('previous') {
          <path d="m15 18-6-6 6-6" />
        }
        @case ('next') {
          <path d="m9 18 6-6-6-6" />
        }
        @case ('eye') {
          <path
            d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"
          />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('imageOff') {
          <path d="m2 2 20 20M10.41 10.41a2 2 0 1 1-2.83-2.83M13.5 13.5 6 21" />
          <path
            d="M18 12l3 3M3.59 3.59A2 2 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59M21 15V5a2 2 0 0 0-2-2H9"
          />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1em;
      height: 1em;
      flex: none;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class AndesImageIcon {
  readonly name = input.required<AndesImageIconName>();
}
