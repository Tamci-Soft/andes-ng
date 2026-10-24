/**
 * A dependency-free QR Code (Model 2) encoder.
 *
 * Pure and side-effect free: text (or ready-made segments) in, a square boolean matrix out.
 * Covers numeric / alphanumeric / byte (UTF-8) modes, versions 1-40, the four error
 * correction levels (L, M, Q, H), Reed-Solomon codewords over GF(256), the eight data masks
 * with penalty scoring, and the BCH-protected format and version information.
 *
 * Module coordinates are `(x, y)` = (column, row), origin top-left; `true` is a dark module.
 */

/** Error correction level: roughly 7 % (L), 15 % (M), 25 % (Q) or 30 % (H) of codewords. */
export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H';

/** The three data encodings the encoder produces. */
export type QrMode = 'numeric' | 'alphanumeric' | 'byte';

export const QR_MIN_VERSION = 1;
export const QR_MAX_VERSION = 40;

/** Weakest to strongest; the order `boostErrorLevel` and `raiseQrErrorLevel` walk. */
export const QR_ERROR_LEVELS: readonly QrErrorLevel[] = ['L', 'M', 'Q', 'H'];

/** A run of data in a single mode. `bits` is the data field only (no mode/count header). */
export interface QrSegment {
  readonly mode: QrMode;
  /** Characters (numeric, alphanumeric) or bytes (byte) the segment stands for. */
  readonly charCount: number;
  readonly bits: readonly number[];
}

export interface QrEncodeOptions {
  /** Requested correction level. Default `M`. */
  readonly errorLevel?: QrErrorLevel;
  /** Smallest version to consider. Default 1. */
  readonly minVersion?: number;
  /** Largest version to consider. Default 40. */
  readonly maxVersion?: number;
  /** Force one of the masks 0-7; any other value (default) picks the lowest penalty. */
  readonly mask?: number;
  /** Raise the level above `errorLevel` when that does not grow the symbol. Default `true`. */
  readonly boostErrorLevel?: boolean;
}

export interface QrMatrix {
  /** 1-40. */
  readonly version: number;
  /** Modules per side: `version * 4 + 17`. */
  readonly size: number;
  /** The level actually used (may be above the requested one when boosted). */
  readonly errorLevel: QrErrorLevel;
  /** The mask (0-7) that was applied. */
  readonly mask: number;
  /** Row-major: `modules[y][x]`. */
  readonly modules: readonly (readonly boolean[])[];
}

/** Thrown when the data does not fit the largest permitted version. */
export class QrCapacityError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = 'QrCapacityError';
  }
}

/* -------------------------------------------------------------------------- tables */

const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const NUMERIC_REGEX = /^[0-9]*$/;
const ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+\-./:]*$/;

/** Two-bit value written into the format information for each level. */
const FORMAT_BITS: Readonly<Record<QrErrorLevel, number>> = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2,
};

const LEVEL_INDEX: Readonly<Record<QrErrorLevel, number>> = {
  L: 0,
  M: 1,
  Q: 2,
  H: 3,
};

/** Error correction codewords per block, indexed `[level][version]` (index 0 unused). */
const ECC_CODEWORDS_PER_BLOCK: readonly (readonly number[])[] = [
  // prettier-ignore
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // prettier-ignore
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  // prettier-ignore
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // prettier-ignore
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
];

/** Number of error correction blocks, indexed `[level][version]` (index 0 unused). */
const BLOCK_COUNT: readonly (readonly number[])[] = [
  // prettier-ignore
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  // prettier-ignore
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  // prettier-ignore
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  // prettier-ignore
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
];

const PENALTY_RUN = 3;
const PENALTY_BLOCK = 3;
const PENALTY_FINDER = 40;
const PENALTY_BALANCE = 10;

/* ------------------------------------------------------------------------ bit helpers */

function appendBits(target: number[], value: number, length: number): void {
  for (let i = length - 1; i >= 0; i--) {
    target.push((value >>> i) & 1);
  }
}

function getBit(value: number, index: number): boolean {
  return ((value >>> index) & 1) !== 0;
}

/* ------------------------------------------------------------------------- segments */

/** `true` when every character is a decimal digit. */
export function isQrNumeric(text: string): boolean {
  return NUMERIC_REGEX.test(text);
}

/** `true` when every character is in the 45-character alphanumeric set (upper case only). */
export function isQrAlphanumeric(text: string): boolean {
  return ALPHANUMERIC_REGEX.test(text);
}

function utf8Bytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

export function makeQrNumericSegment(digits: string): QrSegment {
  if (!isQrNumeric(digits)) {
    throw new RangeError('The numeric segment contains a non-digit character.');
  }
  const bits: number[] = [];
  for (let i = 0; i < digits.length;) {
    const take = Math.min(digits.length - i, 3);
    appendBits(bits, parseInt(digits.slice(i, i + take), 10), take * 3 + 1);
    i += take;
  }
  return { mode: 'numeric', charCount: digits.length, bits };
}

export function makeQrAlphanumericSegment(text: string): QrSegment {
  if (!isQrAlphanumeric(text)) {
    throw new RangeError(
      'The alphanumeric segment contains a character outside the QR alphanumeric set.',
    );
  }
  const bits: number[] = [];
  let i = 0;
  for (; i + 2 <= text.length; i += 2) {
    const pair =
      ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)) * 45 +
      ALPHANUMERIC_CHARSET.indexOf(text.charAt(i + 1));
    appendBits(bits, pair, 11);
  }
  if (i < text.length) {
    appendBits(bits, ALPHANUMERIC_CHARSET.indexOf(text.charAt(i)), 6);
  }
  return { mode: 'alphanumeric', charCount: text.length, bits };
}

/** Raw bytes as-is. */
export function makeQrByteSegment(bytes: readonly number[]): QrSegment {
  const bits: number[] = [];
  for (const byte of bytes) {
    appendBits(bits, byte, 8);
  }
  return { mode: 'byte', charCount: bytes.length, bits };
}

/**
 * Picks the most compact single mode able to carry `text`: numeric, else alphanumeric, else
 * UTF-8 bytes. Empty text yields no segments (a valid, empty symbol).
 */
export function makeQrSegments(text: string): QrSegment[] {
  if (text === '') {
    return [];
  }
  if (isQrNumeric(text)) {
    return [makeQrNumericSegment(text)];
  }
  if (isQrAlphanumeric(text)) {
    return [makeQrAlphanumericSegment(text)];
  }
  return [makeQrByteSegment(utf8Bytes(text))];
}

function charCountBits(mode: QrMode, version: number): number {
  const tier = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  switch (mode) {
    case 'numeric':
      return [10, 12, 14][tier];
    case 'alphanumeric':
      return [9, 11, 13][tier];
    default:
      return [8, 16, 16][tier];
  }
}

const MODE_INDICATOR: Readonly<Record<QrMode, number>> = {
  numeric: 0x1,
  alphanumeric: 0x2,
  byte: 0x4,
};

/** Bits the segments take at `version`, or `Infinity` when a count overflows its field. */
function totalBits(segments: readonly QrSegment[], version: number): number {
  let total = 0;
  for (const segment of segments) {
    const countBits = charCountBits(segment.mode, version);
    if (segment.charCount >= 1 << countBits) {
      return Infinity;
    }
    total += 4 + countBits + segment.bits.length;
  }
  return total;
}

/* ------------------------------------------------------------------------ capacity */

/** Modules that carry data or error correction (everything but the function patterns). */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alignCount = Math.floor(version / 7) + 2;
    result -= (25 * alignCount - 10) * alignCount - 55;
    if (version >= 7) {
      result -= 36;
    }
  }
  return result;
}

/** Data (non-correction) codewords at a version and level. */
export function qrDataCodewords(
  version: number,
  errorLevel: QrErrorLevel,
): number {
  const level = LEVEL_INDEX[errorLevel];
  return (
    Math.floor(rawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[level][version] * BLOCK_COUNT[level][version]
  );
}

/** Centres (both axes) of the alignment patterns; empty for version 1. */
export function qrAlignmentPositions(version: number): number[] {
  if (version === 1) {
    return [];
  }
  const alignCount = Math.floor(version / 7) + 2;
  const step =
    Math.floor((version * 8 + alignCount * 3 + 5) / (alignCount * 4 - 4)) * 2;
  const positions = [6];
  for (
    let position = version * 4 + 10;
    positions.length < alignCount;
    position -= step
  ) {
    positions.splice(1, 0, position);
  }
  return positions;
}

/**
 * Fraction of the data capacity (in whole codewords) that the `errorLevel` can lose and still
 * be decoded. Used to size a centre logo - see `raiseQrErrorLevel`.
 */
export function qrRecoveryCapacity(errorLevel: QrErrorLevel): number {
  return { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 }[errorLevel];
}

/**
 * The lowest level at or above `requested` that can survive `coverage` (0-1, the fraction of
 * the symbol's area that is covered or knocked out) with a safety factor of two: the covered
 * modules are contiguous, so a decoder's real margin is smaller than the headline percentage.
 * Never lowers the requested level; saturates at `H`.
 */
export function raiseQrErrorLevel(
  requested: QrErrorLevel,
  coverage: number,
): QrErrorLevel {
  const required = Math.max(0, coverage) * 2;
  for (const level of QR_ERROR_LEVELS.slice(LEVEL_INDEX[requested])) {
    if (qrRecoveryCapacity(level) >= required) {
      return level;
    }
  }
  return 'H';
}

/* --------------------------------------------------------------------- Reed-Solomon */

let exponentTable: Uint8Array | undefined;
let logTable: Uint8Array | undefined;

function fieldTables(): { exp: Uint8Array; log: Uint8Array } {
  if (!exponentTable || !logTable) {
    const exp = new Uint8Array(512);
    const log = new Uint8Array(256);
    let value = 1;
    for (let i = 0; i < 255; i++) {
      exp[i] = value;
      log[value] = i;
      value <<= 1;
      if (value & 0x100) {
        value ^= 0x11d;
      }
    }
    for (let i = 255; i < 512; i++) {
      exp[i] = exp[i - 255];
    }
    exponentTable = exp;
    logTable = log;
  }
  return { exp: exponentTable, log: logTable };
}

/** Multiplication in GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1. */
export function qrFieldMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return 0;
  }
  const { exp, log } = fieldTables();
  return exp[log[a] + log[b]];
}

/** Coefficients of (x - a^0)(x - a^1)...(x - a^(degree-1)), highest power first, monic term dropped. */
function generatorPolynomial(degree: number): number[] {
  const { exp } = fieldTables();
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = qrFieldMultiply(result[j], root);
      if (j + 1 < degree) {
        result[j] ^= result[j + 1];
      }
    }
    root = exp[(i + 1) % 255];
  }
  return result;
}

/** The `degree` Reed-Solomon error correction codewords for `data`. */
export function qrReedSolomonRemainder(
  data: readonly number[],
  degree: number,
): number[] {
  const divisor = generatorPolynomial(degree);
  const result = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    for (let i = 0; i < degree; i++) {
      result[i] ^= qrFieldMultiply(divisor[i], factor);
    }
  }
  return result;
}

/* -------------------------------------------------------------------------- codewords */

/** The data codewords (mode headers, payload, terminator, padding) for a version and level. */
export function qrBuildDataCodewords(
  segments: readonly QrSegment[],
  version: number,
  errorLevel: QrErrorLevel,
): number[] {
  const capacityBits = qrDataCodewords(version, errorLevel) * 8;
  const bits: number[] = [];
  for (const segment of segments) {
    appendBits(bits, MODE_INDICATOR[segment.mode], 4);
    appendBits(bits, segment.charCount, charCountBits(segment.mode, version));
    for (const bit of segment.bits) {
      bits.push(bit);
    }
  }
  if (bits.length > capacityBits) {
    throw new QrCapacityError('The data does not fit this version and level.');
  }
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) {
    appendBits(bits, pad, 8);
  }
  const codewords = new Array<number>(bits.length / 8).fill(0);
  bits.forEach((bit, index) => {
    codewords[index >>> 3] |= bit << (7 - (index & 7));
  });
  return codewords;
}

/** How the codewords of a version and level are divided into error correction blocks. */
export interface QrBlockLayout {
  readonly blockCount: number;
  /** Correction codewords in every block. */
  readonly eccPerBlock: number;
  /** All codewords (data + correction) in the symbol. */
  readonly rawCodewords: number;
  /** Blocks one data codeword shorter than the rest; they come first. */
  readonly shortBlocks: number;
  /** Total length (data + correction) of a short block. */
  readonly shortBlockLength: number;
}

export function qrBlockLayout(
  version: number,
  errorLevel: QrErrorLevel,
): QrBlockLayout {
  const level = LEVEL_INDEX[errorLevel];
  const blockCount = BLOCK_COUNT[level][version];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  return {
    blockCount,
    eccPerBlock: ECC_CODEWORDS_PER_BLOCK[level][version],
    rawCodewords,
    shortBlocks: blockCount - (rawCodewords % blockCount),
    shortBlockLength: Math.floor(rawCodewords / blockCount),
  };
}

/** Splits into blocks, appends each block's correction codewords and interleaves them. */
export function qrInterleaveCodewords(
  data: readonly number[],
  version: number,
  errorLevel: QrErrorLevel,
): number[] {
  const {
    blockCount,
    eccPerBlock: eccLength,
    shortBlocks,
    shortBlockLength,
  } = qrBlockLayout(version, errorLevel);

  const blocks: number[][] = [];
  for (let i = 0, offset = 0; i < blockCount; i++) {
    const dataLength = shortBlockLength - eccLength + (i < shortBlocks ? 0 : 1);
    const block = data.slice(offset, offset + dataLength);
    offset += dataLength;
    const ecc = qrReedSolomonRemainder(block, eccLength);
    if (i < shortBlocks) {
      block.push(0);
    }
    blocks.push(block.concat(ecc));
  }

  const result: number[] = [];
  for (let column = 0; column < blocks[0].length; column++) {
    blocks.forEach((block, row) => {
      // Short blocks carry a placeholder in the last data column; skip it.
      if (column !== shortBlockLength - eccLength || row >= shortBlocks) {
        result.push(block[column]);
      }
    });
  }
  return result;
}

/* ------------------------------------------------------------------------- the grid */

type MaskPredicate = (x: number, y: number) => boolean;

const MASKS: readonly MaskPredicate[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Whether the data module at `(x, y)` is inverted by `mask` (0-7). */
export function qrMaskApplies(mask: number, x: number, y: number): boolean {
  return MASKS[mask](x, y);
}

class Grid {
  readonly size: number;
  readonly modules: boolean[][];
  readonly reserved: boolean[][];

  constructor(readonly version: number) {
    this.size = version * 4 + 17;
    const make = () =>
      Array.from({ length: this.size }, () =>
        new Array<boolean>(this.size).fill(false),
      );
    this.modules = make();
    this.reserved = make();
  }

  set(x: number, y: number, dark: boolean): void {
    this.modules[y][x] = dark;
    this.reserved[y][x] = true;
  }

  drawFunctionPatterns(): void {
    const { size } = this;
    for (let i = 0; i < size; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(size - 4, 3);
    this.drawFinder(3, size - 4);

    const positions = qrAlignmentPositions(this.version);
    const last = positions.length - 1;
    positions.forEach((cx, i) => {
      positions.forEach((cy, j) => {
        const overlapsFinder =
          (i === 0 && j === 0) ||
          (i === 0 && j === last) ||
          (i === last && j === 0);
        if (!overlapsFinder) {
          this.drawAlignment(cx, cy);
        }
      });
    });

    // Placeholder format bits, so the area is reserved before the data is placed.
    this.drawFormat('L', 0);
    this.drawVersion();
  }

  private drawFinder(cx: number, cy: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
          this.set(x, y, distance !== 2 && distance !== 4);
        }
      }
    }
  }

  private drawAlignment(cx: number, cy: number): void {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  drawFormat(errorLevel: QrErrorLevel, mask: number): void {
    const bits = qrFormatBits(errorLevel, mask);
    const { size } = this;
    for (let i = 0; i <= 5; i++) {
      this.set(8, i, getBit(bits, i));
    }
    this.set(8, 7, getBit(bits, 6));
    this.set(8, 8, getBit(bits, 7));
    this.set(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) {
      this.set(14 - i, 8, getBit(bits, i));
    }
    for (let i = 0; i < 8; i++) {
      this.set(size - 1 - i, 8, getBit(bits, i));
    }
    for (let i = 8; i < 15; i++) {
      this.set(8, size - 15 + i, getBit(bits, i));
    }
    this.set(8, size - 8, true);
  }

  private drawVersion(): void {
    if (this.version < 7) {
      return;
    }
    const bits = qrVersionBits(this.version);
    for (let i = 0; i < 18; i++) {
      const dark = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.set(a, b, dark);
      this.set(b, a, dark);
    }
  }

  /** Zig-zag placement of the codeword bits into every module not reserved by a pattern. */
  placeCodewords(codewords: readonly number[]): void {
    const { size } = this;
    let bitIndex = 0;
    const totalBitCount = codewords.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) {
        right = 5;
      }
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!this.reserved[y][x] && bitIndex < totalBitCount) {
            this.modules[y][x] = getBit(
              codewords[bitIndex >>> 3],
              7 - (bitIndex & 7),
            );
            bitIndex++;
          }
        }
      }
    }
  }

  applyMask(mask: number): void {
    const predicate = MASKS[mask];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!this.reserved[y][x] && predicate(x, y)) {
          this.modules[y][x] = !this.modules[y][x];
        }
      }
    }
  }

  penalty(): number {
    const { size, modules } = this;
    let result = 0;

    for (let y = 0; y < size; y++) {
      let runColor = false;
      let runLength = 0;
      const history = [0, 0, 0, 0, 0, 0, 0];
      for (let x = 0; x < size; x++) {
        if (modules[y][x] === runColor) {
          runLength++;
          if (runLength === 5) {
            result += PENALTY_RUN;
          } else if (runLength > 5) {
            result++;
          }
        } else {
          pushRun(history, runLength, size);
          if (!runColor) {
            result += countFinderLike(history) * PENALTY_FINDER;
          }
          runColor = modules[y][x];
          runLength = 1;
        }
      }
      result +=
        endRunAndCount(runColor, runLength, history, size) * PENALTY_FINDER;
    }

    for (let x = 0; x < size; x++) {
      let runColor = false;
      let runLength = 0;
      const history = [0, 0, 0, 0, 0, 0, 0];
      for (let y = 0; y < size; y++) {
        if (modules[y][x] === runColor) {
          runLength++;
          if (runLength === 5) {
            result += PENALTY_RUN;
          } else if (runLength > 5) {
            result++;
          }
        } else {
          pushRun(history, runLength, size);
          if (!runColor) {
            result += countFinderLike(history) * PENALTY_FINDER;
          }
          runColor = modules[y][x];
          runLength = 1;
        }
      }
      result +=
        endRunAndCount(runColor, runLength, history, size) * PENALTY_FINDER;
    }

    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const color = modules[y][x];
        if (
          color === modules[y][x + 1] &&
          color === modules[y + 1][x] &&
          color === modules[y + 1][x + 1]
        ) {
          result += PENALTY_BLOCK;
        }
      }
    }

    let dark = 0;
    for (const row of modules) {
      for (const module of row) {
        if (module) {
          dark++;
        }
      }
    }
    const total = size * size;
    const steps = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    return result + steps * PENALTY_BALANCE;
  }
}

/** Pushes a finished run; the very first run is extended by the light border before it. */
function pushRun(history: number[], runLength: number, size: number): void {
  if (history[0] === 0) {
    runLength += size;
  }
  history.pop();
  history.unshift(runLength);
}

/** Number (0-2) of 1:1:3:1:1 finder-like patterns with a 4-module light margin at an end. */
function countFinderLike(history: readonly number[]): number {
  const n = history[1];
  const core =
    n > 0 &&
    history[2] === n &&
    history[3] === n * 3 &&
    history[4] === n &&
    history[5] === n;
  return (
    (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) +
    (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0)
  );
}

function endRunAndCount(
  runColor: boolean,
  runLength: number,
  history: number[],
  size: number,
): number {
  if (runColor) {
    pushRun(history, runLength, size);
    runLength = 0;
  }
  // The light border after the line end counts as one more run.
  runLength += size;
  pushRun(history, runLength, size);
  return countFinderLike(history);
}

/** The 15 format bits (level + mask, BCH(15,5), XOR-masked), as written to the symbol. */
export function qrFormatBits(errorLevel: QrErrorLevel, mask: number): number {
  const data = (FORMAT_BITS[errorLevel] << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

/** The 18 version bits (version + BCH(18,6)); only meaningful from version 7. */
export function qrVersionBits(version: number): number {
  let remainder = version;
  for (let i = 0; i < 12; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  }
  return (version << 12) | remainder;
}

/* ----------------------------------------------------------------------- entry points */

function assertVersionRange(min: number, max: number): void {
  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min < QR_MIN_VERSION ||
    min > max ||
    max > QR_MAX_VERSION
  ) {
    throw new RangeError('Invalid QR version range.');
  }
}

/** Encodes ready-made segments. See `encodeQr` for the text shortcut. */
export function encodeQrSegments(
  segments: readonly QrSegment[],
  options: QrEncodeOptions = {},
): QrMatrix {
  const minVersion = options.minVersion ?? QR_MIN_VERSION;
  const maxVersion = options.maxVersion ?? QR_MAX_VERSION;
  assertVersionRange(minVersion, maxVersion);
  const mask = options.mask ?? -1;
  if (!Number.isInteger(mask) || mask < -1 || mask > 7) {
    throw new RangeError('The mask must be an integer between -1 and 7.');
  }
  let errorLevel = options.errorLevel ?? 'M';

  let version = minVersion;
  let usedBits = 0;
  for (; ; version++) {
    usedBits = totalBits(segments, version);
    if (usedBits <= qrDataCodewords(version, errorLevel) * 8) {
      break;
    }
    if (version >= maxVersion) {
      throw new QrCapacityError(
        'The data is too long for the largest permitted QR version.',
      );
    }
  }

  if (options.boostErrorLevel ?? true) {
    for (const candidate of QR_ERROR_LEVELS) {
      if (
        LEVEL_INDEX[candidate] > LEVEL_INDEX[errorLevel] &&
        usedBits <= qrDataCodewords(version, candidate) * 8
      ) {
        errorLevel = candidate;
      }
    }
  }

  const data = qrBuildDataCodewords(segments, version, errorLevel);
  const codewords = qrInterleaveCodewords(data, version, errorLevel);

  const grid = new Grid(version);
  grid.drawFunctionPatterns();
  grid.placeCodewords(codewords);

  let chosen = mask;
  if (chosen === -1) {
    let best = Infinity;
    for (let candidate = 0; candidate < 8; candidate++) {
      grid.applyMask(candidate);
      grid.drawFormat(errorLevel, candidate);
      const penalty = grid.penalty();
      if (penalty < best) {
        chosen = candidate;
        best = penalty;
      }
      grid.applyMask(candidate); // XOR again: undo
    }
  }
  grid.applyMask(chosen);
  grid.drawFormat(errorLevel, chosen);

  return {
    version,
    size: grid.size,
    errorLevel,
    mask: chosen,
    modules: grid.modules,
  };
}

/**
 * Encodes `text` into a QR matrix. Picks numeric, alphanumeric or UTF-8 byte mode, the
 * smallest version that fits and the best mask.
 *
 * @throws QrCapacityError when the text is longer than the largest permitted version holds.
 */
export function encodeQr(
  text: string,
  options: QrEncodeOptions = {},
): QrMatrix {
  return encodeQrSegments(makeQrSegments(text), options);
}
