import { describe, it, expect } from 'vitest';
import { cleanup } from '../src/core/cleanup/cleanup';
import {
  createHistory, pushSnapshot, undo, redo,
  currentText, canUndo, canRedo, restoreOriginal, getOriginal,
} from '../src/core/cleanup/history';

describe('Cleanup — Report Only', () => {
  it('returns identical text with no changes', () => {
    const result = cleanup('hello​world', { mode: 'report-only' });
    expect(result.cleaned).toBe(result.original);
    expect(result.changes.length).toBe(0);
  });
});

describe('Cleanup — Conservative', () => {
  it('removes ZWSP', () => {
    const result = cleanup('hel​lo', { mode: 'conservative' });
    expect(result.cleaned).toBe('hello');
    expect(result.changes.length).toBe(1);
    expect(result.changes[0].codePoint).toBe(0x200b);
  });

  it('removes BOM mid-text', () => {
    const result = cleanup('hello﻿world', { mode: 'conservative' });
    expect(result.cleaned).toBe('helloworld');
  });

  it('removes soft hyphen', () => {
    const result = cleanup('hy­phen', { mode: 'conservative' });
    expect(result.cleaned).toBe('hyphen');
  });

  it('removes bidi overrides', () => {
    const result = cleanup('text‭here', { mode: 'conservative' });
    expect(result.cleaned).toBe('texthere');
  });

  it('preserves NBSP (not safe to auto-remove)', () => {
    const result = cleanup('hello world', { mode: 'conservative' });
    expect(result.cleaned).toBe('hello world');
  });

  it('preserves emoji ZWJ sequences', () => {
    const input = '👨‍👩‍👧‍👦';
    const result = cleanup(input, { mode: 'conservative' });
    expect(result.cleaned).toBe(input);
    expect(result.changes.length).toBe(0);
  });

  it('preserves accented characters', () => {
    const result = cleanup('café résumé', { mode: 'conservative' });
    expect(result.cleaned).toBe('café résumé');
  });

  it('preserves Arabic text', () => {
    const result = cleanup('مرحبا بالعالم', { mode: 'conservative' });
    expect(result.cleaned).toBe('مرحبا بالعالم');
  });

  it('preserves Devanagari with combining marks', () => {
    const input = 'नमस्ते';
    const result = cleanup(input, { mode: 'conservative' });
    expect(result.cleaned).toBe(input);
  });
});

describe('Cleanup — Aggressive', () => {
  it('removes ZWSP', () => {
    const result = cleanup('hel​lo', { mode: 'aggressive' });
    expect(result.cleaned).toBe('hello');
  });

  it('removes ZWNJ', () => {
    const result = cleanup('a‌b', { mode: 'aggressive' });
    expect(result.cleaned).toBe('ab');
  });

  it('normalizes whitespace anomalies to standard space', () => {
    const result = cleanup('hello world', { mode: 'aggressive' });
    expect(result.cleaned).toBe('hello world');
  });

  it('normalizes homoglyphs to Latin', () => {
    const result = cleanup('pаypal', { mode: 'aggressive' });
    expect(result.cleaned).toBe('paypal');
    expect(result.changes[0].reason).toContain('Homoglyph');
  });

  it('removes variation selectors', () => {
    const result = cleanup('☺️', { mode: 'aggressive' });
    expect(result.cleaned).toBe('☺');
  });

  it('still preserves emoji ZWJ sequences', () => {
    const input = '👨‍👩‍👧‍👦';
    const result = cleanup(input, { mode: 'aggressive' });
    expect(result.cleaned).toBe(input);
  });
});

describe('Cleanup — Custom', () => {
  it('removes only selected classes', () => {
    const input = 'a​b­c';
    const result = cleanup(input, {
      mode: 'custom',
      customClasses: new Set(['zero-width']),
    });
    expect(result.cleaned).toBe('ab­c');
  });

  it('can normalize homoglyphs when enabled', () => {
    const result = cleanup('pаypal', {
      mode: 'custom',
      customClasses: new Set(['homoglyph']),
      homoglyphNormalize: true,
    });
    expect(result.cleaned).toBe('paypal');
  });
});

describe('Cleanup — Round-trip recovery', () => {
  it('original is always recoverable from history', () => {
    const original = 'hello​world﻿test­data';
    const result = cleanup(original, { mode: 'aggressive' });

    expect(result.original).toBe(original);
    expect(result.cleaned).not.toBe(original);

    let history = createHistory(original);
    history = pushSnapshot(history, result.cleaned, 'Aggressive cleanup');

    expect(getOriginal(history)).toBe(original);
    const restored = restoreOriginal(history);
    expect(currentText(restored)).toBe(original);
  });
});

describe('History — Undo/Redo', () => {
  it('tracks snapshots and supports undo/redo', () => {
    let h = createHistory('original');
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);

    h = pushSnapshot(h, 'step1', 'First cleanup');
    expect(canUndo(h)).toBe(true);
    expect(currentText(h)).toBe('step1');

    h = pushSnapshot(h, 'step2', 'Second cleanup');
    expect(currentText(h)).toBe('step2');

    h = undo(h);
    expect(currentText(h)).toBe('step1');
    expect(canRedo(h)).toBe(true);

    h = undo(h);
    expect(currentText(h)).toBe('original');
    expect(canUndo(h)).toBe(false);

    h = redo(h);
    expect(currentText(h)).toBe('step1');

    h = redo(h);
    expect(currentText(h)).toBe('step2');
  });

  it('truncates redo history on new push after undo', () => {
    let h = createHistory('original');
    h = pushSnapshot(h, 'a', 'A');
    h = pushSnapshot(h, 'b', 'B');
    h = undo(h);
    h = pushSnapshot(h, 'c', 'C');

    expect(currentText(h)).toBe('c');
    expect(canRedo(h)).toBe(false);
    expect(h.snapshots.length).toBe(3);
  });

  it('restoreOriginal always returns to first snapshot', () => {
    let h = createHistory('the-original');
    h = pushSnapshot(h, 'x', 'X');
    h = pushSnapshot(h, 'y', 'Y');
    h = restoreOriginal(h);
    expect(currentText(h)).toBe('the-original');
  });
});
