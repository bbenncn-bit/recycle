# 再生资源交易数据展示系统

基于 Next.js 构建的现代化再生资源交易数据展示平台，支持智能缩略图优化。

## ✨ 主要功能

- 📊 实时展示再生资源交易数据（报废车、废钢铁）
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

### 数据库连接池（远程 MySQL / 首页并发易超时时）

在 `.env` 中除 `DATABASE_URL` 外，可按需设置（均为正整数，单位毫秒或个数）：

| 变量 | 说明 |
|------|------|
| `DATABASE_CONNECTION_LIMIT` | 池最大连接数，默认 `20` |
| `DATABASE_CONNECT_TIMEOUT_MS` | 建立连接超时，默认 `60000` |
| `DATABASE_POOL_ACQUIRE_TIMEOUT_MS` | 从池取连接超时，默认 `60000` |
| `DATABASE_QUERY_TIMEOUT_MS` | 单次查询超时，默认 `60000` |

若仍出现 `pool timeout`，请检查本机到数据库的网络、`max_connections` 与防火墙。

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
