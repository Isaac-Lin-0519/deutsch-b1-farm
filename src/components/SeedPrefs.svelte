<script lang="ts">
  import { levelShares } from '../lib/plan';
  import { REGION_NAMES } from '../lib/region';
  import { plantedSet, app } from '../lib/store.svelte';
  import { LEVELS, REGIONS, type Amount, type Level, type LevelPrefs, type Region, type RegionPrefs } from '../lib/types';
  import LevelToggle from './LevelToggle.svelte';

  let {
    levels,
    regions,
    onlevels,
    onregions,
  }: { levels: LevelPrefs; regions: RegionPrefs; onlevels: (v: LevelPrefs) => void; onregions: (v: RegionPrefs) => void } = $props();

  const shares = $derived(levelShares(app.words, levels, plantedSet(), regions));
  const note = $derived(
    LEVELS.filter((l) => shares[l] > 0)
      .map((l) => `${Math.round(shares[l] * 100)}% ${l}`)
      .join('、'),
  );
</script>

<h3>各等級的新字</h3>
{#each LEVELS as l (l)}
  <div class="row">
    <span class="nm">{l}</span>
    <LevelToggle value={levels[l]} label={l} onchange={(v: Amount) => onlevels({ ...levels, [l as Level]: v })} />
  </div>
{/each}
<p class="soft">
  高＝多種一些、中＝少種一些、無＝不種。每天的新字照這個比例從各等級抽，某個等級種完了，就由其他等級補上。
  {note ? `新字大約是 ${note}。` : '現在沒有可以種的字，至少要開一個等級。'}
</p>

<h3>德奧瑞說法</h3>
{#each REGIONS as r (r)}
  <div class="row">
    <span class="nm">{REGION_NAMES[r]}</span>
    <LevelToggle value={regions[r]} label={REGION_NAMES[r]} onchange={(v: Amount) => onregions({ ...regions, [r as Region]: v })} />
  </div>
{/each}
<p class="soft">各地區的說法分別設定。一個字在好幾個地區都用，就看最高的那個；三地通用的字不受影響。已經種下的字照常澆水。</p>

<style>
  .nm {
    min-width: 5em;
  }
</style>
