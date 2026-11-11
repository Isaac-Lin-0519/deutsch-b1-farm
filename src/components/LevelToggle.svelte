<script lang="ts">
  import { LEVEL_NAMES } from '../lib/region';
  import type { RegionLevel } from '../lib/types';

  let { value, label, onchange }: { value: RegionLevel; label: string; onchange: (v: RegionLevel) => void } = $props();

  const STEPS: RegionLevel[] = ['none', 'mid', 'high'];
  const idx = $derived(STEPS.indexOf(value));
</script>

<div class="wrap" role="radiogroup" aria-label={label}>
  <div class="track" style="--i: {idx}">
    <div class="fill" data-v={value}></div>
    <div class="knob"></div>
    {#each STEPS as s (s)}
      <button type="button" role="radio" aria-checked={s === value} aria-label={LEVEL_NAMES[s]} class="hit" onclick={() => onchange(s)}></button>
    {/each}
  </div>
  <div class="names" aria-hidden="true">
    {#each STEPS as s (s)}<span class:on={s === value}>{LEVEL_NAMES[s]}</span>{/each}
  </div>
</div>

<style>
  .wrap {
    --cell: calc(var(--u) * 14);
    display: inline-block;
  }
  .track {
    position: relative;
    display: flex;
    width: calc(var(--cell) * 3 + var(--u) * 2);
    height: calc(var(--u) * 11);
    background: #cfc6b2;
    border: var(--u) solid var(--out);
    clip-path: polygon(
      0 var(--u),
      var(--u) var(--u),
      var(--u) 0,
      calc(100% - var(--u)) 0,
      calc(100% - var(--u)) var(--u),
      100% var(--u),
      100% calc(100% - var(--u)),
      calc(100% - var(--u)) calc(100% - var(--u)),
      calc(100% - var(--u)) 100%,
      var(--u) 100%,
      var(--u) calc(100% - var(--u)),
      0 calc(100% - var(--u))
    );
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: calc(var(--cell) * (var(--i) + 1));
    background: #b08a5c;
    transition: width 0.12s steps(3);
  }
  .fill[data-v='mid'] {
    background: #b8d040;
  }
  .fill[data-v='high'] {
    background: #3f8f2f;
  }
  .knob {
    position: absolute;
    top: calc(var(--u) * -1);
    bottom: calc(var(--u) * -1);
    left: calc(var(--cell) * var(--i) - var(--u) * 1);
    width: calc(var(--cell) + var(--u) * 2);
    background: var(--paper-hi);
    border: var(--u) solid var(--out);
    box-shadow:
      inset 0 calc(var(--u) * -1) 0 var(--paper-lo),
      inset 0 var(--u) 0 #fff;
    transition: left 0.12s steps(3);
    pointer-events: none;
  }
  .hit {
    position: relative;
    flex: 1;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    z-index: 1;
  }
  .hit:focus-visible {
    outline: var(--u) solid var(--yellow);
    outline-offset: calc(var(--u) * -1);
  }
  .names {
    display: flex;
    margin: var(--u) 0 0 var(--u);
    font-size: calc(var(--fs) * 0.75);
    color: var(--ink-soft);
  }
  .names span {
    width: var(--cell);
    text-align: center;
  }
  .names span.on {
    color: var(--ink);
  }
</style>
