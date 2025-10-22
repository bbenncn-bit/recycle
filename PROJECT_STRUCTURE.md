# PXRecycle 项目结构说明文档

## 项目概述
PXRecycle 是一个基于 Next.js 15 的废料回收管理系统，使用 Prisma 作为 ORM，MySQL 作为数据库，Tailwind CSS 作为样式框架。

## 技术栈
- **前端框架**: Next.js 15.3.3 (App Router)
- **数据库**: MySQL
- **ORM**: Prisma 6.10.1
- **样式**: Tailwind CSS 4
- **语言**: TypeScript 5
- **图标**: Lucide React
- **图片处理**: Sharp

## 项目结构详解

### 根目录文件
```
pxrecycle/
├── package.json              # 项目依赖和脚本配置
├── next.config.ts            # Next.js 配置文件
├── tsconfig.json             # TypeScript 配置
├── postcss.config.mjs        # PostCSS 配置
├── ecosystem.config.cjs      # PM2 进程管理配置
├── deploy.ps1                # 部署脚本
├── README.md                 # 项目说明
└── .env                      # 环境变量（包含数据库连接）
```

### 数据库相关
```
prisma/
└── schema.prisma             # Prisma 数据模型定义
generated/                    # Prisma 生成的客户端代码
└── prisma/                   # 生成的 Prisma Client
```

### 源代码结构 (`src/`)

#### 应用页面 (`src/app/`)
```
app/
├── layout.tsx                # 根布局组件
├── page.tsx                  # 首页（数据展示）
├── globals.css               # 全局样式
├── login/page.tsx            # 登录页面
├── market/page.tsx           # 市场页面
├── purchase/                 # 采购模块
│   ├── page.tsx             # 采购首页
│   ├── evbattery/page.tsx   # 电动车电池采购
│   ├── plastic/page.tsx     # 塑料采购
│   ├── scrapcar/page.tsx    # 报废车采购
│   └── scrapsteel/page.tsx  # 废钢采购
├── disposal/                 # 处置模块
│   ├── page.tsx             # 处置首页
│   ├── auction/page.tsx     # 竞拍页面（从 v0.app 复制）
│   └── fixedprice/page.tsx  # 固定价格页面
└── api/                      # API 路由
    ├── receiptfc/            # 报废车数据 API
    │   ├── route.ts         # GET 接口
    │   ├── fetch.ts         # 服务端函数
    │   └── fetch-batch.ts   # 分页服务端函数
    ├── receiptfg/            # 废钢数据 API
    │   ├── route.ts         # GET 接口
    │   ├── fetch.ts         # 服务端函数
    │   └── fetch-batch.ts   # 分页服务端函数
    └── thumbnails/           # 缩略图处理 API
        └── auto-process/
            └── route.ts     # 缩略图自动处理
```

#### 组件库 (`src/components/`)
```
components/
├── ui/                       # UI 基础组件（简化版 shadcn/ui）
│   ├── badge.tsx            # 徽章组件
│   ├── button.tsx           # 按钮组件
│   └── card.tsx             # 卡片组件
├── navbar.tsx               # 导航栏组件
├── footer.tsx               # 页脚组件
├── theme-provider.tsx       # 主题提供者
├── theme-toggle.tsx         # 主题切换
├── acme-logo.tsx            # Logo 组件
├── fonts.ts                 # 字体配置
├── instant-thumbnail.tsx    # 即时缩略图组件
├── progressive-table.tsx    # 渐进式表格组件
└── progressive-table-with-pagination.tsx  # 带分页的表格组件
```

#### 服务层 (`src/lib/` 和 `src/services/`)
```
lib/
├── utils.ts                 # 工具函数（cn 函数等）
├── prismadb.ts             # Prisma 客户端配置
├── image-utils.ts          # 图片处理工具
├── thumbnail-auto-init.ts  # 缩略图自动初始化
└── services/
    └── receipt-service.ts  # 数据服务层（报废车和废钢）

services/
└── thumbnail-service.ts    # 缩略图生成服务
```

## 数据库模型

### receiptfc (报废车表)
- `id`: 主键
- `saleMemberId`: 销售员ID
- `saleMemberName`: 销售员姓名
- `taxInclu`: 含税总价
- `unitpriceIncluTax`: 含税单价
- `wasteTypeName`: 废料类型名称
- `imgUrls`: 图片URL
- `weight`: 重量
- `orderTime`: 订单时间
- `carNumber`: 车牌号
- `carBrand`: 汽车品牌
- `createTime`: 创建时间
- `queryDate`: 查询日期

### receiptfg (废钢表)
- 字段与 receiptfc 相同，但 `imgUrls` 字段类型为 `Text`

## 从 v0.app 集成页面的注意事项

### 1. 依赖问题
从 v0.app 复制的页面通常依赖 shadcn/ui 组件库，需要：
- 安装相关依赖包（如 `class-variance-authority`, `clsx`, `tailwind-merge`）
- 或者创建简化版本的组件（推荐）

### 2. 组件导入路径
确保所有组件导入路径正确：
```typescript
// 正确的导入方式
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
```

### 3. 样式兼容性
- 确保 Tailwind CSS 配置正确
- 检查是否有自定义 CSS 变量需要定义
- 验证响应式设计在不同设备上的表现

### 4. 图标依赖
如果使用 Lucide React 图标，需要安装：
```bash
npm install lucide-react
```

### 5. 类型定义
确保 TypeScript 类型定义正确，特别是：
- 组件 Props 接口
- 事件处理函数类型
- 状态管理类型

## 开发环境设置

### 1. 环境变量
创建 `.env` 文件：
```env
DATABASE_URL="mysql://username:password@host:port/database"
```

### 2. 数据库连接
```bash
# 生成 Prisma 客户端
npx prisma generate

# 数据库迁移（如果需要）
npx prisma db push
```

### 3. 开发服务器
```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 部署配置

### PM2 配置
使用 `ecosystem.config.cjs` 进行进程管理：
```javascript
module.exports = {
  apps: [{
    name: 'pxrecycle',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

### 部署脚本
使用 `deploy.ps1` 进行自动化部署。

## 常见问题解决

### 1. 构建错误
- 检查所有导入路径是否正确
- 确保所有依赖包已安装
- 验证 TypeScript 类型定义

### 2. 数据库连接问题
- 检查 `.env` 文件中的 `DATABASE_URL`
- 确保数据库服务器可访问
- 验证 Prisma 客户端是否已生成

### 3. 样式问题
- 确保 Tailwind CSS 配置正确
- 检查是否有缺失的 CSS 类
- 验证响应式断点设置

### 4. 权限问题
- 在 Windows 上可能需要管理员权限
- 检查文件系统权限设置
- 确保 Node.js 有足够的权限访问项目目录

## 最佳实践

1. **组件复用**: 使用 `@/components/ui/` 中的基础组件
2. **类型安全**: 充分利用 TypeScript 类型检查
3. **错误处理**: 在 API 路由中添加适当的错误处理
4. **性能优化**: 使用 Next.js 的优化功能（图片优化、代码分割等）
5. **代码组织**: 保持清晰的目录结构和文件命名规范

## 扩展建议

1. **状态管理**: 考虑添加 Zustand 或 Redux Toolkit
2. **表单处理**: 集成 React Hook Form
3. **数据验证**: 使用 Zod 进行运行时类型验证
4. **测试**: 添加 Jest 和 React Testing Library
5. **国际化**: 集成 next-intl 支持多语言
