import type { TemplateRef } from '@angular/core';

/**
 * Where a file is in its life:
 * - `ready`: in the list, not sent (manual upload mode, waiting for `submit()`);
 * - `uploading`: the request is running;
 * - `done`: the server accepted it (or it came in already uploaded);
 * - `error`: the request failed; it can be retried while the original file is still known;
 * - `removed`: only ever seen on the file handed to `change` / `remove` when it leaves the list.
 */
export type AndesUploadStatus =
  'ready' | 'uploading' | 'done' | 'error' | 'removed';

export type AndesUploadListType =
  'text' | 'picture' | 'picture-card' | 'picture-circle';

export type AndesUploadSize = 'sm' | 'md' | 'lg';

/** How a batch of files reached the control. */
export type AndesUploadSource = 'select' | 'drop' | 'paste' | 'api';

/** One entry of the file list (the control's value). */
export interface AndesUploadFile<TResponse = unknown> {
  /** Stable identity; generated for files the user adds. */
  uid: string;
  name: string;
  /** Bytes. */
  size?: number;
  /** MIME type. */
  type?: string;
  /** Absent means `done` (a file that was already on the server). */
  status?: AndesUploadStatus;
  /** 0-100 while `uploading`. */
  percent?: number;
  /** Whatever the transport reported on success (parsed JSON when possible). */
  response?: TResponse;
  /** The failure of the last attempt. */
  error?: unknown;
  /** Replaces the generic failure text next to a failed file. */
  errorMessage?: string;
  /** Where the uploaded file can be opened or downloaded. */
  url?: string;
  /** Picture used by the picture list types; generated from the file when missing. */
  thumbUrl?: string;
  /** The file (or the blob `beforeUpload` turned it into) that is sent. */
  originFileObj?: File | Blob;
  lastModified?: number;
}

export interface AndesUploadChangeEvent<TResponse = unknown> {
  /** The file this change is about. */
  file: AndesUploadFile<TResponse>;
  /** The whole list after the change. */
  fileList: AndesUploadFile<TResponse>[];
  /** Present for progress changes. */
  event?: { percent: number };
}

export type AndesUploadRejectReason =
  'accept' | 'size' | 'count' | 'before-upload';

export interface AndesUploadRejection {
  file: File;
  reason: AndesUploadRejectReason;
}

/**
 * What `preview` and `download` emit. Call `preventDefault()` synchronously to replace the
 * default (opening the file's URL for `preview`, following the link for `download`).
 */
export class AndesUploadItemEvent {
  private prevented = false;

  constructor(
    readonly file: AndesUploadFile,
    /** The DOM event that triggered it, `null` for programmatic calls. */
    readonly nativeEvent: Event | null,
  ) {}

  get defaultPrevented(): boolean {
    return this.prevented;
  }

  preventDefault(): void {
    this.prevented = true;
  }
}

/**
 * What `beforeUpload` may return, now or as a promise:
 * - `true` / `undefined`: go ahead;
 * - a `File` or `Blob`: go ahead, sending this instead (compressed, renamed, converted...);
 * - `false` / `null`, or a rejected promise: the file is not added.
 */
export type AndesUploadBeforeResult = boolean | File | Blob | null | undefined;

export type AndesUploadBeforeUpload = (
  file: File,
  batch: File[],
) => AndesUploadBeforeResult | Promise<AndesUploadBeforeResult>;

/** Return `false` (or reject) to keep the file. */
export type AndesUploadBeforeRemove = (
  file: AndesUploadFile,
) => boolean | undefined | Promise<boolean | undefined>;

export type AndesUploadData =
  | Record<string, unknown>
  | ((
      file: AndesUploadFile,
    ) => Record<string, unknown> | Promise<Record<string, unknown>>);

export type AndesUploadAction =
  string | ((file: AndesUploadFile) => string | Promise<string>);

/** What a transport receives; `data` and `action` are already resolved. */
export interface AndesUploadRequestOptions {
  action: string;
  method: string;
  headers: Record<string, string>;
  data: Record<string, unknown>;
  withCredentials: boolean;
  /** The multipart field name for the file. */
  filename: string;
  file: File | Blob;
  uploadFile: AndesUploadFile;
  /** Report 0-100. */
  onProgress: (percent: number, event?: ProgressEvent) => void;
  onSuccess: (response?: unknown) => void;
  onError: (error: unknown, response?: unknown) => void;
}

export interface AndesUploadRequestHandle {
  abort(): void;
}

/** A transport. Return a handle (or an abort function) to make removal cancel the request. */
export type AndesUploadRequest = (
  options: AndesUploadRequestOptions,
) => AndesUploadRequestHandle | (() => void) | void;

/** The failure the built-in transport reports for a non-2xx answer or a network error. */
export class AndesUploadHttpError extends Error {
  constructor(
    message: string,
    /** The HTTP status, `0` for network errors and timeouts. */
    readonly status: number,
    readonly response?: unknown,
  ) {
    super(message);
    this.name = 'AndesUploadHttpError';
  }
}

export interface AndesUploadListOptions {
  showPreviewIcon?: boolean;
  showRemoveIcon?: boolean;
  showDownloadIcon?: boolean;
  showRetryIcon?: boolean;
  /** The file size under the name (list rows only). */
  showFileSize?: boolean;
}

/** Texts the control writes itself. `{name}`, `{max}` and `{count}` are filled in. */
export interface AndesUploadMessages {
  selectFiles: string;
  fileList: string;
  uploading: string;
  ready: string;
  uploadFailed: string;
  announceUploaded: string;
  announceFailed: string;
  announceRemoved: string;
  announceRejected: string;
  rejectAccept: string;
  rejectSize: string;
  rejectCount: string;
  rejectBefore: string;
  preview: string;
  download: string;
  remove: string;
  retry: string;
  dropTitle: string;
}

export interface AndesUploadItemContext {
  $implicit: AndesUploadFile;
  file: AndesUploadFile;
  fileList: AndesUploadFile[];
  listType: AndesUploadListType;
  status: AndesUploadStatus;
  thumbUrl: string | undefined;
  preview: () => void;
  download: () => void;
  remove: () => void;
  retry: () => void;
}

export interface AndesUploadIconContext {
  $implicit: AndesUploadFile;
  file: AndesUploadFile;
  listType: AndesUploadListType;
  status: AndesUploadStatus;
  thumbUrl: string | undefined;
}

export type AndesUploadItemTemplate = TemplateRef<AndesUploadItemContext>;
export type AndesUploadIconTemplate = TemplateRef<AndesUploadIconContext>;
