# 数独探险家

面向小学到初中学生的儿童数独分级训练工具，包含闯关地图、自由练习、成长报告、题库、打印和轻量小游戏。

## 本地开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
```

## 在线版本

GitHub Pages: https://loewe0330.github.io/kids-sudoku-adventure/

## 跨设备数据

公网版本通过 Netlify Function 与 Netlify Blobs 同步家长账号、孩子资料、闯关进度、练习记录和题库；浏览器中的 `localStorage` 仅作为当前设备缓存。首次升级后，请在原来创建账号的设备上重新登录一次管理者后台，已有本地数据会在云端为空时自动迁移。
