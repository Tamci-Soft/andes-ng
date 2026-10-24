import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { AndesUpload, AndesUploadDragger } from './upload';
import { andesUploadMaxFiles, andesUploadSettled } from './upload-forms';
import {
  AndesUploadItemEvent,
  type AndesUploadBeforeRemove,
  type AndesUploadBeforeUpload,
  type AndesUploadChangeEvent,
  type AndesUploadFile,
  type AndesUploadListOptions,
  type AndesUploadListType,
  type AndesUploadMessages,
  type AndesUploadRejection,
  type AndesUploadRequest,
  type AndesUploadRequestOptions,
} from './upload-types';

/* ---------------------------------------------------------------- test hosts */

@Component({
  imports: [AndesUpload],
  template: `<andes-upload
      #upload
      [(fileList)]="files"
      [action]="action()"
      [method]="method()"
      [headers]="headers()"
      [data]="data()"
      [name]="fieldName()"
      [customRequest]="customRequest()"
      [autoUpload]="autoUpload()"
      [accept]="accept()"
      [multiple]="multiple()"
      [directory]="directory()"
      [maxCount]="maxCount()"
      [maxSize]="maxSize()"
      [disabled]="disabled()"
      [allowPaste]="allowPaste()"
      [openFileDialogOnClick]="openOnClick()"
      [beforeUpload]="beforeUpload()"
      [beforeRemove]="beforeRemove()"
      [listType]="listType()"
      [showUploadList]="showList()"
      [itemRender]="custom() ? itemTpl : undefined"
      [iconRender]="custom() ? iconTpl : undefined"
      [previewFile]="previewFile()"
      [messages]="messages()"
      [id]="id()"
      [aria-label]="ariaLabel()"
      [aria-labelledby]="labelledBy()"
      [aria-describedby]="describedBy()"
      [aria-invalid]="invalid()"
      (changed)="changes.push($event)"
      (preview)="onPreview($event)"
      (download)="onDownload($event)"
      (remove)="removed.push($event)"
      (rejected)="rejections.push($event)"
    >
      @if (withContent()) {
        <button type="button" class="trigger">Choose files</button>
      }
    </andes-upload>
    <ng-template #itemTpl let-file let-remove="remove">
      <span class="custom-item">{{ file.name }}</span>
      <button type="button" class="custom-remove" (click)="remove()">x</button>
    </ng-template>
    <ng-template #iconTpl let-file>
      <i class="custom-icon">{{ file.name.length }}</i>
    </ng-template>`,
})
class HostComponent {
  readonly upload = viewChild.required<AndesUpload>('upload');
  readonly files = signal<AndesUploadFile[]>([]);
  readonly action = signal<
    string | ((f: AndesUploadFile) => string | Promise<string>) | undefined
  >('/api/files');
  readonly method = signal('POST');
  readonly headers = signal<Record<string, string>>({});
  readonly data = signal<
    | Record<string, unknown>
    | ((f: AndesUploadFile) => Record<string, unknown>)
    | undefined
  >(undefined);
  readonly fieldName = signal('file');
  readonly customRequest = signal<AndesUploadRequest | undefined>(undefined);
  readonly autoUpload = signal(true);
  readonly accept = signal<string | undefined>(undefined);
  readonly multiple = signal(true);
  readonly directory = signal(false);
  readonly maxCount = signal<number | undefined>(undefined);
  readonly maxSize = signal<number | undefined>(undefined);
  readonly disabled = signal(false);
  readonly allowPaste = signal(true);
  readonly openOnClick = signal(true);
  readonly beforeUpload = signal<AndesUploadBeforeUpload | undefined>(
    undefined,
  );
  readonly beforeRemove = signal<AndesUploadBeforeRemove | undefined>(
    undefined,
  );
  readonly listType = signal<AndesUploadListType>('text');
  readonly showList = signal<boolean | AndesUploadListOptions>(true);
  readonly custom = signal(false);
  readonly previewFile = signal<
    ((f: File | Blob) => Promise<string>) | undefined
  >(undefined);
  readonly messages = signal<Partial<AndesUploadMessages> | undefined>(
    undefined,
  );
  readonly id = signal<string | undefined>(undefined);
  readonly ariaLabel = signal<string | undefined>(undefined);
  readonly labelledBy = signal<string | undefined>(undefined);
  readonly describedBy = signal<string | undefined>(undefined);
  readonly invalid = signal(false);
  readonly withContent = signal(true);

  changes: AndesUploadChangeEvent[] = [];
  removed: AndesUploadFile[] = [];
  rejections: AndesUploadRejection[][] = [];
  previews: AndesUploadItemEvent[] = [];
  downloads: AndesUploadItemEvent[] = [];
  preventPreview = false;
  preventDownload = false;

  onPreview(event: AndesUploadItemEvent): void {
    this.previews.push(event);
    if (this.preventPreview) {
      event.preventDefault();
    }
  }

  onDownload(event: AndesUploadItemEvent): void {
    this.downloads.push(event);
    if (this.preventDownload) {
      event.preventDefault();
    }
  }
}

@Component({
  imports: [AndesUploadDragger],
  template: `<div (drop)="nativeDrops = nativeDrops + 1">
    <andes-upload-dragger
      #dragger
      action="/api/files"
      [multiple]="true"
      [disabled]="disabled()"
      [dropTitle]="title()"
      [dropHint]="hint()"
      (dropped)="drops.push($event)"
      (rejected)="rejections.push($event)"
    />
  </div>`,
})
class DraggerHost {
  readonly dragger = viewChild.required<AndesUploadDragger>('dragger');
  readonly disabled = signal(false);
  readonly title = signal<string | undefined>(undefined);
  readonly hint = signal<string | undefined>(undefined);
  drops: DragEvent[] = [];
  rejections: AndesUploadRejection[][] = [];
  nativeDrops = 0;
}

@Component({
  imports: [AndesUpload, ReactiveFormsModule],
  template: `<andes-upload
    [formControl]="control"
    [customRequest]="request"
    [multiple]="true"
    ><button type="button">Choose</button></andes-upload
  >`,
})
class FormHost {
  readonly control = new FormControl<AndesUploadFile[]>([], {
    validators: [
      Validators.required,
      andesUploadSettled(),
      andesUploadMaxFiles(2),
    ],
  });
  readonly upload = viewChild.required(AndesUpload);
  options: AndesUploadRequestOptions[] = [];
  readonly request: AndesUploadRequest = (options) => {
    this.options.push(options);
  };
}

/* ------------------------------------------------------------------- helpers */

const png = (name = 'photo.png', size = 100) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' });
const pdf = (name = 'invoice.pdf', size = 100) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf' });

let active: { detectChanges(): void; nativeElement: HTMLElement };

/** Applies pending input changes, then simulates choosing files in the picker. */
function pick(files: File[]) {
  active.detectChanges();
  choose(
    active.nativeElement.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement,
    files,
  );
}

function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  active = fixture;
  const host = fixture.componentInstance;
  const requests: AndesUploadRequestOptions[] = [];
  const aborted: string[] = [];
  host.customRequest.set((options) => {
    requests.push(options);
    return { abort: () => aborted.push(options.uploadFile.uid) };
  });
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host,
    root,
    requests,
    aborted,
    upload: host.upload(),
    el: root.querySelector('andes-upload') as HTMLElement,
    input: () => root.querySelector('input[type="file"]') as HTMLInputElement,
    items: () =>
      Array.from(root.querySelectorAll<HTMLElement>('.andes-upload__item')),
    live: () =>
      root
        .querySelector('[role="status"]')
        ?.textContent?.replace(/\u00a0/g, '')
        .trim(),
    flush: async () => {
      await new Promise((resolve) => setTimeout(resolve));
      fixture.detectChanges();
    },
  };
}

function choose(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function dragEvent(
  type: string,
  files: File[] = [],
  types: string[] = ['Files'],
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: { types, files, dropEffect: 'none' },
  });
  return event;
}

describe('AndesUpload', () => {
  let created: string[];
  let revoked: string[];

  beforeEach(() => {
    created = [];
    revoked = [];
    let counter = 0;
    Object.assign(URL, {
      createObjectURL: vi.fn(() => {
        const url = `blob:mock-${++counter}`;
        created.push(url);
        return url;
      }),
      revokeObjectURL: vi.fn((url: string) => revoked.push(url)),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('file input and trigger', () => {
    it('keeps a real, focusable, named file input behind the trigger', () => {
      const { input, host, fixture } = setup();
      host.accept.set('.png,.pdf');
      fixture.detectChanges();

      const el = input();
      expect(el.type).toBe('file');
      expect(el.getAttribute('aria-label')).toBe('Select files');
      expect(el.getAttribute('name')).toBe('file');
      expect(el.getAttribute('accept')).toBe('.png,.pdf');
      expect(el.multiple).toBe(true);
      expect(el.disabled).toBe(false);
      expect(el.getAttribute('tabindex')).toBeNull();
      expect(el.hidden).toBe(false);
    });

    it('forwards id and aria attributes to the input, not the host', () => {
      const { input, host, fixture, el } = setup();
      host.id.set('attachments');
      host.ariaLabel.set('Attachments');
      host.describedBy.set('help');
      host.invalid.set(true);
      fixture.detectChanges();

      expect(input().id).toBe('attachments');
      expect(input().getAttribute('aria-label')).toBe('Attachments');
      expect(input().getAttribute('aria-describedby')).toBe('help');
      expect(input().getAttribute('aria-invalid')).toBe('true');
      for (const attribute of [
        'id',
        'aria-label',
        'aria-describedby',
        'aria-invalid',
        'name',
      ]) {
        expect(el.getAttribute(attribute)).toBeNull();
      }

      host.labelledBy.set('label-1');
      fixture.detectChanges();
      expect(input().getAttribute('aria-labelledby')).toBe('label-1');
      expect(input().getAttribute('aria-label')).toBeNull();
    });

    it('opens the dialog when the projected trigger is clicked', () => {
      const { root, input } = setup();
      const click = vi.spyOn(input(), 'click');
      (root.querySelector('.trigger') as HTMLElement).click();
      expect(click).toHaveBeenCalledTimes(1);
    });

    it('does not reopen the dialog from the input\u2019s own click', () => {
      const { input } = setup();
      const click = vi.spyOn(input(), 'click');
      input().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(click).not.toHaveBeenCalled();
    });

    it('stays shut when disabled or when only open() may start a selection', () => {
      const { root, input, host, fixture, upload } = setup();
      const click = vi.spyOn(input(), 'click');
      host.disabled.set(true);
      fixture.detectChanges();
      (root.querySelector('.trigger') as HTMLElement).click();
      expect(click).not.toHaveBeenCalled();
      expect(input().disabled).toBe(true);
      expect(
        root
          .querySelector('.andes-upload__select')
          ?.hasAttribute('data-disabled'),
      ).toBe(true);

      host.disabled.set(false);
      host.openOnClick.set(false);
      fixture.detectChanges();
      (root.querySelector('.trigger') as HTMLElement).click();
      expect(click).not.toHaveBeenCalled();
      upload.open();
      expect(click).toHaveBeenCalledTimes(1);
    });

    it('leaves the file input as the only tab stop', () => {
      const { root } = setup();
      expect(
        (root.querySelector('.trigger') as HTMLElement).getAttribute(
          'tabindex',
        ),
      ).toBe('-1');
    });

    it('moves focus to the input with focus()', () => {
      const { upload, input } = setup();
      upload.focus();
      expect(document.activeElement).toBe(input());
    });

    it('draws a default trigger when nothing is projected', async () => {
      const { root, host, fixture, flush } = setup();
      expect(root.querySelector('.andes-upload__default')).toBeNull();
      host.withContent.set(false);
      fixture.detectChanges();
      // The slot is watched with a MutationObserver, which reports on a microtask.
      await flush();
      expect(
        root.querySelector('.andes-upload__default')?.textContent,
      ).toContain('Select files');
    });

    it('turns the input into a folder picker with `directory`', () => {
      const { input, host, fixture } = setup();
      host.directory.set(true);
      fixture.detectChanges();
      expect(input().hasAttribute('webkitdirectory')).toBe(true);
      expect(input().multiple).toBe(true);
    });

    it('lets the user choose the same file twice', () => {
      const { input } = setup();
      const el = input();
      Object.defineProperty(el, 'value', {
        value: 'C:/x.pdf',
        writable: true,
        configurable: true,
      });
      choose(el, [pdf()]);
      expect(el.value).toBe('');
    });
  });

  describe('adding files', () => {
    it('adds a chosen file and starts uploading it with the resolved options', async () => {
      const { host, requests, items, flush } = setup();
      host.method.set('PUT');
      host.headers.set({ Authorization: 'Bearer t' });
      host.data.set({ orderId: 7 });
      host.fieldName.set('document');
      pick([pdf('invoice.pdf', 2048)]);
      await flush();

      const [file] = host.files();
      expect(file).toMatchObject({
        name: 'invoice.pdf',
        size: 2048,
        type: 'application/pdf',
        status: 'uploading',
        percent: 0,
      });
      expect(file.uid).toMatch(/^andes-upload-/);
      expect(file.originFileObj).toBeInstanceOf(File);
      expect(items()).toHaveLength(1);
      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({
        action: '/api/files',
        method: 'PUT',
        headers: { Authorization: 'Bearer t' },
        data: { orderId: 7 },
        filename: 'document',
        withCredentials: false,
      });
      expect(host.changes.at(0)?.file.uid).toBe(file.uid);
    });

    it('resolves `action` and `data` functions per file', async () => {
      const { host, requests, flush } = setup();
      host.action.set(async (f) => `/files/${f.name}`);
      host.data.set((f) => ({ label: f.name.toUpperCase() }));
      pick([pdf('a.pdf')]);
      await flush();
      expect(requests[0].action).toBe('/files/a.pdf');
      expect(requests[0].data).toEqual({ label: 'A.PDF' });
    });

    it('marks the file failed when there is nothing to send it with', async () => {
      const { host, flush, live } = setup();
      host.customRequest.set(undefined);
      host.action.set(undefined);
      pick([pdf('a.pdf')]);
      await flush();
      expect(host.files()[0].status).toBe('error');
      expect(live()).toContain('could not be uploaded');
    });

    it('rejects files that break `accept`, announcing why', async () => {
      const { host, fixture, flush, live } = setup();
      host.accept.set('.pdf');
      fixture.detectChanges();
      pick([png('a.png'), pdf('b.pdf')]);
      await flush();

      expect(host.files().map((f) => f.name)).toEqual(['b.pdf']);
      expect(host.rejections[0]).toEqual([
        { file: expect.objectContaining({ name: 'a.png' }), reason: 'accept' },
      ]);
      expect(live()).toBe('a.png was not added: this file type is not allowed');
    });

    it('rejects files over `maxSize`', async () => {
      const { host, fixture, flush, live } = setup();
      host.maxSize.set(1024 * 1024);
      fixture.detectChanges();
      pick([pdf('big.pdf', 2 * 1024 * 1024), pdf('ok.pdf', 10)]);
      await flush();

      expect(host.files().map((f) => f.name)).toEqual(['ok.pdf']);
      expect(host.rejections[0][0].reason).toBe('size');
      expect(live()).toContain('larger than 1 MB');
    });

    it('takes only the first file when `multiple` is off', async () => {
      const { host, fixture, flush } = setup();
      host.multiple.set(false);
      fixture.detectChanges();
      pick([pdf('a.pdf'), pdf('b.pdf')]);
      await flush();
      expect(host.files().map((f) => f.name)).toEqual(['a.pdf']);
      expect(host.rejections[0][0]).toMatchObject({ reason: 'count' });
    });

    it('trims to `maxCount` and blocks the input once full', async () => {
      const { input, host, fixture, flush } = setup();
      host.maxCount.set(2);
      fixture.detectChanges();
      pick([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')]);
      await flush();

      expect(host.files().map((f) => f.name)).toEqual(['a.pdf', 'b.pdf']);
      expect(host.rejections[0][0]).toMatchObject({ reason: 'count' });
      expect(input().disabled).toBe(true);
    });

    it('replaces the current file when `maxCount` is 1', async () => {
      const { input, host, fixture, flush, aborted } = setup();
      host.maxCount.set(1);
      fixture.detectChanges();
      pick([pdf('first.pdf')]);
      await flush();
      const first = host.files()[0];
      pick([pdf('second.pdf')]);
      await flush();

      expect(host.files().map((f) => f.name)).toEqual(['second.pdf']);
      expect(host.removed.map((f) => f.uid)).toEqual([first.uid]);
      expect(host.removed[0].status).toBe('removed');
      expect(aborted).toEqual([first.uid]);
      expect(input().disabled).toBe(false);
    });

    it('adds files programmatically', async () => {
      const { upload, host, flush } = setup();
      await upload.addFiles([pdf('a.pdf')]);
      await flush();
      expect(host.files()).toHaveLength(1);
    });
  });

  describe('beforeUpload', () => {
    it('skips files it vetoes, with false, null or a rejected promise', async () => {
      const { host, flush } = setup();
      host.beforeUpload.set((file) => {
        if (file.name === 'a.pdf') return false;
        if (file.name === 'b.pdf') return null;
        if (file.name === 'c.pdf') return Promise.reject(new Error('no'));
        return true;
      });
      pick([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf'), pdf('d.pdf')]);
      await flush();

      expect(host.files().map((f) => f.name)).toEqual(['d.pdf']);
      expect(host.rejections[0].map((r) => r.reason)).toEqual([
        'before-upload',
        'before-upload',
        'before-upload',
      ]);
    });

    it('sends the blob it returns, keeping the original name', async () => {
      const { host, requests, flush } = setup();
      const compressed = new Blob([new Uint8Array(10)], { type: 'image/webp' });
      host.beforeUpload.set(async () => compressed);
      pick([png('photo.png', 500)]);
      await flush();

      expect(requests[0].file).toBe(compressed);
      expect(host.files()[0]).toMatchObject({
        name: 'photo.png',
        size: 10,
        type: 'image/webp',
      });
    });

    it('receives the whole batch', async () => {
      const { host, flush } = setup();
      const seen: string[][] = [];
      host.beforeUpload.set((_file, batch) => {
        seen.push(batch.map((f) => f.name));
        return true;
      });
      pick([pdf('a.pdf'), pdf('b.pdf')]);
      await flush();
      expect(seen).toEqual([
        ['a.pdf', 'b.pdf'],
        ['a.pdf', 'b.pdf'],
      ]);
    });
  });

  describe('upload lifecycle', () => {
    it('tracks progress, completion and the response', async () => {
      const { host, requests, flush, root, live } = setup();
      pick([pdf('a.pdf')]);
      await flush();

      requests[0].onProgress(40);
      await flush();
      expect(host.files()[0]).toMatchObject({
        status: 'uploading',
        percent: 40,
      });
      expect(host.changes.at(-1)?.event).toEqual({ percent: 40 });
      const bar = root.querySelector('[role="progressbar"]') as HTMLElement;
      expect(bar.getAttribute('aria-valuenow')).toBe('40');
      expect(bar.getAttribute('aria-label')).toBe('Uploading a.pdf');
      expect((bar.firstElementChild as HTMLElement).style.inlineSize).toBe(
        '40%',
      );

      requests[0].onSuccess({ id: 99 });
      await flush();
      expect(host.files()[0]).toMatchObject({
        status: 'done',
        percent: 100,
        response: { id: 99 },
      });
      expect(root.querySelector('[role="progressbar"]')).toBeNull();
      expect(live()).toBe('a.pdf uploaded');
    });

    it('shows a failure with a retry that sends the same file again', async () => {
      const { host, requests, flush, root, live } = setup();
      pick([pdf('a.pdf')]);
      await flush();
      requests[0].onError(new Error('Server said no'));
      await flush();

      expect(host.files()[0].status).toBe('error');
      expect(root.querySelector('.andes-upload__error')?.textContent).toBe(
        'Server said no',
      );
      expect(live()).toBe('a.pdf could not be uploaded');
      expect(
        root.querySelector('.andes-upload__item')?.getAttribute('data-status'),
      ).toBe('error');

      (
        root.querySelector(
          'button[aria-label="Retry uploading a.pdf"]',
        ) as HTMLButtonElement
      ).click();
      await flush();
      expect(requests).toHaveLength(2);
      expect(requests[1].file).toBe(requests[0].file);
      expect(host.files()[0]).toMatchObject({
        status: 'uploading',
        percent: 0,
      });
      expect(host.files()[0].error).toBeUndefined();
    });

    it('falls back to the generic failure text', async () => {
      const { requests, flush, root } = setup();
      pick([pdf('a.pdf')]);
      await flush();
      requests[0].onError('boom');
      await flush();
      expect(root.querySelector('.andes-upload__error')?.textContent).toBe(
        'Upload failed',
      );
    });

    it('ignores callbacks that arrive after the file was removed', async () => {
      const { host, requests, flush } = setup();
      pick([pdf('a.pdf')]);
      await flush();
      await host.upload().removeFile(host.files()[0]);
      requests[0].onSuccess({});
      requests[0].onProgress(90);
      expect(host.files()).toEqual([]);
    });

    it('accepts a transport that reports synchronously', async () => {
      const { host, flush } = setup();
      host.customRequest.set((options) => {
        options.onSuccess('done');
      });
      pick([pdf('a.pdf')]);
      await flush();
      expect(host.files()[0]).toMatchObject({
        status: 'done',
        response: 'done',
      });
    });

    it('accepts a transport that returns a bare abort function', async () => {
      const { host, flush } = setup();
      const abort = vi.fn();
      host.customRequest.set(() => abort);
      pick([pdf('a.pdf')]);
      await flush();
      await host.upload().removeFile(host.files()[0]);
      expect(abort).toHaveBeenCalledTimes(1);
    });

    it('turns a throwing transport into a failed file', async () => {
      const { host, flush } = setup();
      host.customRequest.set(() => {
        throw new Error('bad transport');
      });
      pick([pdf('a.pdf')]);
      await flush();
      expect(host.files()[0].status).toBe('error');
    });

    it('waits for submit() with autoUpload off', async () => {
      const { host, requests, flush, root } = setup();
      host.autoUpload.set(false);
      pick([pdf('a.pdf')]);
      await flush();
      expect(host.files()[0].status).toBe('ready');
      expect(requests).toHaveLength(0);
      expect(root.querySelector('.andes-upload__caption')?.textContent).toBe(
        'Ready to upload',
      );

      host.upload().submit();
      await flush();
      expect(requests).toHaveLength(1);
      expect(host.files()[0].status).toBe('uploading');
    });

    it('cancels a running upload with abortFile and keeps it as failed', async () => {
      const { host, flush, aborted } = setup();
      pick([pdf('a.pdf')]);
      await flush();
      const uid = host.files()[0].uid;
      host.upload().abortFile(uid);
      expect(aborted).toEqual([uid]);
      expect(host.files()[0].status).toBe('error');
    });

    it('goes through the built-in XMLHttpRequest transport when no custom one is set', async () => {
      const sent: { url: string; body: FormData }[] = [];
      class FakeXhr {
        upload = { onprogress: null as ((e: unknown) => void) | null };
        onload: (() => void) | null = null;
        status = 0;
        responseText = '';
        withCredentials = false;
        static last: FakeXhr;
        constructor() {
          FakeXhr.last = this;
        }
        open(_method: string, url: string) {
          sent.push({ url, body: new FormData() });
        }
        setRequestHeader() {
          // not needed
        }
        send(body: FormData) {
          sent[0].body = body;
        }
        abort() {
          // not needed
        }
      }
      vi.stubGlobal('XMLHttpRequest', FakeXhr);
      const instance = () => FakeXhr.last;
      const { host, flush } = setup();
      host.customRequest.set(undefined);
      pick([pdf('a.pdf')]);
      await flush();

      expect(sent[0].url).toBe('/api/files');
      expect((sent[0].body.get('file') as File).name).toBe('a.pdf');
      instance().upload.onprogress?.({
        lengthComputable: true,
        loaded: 1,
        total: 2,
      });
      await flush();
      expect(host.files()[0].percent).toBe(50);
      instance().status = 200;
      instance().responseText = '{"ok":true}';
      instance().onload?.();
      await flush();
      expect(host.files()[0]).toMatchObject({
        status: 'done',
        response: { ok: true },
      });
    });
  });

  describe('removal', () => {
    async function withFile() {
      const ctx = setup();
      pick([pdf('a.pdf')]);
      await ctx.flush();
      return ctx;
    }

    it('removes a file from its button, cancelling the request', async () => {
      const { host, root, flush, aborted, live } = await withFile();
      const uid = host.files()[0].uid;
      (
        root.querySelector(
          'button[aria-label="Remove a.pdf"]',
        ) as HTMLButtonElement
      ).click();
      await flush();

      expect(host.files()).toEqual([]);
      expect(aborted).toEqual([uid]);
      expect(host.removed[0]).toMatchObject({ uid, status: 'removed' });
      expect(host.changes.at(-1)?.file.status).toBe('removed');
      expect(host.changes.at(-1)?.fileList).toEqual([]);
      expect(live()).toBe('a.pdf removed');
    });

    it('keeps the file when beforeRemove vetoes, now or later', async () => {
      const { host, flush, fixture } = await withFile();
      host.beforeRemove.set(() => false);
      fixture.detectChanges();
      expect(await host.upload().removeFile(host.files()[0])).toBe(false);
      host.beforeRemove.set(async () => false);
      fixture.detectChanges();
      expect(await host.upload().removeFile(host.files()[0])).toBe(false);
      host.beforeRemove.set(() => Promise.reject(new Error('cancelled')));
      fixture.detectChanges();
      expect(await host.upload().removeFile(host.files()[0])).toBe(false);
      await flush();
      expect(host.files()).toHaveLength(1);
      expect(host.removed).toEqual([]);

      host.beforeRemove.set(async () => true);
      fixture.detectChanges();
      expect(await host.upload().removeFile(host.files()[0])).toBe(true);
      expect(host.files()).toEqual([]);
    });

    it('hides the actions that no longer apply while disabled', async () => {
      const { host, root, fixture } = await withFile();
      host.disabled.set(true);
      fixture.detectChanges();
      expect(
        root.querySelector('button[aria-label="Remove a.pdf"]'),
      ).toBeNull();
      expect(await host.upload().removeFile(host.files()[0])).toBe(false);
    });

    it('aborts requests when the control is destroyed', async () => {
      const { fixture, aborted, host } = await withFile();
      const uid = host.files()[0].uid;
      fixture.destroy();
      expect(aborted).toEqual([uid]);
    });
  });

  describe('list', () => {
    it('is a labelled list with one item per file, name and size', async () => {
      const { host, root, items, fixture } = setup();
      host.files.set([
        { uid: '1', name: 'contract.pdf', size: 1536, status: 'done' },
        { uid: '2', name: 'photo.png', size: 3 * 1024 * 1024 },
      ]);
      fixture.detectChanges();

      const list = root.querySelector('ul') as HTMLElement;
      expect(list.getAttribute('aria-label')).toBe('Files');
      expect(
        items().map(
          (item) => item.querySelector('.andes-upload__name')?.textContent,
        ),
      ).toEqual(['contract.pdf', 'photo.png']);
      expect(
        items().map(
          (item) => item.querySelector('.andes-upload__caption')?.textContent,
        ),
      ).toEqual(['1.5 KB', '3 MB']);
      expect(items()[1].getAttribute('data-status')).toBe('done');
    });

    it('can be hidden, or lose individual parts', () => {
      const { host, root, fixture } = setup();
      host.files.set([
        { uid: '1', name: 'a.pdf', size: 10, url: 'https://files.test/a.pdf' },
      ]);
      fixture.detectChanges();
      expect(
        root.querySelector('button[aria-label="Remove a.pdf"]'),
      ).not.toBeNull();
      expect(
        root.querySelector('button[aria-label="Preview a.pdf"]'),
      ).not.toBeNull();
      expect(root.querySelector('a[aria-label="Download a.pdf"]')).toBeNull();

      host.showList.set({
        showRemoveIcon: false,
        showDownloadIcon: true,
        showFileSize: false,
      });
      fixture.detectChanges();
      expect(
        root.querySelector('button[aria-label="Remove a.pdf"]'),
      ).toBeNull();
      expect(
        root.querySelector('a[aria-label="Download a.pdf"]'),
      ).not.toBeNull();
      expect(root.querySelector('.andes-upload__caption')).toBeNull();

      host.showList.set(false);
      fixture.detectChanges();
      expect(root.querySelector('ul')).toBeNull();
    });

    it('links the name to the file, and emits preview and download events', () => {
      const { host, root, fixture } = setup();
      host.showList.set({ showDownloadIcon: true });
      host.files.set([
        {
          uid: '1',
          name: 'a.pdf',
          url: 'https://files.test/a.pdf',
          status: 'done',
        },
      ]);
      fixture.detectChanges();

      const link = root.querySelector(
        'a.andes-upload__name',
      ) as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('https://files.test/a.pdf');
      expect(link.rel).toContain('noopener');

      const open = vi.fn();
      vi.stubGlobal('open', open);
      (
        root.querySelector(
          'button[aria-label="Preview a.pdf"]',
        ) as HTMLButtonElement
      ).click();
      expect(host.previews[0].file.uid).toBe('1');
      expect(open).toHaveBeenCalledWith(
        'https://files.test/a.pdf',
        '_blank',
        'noopener,noreferrer',
      );

      host.preventPreview = true;
      (
        root.querySelector(
          'button[aria-label="Preview a.pdf"]',
        ) as HTMLButtonElement
      ).click();
      expect(open).toHaveBeenCalledTimes(1);

      const download = root.querySelector(
        'a[aria-label="Download a.pdf"]',
      ) as HTMLAnchorElement;
      expect(download.hasAttribute('download')).toBe(true);
      const free = new MouseEvent('click', { bubbles: true, cancelable: true });
      download.dispatchEvent(free);
      expect(free.defaultPrevented).toBe(false);
      host.preventDownload = true;
      const blocked = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      download.dispatchEvent(blocked);
      expect(blocked.defaultPrevented).toBe(true);
      expect(host.downloads).toHaveLength(2);
    });

    it('lets itemRender and iconRender take over', () => {
      const { host, root, fixture } = setup();
      host.files.set([{ uid: '1', name: 'a.pdf', status: 'done' }]);
      host.custom.set(true);
      fixture.detectChanges();
      expect(root.querySelector('.custom-item')?.textContent).toBe('a.pdf');

      (root.querySelector('.custom-remove') as HTMLButtonElement).click();
      expect(host.files()).toEqual([]);

      host.files.set([{ uid: '2', name: 'abcd.pdf', status: 'done' }]);
      host.listType.set('picture');
      fixture.detectChanges();
      expect(root.querySelector('.custom-item')).not.toBeNull();
    });

    it('treats a file without a status as already uploaded', () => {
      const { host, root, fixture } = setup();
      host.files.set([{ uid: '1', name: 'old.pdf' }]);
      fixture.detectChanges();
      expect(
        root.querySelector('.andes-upload__item')?.getAttribute('data-status'),
      ).toBe('done');
      expect(root.querySelector('[role="progressbar"]')).toBeNull();
    });

    it('localises its texts', async () => {
      const { host, root, fixture, input, flush } = setup();
      host.messages.set({
        selectFiles: 'Elegir',
        fileList: 'Archivos',
        remove: 'Quitar {name}',
      });
      pick([pdf('a.pdf')]);
      await flush();
      fixture.detectChanges();
      expect(input().getAttribute('aria-label')).toBe('Elegir');
      expect(root.querySelector('ul')?.getAttribute('aria-label')).toBe(
        'Archivos',
      );
      expect(
        root.querySelector('button[aria-label="Quitar a.pdf"]'),
      ).not.toBeNull();
    });
  });

  describe('picture lists and thumbnails', () => {
    it('makes object URLs for pictures and revokes them when the file goes', async () => {
      const { host, flush, root } = setup();
      host.listType.set('picture');
      pick([png('a.png'), pdf('b.pdf')]);
      await flush();

      expect(created).toHaveLength(1);
      expect(
        root.querySelector('img.andes-upload__img')?.getAttribute('src'),
      ).toBe(created[0]);
      expect(root.querySelectorAll('img')).toHaveLength(1);

      await host.upload().removeFile(host.files()[0]);
      await flush();
      expect(revoked).toEqual([created[0]]);
    });

    it('revokes every URL when the control is destroyed', async () => {
      const { host, flush, fixture } = setup();
      host.listType.set('picture-card');
      pick([png('a.png'), png('b.png')]);
      await flush();
      fixture.destroy();
      expect(revoked.sort()).toEqual([...created].sort());
    });

    it('does no work for a plain text list', async () => {
      const { flush } = setup();
      pick([png('a.png')]);
      await flush();
      expect(created).toHaveLength(0);
    });

    it('uses a given thumbUrl, and a picture URL when there is none', () => {
      const { host, root, fixture } = setup();
      host.listType.set('picture');
      host.files.set([
        {
          uid: '1',
          name: 'a.png',
          status: 'done',
          thumbUrl: 'https://cdn.test/thumb.png',
        },
        {
          uid: '2',
          name: 'b.jpg',
          status: 'done',
          url: 'https://cdn.test/b.jpg',
        },
        {
          uid: '3',
          name: 'c.pdf',
          status: 'done',
          url: 'https://cdn.test/c.pdf',
        },
      ]);
      fixture.detectChanges();
      const sources = Array.from(root.querySelectorAll('img')).map((img) =>
        img.getAttribute('src'),
      );
      expect(sources).toEqual([
        'https://cdn.test/thumb.png',
        'https://cdn.test/b.jpg',
      ]);
      expect(created).toHaveLength(0);
    });

    it('asks previewFile for the thumbnail and never revokes what it returns', async () => {
      const { host, flush, root, fixture } = setup();
      host.listType.set('picture');
      host.previewFile.set(async () => 'data:image/png;base64,AAAA');
      pick([png('a.png')]);
      await flush();
      await flush();
      expect(root.querySelector('img')?.getAttribute('src')).toBe(
        'data:image/png;base64,AAAA',
      );
      fixture.destroy();
      expect(created).toHaveLength(0);
      expect(revoked).toHaveLength(0);
    });

    it('draws a progress bar and the actions on picture-card tiles', async () => {
      const { host, flush, root, requests } = setup();
      host.listType.set('picture-card');
      pick([png('a.png')]);
      await flush();
      requests[0].onProgress(25);
      await flush();

      expect(root.querySelector('.andes-upload__cards')).not.toBeNull();
      expect(root.querySelector('ul')?.getAttribute('data-list-type')).toBe(
        'picture-card',
      );
      expect(
        root
          .querySelector('[role="progressbar"]')
          ?.getAttribute('aria-valuenow'),
      ).toBe('25');
      requests[0].onSuccess({});
      await flush();
      expect(
        root.querySelector('button[aria-label="Preview a.png"]'),
      ).not.toBeNull();
      expect(
        root.querySelector('button[aria-label="Remove a.png"]'),
      ).not.toBeNull();
    });

    it('hides the add tile of a picture-card list once the limit is reached', async () => {
      const { host, flush, root, fixture } = setup();
      host.listType.set('picture-card');
      host.maxCount.set(1);
      fixture.detectChanges();
      expect(
        (root.querySelector('.andes-upload__select') as HTMLElement).hidden,
      ).toBe(false);
      pick([png('a.png')]);
      await flush();
      expect(
        (root.querySelector('.andes-upload__select') as HTMLElement).hidden,
      ).toBe(true);
    });

    it('switches layout without losing the projected trigger', () => {
      const { host, root, fixture } = setup();
      host.files.set([{ uid: '1', name: 'a.png', status: 'done' }]);
      fixture.detectChanges();
      expect(root.querySelectorAll('.trigger')).toHaveLength(1);
      host.listType.set('picture-card');
      fixture.detectChanges();
      expect(root.querySelectorAll('.trigger')).toHaveLength(1);
      host.listType.set('text');
      fixture.detectChanges();
      expect(root.querySelectorAll('.trigger')).toHaveLength(1);
    });
  });

  describe('paste', () => {
    it('adds pasted files', async () => {
      const { root, host, flush } = setup();
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', {
        value: { files: [png('shot.png')] },
      });
      root.querySelector('input')?.dispatchEvent(event);
      await flush();
      expect(event.defaultPrevented).toBe(true);
      expect(host.files().map((f) => f.name)).toEqual(['shot.png']);
    });

    it('ignores text pastes and, when asked, file pastes', async () => {
      const { root, host, fixture, flush } = setup();
      const text = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(text, 'clipboardData', { value: { files: [] } });
      root.querySelector('input')?.dispatchEvent(text);
      expect(text.defaultPrevented).toBe(false);

      host.allowPaste.set(false);
      fixture.detectChanges();
      const files = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(files, 'clipboardData', {
        value: { files: [png()] },
      });
      root.querySelector('input')?.dispatchEvent(files);
      await flush();
      expect(host.files()).toEqual([]);
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/upload/upload.css'),
      'utf8',
    ).replace(/\s+/g, ' ');

    it('draws the progress as a calm 4px track', () => {
      expect(css).toContain(
        '.andes-upload__progress { position: relative; block-size: 4px;',
      );
      expect(css).toContain(
        'background-color: var(--andes-color-primary, #2563eb);',
      );
    });

    it('shows the keyboard focus on the trigger when the hidden input is focused', () => {
      expect(css).toContain(
        '.andes-upload__select:has(.andes-upload__input:focus-visible) { outline: 2px solid var(--andes-color-focus-ring, #2563eb);',
      );
    });

    it('keeps the hidden input out of the layout but not out of the tab order', () => {
      const rule = css.slice(css.indexOf('.andes-upload__input {'));
      expect(rule.slice(0, rule.indexOf('}'))).toContain('opacity: 0');
      expect(rule.slice(0, rule.indexOf('}'))).not.toContain('display: none');
      expect(rule.slice(0, rule.indexOf('}'))).not.toContain('visibility');
    });

    it('turns transitions off for reduced motion', () => {
      const block = css.slice(css.indexOf('prefers-reduced-motion'));
      expect(block).toContain('.andes-upload__progress-bar');
      expect(block).toContain('transition: none');
    });

    it('uses logical properties for direction-safe layout', () => {
      expect(css).toContain('inline-size');
      expect(css).toContain('padding-inline');
      expect(css).not.toMatch(
        /margin-left|margin-right|padding-left|padding-right/,
      );
    });

    it('reveals picture-card actions on hover and keyboard focus', () => {
      expect(css).toContain(':focus-within .andes-upload__actions');
    });
  });
});

/* ------------------------------------------------------------------- dragger */

describe('AndesUploadDragger', () => {
  beforeEach(() => {
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    });
  });

  function setup() {
    const fixture = TestBed.createComponent(DraggerHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      area: () => root.querySelector('.andes-upload__select') as HTMLElement,
      flush: async () => {
        await new Promise((resolve) => setTimeout(resolve));
        fixture.detectChanges();
      },
    };
  }

  it('renders the icon, title and hint of the drop area', () => {
    const { root, host, fixture } = setup();
    expect(root.querySelector('.andes-upload__drag-icon svg')).not.toBeNull();
    expect(
      root.querySelector('.andes-upload__drag-title')?.textContent?.trim(),
    ).toBe('Click or drag files to this area to upload');
    expect(root.querySelector('.andes-upload__drag-hint')).toBeNull();

    host.title.set('Drop the invoices here');
    host.hint.set('PDF up to 5 MB');
    fixture.detectChanges();
    expect(
      root.querySelector('.andes-upload__drag-title')?.textContent?.trim(),
    ).toBe('Drop the invoices here');
    expect(root.querySelector('.andes-upload__drag-hint')?.textContent).toBe(
      'PDF up to 5 MB',
    );
  });

  it('highlights while files are dragged over and clears on leave', () => {
    const { area, fixture } = setup();
    const over = dragEvent('dragenter');
    area().dispatchEvent(over);
    fixture.detectChanges();
    expect(over.defaultPrevented).toBe(true);
    expect(area().hasAttribute('data-dragging')).toBe(true);

    area().dispatchEvent(dragEvent('dragenter'));
    area().dispatchEvent(dragEvent('dragleave'));
    fixture.detectChanges();
    expect(area().hasAttribute('data-dragging')).toBe(true);
    area().dispatchEvent(dragEvent('dragleave'));
    fixture.detectChanges();
    expect(area().hasAttribute('data-dragging')).toBe(false);
  });

  it('sets the drop effect and ignores drags that carry no files', () => {
    const { area, fixture } = setup();
    const over = dragEvent('dragover');
    area().dispatchEvent(over);
    expect(
      (over as unknown as { dataTransfer: { dropEffect: string } }).dataTransfer
        .dropEffect,
    ).toBe('copy');

    const text = dragEvent('dragenter', [], ['text/plain']);
    area().dispatchEvent(text);
    fixture.detectChanges();
    expect(text.defaultPrevented).toBe(false);
    expect(area().hasAttribute('data-dragging')).toBe(false);
  });

  it('adds dropped files, emits drop and keeps the raw event off the host', async () => {
    const { area, host, flush } = setup();
    const drop = dragEvent('drop', [pdf('a.pdf'), pdf('b.pdf')]);
    area().dispatchEvent(drop);
    await flush();

    expect(drop.defaultPrevented).toBe(true);
    expect(host.drops).toHaveLength(1);
    expect(host.nativeDrops).toBe(0);
    expect(
      host
        .dragger()
        .fileList()
        .map((f) => f.name),
    ).toEqual(['a.pdf', 'b.pdf']);
    expect(area().hasAttribute('data-dragging')).toBe(false);
  });

  it('ignores drops while disabled', async () => {
    const { area, host, fixture, flush } = setup();
    host.disabled.set(true);
    fixture.detectChanges();
    area().dispatchEvent(dragEvent('drop', [pdf()]));
    await flush();
    expect(host.drops).toHaveLength(0);
    expect(host.dragger().fileList()).toEqual([]);
  });

  it('shows the same focus and tab behaviour as the plain control', () => {
    const { root } = setup();
    const input = root.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('tabindex')).toBeNull();
    expect(input.getAttribute('aria-label')).toBe('Select files');
  });

  it('does not accept drops on the plain control', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const area = fixture.nativeElement.querySelector(
      '.andes-upload__select',
    ) as HTMLElement;
    const event = dragEvent('dragenter');
    area.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(area.hasAttribute('data-dragging')).toBe(false);
  });
});

/* --------------------------------------------------------------------- forms */

describe('AndesUpload with Forms', () => {
  function setup() {
    const fixture = TestBed.createComponent(FormHost);
    fixture.detectChanges();
    return {
      fixture,
      host: fixture.componentInstance,
      input: fixture.nativeElement.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement,
      flush: async () => {
        await new Promise((resolve) => setTimeout(resolve));
        fixture.detectChanges();
      },
    };
  }

  it('writes the control value into the list', () => {
    const { host, fixture } = setup();
    host.control.setValue([{ uid: '1', name: 'a.pdf', status: 'done' }]);
    fixture.detectChanges();
    expect(host.upload().fileList()).toHaveLength(1);
    host.control.setValue(null);
    expect(host.upload().fileList()).toEqual([]);
  });

  it('pushes list changes to the control and validates them', async () => {
    const { host, flush, input } = setup();
    expect(host.control.errors).toEqual({ required: true });

    choose(input, [pdf('a.pdf')]);
    await flush();
    expect(host.control.value).toHaveLength(1);
    expect(host.control.errors).toEqual({ uploadPending: true });

    host.options[0].onSuccess({});
    await flush();
    expect(host.control.errors).toBeNull();
    expect(host.control.dirty).toBe(true);

    choose(input, [pdf('b.pdf')]);
    await flush();
    host.options[1].onError(new Error('x'));
    await flush();
    expect(host.control.errors).toEqual({ uploadFailed: true });

    choose(input, [pdf('c.pdf')]);
    await flush();
    expect(host.control.errors).toMatchObject({
      uploadMaxFiles: { max: 2, actual: 3 },
    });
  });

  it('follows the control\u2019s disabled state', () => {
    const { host, fixture, input } = setup();
    host.control.disable();
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
    host.control.enable();
    fixture.detectChanges();
    expect(input.disabled).toBe(false);
  });

  it('marks the control touched when focus leaves', () => {
    const { host, input } = setup();
    expect(host.control.touched).toBe(false);
    input.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
    expect(host.control.touched).toBe(true);
  });
});

describe('upload validators', () => {
  it('reports nothing for empty or missing values', () => {
    expect(andesUploadSettled()(new FormControl(null))).toBeNull();
    expect(andesUploadSettled()(new FormControl([]))).toBeNull();
    expect(andesUploadMaxFiles(1)(new FormControl(null))).toBeNull();
  });
});
