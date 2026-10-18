import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type AndesUploadIconName =
  | 'upload'
  | 'cloud-upload'
  | 'plus'
  | 'paperclip'
  | 'file'
  | 'image'
  | 'eye'
  | 'download'
  | 'trash'
  | 'x'
  | 'retry'
  | 'alert';

/** 24x24 stroke paths, one string per sub-path. */
const PATHS: Readonly<Record<AndesUploadIconName, readonly string[]>> = {
  upload: ['M12 16V4', 'm7 9 5-5 5 5', 'M4 20h16'],
  'cloud-upload': [
    'M12 13v8',
    'm8 17 4-4 4 4',
    'M20 16.5A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9',
  ],
  plus: ['M5 12h14', 'M12 5v14'],
  paperclip: [
    'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48',
  ],
  file: [
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
    'M14 2v6h6',
  ],
  image: [
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
    'M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
    'm21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21',
  ],
  eye: [
    'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z',
    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  ],
  download: [
    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    'm7 10 5 5 5-5',
    'M12 15V3',
  ],
  trash: [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    'M10 11v6',
    'M14 11v6',
  ],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  retry: ['M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', 'M21 3v5h-5'],
  alert: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 8v4', 'M12 16h.01'],
};

/** The control's own icons, drawn inline so it needs no icon font or asset. Decorative. */
@Component({
  selector: 'andes-upload-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      width: 1em;
      height: 1em;
    }
    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.75;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
  template: `<svg viewBox="0 0 24 24" focusable="false">
    @for (path of paths(); track path) {
      <path [attr.d]="path" />
    }
  </svg>`,
})
export class AndesUploadIcon {
  readonly name = input.required<AndesUploadIconName>();

  protected readonly paths = computed(() => PATHS[this.name()]);
}
