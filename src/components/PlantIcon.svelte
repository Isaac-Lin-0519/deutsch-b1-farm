<script lang="ts">
  import * as P from '../lib/pixel';
  import type { FruitKind, Stage } from '../lib/types';

  let { stage, fruit = 'other', dry = false }: { stage: Stage; fruit?: FruitKind; dry?: boolean } = $props();
  let canvas: HTMLCanvasElement;

  $effect(() => {
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, canvas.width, canvas.height);
    P.soil(c, 1, 1, dry);
    P.crop(c, stage, 1, 1, fruit);
  });
</script>

<canvas bind:this={canvas} width={18 * P.S} height={18 * P.S}></canvas>

<style>
  canvas {
    width: calc(var(--u) * 18);
    height: calc(var(--u) * 18);
    image-rendering: pixelated;
    flex: none;
  }
</style>
