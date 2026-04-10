# 更新 MaterialCostCache 的语句与核查说明

## 更新 MaterialCostCache 的语句

在**同一库**（即存在 DeliverySettlement、ProcessingCostInput、MaterialCostCache 及存储过程的库）中执行：

```sql
-- 从 2026-01-19 到当前日期，重新核算并写入/更新 MaterialCostCache
CALL sp_update_material_cost_cache('2026-01-19', CURDATE());
```

若希望覆盖更早的结算单（例如从 2026-01-01 起），可执行：

```sql
CALL sp_update_material_cost_cache('2026-01-01', CURDATE());
```

执行完成后，可查询 MaterialCostCache 中 吉钢散料 的记录是否已有非 0 的 material_cost，例如：

```sql
SELECT delivery_number, product_name, product_warehouse, delivery_date, settlement_quantity,
       material_cost, calculated_at
FROM MaterialCostCache
WHERE product_name = '吉钢散料'
ORDER BY delivery_date DESC
LIMIT 20;
```

---

## material_cost 被算成 0 的原因核查

### 1. 存储过程对 dailyProcess_qty = 0 的处理

在 **sp_calculate_lifo_material_cost** 中，参与 LIFO 的生产记录必须满足（约第 192 行）：

```sql
AND COALESCE(p.dailyProcess_qty, 0) > 0  -- 只使用有产量的记录
```

因此 **dailyProcess_qty = 0 或 NULL 的行本来就不会被选入**，不会参与单位成本计算。  
删除这些 0 产量行可以保持数据干净，但**不会改变**存储过程原本的筛选结果；若之前 material_cost 为 0，删除 0 产量行后不一定会自动变为非 0。

### 2. 单位成本 = 0 的真正来源

LIFO 的单位材料成本公式为（存储过程内）：

- 单位成本 = **sum(M1_qty×M1_price + M2_qty×M2_price + … + auxiliary_qty×auxiliary_price + …) / dailyProcess_qty**

只要被选中的那几条 吉钢散料 生产记录里，**M1_qty、M1_price、auxiliary_qty、auxiliary_price** 等列为 **NULL 或 0**，则分子为 0，**单位成本 = 0**，进而该笔结算单的 material_cost 被写为 0。

你已确认：  
- ProcessingCostInput 中 2025-07-01 ～ 2026-02 共有 188 条 吉钢散料，合计 3367.32 吨；  
- 结算/缓存表中 吉钢散料 合计 836.52 吨，远小于加工量。

说明**加工记录在数量和吨数上充足**，问题不在「没有记录」或「产量不足」，而在于：  
**被 LIFO 选中的那些 吉钢散料 行里，材料列（M*_qty、M*_price 等）是否为空。**

### 3. 建议的自查（以 1 月 19 日吉钢散料为例）

执行完上面的 `CALL sp_update_material_cost_cache('2026-01-19', CURDATE());` 后，若 1 月 19 日那笔 吉钢散料 的 material_cost 仍为 0，可在同一库执行下面诊断，看「参与 LIFO 的」生产记录是否材料列为空：

```sql
-- 1）1 月 19 日 吉钢散料 的缓存结果（示例单号可按你实际修改）
SELECT delivery_number, product_name, product_warehouse, delivery_date, settlement_quantity,
       material_cost, material_composition, calculated_at
FROM MaterialCostCache
WHERE product_name = '吉钢散料' AND delivery_date LIKE '%1/19/2026%'
LIMIT 5;

-- 2）参与 LIFO 的 吉钢散料 A1 生产记录（生产日期 ≤ 2026-01-19，dailyProcess_qty > 0）
--    若这些行的 M1_qty、M1_price、auxiliary_qty、auxiliary_price 多为 NULL/0，则 material_cost 必为 0
SELECT id, product_name, product_warehouse, production_date, dailyProcess_qty,
       M1_qty, M1_price, auxiliary_qty, auxiliary_price,
       (COALESCE(M1_qty,0)*COALESCE(M1_price,0) + COALESCE(auxiliary_qty,0)*COALESCE(auxiliary_price,0)) AS material_cost_sum
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL OR product_warehouse = '')
  AND production_date IS NOT NULL
  AND COALESCE(dailyProcess_qty, 0) > 0
  AND (
      (production_date LIKE '%/%' AND production_date NOT LIKE '%-%' AND STR_TO_DATE(production_date, '%m/%d/%Y') <= '2026-01-19')
      OR
      (production_date LIKE '%-%' AND STR_TO_DATE(production_date, '%Y-%m-%d') <= '2026-01-19')
  )
ORDER BY production_date DESC
LIMIT 15;
```

若第 2）段结果里 **material_cost_sum 多为 0 且 M1_qty/M1_price 等为空**，则原因就是：**这些加工单提交时没有写入材料用量与单价**（例如小程序侧毛料名未映射到 M* 列）。需要保证新提交的 吉钢散料 加工单写入 M*_qty、M*_price 等，再重新执行一次上面的 CALL，MaterialCostCache 才会出现非 0 的 material_cost。

---

## 小结

| 项目 | 说明 |
|------|------|
| 更新缓存语句 | `CALL sp_update_material_cost_cache('2026-01-19', CURDATE());`（可按需改开始日期） |
| dailyProcess_qty = 0 | 存储过程已排除，删 0 产量行只影响数据整洁，不改变 LIFO 是否选到记录 |
| material_cost = 0 的主因 | 被 LIFO 选中的 吉钢散料 行中，M*_qty、M*_price 等为空 → 单位成本 = 0 → material_cost 写 0 |
| 后续动作 | 执行 CALL 后用上面 1）2）段 SQL 自查；若材料列为空，需从提交加工单环节补写 M* 列后再重跑 CALL |
