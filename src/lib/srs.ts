import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type FSRS, type Grade } from 'ts-fsrs';
import type { Pace, Stage } from './types';

export { Rating, State };
export type { Card, Grade };

export const RETENTION: Record<Pace, number> = { easy: 0.85, standard: 0.9, sprint: 0.95 };
export const STAGES: Stage[] = ['seed', 'sprout', 'seedling', 'flower', 'bush'];
const DAY_MS = 86_400_000;

/** maxIntervalDays：設了考試日期時，複習間隔不超過考試日 */
export function makeScheduler(pace: Pace, maxIntervalDays?: number): FSRS {
  return fsrs(
    generatorParameters({
      request_retention: RETENTION[pace],
      enable_fuzz: true,
      maximum_interval: Math.max(1, Math.floor(maxIntervalDays ?? 36500)),
    }),
  );
}

export function newCard(now: Date): Card {
  return createEmptyCard(now);
}

/** 依目前的複習間隔換算階段 */
export function stageByInterval(c: Card): Stage {
  if (c.state === State.New) return 'seed';
  const d = c.scheduled_days;
  if (d < 3) return 'sprout';
  if (d < 7) return 'seedling';
  if (d < 21) return 'flower';
  return 'bush';
}

const idx = (s: Stage) => STAGES.indexOf(s);

/**
 * 不會：退回一階（結果答錯退回開花）。
 * 模糊：不長大。
 * 記得：至少不退步，並跟上間隔換算的階段；種子答對一定會發芽。
 */
export function nextStage(prev: Stage, grade: Grade, after: Card): Stage {
  if (grade === Rating.Again) return STAGES[Math.max(0, idx(prev) - 1)];
  if (grade === Rating.Hard) return prev;
  const floor = prev === 'seed' ? 1 : idx(prev);
  return STAGES[Math.min(4, Math.max(floor, idx(stageByInterval(after))))];
}

/** 「太簡單了」：直接長到結果，很久以後才再出現 */
export function tooEasyCard(c: Card, now: Date, maxIntervalDays?: number): Card {
  const days = Math.max(1, Math.min(30, Math.floor(maxIntervalDays ?? 30)));
  return {
    ...c,
    state: State.Review,
    stability: Math.max(c.stability, 60),
    difficulty: c.state === State.New ? 3 : Math.min(c.difficulty, 4),
    scheduled_days: Math.max(days, 21),
    learning_steps: 0,
    reps: c.reps + 1,
    last_review: now,
    due: new Date(now.getTime() + days * DAY_MS),
  };
}

/** 是否還在短間隔的學習中（這一輪會再出現） */
export function isLearning(c: Card): boolean {
  return c.state === State.New || c.state === State.Learning || c.state === State.Relearning;
}
