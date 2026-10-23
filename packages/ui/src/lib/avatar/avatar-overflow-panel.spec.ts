import { Component, signal, type TemplateRef, viewChild } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { AndesAvatar } from './avatar';
import { type AndesAvatarFace, initialsOf } from './avatar-face';
import { faceColumns, MAX_VISIBLE_ROWS } from './avatar-face-grid';
import { AndesAvatarFallback } from './avatar-fallback';
import { AndesAvatarGroup, type AndesAvatarGroupMax } from './avatar-group';
import {
  AndesAvatarGroupCount,
  type AndesAvatarGroupCountPanelContext,
} from './avatar-group-count';
import { AndesAvatarIcon } from './avatar-icon';
import { AndesAvatarImage } from './avatar-image';

/**
 * The `+N` overflow panel of `AndesAvatarGroup`'s `max`: the hidden avatars
 * as faces (aria-labelled, no visible names) in a windowed, keyboard-driven
 * grid or a single row.
 */

interface Person {
  readonly name: string;
  readonly picture?: string;
  readonly background?: string;
}

function people(count: number): Person[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Person ${i + 1}`,
  }));
}

@Component({
  imports: [
    AndesAvatar,
    AndesAvatarImage,
    AndesAvatarFallback,
    AndesAvatarIcon,
    AndesAvatarGroup,
  ],
  template: `<andes-avatar-group [max]="max()">
      @for (person of people(); track person.name) {
        <andes-avatar [style.--andes-avatar-background]="person.background">
          @if (person.picture) {
            <andes-avatar-image [src]="person.picture" [alt]="person.name" />
          } @else {
            <andes-avatar-fallback>{{ person.name }}</andes-avatar-fallback>
          }
        </andes-avatar>
      }
      @if (withIcon()) {
        <andes-avatar>
          <andes-avatar-icon label="Unassigned seat" />
        </andes-avatar>
      }
    </andes-avatar-group>
    <button type="button" class="outside">Outside</button>
    <ng-template #panel let-faces="faces" let-count="count">
      <ul class="custom-panel">
        @for (face of faces; track $index) {
          <li>{{ face.name }}</li>
        }
        <li class="custom-count">{{ count }}</li>
      </ul>
    </ng-template>`,
})
class GroupHost {
  readonly people = signal<readonly Person[]>(people(12));
  readonly withIcon = signal(false);
  readonly max = signal<AndesAvatarGroupMax | undefined>({ count: 2 });
  readonly panel =
    viewChild.required<TemplateRef<AndesAvatarGroupCountPanelContext>>('panel');
}

function create(
  options: {
    people?: readonly Person[];
    max?: AndesAvatarGroupMax;
    withIcon?: boolean;
  } = {},
) {
  const fixture = TestBed.createComponent(GroupHost);
  if (options.people) {
    fixture.componentInstance.people.set(options.people);
  }
  if (options.withIcon) {
    fixture.componentInstance.withIcon.set(true);
  }
  if (options.max) {
    fixture.componentInstance.max.set(options.max);
  }
  fixture.detectChanges();
  return harness(fixture);
}

function harness(fixture: ComponentFixture<GroupHost>) {
  const el = fixture.nativeElement as HTMLElement;
  const chip = () =>
    el.querySelector('andes-avatar-group-count') as HTMLElement;
  const trigger = () => chip().querySelector('button') as HTMLButtonElement;
  const panel = () =>
    chip().querySelector('.andes-avatar-group-count__panel') as HTMLElement;
  const grid = () => chip().querySelector('[role="grid"]') as HTMLElement;
  const cells = () =>
    [...chip().querySelectorAll('[role="gridcell"]')] as HTMLElement[];
  const cell = (index: number) =>
    chip().querySelector(`[data-index="${index}"]`) as HTMLElement | null;
  const hover = () => {
    chip().dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
  };
  const open = hover;
  const leave = () => {
    chip().dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();
  };
  const press = (
    target: Element | null,
    key: string,
    init: KeyboardEventInit = {},
  ) => {
    target?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
    fixture.detectChanges();
  };
  return {
    fixture,
    el,
    chip,
    trigger,
    panel,
    grid,
    cells,
    cell,
    open,
    hover,
    leave,
    press,
  };
}

describe('AndesAvatarGroup max: panel of faces', () => {
  it('shows the hidden avatars as named faces, not as visible names', () => {
    const { hover, cells, panel } = create({
      people: people(5),
      max: { count: 2 },
    });
    hover();

    expect(cells().map((c) => c.getAttribute('aria-label'))).toEqual([
      'Person 3',
      'Person 4',
      'Person 5',
    ]);
    // The name is the accessible label and the hover/focus caption - nothing
    // in the faces themselves spells it out.
    expect(panel().querySelector('.andes-avatar-group-count__name')).toBeNull();
    expect(cells().map((c) => c.textContent?.trim())).toEqual([
      'Person 3',
      'Person 4',
      'Person 5',
    ]);
    expect(
      [...panel().querySelectorAll('.andes-avatar-face-grid__text')].every(
        (text) => text.getAttribute('aria-hidden') === 'true',
      ),
    ).toBe(true);
  });

  it('follows the WAI-ARIA grid structure with a single tab stop', () => {
    const { hover, grid, cells, panel } = create({ max: { count: 2 } });
    hover();

    expect(grid().getAttribute('aria-label')).toBe('+10 more');
    expect(grid().getAttribute('aria-rowcount')).toBe('2');
    expect(grid().getAttribute('aria-colcount')).toBe('8');
    const rows = [...grid().querySelectorAll('[role="row"]')];
    expect(rows.map((row) => row.getAttribute('aria-rowindex'))).toEqual([
      '1',
      '2',
    ]);
    expect(rows[0].children).toHaveLength(8);
    expect(rows[1].children).toHaveLength(2);
    expect(cells()[9].getAttribute('aria-colindex')).toBe('2');
    // Roving tabindex: exactly one face is reachable with Tab, the rest only
    // with the arrow keys.
    expect(cells().filter((c) => c.tabIndex === 0)).toHaveLength(1);
    expect(cells()[0].tabIndex).toBe(0);
    expect(panel().getAttribute('role')).toBeNull();
  });

  it('draws a photo over initials, and the person glyph for an icon avatar', () => {
    const { hover, cell } = create({
      people: [
        { name: 'Ana Lopez', picture: 'ana.png' },
        { name: 'Bo Chen', picture: 'bo.png' },
        { name: 'Cy Dunn' },
      ],
      withIcon: true,
      max: { count: 1 },
    });
    hover();

    const photo = cell(0) as HTMLElement;
    expect(photo.querySelector('img')?.getAttribute('src')).toBe('bo.png');
    expect(photo.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(photo.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    // Initials from the name sit under the photo for when it fails to load.
    expect(photo.textContent?.trim()).toBe('BC');

    const initials = cell(1) as HTMLElement;
    expect(initials.querySelector('img')).toBeNull();
    expect(initials.textContent?.trim()).toBe('Cy Dunn');

    const icon = cell(2) as HTMLElement;
    expect(icon.getAttribute('aria-label')).toBe('Unassigned seat');
    expect(icon.querySelector('svg')).not.toBeNull();
    expect(icon.querySelector('img')).toBeNull();
  });

  it('hides a photo that fails to load so the initials show through', () => {
    const { hover, cell } = create({
      people: [{ name: 'Ana Lopez' }, { name: 'Bo Chen', picture: 'x.png' }],
      max: { count: 1 },
    });
    hover();
    const image = (cell(0) as HTMLElement).querySelector(
      'img',
    ) as HTMLImageElement;

    image.dispatchEvent(new Event('error'));

    expect(image.hidden).toBe(true);
  });

  it("takes each avatar's own colors, refreshed whenever the panel opens", () => {
    const { fixture, leave, open, cell } = create({
      people: [
        { name: 'Ana Lopez' },
        { name: 'Bo Chen', background: 'rgb(1, 2, 3)' },
      ],
      max: { count: 1 },
    });
    open();
    expect(
      (cell(0) as HTMLElement).style.getPropertyValue(
        '--andes-avatar-background',
      ),
    ).toBe('rgb(1, 2, 3)');

    leave();
    fixture.componentInstance.people.set([
      { name: 'Ana Lopez' },
      { name: 'Bo Chen', background: 'rgb(9, 9, 9)' },
    ]);
    fixture.detectChanges();
    open();

    expect(
      (cell(0) as HTMLElement).style.getPropertyValue(
        '--andes-avatar-background',
      ),
    ).toBe('rgb(9, 9, 9)');
  });

  describe('heading', () => {
    it('is left out while everything fits, and shown past a screenful', () => {
      const few = create({
        people: people(MAX_VISIBLE_ROWS * faceColumns(32) + 2),
        max: { count: 2 },
      });
      few.hover();
      expect(
        few.panel().querySelector('.andes-avatar-group-count__panel-label'),
      ).toBeNull();

      const many = create({
        people: people(MAX_VISIBLE_ROWS * faceColumns(32) + 3),
        max: { count: 2 },
      });
      many.hover();
      expect(
        many.panel().querySelector('.andes-avatar-group-count__panel-label')
          ?.textContent,
      ).toBe(`+${MAX_VISIBLE_ROWS * faceColumns(32) + 1} more`);
    });

    it('takes a translated moreLabel for the chip, the grid and the heading', () => {
      const { hover, trigger, grid, panel } = create({
        people: people(60),
        max: { count: 2, popover: { moreLabel: '{count} mas' } },
      });
      hover();

      expect(trigger().getAttribute('aria-label')).toBe('58 mas');
      expect(grid().getAttribute('aria-label')).toBe('58 mas');
      expect(
        panel().querySelector('.andes-avatar-group-count__panel-label')
          ?.textContent,
      ).toBe('58 mas');
    });

    it('shows an explicit label even for a few faces, and names the grid with it', () => {
      const { hover, grid, panel } = create({
        max: { count: 2, popover: { label: 'Also in this project' } },
      });
      hover();

      expect(
        panel().querySelector('.andes-avatar-group-count__panel-label')
          ?.textContent,
      ).toBe('Also in this project');
      expect(grid().getAttribute('aria-label')).toBe('Also in this project');
    });
  });

  describe('trigger semantics', () => {
    it('is a disclosure button in every mode, since the panel holds focusable faces', () => {
      for (const trigger of ['hover', 'focus', 'click'] as const) {
        const h = create({ max: { count: 2, popover: { trigger } } });
        expect(h.trigger().getAttribute('aria-label')).toBe('+10 more');
        expect(h.trigger().getAttribute('aria-expanded')).toBe('false');
        expect(h.trigger().getAttribute('aria-controls')).toBeNull();

        if (trigger === 'hover') {
          h.hover();
        } else if (trigger === 'focus') {
          h.trigger().dispatchEvent(new Event('focus'));
          h.fixture.detectChanges();
        } else {
          h.trigger().click();
          h.fixture.detectChanges();
        }

        expect(h.trigger().getAttribute('aria-expanded')).toBe('true');
        expect(h.trigger().getAttribute('aria-controls')).toBe(h.panel().id);
        expect(h.trigger().getAttribute('aria-describedby')).toBeNull();
      }
    });

    it('keeps a hover panel open while a face has the keyboard, closing when focus leaves', () => {
      const { fixture, chip, trigger, panel, cell, press, el } = create();
      chip().dispatchEvent(new Event('mouseenter'));
      fixture.detectChanges();
      press(trigger(), 'ArrowDown');
      expect(document.activeElement).toBe(cell(0));

      chip().dispatchEvent(new Event('mouseleave'));
      fixture.detectChanges();
      expect(panel()).not.toBeNull();

      (cell(0) as HTMLElement).dispatchEvent(
        new FocusEvent('focusout', {
          bubbles: true,
          relatedTarget: el.querySelector('.outside'),
        }),
      );
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });
  });

  describe('keyboard', () => {
    // 20 faces, 8 per row: rows of 8, 8 and 4.
    const setup = () => {
      const h = create({ people: people(22), max: { count: 2 } });
      h.hover();
      h.press(h.trigger(), 'ArrowDown');
      return h;
    };
    const active = () =>
      (document.activeElement as HTMLElement | null)?.dataset['index'];

    it('moves from the chip into the first face with Arrow Down, or Arrow Up', () => {
      const { trigger, press, cell } = setup();
      expect(document.activeElement).toBe(cell(0));

      (trigger() as HTMLElement).focus();
      press(trigger(), 'ArrowUp');
      expect(document.activeElement).toBe(cell(0));
    });

    it('opens a closed panel from the chip with Arrow Down', () => {
      const { fixture, trigger, panel, cell, press } = create();
      expect(panel()).toBeNull();

      press(trigger(), 'ArrowDown');
      fixture.detectChanges();

      expect(panel()).not.toBeNull();
      expect(document.activeElement).toBe(cell(0));
    });

    it('moves across the faces in two dimensions', () => {
      const { cell, press } = setup();
      const key = (name: string, init?: KeyboardEventInit) =>
        press(document.activeElement, name, init);

      key('ArrowRight');
      expect(active()).toBe('1');
      key('ArrowDown');
      expect(active()).toBe('9');
      key('ArrowLeft');
      expect(active()).toBe('8');
      key('ArrowUp');
      expect(active()).toBe('0');
      // Left/right continue into the neighbouring row.
      key('ArrowLeft');
      expect(active()).toBe('0');
      (cell(7) as HTMLElement).focus();
      key('ArrowRight');
      expect(active()).toBe('8');
    });

    it('goes to the last face when Arrow Down leaves a short last row below', () => {
      const { cell, press } = setup();
      (cell(5) as HTMLElement).focus();
      press(document.activeElement, 'ArrowDown');
      press(document.activeElement, 'ArrowDown');
      // Row 2 holds faces 16-19; column 5 does not exist there.
      expect(active()).toBe('19');
      press(document.activeElement, 'ArrowDown');
      expect(active()).toBe('19');
    });

    it('jumps with Home/End inside a row and Ctrl+Home/End across the grid', () => {
      const { cell, press } = setup();
      (cell(10) as HTMLElement).focus();

      press(document.activeElement, 'Home');
      expect(active()).toBe('8');
      press(document.activeElement, 'End');
      expect(active()).toBe('15');
      press(document.activeElement, 'End', { ctrlKey: true });
      expect(active()).toBe('19');
      press(document.activeElement, 'Home', { ctrlKey: true });
      expect(active()).toBe('0');
    });

    it('keeps the tab stop on the face the arrows reached', () => {
      const { cells, press } = setup();
      press(document.activeElement, 'ArrowDown');

      const stops = cells().filter((c) => c.tabIndex === 0);
      expect(stops).toHaveLength(1);
      expect(stops[0].dataset['index']).toBe('8');
    });

    it('closes on Escape and hands focus back to the chip without reopening it', () => {
      const { fixture, trigger, panel, press } = setup();

      press(document.activeElement, 'Escape');
      fixture.detectChanges();

      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(trigger());
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
    });

    it('keeps Escape from also closing a dialog around the group', () => {
      const { el, press } = setup();
      const outer = vi.fn();
      el.addEventListener('keydown', outer);

      press(document.activeElement, 'Escape');

      expect(outer).not.toHaveBeenCalled();
    });

    it('mirrors Arrow Left/Right in a right-to-left context', () => {
      const { el, cell, press } = setup();
      const grid = el.querySelector('[role="grid"]') as HTMLElement;
      const computed = getComputedStyle.bind(window);
      vi.spyOn(window, 'getComputedStyle').mockImplementation((target) =>
        target === grid
          ? ({ direction: 'rtl' } as CSSStyleDeclaration)
          : computed(target as Element),
      );
      (cell(3) as HTMLElement).focus();

      press(document.activeElement, 'ArrowLeft');
      expect(active()).toBe('4');
      press(document.activeElement, 'ArrowRight');
      expect(active()).toBe('3');
      vi.restoreAllMocks();
    });
  });

  describe('large counts', () => {
    it('renders nothing until the panel opens', () => {
      const { chip, open, cells } = create({
        people: people(300),
        max: { count: 3 },
      });
      expect(chip().querySelectorAll('[role="gridcell"]')).toHaveLength(0);

      open();

      expect(cells().length).toBeGreaterThan(0);
    });

    it('renders only the rows around the viewport, not every hidden avatar', () => {
      const { open, cells, grid } = create({
        people: people(300),
        max: { count: 3 },
      });
      open();

      // 297 hidden, 8 per row.
      expect(grid().getAttribute('aria-rowcount')).toBe('38');
      // The visible rows plus a few either side, 8 faces each.
      expect(cells().length).toBeLessThanOrEqual((MAX_VISIBLE_ROWS + 3) * 8);
      expect(cells()[0].dataset['index']).toBe('0');
    });

    it('slides the rendered window as the grid scrolls, padding for the rest', () => {
      const { fixture, open, cells, grid } = create({
        people: people(300),
        max: { count: 3 },
      });
      open();

      const scroller = grid();
      scroller.scrollTop = 38 * 20; // 20 rows down (face 32 + gap 6)
      scroller.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();

      const first = Number(cells()[0].dataset['index']);
      const last = Number(cells()[cells().length - 1].dataset['index']);
      expect(first).toBeGreaterThanOrEqual(8 * 17);
      expect(first).toBeLessThanOrEqual(8 * 20);
      expect(last).toBeGreaterThanOrEqual(8 * 20);
      // Two rows of overscan each side of the visible ones.
      expect(cells().length).toBeLessThanOrEqual((MAX_VISIBLE_ROWS + 5) * 8);
      const rows = scroller.querySelector(
        '.andes-avatar-face-grid__rows',
      ) as HTMLElement;
      expect(parseFloat(rows.style.paddingBlockStart)).toBe((38 * first) / 8);
      expect(parseFloat(rows.style.paddingBlockEnd)).toBeGreaterThan(0);
    });

    it('scrolls to and focuses a face that is not rendered yet', () => {
      const { fixture, hover, trigger, press, cell, grid } = create({
        people: people(300),
        max: { count: 3 },
      });
      hover();
      press(trigger(), 'ArrowDown');
      expect(cell(296)).toBeNull();

      press(document.activeElement, 'End', { ctrlKey: true });
      fixture.detectChanges();
      fixture.detectChanges();

      expect(
        (document.activeElement as HTMLElement | null)?.dataset['index'],
      ).toBe('296');
      expect(grid()).not.toBeNull();
      expect(trigger().getAttribute('aria-expanded')).toBe('true');
    });

    it('lays a row layout out as one line holding every face', () => {
      const { hover, grid, cells, panel } = create({
        people: people(20),
        max: { count: 2, popover: { layout: 'row' } },
      });
      hover();

      expect(grid().querySelectorAll('[role="row"]')).toHaveLength(1);
      expect(cells()).toHaveLength(18);
      expect(grid().getAttribute('aria-rowcount')).toBe('1');
      expect(
        panel()
          .querySelector('andes-avatar-face-grid')
          ?.getAttribute('data-layout'),
      ).toBe('row');
      // A row never gets the "more" heading: it scrolls sideways instead.
      expect(
        panel().querySelector('.andes-avatar-group-count__panel-label'),
      ).toBeNull();
    });

    it('moves along a row with Arrow Left/Right only', () => {
      const { hover, trigger, press } = create({
        people: people(20),
        max: { count: 2, popover: { layout: 'row' } },
      });
      hover();
      press(trigger(), 'ArrowDown');

      press(document.activeElement, 'ArrowRight');
      press(document.activeElement, 'ArrowRight');
      expect((document.activeElement as HTMLElement).dataset['index']).toBe(
        '2',
      );
      press(document.activeElement, 'ArrowDown');
      expect((document.activeElement as HTMLElement).dataset['index']).toBe(
        '2',
      );
      press(document.activeElement, 'End');
      expect((document.activeElement as HTMLElement).dataset['index']).toBe(
        '17',
      );
    });
  });

  describe('panel position and sizing', () => {
    it('scales the faces from the avatar size, within 28-48px and 6-8 per row', () => {
      expect(faceColumns(28)).toBe(8);
      expect(faceColumns(32)).toBe(8);
      expect(faceColumns(40)).toBe(7);
      expect(faceColumns(48)).toBe(6);

      const sized = TestBed.createComponent(SizedHost);
      sized.detectChanges();
      const chip = sized.nativeElement.querySelector(
        'andes-avatar-group-count',
      ) as HTMLElement;
      chip.dispatchEvent(new Event('mouseenter'));
      sized.detectChanges();
      const grid = chip.querySelector('andes-avatar-face-grid') as HTMLElement;
      expect(grid.style.getPropertyValue('--_andes-avatar-face')).toBe('40px');
      expect(
        chip.querySelector('[role="grid"]')?.getAttribute('aria-colcount'),
      ).toBe('7');
    });

    it('slides a panel that would overflow the viewport back inside it', () => {
      const { fixture, hover, panel, chip } = create();
      const rect = (left: number, right: number) =>
        ({
          left,
          right,
          width: right - left,
          top: 0,
          bottom: 10,
          height: 10,
          x: left,
          y: 0,
        }) as DOMRect;
      const spy = vi
        .spyOn(Element.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: Element) {
          return this.classList.contains('andes-avatar-group-count__panel')
            ? rect(-30, 270)
            : rect(0, 0);
        });

      hover();
      fixture.detectChanges();

      expect(
        panel().style.getPropertyValue('--_andes-avatar-panel-shift'),
      ).toBe('38px');
      chip().dispatchEvent(new Event('mouseleave'));
      spy.mockRestore();
    });
  });

  describe('custom template and names', () => {
    it('still renders a custom template instead of the faces, with the faces in its context', () => {
      const { fixture, hover, chip } = create({ max: { count: 2 } });
      fixture.componentInstance.max.set({
        count: 2,
        popover: { template: fixture.componentInstance.panel() },
      });
      fixture.detectChanges();
      hover();

      expect(chip().querySelector('[role="grid"]')).toBeNull();
      expect(chip().querySelectorAll('.custom-panel li')).toHaveLength(11);
      expect(chip().querySelector('.custom-count')?.textContent).toBe('10');
      expect(
        chip().querySelector('button')?.getAttribute('aria-label'),
      ).toBeNull();
    });

    it('keeps the names-only list for a hand-placed chip without faces', () => {
      @Component({
        imports: [AndesAvatarGroupCount],
        template: `<andes-avatar-group-count
          [count]="2"
          [hiddenNames]="['Dana', 'Elliot']"
        />`,
      })
      class NamesHost {}

      const fixture = TestBed.createComponent(NamesHost);
      fixture.detectChanges();
      const chip = fixture.nativeElement.querySelector(
        'andes-avatar-group-count',
      ) as HTMLElement;
      chip.dispatchEvent(new Event('mouseenter'));
      fixture.detectChanges();

      expect(chip.querySelector('[role="tooltip"]')).not.toBeNull();
      expect(
        chip.querySelectorAll('.andes-avatar-group-count__name'),
      ).toHaveLength(2);
      expect(chip.querySelector('[role="grid"]')).toBeNull();
    });

    it('takes faces directly on a hand-placed chip', () => {
      const faces: AndesAvatarFace[] = [
        { name: 'Dana Whitfield', text: 'DW' },
        { name: 'Elliot Brandt', src: 'e.png', text: 'EB' },
      ];
      @Component({
        imports: [AndesAvatarGroupCount],
        template: `<andes-avatar-group-count
          [count]="2"
          [hiddenFaces]="faces"
          panelLayout="row"
          trigger="click"
        />`,
      })
      class FacesHost {
        readonly faces = faces;
      }

      const fixture = TestBed.createComponent(FacesHost);
      fixture.detectChanges();
      const chip = fixture.nativeElement.querySelector(
        'andes-avatar-group-count',
      ) as HTMLElement;
      chip.querySelector('button')?.click();
      fixture.detectChanges();

      expect(
        [...chip.querySelectorAll('[role="gridcell"]')].map((c) =>
          c.getAttribute('aria-label'),
        ),
      ).toEqual(['Dana Whitfield', 'Elliot Brandt']);
    });
  });

  describe('initialsOf', () => {
    it('takes the first letters of the first and last word', () => {
      expect(initialsOf('Alice Moreau')).toBe('AM');
      expect(initialsOf('  maria  de la cruz ')).toBe('MC');
      expect(initialsOf('Cher')).toBe('C');
      expect(initialsOf('   ')).toBe('');
    });
  });
});

@Component({
  imports: [AndesAvatar, AndesAvatarFallback, AndesAvatarGroup],
  template: `<andes-avatar-group size="lg" [max]="{ count: 1 }">
    @for (name of names; track name) {
      <andes-avatar
        ><andes-avatar-fallback>{{ name }}</andes-avatar-fallback></andes-avatar
      >
    }
  </andes-avatar-group>`,
})
class SizedHost {
  readonly names = people(12).map((person) => person.name);
}

// --- Stylesheet contract -----------------------------------------------------
// jsdom does not lay anything out, so the scrolling, snapping and motion rules
// are asserted on the stylesheet text Angular attaches to the document.

describe('overflow panel stylesheet', () => {
  function stylesheet(): string {
    // The grid's styles are attached when its component first renders.
    const h = create();
    h.hover();
    // Without the attributes Angular's style scoping adds to every selector.
    return [...document.querySelectorAll('style')]
      .map((style) => style.textContent ?? '')
      .join('\n')
      .replace(/\[_ng(content|host)-[^\]]+\]/g, '');
  }

  /** The declarations of the first rule whose selector starts with `selector`. */
  function rule(css: string, selector: string): string {
    let at = css.indexOf(selector);
    while (at >= 0) {
      const open = css.indexOf('{', at + selector.length);
      if (open < 0) {
        return '';
      }
      if (!css.slice(at + selector.length, open).includes('}')) {
        return css.slice(open + 1, css.indexOf('}', open));
      }
      at = css.indexOf(selector, at + 1);
    }
    return '';
  }

  it('scrolls the grid vertically with a thin, contained scrollbar', () => {
    const css = stylesheet();
    const scroller = rule(css, '.andes-avatar-face-grid__scroller');
    const scrolls = rule(css, '.andes-avatar-face-grid__scroller--scrolls');

    expect(scroller).toMatch(/overscroll-behavior:\s*contain/);
    expect(scroller).toMatch(/scrollbar-width:\s*thin/);
    expect(scrolls).toMatch(/overflow-y:\s*auto/);
    expect(scrolls).toMatch(/scrollbar-gutter:\s*stable/);
  });

  it('makes the row layout scroll sideways and snap to faces', () => {
    const css = stylesheet();

    expect(css).toMatch(/scroll-snap-type:\s*x proximity/);
    expect(css).toMatch(/scroll-snap-align:\s*start/);
    expect(css).toMatch(/overflow-x:\s*auto/);
  });

  it('uses logical properties and no physical left/right padding or margins', () => {
    const css = stylesheet();
    const grid = [...css.matchAll(/[^}]*andes-avatar-face-grid[^{]*\{[^}]*\}/g)]
      .map((m) => m[0])
      .join('\n');

    expect(grid).toMatch(/inset-inline|padding-inline|min-inline-size/);
    expect(grid).not.toMatch(/\b(margin|padding)-(left|right)\b/);
    expect(grid).not.toMatch(/(^|[\s;{])(left|right)\s*:/);
  });

  it('keeps a bridge so the pointer can cross from the chip into the panel', () => {
    const css = stylesheet();

    expect(css).toMatch(
      /andes-avatar-group-count__panel--faces::before\s*\{[^}]*content:\s*(''|"")/,
    );
  });

  it('themes through tokens, so light and dark follow the page', () => {
    const css = stylesheet();
    const face = rule(css, '.andes-avatar-face-grid__face');

    expect(face).toMatch(/var\(\s*--andes-avatar-background/);
    expect(face).toContain('var(--andes-color-secondary)');
    expect(face).toContain('var(--andes-color-foreground)');
    expect(css).not.toMatch(
      /andes-avatar-face-grid[^{]*\{[^}]*#[0-9a-f]{3,6}/i,
    );
  });

  it('switches its hover motion off for reduced motion', () => {
    const css = stylesheet();

    expect(css).toMatch(
      /prefers-reduced-motion:\s*reduce\)\s*\{[^@]*andes-avatar-face-grid__face\s*\{[^}]*transition:\s*none/,
    );
  });

  it('keeps an outline ring on a focused face (a control, not a text box)', () => {
    const css = stylesheet();
    const focus = rule(css, '.andes-avatar-face-grid__face:focus-visible');

    expect(focus).toMatch(
      /outline:\s*2px solid var\(--andes-color-focus-ring\)/,
    );
  });
});
