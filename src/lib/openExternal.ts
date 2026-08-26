/**
 * Opens an external URL reliably in every environment.
 *
 * In the packaged Tauri app, window.open is blocked by the webview (the popup
 * is refused), so we use the Tauri `opener` plugin to hand the URL to the OS
 * default browser. In a normal web browser we use window.open, falling back to
 * copying the URL to the clipboard if a popup blocker stops it.
 */
function isTauri(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch {
      // Fall through to the web path if the plugin isn't available.
    }
  }

  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (win) return;

  try {
    await navigator.clipboard.writeText(url);
    alert(`Couldn't open a browser window automatically. The link was copied to your clipboard — paste it into a browser:\n\n${url}`);
  } catch {
    alert(`Open this link in your browser:\n\n${url}`);
  }
}
