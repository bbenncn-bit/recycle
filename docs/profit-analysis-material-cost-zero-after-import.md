# 利润分析：1月19日后材料成本为 0 的原因与处理

## 现象

- **1月19日之前**：吉钢散料、打包、一类等成品的「材料成本(元)」能正常显示具体数字（如附图2）。
- **新导入 1月19日及以后的结算收入后**：这几样成品的「材料成本(元)」变为 **0.00**（如附图1红框）。

## 材料成本从哪里来

利润分析模块的「材料成本(元)」**只从表 `MaterialCostCache` 读取**，按**发货单号 `delivery_number`** 查一条缓存记录：

- **有缓存** → 显示缓存里的 `material_cost`、材料构成等。
- **无缓存** → 当前逻辑会显示 **0**（并打日志「缓存未命中」）。

也就是说：**所有显示出来的材料成本，都是「先算好、再写入缓存」的结果**。没有缓存就没有数字。

## 缓存是怎么被填上的

1. **谁在算、谁在写**  
   由 MySQL 存储过程 **`sp_update_material_cost_cache(开始日期, 结束日期)`**：
   - 按日期范围从 **`DeliverySettlement`** 里取出发货单；
   - 对每一笔调用 **`sp_calculate_lifo_material_cost`** 做 **LIFO（后进先出）** 材料成本计算；
   - 把结果写入 **`MaterialCostCache`**（按 `delivery_number` 更新或插入）。

2. **什么时候会跑这段逻辑**  
   - **定时**：MySQL 事件 **`ev_update_material_cost_cache_daily`** 每天凌晨 2 点执行，且**只更新「最近 7 天」**：
     ```sql
     CALL sp_update_material_cost_cache(DATE_SUB(CURDATE(), INTERVAL 7 DAY), CURDATE());
     ```
   - **手动**：在库里执行一次：
     ```sql
     CALL sp_update_material_cost_cache('2026-01-19', CURDATE());
     ```
     会处理 2026-01-19 至今所有在 `DeliverySettlement` 里的单子并写入/更新缓存。

3. **LIFO 计算依赖什么**  
   `sp_calculate_lifo_material_cost` 会：
   - 用销售单的 **成品名称（product_type）**、**库区（warehouse）**、**发货日期**、**结算量**；
   - 到 **`ProcessingCostInput`** 里找：**同一成品名 + 同一库区**、**生产日期 ≤ 发货日期**、且 **有产量（dailyProcess_qty > 0）** 的加工记录；
   - 按生产日期**倒序（后进先出）**，用这些记录的产量和材料成本去「摊」这笔销售的吨数，得到材料成本。

所以：**材料成本能算出来 ≠ 只靠销售数据，还要有对应的「加工成品数据」**。

## 为什么 1月19日之后会变成 0

可以归纳为两类原因（可能同时存在）：

### 原因一：新导入的单据从未跑过缓存更新（最常见）

- 1月19日及以后的结算数据是**新导入**的（例如 Excel/接口/脚本写入 `DeliverySettlement`），对应的**发货单号**是新的。
- 缓存**只会在**执行 `sp_update_material_cost_cache` 时被写入；定时事件又**只跑最近 7 天**。
- 若导入后没有针对「1月19日～今天」做过一次**全量/按日期范围的缓存更新**，这些新单号在 `MaterialCostCache` 里就**没有记录** → 前端按单号查不到 → 显示 **0**。

**处理办法：**

在数据库中执行（覆盖 1月19 至今）：

```sql
CALL sp_update_material_cost_cache('2026-01-19', CURDATE());
```

执行后刷新利润分析页，看 1月19 日及以后的单是否出现材料成本。若仍为 0，再考虑原因二。

### 原因二：ProcessingCostInput 里对应成品+库区的加工数据不足

- LIFO 要求：**同一成品、同一库区**，且**生产日期 ≤ 发货日期**的加工记录，且 **dailyProcess_qty > 0**。
- 若某个成品（如吉钢散料、打包、一类）在某个库区：
  - 没有 1 月 19 日前后的加工录入，或  
  - 录入的**成品名/库区**与销售单不一致（如销售是「吉钢散料 A1」，加工录入却是别的库区），或  
  - 录入的**总加工量**不足以覆盖该段时间的销售量  

则 LIFO 会「无料可扣」或只扣到一部分，算出来的材料成本可能是 **0**（或偏小），并且这个 0 会被写进缓存，所以页面上就一直显示 0。

**处理办法：**

1. 在「生产加工录入」中补录或修正：
   - **成品名称、库区** 与销售单一致（如吉钢散料 + A1、打包 + D2、一类 + B1 等）；
   - **生产日期** 不晚于对应的**发货日期**；
   - **加工数量** 能覆盖或至少部分覆盖该段时间的销售量。
2. 补录后**重新跑一次缓存更新**，让新加工数据参与计算：
   ```sql
   CALL sp_update_material_cost_cache('2026-01-19', CURDATE());
   ```

**如何自查是否有对应加工数据（示例）：**

```sql
-- 示例：查「吉钢散料」在库区 A1、且生产日期不晚于 2026-01-19 的加工记录
SELECT id, product_name, product_warehouse, production_date, dailyProcess_qty
FROM ProcessingCostInput
WHERE product_name = '吉钢散料'
  AND (product_warehouse = 'A1' OR product_warehouse IS NULL OR product_warehouse = '')
  AND production_date IS NOT NULL
  AND COALESCE(dailyProcess_qty, 0) > 0
ORDER BY production_date DESC
LIMIT 20;
```

可把 `product_name` / `product_warehouse` 换成「打包」「一类」等，看是否有足够数量、日期合适的记录。

## 建议排查顺序

1. **先执行一次缓存更新**（覆盖 1月19 至今）  
   ```sql
   CALL sp_update_material_cost_cache('2026-01-19', CURDATE());
   ```  
   然后刷新利润分析，看 1月19 日及以后的单是否仍有 0。

2. **若仍为 0**  
   - 用上面示例 SQL 检查 `ProcessingCostInput` 中，对应成品+库区在 1月19 前后的**加工数量、日期**是否充足、是否与销售单一致。  
   - 不足则补录或修正加工数据，再执行一次上面的 `CALL sp_update_material_cost_cache(...)`。

3. **长期建议**  
   - 每次**批量导入**一段时间内的结算数据后，对该段时间执行一次  
     `CALL sp_update_material_cost_cache('开始日期', '结束日期');`  
   - 或适当加大定时事件覆盖范围（例如从「最近 7 天」改为「最近 30 天」），避免新导入数据长期未入缓存。

## 小结

| 情况 | 可能原因 | 处理 |
|------|----------|------|
| 1月19 前有数，1月19 后为 0 | 新导入单号未跑过缓存更新 | 执行 `CALL sp_update_material_cost_cache('2026-01-19', CURDATE());` |
| 执行缓存更新后仍为 0 | ProcessingCostInput 中对应成品+库区加工数据不足或日期/名称不匹配 | 补录或修正加工录入，再执行一次缓存更新 |
| 定时任务只更新最近 7 天 | 事件设计如此 | 导入历史数据后需手动执行一次对应日期范围的缓存更新 |

**结论**：  
1月19 日之后材料成本为 0，既可能是**缓存没更新**（新导入的单据从未参与缓存计算），也可能是 **ProcessingCostInput 里对应成品、库区的加工数量或日期不够/不匹配**。按上面顺序先更新缓存、再查加工数据，即可定位并修复。
