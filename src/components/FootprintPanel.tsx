import { useCallback, useState, useMemo } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { analyzeFootprint } from '../core/footprint/analysis';
import {
  scrubAllAIFingerprints,
  type AIFingerprintScrubReport,
} from '../core/footprint/removal';
import {
  computeSentenceFingerprintHeatmap,
  type SentenceFingerprint,
} from '../core/footprint/detector';

const I18N = {
  en: {
    scrubAll: '✨ Scrub All AI Fingerprints',
    scrubAllTitle: 'Executes explicit 4-layer AI fingerprint scrubbing with protected code preservation',
    intensity: 'Intensity:',
    layers: 'Layers:',
    layer1: 'Layer 1: Lexical Buzzwords',
    layer2: 'Layer 2: Hedging & Templates',
    layer3: 'Layer 3: Typographic & Punctuation Tells',
    layer4: 'Layer 4: Burstiness & Variance',
    scrubbedSuccess: '✓ AI Fingerprints Scrubbed',
    transformsApplied: 'transforms applied',
    before: 'Before:',
    after: 'After:',
    riskReduction: 'Risk',
    synonymsRotated: 'Synonyms Rotated',
    hedgingStripped: 'Hedging Stripped',
    templatesRewritten: 'Templates Rewritten',
    emDashesNormalized: 'Em-Dashes Normalized',
    curlyQuotesNormalized: 'Curly Quotes Normalized',
    boldColonsCleaned: 'Bold-Colons Cleaned',
    nbspStripped: 'NBSP Stripped',
    protectedSpans: 'Code/URLs Preserved',
    heatmapTitle: 'Per-Sentence Fingerprint Risk Heatmap',
    sentencesCount: 'sentences',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    sentenceDetails: 'Selected Sentence Details',
    risk: 'RISK',
    triggers: 'Triggers:',
    naturalSentence: 'None (Natural human writing)',
    varietyTitle: 'Sentence Length Variety',
    naturalVariety: 'Natural',
    uniformVariety: 'Uniform (AI-like)',
    varianceLabel: 'Variance:',
    diversityTitle: 'Vocabulary Diversity',
    ttrLabel: 'Type-Token Ratio',
    buzzwordDensity: 'AI Buzzword Density',
    wordsCount: 'words',
    noneDetected: 'None detected',
    showTechMetrics: 'Show Technical Metrics & Profiles',
    perplexityUniformity: 'Perplexity Uniformity',
    perplexityMean: 'Perplexity Mean',
    sentenceLengthMean: 'Sentence Length Mean',
    bigramRepeatRatio: 'Bigram Repeat Ratio',
    trigramRepeatRatio: 'Trigram Repeat Ratio',
    structuralUniformity: 'Structural Uniformity',
    hapaxRatio: 'Hapax Legomena Ratio',
    templatePhrasesCount: 'Template Phrases Count',
    hedgingPhrasesCount: 'Hedging Phrases Count',
    emptyTitle: 'AI Stylometric & Fingerprint Scanner',
    emptyDesc: 'Analyze vocabulary burstiness, perplexity variance, and synthetic LLM writing patterns.',
  },
  es: {
    scrubAll: '✨ Depurar todas las huellas de IA',
    scrubAllTitle: 'Ejecuta la depuración explícita de huellas de IA en 4 capas preservando el código protegido',
    intensity: 'Intensidad:',
    layers: 'Capas:',
    layer1: 'Capa 1: Palabras de moda léxicas',
    layer2: 'Capa 2: Ambigüedad y plantillas',
    layer3: 'Capa 3: Señales tipográficas y puntuación',
    layer4: 'Capa 4: Ráfagas y varianza',
    scrubbedSuccess: '✓ Huellas de IA depuradas',
    transformsApplied: 'transformaciones aplicadas',
    before: 'Antes:',
    after: 'Después:',
    riskReduction: 'Riesgo',
    synonymsRotated: 'Sinónimos rotados',
    hedgingStripped: 'Atenuaciones eliminadas',
    templatesRewritten: 'Plantillas reescritas',
    emDashesNormalized: 'Guiones largos normalizados',
    curlyQuotesNormalized: 'Comillas tipográficas normalizadas',
    boldColonsCleaned: 'Dos puntos en negrita limpiados',
    nbspStripped: 'Espacios duros eliminados',
    protectedSpans: 'Código/URLs preservados',
    heatmapTitle: 'Mapa térmico de riesgo de huella por oración',
    sentencesCount: 'oraciones',
    high: 'Alto',
    medium: 'Medio',
    low: 'Bajo',
    sentenceDetails: 'Detalles de la oración seleccionada',
    risk: 'RIESGO',
    triggers: 'Disparadores:',
    naturalSentence: 'Ninguno (Escritura humana natural)',
    varietyTitle: 'Variedad de longitud de oraciones',
    naturalVariety: 'Natural',
    uniformVariety: 'Uniforme (Similar a IA)',
    varianceLabel: 'Varianza:',
    diversityTitle: 'Diversidad de vocabulario',
    ttrLabel: 'Razón tipo-token',
    buzzwordDensity: 'Densidad de palabras clave de IA',
    wordsCount: 'palabras',
    noneDetected: 'Ninguna detectada',
    showTechMetrics: 'Mostrar métricas y perfiles técnicos',
    perplexityUniformity: 'Uniformidad de perplejidad',
    perplexityMean: 'Media de perplejidad',
    sentenceLengthMean: 'Media de longitud de oración',
    bigramRepeatRatio: 'Tasa de repetición de bigramas',
    trigramRepeatRatio: 'Tasa de repetición de trigramas',
    structuralUniformity: 'Uniformidad estructural',
    hapaxRatio: 'Proporción de hapax legomena',
    templatePhrasesCount: 'Recuento de frases plantilla',
    hedgingPhrasesCount: 'Recuento de frases atenuantes',
    emptyTitle: 'Escáner estilométrico y de huellas de IA',
    emptyDesc: 'Analice la variabilidad del vocabulario, la varianza de perplejidad y los patrones de escritura sintética de LLM.',
  },
  fr: {
    scrubAll: '✨ Nettoyer toutes les empreintes d\'IA',
    scrubAllTitle: 'Exécute un nettoyage explicite à 4 couches des empreintes d\'IA avec préservation du code protégé',
    intensity: 'Intensité :',
    layers: 'Couches :',
    layer1: 'Couche 1 : Mots à la mode lexicaux',
    layer2: 'Couche 2 : Formules d\'atténuation et modèles',
    layer3: 'Couche 3 : Signes typographiques et ponctuation',
    layer4: 'Couche 4 : Variabilité et variance',
    scrubbedSuccess: '✓ Empreintes d\'IA nettoyées',
    transformsApplied: 'transformations appliquées',
    before: 'Avant :',
    after: 'Après :',
    riskReduction: 'Risque',
    synonymsRotated: 'Synonymes alternés',
    hedgingStripped: 'Atténuations supprimées',
    templatesRewritten: 'Modèles réécrits',
    emDashesNormalized: 'Tirets cadratins normalisés',
    curlyQuotesNormalized: 'Guillemets courbés normalisés',
    boldColonsCleaned: 'Deux-points en gras nettoyés',
    nbspStripped: 'Espaces insécables supprimés',
    protectedSpans: 'Code/URLs préservés',
    heatmapTitle: 'Carte thermique du risque d\'empreinte par phrase',
    sentencesCount: 'phrases',
    high: 'Élevé',
    medium: 'Moyen',
    low: 'Faible',
    sentenceDetails: 'Détails de la phrase sélectionnée',
    risk: 'RISQUE',
    triggers: 'Déclencheurs :',
    naturalSentence: 'Aucun (Écriture humaine naturelle)',
    varietyTitle: 'Variété de longueur des phrases',
    naturalVariety: 'Naturel',
    uniformVariety: 'Uniforme (Semblable à l\'IA)',
    varianceLabel: 'Variance :',
    diversityTitle: 'Diversité du vocabulaire',
    ttrLabel: 'Ratio type-token',
    buzzwordDensity: 'Densité de buzzwords d\'IA',
    wordsCount: 'mots',
    noneDetected: 'Aucun détecté',
    showTechMetrics: 'Afficher les métriques et profils techniques',
    perplexityUniformity: 'Uniformité de perplexité',
    perplexityMean: 'Moyenne de perplexité',
    sentenceLengthMean: 'Longueur moyenne des phrases',
    bigramRepeatRatio: 'Taux de répétition des bigrammes',
    trigramRepeatRatio: 'Taux de répétition des trigrammes',
    structuralUniformity: 'Uniformité structurelle',
    hapaxRatio: 'Ratio d\'hapax legomena',
    templatePhrasesCount: 'Nombre d\'expressions modèles',
    hedgingPhrasesCount: 'Nombre d\'expressions d\'atténuation',
    emptyTitle: 'Scanner stylométrique et d\'empreintes IA',
    emptyDesc: 'Analysez la variabilité du vocabulaire, la perplexité et les schémas d\'écriture synthétique.',
  },
  'pt-BR': {
    scrubAll: '✨ Limpar todas as pegadas de IA',
    scrubAllTitle: 'Executa a remoção explícita de pegadas de IA em 4 camadas com preservação de código protegido',
    intensity: 'Intensidade:',
    layers: 'Camadas:',
    layer1: 'Camada 1: Jargões lexicais',
    layer2: 'Camada 2: Atenuação e modelos',
    layer3: 'Camada 3: Sinais tipográficos e pontuação',
    layer4: 'Camada 4: Variação e dispersão',
    scrubbedSuccess: '✓ Pegadas de IA limpas',
    transformsApplied: 'transformações aplicadas',
    before: 'Antes:',
    after: 'Depois:',
    riskReduction: 'Risco',
    synonymsRotated: 'Sinônimos alternados',
    hedgingStripped: 'Atenuações removidas',
    templatesRewritten: 'Modelos reescritos',
    emDashesNormalized: 'Travessões normalizados',
    curlyQuotesNormalized: 'Aspas curvas normalizadas',
    boldColonsCleaned: 'Dois-pontos em negrito limpos',
    nbspStripped: 'Espaços não quebráveis removidos',
    protectedSpans: 'Código/URLs preservados',
    heatmapTitle: 'Mapa de calor de risco de pegada por frase',
    sentencesCount: 'frases',
    high: 'Alto',
    medium: 'Médio',
    low: 'Baixo',
    sentenceDetails: 'Detalhes da frase selecionada',
    risk: 'RISCO',
    triggers: 'Gatilhos:',
    naturalSentence: 'Nenhum (Escrita humana natural)',
    varietyTitle: 'Variedade de tamanho de frases',
    naturalVariety: 'Natural',
    uniformVariety: 'Uniforme (Similar a IA)',
    varianceLabel: 'Variância:',
    diversityTitle: 'Diversidade de vocabulário',
    ttrLabel: 'Razão tipo-token',
    buzzwordDensity: 'Densidade de jargões de IA',
    wordsCount: 'palavras',
    noneDetected: 'Nenhum detectado',
    showTechMetrics: 'Exibir métricas e perfis técnicos',
    perplexityUniformity: 'Uniformidade de perplexidade',
    perplexityMean: 'Média de perplexidade',
    sentenceLengthMean: 'Média de tamanho de frase',
    bigramRepeatRatio: 'Taxa de repetição de bigramas',
    trigramRepeatRatio: 'Taxa de repetição de trigramas',
    structuralUniformity: 'Uniformidade estrutural',
    hapaxRatio: 'Proporção de hapax legomena',
    templatePhrasesCount: 'Contagem de frases modelo',
    hedgingPhrasesCount: 'Contagem de frases de atenuação',
    emptyTitle: 'Scanner estilométrico e de pegadas de IA',
    emptyDesc: 'Analise a dispersão de vocabulário, variância de perplexidade e padrões sintéticos de LLM.',
  },
  it: {
    scrubAll: '✨ Rimuovi tutte le impronte IA',
    scrubAllTitle: 'Esegue una pulizia a 4 livelli delle impronte IA preservando il codice protetto',
    intensity: 'Intensità:',
    layers: 'Livelli:',
    layer1: 'Livello 1: Buzzword lessicali',
    layer2: 'Livello 2: Espressioni dubitative e modelli',
    layer3: 'Livello 3: Segnali tipografici e punteggiatura',
    layer4: 'Livello 4: Variazione e burstiness',
    scrubbedSuccess: '✓ Impronte IA rimosse',
    transformsApplied: 'trasformazioni applicate',
    before: 'Prima:',
    after: 'Dopo:',
    riskReduction: 'Rischio',
    synonymsRotated: 'Sinonimi alternati',
    hedgingStripped: 'Espressioni dubitative rimosse',
    templatesRewritten: 'Modelli riscritti',
    emDashesNormalized: 'Trattini lunghi normalizzati',
    curlyQuotesNormalized: 'Virgolette curve normalizzate',
    boldColonsCleaned: 'Due punti in grassetto puliti',
    nbspStripped: 'Spazi unificatori rimossi',
    protectedSpans: 'Codice/URL preservati',
    heatmapTitle: 'Mappa termica del rischio di impronta per frase',
    sentencesCount: 'frasi',
    high: 'Alto',
    medium: 'Medio',
    low: 'Basso',
    sentenceDetails: 'Dettagli frase selezionata',
    risk: 'RISCHIO',
    triggers: 'Fattori scatenanti:',
    naturalSentence: 'Nessuno (Scrittura umana naturale)',
    varietyTitle: 'Varietà di lunghezza delle frasi',
    naturalVariety: 'Naturale',
    uniformVariety: 'Uniforme (Simile all\'IA)',
    varianceLabel: 'Varianza:',
    diversityTitle: 'Diversità di vocabolario',
    ttrLabel: 'Rapporto type-token',
    buzzwordDensity: 'Densità di buzzword IA',
    wordsCount: 'parole',
    noneDetected: 'Nessuno rilevato',
    showTechMetrics: 'Mostra metriche e profili tecnici',
    perplexityUniformity: 'Uniformità di perplessità',
    perplexityMean: 'Media perplessità',
    sentenceLengthMean: 'Lunghezza media delle frasi',
    bigramRepeatRatio: 'Rapporto ripetizione bigrammi',
    trigramRepeatRatio: 'Rapporto ripetizione trigrammi',
    structuralUniformity: 'Uniformità strutturale',
    hapaxRatio: 'Rapporto hapax legomena',
    templatePhrasesCount: 'Conteggio frasi modello',
    hedgingPhrasesCount: 'Conteggio frasi dubitative',
    emptyTitle: 'Scanner stilometrico e di impronte IA',
    emptyDesc: 'Analizza la variabilità del vocabolario, la perplessità e i pattern sintetici di scrittura LLM.',
  },
};

export default function FootprintPanel() {
  const {
    originalText,
    cleanedText,
    footprintAnalysis,
    isAnalyzingFootprint,
    setFootprintAnalysis,
    setFootprintRemoval,
    setIsAnalyzingFootprint,
    setCleanedText,
    uiLanguage,
  } = useStore();

  const applyTextMutation = useStore((s: any) => s.applyTextMutation);
  const storeScrubReport = useStore((s: any) => s.footprintScrubReport);
  const setFootprintScrubReport = useStore((s: any) => s.setFootprintScrubReport);
  const setSentenceHeatmap = useStore((s: any) => s.setSentenceHeatmap);

  const t = useT();
  const dict = I18N[(uiLanguage as keyof typeof I18N) ?? 'en'] ?? I18N.en;

  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'heavy'>('moderate');
  const [localScrubReport, setLocalScrubReport] = useState<AIFingerprintScrubReport | null>(null);
  const [activeSentence, setActiveSentence] = useState<SentenceFingerprint | null>(null);

  // 4-Layer Removal Toggles
  const [layers, setLayers] = useState({
    layer1Lexical: true,
    layer2HedgingTemplates: true,
    layer3Typographic: true,
    layer4Burstiness: true,
  });

  const text = cleanedText ?? originalText;

  // Active scrub report
  const activeReport = localScrubReport ?? storeScrubReport;

  // Sentence heatmap computation
  const heatmapData = useMemo(() => {
    if (!text) return { sentences: [], highCount: 0, moderateCount: 0, lowCount: 0 };
    return computeSentenceFingerprintHeatmap(text);
  }, [text]);

  const handleAnalyze = useCallback(() => {
    if (!text) return;
    setIsAnalyzingFootprint(true);
    setTimeout(() => {
      const result = analyzeFootprint(text);
      setFootprintAnalysis(result);
      const heatmap = computeSentenceFingerprintHeatmap(text);
      if (typeof setSentenceHeatmap === 'function') {
        setSentenceHeatmap((heatmap.sentences ?? []) as any);
      }
      setIsAnalyzingFootprint(false);
    });
  }, [text, setFootprintAnalysis, setIsAnalyzingFootprint, setSentenceHeatmap]);

  const handleScrubAll = useCallback(() => {
    if (!text) return;
    const report = scrubAllAIFingerprints(text, {
      intensity,
      normalizeTypographic: layers.layer3Typographic,
      preserveCodeSpans: true,
    });

    setLocalScrubReport(report);
    if (typeof setFootprintScrubReport === 'function') {
      setFootprintScrubReport(report);
    }
    setFootprintRemoval(report as any);

    const target = report.modified;
    if (typeof applyTextMutation === 'function') {
      applyTextMutation(target, 'footprint-scrub', 'Scrub All AI Fingerprints');
    }
    setCleanedText(target);

    // Update heatmap for the modified text
    const updatedHeatmap = computeSentenceFingerprintHeatmap(target);
    if (typeof setSentenceHeatmap === 'function') {
      setSentenceHeatmap((updatedHeatmap.sentences ?? []) as any);
    }
  }, [text, intensity, layers, setFootprintScrubReport, setFootprintRemoval, applyTextMutation, setCleanedText, setSentenceHeatmap]);

  const a = footprintAnalysis;
  const scorePct = a ? Math.round((a.overallScore ?? 0) * 100) : 0;
  const scoreColor = scorePct > 60 ? 'text-danger' : scorePct > 30 ? 'text-warning' : 'text-success';

  // Breakdown metrics calculation with strict crash guarding
  const breakdownStats = useMemo(() => {
    if (!activeReport) return null;
    const tf = Array.isArray(activeReport?.transforms) ? activeReport.transforms : [];
    const codeBlocks = (text.match(/```[\s\S]*?```|`[^`]+`|https?:\/\/\S+/g) ?? []).length;

    return {
      synonymsRotated: tf.filter((tr: any) => tr?.type === 'synonym-rotate' || (tr?.type as string) === 'synonym-swap').length,
      hedgingStripped: tf.filter((tr: any) => tr?.type === 'hedging-remove').length,
      templatesRewritten: tf.filter((tr: any) => tr?.type === 'template-replace').length,
      emDashesNormalized: tf.filter((tr: any) => tr?.type === 'typographic-scrub' && (tr?.originalSpan?.text?.includes('—') || tr?.originalSpan?.text?.includes('--'))).length,
      curlyQuotesNormalized: tf.filter((tr: any) => tr?.type === 'typographic-scrub' && /[“”‘’]/.test(tr?.originalSpan?.text ?? '')).length,
      boldColonsCleaned: tf.filter((tr: any) => tr?.type === 'typographic-scrub' && (tr?.reason ?? '').toLowerCase().includes('lead-in')).length,
      nbspStripped: tf.filter((tr: any) => tr?.type === 'typographic-scrub' && (tr?.reason ?? '').toLowerCase().includes('nbsp')).length,
      protectedSpans: codeBlocks,
    };
  }, [activeReport, text]);

  const beforeScoreVal = activeReport?.beforeScore ?? (activeReport as any)?.breakdown?.beforeScore ?? 0;
  const afterScoreVal = activeReport?.afterScore ?? (activeReport as any)?.breakdown?.afterScore ?? 0;
  const reductionPercentVal = activeReport?.reductionPercent ?? (beforeScoreVal > 0 ? Math.max(0, Math.round(((beforeScoreVal - afterScoreVal) / beforeScoreVal) * 100)) : 0);

  const sentencesList = heatmapData?.sentences ?? [];
  const highCount = heatmapData?.highCount ?? 0;
  const moderateCount = heatmapData?.moderateCount ?? 0;
  const lowCount = heatmapData?.lowCount ?? 0;

  const varianceVal = a?.burstiness?.sentenceLengthVariance ?? 0;
  const ttrVal = a?.vocabulary?.typeTokenRatio ?? 0;
  const buzzwordCount = a?.vocabulary?.llmFavoredCount ?? 0;
  const favoredWords = a?.vocabulary?.llmFavoredWords ?? [];
  const uniformityVal = a?.perplexityProfile?.uniformity ?? 0;
  const meanPerplexityVal = a?.perplexityProfile?.mean ?? 0;
  const sentMeanVal = a?.burstiness?.sentenceLengthMean ?? 0;
  const bigramRatio = a?.repetition?.bigramRepeatRatio ?? 0;
  const trigramRatio = a?.repetition?.trigramRepeatRatio ?? 0;
  const structuralRatio = a?.repetition?.structuralUniformity ?? 0;
  const hapaxVal = a?.vocabulary?.hapaxRatio ?? 0;
  const templateCount = a?.repetition?.templatePhrases?.length ?? 0;
  const hedgingCount = a?.repetition?.hedgingPhrases?.length ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark">
      {/* Top Toolbar */}
      <div className="panel-bar">
        <button
          onClick={handleAnalyze}
          disabled={!text || isAnalyzingFootprint}
          className="btn-primary"
        >
          {isAnalyzingFootprint ? t('fp.analyzing') : t('fp.analyze')}
        </button>

        <button
          onClick={handleScrubAll}
          disabled={!text}
          title={dict.scrubAllTitle}
          className="btn-warn font-semibold"
        >
          {dict.scrubAll}
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[11px] text-ink-muted dark:text-ink-dark-muted mr-1">{dict.intensity}</span>
          {(['light', 'moderate', 'heavy'] as const).map(i => (
            <button
              key={i}
              onClick={() => setIntensity(i)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                intensity === i ? 'bg-accent text-white font-semibold' : 'btn-ghost'
              }`}
            >
              {t(`common.${i}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Layer Toggles Bar */}
      <div className="px-4 py-2 border-b border-border dark:border-border-dark bg-panel/50 dark:bg-panel-dark/50 flex items-center gap-3 flex-wrap text-[11px]">
        <span className="font-semibold text-ink dark:text-ink-dark">{dict.layers}</span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.layer1Lexical}
            onChange={e => setLayers(l => ({ ...l, layer1Lexical: e.target.checked }))}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>{dict.layer1}</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.layer2HedgingTemplates}
            onChange={e => setLayers(l => ({ ...l, layer2HedgingTemplates: e.target.checked }))}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>{dict.layer2}</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.layer3Typographic}
            onChange={e => setLayers(l => ({ ...l, layer3Typographic: e.target.checked }))}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>{dict.layer3}</span>
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={layers.layer4Burstiness}
            onChange={e => setLayers(l => ({ ...l, layer4Burstiness: e.target.checked }))}
            className="w-3.5 h-3.5 accent-accent"
          />
          <span>{dict.layer4}</span>
        </label>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {!a && !activeReport && (
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
              <path d="M32 6C20 6 12 16 12 28c0 14 8 26 20 30 12-4 20-16 20-30 0-12-8-22-20-22z" opacity="0.3" fill="currentColor" />
              <path d="M32 12c-7.7 0-14 6.3-14 14 0 10.5 6 19.5 14 22.5 8-3 14-12 14-22.5 0-7.7-6.3-14-14-14z" />
              <path d="M32 18c-4.4 0-8 3.6-8 8 0 7 3.5 13 8 15 4.5-2 8-8 8-15 0-4.4-3.6-8-8-8z" />
              <path d="M32 24a4 4 0 0 0-4 4c0 3.5 1.8 6.5 4 7.5 2.2-1 4-4 4-7.5a4 4 0 0 0-4-4z" />
              <circle cx="32" cy="28" r="1.5" fill="currentColor" />
            </svg>
            <h3 className="text-sm font-bold text-ink dark:text-ink-dark">{dict.emptyTitle}</h3>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted max-w-sm">{dict.emptyDesc}</p>
          </div>
        )}

        {/* 4-Layer Removal Breakdown (when scrub report is present) */}
        {activeReport && breakdownStats && (
          <div className="p-4 rounded-xl border border-success/40 bg-gradient-to-br from-success-muted/30 via-surface to-success-muted/20 dark:from-success-muted/20 dark:via-surface-dark dark:to-success-muted/10 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-success dark:text-emerald-400 font-bold text-sm">{dict.scrubbedSuccess}</span>
                <span className="badge-neutral font-mono text-[10px]">
                  {(Array.isArray(activeReport.transforms) ? activeReport.transforms.length : 0)} {dict.transformsApplied}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>{dict.before} <b>{(beforeScoreVal * 100).toFixed(0)}%</b></span>
                <span>→</span>
                <span className="text-success dark:text-emerald-400 font-bold">
                  {dict.after} {(afterScoreVal * 100).toFixed(0)}%
                </span>
                <span className="badge badge-success text-[10px] ml-1">
                  -{reductionPercentVal}% {dict.riskReduction}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">{dict.synonymsRotated}</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.synonymsRotated}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">{dict.hedgingStripped}</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.hedgingStripped}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">{dict.templatesRewritten}</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.templatesRewritten}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">{dict.emDashesNormalized}</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.emDashesNormalized}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">{dict.curlyQuotesNormalized}</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.curlyQuotesNormalized}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">{dict.boldColonsCleaned}</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.boldColonsCleaned}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">{dict.nbspStripped}</span>
                <span className="font-bold text-ink dark:text-ink-dark text-sm">{breakdownStats.nbspStripped}</span>
              </div>
              <div className="stat-card">
                <span className="text-ink-muted dark:text-ink-dark-muted text-[10px]">{dict.protectedSpans}</span>
                <span className="font-bold text-success dark:text-emerald-400 text-sm">{breakdownStats.protectedSpans}</span>
              </div>
            </div>
          </div>
        )}

        {/* Per-Sentence Fingerprint Risk Heatmap */}
        {sentencesList.length > 0 && (
          <div className="panel-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink dark:text-ink-dark">
                  {dict.heatmapTitle}
                </span>
                <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted font-mono">
                  ({sentencesList.length} {dict.sentencesCount})
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-danger"></span>
                  <span>{highCount} {dict.high}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-warning"></span>
                  <span>{moderateCount} {dict.medium}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success"></span>
                  <span>{lowCount} {dict.low}</span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface dark:bg-surface-dark border border-border/60 dark:border-border-dark/60 max-h-56 overflow-y-auto space-y-1.5 text-xs leading-relaxed">
              {sentencesList.map((sent, idx) => {
                const bgClass =
                  sent.level === 'high'
                    ? 'bg-danger/15 border border-danger/30 text-ink dark:text-red-200'
                    : sent.level === 'moderate'
                    ? 'bg-warning/15 border border-warning/30 text-ink dark:text-yellow-200'
                    : 'bg-success/10 border border-success/20 text-ink dark:text-emerald-200';

                const triggers = Array.isArray(sent.triggers) ? sent.triggers : [];

                return (
                  <span
                    key={idx}
                    onClick={() => setActiveSentence(sent)}
                    title={triggers.length > 0 ? `${dict.triggers} ${triggers.join(' | ')}` : dict.naturalSentence}
                    className={`inline-block px-1.5 py-0.5 m-0.5 rounded cursor-pointer transition-all hover:ring-1 hover:ring-accent ${bgClass}`}
                  >
                    {sent.text}{' '}
                  </span>
                );
              })}
            </div>

            {/* Hovered / Clicked Sentence Trigger Inspector */}
            {activeSentence && (
              <div className="p-2.5 rounded-lg bg-surface/90 dark:bg-surface-dark/90 border border-accent/40 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-accent">
                  <span>{dict.sentenceDetails} ({activeSentence.level.toUpperCase()} {dict.risk})</span>
                  <button onClick={() => setActiveSentence(null)} className="text-ink-muted hover:text-ink">✕</button>
                </div>
                <p className="text-ink dark:text-ink-dark italic">"{activeSentence.text}"</p>
                <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted">
                  <span className="font-semibold text-ink dark:text-ink-dark">{dict.triggers} </span>
                  {(Array.isArray(activeSentence.triggers) && activeSentence.triggers.length > 0)
                    ? activeSentence.triggers.join(', ')
                    : dict.naturalSentence}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Headline score card */}
        {a && (
          <div className="panel-card p-4">
            <div className="text-xs font-mono uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted mb-1">
              {t('fp.llmScore')}
            </div>
            <div className={`text-5xl font-bold leading-none mb-3 ${scoreColor}`}>{scorePct}%</div>
            <div className="relative h-4 rounded-full overflow-hidden bg-danger/15">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  scorePct > 60 ? 'bg-danger' : scorePct > 30 ? 'bg-warning' : 'bg-success'
                } transition-all duration-500`}
                style={{ width: `${Math.max(scorePct, 4)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-end pr-3 text-[10px] font-semibold text-white/90">
                {scorePct}%
              </span>
            </div>
            <div className="mt-2 text-[10px] text-ink-faint dark:text-ink-dark-faint">
              {t('fp.confidence')} {((a.confidence ?? 0.8) * 100).toFixed(0)}% · {(a.durationMs ?? 0).toFixed(1)}ms · {t('fp.higherMore')}
            </div>
          </div>
        )}

        {/* Simplified Plain-English High-Level Metrics */}
        {a && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="stat-card">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                {dict.varietyTitle}
              </div>
              <div className="stat-value text-lg font-bold text-ink dark:text-ink-dark">
                {varianceVal > 50 ? dict.naturalVariety : dict.uniformVariety}
              </div>
              <p className="text-[10px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
                {dict.varianceLabel} {varianceVal.toFixed(1)}
              </p>
            </div>

            <div className="stat-card">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                {dict.diversityTitle}
              </div>
              <div className="stat-value text-lg font-bold text-ink dark:text-ink-dark">
                {(ttrVal * 100).toFixed(0)}%
              </div>
              <p className="text-[10px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
                {dict.ttrLabel} ({ttrVal.toFixed(2)})
              </p>
            </div>

            <div className="stat-card">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                {dict.buzzwordDensity}
              </div>
              <div className="stat-value text-lg font-bold text-danger">
                {buzzwordCount} {dict.wordsCount}
              </div>
              <p className="text-[10px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
                {favoredWords.slice(0, 3).join(', ') || dict.noneDetected}
              </p>
            </div>
          </div>
        )}

        {/* Expandable Technical Metrics Drawer */}
        {a && (
          <details className="panel-card px-4 py-3">
            <summary className="text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted cursor-pointer hover:text-ink transition-colors">
              {dict.showTechMetrics}
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-3 text-[11px]">
              <div>
                <span className="text-ink-muted block text-[10px]">{dict.perplexityUniformity}</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{(uniformityVal * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">{dict.perplexityMean}</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{meanPerplexityVal.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">{dict.sentenceLengthMean}</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{sentMeanVal.toFixed(1)} {dict.wordsCount}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">{dict.bigramRepeatRatio}</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{(bigramRatio * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">{dict.trigramRepeatRatio}</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{(trigramRatio * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">{dict.structuralUniformity}</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{(structuralRatio * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">{dict.hapaxRatio}</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{hapaxVal.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">{dict.templatePhrasesCount}</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{templateCount}</span>
              </div>
              <div>
                <span className="text-ink-muted block text-[10px]">{dict.hedgingPhrasesCount}</span>
                <span className="font-semibold text-ink dark:text-ink-dark">{hedgingCount}</span>
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
