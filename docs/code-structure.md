# 代码结构

## 顶层目录

```text
src/
  app/          应用入口、路由常量、全局 providers
  features/     页面业务模块入口
  core/         数独、提示、难度、奖励、闯关、统计、课程方法等核心领域逻辑
  data/         本地仓储、存储 schema、迁移入口
  platform/     浏览器存储、打印、声音、设备、导航适配器
  shared/       跨功能共享类型、组件、布局和工具
  components/   现有组件兼容层，后续可逐步迁入 features/shared
  lib/          现有业务函数兼容层，后续可逐步迁入 core/data/platform
  styles/       视觉系统、布局、响应式和打印样式
  tests/        单元、组件和结构测试
```

## 路由

所有产品路由集中在 `src/app/routes.ts`：

- `ROUTES.ADMIN_LOGIN`
- `ROUTES.ADMIN_DASHBOARD`
- `ROUTES.PARENT_LOGIN`
- `ROUTES.CHILDREN`
- `ROUTES.CHILD_HOME`
- `ROUTES.CHILD_ADVENTURE`
- `ROUTES.CHILD_PRACTICE`
- `ROUTES.CHILD_GROWTH`
- `ROUTES.CHILD_SETTINGS`
- `ROUTES.CHILD_PLAY`
- `ROUTES.CHILD_PRINT`

组件不应散落硬编码 child 路径。构造孩子页面路径时使用 `childPath(childId, section)`，解析当前路径时使用 `matchChildRoute(pathname)`。

## Feature 边界

`src/features/*` 是页面业务入口：

| Feature | 职责 |
| --- | --- |
| `admin` | 管理员登录和后台 |
| `auth` | 家长登录、密码输入等认证 UI |
| `children` | 孩子选择和孩子资料表单 |
| `home` | 孩子首页 |
| `adventure` | 闯关地图 |
| `practice` | 练习选择、题库和打印准备 |
| `play` | 做题棋盘、键盘、工具栏、结果卡 |
| `growth` | 成长统计和学习报告 |
| `print` | 打印预览 |
| `settings` | 设置页相关组件 |

当前 feature 入口大多 re-export 旧组件，避免一次性大搬家。后续可以在不改变外部导入的情况下，把实现文件逐步迁入对应 feature。

## 类型分组

共享类型从 `src/shared/types/index.ts` 统一导出，并按领域拆分：

- `account.ts`：管理员、家长账号、会话
- `child.ts`：孩子资料、年级、设置
- `practice.ts`：题目、练习记录、自适应难度
- `adventure.ts`：闯关阶段和进度
- `growth.ts`：徽章和成长奖励
- `storage.ts`：localStorage 总结构

旧的 `src/types.ts` 仍保留，保证现有导入兼容。

## 存储兼容

`src/data/storageSchema.ts` 定义当前存储版本和 key：

```ts
APP_STORAGE_VERSION = 2
APP_STORAGE_KEY = "kids-sudoku-trainer:v2"
```

`src/data/migrations.ts` 是对外迁移入口，内部可继续放在 `src/data/migrations/` 下扩展。本次重组没有改变 `AppStorage` 字段，因此迁移数组为空。

## Core 边界

`src/core` 只放可复用领域逻辑：

- `sudoku`：棋盘、生成、求解、候选数。
- `hint`：引导式提示。
- `adaptive`：智能升级、保持与巩固建议规则。
- `rewards`：星星、徽章和奖励文案。
- `adventure`：闯关进度。
- `stats`：学习统计。
- `lessons`：方法课程入口。

这些模块不应依赖 React、DOM、`window`、`localStorage` 或浏览器音频能力。

## Platform 边界

`src/platform` 只放平台能力适配：

- `storageAdapter.ts`
- `printAdapter.ts`
- `soundAdapter.ts`
- `deviceAdapter.ts`
- `navigationAdapter.ts`

Web 当前实现放在 `src/platform/web/`。未来迁移微信小程序时，可以新增 `src/platform/wechat/` 并替换这些适配器，而不改数独核心逻辑。

## 新旧目录迁移说明

本次采用兼容迁移方式：

- `src/app/App.tsx` 成为新的应用入口，根目录 `src/App.tsx` 保留 re-export，避免一次性改动入口约定。
- `src/features/*` 先作为页面模块入口，逐步 re-export 原组件，后续再把实现文件移动进 feature。
- `src/shared/types/*` 已按领域拆分并统一从 `index.ts` 导出，旧 `src/types.ts` 保留兼容。
- `src/lib/*` 暂时作为旧业务函数兼容层，后续可继续拆到 `core`、`data`、`platform`。
- `src/components/*` 暂时作为旧 UI 组件兼容层，后续可继续拆到 `features` 或 `shared`。
