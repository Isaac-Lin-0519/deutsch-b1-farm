<script lang="ts">
  import * as C from '../lib/collie';
  import * as P from '../lib/pixel';

  let canvas: HTMLCanvasElement;

  $effect(() => {
    const c = canvas.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, canvas.width, canvas.height);
    P.blit(c, P.cached('tailA', C.TAIL_A, C.DOG_PAL, C.DOG_OUTLINE), 23, 19);
    P.blit(c, P.cached('sit', C.SIT, C.DOG_PAL, C.DOG_OUTLINE), 1, 1);
  });
</script>

<canvas bind:this={canvas} width={34 * P.S} height={30 * P.S} aria-hidden="true"></canvas>

<style>
  canvas {
    width: calc(var(--u) * 34);
    height: calc(var(--u) * 30);
    image-rendering: pixelated;
    flex: none;
  }
</style>
