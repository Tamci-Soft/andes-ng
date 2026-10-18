import { encodeQr } from './qr-encoder';
import {
  buildQrLayout,
  drawQrToCanvas,
  encodeQrForLayout,
  QR_MAX_ICON_COVERAGE,
  qrSvgMarkup,
  type QrCanvasContext,
  type QrIconSpec,
} from './qr-render';

const ICON: QrIconSpec = {
  src: 'data:image/svg+xml,%3Csvg/%3E',
  width: 32,
  height: 32,
  bordered: true,
};

/** Rebuilds the dark-module grid from path data. */
function pathToGrid(path: string, side: number): boolean[][] {
  const grid = Array.from({ length: side }, () =>
    new Array<boolean>(side).fill(false),
  );
  for (const match of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const [x, y, length] = [match[1], match[2], match[3]].map(Number);
    for (let i = 0; i < length; i++) {
      grid[y][x + i] = true;
    }
  }
  return grid;
}

describe('QR rendering helpers', () => {
  const matrix = encodeQr('https://andes.example/pay/42', { errorLevel: 'Q' });

  describe('buildQrLayout', () => {
    it('describes the whole graphic: symbol plus quiet zone', () => {
      const layout = buildQrLayout(matrix, { size: 200, quietZone: 2 });
      expect(layout.modules).toBe(matrix.size + 4);
      expect(layout.moduleSize).toBeCloseTo(200 / (matrix.size + 4));
      expect(layout.knockout).toBeNull();
      expect(layout.icon).toBeNull();
      expect(layout.coverage).toBe(0);
    });

    it('turns every dark module (and nothing else) into path data', () => {
      for (const quietZone of [0, 2, 4]) {
        const layout = buildQrLayout(matrix, { size: 160, quietZone });
        const grid = pathToGrid(layout.path, layout.modules);
        for (let y = 0; y < layout.modules; y++) {
          for (let x = 0; x < layout.modules; x++) {
            const mx = x - quietZone;
            const my = y - quietZone;
            const inside =
              mx >= 0 && my >= 0 && mx < matrix.size && my < matrix.size;
            expect(grid[y][x]).toBe(inside && matrix.modules[my][mx]);
          }
        }
      }
    });

    it('merges horizontal runs into single sub-paths', () => {
      const layout = buildQrLayout(matrix, { size: 160, quietZone: 0 });
      const darkModules = matrix.modules.flat().filter(Boolean).length;
      const subPaths = layout.path.split('z').length - 1;
      expect(subPaths).toBeLessThan(darkModules);
    });

    it('centres a module-aligned knockout for a logo and removes its modules', () => {
      const layout = buildQrLayout(matrix, {
        size: 200,
        quietZone: 2,
        icon: ICON,
      });
      const knockout = layout.knockout as NonNullable<typeof layout.knockout>;
      expect(Number.isInteger(knockout.x)).toBe(true);
      expect(Number.isInteger(knockout.y)).toBe(true);
      // Same parity as the symbol, so it sits exactly on the centre.
      expect(Math.abs(knockout.width - matrix.size) % 2).toBe(0);
      expect(knockout.x + knockout.width / 2).toBeCloseTo(2 + matrix.size / 2);
      expect(knockout.y + knockout.height / 2).toBeCloseTo(2 + matrix.size / 2);
      // Big enough for the logo plus a one-module halo on each side.
      expect(knockout.width * layout.moduleSize).toBeGreaterThanOrEqual(
        ICON.width + 2 * layout.moduleSize - 1e-6,
      );
      const grid = pathToGrid(layout.path, layout.modules);
      for (let y = knockout.y; y < knockout.y + knockout.height; y++) {
        for (let x = knockout.x; x < knockout.x + knockout.width; x++) {
          expect(grid[y][x]).toBe(false);
        }
      }
      expect(layout.coverage).toBeCloseTo(
        (knockout.width * knockout.height) / (matrix.size * matrix.size),
      );
      // The logo itself is centred and drawn at its real size.
      const icon = layout.icon as NonNullable<typeof layout.icon>;
      expect(icon.width * layout.moduleSize).toBeCloseTo(ICON.width);
      expect(icon.x + icon.width / 2).toBeCloseTo(2 + matrix.size / 2);
    });

    it('clears a smaller area without the halo', () => {
      const bordered = buildQrLayout(matrix, {
        size: 200,
        quietZone: 2,
        icon: ICON,
      });
      const plain = buildQrLayout(matrix, {
        size: 200,
        quietZone: 2,
        icon: { ...ICON, bordered: false },
      });
      expect(plain.coverage).toBeLessThan(bordered.coverage);
    });

    it('supports a logo that is not square', () => {
      const layout = buildQrLayout(matrix, {
        size: 200,
        quietZone: 2,
        icon: { ...ICON, width: 60, height: 24 },
      });
      const knockout = layout.knockout as NonNullable<typeof layout.knockout>;
      expect(knockout.width).toBeGreaterThan(knockout.height);
    });
  });

  describe('encodeQrForLayout', () => {
    it('leaves the level alone without a logo', () => {
      const { matrix: encoded } = encodeQrForLayout('payment', {
        errorLevel: 'L',
        boostErrorLevel: false,
        size: 160,
        quietZone: 2,
      });
      expect(encoded.errorLevel).toBe('L');
    });

    it('raises the level until the logo fits within it', () => {
      const { matrix: encoded, layout } = encodeQrForLayout(
        'https://andes.example/pay/42',
        {
          errorLevel: 'L',
          boostErrorLevel: false,
          size: 200,
          quietZone: 2,
          icon: ICON,
        },
      );
      expect(['Q', 'H']).toContain(encoded.errorLevel);
      expect(layout.coverage).toBeLessThanOrEqual(QR_MAX_ICON_COVERAGE + 0.05);
    });

    it('saturates at H for a huge logo', () => {
      const { matrix: encoded } = encodeQrForLayout('hi', {
        size: 120,
        quietZone: 2,
        icon: { ...ICON, width: 70, height: 70 },
      });
      expect(encoded.errorLevel).toBe('H');
    });
  });

  describe('qrSvgMarkup', () => {
    it('serialises a self-contained document with concrete colours', () => {
      const layout = buildQrLayout(matrix, {
        size: 160,
        quietZone: 2,
        icon: ICON,
      });
      const svg = qrSvgMarkup(layout, {
        size: 160,
        quietZone: 2,
        icon: ICON,
        color: 'rgb(15, 23, 42)',
        bgColor: 'rgb(255, 255, 255)',
        title: 'Pay <now> & "go"',
      });
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain(
        `viewBox="0 0 ${layout.modules} ${layout.modules}"`,
      );
      expect(svg).toContain('width="160" height="160"');
      expect(svg).toContain('fill="rgb(15, 23, 42)"');
      expect(svg).toContain('fill="rgb(255, 255, 255)"');
      expect(svg).toContain(`d="${layout.path}"`);
      expect(svg).toContain('<image href="data:image/svg+xml,%3Csvg/%3E"');
      expect(svg).toContain('Pay &lt;now&gt; &amp; &quot;go&quot;');
      expect(svg).not.toContain('var(');
      expect(
        new DOMParser()
          .parseFromString(svg, 'image/svg+xml')
          .querySelector('parsererror'),
      ).toBeNull();
    });

    it('omits the logo and title when there are none', () => {
      const layout = buildQrLayout(matrix, { size: 100, quietZone: 0 });
      const svg = qrSvgMarkup(layout, {
        size: 100,
        quietZone: 0,
        color: '#000',
        bgColor: '#fff',
      });
      expect(svg).not.toContain('<image');
      expect(svg).not.toContain('<title>');
    });
  });

  describe('drawQrToCanvas', () => {
    function recorder() {
      const calls: { op: string; args: unknown[]; fill?: unknown }[] = [];
      let fillStyle: unknown = '';
      const context = {
        get fillStyle() {
          return fillStyle;
        },
        set fillStyle(value: unknown) {
          fillStyle = value;
        },
        fillRect: (...args: number[]) =>
          calls.push({ op: 'fillRect', args, fill: fillStyle }),
        drawImage: (...args: unknown[]) =>
          calls.push({ op: 'drawImage', args }),
      } as unknown as QrCanvasContext;
      return { context, calls };
    }

    it('paints the background, then each dark run, on whole pixels', () => {
      const layout = buildQrLayout(matrix, { size: 160, quietZone: 2 });
      const { context, calls } = recorder();
      drawQrToCanvas(context, matrix, layout, {
        color: 'black',
        bgColor: 'white',
        pixels: 333,
        quietZone: 2,
      });
      expect(calls[0]).toMatchObject({
        op: 'fillRect',
        args: [0, 0, 333, 333],
        fill: 'white',
      });
      const runs = calls.slice(1);
      expect(runs.length).toBe(layout.path.split('z').length - 1);
      for (const call of runs) {
        expect(call.fill).toBe('black');
        expect((call.args as number[]).every(Number.isInteger)).toBe(true);
      }
      // Painting the runs reproduces exactly the matrix.
      const pixels = Array.from({ length: 333 }, () =>
        new Array<boolean>(333).fill(false),
      );
      for (const { args } of runs) {
        const [x, y, w, h] = args as number[];
        for (let j = y; j < y + h; j++) {
          for (let i = x; i < x + w; i++) {
            pixels[j][i] = true;
          }
        }
      }
      const scale = 333 / layout.modules;
      for (let my = 0; my < matrix.size; my++) {
        for (let mx = 0; mx < matrix.size; mx++) {
          const px = Math.floor((mx + 2 + 0.5) * scale);
          const py = Math.floor((my + 2 + 0.5) * scale);
          expect(pixels[py][px]).toBe(matrix.modules[my][mx]);
        }
      }
    });

    it('draws a loaded logo contained inside its box', () => {
      const layout = buildQrLayout(matrix, {
        size: 200,
        quietZone: 2,
        icon: ICON,
      });
      const { context, calls } = recorder();
      const image = {} as CanvasImageSource;
      drawQrToCanvas(context, matrix, layout, {
        color: 'black',
        bgColor: 'white',
        pixels: 400,
        quietZone: 2,
        image,
        imageSize: { width: 200, height: 100 },
      });
      const draw = calls.find((call) => call.op === 'drawImage');
      const [source, x, y, width, height] = draw?.args as [
        unknown,
        number,
        number,
        number,
        number,
      ];
      expect(source).toBe(image);
      expect(width / height).toBeCloseTo(2);
      const box = layout.icon as NonNullable<typeof layout.icon>;
      const scale = 400 / layout.modules;
      expect(width).toBeCloseTo(box.width * scale);
      expect(x + width / 2).toBeCloseTo((box.x + box.width / 2) * scale);
      expect(y + height / 2).toBeCloseTo((box.y + box.height / 2) * scale);
    });

    it('draws no logo when none is loaded', () => {
      const layout = buildQrLayout(matrix, {
        size: 200,
        quietZone: 2,
        icon: ICON,
      });
      const { context, calls } = recorder();
      drawQrToCanvas(context, matrix, layout, {
        color: 'black',
        bgColor: 'white',
        pixels: 200,
        quietZone: 2,
      });
      expect(calls.some((call) => call.op === 'drawImage')).toBe(false);
    });
  });
});
