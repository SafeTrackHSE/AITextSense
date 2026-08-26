import type { DetectedLanguage } from './types';

const LANG_NAMES: Record<string, string> = {
  eng: 'English', por: 'Portuguese', spa: 'Spanish', fra: 'French',
  deu: 'German', ita: 'Italian', nld: 'Dutch', rus: 'Russian',
  zho: 'Chinese', jpn: 'Japanese', kor: 'Korean', ara: 'Arabic',
  hin: 'Hindi', ben: 'Bengali', tur: 'Turkish', vie: 'Vietnamese',
  tha: 'Thai', heb: 'Hebrew', pol: 'Polish', ukr: 'Ukrainian',
  und: 'Unknown',
};

export async function detectLanguage(text: string): Promise<DetectedLanguage> {
  if (text.trim().length < 10) {
    return { code: 'und', name: 'Unknown', confidence: 0 };
  }

  try {
    const { franc } = await import('franc-min');
    const code = franc(text);
    return {
      code,
      name: LANG_NAMES[code] ?? code,
      confidence: code === 'und' ? 0 : 0.8,
    };
  } catch {
    return { code: 'und', name: 'Unknown', confidence: 0 };
  }
}
