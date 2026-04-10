# 紧急排查：MaterialCostCache 全部变为 0

## 可能原因

1. **ProcessingCostInput 被误删过多**  
   若删除时条件写错（或误执行了全表删除/清空），导致**有产量且带材料列**的加工记录也没了，LIFO 就无数据可用 → 每笔 material_cost = 0。

2. **存储过程内部报错被“吞掉”**  
   `sp_calculate_lifo_material_cost` 里有 `DECLARE EXIT HANDLER FOR SQLEXCEPTION`，**任意 SQL 报错都会把 material_cost 置为 0 并返回**。若表结构变更、列名/类型不匹配、或某条数据触发异常，就会**每笔都得到 0**，看起来像“全部变 0”。

---

## 第一步：确认 ProcessingCostInput 里是否还有“有产量、有材料”的数据

在**同一库**执行：

```sql
-- 1）加工表总行数
SELECT COUNT(*) AS total_rows FROM ProcessingCostInput;

-- 2）钢筋压块 C1、dailyProcess_qty > 0 且 M1_qty 有值的行（之前能算出 103888 的那类）
SELECT id, product_name, product_warehouse, production_date, dailyProcess_qty,
       M1_qty, M1_price, auxiliary_qty, auxiliary_price
FROM ProcessingCostInput
WHERE product_name = '钢筋压块' AND product_warehouse = 'C1'
  AND COALESCE(dailyProcess_qty, 0) > 0
ORDER BY id DESC
LIMIT 5;
```

- 若 **1）总行数变为 0 或很少**，或 **2）查不到任何一行**（或 M1_qty、M1_price 全为空）：  
  说明加工数据缺失或材料列被清空，**需要从备份恢复 ProcessingCostInput**，或重新录入加工单，再重跑缓存更新。

- 若 **2）仍有行且 M1_qty、M1_price 有值**：  
  说明数据还在，问题多半是**存储过程内部报错**，继续下面第二步。

---

## 第二步：单笔测试存储过程是否报错

用**之前有非 0 材料成本**的一笔（例如 钢筋压块 C1 的 FH2512310015）单独调用 LIFO，看 OUT 参数是否仍为非 0：

```sql
SET @delivery_num = 'FH2512310015';
SET @product_name = '钢筋压块';
SET @product_warehouse = 'C1';
SET @delivery_date = '1/1/2026';
SET @settlement_qty = 46.77;
SET @out_cost = NULL;
SET @out_comp = NULL;
SET @out_recs = NULL;

CALL sp_calculate_lifo_material_cost(
    @delivery_num,
    @product_name,
    @product_warehouse,
    @delivery_date,
    @settlement_qty,
    @out_cost,
    @out_comp,
    @out_recs
);

SELECT @out_cost AS material_cost, @out_comp AS material_composition, @out_recs AS production_records;
```

- 若 **@out_cost 为 0** 且你确认 ProcessingCostInput 里 钢筋压块 C1 仍有 M1_qty/M1_price：  
  说明**存储过程内部发生了异常**，被 EXIT HANDLER 捕获后统一返回 0。  
  可能原因：列名/类型变更、字符集、或某条数据导致 STR_TO_DATE/计算异常。需要查看库的 **error log**，或临时在存储过程里把 `v_sql_error` 写进一张日志表再重跑这条 CALL，看具体报错信息。

- 若 **@out_cost 非 0**：  
  说明单笔计算正常，问题可能在 **sp_update_material_cost_cache**（例如游标取数、传参或日期范围）。可再检查缓存更新过程的逻辑和传入的日期参数。

---

## 第三步：若确认是误删数据

若第一步确认是 **ProcessingCostInput 被删多了或整表被清空**：

1. **从备份恢复** ProcessingCostInput 到删除前的状态（推荐）。
2. **若没有备份**：只能重新在小程序/系统里录入加工单，或从其他数据源重新导入，再执行：
   ```sql
   CALL sp_update_material_cost_cache('2026-01-01', CURDATE());
   ```

**以后删除“0 产量”时建议只用明确条件**，例如只删 `dailyProcess_qty` 明确等于 0 的行，避免误删或误更新：

```sql
-- 仅删除产量明确为 0 的行（不包含 NULL）
DELETE FROM ProcessingCostInput WHERE dailyProcess_qty = 0;
-- 执行前先用 SELECT 确认影响行数：
-- SELECT * FROM ProcessingCostInput WHERE dailyProcess_qty = 0;
```

---

## 小结

| 第一步结果 | 第二步结果 | 结论与建议 |
|------------|------------|------------|
| ProcessingCostInput 无数据或无 M* 列 | - | 从备份恢复或重新录入加工数据，再跑 CALL |
| 仍有 钢筋压块 C1 且 M* 有值 | @out_cost = 0 | 存储过程内部报错，查 error log 或写日志表抓 MESSAGE_TEXT |
| 同上 | @out_cost 非 0 | 单笔正常，问题在 sp_update_material_cost_cache 的批量逻辑/参数 |

请先执行**第一步**的两段 SQL，把结果（总行数 + 钢筋压块 C1 那 5 行是否有数据、M1_qty/M1_price 是否为空）发出来，再决定是恢复数据还是查存储过程报错。
