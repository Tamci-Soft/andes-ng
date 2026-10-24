import { InjectionToken, type Signal } from '@angular/core';

export interface AndesAnchorLinkRef {
  href: string;
  title: string;
  target?: string;
}

export interface AndesAnchorClickEvent {
  event: MouseEvent;
  link: AndesAnchorLinkRef;
}

/** What a projected link needs from the anchor that contains it. */
export interface AndesAnchorHost {
  readonly activeLink: Signal<string | undefined>;
  readonly direction: Signal<'vertical' | 'horizontal'>;
  handleClick(event: MouseEvent, link: AndesAnchorLinkRef): void;
}

export const ANDES_ANCHOR = new InjectionToken<AndesAnchorHost>('ANDES_ANCHOR');
