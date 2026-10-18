import { Injectable, signal } from '@angular/core';

import {
  andesWatermarkDataUrl,
  andesWatermarkTile,
  type AndesWatermarkEnvironment,
  type AndesWatermarkOptions,
  type AndesWatermarkTile,
} from './watermark-canvas';
import type { AndesWatermarkPaint } from './watermark-overlay';

interface Published {
  owner: object;
  paint: AndesWatermarkPaint;
}

/**
 * Renders watermark tiles on demand, and shares the watermark of an enclosing
 * `andes-watermark` with content that renders outside it (dialogs, drawers, menus).
 */
@Injectable({ providedIn: 'root' })
export class AndesWatermarkService {
  private readonly published = signal<readonly Published[]>([]);

  /** The watermark inheriting content should currently show, or `null`. */
  readonly active = () => this.published().at(-1)?.paint ?? null;

  tile(
    options: AndesWatermarkOptions,
    environment?: AndesWatermarkEnvironment,
  ): Promise<AndesWatermarkTile | null> {
    return andesWatermarkTile(options, environment);
  }

  dataUrl(
    options: AndesWatermarkOptions,
    environment?: AndesWatermarkEnvironment,
  ): Promise<string | null> {
    return andesWatermarkDataUrl(options, environment);
  }

  /** Makes `paint` available to `andesWatermarkInherit` content. The latest publisher wins. */
  publish(owner: object, paint: AndesWatermarkPaint): void {
    this.published.update((list) => [
      ...list.filter((p) => p.owner !== owner),
      { owner, paint },
    ]);
  }

  revoke(owner: object): void {
    this.published.update((list) => list.filter((p) => p.owner !== owner));
  }
}
