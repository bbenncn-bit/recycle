# 材料成本为 0：补全毛料名映射与后续处理

**程序逻辑说明**（DeliverySettlement → LIFO 取 ProcessingCostInput → 写 MaterialCostCache；成品库代码 A1/B1/D2 与毛料库区 storage_area 的区别）见：**material-cost-cache-program-logic.md**。

## 原因确认

- **钢筋压块 C1**：ProcessingCostInput 里 M1_qty、M1_price、auxiliary_qty、auxiliary_price 等有值 → LIFO 能算出材料成本。
- **吉钢散料 A1、一类 B1、打包 D2**：同表里这些材料列为空或仅个别有值 → 单位材料成本为 0 → material_cost = 0。

也就是说：**同一套云函数/小程序在提交「生产加工录入」时，只有能映射到存储过程所用列名的毛料才会写入 M*_qty / M*_price**。  
若你选的毛料名在云函数里**没有映射**，就不会写入任何材料列，LIFO 就会得到 0。

## 已做修改（ouye 云函数）

1. **扩展 MATERIAL_TO_COLUMN 映射**  
   在 `cloudfunctions/mysql/index.js` 中为常见别名增加了映射，例如：  
   `'普废': 'scrap'`，以及 `'散料'/'吉钢散料用料'/'一类用料'/'打包用料' -> 'M1'`。  
   这样即使用户选的是这些名字，也会写入对应列（如 M1_qty、M1_price），LIFO 才能算到材料成本。

2. **未映射时打日志**  
   若某条毛料名仍未被映射，云函数会打一条警告：  
   `[insertProcessingCost] 毛料名未映射到列，将跳过写入 M*_qty/price，成品=xxx 毛料=xxx`。  
   便于你在云函数日志里看到「实际传上来的毛料名」，再补映射。

请**重新上传并部署**该云函数，使上述逻辑生效。

## 你需要做的

### 1. 确认实际使用的毛料名（MaterialStorage）

**说明**：MaterialStorage 表中 **storage_area** 是**毛料库区**（如「毛料库八」「毛料库二」「底部料库」），**不是**成品库代码 A1/B1/D2（A1/B1/D2 是 ProductStock.warehouse_code、ProcessingCostInput.product_warehouse）。毛料类型与别名在 **material_type**、**alias_name** 中。

在**同一库**执行，查看所有毛料类型与别名，用于核对 MATERIAL_TO_COLUMN 是否覆盖：

```sql
SELECT DISTINCT material_type, alias_name
FROM MaterialStorage
ORDER BY material_type, alias_name;
```

看结果里的 **material_type**（以及若前端传的是 **alias_name** 也看下）。  
这些**必须**都能在云函数的 `MATERIAL_TO_COLUMN` 里找到对应键，否则提交时不会写 M*_qty/price。

### 2. 补全云函数里的映射

- 若上面 SQL 里有**未**出现在 `MATERIAL_TO_COLUMN` 里的名字（例如「XX 散料」「XX 压块料」等），在 `cloudfunctions/mysql/index.js` 的 `MATERIAL_TO_COLUMN` 里为它们增加一项，指向已有的某一列（如 `'某名字': 'M1'` 或 `'某名字': 'auxiliary'` 等，与现有列一致即可）。
- 保存后**重新上传并部署**云函数。

### 3. 新单与旧单

- **之后新提交**的 吉钢散料/一类/打包 生产加工单：只要毛料名都已映射，就会正常写入 M*_qty、M*_price，再执行  
  `CALL sp_update_material_cost_cache('2026-01-19', CURDATE());`  
  即可在 MaterialCostCache 里看到非 0 的材料成本。
- **已经存在**的 吉钢散料/一类/打包 记录（只有 dailyProcess_qty、没有材料列）：  
  - 若能接受「历史这几条材料成本为 0」，可以不动；  
  - 若需要补算，只能通过**重新在小程序里录一遍**（或按同一格式再提交一次）生成新记录，再跑一次上面的缓存更新；没有 material_composition 等中间数据时，无法自动反填 M*_qty/price。

### 4. 再次跑缓存更新

修改并部署云函数后，新录的单据会带上材料列。然后执行：

```sql
CALL sp_update_material_cost_cache('2026-01-19', CURDATE());
```

再查看 MaterialCostCache 中 1 月 19 日之后的 吉钢散料/一类/打包 的 material_cost 是否已不为 0。

## 小结

| 项目 | 说明 |
|------|------|
| 根因 | 提交时毛料名未映射，未写入 M*_qty/M*_price → LIFO 得到 0 |
| 已做 | 云函数中增加常见别名映射 + 未映射时打日志 |
| 你要做 | 1）查 MaterialStorage 里实际 material_type；2）缺的补进 MATERIAL_TO_COLUMN 并重新部署；3）新单会正常；4）再跑一次缓存更新 |
