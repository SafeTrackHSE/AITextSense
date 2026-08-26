import type {
  FootprintAnalysis, PerplexityProfile, BurstinessResult,
  RepetitionResult, VocabularyResult, FoundPattern,
} from './types';

const LLM_FAVORED = new Set([
  'furthermore', 'moreover', 'additionally', 'consequently', 'nevertheless',
  'specifically', 'particularly', 'significantly', 'essentially', 'fundamentally',
  'comprehensive', 'substantial', 'facilitate', 'utilize', 'implement',
  'demonstrate', 'indicate', 'establish', 'determine', 'maintain',
  'crucial', 'pivotal', 'noteworthy', 'aforementioned', 'nonetheless',
  'notwithstanding', 'pertaining', 'encompasses', 'constitutes', 'exhibits',
  'paramount', 'multifaceted', 'intricate', 'nuanced', 'compelling',
  'underscores', 'underscored', 'leveraging', 'leveraged', 'landscape',
  'delve', 'delving', 'realm', 'tapestry', 'fostering', 'navigating',
  'aligning', 'streamlining', 'spearheading', 'bolstering', 'underpinning',
  'overarching', 'holistic', 'synergy', 'paradigm', 'robust',
  'meticulous', 'meticulously', 'seamlessly', 'invaluable',
  'myriad', 'plethora', 'showcase', 'showcasing', 'harness',
  'harnessing', 'elevate', 'cultivate', 'embark', 'unlock',
  'testament', 'vibrant', 'essential', 'vital', 'foster',
  'fostered', 'encompass', 'endeavor', 'facilitates', 'utilizing',
  'utilizes', 'furthermore', 'notably', 'importantly', 'ultimately',
  'vibrantly', 'transformative', 'unprecedented', 'cutting-edge', 'game-changing',
  'dive', 'unpack', 'ecosystem', 'empower', 'empowering',
]);

const HEDGING_PATTERNS = [
  "it's important to note",
  "it is important to note",
  "it should be noted",
  "it is worth mentioning",
  "it is worth noting",
  "however, it is",
  "in this context",
  "in conclusion",
  "to summarize",
  "as mentioned earlier",
  "as previously discussed",
  "on the other hand",
  "in other words",
  "that being said",
  "having said that",
  "with that in mind",
  "it goes without saying",
  "needless to say",
  "by and large",
  "for the most part",
  "to a large extent",
  "in the grand scheme",
];

const TEMPLATE_PATTERNS = [
  "there are several",
  "there are many",
  "there are various",
  "one of the most",
  "it is essential to",
  "it is crucial to",
  "in today's world",
  "in the modern era",
  "plays a crucial role",
  "plays an important role",
  "plays a vital role",
  "serves as a",
  "can be achieved by",
  "it can be argued",
  "this approach allows",
  "this method provides",
  "the key takeaway",
  "key takeaways include",
  "here are some",
  "let's explore",
  "let's delve into",
  "let's take a look",
];

export function analyzeFootprint(text: string): FootprintAnalysis {
  const start = performance.now();

  const perplexityProfile = analyzePerplexity(text);
  const burstiness = analyzeBurstiness(text);
  const repetition = analyzeRepetition(text);
  const vocabulary = analyzeVocabulary(text);

  const overallScore = computeOverallScore(perplexityProfile, burstiness, repetition, vocabulary);

  return {
    perplexityProfile,
    burstiness,
    repetition,
    vocabulary,
    overallScore,
    confidence: Math.min(0.85, overallScore),
    durationMs: performance.now() - start,
  };
}

function analyzePerplexity(text: string): PerplexityProfile {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length < 10) {
    return { mean: 0, stddev: 0, uniformity: 0, windowScores: [] };
  }

  // v2: adaptive windowing — short texts were invisible to the v1 engine
  // because of the rigid 50-word window. Scale the window to the text.
  const windowSize = Math.max(12, Math.min(50, Math.floor(words.length / 3)));
  const step = Math.max(6, Math.floor(windowSize / 2));
  const windowScores: number[] = [];

  const globalFreq = buildFreqMap(words);
  const totalWords = words.length;

  for (let i = 0; i + windowSize <= words.length; i += step) {
    const window = words.slice(i, i + windowSize);
    let logProb = 0;
    for (const w of window) {
      const freq = globalFreq.get(w) ?? 1;
      logProb += -Math.log2(freq / totalWords);
    }
    windowScores.push(logProb / window.length);
  }

  const mean = windowScores.reduce((a, b) => a + b, 0) / windowScores.length;
  const variance = windowScores.reduce((a, b) => a + (b - mean) ** 2, 0) / windowScores.length;
  const stddev = Math.sqrt(variance);

  const uniformity = stddev > 0 ? 1 / (1 + stddev) : 1;

  return { mean, stddev, uniformity, windowScores };
}

function analyzeBurstiness(text: string): BurstinessResult {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

  if (sentences.length < 3) {
    return {
      sentenceLengthVariance: 0, sentenceLengthMean: 0,
      burstinessScore: 0, ttrWindowed: [], ttrMean: 0,
    };
  }

  const lengths = sentences.map(s => s.split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;

  const burstinessScore = variance > 0 ? (Math.sqrt(variance) - mean) / (Math.sqrt(variance) + mean) : -1;

  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const windowSize = 100;
  const ttrWindowed: number[] = [];
  for (let i = 0; i + windowSize <= words.length; i += 50) {
    const window = words.slice(i, i + windowSize);
    const types = new Set(window);
    ttrWindowed.push(types.size / window.length);
  }

  const ttrMean = ttrWindowed.length > 0
    ? ttrWindowed.reduce((a, b) => a + b, 0) / ttrWindowed.length
    : 0;

  return { sentenceLengthVariance: variance, sentenceLengthMean: mean, burstinessScore, ttrWindowed, ttrMean };
}

function analyzeRepetition(text: string): RepetitionResult {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const lower = text.toLowerCase();

  const bigrams = buildNgrams(words, 2);
  const trigrams = buildNgrams(words, 3);

  const bigramRepeatRatio = computeRepeatRatio(bigrams);
  const trigramRepeatRatio = computeRepeatRatio(trigrams);

  const hedgingPhrases = findPatterns(lower, HEDGING_PATTERNS);
  const templatePhrases = findPatterns(lower, TEMPLATE_PATTERNS);

  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const sentenceStarts = sentences.map(s => {
    const firstWord = s.split(/\s+/)[0]?.toLowerCase() ?? '';
    return firstWord;
  });
  const startFreq = buildFreqMap(sentenceStarts);
  const maxStartFreq = Math.max(...startFreq.values());
  const structuralUniformity = sentences.length > 0 ? maxStartFreq / sentences.length : 0;

  return {
    bigramRepeatRatio,
    trigramRepeatRatio,
    hedgingPhrases,
    templatePhrases,
    structuralUniformity,
  };
}

function analyzeVocabulary(text: string): VocabularyResult {
  const words = text.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z]/g, '')).filter(w => w.length > 2);
  if (words.length === 0) {
    return { typeTokenRatio: 0, hapaxRatio: 0, llmFavoredCount: 0, llmFavoredWords: [], humanFavoredCount: 0 };
  }

  const freq = buildFreqMap(words);
  const types = freq.size;
  const typeTokenRatio = types / words.length;

  let hapax = 0;
  for (const count of freq.values()) {
    if (count === 1) hapax++;
  }
  const hapaxRatio = hapax / types;

  const llmFavoredWords: string[] = [];
  for (const word of freq.keys()) {
    if (LLM_FAVORED.has(word)) {
      llmFavoredWords.push(word);
    }
  }

  return {
    typeTokenRatio,
    hapaxRatio,
    llmFavoredCount: llmFavoredWords.length,
    llmFavoredWords,
    humanFavoredCount: 0,
  };
}

function computeOverallScore(
  perplexity: PerplexityProfile,
  burstiness: BurstinessResult,
  repetition: RepetitionResult,
  vocabulary: VocabularyResult,
): number {
  let score = 0;

  if (perplexity.windowScores.length === 0) return 0;

  if (perplexity.uniformity > 0.7) score += 0.25;
  else if (perplexity.uniformity > 0.5) score += 0.15;

  // Low burstiness (score < -0.2) = very regular sentence length = LLM-like.
  if (burstiness.sentenceLengthMean > 0 && burstiness.burstinessScore < -0.2) score += 0.2;

  const hedgeCount = repetition.hedgingPhrases.reduce((a, p) => a + p.occurrences, 0);
  const templateCount = repetition.templatePhrases.reduce((a, p) => a + p.occurrences, 0);
  if (hedgeCount >= 3) score += 0.15;
  if (templateCount >= 2) score += 0.1;
  if (repetition.structuralUniformity > 0.3) score += 0.1;

  if (vocabulary.llmFavoredCount >= 5) score += 0.2;
  else if (vocabulary.llmFavoredCount >= 2) score += 0.1;

  return Math.min(1, score);
}

function buildFreqMap(items: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return map;
}

function buildNgrams(words: string[], n: number): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i + n <= words.length; i++) {
    const gram = words.slice(i, i + n).join(' ');
    map.set(gram, (map.get(gram) ?? 0) + 1);
  }
  return map;
}

function computeRepeatRatio(ngrams: Map<string, number>): number {
  if (ngrams.size === 0) return 0;
  let repeated = 0;
  for (const count of ngrams.values()) {
    if (count > 1) repeated++;
  }
  return repeated / ngrams.size;
}

function findPatterns(text: string, patterns: string[]): FoundPattern[] {
  const results: FoundPattern[] = [];
  for (const pattern of patterns) {
    const positions: number[] = [];
    let idx = text.indexOf(pattern);
    while (idx !== -1) {
      positions.push(idx);
      idx = text.indexOf(pattern, idx + 1);
    }
    if (positions.length > 0) {
      results.push({ pattern, occurrences: positions.length, positions });
    }
  }
  return results;
}
