import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import clsx from 'clsx';

import type { AndesUploadIconName } from './upload-icon';
import {
  formatFileSize,
  formatMessage,
  isImageFile,
  readDroppedFiles,
  toUploadFile,
  validateUploadFile,
} from './upload-files';
import { xhrUploadRequest } from './upload-request';
import {
  AndesUploadItemEvent,
  type AndesUploadAction,
  type AndesUploadBeforeRemove,
  type AndesUploadBeforeUpload,
  type AndesUploadChangeEvent,
  type AndesUploadData,
  type AndesUploadFile,
  type AndesUploadIconContext,
  type AndesUploadItemContext,
  type AndesUploadListOptions,
  type AndesUploadListType,
  type AndesUploadMessages,
  type AndesUploadRejection,
  type AndesUploadRequest,
  type AndesUploadRequestHandle,
  type AndesUploadRequestOptions,
  type AndesUploadSize,
  type AndesUploadSource,
  type AndesUploadStatus,
} from './upload-types';

export const DEFAULT_UPLOAD_MESSAGES: AndesUploadMessages = {
  selectFiles: 'Select files',
  fileList: 'Files',
  uploading: 'Uploading {name}',
  ready: 'Ready to upload',
  uploadFailed: 'Upload failed',
  announceUploaded: '{name} uploaded',
  announceFailed: '{name} could not be uploaded',
  announceRemoved: '{name} removed',
  announceRejected: '{name} was not added: {reason}',
  rejectAccept: 'this file type is not allowed',
  rejectSize: 'the file is larger than {max}',
  rejectCount: 'the limit of {count} files is reached',
  rejectBefore: 'the file was not accepted',
  preview: 'Preview {name}',
  download: 'Download {name}',
  remove: 'Remove {name}',
  retry: 'Retry uploading {name}',
  dropTitle: 'Click or drag files to this area to upload',
};

/** Natively keyboard-focusable elements, plus anything opted in with a tabindex. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** What the default item template renders for one file. */
export interface AndesUploadItemView {
  readonly uid: string;
  readonly file: AndesUploadFile;
  readonly status: AndesUploadStatus;
  readonly percent: number;
  readonly thumb: string | undefined;
  readonly icon: AndesUploadIconName;
  readonly caption: string;
  readonly errorText: string | undefined;
  readonly canPreview: boolean;
  readonly canDownload: boolean;
  readonly canRetry: boolean;
  readonly canRemove: boolean;
  readonly labels: {
    readonly preview: string;
    readonly download: string;
    readonly remove: string;
    readonly retry: string;
    readonly uploading: string;
  };
  readonly ctx: AndesUploadItemContext;
  readonly iconCtx: AndesUploadIconContext;
}

interface ThumbEntry {
  url: string | undefined;
  readonly source: File | Blob;
  /** Object URLs we created are ours to revoke; ones a `previewFile` returned are not. */
  readonly owned: boolean;
}

function noop(): void {
  // Default Forms callbacks until the real ones are registered.
}

function hasProjectedContent(slot: HTMLElement): boolean {
  return Array.from(slot.childNodes).some(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()),
  );
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/**
 * Everything `andes-upload` and `andes-upload-dragger` share: the two components render the
 * exact same template and differ only in `dragMode`, so they stay separate selectors without
 * re-forwarding ~40 inputs.
 *
 * ## How files flow
 *
 * Files arrive from the picker, a drop, a paste or `addFiles()`. Each is checked against
 * `accept` and `maxSize`, trimmed to `maxCount`, then handed to `beforeUpload` (which may veto
 * or replace it). The survivors join `fileList` and, with `autoUpload`, start sending through
 * `customRequest` or the built-in multipart transport. Every change to the list - added,
 * progress, done, failed, removed - goes through `commit()`, which updates the `fileList`
 * model, the bound form control and the `changed` output together.
 */
@Directive({
  host: {
    '[attr.data-slot]': '"upload"',
    '[attr.data-list-type]': 'listType()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    // These belong on the real file input inside the template.
    '[attr.id]': 'null',
    '[attr.name]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
    '(focusout)': 'onFocusOut($event)',
  },
})
export abstract class AndesUploadBase implements ControlValueAccessor {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fileInput =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly projected = viewChild<ElementRef<HTMLElement>>('projected');

  /** The drag-and-drop variant sets this; it only changes what the trigger area looks like. */
  protected readonly dragMode: boolean = false;

  /* ------------------------------------------------------------------ inputs */

  /** The list of files; two-way (`[(fileList)]`) and the value seen by Forms. */
  readonly fileList = model<AndesUploadFile[]>([]);

  /** Where files are sent; a function can pick a URL per file. */
  readonly action = input<AndesUploadAction | undefined>(undefined);
  readonly method = input('POST');
  readonly headers = input<Record<string, string>>({});
  /** Extra form fields sent with each file; a function can compute them per file. */
  readonly data = input<AndesUploadData | undefined>(undefined);
  readonly withCredentials = input(false, { transform: booleanAttribute });
  /** The multipart field name of the file (and the file input's `name`). */
  readonly name = input('file');
  /** Replaces the built-in transport entirely. */
  readonly customRequest = input<AndesUploadRequest | undefined>(undefined);
  /** Start sending as soon as files are added. Off: files wait as `ready` for `submit()`. */
  readonly autoUpload = input(true, { transform: booleanAttribute });

  /** File types, as a file input's `accept` (`.pdf,image/*`). */
  readonly accept = input<string | undefined>(undefined);
  readonly multiple = input(false, { transform: booleanAttribute });
  /** Pick (or drop) whole folders; every file inside is added. */
  readonly directory = input(false, { transform: booleanAttribute });
  /** At most this many files. With 1, a new file replaces the current one. */
  readonly maxCount = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null
        ? undefined
        : numberAttribute(value),
  });
  /** Largest file, in bytes. */
  readonly maxSize = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null
        ? undefined
        : numberAttribute(value),
  });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Accept files pasted while focus is inside the control. */
  readonly allowPaste = input(true, { transform: booleanAttribute });
  /** Off: only `open()` (or a drop) starts a selection. */
  readonly openFileDialogOnClick = input(true, { transform: booleanAttribute });

  readonly beforeUpload = input<AndesUploadBeforeUpload | undefined>(undefined);
  /** Return `false` (or reject) to keep a file the user asked to remove. */
  readonly beforeRemove = input<AndesUploadBeforeRemove | undefined>(undefined);

  readonly listType = input<AndesUploadListType>('text');
  readonly size = input<AndesUploadSize>('md');
  /** `false` hides the list; an object picks which actions show. */
  readonly showUploadList = input<boolean | AndesUploadListOptions>(true);
  /** Draws a whole row (inside the `<li>`) yourself. */
  readonly itemRender = input<TemplateRef<AndesUploadItemContext> | undefined>(
    undefined,
  );
  /** Draws just the leading icon / thumbnail of a row. */
  readonly iconRender = input<TemplateRef<AndesUploadIconContext> | undefined>(
    undefined,
  );
  /** Turns a file into a thumbnail URL; default is an object URL for pictures. */
  readonly previewFile = input<
    ((file: File | Blob) => Promise<string>) | undefined
  >(undefined);
  /** Decides what counts as a picture; default looks at the type, then the extension. */
  readonly isImage = input<((file: AndesUploadFile) => boolean) | undefined>(
    undefined,
  );
  readonly messages = input<Partial<AndesUploadMessages> | undefined>(
    undefined,
  );

  /** Drag area: the title line (default is a localisable instruction). */
  readonly dropTitle = input<string | undefined>(undefined);
  /** Drag area: the smaller hint line under the title. */
  readonly dropHint = input<string | undefined>(undefined);
  /** Drag area: replaces the default icon. */
  readonly dropIcon = input<TemplateRef<unknown> | undefined>(undefined);

  readonly id = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });
  readonly ariaInvalid = input(false, {
    alias: 'aria-invalid',
    transform: booleanAttribute,
  });

  /* ----------------------------------------------------------------- outputs */

  /** A file was added, progressed, finished, failed or left the list. Not named `change`: a file input's native `change` bubbles to the host. */
  readonly changed = output<AndesUploadChangeEvent>();
  /** The preview action; `preventDefault()` replaces opening the file's URL. */
  readonly preview = output<AndesUploadItemEvent>();
  /** The download action; `preventDefault()` replaces following the link. */
  readonly download = output<AndesUploadItemEvent>();
  /** Files were dropped on the drag area (before they are validated). Not named `drop`: that is a native event. */
  readonly dropped = output<DragEvent>();
  /** A file left the list because the user removed it (or `maxCount` 1 replaced it). */
  readonly remove = output<AndesUploadFile>();
  /** Files that were not added, with the rule they broke. */
  readonly rejected = output<AndesUploadRejection[]>();

  /* ------------------------------------------------------------------- state */

  private readonly disabledByForm = signal(false);
  protected readonly dragging = signal(false);
  protected readonly announcement = signal('');
  /** Assumed true until the slot is measured, so an empty one is the exception. */
  protected readonly hasContent = signal(true);
  private readonly thumbs = signal<Readonly<Record<string, string>>>({});

  private readonly thumbEntries = new Map<string, ThumbEntry>();
  /** uid -> marker of the running attempt; a callback with a stale marker is ignored. */
  private readonly attempts = new Map<string, object>();
  private readonly handles = new Map<string, AndesUploadRequestHandle>();
  private dragDepth = 0;
  private announceFlip = false;
  private destroyed = false;
  private onChange: (value: AndesUploadFile[]) => void = noop;
  private onTouched: () => void = noop;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  protected readonly rootClass = computed(() =>
    clsx(
      'andes-upload',
      `andes-upload--${this.size()}`,
      !this.dragMode &&
        this.listType() === 'picture' &&
        'andes-upload--picture',
      this.isCardList() && 'andes-upload--card',
      this.isCardList() &&
        this.listType() === 'picture-circle' &&
        'andes-upload--circle',
      this.isDisabled() && 'andes-upload--disabled',
    ),
  );

  protected readonly msg = computed<AndesUploadMessages>(() => ({
    ...DEFAULT_UPLOAD_MESSAGES,
    ...this.messages(),
  }));

  protected readonly isCardList = computed(
    () =>
      !this.dragMode &&
      (this.listType() === 'picture-card' ||
        this.listType() === 'picture-circle'),
  );

  protected readonly listConfig = computed(() => {
    const value = this.showUploadList();
    const options = typeof value === 'object' ? value : {};
    return {
      show: value !== false,
      preview: options.showPreviewIcon ?? true,
      remove: options.showRemoveIcon ?? true,
      download: options.showDownloadIcon ?? false,
      retry: options.showRetryIcon ?? true,
      fileSize: options.showFileSize ?? true,
    };
  });

  /** `true` when `maxCount` > 1 and that many files are in the list. */
  protected readonly isFull = computed(() => {
    const max = this.maxCount();
    return max !== undefined && max > 1 && this.fileList().length >= max;
  });

  /** The file input and the drop area refuse new files. */
  protected readonly triggerBlocked = computed(
    () => this.isDisabled() || this.isFull(),
  );

  /** Picture-card lists replace the "add" tile with the pictures once the limit is hit. */
  protected readonly triggerHidden = computed(() => {
    const max = this.maxCount();
    return (
      this.isCardList() && max !== undefined && this.fileList().length >= max
    );
  });

  protected readonly items = computed<AndesUploadItemView[]>(() => {
    const list = this.fileList();
    return list.map((file) => this.toView(file, list));
  });

  constructor() {
    effect(() => this.syncThumbs(this.fileList(), this.listType()));

    // Keeps the projected trigger out of the tab order (the file input is the one stop) and
    // notices an empty slot so a default button can stand in.
    effect((onCleanup) => {
      const slot = this.projected()?.nativeElement;
      if (!slot) {
        return;
      }
      const sync = () => {
        this.hasContent.set(hasProjectedContent(slot));
        slot.querySelectorAll(FOCUSABLE_SELECTOR).forEach((element) => {
          if (element.getAttribute('tabindex') !== '-1') {
            element.setAttribute('tabindex', '-1');
          }
        });
      };
      sync();
      if (typeof MutationObserver === 'undefined') {
        return;
      }
      const observer = new MutationObserver(sync);
      observer.observe(slot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['tabindex', 'disabled'],
      });
      onCleanup(() => observer.disconnect());
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      for (const handle of this.handles.values()) {
        handle.abort();
      }
      this.handles.clear();
      this.attempts.clear();
      for (const uid of [...this.thumbEntries.keys()]) {
        this.dropThumb(uid);
      }
    });
  }

  /* ---------------------------------------------------- ControlValueAccessor */

  writeValue(value: AndesUploadFile[] | null | undefined): void {
    this.fileList.set(Array.isArray(value) ? value : []);
  }

  registerOnChange(fn: (value: AndesUploadFile[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }

  /* -------------------------------------------------------------- public API */

  /** Opens the file dialog, as a click on the trigger would. */
  open(): void {
    if (!this.triggerBlocked()) {
      this.fileInput()?.nativeElement.click();
    }
  }

  /** Moves focus to the file input (the control's one tab stop). */
  focus(options?: FocusOptions): void {
    this.fileInput()?.nativeElement.focus(options);
  }

  /**
   * Adds files as if the user had chosen them: checked against `accept`, `maxSize` and
   * `maxCount`, passed through `beforeUpload`, then uploaded (or left `ready`).
   */
  async addFiles(
    files: readonly File[],
    source: AndesUploadSource = 'api',
  ): Promise<void> {
    if (this.destroyed || this.isDisabled() || files.length === 0) {
      return;
    }
    const rejections: AndesUploadRejection[] = [];
    let candidates: File[] = [];
    for (const file of files) {
      const reason = validateUploadFile(file, {
        accept: this.accept(),
        maxSize: this.maxSize(),
      });
      if (reason) {
        rejections.push({ file, reason });
      } else {
        candidates.push(file);
      }
    }

    if (!this.multiple() && !this.directory() && candidates.length > 1) {
      rejections.push(
        ...candidates
          .slice(1)
          .map((file) => ({ file, reason: 'count' as const })),
      );
      candidates = candidates.slice(0, 1);
    }
    candidates = this.trimToRoom(candidates, rejections);

    const hook = this.beforeUpload();
    const outcomes = await Promise.all(
      candidates.map(async (file) => {
        if (!hook) {
          return { file, sent: file as File | Blob | null };
        }
        try {
          const result = await hook(file, candidates);
          if (result === false || result === null) {
            return { file, sent: null };
          }
          return { file, sent: result instanceof Blob ? result : file };
        } catch {
          return { file, sent: null };
        }
      }),
    );
    if (this.destroyed) {
      return;
    }

    let approved: { file: File; sent: File | Blob }[] = [];
    for (const outcome of outcomes) {
      if (outcome.sent) {
        approved.push({ file: outcome.file, sent: outcome.sent });
      } else {
        rejections.push({ file: outcome.file, reason: 'before-upload' });
      }
    }
    // The list may have changed while the hooks ran.
    const room = this.roomLeft();
    if (approved.length > room) {
      rejections.push(
        ...approved
          .slice(room)
          .map(({ file }) => ({ file, reason: 'count' as const })),
      );
      approved = approved.slice(0, room);
    }

    if (approved.length > 0) {
      const status = this.autoUpload() ? 'uploading' : 'ready';
      const entries = approved.map(({ file, sent }) =>
        toUploadFile(file, sent, status),
      );
      const previous = this.fileList();
      const replaced = this.maxCount() === 1 ? previous : [];
      for (const old of replaced) {
        this.cancelAttempt(old.uid);
      }
      const next = replaced.length > 0 ? entries : [...previous, ...entries];
      this.fileList.set(next);
      this.onChange(next);
      for (const old of replaced) {
        const gone = { ...old, status: 'removed' as const };
        this.changed.emit({ file: gone, fileList: next });
        this.remove.emit(gone);
      }
      for (const entry of entries) {
        this.changed.emit({ file: entry, fileList: next });
      }
      if (this.autoUpload()) {
        for (const entry of entries) {
          void this.startUpload(entry);
        }
      }
    }

    if (rejections.length > 0) {
      this.reportRejections(rejections);
    }
    if (source === 'select' || approved.length > 0) {
      this.onTouched();
    }
  }

  /** Sends every file still waiting as `ready`. */
  submit(): void {
    for (const file of this.fileList()) {
      if ((file.status ?? 'done') === 'ready' && file.originFileObj) {
        const started = this.patch(file.uid, {
          status: 'uploading',
          percent: 0,
        });
        if (started) {
          void this.startUpload(started);
        }
      }
    }
  }

  /** Sends a failed file again. */
  retryFile(target: AndesUploadFile | string): void {
    const file = this.find(target);
    if (!file?.originFileObj || this.isDisabled()) {
      return;
    }
    const started = this.patch(file.uid, {
      status: 'uploading',
      percent: 0,
      error: undefined,
      errorMessage: undefined,
    });
    if (started) {
      void this.startUpload(started);
    }
  }

  /**
   * Takes a file out of the list, cancelling its request. `beforeRemove` can veto it.
   * Resolves `true` when the file was removed.
   */
  async removeFile(target: AndesUploadFile | string): Promise<boolean> {
    const file = this.find(target);
    if (!file || this.isDisabled()) {
      return false;
    }
    const hook = this.beforeRemove();
    if (hook) {
      try {
        if ((await hook(file)) === false) {
          return false;
        }
      } catch {
        return false;
      }
    }
    if (this.destroyed || !this.find(file.uid)) {
      return false;
    }
    this.cancelAttempt(file.uid);
    const gone = { ...file, status: 'removed' as const };
    const next = this.fileList().filter((entry) => entry.uid !== file.uid);
    this.fileList.set(next);
    this.onChange(next);
    this.changed.emit({ file: gone, fileList: next });
    this.remove.emit(gone);
    this.announce(
      formatMessage(this.msg().announceRemoved, { name: file.name }),
    );
    this.onTouched();
    return true;
  }

  /** Stops a running upload; the file stays in the list as failed. */
  abortFile(target: AndesUploadFile | string): void {
    const file = this.find(target);
    if (!file || (file.status ?? 'done') !== 'uploading') {
      return;
    }
    this.cancelAttempt(file.uid);
    this.patch(file.uid, {
      status: 'error',
      error: new Error('Upload cancelled'),
    });
  }

  /* ---------------------------------------------------------- template hooks */

  protected onTriggerClick(event: MouseEvent): void {
    const input = this.fileInput()?.nativeElement;
    if (
      !input ||
      event.target === input ||
      !this.openFileDialogOnClick() ||
      this.triggerBlocked()
    ) {
      return;
    }
    input.click();
  }

  protected onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    void this.addFiles(files, 'select');
  }

  protected onDragEnter(event: DragEvent): void {
    if (!this.dragMode || this.triggerBlocked() || !hasFiles(event)) {
      return;
    }
    event.preventDefault();
    this.dragDepth++;
    this.dragging.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (!this.dragMode || !hasFiles(event)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = this.triggerBlocked() ? 'none' : 'copy';
    }
  }

  protected onDragLeave(): void {
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) {
      this.dragging.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    if (!this.dragMode) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.dragDepth = 0;
    this.dragging.set(false);
    if (this.triggerBlocked()) {
      return;
    }
    this.dropped.emit(event);
    const transfer = event.dataTransfer;
    if (transfer) {
      void readDroppedFiles(transfer, { directory: this.directory() }).then(
        (files) => this.addFiles(files, 'drop'),
      );
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    if (!this.allowPaste() || this.triggerBlocked()) {
      return;
    }
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length > 0) {
      event.preventDefault();
      void this.addFiles(files, 'paste');
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const host = event.currentTarget as HTMLElement;
    if (!host.contains(event.relatedTarget as Node | null)) {
      this.onTouched();
    }
  }

  protected onPreviewClick(file: AndesUploadFile, event: Event | null): void {
    const preview = new AndesUploadItemEvent(file, event);
    this.preview.emit(preview);
    const url = file.url;
    if (!preview.defaultPrevented && url) {
      globalThis.open?.(url, '_blank', 'noopener,noreferrer');
    }
  }

  protected onDownloadClick(file: AndesUploadFile, event: Event | null): void {
    const download = new AndesUploadItemEvent(file, event);
    this.download.emit(download);
    if (download.defaultPrevented) {
      event?.preventDefault();
    }
  }

  protected onRemoveClick(file: AndesUploadFile): void {
    void this.removeFile(file);
  }

  protected onRetryClick(file: AndesUploadFile): void {
    this.retryFile(file);
  }

  /* ------------------------------------------------------------------ internals */

  private find(target: AndesUploadFile | string): AndesUploadFile | undefined {
    const uid = typeof target === 'string' ? target : target.uid;
    return this.fileList().find((file) => file.uid === uid);
  }

  /** How many more files `maxCount` lets in (replacing mode always has room for one). */
  private roomLeft(): number {
    const max = this.maxCount();
    if (max === undefined) {
      return Infinity;
    }
    return max === 1 ? 1 : Math.max(0, max - this.fileList().length);
  }

  private trimToRoom(
    files: File[],
    rejections: AndesUploadRejection[],
  ): File[] {
    const room = this.roomLeft();
    if (files.length <= room) {
      return files;
    }
    rejections.push(
      ...files.slice(room).map((file) => ({ file, reason: 'count' as const })),
    );
    return files.slice(0, room);
  }

  private reportRejections(rejections: AndesUploadRejection[]): void {
    this.rejected.emit(rejections);
    const messages = this.msg();
    const reasons: Record<AndesUploadRejection['reason'], string> = {
      accept: messages.rejectAccept,
      size: formatMessage(messages.rejectSize, {
        max: formatFileSize(this.maxSize() ?? 0),
      }),
      count: formatMessage(messages.rejectCount, {
        count: this.maxCount() ?? 1,
      }),
      'before-upload': messages.rejectBefore,
    };
    this.announce(
      rejections
        .map(({ file, reason }) =>
          formatMessage(messages.announceRejected, {
            name: file.name,
            reason: reasons[reason],
          }),
        )
        .join('. '),
    );
  }

  private announce(message: string): void {
    // The same text twice in a row would not be announced again; a trailing no-break space
    // makes it a new string without changing what is read.
    this.announceFlip = !this.announceFlip;
    this.announcement.set(this.announceFlip ? message : `${message}\u00a0`);
  }

  /** Replaces one entry, updates every listener, and returns the new entry. */
  private patch(
    uid: string,
    changes: Partial<AndesUploadFile>,
    event?: { percent: number },
  ): AndesUploadFile | undefined {
    const list = this.fileList();
    const index = list.findIndex((file) => file.uid === uid);
    if (index < 0) {
      return undefined;
    }
    const updated = { ...list[index], ...changes };
    const next = list.map((file, i) => (i === index ? updated : file));
    this.fileList.set(next);
    this.onChange(next);
    this.changed.emit({ file: updated, fileList: next, event });
    return updated;
  }

  private cancelAttempt(uid: string): void {
    this.attempts.delete(uid);
    const handle = this.handles.get(uid);
    this.handles.delete(uid);
    handle?.abort();
  }

  private fail(uid: string, error: unknown, response?: unknown): void {
    const file = this.patch(uid, {
      status: 'error',
      error,
      ...(response === undefined ? {} : { response }),
    });
    if (file) {
      this.announce(
        formatMessage(this.msg().announceFailed, { name: file.name }),
      );
    }
  }

  private async startUpload(entry: AndesUploadFile): Promise<void> {
    const uid = entry.uid;
    const file = entry.originFileObj;
    if (!file) {
      return;
    }
    const attempt = {};
    this.attempts.set(uid, attempt);
    const alive = () => this.attempts.get(uid) === attempt && !this.destroyed;

    let action: string;
    let data: Record<string, unknown>;
    try {
      const actionInput = this.action();
      action =
        typeof actionInput === 'function'
          ? await actionInput(entry)
          : (actionInput ?? '');
      const dataInput = this.data();
      data =
        typeof dataInput === 'function'
          ? await dataInput(entry)
          : (dataInput ?? {});
    } catch (error) {
      if (alive()) {
        this.attempts.delete(uid);
        this.fail(uid, error);
      }
      return;
    }
    if (!alive()) {
      return;
    }

    const transport = this.customRequest() ?? xhrUploadRequest;
    if (!this.customRequest() && !action) {
      this.attempts.delete(uid);
      this.fail(
        uid,
        new Error('andes-upload needs an `action` URL or a `customRequest`.'),
      );
      return;
    }

    const options: AndesUploadRequestOptions = {
      action,
      method: this.method(),
      headers: this.headers(),
      data,
      withCredentials: this.withCredentials(),
      filename: this.name(),
      file,
      uploadFile: entry,
      onProgress: (percent) => {
        if (alive()) {
          this.patch(
            uid,
            {
              percent: Math.max(0, Math.min(100, percent)),
              status: 'uploading',
            },
            { percent },
          );
        }
      },
      onSuccess: (response) => {
        if (!alive()) {
          return;
        }
        this.attempts.delete(uid);
        this.handles.delete(uid);
        const done = this.patch(uid, {
          status: 'done',
          percent: 100,
          response,
          error: undefined,
          errorMessage: undefined,
        });
        if (done) {
          this.announce(
            formatMessage(this.msg().announceUploaded, { name: done.name }),
          );
        }
      },
      onError: (error, response) => {
        if (!alive()) {
          return;
        }
        this.attempts.delete(uid);
        this.handles.delete(uid);
        this.fail(uid, error, response);
      },
    };

    let handle: ReturnType<AndesUploadRequest>;
    try {
      handle = transport(options);
    } catch (error) {
      if (alive()) {
        this.attempts.delete(uid);
        this.fail(uid, error);
      }
      return;
    }
    if (alive() && handle) {
      this.handles.set(
        uid,
        typeof handle === 'function' ? { abort: handle } : handle,
      );
    }
  }

  /* -------------------------------------------------------------- thumbnails */

  private isPicture(file: AndesUploadFile): boolean {
    return (
      this.isImage()?.(file) ??
      isImageFile({ name: file.name, type: file.type, url: file.url })
    );
  }

  private syncThumbs(
    list: AndesUploadFile[],
    listType: AndesUploadListType,
  ): void {
    const wanted = new Set<string>();
    let changed = false;
    if (listType !== 'text') {
      for (const file of list) {
        const source = file.originFileObj;
        if (file.thumbUrl || !source || !this.isPicture(file)) {
          continue;
        }
        wanted.add(file.uid);
        const existing = this.thumbEntries.get(file.uid);
        if (existing?.source === source) {
          continue;
        }
        if (existing) {
          this.dropThumb(file.uid);
        }
        changed = true;
        const custom = this.previewFile();
        if (custom) {
          const entry: ThumbEntry = { url: undefined, source, owned: false };
          this.thumbEntries.set(file.uid, entry);
          custom(source).then(
            (url) => {
              if (
                this.thumbEntries.get(file.uid) === entry &&
                !this.destroyed
              ) {
                entry.url = url;
                this.publishThumbs();
              }
            },
            () => undefined,
          );
        } else if (typeof URL !== 'undefined' && URL.createObjectURL) {
          this.thumbEntries.set(file.uid, {
            url: URL.createObjectURL(source),
            source,
            owned: true,
          });
        }
      }
    }
    for (const uid of [...this.thumbEntries.keys()]) {
      if (!wanted.has(uid)) {
        this.dropThumb(uid);
        changed = true;
      }
    }
    if (changed) {
      this.publishThumbs();
    }
  }

  private dropThumb(uid: string): void {
    const entry = this.thumbEntries.get(uid);
    this.thumbEntries.delete(uid);
    if (entry?.owned && entry.url) {
      URL.revokeObjectURL(entry.url);
    }
  }

  private publishThumbs(): void {
    const record: Record<string, string> = {};
    for (const [uid, entry] of this.thumbEntries) {
      if (entry.url) {
        record[uid] = entry.url;
      }
    }
    this.thumbs.set(record);
  }

  /* ------------------------------------------------------------------- views */

  private toView(
    file: AndesUploadFile,
    list: AndesUploadFile[],
  ): AndesUploadItemView {
    const messages = this.msg();
    const config = this.listConfig();
    const status = file.status ?? 'done';
    const picture = this.isPicture(file);
    const thumb =
      this.listType() === 'text'
        ? undefined
        : (file.thumbUrl ??
          this.thumbs()[file.uid] ??
          (picture ? file.url : undefined));
    const percent = Math.round(file.percent ?? 0);
    const name = { name: file.name };

    let caption = '';
    if (status === 'uploading') {
      caption = `${percent}%`;
    } else if (status === 'ready') {
      caption = messages.ready;
    } else if (status !== 'error' && config.fileSize && file.size != null) {
      caption = formatFileSize(file.size);
    }
    const errorText =
      status === 'error'
        ? (file.errorMessage ??
          (file.error instanceof Error && file.error.message
            ? file.error.message
            : messages.uploadFailed))
        : undefined;

    const disabled = this.isDisabled();
    const icon: AndesUploadIconName =
      status === 'error'
        ? 'alert'
        : this.listType() === 'text'
          ? 'paperclip'
          : picture
            ? 'image'
            : 'file';

    const ctx: AndesUploadItemContext = {
      $implicit: file,
      file,
      fileList: list,
      listType: this.listType(),
      status,
      thumbUrl: thumb,
      preview: () => this.onPreviewClick(file, null),
      download: () => this.onDownloadClick(file, null),
      remove: () => this.onRemoveClick(file),
      retry: () => this.onRetryClick(file),
    };

    return {
      uid: file.uid,
      file,
      status,
      percent,
      thumb,
      icon,
      caption,
      errorText,
      canPreview:
        config.preview && !!(file.url || thumb) && status !== 'uploading',
      canDownload: config.download && !!file.url && status === 'done',
      canRetry:
        config.retry && status === 'error' && !!file.originFileObj && !disabled,
      canRemove: config.remove && !disabled,
      labels: {
        preview: formatMessage(messages.preview, name),
        download: formatMessage(messages.download, name),
        remove: formatMessage(messages.remove, name),
        retry: formatMessage(messages.retry, name),
        uploading: formatMessage(messages.uploading, name),
      },
      ctx,
      iconCtx: {
        $implicit: file,
        file,
        listType: this.listType(),
        status,
        thumbUrl: thumb,
      },
    };
  }
}
