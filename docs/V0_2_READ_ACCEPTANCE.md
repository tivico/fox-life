# V0.2 Slice B — Read Acceptance Record

建立日期：2026-09-16；Closeout：2026-09-17。狀態：**V0.2 Slice B — Read Accepted**。
**PO Manual Acceptance = Accepted**。本輪僅整理文件與建立 checkpoint，未修改 runtime，未開始 Eat。

## Product Owner acceptance / closeout

- 依據：Product Owner 在本次對話明確接受 Read 的「可愛度、可讀性與整體生活感」，並再次確認人工驗收已完成。SB-P01～SB-P04 依 Slice B 整體人工接受結論記為 Accepted；不是由工具測試代替 PO 推定。
- 無新的功能 blocker。程序模型、固定站位及 build warning 保留為 Known Limitations，不阻擋本次穩定 checkpoint。
- 獨立 Chrome background-tab、完整 resize／主要視角技術補驗與 performance：**Pending**。PO 的產品體驗接受不等於提供這些項目的實測資料；SB-T09 / SB-T12 的技術缺口保持原狀。
- 最新驗證：typecheck、33/33 tests、build 通過；production 玩家 Read、自主 Read、Sleep、Window Observe 均完整返回。原有三起點、多幀率、姿勢淨空、Window / Bed 中斷、neutral reset 回歸通過。本輪文件收尾沿用剛完成的驗證，不重跑或修改 runtime。
- Closeout 證據：[typecheck](evidence/v0.2-read/closeout/typecheck.txt)、[33 tests，15,392.4425 ms](evidence/v0.2-read/closeout/tests.txt)、[build](evidence/v0.2-read/closeout/build.txt)、[玩家 Reading](evidence/v0.2-read/closeout/player-reading.txt) → [返回](evidence/v0.2-read/closeout/player-return.txt)、[自主 Reading](evidence/v0.2-read/closeout/autonomous-reading.txt) → [返回](evidence/v0.2-read/closeout/autonomous-return.txt)、[Sleep](evidence/v0.2-read/closeout/sleep.txt) → [返回](evidence/v0.2-read/closeout/sleep-return.txt)、[Observe](evidence/v0.2-read/closeout/observe.txt) → [返回](evidence/v0.2-read/closeout/observe-return.txt)。Console 空紀錄沿用下方同 runtime 版本先前 smoke，未聲稱 closeout 新量測。
- Checkpoint：`feat: establish accepted V0.2 Read checkpoint`，包含既有 Read implementation / tests、Approved spec 狀態、驗收與 evidence；以本文件所在 commit 為穩定基準，不包含 Eat。沒有 push / merge。

## Branch / checkpoint / scope

- 分支：`feature/v0.2-read`。Read checkpoint 的 parent 與 `feature/v0.2-sleep` 是 `fb9ad1f0025324b6d2ba39885ca3477e6ac2d8a2`（`feat: establish accepted V0.2 Sleep checkpoint`）。Sleep checkpoint 未 amend / reset / 改寫。
- Read 分支自該 checkpoint 建立時 working tree 乾淨；接續時確認 5 個 modified source + 3 個新增 Read implementation / test 完整，連同文件與 evidence 納入本次 checkpoint。
- 原 `tests/behavior.test.mjs`、`tests/sleep.test.mjs`、`src/sleep.ts`、`src/WindowInteraction.ts` 相對 Sleep checkpoint 無 diff。程序狐狸、Sleep preset 與 V0.1 locomotion 基線保留。
- Approved 規格不改 Scope。Sleep Accepted 的歷史紀錄保留；本文件補記 checkpoint 已完成。Blender / GLB experiment 不變。

## Read 最終演出與 lifecycle

Autonomous Life → Read intent / Player Bookshelf Command → Walk to reading area → 朝向 +X、0.18 秒到點收勢 → Opening book 0.35 秒 → Reading 7 秒 → Putting book away 0.35 秒 → Autonomous Idle → 下一個自主選擇。

- reading anchor：`(2.10, 0, -0.30)`、heading `π/2`。相對規格 x=2.35 移動 -0.25，位於核准調整範圍。原 anchor 離開轉身時有尾巴碰右側櫃體的測試失敗，調整後完整 approach / read / departure 通過。
- 既有右側櫃體上方有兩層可辨識書架與色塊書本。指定 shelf / book parts 可點；下方櫃體、無關桌面不是 Read target。
- 站立持書，雙臂抬起、頭部略低；獨立簡單封面與奶油色頁面，沒有書頁內容、Inventory 或書籍系統。Reading 約第 3.0～3.85 秒有一次克制翻頁，其餘保持安靜閱讀。
- 本輪 polish：書本局部 z=0.37 → 0.415，離開胸口；手臂持書角度 -1.22 → -1.30。翻頁改為較小、翻起時略蜷收的頁片，避免接近低頭口鼻。新測試檢查翻頁／頭部、書本／torso 包圍盒分離及手掌支撐位置。
- Read 姿勢是現有 hierarchy 的可移除 overlay。每幀先撤掉上一幀 Read 偏移再算 baseline；收書歸零後不殘留低頭／抬臂，書本隱藏並縮至零，不參與 raycast。
- Approach / Opening book 是 Walk；Reading / Putting book away 是 Read。7 秒只計 Reading，開／收書不占用 duration。Debug 顯示真實 action、target、phase、time、source、hits、cooldown。

## Priority / safe exit

- Player Read 立即取代自主 Idle / Walk 的目標，不瞬移；正在執行的 Player Command 拒絕所有重複／跨目標命令，不重啟、不延長、不排隊。Player 可忽略 cooldown，完成後仍設定 cooldown。
- 點 Autonomous Read 的同一 Bookshelf 不重啟、不改 source。
- Autonomous Read 的部分開書、Reading（含翻頁中）、收書階段收到 Window / Bed：從當前 pose 開始／繼續 PutAway，root 保持不動；先完整移除 book / pose 再前往新目標。已在收書時不重置 finish timer。
- Autonomous Sleep → Bookshelf 也先安全 Wake；Player Sleep / Observe 不接受 Bookshelf 插隊。
- `afterExit` 僅存目前 safe exit 後的一個目的地；接受替代後鎖定 Player Command，清理後即清空。不建立 command framework。
- 自主選擇保持先完成一次 Idle → Walk → Idle，候選 `Walk:3 / Sleep:1 / Read:1`；Read cooldown 30 前景秒、Sleep 45 前景秒。連續 3 次 Walk 後，若有 eligible life action，僅從其間選擇；完成後回 Idle，不固定輪播，不加入 Needs / Mood。

## Commands / regression

最終 source 版本執行：

| 驗證 | 結果 | 原始輸出 |
| --- | --- | --- |
| `npm run typecheck` | Pass | [typecheck](evidence/v0.2-read/typecheck.txt) |
| `npm test` | **33/33 Pass**；15,668.6713 ms | [tests](evidence/v0.2-read/tests.txt) |
| `npm run build` | Pass；31 modules | [build](evidence/v0.2-read/build.txt) |
| Console error / warn | 捕捉紀錄皆空 `[]` | [console](evidence/v0.2-read/console.json) |

原 15 項 Idle / Walk / Turn / Observe + 9 項 Sleep 全數保留並通過；Read 新增 9 項。Build 共享 chunk 631.19 kB / gzip 159.81 kB，main 17.80 kB / gzip 5.79 kB；保留既有 >500 kB warning，未改拆包策略或套件。

## Slice B Technical AC

| AC | 狀態 | 證據與邊界 |
| --- | --- | --- |
| SB-T01 | Pass | Typecheck / 33 tests / build；原測試不變 |
| SB-T02 | Pass（技術） | 三起點 × 20/60/144 Hz、三個實際自主 Walk 位置；指令不瞬移、0.5 秒內反應；production 玩家 Read 完整返回 |
| SB-T03 | Pass | 可預測 random 驗證候選權重、初始 Walk、三 Walk 上限、30 秒 cooldown；最終 production 真實 Autonomous Read → Idle |
| SB-T04 | Pass | 0.35 / 7 / 0.35 分段計時，state / phase 真實；完成 target/source/prop/pose 清理 |
| SB-T05 | Pass（自動測試） | 每個 phase 重複 Read / Bed / Window，timer 與 target 不變；完成後仍可接受 |
| SB-T06 | Pass（技術） | approach / 部分 settle / read / finish 對兩目標中斷；先收姿才移動；production 實際捕捉兩次 PutAway → 新目標 |
| SB-T07 | Pass（已取樣技術範圍），PO 體驗 Accepted | 三起點 × 兩初始 heading × 三幀率的家具／地板淨空、finite transforms；手／書距離、頭／頁片、胸／書與回 neutral；非完整 triangle self-collision 證明 |
| SB-T08 | Pass | 真實 raycast：書、指定 shelf 命中；櫃體、遮擋、drag、cancel、dispose 拒絕；production 書架點擊 |
| SB-T09 | 部分通過，完整視覺待人工 | 最終 Read 中 orbit / zoom / reset 保持同 action；resize 1280×720 Debug 正確更新後還原 802×673。In-app 截圖在大 viewport 有宿主裁切，不能據此通過全部畫面可讀性 |
| SB-T10 | Pass（自動回歸與 smoke），既有人工缺口保留 | 15+9 原測試通過，新增雙向 Sleep / Read 與 Observe 中斷；production Sleep、Window 完整返回。獨立 Chrome 背景／完整 resize 未因此自動變 Pass |
| SB-T11 | Pass（In-app production smoke） | 最終 build 實際完成自主 Read、玩家 Read、Sleep、Window Observe；camera、Debug 關閉、console 空紀錄 |
| SB-T12 | 部分通過，獨立 Chrome 待人工 | FrameClock 測試涵蓋 approach / settle / read / finish / cooldown，背景時間不消耗；未實際完成獨立 Chrome 分頁隱藏／恢復 |

## Production evidence

環境：`npm run preview -- --port 4184 --strictPort`，`http://127.0.0.1:4184/`，Codex In-app Browser；正常 viewport 802×673，resize 測試 1280×720 後還原。`final-*` 是本輪最終 polish build 重新載入後的證據；其他檔案是同輪 polish 前取樣，不混稱最終結果。

- 玩家：[approach](evidence/v0.2-read/final-player-approach.txt) → [Reading](evidence/v0.2-read/final-player-read.txt) / [Debug 關閉畫面](evidence/v0.2-read/final-player-read.png) → [正常返回](evidence/v0.2-read/final-player-return.txt)。
- 自主：[Reading](evidence/v0.2-read/final-autonomous-read.txt) / [畫面](evidence/v0.2-read/final-autonomous-read.png) → [Idle / None / cooldown 29.9](evidence/v0.2-read/final-autonomous-return.txt)。
- Window 中斷：[自主 Reading](evidence/v0.2-read/final-before-window-interrupt.txt) → [Putting book away](evidence/v0.2-read/final-read-window-exit.txt) → [Observe](evidence/v0.2-read/final-interrupt-observe.txt) / [空手窗前畫面](evidence/v0.2-read/final-interrupt-observe.png)。
- Bed 中斷：[自主 Reading](evidence/v0.2-read/final-before-bed-interrupt.txt) → [Putting book away](evidence/v0.2-read/final-read-bed-exit.txt) → [Sleeping](evidence/v0.2-read/final-interrupt-sleep.txt) / [無書睡姿](evidence/v0.2-read/final-interrupt-sleep.png)。
- Sleep 回歸：[玩家 Sleeping](evidence/v0.2-read/final-sleep.txt) / [畫面](evidence/v0.2-read/final-sleep.png) → [Wake 後 Idle](evidence/v0.2-read/final-sleep-return.txt)。
- Observe 回歸：[Observe](evidence/v0.2-read/final-observe.txt) → [正常返回](evidence/v0.2-read/final-observe-return.txt)。
- 視角：[最終持書側斜角](evidence/v0.2-read/final-read-side.png)、[camera 操作中仍 Reading](evidence/v0.2-read/final-camera-read.txt)、[resize 狀態](evidence/v0.2-read/final-resize-read.txt)、[大 viewport 宿主裁切截圖](evidence/v0.2-read/final-resize-read.png)。

上述為離散截圖／狀態及實際操作紀錄，沒有完整動畫影片；PO Accepted 的依據是本文件頂部的使用者回報。不以 In-app 取樣推論實際 Chrome FPS；V0.1 的 60.40 秒 / 1.19 FPS 仍僅是受限環境歷史紀錄。

## Product Owner manual review

SB-P01 / SB-P02 / SB-P03 / SB-P04：**Accepted — Product Owner 整體人工驗收；2026-09-17 closeout 確認**。以下保留操作步驟供回歸，Chrome 技術補驗仍 Pending。

在本機正常 Chrome 開啟上述 production URL（必要時先 build / preview）：

1. 隱藏 Debug，不操作直到一次完整自主 Read。判斷是否立刻看懂「看書」，並有居家生活感（P01 / P04）。
2. 在 Idle / Walk 的不同位置點書架，看接近、對正、開書 0.35 秒、閱讀 7 秒、一次翻頁、收書 0.35 秒與走開。檢查書本、雙手、低頭與節奏是否可愛自然（P02）。
3. 從房間預設、正面斜角、側面環繞並縮放，確認書不穿胸／口鼻、雙手支撐不像浮空；從書架背後可能遮住角色，轉到開放側觀看。調整 Chrome 視窗大小，補完整可讀性（P03 / T09）。
4. 開 Debug 確認 source 是 Autonomous，在 Opening book / Reading / Putting book away 附近點 Window 或 Bed；確認先收書放手，再空手去窗／上床。Player Command 中點其他目標應拒絕而非插隊（T05 / T06）。
5. 在 approach 與 Reading 分別切換另一 Chrome 分頁 10 秒後回來，記錄前後 phase/time/cooldown，確認沒有消耗背景時間或跳過收書，再正常完成（T12）。
6. 保留 Sleep pose / Wake / Sleep→Window 與 V0.1 Window 觀感回歸；獨立 Chrome performance 按既有規格另行實測，不從本次 smoke 推定通過。

Slice B 已 Accepted；獨立 Chrome 的未測項目需補實測資料後才能更新技術狀態。不開始 Eat。

## Known Limitations / architecture

- 程序狐狸沒有手指、IK 或正式骨架；書本由局部 transform 演出開合／縮入視覺，沒有真正從書架抽取一本書或物件持握解算。雙手支撐與翻頁以 stylized 可讀性為目標。
- 空間驗證是離散幀、包圍盒與手部距離檢查，不是完整自碰撞系統；PO 已接受目前可愛度、可讀性及生活感，不因此宣稱所有角度／硬體條件皆經測量。
- Reading anchor 和既有床尾 waypoint 是固定房間配置；改家具或角色尺寸需重驗，未建立通用尋路。
- 書架遮擋側與小 viewport UI 會影響觀察；大 viewport 在 In-app 截圖有裁切限制。獨立 Chrome background、完整 resize 與效能仍待補驗。
- Build >500 kB warning 保留。未發現新的自動測試或功能流程 blocker；PO 已明確接受產品體驗，尚未完成的 Chrome 技術補驗仍保持 Pending。
- 真實重複與單一 afterExit 欄位的理由見 [Architecture §22](ARCHITECTURE.md#22-slice-b-實作與驗證觀察2026-09-16)。本輪未做大型 refactor。

## Changed Files / Diff Summary

- `src/Character.ts`：Read phases / priority / safe exit / cooldown、有限 afterExit、reading bounds。
- `src/createFoxVisual.ts`：Read overlay、書與一次翻頁、讀完完整清理；本輪僅小幅書本／手臂淨空 polish。
- `src/scene.ts`：Bookshelf parts、reading anchor；床 geometry 未改。
- `src/ReadInteraction.ts`、`src/read.ts`：最小 raycast binder、Read constants / phase。
- `src/main.ts`、`src/DebugPanel.ts`：組合、hit counter、真實 phase / cooldown、listener disposal。
- `tests/read.test.mjs`：9 項 Read 技術測試；原 24 項 tests 未改。
- `docs/V0_2_READ_ACCEPTANCE.md`、`docs/V0_2_WEB_SPEC.md`、`docs/ARCHITECTURE.md`、`docs/evidence/v0.2-read/`：驗收、當前 Slice 狀態、架構觀察與原始證據。

本輪以 Accepted Read checkpoint 收尾；Sleep checkpoint 保持原樣，不進 Eat。
