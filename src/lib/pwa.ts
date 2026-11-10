// 離線用的 service worker：平常打開 App 就會自動抓新版；設定頁也可以手動檢查
import { registerSW } from 'virtual:pwa-register';

let reg: ServiceWorkerRegistration | undefined;

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, r) {
    reg = r;
  },
});

export const BUILD = __BUILD__;

export type UpdateResult = 'latest' | 'updating' | 'offline' | 'unsupported';

/** 問伺服器有沒有新版；有的話裝好後會自動重新載入 */
export async function checkForUpdate(): Promise<UpdateResult> {
  if (!reg) return 'unsupported';
  if (!navigator.onLine) return 'offline';
  try {
    await reg.update();
  } catch {
    return 'offline';
  }
  const sw = reg.installing ?? reg.waiting;
  if (!sw) return 'latest';
  if (sw.state === 'installed') await updateSW(true);
  // 還在下載的話，裝好後 autoUpdate 會自己重新載入
  return 'updating';
}
