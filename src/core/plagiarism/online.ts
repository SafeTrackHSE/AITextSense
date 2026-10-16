/**
 * Mode 4: Online Web & Academic Source Verification
 * AI TextSense v3.0.0
 * (c) 2026 Wilson Volpe. All rights reserved.
 */

import type { OnlineVerificationHit } from './types';

const COMMON_STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
]);

/**
 * Extract candidate distinctive sentences and search phrases with high information density
 */
export function extractDistinctivePhrases(text: string, maxPhrases = 5): string[] {
  const sentences = text
    .split(/[^.!?\r\n]+(?:[.!?]+|\r?\n|$)/g)
    .map(s => s.trim())
    .filter(s => s.length >= 40 && s.length <= 250);

  const scored: Array<{ sentence: string; score: number }> = [];

  for (const s of sentences) {
    const words = s.toLowerCase().split(/[^\p{L}\p{N}]+/gu).filter(Boolean);
    if (words.length < 8 || words.length > 35) continue;

    // Distinctiveness: content word ratio and average word length
    const contentWords = words.filter(w => !COMMON_STOP_WORDS.has(w) && w.length > 3);
    const contentRatio = contentWords.length / words.length;
    const avgLen = words.reduce((acc, w) => acc + w.length, 0) / words.length;

    // Score combines content density and lexical richness
    const score = contentRatio * 0.7 + (avgLen / 10) * 0.3;
    scored.push({ sentence: s, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxPhrases).map(item => item.sentence);
}

/** Extract DOIs from document text */
export function extractDOIs(text: string): string[] {
  const doiRegex = /\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b/g;
  const matches = text.match(doiRegex);
  return matches ? Array.from(new Set(matches)) : [];
}

/** Compute word-overlap similarity score (0..1) between two strings */
function computeOverlap(query: string, candidate: string): number {
  const qWords = new Set(query.toLowerCase().split(/[^\p{L}\p{N}]+/gu).filter(w => w.length > 3));
  const cWords = new Set(candidate.toLowerCase().split(/[^\p{L}\p{N}]+/gu).filter(w => w.length > 3));
  if (qWords.size === 0 || cWords.size === 0) return 0;

  let common = 0;
  for (const w of qWords) {
    if (cWords.has(w)) common++;
  }

  return common / qWords.size;
}

/**
 * Query CrossRef Works API for bibliographic references
 */
export async function queryCrossRef(
  query: string,
  timeoutMs = 5000
): Promise<OnlineVerificationHit[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=3`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AITextSense/3.0.0 (Forensic Integrity Inspector; mailto:support@safetrack.internal)',
      },
    });

    if (!resp.ok) return [];
    const data = await resp.json();
    const items = data.message?.items ?? [];

    const hits: OnlineVerificationHit[] = [];
    for (const item of items) {
      const title = Array.isArray(item.title) ? item.title[0] : (item.title ?? 'Untitled Publication');
      const doi = item.DOI;
      const itemUrl = item.URL || (doi ? `https://doi.org/${doi}` : '');
      const authors = Array.isArray(item.author)
        ? item.author.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean)
        : undefined;
      const year = item.created?.['date-parts']?.[0]?.[0];

      const sim = computeOverlap(query, `${title} ${doi || ''}`);
      if (sim > 0.15 || doi) {
        hits.push({
          queryPhrase: query,
          source: 'crossref',
          title,
          url: itemUrl,
          doi,
          authors,
          year,
          similarityScore: Math.round(sim * 100) / 100,
        });
      }
    }

    return hits;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Query Wikipedia API for encyclopedic source matches
 */
export async function queryWikipedia(
  query: string,
  timeoutMs = 5000
): Promise<OnlineVerificationHit[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const resp = await fetch(url, { signal: controller.signal });

    if (!resp.ok) return [];
    const data = await resp.json();
    const items = data.query?.search ?? [];

    const hits: OnlineVerificationHit[] = [];
    for (const item of items.slice(0, 3)) {
      const title = item.title;
      // Strip HTML tags from snippet
      const snippet = (item.snippet || '').replace(/<[^>]+>/g, '');
      const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;

      const sim = computeOverlap(query, `${title} ${snippet}`);
      if (sim > 0.15) {
        hits.push({
          queryPhrase: query,
          source: 'wikipedia',
          title,
          url: wikiUrl,
          snippet,
          similarityScore: Math.round(sim * 100) / 100,
        });
      }
    }

    return hits;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mode 4 Online Verification Orchestrator:
 * Queries CrossRef and Wikipedia when offlineMode is false.
 * Gracefully returns empty array on timeout or when offline.
 */
export async function verifyOnlineSources(
  text: string,
  options: {
    offlineMode?: boolean;
    timeoutMs?: number;
    maxQueries?: number;
  } = {}
): Promise<OnlineVerificationHit[]> {
  if (options.offlineMode) {
    return [];
  }

  const timeoutMs = options.timeoutMs ?? 5000;
  const maxQueries = options.maxQueries ?? 3;
  const distinctivePhrases = extractDistinctivePhrases(text, maxQueries);

  if (distinctivePhrases.length === 0) {
    return [];
  }

  const results: OnlineVerificationHit[] = [];

  for (const phrase of distinctivePhrases) {
    try {
      const [crossRefHits, wikiHits] = await Promise.all([
        queryCrossRef(phrase, timeoutMs),
        queryWikipedia(phrase, timeoutMs),
      ]);
      results.push(...crossRefHits, ...wikiHits);
    } catch {
      // Continue without failing if one query errors
    }
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueHits: OnlineVerificationHit[] = [];

  for (const hit of results) {
    if (!seenUrls.has(hit.url)) {
      seenUrls.add(hit.url);
      uniqueHits.push(hit);
    }
  }

  return uniqueHits.sort((a, b) => b.similarityScore - a.similarityScore);
}
