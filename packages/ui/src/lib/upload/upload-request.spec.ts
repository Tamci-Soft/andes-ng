import { xhrUploadRequest } from './upload-request';
import {
  AndesUploadHttpError,
  type AndesUploadRequestOptions,
} from './upload-types';

class FakeXhr {
  method = '';
  url = '';
  headers: Record<string, string> = {};
  withCredentials = false;
  body: FormData | null = null;
  status = 0;
  responseText = '';
  aborted = false;
  upload: { onprogress: ((event: unknown) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: FormData) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
  }
  respond(status: number, text: string) {
    this.status = status;
    this.responseText = text;
    this.onload?.();
  }
}

function setup(overrides: Partial<AndesUploadRequestOptions> = {}) {
  const xhr = new FakeXhr();
  const file = new File(['hello'], 'invoice.pdf', { type: 'application/pdf' });
  const calls = {
    progress: [] as number[],
    success: [] as unknown[],
    error: [] as unknown[],
  };
  const handle = xhrUploadRequest(
    {
      action: '/api/files',
      method: 'POST',
      headers: {},
      data: {},
      withCredentials: false,
      filename: 'file',
      file,
      uploadFile: { uid: '1', name: 'invoice.pdf' },
      onProgress: (percent) => calls.progress.push(percent),
      onSuccess: (response) => calls.success.push(response),
      onError: (error) => calls.error.push(error),
      ...overrides,
    },
    () => xhr as unknown as XMLHttpRequest,
  );
  return { xhr, handle, calls, file };
}

describe('xhrUploadRequest', () => {
  it('sends a multipart body with the file under the chosen field name', () => {
    const { xhr, file } = setup({
      filename: 'attachment',
      data: { orderId: 42, tags: ['a', 'b'], skip: undefined, meta: { x: 1 } },
    });
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/api/files');
    const body = xhr.body as FormData;
    expect((body.get('attachment') as File).name).toBe(file.name);
    expect(body.get('orderId')).toBe('42');
    expect(body.getAll('tags')).toEqual(['a', 'b']);
    expect(body.has('skip')).toBe(false);
    expect(body.get('meta')).toBe('{"x":1}');
  });

  it('keeps the original name when a transformed blob is sent', () => {
    const { xhr } = setup({
      file: new Blob(['zip']),
      uploadFile: { uid: '1', name: 'photo.png' },
    });
    expect(((xhr.body as FormData).get('file') as File).name).toBe('photo.png');
  });

  it('applies method, credentials and headers but never a content type', () => {
    const { xhr } = setup({
      method: 'PUT',
      withCredentials: true,
      headers: { Authorization: 'Bearer t', 'content-type': 'text/plain' },
    });
    expect(xhr.method).toBe('PUT');
    expect(xhr.withCredentials).toBe(true);
    expect(xhr.headers).toEqual({ Authorization: 'Bearer t' });
  });

  it('reports rounded progress and ignores unknown totals', () => {
    const { xhr, calls } = setup();
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 3 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 1, total: 0 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 3, total: 3 });
    expect(calls.progress).toEqual([33, 100]);
  });

  it('succeeds with parsed JSON, or the raw text when it is not JSON', () => {
    const json = setup();
    json.xhr.respond(201, '{"id":7}');
    expect(json.calls.success).toEqual([{ id: 7 }]);

    const text = setup();
    text.xhr.respond(200, 'ok');
    expect(text.calls.success).toEqual(['ok']);

    const empty = setup();
    empty.xhr.respond(204, '');
    expect(empty.calls.success).toEqual([undefined]);
  });

  it('fails with an http error carrying the status and body', () => {
    const { xhr, calls } = setup();
    xhr.respond(413, '{"error":"too big"}');
    const error = calls.error[0] as AndesUploadHttpError;
    expect(error).toBeInstanceOf(AndesUploadHttpError);
    expect(error.status).toBe(413);
    expect(error.response).toEqual({ error: 'too big' });
    expect(calls.success).toEqual([]);
  });

  it('fails on network errors and timeouts with status 0', () => {
    const a = setup();
    a.xhr.onerror?.();
    const b = setup();
    b.xhr.ontimeout?.();
    expect((a.calls.error[0] as AndesUploadHttpError).status).toBe(0);
    expect((b.calls.error[0] as AndesUploadHttpError).message).toMatch(
      /timed out/,
    );
  });

  it('aborts through the handle', () => {
    const { xhr, handle } = setup();
    handle.abort();
    expect(xhr.aborted).toBe(true);
  });
});
