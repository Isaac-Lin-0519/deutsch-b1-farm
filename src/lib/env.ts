// 窗外：時間跟系統時鐘、季節跟系統日期、天氣隨機（同一個半天固定，不會每次打開都變）
import { hash } from './plan';

export type Tod = 'morning' | 'noon' | 'dusk' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow';

export interface Env {
  tod: Tod;
  season: Season;
  weather: Weather;
}

export const TOD_NAMES: Record<Tod, string> = { morning: '早上', noon: '白天', dusk: '傍晚', night: '晚上' };
export const SEASON_NAMES: Record<Season, string> = { spring: '春天', summer: '夏天', autumn: '秋天', winter: '冬天' };
export const WEATHER_NAMES: Record<Weather, string> = { clear: '晴天', cloudy: '多雲', rain: '下雨', snow: '下雪' };

export function timeOfDay(d: Date): Tod {
  const h = d.getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 16) return 'noon';
  if (h >= 16 && h < 19) return 'dusk';
  return 'night';
}

export function seasonOf(d: Date): Season {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

/** 各季節可能的天氣（重複的比較常出現）；只有冬天會下雪 */
const CHOICES: Record<Season, Weather[]> = {
  spring: ['clear', 'clear', 'cloudy', 'rain'],
  summer: ['clear', 'clear', 'clear', 'cloudy', 'rain'],
  autumn: ['clear', 'cloudy', 'cloudy', 'rain'],
  winter: ['clear', 'cloudy', 'snow', 'snow'],
};

export function weatherFor(d: Date): Weather {
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-${d.getHours() < 12 ? 'am' : 'pm'}`;
  const list = CHOICES[seasonOf(d)];
  return list[hash(key) % list.length];
}

export function envAt(d: Date): Env {
  return { tod: timeOfDay(d), season: seasonOf(d), weather: weatherFor(d) };
}

export function envLabel(e: Env): string {
  return `${SEASON_NAMES[e.season]}・${TOD_NAMES[e.tod]}・${WEATHER_NAMES[e.weather]}`;
}
