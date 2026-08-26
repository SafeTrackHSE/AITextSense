import { useState } from 'react';
import DiffView from './DiffView';
import CleanedEditor from './CleanedEditor';
import { useT } from '../i18n';

type View = 'diff' | 'edit';

/** Bottom-left output area: Diff / editable cleaned-text editor. */
export default function OutputPanel() {
  const [view, setView] = useState<View>('diff');
  const t = useT();

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint dark:text-ink-dark-faint mr-1">{t('output.title')}</span>
        {(['diff', 'edit'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${
              view === v ? 'bg-accent text-white' : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark'
            }`}
          >
            {t(`output.${v}`)}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'diff' ? <DiffView /> : <CleanedEditor />}
      </div>
    </div>
  );
}
