import { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { getHelpContent } from '../i18n/helpData';
import horizontalLogo from '../assets/AITextSense_Horizontal.png';
import verticalLogo from '../assets/AITextSense_Vertical.png';
import verticalWhiteLogo from '../assets/AITextSense_Vertical_White.png';
import { APP_VERSION, APP_NAME, APP_COPYRIGHT } from '../version';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

type HelpTab = 'guide' | 'help' | 'glossary' | 'whatsnew' | 'about';

export default function HelpModal({ open, onClose }: HelpModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const glossaryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [tab, setTab] = useState<HelpTab>('guide');
  const [search, setSearch] = useState('');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [expandedLesson, setExpandedLesson] = useState<string | null>('g-0');
  const { uiLanguage, helpFocusTerm, darkMode } = useStore();
  const t = useT();

  const content = useMemo(() => getHelpContent(uiLanguage), [uiLanguage]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Deep-link: opening Help with a focus term jumps straight to the Glossary
  // tab and scrolls that entry into view — lets any panel (e.g. a Threat
  // finding's "related terms") send the reader to the plain-language definition.
  useEffect(() => {
    if (!open || !helpFocusTerm) return;
    setTab('glossary');
    setGlossarySearch('');
    const raf = requestAnimationFrame(() => {
      glossaryRefs.current[helpFocusTerm]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, helpFocusTerm]);

  if (!open) return null;

  const filteredGlossary = content.glossary.filter(
    (g) =>
      !glossarySearch ||
      g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      g.plainDefinition.toLowerCase().includes(glossarySearch.toLowerCase())
  );
  const glossaryCategoryLabels: Record<string, string> = {
    threat: content.categories.safety,
    injection: content.categories.safety,
    watermark: content.categories.artifacts,
    footprint: content.categories.artifacts,
    plagiarism: content.categories.synthesis,
    general: content.categories.engines,
  };
  const glossaryCategories = Array.from(new Set(filteredGlossary.map((g) => g.category)));

  // Filter help sections by search
  const filteredHelpSections = content.helpSections.filter(
    (s) =>
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase()) ||
      s.categoryTitle.toLowerCase().includes(search.toLowerCase())
  );

  // Group help sections by category
  const helpCategories = Array.from(new Set(filteredHelpSections.map((s) => s.categoryTitle)));

  // Group guide lessons by category
  const guideCategories = Array.from(new Set(content.guideLessons.map((l) => l.categoryTitle)));

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-lg shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={horizontalLogo}
              alt="AI TextSense"
              className="h-6 w-auto object-contain brightness-95 dark:brightness-105"
            />
            <span className="text-[11px] text-ink-muted dark:text-ink-dark-muted font-mono">
              v{APP_VERSION}
            </span>
          </div>

          {/* Tab buttons */}
          <div className="flex bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded p-0.5 gap-0.5">
            {(
              [
                { key: 'guide', labelKey: 'help.tab.guide', icon: '📖' },
                { key: 'help', labelKey: 'help.tab.help', icon: '⚙️' },
                { key: 'glossary', labelKey: 'help.tab.glossary', icon: '🔎' },
                { key: 'whatsnew', labelKey: 'help.tab.whatsnew', icon: '✨' },
                { key: 'about', labelKey: 'help.tab.about', icon: 'ℹ️' },
              ] as const
            ).map((tItem) => (
              <button
                key={tItem.key}
                onClick={() => setTab(tItem.key)}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all duration-150 flex items-center gap-1.5 ${
                  tab === tItem.key
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark'
                }`}
              >
                <span>{tItem.icon}</span>
                <span>{t(tItem.labelKey)}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark hover:bg-panel2 dark:hover:bg-panel2-dark transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
          {/* ============================================================= */}
          {/* TAB 1: GUIDE (Hands-on step-by-step tutorial) */}
          {/* ============================================================= */}
          {tab === 'guide' && (
            <div className="space-y-6">
              <div className="p-3.5 bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-md text-xs text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                <span className="font-semibold text-ink dark:text-ink-dark">
                  Welcome to AI TextSense!
                </span>{' '}
                This practical walkthrough guides you through detecting prompt injections, stripping
                invisible tags, sweeping for statistical watermarks, and optimizing text integrity.
              </div>

              {guideCategories.map((categoryTitle) => (
                <div key={categoryTitle} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2 border-b border-border/60 dark:border-border-dark/60 pb-1.5">
                    <span>◈</span>
                    <span>{categoryTitle}</span>
                  </h3>

                  <div className="space-y-2.5">
                    {content.guideLessons
                      .filter((l) => l.categoryTitle === categoryTitle)
                      .map((lesson) => {
                        const isExpanded = expandedLesson === lesson.id;
                        return (
                          <div
                            key={lesson.id}
                            className="border border-border dark:border-border-dark rounded-md bg-panel dark:bg-panel-dark overflow-hidden transition-all duration-150"
                          >
                            <button
                              onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
                              className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-panel2 dark:hover:bg-panel2-dark transition-colors"
                            >
                              <div>
                                <div className="text-xs font-semibold text-ink dark:text-ink-dark">
                                  {lesson.title}
                                </div>
                                <div className="text-[11px] text-ink-muted dark:text-ink-dark-muted mt-0.5">
                                  {lesson.goal}
                                </div>
                              </div>
                              <span className="text-xs text-ink-muted dark:text-ink-dark-muted font-mono">
                                {isExpanded ? '▲' : '▼'}
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 border-t border-border/40 dark:border-border-dark/40 space-y-3 text-xs">
                                <ol className="list-decimal list-inside space-y-1.5 text-ink dark:text-ink-dark leading-relaxed pl-1">
                                  {lesson.steps.map((step, idx) => (
                                    <li key={idx} className="pl-1">
                                      {step}
                                    </li>
                                  ))}
                                </ol>

                                {lesson.tip && (
                                  <div className="p-2.5 rounded bg-surface dark:bg-surface-dark border border-accent/30 text-[11px] text-accent flex items-start gap-2">
                                    <span className="font-bold">💡 Tip:</span>
                                    <span>{lesson.tip}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 2: HELP (Deep Technical Reference by Domain) */}
          {/* ============================================================= */}
          {tab === 'help' && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search technical reference, Unicode tags, Kirchenbauer sweep, heuristics..."
                  className="w-full px-3.5 py-2 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded text-xs text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-ink-muted"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-2.5 text-xs text-ink-muted hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>

              {helpCategories.map((categoryTitle) => (
                <div key={categoryTitle} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2 border-b border-border/60 dark:border-border-dark/60 pb-1.5">
                    <span>◈</span>
                    <span>{categoryTitle}</span>
                  </h3>

                  <div className="space-y-3">
                    {filteredHelpSections
                      .filter((s) => s.categoryTitle === categoryTitle)
                      .map((sec) => (
                        <div
                          key={sec.id}
                          className="p-4 rounded-md border border-border dark:border-border-dark bg-panel dark:bg-panel-dark space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono opacity-80">{sec.icon}</span>
                            <h4 className="text-xs font-bold text-ink dark:text-ink-dark">
                              {sec.title}
                            </h4>
                          </div>
                          <div className="text-xs text-ink dark:text-ink-dark leading-relaxed whitespace-pre-wrap">
                            {sec.content}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB: GLOSSARY (plain-language definitions for every technical term) */}
          {/* ============================================================= */}
          {tab === 'glossary' && (
            <div className="space-y-6">
              <div className="p-3.5 bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-md text-xs text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                {t('glossary.intro')}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                  placeholder={t('glossary.searchPlaceholder')}
                  className="w-full px-3.5 py-2 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded text-xs text-ink dark:text-ink-dark focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-ink-muted"
                />
                {glossarySearch && (
                  <button
                    onClick={() => setGlossarySearch('')}
                    className="absolute right-3 top-2.5 text-xs text-ink-muted hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>

              {filteredGlossary.length === 0 ? (
                <p className="text-xs text-ink-muted dark:text-ink-dark-muted text-center py-6">{t('glossary.noResults')}</p>
              ) : (
                glossaryCategories.map((category) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2 border-b border-border/60 dark:border-border-dark/60 pb-1.5">
                      <span>◈</span>
                      <span>{glossaryCategoryLabels[category] ?? category}</span>
                    </h3>
                    <div className="space-y-2">
                      {filteredGlossary
                        .filter((g) => g.category === category)
                        .map((g) => (
                          <div
                            key={g.id}
                            ref={(el) => { glossaryRefs.current[g.id] = el; }}
                            className={`p-3.5 rounded-md border bg-panel dark:bg-panel-dark space-y-1 transition-colors duration-500 ${
                              helpFocusTerm === g.id ? 'border-accent ring-1 ring-accent/50' : 'border-border dark:border-border-dark'
                            }`}
                          >
                            <h4 className="text-xs font-bold text-ink dark:text-ink-dark">{g.term}</h4>
                            <p className="text-xs text-ink dark:text-ink-dark leading-relaxed">{g.plainDefinition}</p>
                            {g.technicalNote && (
                              <p className="text-[11px] text-ink-muted dark:text-ink-dark-muted leading-relaxed pt-1 border-t border-border/40 dark:border-border-dark/40 mt-1.5">
                                {g.technicalNote}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 3: WHAT'S NEW (Changelog) */}
          {/* ============================================================= */}
          {tab === 'whatsnew' && (
            <div className="space-y-5">
              {content.changelog.map((ver) => (
                <div
                  key={ver.version}
                  className="border border-border dark:border-border-dark rounded-md bg-panel dark:bg-panel-dark p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 dark:border-border-dark/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-accent text-white font-mono text-xs font-bold">
                        {ver.version}
                      </span>
                      <span className="text-xs font-bold text-ink dark:text-ink-dark">
                        {ver.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-ink-muted dark:text-ink-dark-muted">
                      {ver.date}
                    </span>
                  </div>

                  <ul className="list-disc list-inside space-y-1.5 text-xs text-ink dark:text-ink-dark leading-relaxed pl-1">
                    {ver.highlights.map((h, i) => (
                      <li key={i} className="pl-1">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 4: ABOUT */}
          {/* ============================================================= */}
          {tab === 'about' && (
            <div className="max-w-2xl mx-auto space-y-6 text-center py-4">
              <div className="flex flex-col items-center space-y-3">
                <img
                  src={darkMode ? verticalWhiteLogo : verticalLogo}
                  alt="AI TextSense"
                  className="h-20 w-auto object-contain mx-auto"
                />
                <p className="text-xs font-semibold text-accent">{content.about.tagline}</p>
                <p className="text-[11px] font-mono text-ink-muted dark:text-ink-dark-muted">
                  Version {APP_VERSION} · Forensic Build
                </p>
              </div>

              <div className="text-left bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-md p-4 space-y-3 text-xs leading-relaxed">
                <p className="text-ink dark:text-ink-dark">{content.about.description}</p>

                <div className="pt-2 border-t border-border/40 dark:border-border-dark/40 space-y-1">
                  <h5 className="font-bold text-ink dark:text-ink-dark">
                    {content.about.privacyTitle}
                  </h5>
                  <p className="text-ink-muted dark:text-ink-dark-muted text-[11px]">
                    {content.about.privacyBody}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 dark:border-border-dark/40 space-y-1">
                  <h5 className="font-bold text-ink dark:text-ink-dark">
                    {content.about.licenseTitle}
                  </h5>
                  <p className="text-ink-muted dark:text-ink-dark-muted text-[11px]">
                    {content.about.licenseBody}
                  </p>
                </div>
              </div>

              <div className="text-xs text-ink-muted dark:text-ink-dark-muted font-mono">
                Engineered with precision for absolute textual integrity.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border dark:border-border-dark bg-panel dark:bg-panel-dark flex items-center justify-between shrink-0 text-xs">
          <span className="text-[11px] text-ink-muted dark:text-ink-dark-muted font-mono">
            {APP_NAME} v{APP_VERSION} · {APP_COPYRIGHT}
          </span>
          <button onClick={onClose} className="btn-primary py-1 px-4 text-xs">
            {t('help.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
}
