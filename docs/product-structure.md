# 产品结构

## 角色入口

本产品分为三个角色入口，避免管理员、家长和孩子学习空间互相混在同一条流程里。

| 区域 | 路径 | 主要职责 |
| --- | --- | --- |
| 管理员后台 | `/admin` | 管理员登录、创建家长账号、编辑/停用/重置/删除家长账号、查看测试数据 |
| 家长登录 | `/login` | 家长使用管理员创建的账号登录 |
| 孩子选择 | `/children` | 家长创建、编辑、删除孩子账号，并选择进入某个孩子的学习空间 |
| 孩子学习空间 | `/child/:childId/*` | 当前孩子的学习、闯关、练习、成长、设置和打印 |

## 管理后台结构

管理后台只服务测试版账号与数据管理，不承载孩子学习流程。

- 管理员登录：进入 `/admin` 后先校验管理员身份。
- 家长账号管理：创建、编辑、停用/启用、重置密码、删除家长账号。
- 测试数据管理：生成示例数据、导入、导出、清空测试数据。
- 数据查看：展示家长账号、孩子数量、练习数量、最近活跃时间。

后台页面不直接进入孩子做题、闯关、练习或成长页，避免管理任务和学习任务混用。

## 家长入口结构

家长入口只负责登录和孩子选择：

- `/login`：家长登录，也提供进入管理员后台的辅助入口。
- `/children`：展示当前家长下的孩子，支持新增、编辑、删除和进入学习空间。
- 孩子数量限制：每个家长最多创建 2 个孩子，避免测试版数据过散。
- 退出登录：清空当前家长会话，回到 `/login`。

孩子选择页不放数独棋盘、题库、学习曲线或打印管理。

## 孩子学习空间

孩子学习空间按学习场景拆成 7 个页面：

| 页面 | 路径 | 主要职责 |
| --- | --- | --- |
| 首页 | `/child/:childId/home` | 展示当前孩子、等级称号、今日推荐、成长摘要、折叠式智能难度说明 |
| 闯关 | `/child/:childId/adventure` | 展示 11 个大关、每关 5 个小关、关卡状态和推荐挑战 |
| 自由练习 | `/child/:childId/free-practice` | 练习选择、我的题库、批量出题、打印练习 |
| 成长 | `/child/:childId/growth` | 学习统计、星星、徽章、方法建议、最近记录和下一步建议 |
| 做题 | `/child/:childId/play` | 数独棋盘、数字键盘、检查、提示、揭晓、保存、打印、结果反馈 |
| 设置 | `/child/:childId/settings` | 练习偏好、声音、计时器、动画、家长密码修改 |
| 打印 | `/child/:childId/print` | 屏幕预览练习卷，打印时保持黑白清晰样式 |

## 导航规则

孩子学习空间的主导航只保留四个高频学习入口：

- 首页
- 闯关
- 自由练习
- 成长

设置、打印、切换孩子属于辅助工具，不放入主导航。题库和批量生成归入“自由练习”页面，旧学习曲线归入“成长”页面。

## 页面职责说明

- 首页：展示当前孩子、今日推荐、等级概览、继续闯关、自由练习、成长摘要和方法入口。
- 闯关：展示 11 个大关、当前大关详情、5 个小关、星级、解锁状态和开始挑战。
- 自由练习：整合练习选择、我的题库、批量出题和打印练习卷。
- 成长：整合学习曲线、星级统计、徽章、方法掌握和推荐下一步。
- 做题：承载棋盘、数字键盘、检查答案、引导式提示、显示答案、保存题库、打印当前题和结果反馈。
- 设置：承载练习偏好、声音、计时器、动画和家长密码修改。
- 打印：作为练习或做题后的预览页，不作为主导航入口。

## 数据模型分组

类型按产品领域分组，方便后续维护：

| 分组 | 主要模型 |
| --- | --- |
| `shared/types/account.ts` | `AdminAccount`、`ParentAccount`、`AuthSession` |
| `shared/types/child.ts` | `ChildProfile`、`ChildSettings` |
| `shared/types/practice.ts` | `SudokuPuzzleItem`、`PracticeRecord`、`PracticeSession` |
| `shared/types/adventure.ts` | `AdventureStageProgress`、`AdventureMapConfig` |
| `shared/types/growth.ts` | `BadgeRecord`、`StarSummary`、`LearningStats` |
| `shared/types/storage.ts` | `AppStorage` |

## 数据隔离

所有孩子数据继续通过 `parentId` 和 `childId` 隔离：

- 孩子资料：按 `parentId` 过滤
- 练习记录：按 `parentId + childId` 过滤
- 题库：按 `parentId + childId` 过滤
- 活跃孩子：保存在 `activeChildId`，切换孩子时清空或重新设置

localStorage key 保持 `kids-sudoku-trainer:v2`，本次结构调整不迁移、不重命名已有字段。

## 未来小程序迁移说明

当前结构把可复用逻辑和平台能力拆开，为微信小程序迁移预留边界：

- `src/core` 保持纯 TypeScript，未来可复制到 Taro 或小程序项目中复用。
- `src/platform` 封装 storage、navigation、sound、device、print，未来可替换为微信小程序 API。
- `src/data` 集中存储 schema 和迁移入口，未来接云数据库时可以保留 `parentId + childId` 的隔离策略。
- `src/features` 保留 Web 页面 UI，迁移小程序时可重写页面，但继续沿用相同产品结构。
- 管理后台和打印更适合继续留在 Web 端，小程序侧优先承载孩子练习、闯关、成长和家长查看。
