<script lang="ts">
  import { examDaysAway, saveSettings } from '../lib/store.svelte';

  let { onsettings }: { onsettings: () => void } = $props();
  let dismissed = $state(false);
  const days = $derived(examDaysAway());
</script>

{#if days !== null && days < 0 && !dismissed}
  <div class="backdrop">
    <div class="panel stack sheet">
      <h2>考試結束了，辛苦了！</h2>
      <p>接下來要怎麼種？</p>
      <div class="row">
        <button class="btn green" onclick={onsettings}>登記下一次考試</button>
        <button
          class="btn"
          onclick={async () => {
            dismissed = true;
            await saveSettings({ planMode: 'fixed', examDate: null });
          }}>改回自己設定每天的量</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
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
