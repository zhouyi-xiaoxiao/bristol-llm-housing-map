# Bristol LLM Housing Map

中国 LLM 留学生在 Bristol 找住宿的辅助地图。以 University of Bristol Law School / Wills Memorial Building 为中心，汇总步行 ~20 分钟以内的 PBSA、大学官方 residence、社会房源，配合一份「来源审计」说明每条数据从哪儿来。

最近一次数据复核：2026-04-27。

## 5 分钟跑起来

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173/bristol-llm-housing-map/`。Vite 会做 HMR，改 `src/` 会自动刷。

构建：

```bash
npm run build      # tsc --noEmit + vite build；产物在 dist/
npm run preview    # 本地预览 build 产物
```

部署：项目设定为 GitHub Pages 子路径，`vite.config.ts` 里 `base: "/bristol-llm-housing-map/"`。要换路径就改这一处。

## 目录

```
src/
├── App.tsx              主 UI、状态、各 section（hero、filter、map、application、listings、table、audit）
├── MapView.tsx          Leaflet + markercluster 地图组件（marker 三段式 effect）
├── data.ts              17 条房源数据 + Listing 类型 + categories + sourceAudit + applicationLinks
├── localBasemap.ts      离线 polylines/labels 兜底（在线 tile 失败时用）
├── styles.css           所有样式（无 Tailwind / CSS-in-JS）
└── main.tsx             Vite 入口
```

## 数据形状

`src/data.ts` 的 `Listing` type 字段：`id, name, area, walk, price, type, note, tags, lat/lng, origin, sourceLabel, sourceUrl, sourceStatus ('verified'|'provider'|'search'|'live'), category, priority, topPick, borderline, verifyLive`。

新增/修改房源就在 `data.ts` 改这个数组。地图、卡片、表格、详情面板全部从同一份数据派生。

## 路线图

已完成：
- 桌面端右侧详情面板（`SelectedSummary`）
- 移动端详情面板（`MobileDetailPanel`，复用桌面信息层级）
- 修复：移动端二次点击不再回弹到 listing 总图（marker effect 三段拆分）
- AI-native 文档（CLAUDE.md、tasks/）

待做（见 `tasks/STATE.md`）：
- Tile 偏好持久化（localStorage）
- a11y 审计：focus trap on selection，键盘导航 marker
- 离线 service worker（让 GitHub Pages 部署也能离线浏览）

## 设计取舍

- **离线兜底**：tile 加载失败时切到 `localBasemap.ts` 的本地线性图，不希望页面在没网时 100% 空白。
- **静态数据**：所有房源数据 import 进 bundle，不 fetch；目标是这是个长期可读、可分享、不依赖后端的作品集页面。
- **无 router**：单页站，hash 导航 (`#map` `#listings` `#apply`) 已够用。

## License / 来源

所有外链来源（Hello Student、Unite、IQ、Bristol University Accommodation 等）都标在 listing 的 `sourceUrl` + 页脚 `verificationLinks`。地图 tile 来自 Esri World Street Map + OpenStreetMap contributors。
