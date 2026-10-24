/**
 * Pure helpers for the upload control: file-type and size validation, formatting, ids and the
 * drag-and-drop traversal. Nothing here depends on Angular, so apps can reuse the validators in
 * their own forms and tests.
 */
import type { AndesUploadFile, AndesUploadRejectReason } from './upload-types';

/** The slice of `File` the validators read; lets `AndesUploadFile` entries be checked too. */
export interface AndesUploadFileLike {
  name: string;
  type?: string;
  size?: number;
}

/* ------------------------------------------------------------------------ accept */

/** Splits an `accept` string (`".png, image/*"`) into lower-case tokens. */
export function parseAccept(accept: string | null | undefined): string[] {
  return (accept ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Whether the file matches an `accept` list like the one a file input takes: extensions
 * (`.pdf`), exact MIME types (`application/pdf`), wildcard types (`image/*`) or the any-type wildcards (`*`, or a star-slash-star).
 * An empty list accepts everything. Extensions are matched case-insensitively against the end of
 * the name; MIME types against the `type`, parameters ignored.
 */
export function isFileAccepted(
  file: AndesUploadFileLike,
  accept: string | null | undefined,
): boolean {
  const tokens = parseAccept(accept);
  if (tokens.length === 0) {
    return true;
  }
  const name = file.name.toLowerCase();
  const type = (file.type ?? '').toLowerCase().split(';')[0].trim();
  return tokens.some((token) => {
    if (token === '*' || token === '*/*') {
      return true;
    }
    if (token.startsWith('.')) {
      return name.endsWith(token);
    }
    if (token.endsWith('/*')) {
      return type.startsWith(token.slice(0, -1));
    }
    return type === token;
  });
}

/** Splits `files` into those matching `accept` and those that do not. */
export function filterAcceptedFiles<T extends AndesUploadFileLike>(
  files: readonly T[],
  accept: string | null | undefined,
): { accepted: T[]; rejected: T[] } {
  const accepted: T[] = [];
  const rejected: T[] = [];
  for (const file of files) {
    (isFileAccepted(file, accept) ? accepted : rejected).push(file);
  }
  return { accepted, rejected };
}

/* -------------------------------------------------------------------------- size */

/** `true` when `file.size` is known and at most `maxSize` bytes (no limit: always `true`). */
export function isFileSizeValid(
  file: AndesUploadFileLike,
  maxSize: number | null | undefined,
): boolean {
  return maxSize == null || (file.size ?? 0) <= maxSize;
}

export interface AndesUploadValidationOptions {
  accept?: string | null;
  /** Bytes. */
  maxSize?: number | null;
}

/** The first rule the file breaks, or `null` when it passes. */
export function validateUploadFile(
  file: AndesUploadFileLike,
  options: AndesUploadValidationOptions,
): Extract<AndesUploadRejectReason, 'accept' | 'size'> | null {
  if (!isFileAccepted(file, options.accept)) {
    return 'accept';
  }
  if (!isFileSizeValid(file, options.maxSize)) {
    return 'size';
  }
  return null;
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** `1536` -> `1.5 KB`. Binary steps (1024), one decimal below 10, none above. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '';
  }
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const text =
    unit === 0 || value >= 10 ? String(Math.round(value)) : value.toFixed(1);
  return `${text.replace(/\.0$/, '')} ${SIZE_UNITS[unit]}`;
}

/* ---------------------------------------------------------------------- identity */

let uidCounter = 0;

/** A list-unique id for a file the user adds. */
export function createUploadUid(): string {
  uidCounter += 1;
  return `andes-upload-${Date.now().toString(36)}-${uidCounter}`;
}

/** Lower-case extension without the dot, `''` when there is none. */
export function getFileExtension(name: string): string {
  const base = name.split(/[?#]/)[0];
  const dot = base.lastIndexOf('.');
  return dot > 0 && dot < base.length - 1
    ? base.slice(dot + 1).toLowerCase()
    : '';
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'avif',
  'ico',
  'apng',
]);

/** Whether the entry is a picture, by MIME type, else by the extension of its name or URL. */
export function isImageFile(
  file: AndesUploadFileLike & { url?: string },
): boolean {
  if (file.type) {
    return file.type.toLowerCase().startsWith('image/');
  }
  return (
    IMAGE_EXTENSIONS.has(getFileExtension(file.name)) ||
    IMAGE_EXTENSIONS.has(getFileExtension(file.url ?? ''))
  );
}

/** The list entry for a freshly chosen file. */
export function toUploadFile(
  original: File,
  sent: File | Blob,
  status: 'ready' | 'uploading',
): AndesUploadFile {
  return {
    uid: createUploadUid(),
    name: original.name,
    size: sent.size,
    type: sent.type || original.type,
    lastModified: original.lastModified,
    status,
    percent: 0,
    originFileObj: sent,
  };
}

/* -------------------------------------------------------------- drag and drop */

/** What `webkitGetAsEntry()` hands back; typed locally because it is not in every DOM lib. */
interface FileSystemEntryLike {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly fullPath: string;
  file?(
    success: (file: File) => void,
    failure?: (error: unknown) => void,
  ): void;
  createReader?(): {
    readEntries(
      success: (entries: FileSystemEntryLike[]) => void,
      failure?: (error: unknown) => void,
    ): void;
  };
}

function entryFile(entry: FileSystemEntryLike): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file?.((file) => {
      const path = entry.fullPath.replace(/^\//, '');
      if (path && !file.webkitRelativePath) {
        Object.defineProperty(file, 'webkitRelativePath', {
          value: path,
          configurable: true,
        });
      }
      resolve(file);
    }, reject);
  });
}

function readAllEntries(
  entry: FileSystemEntryLike,
): Promise<FileSystemEntryLike[]> {
  const reader = entry.createReader?.();
  return new Promise((resolve, reject) => {
    if (!reader) {
      resolve([]);
      return;
    }
    const all: FileSystemEntryLike[] = [];
    // `readEntries` returns at most ~100 entries per call and an empty batch at the end.
    const next = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(all);
        } else {
          all.push(...batch);
          next();
        }
      }, reject);
    next();
  });
}

async function filesOf(entry: FileSystemEntryLike): Promise<File[]> {
  if (entry.isFile) {
    return [await entryFile(entry)];
  }
  const children = await readAllEntries(entry);
  const nested = await Promise.all(children.map((child) => filesOf(child)));
  return nested.flat();
}

/**
 * The files of a drop. Plain files come back as they are; a dropped folder is walked
 * (when `directory` is set) and its files get a `webkitRelativePath`, like a directory picker's.
 *
 * Must be called synchronously from the `drop` handler: the browser empties the data transfer
 * as soon as the handler returns, so every entry is read before the first `await`.
 */
export async function readDroppedFiles(
  dataTransfer: DataTransfer,
  options: { directory: boolean },
): Promise<File[]> {
  const items = Array.from(dataTransfer.items ?? []).filter(
    (item) => item.kind === 'file',
  );
  const entries = items.map((item) =>
    typeof item.webkitGetAsEntry === 'function'
      ? (item.webkitGetAsEntry() as FileSystemEntryLike | null)
      : null,
  );
  if (!entries.some(Boolean)) {
    return Array.from(dataTransfer.files ?? []);
  }
  const loose = items.map((item, index) =>
    entries[index]?.isFile || !entries[index] ? item.getAsFile() : null,
  );
  const pending: Promise<File[]>[] = [];
  entries.forEach((entry, index) => {
    if (!entry) {
      const file = loose[index];
      pending.push(Promise.resolve(file ? [file] : []));
    } else if (entry.isDirectory) {
      pending.push(options.directory ? filesOf(entry) : Promise.resolve([]));
    } else {
      const file = loose[index];
      pending.push(file ? Promise.resolve([file]) : filesOf(entry));
    }
  });
  return (await Promise.all(pending)).flat();
}

/* ------------------------------------------------------------------------ text */

/** Replaces `{key}` placeholders. Unknown keys are left as they are. */
export function formatMessage(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
