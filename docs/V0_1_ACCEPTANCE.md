# V0.1 Vertical Slice — Implementation & Acceptance Record

日期：2026-09-10。分支：`feature/v0.1-vertical-slice`。產品／規格／Spike 歷史文件保持原樣。

**目前狀態（2026-09-13 Closeout）：PO 已接受程序狐狸的轉向、起停、Window Observe 與整體動作體驗。V0.1 建立穩定實作基準；AC-09 真實 Chrome 背景、AC-10 正式效能仍待人工補驗，不宣稱全部 AC 通過。**

最新結論與 commit 範圍見 [V0.1 Closeout](V0_1_CLOSEOUT.md)。下方日期化段落保留歷史驗證狀態；與最新結論不同時以 closeout 為準。

## 本次實作

### Turn / Locomotion 收尾（2026-09-13）

完成程序狐狸限定 [轉身 polish review](V0_1_TURN_POLISH.md)：移除 20° 硬開關、前向小弧線、頭部先行與大角度交替踏步。30／60／90／135／180° 雙向與多步長模擬、家具淨空、轉場與步頻驗證通過；保留窗前對正、0.18 秒收勢與四秒 Observe。最新 typecheck、15 tests、build 成功，production In-app smoke 捕捉 Observe 與返回自主。先前 11 tests／GLB review 的來源 hashes 為歷史快照，最新見 `evidence/v0.1-turn/`。

未發現此輪功能 blocker；PO 尚未提供此版正常 Chrome 轉身體驗，AC-01／09／10／11 及其他部分完成項目不自動提升。依 review 的手動檢查回填後，再整理穩定 V0.1 checkpoint。本次未 commit、push、merge 或進入 V0.2。

### 目前角色決策與下一步（2026-09-13）

PO 明確選擇「以目前進度選擇程序狐狸接著下一步」。採用目前已 polish 的 `createFoxVisual`，不是回退早期造型。正式 `/` 入口本來就使用該程序角色，無需替換實作。fox_v01 與 fox_v02_static 保留為比較資產，暫停 GLB／Rig／動畫資產工作。

下一步為程序狐狸的 V0.1 production 人工驗收，依 [Chrome 補驗表](V0_1_CHROME_MANUAL_ACCEPTANCE.md) 執行。現有服務入口為 <http://127.0.0.1:4182/>，效能取樣為 <http://127.0.0.1:4182/?measure=1>；若服務已停止，先依補驗表重新啟動並使用其實際 port。不要使用 `?preview=fox` 或 `?preview=fox-v02` 靜態頁驗收行為。

建議順序：先在獨立 Chrome 體驗 1～2 分鐘、三次不同位置點窗與鏡頭操作，再做走向窗戶／Observe 各一次背景測試，最後獨立執行 60 秒效能取樣。回填接受／需調整／未完成及證據；若有問題只修 V0.1 範圍內問題。角色方案選定不自動提升下方任何 AC 狀態，不進入 V0.2。

本次只更新決策與交接文件，未改 src 或資產，因此未重跑程式測試；最近一次 typecheck、11 tests、build 成功紀錄見 [2026-09-13 驗證](evidence/fox-v02/verification.json)。

- 唯一產品流程：自主 Idle／Walk → Window command → Walk to window → Observe → Idle／Autonomous → 下一次自主 Walk。
- 原地或移動中皆可接受玩家指令；單一指令進行中去重，沒有 queue、cancel system 或其他生活行為。
- 到達容差 0.035 世界單位；窗前站位 `(0, 0, -1.40)`，觀察朝向 `Math.PI`（世界 -Z）。
- 轉向上限 3.6 rad/s；目前以朝向誤差連續控制前向速度，保留加減速與接近目標減速，不瞬移到站位。
- 到達並完成面向後才開始 4 秒 Observe；結束清除 command／target，回 Idle，下一次目的地能離開窗前。
- 自主區域 x=[-1.65,1.65]、z=[-1.15,1.35]；目的地有有限隨機變化，停留 2.5～5.2 秒。
- 程序化狐狸：大耳、奶油色臉／尾尖、橘紅身體、短四肢、綠色吊帶褲、大尾巴。
- `Breathe`／`Look around` 兩種 Idle variation；呼吸、重心、視線／眨眼、耳朵、尾巴動作；步態跟實際移動距離，跨 state 淡入淡出。
- 兩側無互動家具留出中央通行區；目前轉向形成小弧線，沒有新建尋路或通用碰撞框架。
- Debug 預設隱藏，顯示 Character 的真實 State／Action／Target／Source；保留位置、viewport、renderer、hits，hits 不是成功指令數。
- `FrameClock` 在 visibilitychange 兩個邊緣重置，背景不更新模擬，前景 delta cap 0.05 秒。
- `?measure=1` 才顯示單次效能取樣；不影響正常玩家流程，也沒有新增遊戲行為。

## Changed files / Diff summary

| 檔案 | 變更用途 |
| --- | --- |
| `src/Character.ts` | 三狀態、單一玩家指令、自主目的地、平滑移動／轉向及一致的 Debug getters |
| `src/createFoxVisual.ts`（新增） | 狐狸幾何與微動畫，避免核心行為綁死 Fox |
| `src/scene.ts` | 窗前站位、可通行範圍、床／櫃 placeholder、窗戶支柱、初始 Camera |
| `src/DebugPanel.ts`、`src/styles.css` | 真實狀態欄位、完整隱藏／展開、有限視窗內可捲動 |
| `src/FrameClock.ts`（新增） | 可測試的前景時間／背景重置邊界 |
| `src/PerformanceSample.ts`（新增） | 5 秒暖機＋至少 60 秒 rAF interval 取樣與原始數據輸出 |
| `src/main.ts` | 串接 command、Debug、FrameClock、取樣與 cleanup |
| `tests/behavior.test.mjs`（新增） | 9 個行為／幾何／Raycaster／計時測試，使用 Node 內建 test runner |
| `package.json`、`tsconfig.json`、`index.html` | test script、Node 可直接驗證的 TS import 設定、頁面標題 |
| `README.md`、本文件、`docs/evidence/v0.1/` | 操作說明、Chrome 補驗步驟、驗收與原始證據 |

`WindowInteraction.ts` 沿用已驗證的最近表面 Raycaster／drag 排除；沒有依賴升級或 lockfile 內容 diff。新增的 Approved Spec 在基準 commit `2be3e71` 保存，未修改其要求。

## 上一輪命令結果（既有文字紀錄，非本輪重跑）

| 命令 | 結果 |
| --- | --- |
| `npm install` | exit 0，up to date、26 packages、0 vulnerabilities；依賴版本不變 |
| `npm run dev -- --port 5174 --strictPort` | Vite ready in 265 ms；另有先前 5173 dev instance |
| `npm run typecheck` | exit 0 |
| `npm test` | 9 tests passed、0 failed；最後一次測試 319.1937 ms |
| `npm run build` | exit 0；15 modules；506 ms |
| `npm run preview -- --port 4173 --strictPort` | 成功，在本機 127.0.0.1:4173 供 production 實測 |

Production JS `index-CWaZ7Zxl.js`：567.82 kB、gzip 143.29 kB；CSS 1.51 kB、gzip 0.78 kB。
Vite 的單一 chunk >500 kB warning 仍存在，沒有隱藏它。型別／runtime minor 差異沿用 Spike。

9 項測試實際涵蓋：60 秒模擬中的自主變化與 Debug invariants；Idle／Walk 兩種中斷；三個不同起點的完整流程／4 秒計時／離開窗前；重複指令去重；站位內原地轉向；實際幾何包圍盒的路徑／朝向空間；背景／前景計時；玻璃／框／遮擋／drag／cancel／listener cleanup。
**模擬測試的 60 秒不是瀏覽器效能的 60 秒。**

## Browser 實測與限制

工具可用瀏覽器為 Codex In-app Browser。嘗試獨立 Chrome 入口回報 `Browser is not available: chrome`。
本機雖安裝 Chrome 153.0.8010.36，不能據此聲稱 Chrome 已執行 production。

原始事件與時間戳見 `evidence/v0.1/browser-events.json`；索引與證據缺口見 [證據索引](evidence/v0.1/README.md)。以下保留上一輪觀察記錄，並非每一項都有獨立原始操作檔。畫面為直接瀏覽器截圖，沒有人工改寫角色狀態來通過測試。

- 無操作觀察：從時間戳 1789020232294 到 1789020312150，約 79.9 秒，hits=0；起始 Breathe／(0,0)，後續 Look around／(1.08,0.89)。但低更新率不足以完整評定所有微動畫的連續可讀性。
- 有效玻璃點擊後立即改為 Walk to window、Player Command、Window (0,-1.40)，不沿用自主 target。
- 實際自主 Walk 中斷：位置 `(-1.42,-0.14)`，舊目標 `Room(-0.38,0.27)`；點窗後約 0.21 秒的 Debug 讀值已替換為 Window target，位置不變。這是資料更新證據，不是可見動畫延遲量測。
- Observe 可見面向窗外及頭部動作，位置停在約 `(0.01,-1.37)`；hits 3→5 時原计時繼續到 3.85/4.00。
- 已記錄 Observe → Idle，source=Autonomous、target=None，再選擇新的 Room target；Debug 隱藏時流程也繼續。
- 窗框有效點擊 hits 1→2；進行中目標未重啟。點角色／空白、拖曳窗戶、Debug 操作未產生額外指令。遮擋物案例有 Raycaster 程式測試，未完成獨立 Chrome 的遮擋點擊實測。
- 已實際環繞多角度、遠近縮放、垂直上下限與重設；低牆／地板未出現 Camera 穿入。窗後有局部遮擋，並不保證全角度零遮擋。
- 756×762 與約 1920×1080 的 Canvas 可渲染，鏡頭比例隨 resize 更新。環境有約 1 CSS px 的取整差异，實際 buffer 見數據。
- 真實背景測試失敗於環境：開另一分頁／隱藏工具視窗後 `document.hidden` 仍為 false。因此沒有把這些操作算成背景暫停驗證；FrameClock 邊界只有程式測試通過。
- 中途驗證分頁被清除，未完成取樣作廢；重新建立並保存的單次取樣如下。

## Performance：受限環境紀錄，AC-10 正式驗收待人工執行

原始結果：`evidence/v0.1/performance-in-app.json`。

| 環境／數據 | 實際結果 |
| --- | --- |
| CPU / OS | Intel Core i7-14700；Windows 11 Pro 10.0.26200 |
| 系統 GPU | Intel UHD Graphics 770，driver 32.0.101.7088；另列有 VirtualMonitor devices |
| 實際 browser / GPU | In-app Browser UA Chrome/152.0.0.0；ANGLE Intel UHD 770 Direct3D11 |
| Viewport / DPR | 1920×1080；DPR 約 1（0.9999999734530078） |
| Drawing buffer | 1920×1079 |
| 工具 / 暖機 | requestAnimationFrame intervals；5000 ms；不是 GPU profiler |
| 取樣 | 60395.3 ms，72 frames，未收到背景中斷 |
| Average FPS | 1.1921 |
| Frame time p50 / p95 / p99 | 1000.3 / 1000.5 / 1000.5 ms |
| Max / 慢幀 | 1000.5 ms；61 幀 >33.34 ms，61 幀 >50 ms |
| 取樣涵蓋 State | 僅 Idle；未涵蓋完整 Observe 流程 |

**60.40 秒／平均 1.19 FPS 僅為受限 In-app Browser 測試環境紀錄，不符合 §11 的獨立 Chrome production 驗收條件，不得作為產品實際 FPS、效能通過或未達標的結論。** 工具雖回報 `document.hidden=false`，仍有明顯約 1 Hz 更新／輸入與畫面延遲。原因尚未由独立 Chrome／profiler 確認，不能將之斷言為 GPU 效能不足，也不能稱為正常 Chrome 效能。
0.05 秒 delta cap 在低更新率下讓模擬明顯變慢；本次未為測試移除保護或加速時間。

## AC 狀態

| ID | 狀態 | 依據／尚缺 |
| --- | --- | --- |
| AC-01 | 部分完成；Chrome 未驗證 | install／dev／typecheck／test／build／preview 通過；In-app production 可執行，獨立 Chrome 待補 |
| AC-02 | 部分完成 | 79.9 秒無操作與自主變化、造型／兩種 variation 已觀察；低更新率下五類微動的連續可讀性待正常前景驗證 |
| AC-03 | 部分完成 | Idle 接受有原始事件；Walk 中斷為上一輪文字記錄，缺獨立原始快照；0.5 秒可見動畫反應僅有模擬測試，未完成可靠實機延遲量測 |
| AC-04 | 部分完成 | 程式測試三個不同起點通過；原始事件可追溯一輪完整流程；第二輪最後仍 Observe，未證明完成，第三輪無完整原始紀錄；三個不同位置的完整 Browser 流程待人工補驗 |
| AC-05 | 通過（程式＋In-app） | approach／Observe 去重、計時不重啟、不排隊、完成後能新接受 |
| AC-06 | 部分完成 | 玻璃／框、角色／空白／拖曳／Debug 已實測；遮擋案例程式測試通過，真實遮擋點擊待 Chrome 補驗 |
| AC-07 | 通過（In-app，有限視角抽查） | 環繞、垂直／縮放邊界、reset／resize 可運作；Chrome 尚未複驗 |
| AC-08 | 通過（程式＋In-app） | state/action/target/source 清除一致，隱藏 Debug 不改變流程；產品理解不代 PO 判定 |
| AC-09 | 未驗證 Browser；程式測試通過 | 工具操作未產生 document.hidden=true，不能假冒切背景成功 |
| AC-10 | **待人工驗收；產品 FPS 未知** | 60.40 秒／1.19 FPS 僅受限環境紀錄；§11 獨立 Chrome 前景、完整流程與 Camera 取樣未完成 |
| AC-11 | **動作體驗 Accepted；完整 §15 未逐項回填** | PO 2026-09-13 明確接受轉向、起停、Window Observe 與整體動作；未推定未回報的 Camera 舒適度／再次觀看意願等項目 |

## 需要 Product Owner 補驗／Manual Acceptance

完整可執行步驟與回填表見 [Chrome 人工補驗](V0_1_CHROME_MANUAL_ACCEPTANCE.md)。目前已收到 PO 動作體驗 Accepted；沒有收到 Chrome 環境、背景分頁或效能數據，這些項目仍待補驗。原文見 [PO 結果](evidence/v0.1-closeout/po-acceptance.md)。

先用獨立 Chrome 執行 README 的 production／效能步驟，記錄版本、viewport、DPR、硬體和 Console。

1. AC-03：Idle 和 Walk 各點窗，量測 0.5 秒內是否出現轉向／步行。
2. AC-04／06：從三個位置完成流程；連點、點牆／角色／被遮擋窗戶、拖曳窗戶、Debug 操作不誤觸。
3. AC-09：在 approach 及 Observe 各切到另一個 Chrome tab 至少 10 秒，回來確認位置／觀察時間沒有吃掉整段；再完成回自主流程。
4. AC-10：`?measure=1`，5 秒暖機後連續至少 60 秒前景，期間包含自主生活、完整 Observe、Camera 操作，保存 JSON；若未達或持續卡頓，列為需調整。
5. AC-11／§15：Debug 隱藏下親自看 1～2 分鐘、環繞縮放、Idle／Walk 介入、Observe 與再次觸發；逐項記錄「接受／需調整／未驗收」及 review 日期。

| §15 項目 | PO 結果 |
| --- | --- |
| 自主生活與生命感／願意多看一會 | 待 Product Owner 驗收 |
| Camera 舒適度／角色焦點 | 待 Product Owner 驗收 |
| 點窗意圖理解與自然轉場 | 轉向／起停／動作體驗 Accepted；意圖理解未單獨回填 |
| Observe 可讀性、節奏與返回日常 | Window Observe 動作體驗 Accepted（2026-09-13） |
| 再次觸發／繼續觀看意願 | 待 Product Owner 驗收 |

## Known limitations / Stop boundary

- 沒有 Chrome 全項驗收或可用的正式 60 FPS 證據，不宣稱全部 AC 通過；In-app 1.19 FPS 不代表產品實際 FPS。
- 原始事件僅完整追溯一輪窗戶流程；部分點擊、Camera 與 Walk 中斷僅有上一輪文字記錄。兩張靜態截圖不能驗證動畫連續性、完整流程或反應延遲。
- 效能 JSON 的 states 集合不能證明完整 Observe → 自主返回或 Camera 操作，需同步人工操作紀錄。
- 程序化原型外觀、直線移動、有限自主區域；無尋路、通用碰撞、正式骨架動畫。低牆與窗後局部遮擋仍需 PO 看實機。
- 窄視窗 Debug 可能遮住場景，可隱藏；可選效能 JSON 在小視窗也會覆蓋畫面，只供測試。
- 未驗證長時間記憶體、最低硬體、WebGL context loss、手機或其他瀏覽器。
- bundle >500 kB warning 與 runtime/types minor 差異仍保留。
- 本次停止於 V0.1，等待 Product Owner Manual Acceptance；不 push、不 merge、不進入 V0.2。

## 本輪收尾與重新驗證（2026-09-10）

- 僅更新文件與證據整理，未改動上一輪 src、tests、套件、lockfile 或 Approved Spec；未 commit、push、merge，未進入 V0.2。
- 基準 commit：`2be3e717b1d1828f75f8b9435ff218d93849e18f`；驗證對象為目前未提交 working tree。原始四檔保留，來源／建置 SHA-256 見 [manifest](evidence/v0.1/manifest.json)。
- 本輪 Windows shell：Node **25.9.0**、npm **11.12.1**；上一輪 Node 24.19.0／npm 11.17.0 是歷史環境，不混用。
- [完整命令輸出](evidence/v0.1/verification-rerun.json)：typecheck exit 0；tests **9 passed / 0 failed**（255.0397 ms）；build exit 0（15 modules、2.10 s）。
- Production JS `index-CWaZ7Zxl.js`：567.82 kB／gzip 143.29 kB；CSS 1.51 kB／gzip 0.78 kB；>500 kB warning 保留。
- install／dev／preview 保留上一輪紀錄，本輪不重做安裝或瀏覽器操作；獨立 Chrome console 與 production 啟動仍待 AC-01 人工確認。
- 收尾完成是文件與技術檢查完成，不代表人工验收已完成。

## 角色 visual refinement 後續紀錄

2026-09-10 依 PO 指示完成有限角色外觀／比例修正，詳見 [Visual Refinement](V0_1_VISUAL_REFINEMENT.md)。舊版證據與 manifest 保留作歷史快照，其 createFoxVisual／dist hashes 不再代表目前版本；新版尺寸、來源與 smoke 見 `evidence/v0.1-visual/`。本輪 typecheck／9 tests／build 成功，production In-app smoke 已捕捉 Observe 與返回自主。既有獨立 Chrome、真實背景、正式 FPS 與 PO Manual Acceptance 的待驗收狀態不因此提升為通過。

## 角色一體感與動作 Polish 後續紀錄

2026-09-10 依 PO 指示完成 [Character Polish](V0_1_CHARACTER_POLISH.md)：保持現有尺寸，整合頭／口鼻／軀幹與肢端輪廓，調整轉向／起停、0.18 秒到站收勢及尾／耳次級動作。Observe 在收勢後仍完整 4 秒；三個 State 與命令規則保留。本輪 11 tests／typecheck／build 成功，In-app production 捕捉 Observe 與回自主，證據見 `evidence/v0.1-polish/`。前版 manifest／build 是歷史版本；本輪不將任何待人工 AC 或 PO 視覺感受自動判為通過。
