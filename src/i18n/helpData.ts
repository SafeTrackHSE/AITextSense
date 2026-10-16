import type { Language } from './strings';

export interface GuideLessonItem {
  id: string;
  category: 'setup' | 'safety' | 'artifacts' | 'synthesis';
  categoryTitle: string;
  title: string;
  goal: string;
  steps: string[];
  tip?: string;
}

export interface HelpSectionItem {
  id: string;
  category: 'safety' | 'artifacts' | 'engines';
  categoryTitle: string;
  icon: string;
  title: string;
  color: string;
  content: string;
}

export interface ChangelogVersion {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export interface AboutData {
  title: string;
  tagline: string;
  description: string;
  privacyTitle: string;
  privacyBody: string;
  licenseTitle: string;
  licenseBody: string;
  author: string;
}

export interface GlossaryEntry {
  /** Stable id — matches ThreatExplanation.relatedGlossaryTerms so findings can deep-link here. */
  id: string;
  term: string;
  /** One or two plain-language sentences, written for a first-time, non-technical reader. */
  plainDefinition: string;
  /** Optional deeper technical detail for the reader who wants it. */
  technicalNote?: string;
  category: 'threat' | 'injection' | 'watermark' | 'footprint' | 'plagiarism' | 'general';
}

export interface LocalizedHelpContent {
  categories: {
    safety: string;
    artifacts: string;
    engines: string;
    setup: string;
    synthesis: string;
  };
  guideLessons: GuideLessonItem[];
  helpSections: HelpSectionItem[];
  changelog: ChangelogVersion[];
  about: AboutData;
  glossary: GlossaryEntry[];
}

// ---------------------------------------------------------------------------
// ENGLISH (en)
// ---------------------------------------------------------------------------
const EN_HELP: LocalizedHelpContent = {
  categories: {
    safety: 'AI Safety & Threat Defense (Detect & Remove)',
    artifacts: 'AI Artifacts & Watermarks (Detect & Neutralize)',
    engines: 'AI Models, Engines & Privacy',
    setup: 'Getting Started & Privacy',
    synthesis: 'Synthesis & Verification',
  },
  guideLessons: [
    {
      id: 'g-0',
      category: 'setup',
      categoryTitle: 'Getting Started & Privacy',
      title: 'Lesson 0 · Getting Started (2 min)',
      goal: 'Load text and select your privacy mode.',
      steps: [
        'Paste any text into the left input editor (Ctrl+V) or drag and drop a .txt, .docx, or .pdf file.',
        'Check the top-right mode toggle. "Offline" guarantees 100% of processing happens locally on your computer with zero network traffic.',
        'Switch between the AI Safety and AI Artifacts tabs on the right panel according to your task.',
      ],
      tip: 'The app works entirely offline by default. No text ever leaves your machine.',
    },
    {
      id: 'g-1',
      category: 'safety',
      categoryTitle: 'AI Safety & Threat Defense',
      title: 'Lesson 1 · Detect & Remove Invisible Junk (Scanner)',
      goal: 'Find hidden Unicode characters, homoglyphs, and zero-width spaces.',
      steps: [
        'Click the SCANNER tab (◈) in the Safety section.',
        'Click "Scan" to inspect every Unicode codepoint in the document.',
        'Review the findings: zero-width spaces, Bidi overrides, and Cyrillic/Greek homoglyph substitutions.',
        'Select a cleanup mode ("conservative" for invisible chars, "aggressive" for homoglyphs) and click "Apply".',
      ],
      tip: 'Zero findings indicates clean, standard typography.',
    },
    {
      id: 'g-2',
      category: 'safety',
      categoryTitle: 'AI Safety & Threat Defense',
      title: 'Lesson 2 · Inspect & Strip Prompt Injections (Injection)',
      goal: 'Unmask covert prompt injections, ASCII smuggling, and data exfiltration payloads.',
      steps: [
        'Click the INJECTION tab (⛨) in the Safety section.',
        'Click "Inspect Text" to run deterministic tag extraction, ZWS bitstream decoding, and jailbreak heuristics.',
        'Toggle between "Model View" (X-Ray preview showing hidden tag badges) and "Human View" (visual text).',
        'Inspect decoded payloads in the findings list.',
        'Click "Strip Injections" to purge covert commands, or "Reveal Payloads" to expose them as bracketed readable text in your editor.',
      ],
      tip: 'Use the "Load Attack Sample" dropdown to test real-world ASCII smuggling and Trojan Source attacks.',
    },
    {
      id: 'g-3',
      category: 'artifacts',
      categoryTitle: 'AI Artifacts & Watermarks',
      title: 'Lesson 3 · Check for Statistical AI Watermarks (Watermark)',
      goal: 'Identify Kirchenbauer green-list watermarks embedded by generative LLMs.',
      steps: [
        'Click the WATERMARK tab (⊕) in the Artifacts section.',
        'Click "Sweep" to test 216 key/window/gamma configurations simultaneously.',
        'If a significant z-score is flagged (z ≥ 3.0), the text carries a statistical watermark signature.',
        'Click "Neutralize" to apply synonym and reordering transforms that break the green-list distribution.',
      ],
      tip: 'Use v2 "Kill (Window-Aware)" for targeted, minimal-edit watermark suppression.',
    },
    {
      id: 'g-4',
      category: 'artifacts',
      categoryTitle: 'AI Artifacts & Watermarks',
      title: 'Lesson 4 · Analyze Stylometric Rhythm & Clichés (Footprint)',
      goal: 'Measure whether phrasing and rhythm match robotic LLM patterns.',
      steps: [
        'Click the FOOTPRINT tab (⊗) in the Artifacts section and click "Analyze".',
        'Check the Machine Probability Score and inspect individual metrics: Burstiness, Perplexity Uniformity, and LLM Clichés.',
        'Click "Remove Footprint" to deterministically replace template phrases, rotate vocabulary, and balance sentence variance.',
      ],
      tip: 'Re-run analysis after removal to verify your score improvement.',
    },
    {
      id: 'g-5',
      category: 'artifacts',
      categoryTitle: 'AI Artifacts & Watermarks',
      title: 'Lesson 5 · Deep Adversarial Optimization (Optimizer)',
      goal: 'Execute closed-loop simulated annealing to minimize machine detectability.',
      steps: [
        'Click the OPTIMIZER tab (⟁) in the Artifacts section.',
        'Select "Oracle Optimizer" and click "Run".',
        'Watch the live convergence curve as the engine iteratively edits and validates candidates.',
        'Review the before/after detectability percentage and per-probe z-scores.',
      ],
      tip: 'For maximum rewriting depth, switch to "Regeneration Round-Trip" using the on-device model.',
    },
    {
      id: 'g-6',
      category: 'synthesis',
      categoryTitle: 'Synthesis & Verification',
      title: 'Lesson 6 · Generate Forensic Integrity Reports (Report)',
      goal: 'Produce cryptographic audit logs and export PDF/Word reports.',
      steps: [
        'Click the REPORT tab (≡) in the Synthesis section.',
        'Click "Generate Report" to aggregate Scanner, Injection, Watermark, and Footprint findings.',
        'Review the SHA-256 integrity hash and forensic summary.',
        'Export as PDF, Markdown, JSON, or CSV for compliance and archival.',
      ],
      tip: 'Integrity reports document before-and-after proof of sanitization.',
    },
  ],
  helpSections: [
    {
      id: 'h-scanner',
      category: 'safety',
      categoryTitle: 'AI Safety & Threat Defense',
      icon: '◈',
      title: 'Unicode Scanner & Steganography Engine',
      color: 'text-warning dark:text-yellow-400',
      content: `Inspects every character for invisible Unicode codepoints, formatting anomalies, and homoglyph substitutions:
• Zero-Width Characters: U+200B (ZWS), U+200C (ZWNJ), U+200D (ZWJ), U+FEFF (BOM), U+2060 (WJ).
• Bidirectional Overrides: U+202E (RLO), U+202D (LRO), U+2066-U+2069 (Isolates) that disguise malicious code or commands.
• Homoglyphs: Cyrillic, Greek, and Latin lookalikes (e.g. Cyrillic 'а' replacing Latin 'a').
• Tag Characters: U+E0000–U+E007F high-plane smuggling characters.
Supports Conservative, Aggressive, and Custom rule-based sanitization pipelines.`,
    },
    {
      id: 'h-injection',
      category: 'safety',
      categoryTitle: 'AI Safety & Threat Defense',
      icon: '⛨',
      title: 'Prompt Injection & ASCII Smuggling Inspector',
      color: 'text-danger dark:text-red-400',
      content: `Specialized forensic analyzer designed to detect and neutralize prompt injection vectors:
• ASCII Smuggling via Unicode Tags: Decodes U+E0020–U+E007E codepoints directly into covert ASCII instructions ingested by LLM tokenizers.
• Zero-Width Bitstreams: Reassembles binary steganography (alternating ZWS/ZWNJ sequences) into decoded payloads.
• Trojan Source Inversion: Flags bidirectional controls that invert visual text order while keeping logical execution order intact.
• Keyword Splitting: Detects sensitive command tokens fragmented with soft-hyphens (U+00AD) to bypass safety filters.
• One-Click Neutralization: "Strip Injections" removes all covert codepoints; "Reveal Payloads" unmasks hidden commands into visible bracketed text.`,
    },
    {
      id: 'h-watermark',
      category: 'artifacts',
      categoryTitle: 'AI Artifacts & Watermarks',
      icon: '⊕',
      title: 'Statistical Watermark Detection & Neutralization',
      color: 'text-accent',
      content: `Detects statistical watermarking algorithms (Kirchenbauer et al.) embedded during LLM generation:
• Sweep Engine: Sweeps 216 combinations of hash functions, window sizes (h ∈ {1,2,4,8}), and green-list fractions (γ ∈ {0.25, 0.5}).
• Bonferroni-corrected z-score thresholds (z ≥ 3.0) ensure false-positive control.
• Targeted Neutralization: Window-aware suppression surgically edits high marginal-Δz words with minimal semantic distortion.
• Token Boundary Poisoning & Pollution: Experimental tools to evaluate detector resilience against boundary shifts and forged multi-key signatures.`,
    },
    {
      id: 'h-footprint',
      category: 'artifacts',
      categoryTitle: 'AI Artifacts & Watermarks',
      icon: '⊗',
      title: 'Stylometric Footprint & LLM Rhythm Profiler',
      color: 'text-danger dark:text-red-400',
      content: `Profiles the statistical signatures of LLM prose:
• Burstiness: Sentence length standard deviation ratio; uniform lengths indicate automated generation.
• Perplexity Uniformity: High cross-sentence entropy regularity typical of autoregressive decoding.
• Cliché Dictionary: Catalogs overuse of hedging ("it is crucial to remember") and transitional boilerplate ("delve into", "testament to").
• Footprint Removal: Deterministically rewrites template phrases, balances cadence, and replaces robotic vocabulary.`,
    },
    {
      id: 'h-optimizer',
      category: 'artifacts',
      categoryTitle: 'AI Artifacts & Watermarks',
      icon: '⟁',
      title: 'Adversarial Optimizer & LM Perplexity Scoring',
      color: 'text-accent',
      content: `Closed-loop optimization engine combining statistical probes and neural verification:
• Oracle Search Loop: Simulated annealing over synonym swaps, clause movements, and sentence restructuring, constrained by Jaccard semantic floors (≥82%).
• Regeneration Round-Trip: Sentence-level multi-candidate generation via on-device models to eliminate residual generation bias.
• LM Perplexity Score: Real sliding-window causal LM (GPT-2 class) measures cross-window NLL against human baseline distributions (μ≈3.85, σ≈0.62).`,
    },
    {
      id: 'h-engines',
      category: 'engines',
      categoryTitle: 'AI Models, Engines & Privacy',
      icon: '≡',
      title: 'Execution Modes, On-Device AI & Privacy',
      color: 'text-info dark:text-blue-400',
      content: `Flexible execution architectures tailored for absolute privacy:
• Offline Mode (Default): Pure client-side JavaScript / WASM execution. No server requests, no cookies, no tracking.
• On-Device AI: Downloads lightweight transformer models (77M / 248M) into browser IndexedDB/OPFS. Runs locally with WebGPU/WASM.
• Local / Remote Providers: Connect to Ollama (http://localhost:11434) or external API providers (OpenAI, Claude, Gemini) with local credential storage.
• Model Management: Use the "Delete Model" button directly in the LLM config bar to purge stored on-device models at any time.`,
    },
    {
      id: 'h-fingerprint-removal',
      category: 'artifacts',
      categoryTitle: 'AI Artifacts & Watermarks',
      icon: '⊗',
      title: '4-Layer AI Fingerprint Removal Suite',
      color: 'text-success dark:text-emerald-400',
      content: `A multi-stage deterministic scrubbing pipeline designed to eliminate stylometric markers of LLM generation:
• Protected Span Masking: Temporarily shields fenced code blocks, inline code, and URLs to prevent accidental syntax or link corruption.
• Layer 1 (Lexical): Replaces overused LLM buzzwords ("delve", "testament", "crucial", "multifaceted") with natural human equivalents from a purified synonym map.
• Layer 2 (Structural & Hedging): Strips repetitive hedging phrases ("it is important to note that", "needless to say") and robotic template boilerplate.
• Layer 3 (Typographic Tells): Normalizes curly quotes, converts robotic bullet-colon prefixes into natural prose, and balances excessive em-dashes.
• Layer 4 (Burstiness & Heatmap): Splits uniform long sentences (24+ words) and joins choppy clauses to restore human-like sentence length variance.`,
    },
    {
      id: 'h-plagiarism',
      category: 'artifacts',
      categoryTitle: 'Synthesis & Verification',
      icon: '§',
      title: '4-Mode Plagiarism & Originality Suite',
      color: 'text-accent',
      content: `Comprehensive academic and journalistic originality verification suite:
• Mode 1 (1-to-N Reference Vault): 4-gram and 5-gram word shingling, Winnowing hash algorithms, and MinHash Jaccard containment across imported reference documents.
• Mode 2 (Semantic Paraphrase): TF-IDF candidate pre-filtering combined with on-device neural embeddings (all-MiniLM-L6-v2) to flag paraphrased text.
• Mode 3 (Zero-Reference Intrinsic Style-Shift): Flags internal duplicated sentences, mosaic patchwriting (>2.0σ style variance), and orphan bracketed citations missing a bibliography.
• Mode 4 (Online Academic & Web Verification): Queries CrossRef Works and Wikipedia APIs to surface published literature matches with clickable source links.`,
    },
    {
      id: 'h-local-models',
      category: 'engines',
      categoryTitle: 'AI Models, Engines & Privacy',
      icon: '🧠',
      title: 'Local AI Models Hub & Architecture',
      color: 'text-info dark:text-blue-400',
      content: `On-device neural models running 100% in-browser via Transformers.js with WebGPU or WASM acceleration:
• Fast Rewriter (LaMini-Flan-T5-77M / ~80MB): Ultra-fast on-device sentence humanization and synonym rotation.
• Balanced Rewriter (LaMini-Flan-T5-248M / ~250MB): Higher-capacity T5 text-to-text generation for complex paragraph restyling.
• Smart Local AI (SmolLM2-360M-Instruct / ~210MB): 4-bit quantized instruct model supporting both natural humanization and offline JSON threat explanations.
• Pro Local AI (Qwen2.5-0.5B-Instruct / ~310MB): High-precision on-device instruct model for forensic threat analysis and advanced rewriting.
• Neural Perplexity Scorer (SmolLM2-135M / gpt2 / ~95-125MB): Real causal language models computing sliding-window cross-entropy perplexity.
• Semantic Embedder (all-MiniLM-L6-v2 / ~23MB): On-device feature extraction producing 384-dimensional sentence embeddings for paraphrase detection.`,
    },
  ],
  changelog: [
    {
      version: 'v3.0.0',
      date: '2026-10',
      title: 'Visual Forensic Dashboard, AI Fingerprint Removal, Plagiarism Suite & Local AI Hub',
      highlights: [
        'Flagship Overview Dashboard: 1-click "Scan Everything" orchestrator, 4 custom animated SVG radial gauges, 5-axis forensic radar chart, and actionable quick-fix cards.',
        'Explicit 4-Layer AI Fingerprint Removal Suite: Protected code/URL span masking, purified synonym rotation, robotic typography normalization, and sentence risk heatmap.',
        'Unified AI Attack Vector & Risk Explainer: Deterministic instant briefings and on-device/cloud LLM deep-dives across Scanner, Injection, and Threat.',
        'Multi-Step Kill-Chain Correlation: Detects multi-stage attacks (credential harvesting + exfiltration, dropper + persistence, obfuscation + execution) with sandboxed de-obfuscation ladders.',
        '4-Mode Plagiarism & Originality Suite: 1-to-N reference shingling & winnowing, bounded semantic paraphrase detection, zero-reference intrinsic patchwriting & orphan citations, and online academic (CrossRef/Wikipedia) verification.',
        'Local AI Models Hub: Curated on-device lineup including SmolLM2-360M-Instruct, Qwen2.5-0.5B, SmolLM2-135M, and all-MiniLM-L6-v2 with WebGPU/WASM hardware acceleration detection.',
        'Universal Mutation History: Global Undo / Redo / Restore controls and inline word & character diff toggle.',
        'Executive Integrity Report: Visual executive summary dashboard, DOCX export, PDF forensic letterhead with B&W branding, CSV, and JSON.',
      ],
    },
    {
      version: 'v2.2.0',
      date: '2026-08',
      title: 'Payload & Threat Analysis',
      highlights: [
        'New Threat tab (☠): detects dangerous code, commands, and encoded payloads hidden in text — unconditionally, independent of whether the surrounding text is a jailbreak.',
        'Recursive decoding of Base64, hex, ROT13, and percent-encoded payloads, with a "stop early" rule once a dangerous pattern is found.',
        'Every finding carries a full forensic explanation — what it does, what it touches, the real-world consequence, why it appears here, and what to do — not just a severity label.',
        'Optional AI-assisted capability review for novel payloads the offline rule library doesn\'t recognize, with honest handling when a model declines to respond.',
        'New Glossary tab: plain-language definitions for every technical term in the app, cross-linked directly from Threat findings.',
        'New "Uncensored (offline, advanced)" provider option for capability review with reduced refusal risk on legitimate defensive analysis — fully offline via Ollama.',
        'Fixed: Injection analysis now detects plain-text jailbreak triggers even with no invisible Unicode payload present (previously required one to run at all).',
        'Fixed: Injection\'s AI semantic evaluation now works correctly on all 5 providers (previously silently failed on Anthropic, Gemini, and on-device).',
        'Integrity reports (JSON/CSV/PDF) now include the full Threat analysis, with complete explanations per finding.',
        'App version is now read from a single source, so the report, Help, and title bar can never disagree again.',
      ],
    },
    {
      version: 'v2.1.0',
      date: '2026-08',
      title: 'Prompt Injection Inspector & Dual-Domain Restructuring',
      highlights: [
        'Added dedicated Prompt Injection & Invisible Character Forensic Inspector tab (⛨).',
        'Dual-Plane X-Ray / Human View for comparing raw tokenizer input against visual rendering.',
        'ASCII smuggling (Unicode tags), ZWS bitstream covert channels, and Trojan Source Bidi decoding.',
        'Reorganized navigation into distinct AI Safety & AI Artifacts domains.',
        'Added dedicated "Delete Model" button directly in the LLM configuration toolbar.',
        'Full multi-language translation across all Help, Guide, and documentation tabs.',
      ],
    },
    {
      version: 'v2.0.0',
      date: '2026-08',
      title: 'Adversarial Optimization & Advanced Neutralization',
      highlights: [
        'Oracle Simulated Annealing closed-loop optimizer.',
        'Regeneration Round-Trip generation-level watermark reset.',
        'Real causal LM sliding-window perplexity scoring (GPT-2 class WebGPU/WASM).',
        'Token-Boundary Poisoning (ZWJ & NFD) and Watermark Key Pollution.',
        'Window-aware targeted watermark suppression.',
      ],
    },
    {
      version: 'v1.0.0',
      date: '2026-07',
      title: 'Initial Forensic Foundation',
      highlights: [
        'Unicode character scanner and homoglyph substitution cleaner.',
        'Statistical Kirchenbauer 216-combination watermark sweep.',
        'Stylometric footprint profiling (burstiness, perplexity, clichés).',
        'Cryptographic forensic integrity reports with multi-format export.',
      ],
    },
  ],
  about: {
    title: 'AI TextSense',
    tagline: 'Forensic Text & Prompt Injection Inspector',
    description:
      'AI TextSense is an advanced dual-purpose forensic workstation built for analyzing text integrity, discovering covert prompt injections, and neutralizing generative AI watermarks and stylometric footprints.',
    privacyTitle: 'Privacy & Security Guarantee',
    privacyBody:
      'AI TextSense operates entirely inside your local browser runtime. In Offline mode and when using On-Device models, zero text or telemetry leaves your computer. Your documents and credentials remain private.',
    licenseTitle: 'Intellectual Property & Copyright',
    licenseBody: '© 2026 Wilson Volpe. All rights reserved.',
    author: 'Wilson Volpe',
  },
  glossary: [
    // --- Threat & Payload Analysis ---
    {
      id: 'destructive-command', category: 'threat', term: 'Destructive command',
      plainDefinition: 'A command that permanently deletes or overwrites files or data, with no undo — like emptying a recycle bin that was never there in the first place.',
      technicalNote: 'Examples: "rm -rf" (Linux/macOS), "del /f /s /q" (Windows), disk-format commands. Severity depends on scope, not on whether it looks intentional.',
    },
    {
      id: 'pipe-to-shell', category: 'threat', term: 'Pipe-to-shell',
      plainDefinition: 'A one-line trick that downloads a script from the internet and runs it immediately, without ever showing it to you first — like signing a contract you\'re not allowed to read.',
      technicalNote: 'Shape: "curl ... | bash" or "iwr ... | iex". The content served can change per-request, so inspecting the URL beforehand offers no real safety guarantee.',
    },
    {
      id: 'c2', category: 'threat', term: 'C2 (Command & Control)',
      plainDefinition: 'The "phone home" channel an attacker uses to remotely control a compromised computer after the initial break-in — the ongoing connection, not the break-in itself.',
      technicalNote: 'Short for "command and control." Reverse shells, beacon check-ins, and encoded exfiltration traffic are all common C2 mechanisms.',
    },
    {
      id: 'reverse-shell', category: 'threat', term: 'Reverse shell',
      plainDefinition: 'A trick where a computer calls out to an attacker and hands them a live command line — the opposite of the attacker connecting in, which is why it slips past many firewalls.',
      technicalNote: 'The compromised machine initiates an outbound connection (which is usually allowed by firewalls) and attaches a shell to it, giving the remote party interactive control.',
    },
    {
      id: 'rat', category: 'threat', term: 'RAT (Remote Access Trojan)',
      plainDefinition: 'Malicious software that quietly gives someone else full remote control of your computer — like a stalker with a spare key to your house.',
      technicalNote: 'RATs typically combine a persistence mechanism (so they survive reboots) with a C2 channel (so the operator can issue commands) and often data-harvesting features.',
    },
    {
      id: 'exfiltration', category: 'threat', term: 'Exfiltration',
      plainDefinition: 'Sneaking data out of a system to somewhere the attacker controls — the digital equivalent of smuggling documents out in your sock.',
      technicalNote: 'Common vectors: outbound HTTP requests carrying stolen data, DNS tunneling, or embedding secrets in a URL that gets automatically requested (e.g. a rendered image).',
    },
    {
      id: 'credential-harvesting', category: 'threat', term: 'Credential harvesting',
      plainDefinition: 'Collecting passwords, API keys, or login sessions — usually as a first step before using them to break into other accounts or services.',
      technicalNote: 'Common targets: SSH/cloud key files, browser password stores, session cookies, and environment variables (a very common place secrets end up by accident).',
    },
    {
      id: 'persistence', category: 'threat', term: 'Persistence',
      plainDefinition: 'A technique that makes malicious software keep running automatically — on every login, every reboot — without anyone having to start it again.',
      technicalNote: 'Common mechanisms: scheduled tasks, cron jobs, Windows Registry "Run" keys, and macOS launch agents.',
    },
    {
      id: 'obfuscation', category: 'threat', term: 'Obfuscation',
      plainDefinition: 'Deliberately scrambling code so a human (or a simple scanner) can\'t easily tell what it does just by looking at it — while it still runs exactly the same.',
      technicalNote: 'Common idioms: character-code array reconstruction, Base64-encoded payloads, string-concatenation ladders. The presence of obfuscation is itself a signal, independent of what it turns out to contain.',
    },
    {
      id: 'entropy', category: 'threat', term: 'Entropy (in this tool)',
      plainDefinition: 'A measure of how "random-looking" a chunk of text is. Ordinary sentences score low; encoded or encrypted data scores high — it\'s one of the signals used to spot hidden payloads.',
      technicalNote: 'Measured here as Shannon entropy (bits per character). English prose is typically ~3.5–4.3 bits/char; Base64-encoded data trends toward 5–6.',
    },
    {
      id: 'lolbin', category: 'threat', term: 'LOLBin (Living-off-the-land binary)',
      plainDefinition: 'A legitimate, pre-installed system tool that gets repurposed for an attack — using something already trusted on the machine instead of bringing in obviously malicious software.',
      technicalNote: 'Examples: certutil, PowerShell, mshta on Windows. Detection is harder precisely because the binary itself is signed and expected to be present.',
    },
    {
      id: 'capability-review', category: 'threat', term: 'Capability review',
      plainDefinition: 'This tool\'s AI-assisted step that explains what a piece of code or a command would actually do if it ran — without judging whether the surrounding text is trying to manipulate an AI. That question is handled separately, by Injection analysis.',
    },
    // --- Prompt Injection ---
    {
      id: 'prompt-injection', category: 'injection', term: 'Prompt injection',
      plainDefinition: 'Text crafted to trick an AI system into ignoring its instructions and following the attacker\'s instead — hidden inside content the AI was only supposed to read, not obey.',
    },
    {
      id: 'jailbreak', category: 'injection', term: 'Jailbreak',
      plainDefinition: 'An attempt to talk an AI system out of its safety rules or intended behavior — through role-play framing, fake "developer mode" claims, or other persuasion tricks.',
    },
    {
      id: 'tag-char-smuggling', category: 'injection', term: 'ASCII / Tag-character smuggling',
      plainDefinition: 'Hiding an entire secret message inside invisible Unicode "tag" characters that render as nothing at all — text that\'s completely invisible to a human reader but fully readable by an AI processing the raw text.',
      technicalNote: 'Uses the Unicode Tag block (U+E0000–U+E007F), each code point mapping 1:1 to an ASCII character.',
    },
    {
      id: 'trojan-source', category: 'injection', term: 'Trojan Source (Bidi override)',
      plainDefinition: 'A trick using invisible right-to-left/left-to-right control characters that makes text visually display in a different order than the AI or compiler actually processes it — what you see is not what gets read.',
      technicalNote: 'Uses Unicode bidirectional control characters (e.g. U+202E RIGHT-TO-LEFT OVERRIDE) to reorder the rendered glyph sequence independent of logical reading order.',
    },
    {
      id: 'homoglyph', category: 'injection', term: 'Homoglyph',
      plainDefinition: 'A character from a different alphabet that looks nearly identical to a familiar one — like a Cyrillic "а" standing in for a Latin "a" — used to sneak text past filters that only check for the "real" character.',
    },
    {
      id: 'zero-width-character', category: 'injection', term: 'Zero-width character',
      plainDefinition: 'A character that takes up no visible space at all when displayed, but is still there in the underlying text — used to hide markers, fingerprints, or entire encoded messages in plain sight.',
      technicalNote: 'Common examples: Zero Width Space (U+200B), Zero Width Non-Joiner (U+200C), Zero Width Joiner (U+200D), and the Byte Order Mark (U+FEFF) when it appears mid-text.',
    },
    {
      id: 'steganography', category: 'injection', term: 'Steganography',
      plainDefinition: 'Hiding a message inside something that looks completely ordinary, rather than encrypting it — the goal is that nobody even notices there\'s a hidden message to look for.',
    },
    {
      id: 'tokenizer', category: 'injection', term: 'Tokenizer',
      plainDefinition: 'The component that breaks text into the small pieces ("tokens") an AI model actually reads. Hidden characters can quietly inflate this count — costing extra processing on content that was never meant to be visible.',
    },
    // --- Watermarking ---
    {
      id: 'watermark-green-list', category: 'watermark', term: 'Green-list watermark',
      plainDefinition: 'A statistical fingerprint some AI systems quietly bake into generated text by subtly favoring certain words over others — invisible to a reader, but detectable by re-running the same math over the text.',
      technicalNote: 'Based on the Kirchenbauer et al. scheme: a secret key partitions the vocabulary into a "green list" and "red list" for each generation step, biasing sampling toward green-list tokens.',
    },
    // --- AI Footprint / Stylometrics ---
    {
      id: 'burstiness', category: 'footprint', term: 'Burstiness',
      plainDefinition: 'How much sentence length varies across a piece of writing. Humans naturally mix short and long sentences; AI-generated text often has unusually uniform sentence lengths.',
    },
    {
      id: 'perplexity', category: 'footprint', term: 'Perplexity',
      plainDefinition: 'A measure of how "predictable" a piece of text is to a language model. AI-generated text tends to score more uniformly predictable than natural human writing, which has more surprising word choices.',
    },
    {
      id: 'bonferroni-correction', category: 'general', term: 'Bonferroni correction',
      plainDefinition: 'A statistical safeguard used when running many tests at once, so that running more tests doesn\'t make you more likely to see a "significant" result purely by chance.',
      technicalNote: 'Used in the Watermark Sweep (216 parameter combinations) to keep the overall false-positive rate under control despite the large number of comparisons.',
    },
    {
      id: 'shingling', category: 'plagiarism', term: 'Word Shingling (N-grams)',
      plainDefinition: 'A technique of breaking text into overlapping sequences of words (e.g. 4-grams or 5-grams) to detect identical or near-identical copied passages between documents.',
      technicalNote: 'Shingles are hashed into numerical representations to compute exact containment and Jaccard intersection over union.',
    },
    {
      id: 'winnowing', category: 'plagiarism', term: 'Winnowing Algorithm',
      plainDefinition: 'An algorithm that selects a sparse, representative subset of hashes from a document so that any copied section longer than a guarantee threshold is reliably detected.',
      technicalNote: 'Maintains a sliding window of hashes and picks the minimum hash in each window to ensure invariant document fingerprints.',
    },
    {
      id: 'patchwriting', category: 'plagiarism', term: 'Patchwriting & Mosaic Plagiarism',
      plainDefinition: 'A form of copying where a writer pieces together phrases from other sources with only minor changes to words or sentence structure, rather than truly synthesizing original ideas.',
      technicalNote: 'Detected intrinsically by measuring sudden stylistic variance (>2.0σ) in Flesch-Kincaid grade, word rarity, and sentence length between paragraphs.',
    },
    {
      id: 'orphan-citation', category: 'plagiarism', term: 'Orphan Citation',
      plainDefinition: 'An academic citation marker (such as [1] or (Author, 2024)) that appears inside the body text without a corresponding bibliography, references list, or works cited entry at the end.',
    },
    {
      id: 'semantic-paraphrase', category: 'plagiarism', term: 'Semantic Paraphrase',
      plainDefinition: 'Rewording an idea using different vocabulary and structure while retaining the exact original meaning, detectable through neural semantic embeddings.',
      technicalNote: 'Evaluated using TF-IDF candidate filtering followed by all-MiniLM-L6-v2 cosine similarity (≥0.82).',
    },
    {
      id: 'typographic-tells', category: 'footprint', term: 'AI Typographic Tells',
      plainDefinition: 'Punctuation and formatting habits common in language model outputs, such as excessive em-dashes, uniform curly quotes, and bold-colon list items.',
    },
  ],
};

// ---------------------------------------------------------------------------
// SPANISH (es)
// ---------------------------------------------------------------------------
const ES_HELP: LocalizedHelpContent = {
  categories: {
    safety: 'Seguridad e Integridad IA (Detectar y Eliminar)',
    artifacts: 'Marcas de Agua y Rastros IA (Detectar y Neutralizar)',
    engines: 'Modelos IA, Motores y Privacidad',
    setup: 'Primeros Pasos y Privacidad',
    synthesis: 'Síntesis y Verificación',
  },
  guideLessons: [
    {
      id: 'g-0',
      category: 'setup',
      categoryTitle: 'Primeros Pasos y Privacidad',
      title: 'Lección 0 · Primeros pasos (2 min)',
      goal: 'Carga texto y selecciona tu modo de privacidad.',
      steps: [
        'Pega cualquier texto en el editor izquierdo (Ctrl+V) o arrastra un archivo .txt, .docx o .pdf.',
        'Verifica el selector en la esquina superior derecha. "Offline" garantiza procesamiento 100% local sin conexiones de red.',
        'Navega entre las secciones de Seguridad IA y Marcas de Agua IA en el panel derecho según tu necesidad.',
      ],
      tip: 'La aplicación funciona totalmente sin conexión por defecto. Ningún texto sale de tu equipo.',
    },
    {
      id: 'g-1',
      category: 'safety',
      categoryTitle: 'Seguridad e Integridad IA',
      title: 'Lección 1 · Detectar basura invisible (Escáner)',
      goal: 'Encuentra caracteres Unicode ocultos, homóglifos y espacios de ancho cero.',
      steps: [
        'Haz clic en la pestaña ESCÁNER (◈) en la sección de Seguridad.',
        'Pulsa "Escanear" para inspeccionar cada carácter del documento.',
        'Revisa los hallazgos: caracteres invisibles, anulaciones Bidi y sustituciones homóglifas cirílicas o griegas.',
        'Elige un modo de limpieza ("conservador" o "agresivo") y pulsa "Aplicar".',
      ],
      tip: 'Cero resultados indica tipografía estándar y limpia.',
    },
    {
      id: 'g-2',
      category: 'safety',
      categoryTitle: 'Seguridad e Integridad IA',
      title: 'Lección 2 · Inspeccionar inyecciones de prompt (Inyección)',
      goal: 'Desenmascara inyecciones de prompt encubiertas, contrabando ASCII y fugas de datos.',
      steps: [
        'Haz clic en la pestaña INYECCIÓN (⛨) en la sección de Seguridad.',
        'Pulsa "Inspeccionar texto" para ejecutar la extracción de etiquetas, decodificación binaria y heurísticas de seguridad.',
        'Alterna entre "Vista Modelo" (rayos X con etiquetas) y "Vista Humana" (texto visual).',
        'Revisa las cargas decodificadas y pulsa "Eliminar inyecciones" para sanear el texto.',
      ],
      tip: 'Utiliza el menú "Cargar muestra de ataque" para probar ataques reales de contrabando ASCII.',
    },
    {
      id: 'g-3',
      category: 'artifacts',
      categoryTitle: 'Marcas de Agua y Rastros IA',
      title: 'Lección 3 · Comprobar marcas de agua estadísticas (Marca de agua)',
      goal: 'Identifica marcas de agua Kirchenbauer incrustadas por modelos de lenguaje.',
      steps: [
        'Haz clic en la pestaña MARCA DE AGUA (⊕) en la sección de Rastros.',
        'Pulsa "Barrer" para probar 216 combinaciones estadísticas simultáneamente.',
        'Si se detecta un z-score significativo (z ≥ 3.0), el texto contiene una marca estadística.',
        'Pulsa "Neutralizar" para romper la distribución de lista verde.',
      ],
      tip: 'Usa "Anular (Ventana adaptativa)" para una supresión quirúrgica con cambios mínimos.',
    },
    {
      id: 'g-4',
      category: 'artifacts',
      categoryTitle: 'Marcas de Agua y Rastros IA',
      title: 'Lección 4 · Medir ritmo estilométrico y clichés (Huella)',
      goal: 'Comprueba si la redacción sigue patrones típicos de IA.',
      steps: [
        'Haz clic en la pestaña HUELLA (⊗) y pulsa "Analizar".',
        'Observa la probabilidad de máquina y métricas: varianza de longitud (Burstiness), uniformidad de perplejidad y clichés.',
        'Pulsa "Eliminar huella" para reescribir frases robóticas y variar la cadencia.',
      ],
      tip: 'Vuelve a analizar tras la eliminación para confirmar la mejora.',
    },
    {
      id: 'g-5',
      category: 'artifacts',
      categoryTitle: 'Marcas de Agua y Rastros IA',
      title: 'Lección 5 · Optimización adversarial profunda (Optimizador)',
      goal: 'Ejecuta recocido simulado en bucle cerrado para minimizar la detectabilidad.',
      steps: [
        'Haz clic en la pestaña OPTIMIZADOR (⟁) en la sección de Rastros.',
        'Selecciona "Optimizador Oracle" y pulsa "Ejecutar".',
        'Observa la curva de convergencia en tiempo real mientras el motor valida candidatos.',
      ],
      tip: 'Para una reescritura máxima, cambia a "Reescritura de ida y vuelta" con el modelo local.',
    },
    {
      id: 'g-6',
      category: 'synthesis',
      categoryTitle: 'Síntesis y Verificación',
      title: 'Lección 6 · Generar informes de integridad (Informe)',
      goal: 'Genera registros de auditoría criptográfica y exporta en PDF o Word.',
      steps: [
        'Haz clic en la pestaña INFORME (≡) en la sección de Síntesis.',
        'Pulsa "Generar informe" para consolidar todos los análisis.',
        'Exporta en PDF, Markdown, JSON o CSV para documentación y archivo.',
      ],
      tip: 'El informe certifica formalmente el estado antes y después del saneamiento.',
    },
  ],
  helpSections: [
    {
      id: 'h-scanner',
      category: 'safety',
      categoryTitle: 'Seguridad e Integridad IA',
      icon: '◈',
      title: 'Motor de Escaneo Unicode y Esteganografía',
      color: 'text-warning dark:text-yellow-400',
      content: `Inspecciona cada carácter en busca de puntos de código invisibles, anomalías de formato y sustituciones homóglifas:
• Caracteres de ancho cero: U+200B (ZWS), U+200C (ZWNJ), U+200D (ZWJ), U+FEFF (BOM), U+2060 (WJ).
• Anulaciones bidireccionales: U+202E (RLO), U+202D (LRO), U+2066-U+2069 (Aisladores).
• Homóglifos: Sustituciones cirílicas, griegas y latinas.
• Caracteres de etiqueta: U+E0000–U+E007F para contrabando de texto.`,
    },
    {
      id: 'h-injection',
      category: 'safety',
      categoryTitle: 'Seguridad e Integridad IA',
      icon: '⛨',
      title: 'Inspector de Inyección de Prompts y Contrabando ASCII',
      color: 'text-danger dark:text-red-400',
      content: `Analizador forense especializado en detectar y neutralizar vectores de inyección de prompts:
• Contrabando ASCII con etiquetas: Decodifica U+E0020–U+E007E a instrucciones ASCII consumidas por tokenizadores de IA.
• Flujos binarios de ancho cero: Reconstruye esteganografía binaria en mensajes legibles.
• Inversión Trojan Source: Detecta controles bidireccionales que ocultan comandos peligrosos.
• Neutralización en 1 clic: "Eliminar inyecciones" purga códigos encubiertos; "Revelar" los muestra entre corchetes legibles.`,
    },
    {
      id: 'h-watermark',
      category: 'artifacts',
      categoryTitle: 'Marcas de Agua y Rastros IA',
      icon: '⊕',
      title: 'Detección y Neutralización de Marcas de Agua',
      color: 'text-accent',
      content: `Detecta algoritmos de marcas de agua estadísticas (Kirchenbauer et al.) generados por LLMs:
• Barrido de 216 configuraciones simultáneas de hashes y tamaños de ventana.
• Neutralización adaptativa que edita quirúrgicamente palabras de alto impacto marginal con mínima distorsión de significado.`,
    },
    {
      id: 'h-footprint',
      category: 'artifacts',
      categoryTitle: 'Marcas de Agua y Rastros IA',
      icon: '⊗',
      title: 'Huella Estilométrica y Ritmo de IA',
      color: 'text-danger dark:text-red-400',
      content: `Evalúa las firmas estadísticas del texto generado por IA:
• Burstiness y regularidad de longitud de oraciones.
• Uniformidad de perplejidad y uso de vocabulario y frases cliché de IA.
• Eliminación determinista de patrones sintácticos predecibles.`,
    },
    {
      id: 'h-optimizer',
      category: 'artifacts',
      categoryTitle: 'Marcas de Agua y Rastros IA',
      icon: '⟁',
      title: 'Optimizador Adversarial y Puntuación LM',
      color: 'text-accent',
      content: `Motor de optimización en bucle cerrado:
• Recocido simulado guiado por oráculo con restricción semántica (Jaccard ≥82%).
• Puntuación de perplejidad causal neuronal (modelo clase GPT-2 en WebGPU/WASM).`,
    },
    {
      id: 'h-engines',
      category: 'engines',
      categoryTitle: 'Modelos IA, Motores y Privacidad',
      icon: '≡',
      title: 'Modos de Ejecución, IA Local y Privacidad',
      color: 'text-info dark:text-blue-400',
      content: `Arquitectura flexible orientada a la privacidad absoluta:
• Modo Offline (Predeterminado): Procesamiento puramente en navegador sin envío de datos.
• IA en el dispositivo: Modelos ligeros (77M / 248M) ejecutados localmente vía WebGPU/WASM.
• Proveedores Locales / Remotos: Conéctese a Ollama (http://localhost:11434) o APIs externas con almacenamiento local de credenciales.
• Gestión de Modelos: Purgue modelos en el dispositivo directamente desde la barra de configuración.`,
    },
    {
      id: 'h-fingerprint-removal',
      category: 'artifacts',
      categoryTitle: 'Marcas de Agua y Rastros IA',
      icon: '⊗',
      title: 'Suite de Eliminación de Huellas de IA en 4 Capas',
      color: 'text-success dark:text-emerald-400',
      content: `Pipeline determinista de limpieza por etapas diseñado para eliminar marcadores estilométricos de generación por IA:
• Enmascaramiento de Tramos Protegidos: Protege bloques de código, código en línea y URLs para evitar daños sintácticos.
• Capa 1 (Léxica): Sustituye palabras cliché sobreutilizadas por IA ("profundizar", "crucial", "multifacético") por equivalentes naturales.
• Capa 2 (Estructural y Evasivas): Elimina fórmulas evasivas repetitivas ("es importante destacar que") y plantillas robóticas.
• Capa 3 (Tipografía): Normaliza comillas tipográficas, transforma listas mecánicas en prosa fluida y equilibra guiones largos.
• Capa 4 (Ráfaga y Mapa de Calor): Divide oraciones excesivamente largas (24+ palabras) y combina cláusulas breves para recuperar el ritmo humano.`,
    },
    {
      id: 'h-plagiarism',
      category: 'artifacts',
      categoryTitle: 'Síntesis y Verificación',
      icon: '§',
      title: 'Suite de Plagio y Originalidad en 4 Modos',
      color: 'text-accent',
      content: `Verificación exhaustiva de originalidad académica y editorial:
• Modo 1 (Cámara de Referencias 1-a-N): Segmentación por shingles (4-gramas/5-gramas), algoritmo Winnowing y contención MinHash Jaccard.
• Modo 2 (Paráfrasis Semántica): Prefiltrado TF-IDF combinado con embeddings neuronales locales (all-MiniLM-L6-v2).
• Modo 3 (Cambio de Estilo Intrínseco): Detecta duplicaciones internas, patchwriting tipo mosaico (>2.0σ de varianza) y citas huérfanas sin bibliografía.
• Modo 4 (Verificación Web y Académica): Consulta APIs de CrossRef y Wikipedia para contrastar literatura publicada con enlaces clicables.`,
    },
    {
      id: 'h-local-models',
      category: 'engines',
      categoryTitle: 'Modelos IA, Motores y Privacidad',
      icon: '🧠',
      title: 'Centro de Modelos IA Locales y Arquitectura',
      color: 'text-info dark:text-blue-400',
      content: `Modelos neuronales en el dispositivo 100% locales vía Transformers.js con aceleración WebGPU o WASM:
• Reescritor Rápido (LaMini-Flan-T5-77M / ~80MB): Humanización ultrarrápida y rotación de sinónimos sin latencia.
• Reescritor Equilibrado (LaMini-Flan-T5-248M / ~250MB): Mayor capacidad T5 para reestructuración de párrafos complejos.
• IA Local Inteligente (SmolLM2-360M-Instruct / ~210MB): Modelo instruct cuantizado a 4-bits para humanización y explicaciones forenses JSON offline.
• IA Local Pro (Qwen2.5-0.5B-Instruct / ~310MB): Máxima precisión en dispositivo para análisis forense avanzado de amenazas.
• Evaluador de Perplejidad Neural (SmolLM2-135M / gpt2 / ~95-125MB): Modelos causales para perplejidad por ventana deslizante.
• Embedder Semántico (all-MiniLM-L6-v2 / ~23MB): Extracción de características y embeddings de 384 dimensiones para detección de paráfrasis.`,
    },
  ],
  changelog: [
    {
      version: 'v3.0.0',
      date: '2026-10',
      title: 'Panel Forense Visual, Eliminación de Huellas IA, Suite de Plagio y Centro de IA Local',
      highlights: [
        'Panel de Resumen Principal: Botón "Escanear Todo", 4 indicadores radiales SVG animados, gráfico de radar forense de 5 ejes y tarjetas de solución rápida.',
        'Suite de Eliminación de Huellas IA en 4 Capas: Protección de código/URLs, mapa de sinónimos purificado, normalización tipográfica y mapa de calor de riesgo por frase.',
        'Explicador Unificado de Vectores de Ataque: Evaluaciones forenses instantáneas y análisis profundo con IA local/en la nube para Escáner, Inyección y Amenazas.',
        'Correlación de Cadenas de Ataque (Kill-Chain): Detección de ataques en varias etapas con desofuscación recursiva en entorno seguro.',
        'Suite de Plagio y Originalidad en 4 Modos: Shingles 1-a-N, paráfrasis semántica con embeddings neuronales, patchwriting intrínseco y verificación web (CrossRef/Wikipedia).',
        'Centro de Modelos IA Locales: Catálogo optimizado con SmolLM2-360M, Qwen2.5-0.5B, SmolLM2-135M y all-MiniLM-L6-v2 con detección de WebGPU.',
        'Historial Universal de Mutações: Deshacer / Rehacer / Restaurar global con visualizador de diferencias en línea y por palabras.',
        'Informes Forenses de Integridad: Resumen visual ejecutivo, exportación DOCX, PDF con membrete B&W, CSV y JSON.',
      ],
    },
    {
      version: 'v2.2.0',
      date: '2026-08',
      title: 'Análisis de Cargas y Amenazas',
      highlights: [
        'Nueva pestaña Amenazas (☠): detecta código, comandos y cargas codificadas peligrosas ocultas en el texto — sin condiciones previas, sin importar si el texto circundante es un jailbreak.',
        'Decodificación recursiva de cargas en Base64, hexadecimal, ROT13 y codificación por porcentaje, con una regla de "parada temprana" al encontrar un patrón peligroso.',
        'Cada hallazgo incluye una explicación forense completa — qué hace, qué afecta, la consecuencia real, por qué aparece aquí y qué hacer — no solo una etiqueta de severidad.',
        'Revisión de capacidad asistida por IA opcional para cargas nuevas que la biblioteca de reglas offline no reconoce, con manejo honesto cuando un modelo se niega a responder.',
        'Nueva pestaña Glosario: definiciones en lenguaje sencillo para cada término técnico de la app, enlazadas directamente desde los hallazgos de Amenazas.',
        'Nueva opción de proveedor "Sin censura (offline, avanzado)" para la revisión de capacidad con menor riesgo de negativa en análisis defensivo legítimo — totalmente offline vía Ollama.',
        'Corregido: el análisis de Inyección ahora detecta disparadores de jailbreak en texto plano incluso sin ninguna carga Unicode invisible presente.',
        'Corregido: la evaluación semántica con IA de Inyección ahora funciona correctamente en los 5 proveedores (antes fallaba silenciosamente en Anthropic, Gemini y el modelo local).',
        'Los informes de integridad (JSON/CSV/PDF) ahora incluyen el análisis de Amenazas completo, con explicaciones completas por hallazgo.',
        'La versión de la app ahora se lee desde una única fuente, para que el informe, la Ayuda y la barra de título nunca vuelvan a discrepar.',
      ],
    },
    {
      version: 'v2.1.0',
      date: '2026-08',
      title: 'Inspector de Inyecciones de Prompt y Reorganización de Dominios',
      highlights: [
        'Pestaña dedicada de Inspección Forense de Inyecciones de Prompt (⛨).',
        'Visualizador dual Rayos X / Vista Humana para comparar texto visual vs tokens del modelo.',
        'Decodificación de contrabando ASCII, canales esteganográficos ZWS e inversiones Bidi.',
        'Reorganización en dominios claros: Seguridad IA vs Marcas de Agua IA.',
        'Botón directo "Eliminar modelo" en la barra de configuración de IA.',
        'Traducción completa en 5 idiomas para toda la ayuda y documentación.',
      ],
    },
    {
      version: 'v2.0.0',
      date: '2026-08',
      title: 'Optimizador Adversarial y Neutralización Avanzada',
      highlights: [
        'Optimizador de recocido simulado Oracle en bucle cerrado.',
        'Reescritura de ida y vuelta a nivel de generación.',
        'Puntuación neuronal de perplejidad con modelo causal (WebGPU/WASM).',
      ],
    },
    {
      version: 'v1.0.0',
      date: '2026-07',
      title: 'Base Forense Inicial',
      highlights: [
        'Escáner Unicode y limpiador de sustituciones homóglifas.',
        'Barrido de marcas de agua estadísticas de 216 combinaciones.',
        'Informes forenses con verificación SHA-256.',
      ],
    },
  ],
  about: {
    title: 'AI TextSense',
    tagline: 'Inspector Forense de Texto e Inyecciones de Prompt',
    description:
      'AI TextSense es una estación forense diseñada para auditar la integridad de textos, detectar inyecciones de prompt encubiertas y neutralizar marcas de agua y rastros estilométricos de IA.',
    privacyTitle: 'Garantía de Privacidad',
    privacyBody:
      'AI TextSense opera completamente en tu navegador. En modo Offline y con modelos locales, ningún texto sale de tu dispositivo.',
    licenseTitle: 'Propiedad Intelectual',
    licenseBody: '© 2026 Wilson Volpe. Todos los derechos reservados.',
    author: 'Wilson Volpe',
  },
  glossary: [
    {
      id: 'destructive-command', category: 'threat', term: 'Comando destructivo',
      plainDefinition: 'Un comando que elimina o sobrescribe archivos o datos de forma permanente, sin posibilidad de deshacer — como vaciar una papelera de reciclaje que nunca existió.',
      technicalNote: 'Ejemplos: "rm -rf" (Linux/macOS), "del /f /s /q" (Windows), comandos de formateo de disco.',
    },
    {
      id: 'pipe-to-shell', category: 'threat', term: 'Tubería a shell (pipe-to-shell)',
      plainDefinition: 'Un truco de una sola línea que descarga un script de internet y lo ejecuta de inmediato, sin mostrártelo antes — como firmar un contrato que no puedes leer.',
      technicalNote: 'Forma: "curl ... | bash" o "iwr ... | iex". El contenido servido puede cambiar en cada petición.',
    },
    {
      id: 'c2', category: 'threat', term: 'C2 (Comando y Control)',
      plainDefinition: 'El canal de "llamada a casa" que un atacante usa para controlar remotamente un equipo comprometido tras la brecha inicial.',
      technicalNote: 'Los shells inversos y el tráfico de exfiltración codificado son mecanismos de C2 comunes.',
    },
    {
      id: 'reverse-shell', category: 'threat', term: 'Shell inversa',
      plainDefinition: 'Un truco en el que un equipo llama a un atacante y le entrega una línea de comandos en vivo — lo opuesto a que el atacante se conecte, por eso evade muchos cortafuegos.',
      technicalNote: 'El equipo comprometido inicia una conexión saliente (normalmente permitida) y le adjunta un shell.',
    },
    {
      id: 'rat', category: 'threat', term: 'RAT (Troyano de Acceso Remoto)',
      plainDefinition: 'Software malicioso que otorga a otra persona control remoto total de tu equipo, en silencio.',
      technicalNote: 'Combina persistencia con un canal C2 y, a menudo, funciones de recolección de datos.',
    },
    {
      id: 'exfiltration', category: 'threat', term: 'Exfiltración',
      plainDefinition: 'Sacar datos de un sistema hacia un lugar controlado por el atacante — el equivalente digital de sacar documentos escondidos.',
      technicalNote: 'Vectores comunes: peticiones HTTP salientes con datos robados, túneles DNS, o secretos incrustados en una URL solicitada automáticamente.',
    },
    {
      id: 'credential-harvesting', category: 'threat', term: 'Recolección de credenciales',
      plainDefinition: 'Recopilar contraseñas, claves de API o sesiones activas — normalmente como primer paso antes de usarlas para entrar en otras cuentas.',
      technicalNote: 'Objetivos comunes: archivos de claves SSH/nube, almacenes de contraseñas del navegador, cookies de sesión y variables de entorno.',
    },
    {
      id: 'persistence', category: 'threat', term: 'Persistencia',
      plainDefinition: 'Una técnica que hace que el software malicioso siga ejecutándose automáticamente — en cada inicio de sesión, cada reinicio — sin que nadie lo vuelva a lanzar.',
      technicalNote: 'Mecanismos comunes: tareas programadas, cron, claves de Registro "Run" de Windows, agentes de lanzamiento de macOS.',
    },
    {
      id: 'obfuscation', category: 'threat', term: 'Ofuscación',
      plainDefinition: 'Enmascarar deliberadamente el código para que un humano (o un escáner simple) no pueda saber fácilmente qué hace con solo mirarlo — aunque funcione exactamente igual.',
      technicalNote: 'Ejemplos comunes: reconstrucción de arreglos de códigos de carácter, payloads codificados en Base64, cadenas de concatenación como evasión.',
    },
    {
      id: 'entropy', category: 'threat', term: 'Entropía (en esta herramienta)',
      plainDefinition: 'Una medida de cuán "aleatorio" parece un fragmento de texto. Las frases normales puntúan bajo; los datos codificados o cifrados puntúan alto.',
      technicalNote: 'Se mide como entropía de Shannon (bits por carácter). El texto en prosa suele tener ~3.5–4.3 bits/carácter; los datos en Base64 tienden a 5–6.',
    },
    {
      id: 'lolbin', category: 'threat', term: 'LOLBin (binario del sistema reutilizado)',
      plainDefinition: 'Una herramienta legítima y preinstalada del sistema que se reutiliza para un ataque — usar algo ya confiable en lugar de traer software obviamente malicioso.',
      technicalNote: 'Ejemplos: certutil, PowerShell, mshta en Windows.',
    },
    {
      id: 'capability-review', category: 'threat', term: 'Revisión de capacidad',
      plainDefinition: 'El paso asistido por IA de esta herramienta que explica qué haría realmente un código o comando si se ejecutara — sin juzgar si el texto circundante intenta manipular a una IA. Esa pregunta la maneja el análisis de Inyección, por separado.',
    },
    {
      id: 'prompt-injection', category: 'injection', term: 'Inyección de prompt',
      plainDefinition: 'Texto diseñado para engañar a un sistema de IA y hacer que ignore sus instrucciones y siga las del atacante — oculto dentro de contenido que la IA solo debía leer, no obedecer.',
    },
    {
      id: 'jailbreak', category: 'injection', term: 'Jailbreak',
      plainDefinition: 'Un intento de convencer a un sistema de IA de abandonar sus reglas de seguridad — mediante juegos de rol, falsos "modos de desarrollador" u otras técnicas de persuasión.',
    },
    {
      id: 'tag-char-smuggling', category: 'injection', term: 'Contrabando de caracteres Tag / ASCII',
      plainDefinition: 'Ocultar un mensaje secreto completo dentro de caracteres Unicode "tag" invisibles que no se muestran en absoluto — invisibles para un humano, pero legibles por una IA que procesa el texto sin procesar.',
      technicalNote: 'Usa el bloque Unicode Tag (U+E0000–U+E007F), cada punto de código mapeado 1:1 a un carácter ASCII.',
    },
    {
      id: 'trojan-source', category: 'injection', term: 'Trojan Source (inversión Bidi)',
      plainDefinition: 'Un truco con caracteres de control invisibles que hace que el texto se muestre visualmente en un orden distinto al que realmente procesa la IA o el compilador.',
      technicalNote: 'Usa caracteres de control bidireccional Unicode (p. ej. U+202E) para reordenar los glifos mostrados.',
    },
    {
      id: 'homoglyph', category: 'injection', term: 'Homóglifo',
      plainDefinition: 'Un carácter de otro alfabeto que se ve casi idéntico a uno familiar — como una "а" cirílica en lugar de una "a" latina — usado para evadir filtros.',
    },
    {
      id: 'zero-width-character', category: 'injection', term: 'Carácter de ancho cero',
      plainDefinition: 'Un carácter que no ocupa espacio visible al mostrarse, pero sigue presente en el texto subyacente — usado para ocultar marcadores o mensajes codificados.',
      technicalNote: 'Ejemplos comunes: Zero Width Space (U+200B), Zero Width Non-Joiner (U+200C), Zero Width Joiner (U+200D), y el BOM (U+FEFF) cuando aparece a mitad de texto.',
    },
    {
      id: 'steganography', category: 'injection', term: 'Esteganografía',
      plainDefinition: 'Ocultar un mensaje dentro de algo que parece completamente ordinario, en lugar de cifrarlo — el objetivo es que nadie note que hay un mensaje oculto que buscar.',
    },
    {
      id: 'tokenizer', category: 'injection', term: 'Tokenizador',
      plainDefinition: 'El componente que divide el texto en pequeñas piezas ("tokens") que un modelo de IA realmente lee. Los caracteres ocultos pueden inflar silenciosamente este conteo.',
    },
    {
      id: 'watermark-green-list', category: 'watermark', term: 'Marca de agua de lista verde',
      plainDefinition: 'Una huella estadística que algunos sistemas de IA incrustan silenciosamente en el texto generado favoreciendo sutilmente ciertas palabras — invisible para el lector, pero detectable rehaciendo el mismo cálculo.',
      technicalNote: 'Basado en el esquema de Kirchenbauer et al.: una clave secreta divide el vocabulario en una "lista verde" y una "lista roja" en cada paso de generación.',
    },
    {
      id: 'burstiness', category: 'footprint', term: 'Burstiness (variación de ráfaga)',
      plainDefinition: 'Cuánto varía la longitud de las oraciones en un texto. Los humanos mezclan de forma natural oraciones cortas y largas; el texto generado por IA suele tener longitudes inusualmente uniformes.',
    },
    {
      id: 'perplexity', category: 'footprint', term: 'Perplejidad',
      plainDefinition: 'Una medida de cuán "predecible" es un texto para un modelo de lenguaje. El texto generado por IA suele puntuar de forma más uniformemente predecible que la escritura humana natural.',
    },
    {
      id: 'bonferroni-correction', category: 'general', term: 'Corrección de Bonferroni',
      plainDefinition: 'Una salvaguarda estadística usada al ejecutar muchas pruebas a la vez, para que hacer más pruebas no aumente la probabilidad de ver un resultado "significativo" solo por azar.',
      technicalNote: 'Se usa en el Barrido de Marca de Agua (216 combinaciones) para mantener la tasa de falsos positivos bajo control.',
    },
    {
      id: 'shingling', category: 'plagiarism', term: 'Segmentación en Shingles (N-gramas)',
      plainDefinition: 'Técnica que divide el texto en secuencias superpuestas de palabras (4-gramas o 5-gramas) para detectar pasajes idénticos o casi idénticos copiados entre documentos.',
      technicalNote: 'Los shingles se convierten en hashes numéricos para calcular la contención exacta y la intersección sobre unión (Jaccard).',
    },
    {
      id: 'winnowing', category: 'plagiarism', term: 'Algoritmo Winnowing',
      plainDefinition: 'Algoritmo que selecciona un subconjunto representativo y compacto de hashes de un documento, garantizando la detección de cualquier pasaje copiado mayor a un umbral.',
      technicalNote: 'Mantiene una ventana deslizante y selecciona el hash mínimo en cada ventana para producir huellas digitales invariantes.',
    },
    {
      id: 'patchwriting', category: 'plagiarism', term: 'Patchwriting y Plagio Mosaico',
      plainDefinition: 'Forma de copia donde el autor une frases de varias fuentes con solo cambios cosméticos menores de vocabulario o estructura, sin sintetizar ideas propias.',
      technicalNote: 'Se detecta intrínsecamente midiendo variaciones estilísticas bruscas (>2.0σ) de legibilidad Flesch-Kincaid, rareza de palabras y longitud de oraciones.',
    },
    {
      id: 'orphan-citation', category: 'plagiarism', term: 'Cita Huérfana',
      plainDefinition: 'Marcador de cita académica (como [1] o (Autor, 2024)) que aparece en el cuerpo del texto pero carece de la correspondiente entrada en la bibliografía o lista de referencias.',
    },
    {
      id: 'semantic-paraphrase', category: 'plagiarism', term: 'Paráfrasis Semántica',
      plainDefinition: 'Reescritura de una idea usando diferente vocabulario y sintaxis mientras se conserva el significado original exacto, detectable mediante embeddings neuronales.',
      technicalNote: 'Evaluada con filtrado candidato TF-IDF seguido de similitud coseno con all-MiniLM-L6-v2 (≥0.82).',
    },
    {
      id: 'typographic-tells', category: 'footprint', term: 'Rasgos Tipográficos de IA',
      plainDefinition: 'Hábitos de puntuación y formato característicos de los modelos de lenguaje, como el exceso de guiones largos, comillas tipográficas uniformes y listas con viñeta y negrita.',
    },
  ],
};

// ---------------------------------------------------------------------------
// FRENCH (fr)
// ---------------------------------------------------------------------------
const FR_HELP: LocalizedHelpContent = {
  categories: {
    safety: 'Sécurité & Défense IA (Détecter et Supprimer)',
    artifacts: 'Filigranes & Empreintes IA (Détecter et Neutraliser)',
    engines: 'Modèles IA, Moteurs & Confidentialité',
    setup: 'Démarrage & Confidentialité',
    synthesis: 'Synthèse & Vérification',
  },
  guideLessons: [
    {
      id: 'g-0',
      category: 'setup',
      categoryTitle: 'Démarrage & Confidentialité',
      title: 'Leçon 0 · Prise en main (2 min)',
      goal: 'Charger du texte et définir le niveau de confidentialité.',
      steps: [
        'Collez du texte dans l’éditeur de gauche ou glissez un fichier .txt, .docx ou .pdf.',
        'Vérifiez le sélecteur en haut à droite : "Offline" assure une exécution 100% locale sans réseau.',
        'Basculez entre les sections Sécurité IA et Filigranes IA selon votre besoin.',
      ],
      tip: 'L’application fonctionne entièrement hors ligne par défaut.',
    },
    {
      id: 'g-1',
      category: 'safety',
      categoryTitle: 'Sécurité & Défense IA',
      title: 'Leçon 1 · Détecter les caractères invisibles (Scanner)',
      goal: 'Repérer les caractères Unicode masqués et homoglyphes.',
      steps: [
        'Cliquez sur l’onglet SCANNER (◈) dans la section Sécurité.',
        'Appuyez sur "Scanner" pour examiner chaque caractère du document.',
        'Consultez les résultats et appliquez le nettoyage.',
      ],
      tip: 'Zéro résultat indique un texte parfaitement propre.',
    },
    {
      id: 'g-2',
      category: 'safety',
      categoryTitle: 'Sécurité & Défense IA',
      title: 'Leçon 2 · Détecter les injections de prompts (Injection)',
      goal: 'Démasquer les injections cachées, le contrebande ASCII et l’exfiltration.',
      steps: [
        'Cliquez sur l’onglet INJECTION (⛨) dans la section Sécurité.',
        'Appuyez sur "Inspecter le texte" pour décoder les caractères masqués.',
        'Basculez entre "Vue Modèle" (Rayons X) et "Vue Humaine".',
        'Cliquez sur "Supprimer les injections" pour assainir le texte.',
      ],
      tip: 'Utilisez les exemples d’attaques pour tester des scénarios réels.',
    },
    {
      id: 'g-3',
      category: 'artifacts',
      categoryTitle: 'Filigranes & Empreintes IA',
      title: 'Leçon 3 · Vérifier les filigranes statistiques (Filigrane)',
      goal: 'Identifier les filigranes Kirchenbauer insérés par les LLM.',
      steps: [
        'Cliquez sur l’onglet FILIGRANE (⊕) dans la section Empreintes.',
        'Lancez le balayage pour tester 216 configurations.',
        'Appliquez la neutralisation si un signal est détecté.',
      ],
      tip: 'L’annulation ciblée modifie un minimum de mots.',
    },
    {
      id: 'g-4',
      category: 'artifacts',
      categoryTitle: 'Filigranes & Empreintes IA',
      title: 'Leçon 4 · Analyser le rythme et les clichés (Empreinte)',
      goal: 'Mesurer si le style correspond à une rédaction automatisée.',
      steps: [
        'Cliquez sur l’onglet EMPREINTE (⊗) et appuyez sur "Analyser".',
        'Vérifiez le score de probabilité machine et les clichés.',
        'Cliquez sur "Supprimer l’empreinte" pour varier le style.',
      ],
      tip: 'Réanalysez après suppression pour constater l’amélioration.',
    },
    {
      id: 'g-5',
      category: 'artifacts',
      categoryTitle: 'Filigranes & Empreintes IA',
      title: 'Leçon 5 · Optimisation contradictoire (Optimiseur)',
      goal: 'Minimiser la détectabilité par recuit simulé.',
      steps: [
        'Cliquez sur l’onglet OPTIMISEUR (⟁).',
        'Lancez l’optimiseur Oracle et observez la convergence.',
      ],
      tip: 'Utilisez le score de perplexité pour valider la fluidité humaine.',
    },
    {
      id: 'g-6',
      category: 'synthesis',
      categoryTitle: 'Synthèse & Vérification',
      title: 'Leçon 6 · Générer un rapport d’intégrité (Rapport)',
      goal: 'Créer un certificat d’audit horodaté et exportable.',
      steps: [
        'Cliquez sur l’onglet RAPPORT (≡).',
        'Générez le rapport consolidé et exportez en PDF ou Markdown.',
      ],
      tip: 'Le rapport inclut le hachage SHA-256 avant/après.',
    },
  ],
  helpSections: [
    {
      id: 'h-scanner',
      category: 'safety',
      categoryTitle: 'Sécurité & Défense IA',
      icon: '◈',
      title: 'Moteur de Scan Unicode et Stéganographie',
      color: 'text-warning dark:text-yellow-400',
      content: 'Détecte les caractères de largeur nulle, homoglyphes cyrilliques/grecs et inversions Bidi.',
    },
    {
      id: 'h-injection',
      category: 'safety',
      categoryTitle: 'Sécurité & Défense IA',
      icon: '⛨',
      title: 'Inspecteur d’Injections de Prompts & Contrebande ASCII',
      color: 'text-danger dark:text-red-400',
      content: 'Décode les caractères d’étiquettes Unicode (U+E0000), flux stéganographiques ZWS et annule les charges malveillantes.',
    },
    {
      id: 'h-watermark',
      category: 'artifacts',
      categoryTitle: 'Filigranes & Empreintes IA',
      icon: '⊕',
      title: 'Filigranes Statistiques et Neutralisation',
      color: 'text-accent',
      content: 'Balayage de 216 configurations de filigranes et suppression ciblée à perturbation minimale.',
    },
    {
      id: 'h-footprint',
      category: 'artifacts',
      categoryTitle: 'Filigranes & Empreintes IA',
      icon: '⊗',
      title: 'Empreinte Stylométrique et Clichés IA',
      color: 'text-danger dark:text-red-400',
      content: 'Analyse de la régularité de longueur des phrases, uniformité de perplexité et tournures typiques d’IA.',
    },
    {
      id: 'h-optimizer',
      category: 'artifacts',
      categoryTitle: 'Filigranes & Empreintes IA',
      icon: '⟁',
      title: 'Optimiseur Contradictoire et Perplexité LM',
      color: 'text-accent',
      content: 'Optimisation par recuit simulé Oracle avec plancher sémantique et score de perplexité neuronal.',
    },
    {
      id: 'h-fingerprint-removal',
      category: 'artifacts',
      categoryTitle: 'Filigranes & Empreintes IA',
      icon: '⊗',
      title: 'Suite de Suppression d’Empreintes IA en 4 Couches',
      color: 'text-success dark:text-emerald-400',
      content: `Pipeline déterministe de nettoyage par étapes conçu pour effacer les marqueurs stylométriques de génération par IA :
• Masquage des Zones Protégées : Protège temporairement les blocs de code, le code en ligne et les URLs contre toute corruption.
• Couche 1 (Lexicale) : Remplace les mots répétitifs et clichés de l’IA ("approfondir", "crucial", "multiforme") par des équivalents humains.
• Couche 2 (Formules types et hésitation) : Supprime les formules répétitives ("il est important de noter que") et le style artificiel.
• Couche 3 (Typographie) : Normalise les guillemets courbes, réécrit les listes à tirets automatiques et équilibre les tirets cadratins.
• Couche 4 (Variabilité et Carte de Risque) : Scinde les phrases anormalement longues (24+ mots) et assemble les petites propositions pour recréer le rythme humain.`,
    },
    {
      id: 'h-plagiarism',
      category: 'artifacts',
      categoryTitle: 'Synthèse & Vérification',
      icon: '§',
      title: 'Suite de Plagiat et Originalité en 4 Modes',
      color: 'text-accent',
      content: `Vérification approfondie de l’originalité académique et éditoriale :
• Mode 1 (Coffre de Références 1-à-N) : Shingles de mots (4-grammes/5-grammes), hachage Winnowing et calcul de similarité MinHash Jaccard.
• Mode 2 (Paraphrase Sémantique) : Préfiltrage TF-IDF combiné aux embeddings neuronaux sur l’appareil (all-MiniLM-L6-v2).
• Mode 3 (Rupture de Style Intrinsèque) : Détecte les duplications internes, le patchwriting en mosaïque (>2.0σ de variance) et les citations orphelines sans bibliographie.
• Mode 4 (Vérification Web et Académique) : Interroge les API CrossRef et Wikipédia pour identifier les sources publiées avec liens directs.`,
    },
    {
      id: 'h-local-models',
      category: 'engines',
      categoryTitle: 'Modèles IA, Moteurs & Confidentialité',
      icon: '🧠',
      title: 'Hub de Modèles IA Locaux et Architecture',
      color: 'text-info dark:text-blue-400',
      content: `Modèles neuronaux s’exécutant à 100% dans le navigateur via Transformers.js avec accélération WebGPU ou WASM :
• Réécrivain Rapide (LaMini-Flan-T5-77M / ~80Mo) : Humanisation ultrarapide et rotation de synonymes.
• Réécrivain Équilibré (LaMini-Flan-T5-248M / ~250Mo) : Génération T5 de plus grande capacité pour paragraphes complexes.
• IA Locale Intelligente (SmolLM2-360M-Instruct / ~210Mo) : Modèle quantifié 4-bits adapté à l’humanisation et aux explications de menaces en JSON hors ligne.
• IA Locale Pro (Qwen2.5-0.5B-Instruct / ~310Mo) : Précision maximale sur l’appareil pour les analyses forensiques approfondies.
• Scoreur de Perplexité Neural (SmolLM2-135M / gpt2 / ~95-125Mo) : Modèles causaux calculant la perplexité par fenêtre glissante.
• Embedder Sémantique (all-MiniLM-L6-v2 / ~23Mo) : Extraction d’embeddings de 384 dimensions pour la détection de paraphrase.`,
    },
  ],
  changelog: [
    {
      version: 'v3.0.0',
      date: '2026-10',
      title: 'Tableau de Bord Visuel, Suppression d’Empreintes IA, Suite de Plagiat et Hub d’IA Locale',
      highlights: [
        'Tableau de Bord Principal : Bouton "Tout Analyser", 4 jauges radiales SVG animées, radar forensique à 5 axes et cartes de résolution rapide.',
        'Suite de Suppression d’Empreintes IA en 4 Couches : Protection du code et URLs, dictionnaire de synonymes purifié, typographie équilibrée et carte de chaleur par phrase.',
        'Explicateur Unifié de Vecteurs d’Attaque : Diagnostic instantané et analyse approfondie par IA sur le Scanner, l’Injection et les Menaces.',
        'Corrélation de Chaînes d’Attaque (Kill-Chain) : Détection d’attaques combinées complexes avec échelle de désanonymisation récursive sécurisée.',
        'Suite de Plagiat en 4 Modes : Shingles 1-à-N, paraphrase sémantique par embeddings neuronaux, patchwriting intrinsèque et vérification web (CrossRef/Wikipédia).',
        'Hub de Modèles IA Locaux : Sélection de modèles optimisés avec SmolLM2-360M, Qwen2.5-0.5B, SmolLM2-135M et all-MiniLM-L6-v2 avec détection WebGPU.',
        'Historique Universel des Mutations : Annuler / Rétablir / Restaurer global avec comparateur visuel de différences en ligne et par mot.',
        'Rapports d’Intégrité Forensique : Synthèse visuelle pour décideurs, export DOCX, PDF avec en-tête N&B, CSV et JSON.',
      ],
    },
    {
      version: 'v2.2.0',
      date: '2026-08',
      title: 'Analyse des Charges et Menaces',
      highlights: [
        'Nouvel onglet Menaces (☠) : détecte le code, les commandes et les charges encodées dangereuses cachées dans le texte — sans condition préalable, indépendamment du fait que le texte environnant soit un jailbreak.',
        'Décodage récursif des charges en Base64, hexadécimal, ROT13 et encodage pourcentage, avec une règle d’"arrêt anticipé" dès qu’un motif dangereux est trouvé.',
        'Chaque résultat inclut une explication forensique complète — ce qu’il fait, ce qu’il touche, la conséquence réelle, pourquoi il apparaît ici, et quoi faire — pas seulement une étiquette de gravité.',
        'Analyse de capacité assistée par IA optionnelle pour les charges inédites que la bibliothèque de règles hors ligne ne reconnaît pas, avec une gestion honnête quand un modèle refuse de répondre.',
        'Nouvel onglet Glossaire : définitions en langage simple pour chaque terme technique de l’app, liées directement depuis les résultats de Menaces.',
        'Nouvelle option de fournisseur "Non censuré (hors ligne, avancé)" pour l’analyse de capacité avec un risque de refus réduit sur une analyse défensive légitime — entièrement hors ligne via Ollama.',
        'Corrigé : l’analyse d’Injection détecte désormais les déclencheurs de jailbreak en texte brut même sans aucune charge Unicode invisible présente.',
        'Corrigé : l’évaluation sémantique par IA d’Injection fonctionne désormais correctement sur les 5 fournisseurs (échouait silencieusement sur Anthropic, Gemini et le modèle local).',
        'Les rapports d’intégrité (JSON/CSV/PDF) incluent désormais l’analyse de Menaces complète, avec des explications complètes par résultat.',
        'La version de l’app est désormais lue depuis une seule source, afin que le rapport, l’Aide et la barre de titre ne puissent plus jamais diverger.',
      ],
    },
    {
      version: 'v2.1.0',
      date: '2026-08',
      title: 'Inspecteur d’Injections et Réorganisation en Domaines',
      highlights: [
        'Nouvel onglet d’inspection des injections de prompts (⛨).',
        'Vue Rayons X / Vue Humaine pour comparer les tokens et le rendu.',
        'Bouton "Supprimer le modèle" directement dans la barre d’outils.',
        'Traduction complète en 5 langues pour toute l’aide.',
      ],
    },
    {
      version: 'v2.0.0',
      date: '2026-08',
      title: 'Optimisation Avancée et Moteur Neuronal',
      highlights: ['Optimiseur Oracle, empoisonnement de frontières et calcul de perplexité WebGPU.'],
    },
    {
      version: 'v1.0.0',
      date: '2026-07',
      title: 'Fondation Forensique',
      highlights: ['Scanner Unicode et balayage de filigranes statistiques.'],
    },
  ],
  about: {
    title: 'AI TextSense',
    tagline: 'Inspecteur Forensique de Texte & Injections de Prompts',
    description: 'Station d’analyse forensique pour la sécurité des prompts et la neutralisation de filigranes d’IA.',
    privacyTitle: 'Garantie de Confidentialité',
    privacyBody: 'AI TextSense fonctionne localement dans votre navigateur. Aucune donnée n’est transmise en mode Offline.',
    licenseTitle: 'Droits d’Auteur',
    licenseBody: '© 2026 Wilson Volpe. Tous droits réservés.',
    author: 'Wilson Volpe',
  },
  glossary: [
    {
      id: 'destructive-command', category: 'threat', term: 'Commande destructive',
      plainDefinition: 'Une commande qui supprime ou écrase des fichiers ou des données de façon permanente, sans annulation possible — comme vider une corbeille qui n’a jamais existé.',
      technicalNote: 'Exemples : "rm -rf" (Linux/macOS), "del /f /s /q" (Windows), commandes de formatage de disque.',
    },
    {
      id: 'pipe-to-shell', category: 'threat', term: 'Pipe vers un shell',
      plainDefinition: 'Une astuce en une ligne qui télécharge un script depuis internet et l’exécute immédiatement, sans jamais vous le montrer d’abord — comme signer un contrat qu’on ne vous laisse pas lire.',
      technicalNote: 'Forme : "curl ... | bash" ou "iwr ... | iex". Le contenu servi peut changer à chaque requête.',
    },
    {
      id: 'c2', category: 'threat', term: 'C2 (Commande et Contrôle)',
      plainDefinition: 'Le canal de "rappel" qu’un attaquant utilise pour contrôler à distance une machine compromise après l’intrusion initiale.',
      technicalNote: 'Les shells inversés et le trafic d’exfiltration encodé sont des mécanismes C2 courants.',
    },
    {
      id: 'reverse-shell', category: 'threat', term: 'Shell inversé',
      plainDefinition: 'Une astuce où une machine appelle un attaquant et lui remet une ligne de commande en direct — l’inverse d’une connexion entrante, ce qui lui permet de contourner de nombreux pare-feux.',
      technicalNote: 'La machine compromise initie une connexion sortante (généralement autorisée) et y attache un shell.',
    },
    {
      id: 'rat', category: 'threat', term: 'RAT (Cheval de Troie d’Accès à Distance)',
      plainDefinition: 'Un logiciel malveillant qui donne discrètement à quelqu’un d’autre le contrôle total et à distance de votre ordinateur.',
      technicalNote: 'Combine généralement un mécanisme de persistance avec un canal C2 et souvent des fonctions de collecte de données.',
    },
    {
      id: 'exfiltration', category: 'threat', term: 'Exfiltration',
      plainDefinition: 'Faire sortir des données d’un système vers un endroit contrôlé par l’attaquant.',
      technicalNote: 'Vecteurs courants : requêtes HTTP sortantes transportant des données volées, tunneling DNS, ou secrets intégrés dans une URL appelée automatiquement.',
    },
    {
      id: 'credential-harvesting', category: 'threat', term: 'Collecte d’identifiants',
      plainDefinition: 'Collecter des mots de passe, clés d’API ou sessions actives — généralement comme première étape avant de les utiliser pour accéder à d’autres comptes.',
      technicalNote: 'Cibles courantes : fichiers de clés SSH/cloud, gestionnaires de mots de passe du navigateur, cookies de session, variables d’environnement.',
    },
    {
      id: 'persistence', category: 'threat', term: 'Persistance',
      plainDefinition: 'Une technique qui fait tourner un logiciel malveillant automatiquement — à chaque connexion, chaque redémarrage — sans que personne ait à le relancer.',
      technicalNote: 'Mécanismes courants : tâches planifiées, cron, clés de Registre "Run" de Windows, agents de lancement macOS.',
    },
    {
      id: 'obfuscation', category: 'threat', term: 'Obfuscation',
      plainDefinition: 'Brouiller délibérément du code pour qu’un humain (ou un scanner simple) ne puisse pas facilement comprendre ce qu’il fait d’un coup d’œil — tout en s’exécutant exactement pareil.',
      technicalNote: 'Techniques courantes : reconstruction de tableaux de codes de caractères, charges encodées en Base64, chaînes de concaténation d’évasion.',
    },
    {
      id: 'entropy', category: 'threat', term: 'Entropie (dans cet outil)',
      plainDefinition: 'Une mesure du caractère "aléatoire" apparent d’un morceau de texte. Les phrases ordinaires ont un score bas ; les données encodées ou chiffrées ont un score élevé.',
      technicalNote: 'Mesurée ici en entropie de Shannon (bits par caractère). La prose anglaise typique est ~3,5–4,3 bits/caractère ; les données Base64 tendent vers 5–6.',
    },
    {
      id: 'lolbin', category: 'threat', term: 'LOLBin (binaire système détourné)',
      plainDefinition: 'Un outil système légitime et préinstallé détourné pour une attaque — utiliser quelque chose déjà considéré comme fiable plutôt qu’apporter un logiciel manifestement malveillant.',
      technicalNote: 'Exemples : certutil, PowerShell, mshta sous Windows.',
    },
    {
      id: 'capability-review', category: 'threat', term: 'Analyse de capacité',
      plainDefinition: 'L’étape assistée par IA de cet outil qui explique ce qu’un code ou une commande ferait réellement s’il était exécuté — sans juger si le texte environnant tente de manipuler une IA. Cette question relève de l’analyse d’Injection, séparément.',
    },
    {
      id: 'prompt-injection', category: 'injection', term: 'Injection de prompt',
      plainDefinition: 'Un texte conçu pour tromper un système d’IA et lui faire ignorer ses instructions au profit de celles de l’attaquant — caché dans un contenu que l’IA ne devait que lire, pas exécuter.',
    },
    {
      id: 'jailbreak', category: 'injection', term: 'Jailbreak',
      plainDefinition: 'Une tentative de convaincre un système d’IA d’abandonner ses règles de sécurité — via un jeu de rôle, un faux "mode développeur", ou d’autres techniques de persuasion.',
    },
    {
      id: 'tag-char-smuggling', category: 'injection', term: 'Contrebande de caractères Tag / ASCII',
      plainDefinition: 'Cacher un message secret entier dans des caractères Unicode "tag" invisibles qui ne s’affichent absolument pas — invisibles pour un humain, mais lisibles par une IA traitant le texte brut.',
      technicalNote: 'Utilise le bloc Unicode Tag (U+E0000–U+E007F), chaque point de code correspondant 1:1 à un caractère ASCII.',
    },
    {
      id: 'trojan-source', category: 'injection', term: 'Trojan Source (inversion Bidi)',
      plainDefinition: 'Une astuce utilisant des caractères de contrôle invisibles qui fait s’afficher le texte visuellement dans un ordre différent de celui réellement traité par l’IA ou le compilateur.',
      technicalNote: 'Utilise des caractères de contrôle bidirectionnels Unicode (ex. U+202E) pour réordonner les glyphes affichés.',
    },
    {
      id: 'homoglyph', category: 'injection', term: 'Homoglyphe',
      plainDefinition: 'Un caractère d’un autre alphabet qui ressemble presque exactement à un caractère familier — comme un "а" cyrillique remplaçant un "a" latin — utilisé pour contourner des filtres.',
    },
    {
      id: 'zero-width-character', category: 'injection', term: 'Caractère à largeur nulle',
      plainDefinition: 'Un caractère qui n’occupe aucun espace visible à l’affichage, mais reste présent dans le texte sous-jacent — utilisé pour cacher des marqueurs ou des messages encodés.',
      technicalNote: 'Exemples courants : Zero Width Space (U+200B), Zero Width Non-Joiner (U+200C), Zero Width Joiner (U+200D), et le BOM (U+FEFF) en milieu de texte.',
    },
    {
      id: 'steganography', category: 'injection', term: 'Stéganographie',
      plainDefinition: 'Cacher un message dans quelque chose qui semble parfaitement ordinaire, plutôt que de le chiffrer — le but étant que personne ne remarque même qu’il y a un message caché à chercher.',
    },
    {
      id: 'tokenizer', category: 'injection', term: 'Tokeniseur',
      plainDefinition: 'Le composant qui découpe le texte en petits morceaux ("tokens") qu’un modèle d’IA lit réellement. Des caractères cachés peuvent gonfler discrètement ce compte.',
    },
    {
      id: 'watermark-green-list', category: 'watermark', term: 'Filigrane à liste verte',
      plainDefinition: 'Une empreinte statistique que certains systèmes d’IA intègrent discrètement dans le texte généré en favorisant subtilement certains mots — invisible pour un lecteur, mais détectable en refaisant le même calcul.',
      technicalNote: 'Basé sur le schéma de Kirchenbauer et al. : une clé secrète divise le vocabulaire en une "liste verte" et une "liste rouge" à chaque étape de génération.',
    },
    {
      id: 'burstiness', category: 'footprint', term: 'Burstiness (irrégularité rythmique)',
      plainDefinition: 'À quel point la longueur des phrases varie dans un texte. Les humains mélangent naturellement phrases courtes et longues ; le texte généré par IA a souvent des longueurs étrangement uniformes.',
    },
    {
      id: 'perplexity', category: 'footprint', term: 'Perplexité',
      plainDefinition: 'Une mesure de la "prévisibilité" d’un texte pour un modèle de langage. Le texte généré par IA tend à avoir un score plus uniformément prévisible que l’écriture humaine naturelle.',
    },
    {
      id: 'bonferroni-correction', category: 'general', term: 'Correction de Bonferroni',
      plainDefinition: 'Une garantie statistique utilisée lorsqu’on effectue de nombreux tests à la fois, pour qu’en faire davantage n’augmente pas la probabilité de voir un résultat "significatif" par pur hasard.',
      technicalNote: 'Utilisée dans le Balayage de Filigrane (216 combinaisons) pour garder le taux de faux positifs sous contrôle.',
    },
    {
      id: 'shingling', category: 'plagiarism', term: 'Shingling de Mots (N-grammes)',
      plainDefinition: 'Technique divisant le texte en séquences recouvrantes de mots (4-grammes ou 5-grammes) pour détecter les passages copiés à l’identique ou presque.',
      technicalNote: 'Les shingles sont hachés numériquement pour calculer le confinement exact et l’indice de Jaccard.',
    },
    {
      id: 'winnowing', category: 'plagiarism', term: 'Algorithme Winnowing',
      plainDefinition: 'Algorithme sélectionnant un sous-ensemble compact et représentatif d’empreintes d’un texte pour garantir la détection de tout passage copié dépassant un seuil.',
      technicalNote: 'Maintient une fenêtre glissante de hachages et retient le minimum local pour former une empreinte invariante.',
    },
    {
      id: 'patchwriting', category: 'plagiarism', term: 'Patchwriting & Plagiat en Mosaïque',
      plainDefinition: 'Pratique consistant à assembler des phrases d’autres sources en ne modifiant que superficiellement les mots sans véritable synthèse originale.',
      technicalNote: 'Détecté de manière intrinsèque par l’écart de variance stylistique (>2.0σ) sur la lisibilité, la rareté du vocabulaire et la longueur des phrases.',
    },
    {
      id: 'orphan-citation', category: 'plagiarism', term: 'Citation Orpheline',
      plainDefinition: 'Mention de citation (ex. [1] ou (Auteur, 2024)) présente dans le corps du texte sans référence correspondante dans la bibliographie finale.',
    },
    {
      id: 'semantic-paraphrase', category: 'plagiarism', term: 'Paraphrase Sémantique',
      plainDefinition: 'Reformulation d’une idée avec des mots et une syntaxe différents tout en conservant le sens exact, détectable par embeddings neuronaux.',
      technicalNote: 'Évaluée via filtrage TF-IDF suivi d’une similarité cosinus (≥0.82) avec all-MiniLM-L6-v2.',
    },
    {
      id: 'typographic-tells', category: 'footprint', term: 'Tics Typographiques de l’IA',
      plainDefinition: 'Habitudes de mise en page et de ponctuation récurrentes des LLM, telles que l’usage excessif de tirets cadratins, de guillemets courbes constants et d’éléments de liste en gras.',
    },
  ],
};

// ---------------------------------------------------------------------------
// PORTUGUESE (pt-BR)
// ---------------------------------------------------------------------------
const PT_BR_HELP: LocalizedHelpContent = {
  categories: {
    safety: 'Segurança & Defesa de IA (Detectar e Remover)',
    artifacts: "Marcas d'água & Rastros de IA (Detectar e Neutralizar)",
    engines: 'Modelos de IA, Motores & Privacidade',
    setup: 'Primeiros Passos & Privacidade',
    synthesis: 'Síntese & Verificação',
  },
  guideLessons: [
    {
      id: 'g-0',
      category: 'setup',
      categoryTitle: 'Primeiros Passos & Privacidade',
      title: 'Lição 0 · Primeiros passos (2 min)',
      goal: 'Carregue o texto e defina o nível de privacidade.',
      steps: [
        'Cole qualquer texto no editor à esquerda ou arraste um arquivo .txt, .docx ou .pdf.',
        'Verifique a chave no topo direito: "Offline" garante 100% de processamento local.',
        'Navegue entre as seções de Segurança de IA e Marcas de Água no painel direito.',
      ],
      tip: 'O aplicativo funciona totalmente offline por padrão.',
    },
    {
      id: 'g-1',
      category: 'safety',
      categoryTitle: 'Segurança & Defesa de IA',
      title: 'Lição 1 · Detectar lixo invisível (Scanner)',
      goal: 'Encontre caracteres Unicode ocultos, homóglifos e espaços de largura zero.',
      steps: [
        'Clique na aba SCANNER (◈) na seção de Segurança.',
        'Clique em "Escanear" para inspecionar cada caractere do documento.',
        'Escolha o modo de limpeza ("conservador" ou "agressivo") e clique em "Aplicar".',
      ],
      tip: 'Zero resultados indica texto limpo e autêntico.',
    },
    {
      id: 'g-2',
      category: 'safety',
      categoryTitle: 'Segurança & Defesa de IA',
      title: 'Lição 2 · Inspecionar injeções de prompt (Injeção)',
      goal: 'Desmascare injeções de prompt ocultas, contrabando ASCII e exfiltração.',
      steps: [
        'Clique na aba INJEÇÃO (⛨) na seção de Segurança.',
        'Clique em "Inspecionar texto" para decodificar caracteres invisíveis e tags de prompt.',
        'Alterne entre "Visão do Modelo" (raio-X) e "Visão Humana" (texto visual).',
        'Clique em "Remover injeções" para purgar os comandos ocultos.',
      ],
      tip: 'Use o menu "Carregar amostra de ataque" para testar exemplos reais.',
    },
    {
      id: 'g-3',
      category: 'artifacts',
      categoryTitle: "Marcas d'água & Rastros de IA",
      title: "Lição 3 · Checar marcas d'água estatísticas (Marca d'água)",
      goal: "Identifique marcas d'água Kirchenbauer inseridas por modelos de linguagem.",
      steps: [
        "Clique na aba MARCA D'ÁGUA (⊕) na seção de Rastros.",
        'Clique em "Varrer" para testar 216 combinações de chave simultaneamente.',
        'Clique em "Neutralizar" se houver detecção estatística.',
      ],
      tip: 'A anulação cirúrgica preserva o sentido original com alterações mínimas.',
    },
    {
      id: 'g-4',
      category: 'artifacts',
      categoryTitle: "Marcas d'água & Rastros de IA",
      title: 'Lição 4 · Avaliar ritmo estilométrico e clichês (Rastro)',
      goal: 'Verifique se o texto soa robotizado ou artificial.',
      steps: [
        'Clique na aba RASTRO DE IA (⊗) e clique em "Analisar".',
        'Observe a pontuação de probabilidade de máquina e frases clichês.',
        'Clique em "Remover rastro" para equilibrar a cadência das frases.',
      ],
      tip: 'Reanalise após a remoção para confirmar a melhoria.',
    },
    {
      id: 'g-5',
      category: 'artifacts',
      categoryTitle: "Marcas d'água & Rastros de IA",
      title: 'Lição 5 · Otimização adversarial profunda (Otimizador)',
      goal: 'Minimize a detectabilidade através de recozimento simulado.',
      steps: [
        'Clique na aba OTIMIZADOR (⟁) na seção de Rastros.',
        'Execute o otimizador Oracle e acompanhe a curva de melhoria.',
      ],
      tip: 'Use a pontuação de perplexidade para validar a naturalidade humana.',
    },
    {
      id: 'g-6',
      category: 'synthesis',
      categoryTitle: 'Síntese & Verificação',
      title: 'Lição 6 · Gerar relatórios de integridade (Relatório)',
      goal: 'Gere laudos periciais com hash criptográfico SHA-256.',
      steps: [
        'Clique na aba RELATÓRIO (≡) na seção de Síntese.',
        'Gere o relatório completo e exporte em PDF, Markdown, JSON ou CSV.',
      ],
      tip: 'O relatório serve como comprovação técnica de sanitização.',
    },
  ],
  helpSections: [
    {
      id: 'h-scanner',
      category: 'safety',
      categoryTitle: 'Segurança & Defesa de IA',
      icon: '◈',
      title: 'Motor de Escaneamento Unicode e Esteganografia',
      color: 'text-warning dark:text-yellow-400',
      content: 'Inspeciona caracteres invisíveis (ZWS/ZWNJ/ZWJ), inversões Bidi (Trojan Source) e homóglifos cirílicos/gregos.',
    },
    {
      id: 'h-injection',
      category: 'safety',
      categoryTitle: 'Segurança & Defesa de IA',
      icon: '⛨',
      title: 'Inspetor de Injeções de Prompt e Contrabando ASCII',
      color: 'text-danger dark:text-red-400',
      content: 'Decodifica caracteres de tag (U+E0000), esteganografia binária ZWS e neutraliza comandos ocultos em um clique.',
    },
    {
      id: 'h-watermark',
      category: 'artifacts',
      categoryTitle: "Marcas d'água & Rastros de IA",
      icon: '⊕',
      title: "Detecção e Neutralização de Marcas d'Água",
      color: 'text-accent',
      content: "Varredura de 216 combinações de marcas d'água Kirchenbauer e neutralização adaptativa com mínima distorção textual.",
    },
    {
      id: 'h-footprint',
      category: 'artifacts',
      categoryTitle: "Marcas d'água & Rastros de IA",
      icon: '⊗',
      title: 'Rastro Estilométrico e Clichês de IA',
      color: 'text-danger dark:text-red-400',
      content: 'Avalia a uniformidade de perplexidade, variação de tamanho de frases (Burstiness) e vocabulário típico de IA.',
    },
    {
      id: 'h-optimizer',
      category: 'artifacts',
      categoryTitle: "Marcas d'água & Rastros de IA",
      icon: '⟁',
      title: 'Otimizador Adversarial e Perplexidade Neural',
      color: 'text-accent',
      content: 'Otimização em malha fechada via recozimento simulado com preservação semântica (Jaccard ≥82%) e verificação por modelo causal GPT-2.',
    },
    {
      id: 'h-engines',
      category: 'engines',
      categoryTitle: 'Modelos de IA, Motores & Privacidade',
      icon: '≡',
      title: 'Modos de Execução, IA Local e Privacidade',
      color: 'text-info dark:text-blue-400',
      content: 'Operação 100% offline garantida. Botão "Excluir modelo" disponível diretamente na barra de configuração do LLM.',
    },
    {
      id: 'h-fingerprint-removal',
      category: 'artifacts',
      categoryTitle: "Marcas d'água & Rastros de IA",
      icon: '⊗',
      title: 'Suíte de Remoção de Pegadas de IA em 4 Camadas',
      color: 'text-success dark:text-emerald-400',
      content: `Pipeline determinístico de limpeza por etapas projetado para eliminar marcadores estilométricos de IA:
• Mascaramento de Trechos Protegidos: Protege blocos de código, código em linha e URLs para evitar corrupção sintática.
• Camada 1 (Léxica): Substitui palavras clichês de IA ("aprofundar", "crucial", "multifacetado") por equivalentes naturais de um mapa purificado.
• Camada 2 (Estrutural e Evasiva): Remove frases evasivas repetitivas ("é importante ressaltar que") e modelos robóticos.
• Camada 3 (Tipográfica): Normaliza aspas curvas, converte listas mecânicas em prosa fluida e equilibra travessões.
• Camada 4 (Ritmo e Mapa de Risco): Divide frases excessivamente longas (24+ palavras) e combina orações curtas para restaurar o ritmo humano.`,
    },
    {
      id: 'h-plagiarism',
      category: 'artifacts',
      categoryTitle: 'Síntese & Verificação',
      icon: '§',
      title: 'Suíte de Plágio e Originalidade em 4 Modos',
      color: 'text-accent',
      content: `Verificação abrangente de originalidade acadêmica e editorial:
• Modo 1 (Cofre de Referências 1-para-N): Shingles de 4/5 palavras, algoritmo Winnowing e contenção MinHash Jaccard em documentos de referência.
• Modo 2 (Paráfrase Semântica): Pré-filtro TF-IDF combinado com embeddings neurais no dispositivo (all-MiniLM-L6-v2).
• Modo 3 (Mudança de Estilo Intrínseca): Detecta duplicações internas, patchwriting em mosaico (>2.0σ de variância) e citações órfãs sem bibliografia.
• Modo 4 (Verificação Acadêmica e Web): Consulta APIs do CrossRef e da Wikipedia para contrastar literatura publicada com links diretos.`,
    },
    {
      id: 'h-local-models',
      category: 'engines',
      categoryTitle: 'Modelos de IA, Motores & Privacidade',
      icon: '🧠',
      title: 'Central de Modelos de IA Locais e Arquitetura',
      color: 'text-info dark:text-blue-400',
      content: `Modelos neurais rodando 100% no navegador via Transformers.js com aceleração WebGPU ou WASM:
• Reescritor Rápido (LaMini-Flan-T5-77M / ~80MB): Humanização ultrarrápida de sentenças e rotação de sinônimos.
• Reescritor Equilibrado (LaMini-Flan-T5-248M / ~250MB): Maior capacidade T5 para reestruturação de parágrafos complexos.
• IA Local Inteligente (SmolLM2-360M-Instruct / ~210MB): Modelo instruct quantizado em 4-bits para humanização e explicações de ameaças em JSON offline.
• IA Local Pro (Qwen2.5-0.5B-Instruct / ~310MB): Máxima precisão no dispositivo para análises forenses avançadas de ameaças.
• Pontuador de Perplexidade Neural (SmolLM2-135M / gpt2 / ~95-125MB): Modelos causais que calculam a perplexidade por janela deslizante.
• Embedder Semântico (all-MiniLM-L6-v2 / ~23MB): Extração de características e embeddings de 384 dimensões para detecção de paráfrases.`,
    },
  ],
  changelog: [
    {
      version: 'v3.0.0',
      date: '2026-10',
      title: 'Painel Forense Visual, Remoção de Pegadas de IA, Suíte de Plágio e Central de IA Local',
      highlights: [
        'Painel de Visão Geral: Botão "Escanear Tudo", 4 medidores radiais SVG animados, radar forense de 5 eixos e cartões de solução rápida.',
        'Suíte de Remoção de Pegadas de IA em 4 Camadas: Proteção de código/URLs, mapa purificado de sinônimos, tipografia normalizada e mapa de calor por frase.',
        'Explicador Unificado de Vetores de Ataque: Diagnóstico instantâneo e análise aprofundada com IA local/nuvem no Scanner, Injeção e Ameaças.',
        'Correlação de Cadeias de Ataque (Kill-Chain): Detecção de ataques em múltiplas etapas com desofuscação recursiva protegida.',
        'Suíte de Plágio em 4 Modos: Shingles 1-para-N, paráfrase semântica neural, patchwriting intrínseco e verificação web (CrossRef/Wikipedia).',
        'Central de Modelos de IA Locais: Catálogo com SmolLM2-360M, Qwen2.5-0.5B, SmolLM2-135M e all-MiniLM-L6-v2 com detecção WebGPU.',
        'Histórico Universal de Mutações: Desfazer / Refazer / Restaurar global com visualizador de diff em linha e por palavras.',
        'Relatórios Forenses de Integridade: Resumo executivo visual, exportação DOCX, PDF com cabeçalho P&B, CSV e JSON.',
      ],
    },
    {
      version: 'v2.2.0',
      date: '2026-08',
      title: 'Análise de Cargas e Ameaças',
      highlights: [
        'Nova aba Ameaças (☠): detecta código, comandos e cargas codificadas perigosas ocultas no texto — sem pré-condição alguma, independentemente de o texto ao redor ser um jailbreak.',
        'Decodificação recursiva de cargas em Base64, hexadecimal, ROT13 e codificação por porcentagem, com uma regra de "parada antecipada" ao encontrar um padrão perigoso.',
        'Cada achado traz uma explicação forense completa — o que faz, o que afeta, a consequência real, por que aparece aqui e o que fazer — não apenas um rótulo de severidade.',
        'Revisão de capacidade assistida por IA opcional para cargas novas que a biblioteca de regras offline não reconhece, com tratamento honesto quando um modelo se recusa a responder.',
        'Nova aba Glossário: definições em linguagem simples para cada termo técnico do app, vinculadas diretamente aos achados de Ameaças.',
        'Nova opção de provedor "Sem censura (offline, avançado)" para revisão de capacidade com menor risco de recusa em análise defensiva legítima — totalmente offline via Ollama.',
        'Corrigido: a análise de Injeção agora detecta gatilhos de jailbreak em texto simples mesmo sem nenhuma carga Unicode invisível presente.',
        'Corrigido: a avaliação semântica por IA de Injeção agora funciona corretamente nos 5 provedores (antes falhava silenciosamente em Anthropic, Gemini e no modelo local).',
        'Os relatórios de integridade (JSON/CSV/PDF) agora incluem a análise de Ameaças completa, com explicações completas por achado.',
        'A versão do app agora é lida de uma única fonte, para que o relatório, a Ajuda e a barra de título nunca mais divirjam.',
      ],
    },
    {
      version: 'v2.1.0',
      date: '2026-08',
      title: 'Inspetor de Injeção de Prompt e Reorganização por Domínios',
      highlights: [
        'Aba dedicada para Inspeção Forense de Injeções de Prompt (⛨).',
        'Visualizador duplo Raio-X / Visão Humana para comparar texto visual com tokens da IA.',
        'Botão direto "Excluir modelo" na barra de ferramentas.',
        'Tradução completa em 5 idiomas em todas as abas de Ajuda e Guia.',
      ],
    },
    {
      version: 'v2.0.0',
      date: '2026-08',
      title: 'Otimização Adversarial e Motores Avançados',
      highlights: ['Otimizador Oracle, envenenamento de fronteiras e cálculo de perplexidade WebGPU.'],
    },
    {
      version: 'v1.0.0',
      date: '2026-07',
      title: 'Fundação Pericial',
      highlights: ['Scanner Unicode e varredura estatística de marcas d’água.'],
    },
  ],
  about: {
    title: 'AI TextSense',
    tagline: 'Inspetor Pericial de Texto e Injeções de Prompt',
    description: 'Estação forense para auditoria de integridade textual, descoberta de injeções de prompt e neutralização de marcas de água de IA.',
    privacyTitle: 'Garantia de Privacidade',
    privacyBody: 'O AI TextSense opera inteiramente no seu navegador. No modo Offline, nenhum dado é transmitido.',
    licenseTitle: 'Propriedade Intelectual',
    licenseBody: '© 2026 Wilson Volpe. Todos os direitos reservados.',
    author: 'Wilson Volpe',
  },
  glossary: [
    {
      id: 'destructive-command', category: 'threat', term: 'Comando destrutivo',
      plainDefinition: 'Um comando que apaga ou sobrescreve arquivos ou dados permanentemente, sem opção de desfazer — como esvaziar uma lixeira que nunca existiu.',
      technicalNote: 'Exemplos: "rm -rf" (Linux/macOS), "del /f /s /q" (Windows), comandos de formatação de disco.',
    },
    {
      id: 'pipe-to-shell', category: 'threat', term: 'Pipe para shell',
      plainDefinition: 'Um truque de uma linha que baixa um script da internet e o executa imediatamente, sem nunca mostrá-lo antes — como assinar um contrato que você não pode ler.',
      technicalNote: 'Formato: "curl ... | bash" ou "iwr ... | iex". O conteúdo servido pode mudar a cada requisição.',
    },
    {
      id: 'c2', category: 'threat', term: 'C2 (Comando e Controle)',
      plainDefinition: 'O canal de "chamada para casa" que um invasor usa para controlar remotamente um computador comprometido após a invasão inicial.',
      technicalNote: 'Shells reversos e tráfego de exfiltração codificado são mecanismos de C2 comuns.',
    },
    {
      id: 'reverse-shell', category: 'threat', term: 'Shell reversa',
      plainDefinition: 'Um truque em que um computador liga para um invasor e entrega a ele uma linha de comando ao vivo — o oposto do invasor se conectar, por isso escapa de muitos firewalls.',
      technicalNote: 'A máquina comprometida inicia uma conexão de saída (geralmente permitida) e anexa um shell a ela.',
    },
    {
      id: 'rat', category: 'threat', term: 'RAT (Trojan de Acesso Remoto)',
      plainDefinition: 'Software malicioso que dá a outra pessoa controle remoto total do seu computador, silenciosamente.',
      technicalNote: 'Geralmente combina um mecanismo de persistência com um canal C2 e, frequentemente, recursos de coleta de dados.',
    },
    {
      id: 'exfiltration', category: 'threat', term: 'Exfiltração',
      plainDefinition: 'Retirar dados de um sistema para um local controlado pelo invasor.',
      technicalNote: 'Vetores comuns: requisições HTTP de saída carregando dados roubados, tunelamento DNS, ou segredos embutidos em uma URL solicitada automaticamente.',
    },
    {
      id: 'credential-harvesting', category: 'threat', term: 'Coleta de credenciais',
      plainDefinition: 'Coletar senhas, chaves de API ou sessões ativas — geralmente como primeiro passo antes de usá-las para invadir outras contas.',
      technicalNote: 'Alvos comuns: arquivos de chaves SSH/nuvem, armazenamento de senhas do navegador, cookies de sessão, variáveis de ambiente.',
    },
    {
      id: 'persistence', category: 'threat', term: 'Persistência',
      plainDefinition: 'Uma técnica que faz o software malicioso continuar rodando automaticamente — a cada login, a cada reinicialização — sem que ninguém precise iniciá-lo novamente.',
      technicalNote: 'Mecanismos comuns: tarefas agendadas, cron, chaves de Registro "Run" do Windows, agentes de inicialização do macOS.',
    },
    {
      id: 'obfuscation', category: 'threat', term: 'Ofuscação',
      plainDefinition: 'Embaralhar deliberadamente o código para que um humano (ou um scanner simples) não consiga saber facilmente o que ele faz só de olhar — mesmo funcionando exatamente igual.',
      technicalNote: 'Técnicas comuns: reconstrução de arrays de códigos de caractere, payloads codificados em Base64, cadeias de concatenação como evasão.',
    },
    {
      id: 'entropy', category: 'threat', term: 'Entropia (nesta ferramenta)',
      plainDefinition: 'Uma medida de quão "aleatório" um trecho de texto parece. Frases comuns pontuam baixo; dados codificados ou criptografados pontuam alto.',
      technicalNote: 'Medida aqui como entropia de Shannon (bits por caractere). Prosa em inglês costuma ficar em ~3,5–4,3 bits/caractere; dados em Base64 tendem a 5–6.',
    },
    {
      id: 'lolbin', category: 'threat', term: 'LOLBin (binário do sistema reaproveitado)',
      plainDefinition: 'Uma ferramenta legítima e pré-instalada do sistema reaproveitada para um ataque — usar algo já confiável em vez de trazer software obviamente malicioso.',
      technicalNote: 'Exemplos: certutil, PowerShell, mshta no Windows.',
    },
    {
      id: 'capability-review', category: 'threat', term: 'Revisão de capacidade',
      plainDefinition: 'A etapa assistida por IA desta ferramenta que explica o que um código ou comando realmente faria se fosse executado — sem julgar se o texto ao redor tenta manipular uma IA. Essa pergunta é tratada separadamente pela análise de Injeção.',
    },
    {
      id: 'prompt-injection', category: 'injection', term: 'Injeção de prompt',
      plainDefinition: 'Texto criado para enganar um sistema de IA e fazê-lo ignorar suas instruções e seguir as do invasor — oculto dentro de conteúdo que a IA deveria apenas ler, não obedecer.',
    },
    {
      id: 'jailbreak', category: 'injection', term: 'Jailbreak',
      plainDefinition: 'Uma tentativa de convencer um sistema de IA a abandonar suas regras de segurança — por meio de role-play, falso "modo desenvolvedor" ou outras técnicas de persuasão.',
    },
    {
      id: 'tag-char-smuggling', category: 'injection', term: 'Contrabando de caracteres Tag / ASCII',
      plainDefinition: 'Ocultar uma mensagem secreta inteira dentro de caracteres Unicode "tag" invisíveis que não aparecem de forma alguma — invisíveis para um humano, mas legíveis por uma IA que processa o texto bruto.',
      technicalNote: 'Usa o bloco Unicode Tag (U+E0000–U+E007F), cada ponto de código mapeado 1:1 para um caractere ASCII.',
    },
    {
      id: 'trojan-source', category: 'injection', term: 'Trojan Source (inversão Bidi)',
      plainDefinition: 'Um truque com caracteres de controle invisíveis que faz o texto ser exibido visualmente em uma ordem diferente da que a IA ou o compilador realmente processa.',
      technicalNote: 'Usa caracteres de controle bidirecional Unicode (ex.: U+202E) para reordenar os glifos exibidos.',
    },
    {
      id: 'homoglyph', category: 'injection', term: 'Homoglifo',
      plainDefinition: 'Um caractere de outro alfabeto que parece quase idêntico a um familiar — como um "а" cirílico no lugar de um "a" latino — usado para escapar de filtros.',
    },
    {
      id: 'zero-width-character', category: 'injection', term: 'Caractere de largura zero',
      plainDefinition: 'Um caractere que não ocupa espaço visível ao ser exibido, mas continua presente no texto subjacente — usado para esconder marcadores ou mensagens codificadas.',
      technicalNote: 'Exemplos comuns: Zero Width Space (U+200B), Zero Width Non-Joiner (U+200C), Zero Width Joiner (U+200D), e o BOM (U+FEFF) no meio do texto.',
    },
    {
      id: 'steganography', category: 'injection', term: 'Esteganografia',
      plainDefinition: 'Ocultar uma mensagem dentro de algo que parece completamente comum, em vez de criptografá-la — o objetivo é que ninguém sequer perceba que há uma mensagem oculta para procurar.',
    },
    {
      id: 'tokenizer', category: 'injection', term: 'Tokenizador',
      plainDefinition: 'O componente que divide o texto em pequenas partes ("tokens") que um modelo de IA realmente lê. Caracteres ocultos podem inflar silenciosamente essa contagem.',
    },
    {
      id: 'watermark-green-list', category: 'watermark', term: "Marca d'água de lista verde",
      plainDefinition: "Uma impressão estatística que alguns sistemas de IA incorporam silenciosamente no texto gerado, favorecendo sutilmente certas palavras — invisível para o leitor, mas detectável refazendo o mesmo cálculo.",
      technicalNote: 'Baseado no esquema de Kirchenbauer et al.: uma chave secreta divide o vocabulário em uma "lista verde" e uma "lista vermelha" a cada passo de geração.',
    },
    {
      id: 'burstiness', category: 'footprint', term: 'Burstiness (variação de rajada)',
      plainDefinition: 'O quanto o comprimento das frases varia em um texto. Humanos misturam naturalmente frases curtas e longas; texto gerado por IA costuma ter comprimentos incomumente uniformes.',
    },
    {
      id: 'perplexity', category: 'footprint', term: 'Perplexidade',
      plainDefinition: 'Uma medida de quão "previsível" um texto é para um modelo de linguagem. Texto gerado por IA costuma pontuar de forma mais uniformemente previsível que a escrita humana natural.',
    },
    {
      id: 'bonferroni-correction', category: 'general', term: 'Correção de Bonferroni',
      plainDefinition: 'Uma salvaguarda estatística usada ao rodar muitos testes de uma vez, para que rodar mais testes não aumente a chance de ver um resultado "significativo" só por acaso.',
      technicalNote: "Usada na Varredura de Marca d'Água (216 combinações) para manter a taxa de falsos positivos sob controle.",
    },
    {
      id: 'shingling', category: 'plagiarism', term: 'Shingling de Palavras (N-gramas)',
      plainDefinition: 'Técnica de divisão do texto em sequências sobrepostas de palavras (4-gramas ou 5-gramas) para detectar passagens idênticas ou quase idênticas copiadas entre documentos.',
      technicalNote: 'Os shingles são transformados em hashes numéricos para calcular a contenção exata e a sobreposição Jaccard.',
    },
    {
      id: 'winnowing', category: 'plagiarism', term: 'Algoritmo Winnowing',
      plainDefinition: 'Algoritmo que seleciona um subconjunto compacto e representativo de hashes de um documento, garantindo que qualquer passagem copiada maior que um limite seja detectada.',
      technicalNote: 'Mantém uma janela deslizante de hashes e retém o valor mínimo de cada janela para formar impressões digitais invariantes.',
    },
    {
      id: 'patchwriting', category: 'plagiarism', term: 'Patchwriting & Plágio em Mosaico',
      plainDefinition: 'Forma de cópia em que o autor reúne frases de diversas fontes fazendo apenas alterações superficiais de vocabulário ou sintaxe, sem sintetizar ideias originais.',
      technicalNote: 'Detectado intrinsecamente pela variação estatística brusca (>2.0σ) de legibilidade Flesch-Kincaid, raridade léxica e comprimento médio de frases.',
    },
    {
      id: 'orphan-citation', category: 'plagiarism', term: 'Citação Órfã',
      plainDefinition: 'Marcador de citação bibliográfica (como [1] ou (Autor, 2024)) presente no corpo do texto sem a devida entrada correspondente na bibliografia ou lista de referências final.',
    },
    {
      id: 'semantic-paraphrase', category: 'plagiarism', term: 'Paráfrase Semântica',
      plainDefinition: 'Reescrita de uma ideia usando vocabulário e estrutura sintática distintos mantendo o sentido original idêntico, detectável por embeddings neurais.',
      technicalNote: 'Avaliada via pré-filtragem TF-IDF seguida de similaridade de cosseno com all-MiniLM-L6-v2 (≥0.82).',
    },
    {
      id: 'typographic-tells', category: 'footprint', term: 'Tiques Tipográficos de IA',
      plainDefinition: 'Hábitos de pontuação e formatação característicos de modelos de linguagem, como uso excessivo de travessões, aspas tipográficas uniformes e tópicos em negrito com dois-pontos.',
    },
  ],
};

// ---------------------------------------------------------------------------
// ITALIAN (it)
// ---------------------------------------------------------------------------
const IT_HELP: LocalizedHelpContent = {
  categories: {
    safety: 'Sicurezza & Difesa IA (Rileva e Rimuovi)',
    artifacts: 'Filigrane & Impronte IA (Rileva e Neutralizza)',
    engines: 'Modelli IA, Motori & Privacy',
    setup: 'Guida Rapida & Privacy',
    synthesis: 'Sintesi & Verifica',
  },
  guideLessons: [
    {
      id: 'g-0',
      category: 'setup',
      categoryTitle: 'Guida Rapida & Privacy',
      title: 'Lezione 0 · Guida rapida (2 min)',
      goal: 'Carica il testo e imposta il livello di privacy.',
      steps: [
        'Incolla il testo nell’editor a sinistra o trascina un file .txt, .docx o .pdf.',
        'Verifica l’interruttore in alto a destra: "Offline" garantisce elaborazione locale al 100%.',
        'Naviga tra le sezioni Sicurezza IA e Filigrane IA nel pannello destro.',
      ],
      tip: 'L’applicazione opera interamente offline per impostazione predefinita.',
    },
    {
      id: 'g-1',
      category: 'safety',
      categoryTitle: 'Sicurezza & Difesa IA',
      title: 'Lezione 1 · Rilevare caratteri invisibili (Scanner)',
      goal: 'Trova codici Unicode nascosti, omoglifi e spazi a larghezza zero.',
      steps: [
        'Fai clic sulla scheda SCANNER (◈) nella sezione Sicurezza.',
        'Premi "Scansiona" per esaminare ogni carattere del documento.',
        'Applica la pulizia conservativa o aggressiva.',
      ],
      tip: 'Zero risultati indicano testo tipograficamente pulito.',
    },
    {
      id: 'g-2',
      category: 'safety',
      categoryTitle: 'Sicurezza & Difesa IA',
      title: 'Lezione 2 · Ispezionare iniezioni di prompt (Iniezione)',
      goal: 'Smaschera iniezioni di prompt nascoste, contrabbando ASCII ed esfiltrazione.',
      steps: [
        'Fai clic sulla scheda INIEZIONE (⛨) nella sezione Sicurezza.',
        'Premi "Ispeziona testo" per decodificare caratteri invisibili e tag di comando.',
        'Alterna tra "Vista Modello" (Raggi X) e "Vista Umana".',
        'Premi "Rimuovi iniezioni" per sanificare il documento.',
      ],
      tip: 'Usa gli esempi di attacco per testare scenari reali.',
    },
    {
      id: 'g-3',
      category: 'artifacts',
      categoryTitle: 'Filigrane & Impronte IA',
      title: 'Lezione 3 · Verificare filigrane statistiche (Filigrana)',
      goal: 'Identifica le filigrane Kirchenbauer inserite dai modelli di linguaggio.',
      steps: [
        'Fai clic sulla scheda FILIGRANA (⊕) nella sezione Impronte.',
        'Avvia la scansione per testare 216 configurazioni.',
        'Premi "Neutralizza" in caso di segnale significativo.',
      ],
      tip: 'L’annullamento mirato modifica il minor numero possibile di parole.',
    },
    {
      id: 'g-4',
      category: 'artifacts',
      categoryTitle: 'Filigrane & Impronte IA',
      title: 'Lezione 4 · Analizzare ritmo stilometrico e cliché (Impronta)',
      goal: 'Misura se il testo presenta schemi tipici di scrittura automatica.',
      steps: [
        'Fai clic sulla scheda IMPRONTA (⊗) e premi "Analizza".',
        'Esamina il punteggio di probabilità macchina e le frasi cliché.',
        'Premi "Rimuovi impronta" per variare la cadenza.',
      ],
      tip: 'Rianalizza dopo la rimozione per verificare i progressi.',
    },
    {
      id: 'g-5',
      category: 'artifacts',
      categoryTitle: 'Filigrane & Impronte IA',
      title: 'Lezione 5 · Ottimizzazione contraddittoria (Ottimizzatore)',
      goal: 'Riduci al minimo la rilevabilità con il ricottura simulata.',
      steps: [
        'Fai clic sulla scheda OTTIMIZZATORE (⟁).',
        'Esegui l’ottimizzatore Oracle e segui la convergenza.',
      ],
      tip: 'Usa il punteggio di perplessità per verificare la naturalezza umana.',
    },
    {
      id: 'g-6',
      category: 'synthesis',
      categoryTitle: 'Sintesi & Verifica',
      title: 'Lezione 6 · Generare rapporti di integrità (Rapporto)',
      goal: 'Crea certificati peritali con hash SHA-256.',
      steps: [
        'Fai clic sulla scheda RAPPORTO (≡).',
        'Genera il rapporto consolidato ed esporta in PDF o Markdown.',
      ],
      tip: 'Il rapporto attesta formalmente lo stato pre e post sanificazione.',
    },
  ],
  helpSections: [
    {
      id: 'h-scanner',
      category: 'safety',
      categoryTitle: 'Sicurezza & Difesa IA',
      icon: '◈',
      title: 'Motore di Scansione Unicode e Steganografia',
      color: 'text-warning dark:text-yellow-400',
      content: 'Rileva caratteri di larghezza zero, inversioni Bidi e omoglifi cirillici/greci.',
    },
    {
      id: 'h-injection',
      category: 'safety',
      categoryTitle: 'Sicurezza & Difesa IA',
      icon: '⛨',
      title: 'Ispettore di Iniezioni di Prompt e Contrabbando ASCII',
      color: 'text-danger dark:text-red-400',
      content: 'Decodifica tag Unicode (U+E0000), steganografia ZWS e neutralizza comandi nascosti in un clic.',
    },
    {
      id: 'h-watermark',
      category: 'artifacts',
      categoryTitle: 'Filigrane & Impronte IA',
      icon: '⊕',
      title: 'Filigrane Statistiche e Neutralizzazione',
      color: 'text-accent',
      content: 'Scansione di 216 combinazioni statistiche e soppressione mirata con minima distorsione semantica.',
    },
    {
      id: 'h-footprint',
      category: 'artifacts',
      categoryTitle: 'Filigrane & Impronte IA',
      icon: '⊗',
      title: 'Impronta Stilometrica e Cliché IA',
      color: 'text-danger dark:text-red-400',
      content: 'Analisi della variabilità di lunghezza delle frasi, uniformità di perplessità e vocabolario artificiale.',
    },
    {
      id: 'h-optimizer',
      category: 'artifacts',
      categoryTitle: 'Filigrane & Impronte IA',
      icon: '⟁',
      title: 'Ottimizzatore Contraddittorio e Punteggio LM',
      color: 'text-accent',
      content: 'Ottimizzazione a ciclo chiuso con limite semantico e calcolo della perplessità neurale (modello GPT-2 WebGPU).',
    },
    {
      id: 'h-engines',
      category: 'engines',
      categoryTitle: 'Modelli IA, Motori & Privacy',
      icon: '≡',
      title: 'Modalità di Esecuzione, IA Locale e Privacy',
      color: 'text-info dark:text-blue-400',
      content: 'Elaborazione completamente locale. Pulsante "Elimina modello" disponibile direttamente nella barra di configurazione.',
    },
    {
      id: 'h-fingerprint-removal',
      category: 'artifacts',
      categoryTitle: 'Filigrane & Impronte IA',
      icon: '⊗',
      title: 'Suite di Rimozione Impronte IA in 4 Livelli',
      color: 'text-success dark:text-emerald-400',
      content: `Pipeline deterministica di pulizia a fasi per eliminare i marcatori stilometrici tipici dei modelli IA:
• Mascheramento Tratti Protetti: Protegge blocchi di codice, codice in linea e URL per evitare alterazioni sintattiche.
• Livello 1 (Lessicale): Sostituisce i cliché tipici dell’IA ("approfondire", "fondamentale", "poliedrico") con sinonimi umani naturali.
• Livello 2 (Strutturale ed Evasivo): Rimuove formule evasive ripetitive ("è importante notare che") e modelli stereotipati.
• Livello 3 (Tipografico): Normalizza virgolette curve, converte elenchi meccanici in prosa fluida ed equilibra i trattini lunghi.
• Livello 4 (Variabilità del Ritmo): Suddivide frasi eccessivamente lunghe (24+ parole) e fonde clausole brevi per ricreare la naturalezza umana.`,
    },
    {
      id: 'h-plagiarism',
      category: 'artifacts',
      categoryTitle: 'Sintesi & Verifica',
      icon: '§',
      title: 'Suite di Plagio e Originalità in 4 Modalità',
      color: 'text-accent',
      content: `Verifica approfondita dell’originalità accademica ed editoriale:
• Modalità 1 (Caveau Riferimenti 1-a-N): Shingles di 4/5 parole, algoritmo Winnowing e contenimento MinHash Jaccard su documenti di confronto.
• Modalità 2 (Parafrasi Semantica): Prefiltraggio TF-IDF combinato con embeddings neurali sul dispositivo (all-MiniLM-L6-v2).
• Modalità 3 (Cambiamento di Stile Intrinseco): Rileva duplicazioni interne, patchwriting a mosaico (>2.0σ di varianza) e citazioni orfane senza bibliografia.
• Modalità 4 (Verifica Accademica e Web): Interroga le API di CrossRef e Wikipedia per individuare corrispondenze nella letteratura pubblicata con link diretti.`,
    },
    {
      id: 'h-local-models',
      category: 'engines',
      categoryTitle: 'Modelli IA, Motori & Privacy',
      icon: '🧠',
      title: 'Hub Modelli IA Locali e Architettura',
      color: 'text-info dark:text-blue-400',
      content: `Modelli neurali in esecuzione al 100% nel browser tramite Transformers.js con accelerazione WebGPU o WASM:
• Riscrittore Rapido (LaMini-Flan-T5-77M / ~80MB): Umanizzazione ultrarapida delle frasi e rotazione di sinonimi.
• Riscrittore Equilibrato (LaMini-Flan-T5-248M / ~250MB): Maggiore capacità T5 per ristrutturazione di paragrafi complessi.
• IA Locale Intelligente (SmolLM2-360M-Instruct / ~210MB): Modello instruct quantizzato a 4-bit per umanizzazione e spiegazioni minacce JSON offline.
• IA Locale Pro (Qwen2.5-0.5B-Instruct / ~310MB): Massima precisione sul dispositivo per analisi forensi avanzate.
• Calcolatore di Perplessità Neurale (SmolLM2-135M / gpt2 / ~95-125MB): Modelli causali per il calcolo della perplessità con finestra scorrevole.
• Embedder Semantico (all-MiniLM-L6-v2 / ~23MB): Estrazione di caratteristiche e vettori a 384 dimensioni per rilevare parafrasi.`,
    },
  ],
  changelog: [
    {
      version: 'v3.0.0',
      date: '2026-10',
      title: 'Cruscotto Visivo Forense, Rimozione Impronte IA, Suite Plagio e Hub IA Locale',
      highlights: [
        'Cruscotto Panoramico: Pulsante "Scansiona Tutto", 4 indicatori radiali SVG animati, radar forense a 5 assi e schede di risoluzione rapida.',
        'Suite Rimozione Impronte IA in 4 Livelli: Mascheramento codice/URL, mappa di sinonimi depurata, tipografia normalizzata e mappa termica per frase.',
        'Spiegatore Unificato dei Vettori di Attacco: Valutazioni forensi istantanee e analisi approfondite con IA su Scanner, Iniezione e Minacce.',
        'Correlazione Catene di Attacco (Kill-Chain): Rilevamento di attacchi complessi multifase con de-offuscamento ricorsivo sicuro.',
        'Suite Plagio in 4 Modalità: Shingles 1-a-N, parafrasi semantica neurale, patchwriting intrinseco e verifica web (CrossRef/Wikipedia).',
        'Hub Modelli IA Locali: Selezione con SmolLM2-360M, Qwen2.5-0.5B, SmolLM2-135M e all-MiniLM-L6-v2 con supporto WebGPU.',
        'Cronologia Universale delle Mutazioni: Annulla / Ripeti / Ripristina globale con visualizzatore differenze riga per riga e parola per parola.',
        'Rapporti Forensi di Integrità: Riepilogo visivo per dirigenti, esportazione DOCX, PDF con intestazione B&W, CSV e JSON.',
      ],
    },
    {
      version: 'v2.2.0',
      date: '2026-08',
      title: 'Analisi di Payload e Minacce',
      highlights: [
        'Nuova scheda Minacce (☠): rileva codice, comandi e payload codificati pericolosi nascosti nel testo — senza alcuna precondizione, indipendentemente dal fatto che il testo circostante sia un jailbreak.',
        'Decodifica ricorsiva di payload in Base64, esadecimale, ROT13 e codifica percentuale, con una regola di "arresto anticipato" non appena viene trovato un pattern pericoloso.',
        'Ogni rilevamento include una spiegazione forense completa — cosa fa, cosa colpisce, la conseguenza reale, perché appare qui e cosa fare — non solo un’etichetta di gravità.',
        'Revisione di capacità assistita dall’IA opzionale per payload nuovi non riconosciuti dalla libreria di regole offline, con gestione onesta quando un modello rifiuta di rispondere.',
        'Nuova scheda Glossario: definizioni in linguaggio semplice per ogni termine tecnico dell’app, collegate direttamente dai rilevamenti di Minacce.',
        'Nuova opzione provider "Non censurato (offline, avanzato)" per la revisione di capacità con minor rischio di rifiuto su analisi difensive legittime — interamente offline tramite Ollama.',
        'Corretto: l’analisi di Iniezione ora rileva i trigger di jailbreak in testo semplice anche senza alcun payload Unicode invisibile presente.',
        'Corretto: la valutazione semantica con IA di Iniezione ora funziona correttamente su tutti e 5 i provider (prima falliva silenziosamente su Anthropic, Gemini e il modello locale).',
        'I rapporti di integrità (JSON/CSV/PDF) ora includono l’analisi di Minacce completa, con spiegazioni complete per ogni rilevamento.',
        'La versione dell’app ora viene letta da un’unica fonte, così il rapporto, la Guida e la barra del titolo non potranno più discordare.',
      ],
    },
    {
      version: 'v2.1.0',
      date: '2026-08',
      title: 'Ispettore di Iniezioni di Prompt e Riorganizzazione in Domini',
      highlights: [
        'Nuova scheda di ispezione forense delle iniezioni di prompt (⛨).',
        'Visualizzatore doppio Raggi X / Vista Umana per confrontare testo e token.',
        'Pulsante "Elimina modello" direttamente nella barra degli strumenti.',
        'Traduzione completa in 5 lingue per tutta la documentazione.',
      ],
    },
    {
      version: 'v2.0.0',
      date: '2026-08',
      title: 'Ottimizzazione Avanzata e Motore Neurale',
      highlights: ['Ottimizzatore Oracle, avvelenamento di confini e calcolo di perplessità WebGPU.'],
    },
    {
      version: 'v1.0.0',
      date: '2026-07',
      title: 'Fondazione Peritale',
      highlights: ['Scanner Unicode e scansione statistica delle filigrane.'],
    },
  ],
  about: {
    title: 'AI TextSense',
    tagline: 'Ispettore Peritale di Testo e Iniezioni di Prompt',
    description: 'Stazione forense per la sicurezza dei prompt e la neutralizzazione di filigrane e impronte di IA.',
    privacyTitle: 'Garanzia di Privacy',
    privacyBody: 'AI TextSense opera interamente nel tuo browser. In modalità Offline nessun dato viene trasmesso.',
    licenseTitle: 'Proprietà Intellettuale',
    licenseBody: '© 2026 Wilson Volpe. Tutti i diritti riservati.',
    author: 'Wilson Volpe',
  },
  glossary: [
    {
      id: 'destructive-command', category: 'threat', term: 'Comando distruttivo',
      plainDefinition: 'Un comando che elimina o sovrascrive file o dati in modo permanente, senza possibilità di annullamento — come svuotare un cestino che non è mai esistito.',
      technicalNote: 'Esempi: "rm -rf" (Linux/macOS), "del /f /s /q" (Windows), comandi di formattazione del disco.',
    },
    {
      id: 'pipe-to-shell', category: 'threat', term: 'Pipe verso shell',
      plainDefinition: 'Un trucco in una riga che scarica uno script da internet e lo esegue immediatamente, senza mai mostrartelo prima — come firmare un contratto che non puoi leggere.',
      technicalNote: 'Forma: "curl ... | bash" o "iwr ... | iex". Il contenuto servito può cambiare a ogni richiesta.',
    },
    {
      id: 'c2', category: 'threat', term: 'C2 (Comando e Controllo)',
      plainDefinition: 'Il canale di "richiamo a casa" che un attaccante usa per controllare a distanza un computer compromesso dopo l’intrusione iniziale.',
      technicalNote: 'Reverse shell e traffico di esfiltrazione codificato sono meccanismi C2 comuni.',
    },
    {
      id: 'reverse-shell', category: 'threat', term: 'Reverse shell',
      plainDefinition: 'Un trucco in cui un computer chiama un attaccante e gli consegna una riga di comando dal vivo — l’opposto di una connessione in entrata, per questo elude molti firewall.',
      technicalNote: 'La macchina compromessa avvia una connessione in uscita (di solito consentita) e vi collega una shell.',
    },
    {
      id: 'rat', category: 'threat', term: 'RAT (Trojan di Accesso Remoto)',
      plainDefinition: 'Software malevolo che dà silenziosamente a qualcun altro il controllo remoto completo del tuo computer.',
      technicalNote: 'Combina tipicamente un meccanismo di persistenza con un canale C2 e spesso funzioni di raccolta dati.',
    },
    {
      id: 'exfiltration', category: 'threat', term: 'Esfiltrazione',
      plainDefinition: 'Portare dati fuori da un sistema verso un luogo controllato dall’attaccante.',
      technicalNote: 'Vettori comuni: richieste HTTP in uscita con dati rubati, tunneling DNS, o segreti incorporati in un URL richiesto automaticamente.',
    },
    {
      id: 'credential-harvesting', category: 'threat', term: 'Raccolta di credenziali',
      plainDefinition: 'Raccogliere password, chiavi API o sessioni attive — di solito come primo passo prima di usarle per accedere ad altri account.',
      technicalNote: 'Obiettivi comuni: file di chiavi SSH/cloud, archivi password del browser, cookie di sessione, variabili d’ambiente.',
    },
    {
      id: 'persistence', category: 'threat', term: 'Persistenza',
      plainDefinition: 'Una tecnica che fa continuare a funzionare automaticamente il software malevolo — a ogni accesso, a ogni riavvio — senza che nessuno debba rilanciarlo.',
      technicalNote: 'Meccanismi comuni: attività pianificate, cron, chiavi di Registro "Run" di Windows, launch agent di macOS.',
    },
    {
      id: 'obfuscation', category: 'threat', term: 'Offuscamento',
      plainDefinition: 'Mascherare deliberatamente il codice affinché un umano (o uno scanner semplice) non possa capire facilmente cosa fa solo guardandolo — pur funzionando esattamente allo stesso modo.',
      technicalNote: 'Tecniche comuni: ricostruzione di array di codici carattere, payload codificati in Base64, catene di concatenazione come evasione.',
    },
    {
      id: 'entropy', category: 'threat', term: 'Entropia (in questo strumento)',
      plainDefinition: 'Una misura di quanto un frammento di testo appaia "casuale". Le frasi normali hanno un punteggio basso; i dati codificati o cifrati hanno un punteggio alto.',
      technicalNote: 'Misurata qui come entropia di Shannon (bit per carattere). La prosa inglese tipica è ~3,5–4,3 bit/carattere; i dati Base64 tendono verso 5–6.',
    },
    {
      id: 'lolbin', category: 'threat', term: 'LOLBin (binario di sistema riadattato)',
      plainDefinition: 'Uno strumento di sistema legittimo e preinstallato riadattato per un attacco — usare qualcosa già considerato attendibile invece di introdurre software palesemente malevolo.',
      technicalNote: 'Esempi: certutil, PowerShell, mshta su Windows.',
    },
    {
      id: 'capability-review', category: 'threat', term: 'Revisione della capacità',
      plainDefinition: 'Il passaggio assistito dall’IA di questo strumento che spiega cosa farebbe davvero un codice o un comando se venisse eseguito — senza giudicare se il testo circostante tenta di manipolare un’IA. Questa domanda è gestita separatamente dall’analisi di Iniezione.',
    },
    {
      id: 'prompt-injection', category: 'injection', term: 'Iniezione di prompt',
      plainDefinition: 'Testo creato per ingannare un sistema di IA e fargli ignorare le proprie istruzioni seguendo invece quelle dell’attaccante — nascosto dentro contenuti che l’IA doveva solo leggere, non eseguire.',
    },
    {
      id: 'jailbreak', category: 'injection', term: 'Jailbreak',
      plainDefinition: 'Un tentativo di convincere un sistema di IA ad abbandonare le proprie regole di sicurezza — tramite giochi di ruolo, falsi "modalità sviluppatore" o altre tecniche di persuasione.',
    },
    {
      id: 'tag-char-smuggling', category: 'injection', term: 'Contrabbando di caratteri Tag / ASCII',
      plainDefinition: 'Nascondere un intero messaggio segreto dentro caratteri Unicode "tag" invisibili che non vengono mostrati affatto — invisibili per un umano, ma leggibili da un’IA che elabora il testo grezzo.',
      technicalNote: 'Usa il blocco Unicode Tag (U+E0000–U+E007F), ogni code point mappato 1:1 su un carattere ASCII.',
    },
    {
      id: 'trojan-source', category: 'injection', term: 'Trojan Source (inversione Bidi)',
      plainDefinition: 'Un trucco che usa caratteri di controllo invisibili per far visualizzare il testo in un ordine diverso da quello effettivamente elaborato dall’IA o dal compilatore.',
      technicalNote: 'Usa caratteri di controllo bidirezionale Unicode (es. U+202E) per riordinare i glifi visualizzati.',
    },
    {
      id: 'homoglyph', category: 'injection', term: 'Omoglifo',
      plainDefinition: 'Un carattere di un altro alfabeto che appare quasi identico a uno familiare — come una "а" cirillica al posto di una "a" latina — usato per aggirare i filtri.',
    },
    {
      id: 'zero-width-character', category: 'injection', term: 'Carattere a larghezza zero',
      plainDefinition: 'Un carattere che non occupa spazio visibile quando viene mostrato, ma è comunque presente nel testo sottostante — usato per nascondere marcatori o messaggi codificati.',
      technicalNote: 'Esempi comuni: Zero Width Space (U+200B), Zero Width Non-Joiner (U+200C), Zero Width Joiner (U+200D), e il BOM (U+FEFF) a metà testo.',
    },
    {
      id: 'steganography', category: 'injection', term: 'Steganografia',
      plainDefinition: 'Nascondere un messaggio dentro qualcosa che sembra del tutto ordinario, invece di cifrarlo — l’obiettivo è che nessuno noti nemmeno che c’è un messaggio nascosto da cercare.',
    },
    {
      id: 'tokenizer', category: 'injection', term: 'Tokenizzatore',
      plainDefinition: 'Il componente che divide il testo in piccoli pezzi ("token") che un modello di IA legge realmente. I caratteri nascosti possono gonfiare silenziosamente questo conteggio.',
    },
    {
      id: 'watermark-green-list', category: 'watermark', term: 'Filigrana a lista verde',
      plainDefinition: 'Un’impronta statistica che alcuni sistemi di IA incorporano silenziosamente nel testo generato favorendo sottilmente certe parole — invisibile per il lettore, ma rilevabile rifacendo lo stesso calcolo.',
      technicalNote: 'Basato sullo schema di Kirchenbauer et al.: una chiave segreta divide il vocabolario in una "lista verde" e una "lista rossa" a ogni passo di generazione.',
    },
    {
      id: 'burstiness', category: 'footprint', term: 'Burstiness (irregolarità ritmica)',
      plainDefinition: 'Quanto varia la lunghezza delle frasi in un testo. Gli umani mescolano naturalmente frasi corte e lunghe; il testo generato dall’IA ha spesso lunghezze insolitamente uniformi.',
    },
    {
      id: 'perplexity', category: 'footprint', term: 'Perplessità',
      plainDefinition: 'Una misura di quanto un testo sia "prevedibile" per un modello linguistico. Il testo generato dall’IA tende ad avere un punteggio più uniformemente prevedibile della scrittura umana naturale.',
    },
    {
      id: 'bonferroni-correction', category: 'general', term: 'Correzione di Bonferroni',
      plainDefinition: 'Una salvaguardia statistica usata quando si eseguono molti test contemporaneamente, affinché farne di più non aumenti la probabilità di vedere un risultato "significativo" solo per caso.',
      technicalNote: 'Usata nella Scansione della Filigrana (216 combinazioni) per tenere sotto controllo il tasso di falsi positivi.',
    },
    {
      id: 'shingling', category: 'plagiarism', term: 'Shingling di Parole (N-grammi)',
      plainDefinition: 'Tecnica di suddivisione del testo in sequenze sovrapposte di parole (4-grammi o 5-grammi) per individuare passaggi identici o quasi identici copiati tra documenti.',
      technicalNote: 'Gli shingles vengono convertiti in hash numerici per calcolare il contenimento esatto e l’intersezione Jaccard.',
    },
    {
      id: 'winnowing', category: 'plagiarism', term: 'Algoritmo Winnowing',
      plainDefinition: 'Algoritmo che seleziona un sottoinsieme compatto e rappresentativo di hash da un documento, garantendo il rilevamento di qualsiasi passaggio copiato oltre una soglia stabilita.',
      technicalNote: 'Mantiene una finestra scorrevole di hash e seleziona il minimo locale per formare un’impronta invariante.',
    },
    {
      id: 'patchwriting', category: 'plagiarism', term: 'Patchwriting & Plagio a Mosaico',
      plainDefinition: 'Forma di copiatura in cui l’autore unisce frasi di fonti diverse apportando solo modifiche cosmetiche di parole o sintassi, senza una reale sintesi originale.',
      technicalNote: 'Rilevato intrinsecamente tramite la variazione statistica (>2.0σ) nei punteggi di leggibilità, rarità lessicale e lunghezza delle frasi tra paragrafi.',
    },
    {
      id: 'orphan-citation', category: 'plagiarism', term: 'Citazione Orfana',
      plainDefinition: 'Marcatore di citazione (come [1] o (Autore, 2024)) presente nel corpo del testo senza una voce corrispondente nella bibliografia o elenco riferimenti finale.',
    },
    {
      id: 'semantic-paraphrase', category: 'plagiarism', term: 'Parafrasi Semantica',
      plainDefinition: 'Riformulazione di un’idea con parole e sintassi diverse mantenendo inalterato il significato originario esatto, rilevabile mediante embeddings neurali.',
      technicalNote: 'Valutata mediante prefiltraggio TF-IDF seguito da similarità del coseno (≥0.82) con all-MiniLM-L6-v2.',
    },
    {
      id: 'typographic-tells', category: 'footprint', term: 'Tracce Tipografiche dell’IA',
      plainDefinition: 'Abitudini di punteggiatura e formattazione ricorrenti nei modelli di linguaggio, come l’uso smodato di trattini lunghi, virgolette curve uniformi ed elenchi puntati con parole in grassetto seguite da due punti.',
    },
  ],
};

const HELP_DICTIONARIES: Record<Language, LocalizedHelpContent> = {
  en: EN_HELP,
  es: ES_HELP,
  fr: FR_HELP,
  'pt-BR': PT_BR_HELP,
  it: IT_HELP,
};

export function getHelpContent(lang: Language): LocalizedHelpContent {
  return HELP_DICTIONARIES[lang] ?? HELP_DICTIONARIES.en;
}
