# MaterialCostCache 材料成本为 0 的排查与修复指南

## 现象

- 单笔测试 `CALL sp_calculate_lifo_material_cost(..., @out_cost, ...)` 得到 `@out_cost = 0`。
- 第 1 步诊断里「钢筋压块 C1」的 M1_qty/M1_price 等数据仍在 `ProcessingCostInput` 中。

说明要么存储过程内部发生了 **SQL 异常**（被 EXIT HANDLER 捕获后统一返回 0），要么 **没有满足条件的生产记录** 进入 LIFO 计算（0 行 → 成本为 0）。

---

## 一、先确认：是“报错”还是“0 行”

### 1. 创建错误日志表并改存储过程

在库中执行：

```sql
CREATE TABLE IF NOT EXISTS `MaterialCostCacheErrorLog` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `delivery_number` VARCHAR(100) NULL,
  `error_message` TEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='LIFO 存储过程报错日志';
```

然后修改 `sp_calculate_lifo_material_cost` 的 **EXIT HANDLER** 段，在 `SET p_material_cost = 0;` **之前** 增加一行：

```sql
INSERT INTO MaterialCostCacheErrorLog (delivery_number, error_message)
VALUES (p_delivery_number, v_sql_error);
```

即该段变为：

```sql
DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
    GET DIAGNOSTICS CONDITION 1
        v_sql_error = MESSAGE_TEXT;
    INSERT INTO MaterialCostCacheErrorLog (delivery_number, error_message)
    VALUES (p_delivery_number, v_sql_error);
    SET p_material_cost = 0;
    SET p_material_composition = JSON_ARRAY();
    SET p_production_records = JSON_ARRAY();
END;
```

保存过程后，执行单笔测试（参数按你实际单号/日期/数量改）：

```sql
CALL sp_calculate_lifo_material_cost('FH2512310015', '钢筋压块', 'C1', '1/1/2026', 46.77, @out_cost, @out_comp, @out_recs);
SELECT @out_cost;
SELECT * FROM MaterialCostCacheErrorLog ORDER BY id DESC LIMIT 5;
```

- **若错误表里有一条新记录**：看 `error_message`。常见情况：
  - `Unknown column 'xxx' in 'field list'` → 表 `ProcessingCostInput` 的列名与过程里不一致（如过程用 `wireRope_qty`，表为 `wire_rope_qty`）。需统一列名（改过程或改表/视图）。
  - 其它 SQL 报错 → 按报错内容改过程或表结构。
- **若错误表里没有新记录且 @out_cost 仍为 0**：说明没有触发 SQL 异常，而是 **LIFO 用到的生产记录为 0 行**（见下一节）。

---

## 二、若是“0 行”（无报错但成本为 0）

即：`tmp_production_records` 没有数据，游标一次都没用上，所以 `v_total_cost` 一直是 0。

在库里执行下面这段（把 `'钢筋压块'`、`'C1'`、`'2026-01-01'` 换成你单笔测试用的 product_name、product_warehouse、delivery_date 解析结果）：

```sql
SET @p_product_name   = '钢筋压块';
SET @p_product_warehouse = 'C1';
SET @v_sale_date      = '2026-01-01';   -- 与 p_delivery_date 解析结果一致，如 '1/1/2026' -> 2026-01-01

SELECT COUNT(*) AS row_count
FROM ProcessingCostInput p
WHERE p.product_name COLLATE utf8mb4_unicode_ci = @p_product_name COLLATE utf8mb4_unicode_ci
  AND ( @p_product_warehouse IS NULL OR p.product_warehouse COLLATE utf8mb4_unicode_ci = @p_product_warehouse COLLATE utf8mb4_unicode_ci OR p.product_warehouse = '' )
  AND p.production_date IS NOT NULL AND p.production_date != ''
  AND COALESCE(p.dailyProcess_qty, 0) > 0
  AND (
      ( p.production_date LIKE '%/%' AND p.production_date NOT LIKE '%-%'
        AND STR_TO_DATE(p.production_date, '%m/%d/%Y') IS NOT NULL
        AND STR_TO_DATE(p.production_date, '%m/%d/%Y') <= @v_sale_date )
      OR
      ( p.production_date LIKE '%-%'
        AND STR_TO_DATE(p.production_date, '%Y-%m-%d') IS NOT NULL
        AND STR_TO_DATE(p.production_date, '%Y-%m-%d') <= @v_sale_date )
  );
```

- **row_count = 0**：说明当前条件下没有“可参与 LIFO”的生产记录。需要检查：
  - `product_name` / `product_warehouse` 是否与 `DeliverySettlement` 里完全一致（含空格、大小写、库别）。
  - `production_date` 格式：过程只认 `MM/DD/YYYY`（含 `/` 无 `-`）或 `YYYY-MM-DD`（含 `-`）。若实际是其它格式（或带时间如 `2026-02-01 11:10`），可能被过滤掉。可先在表里看几条 `production_date` 样例，再在过程里增加对应格式解析或统一成上述两种之一。
- **row_count > 0**：说明数据有，但过程里仍得到 0。此时重点看：
  - 传入的 `p_delivery_date` 在过程里解析出的 `v_sale_date` 是否与上面用的 `@v_sale_date` 一致（例如 `'1/1/2026'` 是否被解析成 `2026-01-01`）。
  - 过程里 `INSERT INTO tmp_production_records` 的 SELECT 是否与上面这段 WHERE 完全一致（复制时是否漏条件）。

---

## 三、让 MaterialCostCache 正常算出每单材料成本

1. **确认 ProcessingCostInput 数据**
   - 有对应成品+库别的生产记录，且 `dailyProcess_qty > 0`。
   - 材料列（M1_qty/M1_price 等）与过程里使用的列名一致；若小程序/云函数写入的列名与过程不一致，要先统一（见 `fix-material-cost-zero-add-column-mappings.md`）。

2. **确认过程不静默报错**
   - 按第一节加上错误日志表并在 EXIT HANDLER 里写入 `MaterialCostCacheErrorLog`。
   - 单笔测试后查该表，若有错误则按 `error_message` 修列名或 SQL。

3. **确认 LIFO 有数据**
   - 用第二节的 SELECT 检查同一 product_name/product_warehouse/delivery_date 下是否有 row_count > 0。
   - 若 production_date 带时间或格式特殊，在过程里用 `LEFT(TRIM(p.production_date), 10)` 再 `STR_TO_DATE(..., '%Y-%m-%d')` 做比较，或增加对应格式解析。

4. **重新跑缓存更新**
   - 修好过程并确认单笔测试 `@out_cost` 非 0 后，执行：
   ```sql
   CALL sp_update_material_cost_cache('2026-01-01', CURDATE());
   ```
   - 再抽查：
   ```sql
   SELECT delivery_number, product_name, warehouse_code, material_cost, JSON_PRETTY(material_composition)
   FROM MaterialCostCache
   WHERE delivery_date >= '2026-01-01'
   ORDER BY id DESC LIMIT 20;
   ```

按上述顺序：先区分“报错”还是“0 行”，再对症修表/过程/日期格式，最后重跑缓存，MaterialCostCache 即可正常得到每单结算成品的原材料加工结果。
