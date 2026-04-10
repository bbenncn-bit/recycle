# 材料成本缓存事件只更新 7 天导致历史导入数据未入缓存

## 现象

- 定时事件已设置，每天执行 `sp_update_material_cost_cache(DATE_SUB(CURDATE(), INTERVAL 7 DAY), CURDATE())`。
- **MaterialCostCache** 里只有**一条**记录（如 FH2601310003，2/1/2026），且该条 **material_cost = 0**、**material_composition = []**。
- **DeliverySettlement** 里新导入了**多条 1 月 19 日**的结算数据，但 **MaterialCostCache 中没有为这些单生成缓存**。

## 原因分析

### 1. 为何 1 月 19 日的导入数据没有进入 MaterialCostCache？

事件里传入的日期范围是：

- **开始日期**：`DATE_SUB(CURDATE(), INTERVAL 7 DAY)`（例如 2026-02-06 执行则为 **2026-01-30**）
- **结束日期**：`CURDATE()`（**2026-02-06**）

也就是说，**每次执行只会处理「最近 7 天」内的发货日期**。

游标中的条件等价于：只选择 `delivery_date` 落在 **[p_start_date, p_end_date]** 内的记录。因此：

- 发货日期在 **2026-01-30 ～ 2026-02-06** 之间的单会被处理并写入 MaterialCostCache。
- 发货日期在 **2026-01-19**（或 1 月中下旬）的单，**早于** 2026-01-30，**不在「最近 7 天」内**，所以**永远不会被该事件选中**，也就不会生成对应的 MaterialCostCache。

结论：**不是存储过程写错了，而是 1 月 19 日的数据本来就不在「最近 7 天」的范围内，事件不会去更新它们。**

### 2. 为何 MaterialCostCache 里只有一条记录？

因为当前 **DeliverySettlement** 里，**落在「最近 7 天」内的记录很可能只有一条**（即发货日期 2/1/2026 的 FH2601310003）。事件只处理这个时间窗口，所以只插入/更新了这一条缓存。

1 月 19 日及附近日期的多条导入数据，都早于「最近 7 天」，所以不会出现在本次（以及以往每次）事件执行范围内。

### 3. 为何这条唯一记录的 material_cost 是 0、material_composition 为空？

这条记录（吉钢散料 A1，2/1/2026）被事件处理时，调用了 `sp_calculate_lifo_material_cost`。得到 **material_cost = 0**、**material_composition = []** 说明 LIFO 计算没有可用的生产数据或计算结果为 0，常见原因包括：

- **ProcessingCostInput** 中缺少「成品名 = 吉钢散料、库区 = A1、生产日期 ≤ 2026-02-01」且 **dailyProcess_qty > 0** 的记录；
- 或生产日期/字段格式解析失败，导致没有记录被选中；
- 或 LIFO 内部异常被捕获后返回了 0 和空 JSON。

这是**单笔订单**的 LIFO 数据问题，与「只有一条缓存」无关。

## 处理办法

### 一、先补全 1 月 19 日及之后的历史缓存（必做）

在 MySQL 中**手动执行**一次，把「从 1 月 19 日到当天」的结算单都算一遍并写入缓存：

```sql
-- 按你实际导入的起始日期调整开始日期
CALL sp_update_material_cost_cache('2026-01-19', CURDATE());
```

执行后：

- 1 月 19 日及之后、且在 DeliverySettlement 中存在的所有发货单，只要在日期范围内，都会被游标选中并调用 LIFO 计算、写入 MaterialCostCache。
- 若某条仍然 material_cost = 0，则说明该单对应的 **ProcessingCostInput** 数据不足或不符合 LIFO 条件，需要补录或修正加工数据后再重跑同一条 CALL。

### 二、让定时事件覆盖更长时间（建议）

若希望**以后**新导入的「稍早几天」的数据也能被自动更新，可以把事件的**时间窗口从 7 天改为 30 天**（或按需改为 14 天等）：

在 Navicat 中修改事件定义，把原来的：

```sql
CALL sp_update_material_cost_cache(
    DATE_SUB(CURDATE(), INTERVAL 7 DAY),
    CURDATE()
);
```

改为例如（30 天）：

```sql
CALL sp_update_material_cost_cache(
    DATE_SUB(CURDATE(), INTERVAL 30 DAY),
    CURDATE()
);
```

这样每次事件执行时，会更新「最近 30 天」内的发货单缓存，即使某次导入的是几天前的数据，只要在 30 天内，下次事件运行就会为其生成/更新 MaterialCostCache。

注意：窗口越大，每次执行时间越长，可根据数据量和服务器性能调整（如 14 天、30 天等）。

### 三、每次批量导入后手动补跑一段日期（可选）

如果经常批量导入**历史**结算数据（例如总是导入上月或更早的），可以养成习惯：

- 导入完成后，对**该批数据所在的日期范围**执行一次：
  ```sql
  CALL sp_update_material_cost_cache('导入数据起始日期', '导入数据结束日期');
  ```
- 这样不依赖事件的时间窗口，也能保证新导入的单据马上有材料成本缓存。

## 小结

| 现象 | 原因 | 处理 |
|------|------|------|
| 1 月 19 日的导入数据没有生成 MaterialCostCache | 事件只更新「最近 7 天」，1/19 不在该范围内 | 手动执行 `CALL sp_update_material_cost_cache('2026-01-19', CURDATE());` |
| MaterialCostCache 里只有一条记录 | DeliverySettlement 中落在「最近 7 天」内的只有一条（2/1/2026） | 同上，扩大日期范围后重跑即可为 1/19 等多条生成缓存 |
| 这条唯一记录 material_cost=0、material_composition=[] | 该单 LIFO 计算无可用 ProcessingCostInput 或计算异常 | 检查并补全「吉钢散料 A1」、生产日期 ≤ 发货日期的加工录入，再对该日期范围重跑 CALL |

**核心结论**：事件按「最近 7 天」过滤，所以 1 月 19 日的导入数据不会被事件处理；先对 2026-01-19 ～ 今天执行一次 `sp_update_material_cost_cache`，再视需要把事件改为「最近 30 天」即可。
