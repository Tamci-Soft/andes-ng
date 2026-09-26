import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesCard,
  AndesCardAction,
  AndesCardActions,
  AndesCardContent,
  AndesCardDescription,
  AndesCardFooter,
  AndesCardGrid,
  AndesCardHeader,
  AndesCardMeta,
  AndesCardSize,
  AndesCardTab,
  AndesCardTitle,
  AndesCardTitleLevel,
  AndesCardType,
  AndesCardVariant,
} from './card';

@Component({
  imports: [
    AndesCard,
    AndesCardHeader,
    AndesCardTitle,
    AndesCardDescription,
    AndesCardAction,
    AndesCardContent,
    AndesCardFooter,
  ],
  template: `<andes-card
    [variant]="variant()"
    [size]="size()"
    [hoverable]="hoverable()"
  >
    <andes-card-header>
      <andes-card-title [level]="titleLevel()">Team members</andes-card-title>
      <andes-card-description
        >Manage who has access to this project.</andes-card-description
      >
      <andes-card-action><button type="button">Edit</button></andes-card-action>
    </andes-card-header>
    <andes-card-content>Body content</andes-card-content>
    <andes-card-footer>Footer content</andes-card-footer>
  </andes-card>`,
})
class HostComponent {
  readonly variant = signal<AndesCardVariant>('outlined');
  readonly size = signal<AndesCardSize>('default');
  readonly hoverable = signal(false);
  readonly titleLevel = signal<AndesCardTitleLevel>(3);
}

describe('AndesCard', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector(
      'andes-card',
    ) as HTMLElement;
    return { fixture, card };
  }

  it('renders the full compound structure with projected content', () => {
    const { card } = createHost();

    expect(card.querySelector('andes-card-header')).toBeTruthy();
    expect(card.querySelector('andes-card-title')?.textContent?.trim()).toBe(
      'Team members',
    );
    expect(
      card.querySelector('andes-card-description')?.textContent?.trim(),
    ).toBe('Manage who has access to this project.');
    expect(card.querySelector('andes-card-action button')).toBeTruthy();
    expect(card.querySelector('andes-card-content')?.textContent?.trim()).toBe(
      'Body content',
    );
    expect(card.querySelector('andes-card-footer')?.textContent?.trim()).toBe(
      'Footer content',
    );
  });

  it('defaults to the outlined variant and default size', () => {
    const { card } = createHost();

    expect(card.classList).toContain('andes-card--outlined');
    expect(card.getAttribute('data-variant')).toBe('outlined');
    expect(card.getAttribute('data-size')).toBe('default');
  });

  it('applies the borderless variant', () => {
    const { fixture, card } = createHost();
    fixture.componentInstance.variant.set('borderless');
    fixture.detectChanges();

    expect(card.classList).toContain('andes-card--borderless');
    expect(card.getAttribute('data-variant')).toBe('borderless');
  });

  it('applies the sm size', () => {
    const { fixture, card } = createHost();
    fixture.componentInstance.size.set('sm');
    fixture.detectChanges();

    expect(card.classList).toContain('andes-card--sm');
    expect(card.getAttribute('data-size')).toBe('sm');
  });

  it('is not hoverable by default', () => {
    const { card } = createHost();

    expect(card.classList).not.toContain('andes-card--hoverable');
  });

  it('applies the hoverable class when requested', () => {
    const { fixture, card } = createHost();
    fixture.componentInstance.hoverable.set(true);
    fixture.detectChanges();

    expect(card.classList).toContain('andes-card--hoverable');
  });

  it('treats a bare hoverable attribute (no brackets) as true, not the string ""', () => {
    @Component({
      imports: [AndesCard],
      template: `<andes-card hoverable>Content</andes-card>`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('andes-card');

    expect(card.classList).toContain('andes-card--hoverable');
  });

  it('reflects data-slot on every sub-part', () => {
    const { card } = createHost();

    expect(card.getAttribute('data-slot')).toBe('card');
    expect(
      card.querySelector('andes-card-header')?.getAttribute('data-slot'),
    ).toBe('card-header');
    expect(
      card.querySelector('andes-card-title')?.getAttribute('data-slot'),
    ).toBe('card-title');
    expect(
      card.querySelector('andes-card-description')?.getAttribute('data-slot'),
    ).toBe('card-description');
    expect(
      card.querySelector('andes-card-action')?.getAttribute('data-slot'),
    ).toBe('card-action');
    expect(
      card.querySelector('andes-card-content')?.getAttribute('data-slot'),
    ).toBe('card-content');
    expect(
      card.querySelector('andes-card-footer')?.getAttribute('data-slot'),
    ).toBe('card-footer');
  });

  it('renders the title as a real heading element, defaulting to h3', () => {
    const { card } = createHost();

    expect(
      card.querySelector('h3.andes-card__title')?.textContent?.trim(),
    ).toBe('Team members');
  });

  it.each([2, 4, 5, 6] as const)(
    'renders the title as an h%s when level is set',
    (level) => {
      const { fixture, card } = createHost();
      fixture.componentInstance.titleLevel.set(level);
      fixture.detectChanges();

      expect(
        card.querySelector(`h${level}.andes-card__title`)?.textContent?.trim(),
      ).toBe('Team members');
    },
  );

  it('treats a bare numeric level attribute (no brackets) as a number, not the string', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader, AndesCardTitle],
      template: `<andes-card
        ><andes-card-header
          ><andes-card-title level="2"
            >Title</andes-card-title
          ></andes-card-header
        ></andes-card
      >`,
    })
    class BareLevelHost {}

    const fixture = TestBed.createComponent(BareLevelHost);
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('andes-card-title h2');

    expect(title?.tagName).toBe('H2');
  });

  it('treats another bare numeric level attribute (level="4") as a number', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader, AndesCardTitle],
      template: `<andes-card
        ><andes-card-header
          ><andes-card-title level="4"
            >Title</andes-card-title
          ></andes-card-header
        ></andes-card
      >`,
    })
    class BareLevelHost {}

    const fixture = TestBed.createComponent(BareLevelHost);
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('andes-card-title h4');

    expect(title?.tagName).toBe('H4');
  });

  it('clamps a bare level attribute above the valid range (level="9") to h6', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader, AndesCardTitle],
      template: `<andes-card
        ><andes-card-header
          ><andes-card-title level="9"
            >Title</andes-card-title
          ></andes-card-header
        ></andes-card
      >`,
    })
    class OutOfRangeLevelHost {}

    const fixture = TestBed.createComponent(OutOfRangeLevelHost);
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('andes-card-title h6');

    expect(title?.tagName).toBe('H6');
  });

  it('clamps a bare level attribute below the valid range (level="0") to h2', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader, AndesCardTitle],
      template: `<andes-card
        ><andes-card-header
          ><andes-card-title level="0"
            >Title</andes-card-title
          ></andes-card-header
        ></andes-card
      >`,
    })
    class OutOfRangeLevelHost {}

    const fixture = TestBed.createComponent(OutOfRangeLevelHost);
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('andes-card-title h2');

    expect(title?.tagName).toBe('H2');
  });

  it('falls back to h3 for a non-numeric bare level attribute', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader, AndesCardTitle],
      template: `<andes-card
        ><andes-card-header
          ><andes-card-title level="not-a-number"
            >Title</andes-card-title
          ></andes-card-header
        ></andes-card
      >`,
    })
    class InvalidLevelHost {}

    const fixture = TestBed.createComponent(InvalidLevelHost);
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('andes-card-title h3');

    expect(title?.tagName).toBe('H3');
  });

  it('renders a card with only content, no header or footer', () => {
    @Component({
      imports: [AndesCard, AndesCardContent],
      template: `<andes-card
        ><andes-card-content>Just content</andes-card-content></andes-card
      >`,
    })
    class ContentOnlyHost {}

    const fixture = TestBed.createComponent(ContentOnlyHost);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('andes-card');

    expect(card.querySelector('andes-card-header')).toBeFalsy();
    expect(card.querySelector('andes-card-content')?.textContent?.trim()).toBe(
      'Just content',
    );
  });

  it('supports a cover image placed before the header', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader, AndesCardTitle],
      template: `<andes-card>
        <img src="cover.jpg" alt="" />
        <andes-card-header
          ><andes-card-title>Title</andes-card-title></andes-card-header
        >
      </andes-card>`,
    })
    class CoverHost {}

    const fixture = TestBed.createComponent(CoverHost);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('andes-card');
    const children = Array.from(card.children) as HTMLElement[];

    expect(children[0].tagName).toBe('IMG');
    expect(children[1].tagName.toLowerCase()).toBe('andes-card-header');
  });
});

describe('AndesCard type', () => {
  @Component({
    imports: [AndesCard, AndesCardHeader, AndesCardTitle],
    template: `<andes-card [type]="type()">
      <andes-card-header
        ><andes-card-title>Outer</andes-card-title></andes-card-header
      >
    </andes-card>`,
  })
  class TypeHost {
    readonly type = signal<AndesCardType>('default');
  }

  it('defaults to the default type with a plain header', () => {
    const fixture = TestBed.createComponent(TypeHost);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('andes-card');

    expect(card.getAttribute('data-type')).toBe('default');
    expect(card.classList).not.toContain('andes-card--inner');
    expect(card.querySelector('andes-card-header').classList).not.toContain(
      'andes-card__header--inner',
    );
  });

  it('applies the inner style to the card and its own header', () => {
    const fixture = TestBed.createComponent(TypeHost);
    fixture.componentInstance.type.set('inner');
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('andes-card');

    expect(card.getAttribute('data-type')).toBe('inner');
    expect(card.classList).toContain('andes-card--inner');
    expect(card.querySelector('andes-card-header').classList).toContain(
      'andes-card__header--inner',
    );
  });

  it('styles only the nested card header when an inner card sits inside a default card', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader, AndesCardContent],
      template: `<andes-card>
        <andes-card-header id="outer">Outer</andes-card-header>
        <andes-card-content>
          <andes-card type="inner"
            ><andes-card-header id="inner">Inner</andes-card-header></andes-card
          >
        </andes-card-content>
      </andes-card>`,
    })
    class NestedHost {}

    const fixture = TestBed.createComponent(NestedHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('#outer')?.classList).not.toContain(
      'andes-card__header--inner',
    );
    expect(el.querySelector('#inner')?.classList).toContain(
      'andes-card__header--inner',
    );
  });
});

describe('AndesCard loading', () => {
  @Component({
    imports: [
      AndesCard,
      AndesCardHeader,
      AndesCardTitle,
      AndesCardContent,
      AndesCardActions,
    ],
    template: `<andes-card [loading]="loading()">
      <andes-card-header
        ><andes-card-title>Title</andes-card-title></andes-card-header
      >
      <andes-card-content><p class="body">Loaded body</p></andes-card-content>
      <andes-card-actions
        ><button type="button">Edit</button></andes-card-actions
      >
    </andes-card>`,
  })
  class LoadingHost {
    readonly loading = signal(false);
  }

  function create(loading: boolean) {
    const fixture = TestBed.createComponent(LoadingHost);
    fixture.componentInstance.loading.set(loading);
    fixture.detectChanges();
    return {
      fixture,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  it('renders the projected body and no skeleton by default', () => {
    const { el } = create(false);
    const content = el.querySelector('andes-card-content');

    expect(content?.querySelector('.body')).toBeTruthy();
    expect(content?.querySelector('.andes-card__skeleton')).toBeFalsy();
    expect(content?.hasAttribute('aria-busy')).toBe(false);
  });

  it('swaps the body for an aria-hidden skeleton and marks the region busy', () => {
    const { el } = create(true);
    const content = el.querySelector('andes-card-content');
    const skeleton = content?.querySelector('.andes-card__skeleton');

    expect(content?.querySelector('.body')).toBeFalsy();
    expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
    expect(
      skeleton?.querySelectorAll('.andes-card__skeleton-line').length,
    ).toBe(4);
    expect(content?.getAttribute('aria-busy')).toBe('true');
  });

  it('keeps the header and actions visible while loading', () => {
    const { el } = create(true);

    expect(el.querySelector('h3.andes-card__title')?.textContent?.trim()).toBe(
      'Title',
    );
    expect(el.querySelector('andes-card-actions button')).toBeTruthy();
  });

  it('restores the projected body once loading ends', () => {
    const { fixture, el } = create(true);
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();

    expect(el.querySelector('andes-card-content .body')).toBeTruthy();
    expect(el.querySelector('.andes-card__skeleton')).toBeFalsy();
  });

  it('treats a bare loading attribute as true', () => {
    @Component({
      imports: [AndesCard, AndesCardContent],
      template: `<andes-card loading
        ><andes-card-content>Body</andes-card-content></andes-card
      >`,
    })
    class BareLoadingHost {}

    const fixture = TestBed.createComponent(BareLoadingHost);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-card__skeleton'),
    ).toBeTruthy();
  });
});

describe('AndesCardMeta', () => {
  @Component({
    imports: [AndesCardMeta, AndesCardTitle, AndesCardDescription],
    template: `<andes-card-meta>
      @if (withAvatar()) {
        <span slot="avatar" class="avatar">AB</span>
      }
      <andes-card-title>Ada Byron</andes-card-title>
      <andes-card-description>Engineer</andes-card-description>
    </andes-card-meta>`,
  })
  class MetaHost {
    readonly withAvatar = signal(true);
  }

  it('projects the avatar into its own slot and title/description beside it', () => {
    const fixture = TestBed.createComponent(MetaHost);
    fixture.detectChanges();
    const meta = fixture.nativeElement.querySelector('andes-card-meta');

    expect(meta.getAttribute('data-slot')).toBe('card-meta');
    expect(
      meta.querySelector('.andes-card__meta-avatar .avatar')?.textContent,
    ).toBe('AB');
    const detail = meta.querySelector('.andes-card__meta-detail');
    expect(
      detail.querySelector('h3.andes-card__title')?.textContent?.trim(),
    ).toBe('Ada Byron');
    expect(detail.querySelector('andes-card-description')?.textContent).toBe(
      'Engineer',
    );
    expect(detail.querySelector('.avatar')).toBeFalsy();
  });

  it('leaves the avatar wrapper empty (so CSS can collapse it) when no avatar is given', () => {
    const fixture = TestBed.createComponent(MetaHost);
    fixture.componentInstance.withAvatar.set(false);
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector(
      '.andes-card__meta-avatar',
    ) as HTMLElement;

    expect(wrapper.children.length).toBe(0);
    expect(wrapper.textContent).toBe('');
  });
});

describe('AndesCardGrid', () => {
  @Component({
    imports: [AndesCard, AndesCardContent, AndesCardGrid],
    template: `<andes-card>
      <andes-card-content>
        <andes-card-grid>One</andes-card-grid>
        <andes-card-grid [hoverable]="false">Two</andes-card-grid>
        <andes-card-grid hoverable="false">Three</andes-card-grid>
      </andes-card-content>
    </andes-card>`,
  })
  class GridHost {}

  it('switches the content to the edge-to-edge grid layout when it holds cells', () => {
    const fixture = TestBed.createComponent(GridHost);
    fixture.detectChanges();
    const content = fixture.nativeElement.querySelector('andes-card-content');

    expect(content.classList).toContain('andes-card__content--grid');
    expect(
      content.querySelectorAll('andes-card-grid[data-slot="card-grid"]').length,
    ).toBe(3);
  });

  it('does not use the grid layout for ordinary content', () => {
    @Component({
      imports: [AndesCard, AndesCardContent],
      template: `<andes-card
        ><andes-card-content>Plain</andes-card-content></andes-card
      >`,
    })
    class PlainHost {}

    const fixture = TestBed.createComponent(PlainHost);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('andes-card-content').classList,
    ).not.toContain('andes-card__content--grid');
  });

  it('makes cells hoverable by default and lets each cell opt out', () => {
    const fixture = TestBed.createComponent(GridHost);
    fixture.detectChanges();
    const cells = fixture.nativeElement.querySelectorAll(
      'andes-card-grid',
    ) as NodeListOf<HTMLElement>;

    expect(cells[0].classList).toContain('andes-card__grid--hoverable');
    expect(cells[1].classList).not.toContain('andes-card__grid--hoverable');
    expect(cells[2].classList).not.toContain('andes-card__grid--hoverable');
  });
});

describe('AndesCardActions', () => {
  it('renders each projected action as a direct child of the actions bar', () => {
    @Component({
      imports: [AndesCard, AndesCardActions],
      template: `<andes-card>
        <andes-card-actions>
          <button type="button">Settings</button>
          <button type="button">Edit</button>
          <button type="button">More</button>
        </andes-card-actions>
      </andes-card>`,
    })
    class ActionsHost {}

    const fixture = TestBed.createComponent(ActionsHost);
    fixture.detectChanges();
    const actions = fixture.nativeElement.querySelector('andes-card-actions');

    expect(actions.getAttribute('data-slot')).toBe('card-actions');
    expect(actions.classList).toContain('andes-card__actions');
    expect(
      Array.from(actions.children as HTMLCollection).map((c) => c.textContent),
    ).toEqual(['Settings', 'Edit', 'More']);
  });
});

describe('AndesCard tabs', () => {
  const TABS: AndesCardTab[] = [
    { key: 'article', label: 'Article' },
    { key: 'app', label: 'App' },
    { key: 'archived', label: 'Archived', disabled: true },
    { key: 'project', label: 'Project' },
  ];

  @Component({
    imports: [AndesCard, AndesCardHeader, AndesCardTitle, AndesCardContent],
    template: `<andes-card
        [tabList]="tabs()"
        [(activeTabKey)]="active"
        (activeTabKeyChange)="changes.push($event)"
        [tabBarExtraContent]="withExtra() ? extraTpl : undefined"
      >
        <andes-card-header
          ><andes-card-title>Card</andes-card-title></andes-card-header
        >
        <andes-card-content>Panel for {{ active() }}</andes-card-content>
      </andes-card>
      <ng-template #extraTpl
        ><a class="extra" href="#more">More</a></ng-template
      >`,
  })
  class TabsHost {
    readonly tabs = signal<AndesCardTab[]>(TABS);
    readonly withExtra = signal(false);
    readonly active = signal<string | undefined>(undefined);
    readonly changes: (string | undefined)[] = [];
  }

  function create() {
    const fixture = TestBed.createComponent(TabsHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const tabs = () =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    return { fixture, el, tabs };
  }

  function key(target: HTMLElement, name: string) {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: name, bubbles: true }),
    );
  }

  it('renders no tab strip when tabList is empty', () => {
    const { fixture, el } = create();
    fixture.componentInstance.tabs.set([]);
    fixture.detectChanges();

    expect(el.querySelector('[role="tablist"]')).toBeFalsy();
    expect(el.querySelector('andes-card-content')?.hasAttribute('role')).toBe(
      false,
    );
  });

  it('renders a tablist inside the header with one tab per item', () => {
    const { el, tabs } = create();
    const tablist = el.querySelector('andes-card-header [role="tablist"]');

    expect(tablist).toBeTruthy();
    expect(tabs().map((t) => t.textContent?.trim())).toEqual([
      'Article',
      'App',
      'Archived',
      'Project',
    ]);
    expect(tabs()[2].disabled).toBe(true);
  });

  it('selects the first enabled tab when no key is bound, with a roving tabindex', () => {
    const { tabs } = create();

    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[0].getAttribute('tabindex')).toBe('0');
    expect(tabs()[1].getAttribute('aria-selected')).toBe('false');
    expect(tabs()[1].getAttribute('tabindex')).toBe('-1');
  });

  it('wires the content as the labelled tab panel', () => {
    const { el, tabs } = create();
    const content = el.querySelector('andes-card-content') as HTMLElement;

    expect(content.getAttribute('role')).toBe('tabpanel');
    expect(content.id).toBeTruthy();
    expect(tabs()[0].getAttribute('aria-controls')).toBe(content.id);
    expect(content.getAttribute('aria-labelledby')).toBe(tabs()[0].id);
  });

  it('keeps a consumer-supplied content id and uses it as the panel id', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader, AndesCardContent],
      template: `<andes-card [tabList]="tabs">
        <andes-card-header />
        <andes-card-content id="my-panel">Body</andes-card-content>
      </andes-card>`,
    })
    class IdHost {
      readonly tabs = TABS;
    }

    const fixture = TestBed.createComponent(IdHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('andes-card-content')?.id).toBe('my-panel');
    expect(
      el.querySelector('[role="tab"]')?.getAttribute('aria-controls'),
    ).toBe('my-panel');
  });

  it('omits aria-controls when the card has no content part', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader],
      template: `<andes-card [tabList]="tabs"
        ><andes-card-header
      /></andes-card>`,
    })
    class NoPanelHost {
      readonly tabs = TABS;
    }

    const fixture = TestBed.createComponent(NoPanelHost);
    fixture.detectChanges();

    expect(
      fixture.nativeElement
        .querySelector('[role="tab"]')
        .hasAttribute('aria-controls'),
    ).toBe(false);
  });

  it('selects a tab on click and emits activeTabKeyChange (two-way)', () => {
    const { fixture, tabs } = create();
    tabs()[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.active()).toBe('app');
    expect(fixture.componentInstance.changes).toEqual(['app']);
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs()[0].getAttribute('aria-selected')).toBe('false');
  });

  it('does not emit when the already-active tab is clicked', () => {
    const { fixture, tabs } = create();
    tabs()[0].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.changes).toEqual([]);
  });

  it('follows an externally bound activeTabKey', () => {
    const { fixture, tabs } = create();
    fixture.componentInstance.active.set('project');
    fixture.detectChanges();

    expect(tabs()[3].getAttribute('aria-selected')).toBe('true');
  });

  it('falls back to the first enabled tab when the bound key is disabled or unknown', () => {
    const { fixture, tabs } = create();
    fixture.componentInstance.active.set('archived');
    fixture.detectChanges();

    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('moves selection and focus with arrow keys, skipping disabled tabs and wrapping', () => {
    const { fixture, tabs } = create();
    tabs()[0].focus();

    key(tabs()[0], 'ArrowRight');
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('app');
    expect(document.activeElement).toBe(tabs()[1]);

    key(tabs()[1], 'ArrowRight');
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('project');
    expect(document.activeElement).toBe(tabs()[3]);

    key(tabs()[3], 'ArrowRight');
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('article');

    key(tabs()[0], 'ArrowLeft');
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('project');
  });

  it('jumps to the first and last enabled tab with Home and End', () => {
    const { fixture, tabs } = create();

    key(tabs()[0], 'End');
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('project');

    key(tabs()[3], 'Home');
    fixture.detectChanges();
    expect(fixture.componentInstance.active()).toBe('article');
  });

  it('ignores unrelated keys', () => {
    const { fixture, tabs } = create();
    key(tabs()[0], 'Enter');
    fixture.detectChanges();

    expect(fixture.componentInstance.changes).toEqual([]);
  });

  it('does not select a disabled tab on click', () => {
    const { fixture, tabs } = create();
    tabs()[2].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.changes).toEqual([]);
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('renders tabBarExtraContent at the end of the tab strip', () => {
    const { fixture, el } = create();
    expect(el.querySelector('.andes-card__tabs-extra')).toBeFalsy();

    fixture.componentInstance.withExtra.set(true);
    fixture.detectChanges();

    expect(
      el.querySelector('.andes-card__tabs .andes-card__tabs-extra a.extra')
        ?.textContent,
    ).toBe('More');
  });

  it('gives tabs in two cards distinct ids', () => {
    @Component({
      imports: [AndesCard, AndesCardHeader],
      template: `<andes-card [tabList]="tabs"><andes-card-header /></andes-card>
        <andes-card [tabList]="tabs"><andes-card-header /></andes-card>`,
    })
    class TwoCardsHost {
      readonly tabs = TABS;
    }

    const fixture = TestBed.createComponent(TwoCardsHost);
    fixture.detectChanges();
    const ids = Array.from(
      fixture.nativeElement.querySelectorAll(
        '[role="tab"]',
      ) as NodeListOf<HTMLElement>,
    ).map((t) => t.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not treat a nested card's content as the outer card's tab panel", () => {
    @Component({
      imports: [AndesCard, AndesCardHeader, AndesCardContent],
      template: `<andes-card [tabList]="tabs">
        <andes-card-header />
        <div>
          <andes-card
            ><andes-card-content id="nested"
              >Nested</andes-card-content
            ></andes-card
          >
        </div>
      </andes-card>`,
    })
    class NestedPanelHost {
      readonly tabs = TABS;
    }

    const fixture = TestBed.createComponent(NestedPanelHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('#nested')?.hasAttribute('role')).toBe(false);
    expect(
      el.querySelector('[role="tab"]')?.hasAttribute('aria-controls'),
    ).toBe(false);
  });
});

describe('AndesCardHeader layout', () => {
  it('marks a header that has a description, so the action can span both rows', () => {
    @Component({
      imports: [AndesCardHeader, AndesCardTitle, AndesCardDescription],
      template: `<andes-card-header id="with"
          ><andes-card-title>T</andes-card-title
          ><andes-card-description>D</andes-card-description></andes-card-header
        >
        <andes-card-header id="without"
          ><andes-card-title>T</andes-card-title></andes-card-header
        >`,
    })
    class DescribedHost {}

    const fixture = TestBed.createComponent(DescribedHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('#with')?.classList).toContain(
      'andes-card__header--described',
    );
    expect(el.querySelector('#without')?.classList).not.toContain(
      'andes-card__header--described',
    );
  });
});
