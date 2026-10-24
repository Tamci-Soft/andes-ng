import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The stylesheet with comments dropped and whitespace collapsed, for contract checks. */
const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'date-picker.css'),
  'utf-8',
)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ');

describe('AndesDatePicker styles', () => {
  describe('clear button', () => {
    const rule = css.match(/\.andes-date-picker__clear \{[^}]*\}/)?.[0] ?? '';

    it('is centred over the 1em icon with a 24px hit area outside the layout', () => {
      expect(css).toMatch(
        /\.andes-date-picker__suffix \{[^}]*width: 1em; height: 1em;/,
      );
      expect(rule).toContain('position: absolute;');
      expect(rule).toContain('padding: calc((1.5rem - 1em) / 2);');
      expect(rule).toContain('transform: translate(-50%, -50%);');
    });

    it('swaps with the calendar icon on hover or focus-within, and always shows without hover', () => {
      expect(rule).toContain('visibility: hidden;');
      expect(css).toContain(
        '.andes-date-picker__field:hover .andes-date-picker__clear, .andes-date-picker__field:focus-within .andes-date-picker__clear { visibility: visible; }',
      );
      expect(css).toContain(
        '.andes-date-picker__field:hover .andes-date-picker__icon--hidden-on-hover, .andes-date-picker__field:focus-within .andes-date-picker__icon--hidden-on-hover { visibility: hidden; }',
      );
      expect(css).toContain(
        '@media (hover: none) { .andes-date-picker__clear { visibility: visible; }',
      );
    });

    it('draws a muted disc with the "x" knocked out, with a focus ring', () => {
      expect(css).toContain(
        '.andes-date-picker__clear-glyph circle { fill: currentColor; }',
      );
      expect(css).toContain(
        '.andes-date-picker__clear-glyph path { fill: none; stroke: var(--andes-color-background);',
      );
      expect(css).toContain(
        '.andes-date-picker__clear:focus-visible { outline: 2px solid var(--andes-color-focus-ring);',
      );
    });
  });

  describe('panel motion', () => {
    const motion = css.slice(
      css.indexOf('@media (prefers-reduced-motion: no-preference)'),
    );

    it('animates out, mirroring the entrance, while the overlay marks it closing', () => {
      expect(css).toContain(
        '@keyframes andes-date-picker-panel-exit { from { opacity: 1; transform: none; } to { opacity: 0; transform: scale(0.97); } }',
      );
      expect(motion).toContain(
        '.andes-date-picker__panel[data-andes-closing] { transform-origin: top left; animation: andes-date-picker-panel-exit var(--andes-duration-fast, 120ms) var(--andes-ease-in, ease-in) forwards; }',
      );
    });

    it('only animates when motion is allowed', () => {
      expect(css.indexOf('[data-andes-closing]')).toBeGreaterThan(
        css.indexOf('@media (prefers-reduced-motion: no-preference)'),
      );
    });

    it('uses the shared elevation and motion tokens with their current values as fallbacks', () => {
      expect(css).toContain(
        'box-shadow: var( --andes-shadow-md, 0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%) );',
      );
      expect(motion).toContain(
        'animation: andes-date-picker-panel-enter var(--andes-duration-base, 150ms) var(--andes-ease-out, cubic-bezier(0.2, 0, 0, 1));',
      );
    });
  });
});
