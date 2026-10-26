# 前琰科技 · QianYan Tech

工业现场数字化解决方案品牌网站。钴蓝版：深色首屏、蓝雾过渡、浅色楼层，中英文切换，响应式布局与分层视差。

## 本地运行

`python3 -m http.server 4173`，打开 http://localhost:4173/ 。英文使用 `?lang=en`。

## GitHub Pages

Settings → Pages → Deploy from a branch → main / (root)。每次更新 main 分支都会自动发布。`.nojekyll` 表示直接发布静态文件，无需构建依赖。

## 文件

- index.html：入口
- app.js：双语内容、交互与动效
- styles.css：基础布局
- dark.css：深色设计
- studio.css：Impeccable 视觉升级、设备材质与响应式样式
- cobalt.css：钴蓝版色彩 token、首屏等距插画、蓝雾过渡带与各楼层换色（最后加载）
- tests/：浏览器检查（`node --test "tests/*.test.mjs"`，需本机 Chrome）
- qianyan-brand.png：品牌素材

## 内容说明

品牌设计预览，产品外观、界面和数字为示意。咨询表单仅生成本地需求摘要，不发送数据。字体在线加载失败时使用本地字体回退。品牌素材由项目方提供，网站内容未授予开源许可。
