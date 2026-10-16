// @vitest-environment jsdom
// (exportHtml sanitizes via DOMPurify, which requires a DOM)
import { describe, it, expect, beforeAll } from 'vitest';
import { toPlainText, exportDocx, exportHtml, exportMarkdown, exportPlainText } from '../src/core/export/document';

// jsdom doesn't implement the blob-download plumbing file-saver relies on; stub it
// so the export functions can run to completion (we're testing content, not the save).
beforeAll(() => {
  const u = URL as unknown as { createObjectURL: (b: unknown) => string; revokeObjectURL: (s: string) => void };
  u.createObjectURL = () => 'blob:mock';
  u.revokeObjectURL = () => {};
});

const MD = `# Title

This is **bold** and *italic* text.

- first bullet
- second bullet

1. step one
2. step two`;

describe('export/document', () => {
  it('strips markdown to plain text', () => {
    const txt = toPlainText(MD);
    expect(txt).not.toContain('**');
    expect(txt).not.toContain('# ');
    expect(txt).toContain('bold');
    expect(txt).toContain('• first bullet');
  });

  it('builds a DOCX blob without throwing', async () => {
    await expect(exportDocx(MD, 'test.docx')).resolves.toBeUndefined();
  });

  it('builds HTML/Markdown/Text without throwing', async () => {
    await expect(Promise.resolve(exportHtml(MD))).resolves.toBeUndefined();
    expect(() => exportMarkdown(MD)).not.toThrow();
    expect(() => exportPlainText(MD)).not.toThrow();
  });
});
