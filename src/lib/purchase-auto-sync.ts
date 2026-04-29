import { prisma } from '@/lib/prismadb';
import {
  countUnsyncedPurchaseRows,
  hasSyncStateTable,
  syncMaterialStorageFromPurchase,
} from '@/lib/services/inventory-ops-service';

const g = globalThis as typeof globalThis & { __pxPurchaseAutoSyncStarted?: boolean };

type SignalState = 'missing' | 'idle' | 'pending';

async function readPurchaseSignal(): Promise<SignalState> {
  try {
    const rows = await prisma.$queryRaw<Array<{ pending: number | bigint | null }>>`
      SELECT pending FROM PurchaseWarehouseSyncSignal WHERE id = 1 LIMIT 1
    `;
    const p = rows[0]?.pending;
    const n = p == null ? 0 : Number(p);
    return n === 1 ? 'pending' : 'idle';
  } catch {
    return 'missing';
  }
}

async function clearPurchaseSignalPending(): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE PurchaseWarehouseSyncSignal SET pending = 0 WHERE id = 1
    `;
  } catch {
    /* optional table */
  }
}

async function setPurchaseSignalPending(): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO PurchaseWarehouseSyncSignal (id, pending)
      VALUES (1, 1)
      ON DUPLICATE KEY UPDATE pending = 1, updated_at = CURRENT_TIMESTAMP
    `;
  } catch {
    /* optional table */
  }
}

/**
 * 长驻 Node（pm2 `next start`）下增量同步采购入库 → MaterialStorage。
 *
 * - `PURCHASE_AUTO_SYNC_INTERVAL_MS`：轮询间隔毫秒，≥5000 启用；**15000 = 15 秒**（非 1.5 秒）。
 * - `PURCHASE_AUTO_SYNC_MAX_ROWS`：每次同步最多处理的入库行（默认 1000）。
 * - 若已执行 `prisma/sql/purchase_warehouse_sync_signal.sql`，入库表 INSERT/UPDATE 会置 `pending=1`；
 *   轮询时 **pending=0 只做单行查询、不对 PurchaseWarehouse 做 COUNT**，省资源。
 * - `PURCHASE_AUTO_SYNC_USE_SIGNAL=0`：不使用信号表，每次间隔都对「未同步行数」做 COUNT（兼容未建表环境）。
 *
 * Serverless / 无长进程时用 Cron：`POST /api/cron/sync-purchase-material`。
 */
export function startPurchaseIncrementalAutoSyncIfEnabled(): void {
  if (g.__pxPurchaseAutoSyncStarted) return;

  const raw = process.env.PURCHASE_AUTO_SYNC_INTERVAL_MS?.trim();
  const ms = raw ? parseInt(raw, 10) : 0;
  if (!Number.isFinite(ms) || ms < 5000) return;

  const useSignal = process.env.PURCHASE_AUTO_SYNC_USE_SIGNAL?.trim() !== '0';

  const maxRowsRaw = process.env.PURCHASE_AUTO_SYNC_MAX_ROWS?.trim();
  let maxRows = maxRowsRaw ? parseInt(maxRowsRaw, 10) : 1000;
  if (!Number.isFinite(maxRows) || maxRows < 1) maxRows = 1000;
  maxRows = Math.min(10000, Math.max(100, maxRows));

  g.__pxPurchaseAutoSyncStarted = true;

  let running = false;

  const tick = async () => {
    if (running) return;
    try {
      if (!(await hasSyncStateTable())) return;

      let shouldSync = false;

      if (useSignal) {
        const sig = await readPurchaseSignal();
        if (sig === 'missing') {
          const pending = await countUnsyncedPurchaseRows();
          shouldSync = pending > 0;
        } else if (sig === 'pending') {
          shouldSync = true;
        } else {
          return;
        }
      } else {
        const pending = await countUnsyncedPurchaseRows();
        if (pending === 0) return;
        shouldSync = true;
      }

      if (!shouldSync) return;

      running = true;
      await syncMaterialStorageFromPurchase({
        maxRows,
        trigger: 'auto_interval',
      });

      const remaining = await countUnsyncedPurchaseRows();
      if (!useSignal) return;
      const sigState = await readPurchaseSignal();
      if (sigState === 'missing') return;
      if (remaining === 0) await clearPurchaseSignalPending();
      else await setPurchaseSignalPending();
    } catch (e) {
      console.error('[purchase-auto-sync]', e);
    } finally {
      running = false;
    }
  };

  setInterval(tick, ms);
  void tick();
}
