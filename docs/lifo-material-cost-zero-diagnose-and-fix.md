# 材料成本缓存为 0 的诊断与修复（吉钢散料 / 一类 / 打包）

## 说明

**ProcessingCostInput 表使用 `dailyProcess_qty` 存储每张生产加工单的成品重量，表中无 `product_tons` 列。** 存储过程已按 `dailyProcess_qty` 设计，无需改为 product_tons。

## 现象

执行 `CALL sp_update_material_cost_cache('2026-01-19', CURDATE());` 后：

- 只有**钢筋压块 C1**（如 FH2512310015）有正确的 `material_cost` 和 `material_composition`；
- **吉钢散料 A1、一类 B1、打包 D2** 等多数记录的 `material_cost` 为 0、`material_composition` 为空。

## 原因

LIFO 从 `ProcessingCostInput` 按「成品名 + 库区」且「生产日期 ≤ 发货日期」、**dailyProcess_qty > 0** 取数。  
吉钢散料 A1、一类 B1、打包 D2 材料成本为 0，说明当前库里**没有**或**不足**这些成品+库区在对应时间段内的加工录入（或生产日期/材料列不满足条件）。

---

## 步骤 1：诊断（在库里执行）

在运行 `sp_update_material_cost_cache` 的**同一库**执行下面 SQL（仅用 `dailyProcess_qty`，不引用 product_tons）：

```sql
-- 吉钢散料 A1
SELECT id, product_name, product_warehouse, production_date, dailyProcess_qty
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL OR product_warehouse = '')
  AND production_date IS NOT NULL
ORDER BY production_date DESC LIMIT 10;

-- 一类 B1
SELECT id, product_name, product_warehouse, production_date, dailyProcess_qty
FROM ProcessingCostInput
WHERE product_name = '一类'
  AND (product_warehouse = 'B1' OR product_warehouse IS NULL OR product_warehouse = '')
  AND production_date IS NOT NULL
ORDER BY production_date DESC LIMIT 10;

-- 打包 D2
SELECT id, product_name, product_warehouse, production_date, dailyProcess_qty
FROM ProcessingCostInput
WHERE product_name = '打包'
  AND (product_warehouse = 'D2' OR product_warehouse IS NULL OR product_warehouse = '')
  AND production_date IS NOT NULL
ORDER BY production_date DESC LIMIT 10;
```

- **若查不到行**：没有对应成品+库区的加工录入，需要在**小程序「生产加工录入」**里补录 吉钢散料 A1、一类 B1、打包 D2，且生产日期不晚于对应发货日期、`dailyProcess_qty` 有值，再重跑 `CALL sp_update_material_cost_cache('2026-01-19', CURDATE());`。
- **若有行且 dailyProcess_qty > 0 仍为 0**：多半是**材料列无值**。请运行下面「步骤 2」的材料列诊断。

---

## 步骤 2：材料列诊断（有生产记录但仍为 0 时执行）

LIFO 的单位成本 = 各材料（M1、M2、…、wireRope、auxiliary 等）的 `qty*price` 之和 / 产量。若这些列在 吉钢散料/一类/打包 的记录里全为 NULL 或 0，算出的材料成本就是 0。在**同一库**执行（对比 吉钢散料 与 钢筋压块 各一条）：

```sql
SELECT id, product_name, product_warehouse, production_date, dailyProcess_qty,
       (COALESCE(M1_qty,0)*COALESCE(M1_price,0) + COALESCE(M2_qty,0)*COALESCE(M2_price,0) + COALESCE(auxiliary_qty,0)*COALESCE(auxiliary_price,0)) AS material_cost_sum,
       M1_qty, M1_price, auxiliary_qty, auxiliary_price
FROM ProcessingCostInput
WHERE (product_name = '吉钢散料' AND product_warehouse = 'A1' AND dailyProcess_qty > 0)
   OR (product_name = '钢筋压块' AND product_warehouse = 'C1' AND dailyProcess_qty > 0)
ORDER BY product_name, production_date DESC
LIMIT 5;
```

- **若 吉钢散料 行的 material_cost_sum = 0 且 M1_qty/M1_price 等均为 NULL/0，而 钢筋压块 有非零**：说明小程序提交 吉钢散料/一类/打包 时**没有写入材料用量与单价**（M1_qty、M1_price、auxiliary_qty 等），需要在小程序或写入逻辑里保证这些字段随生产单一起写入。写入后再重跑 `CALL sp_update_material_cost_cache('2026-01-19', CURDATE());`。

---

## 小结

| 诊断结果 | 处理 |
|----------|------|
| 没有对应成品+库区的行 | 在小程序「生产加工录入」补录 吉钢散料 A1、一类 B1、打包 D2，再跑缓存更新 |
| 有行且 dailyProcess_qty 有值仍为 0 | 查生产日期是否 ≤ 发货日期、材料列（M1_qty/M1_price 等）是否为空 |
