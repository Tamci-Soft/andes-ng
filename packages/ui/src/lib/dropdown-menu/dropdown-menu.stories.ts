import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideCopy,
  lucideLink,
  lucideMail,
  lucidePencil,
  lucideSave,
  lucideShare2,
  lucideTrash2,
} from '@ng-icons/lucide';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesDropdownButton } from './dropdown-button';
import { AndesDropdownMenu } from './dropdown-menu';
import { AndesDropdownMenuGroup } from './dropdown-menu-group';
import { AndesDropdownMenuSub } from './dropdown-menu-sub';
import { AndesDropdownMenuSubContent } from './dropdown-menu-sub-content';
import { AndesDropdownMenuSubTrigger } from './dropdown-menu-sub-trigger';
import { AndesDropdownMenuCheckboxItem } from './dropdown-menu-checkbox-item';
import { AndesDropdownMenuContent } from './dropdown-menu-content';
import { AndesDropdownMenuItem } from './dropdown-menu-item';
import { AndesDropdownMenuLabel } from './dropdown-menu-label';
import { AndesDropdownMenuRadioItem } from './dropdown-menu-radio-item';
import { AndesDropdownMenuSeparator } from './dropdown-menu-separator';
import { AndesDropdownMenuShortcut } from './dropdown-menu-shortcut';
import { AndesDropdownMenuTrigger } from './dropdown-menu-trigger';

const meta: Meta<AndesDropdownMenu> = {
  title: 'Dropdown Menu',
  component: AndesDropdownMenu,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<AndesDropdownMenu>;

export const Basic: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
        AndesDropdownMenuSeparator,
      ],
    },
    template: `
      <andes-dropdown-menu>
        <andes-button andesDropdownMenuTrigger>Options</andes-button>
        <andes-dropdown-menu-content>
          <andes-dropdown-menu-item>Edit</andes-dropdown-menu-item>
          <andes-dropdown-menu-item>Duplicate</andes-dropdown-menu-item>
          <andes-dropdown-menu-item disabled>Archive (disabled)</andes-dropdown-menu-item>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-item variant="destructive">Delete</andes-dropdown-menu-item>
        </andes-dropdown-menu-content>
      </andes-dropdown-menu>
    `,
  }),
};

export const WithIconsAndShortcuts: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        NgIcon,
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
        AndesDropdownMenuSeparator,
        AndesDropdownMenuShortcut,
      ],
      // `NgIcon` renders nothing (and only warns to the console) for a name that was
      // never registered, so a story using icons the global `provideIcons` in
      // `.storybook/preview.ts` does not list silently loses them. Registering the
      // four this story needs here keeps that dependency next to the markup that has
      // it - `provideIcons` is `multi: true`, so this adds to the global set rather
      // than replacing it.
      providers: [
        provideIcons({
          lucideChevronDown,
          lucideCopy,
          lucidePencil,
          lucideTrash2,
        }),
      ],
    },
    template: `
      <andes-dropdown-menu>
        <andes-button andesDropdownMenuTrigger>
          Options <ng-icon slot="icon-end" name="lucideChevronDown" />
        </andes-button>
        <andes-dropdown-menu-content>
          <andes-dropdown-menu-item>
            <ng-icon slot="icon-start" name="lucidePencil" />
            Edit
            <andes-dropdown-menu-shortcut>⌘E</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-item>
            <ng-icon slot="icon-start" name="lucideCopy" />
            Duplicate
            <andes-dropdown-menu-shortcut>⌘D</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-item variant="destructive">
            <ng-icon slot="icon-start" name="lucideTrash2" />
            Delete
            <andes-dropdown-menu-shortcut>⌘⌫</andes-dropdown-menu-shortcut>
          </andes-dropdown-menu-item>
        </andes-dropdown-menu-content>
      </andes-dropdown-menu>
    `,
  }),
};

export const CheckboxAndRadioItems: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
        AndesDropdownMenuCheckboxItem,
        AndesDropdownMenuRadioItem,
        AndesDropdownMenuLabel,
        AndesDropdownMenuSeparator,
      ],
    },
    template: `
      <andes-dropdown-menu>
        <andes-button andesDropdownMenuTrigger variant="outline">View</andes-button>
        <andes-dropdown-menu-content>
          <andes-dropdown-menu-label>Appearance</andes-dropdown-menu-label>
          <andes-dropdown-menu-checkbox-item [checked]="true">
            Show hidden files
          </andes-dropdown-menu-checkbox-item>
          <andes-dropdown-menu-checkbox-item>
            Show bookmarks bar
          </andes-dropdown-menu-checkbox-item>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-label>Sort by</andes-dropdown-menu-label>
          <andes-dropdown-menu-radio-item name="sort" value="name" [defaultChecked]="true">
            Name
          </andes-dropdown-menu-radio-item>
          <andes-dropdown-menu-radio-item name="sort" value="date">
            Date modified
          </andes-dropdown-menu-radio-item>
          <andes-dropdown-menu-radio-item name="sort" value="size">
            Size
          </andes-dropdown-menu-radio-item>
        </andes-dropdown-menu-content>
      </andes-dropdown-menu>
    `,
  }),
};

export const KeyboardNavigation: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
      ],
    },
    template: `
      <div>
        <p style="font: 0.875rem system-ui; color: #64748b; margin-bottom: 0.5rem;">
          Open with Enter/Space/ArrowDown/ArrowUp, navigate with the arrow keys, type
          to jump to an item, Escape to close and return focus to the trigger.
        </p>
        <andes-dropdown-menu>
          <andes-button andesDropdownMenuTrigger>Options</andes-button>
          <andes-dropdown-menu-content>
            <andes-dropdown-menu-item>Apple</andes-dropdown-menu-item>
            <andes-dropdown-menu-item>Apricot</andes-dropdown-menu-item>
            <andes-dropdown-menu-item disabled>Banana (disabled)</andes-dropdown-menu-item>
            <andes-dropdown-menu-item>Cherry</andes-dropdown-menu-item>
          </andes-dropdown-menu-content>
        </andes-dropdown-menu>
      </div>
    `,
  }),
};

const ICONS = provideIcons({
  lucideCopy,
  lucideLink,
  lucideMail,
  lucidePencil,
  lucideSave,
  lucideShare2,
  lucideTrash2,
});

const NOTE =
  'font: 0.8125rem system-ui; color: #64748b; margin: 0 0 0.75rem; max-width: 34rem;';

/**
 * Nested submenus. Hover a "…" row (after a 100ms intent delay), click it, or focus it
 * and press ArrowRight/Enter/Space; ArrowLeft or Escape closes just that submenu and
 * returns focus to its row. Pointing at a sibling row closes it after 100ms, so a
 * diagonal move into the submenu is forgiven.
 */
export const Submenus: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        NgIcon,
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
        AndesDropdownMenuSeparator,
        AndesDropdownMenuSub,
        AndesDropdownMenuSubTrigger,
        AndesDropdownMenuSubContent,
      ],
      providers: [ICONS],
    },
    props: { last: '' },
    template: `
      <div>
        <p style="${NOTE}">Last clicked: <strong>{{ last || '-' }}</strong></p>
        <andes-dropdown-menu (itemClick)="last = $event.keyPath.join(' < ')">
          <andes-button andesDropdownMenuTrigger variant="outline">File</andes-button>
          <andes-dropdown-menu-content>
            <andes-dropdown-menu-item key="new">New file</andes-dropdown-menu-item>
            <andes-dropdown-menu-item key="open">Open…</andes-dropdown-menu-item>
            <andes-dropdown-menu-sub key="share">
              <andes-dropdown-menu-sub-trigger>
                <ng-icon slot="icon-start" name="lucideShare2" />
                Share
              </andes-dropdown-menu-sub-trigger>
              <andes-dropdown-menu-sub-content>
                <andes-dropdown-menu-item key="email">
                  <ng-icon slot="icon-start" name="lucideMail" />
                  Email link
                </andes-dropdown-menu-item>
                <andes-dropdown-menu-item key="copy-link">
                  <ng-icon slot="icon-start" name="lucideLink" />
                  Copy link
                </andes-dropdown-menu-item>
                <andes-dropdown-menu-sub key="social">
                  <andes-dropdown-menu-sub-trigger>Social</andes-dropdown-menu-sub-trigger>
                  <andes-dropdown-menu-sub-content>
                    <andes-dropdown-menu-item key="mastodon">Mastodon</andes-dropdown-menu-item>
                    <andes-dropdown-menu-item key="bluesky">Bluesky</andes-dropdown-menu-item>
                  </andes-dropdown-menu-sub-content>
                </andes-dropdown-menu-sub>
              </andes-dropdown-menu-sub-content>
            </andes-dropdown-menu-sub>
            <andes-dropdown-menu-sub key="export">
              <andes-dropdown-menu-sub-trigger disabled>Export (disabled)</andes-dropdown-menu-sub-trigger>
              <andes-dropdown-menu-sub-content>
                <andes-dropdown-menu-item key="pdf">PDF</andes-dropdown-menu-item>
              </andes-dropdown-menu-sub-content>
            </andes-dropdown-menu-sub>
            <andes-dropdown-menu-separator />
            <andes-dropdown-menu-item key="delete" variant="destructive">Delete</andes-dropdown-menu-item>
          </andes-dropdown-menu-content>
        </andes-dropdown-menu>
      </div>
    `,
  }),
};

/**
 * The `items` array (Ant's `menu.items`) instead of projected content: plain items with
 * `icon`/`extra`/`danger`/`disabled`, `type: 'group'`, `type: 'divider'` (optionally
 * `dashed`) and submenus via `children`. Icons and any rich label are `TemplateRef`s.
 */
export const ItemsArray: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        NgIcon,
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
      ],
      providers: [ICONS],
    },
    props: { last: '' },
    template: `
      <div>
        <p style="${NOTE}">(itemClick): <strong>{{ last || '-' }}</strong></p>
        <ng-template #editIcon><ng-icon name="lucidePencil" /></ng-template>
        <ng-template #copyIcon><ng-icon name="lucideCopy" /></ng-template>
        <ng-template #shareIcon><ng-icon name="lucideShare2" /></ng-template>
        <ng-template #deleteIcon><ng-icon name="lucideTrash2" /></ng-template>
        <andes-dropdown-menu
          (itemClick)="last = $event.key + ' (' + $event.keyPath.join(' < ') + ')'"
          [items]="[
            { key: 'edit', label: 'Edit', icon: editIcon, extra: '⌘E' },
            { key: 'copy', label: 'Duplicate', icon: copyIcon, extra: '⌘D' },
            { key: 'rename', label: 'Rename', disabled: true },
            { type: 'divider', dashed: true },
            { type: 'group', label: 'Move to', children: [
              { key: 'inbox', label: 'Inbox' },
              { key: 'archive', label: 'Archive' },
            ] },
            { key: 'share', label: 'Share', icon: shareIcon, children: [
              { key: 'email', label: 'Email' },
              { key: 'link', label: 'Copy link' },
            ] },
            { type: 'divider' },
            { key: 'delete', label: 'Delete', icon: deleteIcon, danger: true, extra: '⌘⌫' },
          ]"
        >
          <andes-button andesDropdownMenuTrigger variant="outline">Actions</andes-button>
        </andes-dropdown-menu>
      </div>
    `,
  }),
};

/** `trigger="hover"`: opens after 150ms of hover, closes 100ms after the pointer leaves trigger and panel. */
export const HoverTrigger: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
      ],
    },
    template: `
      <andes-dropdown-menu trigger="hover">
        <andes-button andesDropdownMenuTrigger variant="ghost">Hover me</andes-button>
        <andes-dropdown-menu-content>
          <andes-dropdown-menu-item>Profile</andes-dropdown-menu-item>
          <andes-dropdown-menu-item>Settings</andes-dropdown-menu-item>
          <andes-dropdown-menu-item>Sign out</andes-dropdown-menu-item>
        </andes-dropdown-menu-content>
      </andes-dropdown-menu>
    `,
  }),
};

/** `trigger="contextMenu"`: right-click anywhere in the area opens the menu at the pointer. */
export const ContextMenu: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
        AndesDropdownMenuSeparator,
      ],
    },
    template: `
      <andes-dropdown-menu trigger="contextMenu">
        <div
          andesDropdownMenuTrigger
          tabindex="0"
          aria-label="Canvas - right-click or press Shift+F10 for actions"
          style="display: flex; align-items: center; justify-content: center; width: 22rem; height: 12rem; border: 2px dashed var(--andes-color-border); border-radius: var(--andes-radius-md); color: var(--andes-color-muted-foreground); font: 0.875rem system-ui;"
        >
          Right-click anywhere here
        </div>
        <andes-dropdown-menu-content>
          <andes-dropdown-menu-item>Cut</andes-dropdown-menu-item>
          <andes-dropdown-menu-item>Copy</andes-dropdown-menu-item>
          <andes-dropdown-menu-item>Paste</andes-dropdown-menu-item>
          <andes-dropdown-menu-separator />
          <andes-dropdown-menu-item variant="destructive">Delete</andes-dropdown-menu-item>
        </andes-dropdown-menu-content>
      </andes-dropdown-menu>
    `,
  }),
};

/** The six primary `placement`s, with `arrow`. `{ pointAtCenter: true }` shifts the panel so the arrow meets the trigger's center. */
export const PlacementAndArrow: Story = {
  args: { arrow: true },
  argTypes: {
    arrow: {
      control: 'select',
      options: ['off', 'on', 'pointAtCenter'],
      mapping: { off: false, on: true, pointAtCenter: { pointAtCenter: true } },
    },
  },
  render: (args) => ({
    moduleMetadata: {
      imports: [
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
      ],
    },
    props: {
      ...args,
      rows: [
        ['topLeft', 'top', 'topRight'],
        ['bottomLeft', 'bottom', 'bottomRight'],
      ],
    },
    template: `
      <div style="display: grid; gap: 7rem 1rem; padding: 7rem 2rem;">
        @for (row of rows; track $index) {
          <div style="display: flex; gap: 1rem;">
            @for (placement of row; track placement) {
              <andes-dropdown-menu [placement]="placement" [arrow]="arrow">
                <andes-button andesDropdownMenuTrigger variant="outline">
                  {{ placement }}
                </andes-button>
                <andes-dropdown-menu-content>
                  <andes-dropdown-menu-item>First action</andes-dropdown-menu-item>
                  <andes-dropdown-menu-item>Second action</andes-dropdown-menu-item>
                  <andes-dropdown-menu-item>Third action</andes-dropdown-menu-item>
                </andes-dropdown-menu-content>
              </andes-dropdown-menu>
            }
          </div>
        }
      </div>
    `,
  }),
};

/** `[(open)]` two-way binding plus `(openStateChange)`, which reports what caused each change. */
export const ControlledOpen: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
      ],
    },
    props: { open: false, log: [] as string[] },
    template: `
      <div style="display: flex; gap: 2rem; align-items: flex-start;">
        <div style="display: flex; gap: 0.5rem;">
          <andes-button variant="secondary" (click)="open = !open">
            {{ open ? 'Close' : 'Open' }} from outside
          </andes-button>
          <andes-dropdown-menu
            [(open)]="open"
            (openStateChange)="log = [($event.open ? 'open' : 'close') + ' · ' + $event.source].concat(log).slice(0, 6)"
          >
            <andes-button andesDropdownMenuTrigger variant="outline">Menu</andes-button>
            <andes-dropdown-menu-content>
              <andes-dropdown-menu-item>Rename</andes-dropdown-menu-item>
              <andes-dropdown-menu-item>Move</andes-dropdown-menu-item>
            </andes-dropdown-menu-content>
          </andes-dropdown-menu>
        </div>
        <ul style="${NOTE} margin: 0; padding-left: 1rem;">
          <li>open = {{ open }}</li>
          @for (line of log; track $index) {
            <li>{{ line }}</li>
          }
        </ul>
      </div>
    `,
  }),
};

/** `selectable` (+ `multiple`) with two-way `[(selectedKeys)]`: keyed items become menuitemradio / menuitemcheckbox. */
export const Selectable: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [AndesButton, AndesDropdownMenu, AndesDropdownMenuTrigger],
    },
    props: {
      single: ['name'],
      many: ['bold'],
      sortItems: [
        { key: 'name', label: 'Name' },
        { key: 'date', label: 'Date modified' },
        { key: 'size', label: 'Size' },
      ],
      styleItems: [
        { key: 'bold', label: 'Bold' },
        { key: 'italic', label: 'Italic' },
        { key: 'underline', label: 'Underline' },
      ],
    },
    template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <andes-dropdown-menu selectable [items]="sortItems" [(selectedKeys)]="single">
          <andes-button andesDropdownMenuTrigger variant="outline">Sort: {{ single[0] }}</andes-button>
        </andes-dropdown-menu>
        <andes-dropdown-menu selectable multiple [items]="styleItems" [(selectedKeys)]="many">
          <andes-button andesDropdownMenuTrigger variant="outline">Style: {{ many.join(', ') || 'none' }}</andes-button>
        </andes-dropdown-menu>
      </div>
    `,
  }),
};

/** `Dropdown.Button`: a main action plus a caret that opens the menu, aligned `bottomRight` under the caret. */
export const DropdownButton: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        NgIcon,
        AndesDropdownButton,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
        AndesDropdownMenuGroup,
        AndesDropdownMenuLabel,
      ],
      providers: [ICONS],
    },
    props: { last: '' },
    template: `
      <div>
        <p style="${NOTE}">Last action: <strong>{{ last || '-' }}</strong></p>
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <andes-dropdown-button (buttonClick)="last = 'save'" (itemClick)="last = $event.key">
            <ng-icon name="lucideSave" /> Save
            <andes-dropdown-menu-content>
              <andes-dropdown-menu-item key="save-as">Save as…</andes-dropdown-menu-item>
              <andes-dropdown-menu-item key="save-copy">Save a copy</andes-dropdown-menu-item>
            </andes-dropdown-menu-content>
          </andes-dropdown-button>
          <andes-dropdown-button
            variant="primary"
            (buttonClick)="last = 'publish'"
            (itemClick)="last = $event.key"
            [items]="[
              { key: 'schedule', label: 'Schedule…' },
              { key: 'draft', label: 'Save as draft' },
            ]"
          >
            Publish
          </andes-dropdown-button>
          <andes-dropdown-button variant="danger" (buttonClick)="last = 'delete'" (itemClick)="last = $event.key"
            [items]="[{ key: 'delete-all', label: 'Delete all versions', danger: true }]">
            Delete
          </andes-dropdown-button>
          <andes-dropdown-button disabled>Disabled</andes-dropdown-button>
        </div>
      </div>
    `,
  }),
};

/** `disabled` on the root: the trigger is `aria-disabled` and nothing opens the menu. */
export const Disabled: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuItem,
      ],
    },
    template: `
      <andes-dropdown-menu disabled>
        <andes-button andesDropdownMenuTrigger variant="outline" disabled>Options</andes-button>
        <andes-dropdown-menu-content>
          <andes-dropdown-menu-item>Edit</andes-dropdown-menu-item>
        </andes-dropdown-menu-content>
      </andes-dropdown-menu>
    `,
  }),
};
