# Fox Life Web — Technical Spike

只驗證 Vite + TypeScript + Three.js 的技術基礎，尚未進入 V0.1。
產品依據是 `docs/PRODUCT.md`；Web scope 與工程原則見根目錄 Handoff。

## 執行

已驗證環境：Windows、Node.js 24.19.0、npm 11.17.0。

```sh
npm install
npm run dev -- --port 5173 --strictPort
npm run typecheck
npm run build
npm run preview -- --port 4173 --strictPort
```

開啟 http://127.0.0.1:5173/；production 預覽為 http://127.0.0.1:4173/。
伺服器僅監聽 loopback；終端 Ctrl+C 停止。正式輸出在 `dist/`。

## 操作與驗收

1. 開啟後應看到房間、窗戶、帶眼睛／鼻部／雙腳的 Character placeholder。
2. 不操作，觀察 Idle → Walk → Idle：停留約 2 秒，以 1.1 單位／秒巡走。
3. 滑鼠左鍵拖曳環繞、滾輪縮放；「重設鏡頭」恢復原始構圖。
4. 點窗戶玻璃或窗框：Window hits +1，玻璃在藍色／黃色間切換。
5. 拖曳窗戶或點空白處不應增加 hits。點窗戶不會下達 Observe 指令。
6. 調整視窗尺寸：Canvas 隨容器更新，Debug 的 Viewport 跟著變化。
7. Debug 可收合；狀態與位置約每秒更新 10 次。

## 最小模組

| 檔案 | 用途 |
| --- | --- |
| `src/main.ts` | Bootstrap、Renderer、OrbitControls、loop、resize、HMR 資源清理 |
| `src/scene.ts` | Scene、Camera、燈光、低牆房間、窗戶幾何 |
| `src/Character.ts` | CharacterState、primitive 外觀、自主巡走、Idle/Walk 程序動作 |
| `src/WindowInteraction.ts` | 指標座標轉換、拖曳排除、最近表面 Raycaster 命中 |
| `src/DebugPanel.ts` | State、位置、窗戶計數、viewport、renderer 訊息、重設鏡頭 |
| `src/styles.css` | 最小 Debug overlay 與響應式 Canvas 版面 |

沒有 React、外部模型／貼圖、Backend、通用家具框架或完整 Observe。
詳細實測證據與限制見 `docs/TECHNICAL_SPIKE.md`。
