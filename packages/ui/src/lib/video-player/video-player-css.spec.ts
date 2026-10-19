import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(process.cwd(), 'packages/ui/src/lib/video-player');
const read = (file: string) =>
  readFileSync(`${dir}/${file}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const layout = read('video-player.css');
const controls = read('player-controls.css');
const overlays = read('player-overlays.css');
const all = layout + controls + overlays;

/** The declarations of every rule whose selector list contains exactly `selector`. */
function rule(css: string, selector: string): string {
  const blocks = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  const declarations: string[] = [];
  for (const [, selectors, body] of blocks) {
    if (selectors.split(',').some((entry) => entry.trim() === selector)) {
      declarations.push(body);
    }
  }
  return declarations.join('\n');
}

describe('video player stylesheet contract', () => {
  it('sizes bar buttons on the control scale: 40px default, 32/48 by size, compact 32/24', () => {
    expect(rule(layout, '.andes-video-player')).toContain(
      '--andes-video-button-size: 2.5rem',
    );
    expect(rule(layout, ".andes-video-player[data-size='sm']")).toContain(
      '--andes-video-button-size: 2rem',
    );
    expect(rule(layout, ".andes-video-player[data-size='lg']")).toContain(
      '--andes-video-button-size: 3rem',
    );
    expect(
      rule(layout, ".andes-video-player[data-density='compact']"),
    ).toContain('--andes-video-button-size: 2rem');
    expect(
      rule(
        layout,
        ".andes-video-player[data-density='compact'][data-size='sm']",
      ),
    ).toContain('--andes-video-button-size: 1.5rem');
    const button = rule(controls, '.andes-player-button');
    expect(button).toContain('width: var(--andes-video-button-size, 2.5rem)');
    expect(button).toContain('height: var(--andes-video-button-size, 2.5rem)');
  });

  it('uses 150ms enter and 110ms exit timings with no overshoot', () => {
    const root = rule(layout, '.andes-video-player');
    expect(root).toContain(
      '--andes-video-enter-duration: var(--andes-motion-duration-mid, 150ms)',
    );
    expect(root).toContain('--andes-video-exit-duration: 110ms');
    expect(root).toContain(
      '--andes-video-enter-ease: cubic-bezier(0.2, 0, 0, 1)',
    );
    expect(all).not.toMatch(/cubic-bezier\([^)]*,\s*1\.\d/);
    expect(all).not.toMatch(/scale\(0\.(?:[0-8]\d|9[0-4])\)/);
  });

  it('runs the overlay exit contract on menus: closing attribute, forwards, no pointer events', () => {
    const closing = rule(
      controls,
      '.andes-player-menu__panel[data-andes-closing]',
    );
    expect(closing).toContain('pointer-events: none');
    expect(closing).toMatch(
      /animation: andes-player-menu-out var\(--andes-video-exit-duration\)/,
    );
    expect(closing).toContain('forwards');
    expect(controls).toMatch(
      /@keyframes andes-player-menu-out\s*\{\s*to\s*\{[^}]*opacity: 0[^}]*scale\(0\.97\)/,
    );
  });

  it('honours reduced motion in every stylesheet', () => {
    for (const css of [layout, controls, overlays]) {
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    }
    const reduced = controls.slice(
      controls.indexOf('@media (prefers-reduced-motion: reduce)'),
    );
    expect(reduced).toMatch(/\.andes-player-menu__panel[\s\S]*animation: none/);
    expect(overlays).toMatch(
      /prefers-reduced-motion[\s\S]*andes-player-feedback-fade/,
    );
  });

  it('keeps hidden chrome focusable: opacity only, never visibility or display', () => {
    const hidden = rule(
      layout,
      '.andes-video-player:not([data-controls-visible]) .andes-video-player__chrome',
    );
    expect(hidden).toContain('opacity: 0');
    expect(hidden).not.toContain('visibility');
    expect(hidden).not.toContain('display');
  });

  it('draws a visible focus ring on every control', () => {
    for (const selector of [
      '.andes-player-button:focus-visible',
      '.andes-player-live:focus-visible',
      '.andes-player-menu__item:focus-visible',
    ]) {
      expect(rule(controls, selector)).toContain(
        'outline: 2px solid var(--andes-video-focus-ring)',
      );
    }
    expect(
      rule(
        controls,
        '.andes-player-slider:focus-visible .andes-player-slider__thumb',
      ),
    ).toContain('outline: 2px solid var(--andes-video-focus-ring)');
    expect(rule(layout, '.andes-video-player:focus-visible')).toContain(
      'outline: 2px solid',
    );
    expect(rule(layout, '.andes-video-player')).toContain(
      '--andes-video-focus-ring: var(--andes-color-focus-ring)',
    );
  });

  it('has forced-colors fallbacks for sliders, toggles and the bar', () => {
    expect(layout).toContain('@media (forced-colors: active)');
    const forced = controls.slice(
      controls.indexOf('@media (forced-colors: active)'),
    );
    expect(forced).toContain('forced-color-adjust: none');
    expect(forced).toContain('Highlight');
    expect(forced).toContain('CanvasText');
  });

  it('keeps the time axis left-to-right and mirrors only the chevrons', () => {
    expect(controls).toMatch(/\[data-icon='chevron-start'\]:dir\(rtl\)/);
    expect(controls).toMatch(/\[data-icon='chevron-end'\]:dir\(rtl\)/);
    expect(rule(controls, '.andes-player-slider__fill')).not.toContain(
      'inset-inline',
    );
    expect(controls).not.toMatch(/seek-(backward|forward)'\]:dir\(rtl\)/);
    expect(rule(controls, '.andes-player-menu__panel')).toContain(
      'inset-inline-end: 0',
    );
  });

  it('styles captions only through --andes-video-captions-* variables', () => {
    const cue = rule(overlays, '.andes-player-captions__cue');
    expect(cue).toContain(
      'background-color: var(--andes-video-captions-background)',
    );
    expect(cue).toContain('color: var(--andes-video-captions-color)');
    expect(cue).toContain('font-size: var(--andes-video-captions-font-size)');
    expect(cue).toContain(
      'font-family: var(--andes-video-captions-font-family)',
    );
    expect(overlays).toMatch(
      /::cue\s*\{[^}]*var\(--andes-video-captions-color\)/,
    );
    expect(
      rule(
        overlays,
        '.andes-video-player[data-controls-visible] .andes-player-captions',
      ),
    ).toContain('var(--andes-video-captions-lift)');
  });

  it('takes colours from tokens and theme variables only', () => {
    // Literal colours are confined to variable defaults (the letterbox and the on-video text).
    const literals = all.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) ?? [];
    const allowed = all
      .split('\n')
      .filter((line) => /#[0-9a-f]{3,8}\b|rgba?\(/i.test(line))
      .every(
        (line) =>
          /^\s*--andes-video-[a-z-]+:/.test(line) ||
          /var\(--andes-shadow-[a-z]+,/.test(line),
      );
    expect(literals.length).toBeGreaterThan(0);
    expect(allowed).toBe(true);
    expect(rule(controls, '.andes-player-slider__fill')).toContain(
      'background-color: var(--andes-video-accent)',
    );
    expect(rule(layout, '.andes-video-player')).toContain(
      '--andes-video-accent: var(--andes-color-primary)',
    );
  });

  it('documents a light and a dark ready surface: menus from popover tokens, solid skin from card tokens', () => {
    expect(rule(layout, '.andes-video-player')).toMatch(
      /--andes-video-menu-background: color-mix\(\s*in srgb,\s*var\(--andes-color-popover\)/,
    );
    expect(rule(layout, ".andes-video-player[data-skin='solid']")).toContain(
      '--andes-video-bar-background: var(--andes-color-card)',
    );
    expect(rule(layout, ".andes-video-player[data-layout='audio']")).toContain(
      'background-color: var(--andes-color-card)',
    );
  });

  it('sets the library font on every surface root, including menus and tooltips', () => {
    for (const [css, selector] of [
      [layout, '.andes-video-player'],
      [controls, '.andes-player-menu__panel'],
      [controls, '.andes-player-tooltip'],
    ] as const) {
      expect(rule(css, selector)).toContain(
        'font-family: var(--andes-font-family), sans-serif',
      );
    }
  });

  it('uses 14px text with 12px captions/tooltips and 16px titles', () => {
    expect(rule(controls, '.andes-player-menu__panel')).toContain(
      'font-size: 0.875rem',
    );
    expect(rule(controls, '.andes-player-tooltip')).toContain(
      'font-size: 0.75rem',
    );
    expect(rule(overlays, '.andes-player-title')).toContain('font-size: 1rem');
    expect(rule(overlays, '.andes-player-error__title')).toContain(
      'font-size: 1rem',
    );
    expect(all).not.toMatch(/font-size:\s*(?:0\.8125rem|13px|15px|0\.9375rem)/);
  });

  it('never lets a selector continue on a new line with a combinator', () => {
    for (const file of readdirSync(dir).filter((name) =>
      name.endsWith('.css'),
    )) {
      expect(read(file)).not.toMatch(/\n\s*[>+~]\s*[.#\w[]/);
    }
  });

  it('keeps every selector scoped to the player', () => {
    for (const css of [layout, controls, overlays]) {
      const selectors =
        css
          .replace(/@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '')
          .replace(/@(media|container)[^{]+\{/g, '')
          .match(/(^|\})\s*([^{}@]+)\{/g) ?? [];
      for (const raw of selectors) {
        const list = raw
          .replace(/^\}?\s*/, '')
          .replace(/\{$/, '')
          .split(',');
        for (const selector of list) {
          expect(selector.trim()).toMatch(/^\.andes-(video-player|player-)/);
        }
      }
    }
  });
});
