import {
  encodeQr,
  encodeQrSegments,
  isQrAlphanumeric,
  isQrNumeric,
  makeQrAlphanumericSegment,
  makeQrByteSegment,
  makeQrNumericSegment,
  makeQrSegments,
  QR_ERROR_LEVELS,
  QrCapacityError,
  qrAlignmentPositions,
  qrBlockLayout,
  qrBuildDataCodewords,
  qrDataCodewords,
  qrFormatBits,
  qrInterleaveCodewords,
  qrMaskApplies,
  qrReedSolomonRemainder,
  qrVersionBits,
  raiseQrErrorLevel,
  type QrErrorLevel,
  type QrMatrix,
} from './qr-encoder';

/* ============================================================================
 * A small, independent reference decoder.
 *
 * It reads a finished matrix back the way a scanner would: format information
 * (nearest of the 32 valid words), un-mask, zig-zag read over the modules the
 * specification leaves for data, de-interleave, verify every Reed-Solomon block by
 * evaluating its syndromes in its own GF(256) arithmetic, then parse the segments.
 * The function-module map is rebuilt here from the specification's geometry.
 * ========================================================================== */

const GF_EXP = new Array<number>(512).fill(0);
const GF_LOG = new Array<number>(256).fill(0);
(() => {
  let value = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = value;
    GF_LOG[value] = i;
    value *= 2;
    if (value >= 256) {
      value ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

/** True when the block, read as a polynomial, has a zero syndrome for every roots a^0..a^(n-1). */
function isValidRsBlock(block: readonly number[], eccLength: number): boolean {
  for (let root = 0; root < eccLength; root++) {
    let syndrome = 0;
    for (const coefficient of block) {
      syndrome = gfMul(syndrome, GF_EXP[root]) ^ coefficient;
    }
    if (syndrome !== 0) {
      return false;
    }
  }
  return true;
}

function functionModules(version: number): boolean[][] {
  const size = version * 4 + 17;
  const map = Array.from({ length: size }, () =>
    new Array<boolean>(size).fill(false),
  );
  const mark = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        map[y][x] = true;
      }
    }
  };
  // Finder + separator + format strips (the 9x9 corners, including the dark module).
  mark(0, 0, 8, 8);
  mark(size - 8, 0, size - 1, 8);
  mark(0, size - 8, 8, size - 1);
  mark(6, 0, 6, size - 1);
  mark(0, 6, size - 1, 6);
  const centres = qrAlignmentPositions(version);
  for (const cy of centres) {
    for (const cx of centres) {
      const onFinder =
        (cx === 6 && cy === 6) ||
        (cx === 6 && cy === size - 7) ||
        (cx === size - 7 && cy === 6);
      if (!onFinder) {
        mark(cx - 2, cy - 2, cx + 2, cy + 2);
      }
    }
  }
  if (version >= 7) {
    mark(size - 11, 0, size - 9, 5);
    mark(0, size - 11, 5, size - 9);
  }
  return map;
}

interface Decoded {
  errorLevel: QrErrorLevel;
  mask: number;
  text: string;
  codewords: number[];
}

function decodeMatrix(matrix: QrMatrix): Decoded {
  const { size, version } = matrix;
  const at = (x: number, y: number) => matrix.modules[y][x];

  // Format information, first copy: bits 0-14 as laid out around the top-left finder.
  // prettier-ignore
  const positions: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  let word = 0;
  positions.forEach(([x, y], bit) => {
    if (at(x, y)) {
      word |= 1 << bit;
    }
  });
  let best: {
    errorLevel: QrErrorLevel;
    mask: number;
    distance: number;
  } | null = null;
  for (const errorLevel of QR_ERROR_LEVELS) {
    for (let mask = 0; mask < 8; mask++) {
      let diff = qrFormatBits(errorLevel, mask) ^ word;
      let distance = 0;
      while (diff) {
        distance += diff & 1;
        diff >>>= 1;
      }
      if (!best || distance < best.distance) {
        best = { errorLevel, mask, distance };
      }
    }
  }
  const { errorLevel, mask } = best as NonNullable<typeof best>;
  expect(best?.distance).toBe(0);

  // Zig-zag read of the data modules, un-masked.
  const reserved = functionModules(version);
  const bits: number[] = [];
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5;
    }
    for (let step = 0; step < size; step++) {
      const y = upward ? size - 1 - step : step;
      for (const x of [right, right - 1]) {
        if (!reserved[y][x]) {
          bits.push(at(x, y) !== qrMaskApplies(mask, x, y) ? 1 : 0);
        }
      }
    }
    upward = !upward;
  }
  const {
    rawCodewords,
    blockCount,
    eccPerBlock,
    shortBlocks,
    shortBlockLength,
  } = qrBlockLayout(version, errorLevel);
  const codewords: number[] = [];
  for (let i = 0; i < rawCodewords; i++) {
    let value = 0;
    for (let b = 0; b < 8; b++) {
      value = (value << 1) | bits[i * 8 + b];
    }
    codewords.push(value);
  }

  // De-interleave and check each block against its own syndromes.
  const blocks: number[][] = Array.from({ length: blockCount }, () => []);
  let cursor = 0;
  const dataColumns = shortBlockLength - eccPerBlock;
  for (let column = 0; column < dataColumns; column++) {
    for (let b = 0; b < blockCount; b++) {
      blocks[b].push(codewords[cursor++]);
    }
  }
  for (let b = shortBlocks; b < blockCount; b++) {
    blocks[b].push(codewords[cursor++]);
  }
  for (let column = 0; column < eccPerBlock; column++) {
    for (let b = 0; b < blockCount; b++) {
      blocks[b].push(codewords[cursor++]);
    }
  }
  expect(cursor).toBe(rawCodewords);
  for (const block of blocks) {
    expect(isValidRsBlock(block, eccPerBlock)).toBe(true);
  }
  const data = blocks.flatMap((block) =>
    block.slice(0, block.length - eccPerBlock),
  );

  // Parse the segments.
  const stream = data.flatMap((byte) =>
    Array.from({ length: 8 }, (_, i) => (byte >>> (7 - i)) & 1),
  );
  let pos = 0;
  const take = (count: number) => {
    let value = 0;
    for (let i = 0; i < count; i++) {
      value = (value << 1) | stream[pos++];
    }
    return value;
  };
  const tier = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  const bytes: number[] = [];
  let text = '';
  while (stream.length - pos >= 4) {
    const mode = take(4);
    if (mode === 0) {
      break;
    }
    if (mode === 1) {
      let count = take([10, 12, 14][tier]);
      while (count >= 3) {
        text += String(take(10)).padStart(3, '0');
        count -= 3;
      }
      if (count === 2) {
        text += String(take(7)).padStart(2, '0');
      } else if (count === 1) {
        text += String(take(4));
      }
    } else if (mode === 2) {
      const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
      let count = take([9, 11, 13][tier]);
      while (count >= 2) {
        const pair = take(11);
        text += charset[Math.floor(pair / 45)] + charset[pair % 45];
        count -= 2;
      }
      if (count === 1) {
        text += charset[take(6)];
      }
    } else if (mode === 4) {
      const count = take([8, 16, 16][tier]);
      for (let i = 0; i < count; i++) {
        bytes.push(take(8));
      }
      text += new TextDecoder().decode(new Uint8Array(bytes.splice(0)));
    } else {
      throw new Error(`Unexpected mode ${mode}`);
    }
  }
  return { errorLevel, mask, text, codewords };
}

function rows(matrix: QrMatrix): string[] {
  return matrix.modules.map((row) => row.map((m) => (m ? '#' : '.')).join(''));
}

/** Deterministic pseudo-random numbers, so a failure is reproducible. */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/* ========================================================================== */

describe('QR encoder', () => {
  describe('segments', () => {
    it('classifies text into the most compact mode', () => {
      expect(makeQrSegments('0123456789')[0].mode).toBe('numeric');
      expect(makeQrSegments('HELLO WORLD $%*+-./:')[0].mode).toBe(
        'alphanumeric',
      );
      expect(makeQrSegments('Hello world')[0].mode).toBe('byte');
      expect(makeQrSegments('')).toEqual([]);
      expect(isQrNumeric('12a')).toBe(false);
      expect(isQrAlphanumeric('hello')).toBe(false);
    });

    it('packs numeric digits in groups of three (10/7/4 bits)', () => {
      expect(makeQrNumericSegment('123456').bits).toHaveLength(20);
      expect(makeQrNumericSegment('1234567').bits).toHaveLength(24);
      expect(makeQrNumericSegment('12345678').bits).toHaveLength(27);
      // 123 -> 0001111011
      expect(makeQrNumericSegment('123').bits.join('')).toBe('0001111011');
    });

    it('packs alphanumeric pairs in 11 bits and a single in 6', () => {
      // "AC-42": AC = 10*45+12 = 462, -4 = 41*45+4 = 1849, 2 = 2
      const segment = makeQrAlphanumericSegment('AC-42');
      expect(segment.bits.join('')).toBe(
        (462).toString(2).padStart(11, '0') +
          (1849).toString(2).padStart(11, '0') +
          (2).toString(2).padStart(6, '0'),
      );
    });

    it('encodes multi-byte characters as UTF-8', () => {
      const segment = makeQrSegments('café €')[0];
      expect(segment.mode).toBe('byte');
      expect(segment.charCount).toBe(new TextEncoder().encode('café €').length);
    });

    it('rejects characters a mode cannot carry', () => {
      expect(() => makeQrNumericSegment('12a')).toThrow(RangeError);
      expect(() => makeQrAlphanumericSegment('abc')).toThrow(RangeError);
    });
  });

  describe('Reed-Solomon and codewords', () => {
    it('matches the published HELLO WORLD (version 1-M) data and correction codewords', () => {
      const segments = makeQrSegments('HELLO WORLD');
      const data = qrBuildDataCodewords(segments, 1, 'M');
      expect(data).toEqual([
        32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17,
      ]);
      expect(qrReedSolomonRemainder(data, 10)).toEqual([
        196, 35, 39, 119, 235, 215, 231, 226, 93, 23,
      ]);
      expect(qrInterleaveCodewords(data, 1, 'M')).toEqual([
        ...data,
        196,
        35,
        39,
        119,
        235,
        215,
        231,
        226,
        93,
        23,
      ]);
    });

    it('produces codewords whose syndromes vanish, for blocks of every shape', () => {
      const random = rng(7);
      for (const degree of [7, 10, 13, 17, 22, 26, 30]) {
        const data = Array.from({ length: 40 }, () =>
          Math.floor(random() * 256),
        );
        const block = [...data, ...qrReedSolomonRemainder(data, degree)];
        expect(isValidRsBlock(block, degree)).toBe(true);
        block[3] ^= 0x55;
        expect(isValidRsBlock(block, degree)).toBe(false);
      }
    });

    it('terminates and pads with 0xEC / 0x11', () => {
      const data = qrBuildDataCodewords(makeQrSegments('1'), 1, 'L');
      expect(data).toHaveLength(19);
      // mode 0001, count 0000000001, digit 0001, terminator 0000, then bit padding.
      expect(data.slice(0, 3)).toEqual([0b00010000, 0b00000100, 0b01000000]);
      expect(data.slice(3, 7)).toEqual([0xec, 0x11, 0xec, 0x11]);
    });
  });

  describe('tables and format words', () => {
    it('reports the published data capacities', () => {
      expect(qrDataCodewords(1, 'L')).toBe(19);
      expect(qrDataCodewords(1, 'M')).toBe(16);
      expect(qrDataCodewords(1, 'Q')).toBe(13);
      expect(qrDataCodewords(1, 'H')).toBe(9);
      expect(qrDataCodewords(7, 'M')).toBe(124);
      expect(qrDataCodewords(40, 'L')).toBe(2956);
      expect(qrDataCodewords(40, 'M')).toBe(2334);
      expect(qrDataCodewords(40, 'Q')).toBe(1666);
      expect(qrDataCodewords(40, 'H')).toBe(1276);
    });

    it('lists the published alignment pattern centres', () => {
      expect(qrAlignmentPositions(1)).toEqual([]);
      expect(qrAlignmentPositions(2)).toEqual([6, 18]);
      expect(qrAlignmentPositions(7)).toEqual([6, 22, 38]);
      expect(qrAlignmentPositions(14)).toEqual([6, 26, 46, 66]);
      expect(qrAlignmentPositions(21)).toEqual([6, 28, 50, 72, 94]);
      expect(qrAlignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138]);
      expect(qrAlignmentPositions(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
    });

    it('computes the published format words (mask 0)', () => {
      expect(qrFormatBits('L', 0).toString(2).padStart(15, '0')).toBe(
        '111011111000100',
      );
      expect(qrFormatBits('M', 0).toString(2).padStart(15, '0')).toBe(
        '101010000010010',
      );
      expect(qrFormatBits('Q', 0).toString(2).padStart(15, '0')).toBe(
        '011010101011111',
      );
      expect(qrFormatBits('H', 0).toString(2).padStart(15, '0')).toBe(
        '001011010001001',
      );
    });

    it('computes the published version words', () => {
      expect(qrVersionBits(7).toString(2).padStart(18, '0')).toBe(
        '000111110010010100',
      );
      expect(qrVersionBits(8).toString(2).padStart(18, '0')).toBe(
        '001000010110111100',
      );
      expect(qrVersionBits(40).toString(2).padStart(18, '0')).toBe(
        '101000110001101001',
      );
    });
  });

  describe('symbol geometry', () => {
    it('picks the smallest version that fits (module counts 21, 25, 29 ...)', () => {
      expect(encodeQr('HELLO WORLD', { errorLevel: 'M' })).toMatchObject({
        version: 1,
        size: 21,
      });
      // 23 bytes: version 1-L holds 17 bytes, version 2-M holds 26.
      expect(
        encodeQr('https://www.example.com', { errorLevel: 'M' }),
      ).toMatchObject({
        version: 2,
        size: 25,
      });
      expect(
        encodeQr('https://andes.example/pay/42', { errorLevel: 'Q' }),
      ).toMatchObject({
        version: 3,
        size: 29,
      });
      expect(encodeQr('x'.repeat(100), { errorLevel: 'H' }).size).toBe(
        encodeQr('x'.repeat(100), { errorLevel: 'H' }).version * 4 + 17,
      );
    });

    it('matches a frozen HELLO WORLD symbol (version 1, level M)', () => {
      const matrix = encodeQr('HELLO WORLD', {
        errorLevel: 'M',
        boostErrorLevel: false,
      });
      expect(matrix.mask).toBe(0);
      expect(rows(matrix)).toEqual([
        '#######...#.#.#######',
        '#.....#.###...#.....#',
        '#.###.#...#.#.#.###.#',
        '#.###.#...#.#.#.###.#',
        '#.###.#.#.###.#.###.#',
        '#.....#..###..#.....#',
        '#######.#.#.#.#######',
        '.....................',
        '#.#.#.#..#..#...#..#.',
        '.####...#..#....#...#',
        '...#######.#..#.##...',
        '####.#.##..###.#.###.',
        '.#..####.#.#..###.#.#',
        '........#.#...#...#.#',
        '#######.....#..#.##..',
        '#.....#..##...##.#...',
        '#.###.#.##..#.#######',
        '#.###.#...##.#.#...#.',
        '#.###.#.####.###.#..#',
        '#.....#....###...#.##',
        '#######.##.#.###....#',
      ]);
    });

    it('matches a frozen payment-URL symbol (version 3, level Q)', () => {
      const matrix = encodeQr('https://andes.example/pay/42', {
        errorLevel: 'Q',
        boostErrorLevel: false,
      });
      expect(matrix.mask).toBe(0);
      expect(rows(matrix)).toEqual([
        '#######.#..###..#..##.#######',
        '#.....#.#.####.#.###..#.....#',
        '#.###.#.###.....#.#...#.###.#',
        '#.###.#.#.###.....##..#.###.#',
        '#.###.#.#.##.#..#.##..#.###.#',
        '#.....#..#....#....#..#.....#',
        '#######.#.#.#.#.#.#.#.#######',
        '........###.#.#..#..#........',
        '.##.#.##.#..###.#.##..#.#####',
        '...###.######.#..#....#...#.#',
        '#######.#...#...#......#.####',
        '...##...#...##.####.###.#..#.',
        '#...#.#.###...#.##.##.##.#...',
        '.##..#..#.###..##.#.####...##',
        '#..#####.#...##..#....##..###',
        '##..#...#..#..##...#.#.#.....',
        '###.#.#.##..##......###..#..#',
        '..#.##..##.....#.#...###.#.##',
        '#.###.#.#........##..#.##.###',
        '.#.###..##.#...#.###..#....#.',
        '#..####....##....########..#.',
        '........####.##.##.##...#..##',
        '#######.#....#....###.#.#.###',
        '#.....#..#.....####.#...#..#.',
        '#.###.#.###.##..#.#.######...',
        '#.###.#..##.##.##.#.##..#.#..',
        '#.###.#.#.....####.#...##.#.#',
        '#.....#.####....##..##.#...#.',
        '#######...###..###.####.#..##',
      ]);
    });

    it('draws the finder, timing and dark-module patterns', () => {
      for (const version of [1, 2, 7, 14, 40]) {
        const matrix = encodeQr('1', {
          minVersion: version,
          maxVersion: version,
        });
        const { size, modules } = matrix;
        for (const [cx, cy] of [
          [3, 3],
          [size - 4, 3],
          [3, size - 4],
        ]) {
          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const ring = Math.max(Math.abs(dx), Math.abs(dy));
              expect(modules[cy + dy][cx + dx]).toBe(ring !== 2);
            }
          }
        }
        for (let i = 8; i < size - 8; i++) {
          expect(modules[6][i]).toBe(i % 2 === 0);
          expect(modules[i][6]).toBe(i % 2 === 0);
        }
        expect(modules[size - 8][8]).toBe(true);
      }
    });

    it('writes the format and version words into both places', () => {
      const matrix = encodeQr('1', {
        errorLevel: 'Q',
        minVersion: 10,
        maxVersion: 10,
        mask: 5,
        boostErrorLevel: false,
      });
      const { size } = matrix;
      const bits = qrFormatBits('Q', 5);
      for (let i = 0; i < 8; i++) {
        expect(matrix.modules[8][size - 1 - i]).toBe(((bits >>> i) & 1) === 1);
      }
      for (let i = 8; i < 15; i++) {
        expect(matrix.modules[size - 15 + i][8]).toBe(((bits >>> i) & 1) === 1);
      }
      const version = qrVersionBits(10);
      for (let i = 0; i < 18; i++) {
        const dark = ((version >>> i) & 1) === 1;
        expect(matrix.modules[Math.floor(i / 3)][size - 11 + (i % 3)]).toBe(
          dark,
        );
        expect(matrix.modules[size - 11 + (i % 3)][Math.floor(i / 3)]).toBe(
          dark,
        );
      }
    });
  });

  describe('options', () => {
    it('raises the level while the data still fits, unless told not to', () => {
      // 74 bits: fits 1-Q (104) but not 1-H (72).
      expect(encodeQr('HELLO WORLD', { errorLevel: 'L' }).errorLevel).toBe('Q');
      expect(
        encodeQr('HELLO WORLD', { errorLevel: 'L', boostErrorLevel: false })
          .errorLevel,
      ).toBe('L');
    });

    it('honours a forced mask and rejects an invalid one', () => {
      for (let mask = 0; mask < 8; mask++) {
        expect(encodeQr('mask test', { mask }).mask).toBe(mask);
      }
      expect(() => encodeQr('x', { mask: 8 })).toThrow(RangeError);
    });

    it('honours the version range', () => {
      expect(encodeQr('1', { minVersion: 5 }).version).toBe(5);
      expect(() => encodeQr('x'.repeat(100), { maxVersion: 2 })).toThrow(
        QrCapacityError,
      );
      expect(() => encodeQr('1', { minVersion: 41 })).toThrow(RangeError);
      expect(() => encodeQr('1', { minVersion: 4, maxVersion: 3 })).toThrow(
        RangeError,
      );
    });

    it('encodes an empty string as an empty (decodable) symbol', () => {
      const matrix = encodeQr('', { boostErrorLevel: false });
      expect(matrix.version).toBe(1);
      expect(decodeMatrix(matrix).text).toBe('');
    });

    it('can combine hand-made segments', () => {
      const matrix = encodeQrSegments(
        [
          makeQrAlphanumericSegment('ORDER-'),
          makeQrNumericSegment('20260417'),
          makeQrByteSegment([0xc3, 0xa9]),
        ],
        { errorLevel: 'M' },
      );
      expect(decodeMatrix(matrix).text).toBe('ORDER-20260417é');
    });
  });

  describe('capacity', () => {
    it('fills version 40 to the published limits and refuses one more', () => {
      const limits: [string, QrErrorLevel, number][] = [
        ['9', 'L', 7089],
        ['A', 'L', 4296],
        ['x', 'L', 2953],
        ['9', 'H', 3057],
        ['A', 'H', 1852],
        ['x', 'H', 1273],
      ];
      for (const [char, level, max] of limits) {
        const fits = encodeQr(char.repeat(max), {
          errorLevel: level,
          boostErrorLevel: false,
        });
        expect(fits.version).toBe(40);
        expect(fits.size).toBe(177);
        expect(() =>
          encodeQr(char.repeat(max + 1), { errorLevel: level }),
        ).toThrow(QrCapacityError);
      }
    });
  });

  describe('decode round trip', () => {
    it('reads back the same text, mask and level for a spread of inputs', () => {
      const samples = [
        '0',
        '12345678901234567890',
        'HELLO WORLD',
        'ABC-123 $%*+./:',
        'https://andes.example/pay/42?ref=A1&amount=19.90',
        'Pago de S/ 1,250.00 — Tamci Ñandú €',
        '日本語のテキスト 🚀',
        'x'.repeat(300),
      ];
      for (const text of samples) {
        for (const level of QR_ERROR_LEVELS) {
          const matrix = encodeQr(text, { errorLevel: level });
          const decoded = decodeMatrix(matrix);
          expect(decoded.text).toBe(text);
          expect(decoded.errorLevel).toBe(matrix.errorLevel);
          expect(decoded.mask).toBe(matrix.mask);
        }
      }
    });

    it('round-trips random texts across versions 1-40, every level and mode', () => {
      const random = rng(2026);
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 $%*+-./:';
      for (let run = 0; run < 72; run++) {
        const level = QR_ERROR_LEVELS[run % 4];
        const mode = Math.floor(run / 4) % 3;
        const length = 1 + Math.floor(random() * (run % 9 === 0 ? 1200 : 200));
        let text = '';
        for (let i = 0; i < length; i++) {
          if (mode === 0) {
            text += Math.floor(random() * 10);
          } else if (mode === 1) {
            text += alphabet[Math.floor(random() * alphabet.length)];
          } else {
            text += String.fromCodePoint(32 + Math.floor(random() * 2000));
          }
        }
        const matrix = encodeQr(text, { errorLevel: level });
        expect(decodeMatrix(matrix).text).toBe(text);
      }
    });

    it('round-trips at the very largest size (version 40, level H)', () => {
      const text = 'Z'.repeat(1852);
      const matrix = encodeQr(text, { errorLevel: 'H' });
      expect(matrix.version).toBe(40);
      expect(decodeMatrix(matrix).text).toBe(text);
    });

    it('decodes every one of the eight masks', () => {
      for (let mask = 0; mask < 8; mask++) {
        const matrix = encodeQr('https://andes.example', {
          mask,
          errorLevel: 'Q',
        });
        expect(decodeMatrix(matrix)).toMatchObject({
          text: 'https://andes.example',
          mask,
        });
      }
    });

    it('lets the reference decoder notice a damaged symbol', () => {
      // Flip a run of data modules: the syndrome check must now fail, which proves the
      // checks above are not vacuous.
      const matrix = encodeQr('integrity', { errorLevel: 'L' });
      const damaged: QrMatrix = {
        ...matrix,
        modules: matrix.modules.map((row, y) =>
          row.map((module, x) =>
            y === 12 && x > 10 && x < 20 ? !module : module,
          ),
        ),
      };
      expect(() => decodeMatrix(damaged)).toThrow();
    });
  });

  describe('raiseQrErrorLevel', () => {
    it('never lowers the requested level', () => {
      expect(raiseQrErrorLevel('H', 0)).toBe('H');
      expect(raiseQrErrorLevel('Q', 0.01)).toBe('Q');
      expect(raiseQrErrorLevel('M', 0)).toBe('M');
    });

    it('picks the lowest level whose recovery is at least twice the covered share', () => {
      expect(raiseQrErrorLevel('L', 0.03)).toBe('L');
      expect(raiseQrErrorLevel('L', 0.05)).toBe('M');
      expect(raiseQrErrorLevel('L', 0.1)).toBe('Q');
      expect(raiseQrErrorLevel('M', 0.14)).toBe('H');
      expect(raiseQrErrorLevel('M', 0.9)).toBe('H');
    });
  });
});
