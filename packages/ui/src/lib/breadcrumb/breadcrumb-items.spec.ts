import {
  type AndesBreadcrumbItemType,
  type AndesBreadcrumbNode,
  buildBreadcrumbNodes,
  interpolateBreadcrumbParams,
} from './breadcrumb-items';

const NO_COLLAPSE = {
  maxItems: undefined,
  itemsBeforeCollapse: 1,
  itemsAfterCollapse: 1,
};

/** A compact, readable shape of the node list: `A`, `|` (separator content or `>` default), `…`. */
function outline(nodes: AndesBreadcrumbNode[]): string[] {
  return nodes.map((node) => {
    switch (node.kind) {
      case 'crumb':
        return node.crumb.title;
      case 'separator':
        return typeof node.content === 'string' ? `|${node.content}` : '|>';
      case 'ellipsis':
        return `…(${node.hidden.map((crumb) => crumb.title).join(',')})`;
    }
  });
}

function crumbs(nodes: AndesBreadcrumbNode[]) {
  return nodes.flatMap((node) => (node.kind === 'crumb' ? [node.crumb] : []));
}

describe('interpolateBreadcrumbParams', () => {
  it('replaces every known placeholder, including repeated ones', () => {
    expect(
      interpolateBreadcrumbParams(':id and :id of :org', {
        id: 42,
        org: 'acme',
      }),
    ).toBe('42 and 42 of acme');
  });

  it('leaves unknown or nullish placeholders as written', () => {
    expect(interpolateBreadcrumbParams('Time 10:30 :x', { x: null })).toBe(
      'Time 10:30 :x',
    );
  });
});

describe('buildBreadcrumbNodes', () => {
  it('puts an automatic separator between consecutive crumbs only', () => {
    const items: AndesBreadcrumbItemType[] = [
      { title: 'Home' },
      { title: 'Docs' },
      { title: 'Page' },
    ];

    expect(
      outline(buildBreadcrumbNodes(items, {}, undefined, NO_COLLAPSE)),
    ).toEqual(['Home', '|>', 'Docs', '|>', 'Page']);
  });

  it('uses the root separator, and renders none for an empty string', () => {
    const items: AndesBreadcrumbItemType[] = [{ title: 'A' }, { title: 'B' }];

    expect(outline(buildBreadcrumbNodes(items, {}, '/', NO_COLLAPSE))).toEqual([
      'A',
      '|/',
      'B',
    ]);
    expect(outline(buildBreadcrumbNodes(items, {}, '', NO_COLLAPSE))).toEqual([
      'A',
      'B',
    ]);
  });

  it('lets an explicit separator entry replace the automatic one at its position', () => {
    const items: AndesBreadcrumbItemType[] = [
      { title: 'Location' },
      { type: 'separator', separator: ':' },
      { title: 'Center' },
      { title: 'List' },
      { type: 'separator' },
    ];

    expect(outline(buildBreadcrumbNodes(items, {}, '/', NO_COLLAPSE))).toEqual([
      'Location',
      '|:',
      'Center',
      '|/',
      'List',
      // A trailing entry is rendered as written, defaulting to the root separator.
      '|/',
    ]);
  });

  it('joins each path onto the previous ones and interpolates params', () => {
    const items: AndesBreadcrumbItemType[] = [
      { title: 'Home', href: '/' },
      { title: 'Users', path: '/users' },
      { title: 'User :id', path: ':id' },
      { title: 'Settings', path: 'settings', href: '/ignored' },
    ];
    const resolved = crumbs(
      buildBreadcrumbNodes(items, { id: 7 }, undefined, NO_COLLAPSE),
    );

    expect(resolved.map((crumb) => crumb.href)).toEqual([
      '/',
      '/users',
      '/users/7',
      '/users/7/settings',
    ]);
    expect(resolved.map((crumb) => crumb.paths)).toEqual([
      [],
      ['users'],
      ['users', '7'],
      ['users', '7', 'settings'],
    ]);
    expect(resolved[2].title).toBe('User 7');
  });

  it('links an empty root path to "/" without adding an empty segment to paths', () => {
    const items: AndesBreadcrumbItemType[] = [
      { title: 'Home', path: '' },
      { title: 'Projects', path: 'projects/' },
    ];
    const resolved = crumbs(
      buildBreadcrumbNodes(items, {}, undefined, NO_COLLAPSE),
    );

    expect(resolved.map((crumb) => crumb.href)).toEqual(['/', '/projects']);
    // `['/', ...paths]` must stay a valid routerLink command array.
    expect(resolved.map((crumb) => crumb.paths)).toEqual([[], ['projects']]);
  });

  it('marks only the last crumb (ignoring trailing separators) as last', () => {
    const items: AndesBreadcrumbItemType[] = [
      { title: 'A' },
      { title: 'B' },
      { type: 'separator' },
    ];
    const resolved = crumbs(
      buildBreadcrumbNodes(items, {}, undefined, NO_COLLAPSE),
    );

    expect(resolved.map((crumb) => crumb.last)).toEqual([false, true]);
  });

  describe('collapse', () => {
    const five: AndesBreadcrumbItemType[] = ['A', 'B', 'C', 'D', 'E'].map(
      (title) => ({ title }),
    );

    it('does nothing until there are more crumbs than maxItems', () => {
      const nodes = buildBreadcrumbNodes(five, {}, '/', {
        ...NO_COLLAPSE,
        maxItems: 5,
      });

      expect(nodes.some((node) => node.kind === 'ellipsis')).toBe(false);
    });

    it('keeps itemsBeforeCollapse/itemsAfterCollapse crumbs around one ellipsis', () => {
      expect(
        outline(
          buildBreadcrumbNodes(five, {}, '/', {
            maxItems: 3,
            itemsBeforeCollapse: 1,
            itemsAfterCollapse: 2,
          }),
        ),
      ).toEqual(['A', '|/', '…(B,C)', '|/', 'D', '|/', 'E']);
    });

    it('can collapse the leading crumbs', () => {
      expect(
        outline(
          buildBreadcrumbNodes(five, {}, '/', {
            maxItems: 2,
            itemsBeforeCollapse: 0,
            itemsAfterCollapse: 1,
          }),
        ),
      ).toEqual(['…(A,B,C,D)', '|/', 'E']);
    });

    it('does not collapse when before + after already covers every crumb', () => {
      const nodes = buildBreadcrumbNodes(five, {}, '/', {
        maxItems: 2,
        itemsBeforeCollapse: 3,
        itemsAfterCollapse: 2,
      });

      expect(nodes.some((node) => node.kind === 'ellipsis')).toBe(false);
    });
  });
});
