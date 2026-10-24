import {
  AndesUploadHttpError,
  type AndesUploadRequestHandle,
  type AndesUploadRequestOptions,
} from './upload-types';

/** Appends a value the way a `<form>` would: blobs as files, arrays as repeated fields. */
function appendField(form: FormData, key: string, value: unknown): void {
  if (value === null || value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      appendField(form, key, item);
    }
  } else if (value instanceof Blob) {
    form.append(key, value);
  } else if (typeof value === 'object') {
    form.append(key, JSON.stringify(value));
  } else {
    form.append(key, String(value));
  }
}

function parseBody(xhr: XMLHttpRequest): unknown {
  const text = xhr.responseText;
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * The built-in transport: a multipart `XMLHttpRequest`. The file goes in the field named
 * `filename`, every `data` entry in its own field. A 2xx answer succeeds with the parsed JSON
 * (or the raw text); anything else, a network failure or a timeout fails with an
 * `AndesUploadHttpError`. Progress is reported from the upload events, and the returned handle
 * aborts the request without calling back.
 *
 * `createRequest` exists so tests can hand in a stand-in `XMLHttpRequest`.
 */
export function xhrUploadRequest(
  options: AndesUploadRequestOptions,
  createRequest: () => XMLHttpRequest = () => new XMLHttpRequest(),
): AndesUploadRequestHandle {
  const xhr = createRequest();
  const form = new FormData();
  for (const [key, value] of Object.entries(options.data)) {
    appendField(form, key, value);
  }
  const sentName =
    options.file instanceof File ? options.file.name : options.uploadFile.name;
  form.append(options.filename, options.file, sentName);

  xhr.open(options.method, options.action, true);
  xhr.withCredentials = options.withCredentials;
  for (const [name, value] of Object.entries(options.headers)) {
    // A multipart body needs the browser's own boundary, so never let a caller pin the type.
    if (name.toLowerCase() !== 'content-type') {
      xhr.setRequestHeader(name, value);
    }
  }

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable && event.total > 0) {
      options.onProgress(
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
        event,
      );
    }
  };
  xhr.onload = () => {
    const response = parseBody(xhr);
    if (xhr.status >= 200 && xhr.status < 300) {
      options.onSuccess(response);
    } else {
      options.onError(
        new AndesUploadHttpError(
          `Upload failed with status ${xhr.status}`,
          xhr.status,
          response,
        ),
        response,
      );
    }
  };
  xhr.onerror = () =>
    options.onError(new AndesUploadHttpError('Network error', 0));
  xhr.ontimeout = () =>
    options.onError(new AndesUploadHttpError('The upload timed out', 0));

  xhr.send(form);
  return { abort: () => xhr.abort() };
}
