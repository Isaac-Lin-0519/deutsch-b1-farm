import type { Word } from './types';

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
let voice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  const de = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('de'));
  voice = de.find((v) => v.lang === 'de-DE' && v.localService) ?? de.find((v) => v.lang === 'de-DE') ?? de[0] ?? null;
}

if (canSpeak) {
  pickVoice();
  speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

/** 用瀏覽器內建的德語語音朗讀 */
export function speak(text: string) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  if (voice) u.voice = voice;
  u.rate = 0.9;
  speechSynthesis.speak(u);
}

/** 名詞連冠詞一起唸 */
export function sayWord(w: Word) {
  const art = w.pos === 'noun' ? w.articles?.[0] : undefined;
  speak(art ? `${art} ${w.lemma}` : w.lemma);
}

export function plainExample(de: string): string {
  return de.replace(/[{}]/g, '');
}
