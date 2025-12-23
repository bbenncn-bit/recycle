# 再生资源交易数据展示系统

基于 Next.js 构建的现代化再生资源交易数据展示平台，支持智能缩略图优化。

## ✨ 主要功能

- 📊 实时展示再生资源交易数据（报废车、废钢铁）
- 🔄 **自动数据同步**：每天自动从API拉取最新数据，无需手动操作
- 🎨 智能图片缩略图生成和优化
- 🌙 深色/浅色主题切换
- 📱 响应式设计，支持移动端
- ⚡ 渐进式图片加载，提升用户体验

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 配置数据库（首次使用）
```bash
# 编辑 setup-thumbnails.js 中的数据库配置
# 然后运行设置脚本
node setup-thumbnails.js setup
```

### 启动应用
```bash
npm run dev
```

## 🔄 自动数据同步系统

系统已配置自动数据同步功能，每天自动从API拉取最新的废钢和报废车数据。

### 工作原理

1. **自动启动**：应用启动时自动初始化定时任务
2. **定时执行**：默认每天凌晨 2:00 自动执行数据同步
3. **智能同步**：自动检测数据库中的最新数据，只同步缺失的部分

### 配置同步时间

可以通过环境变量 `DATA_SYNC_SCHEDULE` 自定义同步时间（Cron表达式）：

```bash
# 例如：每天凌晨3:00执行
DATA_SYNC_SCHEDULE="0 3 * * *"

# 例如：每天上午9:00和下午6:00各执行一次
DATA_SYNC_SCHEDULE="0 9,18 * * *"
```

### 手动触发同步

如果需要手动触发数据同步，可以调用API：

```bash
# 触发同步
curl -X POST http://localhost:3000/api/data-sync

# 查看同步状态
curl http://localhost:3000/api/data-sync/status
```

### 同步状态监控

访问 `/api/data-sync/status` 可以查看：
- 定时任务是否已启动
- 当前是否有同步任务正在运行
- Python脚本路径和是否存在

### 注意事项

- 确保Python项目目录在正确的位置（默认在 `../python/getdata.py`）
- 确保Python环境已安装所需依赖（pymysql, requests, cryptography等）
- 确保数据库连接配置正确

## 🎯 缩略图系统

本系统包含自动化的缩略图生成功能：

### 快速设置
```bash
# 设置数据库并生成缩略图任务
node setup-thumbnails.js setup

# 启动缩略图生成服务
node setup-thumbnails.js start

# 查看处理状态
node setup-thumbnails.js status
```

### 表选择
在设置过程中可以选择：
- 输入 `g` - 只处理 receiptfg 表
- 输入 `c` - 只处理 receiptfc 表  
- 输入 `both` - 处理两个表

## 📁 项目结构

```
├── src/
│   ├── app/                  # Next.js 应用页面
│   ├── components/           # React 组件
│   │   └── instant-thumbnail.tsx  # 缩略图组件
│   ├── lib/                  # 工具库
│   │   ├── image-utils.ts    # 图片处理工具
│   │   └── thumbnail-auto-init.ts  # 缩略图自动初始化
│   └── services/            # 业务服务
│       └── thumbnail-service.ts   # 缩略图生成服务
├── setup-thumbnails.js      # 缩略图系统设置脚本
├── run-thumbnail-service.ts # 缩略图服务启动器
└── database-optimization-simple.sql  # 数据库优化脚本
```

## 🔧 技术栈

- **前端**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **后端**: Node.js, MySQL
- **图片处理**: Sharp
- **主题**: next-themes
