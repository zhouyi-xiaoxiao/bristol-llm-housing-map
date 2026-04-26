# CLAUDE.md — agent 入口

给 Claude Code（或任何 agent）来这个仓库后第一份要读的文件。先读这个再动代码。

## TL;DR

Vite + React 19 + TypeScript + Leaflet 1.9 + leaflet.markercluster 的纯前端 SPA。  
17 条静态数据，无后端，无 router。状态全在 `App` 组件的 `useState`。  
桌面端右侧 `SelectedSummary` aside；移动端（≤1020px）下方 `MobileDetailPanel`。

## 架构

```
[App.tsx selectedId state]
        │
        ├──► <MapView listings selectedId onSelect>      （Leaflet 三段式 effect）
        │       │
        │       ├─ Effect A: rebuild markers when listings change   (deps: listings, onSelect)
        │       ├─ Effect B: fitBounds when listings change         (deps: listings, bounds)
        │       └─ Effect C: setIcon + zoomToShowLayer + popup      (deps: selectedId, listings)
        │             ↑ 移动 popup 强制 close，桌面 popup 打开
        │
        ├──► <SelectedSummary selected>      (display ≥1021px)
        │
        └──► <MobileDetailPanel selected>    (display ≤1020px)
                同样字段：kicker、name、note、miniFacts(walk/price/sourceStatus)、
                          Apple/Google Maps 链接、来源页面链接
```

数据流：marker click → `onSelect(id)` → `setSelectedId(id)` → React 重渲染 → MapView Effect C 跑 → 切 icon + 平滑 panTo + (桌面)open popup。

## 关键文件 + 行号锚点

| 位置 | 是什么 |
|---|---|
| `src/App.tsx:54-59` | `sourceStatusLabel()` — 把 `sourceStatus` 映射到中文 chip 文字 |
| `src/App.tsx:136-178` | `SelectedSummary`（桌面右侧 aside） |
| `src/App.tsx:180-225` | `MobileDetailPanel`（移动端，复用桌面层级） |
| `src/App.tsx:343-353` | `selectListing` — 必须保持 `useCallback` 引用稳定（否则 Effect A 会被误触） |
| `src/App.tsx:355-359` | filter 切换后 selectedId 不在 visibleListings 时自动重置 |
| `src/App.tsx:460-466` | `mapShell` 装配点：`<MapView />` + `<MobileDetailPanel />` + `<SelectedSummary />` |
| `src/MapView.tsx:158-175` | markercluster 配置（spiderfyOnMaxZoom、zoomToBoundsOnClick、maxClusterRadius） |
| `src/MapView.tsx:231-251` | **Effect A** — rebuild markers，icon 永远初始未选中态 |
| `src/MapView.tsx:253-264` | **Effect B** — fitBounds，仅 listings 变化时 |
| `src/MapView.tsx:266-289` | **Effect C** — selection-only：setIcon + zoomToShowLayer + 桌面 openPopup / 移动 closePopup |
| `src/data.ts` | `Listing` schema、`categories`、`sourceAudit`、`applicationLinks`、`destination` |
| `src/styles.css:664-677` | `.mapAside` 桌面规则 |
| `src/styles.css:707-733` | `.mobileDetailPanel` 桌面默认 hide，元素样式 |
| `src/styles.css:1107` | `@media (max-width: 1020px)` 块开始：aside hide、mobile panel show |
| `src/styles.css:1163` | `@media (max-width: 660px)` 块：进一步收缩 |

## Gotchas（踩坑记）

1. **不要把 `selectedId` 加进 marker creation effect 的 deps**。这是上次 bug 的根源——会触发 fitBounds 闪回，移动端表现为「第二次点 marker 跳回 listing 总图」。Effect A 的 deps 只能是 `[listings, onSelect]`。

2. **`MobileDetailPanel` 与 `SelectedSummary` 信息层级要保持同步**。改了一个就改另一个。两边都要有：编号 + 类别 kicker、name、note、walk + price + sourceStatusLabel、Apple/Google/sourceUrl 三个链接。

3. **Leaflet 容器初始化后必须 `invalidateSize`**（`MapView.tsx:180-181` 已做）。如果加新的 layout 切换（比如 sidebar 折叠），记得在切换后再 `invalidateSize`。

4. **CSS 断点**：详情面板在 ≤1020px 切换。桌面 aside 用 `.mapShell > .mapAside { display: none }` 隐，移动 panel 用 `.mobileDetailPanel { display: block }` 显。`<660px` 是字号/列数收缩，不影响切换逻辑。

5. **popup 的开关阈值**：Effect C 用 `window.matchMedia("(min-width: 1021px)")` 判断要不要 `openPopup()`。这个阈值必须和 CSS 断点一致——不一致会出现 popup 和 panel 同时显示或都不显示的怪状态。

6. **vite base path**：`vite.config.ts` 里 `base: "/bristol-llm-housing-map/"` 是 GitHub Pages 子路径。本地 dev 也要带这个前缀访问：`http://localhost:5173/bristol-llm-housing-map/`。

## 验证

每次改动 marker / detail panel / 响应式样式后：

```bash
npm run build      # TS 严格模式 + Vite，必须过
npm run dev        # 起 dev server
```

人工验证清单：

1. 桌面 1280×800：点两个不同 listing → 桌面 popup 打开 + aside 内容更新；地图平滑 panTo，不弹回到 fitBounds。
2. 移动 375×812：先点 cluster（应展开/zoom in），再点真 marker → 地图停在 marker 周围 + `MobileDetailPanel` 显示完整 (name/note/walk/price/状态/3 个链接)。
3. 切 filter chip（"Top picks" / "全部"）→ listings 变化时 fitBounds 应该触发（这是合理行为）。
4. 切 tile fallback 按钮 → 视图与选中状态都不应受影响。
5. resize 到 660 / 1020 边界 → 切换平滑，不出现两个面板同时显示。

自动化（如果加 vitest）：mock `L.markerClusterGroup`，断言 selectedId 变化只 setIcon，不调 clearLayers / fitBounds。

## 不要做

- 不要替换 leaflet（页面对 markercluster 强依赖，换 mapbox/maplibre 会牵动一大坨样式）。
- 不要引 router（单页 + hash 锚点已够）。
- 不要把 listings 数据外移到 fetch（离线可用是设计目标，作品集长期保存）。
- 不要在 tasks/ 之外创建 plan / decision / TODO 文件——所有进度跟踪在 `tasks/STATE.md` + `tasks/HANDOFF.md`。
