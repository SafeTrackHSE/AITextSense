import { useCallback, useRef } from 'react';

interface SplitterProps {
  /** 'vertical' = a vertical bar dragged horizontally (resizes left/right).
   *  'horizontal' = a horizontal bar dragged vertically (resizes top/bottom). */
  orientation: 'vertical' | 'horizontal';
  onResize: (clientX: number, clientY: number) => void;
  title?: string;
}

/** A draggable divider line. Resizing is driven by the parent via onResize. */
export default function Splitter({ orientation, onResize, title = 'Drag to resize' }: SplitterProps) {
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    const move = (ev: MouseEvent) => { if (dragging.current) onResize(ev.clientX, ev.clientY); };
    const up = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [orientation, onResize]);

  const geo = orientation === 'vertical' ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize';
  const grip = orientation === 'vertical' ? 'w-0.5 h-6' : 'h-0.5 w-6';

  return (
    <div
      role="separator"
      aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
      onMouseDown={handleMouseDown}
      title={title}
      className={`${geo} shrink-0 bg-border dark:bg-border-dark hover:bg-accent/50 active:bg-accent transition-colors flex items-center justify-center group`}
    >
      <span className={`${grip} rounded-full bg-ink-faint/40 dark:bg-ink-dark-faint/40 group-hover:bg-accent`} />
    </div>
  );
}
