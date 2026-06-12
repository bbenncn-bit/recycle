'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const PROCESSING_COST_PER_TON = 70;

type ProductItem = {
  id: string;
  name: string;
  warehouse: string;
  stockQty: number;
  totalProcessedQty: number;
  totalSalesQty: number;
  currentPrice: number;
};

function formatProductStockTons(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

type MaterialRow = {
  name: string;
  shortName: string;
  currentPrice: number;
  stockQty: number;
  totalPurchaseQty: number;
  totalProcessingUsageQty: number;
  key: string;
  selected: boolean;
  tons: string;
};

type SelectedMaterial = {
  warehouse: string;
  material: string;
  shortName: string;
  currentPrice: number;
  tons: string;
};

type MyOrder = {
  id: number;
  product_name?: string;
  product_warehouse?: string;
  production_date?: string;
  dailyProcess_qty?: number;
  product_tons?: number;
};

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatHm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function materialKey(warehouse: string, material: string): string {
  return `${warehouse}|${material}`;
}

function buildProductionDateString(ymd: string, hm: string): string {
  const datePart = (ymd || '').trim();
  const timePart = (hm || '08:00').trim();
  if (!datePart) return '';
  return `${datePart} ${timePart}`;
}

export default function ProductionEntryPage() {
  const now = useMemo(() => new Date(), []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [operatorName, setOperatorName] = useState('');

  const [productList, setProductList] = useState<ProductItem[]>([]);
  const [warehouseList, setWarehouseList] = useState<string[]>([]);
  const [warehouseMaterials, setWarehouseMaterials] = useState<
    Record<
      string,
      Array<{
        name: string;
        shortName: string;
        currentPrice: number;
        stockQty: number;
        totalPurchaseQty: number;
        totalProcessingUsageQty: number;
      }>
    >
  >({});

  const [productionDateYmd, setProductionDateYmd] = useState(() => formatYmd(now));
  const [productionTimeHm, setProductionTimeHm] = useState(() => formatHm(now));

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedProductPrice, setSelectedProductPrice] = useState(0);

  const [selectedWarehouseArea, setSelectedWarehouseArea] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [productTons, setProductTons] = useState(0);
  const [productTonsInput, setProductTonsInput] = useState('');
  const [autoCalculated, setAutoCalculated] = useState(false);

  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferProductName, setTransferProductName] = useState('');
  const [transferFromWarehouse, setTransferFromWarehouse] = useState('');
  const [transferMaxQty, setTransferMaxQty] = useState<number | null>(null);
  const [transferQuantity, setTransferQuantity] = useState('');
  const [transferDestinations, setTransferDestinations] = useState<
    Array<{ warehouse: string; productName: string }>
  >([]);
  const [transferToIndex, setTransferToIndex] = useState(0);

  const [costConfirmOpen, setCostConfirmOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{
    sel: SelectedMaterial[];
    productionDate: string;
  } | null>(null);

  const displayMaterials = useMemo(
    () => selectedMaterials.filter((m) => parseFloat(m.tons) > 0),
    [selectedMaterials]
  );

  const totalMaterialTons = useMemo(() => {
    const total = displayMaterials.reduce((s, m) => s + (parseFloat(m.tons) || 0), 0);
    return Math.round(total * 1000) / 1000;
  }, [displayMaterials]);

  const { materialCost, processingCost, totalCost, revenue, costOverRevenue } = useMemo(() => {
    let materialCost = 0;
    for (const m of displayMaterials) {
      materialCost += (parseFloat(m.tons) || 0) * (parseFloat(String(m.currentPrice)) || 0);
    }
    const processingCost = PROCESSING_COST_PER_TON * productTons;
    const totalCost = materialCost + processingCost;
    const revenue = selectedProductPrice * productTons;
    const costOverRevenue = totalCost > revenue && productTons > 0;
    return { materialCost, processingCost, totalCost, revenue, costOverRevenue };
  }, [displayMaterials, productTons, selectedProductPrice]);

  const canSubmit =
    !!selectedProduct &&
    productTons > 0 &&
    totalMaterialTons >= productTons &&
    displayMaterials.length > 0;

  const materialsInCurrentWarehouse: MaterialRow[] = useMemo(() => {
    const wh = selectedWarehouseArea;
    const list = wh ? warehouseMaterials[wh] || [] : [];
    return list.map((m) => {
      const key = materialKey(wh, m.name);
      const sel = selectedMaterials.find(
        (s) => materialKey(s.warehouse, s.material) === key
      );
      return {
        ...m,
        key,
        selected: !!sel,
        tons: sel?.tons ?? '',
      };
    });
  }, [selectedWarehouseArea, warehouseMaterials, selectedMaterials]);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/profit-management/production-entry', {
        credentials: 'include',
      });
      if (res.status === 401) {
        const from = encodeURIComponent('/profit-management/production-entry');
        window.location.href = `/profit-management/operations/login?from=${from}`;
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '加载失败');
      setProductList(json.productList || []);
      setWarehouseList(json.warehouseList || []);
      setWarehouseMaterials(json.warehouseMaterials || {});
      setOperatorName(json.operator?.username || '');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyOrders = useCallback(async () => {
    setMyOrdersLoading(true);
    try {
      const res = await fetch('/api/profit-management/production-entry?orders=1', {
        credentials: 'include',
      });
      const json = await res.json();
      setMyOrders(json.list || []);
    } catch {
      setMyOrders([]);
    } finally {
      setMyOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
    loadMyOrders();
  }, [loadBootstrap, loadMyOrders]);

  function selectProduct(item: ProductItem) {
    setSelectedProduct(item.name);
    setSelectedWarehouse(item.warehouse);
    setSelectedProductPrice(item.currentPrice || 0);
    if (!selectedWarehouseArea && warehouseList.length) {
      setSelectedWarehouseArea(warehouseList[0]);
    }
  }

  function openTransferModal(item: ProductItem) {
    const destinations = productList
      .filter((p) => p.name === item.name && p.warehouse !== item.warehouse)
      .map((p) => ({ warehouse: p.warehouse, productName: p.name }));
    if (!destinations.length) {
      setMessage({ type: 'err', text: '没有可移入的其它库区' });
      return;
    }
    setTransferProductName(item.name);
    setTransferFromWarehouse(item.warehouse);
    setTransferMaxQty(Math.max(0, item.stockQty));
    setTransferQuantity('');
    setTransferDestinations(destinations);
    setTransferToIndex(0);
    setTransferOpen(true);
  }

  async function confirmTransfer() {
    const toDest = transferDestinations[transferToIndex];
    const quantity = parseFloat(transferQuantity);
    if (!quantity || quantity <= 0) {
      setMessage({ type: 'err', text: '请输入有效移库重量' });
      return;
    }
    if (transferMaxQty != null && quantity > transferMaxQty) {
      setMessage({ type: 'err', text: `当前库存仅 ${transferMaxQty} 吨` });
      return;
    }
    if (!toDest) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/profit-management/production-entry', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer',
          productName: transferProductName,
          fromWarehouse: transferFromWarehouse,
          toProductName: toDest.productName,
          toWarehouse: toDest.warehouse,
          quantity,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '移库失败');
      setMessage({ type: 'ok', text: '移库成功' });
      setTransferOpen(false);
      await loadBootstrap();
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : '移库失败' });
    } finally {
      setSubmitting(false);
    }
  }

  function toggleMaterial(row: MaterialRow) {
    const wh = selectedWarehouseArea;
    if (!wh) return;
    const key = row.key;
    let sel = [...selectedMaterials];
    const idx = sel.findIndex((m) => materialKey(m.warehouse, m.material) === key);
    if (idx >= 0) {
      sel.splice(idx, 1);
    } else {
      sel.push({
        warehouse: wh,
        material: row.name,
        shortName: row.shortName,
        currentPrice: row.currentPrice,
        tons: '',
      });
    }
    setSelectedMaterials(sel);
    queueMicrotask(() => {
      autoCalculateProductTons(sel);
    });
  }

  function onMaterialTonsChange(key: string, value: string, row: MaterialRow) {
    const wh = selectedWarehouseArea;
    let sel = [...selectedMaterials];
    const rec = sel.find((m) => materialKey(m.warehouse, m.material) === key);
    if (rec) {
      rec.tons = value;
    } else {
      sel.push({
        warehouse: wh,
        material: row.name,
        shortName: row.shortName,
        currentPrice: row.currentPrice,
        tons: value,
      });
    }
    setSelectedMaterials(sel);
    queueMicrotask(() => autoCalculateProductTons(sel));
  }

  function autoCalculateProductTons(sel: SelectedMaterial[]) {
    const filled = sel.filter((m) => parseFloat(m.tons) > 0);
    if (!filled.length) return;
    const total = filled.reduce((s, m) => s + (parseFloat(m.tons) || 0), 0);
    const allHave = filled.every((m) => parseFloat(m.tons) > 0);
    if (!allHave || total <= 0) {
      if (autoCalculated) {
        setProductTons(0);
        setProductTonsInput('');
        setAutoCalculated(false);
      }
      return;
    }
    if (productTons === 0 || !productTonsInput || autoCalculated) {
      const auto = Math.round(total * 1000) / 1000;
      setProductTons(auto);
      setProductTonsInput(String(auto));
      setAutoCalculated(true);
    }
  }

  async function doSubmit(sel: SelectedMaterial[], productionDate: string) {
    setSubmitting(true);
    setMessage(null);
    try {
      const materialComposition = sel.map((m) => ({
        warehouse: m.warehouse,
        material: m.material,
        shortName: m.shortName,
        currentPrice: m.currentPrice,
        tons: parseFloat(m.tons),
      }));
      const res = await fetch('/api/profit-management/production-entry', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert',
          productName: selectedProduct,
          productWarehouse: selectedWarehouse,
          productTons,
          productionDate,
          materialComposition,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '提交失败');
      setMessage({ type: 'ok', text: '生产加工录入成功' });
      setSelectedMaterials([]);
      setProductTons(0);
      setProductTonsInput('');
      setAutoCalculated(false);
      await loadBootstrap();
      await loadMyOrders();
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : '提交失败' });
    } finally {
      setSubmitting(false);
      setCostConfirmOpen(false);
      setPendingSubmit(null);
    }
  }

  function submitProduction() {
    const sel = selectedMaterials.filter((m) => parseFloat(m.tons) > 0);
    if (!selectedProduct || productTons <= 0) {
      setMessage({ type: 'err', text: '请选择成品并输入成品重量' });
      return;
    }
    if (!sel.length) {
      setMessage({ type: 'err', text: '请至少选择一种毛料并输入用量' });
      return;
    }
    if (totalMaterialTons < productTons) {
      setMessage({
        type: 'err',
        text: `毛料总重量(${totalMaterialTons.toFixed(3)}吨)必须≥成品重量(${productTons.toFixed(3)}吨)`,
      });
      return;
    }
    const productionDate = buildProductionDateString(productionDateYmd, productionTimeHm);
    if (!productionDate) {
      setMessage({ type: 'err', text: '请选择生产加工日期' });
      return;
    }
    if (costOverRevenue && selectedProductPrice > 0) {
      setPendingSubmit({ sel, productionDate });
      setCostConfirmOpen(true);
      return;
    }
    void doSubmit(sel, productionDate);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto text-gray-500 dark:text-gray-400">加载中…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              生产加工录入
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              请选择成品，后选库区与毛料。当前操作人：{operatorName || '—'}
            </p>
          </div>
          <Link
            href="/profit-management/operations"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            运维控制台
          </Link>
        </div>

        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {loadError}
            <button
              type="button"
              className="ml-3 underline"
              onClick={() => loadBootstrap()}
            >
              重试
            </button>
          </div>
        )}

        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              message.type === 'ok'
                ? 'border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-200'
                : 'border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 我的录入单 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            我的录入单
          </h2>
          {myOrdersLoading ? (
            <p className="text-sm text-gray-500">加载中…</p>
          ) : myOrders.length === 0 ? (
            <p className="text-sm text-gray-500">暂无录入单</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {myOrders.map((o) => (
                <li
                  key={o.id}
                  className="py-2 flex justify-between text-sm text-gray-800 dark:text-gray-200"
                >
                  <span>
                    {o.product_name}{' '}
                    {(o.dailyProcess_qty ?? o.product_tons ?? 0).toString()} 吨
                  </span>
                  <span className="text-gray-500">{o.production_date}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 生产日期 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h2 className="flex items-center gap-2 text-base font-medium text-gray-900 dark:text-white mb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
              0
            </span>
            生产加工日期
          </h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={productionDateYmd}
              onChange={(e) => setProductionDateYmd(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              type="time"
              value={productionTimeHm}
              onChange={(e) => setProductionTimeHm(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            利润核算按此日期参与 LIFO；补录历史数据请改选实际生产日期。
          </p>
        </section>

        {/* 成品 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h2 className="flex items-center gap-2 text-base font-medium text-gray-900 dark:text-white mb-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
              1
            </span>
            选择加工的成品
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {productList.map((item) => {
              const selected =
                selectedProduct === item.name && selectedWarehouse === item.warehouse;
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 cursor-pointer transition ${
                    selected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }`}
                  onClick={() => selectProduct(item)}
                >
                  <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                  <div className="text-xs text-gray-500 mt-1">仓库: {item.warehouse}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    库存: 总加工{formatProductStockTons(item.totalProcessedQty)}吨 − 总出厂净重
                    {formatProductStockTons(item.totalSalesQty)}吨 ={' '}
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {formatProductStockTons(item.stockQty)}吨
                    </span>
                  </div>
                  {item.currentPrice > 0 && (
                    <div className="text-xs text-sky-700 dark:text-sky-300">
                      当前售价: {item.currentPrice} 元/吨
                    </div>
                  )}
                  <button
                    type="button"
                    className="mt-2 text-xs text-blue-600 hover:underline dark:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      openTransferModal(item);
                    }}
                  >
                    移库
                  </button>
                </div>
              );
            })}
          </div>
          {selectedProduct && (
            <p className="mt-3 text-sm text-green-700 dark:text-green-400">
              已选择: {selectedProduct} ({selectedWarehouse})
            </p>
          )}
        </section>

        {/* 毛料 */}
        {selectedProduct && (
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="flex items-center gap-2 text-base font-medium text-gray-900 dark:text-white mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                2
              </span>
              选择使用的毛料（可多选）
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              先选库区，再选该库区下的毛料。别名=库区拼音首字母+物料简写。
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {warehouseList.map((wh) => (
                <button
                  key={wh}
                  type="button"
                  onClick={() => setSelectedWarehouseArea(wh)}
                  className={`rounded-full px-3 py-1 text-sm border ${
                    selectedWarehouseArea === wh
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  {wh}
                </button>
              ))}
            </div>
            {selectedWarehouseArea && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {materialsInCurrentWarehouse.map((row) => (
                  <div
                    key={row.key}
                    className={`rounded-lg border p-3 ${
                      row.selected
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => toggleMaterial(row)}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {row.name}
                      </div>
                      <div className="text-xs text-gray-500">{row.shortName}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        库存: 累计采购{formatProductStockTons(row.totalPurchaseQty)}吨 − 累计加工使用
                        {formatProductStockTons(row.totalProcessingUsageQty)}吨 ={' '}
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {formatProductStockTons(row.stockQty)}吨
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        参考价 {row.currentPrice} 元/吨
                      </div>
                    </button>
                    {(row.selected || row.tons) && (
                      <input
                        type="number"
                        step="0.001"
                        placeholder="用量(吨)"
                        value={row.tons}
                        onChange={(e) =>
                          onMaterialTonsChange(row.key, e.target.value, row)
                        }
                        className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            {totalMaterialTons > 0 && (
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                毛料合计: {totalMaterialTons.toFixed(3)} 吨
              </p>
            )}
          </section>
        )}

        {/* 成品重量与成本 */}
        {selectedProduct && displayMaterials.length > 0 && (
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
            <h2 className="flex items-center gap-2 text-base font-medium text-gray-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                3
              </span>
              成品重量与成本
            </h2>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                成品重量（吨）
              </label>
              <input
                type="number"
                step="0.001"
                value={productTonsInput}
                onChange={(e) => {
                  setProductTonsInput(e.target.value);
                  setAutoCalculated(false);
                }}
                onBlur={() => {
                  const v = parseFloat(productTonsInput) || 0;
                  setProductTons(v);
                  setProductTonsInput(v > 0 ? String(v) : '');
                }}
                className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                默认等于毛料总重量，有损耗时可改小
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>材料成本: {materialCost.toFixed(2)} 元</div>
              <div>加工成本(70元/吨): {processingCost.toFixed(2)} 元</div>
              <div>总成本: {totalCost.toFixed(2)} 元</div>
              <div>销售收入: {revenue.toFixed(2)} 元</div>
            </div>
            {costOverRevenue && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                总成本高于按售价估算的收入，提交时将二次确认。
              </p>
            )}
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={submitProduction}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '提交中…' : '提交生产加工'}
            </button>
          </section>
        )}
      </div>

      {costConfirmOpen && pendingSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-md w-full rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">成本提醒</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              本次生产材料成本 {materialCost.toFixed(2)} 元 + 加工成本{' '}
              {processingCost.toFixed(2)} 元（70元/吨），已大于按售价估算的收入{' '}
              {revenue.toFixed(2)} 元，请确认是否继续提交？
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm"
                onClick={() => {
                  setCostConfirmOpen(false);
                  setPendingSubmit(null);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
                onClick={() => void doSubmit(pendingSubmit.sel, pendingSubmit.productionDate)}
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}

      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-w-md w-full rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">成品移库</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {transferProductName} · 从 {transferFromWarehouse} 移出
            </p>
            <label className="block mt-3 text-sm">移库重量（吨）</label>
            <input
              type="number"
              step="0.001"
              value={transferQuantity}
              onChange={(e) => setTransferQuantity(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <label className="block mt-3 text-sm">移入库区</label>
            <select
              value={transferToIndex}
              onChange={(e) => setTransferToIndex(Number(e.target.value))}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {transferDestinations.map((d, i) => (
                <option key={d.warehouse} value={i}>
                  {d.productName} · {d.warehouse}
                </option>
              ))}
            </select>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm"
                onClick={() => setTransferOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => void confirmTransfer()}
              >
                确认移库
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
