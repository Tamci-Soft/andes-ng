import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesTag,
  AndesTagCloseEvent,
  AndesTagColor,
  AndesTagVariant,
} from './tag';

@Component({
  imports: [AndesTag],
  template: `<andes-tag
    [color]="color()"
    [variant]="variant()"
    [disabled]="disabled()"
    [closable]="closable()"
    [href]="href()"
    [target]="target()"
    [checkable]="checkable()"
    [checked]="checked()"
    [clickable]="clickable()"
    (closed)="onClosed()"
    (checkedChange)="onCheckedChange($event)"
    (tagClick)="onTagClick()"
    >Beta</andes-tag
  >`,
})
class HostComponent {
  readonly color = signal<AndesTagColor>('default');
  readonly variant = signal<AndesTagVariant>('outlined');
  readonly disabled = signal(false);
  readonly closable = signal(false);
  readonly href = signal<string | undefined>(undefined);
  readonly target = signal<string | undefined>(undefined);
  readonly checkable = signal(false);
  readonly checked = signal(false);
  readonly clickable = signal(false);

  closedCount = 0;
  lastChecked: boolean | undefined;
  clickCount = 0;

  onClosed(): void {
    this.closedCount++;
  }

  onCheckedChange(value: boolean): void {
    this.lastChecked = value;
  }

  onTagClick(): void {
    this.clickCount++;
  }
}

describe('AndesTag', () => {
  function queryTag(fixture: ReturnType<typeof TestBed.createComponent>) {
    return fixture.nativeElement.querySelector(
      '[data-slot="tag"]',
    ) as HTMLElement;
  }

  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { fixture, tag: queryTag(fixture) };
  }

  it('renders a static span with the projected label, default color and outlined variant', () => {
    const { tag } = createHost();

    expect(tag.tagName).toBe('SPAN');
    expect(tag.textContent?.trim()).toBe('Beta');
    expect(tag.classList).toContain('andes-tag--color-default');
    expect(tag.classList).toContain('andes-tag--outlined');
  });

  it.each([
    'default',
    'primary',
    'secondary',
    'success',
    'warning',
    'danger',
    'info',
  ] as const)('supports the %s color', (color) => {
    const { fixture, tag } = createHost();
    fixture.componentInstance.color.set(color);
    fixture.detectChanges();

    expect(tag.classList).toContain(`andes-tag--color-${color}`);
  });

  it.each(['outlined', 'filled', 'solid'] as const)(
    'supports the %s variant',
    (variant) => {
      const { fixture, tag } = createHost();
      fixture.componentInstance.variant.set(variant);
      fixture.detectChanges();

      expect(tag.classList).toContain(`andes-tag--${variant}`);
    },
  );

  it('renders a close button when closable and emits closed on click', () => {
    const { fixture } = createHost();
    fixture.componentInstance.closable.set(true);
    fixture.detectChanges();
    const closeButton = fixture.nativeElement.querySelector(
      '.andes-tag__close',
    ) as HTMLButtonElement;

    expect(closeButton).toBeTruthy();
    // Regression guard: closable used to sit in its own `@if` branch with its own copy of
    // `<ng-content>`, and Angular only ever renders the projected label into ONE of several
    // structurally-identical `<ng-content>` copies spread across `@if`/`@else if` branches -
    // silently dropping it in every other branch, even though only one is ever in the DOM at
    // a time. Re-querying the tag here (not the `tag` from `createHost()`, which is a
    // reference to the branch that was live *before* this `set(true)` swapped it out) is
    // what makes this assertion meaningful.
    expect(queryTag(fixture).textContent?.trim()).toBe('Beta');
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(1);
  });

  it('does not render a close button by default', () => {
    const { fixture } = createHost();

    expect(
      fixture.nativeElement.querySelector('.andes-tag__close'),
    ).toBeFalsy();
  });

  it('does not emit closed when disabled', () => {
    const { fixture } = createHost();
    fixture.componentInstance.closable.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const closeButton = fixture.nativeElement.querySelector(
      '.andes-tag__close',
    ) as HTMLButtonElement;

    expect(closeButton.disabled).toBe(true);
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(0);
  });

  it('renders as an anchor when href is set', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.componentInstance.target.set('_blank');
    fixture.detectChanges();
    const tag = queryTag(fixture) as HTMLAnchorElement;

    expect(tag.tagName).toBe('A');
    expect(tag.getAttribute('href')).toBe('https://andes-ng.dev');
    expect(tag.getAttribute('target')).toBe('_blank');
    expect(tag.textContent?.trim()).toBe('Beta');

    tag.dispatchEvent(new MouseEvent('click', { cancelable: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.clickCount).toBe(1);
  });

  it('removes href from the anchor when disabled', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture);

    expect(tag.hasAttribute('href')).toBe(false);
  });

  it('closable wins over href - renders a plain span with a close button', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.componentInstance.closable.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture);

    expect(tag.tagName).toBe('SPAN');
    expect(
      fixture.nativeElement.querySelector('.andes-tag__close'),
    ).toBeTruthy();
  });

  it('keeps its own font-family on the native <a>/<button> forms, not the page ambient font', () => {
    // Regression guard: `button.andes-tag, a.andes-tag` used to carry `font: inherit`, meant
    // to override the browser's UA default button font - but at (0,1,1) it outranks the
    // plain `.andes-tag { font-family: ... }` rule at (0,1,0) regardless of source order, so
    // it silently won and reset font-family to whatever's ambient (nothing in particular,
    // e.g. the browser's serif default in Storybook) instead of the design system's font.
    const outlined = createHost();
    const outlinedFont = getComputedStyle(outlined.tag).fontFamily;

    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.detectChanges();
    const linkFont = getComputedStyle(queryTag(fixture)).fontFamily;

    fixture.componentInstance.href.set(undefined);
    fixture.componentInstance.checkable.set(true);
    fixture.detectChanges();
    const buttonFont = getComputedStyle(queryTag(fixture)).fontFamily;

    expect(linkFont).toBe(outlinedFont);
    expect(buttonFont).toBe(outlinedFont);
  });

  it('renders as a native button when checkable, ignoring color/variant', () => {
    const { fixture } = createHost();
    fixture.componentInstance.checkable.set(true);
    fixture.componentInstance.color.set('danger');
    fixture.detectChanges();
    const tag = queryTag(fixture);

    expect(tag.tagName).toBe('BUTTON');
    expect(tag.getAttribute('aria-pressed')).toBe('false');
    expect(tag.classList).toContain('andes-tag--checkable');
    expect(tag.classList).not.toContain('andes-tag--color-danger');
    expect(tag.textContent?.trim()).toBe('Beta');
  });

  it('toggles checked state and emits checkedChange on click', () => {
    const { fixture } = createHost();
    fixture.componentInstance.checkable.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture) as HTMLButtonElement;

    tag.click();
    fixture.detectChanges();

    expect(tag.getAttribute('aria-pressed')).toBe('true');
    expect(tag.classList).toContain('andes-tag--checked');
    expect(fixture.componentInstance.lastChecked).toBe(true);

    tag.click();
    fixture.detectChanges();

    expect(tag.getAttribute('aria-pressed')).toBe('false');
    expect(fixture.componentInstance.lastChecked).toBe(false);
  });

  it('respects an initial checked input', () => {
    const { fixture } = createHost();
    fixture.componentInstance.checkable.set(true);
    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture);

    expect(tag.getAttribute('aria-pressed')).toBe('true');
    expect(tag.classList).toContain('andes-tag--checked');
  });

  it('renders as a native button when clickable and emits tagClick without aria-pressed', () => {
    const { fixture } = createHost();
    fixture.componentInstance.clickable.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture) as HTMLButtonElement;

    expect(tag.tagName).toBe('BUTTON');
    expect(tag.hasAttribute('aria-pressed')).toBe(false);
    expect(tag.textContent?.trim()).toBe('Beta');

    tag.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.clickCount).toBe(1);
  });

  it('does not toggle or click when the interactive tag is disabled', () => {
    const { fixture } = createHost();
    fixture.componentInstance.checkable.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture) as HTMLButtonElement;

    expect(tag.disabled).toBe(true);
    tag.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.lastChecked).toBeUndefined();
  });

  it('falls back to a plain span with a close button when both closable and checkable are set', () => {
    const { fixture } = createHost();
    fixture.componentInstance.closable.set(true);
    fixture.componentInstance.checkable.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture);

    expect(tag.tagName).toBe('SPAN');
    expect(
      fixture.nativeElement.querySelector('.andes-tag__close'),
    ).toBeTruthy();
  });

  it('reflects disabled with the andes-tag--disabled class and native disabled attribute', () => {
    const { fixture } = createHost();
    fixture.componentInstance.checkable.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture) as HTMLButtonElement;

    expect(tag.classList).toContain('andes-tag--disabled');
    expect(tag.disabled).toBe(true);
  });

  it('projects both the icon slot and the default label together when closable', () => {
    @Component({
      imports: [AndesTag],
      template: `<andes-tag closable
        ><span slot="icon">icon</span>Beta</andes-tag
      >`,
    })
    class WithIconHost {}

    const fixture = TestBed.createComponent(WithIconHost);
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector('[data-slot="tag"]');

    expect(tag.querySelector('[slot=icon]')?.textContent).toBe('icon');
    expect(tag.textContent?.trim()).toBe('iconBeta');
  });

  it('treats bare boolean attributes (no brackets) as true, not the string ""', () => {
    @Component({
      imports: [AndesTag],
      template: `<andes-tag closable disabled>Beta</andes-tag>`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const closeButton = fixture.nativeElement.querySelector(
      '.andes-tag__close',
    ) as HTMLButtonElement;

    expect(closeButton).toBeTruthy();
    expect(closeButton.disabled).toBe(true);
  });
});

describe('AndesTag custom color', () => {
  @Component({
    imports: [AndesTag],
    template: `<andes-tag [color]="color()" [variant]="variant()"
      >Custom</andes-tag
    >`,
  })
  class ColorHost {
    readonly color = signal<AndesTagColor>('#722ed1');
    readonly variant = signal<AndesTagVariant>('outlined');
  }

  it.each(['outlined', 'filled', 'solid'] as const)(
    'applies an arbitrary CSS color via --andes-tag-color in the %s variant',
    (variant) => {
      const fixture = TestBed.createComponent(ColorHost);
      fixture.componentInstance.variant.set(variant);
      fixture.detectChanges();
      const tag = fixture.nativeElement.querySelector(
        '[data-slot="tag"]',
      ) as HTMLElement;

      expect(tag.classList).toContain('andes-tag--color-custom');
      expect(tag.classList).toContain(`andes-tag--${variant}`);
      expect(tag.style.getPropertyValue('--andes-tag-color')).toBe('#722ed1');
      expect(tag.textContent?.trim()).toBe('Custom');
      // Solid gets black/white text; only outlined/filled derive text from the hue.
      expect(tag.classList.contains('andes-tag--custom-tinted')).toBe(
        variant !== 'solid',
      );
    },
  );

  it('switching back to a preset drops the inline custom color', () => {
    const fixture = TestBed.createComponent(ColorHost);
    fixture.detectChanges();
    fixture.componentInstance.color.set('success');
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector(
      '[data-slot="tag"]',
    ) as HTMLElement;

    expect(tag.classList).toContain('andes-tag--color-success');
    expect(tag.classList).not.toContain('andes-tag--color-custom');
    expect(tag.style.getPropertyValue('--andes-tag-color')).toBe('');
  });

  /** tag.css with whitespace collapsed, so Prettier's line wrapping doesn't matter. */
  function normalizedCss(): string {
    return readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/tag/tag.css'),
      'utf8',
    )
      .replace(/\s+/g, ' ')
      .replace(/\( /g, '(')
      .replace(/ \)/g, ')');
  }

  it('derives readable text from the custom color in every variant (tag.css)', () => {
    const supports =
      normalizedCss().match(
        /@supports \(color: lch\(from red l c h\)\) {(.*?) } }/,
      )?.[1] ?? '';

    // Outlined/filled (the base rule): hue kept, lightness clamped per theme.
    expect(supports).toContain(
      '.andes-tag--custom-tinted { color: lch(from var(--andes-tag-color) min(l, 40) c h); }',
    );
    expect(supports).toContain(
      ":host-context([data-andes-theme='dark']) .andes-tag--custom-tinted { color: lch(from var(--andes-tag-color) max(l, 65) c h); }",
    );
    // Solid: black/white at the WCAG luminance tie point (CIE L* 49.44 = Y 0.179).
    expect(supports).toContain(
      '.andes-tag--color-custom.andes-tag--solid { color: lch(from var(--andes-tag-color) clamp(0, (49.44 - l) * 1000, 100) 0 0)',
    );
  });

  it('never splits a :host-context compound selector across lines (Angular shim mis-scopes it)', () => {
    const lines = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/tag/tag.css'),
      'utf8',
    ).split('\n');

    for (const line of lines.filter((l) => l.includes(':host-context('))) {
      expect(line.trimEnd()).toMatch(/[{,]$/);
    }
  });
});

describe('AndesTag bordered', () => {
  it('bordered=false adds the borderless class; bordered is the default', () => {
    @Component({
      imports: [AndesTag],
      template: `<andes-tag [bordered]="bordered()" color="primary"
        >Tag</andes-tag
      >`,
    })
    class BorderHost {
      readonly bordered = signal(true);
    }

    const fixture = TestBed.createComponent(BorderHost);
    fixture.detectChanges();
    const query = () =>
      fixture.nativeElement.querySelector('[data-slot="tag"]') as HTMLElement;

    expect(query().classList).not.toContain('andes-tag--borderless');

    fixture.componentInstance.bordered.set(false);
    fixture.detectChanges();

    expect(query().classList).toContain('andes-tag--borderless');
  });

  it('the borderless rule comes after every color x variant rule, so it wins the tie', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/tag/tag.css'),
      'utf8',
    );
    const borderless = css.indexOf('.andes-tag.andes-tag--borderless {');
    const lastVariantRule = css.lastIndexOf('.andes-tag--color-');

    expect(borderless).toBeGreaterThan(lastVariantRule);
  });
});

describe('AndesTag closeIcon', () => {
  @Component({
    imports: [AndesTag],
    template: `<ng-template #icon><span class="custom-x">x</span></ng-template>
      <andes-tag [closeIcon]="icon" (closed)="closedCount = closedCount + 1"
        ><span slot="icon">*</span>Beta</andes-tag
      >`,
  })
  class CloseIconHost {
    closedCount = 0;
  }

  it('implies closable, renders the template in the close button and keeps the label', () => {
    const fixture = TestBed.createComponent(CloseIconHost);
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector(
      '[data-slot="tag"]',
    ) as HTMLElement;
    const closeButton = tag.querySelector(
      '.andes-tag__close',
    ) as HTMLButtonElement;

    expect(tag.classList).toContain('andes-tag--closable');
    expect(closeButton.querySelector('.custom-x')).toBeTruthy();
    expect(closeButton.querySelector('svg')).toBeFalsy();
    expect(closeButton.getAttribute('aria-label')).toBe('Remove');
    expect(tag.querySelector('[slot=icon]')?.textContent).toBe('*');
    expect(tag.textContent).toContain('Beta');

    closeButton.click();

    expect(fixture.componentInstance.closedCount).toBe(1);
  });
});

describe('AndesTag close event / hideOnClose', () => {
  @Component({
    imports: [AndesTag],
    template: `<andes-tag
      closable
      [hideOnClose]="hideOnClose()"
      (closed)="onClosed($event)"
      >Beta</andes-tag
    >`,
  })
  class CloseHost {
    readonly hideOnClose = signal(false);
    veto = false;
    lastEvent: AndesTagCloseEvent | undefined;

    onClosed(event: AndesTagCloseEvent): void {
      this.lastEvent = event;
      if (this.veto) {
        event.preventDefault();
      }
    }
  }

  function setup(apply: (host: CloseHost) => void = () => undefined) {
    const fixture = TestBed.createComponent(CloseHost);
    apply(fixture.componentInstance);
    fixture.detectChanges();
    const clickClose = () => {
      (
        fixture.nativeElement.querySelector(
          '.andes-tag__close',
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();
    };
    const tag = () => fixture.nativeElement.querySelector('[data-slot="tag"]');
    return { fixture, clickClose, tag };
  }

  it('emits an AndesTagCloseEvent carrying the original click', () => {
    const { fixture, clickClose } = setup();
    clickClose();
    const event = fixture.componentInstance.lastEvent;

    expect(event).toBeInstanceOf(AndesTagCloseEvent);
    expect(event?.originalEvent).toBeInstanceOf(MouseEvent);
    expect(event?.defaultPrevented).toBe(false);
  });

  it('never removes itself by default (controlled mode)', () => {
    const { clickClose, tag } = setup();
    clickClose();

    expect(tag()).toBeTruthy();
    expect(tag().textContent).toContain('Beta');
  });

  it('hides itself after closing with hideOnClose', () => {
    const { clickClose, tag } = setup((host) => host.hideOnClose.set(true));
    clickClose();

    expect(tag()).toBeFalsy();
  });

  it('stays visible when a handler vetoes the close with preventDefault()', () => {
    const { fixture, clickClose, tag } = setup((host) => {
      host.hideOnClose.set(true);
      host.veto = true;
    });
    clickClose();

    expect(fixture.componentInstance.lastEvent?.defaultPrevented).toBe(true);
    expect(tag()).toBeTruthy();
    expect(tag().textContent).toContain('Beta');
  });
});

describe('AndesTag checked two-way binding', () => {
  @Component({
    imports: [AndesTag],
    template: `<andes-tag checkable [(checked)]="on">Beta</andes-tag>`,
  })
  class TwoWayHost {
    readonly on = signal(false);
  }

  it('writes toggles back to the bound signal and reflects external writes', () => {
    const fixture = TestBed.createComponent(TwoWayHost);
    fixture.detectChanges();
    const tag = () =>
      fixture.nativeElement.querySelector(
        '[data-slot="tag"]',
      ) as HTMLButtonElement;

    tag().click();
    fixture.detectChanges();

    expect(fixture.componentInstance.on()).toBe(true);
    expect(tag().getAttribute('aria-pressed')).toBe('true');

    fixture.componentInstance.on.set(false);
    fixture.detectChanges();

    expect(tag().getAttribute('aria-pressed')).toBe('false');
    expect(tag().classList).not.toContain('andes-tag--checked');
  });
});

describe('AndesTag icon slot in every rendering branch', () => {
  @Component({
    imports: [AndesTag],
    template: `<andes-tag
      [href]="href()"
      [checkable]="checkable()"
      [clickable]="clickable()"
      ><span slot="icon" class="ic">*</span>Label</andes-tag
    >`,
  })
  class IconHost {
    readonly href = signal<string | undefined>(undefined);
    readonly checkable = signal(false);
    readonly clickable = signal(false);
  }

  it.each([
    ['span', () => undefined],
    ['link', (h: IconHost) => h.href.set('https://andes-ng.dev')],
    ['checkable', (h: IconHost) => h.checkable.set(true)],
    ['clickable', (h: IconHost) => h.clickable.set(true)],
  ] as const)('projects icon + label in the %s form', (_name, apply) => {
    const fixture = TestBed.createComponent(IconHost);
    fixture.detectChanges();
    apply(fixture.componentInstance);
    fixture.detectChanges();
    // Re-query: the @if swap replaced the root element.
    const tag = fixture.nativeElement.querySelector('[data-slot="tag"]');

    expect(tag.querySelector('.ic')?.textContent).toBe('*');
    expect(tag.textContent?.trim()).toBe('*Label');
  });
});

describe('AndesTag solid warning variant contrast (WCAG 2.x AA, 4.5:1 for normal text)', () => {
  // Same relative-luminance/contrast formula the Storybook a11y addon (axe-core) uses.
  function relativeLuminance(hex: string): number {
    const channel = (value: number) => {
      const s = value / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function contrastRatio(a: string, b: string): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Hex values as defined in packages/tokens/src/theme.css. `warning`/`warning-foreground`
  // are identical between the light `:root` block and the `.dark` block; `warning-active` and
  // `background` are theme-aware, which is exactly what makes the fix below pass in both.
  const warning = '#f59e0b';
  const warningForeground = '#78350f';
  const light = { warningActive: '#b45309', background: '#ffffff' };
  const dark = { warningActive: '#fcd34d', background: '#0f172a' };

  it('documents that the old warning/warning-foreground pairing fails 4.5:1 (4.22:1) - this is the bug the fix below replaces', () => {
    const ratio = contrastRatio(warning, warningForeground);

    expect(ratio).toBeCloseTo(4.22, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  it('verifies warning-active + background clears 4.5:1 in the light theme (5.02:1)', () => {
    const ratio = contrastRatio(light.warningActive, light.background);

    expect(ratio).toBeCloseTo(5.02, 1);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('verifies warning-active + background clears 4.5:1 in the dark theme (12.38:1)', () => {
    const ratio = contrastRatio(dark.warningActive, dark.background);

    expect(ratio).toBeCloseTo(12.38, 1);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('renders the solid warning variant with the verified warning-active + background tokens, not the failing base pair', () => {
    const cssPath = join(process.cwd(), 'packages/ui/src/lib/tag/tag.css');
    const css = readFileSync(cssPath, 'utf8');
    const rule =
      css.match(
        /\.andes-tag--color-warning\.andes-tag--solid\s*{([^}]*)}/,
      )?.[1] ?? '';

    expect(rule).toContain('var(--andes-color-warning-active)');
    expect(rule).toContain('var(--andes-color-background)');
    expect(rule).not.toContain('var(--andes-color-warning)');
    expect(rule).not.toContain('var(--andes-color-warning-foreground)');
  });
});
