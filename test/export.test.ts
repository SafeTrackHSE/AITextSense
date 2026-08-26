import { describe, it, expect } from 'vitest';
import { toPlainText, exportDocx, exportHtml, exportMarkdown, exportPlainText } from '../src/core/export/document';

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
