import { NgIcon } from '@ng-icons/core';
import type { Meta, StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesDropdownMenu } from './dropdown-menu';
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
