/// <reference types="vite/client" />

/** Injected at build time from package.json's "version" field — see vite.config.ts / vitest.config.ts. */
declare const __APP_VERSION__: string;

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}
