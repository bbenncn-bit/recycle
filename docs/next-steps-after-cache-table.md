# 缓存表创建后的下一步操作

## ✅ 已完成
1. ✓ 创建 MaterialCostCache 表
2. ✓ 运行 `npx prisma generate`

## 📋 接下来要做的操作

### 步骤 1: 增加前端超时时间（已完成）
- 已将超时时间从 60 秒增加到 300 秒（5 分钟）
- 这是临时方案，缓存生效后可以改回

### 步骤 2: 初始化缓存（最重要！）

这是最关键的一步，需要执行一次全量缓存更新。

#### 方式 A: 通过 API（推荐）

打开浏览器或使用 curl，访问：

```bash
# Windows PowerShell
Invoke-WebRequest -Uri "http://localhost:3001/api/profit-management/update-material-cost-cache" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"startDate": "2025-01-01", "endDate": "2025-12-31", "batchSize": 50}'
```

或者使用 curl（如果已安装）：
```bash
curl -X POST http://localhost:3001/api/profit-management/update-material-cache \
  -H "Content-Type: application/json" \
  -d "{\"startDate\": \"2025-01-01\", \"endDate\": \"2025-12-31\", \"batchSize\": 50}"
```

**注意**：
- 根据您的数据量，这个过程可能需要 10-30 分钟
- 建议在低峰期执行
- `batchSize: 50` 表示每批处理 50 条记录，可以根据服务器性能调整

#### 方式 B: 使用脚本

```bash
cd E:\pxrecycle
npx ts-node src/scripts/update-material-cost-cache.ts
```

### 步骤 3: 添加数据库索引（提升查询性能）

在 MySQL 中执行以下 SQL：

```sql
-- 为 ProcessingCostInput 表添加复合索引（提升 LIFO 查询速度）
CREATE INDEX IF NOT EXISTS idx_product_warehouse_date 
ON ProcessingCostInput(product_name, product_warehouse, production_date);

-- 如果上面的语句不支持 IF NOT EXISTS，使用：
-- CREATE INDEX idx_product_warehouse_date 
-- ON ProcessingCostInput(product_name, product_warehouse, production_date);
```

### 步骤 4: 验证缓存是否生效

1. 等待缓存初始化完成
2. 访问利润分析页面：`http://localhost:3001/profit-management/profit-analysis`
3. 查看浏览器控制台，应该看到 "从缓存读取材料成本" 的日志
4. 页面加载时间应该从 180 秒降至 3-5 秒

### 步骤 5: 检查 ProcessingCostInput 字段问题

如果仍然看到 `product_tons` 字段不存在的错误，需要检查：

1. 连接数据库，执行：
```sql
DESCRIBE ProcessingCostInput;
```

2. 查看 `product_tons` 字段是否存在，如果不存在，可能是：
   - 字段名不同（如 `productTons`、`product_tons`）
   - 需要添加该字段

3. 如果字段确实不存在，我们需要修改代码使用其他字段或添加该字段

## ⚠️ 注意事项

1. **缓存初始化时间**：根据数据量，可能需要 10-30 分钟，请耐心等待
2. **服务器资源**：缓存初始化会占用一定 CPU 和数据库资源，建议在低峰期执行
3. **数据一致性**：如果 ProcessingCostInput 表有更新，需要重新运行缓存更新

## 🔍 故障排查

### 问题 1: 缓存更新失败
- 检查 MaterialCostCache 表是否已创建
- 检查数据库连接是否正常
- 查看服务器日志中的错误信息

### 问题 2: 仍然很慢
- 确认缓存初始化已完成
- 检查是否有缓存记录：`SELECT COUNT(*) FROM MaterialCostCache;`
- 查看浏览器控制台是否显示 "从缓存读取"

### 问题 3: product_tons 字段错误
- 执行 `DESCRIBE ProcessingCostInput;` 查看实际字段名
- 告诉我实际字段名，我会修改代码

## 📊 预期效果

- **优化前**: 180 秒（3 分钟）
- **优化后**: 3-5 秒（缓存命中）
- **提升**: 97%+
