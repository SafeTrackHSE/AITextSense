import { useCallback, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { analyzeFootprint } from '../core/footprint/analysis';
import { removeFootprint } from '../core/footprint/removal';

export default function FootprintPanel() {
  const {
    originalText, cleanedText,
    footprintAnalysis, footprintRemoval, isAnalyzingFootprint,
    setFootprintAnalysis, setFootprintRemoval, setIsAnalyzingFootprint, setCleanedText,
  } = useStore();

  const t = useT();
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'heavy'>('moderate');
  const text = cleanedText ?? originalText;

  const handleAnalyze = useCallback(() => {
    if (!text) return;
    setIsAnalyzingFootprint(true);
    setTimeout(() => {
      const result = analyzeFootprint(text);
      setFootprintAnalysis(result);
      setIsAnalyzingFootprint(false);
    });
  }, [text, setFootprintAnalysis, setIsAnalyzingFootprint]);

  const handleRemove = useCallback(() => {
    if (!text) return;
    const result = removeFootprint(text, intensity);
    setFootprintRemoval(result);
    setCleanedText(result.modified);
  }, [text, intensity, setFootprintRemoval, setCleanedText]);

  const a = footprintAnalysis;
  const scorePct = a ? Math.round(a.overallScore * 100) : 0;
  const scoreColor = scorePct > 60 ? 'text-danger' : scorePct > 30 ? 'text-warning' : 'text-success';
  const sparkData = a ? (a.burstiness.ttrWindowed.length > 1 ? a.burstiness.ttrWindowed : a.perplexityProfile.windowScores) : [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border dark:border-border-dark">
        <button onClick={handleAnalyze} disabled={!text || isAnalyzingFootprint}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-40 transition-colors">
          {isAnalyzingFootprint ? t('fp.analyzing') : t('fp.analyze')}
        </button>
        <div className="flex gap-1">
          {(['light', 'moderate', 'heavy'] as const).map(i => (
            <button key={i} onClick={() => setIntensity(i)}
              className={`px-2 py-1 text-xs rounded ${intensity === i ? 'bg-accent text-white' : 'bg-panel dark:bg-panel-dark'}`}>
              {t(`common.${i}`)}
            </button>
          ))}
        </div>
        <button onClick={handleRemove} disabled={!text}
          className="px-3 py-1.5 bg-warning/20 text-warning text-sm rounded-lg hover:bg-warning/30 disabled:opacity-40 transition-colors">
          {t('fp.remove')}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {!a && (
          <div className="h-full flex items-center justify-center text-xs text-ink-faint dark:text-ink-dark-faint text-center px-6">
            {t('fp.empty')}
          </div>
        )}

        {a && (
          <div className="space-y-3">
            {/* Headline score card */}
            <div className="rounded-xl border border-border dark:border-border-dark bg-panel/60 dark:bg-panel-dark/60 p-4">
              <div className="text-xs font-mono uppercase tracking-widest text-ink-muted dark:text-ink-dark-muted mb-1">{t('fp.llmScore')}</div>
              <div className={`text-5xl font-bold leading-none mb-3 ${scoreColor}`}>{scorePct}%</div>
              <div className="relative h-4 rounded-full overflow-hidden bg-danger/15">
                <div className={`absolute inset-y-0 left-0 rounded-full ${scorePct > 60 ? 'bg-danger' : scorePct > 30 ? 'bg-warning' : 'bg-success'} transition-all duration-500`}
                  style={{ width: `${Math.max(scorePct, 4)}%` }} />
                <span className="absolute inset-0 flex items-center justify-end pr-3 text-[10px] font-semibold text-white/90">{scorePct}%</span>
              </div>
              <div className="mt-2 text-[10px] text-ink-faint dark:text-ink-dark-faint">
                {t('fp.confidence')} {(a.confidence * 100).toFixed(0)}% · {a.durationMs.toFixed(1)}ms · {t('fp.higherMore')}
              </div>
            </div>

            {/* Three metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricCard label={t('fp.burstiness')} value={a.burstiness.burstinessScore.toFixed(2)}>
                <Sparkline values={sparkData} className="text-danger" />
              </MetricCard>
              <MetricCard label={t('fp.ttr')} value={a.vocabulary.typeTokenRatio.toFixed(2)}>
                <Donut fraction={a.vocabulary.typeTokenRatio} className="text-danger" />
              </MetricCard>
              <MetricCard label={t('fp.bigram')} value={`${(a.repetition.bigramRepeatRatio * 100).toFixed(1)}%`}>
                <MiniBars values={[
                  a.repetition.bigramRepeatRatio,
                  a.repetition.trigramRepeatRatio,
                  a.repetition.structuralUniformity,
                  a.vocabulary.hapaxRatio,
                ]} />
              </MetricCard>
            </div>

            {/* Legend / chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChipGroup title={t('fp.llmWords')} dotClass="bg-danger" chipClass="bg-danger/15 text-danger"
                items={a.vocabulary.llmFavoredWords} empty={t('fp.noneDetected')} />
              <ChipGroup title={t('fp.hedging')} dotClass="bg-warning" chipClass="bg-warning/15 text-warning"
                items={a.repetition.hedgingPhrases.map(p => p.pattern)} empty={t('fp.noneDetected')} />
            </div>

            {/* Details */}
            <details className="rounded-lg border border-border dark:border-border-dark bg-panel/40 dark:bg-panel-dark/40 px-3 py-2">
              <summary className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted cursor-pointer">
                {t('fp.allMetrics')}
              </summary>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px]">
                <Row label="Perplexity uniformity" value={`${(a.perplexityProfile.uniformity * 100).toFixed(1)}%`} flag={a.perplexityProfile.uniformity > 0.7} />
                <Row label="Perplexity mean" value={a.perplexityProfile.mean.toFixed(3)} />
                <Row label="Sentence length mean" value={a.burstiness.sentenceLengthMean.toFixed(1)} />
                <Row label="Sentence length variance" value={a.burstiness.sentenceLengthVariance.toFixed(1)} />
                <Row label="Trigram repeat" value={a.repetition.trigramRepeatRatio.toFixed(3)} />
                <Row label="Structural uniformity" value={`${(a.repetition.structuralUniformity * 100).toFixed(1)}%`} flag={a.repetition.structuralUniformity > 0.3} />
                <Row label="Hapax ratio" value={a.vocabulary.hapaxRatio.toFixed(3)} />
                <Row label="LLM-favored count" value={String(a.vocabulary.llmFavoredCount)} flag={a.vocabulary.llmFavoredCount >= 3} />
                <Row label="Template phrases" value={String(a.repetition.templatePhrases.length)} />
              </div>
            </details>

            {footprintRemoval && (
              <div className="pt-3 border-t border-border dark:border-border-dark">
                <h3 className="text-xs font-semibold mb-2">{t('fp.removalResults')}</h3>
                <div className="flex gap-4 mb-2 text-xs">
                  <span>{t('fp.before')}: <b>{(footprintRemoval.beforeScore * 100).toFixed(0)}%</b></span>
                  <span>{t('fp.after')}: <b className="text-success">{(footprintRemoval.afterScore * 100).toFixed(0)}%</b></span>
                  <span>{t('fp.transforms')}: {footprintRemoval.transforms.length}</span>
                </div>
                {footprintRemoval.transforms.slice(0, 20).map((t, i) => (
                  <div key={i} className="text-[11px] px-2 py-1 bg-panel dark:bg-panel-dark rounded mb-1 flex gap-2">
                    <span className="text-gray-400 shrink-0">{t.type}</span>
                    <span className="line-through text-red-400 truncate">{t.originalSpan.text.slice(0, 40)}</span>
                    <span className="text-success truncate">{t.replacement.slice(0, 40)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- presentational pieces ---------- */

function MetricCard({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-panel/60 dark:bg-panel-dark/60 p-3">
      <div className="text-[11px] font-mono text-ink-muted dark:text-ink-dark-muted mb-1">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-2xl font-bold text-ink dark:text-ink-dark">{value}</div>
        <div className="w-16 h-10 shrink-0">{children}</div>
      </div>
    </div>
  );
}

function ChipGroup({ title, dotClass, chipClass, items, empty }: {
  title: string; dotClass: string; chipClass: string; items: string[]; empty: string;
}) {
  const seen = new Set<string>();
  const unique = items.filter(w => { const k = w.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-3 h-3 rounded ${dotClass}`} />
        <span className="text-xs font-medium text-ink dark:text-ink-dark">{title}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {unique.length === 0 ? (
          <span className="text-[11px] text-ink-faint dark:text-ink-dark-faint italic">{empty}</span>
        ) : unique.slice(0, 12).map((w, i) => (
          <span key={i} className={`px-2.5 py-1 rounded-full text-[11px] font-mono ${chipClass}`}>{w}</span>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, flag }: { label: string; value: string; flag?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-faint dark:text-ink-dark-faint">{label}</span>
      <span className={`font-mono ${flag ? 'text-warning font-semibold' : 'text-ink dark:text-ink-dark'}`}>{value}</span>
    </div>
  );
}

/* ---------- inline SVG charts (no external deps, CSP-safe) ---------- */

function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  if (!values || values.length < 2) {
    return <div className="w-full h-full flex items-center justify-center text-[9px] text-ink-faint dark:text-ink-dark-faint">—</div>;
  }
  const w = 64, h = 40, pad = 2;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const step = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full h-full ${className}`} preserveAspectRatio="none">
      <path d={area} fill="currentColor" opacity="0.15" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Donut({ fraction, className = '' }: { fraction: number; className?: string }) {
  const f = Math.max(0, Math.min(1, fraction));
  const r = 14, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 40 40" className={`w-full h-full ${className}`}>
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="5" opacity="0.15" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={`${(c * f).toFixed(2)} ${c.toFixed(2)}`} transform="rotate(-90 20 20)" />
    </svg>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 0.0001);
  const w = 64, h = 40, n = values.length, gap = 3;
  const bw = (w - gap * (n - 1)) / n;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      {values.map((v, i) => {
        const bh = Math.max(3, (v / max) * (h - 4));
        const x = i * (bw + gap);
        const y = h - bh;
        const split = y + bh * 0.55;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={split - y} rx="1.5" className="fill-warning" />
            <rect x={x} y={split} width={bw} height={h - split} rx="1.5" className="fill-danger" />
          </g>
        );
      })}
    </svg>
  );
}
