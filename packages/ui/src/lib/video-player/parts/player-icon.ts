import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/** A 24x24 icon: filled shapes, stroked lines (2px, round), and an optional centred label. */
interface IconShape {
  readonly fill?: readonly string[];
  readonly stroke?: readonly string[];
}

const SPEAKER =
  'M4 9.5v5a1 1 0 0 0 1 1h3l4.3 3.6a.6.6 0 0 0 1-.46V5.36a.6.6 0 0 0-1-.46L8 8.5H5a1 1 0 0 0-1 1Z';

const ICONS = {
  // The triangle's area centroid sits on the box centre (x = 12), not its bounding box: a
  // right-pointing triangle centred by its box looks shifted towards its tip. Every play
  // button, large or small, then looks centred without per-size nudges.
  play: {
    fill: [
      'M7.5 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.02 4.29A1 1 0 0 0 7.5 5.14Z',
    ],
  },
  pause: {
    fill: [
      'M7 5h3.2a.8.8 0 0 1 .8.8v12.4a.8.8 0 0 1-.8.8H7a.8.8 0 0 1-.8-.8V5.8A.8.8 0 0 1 7 5Zm6.8 0H17a.8.8 0 0 1 .8.8v12.4a.8.8 0 0 1-.8.8h-3.2a.8.8 0 0 1-.8-.8V5.8a.8.8 0 0 1 .8-.8Z',
    ],
  },
  replay: { stroke: ['M4.5 12a7.5 7.5 0 1 0 2.2-5.3', 'M4.5 4.5v4h4'] },
  'volume-high': {
    fill: [SPEAKER],
    stroke: ['M16.5 9a4 4 0 0 1 0 6', 'M19 6.5a7.5 7.5 0 0 1 0 11'],
  },
  'volume-low': { fill: [SPEAKER], stroke: ['M16.5 9a4 4 0 0 1 0 6'] },
  'volume-muted': {
    fill: [SPEAKER],
    stroke: ['M16.5 9.5l5 5', 'M21.5 9.5l-5 5'],
  },
  fullscreen: {
    stroke: [
      'M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9',
      'M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9',
      'M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15',
      'M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15',
    ],
  },
  'fullscreen-exit': {
    stroke: [
      'M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4',
      'M15 4v3.5A1.5 1.5 0 0 0 16.5 9H20',
      'M20 15h-3.5a1.5 1.5 0 0 0-1.5 1.5V20',
      'M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20',
    ],
  },
  pip: {
    stroke: ['M21 11V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5'],
    fill: [
      'M13 14a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1Z',
    ],
  },
  'pip-exit': {
    stroke: [
      'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
      'M16 9l-5 5',
      'M10.5 10v4.5H15',
    ],
  },
  captions: {
    stroke: [
      'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
      'M10.6 10.3a2.2 2.2 0 1 0 0 3.4',
      'M17.1 10.3a2.2 2.2 0 1 0 0 3.4',
    ],
  },
  settings: {
    stroke: [
      'M4 7h8',
      'M16 7h4',
      'M4 12h3',
      'M11 12h9',
      'M4 17h10',
      'M18 17h2',
      'M14 5v4',
      'M9 10v4',
      'M16 15v4',
    ],
  },
  speed: {
    stroke: ['M5.3 17.5a8 8 0 1 1 13.4 0', 'M12 13.5l3.6-4.2'],
  },
  audio: {
    stroke: ['M4 15v-3a8 8 0 0 1 16 0v3'],
    fill: [
      'M4 14.5A1.5 1.5 0 0 1 5.5 13H7a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 18.5Z',
      'M20 14.5a1.5 1.5 0 0 0-1.5-1.5H17a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1.5a1.5 1.5 0 0 0 1.5-1.5Z',
    ],
  },
  quality: {
    stroke: ['M12 4l8 4-8 4-8-4Z', 'M4 12l8 4 8-4', 'M4 16l8 4 8-4'],
  },
  'seek-backward': {
    stroke: ['M5 12a7 7 0 1 0 2.05-4.95', 'M4.5 3.8v3.7h3.7'],
  },
  'seek-forward': {
    stroke: ['M19 12a7 7 0 1 1-2.05-4.95', 'M19.5 3.8v3.7h-3.7'],
  },
  remote: {
    stroke: [
      'M3 8V6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5H13',
      'M3 12a8 8 0 0 1 8 8',
      'M3 16a4 4 0 0 1 4 4',
      'M3 20h.01',
    ],
  },
  check: { stroke: ['M5 12.5l4.5 4.5L19 7.5'] },
  'chevron-start': { stroke: ['M15 6l-6 6 6 6'] },
  'chevron-end': { stroke: ['M9 6l6 6-6 6'] },
  alert: {
    stroke: [
      'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18Z',
      'M12 7.5v5.5',
      'M12 16.5h.01',
    ],
  },
  previous: {
    fill: [
      'M6 5.5a1 1 0 0 1 2 0v13a1 1 0 0 1-2 0Z',
      'M18 6.9v10.2a.9.9 0 0 1-1.42.74l-7.3-5.1a.9.9 0 0 1 0-1.48l7.3-5.1A.9.9 0 0 1 18 6.9Z',
    ],
  },
  next: {
    fill: [
      'M16 5.5a1 1 0 0 1 2 0v13a1 1 0 0 1-2 0Z',
      'M6 6.9v10.2a.9.9 0 0 0 1.42.74l7.3-5.1a.9.9 0 0 0 0-1.48l-7.3-5.1A.9.9 0 0 0 6 6.9Z',
    ],
  },
  playlist: {
    stroke: ['M4 6h13', 'M4 11h13', 'M4 16h7'],
    fill: [
      'M14.5 14.2v5.6a.6.6 0 0 0 .92.5l4.3-2.8a.6.6 0 0 0 0-1l-4.3-2.8a.6.6 0 0 0-.92.5Z',
    ],
  },
  repeat: {
    stroke: [
      'M17 3l3 3-3 3',
      'M4 12v-1a5 5 0 0 1 5-5h11',
      'M7 21l-3-3 3-3',
      'M20 12v1a5 5 0 0 1-5 5H4',
    ],
  },
  shuffle: {
    stroke: [
      'M16 4h4v4',
      'M4 20L20 4',
      'M20 16v4h-4',
      'M15 15l5 5',
      'M4 4l5 5',
    ],
  },
  'text-size': {
    stroke: [
      'M3 7V5h11v2',
      'M8.5 5v14',
      'M6.5 19h4',
      'M14 13v-1h7v1',
      'M17.5 12v7',
      'M16 19h3',
    ],
  },
  keyboard: {
    stroke: [
      'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
      'M7 9.5h.01',
      'M11 9.5h.01',
      'M15 9.5h.01',
      'M7 12.5h.01',
      'M17 12.5h.01',
      'M8.5 15.5h7',
    ],
  },
  close: { stroke: ['M6 6l12 12', 'M18 6L6 18'] },
  link: {
    stroke: [
      'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1',
      'M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
    ],
  },
  frame: {
    stroke: [
      'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z',
      'M8 4v16',
      'M16 4v16',
    ],
  },
  chapter: {
    stroke: ['M5 4v16', 'M5 5h11l-2.5 4 2.5 4H5'],
  },
  restore: {
    stroke: [
      'M14 4h6v6',
      'M20 4l-7 7',
      'M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5',
    ],
  },
  music: {
    stroke: ['M9 18V6l11-2v12'],
    fill: [
      'M9 18a3 3 0 1 1-6 0a3 3 0 1 1 6 0Z',
      'M20 16a3 3 0 1 1-6 0a3 3 0 1 1 6 0Z',
    ],
  },
} satisfies Record<string, IconShape>;

/** Names of the player's built-in icons. */
export type AndesPlayerIconName = keyof typeof ICONS;

/**
 * One of the player's line icons. Decorative: always `aria-hidden`, the surrounding control
 * carries the accessible name. `chevron-start`/`chevron-end` mirror in right-to-left layouts.
 */
@Component({
  selector: 'andes-player-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-player-icon',
    'aria-hidden': 'true',
    '[attr.data-icon]': 'name()',
  },
  template: `
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      @for (d of shape().fill ?? []; track $index) {
        <path [attr.d]="d" fill="currentColor" />
      }
      @for (d of shape().stroke ?? []; track $index) {
        <path
          [attr.d]="d"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      }
      @if (label(); as text) {
        <text
          x="12"
          y="14.6"
          text-anchor="middle"
          font-size="7"
          font-weight="700"
          fill="currentColor"
        >
          {{ text }}
        </text>
      }
    </svg>
  `,
})
export class AndesPlayerIcon {
  readonly name = input.required<AndesPlayerIconName>();
  /** Short text drawn in the middle (the seconds of a seek icon). */
  readonly label = input<string | number | null>(null);

  protected readonly shape = computed<IconShape>(() => ICONS[this.name()]);
}
