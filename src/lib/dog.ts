// 邊牧在家裡的行為：一連串步驟（走到某處、維持某個姿勢、做一件事），做完再挑下一個活動
import { LIE_H, LIE_W, SIT_H, SIT_W, WALK_H, WALK_W } from './collie';

export type Pose = 'sit' | 'ball' | 'walk' | 'sleep';
type Point = [number, number];

export type Step =
  | { go: Point | (() => Point) }
  | { pose: Pose; dur: number }
  | { fn: (t: number) => void };

/** 狗的位置用「腳底中心」表示（美術像素座標） */
export const FLOOR = { x0: 22, x1: 98, y0: 150, y1: 180 };
export const BALL_AREA = { x0: 28, x1: 100, y0: 150, y1: 176 };
export const SPOTS = {
  front: [60, 176] as Point,
  window: [58, 152] as Point,
  bed: [102, 135] as Point,
  eat: [40, 190] as Point,
  beg: [74, 182] as Point,
};

const SPEED = 20; // 每秒幾個美術像素

export interface World {
  ball: { x: number; y: number };
  /** 好感度夠了才會的動作 */
  knows: (trick: 'fetch' | 'window') => boolean;
  /** 有作物該澆水時，牠偶爾會跑到「去澆水」旁邊討 */
  wantsWater: () => boolean;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class Dog {
  fx = SPOTS.front[0];
  fy = SPOTS.front[1] - 6;
  pose: Pose = 'sit';
  dir = 1;
  carry = false;
  begging = false;
  wagUntil = 0;
  hopUntil = 0;
  private q: Step[] = [];
  private cur: Step | null = null;
  private started = 0;

  constructor(
    private world: World,
    private rnd: () => number = Math.random,
  ) {}

  private r(a: number, b: number) {
    return a + this.rnd() * (b - a);
  }

  /** 換成新的計畫（叼著球的話先放下） */
  do(plan: Step[]) {
    if (this.carry) {
      this.carry = false;
      this.dropBall();
    }
    this.begging = false;
    this.q = plan;
    this.cur = null;
  }

  get busy(): boolean {
    return this.cur !== null || this.q.length > 0;
  }

  // ---- 活動 ----
  wander(): Step[] {
    return [{ go: [this.r(FLOOR.x0 + 14, FLOOR.x1 - 14), this.r(FLOOR.y0 + 8, FLOOR.y1 - 4)] }, { pose: 'sit', dur: this.r(2500, 5000) }];
  }

  lookOutside(): Step[] {
    return [{ go: SPOTS.window }, { pose: 'sit', dur: 4500 }];
  }

  fetch(bringTo?: Point): Step[] {
    const to: Point = bringTo ?? [this.r(44, 76), this.r(164, 174)];
    return [
      { go: () => this.ballTarget() },
      { fn: () => (this.carry = true) },
      { go: to },
      { fn: () => (this.carry = false) },
      { pose: 'ball', dur: 4500 },
      { fn: () => this.dropBall() },
      { pose: 'sit', dur: 1500 },
    ];
  }

  nap(): Step[] {
    return [{ go: SPOTS.bed }, { pose: 'sleep', dur: this.r(9000, 14000) }, { pose: 'sit', dur: 1200 }, ...this.wander()];
  }

  eat(onEat: (t: number) => void): Step[] {
    return [{ go: SPOTS.eat }, { fn: onEat }, { pose: 'sit', dur: 3000 }];
  }

  beg(): Step[] {
    return [{ go: SPOTS.beg }, { fn: () => (this.begging = true) }, { pose: 'sit', dur: 5000 }, { fn: () => (this.begging = false) }];
  }

  /** 你打開 App 時跑到前面迎接 */
  greet(): Step[] {
    return [
      { go: SPOTS.front },
      {
        fn: (now) => {
          this.wagUntil = now + 2500;
          this.hopUntil = now + 350;
        },
      },
      { pose: 'sit', dur: 2500 },
    ];
  }

  goTo(x: number, y: number): Step[] {
    return [{ go: [clamp(x, FLOOR.x0, FLOOR.x1), clamp(y, FLOOR.y0, FLOOR.y1)] }, { pose: 'sit', dur: 4000 }];
  }

  wake(): Step[] {
    return [{ pose: 'sit', dur: 2500 }];
  }

  private idle(): Step[] {
    if (this.world.wantsWater() && this.rnd() < 0.25) return this.beg();
    const r = this.rnd();
    if (r < 0.25 && this.world.knows('fetch')) return this.fetch();
    if (r < 0.43) return this.nap();
    if (r < 0.55 && this.world.knows('window')) return this.lookOutside();
    return this.wander();
  }

  /** 走到網球旁邊，讓嘴巴剛好碰到球 */
  ballTarget(): Point {
    const b = this.world.ball;
    const fromLeft = (right: boolean): Point => [right ? b.x - 8 : b.x + 12, b.y + 13];
    let right = this.fx < b.x;
    let p = fromLeft(right);
    if (p[0] > 104 || p[0] < 16) {
      right = !right;
      p = fromLeft(right);
    }
    return p;
  }

  dropBall() {
    const b = this.world.ball;
    b.x = Math.round(clamp(this.fx + (this.fx < 60 ? 16 : -20), BALL_AREA.x0, BALL_AREA.x1));
    b.y = Math.round(clamp(this.fy - 5, BALL_AREA.y0, BALL_AREA.y1));
  }

  step(t: number, dt: number) {
    if (!this.cur) {
      if (!this.q.length) this.q = this.idle();
      this.cur = this.q.shift()!;
      this.started = t;
      if ('go' in this.cur && typeof this.cur.go === 'function') this.cur = { go: this.cur.go() };
    }
    const s = this.cur;
    if ('go' in s) {
      const [tx, ty] = s.go as Point;
      const dx = tx - this.fx;
      const dy = ty - this.fy;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) {
        this.fx = tx;
        this.fy = ty;
        this.cur = null;
        this.step(t, 0); // 到了就直接接下一步，不要多走一格
        return;
      }
      this.pose = 'walk';
      if (Math.abs(dx) > 0.3) this.dir = Math.sign(dx);
      const v = Math.min(dist, (SPEED * dt) / 1000);
      this.fx += (dx / dist) * v;
      this.fy += (dy / dist) * v;
    } else if ('fn' in s) {
      s.fn(t);
      this.cur = null;
    } else {
      this.pose = s.pose;
      if (t - this.started >= s.dur) this.cur = null;
    }
  }

  /** 目前姿勢佔的範圍（點擊判定用） */
  box() {
    if (this.pose === 'walk') return { x: this.fx - WALK_W / 2, y: this.fy - WALK_H, w: WALK_W, h: WALK_H };
    if (this.pose === 'sleep') return { x: this.fx - LIE_W / 2, y: this.fy - LIE_H, w: LIE_W, h: LIE_H };
    return { x: this.fx - SIT_W / 2, y: this.fy - SIT_H, w: SIT_W + 2, h: SIT_H };
  }
}
