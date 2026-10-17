import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The stylesheet with comments dropped and whitespace collapsed, for contract checks. */
const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'combobox.css'),
  'utf-8',
)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ');

describe('AndesCombobox styles', () => {
  describe('clear button', () => {
    const rule = css.match(/\.andes-combobox-clear \{[^}]*\}/)?.[0] ?? '';

    it('has a 24px hit area that the negative margin takes back out of the layout', () => {
      expect(rule).toContain('padding: calc((1.5rem - 1em) / 2);');
      expect(rule).toContain('margin: calc((1em - 1.5rem) / 2);');
    });

    it('shows on hover or focus-within, and always on devices without hover', () => {
      expect(rule).toContain('visibility: hidden;');
      expect(css).toContain(
        '.andes-combobox-field:hover .andes-combobox-clear, .andes-combobox-field:focus-within .andes-combobox-clear { visibility: visible; }',
      );
      expect(css).toContain(
        '@media (hover: none) { .andes-combobox-clear { visibility: visible; } }',
      );
    });

    it('draws a muted disc with the "x" knocked out, darkening on hover, with a focus ring', () => {
      expect(css).toContain(
        '.andes-combobox-clear__icon circle { fill: currentColor; }',
      );
      expect(css).toContain(
        '.andes-combobox-clear__icon path { fill: none; stroke: var(--andes-color-background);',
      );
      expect(css).toContain(
        '.andes-combobox-clear:hover { color: var(--andes-color-muted-foreground); }',
      );
      expect(css).toContain(
        '.andes-combobox-clear:focus-visible { outline: 2px solid var(--andes-color-focus-ring);',
      );
    });
  });

  describe('popup exit animation', () => {
    it('mirrors the entrance while the overlay marks the popup closing', () => {
      expect(css).toContain(
        '.andes-combobox-content[data-andes-closing] { animation: andes-combobox-exit var(--andes-duration-fast, 120ms) var(--andes-ease-in, ease-in) forwards; }',
      );
      expect(css).toContain(
        '@keyframes andes-combobox-exit { to { opacity: 0; transform: translateY(-0.25rem) scale(0.97); } }',
      );
      expect(css).toContain(
        ".andes-combobox-content[data-side='top'][data-andes-closing] { animation-name: andes-combobox-exit-above; }",
      );
    });

    it('is skipped with reduced motion', () => {
      const reduced =
        css.match(
          /@media \(prefers-reduced-motion: reduce\) \{ \.andes-combobox-content,[^@]*\}\s*\}/,
        )?.[0] ?? '';
      expect(reduced).toContain(
        ".andes-combobox-content[data-andes-closing], .andes-combobox-content[data-side='top'][data-andes-closing] { animation: none; }",
      );
    });

    it('enters with the motion tokens, falling back to their values', () => {
      expect(css).toContain(
        'animation: andes-combobox-enter var(--andes-duration-base, 150ms) var(--andes-ease-out, cubic-bezier(0.2, 0, 0, 1));',
      );
    });
  });
});
