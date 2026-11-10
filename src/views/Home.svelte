<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { knows, MAX_HEARTS, TRICKS, hearts } from '../lib/affection';
  import * as C from '../lib/collie';
  import { BALL_AREA, Dog, FLOOR } from '../lib/dog';
  import { envAt, envLabel } from '../lib/env';
  import { grammar, grammarQueue } from '../lib/grammar.svelte';
  import * as P from '../lib/pixel';
  import * as R from '../lib/room';
  import { fitStage } from '../lib/stage';
  import {
    app,
    canFeed,
    claimWatered,
    examDaysAway,
    feedDog,
    fruitCount,
    petDog,
    saveSettings,
    todaysQueue,
  } from '../lib/store.svelte';
  import ExamOver from '../components/ExamOver.svelte';

  let {
    onwater,
    onfarm,
    onpractice,
    ongrammar,
    onstats,
    onsettings,
  }: {
    onwater: () => void;
    onfarm: () => void;
    onpractice: () => void;
    ongrammar: () => void;
    onstats: () => void;
    onsettings: () => void;
  } = $props();

  const W = 120;
  const H = 210;

  let wrap: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let size = $state({ w: 240, h: 420 });
  let nameDraft = $state('');

  const queue = $derived.by(() => {
    void app.cards;
    void app.daily.planted;
    void app.daily.reviewed;
    return todaysQueue(app.now);
  });
  const examDays = $derived(examDaysAway());
  const waterLabel = $derived(queue.reviews.length ? '去澆水' : queue.seeds.length ? '去播種' : '自由翻卡');
  const fruits = $derived(fruitCount());
  const name = $derived(app.settings.dogName || '邊牧');
  const env = $derived(envAt(app.now));
  /** 黑板：今天要複習、可以新學的文法點 */
  const gram = $derived.by(() => {
    if (!grammar.ready) return { due: 0, fresh: 0 };
    const q = grammarQueue(app.now);
    return { due: q.reviews.length, fresh: q.fresh.length };
  });

  // ---- 不會動的部分先畫好 ----
  let roomImg: HTMLCanvasElement | null = null;
  $effect(() => {
    const water = queue.reviews.length;
    const seeds = queue.seeds.length;
    const line2 = examDays === null ? '今天的種子' : examDays >= 0 ? `離考試 ${examDays} 天・種子` : '考試日已過';
    const label = waterLabel;
    const gramDue = gram.due;
    const o = document.createElement('canvas');
    o.width = W * P.S;
    o.height = H * P.S;
    const c = o.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    R.room(c);
    if (gramDue) R.boardBadge(c);
    P.panel(c, 4, 4, 100, 27);
    P.ptext(c, '今天要澆水', 18, 17, P.INK);
    P.ptext(c, `${water} 株`, 198, 17, water ? P.RED_INK : P.INK, null, 'right');
    P.ptext(c, line2, 18, 35, P.INK);
    P.ptext(c, `${seeds} 顆`, 198, 35, P.INK, null, 'right');
    P.ptext(c, label, (R.WATER_BTN.x + R.WATER_BTN.w / 2) * P.S, 383, '#1d3d6b', null, 'center');
    roomImg = o;
  });

  // ---- 邊牧與網球 ----
  const ball = { x: 30, y: 158 };
  let flight: { x0: number; y0: number; t0: number } | null = null;
  const dog = new Dog({
    ball,
    knows: (t) => knows(app.profile.affection, t),
    wantsWater: () => queue.reviews.length > 0,
  });
  if (knows(app.profile.affection, 'greet')) {
    dog.fx = 16;
    dog.fy = 150;
    dog.do(dog.greet());
  }

  // ---- 互動狀態 ----
  type Hit = { kind: 'dog' } | { kind: 'ball' } | { kind: 'floor'; x: number; y: number } | { kind: 'spot'; spot: Spot };
  interface Spot {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    label: () => string | null;
    ax: number;
    ay: number;
    act: () => void;
  }
  let mouse: [number, number] | null = null;
  let hover: Hit | null = null;
  let flash: { text: string; ax: number; ay: number; until: number } | null = null;
  let toast: { lines: [string, string]; until: number } | null = null;
  let bubbleUntil = 0;
  let bowlFull = false;
  let bowlEmptyAt = 0;
  const pops: { x: number; y: number; t0: number }[] = [];

  const SPOTS: Spot[] = [
    { id: 'farm', x: 3, y: 71, w: 26, h: 47, label: () => '農場', ax: 16, ay: 61, act: () => onfarm() },
    { id: 'cards', x: 87, y: 67, w: 30, h: 51, label: () => '翻卡', ax: 102, ay: 57, act: () => onpractice() },
    { id: 'stats', x: 92, y: 34, w: 23, h: 26, label: () => '紀錄', ax: 103, ay: 60, act: () => onstats() },
    {
      id: 'grammar',
      x: 3,
      y: 34,
      w: 27,
      h: 23,
      label: () => (gram.due ? `文法（複習 ${gram.due}）` : gram.fresh ? `文法（新的 ${gram.fresh}）` : '文法練習'),
      ax: 17,
      ay: 58,
      act: () => ongrammar(),
    },
    { id: 'settings', x: 106, y: 6, w: 13, h: 14, label: () => '設定', ax: 111, ay: 20, act: () => onsettings() },
    { id: 'feed', x: 2, y: 183, w: 48, h: 14, label: () => `餵食（果實 ×${fruits}）`, ax: 28, ay: 172, act: feed },
    { id: 'window', x: 36, y: 34, w: 44, h: 44, label: () => envLabel(env), ax: 58, ay: 79, act: () => showFlash('window') },
    { id: 'water', ...R.WATER_BTN, label: () => null, ax: 0, ay: 0, act: water },
  ];
  const spot = (id: string) => SPOTS.find((s) => s.id === id)!;
  const inside = (ax: number, ay: number, b: { x: number; y: number; w: number; h: number }) =>
    ax >= b.x && ax < b.x + b.w && ay >= b.y && ay < b.y + b.h;

  function ballOnFloor() {
    return !dog.carry && dog.pose !== 'ball';
  }

  function hitAt(ax: number, ay: number): Hit | null {
    if (inside(ax, ay, dog.box())) return { kind: 'dog' };
    if (ballOnFloor() && knows(app.profile.affection, 'throw') && inside(ax, ay, { x: ball.x - 3, y: ball.y - 3, w: 10, h: 10 }))
      return { kind: 'ball' };
    const s = SPOTS.find((sp) => inside(ax, ay, sp));
    if (s) return { kind: 'spot', spot: s };
    if (knows(app.profile.affection, 'follow') && ay >= FLOOR.y0 - 6 && ay <= FLOOR.y1 + 4) return { kind: 'floor', x: ax, y: ay };
    return null;
  }

  function showFlash(id: string, text?: string) {
    const s = spot(id);
    const t = text ?? s.label();
    if (t) flash = { text: t, ax: s.ax, ay: s.ay, until: performance.now() + 1800 };
  }

  function popHearts(n = 3) {
    const t = performance.now();
    for (let i = 0; i < n; i++) pops.push({ x: dog.fx - 7 + i * 4, y: dog.fy - 32, t0: t + i * 220 });
  }

  function heartToast(h: number) {
    if (!h) return;
    const trick = TRICKS.find((x) => x.heart === h);
    toast = { lines: [`好感度到 ${h} 顆心了！`, trick ? `學會：${trick.label}` : ''], until: performance.now() + 4000 };
  }

  async function pet() {
    const t = performance.now();
    if (dog.pose === 'sleep') dog.do(dog.wake());
    bubbleUntil = t + 3000;
    dog.wagUntil = t + 2500;
    dog.hopUntil = t + 350;
    const r = await petDog();
    if (r.gained) popHearts(1);
    heartToast(r.heart);
  }

  function feed() {
    const can = canFeed();
    if (can === 'empty') return showFlash('feed', '還沒有果實喔');
    if (can === 'full') return showFlash('feed', `${name}今天吃飽了`);
    bowlFull = true;
    dog.do(
      dog.eat(async (t) => {
        bowlEmptyAt = t + 2500;
        dog.wagUntil = t + 2500;
        const r = await feedDog();
        if (r.ok) {
          popHearts();
          heartToast(r.heart);
        }
      }),
    );
  }

  function water() {
    if (queue.reviews.length || queue.seeds.length) onwater();
    else onpractice();
  }

  function throwBall() {
    flight = { x0: ball.x, y0: ball.y, t0: performance.now() };
    ball.x = Math.round(BALL_AREA.x0 + Math.random() * (BALL_AREA.x1 - BALL_AREA.x0));
    ball.y = Math.round(BALL_AREA.y0 + Math.random() * (BALL_AREA.y1 - BALL_AREA.y0));
    dog.do([{ pose: 'sit', dur: 500 }, ...dog.fetch([60, 176])]);
  }

  function tap(h: Hit | null) {
    if (!h) return;
    if (h.kind === 'dog') void pet();
    else if (h.kind === 'ball') throwBall();
    else if (h.kind === 'floor') dog.do(dog.goTo(h.x, h.y));
    else h.spot.act();
  }

  // 今天的水澆完了：好感度加一次
  $effect(() => {
    void queue;
    untrack(() => {
      void claimWatered().then((h) => {
        if (h === null) return;
        popHearts();
        heartToast(h);
      });
    });
  });

  // ---- 指標：滑鼠移上去、手機長按才顯示名字 ----
  let lpTimer: ReturnType<typeof setTimeout> | undefined;
  let lpShown = false;

  function artXY(e: PointerEvent): [number, number] {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  }

  function onmove(e: PointerEvent) {
    if (e.pointerType === 'mouse') mouse = artXY(e);
  }
  function onleave() {
    mouse = null;
    hover = null;
  }
  function ondown(e: PointerEvent) {
    if (e.pointerType === 'mouse') return;
    const p = artXY(e);
    clearTimeout(lpTimer);
    lpTimer = setTimeout(() => {
      hover = hitAt(...p);
      lpShown = true;
    }, 450);
  }
  function onup(e: PointerEvent) {
    clearTimeout(lpTimer);
    if (lpShown) {
      lpShown = false;
      setTimeout(() => (hover = null), 1500);
      return;
    }
    tap(hitAt(...artXY(e)));
  }

  // ---- 每一格 ----
  function tag(c: CanvasRenderingContext2D, text: string, ax: number, ay: number) {
    const m = P.bitmap(text, P.LABEL);
    const w = Math.ceil(m.width / P.S) + 4;
    const x = Math.max(1, Math.min(W - 1 - w, Math.round(ax - w / 2)));
    P.box(c, x, ay, w, 10, '#5a3214');
    P.rect(c, x + 1, ay + 1, w - 2, 1, '#8a5428');
    c.drawImage(m, (x + 2) * P.S, (ay + 1) * P.S + 1);
  }

  function bubble(c: CanvasRenderingContext2D) {
    const b = dog.box();
    const m = P.bitmap(name, P.INK);
    const w = Math.max(Math.ceil(m.width / P.S) + 6, 38);
    const h = 20;
    const x = Math.max(1, Math.min(W - 1 - w, Math.round(dog.fx - w / 2)));
    const y = Math.max(33, Math.round(b.y) - h - 4);
    P.box(c, x, y, w, h, '#f3dcaa');
    c.drawImage(m, Math.round(x + w / 2 - m.width / P.S / 2) * P.S, (y + 1) * P.S + 1);
    const n = hearts(app.profile.affection);
    for (let i = 0; i < MAX_HEARTS; i++) R.heart(c, x + Math.round(w / 2) - 15 + i * 6, y + 12, i < n);
    const tx = Math.max(x + 3, Math.min(x + w - 5, Math.round(dog.fx)));
    P.rect(c, tx, y + h - 1, 3, 1, '#f3dcaa');
    P.rect(c, tx, y + h - 1, 1, 2, P.OUT);
    P.rect(c, tx + 2, y + h - 1, 1, 2, P.OUT);
    P.px(c, tx + 1, y + h, '#f3dcaa');
    P.px(c, tx + 1, y + h + 1, P.OUT);
  }

  function drawToast(c: CanvasRenderingContext2D) {
    if (!toast) return;
    P.panel(c, 6, 33, 108, 30);
    P.ptext(c, toast.lines[0], 120, 80, P.INK, null, 'center');
    if (toast.lines[1]) P.ptext(c, toast.lines[1], 120, 98, '#1d3d6b', null, 'center');
  }

  function drawDog(c: CanvasRenderingContext2D, t: number) {
    const pal = C.DOG_PAL;
    const ol = C.DOG_OUTLINE;
    if (dog.pose === 'walk') {
      const fr = Math.floor(t / 170) % 2;
      const bob = fr ? 0 : 1;
      const left = dog.fx - C.WALK_W / 2;
      const top = dog.fy - C.WALK_H - bob;
      P.blit(c, P.cached(fr ? 'walkB' : 'walkA', fr ? C.WALK_B : C.WALK_A, pal, ol, dog.dir < 0), left, top);
      if (dog.carry) {
        const mx = dog.dir > 0 ? C.MOUTH_X : C.WALK_W - C.MOUTH_X - 4;
        P.blit(c, P.cached('tennis', C.TENNIS, C.TENNIS_PAL, ol), left + mx, top + C.MOUTH_Y);
      }
      return;
    }
    if (dog.pose === 'sleep') {
      P.blit(c, P.cached('lie', C.LIE, pal, ol), dog.fx - C.LIE_W / 2, dog.fy - C.LIE_H);
      return;
    }
    const fast = t < dog.wagUntil;
    const wagging = fast || Math.floor(t / 3000) % 3 === 0;
    const tf = wagging && Math.floor(t / (fast ? 110 : 600)) % 2 === 1;
    const yo = t < dog.hopUntil ? -Math.round(3 * Math.sin(((dog.hopUntil - t) / 350) * Math.PI)) : 0;
    P.blit(c, P.cached(tf ? 'tailB' : 'tailA', tf ? C.TAIL_B : C.TAIL_A, pal, ol), dog.fx + 8, dog.fy - 10 + yo);
    const blink = t % 4300 < 150;
    const isBall = dog.pose === 'ball';
    const rows = isBall ? (blink ? C.BALL_BLINK : C.BALL) : blink ? C.SIT_BLINK : C.SIT;
    P.blit(c, P.cached(`${isBall ? 'ball' : 'sit'}${blink ? 'B' : ''}`, rows, pal, ol), dog.fx - C.SIT_W / 2, dog.fy - C.SIT_H + yo);
  }

  function draw(t: number) {
    if (!canvas || !roomImg) return;
    const c = canvas.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.drawImage(roomImg, 0, 0);
    R.windowView(c, env, t, Math.min(5, queue.reviews.length));

    if (ballOnFloor()) {
      let { x, y } = ball;
      if (flight) {
        const p = (t - flight.t0) / 450;
        if (p >= 1) flight = null;
        else {
          x = flight.x0 + (ball.x - flight.x0) * p;
          y = flight.y0 + (ball.y - flight.y0) * p - Math.sin(p * Math.PI) * 14;
        }
      }
      P.blit(c, P.cached('tennis', C.TENNIS, C.TENNIS_PAL, C.DOG_OUTLINE), x, y);
    }
    drawDog(c, t);
    if (dog.fx > R.BED.x + 4 && dog.fy <= R.BED.y + 12) R.bedFront(c);

    P.blit(c, P.cached('basket', P.BASKET, P.BPAL, P.OUT), R.BASKET_AT.x, R.BASKET_AT.y);
    P.ptext(c, `×${fruits}`, 32, 372, P.LABEL, '#3a2414');
    if (bowlEmptyAt && t > bowlEmptyAt) {
      bowlFull = false;
      bowlEmptyAt = 0;
    }
    R.bowl(c, bowlFull);
    R.lighting(c, env);

    if (dog.pose === 'sleep') {
      const k = (t / 900) % 2;
      const z = P.cached('zz', C.ZZ, { Z: P.LABEL }, P.OUT);
      P.blit(c, z, dog.fx + 9 + k * 2, dog.fy - 26 - k * 4);
      if (k > 1) P.blit(c, z, dog.fx + 5, dog.fy - 24);
    }
    if (dog.begging && dog.pose === 'sit') P.drop(c, dog.fx - 2, dog.fy - 38 - (Math.floor(t / 400) % 2));
    for (let i = pops.length - 1; i >= 0; i--) {
      const a = t - pops[i].t0;
      if (a < 0) continue;
      if (a > 1100) pops.splice(i, 1);
      else R.heart(c, pops[i].x, pops[i].y - Math.round(a / 90), true);
    }

    if (mouse) {
      hover = hitAt(...mouse);
      canvas.style.cursor = hover ? 'pointer' : 'default';
    }
    if (flash && t > flash.until) flash = null;
    if (toast && t > toast.until) toast = null;
    if (hover?.kind === 'dog' || t < bubbleUntil) bubble(c);
    else if (hover?.kind === 'spot' && hover.spot.label()) tag(c, hover.spot.label()!, hover.spot.ax, hover.spot.ay);
    else if (flash) tag(c, flash.text, flash.ax, flash.ay);
    drawToast(c);
  }

  onMount(() => {
    const fit = () => wrap && (size = fitStage(wrap));
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    fit();
    let raf = 0;
    let last = 0;
    let lastDraw = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min(100, now - last) : 16;
      last = now;
      dog.step(now, dt);
      if (now - lastDraw > 60) {
        draw(now);
        lastDraw = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      clearTimeout(lpTimer);
    };
  });

  const u = $derived(size.w / W);
  const pos = (b: { x: number; y: number; w: number; h: number }) =>
    `left:${b.x * u}px;top:${b.y * u}px;width:${b.w * u}px;height:${b.h * u}px`;
</script>

<div class="wrap" bind:this={wrap}>
  <div class="stage" style="width:{size.w}px;height:{size.h}px">
    <canvas
      bind:this={canvas}
      width={W * P.S}
      height={H * P.S}
      style="width:{size.w}px;height:{size.h}px"
      onpointermove={onmove}
      onpointerleave={onleave}
      onpointerdown={ondown}
      onpointerup={onup}
      onpointercancel={() => clearTimeout(lpTimer)}
      oncontextmenu={(e) => e.preventDefault()}
    ></canvas>
    <!-- 給鍵盤和螢幕閱讀器用；滑鼠和手指由畫布處理 -->
    <button class="hit" style={pos({ x: 36, y: 146, w: 48, h: 30 })} aria-label="摸摸{name}" onclick={pet}></button>
    {#each SPOTS as s (s.id)}
      <button class="hit" style={pos(s)} aria-label={s.id === 'water' ? waterLabel : s.label()} onclick={s.act}></button>
    {/each}
  </div>
</div>

<ExamOver {onsettings} />

{#if !app.settings.dogName}
  <div class="backdrop">
    <form
      class="panel stack sheet"
      onsubmit={(e) => {
        e.preventDefault();
        const n = nameDraft.trim();
        if (n) void saveSettings({ dogName: n });
      }}
    >
      <h2>幫你的邊牧取名字</h2>
      <input bind:value={nameDraft} maxlength="10" size="10" placeholder="名字" aria-label="邊牧的名字" />
      <button class="btn green" disabled={!nameDraft.trim()}>好了</button>
    </form>
  </div>
{/if}

<style>
  .wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stage {
    position: relative;
  }
  canvas {
    display: block;
    image-rendering: pixelated;
    box-shadow: 0 0 0 3px var(--out);
    touch-action: manipulation;
    -webkit-touch-callout: none;
  }
  .hit {
    position: absolute;
    background: none;
    border: 0;
    padding: 0;
    pointer-events: none;
  }
  .hit:focus-visible {
    outline: 3px solid #fff3b0;
  }
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(20 30 10 / 0.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 12px 12px calc(env(safe-area-inset-bottom) + 12px);
    z-index: 20;
  }
  .sheet {
    width: 100%;
    max-width: 520px;
  }
</style>
