# 微信小程序迁移路线

## 推荐路线

1. 当前 Web 测试版继续保留，作为电脑版、管理者后台、打印和测试数据工具。
2. 保持 `src/core` 为 pure TypeScript 共享核心层，不引入 React、DOM、localStorage、window 或 Web Audio。
3. 新建 Taro React 小程序项目，不在当前 Web 项目里强行引入 Taro。
4. 复制 `src/core` 到 Taro 项目，优先复用数独、提示、智能难度、奖励、闯关和统计逻辑。
5. 在小程序项目中实现新的 `platform` adapters：storage、navigation、sound、device。
6. 重写小程序页面，用 Taro 组件和 rpx 样式承载孩子练习、闯关地图、学习曲线和家长查看。
7. 接入微信登录和云数据库时，把账号、孩子、练习记录、题库、闯关进度按 `parentId + childId` 隔离。
8. 上架前准备小程序备案、隐私保护指引和儿童信息最小化说明。

## 可直接复用模块

- `src/core/sudoku`
- `src/core/hint`
- `src/core/adaptive`
- `src/core/rewards`
- `src/core/adventure`
- `src/core/stats`
- `src/core/constants`
- `src/core/types`
- `src/core/services` 中不依赖平台能力的组合函数

## 小程序需要重写模块

- 页面组件和路由
- 存储实现：从 Web localStorage 换成 `wx.getStorage` / `wx.setStorage` 或云数据库
- 登录：从测试账号换成微信登录和后端会话
- 打印：小程序端建议生成图片/PDF，或引导到 Web 后台打印
- 音频：从 Web Audio API 换成小程序音频 API
- 动画：从 CSS 动画换成 Taro/小程序兼容动画
- 管理者后台：不建议放在小程序前端，继续保留 Web 后台

## Web 与小程序分工

- 小程序：孩子练习、闯关地图、学习曲线、家长查看。
- Web：管理者录入账号、测试数据导入导出、运营数据、打印练习卷、数据备份。

## 上架注意事项

- 完成小程序备案。
- 配置隐私保护指引。
- 不收集不必要儿童信息。
- 不采集学校、班级、真实姓名、位置、通讯录。
- 使用昵称和年级即可。
- 不把 AppSecret 写在前端。
- 管理者后台不要放在小程序前端。

## 未来命令示例

```bash
npm create taro@latest kids-sudoku-miniprogram
cd kids-sudoku-miniprogram
cp -R ../当前Web项目/src/core ./src/core
```

小程序侧需要新增：

```ts
// src/platform/wechat/wechatStorageAdapter.ts
export const wechatStorageAdapter = {
  async getItem<T>(key: string, fallback: T): Promise<T> {
    try {
      const result = await wx.getStorage({ key });
      return result.data ?? fallback;
    } catch {
      return fallback;
    }
  },
  async setItem<T>(key: string, value: T): Promise<void> {
    await wx.setStorage({ key, data: value });
  },
  async removeItem(key: string): Promise<void> {
    await wx.removeStorage({ key });
  },
  async clear(): Promise<void> {
    await wx.clearStorage();
  }
};
```

```ts
// src/platform/wechat/wechatNavigationAdapter.ts
export const wechatNavigationAdapter = {
  goTo(path: string) {
    wx.navigateTo({ url: path });
  },
  back() {
    wx.navigateBack();
  },
  replace(path: string) {
    wx.redirectTo({ url: path });
  }
};
```

在 Taro 的 `app.config.ts` 中保留 iPad 与横竖屏适配说明，页面样式使用 rpx、flex/grid 和安全点击区，不直接照搬 Web CSS。
