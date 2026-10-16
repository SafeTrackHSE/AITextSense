<p align="center">
  <img src="src/assets/AITextSense_Horizontal.png" alt="AI TextSense Logo Banner" width="620"/>
</p>

<p align="center">
  <strong>Multi-Platform Forensic Text, Prompt Injection, Steganography, Statistical Watermark & Plagiarism Analysis Workstation.</strong><br/>
  <em>Zero-compromise static and neural document inspection with 100% on-device privacy. Licensed under Apache-2.0.</em>
</p>

<p align="center">
  <a href="https://github.com/SafeTrackHSE/AITextSense/releases/tag/v3.0.0"><img src="https://img.shields.io/badge/version-3.0.0-blue.svg?style=flat-square" alt="Version 3.0.0"/></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS%20%7C%20Web-darkgreen.svg?style=flat-square" alt="Multi-Platform"/>
  <img src="https://img.shields.io/badge/tests-226%20passed-brightgreen.svg?style=flat-square" alt="226 Tests Passed"/>
  <img src="https://img.shields.io/badge/runtime-Tauri%20v2%20%7C%20React%2018%20%7C%20Transformers.js%20v4-purple.svg?style=flat-square" alt="Runtime"/>
  <img src="https://img.shields.io/badge/privacy-100%25%20Air--Gapped%20Capable-success.svg?style=flat-square" alt="Air Gapped Privacy"/>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg?style=flat-square" alt="Apache 2.0 License"/></a>
</p>

<p align="center">
  <strong>Language / Idioma / Langue / Lingua:</strong><br/>
  <a href="#-about-ai-textsense--core-purpose">🇬🇧 English</a> •
  <a href="#-español-acerca-de-ai-textsense-y-propósito">🇪🇸 Español</a> •
  <a href="#-français-À-propos-dai-textsense-et-objectifs">🇫🇷 Français</a> •
  <a href="#-português-sobre-o-ai-textsense-e-propósito">🇧🇷 Português</a> •
  <a href="#-italiano-su-ai-textsense-e-scopo">🇮🇹 Italiano</a>
</p>

---

## 💻 Multi-Platform Installation & Download Guide

AI TextSense v3.0.0 is packaged natively across all major desktop and server operating systems:

### 1. 🪟 Windows (10 / 11 x64)
- **Standalone Portable Executable (`.exe`)**: No installation or administrative privileges needed. Download `AITextSense_v3.0.0_Portable.exe` and double-click to launch immediately. Uses system WebView2.
- **NSIS Desktop Setup (`.exe`)**: Full guided installation wizard with start menu and desktop shortcuts: `AI TextSense_3.0.0_x64-setup.exe`.
- **MSI Enterprise Installer (`.msi`)**: Silent deployment package for corporate environments and MDM solutions: `AI TextSense_3.0.0_x64_en-US.msi`.

### 2. 🐧 Linux (Ubuntu, Debian, Fedora, Arch, RHEL)
- **Universal AppImage (`.AppImage`)**: Self-contained single-file executable for any modern 64-bit Linux distribution:
  ```bash
  chmod +x AI_TextSense_3.0.0_amd64.AppImage
  ./AI_TextSense_3.0.0_amd64.AppImage
  ```
- **Debian / Ubuntu Package (`.deb`)**:
  ```bash
  sudo dpkg -i ai-textsense_3.0.0_amd64.deb
  sudo apt-get install -f
  ```

### 3. 🍏 macOS (macOS 12 Monterey, 13 Ventura, 14 Sonoma, 15 Sequoia)
- **Universal Apple Disk Image (`.dmg`)**: Supports both Apple Silicon (M1/M2/M3/M4) and Intel (x86_64) Macs natively. Drag and drop `AI TextSense.app` into your Applications folder.

### 4. 🌐 Web & Air-Gapped Intranet Deployment
- **Static Web Distribution**:
  ```bash
  git clone https://github.com/SafeTrackHSE/AITextSense.git
  cd AITEXTSense
  npm install
  npm run build
  npm run preview # Serves at http://localhost:5173
  ```

---

## 🇬🇧 About AI TextSense & Core Purpose

### What is AI TextSense?
**AI TextSense v3.0.0** is an enterprise-grade forensic document workstation and prompt integrity engine built for security analysts, researchers, software engineers, and professional writers. Running natively as an ultra-fast, air-gapped desktop application (via **Tauri v2** and **Rust**), it provides multi-dimensional static, statistical, and neural inspection of digital documents, clipboard content, and LLM inputs.

### The Modern Crisis of Digital Text
In the era of ubiquitous generative AI, digital text is no longer passive data:
1. **Invisible Prompt Injections & Context Hijacking**: Malicious jailbreaks and prompt override payloads hidden within shared documentation, RAG data sources, or user inputs can silently hijack downstream LLMs, force delimiter breakouts, or exfiltrate sensitive data.
2. **Trojan Source & Steganographic Exploits**: Bidirectional Unicode overrides (`U+202E`), zero-width space steganography (`U+200B`–`U+FEFF`), high-plane tag smuggling (`U+E0000`–`U+E007F`), and encoded PowerShell cradle commands that look innocent to human eyes while executing maliciously in terminals.
3. **Statistical Token Watermarking**: Generative AI providers bias token selections using pseudo-random green-list partitions ($z$-scores), embedding statistical watermarks into generated text that reveal synthetic origin and compromise user confidentiality.
4. **Robotic AI Tells & Formulaic Phrasing**: Uniform burstiness, predictable sentence lengths, repetitive transitional crutches (`delve`, `tapestry`, `beacon`, `multifaceted`), and non-standard typographic artifacts that undermine writing authority.
5. **Mosaic Patchwriting & Semantic Plagiarism**: Rephrased text and uncredited intellectual theft designed to evade keyword searches through structural rearrangement and synonymous substitution.

---

## 🇪🇸 Español: Acerca de AI TextSense y Propósito

**AI TextSense v3.0.0** es una estación de trabajo forense de documentos e integridad de prompts de nivel empresarial, diseñada para analistas de ciberseguridad, investigadores, ingenieros de software y redactores profesionales. Funciona como una aplicación de escritorio nativa ultrarrápida y 100% aislada (**Air-Gapped**) mediante **Tauri v2** y **Rust**.

### Capacidades Principales:
- **Defensa contra Inyecciones de Prompts**: Desactiva intentos de evasión, fugas de delimitadores e instrucciones ocultas en flujos RAG.
- **Higiene Unicode y Detección Esteganográfica**: Desenmascara caracteres de ancho cero, etiquetas ASCII de plano alto y trucos Bidi Trojan Source.
- **Eliminación Quirúrgica de Huellas de IA en 4 Capas**: Sustitución léxica sin términos circulares, eliminación de evasivas, normalización tipográfica (guiones em, comillas tipográficas, espacios duros) y balance de ritmo de oraciones, protegiendo bloques de código y URLs.
- **Detección de Marcas de Agua Estadísticas**: Algoritmo de Kirchenbauer ($z$-score) con neutralización automática sin pérdida de significado.
- **Suíte de Plagio en 4 Modos**: Comparación por shingles (Winnowing 5-gram), paráfrasis semántica neural (`all-MiniLM-L6-v2`), cambio de estilo intrínseco (MAD $|z| > 2.0$) y verificación académica en vivo (CrossRef DOI / Wikipedia).

---

## 🇫🇷 Français : À Propos d'AI TextSense et Objectifs

**AI TextSense v3.0.0** est une station d'analyse criminalistique textuelle et d'intégrité de requêtes (prompts) de classe entreprise, conçue pour les experts en cybersécurité, chercheurs, ingénieurs et créateurs de contenu. Conçue pour fonctionner de manière totalement autonome et confidentielle (**100% Air-Gapped**) sur votre appareil grâce à **Tauri v2** et **Rust**.

### Points Clés :
- **Neutralisation des Injections de Prompts** : Détecte et neutralise les détournements de contexte, jailbreaks et attaques par injection indirecte dans les pipelines RAG.
- **Détection Stéganographique et Hygiène Unicode** : Révèle les caractères invisibles à largeur nulle, les balises de plan supérieur (`U+E0000`) et les inversions Bidi malveillantes.
- **Suppression d'Empreinte IA en 4 Niveaux** : Rotation de vocabulaire sans termes d'IA, élimination des formules d'hésitation, normalisation typographique et rééquilibrage de la variance des phrases avec protection absolue des blocs de code et URLs.
- **Analyse de Filigranes Statistiques** : Évaluation du $z$-score (modèle Kirchenbauer) et neutralisation automatisée.
- **Suite Anti-Plagiat à 4 Modes** : Empreintes de Winnowing 5-grammes, similarité sémantique neuronale dense, détection de rupture de style intrinsèque et requêtes académiques CrossRef/Wikipédia.

---

## 🇧🇷 Português: Sobre o AI TextSense e Propósito

O **AI TextSense v3.0.0** é uma estação de trabalho forense de integridade documental e defesa contra injeções de prompt de nível corporativo, desenvolvida para analistas de segurança, pesquisadores, desenvolvedores e escritores. Opera de forma 100% nativa, privada e isolada da internet (**Air-Gapped**) através de **Tauri v2** e **Rust**.

### Principais Benefícios:
- **Defesa Cibernética e Injeção de Prompts**: Detecta comandos maliciosos embutidos, payloads PowerShell codificados em Base64/UTF-16LE e quebras de contexto em sistemas RAG e LLMs.
- **Higiene Unicode e Esteganografia**: Desmascara caracteres invisíveis de largura zero (`U+200B`), stego em seletores de variação e manipulações de direção de texto (Trojan Source Bidi).
- **Remoção de Pegadas de IA em 4 Camadas**: Eliminação de clichês robóticos (`delve`, `tapestry`, `beacon`), remoção de frases evasivas, normalização de travessões/aspas inteligentes e variedade de ritmo frasal, preservando integralmente blocos de código e links.
- **Detecção de Marca d'Água Estatística**: Análise de partição de tokens verdes (Kirchenbauer $z$-score) com neutralização automática.
- **Suíte de Plágio e Originalidade em 4 Modos**: Comparação com cofre de documentos (Winnowing 5-gram), paráfrase semântica neural (`all-MiniLM-L6-v2`), desvios estilométricos intrínsecos e validação acadêmica CrossRef DOI / Wikipédia.

---

## 🇮🇹 Italiano: Su AI TextSense e Scopo

**AI TextSense v3.0.0** è una workstation forense di analisi testuale e integrità dei prompt di livello enterprise, progettata per analisti di sicurezza, ricercatori, sviluppatori e redattori. Funziona nativamente come applicazione desktop ultraveloce e completamente isolata (**Air-Gapped**) basata su **Tauri v2** e **Rust**.

### Caratteristiche Principali:
- **Difesa da Prompt Injection**: Neutralizza tentativi di jailbreak, override di istruzioni e payload nascosti in contesti RAG.
- **Igiene Unicode e Steganografia**: Rileva caratteri a larghezza zero, tag ASCII di piano superiore e inversioni Bidi.
- **Rimozione Impronte IA in 4 Livelli**: Sostituzione di parole cliché senza termini circolari, rimozione di formule esitanti, normalizzazione tipografica e bilanciamento del ritmo delle frasi, salvaguardando codice e URL.
- **Riconoscimento Filigrane Statistiche**: Calcolo dello $z$-score di Kirchenbauer e neutralizzazione automatica.
- **Suite Antiplagio a 4 Modalità**: Algoritmo Winnowing a 5-grammi, parafrasi semantica neurale, rilevamento salti di stile intrinseci e verifica fonti accademiche CrossRef/Wikipedia.

---

## 🏛️ Technical Architecture & System Specifications

```mermaid
flowchart TD
    subgraph UI ["User Interface (React 18 + Tailwind + Tauri v2)"]
        A["Document Input & Reference Vault"] --> B["3-Pillar Grouped Navigation"]
        B --> C1["Pillar 1: Overview Command Center\n(4 Radial Gauges · 5-Axis Radar · Quick-Fix Remediation)"]
        B --> C2["Pillar 2: Security & Integrity\n(Scanner · Injection Defense · Threat Kill-Chain)"]
        B --> C3["Pillar 3: AI & Watermarks\n(Statistical Watermarks · 4-Layer Humanizer · Optimizer)"]
        B --> C4["Pillar 4: Originality & Synthesis\n(4-Mode Plagiarism Suite · Executive Reports)"]
    end

    subgraph Core ["8 Specialized Forensic Engines"]
        E1["1. Unicode Hygiene & Steganography Engine"]
        E2["2. Prompt Injection & Heuristic Defense Engine"]
        E3["3. Multi-Stage Threat & Kill-Chain Correlator"]
        E4["4. Kirchenbauer Statistical Watermark Engine"]
        E5["5. 4-Layer Stylometric Humanization Engine"]
        E6["6. Closed-Loop Simulated Annealing Optimizer"]
        E7["7. 4-Mode Multi-Document Plagiarism Suite"]
        E8["8. Multi-Format Executive Forensic Reporting"]
    end

    subgraph Tiers ["Multi-Tier Inference Runtimes"]
        R1["Deterministic Static Rules\n(Regex, Trie, Shannon Entropy, MAD)"]
        R2["On-Device Neural AI\n(Transformers.js v4 · WebGPU / WASM SIMD)"]
        R3["Local Inference Daemon\n(LM Studio · Ollama · vLLM · Native Sockets)"]
        R4["Free Online AI Providers\n(OpenCode Zen · Pollinations · OpenRouter Free · Groq)"]
    end

    A --> Core
    Core --> Tiers
    Core --> UI
```

---

## 🔬 Deep Technical & Mathematical Foundations

### 1. Kirchenbauer Statistical Watermark Detection ($z$-Score)
AI TextSense computes token transition green-list biases under the null hypothesis $H_0$ that the document was authored without algorithmic watermarking:

$$z = \frac{|G| - \gamma T}{\sqrt{T \gamma (1 - \gamma)}}$$

Where $|G|$ is the count of tokens falling into the pseudo-random green list, $\gamma$ is the green list partition ratio (typically $0.5$ or $0.25$), and $T$ is the total token count. Signals with $z \ge 4.0$ indicate synthetic origin with $p < 3.17 \times 10^{-5}$.

### 2. Multi-Mode Plagiarism Jaccard Similarity
Document overlap is computed via $k$-gram shingling and Winnowing hash signatures:

$$J(A, B) = \frac{|S(A) \cap S(B)|}{|S(A) \cup S(B)|} = \frac{|W(A) \cap W(B)|}{|W(A) \cup W(B)|}$$

Where $W(A)$ and $W(B)$ are winnowed MinHash fingerprints chosen across sliding sliding windows.

### 3. Outlier-Resistant Style Shift Metric (MAD)
For intrinsic plagiarism and patchwriting detection across paragraphs without external reference documents, AI TextSense employs Median Absolute Deviation (MAD):

$$\text{MAD} = \text{median}(|x_i - \tilde{x}|), \quad z_i = \frac{0.6745 \cdot (x_i - \tilde{x})}{\text{MAD}}$$

Paragraphs exhibiting $|z_i| > 2.0$ across composite stylometric vectors (Type-Token Ratio, mean sentence length, punctuation entropy) are flagged as style-shift anomalies.

---

## 📸 Application Showcase

### Flagship Overview Command Center
> **Unified Forensic Command Center**: 4 real-time animated radial gauges, 5-axis forensic radar telemetry, and 1-click contextual quick-fix remediation cards.
<p align="center">
  <img src="docs/screenshots/overview-dashboard.png" alt="AI TextSense Overview Dashboard" width="960"/>
</p>

---

### 4-Layer AI Fingerprint Removal & Per-Sentence Risk Heatmap
> **Surgical Stylometric Humanization**: Eliminates buzzwords, strips hedging, normalizes typographic tells, and restores natural rhythm while strictly preserving fenced code blocks, inline identifiers, and URLs.
<p align="center">
  <img src="docs/screenshots/fingerprint-scrub.png" alt="4-Layer AI Fingerprint Removal Suite" width="960"/>
</p>

---

### Security & Threat Defense with AI Attack Vector Briefings
> **Compound Threat & Kill-Chain Correlation**: Detects destructive shellcode, multi-stage C2 payloads, encoded PowerShell exploits, and prompt injection vectors with forensic explanations.
<p align="center">
  <img src="docs/screenshots/security-threat-defense.png" alt="Security Threat Defense and Kill Chain Correlation" width="960"/>
</p>

---

### 4-Mode Plagiarism & Originality Suite + Reference Vault
> **Multi-Document Academic Integrity**: Combines 5-gram Winnowing, neural transformer embeddings (`all-MiniLM-L6-v2`), zero-reference intrinsic style-shift detection, and CrossRef/Wikipedia academic queries.
<p align="center">
  <img src="docs/screenshots/plagiarism-suite.png" alt="Plagiarism and Originality Suite" width="960"/>
</p>

---

## 👥 Who It Helps & How It Empowers People

### 1. 🛡️ Software Engineers, DevSecOps & AI Builders
* **Sanitize Untrusted RAG Contexts**: Intercept and neutralize prompt injections, delimiter breakouts, and hidden Unicode tags before text is fed to downstream LLM inference pipelines.
* **Inspect Code Snippets & Scripts**: Identify Trojan Source Unicode directionality tricks, zero-width steganographic keys, and Base64/Hex/PowerShell encoded shellcode in clipboard snippets.
* **Automate Security Audit Pipelines**: Export machine-readable JSON and CSV forensic logs directly into SIEM workflows and compliance monitoring platforms.

### 2. ✍️ Writers, Authors, Journalists & Content Creators
* **Reclaim Authentic Human Voice**: Eradicate repetitive AI crutch words (`delve`, `multifaceted`, `testament`, `beacon`, `pivotal`) using a replacement dictionary verified to contain **zero circular LLM buzzwords**.
* **Eliminate Typographic Clues**: Automatically convert AI em-dashes (`—`), smart curly quotes, non-breaking spaces, and repetitive markdown bold-colon lists into clean, natural prose.
* **Code & URL Protection**: Guaranteed zero-corruption shielding for Python, JavaScript, JSON code blocks, inline identifiers, and URLs during humanization passes.

### 3. 🎓 Researchers, Educators, Students & Academic Editors
* **Multi-Modal Plagiarism Auditing**: Verify submissions across exact Winnowing shingles, neural cosine semantic paraphrases, and zero-reference intrinsic style-shift detection ($|z| > 2.0$).
* **Catch Orphan Citations**: Automatically uncover orphaned references (`[12]`, `(Smith et al., 2024)`) whose corresponding bibliographies have been omitted or hallucinated.
* **Live Academic Cross-Referencing**: Cross-check distinctive phrases against CrossRef DOI and Wikipedia in Online Mode, or keep audits 100% confidential in Offline Mode.

### 4. 🔒 Enterprise Teams, Legal Counsel & Privacy-Conscious Organizations
* **100% Air-Gapped Privacy**: Run neural transformer models on-device via WebGPU and WASM SIMD. Zero telemetry, zero cloud dependencies, zero document leakage.
* **Bring Your Own Local Model**: Connect seamlessly to **LM Studio (`http://127.0.0.1:1234/v1`)**, **Ollama**, or private corporate vLLM endpoints.
* **Zero Subscription Cost**: Support for high-performance free online endpoints (**OpenCode Zen**, **Pollinations AI**, **OpenRouter Free Tier**, **Groq Cloud Free**) with no mandatory credit card or recurring fees.

---

## 📦 Official Release Binaries (v3.0.0)

Official Windows production release artifacts compiled locally:

| Distribution Artifact | Target Platform | Type | File Size | SHA-256 Checksum |
|---|---|---|---|---|
| **`AITextSense_v3.0.0_Portable.exe`** | Windows x64 | Standalone Portable Executable | 17.97 MB (18,843,648 B) | `FFAE00301137F1604B9BB3D138C871CCFC56C99E4DD30AEAC38E4758783900BE` |
| **`AI TextSense_3.0.0_x64-setup.exe`** | Windows x64 | NSIS Desktop Setup Installer | 11.50 MB (12,063,842 B) | `4795F0F5738BF347E3A99A500189B7A4ABC78349850D974CBB2729C3F18B0795` |
| **`AI TextSense_3.0.0_x64_en-US.msi`** | Windows x64 | MSI Enterprise Windows Installer | 12.40 MB (13,000,704 B) | `ECE499C4CE55B559FA796AE8163AEA792772CFA849AF67962D3EA3653291C506` |

Multi-platform Linux (`.AppImage`, `.deb`) and macOS (`.dmg`) artifacts are automatically built and published via the GitHub Actions Release pipeline.

---

## 📄 License & Cybersecurity Compliance

Copyright © 2026 **Wilson Volpe**.

Licensed under the **Apache License, Version 2.0** (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at:

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.