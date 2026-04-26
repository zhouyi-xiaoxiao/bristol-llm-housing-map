# HANDOFF — 当前状态叙述

> Last touched: 2026-04-27 by Claude (Opus 4.7)

## 这次会话做了什么

用户报了两个移动端 bug：
1. 移动端点地图 marker 第二次会"跳回写着 listing 的地图"（弹回到 fit-all-bounds 视图）。
2. 移动端没有详情面板，看不到桌面端右侧那种含官方来源 + 完整信息的视图。

修复 + 改造在一次落地：

### 1. MapView.tsx — Marker effect 三段式重写
原本一个 useEffect 干了三件事（rebuild + fitBounds + selection），deps 数组里有 `selectedId`，所以每次选中都重建 + fitBounds，移动端就表现为弹回。

拆成：
- **Effect A**：仅 listings 变化时重建 marker，icon 全用未选中态。deps `[listings, onSelect]`。
- **Effect B**：仅 listings 变化时 fitBounds。deps `[listings, bounds]`。
- **Effect C**：selectedId 变化时只 `setIcon` + `zoomToShowLayer` + popup 控制。deps `[selectedId, listings]`。

popup 显示阈值同步从 `min-width: 661px` 改为 `min-width: 1021px`，对齐 CSS 断点（aside 在 ≤1020px 隐藏）。

### 2. App.tsx — MobileDetailPanel 替代 MobileSummaryStrip
原 `MobileSummaryStrip` 是横向滚动卡片条，每张卡只有 name + walk + price + Apple/Google，没有 note、sourceStatusLabel、sourceUrl。

新组件 `MobileDetailPanel` 显示完整信息（与桌面 `SelectedSummary` 同层级）：编号 + 类别 kicker、name、note、walk + price + sourceStatusLabel chip、Apple/Google/sourceUrl 三个链接。`aria-live="polite"`。

### 3. styles.css
- 移除 `.mobileSummaryStrip / .mobileSummaryCard / .activeMobileSummary / .summaryLinks` 全部规则。
- 新增 `.mobileDetailPanel` 桌面默认 `display: none`，移动端 `display: block`。
- 复用现有 `.miniFacts` `.linkRow.stackedLinks` 类。

### 4. AI-native 改造
- `README.md`：人类入口（5 分钟跑起来、目录、数据形状、路线图、设计取舍）。
- `CLAUDE.md`：agent 入口（架构图、关键文件 + 行号、gotchas、验证清单、不要做的事）。
- `tasks/HANDOFF.md`（本文件）+ `tasks/STATE.md`（任务表格）。
- `.claude/settings.json`：npm run / git 只读命令免审。

## 验证

通过 preview 工具实测：
- 桌面 1400×900：mapShell 双栏 (`872px 390px`)，aside 显示，mobile panel 隐藏，含来源链接。
- 移动 375×812：aside 隐藏，mobile panel 显示完整（含来源链接 "来源 · HELLO STUDENT" 等）。
- 点击 listing A → listing B：zoom 保持 16，center 变为 B 的位置。说明 fitBounds 没触发。
- 切 filter (Top picks)：zoom 从 16 → 14，markers 数量减少。说明 Effect B 在 listings 变化时正确 fitBounds。
- `npm run build` 通过（TS 严格模式 + Vite）。

## 下次接手从哪里开始

1. **Tile 偏好持久化**：`MapView.tsx:101` 的 `tilesEnabled` state 在每次刷新都重置为 `true`。可写到 `localStorage`。
2. **a11y**：`MobileDetailPanel` 已加 `aria-live="polite"`，但还没做：
   - marker 键盘导航（Tab 在 markers 间切换）
   - selectedId 切换时 focus 移到 panel
   - color contrast 审计
3. **Service worker 离线兜底**：`localBasemap.ts` 已是离线 polyline 兜底，但首次加载 JS bundle 还需要网络。加个最小 SW 让 GH Pages 部署也能离线。
4. **Vitest smoke test**：mock `L.markerClusterGroup`，断言「selectedId 变化时不调 clearLayers / fitBounds」，固化本次修复。

## Open questions

- 是否需要在 `MobileDetailPanel` 底部加一行小型「快速跳转 chips」（让用户在 panel 里直接切下一条 listing）？暂时没加，避免 panel 过长；用户可以滑回到地图点其它 marker。
- vite base path 是否要改成相对路径 `./`，让 dev / preview / GH Pages 都能用同一份 build？目前是 hardcoded `"/bristol-llm-housing-map/"`。
