# Fox Life Web V0.2 — Basic Life Overall Acceptance

驗收日期：2026-09-20  
分支：`feature/v0.2-eat`  
驗收基準：`562c945`  
狀態：**Ready for Product Owner Manual Acceptance**  
PO Manual Acceptance：**Pending / Not Reviewed**  

本文件是 V0.2 Basic Life 的整體技術驗收與 Closeout 紀錄。此輪沒有新增功能、沒有修改 runtime、沒有開始 V0.3。下方所有 Product Owner 項目保留待 PO 實際體驗後填寫；Agent 觀察、Node 測試與 In-app Browser smoke 不代替 PO Acceptance。

## 1. V0.2 Scope Summary

目前狐狸具有：

- Autonomous：Idle、Walk、Sleep、Read、Eat。
- Player-directed：Window Observe、Sleep、Read、Eat。
- 家具／環境目標：Window、Bed、Bookshelf / Reading Area、Food / Dining Area。
- 共用產品語意：單一進行中意圖、Player Command 優先、自主 anchored Action 安全退出、visual reset 後才移動、完成後回 Autonomous Life。

V0.2 沒有加入 Needs、Hunger、Energy、Mood、Inventory、Save / Offline Progress、通用尋路、Action framework 或 V0.3 功能。Window Observe 依核准規格維持玩家觸發，不屬於自主候選。

## 2. Accepted Slice Checkpoints

| Slice | PO Slice Status | Checkpoint | 本輪結果 |
| --- | --- | --- | --- |
| Sleep | Accepted，2026-09-15 | `fb9ad1f` | 整體回歸未發現 blocker |
| Read | Accepted，2026-09-17 | `2e18ed3` | 整體回歸未發現 blocker |
| Pre-Eat Architecture Review | Review checkpoint | `79d6427` | Guardrails 仍成立 |
| Eat | Accepted，2026-09-19 | `562c945` | 整體回歸未發現 blocker |

三個 Slice 的 PO Accepted 只代表各 Slice 歷史驗收已完成；不自動等於本次 V0.2 Overall PO Acceptance。

## 3. Autonomous Life Observation

### Environment and duration

- Production build，Codex In-app Browser，802 × 673。
- Debug 全程關閉；沒有點擊 Window、Bed、Bookshelf 或 Food。
- 觀察區間：`2026-09-20T01:12:04.822Z` → `2026-09-20T01:17:10.558Z`，共 **305.736 秒（5 分 5.736 秒）**。
- 14 個時間點的家具 hit count 全為 0，確認不是玩家指令造成。
- 原始紀錄：[autonomous-observation.json](evidence/v0.2-overall/autonomous-observation.json)；畫面取樣：[auto-01](evidence/v0.2-overall/auto-01.png) 至 [auto-14-return](evidence/v0.2-overall/auto-14-return.png)。

### Observed sequence and result

觀察到的 State / Action 包含：

- Idle：Breathe、Look around。
- Walk：一般 Room destination，以及走向 Bed / Reading Area。
- Read：持書閱讀並完成收書。
- Sleep：床上睡姿、Wake、返回日常。
- Eat：餐區進食、收尾、返回日常。

結果：

- **不同 Action 有輪替**：Read、Sleep、Eat 均在無操作下實際出現，並穿插 Idle / Walk。
- **未見卡死**：每個取樣中的 anchored Action 均能結束或繼續到下一個正常狀態。
- **未見持續重複同一 Action 的異常**：同一 Action 會再次出現，但中間有其他行為、Idle / Walk 與 cooldown；不是固定 Sleep → Read → Eat 輪播。
- **Action 結束後可回 Autonomous Life**：觀察到 Idle、一般 Walk、下一個自主目標與 cooldown 遞減。
- **未見持續 prop / pose 殘留**：Read / Eat 完成後回空手站姿；Sleep 完成後能站立並走向其他目標。
- Window Observe 未在此段出現是規格預期；V0.2 沒有 Autonomous Window Observe。

這是連續運行中的離散狀態與畫面取樣，不是完整錄影，也不是長時間 memory soak。

## 4. Player-directed Cross-action Test

### 4.1 Deterministic 6 × 4 matrix

一次性 closeout 檢查以 Idle / Walk / Observe / Sleep / Read / Eat 六個來源狀態，對 Window / Bed / Bookshelf / Food 四個目標，在 20 / 60 / 144 Hz 驗證，共 **72/72 Pass**；另驗證四種 Player Command 對四種新指令的 **16/16 lock cases Pass**。

證據：[cross-action-check.mjs](evidence/v0.2-overall/cross-action-check.mjs)、[cross-action-results.json](evidence/v0.2-overall/cross-action-results.json)。此腳本是 closeout evidence，不加入既有 44-test suite。

| Current State | Window | Bed | Bookshelf | Food |
| --- | --- | --- | --- | --- |
| Idle | 接受，直接 Walk | 接受，直接 Walk | 接受，直接 Walk | 接受，直接 Walk |
| Walk | 接受，安全改目標 | 接受，安全改目標 | 接受，安全改目標 | 接受，安全改目標 |
| Observe | 忽略 | 忽略 | 忽略 | 忽略 |
| Sleep（Autonomous） | Wake → Walk → Observe | 同目標去重 | Wake → Walk → Read | Wake → Walk → Eat |
| Read（Autonomous） | Put Away → Walk → Observe | Put Away → Walk → Sleep | 同目標去重 | Put Away → Walk → Eat |
| Eat（Autonomous） | Finish → Walk → Observe | Finish → Walk → Sleep | Finish → Walk → Read | 同目標去重 |

Observe 列的「忽略」是既有 Player Command lock 規則：進行中的玩家指令不被覆寫、不排隊；完成後新指令可正常接受。Sleep / Read / Eat 的同目標去重也不重啟 timer 或改 source。

### 4.2 Cleanup and transition assertions

矩陣在新 Action 開始前檢查：

- anchored Action 退出期間 world root 保持原位，不以睡姿／持書／持食姿勢滑行。
- `ReadingBook`、`EatingBowl`、`EatingBite` 均 hidden 且 scale 0。
- visual root position / quaternion 回中性；Sleep morph 全為 0。
- Read / Eat 的頭、手臂與尾巴專用 offset 清除。
- target / source 完成後回 `None` / `Autonomous`，等待一秒沒有 queued Action。
- 完成後四種指令皆可再次接受。

安全退出完成時間：Sleep 最大 0.757 秒；Read 最大 0.354 秒；Eat 最大 0.354 秒。Sleep 在切換到 Walk 的第一幀仍可有約 **0.066–0.168 rad** 的既有手臂 damping 餘角；它低於已接受的 Walk swing envelope 0.23 rad，props、root、morph 與 Action-specific offsets 已清除，Idle 後回到小於 0.05 rad。此項列為 Known Limitation，不誤寫成「所有 rotation 在同一幀精確為零」。

### 4.3 Production UI samples

實際 production 家具命中與完整返回的取樣包括：

- Idle → Bed → Sleep → Idle：[command](evidence/v0.2-overall/ui-Idle-Bed-command.json)、[active](evidence/v0.2-overall/ui-Idle-Bed-active.json)、[return](evidence/v0.2-overall/ui-Idle-Bed-return.json)。
- Idle → Window → Observe → Idle：[command](evidence/v0.2-overall/ui-Idle-Window-command.json)、[active](evidence/v0.2-overall/ui-Idle-Window-active.json)、[return](evidence/v0.2-overall/ui-Idle-Window-return.json)。
- Walk → Bookshelf → Read → Idle：[command](evidence/v0.2-overall/ui-Walk-Bookshelf-command.json)、[active](evidence/v0.2-overall/ui-Walk-Bookshelf-active.json)、[return](evidence/v0.2-overall/ui-Walk-Bookshelf-return.json)。
- Autonomous Sleep → Bookshelf：[before](evidence/v0.2-overall/interrupt-Sleep-Bookshelf-before.json) → [Wake for reading](evidence/v0.2-overall/interrupt-Sleep-Bookshelf-exit.json) → [Read](evidence/v0.2-overall/interrupt-Sleep-Bookshelf-active.json) → [return](evidence/v0.2-overall/interrupt-Sleep-Bookshelf-return.json)。
- Autonomous Read → Food：[before](evidence/v0.2-overall/interrupt-Read-Food-before.json) → [Put Away](evidence/v0.2-overall/interrupt-Read-Food-exit.json) → [Eat](evidence/v0.2-overall/interrupt-Read-Food-active.json) → [return](evidence/v0.2-overall/interrupt-Read-Food-return.json)。
- Autonomous Eat → Window：[before](evidence/v0.2-overall/interrupt-Eat-Window-before.json) → [Finish](evidence/v0.2-overall/interrupt-Eat-Window-exit.json) → [Observe](evidence/v0.2-overall/interrupt-Eat-Window-active.json) → [return](evidence/v0.2-overall/interrupt-Eat-Window-return.json)。
- 最終 build 再點 Food，Food hits 0 → 1，正常完成並回 Autonomous Walk；見 [production-smoke.json](evidence/v0.2-overall/production-smoke.json)。

瀏覽器取樣不是 24 組每一組都人工觀看；完整矩陣由 deterministic Character simulation 覆蓋，production UI 用代表性流程驗證真實 raycast、renderer 與操作串接。

## 5. Life-feel Regression

| Baseline | 結果 | 依據 |
| --- | --- | --- |
| Locomotion / turn polish | Pass，未見 regression | 原 15 項 behavior tests 全通過；production 中一般 Walk、轉向、到站、離站持續正常 |
| Window Observe | Pass | 玩家實際完整 Observe / return；4 秒 timing、去重、raycast、FrameClock 測試通過 |
| Sleep pose / Wake | Pass within accepted baseline | 自主與玩家 Sleep、Wake、跨 Action 退出、床面／morph 測試通過 |
| Read pose / prop | Pass within accepted baseline | 自主與玩家 Read、翻頁／收書、prop cleanup、跨 Action 退出通過 |
| Eat pose / rhythm | Pass within accepted baseline | 三次入口、碗／食物淨空、正常收尾、跨 Action 退出通過 |

Debug 關閉畫面中，Sleep 的躺姿、Read 的持書低頭、Eat 的餐碗／手口動作、Observe 的窗前站位具有不同輪廓。離散取樣未發現書、碗、食物、睡姿 morph 或頭／手／腿／尾巴專用 offset 持續帶入下一個 Action。

以上是 regression review，不是重新宣告三個 Slice 的美術或 PO Acceptance，也不取代本次 Overall PO 判斷。

## 6. Room / Camera / Interaction

- 床、窗、書架與餐桌／食物仍可辨識；Reading Area 與 Dining Area 分在右後／右前，中央活動區與主要行走路徑保留。
- 44-test suite 的實際 scene geometry 取樣涵蓋各家具 approach / departure、床尾 waypoint、floor / furniture clearance；未見新增卡死、穿牆或靠瞬移到站位。
- Production In-app smoke 的 Camera orbit、zoom、reset 均正常；Camera 操作沒有停止 Action。
- Window / Bed / Bookshelf / Food binders 的 nearest visible raycast、occlusion、5 px drag 排除、cancel 與 dispose 測試全通過。
- Production 代表性點擊的目標 hit counter 增加且 source / phase 正確；幾次未命中點擊沒有被誤算成 command failure。
- 小 viewport 左上既有資訊卡會遮住部分床／角色；書架背面或某些環繞角度也會遮擋角色，需要環繞到開放側。這是觀看限制，未發現餐區／閱讀區造成中央路徑 blocker。

完整 resize 仍缺獨立 Chrome 證據，故不在此標 Passed。

## 7. Debug Off Review — Agent Observation Only

下表只記錄交 PO 前的產品觀察，不是 PO 回填：

| Product question | Observation |
| --- | --- |
| 1. 玩家是否能辨識狐狸正在做什麼？ | 在主要開放視角可由窗前站位、床上躺姿、持書與餐碗／入口動作辨識；不依賴 Debug。部分背面／遮擋角度可讀性降低。 |
| 2. 不操作時是否仍在生活？ | 5:05.736 無操作期間出現 Idle、Walk、Read、Sleep、Eat 並正常回日常，支持「持續生活」的判讀。 |
| 3. 不同行為是否有足夠視覺差異？ | 目前三個 anchored life Actions 與 Observe 的姿勢、prop、空間位置及節奏不同。 |
| 4. 是否會想繼續看下一步？ | cooldown、Idle / Walk 間隔與非固定輪替提供下一步不確定性；是否形成觀看欲望須由 PO 決定。 |
| 5. 是否具備「小小的家，角色自己生活」？ | 目前 room zones、家具導向行為與自主輪替已提供明確支持；最終產品 Gate 保留給 PO。 |

## 8. Technical Validation

最終 source 版本於 2026-09-20 重新執行：

| Check | Result |
| --- | --- |
| `npm run typecheck` | **Pass**，exit 0 |
| `npm test` | **44/44 Pass**，0 fail、0 skipped，17,116.4899 ms |
| `npm run build` | **Pass**，33 modules，454 ms |
| Build output | main 21.55 kB / gzip 6.36 kB；shared 633.58 kB / gzip 160.56 kB |
| Build warning | 既有 shared chunk >500 kB warning，保留且不誤標為 error |
| Overall cross-action script | **72/72 matrix + 16/16 player lock Pass**，exit 0 |
| Production smoke | **Pass（In-app scope）**：Food 命中／完成／回自主、orbit、zoom、reset、WebGL rendering |
| Console warning / error | `[]` |

證據：[technical-validation.md](evidence/v0.2-overall/technical-validation.md)、[build.txt](evidence/v0.2-overall/build.txt)、[production-smoke.json](evidence/v0.2-overall/production-smoke.json)。

本輪 `git diff --name-only -- src tests` 為空；沒有修改 runtime / tests / assets / dependencies。工作樹的新增內容只有本 Overall Acceptance 文件與 `docs/evidence/v0.2-overall/`。

### V0.2 Technical AC status

| AC | Status | Note |
| --- | --- | --- |
| V02-T01 | Partial | 現有 checkout 的 typecheck / tests / build / production preview 通過；未重做 clean install，獨立 Chrome 仍 Pending |
| V02-T02 | Pass | 5:05 自主觀察 + 可預測 chooser / cooldown / 三 Walk 上限測試 |
| V02-T03 | Pass | 72-case cross-action matrix；production 代表性流程 |
| V02-T04 | Pass | 同目標去重與 16 種 Player Command lock 無 queue / overwrite |
| V02-T05 | Pass | state / phase / target / source、prop / pose / timer / cooldown cleanup |
| V02-T06 | Pass within sampled room geometry | 多起點、多 heading、多幀率與 production 路線未見 blocker；非通用碰撞證明 |
| V02-T07 | Partial | In-app orbit / zoom / reset / interaction 通過；獨立 Chrome full resize Pending |
| V02-T08 | Partial | FrameClock 自動回歸涵蓋所有 Action；獨立 Chrome background-tab Pending |
| V02-T09 | Pass（In-app production） | Debug 關閉的自主三 Action、四玩家目標歷史流程、Camera 與返回日常均有 production 證據 |
| V02-T10 | Pending | 沒有獨立 Chrome 1920×1080 / 60 秒 FPS、frame-time、GPU 紀錄 |
| V02-T11 | Pass | 未發現禁止架構；`main.ts` 維持 composition root；runtime diff 為空 |
| V02-T12 | Partial | 四個 binder 的 dispose / single-hit 自動測試通過；本 closeout 未另做完整 repeated HMR / reload UI sequence |

## 9. PO Manual Acceptance

**目前不得標記 Accepted。** 請 Product Owner 在 Debug 關閉下完成至少 5 分鐘連續體驗，包含不操作觀察、Window / Bed / Bookshelf / Food 各至少一次，以及 Camera orbit / zoom，再回填：

| ID | PO question | Status |
| --- | --- | --- |
| V02-P01 | Sleep、Read、Eat 是否只靠畫面就能彼此區分，也能與 Idle／Observe 區分？ | **Pending / Not Reviewed** |
| V02-P02 | 接近、轉向、收勢、特有姿勢、結束與回日常是否像連續生活？ | **Pending / Not Reviewed** |
| V02-P03 | 自主頻率、cooldown 與停留節奏是否有變化但不忙亂、沒有固定輪播？ | **Pending / Not Reviewed** |
| V02-P04 | 點四個目標時，是否像選擇下一個生活行為而非直接操控狐狸？ | **Pending / Not Reviewed** |
| V02-P05 | 新家具與行為是否讓房間更像住宅，主要 Camera 角度仍舒服可讀？ | **Pending / Not Reviewed** |
| V02-P06 | 狐狸是否開始讓人感覺真的在家裡生活，而不只是走路加播放狀態？ | **Pending / Not Reviewed — final product gate** |
| V02-P07 | 是否會想繼續看下一個行為，或主動點另一個家具？ | **Pending / Not Reviewed** |

只有 PO 明確 Accepted，特別是 V02-P06，才能將 V0.2 Overall Product Acceptance 改為 Accepted。

## 10. Pending Chrome Checks

以下沒有真正獨立 Chrome 證據，保持 **Pending**；In-app Browser 結果不取代：

| Check | Status | Required evidence |
| --- | --- | --- |
| background-tab | **Pending** | 在 Walk / Observe / Sleep / Read / Eat 的移動或計時中切換 Chrome 分頁，保存前後 phase / position / cooldown |
| full resize | **Pending** | 獨立 Chrome 連續調整視窗，涵蓋主要 Camera 角度、canvas / Debug 與三個新 Action 可讀性 |
| performance / FPS | **Pending** | 1920×1080 目標、Chrome 前景暖機後至少 60 秒，保存 FPS / frame-time / GPU / viewport / 操作記錄 |

## 11. Known Limitations

- 狐狸仍是 procedural model，沒有正式 Rig、IK、手指、嘴部骨架、完整抓取或接觸解算。
- 書、碗、食物是 Action-local prop 演出；沒有真正從家具取放、食物消耗、Inventory 或 Needs。
- Approach anchors、活動範圍與床尾 waypoint 是現有房間專用；不支援任意家具重排或通用 navmesh / collision solver。
- 空間與自碰撞驗證是多幀率離散取樣、mesh / triangle surface 與包圍空間檢查，不是所有連續時間的完整 triangle self-collision 證明。
- Sleep safe exit 到 Walk 的第一幀有小幅 baseline arm damping 餘角；未見睡姿滑行或 props / morph 殘留，Idle 後回穩。
- 小 viewport 的左上資訊卡會遮住部分床或角色；書架背面與部分環繞角度會降低 Action 可讀性。
- Shared bundle 633.58 kB / gzip 160.56 kB，保留 >500 kB warning；本輪沒有建立拆包工作。
- 獨立 Chrome background-tab、full resize、performance / FPS 尚未完成。

## 12. Architecture Observations

- `Character` 繼續擁有 intent、state / phase、world movement、timing、cooldown 與單一 Player Command priority。
- `createFoxVisual` 維持 local pose / prop / overlay / neutral reset；沒有把 world destination 或 chooser 移入 visual。
- `scene` 提供明確 parts / anchors / heading；`main` 只組合 binder、Character、Debug、Camera 與 cleanup。
- `afterExit` 保持單一有限目的地；Sleep / Read / Eat 的 safe exit 共享協調，但 Wake / Put Away / Finish 與 pose 仍各自專用。沒有 command queue、Action registry、generic graph 或未使用 extension points。
- Window / Bed / Read / Eat 四個 binder 的 pointer / nearest-hit / drag / cancel / dispose 是已確認的真實重複。小型 click binder 仍可作未來獨立 maintenance review，但不是 V0.2 blocker，也不應在本 closeout 順手重構。
- Chooser 仍是 `Walk:3` 加每個 eligible life action 一格；Sleep / Read 的未讀 weight 常數 observation 保留，不在本輪建立 scheduler 或 Needs。
- 44 tests 與 cross-action closeout 檢查未發現必須修改 runtime 的 regression blocker。

## 13. V0.2 Overall Status

**Technical closeout conclusion：在目前 checkout 與 In-app production scope 內，未發現 V0.2 regression blocker；可交 Product Owner 進行 Overall Manual Acceptance。**

分開記錄的狀態：

- Current-source typecheck / 44 tests / build：**Pass**。
- 5 分鐘 Autonomous Life observation：**Pass（Agent observation）**。
- Cross-action lifecycle / cleanup：**Pass（simulation + representative production samples）**。
- In-app production smoke：**Pass**。
- PO Manual Acceptance：**Pending / Not Reviewed**。
- Independent Chrome background-tab / full resize / performance：**Pending**。
- V0.2 Overall Product Acceptance：**Not yet Accepted**。

完成技術驗證後在此停止；不修改 runtime、不建立 V0.2 Accepted checkpoint、不 push / merge、不開始 V0.3。
