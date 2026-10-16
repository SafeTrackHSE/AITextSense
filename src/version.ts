/**
 * Single source of truth for the app's identity strings. The version number
 * itself comes from package.json (injected at build time — see vite.config.ts);
 * everything else here is derived once so it never drifts across the report
 * exporter, the About tab, and any future surface, the way the pre-v2.2
 * literals did (found in at least 6 separate places during the v2.2 audit).
 */
export const APP_VERSION = __APP_VERSION__;
export const APP_NAME = 'AI TextSense';
export const APP_TAGLINE = 'Forensic Text & Prompt Injection Inspector';
export const APP_AUTHOR = 'Wilson Volpe';
export const APP_COPYRIGHT = `© 2026 ${APP_AUTHOR}. All rights reserved.`;
export const APP_APPLICATION_LABEL = `${APP_NAME} v${APP_VERSION} — ${APP_TAGLINE}`;
export const APP_LICENSE_LABEL = `Proprietary — ${APP_COPYRIGHT}`;
