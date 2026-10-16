# AI TextSense (v2.2.0)

**Forensic analysis and sanitization of AI-generated text — prompt injections, statistical watermarks, LLM stylometric fingerprints, Unicode steganography.**

Developed by **Wilson Volpe** (© 2026 SafeTrack / Wilson Volpe. All rights reserved).

Repository: [SafeTrackHSE/AITextSense](https://github.com/SafeTrackHSE/AITextSense)

---

## Capabilities Overview

AI TextSense is a dual-domain forensic workstation organized into two core disciplines:

### 1. AI Safety & Threat Defense (Detect & Remove)
| Vector | Forensic Method & Capabilities |
|---|---|
| **Prompt Injection & ASCII Smuggling** | Decodes high-plane Tag characters (`U+E0000`–`U+E007F` ASCII smuggling), zero-width covert bitstreams, Bidi Trojan Source reversals (`U+202E`), and soft-hyphen keyword fragmentation. |
| **Invisible Unicode & Steganography** | Zero-width spaces (`U+200B`, `U+200C`, `U+200D`, `U+FEFF`, `U+2060`), variation selectors, and hidden metadata payloads. |
| **Homoglyph & Mixed-Script Attacks** | Cyrillic and Greek lookalikes substituting Latin characters with automated normalization. |
| **One-Click Neutralization & Unmasker** | Reversibly strip covert payload tokens or reveal hidden instructions as visible bracketed text. |
| **Payload & Threat Analysis** | Unconditional scan for dangerous code/commands — recursive Base64/hex/ROT13/percent decoding, categorized static rule library (destructive filesystem, C2/reverse-shell, credential harvesting, persistence, obfuscation), and an optional AI capability-review pass for novel payloads. Every finding carries a full forensic explanation (mechanism, targets, consequence, mitigation), independent of any jailbreak-intent judgment. |

### 2. AI Artifacts & Forensics (Detect & Neutralize)
| Signal | Forensic Method & Capabilities |
|---|---|
| **Statistical LLM Watermarks** | Kirchenbauer green-list detection across 216 combinations of hash keys, window sizes ($h \in \{1,2,4,8\}$), and gamma fractions ($\gamma \in \{0.25, 0.5\}$) with Bonferroni correction. |
| **Window-Aware Targeted Suppression** | Surgically edits high marginal-$\Delta z$ words with minimal semantic distortion. |
| **LLM Stylometric Footprint** | Profiles sentence length burstiness, sliding-window perplexity uniformity, hedging phrases, and AI-favored template boilerplate. |
| **Adversarial Optimizer** | Closed-loop simulated annealing over edit operations, constrained by Jaccard semantic floors ($\ge 82\%$). |
| **LM Perplexity Scoring** | On-device causal neural LM (GPT-2 class WebGPU/WASM) comparing sliding-window NLL against human baseline distributions ($\mu \approx 3.85, \sigma \approx 0.62$). |

---

## Portable Desktop Release (Windows x64)

AI TextSense is available as a **standalone portable Windows application** with zero external dependencies:

- **Package**: `AITextSense-v2.1.0-Windows-x64-Portable.zip`
- **Binary**: `AI TextSense.exe` (17.4 MB standalone executable)
- **Requirements**: Windows 10/11 (64-bit). Uses the built-in Microsoft Edge WebView2 runtime.
- **Privacy**: Runs 100% locally. In Offline mode and On-Device model mode, zero text or telemetry leaves your machine.

---

## Developer Setup & Local Build

### Prerequisites
- Node.js 18+
- npm 9+
- Rust toolchain (optional, only needed for compiling desktop Tauri binaries)

### 1. Clone & Install
```bash
git clone https://github.com/SafeTrackHSE/AITextSense.git
cd AITextSense
npm install
```

### 2. Run Web Development Server
```bash
npm run dev
```
Opens in your browser at `http://localhost:5173`.

### 3. Run Test Suite
```bash
npm test
```
Executes all 129 automated unit tests across scanner, injection, watermark, footprint, rewrite, export, and v2 engines.

### 4. Build Production Web Bundle
```bash
npm run build
```
Generates production assets in `dist/`.

### 5. Build Portable Desktop App (Tauri)
```bash
npm run tauri:build -- --no-bundle
```
Outputs the compiled release binary to:
`src-tauri/target/x86_64-pc-windows-msvc/release/aitextsense.exe`

---

## License & Copyright

© 2026 **Wilson Volpe** / **SafeTrack**. All rights reserved.
Unlicensed proprietary software.
