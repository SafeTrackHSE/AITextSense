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
  ],
  changelog: [
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
• Botón "Eliminar modelo": Ubicado directamente en la barra de configuración para liberar almacenamiento local.`,
    },
  ],
  changelog: [
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
      id: 'h-engines',
      category: 'engines',
      categoryTitle: 'Modèles IA, Moteurs & Confidentialité',
      icon: '≡',
      title: 'Modes d’Exécution, IA Locale et Confidentialité',
      color: 'text-info dark:text-blue-400',
      content: 'Exécution hors-ligne garantie. Bouton "Supprimer le modèle" directement accessible dans la barre de configuration.',
    },
  ],
  changelog: [
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
  ],
  changelog: [
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
  ],
  changelog: [
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
