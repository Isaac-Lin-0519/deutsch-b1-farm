import { describe, expect, it } from 'vitest';
import { freshCare, hearts, knows, toNextHeart } from '../src/lib/affection';
import { BALL, LIE, SIT, WALK_A, WALK_B, WALK_H, WALK_W } from '../src/lib/collie';
import { Dog, SPOTS, type World } from '../src/lib/dog';
import { seasonOf, timeOfDay, weatherFor } from '../src/lib/env';

describe('好感度', () => {
  it('心數依門檻計算，只看累積值', () => {
    expect(hearts(0)).toBe(0);
    expect(hearts(4)).toBe(0);
    expect(hearts(5)).toBe(1);
    expect(hearts(34)).toBe(2);
    expect(hearts(500)).toBe(5);
    expect(toNextHeart(12)).toBe(3);
    expect(toNextHeart(120)).toBeNull();
  });
  it('動作依心數解鎖', () => {
    expect(knows(4, 'fetch')).toBe(false);
    expect(knows(5, 'fetch')).toBe(true);
    expect(knows(69, 'follow')).toBe(false);
    expect(knows(70, 'follow')).toBe(true);
  });
  it('每天的照顧次數換日歸零', () => {
    const c = { day: '2026-11-10', pets: 3, fed: 2, watered: true };
    expect(freshCare(c, '2026-11-10')).toBe(c);
    expect(freshCare(c, '2026-11-11')).toEqual({ day: '2026-11-11', pets: 0, fed: 0, watered: false });
    expect(freshCare(undefined, '2026-11-11').pets).toBe(0);
  });
});

describe('窗外', () => {
  it('時間跟季節照系統時間', () => {
    expect(timeOfDay(new Date(2026, 10, 10, 7))).toBe('morning');
    expect(timeOfDay(new Date(2026, 10, 10, 12))).toBe('noon');
    expect(timeOfDay(new Date(2026, 10, 10, 17))).toBe('dusk');
    expect(timeOfDay(new Date(2026, 10, 10, 23))).toBe('night');
    expect(timeOfDay(new Date(2026, 10, 10, 3))).toBe('night');
    expect(seasonOf(new Date(2026, 10, 10))).toBe('autumn');
    expect(seasonOf(new Date(2026, 11, 1))).toBe('winter');
    expect(seasonOf(new Date(2027, 2, 1))).toBe('spring');
  });
  it('天氣同一個半天固定，只有冬天會下雪', () => {
    expect(weatherFor(new Date(2026, 10, 10, 8))).toBe(weatherFor(new Date(2026, 10, 10, 11)));
    for (let d = 1; d <= 300; d++) {
      const day = new Date(2026, 3, d, 9);
      if (seasonOf(day) !== 'winter') expect(weatherFor(day)).not.toBe('snow');
    }
  });
});

describe('邊牧精靈圖', () => {
  it('每一列一樣寬', () => {
    for (const rows of [SIT, BALL, LIE]) expect(new Set(rows.map((r) => r.length))).toEqual(new Set([28]));
    for (const rows of [WALK_A, WALK_B]) {
      expect(new Set(rows.map((r) => r.length))).toEqual(new Set([WALK_W]));
      expect(rows.length).toBe(WALK_H);
    }
  });
});

describe('邊牧的行為', () => {
  const world = (): World => ({ ball: { x: 80, y: 160 }, knows: () => true, wantsWater: () => false });

  it('走到指定位置後坐下', () => {
    const dog = new Dog(world(), () => 0.5);
    dog.do(dog.goTo(30, 160));
    let t = 0;
    for (; t < 10_000 && !(dog.fx === 30 && dog.fy === 160); t += 50) dog.step(t, 50);
    expect([dog.fx, dog.fy]).toEqual([30, 160]);
    dog.step(t, 50);
    expect(dog.pose).toBe('sit');
  });
  it('撿球時嘴巴剛好碰到球，叼回去之後放下', () => {
    const w = world();
    const dog = new Dog(w, () => 0.5);
    dog.do(dog.fetch(SPOTS.front));
    let carried = false;
    for (let t = 0; t < 30_000; t += 50) {
      dog.step(t, 50);
      carried ||= dog.carry;
      if (dog.pose === 'ball') break;
    }
    expect(carried).toBe(true);
    expect([dog.fx, dog.fy]).toEqual(SPOTS.front);
    dog.do(dog.wander());
    expect(dog.carry).toBe(false);
  });
  it('球在右邊牆角時從左邊靠近', () => {
    const w = world();
    w.ball = { x: 100, y: 160 };
    const dog = new Dog(w);
    dog.fx = 110;
    expect(dog.ballTarget()).toEqual([92, 173]);
  });
});
