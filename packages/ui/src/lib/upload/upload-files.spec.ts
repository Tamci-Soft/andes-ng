import {
  createUploadUid,
  filterAcceptedFiles,
  formatFileSize,
  formatMessage,
  getFileExtension,
  isFileAccepted,
  isFileSizeValid,
  isImageFile,
  parseAccept,
  readDroppedFiles,
  validateUploadFile,
} from './upload-files';

const file = (name: string, type = '', size = 10) => ({ name, type, size });

describe('upload file helpers', () => {
  describe('accept', () => {
    it('parses tokens, trimming and lower-casing', () => {
      expect(parseAccept(' .PNG , image/* ,, application/pdf ')).toEqual([
        '.png',
        'image/*',
        'application/pdf',
      ]);
      expect(parseAccept(undefined)).toEqual([]);
    });

    it('accepts everything without a list or with a wildcard', () => {
      expect(isFileAccepted(file('a.bin'), undefined)).toBe(true);
      expect(isFileAccepted(file('a.bin'), '')).toBe(true);
      expect(isFileAccepted(file('a.bin'), '*')).toBe(true);
      expect(isFileAccepted(file('a.bin'), '*/*')).toBe(true);
    });

    it('matches extensions case-insensitively', () => {
      expect(isFileAccepted(file('Report.PDF'), '.pdf')).toBe(true);
      expect(isFileAccepted(file('report.pdf.exe'), '.pdf')).toBe(false);
    });

    it('matches exact and wildcard MIME types, ignoring parameters', () => {
      expect(isFileAccepted(file('x', 'image/png'), 'image/*')).toBe(true);
      expect(isFileAccepted(file('x', 'image/png'), 'image/png')).toBe(true);
      expect(isFileAccepted(file('x', 'image/png'), 'application/pdf')).toBe(
        false,
      );
      expect(
        isFileAccepted(file('x', 'text/csv; charset=utf-8'), 'text/csv'),
      ).toBe(true);
      expect(isFileAccepted(file('x', ''), 'image/*')).toBe(false);
    });

    it('accepts a file matching any token', () => {
      expect(isFileAccepted(file('a.csv', 'text/csv'), '.xlsx, .csv')).toBe(
        true,
      );
    });

    it('splits a batch into accepted and rejected', () => {
      const files = [
        file('a.png', 'image/png'),
        file('b.exe'),
        file('c.jpg', 'image/jpeg'),
      ];
      const { accepted, rejected } = filterAcceptedFiles(files, 'image/*');
      expect(accepted.map((f) => f.name)).toEqual(['a.png', 'c.jpg']);
      expect(rejected.map((f) => f.name)).toEqual(['b.exe']);
    });
  });

  describe('size and validation', () => {
    it('checks the maximum size inclusively', () => {
      expect(isFileSizeValid(file('a', '', 100), 100)).toBe(true);
      expect(isFileSizeValid(file('a', '', 101), 100)).toBe(false);
      expect(isFileSizeValid(file('a', '', 1e12), undefined)).toBe(true);
    });

    it('reports the first broken rule', () => {
      const options = { accept: '.png', maxSize: 50 };
      expect(validateUploadFile(file('a.png', '', 10), options)).toBeNull();
      expect(validateUploadFile(file('a.gif', '', 10), options)).toBe('accept');
      expect(validateUploadFile(file('a.png', '', 99), options)).toBe('size');
      expect(validateUploadFile(file('a.gif', '', 99), options)).toBe('accept');
    });

    it('formats sizes in binary steps', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(10 * 1024)).toBe('10 KB');
      expect(formatFileSize(5.25 * 1024 * 1024)).toBe('5.3 MB');
      expect(formatFileSize(3 * 1024 ** 3)).toBe('3 GB');
      expect(formatFileSize(-1)).toBe('');
    });
  });

  describe('identity and kind', () => {
    it('generates unique uids', () => {
      const ids = new Set(Array.from({ length: 50 }, () => createUploadUid()));
      expect(ids.size).toBe(50);
    });

    it('reads extensions', () => {
      expect(getFileExtension('a/b/photo.JPG')).toBe('jpg');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
      expect(getFileExtension('noext')).toBe('');
      expect(getFileExtension('.hidden')).toBe('');
      expect(getFileExtension('https://x.test/p.png?v=2')).toBe('png');
    });

    it('recognises pictures by type, then by extension of name or url', () => {
      expect(isImageFile(file('a', 'image/webp'))).toBe(true);
      expect(isImageFile(file('a.png', 'application/pdf'))).toBe(false);
      expect(isImageFile(file('scan.JPEG'))).toBe(true);
      expect(isImageFile({ name: 'cover', url: 'https://x.test/c.avif' })).toBe(
        true,
      );
      expect(isImageFile(file('notes.txt'))).toBe(false);
    });

    it('fills message placeholders', () => {
      expect(formatMessage('{name} is {x}', { name: 'a', x: 3 })).toBe(
        'a is 3',
      );
      expect(formatMessage('{unknown}', {})).toBe('{unknown}');
    });
  });

  describe('readDroppedFiles', () => {
    function fileEntry(f: File, fullPath = `/${f.name}`) {
      return {
        isFile: true,
        isDirectory: false,
        fullPath,
        file: (ok: (file: File) => void) => ok(f),
      };
    }
    function dirEntry(children: unknown[], batch = 2) {
      return {
        isFile: false,
        isDirectory: true,
        fullPath: '/docs',
        createReader: () => {
          let cursor = 0;
          return {
            readEntries: (ok: (entries: unknown[]) => void) => {
              const next = children.slice(cursor, cursor + batch);
              cursor += batch;
              ok(next);
            },
          };
        },
      };
    }
    function transfer(
      items: { entry: unknown; file: File | null }[],
      files: File[] = [],
    ) {
      return {
        items: items.map(({ entry, file }) => ({
          kind: 'file',
          webkitGetAsEntry: () => entry,
          getAsFile: () => file,
        })),
        files,
      } as unknown as DataTransfer;
    }

    it('falls back to the plain file list without entry support', async () => {
      const a = new File(['a'], 'a.txt');
      const dt = {
        items: [{ kind: 'file', getAsFile: () => a }],
        files: [a],
      } as unknown as DataTransfer;
      expect(await readDroppedFiles(dt, { directory: false })).toEqual([a]);
    });

    it('returns dropped files as they are', async () => {
      const a = new File(['a'], 'a.txt');
      const b = new File(['b'], 'b.txt');
      const dt = transfer([
        { entry: fileEntry(a), file: a },
        { entry: fileEntry(b), file: b },
      ]);
      expect(await readDroppedFiles(dt, { directory: false })).toEqual([a, b]);
    });

    it('ignores folders unless directory mode is on', async () => {
      const a = new File(['a'], 'a.txt');
      const dt = transfer([{ entry: dirEntry([fileEntry(a)]), file: null }]);
      expect(await readDroppedFiles(dt, { directory: false })).toEqual([]);
    });

    it('walks folders in batches, nested too, and sets the relative path', async () => {
      const a = new File(['a'], 'a.txt');
      const b = new File(['b'], 'b.txt');
      const c = new File(['c'], 'c.txt');
      const inner = {
        ...dirEntry([fileEntry(c, '/docs/inner/c.txt')]),
        fullPath: '/docs/inner',
      };
      const dt = transfer([
        {
          entry: dirEntry([
            fileEntry(a, '/docs/a.txt'),
            fileEntry(b, '/docs/b.txt'),
            inner,
          ]),
          file: null,
        },
      ]);
      const files = await readDroppedFiles(dt, { directory: true });
      expect(files.map((f) => f.webkitRelativePath).sort()).toEqual([
        'docs/a.txt',
        'docs/b.txt',
        'docs/inner/c.txt',
      ]);
    });
  });
});
