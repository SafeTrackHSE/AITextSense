import { useState, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { parseFile } from '../core/input/parsers';
import {
  analyzePlagiarism,
  type ReferenceDocument,
  type PlagiarismAnalysisResult,
} from '../core/plagiarism';

const I18N = {
  en: {
    analyzeBtn: '§ Analyze Originality & Plagiarism',
    analyzingBtn: 'Analyzing Plagiarism...',
    addFiles: '📁 Add Reference Files',
    pasteRef: '📋 Paste Reference',
    clearRefs: 'Clear References',
    cancel: 'Cancel',
    addRefBtn: 'Add Reference',
    pasteModalTitle: 'Paste Reference Document Text',
    pasteTitlePlaceholder: 'Document Title (e.g. \'Source Article 2026\')',
    pasteTextPlaceholder: 'Paste reference text content here...',
    neuralEmbeddings: 'Neural Embeddings (all-MiniLM-L6-v2)',
    webVerification: 'Web & Academic Verification (CrossRef & Wikipedia)',
    offlineActive: '[Offline Mode Active]',
    vaultTitle: '📚 Reference Document Vault',
    zeroRefsLoaded: 'Zero reference documents loaded. (Mode 3 Intrinsic will still analyze self-plagiarism)',
    wordsCount: 'words',
    removeRef: 'Remove reference',
    originality: 'Originality',
    plagiarismScore: 'Plagiarism Score',
    maxCoverage: 'Max Match Coverage',
    topSource: 'Top Source',
    exactMatches: 'Exact Matches',
    paraphrases: 'Paraphrases',
    intrinsicShifts: 'Intrinsic Shifts',
    none: 'None',
    tabExact: 'Exact & Near-Copy Matches',
    tabSemantic: 'Semantic Paraphrases',
    tabIntrinsic: 'Intrinsic Style-Shift & Self-Plagiarism',
    tabOnline: 'Online Web & Academic Verification',
    noShingleMatches: '✓ No verbatim or near-copy text matches detected against reference documents.',
    matchLabel: 'Match',
    sourceLabel: 'Source:',
    shingleLabel: 'Shingle:',
    yourDoc: 'Your Document:',
    refMatch: 'Reference Match:',
    noSemanticMatches: '✓ No semantic paraphrases or rewritten passages detected against reference documents.',
    yourSentence: 'Your Document Sentence:',
    refSentence: 'Reference Sentence:',
    mosaicTitle: 'Mosaic Patchwriting & Style Shifts (|z| > 2.0)',
    noMosaic: '✓ Uniform stylistic voice maintained across all paragraphs (no severe style anomalies).',
    paragraphLabel: 'Paragraph #',
    deviatingFeatures: 'Deviating features:',
    internalDuplicationsTitle: 'Internal Self-Plagiarism & Duplications',
    noInternalDup: '✓ No duplicated passages or self-plagiarized paragraphs within the document.',
    repeatedSnippet: 'Repeated text snippet',
    orphanCitationsTitle: 'Orphan Citations (Missing in References)',
    noOrphanCitations: '✓ No orphan citations without bibliography references detected.',
    markerLabel: 'Marker:',
    contextLabel: 'Context:',
    offlineNoticeTitle: 'Offline Mode Active',
    offlineNoticeDesc: 'Online queries to CrossRef DOI and Wikipedia are disabled to guarantee zero outbound network requests and total privacy. Switch to Online Mode in the header to run live academic verification.',
    noOnlineHits: 'No web or academic matches discovered on CrossRef or Wikipedia for extracted distinctive phrases.',
    similarityLabel: 'Similarity:',
    authorsLabel: 'Authors:',
    queryPhraseLabel: 'Query Phrase:',
    emptyTitle: 'Originality & Academic Integrity Vault',
    emptyDesc: 'Load reference documents and click Analyze to verify originality, detect semantic paraphrasing, and scan for style shifts.',
  },
  es: {
    analyzeBtn: '§ Analizar originalidad y plagio',
    analyzingBtn: 'Analizando plagio...',
    addFiles: '📁 Añadir archivos de referencia',
    pasteRef: '📋 Pegar referencia',
    clearRefs: 'Borrar referencias',
    cancel: 'Cancelar',
    addRefBtn: 'Añadir referencia',
    pasteModalTitle: 'Pegar texto de documento de referencia',
    pasteTitlePlaceholder: 'Título del documento (ej. \'Artículo fuente 2026\')',
    pasteTextPlaceholder: 'Pegue el contenido del texto de referencia aquí...',
    neuralEmbeddings: 'Incrustaciones neuronales (all-MiniLM-L6-v2)',
    webVerification: 'Verificación web y académica (CrossRef y Wikipedia)',
    offlineActive: '[Modo sin conexión activo]',
    vaultTitle: '📚 Bóveda de documentos de referencia',
    zeroRefsLoaded: 'Cero documentos cargados. (El modo 3 intrínseco analizará el autoplagio)',
    wordsCount: 'palabras',
    removeRef: 'Eliminar referencia',
    originality: 'Originalidad',
    plagiarismScore: 'Puntaje de plagio',
    maxCoverage: 'Cobertura máxima',
    topSource: 'Fuente principal',
    exactMatches: 'Coincidencias exactas',
    paraphrases: 'Paráfrasis',
    intrinsicShifts: 'Cambios de estilo',
    none: 'Ninguna',
    tabExact: 'Coincidencias exactas y casi copias',
    tabSemantic: 'Paráfrasis semánticas',
    tabIntrinsic: 'Cambios de estilo y autoplagio',
    tabOnline: 'Verificación web y académica en línea',
    noShingleMatches: '✓ No se detectaron coincidencias textuales ni casi copias con los documentos de referencia.',
    matchLabel: 'Coincidencia',
    sourceLabel: 'Fuente:',
    shingleLabel: 'N-grama:',
    yourDoc: 'Su documento:',
    refMatch: 'Coincidencia de referencia:',
    noSemanticMatches: '✓ No se detectaron paráfrasis semánticas ni pasajes reescritos en los documentos de referencia.',
    yourSentence: 'Oración de su documento:',
    refSentence: 'Oración de referencia:',
    mosaicTitle: 'Composición en mosaico y cambios de estilo (|z| > 2.0)',
    noMosaic: '✓ Voz estilística uniforme mantenida en todos los párrafos (sin anomalías graves).',
    paragraphLabel: 'Párrafo #',
    deviatingFeatures: 'Rasgos discordantes:',
    internalDuplicationsTitle: 'Autoplagio interno y duplicaciones',
    noInternalDup: '✓ No se detectaron pasajes duplicados ni párrafos autoplagiados dentro del documento.',
    repeatedSnippet: 'Fragmento de texto repetido',
    orphanCitationsTitle: 'Citas huérfanas (no encontradas en referencias)',
    noOrphanCitations: '✓ No se detectaron citas huérfanas sin bibliografía de referencia.',
    markerLabel: 'Marcador:',
    contextLabel: 'Contexto:',
    offlineNoticeTitle: 'Modo sin conexión activo',
    offlineNoticeDesc: 'Las consultas en línea a CrossRef DOI y Wikipedia están deshabilitadas para garantizar cero solicitudes de red salientes y privacidad total.',
    noOnlineHits: 'No se descubrieron coincidencias en la web ni académicas en CrossRef o Wikipedia.',
    similarityLabel: 'Similitud:',
    authorsLabel: 'Autores:',
    queryPhraseLabel: 'Frase de consulta:',
    emptyTitle: 'Bóveda de originalidad e integridad académica',
    emptyDesc: 'Cargue documentos de referencia y haga clic en Analizar para verificar originalidad, paráfrasis y cambios de estilo.',
  },
  fr: {
    analyzeBtn: '§ Analyser l\'originalité et le plagiat',
    analyzingBtn: 'Analyse du plagiat en cours...',
    addFiles: '📁 Ajouter des fichiers de référence',
    pasteRef: '📋 Coller une référence',
    clearRefs: 'Effacer les références',
    cancel: 'Annuler',
    addRefBtn: 'Ajouter la référence',
    pasteModalTitle: 'Coller le texte du document de référence',
    pasteTitlePlaceholder: 'Titre du document (ex. \'Article source 2026\')',
    pasteTextPlaceholder: 'Collez le texte de référence ici...',
    neuralEmbeddings: 'Plongements neuronaux (all-MiniLM-L6-v2)',
    webVerification: 'Vérification web et académique (CrossRef & Wikipedia)',
    offlineActive: '[Mode hors ligne actif]',
    vaultTitle: '📚 Coffre de documents de référence',
    zeroRefsLoaded: 'Zéro document de référence chargé. (Le mode 3 analysera l\'auto-plagiat)',
    wordsCount: 'mots',
    removeRef: 'Supprimer la référence',
    originality: 'Originalité',
    plagiarismScore: 'Score de plagiat',
    maxCoverage: 'Couverture max',
    topSource: 'Source principale',
    exactMatches: 'Correspondances exactes',
    paraphrases: 'Paraphrases',
    intrinsicShifts: 'Ruptures de style',
    none: 'Aucune',
    tabExact: 'Correspondances exactes et quasi-copies',
    tabSemantic: 'Paraphrases sémantiques',
    tabIntrinsic: 'Ruptures de style et auto-plagiat',
    tabOnline: 'Vérification web et académique en ligne',
    noShingleMatches: '✓ Aucune correspondance textuelle ou quasi-copie détectée par rapport aux références.',
    matchLabel: 'Correspondance',
    sourceLabel: 'Source :',
    shingleLabel: 'N-gramme :',
    yourDoc: 'Votre document :',
    refMatch: 'Correspondance de référence :',
    noSemanticMatches: '✓ Aucune paraphrase sémantique ni passage réécrit détecté par rapport aux références.',
    yourSentence: 'Phrase de votre document :',
    refSentence: 'Phrase de référence :',
    mosaicTitle: 'Mosaïque et ruptures stylistiques (|z| > 2.0)',
    noMosaic: '✓ Voix stylistique uniforme sur tous les paragraphes (aucune anomalie grave).',
    paragraphLabel: 'Paragraphe n°',
    deviatingFeatures: 'Caractéristiques déviantes :',
    internalDuplicationsTitle: 'Auto-plagiat interne et duplications',
    noInternalDup: '✓ Aucun passage dupliqué ni paragraphe auto-plagié dans le document.',
    repeatedSnippet: 'Extrait de texte répété',
    orphanCitationsTitle: 'Citations orphelines (absentes des références)',
    noOrphanCitations: '✓ Aucune citation orpheline sans référence bibliographique détectée.',
    markerLabel: 'Marqueur :',
    contextLabel: 'Contexte :',
    offlineNoticeTitle: 'Mode hors ligne actif',
    offlineNoticeDesc: 'Les requêtes vers CrossRef DOI et Wikipedia sont désactivées pour garantir zéro requête réseau et une confidentialité totale.',
    noOnlineHits: 'Aucune correspondance web ou académique trouvée sur CrossRef ou Wikipedia.',
    similarityLabel: 'Similarité :',
    authorsLabel: 'Auteurs :',
    queryPhraseLabel: 'Expression recherchée :',
    emptyTitle: 'Coffre d\'originalité et d\'intégrité académique',
    emptyDesc: 'Chargez des documents de référence et cliquez sur Analyser pour vérifier l\'originalité et détecter les paraphrases.',
  },
  'pt-BR': {
    analyzeBtn: '§ Analisar originalidade e plágio',
    analyzingBtn: 'Analisando plágio...',
    addFiles: '📁 Adicionar arquivos de referência',
    pasteRef: '📋 Colar referência',
    clearRefs: 'Limpar referências',
    cancel: 'Cancelar',
    addRefBtn: 'Adicionar referência',
    pasteModalTitle: 'Colar texto do documento de referência',
    pasteTitlePlaceholder: 'Título do documento (ex: \'Artigo fonte 2026\')',
    pasteTextPlaceholder: 'Cole o conteúdo de referência aqui...',
    neuralEmbeddings: 'Embeddings neurais (all-MiniLM-L6-v2)',
    webVerification: 'Verificação web e acadêmica (CrossRef e Wikipedia)',
    offlineActive: '[Modo Offline Ativo]',
    vaultTitle: '📚 Cofre de documentos de referência',
    zeroRefsLoaded: 'Zero documentos carregados. (O modo 3 intrínseco ainda analisará autoplágio)',
    wordsCount: 'palavras',
    removeRef: 'Remover referência',
    originality: 'Originalidade',
    plagiarismScore: 'Pontuação de plágio',
    maxCoverage: 'Cobertura máxima',
    topSource: 'Fonte principal',
    exactMatches: 'Correspondências exatas',
    paraphrases: 'Paráfrases',
    intrinsicShifts: 'Desvios de estilo',
    none: 'Nenhuma',
    tabExact: 'Correspondências exatas e quase-cópias',
    tabSemantic: 'Paráfrases semânticas',
    tabIntrinsic: 'Desvios de estilo e autoplágio',
    tabOnline: 'Verificação web e acadêmica online',
    noShingleMatches: '✓ Nenhuma correspondência textual ou quase-cópia detectada contra os documentos de referência.',
    matchLabel: 'Correspondência',
    sourceLabel: 'Fonte:',
    shingleLabel: 'N-grama:',
    yourDoc: 'Seu documento:',
    refMatch: 'Correspondência na referência:',
    noSemanticMatches: '✓ Nenhuma paráfrase semântica ou trecho reescrito detectado contra as referências.',
    yourSentence: 'Frase do seu documento:',
    refSentence: 'Frase de referência:',
    mosaicTitle: 'Escrita em mosaico e desvios de estilo (|z| > 2.0)',
    noMosaic: '✓ Voz estilística uniforme mantida em todos os parágrafos (sem anomalias graves).',
    paragraphLabel: 'Parágrafo nº',
    deviatingFeatures: 'Traços divergentes:',
    internalDuplicationsTitle: 'Autoplágio interno e duplicações',
    noInternalDup: '✓ Nenhum trecho duplicado ou parágrafo autoplagiado no documento.',
    repeatedSnippet: 'Trecho de texto repetido',
    orphanCitationsTitle: 'Citações órfãs (ausentes nas referências)',
    noOrphanCitations: '✓ Nenhuma citação órfã sem referência bibliográfica detectada.',
    markerLabel: 'Marcador:',
    contextLabel: 'Contexto:',
    offlineNoticeTitle: 'Modo Offline Ativo',
    offlineNoticeDesc: 'Consultas online ao CrossRef DOI e Wikipedia estão desativadas para garantir zero requisições e privacidade total.',
    noOnlineHits: 'Nenhuma correspondência web ou acadêmica encontrada no CrossRef ou Wikipedia.',
    similarityLabel: 'Similaridade:',
    authorsLabel: 'Autores:',
    queryPhraseLabel: 'Frase pesquisada:',
    emptyTitle: 'Cofre de originalidade e integridade acadêmica',
    emptyDesc: 'Carregue documentos de referência e clique em Analisar para verificar originalidade, paráfrases e estilo.',
  },
  it: {
    analyzeBtn: '§ Analizza originalità e plagio',
    analyzingBtn: 'Analisi del plagio in corso...',
    addFiles: '📁 Aggiungi file di riferimento',
    pasteRef: '📋 Incolla riferimento',
    clearRefs: 'Cancella riferimenti',
    cancel: 'Annulla',
    addRefBtn: 'Aggiungi riferimento',
    pasteModalTitle: 'Incolla testo del documento di riferimento',
    pasteTitlePlaceholder: 'Titolo del documento (es. \'Articolo fonte 2026\')',
    pasteTextPlaceholder: 'Incolla qui il testo di riferimento...',
    neuralEmbeddings: 'Embedding neurali (all-MiniLM-L6-v2)',
    webVerification: 'Verifica web e accademica (CrossRef e Wikipedia)',
    offlineActive: '[Modalità Offline Attiva]',
    vaultTitle: '📚 Vault documenti di riferimento',
    zeroRefsLoaded: 'Nessun documento caricato. (La modalità 3 intrinseca analizzerà l\'autoplagio)',
    wordsCount: 'parole',
    removeRef: 'Rimuovi riferimento',
    originality: 'Originalità',
    plagiarismScore: 'Punteggio plagio',
    maxCoverage: 'Copertura max',
    topSource: 'Fonte principale',
    exactMatches: 'Corrispondenze esatte',
    paraphrases: 'Parafrasi',
    intrinsicShifts: 'Variazioni di stile',
    none: 'Nessuna',
    tabExact: 'Corrispondenze esatte e quasi-copie',
    tabSemantic: 'Parafrasi semantiche',
    tabIntrinsic: 'Variazioni di stile e autoplagio',
    tabOnline: 'Verifica web e accademica online',
    noShingleMatches: '✓ Nessuna corrispondenza letterale o quasi-copia rilevata rispetto ai riferimenti.',
    matchLabel: 'Corrispondenza',
    sourceLabel: 'Fonte:',
    shingleLabel: 'N-gramma:',
    yourDoc: 'Il tuo documento:',
    refMatch: 'Corrispondenza di riferimento:',
    noSemanticMatches: '✓ Nessuna parafrasi semantica o passaggio riscritto rilevato rispetto ai riferimenti.',
    yourSentence: 'Frase del tuo documento:',
    refSentence: 'Frase di riferimento:',
    mosaicTitle: 'Patchwriting a mosaico e cambi di stile (|z| > 2.0)',
    noMosaic: '✓ Voce stilistica uniforme mantenuta in tutti i paragrafi (nessuna anomalia grave).',
    paragraphLabel: 'Paragrafo n.',
    deviatingFeatures: 'Caratteristiche discordanti:',
    internalDuplicationsTitle: 'Autoplagio interno e duplicazioni',
    noInternalDup: '✓ Nessun passaggio duplicato o paragrafo autoplagiato nel documento.',
    repeatedSnippet: 'Snippet di testo ripetuto',
    orphanCitationsTitle: 'Citazioni orfane (mancanti nei riferimenti)',
    noOrphanCitations: '✓ Nessuna citazione orfana senza voce bibliografica rilevata.',
    markerLabel: 'Marcatore:',
    contextLabel: 'Contesto:',
    offlineNoticeTitle: 'Modalità Offline Attiva',
    offlineNoticeDesc: 'Le query online a CrossRef DOI e Wikipedia sono disabilitate per garantire zero richieste esterne e massima privacy.',
    noOnlineHits: 'Nessuna corrispondenza web o accademica trovata su CrossRef o Wikipedia.',
    similarityLabel: 'Similarità:',
    authorsLabel: 'Autori:',
    queryPhraseLabel: 'Frase cercata:',
    emptyTitle: 'Vault di originalità e integrità accademica',
    emptyDesc: 'Carica documenti di riferimento e clicca su Analizza per verificare originalità, parafrasi e stile.',
  },
};

export default function PlagiarismPanel() {
  const { originalText, cleanedText, appMode, uiLanguage } = useStore();
  const dict = I18N[(uiLanguage as keyof typeof I18N) ?? 'en'] ?? I18N.en;

  const storeReferences = useStore((s: any) => s.referenceDocuments);
  const addRefDoc = useStore((s: any) => s.addReferenceDocument);
  const removeRefDoc = useStore((s: any) => s.removeReferenceDocument);
  const clearRefDocs = useStore((s: any) => s.clearReferenceDocuments);

  const storePlagiarismResult = useStore((s: any) => s.plagiarismResult);
  const setStorePlagiarismResult = useStore((s: any) => s.setPlagiarismResult);
  const isAnalyzingPlagiarism = useStore((s: any) => s.isAnalyzingPlagiarism);
  const setIsAnalyzingPlagiarism = useStore((s: any) => s.setIsAnalyzingPlagiarism);

  // Local state fallbacks if store actions are pending
  const [localReferences, setLocalReferences] = useState<ReferenceDocument[]>([]);
  const [localResult, setLocalResult] = useState<PlagiarismAnalysisResult | null>(null);
  const [localAnalyzing, setLocalAnalyzing] = useState(false);

  const references: ReferenceDocument[] = Array.isArray(storeReferences) ? storeReferences : localReferences;
  const result: PlagiarismAnalysisResult | null = storePlagiarismResult ?? localResult;
  const isRunning = Boolean(isAnalyzingPlagiarism || localAnalyzing);

  // Mode tab selection
  const [activeTab, setActiveTab] = useState<'shingle' | 'semantic' | 'intrinsic' | 'online'>('shingle');

  // Options
  const [useNeuralEmbeddings, setUseNeuralEmbeddings] = useState(false);
  const [enableOnline, setEnableOnline] = useState(appMode === 'online');

  // Paste Reference modal/drawer
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedName, setPastedName] = useState('');
  const [pastedText, setPastedText] = useState('');

  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const text = cleanedText ?? originalText;

  // Add reference helper
  const handleAddDocument = useCallback((doc: ReferenceDocument) => {
    if (typeof addRefDoc === 'function') {
      addRefDoc(doc);
    } else {
      setLocalReferences(prev => [...prev, doc]);
    }
  }, [addRefDoc]);

  // Remove reference helper
  const handleRemoveDocument = useCallback((id: string) => {
    if (typeof removeRefDoc === 'function') {
      removeRefDoc(id);
    } else {
      setLocalReferences(prev => prev.filter(r => r.id !== id));
    }
  }, [removeRefDoc]);

  // Clear references helper
  const handleClearDocuments = useCallback(() => {
    if (typeof clearRefDocs === 'function') {
      clearRefDocs();
    } else {
      setLocalReferences([]);
    }
  }, [clearRefDocs]);

  // File upload handler
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let content = '';
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'html' || ext === 'htm' || ext === 'json') {
          content = await file.text();
        } else {
          content = await parseFile(file);
        }

        const trimmed = content.trim();
        if (trimmed) {
          const doc: ReferenceDocument = {
            id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            text: trimmed,
            sourceType: 'file',
            charCount: trimmed.length,
            wordCount: trimmed.split(/\s+/).filter(w => w.length > 0).length,
          };
          handleAddDocument(doc);
        }
      } catch (err) {
        setUploadError(`Failed to load ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [handleAddDocument]);

  // Submit pasted reference text
  const handlePasteSubmit = useCallback(() => {
    const trimmed = pastedText.trim();
    if (!trimmed) return;
    const name = pastedName.trim() || `Pasted Reference (${new Date().toLocaleTimeString()})`;
    const doc: ReferenceDocument = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      text: trimmed,
      sourceType: 'pasted',
      charCount: trimmed.length,
      wordCount: trimmed.split(/\s+/).filter(w => w.length > 0).length,
    };
    handleAddDocument(doc);
    setPastedName('');
    setPastedText('');
    setShowPasteModal(false);
  }, [pastedName, pastedText, handleAddDocument]);

  // Run analysis
  const handleAnalyze = useCallback(async () => {
    if (!text || text.trim().length === 0) return;

    if (typeof setIsAnalyzingPlagiarism === 'function') {
      setIsAnalyzingPlagiarism(true);
    }
    setLocalAnalyzing(true);

    try {
      const res = await analyzePlagiarism(text, references, {
        enableSemantic: true,
        useNeuralEmbeddings,
        enableIntrinsic: true,
        enableOnline: enableOnline && appMode === 'online',
        offlineMode: appMode === 'offline',
      });

      if (typeof setStorePlagiarismResult === 'function') {
        setStorePlagiarismResult(res);
      }
      setLocalResult(res);
    } finally {
      if (typeof setIsAnalyzingPlagiarism === 'function') {
        setIsAnalyzingPlagiarism(false);
      }
      setLocalAnalyzing(false);
    }
  }, [text, references, useNeuralEmbeddings, enableOnline, appMode, setIsAnalyzingPlagiarism, setStorePlagiarismResult]);

  // Gauge colors and strict null guards
  const originalityScore = result ? (result.originalityScore ?? 100) : 100;
  const gaugeColor =
    originalityScore >= 80 ? '#10B981' : originalityScore >= 50 ? '#F59E0B' : '#EF4444';

  const circumference = 2 * Math.PI * 40; // r=40
  const strokeDashoffset = circumference - (originalityScore / 100) * circumference;

  const shingleMatchesList = Array.isArray(result?.shingleMatches) ? result.shingleMatches : [];
  const semanticMatchesList = Array.isArray(result?.semanticMatches) ? result.semanticMatches : [];
  const intrinsicAnomaliesList = Array.isArray(result?.intrinsicAnomalies) ? result.intrinsicAnomalies : [];
  const internalDuplicatesList = Array.isArray(result?.internalDuplicates) ? result.internalDuplicates : [];
  const orphanCitationsList = Array.isArray(result?.orphanCitations) ? result.orphanCitations : [];
  const onlineHitsList = Array.isArray(result?.onlineHits) ? result.onlineHits : [];

  const highestMatchPercent = result?.summary?.highestMatchPercent ?? 0;
  const highestMatchSource = result?.summary?.highestMatchSource ?? dict.none;
  const paraphraseCount = result?.summary?.paraphraseCount ?? 0;
  const styleShiftCount = result?.summary?.styleShiftCount ?? 0;
  const plagiarismScoreVal = result?.plagiarismScore ?? 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark">
      {/* Top Toolbar */}
      <div className="panel-bar">
        <button
          onClick={handleAnalyze}
          disabled={!text || isRunning}
          className="btn-primary"
        >
          {isRunning ? dict.analyzingBtn : dict.analyzeBtn}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-ghost"
          title="Upload reference files (TXT, MD, DOCX, PDF, HTML, JSON)"
        >
          {dict.addFiles}
        </button>

        <button
          onClick={() => setShowPasteModal(true)}
          className="btn-ghost"
          title="Paste reference text directly"
        >
          {dict.pasteRef}
        </button>

        {references.length > 0 && (
          <button
            onClick={handleClearDocuments}
            className="btn-ghost text-ink-muted hover:text-danger ml-auto text-xs"
            title="Remove all reference documents"
          >
            {dict.clearRefs} ({references.length})
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.docx,.pdf,.html,.htm,.json"
          className="hidden"
          onChange={e => { handleFileUpload(e.target.files); e.target.value = ''; }}
        />
      </div>

      {uploadError && (
        <div className="px-4 py-2 bg-danger/10 border-b border-danger/20 text-xs text-danger dark:text-red-400 flex items-center justify-between">
          <span>⚠ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-ink-muted hover:text-ink">✕</button>
        </div>
      )}

      {/* Paste Reference Drawer / Form */}
      {showPasteModal && (
        <div className="p-4 border-b border-border dark:border-border-dark bg-panel/70 dark:bg-panel-dark/70 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold">
            <span>{dict.pasteModalTitle}</span>
            <button onClick={() => setShowPasteModal(false)} className="text-ink-muted hover:text-ink">✕</button>
          </div>
          <input
            type="text"
            placeholder={dict.pasteTitlePlaceholder}
            value={pastedName}
            onChange={e => setPastedName(e.target.value)}
            className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded px-2.5 py-1.5 text-xs text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <textarea
            rows={4}
            placeholder={dict.pasteTextPlaceholder}
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded p-2.5 text-xs text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowPasteModal(false)} className="btn-ghost">{dict.cancel}</button>
            <button onClick={handlePasteSubmit} disabled={!pastedText.trim()} className="btn-primary">
              {dict.addRefBtn}
            </button>
          </div>
        </div>
      )}

      {/* Settings / Mode Option Toggles */}
      <div className="px-4 py-2 border-b border-border dark:border-border-dark bg-panel/30 dark:bg-panel-dark/30 flex items-center gap-4 flex-wrap text-[11px]">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={useNeuralEmbeddings}
            onChange={e => setUseNeuralEmbeddings(e.target.checked)}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>{dict.neuralEmbeddings}</span>
        </label>

        <label className={`flex items-center gap-1.5 cursor-pointer ${appMode === 'offline' ? 'opacity-40 cursor-not-allowed' : ''}`}>
          <input
            type="checkbox"
            disabled={appMode === 'offline'}
            checked={enableOnline && appMode === 'online'}
            onChange={e => setEnableOnline(e.target.checked)}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>{dict.webVerification}</span>
        </label>
        {appMode === 'offline' && (
          <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">
            {dict.offlineActive}
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Reference Document Vault Row */}
        <div className="panel-card p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted text-[10px]">
              <span>{dict.vaultTitle}</span>
              <span className="badge-neutral font-mono">{references.length}</span>
            </div>
            {references.length === 0 && (
              <span className="text-[11px] text-ink-muted dark:text-ink-dark-muted">
                {dict.zeroRefsLoaded}
              </span>
            )}
          </div>

          {references.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
              {references.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/80 dark:border-border-dark/80 bg-surface dark:bg-surface-dark shrink-0 text-xs shadow-sm hover:border-accent/40 transition-all"
                >
                  <span className="text-ink-muted">📄</span>
                  <div className="min-w-0 max-w-[150px]">
                    <div className="truncate font-semibold text-ink dark:text-ink-dark" title={doc.name}>
                      {doc.name}
                    </div>
                    <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted">
                      {doc.wordCount ?? 0} {dict.wordsCount}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDocument(doc.id)}
                    title={dict.removeRef}
                    className="text-ink-muted hover:text-danger ml-1 p-0.5 rounded text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results Header (SVG Radial Gauge + Stat Cards) */}
        {result && (
          <div className="panel-card p-4 space-y-4">
            <div className="flex items-center gap-6 flex-wrap">
              {/* SVG Radial Gauge */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-border dark:text-border-dark opacity-30"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={gaugeColor}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black tabular-nums text-ink dark:text-ink-dark">
                    {result.originalityScore}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-ink-muted dark:text-ink-dark-muted">
                    {dict.originality}
                  </span>
                </div>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 min-w-[200px]">
                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    {dict.plagiarismScore}
                  </div>
                  <div className={`text-base font-bold tabular-nums ${plagiarismScoreVal > 20 ? 'text-danger' : 'text-success'}`}>
                    {plagiarismScoreVal}%
                  </div>
                </div>

                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    {dict.maxCoverage}
                  </div>
                  <div className="text-base font-bold tabular-nums text-ink dark:text-ink-dark">
                    {highestMatchPercent}%
                  </div>
                </div>

                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    {dict.topSource}
                  </div>
                  <div className="text-xs font-semibold text-ink dark:text-ink-dark truncate" title={highestMatchSource}>
                    {highestMatchSource}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    {dict.exactMatches}
                  </div>
                  <div className="text-base font-bold tabular-nums text-ink dark:text-ink-dark">
                    {shingleMatchesList.length}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    {dict.paraphrases}
                  </div>
                  <div className="text-base font-bold tabular-nums text-ink dark:text-ink-dark">
                    {paraphraseCount}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="text-[10px] font-semibold uppercase text-ink-muted dark:text-ink-dark-muted">
                    {dict.intrinsicShifts}
                  </div>
                  <div className="text-base font-bold tabular-nums text-ink dark:text-ink-dark">
                    {styleShiftCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Segmented Mode Tabs */}
            <div className="flex border-b border-border dark:border-border-dark gap-1 text-xs">
              <button
                onClick={() => setActiveTab('shingle')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'shingle'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-ink-muted dark:text-ink-dark-muted hover:text-ink'
                }`}
              >
                <span>{dict.tabExact}</span>
                <span className="badge-neutral font-mono text-[9px]">{shingleMatchesList.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('semantic')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'semantic'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-ink-muted dark:text-ink-dark-muted hover:text-ink'
                }`}
              >
                <span>{dict.tabSemantic}</span>
                <span className="badge-neutral font-mono text-[9px]">{semanticMatchesList.length}</span>
              </button>

              <button
                onClick={() => setActiveTab('intrinsic')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'intrinsic'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-ink-muted dark:text-ink-dark-muted hover:text-ink'
                }`}
              >
                <span>{dict.tabIntrinsic}</span>
                <span className="badge-neutral font-mono text-[9px]">
                  {intrinsicAnomaliesList.length + internalDuplicatesList.length + orphanCitationsList.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('online')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'online'
                    ? 'border-accent text-accent font-semibold'
                    : 'border-transparent text-ink-muted dark:text-ink-dark-muted hover:text-ink'
                }`}
              >
                <span>{dict.tabOnline}</span>
                <span className="badge-neutral font-mono text-[9px]">{onlineHitsList.length}</span>
              </button>
            </div>

            {/* Tab 1: Exact Shingle Matches */}
            {activeTab === 'shingle' && (
              <div className="space-y-3 pt-1">
                {shingleMatchesList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-success dark:text-emerald-400 bg-success-muted rounded-xl">
                    {dict.noShingleMatches}
                  </div>
                ) : (
                  shingleMatchesList.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-danger/30 bg-surface dark:bg-surface-dark space-y-2 text-xs shadow-sm hover:border-accent/40 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="badge-danger font-mono text-[10px]">
                            {Math.round((m.similarity ?? 0) * 100)}% {dict.matchLabel}
                          </span>
                          <span className="font-semibold text-ink dark:text-ink-dark">
                            {dict.sourceLabel} {m.referenceName}
                          </span>
                        </div>
                        <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">
                          {dict.shingleLabel} {m.shingleSize}-gram
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded bg-danger/5 dark:bg-danger/10 border border-danger/20 space-y-1">
                          <span className="font-semibold text-danger dark:text-red-300 block">{dict.yourDoc}</span>
                          <p className="font-mono text-ink dark:text-ink-dark break-words">{m.sourceText}</p>
                        </div>
                        <div className="p-2 rounded bg-panel dark:bg-panel-dark border border-border/60 dark:border-border-dark/60 space-y-1">
                          <span className="font-semibold text-ink-muted dark:text-ink-dark-muted block">{dict.refMatch}</span>
                          <p className="font-mono text-ink dark:text-ink-dark break-words">{m.referenceText}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Semantic Paraphrases */}
            {activeTab === 'semantic' && (
              <div className="space-y-3 pt-1">
                {semanticMatchesList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-success dark:text-emerald-400 bg-success-muted rounded-xl">
                    {dict.noSemanticMatches}
                  </div>
                ) : (
                  semanticMatchesList.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-warning/30 bg-surface dark:bg-surface-dark space-y-2 text-xs shadow-sm hover:border-accent/40 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="badge-warning font-mono text-[10px]">
                            Cosine: {((m.similarity ?? 0) * 100).toFixed(0)}%
                          </span>
                          <span className="badge-neutral font-mono text-[10px]">
                            {m.method === 'embedding-neural' ? 'all-MiniLM-L6-v2' : 'TF-IDF Pre-Filter'}
                          </span>
                          <span className="font-semibold text-ink dark:text-ink-dark">
                            {dict.sourceLabel} {m.referenceName}
                          </span>
                        </div>
                        <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">
                          Lexical Jaccard: {((m.jaccard ?? 0) * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded bg-warning/5 dark:bg-warning/10 border border-warning/20 space-y-1">
                          <span className="font-semibold text-warning dark:text-yellow-400 block">{dict.yourSentence}</span>
                          <p className="text-ink dark:text-ink-dark leading-relaxed">{m.sourceSentence}</p>
                        </div>
                        <div className="p-2 rounded bg-panel dark:bg-panel-dark border border-border/60 dark:border-border-dark/60 space-y-1">
                          <span className="font-semibold text-ink-muted dark:text-ink-dark-muted block">{dict.refSentence}</span>
                          <p className="text-ink dark:text-ink-dark leading-relaxed">{m.referenceSentence}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Intrinsic Style-Shift & Self-Plagiarism */}
            {activeTab === 'intrinsic' && (
              <div className="space-y-4 pt-1">
                {/* 3a: Patchwriting / Style shifts */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted flex items-center gap-2">
                    <span>{dict.mosaicTitle}</span>
                    <span className="badge-neutral font-mono">{intrinsicAnomaliesList.length}</span>
                  </h4>
                  {intrinsicAnomaliesList.length === 0 ? (
                    <div className="p-3 text-xs text-success dark:text-emerald-400 bg-success-muted rounded-xl">
                      {dict.noMosaic}
                    </div>
                  ) : (
                    intrinsicAnomaliesList.map((anom, idx) => {
                      const devFeatures = Array.isArray(anom?.deviatingFeatures) ? anom.deviatingFeatures : [];

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-warning/30 bg-surface dark:bg-surface-dark space-y-2 text-xs shadow-sm hover:border-accent/40 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-warning dark:text-yellow-400">
                              {dict.paragraphLabel}{anom.paragraphIndex + 1} (z = {(anom.zScore ?? 0).toFixed(2)})
                            </span>
                            <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">
                              FK Grade: {(anom.metrics?.fleschKincaidGrade ?? 0).toFixed(1)}
                            </span>
                          </div>
                          <p className="p-2 rounded bg-panel dark:bg-panel-dark text-[11px] text-ink dark:text-ink-dark italic leading-relaxed">
                            "{(anom.text ?? '').slice(0, 240)}{(anom.text ?? '').length > 240 ? '...' : ''}"
                          </p>
                          <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted">
                            <span className="font-semibold text-ink dark:text-ink-dark">{dict.deviatingFeatures} </span>
                            {devFeatures.join(', ')}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 3b: Internal Duplications */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted flex items-center gap-2">
                    <span>{dict.internalDuplicationsTitle}</span>
                    <span className="badge-neutral font-mono">{internalDuplicatesList.length}</span>
                  </h4>
                  {internalDuplicatesList.length === 0 ? (
                    <div className="p-3 text-xs text-success dark:text-emerald-400 bg-success-muted rounded-xl">
                      {dict.noInternalDup}
                    </div>
                  ) : (
                    internalDuplicatesList.map((dup, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-1 text-xs shadow-sm"
                      >
                        <div className="font-semibold text-ink dark:text-ink-dark">
                          {dict.repeatedSnippet} (@{dup.firstStart} & @{dup.secondStart}):
                        </div>
                        <p className="p-2 rounded bg-surface dark:bg-surface-dark text-[11px] font-mono text-ink-muted">
                          "{(dup.firstText ?? '').slice(0, 180)}"
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* 3c: Orphan Citations */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted flex items-center gap-2">
                    <span>{dict.orphanCitationsTitle}</span>
                    <span className="badge-neutral font-mono">{orphanCitationsList.length}</span>
                  </h4>
                  {orphanCitationsList.length === 0 ? (
                    <div className="p-3 text-xs text-success dark:text-emerald-400 bg-success-muted rounded-xl">
                      {dict.noOrphanCitations}
                    </div>
                  ) : (
                    orphanCitationsList.map((cit, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-warning/20 bg-warning/5 dark:bg-warning/10 space-y-1 text-xs shadow-sm"
                      >
                        <div className="flex items-center gap-2 font-bold text-warning dark:text-yellow-400">
                          <span>{dict.markerLabel} {cit.marker}</span>
                          <span className="text-[10px] text-ink-muted font-normal font-mono">@{cit.offset}</span>
                        </div>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          {dict.contextLabel} "...{cit.surroundingContext}..."
                        </p>
                        <p className="text-[10px] text-danger dark:text-red-300">
                          {cit.reason}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Online Web & Academic Verification */}
            {activeTab === 'online' && (
              <div className="space-y-3 pt-1">
                {appMode === 'offline' ? (
                  <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark text-center space-y-2 shadow-sm">
                    <span className="text-xl">🔒</span>
                    <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                      {dict.offlineNoticeTitle}
                    </h4>
                    <p className="text-xs text-ink-muted dark:text-ink-dark-muted max-w-md mx-auto">
                      {dict.offlineNoticeDesc}
                    </p>
                  </div>
                ) : onlineHitsList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-ink-muted dark:text-ink-dark-muted bg-panel dark:bg-panel-dark rounded-xl shadow-sm">
                    {dict.noOnlineHits}
                  </div>
                ) : (
                  onlineHitsList.map((hit, idx) => {
                    const authors = Array.isArray(hit?.authors) ? hit.authors : [];

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark space-y-2 text-xs shadow-sm hover:border-accent/40 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="badge badge-neutral text-[9px] uppercase font-mono">
                              {hit.source}
                            </span>
                            <a
                              href={hit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-accent hover:underline text-xs"
                            >
                              {hit.title} ↗
                            </a>
                          </div>
                          <span className="badge-warning font-mono text-[10px]">
                            {dict.similarityLabel} {Math.round((hit.similarityScore ?? 0) * 100)}%
                          </span>
                        </div>

                        {authors.length > 0 && (
                          <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted">
                            {dict.authorsLabel} {authors.join(', ')} {hit.year ? `(${hit.year})` : ''}
                          </div>
                        )}

                        {hit.snippet && (
                          <p className="p-2 rounded bg-panel dark:bg-panel-dark text-[11px] text-ink dark:text-ink-dark leading-relaxed">
                            {hit.snippet}
                          </p>
                        )}

                        <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono truncate">
                          {dict.queryPhraseLabel} "{hit.queryPhrase}"
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {!result && (
          <div className="illustration-box h-full my-auto space-y-3">
            <svg
              className="w-16 h-16 text-accent/60 animate-pulse-subtle"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="10" y="8" width="28" height="38" rx="4" opacity="0.25" fill="currentColor" />
              <rect x="10" y="8" width="28" height="38" rx="4" />
              <rect x="26" y="18" width="28" height="38" rx="4" />
              <path d="M16 18h16M16 24h10M32 28h16M32 34h12M32 40h14" />
              <circle cx="48" cy="48" r="8" fill="var(--color-surface, #fff)" className="dark:fill-surface-dark" />
              <circle cx="48" cy="48" r="8" />
              <path d="M45 48l2 2 4-4" />
            </svg>
            <h3 className="text-sm font-bold text-ink dark:text-ink-dark">{dict.emptyTitle}</h3>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted max-w-sm">{dict.emptyDesc}</p>
          </div>
        )}
      </div>
    </div>
  );
}
