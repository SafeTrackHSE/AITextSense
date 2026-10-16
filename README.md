# AI TextSense (v3.0.0)

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/SafeTrackHSE/AITextSense/releases/tag/v3.0.0)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64%20(Portable%20%2B%20Installer)-darkgreen.svg)](https://github.com/SafeTrackHSE/AITextSense/releases)
[![Tests](https://img.shields.io/badge/tests-224%20passed-brightgreen.svg)]()
[![Engine](https://img.shields.io/badge/runtime-Tauri%20v2%20%7C%20React%2018%20%7C%20Transformers.js%20v4%20(WebGPU%2FWASM)-purple.svg)]()
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)

**Forensic Text, Prompt Injection, Steganography, Statistical Watermark & Plagiarism Analysis Workstation.**

Developed by **Wilson Volpe** (© 2026 SafeTrack / Wilson Volpe. All rights reserved).  
Repository: [SafeTrackHSE/AITextSense](https://github.com/SafeTrackHSE/AITextSense)

---

## Overview

**AI TextSense v3.0.0** is an enterprise-grade desktop forensic workstation purpose-built for security auditors, forensic analysts, researchers, and content integrity engineers. It provides zero-compromise static and neural inspection across hidden Unicode payloads, prompt injection attacks, malicious code/C2 threats, statistical LLM watermarks, stylometric AI fingerprints, and cross-document plagiarism.

Operating under a strict **Zero-Data-Exfiltration architecture**, AI TextSense executes all deep forensic models locally via **WebGPU and WASM SIMD**, guaranteeing that proprietary documents, sensitive prompts, and forensic evidence remain 100% on-device.

---

## Flagship Features in v3.0.0

### 1. Unified Overview Dashboard & Threat Posture
- **1-Click "Scan All Vectors"**: Simultaneously dispatches text through all forensic engines (Unicode Scanner, Injection Heuristics, Threat Detector, Statistical Watermarking, 4-Layer Stylometrics, and Plagiarism Analysis).
- **4 Animated SVG Radial Gauges**:
  - `Security & Threat Safety` (Injections, malicious shellcode, C2 signatures, exfiltration)
  - `AI & Watermark Cleanliness` (Kirchenbauer statistical z-scores, perplexity distribution)
  - `Originality & Style Consistency` (Shingle overlap, semantic paraphrase, intrinsic variance)
  - `Unicode Hygiene` (Steganography, zero-width tags, homoglyphs, bidi overrides)
- **5-Axis SVG Forensic Radar Chart**: Live visual fingerprint depicting Steganography, Injections/Threats, Watermark/Perplexity, Stylometrics, and Plagiarism.
- **1-Click Quick-Fix Cards**: Instant contextual remediation actions (Sanitize Unicode, Neutralize Injections, Scrub Fingerprints, Suppress Watermarks) rendered directly on the dashboard.

### 2. 3-Pillar Grouped Navigation Architecture
- **Overview**: Global posture, radar telemetry, aggregate risk index, and quick-action cards.
- **Security & Integrity**:
  - `Scanner`: High-plane ASCII tags (`U+E0000`–`U+E007F`), invisible zero-width characters, homoglyphs/mixed scripts, and Bidi Trojan Source reversals (`U+202E`).
  - `Injection`: Structural prompt injection heuristics, delimiter breaking, role escalation, and covert instruction unmasking.
  - `Threat`: Unconditional multi-layer decoding (Base64, Hex, ROT13, URL), destructive system commands, C2 callback signatures, credential harvesting, persistence mechanisms, and local LLM-assisted capability verification.
- **AI & Watermarks**:
  - `Watermark`: Kirchenbauer green-list watermark detection across 216 parameter spaces ($h \in \{1,2,4,8\}$, $\gamma \in \{0.25, 0.5\}$) with Bonferroni correction and surgical window-aware suppression.
  - `Footprint`: Explicit 4-Layer AI Fingerprint Removal Suite.
  - `Optimizer`: Closed-loop simulated annealing over edit operations, constrained by semantic Jaccard floors ($\ge 82\%$).
- **Originality & Reports**:
  - `Plagiarism`: 4-Mode Plagiarism & Originality Suite (Shingling, Neural Semantics, Intrinsic Style-Shift, Academic APIs).
  - `Report`: Executive summary generation with interactive visualizations and multi-format exports.

---

## Core Forensic Engines

### A. Explicit 4-Layer AI Fingerprint Removal Suite (`src/core/footprint/`)
Unlike naive word replacers, TextSense v3.0 implements an isolated 4-stage pipeline that eliminates AI stylometric tells without corrupting technical syntax or introducing circular buzzwords:
1. **Layer 1: Lexical LLM Buzzword Rotation**:
   - Replaces dead giveaways (`delve`, `utilize`, `testament`, `beacon`, `pivotal`, `tapestry`, `underscores`, `foster`, `multifaceted`).
   - Pure human replacement dictionary verified to contain **0 self-sabotaging LLM-favored words** in target sets.
2. **Layer 2: Hedging & Formulaic Template Rewriting**:
   - Detects and restructures formulaic LLM transitions (`"It is worth noting that"`, `"In summary"`, `"plays a crucial role"`, `"It is important to remember"`).
3. **Layer 3: Typographic & Punctuation Tell Normalization**:
   - Standardizes AI typographic quirks: converts em-dashes (`—`) to contextual punctuation, normalizes smart quotes (`“”‘’`) and ellipses (`…`), restructures repetitive markdown bold-colon lists (`- **Term**: Definition`), and strips non-breaking space variants (`U+00A0`, `U+202F`).
4. **Layer 4: Burstiness & Rhythm Equalization**:
   - Analyzes coefficient of variation in sentence lengths.
   - Highlights uniform sentence clusters on a **Sentence-by-Sentence Risk Heatmap**.
   - Preserves protected spans: fenced code blocks (```python```, ```json```, etc.), inline code (`` `code` ``), and valid URLs (`http://`, `https://`) are strictly masked and protected from modification.

### B. Attack Vector & Risk Explainer + Kill-Chain Correlation (`src/core/security/explainer.ts`)
- **Structured Briefing (`AttackVectorBriefing`)**:
  - Every detected anomaly across Scanner, Injection, and Threat engines provides an unambiguous briefing:
    - **Vector Name & Discipline**
    - **Mechanism**: How the attack operates technically.
    - **Consequence / Targets**: What systems or models are affected.
    - **Overall Risk & Severity**: Quantitative score and standard categorization (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
    - **Actionable Mitigation**: Exact remediation steps.
- **Cross-Engine Kill-Chain Synthesis (`THR-CHAIN-*`)**:
  - Correlates multi-stage attacks across isolated tabs, e.g.:
    - `THR-CHAIN-INJ-EXFIL`: Prompt Injection + Network C2 Exfiltration
    - `THR-CHAIN-STEG-INJ`: Unicode ASCII Tag Smuggling + Role Override Injection
    - `THR-CHAIN-CRED-PERSIST`: Credential Harvesting + Windows/Linux Persistence Execution

### C. 4-Mode Plagiarism & Originality Suite (`src/core/plagiarism/`)
- **Mode 1: 1-to-N Reference Document Shingling**:
  - Multi-document comparison via 4-gram and 5-gram Winnowing algorithms, MinHash hashing, and Jaccard coefficient scoring.
- **Mode 2: Semantic Paraphrase Detection**:
  - Two-stage pipeline: Fast TF-IDF heuristic pre-filter followed by on-device transformer embeddings (`Xenova/all-MiniLM-L6-v2`) computing cosine similarity across sentences to catch rewritten plagiarism.
- **Mode 3: Zero-Reference Intrinsic Style-Shift & Anomaly Detection**:
  - Operates without reference documents to detect "patchwriting".
  - Computes per-paragraph stylometric metrics (sentence length variance, punctuation entropy, vocabulary richness). Highlights sections with standard score deviation $|z| > 2.0$.
  - Detects internal near-duplicate paragraphs and orphan citation markers (`[1]`, `(Smith et al., 2024)`) missing from bibliography.
- **Mode 4: Online Web & Academic Verification**:
  - Live verification against CrossRef DOI academic registry and Wikipedia APIs for suspicious factual claims and unattributed passages.
  - Features strict **Offline Mode** toggle to prevent network access when auditing air-gapped text.

### D. Upgraded Local AI Models Hub (`@huggingface/transformers` v4)
Accelerated via **WebGPU** with automated fallback to **WASM SIMD**:
| Model ID | Pipeline Task | Architectural Role in TextSense |
|---|---|---|
| `onnx-community/SmolLM2-360M-Instruct-ONNX` | `text-generation` | On-device Q4 ChatML model for structured JSON security analysis & explanation |
| `onnx-community/Qwen2.5-0.5B-Instruct` | `text-generation` | Ultra-compact Q4 Instruct model for injection analysis and semantic auditing |
| `Xenova/LaMini-Flan-T5-77M` | `text2text-generation` | Fast deterministic text rewriting & stylometric de-biasing |
| `Xenova/LaMini-Flan-T5-248M` | `text2text-generation` | High-fidelity local neural text restructuring |
| `onnx-community/SmolLM2-135M-ONNX` | `text-generation` | Lightweight causal LM for perplexity calculation |
| `Xenova/gpt2` | `text-generation` | Baseline causal LM for sliding-window log-likelihood perplexity scoring |
| `Xenova/all-MiniLM-L6-v2` | `feature-extraction` | 384-dimensional sentence transformer for neural semantic similarity |

---

## Executive Reporting & Usability

- **Multi-Format Report Generation**:
  - **PDF Export**: Clean executive format featuring vector summary tables, risk score breakdowns, and SVG gauge visual embeds.
  - **DOCX Export**: Structured Microsoft Word report with full forensic breakdowns.
  - **CSV & JSON**: Machine-readable dumps for SIEM ingestion and SOC audit pipelines.
- **Global Multi-Step Mutation History**:
  - Full transactional `Undo`, `Redo`, and `Revert to Original` support across all text sanitation and suppression operations.
- **5-Language UI & Interactive Glossary**:
  - Full native localization in **English (EN)**, **Spanish (ES)**, **French (FR)**, **Portuguese (PT-BR)**, and **Italian (IT)**.
  - Interactive Forensic Glossary explaining 40+ security concepts (Bidi Trojan Source, High-Plane Tag Smuggling, Kirchenbauer Watermarking, Winnowing, etc.).

---

## Production Release Artifacts (v3.0.0)

Official Windows x64 binaries built for production with Tauri v2 and MSVC toolchain:

| Artifact | Type | File Size | SHA-256 Checksum |
|---|---|---|---|
| **`AITextSense_v3.0.0_Portable.exe`** | Standalone Portable Executable | 17.97 MB (18,843,648 bytes) | `FFAE00301137F1604B9BB3D138C871CCFC56C99E4DD30AEAC38E4758783900BE` |
| **`AI TextSense_3.0.0_x64-setup.exe`** | NSIS Desktop Setup Installer | 11.50 MB (12,063,842 bytes) | `4795F0F5738BF347E3A99A500189B7A4ABC78349850D974CBB2729C3F18B0795` |
| **`AI TextSense_3.0.0_x64_en-US.msi`** | MSI Enterprise Windows Installer | 12.40 MB (13,000,704 bytes) | `ECE499C4CE55B559FA796AE8163AEA792772CFA849AF67962D3EA3653291C506` |

> [!NOTE]
> Standalone portable binaries do not require installation or administrator rights. Windows 10/11 includes the Microsoft Edge WebView2 runtime by default.

---

## Developer Setup & Build Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Rust**: 1.77+ with `x86_64-pc-windows-msvc` target (for compiling desktop binaries)
- **C++ Build Tools**: Visual Studio Build Tools with C++ workload (for Windows compilation)

### 1. Clone & Install
```bash
git clone https://github.com/SafeTrackHSE/AITextSense.git
cd AITextSense
npm install
```

### 2. Run Test Suite
```bash
npm run test
```
Executes all **224 automated unit and integration tests** across all 16 test suites.

### 3. Run Development Server
```bash
# Web browser mode (localhost:5173)
npm run dev

# Native Tauri desktop development window
npm run tauri:dev
```

### 4. Build Production Web Bundle
```bash
npm run build
```
Typechecks via `tsc -b` and bundles optimized assets into `dist/`.

### 5. Build Desktop Installers & Portable Binary
```bash
npm run tauri:build
```
Builds the release executable and bundles installers into:
- Executable: `src-tauri/target/x86_64-pc-windows-msvc/release/aitextsense.exe`
- NSIS Setup: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/AI TextSense_3.0.0_x64-setup.exe`
- MSI Setup: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/AI TextSense_3.0.0_x64_en-US.msi`

---

## License & Copyright

© 2026 **Wilson Volpe** / **SafeTrack**. All rights reserved.  
Unlicensed proprietary software.
