# STATE — 任务进度表

| Task | Status | File anchors | Notes |
|---|---|---|---|
| 移动端二次点击跳回 listing 总图 | ✅ done (2026-04-27) | `src/MapView.tsx` Effects A/B/C | 拆分原单一 useEffect，selectedId 解耦 fitBounds |
| 移动端详情面板（含官方来源 + 完整信息） | ✅ done (2026-04-27) | `src/App.tsx` `MobileDetailPanel` | 复用桌面 SelectedSummary 信息层级 |
| AI-native 文档 | ✅ done (2026-04-27) | `README.md` `CLAUDE.md` `tasks/` `.claude/settings.json` | 给后续 agent 接手用 |
| Popup 阈值同步 CSS 断点 | ✅ done (2026-04-27) | `src/MapView.tsx` Effect C | 661px → 1021px |
| Tile 偏好持久化（localStorage） | ⬜ todo | `src/MapView.tsx:101` `tilesEnabled` state | 每次刷新都重置为 true |
| a11y：marker 键盘导航 | ⬜ todo | `src/MapView.tsx` markerIcon | Tab 切换 + Enter 选中 |
| a11y：focus 移到 detail panel on select | ⬜ todo | `MobileDetailPanel` / `SelectedSummary` | aria-live 已有 |
| a11y：color contrast 审计 | ⬜ todo | `src/styles.css` 配色变量 | 重点 chip 字色与背景 |
| Vitest smoke test | ⬜ todo | 新建 `src/__tests__/MapView.test.tsx` | mock markerClusterGroup |
| Service worker 离线兜底 | ⬜ todo | `vite.config.ts` 加 plugin | GH Pages 离线访问 |
| vite base path 改相对 | ❓ open question | `vite.config.ts:5` | 现在 hardcoded 子路径 |
| MobileDetailPanel 快速跳转 chips | ❓ open question | `src/App.tsx` `MobileDetailPanel` | 看用户反馈再决定 |

图例：✅ done / 🟡 in progress / ⬜ todo / ❓ open question
