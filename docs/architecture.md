# 多端可迁移架构

## 分层

当前 Web 项目保留原有入口，同时新增可迁移边界：

- `src/core`：共享核心层。只放 pure TypeScript 能力，面向 Web 和未来 Taro/微信小程序复用。
- `src/platform`：平台适配层。封装 storage、print、sound、navigation、device。
- `src/data`：数据仓储边界。当前包装本地 repository，未来可替换云数据库或小程序 storage。
- `src/components`：Web React 展示层。保留电脑版 Web、管理者后台和响应式页面。
- `src/styles`：样式系统。`tokens.css` 放设计变量，`responsive.css` 放多端布局，`print.css` 放打印规则，`app.css` 放组件样式。

## 核心层边界

`src/core` 暴露以下可复用能力：

- `core/sudoku`：棋盘、求解、唯一解、生成、候选数。
- `core/hint`：引导式提示。
- `core/adaptive`：智能难度升级、保持、回退。
- `core/rewards`：星级、徽章、奖励文案。
- `core/adventure`：L1-L11 闯关地图、解锁、bestStars。
- `core/stats`：学习统计纯函数。
- `core/constants`：年级、难度、称号、方法教学。
- `core/services`：不依赖平台能力的业务组合函数。

核心层测试会扫描 `src/core`，避免直接引入 React、window、document、localStorage、AudioContext 等平台能力。

## 平台适配层

Web 当前实现：

- `webStorageAdapter`：localStorage JSON 读写，损坏数据自动恢复 fallback。
- `webPrintAdapter`：封装 `window.print`。
- `webSoundAdapter`：封装 Web Audio 奖励音。
- `webNavigationAdapter`：封装 history push/replace/back。
- `webDeviceAdapter`：按宽高识别 phone、tablet portrait、tablet landscape、desktop。

未来小程序只需要重写 `platform/wechat/*Adapter`，核心层不需要知道运行环境。

## 数据隔离

所有孩子相关数据都保留 `parentId + childId`：

- `ChildProfile`
- `PracticeRecord`
- `SudokuPuzzleItem`
- `AdventureStageProgress`

删除家长会清理家长、孩子、题库、练习记录和会话。删除孩子会清理该孩子账号、题库、练习记录和内嵌在孩子资料内的闯关进度。

## Web 保留范围

本次改造不删除 Web 功能：

- 管理者后台
- 家长登录
- 孩子选择
- 做题页
- 引导式提示和候选数
- 智能难度
- 星级奖励
- 成功动画音效
- 闯关地图
- 题库
- 学习曲线
- 打印
- 测试数据导入导出
