/**
 * Mode 2: Semantic Paraphrase Detection
 * AI TextSense v3.0.0
 * (c) 2026 Wilson Volpe. All rights reserved.
 */

import type { ReferenceDocument, SemanticMatchSpan } from './types';

export interface SentenceSpan {
  text: string;
  start: number;
  end: number;
  words: string[];
}

/** Extract sentences with exact character offsets from text */
export function extractSentences(text: string): SentenceSpan[] {
  const sentences: SentenceSpan[] = [];
  // Match sentences ending in punctuation or linebreaks
  const regex = /[^.!?\r\n]+(?:[.!?]+|\r?\n|$)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (trimmed.length < 15) continue; // Skip fragments and short labels

    const leadingSpace = raw.indexOf(trimmed);
    const start = match.index + leadingSpace;
    const end = start + trimmed.length;

    const words = trimmed
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/gu)
      .filter(w => w.length > 1);

    if (words.length >= 4) {
      sentences.push({
        text: trimmed,
        start,
        end,
        words,
      });
    }
  }

  return sentences;
}

/** Compute word-level Jaccard similarity */
export function computeWordJaccard(wordsA: string[], wordsB: string[]): number {
  if (wordsA.length === 0 && wordsB.length === 0) return 1;
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  let intersect = 0;
  for (const w of setA) {
    if (setB.has(w)) intersect++;
  }

  const union = setA.size + setB.size - intersect;
  return union > 0 ? intersect / union : 0;
}

/** In-memory TF-IDF cosine similarity between two sentences */
export class TfIdfCosineScorer {
  private vocab: Map<string, number> = new Map();
  private docFrequencies: Map<string, number> = new Map();
  private totalDocs = 0;

  constructor(sentences: SentenceSpan[]) {
    this.totalDocs = sentences.length;
    for (const s of sentences) {
      const unique = new Set(s.words);
      for (const w of unique) {
        this.docFrequencies.set(w, (this.docFrequencies.get(w) ?? 0) + 1);
        if (!this.vocab.has(w)) {
          this.vocab.set(w, this.vocab.size);
        }
      }
    }
  }

  getVector(words: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const w of words) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }

    const vec = new Map<string, number>();
    let normSq = 0;

    for (const [w, count] of counts) {
      const df = this.docFrequencies.get(w) ?? 1;
      const tf = count / words.length;
      const idf = Math.log(1 + (this.totalDocs + 1) / (df + 1));
      const score = tf * idf;
      vec.set(w, score);
      normSq += score * score;
    }

    const norm = Math.sqrt(normSq);
    if (norm > 0) {
      for (const [w, score] of vec) {
        vec.set(w, score / norm);
      }
    }

    return vec;
  }

  cosine(vecA: Map<string, number>, vecB: Map<string, number>): number {
    let dot = 0;
    const [smaller, larger] = vecA.size < vecB.size ? [vecA, vecB] : [vecB, vecA];

    for (const [w, valA] of smaller) {
      const valB = larger.get(w);
      if (valB !== undefined) {
        dot += valA * valB;
      }
    }

    return Math.min(1.0, Math.max(0.0, dot));
  }
}

// Global cached embedder pipeline reference
let cachedEmbedder: unknown = null;
let embedderLoadingPromise: Promise<unknown> | null = null;

async function getNeuralEmbedder(): Promise<unknown> {
  if (cachedEmbedder) return cachedEmbedder;
  if (embedderLoadingPromise) return embedderLoadingPromise;

  embedderLoadingPromise = (async () => {
    try {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        device: 'wasm',
      });
      cachedEmbedder = pipe;
      return pipe;
    } catch {
      return null;
    }
  })();

  return embedderLoadingPromise;
}

/** Compute dot product of two normalized float arrays */
function dotProduct(a: Float32Array | number[], b: Float32Array | number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Mode 2 Semantic Paraphrase Analyzer:
 * 1. Extract sentences from source and references.
 * 2. TF-IDF cosine pre-filter (tfidfCosine >= 0.12).
 * 3. Cap sentence pair comparisons at 500 with async event-loop yielding.
 * 4. Verify candidate pairs with neural embeddings (Xenova/all-MiniLM-L6-v2) or calibrated TF-IDF.
 * 5. Flag pairs with similarity >= 0.78 that are paraphrases (jaccard < 0.5).
 */
export async function analyzeSemanticParaphrases(
  sourceText: string,
  references: ReferenceDocument[],
  options: {
    useNeuralEmbeddings?: boolean;
    maxSentencePairs?: number;
    similarityThreshold?: number; // default 0.78
    tfidfPreFilterThreshold?: number; // default 0.12
    maxJaccard?: number; // default 0.5
  } = {}
): Promise<SemanticMatchSpan[]> {
  const maxPairs = options.maxSentencePairs ?? 500;
  const similarityThreshold = options.similarityThreshold ?? 0.78;
  const preFilterThreshold = options.tfidfPreFilterThreshold ?? 0.12;
  const maxJaccard = options.maxJaccard ?? 0.5;

  const sourceSentences = extractSentences(sourceText);
  if (sourceSentences.length === 0) return [];

  const refSentencesMap: Array<{ ref: ReferenceDocument; sentences: SentenceSpan[] }> = [];
  const allSentencesForVocab = [...sourceSentences];

  for (const ref of references) {
    const sents = extractSentences(ref.text);
    if (sents.length > 0) {
      refSentencesMap.push({ ref, sentences: sents });
      allSentencesForVocab.push(...sents);
    }
  }

  if (refSentencesMap.length === 0) return [];

  const tfidfScorer = new TfIdfCosineScorer(allSentencesForVocab);
  const sourceVectors = sourceSentences.map(s => tfidfScorer.getVector(s.words));

  interface CandidatePair {
    sourceSentence: SentenceSpan;
    refSentence: SentenceSpan;
    reference: ReferenceDocument;
    tfidfScore: number;
    jaccard: number;
  }

  const candidatePairs: CandidatePair[] = [];
  let evaluatedPairs = 0;

  for (let sIdx = 0; sIdx < sourceSentences.length; sIdx++) {
    const sSpan = sourceSentences[sIdx];
    const sVec = sourceVectors[sIdx];

    for (const { ref, sentences: rSents } of refSentencesMap) {
      for (const rSpan of rSents) {
        evaluatedPairs++;
        if (evaluatedPairs > maxPairs) break;

        // Periodic event loop yield to keep UI responsive
        if (evaluatedPairs % 100 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }

        const rVec = tfidfScorer.getVector(rSpan.words);
        const tfidfScore = tfidfScorer.cosine(sVec, rVec);

        if (tfidfScore >= preFilterThreshold) {
          const jaccard = computeWordJaccard(sSpan.words, rSpan.words);
          // Paraphrase candidate: high semantic score but not verbatim copy
          if (jaccard < maxJaccard) {
            candidatePairs.push({
              sourceSentence: sSpan,
              refSentence: rSpan,
              reference: ref,
              tfidfScore,
              jaccard,
            });
          }
        }
      }
      if (evaluatedPairs > maxPairs) break;
    }
    if (evaluatedPairs > maxPairs) break;
  }

  // Sort candidates by tfidfScore desc and cap at top 50
  candidatePairs.sort((a, b) => b.tfidfScore - a.tfidfScore);
  const topCandidates = candidatePairs.slice(0, 50);

  // Neural embedding verification if enabled
  let pipe: any = null;
  if (options.useNeuralEmbeddings) {
    pipe = await getNeuralEmbedder();
  }

  const results: SemanticMatchSpan[] = [];

  for (const pair of topCandidates) {
    if (pipe) {
      try {
        const outSource = await pipe(pair.sourceSentence.text, { pooling: 'mean', normalize: true });
        const outRef = await pipe(pair.refSentence.text, { pooling: 'mean', normalize: true });

        const embSource: Float32Array = outSource.data;
        const embRef: Float32Array = outRef.data;

        const neuralSim = dotProduct(embSource, embRef);
        if (neuralSim >= similarityThreshold) {
          results.push({
            sourceSentence: pair.sourceSentence.text,
            sourceStart: pair.sourceSentence.start,
            sourceEnd: pair.sourceSentence.end,
            referenceSentence: pair.refSentence.text,
            referenceId: pair.reference.id,
            referenceName: pair.reference.name,
            referenceStart: pair.refSentence.start,
            referenceEnd: pair.refSentence.end,
            similarity: Math.round(neuralSim * 1000) / 1000,
            jaccard: Math.round(pair.jaccard * 1000) / 1000,
            method: 'embedding-neural',
          });
          continue;
        }
      } catch {
        // Fall back to calibrated TF-IDF
      }
    }

    // Calibrated TF-IDF match (when neural embedding unavailable or disabled)
    // TF-IDF cosine score >= 0.78
    if (pair.tfidfScore >= similarityThreshold) {
      results.push({
        sourceSentence: pair.sourceSentence.text,
        sourceStart: pair.sourceSentence.start,
        sourceEnd: pair.sourceSentence.end,
        referenceSentence: pair.refSentence.text,
        referenceId: pair.reference.id,
        referenceName: pair.reference.name,
        referenceStart: pair.refSentence.start,
        referenceEnd: pair.refSentence.end,
        similarity: Math.round(pair.tfidfScore * 1000) / 1000,
        jaccard: Math.round(pair.jaccard * 1000) / 1000,
        method: 'tfidf',
      });
    }
  }

  return results;
}
