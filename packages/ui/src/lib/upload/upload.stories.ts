import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';

import { AndesButton } from '../button/button';
import { AndesUpload, AndesUploadDragger } from './upload';
import { andesUploadMaxFiles, andesUploadSettled } from './upload-forms';
import { formatFileSize } from './upload-files';
import type {
  AndesUploadFile,
  AndesUploadRejection,
  AndesUploadRequest,
} from './upload-types';

/**
 * A stand-in transport so the stories need no server: it reports progress on a timer and
 * fails for any file whose name contains "fail".
 */
const simulatedUpload: AndesUploadRequest = (options) => {
  let percent = 0;
  const timer = setInterval(() => {
    percent = Math.min(100, percent + 10 + Math.round(Math.random() * 15));
    options.onProgress(percent);
    if (percent >= 100) {
      clearInterval(timer);
      if (options.file instanceof File && /fail/i.test(options.file.name)) {
        options.onError(new Error('The server refused this file'));
      } else {
        options.onSuccess({ id: Math.round(Math.random() * 1e6) });
      }
    }
  }, 250);
  return { abort: () => clearInterval(timer) };
};

function picture(label: string, colour: string): string {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="${colour}"/><text x="48" y="56" font-size="28" text-anchor="middle" fill="#fff" font-family="sans-serif">${label}</text></svg>`,
    )
  );
}

const EXISTING: AndesUploadFile[] = [
  {
    uid: 'e1',
    name: 'contract-2026.pdf',
    size: 482_304,
    status: 'done',
    url: 'https://files.example/contract-2026.pdf',
    type: 'application/pdf',
  },
  {
    uid: 'e2',
    name: 'site-photo.png',
    size: 1_204_224,
    status: 'done',
    url: picture('IMG', '#2563eb'),
    type: 'image/png',
  },
  {
    uid: 'e3',
    name: 'budget.xlsx',
    size: 88_064,
    status: 'error',
    errorMessage: 'The file is password protected',
  },
];

const meta: Meta<AndesUpload> = {
  title: 'Upload',
  component: AndesUpload,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [AndesUpload, AndesUploadDragger, AndesButton] }),
  ],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'File upload control. Project the trigger as content; the real, visually hidden file input stays focusable behind it, so keyboard and screen reader users get a labelled "choose files" control (Enter or Space opens the dialog). Files are checked against `accept`, `maxSize` and `maxCount`, pass through `beforeUpload`, and are sent with the built-in multipart transport (`action`, `method`, `headers`, `data`, `withCredentials`, `name`) or your own `customRequest`. The `fileList` model (also the form value) holds each file with its status (`ready`, `uploading`, `done`, `error`), percent, response and URLs. `changed`, `preview`, `download`, `remove`, `dropped` and `rejected` report what happens. The stories upload to a simulated transport.',
      },
    },
  },
  argTypes: {
    listType: {
      control: 'inline-radio',
      options: ['text', 'picture', 'picture-card', 'picture-circle'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    accept: { control: 'text' },
    multiple: { control: 'boolean' },
    directory: { control: 'boolean' },
    maxCount: { control: 'number' },
    maxSize: { control: 'number' },
    disabled: { control: 'boolean' },
    autoUpload: { control: 'boolean' },
    allowPaste: { control: 'boolean' },
  },
  args: {
    listType: 'text',
    size: 'md',
    multiple: true,
    directory: false,
    disabled: false,
    autoUpload: true,
    allowPaste: true,
  },
  render: (args) => ({
    props: { ...args, request: simulatedUpload },
    template: `<div style="max-width: 28rem;">
      <andes-upload
        [listType]="listType" [size]="size" [accept]="accept" [multiple]="multiple" [directory]="directory"
        [maxCount]="maxCount" [maxSize]="maxSize" [disabled]="disabled" [autoUpload]="autoUpload"
        [allowPaste]="allowPaste" [customRequest]="request" aria-label="Attachments">
        <andes-button variant="outline" [disabled]="disabled">Select files</andes-button>
      </andes-upload>
    </div>`,
  }),
};

export default meta;

type Story = StoryObj<AndesUpload>;

export const Default: Story = {};

export const Dragger: Story = {
  parameters: {
    docs: {
      description: {
        story:
          '`andes-upload-dragger` turns the trigger into a drop area with an icon, a title and a hint, highlighted while files are dragged over it. Click it, tab to it and press Enter, drop files, or paste them. `dropIcon`, `dropTitle` and `dropHint` customise the content.',
      },
    },
  },
  render: () => ({
    props: { request: simulatedUpload },
    template: `<div style="max-width: 32rem;">
      <andes-upload-dragger [multiple]="true" [customRequest]="request" dropHint="PDF or images, up to 5 MB each" accept=".pdf,image/*" [maxSize]="5242880" aria-label="Supporting documents" />
    </div>`,
  }),
};

export const DraggerFolders: Story = {
  name: 'Dragger with folders',
  parameters: {
    docs: {
      description: {
        story:
          'With `directory`, the picker chooses a folder and a dropped folder is walked: every file inside is added, with its relative path on `webkitRelativePath`.',
      },
    },
  },
  render: () => ({
    props: { request: simulatedUpload },
    template: `<div style="max-width: 32rem;">
      <andes-upload-dragger [directory]="true" [customRequest]="request" dropTitle="Drop a folder here, or click to choose one" dropHint="Every file in the folder is uploaded" aria-label="Folder" />
    </div>`,
  }),
};

export const DraggerDisabled: Story = {
  render: () => ({
    template: `<div style="max-width: 32rem;"><andes-upload-dragger [disabled]="true" dropHint="Uploads are closed for this order" aria-label="Documents (closed)" /></div>`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    props: { request: simulatedUpload },
    template: `<div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
      <andes-upload size="sm" [customRequest]="request" aria-label="Small"><andes-button size="sm" variant="outline">Small</andes-button></andes-upload>
      <andes-upload size="md" [customRequest]="request" aria-label="Medium"><andes-button variant="outline">Medium</andes-button></andes-upload>
      <andes-upload size="lg" [customRequest]="request" aria-label="Large"><andes-button size="lg" variant="outline">Large</andes-button></andes-upload>
      <andes-upload [customRequest]="request" aria-label="Default trigger"></andes-upload>
    </div>`,
  }),
};

@Component({
  selector: 'andes-story-upload-limits',
  imports: [AndesUpload, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: grid; gap: 0.75rem; max-width: 28rem;">
      <andes-upload
        accept=".pdf,.png,.jpg"
        [maxSize]="1048576"
        [maxCount]="3"
        [multiple]="true"
        [customRequest]="request"
        (rejected)="rejections.set($event)"
        aria-label="Documents"
      >
        <andes-button variant="outline">Select up to 3 files</andes-button>
      </andes-upload>
      <p
        style="margin: 0; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground);"
      >
        PDF, PNG or JPG, at most 1 MB each. Rejected files are announced to
        assistive technology and listed here through <code>rejected</code>.
      </p>
      @for (item of rejections(); track $index) {
        <p
          style="margin: 0; color: var(--andes-color-danger-text, var(--andes-color-danger));"
        >
          {{ item.file.name }} ({{ size(item.file.size) }}): {{ item.reason }}
        </p>
      }
    </div>
  `,
})
class LimitsDemo {
  protected readonly request = simulatedUpload;
  protected readonly rejections = signal<AndesUploadRejection[]>([]);
  protected size(bytes: number): string {
    return formatFileSize(bytes);
  }
}

export const Limits: Story = {
  name: 'Type, size and count limits',
  parameters: {
    docs: {
      description: {
        story:
          '`accept`, `maxSize` and `maxCount` are enforced for chosen, dropped and pasted files alike. The same checks are exported as pure functions (`isFileAccepted`, `isFileSizeValid`, `validateUploadFile`, `formatFileSize`) for use in your own forms and tests.',
      },
    },
  },
  decorators: [moduleMetadata({ imports: [LimitsDemo] })],
  render: () => ({ template: `<andes-story-upload-limits />` }),
};

export const SingleFile: Story = {
  name: 'Single file (replaces)',
  parameters: {
    docs: {
      description: {
        story:
          'With `maxCount` 1 a new file replaces the current one; the replaced upload is cancelled.',
      },
    },
  },
  render: () => ({
    props: { request: simulatedUpload },
    template: `<andes-upload [maxCount]="1" [customRequest]="request" aria-label="Signed contract"><andes-button variant="outline">Upload signed contract</andes-button></andes-upload>`,
  }),
};

export const ExistingFiles: Story = {
  name: 'Existing files, preview and download',
  parameters: {
    docs: {
      description: {
        story:
          'Files that are already on the server come in through `fileList` with a `url`. The name links to the file, the preview action emits `preview` (call `preventDefault()` to show your own viewer instead of opening the URL) and the download action emits `download`. A failed entry shows its `errorMessage` and, with the original file, a retry action.',
      },
    },
  },
  render: () => ({
    props: { files: EXISTING.map((f) => ({ ...f })) },
    template: `<div style="max-width: 32rem;">
      <andes-upload [(fileList)]="files" [showUploadList]="{ showDownloadIcon: true }" aria-label="Attachments">
        <andes-button variant="outline">Add attachment</andes-button>
      </andes-upload>
    </div>`,
  }),
};

export const Picture: Story = {
  name: 'Picture list',
  render: () => ({
    props: {
      files: EXISTING.slice(0, 2).map((f) => ({ ...f })),
      request: simulatedUpload,
    },
    template: `<div style="max-width: 32rem;">
      <andes-upload listType="picture" accept="image/*" [multiple]="true" [(fileList)]="files" [customRequest]="request" aria-label="Photos">
        <andes-button variant="outline">Upload photos</andes-button>
      </andes-upload>
    </div>`,
  }),
};

export const PictureCard: Story = {
  name: 'Picture cards',
  parameters: {
    docs: {
      description: {
        story:
          'Thumbnails are made from the chosen file with object URLs that are revoked when the file leaves the list or the control is destroyed. Actions appear on hover and on keyboard focus.',
      },
    },
  },
  render: () => ({
    props: {
      files: EXISTING.slice(0, 2).map((f) => ({ ...f })),
      request: simulatedUpload,
    },
    template: `<andes-upload listType="picture-card" accept="image/*" [multiple]="true" [maxCount]="6" [(fileList)]="files" [customRequest]="request" aria-label="Gallery">
      <span style="font-size: 0.75rem; line-height: 1.25rem;">+ Upload</span>
    </andes-upload>`,
  }),
};

export const PictureCircle: Story = {
  name: 'Avatar (circle)',
  render: () => ({
    props: { request: simulatedUpload },
    template: `<andes-upload listType="picture-circle" accept="image/*" [maxCount]="1" [customRequest]="request" aria-label="Profile photo">
      <span style="font-size: 0.75rem; line-height: 1.25rem;">+ Photo</span>
    </andes-upload>`,
  }),
};

@Component({
  selector: 'andes-story-upload-manual',
  imports: [AndesUpload, AndesButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      style="display: grid; gap: 0.75rem; max-width: 28rem; justify-items: start;"
    >
      <andes-upload
        #upload
        [autoUpload]="false"
        [multiple]="true"
        [customRequest]="request"
        aria-label="Import files"
      >
        <andes-button variant="outline">Choose files</andes-button>
      </andes-upload>
      <andes-button (click)="upload.submit()"
        >Upload selected files</andes-button
      >
    </div>
  `,
})
class ManualDemo {
  protected readonly request = simulatedUpload;
}

export const Manual: Story = {
  name: 'Manual upload',
  parameters: {
    docs: {
      description: {
        story:
          'With `autoUpload` off, files wait in the list as `ready`; `submit()` sends them. Handy when the upload is part of saving a form.',
      },
    },
  },
  decorators: [moduleMetadata({ imports: [ManualDemo] })],
  render: () => ({ template: `<andes-story-upload-manual />` }),
};

export const Hooks: Story = {
  name: 'beforeUpload and beforeRemove',
  parameters: {
    docs: {
      description: {
        story:
          '`beforeUpload` runs per file, synchronously or as a promise: return `false` (or reject) to skip the file, or return a different `File` / `Blob` to send that instead (here an image is "compressed" by renaming it). `beforeRemove` can veto a removal, e.g. behind a confirmation.',
      },
    },
  },
  render: () => ({
    props: {
      request: simulatedUpload,
      before: async (file: File) => {
        if (file.name.startsWith('draft')) {
          return false;
        }
        return new File([file], `optimised-${file.name}`, { type: file.type });
      },
      beforeRemove: () =>
        globalThis.confirm('Remove this file from the order?'),
    },
    template: `<div style="max-width: 28rem;">
      <andes-upload [multiple]="true" [customRequest]="request" [beforeUpload]="before" [beforeRemove]="beforeRemove" aria-label="Order files">
        <andes-button variant="outline">Select files (names starting with "draft" are skipped)</andes-button>
      </andes-upload>
    </div>`,
  }),
};

export const Progress: Story = {
  name: 'Progress and errors',
  parameters: {
    docs: {
      description: {
        story:
          'A 4px progress track under each uploading file. Name a file "fail" to see the error state: the message, a retry action and removal. Status changes are announced through a polite live region.',
      },
    },
  },
  render: () => ({
    props: { request: simulatedUpload },
    template: `<div style="max-width: 28rem;">
      <andes-upload [multiple]="true" [customRequest]="request" aria-label="Files">
        <andes-button variant="outline">Select files</andes-button>
      </andes-upload>
    </div>`,
  }),
};

export const CustomRows: Story = {
  name: 'Custom item and icon',
  parameters: {
    docs: {
      description: {
        story:
          '`itemRender` replaces a whole row (the context carries the file and `preview()`, `download()`, `remove()`, `retry()`); `iconRender` replaces only the leading icon.',
      },
    },
  },
  render: () => ({
    props: { files: EXISTING.slice(0, 2).map((f) => ({ ...f })) },
    template: `<div style="max-width: 28rem;">
      <andes-upload [(fileList)]="files" [iconRender]="icon" aria-label="Attachments">
        <andes-button variant="outline">Add</andes-button>
      </andes-upload>
      <ng-template #icon let-file><strong aria-hidden="true">{{ file.name.slice(-3).toUpperCase() }}</strong></ng-template>
    </div>
    <div style="max-width: 28rem; margin-top: 1rem;">
      <andes-upload [(fileList)]="files" [itemRender]="row" aria-label="Attachments (custom rows)">
        <andes-button variant="outline">Add</andes-button>
      </andes-upload>
      <ng-template #row let-file let-remove="remove">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; border: 1px solid var(--andes-color-border); border-radius: var(--andes-radius-md);">
          <span>{{ file.name }}</span>
          <andes-button size="sm" variant="ghost" (click)="remove()">Delete</andes-button>
        </div>
      </ng-template>
    </div>`,
  }),
};

export const Disabled: Story = {
  render: () => ({
    props: { files: EXISTING.slice(0, 2).map((f) => ({ ...f })) },
    template: `<div style="max-width: 28rem;">
      <andes-upload [disabled]="true" [(fileList)]="files" aria-label="Attachments (locked)">
        <andes-button variant="outline" [disabled]="true">Select files</andes-button>
      </andes-upload>
    </div>`,
  }),
};

@Component({
  selector: 'andes-story-upload-form',
  imports: [AndesUpload, AndesButton, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      style="display: grid; gap: 0.5rem; max-width: 28rem;"
      (ngSubmit)="submitted.set(true)"
    >
      <span id="docs-label" style="font-weight: 500;"
        >Supporting documents</span
      >
      <andes-upload
        [formControl]="documents"
        [multiple]="true"
        [customRequest]="request"
        [aria-invalid]="documents.invalid && documents.touched"
        aria-labelledby="docs-label"
        aria-describedby="docs-help"
      >
        <andes-button variant="outline">Select files</andes-button>
      </andes-upload>
      <p
        id="docs-help"
        style="margin: 0; font-size: 0.75rem; line-height: 1.25rem; color: var(--andes-color-muted-foreground);"
      >
        Required. At most 3 files; wait for every upload to finish.
      </p>
      @if (documents.touched && documents.errors; as errors) {
        <p
          role="alert"
          style="margin: 0; color: var(--andes-color-danger-text, var(--andes-color-danger));"
        >
          @if (errors['required']) {
            Add at least one file.
          }
          @if (errors['uploadPending']) {
            Wait for the uploads to finish.
          }
          @if (errors['uploadFailed']) {
            Remove or retry the failed file.
          }
          @if (errors['uploadMaxFiles']) {
            Too many files.
          }
        </p>
      }
      <div>
        <andes-button type="submit" [disabled]="documents.invalid"
          >Save order</andes-button
        >
      </div>
      @if (submitted()) {
        <p style="margin: 0;">Saved {{ documents.value?.length }} file(s).</p>
      }
    </form>
  `,
})
class FormDemo {
  protected readonly request = simulatedUpload;
  protected readonly submitted = signal(false);
  protected readonly documents = new FormControl<AndesUploadFile[]>([], {
    validators: [
      Validators.required,
      andesUploadSettled(),
      andesUploadMaxFiles(3),
    ],
  });
}

export const WithForms: Story = {
  name: 'In a form',
  parameters: {
    docs: {
      description: {
        story:
          'The value is the file list, so `formControl`, `formControlName` and `ngModel` work. `andesUploadSettled()` keeps the form invalid while a file is uploading or failed, `andesUploadMaxFiles(n)` limits the count, and the usual `aria-*` and `id` inputs reach the file input so a label and a field wrapper can name it.',
      },
    },
  },
  decorators: [moduleMetadata({ imports: [FormDemo] })],
  render: () => ({ template: `<andes-story-upload-form />` }),
};
