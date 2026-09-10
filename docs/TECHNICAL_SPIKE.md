# Web Technical Spike — 2026-09-10

## 結論與範圍

Vite + TypeScript + Three.js 足以支援本次 Prototype 的最小渲染／移動／互動需求。
Spike 必要功能已通過；建議 Product Owner Review 後再進入 V0.1 Vertical Slice。
本次未實作 Observe、正式狐狸模型、其他生活行為、Needs、Save 或多角色。

## 初始環境與決策

- 起始只有 PRODUCT 與 Handoff，無 package.json、程式碼、Git repository、AGENTS.md 或 hosting 設定。
- Node.js v24.19.0、npm 11.17.0、Git 2.55.0.windows.4。
- 建立 main 文件基準 commit `0859d2d`，在 `spike/web-foundation` 實作；無 remote、push、merge。
- 沙箱首次 npm 網路請求 EACCES；改用核准的權限執行後成功。
- Git 因執行帳戶／目錄擁有者不同觸發 ownership 檢查；只對各 Git 指令指定此目錄 safe.directory，未改全域設定。`.git` 寫入亦經核准執行。
- 自主巡走符合 PRODUCT 的觀察者定位，不加入 WASD 或逐步點地移動。
- 只有 Idle / Walk；窗戶只驗證 hit，不提前加入 V0.1 的 Observe command。
- 所有視覺由 primitive geometry 與自建材質構成，無外部素材。

## 實際命令結果

| 命令 | 結果 |
| --- | --- |
| `npm install three --save-exact` | 成功，加入 1 package |
| `npm install -D vite typescript @types/three --save-exact` | 成功，加入 24 packages |
| `npm install` | exit 0；up to date、audited 26 packages、0 vulnerabilities |
| `npm run dev -- --port 5173 --strictPort` | Vite ready in 293 ms，127.0.0.1:5173 |
| `npm run typecheck` | exit 0，無 TypeScript 錯誤 |
| `npm run build` | exit 0；12 modules transformed，最終 build 359 ms |
| `npm run preview -- --port 4173 --strictPort` | 啟動成功，127.0.0.1:4173 |

鎖定版本：three 0.186.0、vite 8.2.2、typescript 7.0.2、@types/three 0.185.4。
Three.js runtime 與 DefinitelyTyped 的 minor 尚未完全對齊；本次使用 API 通過型別與實際渲染測試。

最終 build：HTML 0.45 kB；CSS 1.21 kB（gzip 0.65 kB）；JS 562.40 kB（gzip 141.04 kB）。
Vite 提醒單一 chunk 超過 500 kB，build 仍成功。未為此 Spike 添加拆包框架或隱藏警告。

## Browser smoke test 證據

實際使用 Codex In-app Browser；未以獨立 Chrome 進程驗證，不能視為完整跨瀏覽器驗收。

保存的 production 畫面：`docs/evidence/technical-spike.png`（1280×720，窗戶已命中 1 次）。

| 項目 | 實際觀察 | 判定 |
| --- | --- | --- |
| Dev 啟動／3D 渲染 | 開啟 5173，畫面可見低牆、地板、窗框／玻璃、Character、光照／陰影；Debug 顯示 WebGL rendering | 通過 |
| 方向辨識 | 頭部眼睛／突出鼻部標示 local +Z，走動時朝移動方向轉身 | 通過 |
| 自主移動 | Debug 記錄 `(0.00,0.00)` → `(1.14,0.70)` → `(2.38,1.46)` → `(2.60,1.60)` | 通過 |
| State | 初始 Idle、移動中 Walk、到 `(2.60,1.60)` 轉 Idle，再前往下一巡遊點；亦觀察到 `(-2.60,-1.60)` Idle | 通過 |
| Orbit | 滑鼠拖曳後房間透視／朝向改變；角色繼續巡走 | 通過 |
| Zoom／Reset | 實際滾輪放大、縮小、重設鏡頭；畫面大小及構圖改變 | 通過 |
| Window Raycast | 點藍色玻璃後 hits 0 → 1，玻璃變黃 | 通過 |
| 排除誤觸 | 拖曳窗戶、點空白區域後 hits 維持 1 | 通過 |
| Resize | 一般 531×587、1280×720、約 1920×1080 下仍渲染；Debug / Canvas 隨尺寸更新 | 通過 |
| Production | 4173 實際顯示場景與自主移動；點窗後 hits 1 | 通過 |
| Console | 初次發現 PCFSoftShadowMap 移除警告，改為 PCFShadowMap；最終 production 的 error/warn logs 為空陣列 | 通過 |

互動檢查採實際滑鼠事件與畫面／DOM 觀察，沒有直接修改 app 狀態來假造命中。
Viewport override 和截圖可能先回傳前一幀，等待後續觀察才確認尺寸／計數更新。

## 已知限制與尚未驗證

- 固定四個巡遊點、固定兩秒停留；只證明最小 state／movement，不能代表產品生命感已成立。
- 直線移動、無尋路或通用碰撞；路線在房間內保留角色半徑空間。
- 轉向直接設定角度；簡單呼吸／腳步擺動不是正式角色動畫。
- 窗戶浮於低牆上；無完整牆體遮擋策略，低牆是 Spike 的可見性折衷。
- 桌面優先；窄視窗 Debug 可遮擋部分場景，可收合 Debug；未驗證觸控、多指、手機或獨立 Chrome/Firefox/Safari。
- 未量測 60 FPS、長時間記憶體、最低 GPU 或 WebGL context loss 恢復。需 WebGL 2。
- 已提供初始化失敗提示、resize、背景分頁暫停／delta cap、HMR 資源釋放；未進行專門 soak test。
- Build bundle size 警告尚在；後續需實測載入成本再決定拆包／優化。
- Technical Spike 必要項目無未通過；以上未驗證項目不能宣稱通過。

## Git diff 與後續

原始 PRODUCT/Handoff 保持不變。新增 npm/TS 設定、lockfile、HTML/CSS、五個 TS 模組、README 與本實測紀錄。
`.gitignore` 排除 node_modules、dist、Vite cache、log、local 與環境檔。無大型額外依賴或下載素材。

建議下一個獨立任務才做 V0.1：玩家點窗 → Character 走到窗前 → Observe → 返回自主生活。
是否接受陪伴感、角色造型及視覺方向仍由 Product Owner 判斷，本次已停止於 Spike。

## 查閱的官方 API 依據

- [Vite Getting Started](https://vite.dev/guide/)
- [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html)
- [Three.js Raycaster](https://threejs.org/docs/pages/Raycaster.html)
