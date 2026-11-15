# Bristol LLM Housing Map

**在线地图：<https://zhouyi-xiaoxiao.github.io/bristol-llm-housing-map/>**

给去 University of Bristol 读 LLM 的中国留学生的找房地图。以 Law School / Wills Memorial Building 为中心，收录步行约 20 分钟以内的 studio 和 one-bedroom 房源，共 45 条：大学官方 residence、私营学生公寓（PBSA）、Bristol SU Lettings 和社会房源。每条都标明信息来自哪里，另附大学官方住宿的申请步骤和一份「来源审计」，说明哪些纳入、哪些放进边界备选、哪些排除以及原因。

A Chinese-language housing map for international Master of Laws students at the University of Bristol: 45 studio and one-bedroom options within about twenty minutes' walk of the Law School, each tagged with where its information came from.

- 适用：2026 年 9 月入学（2026/27 学年）。
- 数据核对：2026-04-27，之后没有再更新；价格、房态和申请日期都以那天为准。
- 链接复查：2026-11-15。已下架的房源页改链到网页存档或房源方首页，并在页面上注明。

Xiaoxiao Zhouyi · [zhouyixiaoxiao.com](https://zhouyixiaoxiao.com/)

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
├── data.ts              45 条房源数据 + Listing 类型 + categories + sourceAudit + applicationLinks
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
