// lib/library/file-kind.test.ts
// A file is what its first bytes say, never what its name says. C-3's upload reuses this check.

import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES } from './constants';
import { checkSourceFile, detectFileKind } from './file-kind';

const bytes = (...values: number[]) => new Uint8Array([...values, 0, 0, 0, 0, 0, 0, 0, 0]);
const ascii = (text: string) => new TextEncoder().encode(text);

describe('detectFileKind', () => {
  it('recognizes a PDF, a JPG, a PNG and a WebP', () => {
    expect(detectFileKind(ascii('%PDF-1.7\n%âãÏÓ'))).toEqual({ kind: 'PDF', mimeType: 'application/pdf' });
    expect(detectFileKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ kind: 'IMAGE', mimeType: 'image/jpeg' });
    expect(detectFileKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({
      kind: 'IMAGE',
      mimeType: 'image/png',
    });
    expect(detectFileKind(ascii('RIFF\u0000\u0000\u0000\u0000WEBPVP8 '))).toEqual({
      kind: 'IMAGE',
      mimeType: 'image/webp',
    });
  });

  it('rejects anything else, including a renamed file', () => {
    // A text file saved as datasheet.pdf: the name is never read
    expect(detectFileKind(ascii('Datasheet: CAVE 03, 3W'))).toBeNull();
    expect(detectFileKind(ascii('GIF89a......'))).toBeNull();
    expect(detectFileKind(ascii('RIFF\u0000\u0000\u0000\u0000WAVEfmt '))).toBeNull();
    expect(detectFileKind(bytes(0x89, 0x50, 0x4e))).toBeNull();
    expect(detectFileKind(new Uint8Array())).toBeNull();
  });
});

describe('checkSourceFile', () => {
  it('accepts a supported file within its limit', () => {
    expect(checkSourceFile(ascii('%PDF-1.4 small'))).toEqual({
      ok: true,
      file: { kind: 'PDF', mimeType: 'application/pdf' },
    });
  });

  it('refuses an unsupported file, and one over its limit', () => {
    expect(checkSourceFile(ascii('hello'))).toEqual({ ok: false, error: 'UNSUPPORTED_FILE' });

    const bigPdf = new Uint8Array(MAX_PDF_BYTES + 1);
    bigPdf.set(ascii('%PDF-'));
    expect(checkSourceFile(bigPdf)).toEqual({ ok: false, error: 'FILE_TOO_LARGE' });

    const bigJpg = new Uint8Array(MAX_IMAGE_BYTES + 1);
    bigJpg.set([0xff, 0xd8, 0xff]);
    expect(checkSourceFile(bigJpg)).toEqual({ ok: false, error: 'FILE_TOO_LARGE' });
  });
});
