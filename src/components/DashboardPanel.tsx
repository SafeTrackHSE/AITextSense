import { useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import logoImg from '../assets/AITextSense_Logo.png';
import horizontalLogo from '../assets/AITextSense_Horizontal.png';
import { cleanup } from '../core/cleanup/cleanup';
import { neutralizeInjections } from '../core/injection';
import { scrubAllFingerprints } from '../core/footprint';

interface GaugeProps {
  label: string;
  score: number;
  sublabel: string;
  invertColor?: boolean;
}

function RadialGauge({ label, score, sublabel, invertColor = false }: GaugeProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (normalized / 100) * circumference;

  // Good = high score, unless inverted
  const isHealthy = invertColor ? normalized < 30 : normalized >= 75;
  const isWarning = invertColor ? normalized >= 30 && normalized < 60 : normalized >= 45 && normalized < 75;

  const colorClass = isHealthy
    ? 'text-emerald-500 stroke-emerald-500'
    : isWarning
      ? 'text-amber-500 stroke-amber-500'
      : 'text-rose-500 stroke-rose-500';

  return (
    <div className="flex flex-col items-center p-3 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark text-center">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-border dark:stroke-border-dark fill-none"
            strokeWidth="7"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            className={`${colorClass} fill-none transition-all duration-700 ease-out`}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xl font-bold font-mono tracking-tight text-ink dark:text-ink-dark">
            {Math.round(score)}%
          </span>
        </div>
      </div>
      <span className="font-semibold text-xs text-ink dark:text-ink-dark mt-2 leading-tight">
        {label}
      </span>
      <span className="text-[10px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
        {sublabel}
      </span>
    </div>
  );
}

interface RadarProps {
  axes: { label: string; value: number }[];
}

function ForensicRadar({ axes }: RadarProps) {
  const size = 260;
  const center = size / 2;
  const maxRadius = 90;
  const numAxes = axes.length;

  const getCoordinates = (index: number, val: number) => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const r = (val / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const polygonPoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(i, axis.value);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Grid concentric rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark">
      <h4 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-ink-dark mb-1">
        5-Axis Forensic Radar
      </h4>
      <p className="text-[10px] text-ink-muted dark:text-ink-dark-muted mb-2">
        Composite posture across security, prompt, payload, human voice & originality
      </p>

      <svg width={size} height={size} className="overflow-visible">
        {/* Background web rings */}
        {rings.map((r, ringIdx) => {
          const ringPoints = Array.from({ length: numAxes })
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
              const radius = r * maxRadius;
              const x = center + radius * Math.cos(angle);
              const y = center + radius * Math.sin(angle);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          return (
            <polygon
              key={ringIdx}
              points={ringPoints}
              className="fill-none stroke-border dark:stroke-border-dark/60"
              strokeWidth="1"
              strokeDasharray={ringIdx < 3 ? '2,2' : undefined}
            />
          );
        })}

        {/* Axis spokes and labels */}
        {axes.map((axis, i) => {
          const outer = getCoordinates(i, 100);
          const labelDist = maxRadius + 22;
          const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
          const lx = center + labelDist * Math.cos(angle);
          const ly = center + labelDist * Math.sin(angle);

          return (
            <g key={i}>
              <line
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                className="stroke-border dark:stroke-border-dark"
                strokeWidth="1"
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[9px] font-mono fill-ink-muted dark:fill-ink-dark-muted font-medium"
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        {/* Shaded data polygon */}
        <polygon
          points={polygonPoints}
          className="fill-accent/25 stroke-accent transition-all duration-500 ease-out"
          strokeWidth="2"
        />

        {/* Data points */}
        {axes.map((axis, i) => {
          const { x, y } = getCoordinates(i, axis.value);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3.5"
              className="fill-accent stroke-surface dark:stroke-surface-dark transition-all duration-500"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function DashboardPanel() {
  const {
    originalText,
    cleanedText,
    scanResult,
    injectionResult,
    threatResult,
    watermarkResult,
    footprintAnalysis,
    plagiarismResult,
    isFullScanning,
    runFullScan,
    setActivePanel,
    applyTextMutation,
    setFootprintScrubReport,
  } = useStore();

  const t = useT();
  const [fixing, setFixing] = useState<string | null>(null);

  // Scores calculation
  const unicodeFindings = scanResult ? scanResult.findings.length + scanResult.stegoPatterns.length + scanResult.bidiIssues.length : 0;
  const unicodeHygiene = scanResult ? Math.max(0, 100 - unicodeFindings * 10) : 100;

  const promptSafety = injectionResult ? Math.max(0, 100 - injectionResult.riskScore) : 100;
  const payloadSafety = threatResult ? Math.max(0, 100 - threatResult.riskScore) : 100;
  const securityScore = Math.round((promptSafety + payloadSafety) / 2);

  const footprintVal = footprintAnalysis ? footprintAnalysis.overallScore : 0;
  const humanVoiceScore = Math.round((1 - footprintVal) * 100);

  const watermarkCleanliness = watermarkResult
    ? (watermarkResult.isSignificant ? Math.max(0, 100 - Math.round(watermarkResult.zScore * 18)) : 100)
    : 100;

  const aiCleanlinessScore = Math.round((humanVoiceScore + watermarkCleanliness) / 2);
  const originalityScore = plagiarismResult ? plagiarismResult.originalityScore : 100;

  const radarAxes = [
    { label: t('dash.radar.unicode'), value: unicodeHygiene },
    { label: t('dash.radar.prompt'), value: promptSafety },
    { label: t('dash.radar.threat'), value: payloadSafety },
    { label: t('dash.radar.voice'), value: humanVoiceScore },
    { label: t('dash.radar.originality'), value: originalityScore },
  ];

  // Quick Action Handlers
  const handleFixUnicode = () => {
    const textToClean = cleanedText ?? originalText;
    if (!textToClean) return;
    setFixing('unicode');
    const res = cleanup(textToClean, { mode: 'aggressive' });
    applyTextMutation(res.cleaned, 'scanner-clean', 'Cleaned Invisible Unicode Characters');
    setTimeout(() => setFixing(null), 600);
  };

  const handleFixInjections = () => {
    const textToClean = cleanedText ?? originalText;
    if (!textToClean) return;
    setFixing('injection');
    const res = neutralizeInjections(textToClean, 'strip');
    applyTextMutation(res.cleanedText, 'injection-neutralize', 'Neutralized Prompt Injections');
    setTimeout(() => setFixing(null), 600);
  };

  const handleFixFootprint = () => {
    const textToClean = cleanedText ?? originalText;
    if (!textToClean) return;
    setFixing('footprint');
    const res = scrubAllFingerprints(textToClean);
    applyTextMutation(res.modified, 'footprint-scrub', 'Scrubbed All AI Fingerprints');
    if (res.breakdown) {
      setFootprintScrubReport(res.breakdown as any);
    }
    setTimeout(() => setFixing(null), 600);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Hero Bar */}
      <div className="relative overflow-hidden rounded-2xl border border-border dark:border-border-dark bg-gradient-to-r from-panel via-surface to-panel dark:from-panel-dark dark:via-surface-dark dark:to-panel-dark p-4 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <img
              src={logoImg}
              alt="AI TextSense Logo"
              className="w-12 h-12 rounded-xl object-contain shadow-md border border-slate-700/30 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <img
                  src={horizontalLogo}
                  alt="AI TextSense"
                  className="h-5 w-auto object-contain brightness-95 dark:brightness-105"
                />
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30">
                  v3.0.0
                </span>
              </div>
              <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-1 max-w-xl">
                {t('dash.subtitle')}
              </p>
            </div>
          </div>

          <button
            id="dashboard-scan-all"
            onClick={runFullScan}
            disabled={isFullScanning || !originalText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-accent to-emerald-600 hover:from-accent-hover hover:to-emerald-500 text-white shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shrink-0 active:scale-95"
          >
            {isFullScanning ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                <span>{t('dash.scanning')}</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>{t('dash.scanAll')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Radial Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <RadialGauge
          label={t('dash.gauge.security')}
          score={securityScore}
          sublabel="Prompt & Code Threat Safety"
        />
        <RadialGauge
          label={t('dash.gauge.watermark')}
          score={aiCleanlinessScore}
          sublabel="Watermark & Stylometric Voice"
        />
        <RadialGauge
          label={t('dash.gauge.originality')}
          score={originalityScore}
          sublabel="Shingle & Style Consistency"
        />
        <RadialGauge
          label={t('dash.gauge.hygiene')}
          score={unicodeHygiene}
          sublabel="Hidden Chars & Steganography"
        />
      </div>

      {/* Middle Grid: Radar Chart + Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 5-Axis Radar Chart */}
        <ForensicRadar axes={radarAxes} />

        {/* Forensic Posture Summary Card */}
        <div className="p-4 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-ink-dark mb-2">
              Forensic Integrity Summary
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-surface dark:bg-surface-dark border border-border/50">
                <span className="text-ink-muted dark:text-ink-dark-muted">Unicode & Stego Status</span>
                <span className={`font-mono font-bold ${unicodeFindings > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {unicodeFindings > 0 ? `${unicodeFindings} findings detected` : 'Clean'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface dark:bg-surface-dark border border-border/50">
                <span className="text-ink-muted dark:text-ink-dark-muted">Prompt Injection Risk</span>
                <span className={`font-mono font-bold ${injectionResult && injectionResult.riskScore > 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {injectionResult ? `${injectionResult.severity} (${injectionResult.riskScore}%)` : 'Not Scanned'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface dark:bg-surface-dark border border-border/50">
                <span className="text-ink-muted dark:text-ink-dark-muted">Payload & Threats</span>
                <span className={`font-mono font-bold ${threatResult && threatResult.riskScore > 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {threatResult ? `${threatResult.severity} (${threatResult.findings.length} hits)` : 'Not Scanned'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-surface dark:bg-surface-dark border border-border/50">
                <span className="text-ink-muted dark:text-ink-dark-muted">AI Generation Likelihood</span>
                <span className={`font-mono font-bold ${footprintVal > 0.4 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {footprintAnalysis ? `${Math.round(footprintVal * 100)}%` : 'Not Analyzed'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-ink-muted dark:text-ink-dark-muted">
            <span>Text Length: {originalText.length.toLocaleString()} chars</span>
            <span>Words: {originalText.trim().split(/\s+/).filter(Boolean).length.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Actionable Quick-Fix Cards */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink dark:text-ink-dark mb-3">
          {t('dash.quickFix.title')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Clean Unicode */}
          <div className="p-3.5 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark flex flex-col justify-between hover:border-accent/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">◈</span>
                <h5 className="font-bold text-xs text-ink dark:text-ink-dark">{t('dash.quickFix.cleanUnicode')}</h5>
              </div>
              <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed mb-3">
                {t('dash.quickFix.cleanUnicodeDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <button
                onClick={handleFixUnicode}
                disabled={fixing === 'unicode' || !originalText}
                className="flex-1 py-1 px-2 rounded text-[11px] font-semibold bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-40"
              >
                {fixing === 'unicode' ? 'Fixing…' : t('dash.quickFix.apply')}
              </button>
              <button
                onClick={() => setActivePanel('scanner')}
                className="py-1 px-2 rounded text-[11px] font-medium btn-ghost text-ink-muted hover:text-ink"
              >
                {t('dash.quickFix.view')}
              </button>
            </div>
          </div>

          {/* Card 2: Neutralize Injections */}
          <div className="p-3.5 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark flex flex-col justify-between hover:border-accent/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">⛨</span>
                <h5 className="font-bold text-xs text-ink dark:text-ink-dark">{t('dash.quickFix.neutralizeInj')}</h5>
              </div>
              <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed mb-3">
                {t('dash.quickFix.neutralizeInjDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <button
                onClick={handleFixInjections}
                disabled={fixing === 'injection' || !originalText}
                className="flex-1 py-1 px-2 rounded text-[11px] font-semibold bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-40"
              >
                {fixing === 'injection' ? 'Fixing…' : t('dash.quickFix.apply')}
              </button>
              <button
                onClick={() => setActivePanel('injection')}
                className="py-1 px-2 rounded text-[11px] font-medium btn-ghost text-ink-muted hover:text-ink"
              >
                {t('dash.quickFix.view')}
              </button>
            </div>
          </div>

          {/* Card 3: Scrub AI Fingerprints */}
          <div className="p-3.5 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark flex flex-col justify-between hover:border-accent/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">⊗</span>
                <h5 className="font-bold text-xs text-ink dark:text-ink-dark">{t('dash.quickFix.scrubFp')}</h5>
              </div>
              <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed mb-3">
                {t('dash.quickFix.scrubFpDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <button
                onClick={handleFixFootprint}
                disabled={fixing === 'footprint' || !originalText}
                className="flex-1 py-1 px-2 rounded text-[11px] font-semibold bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-40"
              >
                {fixing === 'footprint' ? 'Scrubbing…' : t('dash.quickFix.apply')}
              </button>
              <button
                onClick={() => setActivePanel('footprint')}
                className="py-1 px-2 rounded text-[11px] font-medium btn-ghost text-ink-muted hover:text-ink"
              >
                {t('dash.quickFix.view')}
              </button>
            </div>
          </div>

          {/* Card 4: Inspect Plagiarism */}
          <div className="p-3.5 rounded-xl border border-border dark:border-border-dark bg-panel dark:bg-panel-dark flex flex-col justify-between hover:border-accent/40 transition-all">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">§</span>
                <h5 className="font-bold text-xs text-ink dark:text-ink-dark">{t('dash.quickFix.inspectPlag')}</h5>
              </div>
              <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed mb-3">
                {t('dash.quickFix.inspectPlagDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <button
                onClick={() => setActivePanel('plagiarism')}
                className="w-full py-1 px-2 rounded text-[11px] font-semibold bg-panel2 dark:bg-panel2-dark text-ink dark:text-ink-dark hover:text-accent border border-border dark:border-border-dark transition-colors"
              >
                {t('dash.quickFix.view')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
