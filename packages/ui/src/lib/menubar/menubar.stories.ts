import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideFilePlus,
  lucideFolderOpen,
  lucidePrinter,
  lucideSave,
} from '@ng-icons/lucide';
import type { Meta, StoryObj } from '@storybook/angular';

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
import { AndesMenubar } from './menubar';
import { AndesMenubarMenu } from './menubar-menu';
import { AndesMenubarTrigger } from './menubar-trigger';

const meta: Meta<AndesMenubar> = {
  title: 'Menubar',
  component: AndesMenubar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A horizontal bar of menus, like the File / Edit / View strip of a desktop app. Click a trigger to open its menu; once one is open, pointing at another trigger switches menus with no extra click. Left/Right move between triggers and across open menus, ArrowDown, Enter and Space open a menu, and Escape closes it and returns focus to its trigger. Panels use the dropdown menu items, submenus, checkbox and radio parts.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<AndesMenubar>;

const OUTPUT_STYLE =
  'margin: 0.75rem 0 0; min-height: 1.375rem; color: var(--andes-color-muted-foreground); font: 0.75rem/1.25rem var(--andes-font-family), sans-serif;';

const PARTS = [
  AndesMenubar,
  AndesMenubarMenu,
  AndesMenubarTrigger,
  AndesDropdownMenuItem,
  AndesDropdownMenuSeparator,
  AndesDropdownMenuShortcut,
];

export const Basic: Story = {
  render: () => ({
    moduleMetadata: { imports: PARTS },
    props: { last: 'Nothing chosen yet' },
    template: `
      <andes-menubar aria-label="Application" (itemClick)="last = $event.menu + ': ' + $event.key">
        <andes-menubar-menu value="file">
          <andes-menubar-trigger>File</andes-menubar-trigger>
          <andes-dropdown-menu-item key="new">
            New window <andes-dropdown-menu-shortcut>⌘N</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="open">
            Open… <andes-dropdown-menu-shortcut>⌘O</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="save">
            Save <andes-dropdown-menu-shortcut>⌘S</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-item key="print">
            Print… <andes-dropdown-menu-shortcut>⌘P</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="edit">
          <andes-menubar-trigger>Edit</andes-menubar-trigger>
          <andes-dropdown-menu-item key="undo">
            Undo <andes-dropdown-menu-shortcut>⌘Z</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="redo">
            Redo <andes-dropdown-menu-shortcut>⇧⌘Z</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-item key="cut">
            Cut <andes-dropdown-menu-shortcut>⌘X</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="copy">
            Copy <andes-dropdown-menu-shortcut>⌘C</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="paste">
            Paste <andes-dropdown-menu-shortcut>⌘V</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="view">
          <andes-menubar-trigger>View</andes-menubar-trigger>
          <andes-dropdown-menu-item key="zoom-in">Zoom in</andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="zoom-out">Zoom out</andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="fullscreen">Enter full screen</andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="help">
          <andes-menubar-trigger>Help</andes-menubar-trigger>
          <andes-dropdown-menu-item key="docs">Documentation</andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="shortcuts">Keyboard shortcuts</andes-dropdown-menu-item>
        </andes-menubar-menu>
      </andes-menubar>
      <p style="${OUTPUT_STYLE}" aria-live="polite">{{ last }}</p>
    `,
  }),
};

export const WithIcons: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [NgIcon, ...PARTS],
      providers: [
        provideIcons({
          lucideFilePlus,
          lucideFolderOpen,
          lucidePrinter,
          lucideSave,
        }),
      ],
    },
    template: `
      <andes-menubar aria-label="Document">
        <andes-menubar-menu value="file">
          <andes-menubar-trigger>File</andes-menubar-trigger>
          <andes-dropdown-menu-item key="new">
            <ng-icon slot="icon-start" name="lucideFilePlus" /> New
            <andes-dropdown-menu-shortcut>⌘N</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="open">
            <ng-icon slot="icon-start" name="lucideFolderOpen" /> Open
            <andes-dropdown-menu-shortcut>⌘O</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="save">
            <ng-icon slot="icon-start" name="lucideSave" /> Save
            <andes-dropdown-menu-shortcut>⌘S</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-item key="print">
            <ng-icon slot="icon-start" name="lucidePrinter" /> Print
          </andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="edit">
          <andes-menubar-trigger>Edit</andes-menubar-trigger>
          <andes-dropdown-menu-item key="undo">Undo</andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="redo">Redo</andes-dropdown-menu-item>
        </andes-menubar-menu>
      </andes-menubar>
    `,
  }),
};

export const CheckboxAndRadioItems: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        ...PARTS,
        AndesDropdownMenuCheckboxItem,
        AndesDropdownMenuLabel,
        AndesDropdownMenuRadioGroup,
        AndesDropdownMenuRadioItem,
      ],
    },
    props: { toolbar: true, statusBar: false, zoom: '100' },
    template: `
      <andes-menubar aria-label="Editor">
        <andes-menubar-menu value="view">
          <andes-menubar-trigger>View</andes-menubar-trigger>
          <andes-dropdown-menu-label>Show</andes-dropdown-menu-label>
          <andes-dropdown-menu-checkbox-item [(checked)]="toolbar">
            Toolbar
          </andes-dropdown-menu-checkbox-item>
          <andes-dropdown-menu-checkbox-item [(checked)]="statusBar">
            Status bar
          </andes-dropdown-menu-checkbox-item>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-radio-group [(value)]="zoom">
            <andes-dropdown-menu-label>Zoom</andes-dropdown-menu-label>
            <andes-dropdown-menu-radio-item value="75">75%</andes-dropdown-menu-radio-item>
            <andes-dropdown-menu-radio-item value="100">100%</andes-dropdown-menu-radio-item>
            <andes-dropdown-menu-radio-item value="150">150%</andes-dropdown-menu-radio-item>
          </andes-dropdown-menu-radio-group>
        </andes-menubar-menu>
      </andes-menubar>
      <p style="${OUTPUT_STYLE}" aria-live="polite">
        Toolbar {{ toolbar ? 'shown' : 'hidden' }}, status bar {{ statusBar ? 'shown' : 'hidden' }}, zoom {{ zoom }}%
      </p>
    `,
  }),
};

export const Submenus: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        ...PARTS,
        AndesDropdownMenuSub,
        AndesDropdownMenuSubTrigger,
        AndesDropdownMenuSubContent,
      ],
    },
    props: { last: 'Nothing chosen yet' },
    template: `
      <andes-menubar aria-label="Application" (itemClick)="last = $event.keyPath.join(' / ')">
        <andes-menubar-menu value="file">
          <andes-menubar-trigger>File</andes-menubar-trigger>
          <andes-dropdown-menu-item key="new">New</andes-dropdown-menu-item>
          <andes-dropdown-menu-sub key="export">
            <andes-dropdown-menu-sub-trigger>Export as</andes-dropdown-menu-sub-trigger>
            <andes-dropdown-menu-sub-content>
              <andes-dropdown-menu-item key="pdf">PDF</andes-dropdown-menu-item>
              <andes-dropdown-menu-item key="csv">CSV</andes-dropdown-menu-item>
              <andes-dropdown-menu-sub key="image">
                <andes-dropdown-menu-sub-trigger>Image</andes-dropdown-menu-sub-trigger>
                <andes-dropdown-menu-sub-content>
                  <andes-dropdown-menu-item key="png">PNG</andes-dropdown-menu-item>
                  <andes-dropdown-menu-item key="svg">SVG</andes-dropdown-menu-item>
                </andes-dropdown-menu-sub-content>
              </andes-dropdown-menu-sub>
            </andes-dropdown-menu-sub-content>
          </andes-dropdown-menu-sub>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-item key="quit">Quit</andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="share">
          <andes-menubar-trigger>Share</andes-menubar-trigger>
          <andes-dropdown-menu-item key="email">Email link</andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="copy-link">Copy link</andes-dropdown-menu-item>
        </andes-menubar-menu>
      </andes-menubar>
      <p style="${OUTPUT_STYLE}" aria-live="polite">{{ last }}</p>
    `,
  }),
};

export const DisabledAndDanger: Story = {
  render: () => ({
    moduleMetadata: { imports: PARTS },
    template: `
      <andes-menubar aria-label="Records">
        <andes-menubar-menu value="record">
          <andes-menubar-trigger>Record</andes-menubar-trigger>
          <andes-dropdown-menu-item key="edit">Edit</andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="duplicate" [disabled]="true">Duplicate (disabled)</andes-dropdown-menu-item>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-item key="delete" variant="destructive">Delete</andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="reports" [disabled]="true">
          <andes-menubar-trigger>Reports</andes-menubar-trigger>
          <andes-dropdown-menu-item key="monthly">Monthly</andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="tools">
          <andes-menubar-trigger>Tools</andes-menubar-trigger>
          <andes-dropdown-menu-item key="import">Import…</andes-dropdown-menu-item>
        </andes-menubar-menu>
      </andes-menubar>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    moduleMetadata: { imports: PARTS },
    props: { sizes: ['sm', 'md', 'lg'] },
    template: `
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 1rem;">
        @for (size of sizes; track size) {
          <andes-menubar [size]="size" [attr.aria-label]="'Application, ' + size">
            <andes-menubar-menu value="file">
              <andes-menubar-trigger>File</andes-menubar-trigger>
              <andes-dropdown-menu-item key="new">New</andes-dropdown-menu-item>
              <andes-dropdown-menu-item key="open">Open</andes-dropdown-menu-item>
            </andes-menubar-menu>
            <andes-menubar-menu value="edit">
              <andes-menubar-trigger>Edit</andes-menubar-trigger>
              <andes-dropdown-menu-item key="undo">Undo</andes-dropdown-menu-item>
            </andes-menubar-menu>
            <andes-menubar-menu value="view">
              <andes-menubar-trigger>View</andes-menubar-trigger>
              <andes-dropdown-menu-item key="zoom">Zoom</andes-dropdown-menu-item>
            </andes-menubar-menu>
          </andes-menubar>
        }
      </div>
    `,
  }),
};

/** `plain` drops the frame, for a bar that sits in an app header. */
export const Plain: Story = {
  render: () => ({
    moduleMetadata: { imports: PARTS },
    template: `
      <header style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--andes-color-border); font: 600 0.875rem/1.375rem var(--andes-font-family), sans-serif; color: var(--andes-color-foreground);">
        <span>Ledger</span>
        <andes-menubar variant="plain" aria-label="Application">
          <andes-menubar-menu value="file">
            <andes-menubar-trigger>File</andes-menubar-trigger>
            <andes-dropdown-menu-item key="new">New entry</andes-dropdown-menu-item>
            <andes-dropdown-menu-item key="import">Import…</andes-dropdown-menu-item>
          </andes-menubar-menu>
          <andes-menubar-menu value="reports">
            <andes-menubar-trigger>Reports</andes-menubar-trigger>
            <andes-dropdown-menu-item key="trial">Trial balance</andes-dropdown-menu-item>
            <andes-dropdown-menu-item key="aging">Aging</andes-dropdown-menu-item>
          </andes-menubar-menu>
        </andes-menubar>
      </header>
    `,
  }),
};

export const ItemsArray: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [AndesMenubar, AndesMenubarMenu, AndesMenubarTrigger],
    },
    props: {
      last: 'Nothing chosen yet',
      file: [
        { key: 'new', label: 'New', extra: '⌘N' },
        { key: 'open', label: 'Open…', extra: '⌘O' },
        { type: 'divider' },
        {
          key: 'export',
          label: 'Export as',
          children: [
            { key: 'pdf', label: 'PDF' },
            { key: 'csv', label: 'CSV' },
          ],
        },
        { type: 'divider' },
        { key: 'quit', label: 'Quit', danger: true },
      ],
      edit: [
        { key: 'undo', label: 'Undo', extra: '⌘Z' },
        { key: 'redo', label: 'Redo', extra: '⇧⌘Z', disabled: true },
      ],
    },
    template: `
      <andes-menubar aria-label="Application" (itemClick)="last = $event.menu + ': ' + $event.keyPath.join(' / ')">
        <andes-menubar-menu value="file" [items]="file">
          <andes-menubar-trigger>File</andes-menubar-trigger>
        </andes-menubar-menu>
        <andes-menubar-menu value="edit" [items]="edit">
          <andes-menubar-trigger>Edit</andes-menubar-trigger>
        </andes-menubar-menu>
      </andes-menubar>
      <p style="${OUTPUT_STYLE}" aria-live="polite">{{ last }}</p>
    `,
  }),
};

/** `[(value)]` is the `value` of the open menu: write it to open one from code, `null` to close. */
export const ControlledValue: Story = {
  render: () => ({
    moduleMetadata: { imports: [...PARTS] },
    props: { open: null as string | null },
    template: `
      <andes-menubar aria-label="Application" [(value)]="open">
        <andes-menubar-menu value="file">
          <andes-menubar-trigger>File</andes-menubar-trigger>
          <andes-dropdown-menu-item key="new">New</andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="edit">
          <andes-menubar-trigger>Edit</andes-menubar-trigger>
          <andes-dropdown-menu-item key="undo">Undo</andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="help" align="end">
          <andes-menubar-trigger>Help</andes-menubar-trigger>
          <andes-dropdown-menu-item key="docs">Docs</andes-dropdown-menu-item>
        </andes-menubar-menu>
      </andes-menubar>
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem;">
        <button type="button" (click)="open = 'file'">Open File</button>
        <button type="button" (click)="open = 'edit'">Open Edit</button>
        <button type="button" (click)="open = null">Close</button>
      </div>
      <p style="${OUTPUT_STYLE}" aria-live="polite">Open menu: {{ open ?? 'none' }}</p>
    `,
  }),
};

export const NoLoop: Story = {
  render: () => ({
    moduleMetadata: { imports: PARTS },
    template: `
      <andes-menubar aria-label="Application" [loop]="false">
        <andes-menubar-menu value="file">
          <andes-menubar-trigger>File</andes-menubar-trigger>
          <andes-dropdown-menu-item key="new">New</andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="edit">
          <andes-menubar-trigger>Edit</andes-menubar-trigger>
          <andes-dropdown-menu-item key="undo">Undo</andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="view">
          <andes-menubar-trigger>View</andes-menubar-trigger>
          <andes-dropdown-menu-item key="zoom">Zoom</andes-dropdown-menu-item>
        </andes-menubar-menu>
      </andes-menubar>
      <p style="${OUTPUT_STYLE}">With loop off, the arrow keys stop at the first and last trigger.</p>
    `,
  }),
};

export const Rtl: Story = {
  // The panels render under <body>, so the direction has to be set on the document.
  beforeEach: () => {
    document.documentElement.dir = 'rtl';
    return () => {
      document.documentElement.removeAttribute('dir');
    };
  },
  render: () => ({
    moduleMetadata: {
      imports: [
        ...PARTS,
        AndesDropdownMenuSub,
        AndesDropdownMenuSubTrigger,
        AndesDropdownMenuSubContent,
      ],
    },
    template: `
      <andes-menubar aria-label="التطبيق">
        <andes-menubar-menu value="file">
          <andes-menubar-trigger>ملف</andes-menubar-trigger>
          <andes-dropdown-menu-item key="new">
            جديد <andes-dropdown-menu-shortcut>⌘N</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-sub key="export">
            <andes-dropdown-menu-sub-trigger>تصدير</andes-dropdown-menu-sub-trigger>
            <andes-dropdown-menu-sub-content>
              <andes-dropdown-menu-item key="pdf">PDF</andes-dropdown-menu-item>
              <andes-dropdown-menu-item key="csv">CSV</andes-dropdown-menu-item>
            </andes-dropdown-menu-sub-content>
          </andes-dropdown-menu-sub>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-item key="quit" variant="destructive">خروج</andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="edit">
          <andes-menubar-trigger>تحرير</andes-menubar-trigger>
          <andes-dropdown-menu-item key="undo">تراجع</andes-dropdown-menu-item>
          <andes-dropdown-menu-item key="redo">إعادة</andes-dropdown-menu-item>
        </andes-menubar-menu>
        <andes-menubar-menu value="help">
          <andes-menubar-trigger>مساعدة</andes-menubar-trigger>
          <andes-dropdown-menu-item key="docs">التوثيق</andes-dropdown-menu-item>
        </andes-menubar-menu>
      </andes-menubar>
    `,
  }),
};
