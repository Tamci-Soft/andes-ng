import { readFileSync } from 'node:fs';
import { ANDES_THEME_ATTRIBUTE, ANDES_TOKEN_PREFIX } from '../index';

const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

/** The declarations of the first rule whose selector is exactly `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No ${selector} rule in theme.css`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations: Record<string, string> = {};
  for (const part of withoutComments.split(';')) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;
    declarations[part.slice(0, colon).trim()] = part
      .slice(colon + 1)
      .replace(/\s+/g, ' ')
      .trim();
  }
  return declarations;
}

const light = block(':root');
const darkOverrides = block(`[${ANDES_THEME_ATTRIBUTE}='dark']`);
// The dark rule only overrides; anything it leaves out inherits the light value.
const dark = { ...light, ...darkOverrides };

/** A token's value with `var(--other)` references followed, within one theme. */
function resolve(theme: Record<string, string>, name: string): string {
  const value = theme[name];
  if (value === undefined) throw new Error(`${name} is not defined`);
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference ? resolve(theme, reference[1]) : value;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Contrast between two tokens of one theme. */
function tokenContrast(
  theme: Record<string, string>,
  a: string,
  b: string,
): number {
  return contrast(resolve(theme, a), resolve(theme, b));
}

const themes = [
  ['light', light],
  ['dark', dark],
] as const;

const states = ['', '-hover', '-active'] as const;

describe('Andes design tokens', () => {
  it('uses stable, namespaced public identifiers', () => {
    expect(ANDES_TOKEN_PREFIX).toBe('--andes-');
    expect(ANDES_THEME_ATTRIBUTE).toBe('data-andes-theme');
  });

  it('tells the browser which scheme to draw native controls in', () => {
    expect(light['color-scheme']).toBe('light');
    expect(dark['color-scheme']).toBe('dark');
  });

  describe('typography', () => {
    it('puts Geist first and ends every stack in a system font', () => {
      expect(light['--andes-font-family']).toMatch(
        /^'Geist Variable'.*sans-serif$/,
      );
      expect(light['--andes-font-family-mono']).toMatch(
        /^'Geist Mono Variable'.*monospace$/,
      );
    });

    it('pairs every size step with a line height', () => {
      const steps = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      for (const step of steps) {
        expect(light[`--andes-font-size-${step}`]).toMatch(/rem$/);
        expect(light[`--andes-line-height-${step}`]).toMatch(/rem$/);
      }
      expect(light['--andes-font-size-sm']).toBe('0.875rem');
    });

    it('defines the weights from regular to bold', () => {
      expect(
        ['regular', 'medium', 'semibold', 'bold'].map(
          (weight) => light[`--andes-font-weight-${weight}`],
        ),
      ).toEqual(['400', '500', '600', '700']);
    });
  });

  describe('control scale and component text', () => {
    it('sizes controls 24/32/40px and gives them one line height', () => {
      expect(
        ['sm', 'md', 'lg'].map(
          (size) => light[`--andes-control-height-${size}`],
        ),
      ).toEqual(['1.5rem', '2rem', '2.5rem']);
      expect(light['--andes-control-line-height']).toBe('1.375rem');
    });

    it('sets component text at 14px on a 22px line, 16px on large controls', () => {
      expect(resolve(light, '--andes-text-font-size')).toBe('0.875rem');
      expect(light['--andes-text-line-height']).toBe('1.375rem');
      expect(resolve(light, '--andes-control-font-size-md')).toBe('0.875rem');
      expect(resolve(light, '--andes-control-font-size-lg')).toBe('1rem');
    });
  });

  it('defines the elevation scale, deeper in the dark theme', () => {
    // Overlay components inline this light value as their var() fallback.
    expect(light['--andes-shadow-md']).toBe(
      '0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%)',
    );
    for (const size of ['sm', 'md', 'lg']) {
      const name = `--andes-shadow-${size}`;
      expect(light[name]).toBeTruthy();
      expect(dark[name]).toBeTruthy();
      expect(dark[name]).not.toBe(light[name]);
    }
  });

  describe('motion', () => {
    it('defines one set of durations and easings, not themed', () => {
      expect(light).toMatchObject({
        '--andes-motion-duration-fast': '120ms',
        '--andes-motion-duration-mid': '150ms',
        '--andes-motion-duration-slow': '200ms',
        '--andes-motion-ease-out': 'cubic-bezier(0.2, 0, 0, 1)',
        '--andes-motion-ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      });
      expect(light['--andes-motion-ease-in-out']).toMatch(/^cubic-bezier\(/);
      expect(
        Object.keys(darkOverrides).filter((name) =>
          /motion|duration|ease/.test(name),
        ),
      ).toEqual([]);
    });

    it('keeps the shorter names as aliases of the canonical ones', () => {
      expect(light['--andes-duration-fast']).toBe(
        'var(--andes-motion-duration-fast)',
      );
      expect(light['--andes-duration-base']).toBe(
        'var(--andes-motion-duration-mid)',
      );
      expect(light['--andes-duration-slow']).toBe(
        'var(--andes-motion-duration-slow)',
      );
      expect(light['--andes-ease-out']).toBe('var(--andes-motion-ease-out)');
      expect(light['--andes-ease-in']).toBe('var(--andes-motion-ease-in)');
      expect(resolve(light, '--andes-duration-base')).toBe('150ms');
    });
  });

  describe.each(themes)('%s focus halo', (_, t) => {
    it('is a single 2px ring built from the focus ring colour', () => {
      expect(t['--andes-focus-halo']).toMatch(
        /^0 0 0 2px color-mix\(in srgb, var\(--andes-color-focus-ring\) 20%, transparent\)$/,
      );
    });
  });

  it('repeats the colour aliases in the dark rule so they follow the theme anywhere', () => {
    for (const family of ['success', 'info']) {
      for (const state of states) {
        expect(darkOverrides).toHaveProperty(
          `--andes-color-${family}-solid${state}`,
        );
      }
    }
    expect(darkOverrides).toHaveProperty('--andes-focus-halo');
  });

  describe.each(themes)('%s theme final values', (name, t) => {
    // One row per token that was retuned for contrast: [token, light, dark].
    const finalValues: Array<[token: string, light: string, dark: string]> = [
      ['--andes-color-primary', '#2563eb', '#2563eb'],
      ['--andes-color-primary-hover', '#1d4ed8', '#1d4ed8'],
      ['--andes-color-primary-active', '#1e40af', '#1e40af'],
      ['--andes-color-primary-text', '#2563eb', '#60a5fa'],
      ['--andes-color-primary-subtle', '#eaf1fe', '#1d3478'],
      ['--andes-color-danger', '#dc2626', '#dc2626'],
      ['--andes-color-danger-hover', '#b91c1c', '#b91c1c'],
      ['--andes-color-danger-active', '#991b1b', '#991b1b'],
      ['--andes-color-danger-text', '#b91c1c', '#f87171'],
      ['--andes-color-success', '#15803d', '#15803d'],
      ['--andes-color-success-hover', '#166534', '#166534'],
      ['--andes-color-success-active', '#14532d', '#14532d'],
      ['--andes-color-success-text', '#15803d', '#4ade80'],
      ['--andes-color-warning', '#f59e0b', '#f59e0b'],
      ['--andes-color-warning-foreground', '#451a03', '#451a03'],
      ['--andes-color-warning-text', '#b45309', '#fbbf24'],
      ['--andes-color-info', '#0369a1', '#0369a1'],
      ['--andes-color-info-hover', '#075985', '#075985'],
      ['--andes-color-info-active', '#0c4a6e', '#0c4a6e'],
      ['--andes-color-info-text', '#0369a1', '#38bdf8'],
      ['--andes-color-muted-foreground', '#5f6f86', '#94a3b8'],
      ['--andes-color-ghost-foreground', '#111827', '#111827'],
    ];

    it.each(finalValues)('%s', (token, lightValue, darkValue) => {
      expect(t[token]).toBe(name === 'light' ? lightValue : darkValue);
    });

    it.each(['success', 'info'])(
      '%s -solid fills resolve to the base shade and its states',
      (family) => {
        for (const state of states) {
          expect(resolve(t, `--andes-color-${family}-solid${state}`)).toBe(
            resolve(t, `--andes-color-${family}${state}`),
          );
        }
      },
    );
  });

  describe.each(themes)('%s theme contrast', (_, t) => {
    const fills: Array<[fill: string, foreground: string]> = [
      ...states.flatMap((state): Array<[string, string]> => [
        [`--andes-color-primary${state}`, '--andes-color-primary-foreground'],
        [`--andes-color-danger${state}`, '--andes-color-danger-foreground'],
        [`--andes-color-success${state}`, '--andes-color-success-foreground'],
        [
          `--andes-color-success-solid${state}`,
          '--andes-color-success-foreground',
        ],
        [`--andes-color-info${state}`, '--andes-color-info-foreground'],
        [`--andes-color-info-solid${state}`, '--andes-color-info-foreground'],
      ]),
      ['--andes-color-warning', '--andes-color-warning-foreground'],
      ['--andes-color-warning-hover', '--andes-color-warning-foreground'],
      ['--andes-color-primary-subtle', '--andes-color-foreground'],
      ['--andes-color-primary-subtle', '--andes-color-primary-text'],
      ['--andes-color-ghost', '--andes-color-ghost-foreground'],
      ['--andes-color-secondary', '--andes-color-secondary-foreground'],
      ['--andes-color-accent', '--andes-color-accent-foreground'],
    ];

    it.each(fills)('%s carries %s at 4.5:1', (fill, foreground) => {
      expect(tokenContrast(t, fill, foreground)).toBeGreaterThanOrEqual(4.5);
    });

    const surfaces = [
      '--andes-color-background',
      '--andes-color-card',
      '--andes-color-popover',
      '--andes-color-muted',
    ];
    const texts = [
      ...['primary', 'danger', 'success', 'warning', 'info'].map(
        (name) => `--andes-color-${name}-text`,
      ),
      '--andes-color-muted-foreground',
    ];

    it.each(texts)('%s reads at 4.5:1 on every surface', (text) => {
      for (const surface of surfaces) {
        expect(tokenContrast(t, text, surface)).toBeGreaterThanOrEqual(4.5);
      }
    });

    it.each(['primary', 'danger', 'success', 'info'])(
      'the %s base shade stays at 3:1 against the page, for borders and icons',
      (name) => {
        expect(
          tokenContrast(t, `--andes-color-${name}`, '--andes-color-background'),
        ).toBeGreaterThanOrEqual(3);
      },
    );
  });
});
