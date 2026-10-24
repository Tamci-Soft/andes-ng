import { JsonPipe } from '@angular/common';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesTree } from './tree';
import { AndesTreeNodeTemplate } from './tree-node-template';
import type {
  AndesTreeKey,
  AndesTreeLoadData,
  AndesTreeNode,
} from './tree-types';

const TREE_IMPORTS = [JsonPipe, AndesTree, AndesTreeNodeTemplate, AndesButton];

/** A search box that follows the shared field look: one border, one soft focus ring. */
const STORY_STYLES = [
  `
  .panel {
    box-sizing: border-box;
    width: 360px;
    padding: 12px;
    border: 1px solid var(--andes-color-border);
    border-radius: var(--andes-radius-md, 0.375rem);
    background: var(--andes-color-background);
    color: var(--andes-color-foreground);
    font-family: var(--andes-font-family), sans-serif;
    font-size: 0.875rem;
    line-height: 1.375rem;
  }
  .row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .field {
    box-sizing: border-box;
    width: 100%;
    height: 2rem;
    margin-bottom: 12px;
    padding: 0 0.6875rem;
    border: 1px solid var(--andes-color-input);
    border-radius: var(--andes-radius-md, 0.375rem);
    background: var(--andes-color-background);
    color: var(--andes-color-foreground);
    font: inherit;
    outline: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .field::placeholder { color: var(--andes-color-muted-foreground); }
  .field:hover { border-color: color-mix(in srgb, var(--andes-color-primary) 65%, var(--andes-color-input)); }
  .field:focus {
    border-color: var(--andes-color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--andes-color-primary) 20%, transparent);
  }
  .caption { margin: 12px 0 0; color: var(--andes-color-muted-foreground); font-size: 0.75rem; line-height: 1.25rem; }
  .caption code { font-size: inherit; }
  `,
];

function warehouses(): AndesTreeNode[] {
  return [
    {
      key: 'lima',
      title: 'Almacén Lima',
      children: [
        {
          key: 'lima-a',
          title: 'Zona A · Abarrotes',
          children: [
            { key: 'lima-a-1', title: 'Pasillo 1 · Granos' },
            { key: 'lima-a-2', title: 'Pasillo 2 · Conservas' },
            { key: 'lima-a-3', title: 'Pasillo 3 · Bebidas' },
          ],
        },
        {
          key: 'lima-b',
          title: 'Zona B · Refrigerados',
          children: [
            { key: 'lima-b-1', title: 'Cámara 1 · Lácteos' },
            { key: 'lima-b-2', title: 'Cámara 2 · Congelados' },
          ],
        },
        { key: 'lima-c', title: 'Zona C · Devoluciones' },
      ],
    },
    {
      key: 'arequipa',
      title: 'Almacén Arequipa',
      children: [
        { key: 'arequipa-a', title: 'Zona A · General' },
        { key: 'arequipa-b', title: 'Zona B · Mayorista' },
      ],
    },
    {
      key: 'cusco',
      title: 'Almacén Cusco',
      children: [{ key: 'cusco-a', title: 'Zona A · General' }],
    },
    { key: 'transito', title: 'En tránsito' },
  ];
}

function permissions(): AndesTreeNode[] {
  return [
    {
      key: 'ventas',
      title: 'Ventas',
      children: [
        { key: 'ventas-ver', title: 'Ver pedidos' },
        { key: 'ventas-crear', title: 'Crear pedidos' },
        { key: 'ventas-anular', title: 'Anular pedidos' },
        {
          key: 'ventas-descuento',
          title: 'Aplicar descuentos',
          disableCheckbox: true,
        },
      ],
    },
    {
      key: 'compras',
      title: 'Compras',
      children: [
        { key: 'compras-ver', title: 'Ver órdenes' },
        { key: 'compras-aprobar', title: 'Aprobar órdenes' },
      ],
    },
    {
      key: 'finanzas',
      title: 'Finanzas',
      children: [
        {
          key: 'finanzas-tesoreria',
          title: 'Tesorería',
          children: [
            { key: 'finanzas-pagos', title: 'Registrar pagos' },
            { key: 'finanzas-conciliar', title: 'Conciliar bancos' },
          ],
        },
        { key: 'finanzas-reportes', title: 'Reportes contables' },
      ],
    },
  ];
}

function files(): AndesTreeNode[] {
  return [
    {
      key: 'reportes',
      title: 'reportes',
      children: [
        { key: 'r-2026', title: 'ventas-2026.xlsx' },
        { key: 'r-2025', title: 'ventas-2025.xlsx' },
        {
          key: 'r-archivo',
          title: 'archivo',
          children: [{ key: 'r-2024', title: 'ventas-2024.xlsx' }],
        },
      ],
    },
    {
      key: 'facturas',
      title: 'facturas',
      children: [
        { key: 'f-001', title: 'F001-000231.pdf' },
        { key: 'f-002', title: 'F001-000232.pdf' },
      ],
    },
    { key: 'leeme', title: 'leeme.txt' },
  ];
}

function large(groups: number, perGroup: number): AndesTreeNode[] {
  return Array.from({ length: groups }, (_, g) => ({
    key: `g${g}`,
    title: `Categoría ${g + 1}`,
    children: Array.from({ length: perGroup }, (__, i) => ({
      key: `g${g}-${i}`,
      title: `Producto ${g + 1}-${String(i + 1).padStart(3, '0')}`,
    })),
  }));
}

const meta: Meta<AndesTree> = {
  title: 'Tree',
  component: AndesTree,
  tags: ['autodocs'],
  argTypes: {
    nodes: { control: false },
    expandedKeys: { control: false },
    selectedKeys: { control: false },
    checkedKeys: { control: false },
    loadedKeys: { control: false },
    fieldNames: { control: false },
    loadData: { control: false },
    allowDrop: { control: false },
    filterFn: { control: false },
    nodeTemplate: { control: false },
    iconTemplate: { control: false },
    labels: { control: false },
    density: { control: 'select', options: ['default', 'compact'] },
    expandAction: {
      control: 'select',
      options: [undefined, 'click', 'doubleClick', false],
    },
    filterMode: { control: 'select', options: ['filter', 'highlight'] },
    height: { control: 'text' },
  },
  args: {
    defaultExpandAll: false,
    multiple: false,
    selectable: true,
    checkable: false,
    checkStrictly: false,
    showLine: false,
    showIcon: false,
    directory: false,
    blockNode: false,
    density: 'default',
    draggable: false,
    virtualScroll: false,
    loading: false,
  },
  parameters: { layout: 'centered' },
  render: (args) => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { ...args, nodes: warehouses(), expanded: ['lima'] },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree
          aria-label="Almacenes"
          [nodes]="nodes"
          [(expandedKeys)]="expanded"
          [defaultExpandAll]="defaultExpandAll"
          [multiple]="multiple"
          [selectable]="selectable"
          [checkable]="checkable"
          [checkStrictly]="checkStrictly"
          [showLine]="showLine"
          [showIcon]="showIcon"
          [directory]="directory"
          [blockNode]="blockNode"
          [density]="density"
          [draggable]="draggable"
          [loading]="loading"
        />
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesTree>;

/** A plain tree: click a switcher to open a branch, click a title to select it. */
export const Default: Story = {};

/** Every branch open from the start. */
export const DefaultExpandAll: Story = {
  args: { defaultExpandAll: true },
};

/** Clicking a node selects it; clicking it again clears the selection. */
export const Selection: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { nodes: warehouses(), expanded: ['lima'], selected: ['lima-a-2'] },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree
          aria-label="Almacenes"
          [nodes]="nodes"
          [(expandedKeys)]="expanded"
          [(selectedKeys)]="selected"
        />
        <p class="caption">Selected: <code>{{ selected | json }}</code></p>
      </div>
    `,
  }),
};

/** `multiple` lets a click toggle each node; Shift + click selects a range. */
export const MultipleSelection: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: {
      nodes: warehouses(),
      expanded: ['lima', 'lima-a'],
      selected: ['lima-a-1', 'lima-a-3'],
    },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree
          aria-label="Almacenes"
          multiple
          [nodes]="nodes"
          [(expandedKeys)]="expanded"
          [(selectedKeys)]="selected"
        />
        <p class="caption">Selected: <code>{{ selected | json }}</code></p>
      </div>
    `,
  }),
};

/**
 * Checking cascades: a parent is checked when everything below it is, and half-checked when only
 * some of it is. A node with a locked checkbox keeps its own state and is left out of the cascade.
 */
export const Checkable: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: {
      nodes: permissions(),
      expanded: ['ventas', 'finanzas'],
      checked: ['ventas-ver', 'compras-ver', 'compras-aprobar'],
    },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree
          aria-label="Permisos"
          checkable
          [selectable]="false"
          [nodes]="nodes"
          [(expandedKeys)]="expanded"
          [(checkedKeys)]="checked"
          #tree
        />
        <p class="caption">Half-checked: <code>{{ tree.halfCheckedKeys() | json }}</code></p>
        <p class="caption">Checked: <code>{{ checked | json }}</code></p>
      </div>
    `,
  }),
};

/** `checkStrictly` makes every node independent: no cascade up or down. */
export const CheckStrictly: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { nodes: permissions(), expanded: ['ventas'], checked: ['ventas'] },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree
          aria-label="Permisos"
          checkable
          checkStrictly
          [selectable]="false"
          [nodes]="nodes"
          [(expandedKeys)]="expanded"
          [(checkedKeys)]="checked"
        />
      </div>
    `,
  }),
};

/** Connector lines join a parent to its children, and the switcher becomes a boxed plus / minus. */
export const ShowLine: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { nodes: warehouses() },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree aria-label="Almacenes" showLine defaultExpandAll [nodes]="nodes" />
      </div>
    `,
  }),
};

/**
 * `showIcon` draws a folder or a file for nodes that have no icon of their own. A node can bring
 * a glyph in its `icon`, and a tree-wide `iconTemplate` replaces them all.
 */
export const Icons: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: {
      nodes: [
        {
          key: 'a',
          title: 'Almacenes',
          icon: '🏭',
          children: [
            { key: 'a1', title: 'Lima', icon: '📍' },
            { key: 'a2', title: 'Cusco' },
          ],
        },
        { key: 'b', title: 'Alertas', icon: '⚠️' },
        {
          key: 'c',
          title: 'Sin icono propio',
          children: [{ key: 'c1', title: 'Hoja' }],
        },
      ] satisfies AndesTreeNode[],
      expanded: ['a', 'c'],
    },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree aria-label="Iconos" showIcon [nodes]="nodes" [(expandedKeys)]="expanded" />
      </div>
    `,
  }),
};

/**
 * The file-browser look: icons, rows that fill the width, a solid selected row, and a click on a
 * folder opens it.
 */
export const Directory: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { nodes: files(), expanded: ['reportes'], selected: ['r-2026'] },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree
          aria-label="Archivos"
          directory
          [nodes]="nodes"
          [(expandedKeys)]="expanded"
          [(selectedKeys)]="selected"
        />
      </div>
    `,
  }),
};

/** `blockNode` stretches each row's hover and selected background across the full width. */
export const BlockNode: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { nodes: warehouses(), expanded: ['lima'], selected: ['lima-c'] },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree
          aria-label="Almacenes"
          blockNode
          [nodes]="nodes"
          [(expandedKeys)]="expanded"
          [(selectedKeys)]="selected"
        />
      </div>
    `,
  }),
};

/** `density="compact"` drops the 4px gap between rows (24px rows instead of 28px). */
export const Compact: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { nodes: warehouses() },
    styles: STORY_STYLES,
    template: `
      <div style="display: flex; gap: 16px; align-items: flex-start;">
        <div class="panel" style="width: 280px;">
          <p class="caption" style="margin: 0 0 8px;">Default</p>
          <andes-tree aria-label="Almacenes (normal)" defaultExpandAll [nodes]="nodes" />
        </div>
        <div class="panel" style="width: 280px;">
          <p class="caption" style="margin: 0 0 8px;">Compact</p>
          <andes-tree aria-label="Almacenes (compacto)" density="compact" defaultExpandAll [nodes]="nodes" />
        </div>
      </div>
    `,
  }),
};

/** A disabled node cannot be selected, checked or dragged, but its branch still opens. */
export const DisabledNodes: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: {
      nodes: [
        {
          key: 'a',
          title: 'Activo',
          children: [
            { key: 'a1', title: 'Hijo disponible' },
            { key: 'a2', title: 'Hijo bloqueado', disabled: true },
          ],
        },
        {
          key: 'b',
          title: 'Bloqueado con hijos',
          disabled: true,
          children: [{ key: 'b1', title: 'Hijo de un bloqueado' }],
        },
        { key: 'c', title: 'No seleccionable', selectable: false },
      ] satisfies AndesTreeNode[],
      expanded: ['a', 'b'],
    },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree aria-label="Estados" checkable [nodes]="nodes" [(expandedKeys)]="expanded" />
      </div>
    `,
  }),
};

/** Data with other property names is read through `fieldNames`. */
export const FieldNames: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: {
      names: { key: 'codigo', title: 'nombre', children: 'hijos' },
      nodes: [
        {
          codigo: 100,
          nombre: 'Activo',
          hijos: [
            { codigo: 110, nombre: 'Caja y bancos' },
            { codigo: 120, nombre: 'Cuentas por cobrar' },
          ],
        },
        {
          codigo: 200,
          nombre: 'Pasivo',
          hijos: [{ codigo: 210, nombre: 'Tributos por pagar' }],
        },
      ] satisfies AndesTreeNode[],
      expanded: [100],
    },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree aria-label="Plan de cuentas" [fieldNames]="names" [nodes]="nodes" [(expandedKeys)]="expanded" />
      </div>
    `,
  }),
};

/** An `andesTreeNode` template draws the content of every node. */
export const CustomNodeContent: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: {
      nodes: [
        {
          key: 'lima',
          title: 'Almacén Lima',
          stock: 1240,
          children: [
            { key: 'l1', title: 'Zona A', stock: 800 },
            { key: 'l2', title: 'Zona B', stock: 440 },
          ],
        },
        { key: 'cusco', title: 'Almacén Cusco', stock: 310 },
      ] satisfies AndesTreeNode[],
      expanded: ['lima'],
    },
    styles: [
      ...STORY_STYLES,
      `.stock { margin-inline-start: 8px; padding: 0 6px; border-radius: 999px; background: var(--andes-color-muted); color: var(--andes-color-muted-foreground); font-size: 0.75rem; line-height: 1.25rem; }`,
    ],
    template: `
      <div class="panel">
        <andes-tree aria-label="Stock" blockNode [nodes]="nodes" [(expandedKeys)]="expanded">
          <ng-template andesTreeNode let-node let-segments="segments">
            <span>{{ node.title }}</span>
            <span class="stock">{{ node.stock }} u.</span>
          </ng-template>
        </andes-tree>
      </div>
    `,
  }),
};

/**
 * A `filter` keeps the matching nodes and their ancestors, opens the path to each match and marks
 * it. Case and accents are ignored: "almacen" finds "Almacén".
 */
export const Searchable: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { nodes: warehouses(), query: '', expanded: [] },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <input
          class="field"
          type="search"
          aria-label="Search the tree"
          placeholder="Search…"
          [value]="query"
          (input)="query = $any($event.target).value"
        />
        <andes-tree
          aria-label="Almacenes"
          [nodes]="nodes"
          [filter]="query"
          [(expandedKeys)]="expanded"
        />
      </div>
    `,
  }),
};

/** `filterMode="highlight"` keeps every node in place and only marks the matches. */
export const HighlightOnly: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { nodes: warehouses(), query: 'zona', expanded: [] },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <input
          class="field"
          type="search"
          aria-label="Highlight in the tree"
          [value]="query"
          (input)="query = $any($event.target).value"
        />
        <andes-tree
          aria-label="Almacenes"
          filterMode="highlight"
          [nodes]="nodes"
          [filter]="query"
          [(expandedKeys)]="expanded"
        />
      </div>
    `,
  }),
};

/**
 * `loadData` runs the first time a node without children opens. Add the children to `nodes` and
 * return (or resolve) once they are in; a spinner shows meanwhile, and a failure closes the node
 * again and reports `nodeLoadError`.
 */
export const LoadOnDemand: Story = {
  render: () => {
    const component = {
      nodes: [
        { key: 'sedes', title: 'Sedes' },
        { key: 'areas', title: 'Áreas' },
        { key: 'vacio', title: 'Sin contenido' },
      ] as AndesTreeNode[],
      expanded: [] as AndesTreeKey[],
      loadData: ((node: AndesTreeNode) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const children: AndesTreeNode[] =
              node.key === 'vacio'
                ? []
                : [1, 2, 3].map((n) => ({
                    key: `${String(node.key)}-${n}`,
                    title: `${String(node.title)} ${n}`,
                    // Only the first level goes deeper, so the demo ends.
                    isLeaf: String(node.key).includes('-'),
                  }));
            component.nodes = component.nodes.map((n) =>
              n.key === node.key ? { ...n, children } : n,
            );
            resolve();
          }, 900);
        })) as AndesTreeLoadData,
    };
    return {
      moduleMetadata: { imports: TREE_IMPORTS },
      props: component,
      styles: STORY_STYLES,
      template: `
        <div class="panel">
          <andes-tree aria-label="Carga bajo demanda" [(nodes)]="nodes" [(expandedKeys)]="expanded" [loadData]="loadData" />
        </div>
      `,
    };
  },
};

/**
 * Drag a node onto another: the top and bottom quarter of a row drop before or after it, the
 * middle drops inside. Without a pointer, Alt + arrow keys move the focused node: Up and Down past
 * a sibling, Right into the sibling above, Left out to the parent's level. The `nodeDrop` output
 * reports each move and `nodes` already holds the result.
 */
export const DragAndDrop: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: {
      nodes: warehouses(),
      expanded: ['lima'],
      moves: [] as string[],
      recordMove: function (
        this: { moves: string[] },
        event: {
          dragKey: AndesTreeKey;
          position: string;
          targetKey: AndesTreeKey;
        },
      ) {
        this.moves = [
          `${String(event.dragKey)} → ${event.position} ${String(event.targetKey)}`,
          ...this.moves,
        ].slice(0, 4);
      },
    },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree
          aria-label="Reordenar almacenes"
          draggable
          blockNode
          [(nodes)]="nodes"
          [(expandedKeys)]="expanded"
          (nodeDrop)="recordMove($event)"
        />
        <p class="caption">Alt + arrow keys moves the focused node.</p>
        <p class="caption">{{ moves.length ? moves.join('  ·  ') : 'No moves yet' }}</p>
      </div>
    `,
  }),
};

/**
 * `virtualScroll` renders only the rows in view, so ten thousand nodes stay light. Give the tree a
 * `height`; rows keep reporting their level and position to assistive technology.
 */
export const VirtualScroll: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: {
      nodes: large(50, 200),
      expanded: ['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'],
    },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <andes-tree
          aria-label="Catálogo"
          virtualScroll
          [height]="320"
          [nodes]="nodes"
          [(expandedKeys)]="expanded"
          #tree
        />
        <p class="caption">2 000 rows are open out of 10 050 nodes; only the visible ones exist in the page.</p>
        <div class="row" style="margin: 8px 0 0;">
          <andes-button size="sm" variant="outline" (click)="tree.scrollToKey('g9-150', { align: 'center' })">Scroll to Producto 10-151</andes-button>
        </div>
      </div>
    `,
  }),
};

/** `expandAll()`, `collapseAll()` and `scrollToKey()` are public methods. */
export const ImperativeApi: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { nodes: warehouses(), expanded: [] },
    styles: STORY_STYLES,
    template: `
      <div class="panel">
        <div class="row">
          <andes-button size="sm" variant="outline" (click)="tree.expandAll()">Expand all</andes-button>
          <andes-button size="sm" variant="outline" (click)="tree.collapseAll()">Collapse all</andes-button>
          <andes-button size="sm" variant="outline" (click)="tree.scrollToKey('lima-b-2', { focus: true })">Go to Cámara 2</andes-button>
        </div>
        <andes-tree #tree aria-label="Almacenes" [nodes]="nodes" [(expandedKeys)]="expanded" />
      </div>
    `,
  }),
};

/** With no nodes the tree shows an empty message, or a loading state while data is on its way. */
export const EmptyAndLoading: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    styles: STORY_STYLES,
    template: `
      <div style="display: flex; gap: 16px; align-items: flex-start;">
        <div class="panel" style="width: 220px;"><andes-tree aria-label="Vacío" [nodes]="[]" /></div>
        <div class="panel" style="width: 220px;"><andes-tree aria-label="Cargando" loading [nodes]="[]" /></div>
        <div class="panel" style="width: 220px;"><andes-tree aria-label="Sin resultados" filter="zzz" [nodes]="[{ key: 'a', title: 'Alfa' }]" [labels]="{ empty: 'Sin resultados' }" /></div>
      </div>
    `,
  }),
};

/** Arrow keys, indentation and the switcher all mirror in a right-to-left layout. */
export const RightToLeft: Story = {
  render: () => ({
    moduleMetadata: { imports: TREE_IMPORTS },
    props: { nodes: warehouses() },
    styles: STORY_STYLES,
    template: `
      <div class="panel" dir="rtl">
        <andes-tree aria-label="Almacenes" showLine defaultExpandAll [nodes]="nodes" />
      </div>
    `,
  }),
};
