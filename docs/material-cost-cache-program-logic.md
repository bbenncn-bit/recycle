# 材料成本缓存：程序逻辑说明

## 业务目标

计算 **DeliverySettlement（钢厂结算表）** 中每一笔销售的**材料成本构成**，并按 LIFO 原则将结果写入 **MaterialCostCache**，供利润分析等模块使用。

## 表与字段含义（避免混淆）

| 表 / 概念 | 含义 | 示例 |
|-----------|------|------|
| **DeliverySettlement** | 钢厂结算表，每笔销售一条 | delivery_number, delivery_date, **product_type**（成品名）, **warehouse**（成品库代码）, settlement_quantity, totalSettlementAmount |
| **ProductStock** | 成品库存表 | **warehouse_code** = 成品库代码（A1、B1、C1、D2 等） |
| **ProcessingCostInput** | 生产加工录入表 | **product_name**（成品名）, **product_warehouse**（成品库代码，与 ProductStock.warehouse_code 一致：A1、B1、D2 等）, production_date, dailyProcess_qty（成品重量）, M1_qty/M1_price 等（毛料用量与单价） |
| **MaterialStorage** | 毛料库存表 | **storage_area** = 毛料库区（如「毛料库八」「毛料库二」「底部料库」等），**material_type** = 毛料类型, **alias_name** = 毛料别名（如 M6、M4、钢丝绳） |

- **A1、B1、D2、C1** 等是**成品库代码**（ProductStock.warehouse_code、ProcessingCostInput.product_warehouse、DeliverySettlement.warehouse）。
- **毛料库区**（MaterialStorage.storage_area）是另一套编码，如「毛料库八」「毛料库二」，不要与成品库代码混用。

## 核算流程（LIFO → MaterialCostCache）

1. **定时或手动**调用  
   `CALL sp_update_material_cost_cache(开始日期, 结束日期);`  
   例如每天凌晨跑一次，或对 1 月 19 日～今天补跑：  
   `CALL sp_update_material_cost_cache('2026-01-19', CURDATE());`

2. **sp_update_material_cost_cache**  
   - 在 **DeliverySettlement** 中选出 `delivery_date` 在 [开始日期, 结束日期] 内的记录（product_type、warehouse、delivery_date、settlement_quantity 等）。
   - 对**每一笔**调用 **sp_calculate_lifo_material_cost**，传入：发货单号、成品名、**成品库代码**、发货日期、结算量。

3. **sp_calculate_lifo_material_cost**  
   - 在 **ProcessingCostInput** 中查：  
     `product_name = 传入成品名` 且 `product_warehouse = 传入成品库代码`（即 A1/B1/D2 等），  
     `production_date <= 发货日期`，`dailyProcess_qty > 0`，  
     按生产日期**倒序（LIFO）**。
   - 用这些行的 **M1_qty×M1_price + M2_qty×M2_price + … + auxiliary_qty×auxiliary_price** 等求和，除以产量（dailyProcess_qty），得到**单位材料成本**；再按 LIFO 分配结算量，得到本笔的 **material_cost** 和 **material_composition**。
   - 若某行 **M*_qty、M*_price 等全为 NULL/0**，则单位成本为 0，该笔材料成本即为 0。

4. **结果写入 MaterialCostCache**  
   - 按 delivery_number 插入或更新：material_cost、material_composition、production_records、calculated_at 等。

因此：**要让 1 月 19 日之后新加入的 DeliverySettlement 有正确的 MaterialCostCache**，必须同时满足：

- 已对包含这些日期的区间执行过 `sp_update_material_cost_cache(开始日期, 结束日期)`；
- 对每笔销售对应的「成品名 + 成品库代码」，在 ProcessingCostInput 中有 **production_date ≤ 发货日期**、**dailyProcess_qty > 0** 的加工记录；
- 这些加工记录的 **M1_qty、M1_price、auxiliary_qty、auxiliary_price** 等列**有值**（否则 LIFO 算出的单位成本为 0，material_cost 仍为 0）。

## 当前 1 月 19 日后材料成本为 0 的原因

- 已确认：**ProcessingCostInput** 里 吉钢散料 A1、一类 B1、打包 D2 等有行且 **dailyProcess_qty > 0**，但 **M1_qty、M1_price、auxiliary_qty、auxiliary_price** 等多为空或 0。
- 因此 LIFO 虽能取到生产记录，但算出的**单位材料成本 = 0**，写入 MaterialCostCache 的 material_cost 即为 0。

这些 M*_qty、M*_price 是在**小程序「生产加工录入」提交时**，由 ouye 云函数根据 **materialComposition** 和 **MATERIAL_TO_COLUMN** 写入的。若提交时毛料名未映射或未传用量/单价，就不会写入对应列。

## 正确排查「毛料名映射」时用的 SQL（MaterialStorage）

**MaterialStorage** 中：  
- `storage_area` = 毛料库区（如「毛料库八」「毛料库二」），**不是** A1/B1/D2。  
- 要检查「哪些毛料名需要出现在云函数 MATERIAL_TO_COLUMN 里」，应查 **material_type** 和 **alias_name**，且**不要**用成品库代码去筛 storage_area。

建议在**同一库**执行：

```sql
-- 查看所有毛料类型与别名，用于核对 MATERIAL_TO_COLUMN 是否覆盖
SELECT DISTINCT material_type, alias_name
FROM MaterialStorage
ORDER BY material_type, alias_name;
```

将结果中的 **material_type**（以及若前端传的是 **alias_name** 则一并看）与云函数中的 **MATERIAL_TO_COLUMN** 对照，缺的补上映射并重新部署云函数。这样新提交的 吉钢散料/一类/打包 生产单才会写入 M*_qty、M*_price，LIFO 才能算出非 0 的材料成本。

## 小结

| 项目 | 说明 |
|------|------|
| 逻辑链 | DeliverySettlement → sp_update_material_cost_cache → sp_calculate_lifo_material_cost → 读 ProcessingCostInput（成品名+成品库代码 A1/B1/D2，LIFO）→ 写 MaterialCostCache |
| 成品库代码 | A1、B1、D2、C1 等 = ProductStock.warehouse_code = ProcessingCostInput.product_warehouse = DeliverySettlement.warehouse |
| 毛料库区 | MaterialStorage.storage_area = 「毛料库八」「毛料库二」等，不要与 A1/B1/D2 混用 |
| 1/19 后为 0 的根因 | ProcessingCostInput 中对应成品+成品库的加工记录缺少 M*_qty/M*_price 等材料列；需在小程序提交时通过毛料名映射与价格写入这些列，再重跑缓存更新 |
