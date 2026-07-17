# 数独探险家 UI 图片资源

目录已按页面和用途拆分，所有图片均为单独的 WebP 文件。

## 引用路径
将整个 `sudoku-adventure` 文件夹放到项目：

`public/assets/sudoku-adventure/`

前端引用示例：

```tsx
<AssetImage
  src="/assets/sudoku-adventure/home/adventure-map.webp"
  alt="森林河流闯关地图"
/>
```

## 使用约束
- 图片中不包含标题、按钮和说明文字，所有文字由前端渲染。
- 返回、箭头、齿轮、开关等基础控件优先使用 SVG 图标库。
- 不要把完整 UI 效果图作为背景。
- `asset-manifest.json` 包含 alt、尺寸、文件大小和建议引用页面。
- `asset-inventory.csv` 便于核对资源清单。
