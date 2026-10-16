import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { detectWatermark, sweepDetection } from '../core/watermark';
import { neutralize } from '../core/watermark/neutralize';
import { humanize, deparaphrase } from '../core/rewrite';
import { rewriteWithLLM, REWRITE_PROMPTS } from '../core/llm/client';
import { rewriteLocal } from '../core/llm/local';
import type { LocalProgress } from '../core/llm/local';
import type { NeutralizationOptions } from '../core/watermark/types';
import type { RewriteMode } from '../core/rewrite/types';
import { poisonBoundaries, depoison } from '../core/poison/tokenBoundary';
import { pollute } from '../core/spoof/pollution';
import { neutralizeWindowAware } from '../core/watermark/windowAware';

const I18N = {
  en: {
    verdictDetected: 'Statistical Token Watermark Detected',
    verdictClean: 'No Hidden Watermark Detected',
    verdictDetectedDesc: (z: string, gamma: number) => `The text exhibits a statistically improbable token green-list concentration (z = ${z}, γ = ${gamma}), indicating synthetic LLM watermarking.`,
    verdictCleanDesc: (z: string) => `Token distributions match natural human writing variation (z = ${z}), with no statistically significant watermark pattern.`,
    showTechDetails: 'Show Technical Statistical Details (γ, z-score, p-value)',
    zScore: 'Statistical z-Score',
    pValue: 'p-Value',
    greenListRatio: 'Green-List Ratio',
    tokensEvaluated: 'Tokens Evaluated',
    greenListHits: 'Green-List Hits',
    detectionDuration: 'Detection Duration',
    dzKiller: 'Δz Killer',
    dzKillerTitle: 'Window-aware watermark killer (Δz targeted suppression)',
    poison: 'Poison',
    poisonTitle: 'Word-joiner token boundary poisoning',
    depoisonTitle: 'Strip poisoning artifacts (inverse)',
    pollute: 'Pollute',
    polluteTitle: 'Forge 2 alternative watermarks so sweeps report conflicting evidence',
    sweepTitle: 'Sweep 216 key/window/gamma combinations to detect watermarks when the exact key is unknown',
    neutralizeTitle: 'Neutralize watermark tokens',
    engineOfflineNote: 'Offline uses deterministic local transforms; Online uses your configured LLM.',
    optHumanize: 'Humanize',
    optDeparaphrase: 'Deparaphrase',
    optNeutralize: 'Neutralize',
    stratSynonym: 'synonym',
    stratReorder: 'reorder',
    stratHomoglyph: 'homoglyph',
    stratWhitespace: 'whitespace',
    moreTokens: 'more',
    footprintBefore: 'Footprint Before',
    footprintAfter: 'Footprint After',
    editsCount: 'Edits',
    watermarkPollution: 'Watermark Pollution',
    configsForged: 'Configs forged',
    substitutions: 'Substitutions',
    significantHitsAfter: 'Significant hits after',
    tokenBoundaryPoisoning: 'Token-Boundary Poisoning',
    injectionsCount: 'Injections',
    modeLabel: 'Mode',
    coverageLabel: 'Coverage',
    emptyTitle: 'Statistical Token Watermark Engine',
    emptyDesc: 'Run Detect or Sweep to test for statistical token watermarks, green-list bias, or apply targeted suppression.',
  },
  es: {
    verdictDetected: 'Marca de agua estadística de tokens detectada',
    verdictClean: 'No se detectó marca de agua oculta',
    verdictDetectedDesc: (z: string, gamma: number) => `El texto muestra una concentración estadísticamente improbable de tokens en lista verde (z = ${z}, γ = ${gamma}), indicando marca de agua de LLM sintético.`,
    verdictCleanDesc: (z: string) => `La distribución de tokens coincide con la variación natural de la escritura humana (z = ${z}), sin patrón estadísticamente significativo.`,
    showTechDetails: 'Mostrar detalles estadísticos técnicos (γ, z-score, valor p)',
    zScore: 'Puntuación z estadística',
    pValue: 'Valor p',
    greenListRatio: 'Proporción de lista verde',
    tokensEvaluated: 'Tokens evaluados',
    greenListHits: 'Aciertos en lista verde',
    detectionDuration: 'Duración de detección',
    dzKiller: 'Supresor Δz',
    dzKillerTitle: 'Supresor de marcas de agua sensible a ventanas (supresión marginal Δz)',
    poison: 'Envenenar',
    poisonTitle: 'Envenenamiento de límites de tokens con uniones de palabras',
    depoisonTitle: 'Eliminar artefactos de envenenamiento (inverso)',
    pollute: 'Contaminar',
    polluteTitle: 'Forjar 2 marcas de agua alternativas para generar señales contradictorias',
    sweepTitle: 'Barrer 216 combinaciones de clave/ventana/gamma cuando la clave es desconocida',
    neutralizeTitle: 'Neutralizar tokens de marcas de agua',
    engineOfflineNote: 'El modo sin conexión usa transformaciones locales; en línea usa su LLM.',
    optHumanize: 'Humanizar',
    optDeparaphrase: 'Desparafrasear',
    optNeutralize: 'Neutralizar',
    stratSynonym: 'sinónimo',
    stratReorder: 'reordenar',
    stratHomoglyph: 'homóglifo',
    stratWhitespace: 'espacio en blanco',
    moreTokens: 'más',
    footprintBefore: 'Huella antes',
    footprintAfter: 'Huella después',
    editsCount: 'Ediciones',
    watermarkPollution: 'Contaminación de marca de agua',
    configsForged: 'Configuraciones forjadas',
    substitutions: 'Sustituciones',
    significantHitsAfter: 'Aciertos significativos después',
    tokenBoundaryPoisoning: 'Envenenamiento de límites de tokens',
    injectionsCount: 'Inyecciones',
    modeLabel: 'Modo',
    coverageLabel: 'Cobertura',
    emptyTitle: 'Motor estadístico de marcas de agua',
    emptyDesc: 'Ejecute Detectar o Barrer para probar marcas de agua estadísticas o aplicar supresión dirigida.',
  },
  fr: {
    verdictDetected: 'Filigrane statistique de jetons détecté',
    verdictClean: 'Aucun filigrane masqué détecté',
    verdictDetectedDesc: (z: string, gamma: number) => `Le texte présente une concentration statistiquement improbable de jetons en liste verte (z = ${z}, γ = ${gamma}), indiquant un filigrane de LLM synthétique.`,
    verdictCleanDesc: (z: string) => `La distribution des jetons correspond aux variations de l'écriture humaine naturelle (z = ${z}), sans motif statistiquement significatif.`,
    showTechDetails: 'Afficher les détails statistiques techniques (γ, z-score, valeur p)',
    zScore: 'Score z statistique',
    pValue: 'Valeur p',
    greenListRatio: 'Ratio de liste verte',
    tokensEvaluated: 'Jetons évalués',
    greenListHits: 'Occurrences en liste verte',
    detectionDuration: 'Durée de détection',
    dzKiller: 'Tueur Δz',
    dzKillerTitle: 'Suppresseur de filigrane sensible aux fenêtres (suppression ciblée Δz)',
    poison: 'Empoisonner',
    poisonTitle: 'Empoisonnement des limites de jetons par liaisons de mots',
    depoisonTitle: 'Supprimer les artefacts d\'empoisonnement (inverse)',
    pollute: 'Polluer',
    polluteTitle: 'Forger 2 filigranes alternatifs pour créer des preuves conflictuelles',
    sweepTitle: 'Balayer 216 combinaisons clé/fenêtre/gamma pour détecter les filigranes',
    neutralizeTitle: 'Neutraliser les jetons de filigrane',
    engineOfflineNote: 'Le mode hors ligne utilise des règles locales ; en ligne utilise votre LLM.',
    optHumanize: 'Humaniser',
    optDeparaphrase: 'Déparaphraser',
    optNeutralize: 'Neutraliser',
    stratSynonym: 'synonyme',
    stratReorder: 'réordonner',
    stratHomoglyph: 'homoglyphe',
    stratWhitespace: 'espace',
    moreTokens: 'de plus',
    footprintBefore: 'Empreinte avant',
    footprintAfter: 'Empreinte après',
    editsCount: 'Modifications',
    watermarkPollution: 'Pollution de filigrane',
    configsForged: 'Configs forgées',
    substitutions: 'Substitutions',
    significantHitsAfter: 'Résultats significatifs après',
    tokenBoundaryPoisoning: 'Empoisonnement de limites de jetons',
    injectionsCount: 'Injections',
    modeLabel: 'Mode',
    coverageLabel: 'Couverture',
    emptyTitle: 'Moteur de filigrane statistique',
    emptyDesc: 'Lancez Détecter ou Balayer pour tester les filigranes de jetons ou appliquer une suppression ciblée.',
  },
  'pt-BR': {
    verdictDetected: 'Marca d\'água estatística de tokens detectada',
    verdictClean: 'Nenhuma marca d\'água oculta detectada',
    verdictDetectedDesc: (z: string, gamma: number) => `O texto apresenta concentração estatisticamente improvável de tokens na lista verde (z = ${z}, γ = ${gamma}), indicando marca d'água sintética de LLM.`,
    verdictCleanDesc: (z: string) => `A distribuição de tokens corresponde à variação natural da escrita humana (z = ${z}), sem padrão estatisticamente significativo.`,
    showTechDetails: 'Exibir detalhes estatísticos técnicos (γ, escore z, valor p)',
    zScore: 'Escore z estatístico',
    pValue: 'Valor p',
    greenListRatio: 'Razão de lista verde',
    tokensEvaluated: 'Tokens avaliados',
    greenListHits: 'Acertos na lista verde',
    detectionDuration: 'Duração da detecção',
    dzKiller: 'Matador Δz',
    dzKillerTitle: 'Supressor de marca d\'água ciente de janela (supressão direcionada Δz)',
    poison: 'Envenenar',
    poisonTitle: 'Envenenamento de limites de tokens com união de palavras',
    depoisonTitle: 'Remover artefatos de envenenamento (inverso)',
    pollute: 'Poluir',
    polluteTitle: 'Forjar 2 marcas d\'água alternativas para gerar evidências conflitantes',
    sweepTitle: 'Varrer 216 combinações de chave/janela/gamma para detectar marcas d\'água',
    neutralizeTitle: 'Neutralizar tokens de marca d\'água',
    engineOfflineNote: 'Offline usa transformações locais; Online usa seu LLM configurado.',
    optHumanize: 'Humanizar',
    optDeparaphrase: 'Desparafrasear',
    optNeutralize: 'Neutralizar',
    stratSynonym: 'sinônimo',
    stratReorder: 'reordenar',
    stratHomoglyph: 'homóglifo',
    stratWhitespace: 'espaço em branco',
    moreTokens: 'a mais',
    footprintBefore: 'Pegada antes',
    footprintAfter: 'Pegada depois',
    editsCount: 'Edições',
    watermarkPollution: 'Poluição de marca d\'água',
    configsForged: 'Configurações forjadas',
    substitutions: 'Substituições',
    significantHitsAfter: 'Acertos significativos depois',
    tokenBoundaryPoisoning: 'Envenenamento de limites de tokens',
    injectionsCount: 'Injeções',
    modeLabel: 'Modo',
    coverageLabel: 'Cobertura',
    emptyTitle: 'Mecanismo de marcas d\'água estatísticas',
    emptyDesc: 'Execute Detectar ou Varrer para testar marcas d\'água estatísticas ou aplicar supressão direcionada.',
  },
  it: {
    verdictDetected: 'Watermark statistico di token rilevato',
    verdictClean: 'Nessun watermark nascosto rilevato',
    verdictDetectedDesc: (z: string, gamma: number) => `Il testo presenta una concentrazione statisticamente improbabile di token in lista verde (z = ${z}, γ = ${gamma}), indicando watermark sintetico di LLM.`,
    verdictCleanDesc: (z: string) => `La distribuzione dei token corrisponde alla variazione naturale della scrittura umana (z = ${z}), senza pattern statisticamente significativo.`,
    showTechDetails: 'Mostra dettagli statistici tecnici (γ, punteggio z, valore p)',
    zScore: 'Punteggio z statistico',
    pValue: 'Valore p',
    greenListRatio: 'Rapporto lista verde',
    tokensEvaluated: 'Token valutati',
    greenListHits: 'Corrispondenze lista verde',
    detectionDuration: 'Durata rilevamento',
    dzKiller: 'Killer Δz',
    dzKillerTitle: 'Soppressore di watermark basato su finestre (soppressione mirata Δz)',
    poison: 'Avvelena',
    poisonTitle: 'Avvelenamento dei confini dei token con unione di parole',
    depoisonTitle: 'Rimuovi artefatti di avvelenamento (inverso)',
    pollute: 'Inquina',
    polluteTitle: 'Falsifica 2 watermark alternativi per creare prove contrastanti',
    sweepTitle: 'Scansiona 216 combinazioni chiave/finestra/gamma per rilevare watermark',
    neutralizeTitle: 'Neutralizza token del watermark',
    engineOfflineNote: 'Offline usa trasformazioni locali; Online usa il tuo LLM configurato.',
    optHumanize: 'Umanizza',
    optDeparaphrase: 'Deparafrasa',
    optNeutralize: 'Neutralizza',
    stratSynonym: 'sinonimo',
    stratReorder: 'riordina',
    stratHomoglyph: 'omoglifo',
    stratWhitespace: 'spazio',
    moreTokens: 'altri',
    footprintBefore: 'Impronta prima',
    footprintAfter: 'Impronta dopo',
    editsCount: 'Modifiche',
    watermarkPollution: 'Inquinamento watermark',
    configsForged: 'Configurazioni falsificate',
    substitutions: 'Sostituzioni',
    significantHitsAfter: 'Risultati significativi dopo',
    tokenBoundaryPoisoning: 'Avvelenamento dei confini dei token',
    injectionsCount: 'Iniezioni',
    modeLabel: 'Modalità',
    coverageLabel: 'Copertura',
    emptyTitle: 'Motore di watermark statistici',
    emptyDesc: 'Esegui Rileva o Scansiona per verificare watermark statistici o applicare soppressione mirata.',
  },
};

export default function WatermarkPanel() {
  const {
    originalText, cleanedText, appMode, uiLanguage,
    watermarkResult, watermarkSweep, neutralizationResult, rewriteResult,
    isDetectingWatermark, llmConfig, isLLMProcessing,
    pollutionResult, poisonResult,
    setWatermarkResult, setWatermarkSweep, setNeutralizationResult, setRewriteResult,
    setIsDetectingWatermark, setCleanedText, setIsLLMProcessing,
    setPollutionResult, setPoisonResult,
  } = useStore();

  const applyTextMutation = useStore((s: any) => s.applyTextMutation);

  const t = useT();
  const dict = I18N[(uiLanguage as keyof typeof I18N) ?? 'en'] ?? I18N.en;

  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'heavy'>('moderate');
  const [strategies, setStrategies] = useState({
    synonym: true, reorder: true, homoglyph: false, whitespace: true,
  });
  const [rewriteMode, setRewriteMode] = useState<RewriteMode>('humanize');
  const [localProgress, setLocalProgress] = useState<LocalProgress | null>(null);

  const text = cleanedText ?? originalText;
  const isOnDevice = appMode === 'online' && llmConfig.provider === 'local';
  const engineLabel = appMode === 'online' ? (isOnDevice ? 'on-device AI' : 'LLM') : 'local';

  const handleDetect = useCallback(() => {
    if (!text) return;
    setIsDetectingWatermark(true);
    setTimeout(() => {
      const result = detectWatermark(text);
      setWatermarkResult(result);
      setIsDetectingWatermark(false);
    });
  }, [text, setWatermarkResult, setIsDetectingWatermark]);

  const handleSweep = useCallback(() => {
    if (!text) return;
    setIsDetectingWatermark(true);
    setTimeout(() => {
      const sweep = sweepDetection(text);
      setWatermarkSweep(sweep);
      setWatermarkResult(sweep.bestResult);
      setIsDetectingWatermark(false);
    });
  }, [text, setWatermarkSweep, setWatermarkResult, setIsDetectingWatermark]);

  const handleNeutralize = useCallback(() => {
    if (!text) return;
    const enabledStrategies = new Set(
      (Object.entries(strategies) as Array<[keyof typeof strategies, boolean]>)
        .filter(([, v]) => v)
        .map(([k]) => k)
    ) as NeutralizationOptions['strategies'];

    const result = neutralize(text, { strategies: enabledStrategies, intensity });
    setNeutralizationResult(result);
    const target = result.neutralized;

    if (typeof applyTextMutation === 'function') {
      applyTextMutation(target, 'watermark-neutralize', 'Neutralize Watermark');
    }
    setCleanedText(target);
  }, [text, strategies, intensity, setNeutralizationResult, setCleanedText, applyTextMutation]);

  // v2: window-aware targeted neutralization (exact marginal Δz ranking)
  const handleWindowAware = useCallback(() => {
    if (!text) return;
    // Sweep once to lock onto the strongest config, then surgically kill it.
    const sweep = sweepDetection(text);
    const best = sweep.bestResult;
    const res = neutralizeWindowAware(
      text,
      best.gamma,
      best.hashKey,
      best.windowSize,
      1.5,
      Math.max(10, Math.floor(text.length / 40)),
    );
    const target = res.text;

    if (typeof applyTextMutation === 'function') {
      applyTextMutation(target, 'watermark-neutralize', 'Neutralize Watermark (Window-Aware)');
    }
    setCleanedText(target);

    setNeutralizationResult({
      original: text,
      neutralized: target,
      suggestions: [],
      appliedCount: res.applied,
      beforeZScore: res.beforeZ,
      afterZScore: res.afterZ,
      iterationCount: 1,
      durationMs: 0,
    });
  }, [text, setCleanedText, setNeutralizationResult, applyTextMutation]);

  // v2: token-boundary poisoning
  const handlePoison = useCallback((mode: 'word-joiner' | 'nfd' | 'aggressive') => {
    if (!text) return;
    const result = poisonBoundaries(text, mode, intensity === 'light' ? 'light' : intensity === 'moderate' ? 'moderate' : 'heavy');
    setPoisonResult(result);
    setCleanedText(result.poisoned);
  }, [text, intensity, setPoisonResult, setCleanedText]);

  const handleDepoison = useCallback(() => {
    if (!text) return;
    setCleanedText(depoison(text));
  }, [text, setCleanedText]);

  // v2: watermark pollution — forge conflicting signals
  const handlePollute = useCallback(() => {
    if (!text) return;
    const result = pollute(text, { configs: 2, targetZ: 3.0 });
    setPollutionResult(result);
    setCleanedText(result.polluted);
  }, [text, setPollutionResult, setCleanedText]);

  // Unified rewrite entry point — works offline (rule-based) and online (LLM).
  const handleRewrite = useCallback(async () => {
    if (!text) return;

    if (appMode === 'online') {
      const onDevice = llmConfig.provider === 'local';
      setIsLLMProcessing(true);
      setLocalProgress(null);
      try {
        const result = onDevice
          ? await rewriteLocal(text, rewriteMode, llmConfig.model, setLocalProgress)
          : await rewriteWithLLM(text, REWRITE_PROMPTS[rewriteMode], llmConfig);
        if (!result.text) {
          throw new Error(onDevice
            ? 'The on-device model returned nothing. Try the "Better (248M)" model, or a shorter passage.'
            : 'The model returned an empty response.');
        }
        setCleanedText(result.text);
        setRewriteResult({
          mode: rewriteMode, engine: onDevice ? 'device' : 'llm', original: text, rewritten: result.text,
          edits: [], beforeScore: 0, afterScore: 0, durationMs: result.durationMs,
        });
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Rewrite failed');
      } finally {
        setIsLLMProcessing(false);
        setLocalProgress(null);
      }
      return;
    }

    // Offline mode: deterministic rule-based rewrites
    const result = rewriteMode === 'humanize' ? humanize(text) : deparaphrase(text);
    setCleanedText(result.rewritten);
    setRewriteResult({ ...result, engine: 'local' });
  }, [text, appMode, llmConfig, rewriteMode, setIsLLMProcessing, setCleanedText, setRewriteResult]);

  const tokensList = Array.isArray(watermarkResult?.tokens) ? watermarkResult.tokens : [];
  const editsList = Array.isArray(rewriteResult?.edits) ? rewriteResult.edits : [];
  const suggestionsList = Array.isArray(neutralizationResult?.suggestions) ? neutralizationResult.suggestions : [];
  const forgedConfigsList = Array.isArray(pollutionResult?.forgedConfigs) ? pollutionResult.forgedConfigs : [];

  const stratLabelMap: Record<string, string> = {
    synonym: dict.stratSynonym,
    reorder: dict.stratReorder,
    homoglyph: dict.stratHomoglyph,
    whitespace: dict.stratWhitespace,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark">
      {/* Top Toolbar */}
      <div className="panel-bar">
        <button onClick={handleDetect} disabled={!text || isDetectingWatermark}
          className="btn-primary">
          {isDetectingWatermark ? t('wm.detecting') : t('wm.detect')}
        </button>
        <button onClick={handleSweep} disabled={!text || isDetectingWatermark}
          className="btn-ghost" title={dict.sweepTitle}>
          {t('wm.sweep')}
        </button>
        <button onClick={handleNeutralize} disabled={!text}
          className="btn-warn" title={dict.neutralizeTitle}>
          {t('wm.neutralize')}
        </button>
        <button onClick={handleWindowAware} disabled={!text}
          className="btn-ghost" title={dict.dzKillerTitle}>
          {dict.dzKiller}
        </button>

        <div className="h-4 w-px bg-border dark:bg-border-dark mx-1" />
        <button onClick={() => handlePoison('word-joiner')} disabled={!text} title={dict.poisonTitle}
          className="btn-ghost">
          {dict.poison}
        </button>
        <button onClick={handleDepoison} disabled={!text} title={dict.depoisonTitle}
          className="px-2 py-1.5 text-xs bg-panel dark:bg-panel-dark rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40">
          ↺
        </button>
        <button onClick={handlePollute} disabled={!text} title={dict.polluteTitle}
          className="btn-ghost text-danger">
          {dict.pollute}
        </button>

        <div className="h-4 w-px bg-border dark:bg-border-dark mx-1" />
        <select value={rewriteMode} onChange={e => setRewriteMode(e.target.value as RewriteMode)}
          className="text-xs bg-panel dark:bg-panel-dark rounded px-2 py-1 border border-border/80 dark:border-border-dark/80">
          <option value="humanize">{dict.optHumanize}</option>
          <option value="deparaphrase">{dict.optDeparaphrase}</option>
          <option value="neutralize">{dict.optNeutralize}</option>
        </select>
        <button onClick={handleRewrite} disabled={!text || isLLMProcessing}
          className="btn-ghost text-success">
          {isLLMProcessing ? t('wm.rewriting') : t('wm.rewrite')}
        </button>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-panel dark:bg-panel-dark text-ink-muted dark:text-ink-dark-muted ml-auto" title={dict.engineOfflineNote}>
          {t('wm.engine')}: {engineLabel}
        </span>
      </div>

      {/* Strategies and Intensity */}
      <div className="px-4 py-2 border-b border-border dark:border-border-dark flex items-center gap-3 text-xs flex-wrap bg-panel/40 dark:bg-panel-dark/40">
        <span className="text-ink-muted dark:text-ink-dark-muted">{t('wm.intensity')}</span>
        {(['light', 'moderate', 'heavy'] as const).map(i => (
          <button key={i} onClick={() => setIntensity(i)}
            className={`px-2 py-0.5 rounded transition-colors ${intensity === i ? 'bg-accent text-white font-semibold' : 'btn-ghost'}`}>
            {t(`common.${i}`)}
          </button>
        ))}
        <div className="h-3 w-px bg-border dark:bg-border-dark mx-1" />
        <span className="text-ink-muted dark:text-ink-dark-muted" title="Strategies apply to the statistical Neutralize path.">{t('wm.strategies')}</span>
        {(Object.entries(strategies) as Array<[string, boolean]>).map(([key, val]) => (
          <label key={key} className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={val}
              onChange={() => setStrategies(s => ({ ...s, [key]: !val }))}
              className="w-3.5 h-3.5 accent-accent" />
            <span className="text-[11px]">{stratLabelMap[key] ?? key}</span>
          </label>
        ))}
      </div>

      {/* On-device model progress (first run downloads the model) */}
      {localProgress && (
        <div className="px-4 py-2 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark">
          <div className="flex items-center justify-between text-[11px] text-ink-muted dark:text-ink-dark-muted mb-1">
            <span>{localProgress.message}</span>
            {localProgress.status === 'downloading' && <span>{localProgress.percent}%</span>}
          </div>
          <div className="w-full h-1 bg-surface dark:bg-surface-dark rounded-full overflow-hidden border border-border dark:border-border-dark">
            <div className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${localProgress.status === 'downloading' ? localProgress.percent : 100}%` }} />
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {watermarkResult && (
          <div className="space-y-3">
            {/* Plain-English Verdict Banner */}
            <div className={`p-4 rounded-xl border-2 flex items-start gap-3 shadow-sm ${
              watermarkResult.isSignificant
                ? 'border-danger bg-danger/10 dark:bg-danger/20 text-danger dark:text-red-300'
                : 'border-success bg-success/10 dark:bg-success/20 text-success dark:text-emerald-300'
            }`}>
              <span className="text-2xl shrink-0 mt-0.5">
                {watermarkResult.isSignificant ? '⚠' : '✓'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold">
                  {watermarkResult.isSignificant
                    ? dict.verdictDetected
                    : dict.verdictClean}
                </div>
                <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-0.5 leading-relaxed">
                  {watermarkResult.isSignificant
                    ? dict.verdictDetectedDesc((watermarkResult.zScore ?? 0).toFixed(2), watermarkResult.gamma ?? 0.25)
                    : dict.verdictCleanDesc((watermarkResult.zScore ?? 0).toFixed(2))}
                </p>
              </div>
            </div>

            {/* Progressive Disclosure: Technical Statistical Details */}
            <details className="panel-card p-3 space-y-3">
              <summary className="text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted cursor-pointer hover:text-ink transition-colors">
                {dict.showTechDetails}
              </summary>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <Stat label={dict.zScore} value={(watermarkResult.zScore ?? 0).toFixed(3)}
                  color={watermarkResult.isSignificant ? 'text-danger' : 'text-success'} />
                <Stat label={dict.pValue} value={(watermarkResult.pValue ?? 1) < 0.00001 ? '< 0.00001' : (watermarkResult.pValue ?? 1).toFixed(5)} />
                <Stat label={dict.greenListRatio} value={`${((watermarkResult.greenListRatio ?? 0) * 100).toFixed(1)}%`} />
                <Stat label={dict.tokensEvaluated} value={String(watermarkResult.totalTokens ?? 0)} />
                <Stat label={dict.greenListHits} value={String(watermarkResult.greenListHits ?? 0)} />
                <Stat label={dict.detectionDuration} value={`${(watermarkResult.durationMs ?? 0).toFixed(1)}ms`} />
              </div>
            </details>

            {/* Token Distribution Visualizer */}
            <div className="panel-card p-3.5">
              <h4 className="text-xs font-semibold mb-2 text-ink dark:text-ink-dark">{t('wm.tokenDist')}</h4>
              <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
                {tokensList.slice(0, 200).map((tok, i) => (
                  <span
                    key={i}
                    className={`inline-block px-1.5 py-0.5 text-[11px] font-mono rounded ${
                      tok.isGreenList
                        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-300/40'
                        : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-300/40'
                    }`}
                    title={`${tok.token} (score: ${(tok.score ?? 0).toFixed(3)}, ${tok.isGreenList ? 'green' : 'red'})`}
                  >
                    {tok.token}
                  </span>
                ))}
                {tokensList.length > 200 && (
                  <span className="text-xs text-ink-muted dark:text-ink-dark-muted self-center ml-1">
                    +{tokensList.length - 200} {dict.moreTokens}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {watermarkSweep && !watermarkResult && (
          <div className="text-sm text-ink-muted dark:text-ink-dark-muted p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark">
            {watermarkSweep.summary}
          </div>
        )}

        {rewriteResult && (
          <div className="panel-card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-ink dark:text-ink-dark">
              {t('wm.rewriteResults')}{' '}
              <span className="text-ink-muted dark:text-ink-dark-muted font-normal">
                ({rewriteResult.mode} · {
                  rewriteResult.engine === 'local' ? 'local rules'
                    : rewriteResult.engine === 'device' ? 'on-device AI'
                    : 'LLM'
                })
              </span>
            </h3>
            {rewriteResult.engine === 'local' && (
              <div className="grid grid-cols-3 gap-2.5 mb-2">
                <Stat label={dict.footprintBefore} value={`${((rewriteResult.beforeScore ?? 0) * 100).toFixed(0)}%`} />
                <Stat label={dict.footprintAfter} value={`${((rewriteResult.afterScore ?? 0) * 100).toFixed(0)}%`}
                  color={(rewriteResult.afterScore ?? 0) < (rewriteResult.beforeScore ?? 0) ? 'text-success' : 'text-danger'} />
                <Stat label={dict.editsCount} value={String(editsList.length)} />
              </div>
            )}
            <div className="space-y-1">
              {editsList.slice(0, 30).map((e, i) => (
                <div key={i} className="text-xs px-2.5 py-1 rounded bg-surface dark:bg-surface-dark flex gap-2">
                  <span className="text-ink-muted shrink-0">{e.type}</span>
                  {e.original && <span className="font-mono line-through text-red-400 truncate">{e.original.slice(0, 40)}</span>}
                  {e.replacement && <span className="text-success font-mono truncate">{e.replacement.slice(0, 40)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {neutralizationResult && (
          <div className="panel-card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-ink dark:text-ink-dark">{t('wm.neutralizeResults')}</h3>
            <div className="grid grid-cols-3 gap-2.5 mb-2">
              <Stat label={t('wm.beforeZ')} value={(neutralizationResult.beforeZScore ?? 0).toFixed(3)} />
              <Stat label={t('wm.afterZ')} value={(neutralizationResult.afterZScore ?? 0).toFixed(3)}
                color={(neutralizationResult.afterZScore ?? 0) < (neutralizationResult.beforeZScore ?? 0) ? 'text-success' : 'text-danger'} />
              <Stat label={t('wm.changes')} value={String(neutralizationResult.appliedCount ?? 0)} />
            </div>
            <div className="space-y-1">
              {suggestionsList.slice(0, 20).map((s, i) => (
                <div key={i} className="text-xs px-2.5 py-1 rounded bg-surface dark:bg-surface-dark flex gap-2">
                  <span className="text-ink-muted">{s.strategy}</span>
                  <span className="font-mono line-through text-red-400">{s.originalToken}</span>
                  <span className="text-success font-mono">{s.alternatives?.[0]?.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pollutionResult && (
          <div className="panel-card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-ink dark:text-ink-dark">{dict.watermarkPollution}</h3>
            <div className="grid grid-cols-3 gap-2.5 mb-2">
              <Stat label={dict.configsForged} value={String(forgedConfigsList.length)} />
              <Stat label={dict.substitutions} value={String(pollutionResult.substitutions ?? 0)} />
              <Stat label={dict.significantHitsAfter} value={String(pollutionResult.significantHitsAfter ?? 0)}
                color={(pollutionResult.significantHitsAfter ?? 0) > 1 ? 'text-success' : ''} />
            </div>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{pollutionResult.summary}</p>
          </div>
        )}

        {poisonResult && (
          <div className="panel-card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-ink dark:text-ink-dark">{dict.tokenBoundaryPoisoning}</h3>
            <div className="grid grid-cols-3 gap-2.5">
              <Stat label={dict.injectionsCount} value={String(poisonResult.injections ?? 0)} />
              <Stat label={dict.modeLabel} value={poisonResult.mode} />
              <Stat label={dict.coverageLabel} value={`${poisonResult.wordsCovered ?? 0}/${poisonResult.totalWords ?? 0}`} />
            </div>
          </div>
        )}

        {!watermarkResult && !watermarkSweep && !neutralizationResult && !pollutionResult && !poisonResult && (
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
              <circle cx="32" cy="32" r="26" opacity="0.25" fill="currentColor" />
              <circle cx="32" cy="32" r="26" />
              <path d="M12 36c6-12 12-16 20-8s14 4 20-8" />
              <path d="M12 28c8 4 14 6 20-2s12-4 20 8" opacity="0.5" strokeDasharray="2 3" />
              <circle cx="24" cy="32" r="2.5" fill="currentColor" />
              <circle cx="32" cy="28" r="2.5" fill="currentColor" />
              <circle cx="40" cy="36" r="2.5" fill="currentColor" />
            </svg>
            <h3 className="text-sm font-bold text-ink dark:text-ink-dark">{dict.emptyTitle}</h3>
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted max-w-sm">{dict.emptyDesc}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface dark:bg-surface-dark border border-border/60 dark:border-border-dark/60 rounded-xl px-3 py-2 shadow-sm">
      <div className="text-[10px] text-ink-muted dark:text-ink-dark-muted uppercase font-semibold">{label}</div>
      <div className={`text-base font-mono font-bold ${color ?? 'text-ink dark:text-ink-dark'}`}>{value}</div>
    </div>
  );
}
