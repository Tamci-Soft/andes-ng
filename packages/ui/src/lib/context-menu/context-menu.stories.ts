import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideClipboardPaste,
  lucideCopy,
  lucidePencil,
  lucideScissors,
  lucideTrash2,
} from '@ng-icons/lucide';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesDropdownMenuCheckboxItem } from '../dropdown-menu/dropdown-menu-checkbox-item';
import { AndesDropdownMenuItem } from '../dropdown-menu/dropdown-menu-item';
import { AndesDropdownMenuLabel } from '../dropdown-menu/dropdown-menu-label';
import { AndesDropdownMenuRadioGroup } from '../dropdown-menu/dropdown-menu-radio-group';
import { AndesDropdownMenuRadioItem } from '../dropdown-menu/dropdown-menu-radio-item';
import { AndesDropdownMenuSeparator } from '../dropdown-menu/dropdown-menu-separator';
import { AndesDropdownMenuShortcut } from '../dropdown-menu/dropdown-menu-shortcut';
import { AndesDropdownMenuSub } from '../dropdown-menu/dropdown-menu-sub';
import { AndesDropdownMenuSubContent } from '../dropdown-menu/dropdown-menu-sub-content';
import { AndesDropdownMenuSubTrigger } from '../dropdown-menu/dropdown-menu-sub-trigger';
import { AndesContextMenu } from './context-menu';
import { AndesContextMenuTrigger } from './context-menu-trigger';

const meta: Meta<AndesContextMenu> = {
  title: 'Context Menu',
  component: AndesContextMenu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A menu that opens where the user asks for it: at the pointer on a right-click, under a held finger on touch (about 500ms), or at the focused element from the keyboard (Shift+F10 or the context-menu key). The native menu is replaced only inside the area, and returns when the menu or the area is disabled. The panel flips and shifts to stay inside the viewport.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<AndesContextMenu>;

/** A dashed drop zone used by most stories as the area to right-click. */
const AREA_STYLE =
  'display: flex; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; width: 22rem; height: 11rem; padding: 1rem; border: 1px dashed var(--andes-color-border); border-radius: var(--andes-radius-md); background-color: var(--andes-color-background); color: var(--andes-color-muted-foreground); font: 0.875rem/1.375rem var(--andes-font-family), sans-serif; outline-offset: 2px;';

const OUTPUT_STYLE =
  'margin: 0.75rem 0 0; min-height: 1.375rem; color: var(--andes-color-muted-foreground); font: 0.75rem/1.25rem var(--andes-font-family), sans-serif;';

const CORE_IMPORTS = [
  AndesContextMenu,
  AndesContextMenuTrigger,
  AndesDropdownMenuItem,
  AndesDropdownMenuSeparator,
  AndesDropdownMenuShortcut,
];

export const Basic: Story = {
  render: () => ({
    moduleMetadata: { imports: CORE_IMPORTS },
    props: { last: 'Nothing chosen yet' },
    template: `
      <andes-context-menu (itemClick)="last = 'Chose ' + $event.key">
        <div
          andesContextMenuTrigger
          tabindex="0"
          role="region"
          aria-label="Canvas. Right-click, or press Shift+F10, for actions."
          style="${AREA_STYLE}"
        >
          Right-click anywhere here
          <br />
          (or focus it and press Shift+F10)
        </div>
        <andes-dropdown-menu-item key="cut">
          Cut <andes-dropdown-menu-shortcut>⌘X</andes-dropdown-menu-shortcut>
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="copy">
          Copy <andes-dropdown-menu-shortcut>⌘C</andes-dropdown-menu-shortcut>
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="paste" [disabled]="true">
          Paste <andes-dropdown-menu-shortcut>⌘V</andes-dropdown-menu-shortcut>
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-separator />
        <andes-dropdown-menu-item key="delete" variant="destructive">
          Delete <andes-dropdown-menu-shortcut>⌫</andes-dropdown-menu-shortcut>
        </andes-dropdown-menu-item>
      </andes-context-menu>
      <p style="${OUTPUT_STYLE}" aria-live="polite">{{ last }}</p>
    `,
  }),
};

export const WithIcons: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [NgIcon, ...CORE_IMPORTS],
      providers: [
        provideIcons({
          lucideClipboardPaste,
          lucideCopy,
          lucidePencil,
          lucideScissors,
          lucideTrash2,
        }),
      ],
    },
    template: `
      <andes-context-menu>
        <div
          andesContextMenuTrigger
          tabindex="0"
          role="region"
          aria-label="Document. Right-click for actions."
          style="${AREA_STYLE}"
        >
          Right-click for actions with icons
        </div>
        <andes-dropdown-menu-item key="rename">
          <ng-icon slot="icon-start" name="lucidePencil" /> Rename
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="cut">
          <ng-icon slot="icon-start" name="lucideScissors" /> Cut
          <andes-dropdown-menu-shortcut>⌘X</andes-dropdown-menu-shortcut>
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="copy">
          <ng-icon slot="icon-start" name="lucideCopy" /> Copy
          <andes-dropdown-menu-shortcut>⌘C</andes-dropdown-menu-shortcut>
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="paste">
          <ng-icon slot="icon-start" name="lucideClipboardPaste" /> Paste
          <andes-dropdown-menu-shortcut>⌘V</andes-dropdown-menu-shortcut>
        </andes-dropdown-menu-item>
        <andes-dropdown-menu-separator />
        <andes-dropdown-menu-item key="delete" variant="destructive">
          <ng-icon slot="icon-start" name="lucideTrash2" /> Delete
        </andes-dropdown-menu-item>
      </andes-context-menu>
    `,
  }),
};

export const CheckboxAndRadioItems: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        ...CORE_IMPORTS,
        AndesDropdownMenuCheckboxItem,
        AndesDropdownMenuLabel,
        AndesDropdownMenuRadioGroup,
        AndesDropdownMenuRadioItem,
      ],
    },
    props: { grid: true, rulers: false, zoom: '100' },
    template: `
      <andes-context-menu>
        <div
          andesContextMenuTrigger
          tabindex="0"
          role="region"
          aria-label="Canvas view options. Right-click for options."
          style="${AREA_STYLE}"
        >
          Right-click to change the view
        </div>
        <andes-dropdown-menu-label>Show</andes-dropdown-menu-label>
        <andes-dropdown-menu-checkbox-item [(checked)]="grid">
          Grid
        </andes-dropdown-menu-checkbox-item>
        <andes-dropdown-menu-checkbox-item [(checked)]="rulers">
          Rulers
        </andes-dropdown-menu-checkbox-item>
        <andes-dropdown-menu-separator />
        <andes-dropdown-menu-radio-group [(value)]="zoom">
          <andes-dropdown-menu-label>Zoom</andes-dropdown-menu-label>
          <andes-dropdown-menu-radio-item value="50">50%</andes-dropdown-menu-radio-item>
          <andes-dropdown-menu-radio-item value="100">100%</andes-dropdown-menu-radio-item>
          <andes-dropdown-menu-radio-item value="200">200%</andes-dropdown-menu-radio-item>
        </andes-dropdown-menu-radio-group>
      </andes-context-menu>
      <p style="${OUTPUT_STYLE}" aria-live="polite">
        Grid {{ grid ? 'on' : 'off' }}, rulers {{ rulers ? 'on' : 'off' }}, zoom {{ zoom }}%
      </p>
    `,
  }),
};

export const Submenus: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        ...CORE_IMPORTS,
        AndesDropdownMenuSub,
        AndesDropdownMenuSubTrigger,
        AndesDropdownMenuSubContent,
      ],
    },
    props: { last: 'Nothing chosen yet' },
    template: `
      <andes-context-menu (itemClick)="last = $event.keyPath.join(' / ')">
        <div
          andesContextMenuTrigger
          tabindex="0"
          role="region"
          aria-label="Files. Right-click for actions."
          style="${AREA_STYLE}"
        >
          Right-click for nested actions
        </div>
        <andes-dropdown-menu-item key="open">Open</andes-dropdown-menu-item>
        <andes-dropdown-menu-sub key="share">
          <andes-dropdown-menu-sub-trigger>Share</andes-dropdown-menu-sub-trigger>
          <andes-dropdown-menu-sub-content>
            <andes-dropdown-menu-item key="email">Email link</andes-dropdown-menu-item>
            <andes-dropdown-menu-item key="copy-link">Copy link</andes-dropdown-menu-item>
            <andes-dropdown-menu-sub key="export">
              <andes-dropdown-menu-sub-trigger>Export as</andes-dropdown-menu-sub-trigger>
              <andes-dropdown-menu-sub-content>
                <andes-dropdown-menu-item key="pdf">PDF</andes-dropdown-menu-item>
                <andes-dropdown-menu-item key="csv">CSV</andes-dropdown-menu-item>
              </andes-dropdown-menu-sub-content>
            </andes-dropdown-menu-sub>
          </andes-dropdown-menu-sub-content>
        </andes-dropdown-menu-sub>
        <andes-dropdown-menu-separator />
        <andes-dropdown-menu-item key="delete" variant="destructive">Delete</andes-dropdown-menu-item>
      </andes-context-menu>
      <p style="${OUTPUT_STYLE}" aria-live="polite">{{ last }}</p>
    `,
  }),
};

export const ItemsArray: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesContextMenu, AndesContextMenuTrigger] },
    props: {
      last: 'Nothing chosen yet',
      items: [
        {
          type: 'group',
          label: 'Edit',
          children: [
            { key: 'rename', label: 'Rename', extra: 'F2' },
            { key: 'duplicate', label: 'Duplicate', extra: '⌘D' },
            { key: 'move', label: 'Move to…', disabled: true },
          ],
        },
        { type: 'divider' },
        {
          key: 'more',
          label: 'More',
          children: [
            { key: 'properties', label: 'Properties' },
            { key: 'history', label: 'Version history' },
          ],
        },
        { key: 'delete', label: 'Delete', danger: true },
      ],
    },
    template: `
      <andes-context-menu [items]="items" (itemClick)="last = 'Chose ' + $event.keyPath.join(' / ')">
        <div
          andesContextMenuTrigger
          tabindex="0"
          role="region"
          aria-label="Item. Right-click for actions."
          style="${AREA_STYLE}"
        >
          Right-click: the menu comes from an items array
        </div>
      </andes-context-menu>
      <p style="${OUTPUT_STYLE}" aria-live="polite">{{ last }}</p>
    `,
  }),
};

/** One menu bound to many areas. The row that was used comes back as `context`. */
export const TableRows: Story = {
  render: () => ({
    moduleMetadata: { imports: [AndesContextMenu, AndesContextMenuTrigger] },
    props: {
      last: 'Right-click a row',
      rows: [
        { id: 'INV-1042', customer: 'Acme Corp', total: '1,280.00' },
        { id: 'INV-1043', customer: 'Globex', total: '342.50' },
        { id: 'INV-1044', customer: 'Initech', total: '9,870.10' },
        { id: 'INV-1045', customer: 'Umbrella', total: '120.00' },
      ],
      items: [
        { key: 'view', label: 'View invoice' },
        { key: 'send', label: 'Send by email' },
        { key: 'pay', label: 'Mark as paid' },
        { type: 'divider' },
        { key: 'void', label: 'Void', danger: true },
      ],
    },
    template: `
      <andes-context-menu
        #menu="andesContextMenu"
        [items]="items"
        (itemClick)="last = $event.key + ' on ' + $event.context.id"
      />
      <table style="border-collapse: collapse; width: 26rem; font: 0.875rem/1.375rem var(--andes-font-family), sans-serif; color: var(--andes-color-foreground);">
        <caption style="text-align: start; padding-bottom: 0.5rem; color: var(--andes-color-muted-foreground);">
          Invoices - right-click a row
        </caption>
        <thead>
          <tr>
            <th style="text-align: start; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--andes-color-border);">Invoice</th>
            <th style="text-align: start; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--andes-color-border);">Customer</th>
            <th style="text-align: end; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--andes-color-border);">Total</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track row.id) {
            <tr
              tabindex="0"
              [andesContextMenuTrigger]="menu"
              [andesContextMenuContext]="row"
              style="cursor: context-menu;"
            >
              <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--andes-color-border);">{{ row.id }}</td>
              <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--andes-color-border);">{{ row.customer }}</td>
              <td style="text-align: end; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--andes-color-border);">{{ row.total }}</td>
            </tr>
          }
        </tbody>
      </table>
      <p style="${OUTPUT_STYLE}" aria-live="polite">{{ last }}</p>
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    moduleMetadata: { imports: CORE_IMPORTS },
    template: `
      <andes-context-menu [disabled]="true">
        <div
          andesContextMenuTrigger
          tabindex="0"
          role="region"
          aria-label="Disabled area. The browser menu is used here."
          style="${AREA_STYLE}"
        >
          Disabled: right-click shows the browser's own menu
        </div>
        <andes-dropdown-menu-item key="copy">Copy</andes-dropdown-menu-item>
      </andes-context-menu>
    `,
  }),
};

export const DisabledAreaInsideEnabledMenu: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesContextMenu,
        AndesContextMenuTrigger,
        AndesDropdownMenuItem,
      ],
    },
    template: `
      <andes-context-menu #menu="andesContextMenu">
        <andes-dropdown-menu-item key="open">Open</andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="rename">Rename</andes-dropdown-menu-item>
      </andes-context-menu>
      <div style="display: flex; gap: 1rem;">
        <div
          [andesContextMenuTrigger]="menu"
          tabindex="0"
          role="region"
          aria-label="Enabled area"
          style="${AREA_STYLE} width: 12rem;"
        >
          Custom menu here
        </div>
        <div
          [andesContextMenuTrigger]="menu"
          [andesContextMenuDisabled]="true"
          tabindex="0"
          role="region"
          aria-label="Disabled area"
          style="${AREA_STYLE} width: 12rem;"
        >
          Browser menu here
        </div>
      </div>
    `,
  }),
};

/** `openAt(x, y)` and `close()` for opening the menu from code, for example from a toolbar button. */
export const ImperativeOpen: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesButton,
        AndesContextMenu,
        AndesDropdownMenuItem,
        AndesDropdownMenuSeparator,
      ],
    },
    props: { log: 'Closed' },
    template: `
      <andes-context-menu
        #menu="andesContextMenu"
        (openStateChange)="log = ($event.open ? 'Opened' : 'Closed') + ' (' + $event.source + ')'"
      >
        <andes-dropdown-menu-item key="one">First action</andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="two">Second action</andes-dropdown-menu-item>
        <andes-dropdown-menu-separator />
        <andes-dropdown-menu-item key="three" variant="destructive">Danger</andes-dropdown-menu-item>
      </andes-context-menu>
      <div style="display: flex; gap: 0.5rem;">
        <andes-button variant="outline" (click)="menu.openAt(200, 120)">Open at 200, 120</andes-button>
        <andes-button variant="outline" (click)="menu.close()">Close</andes-button>
      </div>
      <p style="${OUTPUT_STYLE}" aria-live="polite">{{ log }}</p>
    `,
  }),
};

/** The panel keeps itself inside the viewport: drag the divider to the bottom-right and right-click there. */
export const NearViewportEdges: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    moduleMetadata: { imports: CORE_IMPORTS },
    template: `
      <andes-context-menu>
        <div
          andesContextMenuTrigger
          tabindex="0"
          role="region"
          aria-label="Full-page area. Right-click near an edge."
          style="${AREA_STYLE} width: 100vw; height: 100vh; border-radius: 0; border-style: dotted;"
        >
          Right-click near any edge or corner: the menu flips and shifts to stay on screen
        </div>
        <andes-dropdown-menu-item key="a">Reply</andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="b">Forward</andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="c">Archive</andes-dropdown-menu-item>
        <andes-dropdown-menu-item key="d">Mark as unread</andes-dropdown-menu-item>
        <andes-dropdown-menu-separator />
        <andes-dropdown-menu-item key="e" variant="destructive">Delete</andes-dropdown-menu-item>
      </andes-context-menu>
    `,
  }),
};

export const Rtl: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        ...CORE_IMPORTS,
        AndesDropdownMenuSub,
        AndesDropdownMenuSubTrigger,
        AndesDropdownMenuSubContent,
      ],
    },
    template: `
      <div dir="rtl">
        <andes-context-menu>
          <div
            andesContextMenuTrigger
            tabindex="0"
            role="region"
            aria-label="منطقة. انقر بزر الفأرة الأيمن."
            style="${AREA_STYLE}"
          >
            انقر بزر الفأرة الأيمن هنا
          </div>
          <andes-dropdown-menu-item key="open">فتح</andes-dropdown-menu-item>
          <andes-dropdown-menu-sub key="share">
            <andes-dropdown-menu-sub-trigger>مشاركة</andes-dropdown-menu-sub-trigger>
            <andes-dropdown-menu-sub-content>
              <andes-dropdown-menu-item key="mail">بريد</andes-dropdown-menu-item>
              <andes-dropdown-menu-item key="link">رابط</andes-dropdown-menu-item>
            </andes-dropdown-menu-sub-content>
          </andes-dropdown-menu-sub>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-item key="delete" variant="destructive">حذف</andes-dropdown-menu-item>
        </andes-context-menu>
      </div>
    `,
  }),
};
