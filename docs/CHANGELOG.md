# 變更紀錄

由 README 移來的里程碑紀錄，依時間由新到舊排列。內容保留當時的描述：文中的測試數、連接埠、Node 版本與「目前」等字眼只代表當時狀態。現況與執行方式見 [README](../README.md)。

---

## 2026-10-23 · 廚房與雙人床（已確認發布）

Commit `310103d`

客廳右側新增廚房與早餐角，狐狸會穿過門口前往料理檯，進行 **切切蔬菜、煮鍋暖湯、烤餅乾**。鏡頭、動作欄、家具點擊、自主生活與日記都已接上；料理結束會放下工具、退一步再轉身。早餐桌、冰箱與水槽先作為環境陳設。

臥室改成雙人床與兩顆枕頭，靠牆側向外擴出空間，保留原來走道、睡眠支撐與上下床路線。115 項測試通過，正式建置與桌面／手機預覽已檢查。細節見 [廚房與雙人床](KITCHEN_EXPANSION.md)。使用者已確認並授權連同陽台提交、推送與部署。

## 2026-10-23 · 陽台小花園（已確認發布）

Commit `310103d`

第一階段擴建在臥室右側加入陽台花園，透過玻璃門往返。木地板、花圃、蝴蝶與長椅帶來另一種生活氣氛；新增 **澆澆花、看蝴蝶、坐著吹風** 三個互動，也會自主發生。跨空間會平順聚焦，下方動作欄及數字鍵跟隨狐狸實際位置，生活日記沿用原有紀錄。

澆花會拿起掛架上的水壺、分次澆水再放回；坐長椅時先抬身坐下，尾巴留在身側。新增 9 項測試涵蓋三房路徑、收尾、家具與自身穿模、點擊、鏡頭、暫停及自主生活。實作、預覽與後續擴建方向見 [陽台小花園](GARDEN_EXPANSION.md)。使用者已確認，與廚房及雙人床一起發布。

## 2026-10-18 · 手臂接合修正

Commit `5968ce8`

整理沙發與運動改用固定肩膀、連續手臂表面的彎肘動作；整理時單手拍抱枕，另一手留在身側，運動改成側向抬手與彎肘伸展。新增肩膀接合、原手臂長度、動作連續性與拍抱枕接觸檢查。使用者已確認此修正並授權發布。

本機開發伺服器可開啟 `/tools/living-arm-review.html`，暫停在準備、進行或收尾的指定時間，從正面、側面與上方近距離檢查；此工具不包含在正式網站建置。

## 2026-10-18 · 客廳專屬生活動作

Commit `93b071d`

客廳現在有 **看電視、窩沙發、喝杯茶、做運動、聽音樂、整理沙發** 六種生活動作；做運動取代主入口的玩毛線。圓茶几已移除，電視與電視櫃移到原茶几位置、正對沙發，茶杯放在電視櫃上。新增小音響與運動墊，可以直接點家具邀請，也會自主發生。

下方動作欄與數字快捷鍵跟隨狐狸實際所在房間切換：臥室五個邀請，客廳六個邀請。房間面板另有「去客廳／回臥室」；手動查看房間只改鏡頭。喝茶會從電視櫃拿杯、走到沙發、坐下喝茶，再把杯子送回；看完電視會關掉螢幕後起身。所有新片段都寫入原有日記。

使用者已確認此版本並授權沿用 GitHub Pages 流程發布。目前合計 100 項測試，正式建置含 TypeScript 檢查。完整流程、驗證與範圍見 [客廳生活動作](LIVING_ROOM_ACTIONS.md)。

## 2026-10-18 · 臥室與客廳

Commit `93b071d`

主入口現在是一個由門口相連的兩房小家：原有臥室保留，新增沙發、茶几、綠色地毯、落地燈、邊櫃與植栽的客廳。狐狸會自主往返，玩毛線移至客廳；點沙發、茶几或房間面板的「邀請牠來」可以邀請牠到客廳停留。

鏡頭預設「跟隨狐狸」，跨房間時平順聚焦另一個空間；也能固定查看臥室、客廳或全屋。手動選房間只改視角，邀請按鈕才會影響狐狸。詳見 [房間擴建](ROOM_EXPANSION.md)。

目前測試合計 86 項；包含新增的跨房路徑、家具避讓、邀請切換、房間日記、鏡頭與背景暫停驗證。沒有新增套件。

## 2026-10-17 · 互動介面、生活細節、美術與聲音

Commits `8ced80f`、`6259642`、`bba607a`

主入口 `/` 已在既有 V0.2 自主生活上加入完整的互動介面：

- 下方六個生活邀請，或鍵盤 `1`～`6`：看風景、睡個覺、讀本書、吃點心、掃掃地、玩毛線。也可以直接點家具、掃帚或書架上的毛線球。
- 自主打掃與玩耍、閱讀時偶爾點頭打瞌睡、睡醒離床後伸懶腰。動作、道具、中文近況與日記會同步更新，見 [更多生活細節](DAILY_LIFE.md)。
- 中文近況、目前目標、生活片段進度，以及收到邀請／忙碌／重複操作回饋。
- 右上「生活日記」保存最近 40 則實際發生的片段，使用此瀏覽器的 localStorage。
- 「靜靜陪伴」隱藏介面，`Esc` 或右下按鈕返回；「？」開啟玩法說明。
- 小螢幕自動縮小構圖，Debug 收在右上，不再由資訊卡擋住房間。
- 小屋美術增補：木紋地板、織紋地毯、拼布床單、窗簾與山景、床頭暖燈、盆栽、收藏櫃、鈕扣小盤、藏書與餐桌茶杯。茶杯沿用餐桌的吃點心邀請。
- 美術與聲音：座鐘、乾燥花、小畫、流蘇與餐巾，窗簾／植物微動及茶杯熱氣；角色關鍵影格表情與毛線球分段動畫。右上「小屋聲音」可啟用風聲、鳥鳴與同步動作音效，分別調整環境音與音效音量，詳見 [美術與聲音](ART_AND_SOUND.md)。
- 新增原創輕鋼琴配樂〈窗邊慢慢〉，並重做腳步與微風：改用柔化的錄音素材，音樂／環境音／音效各自調整，附音效試聽。詳見 [背景音樂與音效修訂](MUSIC_AND_AUDIO_REFINEMENT.md)。

執行 `npm run dev -- --port 5173 --strictPort`，開啟 <http://127.0.0.1:5173/>。建置後也可用 `npm run preview -- --port 4173 --strictPort`。

目前 `npm run build`（含 typecheck）與 **78/78 tests** 通過。操作步驟、架構邊界與驗證限制見 [互動體驗預覽](INTERACTION_PREVIEW.md)、[更多生活細節](DAILY_LIFE.md)、[美術與聲音](ART_AND_SOUND.md) 與 [背景音樂與音效修訂](MUSIC_AND_AUDIO_REFINEMENT.md)。這是可以逐步體驗產品方向的版本，沒有將既有 V0.2 PO Acceptance 改成 Accepted；目前也沒有 Needs、遊戲存檔或離線模擬。

同一輪也設定了 GitHub Pages 部署（`8ced80f`），並補上 [小屋居家細節](ROOM_REFINEMENT.md) 與 [V0.2 整體驗收](V0_2_OVERALL_ACCEPTANCE.md) 紀錄。

## 2026-09-15 ～ 09-19 · V0.2 基本生活（Sleep／Read／Eat）

此段原本不在 README 中，依 git 紀錄與驗收文件補上索引。規格見 [V0.2 Web Spec](V0_2_WEB_SPEC.md)。

- 2026-09-15 · Sleep checkpoint `fb9ad1f`：[Sleep 驗收紀錄](V0_2_SLEEP_ACCEPTANCE.md)
- 2026-09-17 · Read checkpoint `2e18ed3`：[Read 驗收紀錄](V0_2_READ_ACCEPTANCE.md)；同日記錄 Eat 前架構檢查（`79d6427`，見 [ARCHITECTURE](ARCHITECTURE.md)）
- 2026-09-19 · Eat checkpoint `562c945`：[Eat 驗收紀錄](V0_2_EAT_ACCEPTANCE.md)
- 整體技術驗收見 [V0.2 整體驗收](V0_2_OVERALL_ACCEPTANCE.md)，PO Manual Acceptance 仍為 Pending。

## 2026-09-13 · V0.1 收尾與狐狸造型實驗

Commit `5ddd49c`

以下保留早期 V0.1 與角色造型實驗的歷史紀錄，舊連接埠不代表目前正在執行的服務。

目前實作範圍為自主 Idle／Walk → 點窗 → 走到窗前 → Observe → 返回自主生活。
產品依據是 `docs/PRODUCT.md`，驗收依 `docs/V0_1_WEB_SPEC.md`。
技術與瀏覽器驗證不等於 Product Owner Manual Acceptance。

### 執行

上一輪環境：Windows、Node.js 24.19.0、npm 11.17.0。本輪收尾重跑：Node.js 25.9.0、npm 11.12.1（typecheck／9 tests／build 成功）。

```sh
npm install
npm run dev -- --port 5173 --strictPort
npm run typecheck
npm test
npm run build
npm run preview -- --port 4173 --strictPort
```

開啟 http://127.0.0.1:5173/；production 預覽為 http://127.0.0.1:4173/。
伺服器僅監聽 loopback；終端 Ctrl+C 停止。正式輸出在 `dist/`。

### 操作與驗收

1. 開啟後可見程序化狐狸、房間、窗戶及兩側無互動家具。
2. 不操作，狐狸會自主 Idle／Walk；停留 2.5～5.2 秒，有限隨機目的地，交替兩種 Idle variation。
3. 滑鼠左鍵拖曳環繞、滾輪縮放；「重設鏡頭」恢復原始構圖。
4. 點窗戶玻璃或窗框：取代自主目標，走向窗前、完成朝向後 Observe 4 秒，再回 Idle。
5. 同一指令進行中再次點窗不排隊、不重啟或延長。Window hits 僅為 raycast 計數。
6. 調整視窗尺寸：Canvas 隨容器更新，Debug 的 Viewport 跟著變化。
7. Debug 預設隱藏，可切換顯示真實 State／Action／Target／Source；隱藏不影響模擬。
8. 切到背景暫停模擬；回前景不累積離線進度。

### 最小模組

| 檔案 | 用途 |
| --- | --- |
| `src/main.ts` | Bootstrap、Renderer、OrbitControls、loop、resize、HMR 資源清理 |
| `src/scene.ts` | Scene、Camera、燈光、低牆房間、窗戶幾何 |
| `src/Character.ts` | Idle／Walk／Observe、單一 Window command、自主目標、平滑轉向與移動 |
| `src/createFoxVisual.ts` | 狐狸幾何、吊帶褲、大尾巴、呼吸／重心／視線／耳朵／步態動畫 |
| `src/WindowInteraction.ts` | 指標座標轉換、拖曳排除、最近表面 Raycaster 命中 |
| `src/DebugPanel.ts` | State、位置、窗戶計數、viewport、renderer 訊息、重設鏡頭 |
| `src/styles.css` | 最小 Debug overlay 與響應式 Canvas 版面 |
| `src/FrameClock.ts` | 前景 delta cap、visibilitychange 後歸零，不累積背景時間 |
| `src/PerformanceSample.ts` | 只有 `?measure=1` 開啟的單次 5 秒暖機＋60 秒 rAF 取樣 |
| `tests/behavior.test.mjs` | Node 原生測試，驗證 command／state／計時／路徑空間與 raycast 邊界 |

沒有 React、外部模型／貼圖、Backend、通用家具框架或 V0.2 行為。套件版本沿用 Spike。

### 獨立 Chrome 手動補驗

1. 執行 build 與 preview，在獨立 Chrome 開啟 http://127.0.0.1:4173/。
2. 依規格 AC-01～AC-09 操作；Console 記錄 error／warning，勿將 In-app Browser 結果當作 Chrome 結果。
3. AC-10 開啟 http://127.0.0.1:4173/?measure=1，內容 viewport 設為 1920×1080（不是包含瀏覽器工具列的外框尺寸），保持前景至少 65 秒。
4. 前 5 秒暖機，後 60 秒內需包含自主生活、一次完整 Observe，以及鏡頭旋轉／縮放。取樣後右下角輸出 JSON，複製保存。
5. 若取樣時切到背景，該次作廢並重新暖機。記錄 CPU／GPU／OS／Chrome 版本；JSON 包含 UA、viewport、DPR、drawing buffer、GPU、平均 FPS、p50／p95／p99／最大 frame time 與慢幀數。
6. 這是 rAF 間隔量測，不是 GPU profiler。未接近 60 FPS 或持續卡頓須記錄為未達目標。
7. AC-11／規格 §15 由 Product Owner 在 Debug 隱藏下親自驗收並記錄，不由 Codex 自評通過。

V0.1 實測與未驗證項目見 `docs/V0_1_ACCEPTANCE.md`；Spike 歷史紀錄保留於 `docs/TECHNICAL_SPIKE.md`。

AC-01／09／10／11 的逐步操作與結果回填表見 [Chrome 人工補驗](V0_1_CHROME_MANUAL_ACCEPTANCE.md)。既有 60.40 秒／1.19 FPS 只屬受限 In-app 環境紀錄，不是產品 FPS 結論；正式 Chrome 效能與 PO 接受均待人工驗收。

### 新狐狸 GLB 靜態預覽

**V0.1 Closeout（2026-09-13）：** PO 已接受程序狐狸的 locomotion／turn／Window Observe 動作體驗，停止 polish；最後 typecheck、15 tests、build 成功。Chrome background／performance 仍待補驗。穩定基準範圍與 Known Limitations 見 [Closeout](V0_1_CLOSEOUT.md)。Blender／GLB 僅保留為歷史實驗，沒有 V0.2 工作。

**目前決策（2026-09-13）：PO 選擇已 polish 的程序狐狸繼續 V0.1。** 正式生活流程使用 `/`，目前本機入口為 <http://127.0.0.1:4182/>。GLB 預覽保留作比較，不是目前採用角色；下一步是 [Chrome／PO 人工補驗](V0_1_CHROME_MANUAL_ACCEPTANCE.md)，角色選定不等於全項驗收通過。

新增 `/?preview=fox-v02`：程序模型與 **fox_v02_static** 同步鏡頭並排比較，提供房間／正面／3/4／側面。v02 使用七種明確純色材質與獨立吊帶褲，保留 v01。資產、render、驗證與待 PO 審核項目見 [v02 靜態審核](FOX_V02_STATIC_REVIEW.md)。本機比較頁：<http://127.0.0.1:4182/?preview=fox-v02>。

啟動 dev 或 production preview 後，開啟 `/?preview=fox`（本輪本機 production：<http://127.0.0.1:4180/?preview=fox>）。可切換 Blender GLB／目前程序模型，選擇中央、床邊、窗前三個靜態站位，並使用原有 Camera 環繞／縮放／重設。兩模型同站位、同鏡頭、同房間燈光；新模型保留匯出比例 1.30 m，沒有額外縮放。

這是造型 review，不執行角色動畫或窗戶 command。頁面連結可返回 `/` 的既有自主生活與互動。入口按 query 分流，GLB 由 Vite 以帶 hash 的資產打包；無新套件、未改動 Character 或 scene。使用本機 Chrome 也可開啟同一網址。

2026-09-13：typecheck 成功，11 tests passed／0 failed（386.545 ms），production build 成功。In-app production 實測模型載入、新舊切換、床邊／窗前／中央站位、鏡頭重設與返回原場景。原互動入口顯示正常；本輪未重做全套 AC 或 FPS 驗收。共享 Three.js chunk 626.38 kB，>500 kB 警告仍保留；GLB 253.75 kB。

## 2026-09-10 · Technical Spike 與 V0.1 規格

此段原本不在 README 中，依 git 紀錄補上索引。

- Commit `060a0de`：最小 Three.js 網頁技術驗證，見 [Technical Spike](TECHNICAL_SPIKE.md)
- Commit `2be3e71`：保存核准的 [V0.1 Web Spec](V0_1_WEB_SPEC.md)
- Commit `0859d2d`：保存產品與交接基準（[PRODUCT](PRODUCT.md)、[Project Handoff](../Fox_Life_Web_Project_Handoff.md)）
