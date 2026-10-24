import { JsonPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesTreeNodeTemplate } from '../tree/tree-node-template';
import type {
  AndesTreeKey,
  AndesTreeLoadData,
  AndesTreeNode,
} from '../tree/tree-types';
import { AndesTreeSelect } from './tree-select';

const IMPORTS = [
  JsonPipe,
  ReactiveFormsModule,
  AndesTreeSelect,
  AndesTreeNodeTemplate,
];

const STORY_STYLES = [
  `
  .stack { display: flex; flex-direction: column; gap: 16px; width: 320px; color: var(--andes-color-foreground); font-family: var(--andes-font-family), sans-serif; font-size: 0.875rem; line-height: 1.375rem; }
  .label { display: block; margin-bottom: 4px; font-weight: 500; }
  .caption { margin: 0; color: var(--andes-color-muted-foreground); font-size: 0.75rem; line-height: 1.25rem; }
  .error { margin: 4px 0 0; color: var(--andes-color-danger); font-size: 0.75rem; line-height: 1.25rem; }
  `,
];

function regions(): AndesTreeNode[] {
  return [
    {
      key: 'lima',
      title: 'Lima',
      children: [
        {
          key: 'lima-centro',
          title: 'Lima Centro',
          children: [
            { key: 'lima-cercado', title: 'Cercado de Lima' },
            { key: 'lima-brena', title: 'Breña' },
          ],
        },
        { key: 'lima-sur', title: 'Lima Sur' },
        { key: 'lima-norte', title: 'Lima Norte', disabled: true },
      ],
    },
    {
      key: 'arequipa',
      title: 'Arequipa',
      children: [
        { key: 'arequipa-ciudad', title: 'Arequipa Ciudad' },
        { key: 'arequipa-camana', title: 'Camaná' },
      ],
    },
    {
      key: 'cusco',
      title: 'Cusco',
      children: [
        { key: 'cusco-ciudad', title: 'Cusco Ciudad' },
        { key: 'cusco-urubamba', title: 'Urubamba' },
      ],
    },
    { key: 'iquitos', title: 'Iquitos' },
  ];
}

const meta: Meta<AndesTreeSelect> = {
  title: 'Tree Select',
  component: AndesTreeSelect,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'borderless', 'underlined'],
    },
    status: { control: 'select', options: [undefined, 'error', 'warning'] },
    placement: {
      control: 'select',
      options: ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'],
    },
    showCheckedStrategy: {
      control: 'select',
      options: ['child', 'parent', 'all'],
    },
    searchPlacement: { control: 'select', options: ['panel', 'trigger'] },
    nodes: { control: false },
    value: { control: false },
    expandedKeys: { control: false },
    fieldNames: { control: false },
    loadData: { control: false },
    filterFn: { control: false },
    maxTagPlaceholder: { control: false },
    labels: { control: false },
  },
  args: {
    size: 'md',
    variant: 'outlined',
    status: undefined,
    placement: 'bottomLeft',
    placeholder: 'Select a region',
    disabled: false,
    allowClear: false,
    loading: false,
    multiple: false,
    checkable: false,
    checkStrictly: false,
    showSearch: false,
    searchPlacement: 'panel',
    showCheckedStrategy: 'child',
    treeDefaultExpandAll: false,
    matchTriggerWidth: true,
  },
  parameters: { layout: 'centered' },
  render: (args) => ({
    moduleMetadata: { imports: IMPORTS },
    props: { ...args, nodes: regions(), selected: null },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select
          aria-label="Region"
          [nodes]="nodes"
          [(value)]="selected"
          [size]="size"
          [variant]="variant"
          [status]="status"
          [placement]="placement"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [allowClear]="allowClear"
          [loading]="loading"
          [multiple]="multiple"
          [checkable]="checkable"
          [checkStrictly]="checkStrictly"
          [showSearch]="showSearch"
          [searchPlacement]="searchPlacement"
          [showCheckedStrategy]="showCheckedStrategy"
          [treeDefaultExpandAll]="treeDefaultExpandAll"
          [matchTriggerWidth]="matchTriggerWidth"
        />
        <p class="caption">Value: <code>{{ selected | json }}</code></p>
      </div>
    `,
  }),
};

export default meta;

type Story = StoryObj<AndesTreeSelect>;

/** A single choice: any enabled node can be picked, parents included. */
export const Default: Story = {};

/** The panel opens on the branch that holds the current value. */
export const WithValue: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { nodes: regions(), selected: 'cusco-urubamba' as AndesTreeKey },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Region" allowClear [nodes]="nodes" [(value)]="selected" />
        <p class="caption">Value: <code>{{ selected | json }}</code></p>
      </div>
    `,
  }),
};

/** Heights are 24, 32 and 40px, like the other fields. */
export const Sizes: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { nodes: regions() },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Region (small)" size="sm" placeholder="Small" [nodes]="nodes" />
        <andes-tree-select aria-label="Region (medium)" size="md" placeholder="Medium" [nodes]="nodes" />
        <andes-tree-select aria-label="Region (large)" size="lg" placeholder="Large" [nodes]="nodes" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { nodes: regions() },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Outlined" variant="outlined" placeholder="Outlined" [nodes]="nodes" />
        <andes-tree-select aria-label="Filled" variant="filled" placeholder="Filled" [nodes]="nodes" />
        <andes-tree-select aria-label="Borderless" variant="borderless" placeholder="Borderless" [nodes]="nodes" />
        <andes-tree-select aria-label="Underlined" variant="underlined" placeholder="Underlined" [nodes]="nodes" />
      </div>
    `,
  }),
};

export const Statuses: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { nodes: regions() },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Error" status="error" placeholder="Error" [nodes]="nodes" />
        <andes-tree-select aria-label="Warning" status="warning" placeholder="Warning" [nodes]="nodes" />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { nodes: regions() },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Disabled" disabled value="cusco" [nodes]="nodes" />
        <andes-tree-select aria-label="Disabled, several" multiple disabled [value]="['cusco', 'iquitos']" [nodes]="nodes" />
      </div>
    `,
  }),
};

/** `multiple` shows each pick as a removable tag; Backspace removes the last one. */
export const Multiple: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: {
      nodes: regions(),
      selected: ['lima-sur', 'iquitos'] as AndesTreeKey[],
    },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Regions" multiple allowClear placeholder="Pick regions" [nodes]="nodes" [(value)]="selected" />
        <p class="caption">Value: <code>{{ selected | json }}</code></p>
      </div>
    `,
  }),
};

/** Tags past `maxTagCount` collapse into one tag, which `maxTagPlaceholder` can reword. */
export const MaxTagCount: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: {
      nodes: regions(),
      selected: [
        'lima-sur',
        'iquitos',
        'cusco-ciudad',
        'arequipa-camana',
      ] as AndesTreeKey[],
      more: (omitted: { title: string }[]) => `${omitted.length} más`,
    },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Regions" multiple [maxTagCount]="2" [nodes]="nodes" [(value)]="selected" />
        <andes-tree-select aria-label="Regions (custom)" multiple [maxTagCount]="1" [maxTagPlaceholder]="more" [nodes]="nodes" [(value)]="selected" />
      </div>
    `,
  }),
};

/**
 * `checkable` shows cascading checkboxes. `showCheckedStrategy` decides what the value and the
 * tags hold when a parent is checked: only the leaves (`child`), the topmost checked nodes
 * (`parent`) or every checked node (`all`).
 */
export const Checkable: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: {
      nodes: regions(),
      child: ['cusco-ciudad'],
      parent: ['cusco', 'iquitos'],
      all: ['arequipa'],
    },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <div>
          <span class="label">child (default)</span>
          <andes-tree-select aria-label="Leaves" checkable treeDefaultExpandAll [nodes]="nodes" [(value)]="child" />
          <p class="caption">Value: <code>{{ child | json }}</code></p>
        </div>
        <div>
          <span class="label">parent</span>
          <andes-tree-select aria-label="Topmost" checkable showCheckedStrategy="parent" [nodes]="nodes" [(value)]="parent" />
          <p class="caption">Value: <code>{{ parent | json }}</code></p>
        </div>
        <div>
          <span class="label">all</span>
          <andes-tree-select aria-label="Every node" checkable showCheckedStrategy="all" [nodes]="nodes" [(value)]="all" />
          <p class="caption">Value: <code>{{ all | json }}</code></p>
        </div>
      </div>
    `,
  }),
};

/** With `checkStrictly` a parent and its children are checked independently. */
export const CheckStrictly: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { nodes: regions(), selected: ['lima'] as AndesTreeKey[] },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Regions" checkable checkStrictly [nodes]="nodes" [(value)]="selected" />
      </div>
    `,
  }),
};

/** A search box at the top of the panel filters the tree, keeping the ancestors of each match. */
export const SearchInPanel: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { nodes: regions(), selected: null },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Region" showSearch placeholder="Search a region" [nodes]="nodes" [(value)]="selected" />
      </div>
    `,
  }),
};

/** `searchPlacement="trigger"` types straight into the field. */
export const SearchInField: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: {
      nodes: regions(),
      one: 'iquitos',
      many: ['lima-sur'] as AndesTreeKey[],
    },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Region" showSearch searchPlacement="trigger" placeholder="Type to search" [nodes]="nodes" [(value)]="one" />
        <andes-tree-select aria-label="Regions" multiple showSearch searchPlacement="trigger" placeholder="Type to search" [nodes]="nodes" [(value)]="many" />
      </div>
    `,
  }),
};

/** `loadData` runs the first time a node without children opens; add the children to `nodes`. */
export const LoadOnDemand: Story = {
  render: () => {
    const component = {
      nodes: [
        { key: 'sedes', title: 'Sedes' },
        { key: 'areas', title: 'Áreas' },
      ] as AndesTreeNode[],
      selected: null as AndesTreeKey | null,
      loadData: ((node: AndesTreeNode) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            const children: AndesTreeNode[] = [1, 2, 3].map((n) => ({
              key: `${String(node.key)}-${n}`,
              title: `${String(node.title)} ${n}`,
              isLeaf: true,
            }));
            component.nodes = component.nodes.map((n) =>
              n.key === node.key ? { ...n, children } : n,
            );
            resolve();
          }, 800);
        })) as AndesTreeLoadData,
    };
    return {
      moduleMetadata: { imports: IMPORTS },
      props: component,
      styles: STORY_STYLES,
      template: `
        <div class="stack">
          <andes-tree-select aria-label="Lazy" placeholder="Open a branch" [nodes]="nodes" [loadData]="loadData" [(value)]="selected" />
        </div>
      `,
    };
  },
};

/** Data with other property names is read through `fieldNames`. */
export const FieldNames: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
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
      selected: 110,
    },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Cuenta" [fieldNames]="names" [nodes]="nodes" [(value)]="selected" />
      </div>
    `,
  }),
};

/** `treeDefaultExpandAll` opens every branch the first time options arrive. */
export const DefaultExpandAll: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { nodes: regions(), selected: null },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Region" treeDefaultExpandAll [nodes]="nodes" [(value)]="selected" />
      </div>
    `,
  }),
};

/** An `andesTreeNode` template draws the nodes in the panel. */
export const CustomNodeContent: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: {
      nodes: [
        {
          key: 'a',
          title: 'Almacén Lima',
          stock: 1240,
          children: [{ key: 'a1', title: 'Zona A', stock: 800 }],
        },
        { key: 'b', title: 'Almacén Cusco', stock: 310 },
      ] satisfies AndesTreeNode[],
      selected: null,
    },
    styles: [
      ...STORY_STYLES,
      `.stock { margin-inline-start: 8px; color: var(--andes-color-muted-foreground); font-size: 0.75rem; }`,
    ],
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Almacén" treeDefaultExpandAll [nodes]="nodes" [(value)]="selected">
          <ng-template andesTreeNode let-node>
            <span>{{ node.title }}</span><span class="stock">{{ node.stock }} u.</span>
          </ng-template>
        </andes-tree-select>
      </div>
    `,
  }),
};

/** With no options the panel shows an empty state; `loading` shows a spinner in the field and the panel. */
export const EmptyAndLoading: Story = {
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    styles: STORY_STYLES,
    template: `
      <div class="stack">
        <andes-tree-select aria-label="Empty" placeholder="No options" [nodes]="[]" />
        <andes-tree-select aria-label="Loading" placeholder="Loading options" loading [nodes]="[]" />
      </div>
    `,
  }),
};

/** The panel stays above or below the field: `topLeft` opens upwards. */
export const PlacementAbove: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    moduleMetadata: { imports: IMPORTS },
    props: { nodes: regions() },
    styles: [
      ...STORY_STYLES,
      `.bottom { display: flex; align-items: flex-end; min-height: 420px; }`,
    ],
    template: `
      <div class="bottom">
        <div class="stack">
          <andes-tree-select aria-label="Region" placement="topLeft" treeDefaultExpandAll [nodes]="nodes" />
        </div>
      </div>
    `,
  }),
};

/** It is a form control: bind it with `formControl` or `ngModel`, and show validation with `status`. */
export const WithForms: Story = {
  render: () => {
    const control = new FormControl<AndesTreeKey | null>(
      null,
      Validators.required,
    );
    return {
      moduleMetadata: { imports: IMPORTS },
      props: { nodes: regions(), control },
      styles: STORY_STYLES,
      template: `
        <div class="stack">
          <div>
            <label class="label" for="region-field">Region</label>
            <andes-tree-select
              id="region-field"
              allowClear
              placeholder="Required"
              [nodes]="nodes"
              [formControl]="control"
              [status]="control.invalid && control.touched ? 'error' : undefined"
            />
            @if (control.invalid && control.touched) {
              <p class="error">Pick a region.</p>
            }
          </div>
          <p class="caption">Value: <code>{{ control.value | json }}</code> · {{ control.status }}</p>
        </div>
      `,
    };
  },
};
