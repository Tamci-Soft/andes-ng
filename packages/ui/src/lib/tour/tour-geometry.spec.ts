import {
  computeTourLayout,
  expandRect,
  parsePlacement,
  type AndesTourRect,
} from './tour-geometry';

const VIEWPORT = { width: 1000, height: 800 };
const CARD = { width: 300, height: 150 };
const MIDDLE: AndesTourRect = { left: 450, top: 350, width: 100, height: 100 };

describe('tour geometry', () => {
  describe('expandRect', () => {
    it('grows the box by the offset on every side', () => {
      expect(
        expandRect(
          { left: 100, top: 100, width: 50, height: 20 },
          { offset: 6 },
        ),
      ).toEqual({
        left: 94,
        top: 94,
        width: 62,
        height: 32,
      });
    });

    it('takes a separate horizontal and vertical offset, and defaults to 6', () => {
      expect(
        expandRect(
          { left: 100, top: 100, width: 50, height: 20 },
          { offset: [10, 2] },
        ),
      ).toEqual({
        left: 90,
        top: 98,
        width: 70,
        height: 24,
      });
      expect(
        expandRect({ left: 0, top: 0, width: 10, height: 10 }, null).width,
      ).toBe(22);
    });
  });

  describe('parsePlacement', () => {
    it('reads the side and the alignment along it', () => {
      expect(parsePlacement('bottom')).toEqual({
        side: 'bottom',
        align: 'center',
      });
      expect(parsePlacement('topLeft')).toEqual({
        side: 'top',
        align: 'start',
      });
      expect(parsePlacement('topRight')).toEqual({ side: 'top', align: 'end' });
      expect(parsePlacement('leftTop')).toEqual({
        side: 'left',
        align: 'start',
      });
      expect(parsePlacement('rightBottom')).toEqual({
        side: 'right',
        align: 'end',
      });
    });

    it('leaves auto and center to the layout', () => {
      expect(parsePlacement('auto')).toBeNull();
      expect(parsePlacement('center')).toBeNull();
    });
  });

  describe('computeTourLayout', () => {
    const layout = (
      placement: Parameters<typeof computeTourLayout>[0]['placement'],
      spot: AndesTourRect | null = MIDDLE,
      arrow = true,
    ) =>
      computeTourLayout({
        spot,
        card: CARD,
        viewport: VIEWPORT,
        placement,
        arrow,
      });

    it('centres the card on the page with no spotlight, and for `center`', () => {
      expect(layout('bottom', null)).toEqual({
        left: 350,
        top: 325,
        side: 'center',
        arrowOffset: null,
      });
      expect(layout('center').side).toBe('center');
    });

    it('puts the card below, centred on the spotlight, with the arrow in the middle', () => {
      const result = layout('bottom');
      expect(result.side).toBe('bottom');
      expect(result.left).toBe(350);
      expect(result.top).toBe(450 + 12);
      expect(result.arrowOffset).toBe(150);
    });

    it('aligns to the start or the end of the spotlight', () => {
      expect(layout('bottomLeft').left).toBe(450);
      expect(layout('bottomRight').left).toBe(550 - 300);
      expect(layout('rightTop').top).toBe(350);
      expect(layout('rightBottom').top).toBe(450 - 150);
    });

    it('sits on every side', () => {
      expect(layout('top')).toMatchObject({ side: 'top', top: 350 - 12 - 150 });
      expect(layout('left')).toMatchObject({
        side: 'left',
        left: 450 - 12 - 300,
      });
      expect(layout('right')).toMatchObject({ side: 'right', left: 550 + 12 });
    });

    it('keeps the arrow on the spotlight when the card has to shift along the edge', () => {
      const spot = { left: 20, top: 100, width: 40, height: 40 };
      const result = layout('bottom', spot);
      expect(result.left).toBe(8);
      // Spotlight centre is x=40; the card starts at 8, so the arrow sits 32px in.
      expect(result.arrowOffset).toBe(32);
    });

    it('never lets the arrow reach a corner', () => {
      const spot = { left: 0, top: 100, width: 10, height: 10 };
      expect(layout('bottom', spot).arrowOffset).toBe(16);
    });

    it('flips to the opposite side when there is no room', () => {
      const low = { left: 450, top: 700, width: 100, height: 60 };
      expect(layout('bottom', low).side).toBe('top');
      const high = { left: 450, top: 10, width: 100, height: 60 };
      expect(layout('top', high).side).toBe('bottom');
    });

    it('tries the other sides when neither of a pair fits, then the roomiest', () => {
      const wide = { left: 0, top: 0, width: 1000, height: 800 };
      const tall = computeTourLayout({
        spot: { left: 100, top: 20, width: 800, height: 760 },
        card: CARD,
        viewport: VIEWPORT,
        placement: 'bottom',
        arrow: true,
      });
      expect(['left', 'right', 'top', 'bottom']).toContain(tall.side);
      const fill = computeTourLayout({
        spot: wide,
        card: CARD,
        viewport: VIEWPORT,
        placement: 'top',
        arrow: true,
      });
      // Nothing fits: it still ends up inside the viewport.
      expect(fill.left).toBeGreaterThanOrEqual(8);
      expect(fill.top).toBeGreaterThanOrEqual(8);
    });

    it('auto prefers below, then above, then the sides', () => {
      expect(layout('auto').side).toBe('bottom');
      expect(
        layout('auto', { left: 450, top: 700, width: 100, height: 60 }).side,
      ).toBe('top');
    });

    it('stays inside the viewport', () => {
      for (const placement of [
        'top',
        'bottom',
        'left',
        'right',
        'auto',
      ] as const) {
        const edge = { left: 940, top: 760, width: 50, height: 30 };
        const result = layout(placement, edge);
        expect(result.left).toBeGreaterThanOrEqual(8);
        expect(result.left + CARD.width).toBeLessThanOrEqual(
          VIEWPORT.width - 8,
        );
        expect(result.top).toBeGreaterThanOrEqual(8);
        expect(result.top + CARD.height).toBeLessThanOrEqual(
          VIEWPORT.height - 8,
        );
      }
    });

    it('has no arrow offset without an arrow, and sits closer', () => {
      const result = layout('bottom', MIDDLE, false);
      expect(result.arrowOffset).toBeNull();
      expect(result.top).toBe(450 + 8);
    });
  });
});
