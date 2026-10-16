# Contributing to AI TextSense

Thank you for your interest in contributing to AI TextSense! We welcome contributions that improve text forensics, threat intelligence signatures, steganographic detection, and multi-language support.

## Code of Conduct & Principles

1. **Air-Gapped & Privacy Preserving**: Features must respect offline-by-default execution. No feature may silently leak user text or telemetry to remote networks.
2. **Defensive Grounding**: AI TextSense is built for security analysts, writers, and educators to detect and defang prompt injections, malware payloads, and covert text tells.
3. **Transparent & Tested**: All new signatures and feature additions must include unit tests under `test/` verifying zero regressions.

## Development Setup

1. **Prerequisites**:
   - Node.js ≥ 20.x and npm
   - Rust ≥ 1.78+ (`rustup`)
   - Windows (MSVC), Linux (`webkit2gtk-4.1`), or macOS

2. **Install & Run**:
   ```bash
   git clone https://github.com/SafeTrackHSE/AITextSense.git
   cd AITEXTSense
   npm install
   npm run dev       # Starts Vite dev preview
   npm run tauri:dev # Starts native Tauri desktop app
   ```

3. **Running Verification Tests**:
   ```bash
   npm test          # Runs all Vitest suites
   npx tsc -b        # Type-checks the entire TypeScript codebase
   ```

## Pull Request Guidelines

- Branch off `main` with a descriptive name (e.g. `feat/new-threat-signature` or `fix/unicode-offset`).
- Ensure all tests pass (`npm test`) and TypeScript compiles (`npx tsc -b`).
- Submit your pull request with a concise description of the motivation, changes, and verification evidence.

## License

By contributing to AI TextSense, you agree that your contributions will be licensed under the **Apache License, Version 2.0**.

