import { NgTemplateOutlet } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBookOpen,
  lucideChevronDown,
  lucideExternalLink,
  lucidePlus,
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
import { AndesDropdownMenuRadioGroup } from './dropdown-menu-radio-group';
import { AndesDropdownMenuRadioItem } from './dropdown-menu-radio-item';
import { AndesDropdownMenuSeparator } from './dropdown-menu-separator';
import { AndesDropdownMenuShortcut } from './dropdown-menu-shortcut';
import { AndesDropdownMenuTrigger } from './dropdown-menu-trigger';

/**
 * Demo search field styled like the library's own fields: one focus indicator (primary
 * border plus a soft 2px ring), never the browser's outline drawn as a second frame.
 */
const FIELD_STYLES = `
  <style>
    .sb-field-input {
      box-sizing: border-box;
      width: 100%;
      height: 2rem;
      padding: 0 0.6875rem;
      border: 1px solid var(--andes-color-input);
      border-radius: var(--andes-radius-md);
      background-color: var(--andes-color-background);
      color: var(--andes-color-foreground);
      font: inherit;
      line-height: 1.375rem;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
    }
    .sb-field-input::placeholder { color: var(--andes-color-muted-foreground); }
    .sb-field-input:hover {
      border-color: color-mix(in srgb, var(--andes-color-primary) 65%, var(--andes-color-input));
    }
    .sb-field-input:focus {
      border-color: var(--andes-color-primary);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--andes-color-primary) 20%, transparent);
      outline: none;
    }
  </style>
`;

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
        <p style="font: 0.875rem var(--andes-font-family), sans-serif; color: var(--andes-color-muted-foreground); margin-bottom: 0.5rem;">
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
  lucideBookOpen,
  lucideExternalLink,
  lucidePlus,
  lucideCopy,
  lucideLink,
  lucideMail,
  lucidePencil,
  lucideSave,
  lucideShare2,
  lucideTrash2,
});

const NOTE =
  'font: 0.75rem var(--andes-font-family), sans-serif; color: var(--andes-color-muted-foreground); margin: 0 0 0.75rem; max-width: 34rem;';

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
 * The data-driven `items` array instead of projected content: plain items with
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
          style="display: flex; align-items: center; justify-content: center; width: 22rem; height: 12rem; border: 2px dashed var(--andes-color-border); border-radius: var(--andes-radius-md); color: var(--andes-color-muted-foreground); font: 0.875rem var(--andes-font-family), sans-serif;"
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

/**
 * `AndesDropdownMenuRadioGroup` with two-way `[(value)]`: the buttons outside the menu
 * change the selection, and picking an item updates `sort`.
 */
export const ControlledRadioGroup: Story = {
  name: 'Controlled radio group',
  render: () => ({
    moduleMetadata: {
      imports: [
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
        AndesDropdownMenuContent,
        AndesDropdownMenuLabel,
        AndesDropdownMenuRadioGroup,
        AndesDropdownMenuRadioItem,
      ],
    },
    props: { sort: 'date' },
    template: `
      <div>
        <p style="${NOTE}">Sort: <strong>{{ sort ?? '-' }}</strong></p>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <andes-dropdown-menu>
            <andes-button andesDropdownMenuTrigger variant="outline">Sort by</andes-button>
            <andes-dropdown-menu-content>
              <andes-dropdown-menu-radio-group [(value)]="sort">
                <andes-dropdown-menu-label>Sort by</andes-dropdown-menu-label>
                <andes-dropdown-menu-radio-item value="name">Name</andes-dropdown-menu-radio-item>
                <andes-dropdown-menu-radio-item value="date">Date modified</andes-dropdown-menu-radio-item>
                <andes-dropdown-menu-radio-item value="size">Size</andes-dropdown-menu-radio-item>
              </andes-dropdown-menu-radio-group>
            </andes-dropdown-menu-content>
          </andes-dropdown-menu>
          <andes-button variant="ghost" (click)="sort = 'name'">Set "name"</andes-button>
          <andes-button variant="ghost" (click)="sort = 'size'">Set "size"</andes-button>
          <andes-button variant="ghost" (click)="sort = undefined">Clear</andes-button>
        </div>
      </div>
    `,
  }),
};

/** `AndesDropdownButton`: a main action plus a caret that opens the menu, aligned `bottomRight` under the caret. */
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

/**
 * Link items: `href` (plus `target`/`rel`) renders the row's content inside a real
 * anchor, so the browser follows it - new-tab via `target="_blank"`, middle-click and
 * Ctrl/Cmd-click included - while the row keeps its menu role and arrow-key focus.
 */
export const LinkItems: Story = {
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
      ],
      providers: [ICONS],
    },
    template: `
      <div style="display: flex; gap: 1rem;">
        <ng-template #bookIcon><ng-icon name="lucideBookOpen" /></ng-template>
        <ng-template #externalIcon><ng-icon name="lucideExternalLink" /></ng-template>
        <andes-dropdown-menu
          [items]="[
            { key: 'guide', label: 'Getting started', href: '#getting-started', icon: bookIcon },
            { key: 'angular', label: 'Angular docs', href: 'https://angular.dev', target: '_blank', icon: externalIcon },
            { key: 'old', label: 'Legacy docs (disabled)', href: '#legacy', disabled: true },
          ]"
        >
          <andes-button andesDropdownMenuTrigger variant="outline">Help (items)</andes-button>
        </andes-dropdown-menu>
        <andes-dropdown-menu>
          <andes-button andesDropdownMenuTrigger variant="outline">Help (projected)</andes-button>
          <andes-dropdown-menu-content>
            <andes-dropdown-menu-item href="#shortcuts">Keyboard shortcuts</andes-dropdown-menu-item>
            <andes-dropdown-menu-separator />
            <andes-dropdown-menu-item href="https://angular.dev" target="_blank">
              Angular docs
              <ng-icon slot="icon-end" name="lucideExternalLink" />
            </andes-dropdown-menu-item>
          </andes-dropdown-menu-content>
        </andes-dropdown-menu>
      </div>
    `,
  }),
};

/**
 * `closeOnSelect`: `false` on the root keeps the menu open after any plain item is
 * picked (each item can still override it), for running several actions in a row.
 */
export const StayOpenOnSelect: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [AndesButton, AndesDropdownMenu, AndesDropdownMenuTrigger],
    },
    props: { log: [] as string[] },
    template: `
      <div>
        <p style="${NOTE}">Picked: <strong>{{ log.join(', ') || '-' }}</strong></p>
        <andes-dropdown-menu
          [closeOnSelect]="false"
          (itemClick)="log = log.concat($event.key).slice(-5)"
          [items]="[
            { key: 'zoom-in', label: 'Zoom in', extra: '+' },
            { key: 'zoom-out', label: 'Zoom out', extra: '-' },
            { key: 'reset', label: 'Reset zoom' },
            { type: 'divider' },
            { key: 'done', label: 'Done', closeOnSelect: true },
          ]"
        >
          <andes-button andesDropdownMenuTrigger variant="outline">View</andes-button>
        </andes-dropdown-menu>
      </div>
    `,
  }),
};

/**
 * `popupTemplate` wraps the menu in content of your own - here a filter field above
 * it and an action below it - inside one popup surface. The template receives the menu
 * as `$implicit` and a `close` function. Tab moves through field, menu and footer.
 */
export const CustomPopup: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [
        NgIcon,
        NgTemplateOutlet,
        AndesButton,
        AndesDropdownMenu,
        AndesDropdownMenuTrigger,
      ],
      providers: [ICONS],
    },
    props: {
      query: '',
      last: '',
      projects: [
        { key: 'atlas', label: 'Atlas ERP' },
        { key: 'billing', label: 'Billing' },
        { key: 'crm', label: 'CRM' },
        { key: 'inventory', label: 'Inventory' },
        { key: 'payroll', label: 'Payroll' },
      ],
      filter: (
        items: readonly { key: string; label: string }[],
        query: string,
      ) =>
        items.filter((item) =>
          item.label.toLowerCase().includes(query.trim().toLowerCase()),
        ),
    },
    template: `${FIELD_STYLES}
      <div>
        <p style="${NOTE}">Last action: <strong>{{ last || '-' }}</strong></p>
        <andes-dropdown-menu
          [items]="filter(projects, query)"
          [popupTemplate]="popup"
          (itemClick)="last = $event.key"
          (openStateChange)="query = ''"
        >
          <andes-button andesDropdownMenuTrigger variant="outline">Switch project</andes-button>
        </andes-dropdown-menu>
        <ng-template #popup let-menu let-close="close">
          <div style="padding: var(--andes-space-2); border-bottom: 1px solid var(--andes-color-border);">
            <input
              aria-label="Filter projects"
              placeholder="Filter projects…"
              [value]="query"
              (input)="query = $any($event.target).value"
              class="sb-field-input"
            />
          </div>
          <ng-container *ngTemplateOutlet="menu" />
          <div style="padding: var(--andes-space-1); border-top: 1px solid var(--andes-color-border);">
            <andes-button variant="ghost" size="sm" fullWidth (click)="last = 'new project'; close()">
              <ng-icon slot="icon-start" name="lucidePlus" /> New project
            </andes-button>
          </div>
        </ng-template>
      </div>
    `,
  }),
};

/**
 * A long menu scrolls inside the panel. The cap is the
 * `--andes-dropdown-menu-max-height` custom property (default 24rem, never taller than
 * the viewport) - set it on the content, or from a stylesheet through `panelClass`.
 */
export const ScrollableMenu: Story = {
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
    props: {
      branches: Array.from({ length: 40 }, (_, index) => ({
        key: `branch-${index + 1}`,
        label: `Branch office ${index + 1}`,
      })),
    },
    template: `
      <div style="display: flex; gap: 1rem;">
        <andes-dropdown-menu [items]="branches">
          <andes-button andesDropdownMenuTrigger variant="outline">40 branches</andes-button>
        </andes-dropdown-menu>
        <andes-dropdown-menu>
          <andes-button andesDropdownMenuTrigger variant="outline">Capped at 12rem</andes-button>
          <andes-dropdown-menu-content style="--andes-dropdown-menu-max-height: 12rem">
            @for (branch of branches; track branch.key) {
              <andes-dropdown-menu-item [key]="branch.key">{{ branch.label }}</andes-dropdown-menu-item>
            }
          </andes-dropdown-menu-content>
        </andes-dropdown-menu>
      </div>
    `,
  }),
};

/**
 * Submenu options: a custom `expandIcon` (its context is the open state),
 * `triggerSubMenuAction="click"`, a per-submenu `popupOffset` and
 * `(submenuTriggerClick)` for the trigger rows themselves.
 */
export const SubmenuOptions: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [AndesButton, AndesDropdownMenu, AndesDropdownMenuTrigger],
    },
    props: { last: '' },
    template: `
      <div>
        <p style="${NOTE}">Last event: <strong>{{ last || '-' }}</strong></p>
        <ng-template #expand let-open>
          <span style="display: inline-block; width: 1em; text-align: center;">{{ open ? '−' : '+' }}</span>
        </ng-template>
        <andes-dropdown-menu
          triggerSubMenuAction="click"
          [expandIcon]="expand"
          (submenuTriggerClick)="last = 'opened ' + $event.key"
          (itemClick)="last = 'clicked ' + $event.keyPath.join(' < ')"
          [items]="[
            { key: 'new', label: 'New document' },
            { key: 'templates', label: 'From template', children: [
              { key: 'invoice', label: 'Invoice' },
              { key: 'quote', label: 'Quote' },
            ] },
            { key: 'import', label: 'Import (offset 8, 8)', popupOffset: [8, 8], children: [
              { key: 'csv', label: 'CSV' },
              { key: 'xlsx', label: 'Excel' },
            ] },
          ]"
        >
          <andes-button andesDropdownMenuTrigger variant="outline">Create</andes-button>
        </andes-dropdown-menu>
      </div>
    `,
  }),
};

/** `AndesDropdownButton` sizes, `loading` (with `loadingDelay`/`loadingIcon`), a custom caret `icon` and `trigger="hover"`. */
export const DropdownButtonStates: Story = {
  render: () => ({
    moduleMetadata: {
      imports: [NgIcon, AndesDropdownButton],
      providers: [ICONS],
    },
    props: {
      loading: false,
      items: [
        { key: 'draft', label: 'Save as draft' },
        { key: 'template', label: 'Save as template' },
      ],
    },
    template: `
      <ng-template #moreIcon><ng-icon name="lucidePlus" /></ng-template>
      <ng-template #dots><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" style="display: block; width: 1em; height: 1em;"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg></ng-template>
      <div style="display: grid; gap: 1rem; justify-items: start;">
        <div style="display: flex; gap: 1rem; align-items: center;">
          <andes-dropdown-button size="sm" [items]="items">Small</andes-dropdown-button>
          <andes-dropdown-button [items]="items">Medium</andes-dropdown-button>
          <andes-dropdown-button size="lg" [items]="items">Large</andes-dropdown-button>
        </div>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <andes-dropdown-button
            variant="primary"
            [loading]="loading"
            [items]="items"
            (buttonClick)="loading = !loading"
          >
            {{ loading ? 'Saving… (click to stop)' : 'Save (click me)' }}
          </andes-dropdown-button>
          <andes-dropdown-button loading [loadingDelay]="1000" [items]="items">Spinner after 1s</andes-dropdown-button>
          <andes-dropdown-button loading [loadingIcon]="dots" [items]="items">Custom loading icon</andes-dropdown-button>
          <andes-dropdown-button [icon]="moreIcon" trigger="hover" [items]="items">Hover, custom caret</andes-dropdown-button>
        </div>
      </div>
    `,
  }),
};
