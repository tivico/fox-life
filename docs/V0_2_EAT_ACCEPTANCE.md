# V0.2 Slice C — Eat Acceptance Record

實作與取樣：2026-09-17～2026-09-19。最新驗證：2026-09-19。
狀態：**V0.2 Slice C — Eat Accepted**。
**PO Manual Acceptance = Accepted（2026-09-19）**。

## Product Owner acceptance / closeout（2026-09-19）

- 驗收者：Product Owner（本次對話的使用者）；明確接受 Eat 的可讀性、可愛度、進食節奏、碗的位置、hand-to-mouth 動作與 interruption behavior。
- **bowl/body clipping blocker：PO 已解除。hand-to-mouth readability blocker：PO 已解除。** SC-P01～SC-P04 依本次 Slice C 整體人工接受結論記為 Accepted，並非由工具推定。
- 無新的功能 blocker。已知程序模型與演出限制保留為 Known Limitations，依 PO 決定不阻擋 Slice C。
- 獨立 Chrome **background-tab、完整 resize、performance 均為 Pending**。此次產品體驗接受不等同提供這三項實測數據，SC-T09 / SC-T12 的人工技術缺口不改為 Pass。
- 最後核對：44/44 tests（Eat 11/11）、typecheck、build 通過；production smoke、Sleep / Read / Observe regression 證據見下方 polish 驗證與歷史 smoke。此輪僅更新文件及提交既有成果，未修改 runtime／tests，未重跑或宣稱新增 smoke。
- Checkpoint：`feat: establish accepted V0.2 Eat checkpoint`；以本文件所在 commit 為穩定基準，parent `79d6427`，branch `feature/v0.2-eat`。納入既有 Eat implementation / polish / tests、Architecture observation、規格狀態、驗收及 evidence。
- 未 push / merge，未開始 V0.2 Overall Closeout 或 V0.3。

下方 polish 的 Needs Adjustment／待 PO 敘述是當時歷史；兩項 blocker 與最新 Acceptance 以上述 PO closeout 為準。

## Eat Pose / Prop Polish（2026-09-19，最新結果）

PO 明確指出兩個視覺 blocker：靠身體側碗緣穿模，以及持食手離口鼻太遠。以下結果取代首輪「未見功能 blocker」對這兩項視覺問題的判定；不得因測試通過就視為 PO 已接受。下方原 43 tests、初版圖片／AC 表保留為首輪歷史，本節為最新驗證。

### Bowl Before → After

- Before：碗 local `(-0.10, 0.65, 0.42)`；先前只比較 pear torso，漏掉向前凸出的吊帶褲胸片及手臂。首輪技術 Pass 並不能排除 PO 看到的 silhouette 穿模。
- After：碗 local z 前移至 `0.49`（+0.07 local，約 0.053 scene units），不改高度、大小、朝向或餐區布局；左手 Eat-only z 配合前移 `0.07`，保持托碗關係。靠身側碗緣與胸片之間留出間隙，沒有把整個餐碗推遠。
- 新增完整變換後的碗頂點／三角形重心，對 torso、bib、straps、buttons、雙臂、雙腿做雙向 solid surface sampling。AABB 只作快速排除，真正判定用實際 triangle ray intersections；允許 0.002 scene units 的表面接觸容差，不是只用 bounding box 宣告通過。

### Hand-to-mouth Before → After

- Before：右手僅抬到 x rotation `-1.50`，z roll 仍向外 `0.08`；頭部還向相反方向微轉。食物中心偏在臉侧，下口鼻參考點距離約 0.25 scene units，雖未穿主頭部，入口意圖不清楚。
- After：右臂峰值 x rotation `-1.72`、向內 z roll `-0.72`；頭朝向改為克制的 `0.01`。右肩局部 reach 隨入口最多約 0.23 local，先抬過碗緣，再沿小弧線避開臉頰、靠向下口鼻。食物仍是同一手臂子物件，沒有獨立飛向嘴巴。
- 食物在手上的 local z `0.09 → 0.04`，厚度 z `0.07 → 0.055`，避免食物上緣撞鼻子；20/60/144 Hz 三次峰值的食物中心距下口鼻約 **0.078**、手端約 **0.095 scene units**。在 head local space 的水平偏差約 0.022，已對準口鼻而非停在臉側。[三次峰值數據](evidence/v0.2-eat/pose-polish/mouth-samples.json)。这些是幾何度量，不是產品世界的公尺標定，也不代替視覺驗收。
- 沿用三次入口的 0.25 / 2.05 / 4.30 起始節奏與原有短暫峰值停頓、咀嚼／回手。0.40 / 6 / 0.35 lifecycle timing、cooldown、chooser、priority、afterExit 皆未變。
- 每幀撤回新增 arm roll，肩部 reach 由既有 baseline reset 後重套 Eat；退場回零。測試檢查雙臂 z roll 回 `-0.08 / 0.08`、局部 z=0、食物與碗隱藏且 scale=0，避免 Eat 偏移帶入下一個行為。

### 驗證 / production visuals

| 檢查 | 結果 |
| --- | --- |
| Eat tests | **11/11 Pass**，[log](evidence/v0.2-eat/pose-polish/eat-tests.txt) |
| Full tests | **44/44 Pass**，0 fail，19251.8118 ms；原 behavior / Sleep / Read tests 未改，[log](evidence/v0.2-eat/pose-polish/tests.txt) |
| Typecheck | Pass，[log](evidence/v0.2-eat/pose-polish/typecheck.txt) |
| Build | Pass，33 modules / 152 ms；shared 633.58 kB / gzip 160.56 kB，保留既有 >500 kB warning，[log](evidence/v0.2-eat/pose-polish/build.txt) |
| Production smoke | 最終 build，`http://127.0.0.1:4185/`，In-app Browser，641×505；點 Food、入口／咀嚼／正常收姿、orbit / zoom / reset，Console error/warn `[]`，[log](evidence/v0.2-eat/pose-polish/console.json) |
| Interruption / regression | Eat 在 approach、部分 settle、入口、咀嚼及 finish 對 Window / Bed / Read 的測試全通過，先 neutral 再走；Sleep / Read → Eat 及原 Observe / locomotion 回歸通過。新 production 取樣聚焦 pose、正常收姿與視角，本輪未重新捕捉三種自主 Eat 中斷的瀏覽器影片 |

實際 production 多角度證據（每張 peak 圖旁 `.txt` 保存當時 Eat phase/time）：

- 正常遊戲鏡頭：[第一次](evidence/v0.2-eat/pose-polish/gameplay-bite-1.png)、[第二次](evidence/v0.2-eat/pose-polish/gameplay-bite-2.png)、[第三次](evidence/v0.2-eat/pose-polish/gameplay-bite-3.png)。
- Front / front 3/4：[第一次](evidence/v0.2-eat/pose-polish/front-peak-1.png)、[第二次](evidence/v0.2-eat/pose-polish/front-peak-2.png)、[第三次](evidence/v0.2-eat/pose-polish/front-peak-3.png)。
- Side 3/4：[入口峰值](evidence/v0.2-eat/pose-polish/side-peak.png)、[斜角取樣](evidence/v0.2-eat/pose-polish/side-three-quarter.png)、[正常返回、空手站姿](evidence/v0.2-eat/pose-polish/side-return.png)。

在這些實際視角取樣中，未見碗進入身體或食物插入臉／鼻子的明顯穿模；持食手及食物位於下口鼻前方，三次入口均有峰值證據。新 surface test 在多幀率、19 個進食時間點檢查全部碗頂點／面重心與全部食物頂點／面重心，不再僅檢查 sparse head vertices。這仍是取樣，不是全連續時間所有 triangle 對的自碰撞證明。

In-app 播放速度不穩定，工具等待曾錯過短暫 phase；僅以實際成功保存的 phase 取樣作證，不把等待 timeout 解讀為 runtime 失敗，也不推論 Chrome FPS。獨立 Chrome background / resize / performance 保持 Pending。

### 本輪範圍 / PO gate

本輪只修改 `src/createFoxVisual.ts` 的 Eat bowl / prop / overlay、`tests/eat.test.mjs`、本文件與 `evidence/v0.2-eat/pose-polish/`。working tree 中其他 implementation / Spec / Architecture 變更均為前輪既有工作，本輪沒有再改。沒有 commit / push / merge。

程序模型仍無手指、IK、嘴部骨架或真正抓取器皿；手持碗與食物維持既有局部淡入淡出，placeholder 接點不等於正式骨架資產。

Polish 當時兩項 blocker 待 PO 複驗；**本次 closeout 已由 PO 明確解除並接受**，詳見頂部紀錄。前側／側斜角碗緣、三次入口與中斷後清理的證據保留供後續回歸。

## Branch / checkpoint / scope

- Pre-Eat review 確認只有 `docs/ARCHITECTURE.md` 的 57 行預期變更、diff check 通過，已提交 `79d6427`：`docs: record pre-eat architecture review`。
- 從該 commit 建立 `feature/v0.2-eat`，切換時 working tree 乾淨。Read `2e18ed3` 與 Sleep `fb9ad1f` 保持原有歷史，沒有 amend / reset。
- 本輪只有 Eat 與其驗證；維持程序狐狸。Sleep / Read timing、pose preset、既有測試不變；在共用 Character / visual 入口新增 Eat 分支與清理。未建立 framework、Needs、Inventory、Food database、Rig 或新外部資產。
- Eat 已由 PO Accepted；本文件所在 checkpoint 納入既有 implementation、polish、tests 與證據。沒有 push / merge，也沒有進行 V0.2 Overall Closeout。

## 最終演出 / lifecycle

Autonomous Life → Eat intent / Player Food Command → Walk to dining area → 朝向 +X、既有 0.18 秒到點收勢 → Smelling food 0.40 秒 → Eating 6 秒 → Finishing meal 0.35 秒 → Autonomous Idle。

- Dining anchor `(2.10, 0, 1.45)`、heading `π/2`；相對規格 x=1.85 調整 +0.25，位於核准範圍，保留餐區與轉身尾巴淨空。餐桌中心 `(3.35, 0.62, 1.65)`，左側 x=3.00，位於主要自主動線之外，沒有新增椅子或改房間比例。
- 指定餐桌面、餐碗、食物可點擊；書架、床、原有櫃體桌面不是 Eat target。共用最近 raycast 命中慣例，拖曳／遮擋不誤觸。
- 左手托小碗、右手拿點心，頭部略低，上半身小幅配合。進食第 0.25、2.05、4.30 秒開始三段不同間隔的抬手入口、咀嚼、停頓；以局部食物縮放表示入口，不管理數量。
- Smell / approach 屬 Walk；Eating / Finish 屬 Eat。6 秒僅計算 Eating。Debug 顯示真實 phase / time / target / source / cooldown / hits。
- Eat overlay 每幀先撤回上幀偏移，再套既有 baseline；退場歸零，手邊餐具隱藏且 scale=0，不阻擋 raycast。Sleep / Read 視覺互斥。

## Priority / interruption / autonomous

- 玩家 Food 指令立即取代自主 Idle / Walk 的目的地，不瞬移。Player Command 進行中拒絕所有重複及跨目標命令，不重啟、不排隊；同一自主 Food 指令也不改 source 或重新計時。
- Autonomous Eat → Window / Bed / Bookshelf：部分 Smell、入口、咀嚼、Finish 都先安全退場，當前 motion time 凍結、從當前 pose 淡出；已在 Finish 時不重啟計時。root 保持餐區直到餐具消失、姿勢回復才執行 `afterExit` 目的地。
- Autonomous Sleep / Read → Food 沿用既有 Wake / PutAway，再開始 Eat；Player Sleep / Read / Observe 拒絕插隊。
- 初次先完成 Idle → Walk → Idle；候選 `Walk:3 / Sleep:1 / Read:1 / Eat:1`，只納入已啟用且 cooldown=0 的生活行為。連續三次 Walk 後若有 eligible life action，從生活行為選擇；Eat 結束設 30 前景秒 cooldown。Player 可忽略 cooldown，完成仍設定 cooldown。

## 首輪驗證結果（歷史；最新為上方 44/44）

| 檢查 | 最終結果 | 證據 |
| --- | --- | --- |
| typecheck | Pass，exit 0 | [log](evidence/v0.2-eat/typecheck.txt) |
| 全部 tests | **43/43 Pass**，0 fail，22619.2109 ms | [log](evidence/v0.2-eat/tests.txt) |
| build | Pass，33 modules，328 ms | [log](evidence/v0.2-eat/build.txt) |
| Console error / warn | 最終 production session `[]` | [log](evidence/v0.2-eat/console.json) |

既有 15 behavior + 9 Sleep + 9 Read tests 保留未改；新增 10 Eat tests。Build 保留 >500 kB warning：shared 633.36 kB / gzip 160.50 kB，main 21.55 kB / gzip 6.37 kB；未調整 bundling/dependencies。

最後的食物／頭部檢查曾因整個頭部 AABB 包含臉頰外側空白而失敗。改用實際 head mesh 的徑向 surface intersection，檢查食物表面取樣頂點至少 0.002 world units 在頭部外側；20/60/144 Hz 通過，未為此修改 motion。這是取樣檢查，不是完整 triangle self-collision 證明。初期 test logs 保留在 `development-*`，不作為最終結果。

## Slice C Technical AC

| AC | 狀態 | 證據與範圍 |
| --- | --- | --- |
| SC-T01 | Pass | Typecheck / 43 tests / build；warning 如上 |
| SC-T02 | Pass（技術） | 三起點 × 20/60/144 Hz、三個實際自主 Walk 位置；0.5 秒內反應、完整流程、無瞬移；production 玩家完整返回 |
| SC-T03 | Pass | 可預測 random 驗證 3:1:1:1、初始 Walk、三 Walk 上限、30 秒 cooldown；production 自主 Eat → Idle |
| SC-T04 | Pass | 0.40 / 6 / 0.35 分段計時、Debug、target/source/prop 清理 |
| SC-T05 | Pass（自動測試） | 重複 Food / Bed / Read / Window 拒絕，不修改 timer / target；無 queue，完成後可再次接受 |
| SC-T06 | Pass（技術） | approach / 部分 Smell / 入口 / 咀嚼 / Finish 對三種指令中斷；0.35 秒內 neutral 才移動。Production 捕捉自主 Eat → Finish → Observe；Bed / Read 中斷由自動測試覆蓋 |
| SC-T07 | Pass（取樣技術範圍） | 三次抬手、手托碗、食物／頭部表面淨空、碗／胸分離、有限 transforms、收姿；三起點 × 兩 heading × 三幀率 approach / 食用 / departure 家具及地板淨空，另有三種跨 Action 往返路線 |
| SC-T08 | Pass | Food/指定桌面命中，Bed/Bookshelf/無關桌面/遮擋/拖曳/cancel/dispose 拒絕；production 點餐碗 |
| SC-T09 | 部分通過，人工 Pending | In-app 802×673 與 1280×720 取樣、orbit / zoom / reset 與 Debug 關閉；尚未完成正常 Chrome 的連續 resize、全部主要角度驗收 |
| SC-T10 | Pass（測試與 smoke）；既有人工缺口保留 | 原 33 tests 全通過；新增 Sleep / Read → Eat 與 Eat → 三目標 cleanup；production Sleep / Read / Observe 完整返回 |
| SC-T11 | Pass（In-app production smoke） | 實際自主及玩家 Eat、既有三種行為、Camera / 隱藏 Debug；Console 無 error/warn |
| SC-T12 | 部分通過，Chrome Pending | FrameClock 測試涵蓋 approach / smell / eat / finish / cooldown；獨立 Chrome 真實分頁隱藏／恢復尚未實測 |

## Production evidence

環境：`npm run preview -- --port 4185 --strictPort`，`http://127.0.0.1:4185/`，Codex In-app Browser。早期同 runtime 取樣 802×673；最終重啟 preview 後 1280×720。重啟前曾因前次 preview 已停止而遇 connection refused，重新啟動後正常；不是產品 runtime error。

- 玩家：[approach](evidence/v0.2-eat/player-approach.txt) → [Eating](evidence/v0.2-eat/player-eating.txt) → [return](evidence/v0.2-eat/player-return.txt)；最終 [Eating](evidence/v0.2-eat/final-player-eating.txt) → [return](evidence/v0.2-eat/final-player-return.txt)。
- 自主：[Eating / Autonomous](evidence/v0.2-eat/autonomous-eating.txt) → [Idle / None](evidence/v0.2-eat/autonomous-return.txt)。
- 中斷：[自主 Eat](evidence/v0.2-eat/before-window-interrupt.txt) → [Finishing meal / Player Command](evidence/v0.2-eat/window-exit.txt) → [Observe](evidence/v0.2-eat/interrupt-observe.txt)。
- 回歸：[Sleep](evidence/v0.2-eat/sleep.txt) → [return](evidence/v0.2-eat/sleep-return.txt)、[Read](evidence/v0.2-eat/read.txt) → [return](evidence/v0.2-eat/read-return.txt)、[Observe](evidence/v0.2-eat/observe.txt) → [return](evidence/v0.2-eat/observe-return.txt)。
- 畫面：[房間](evidence/v0.2-eat/player-eating.png)、[側面](evidence/v0.2-eat/eat-side.png)、[前側](evidence/v0.2-eat/eat-three-quarter.png)、[最終相機操作取樣](evidence/v0.2-eat/final-eating.png)。離散截圖不等於完整動畫錄影或 PO Accepted。

## PO review / Chrome pending

SC-P01、SC-P02、SC-P03、SC-P04：**Accepted — Product Owner 整體人工複驗，2026-09-19**。以下步驟供回歸與尚待完成的 Chrome 補驗。

1. 正常 Chrome 開啟 production URL，關閉 Debug，點右前方餐碗。確認聞、三次入口、停頓、收姿能直覺讀成吃東西。
2. 環繞前方／側面／3/4、縮放／重設並調整視窗大小；確認手碗、食物、口鼻及尾巴沒有明顯穿模，餐區與書架區清楚分開。
3. 等待 Debug 顯示 Autonomous / Eating，再分別點 Window、Bed、Bookshelf。確認先放下餐具回站姿再走，不持食物上床或去窗前。Player Eat 期間其他命令被忽略屬預期規則。
4. Approach 與 Eating 時各切到其他 Chrome 分頁至少 10 秒，返回確認沒有瞬移、跳過進食或多消耗 cooldown；再完成正常流程。
5. 獨立 Chrome performance 仍 Pending；依既有 production 效能程序記錄瀏覽器、硬體、viewport、時間與數據。本輪未量測 FPS。V0.1 的 60.40 秒／1.19 FPS 只保留為受限 In-app 歷史，不作產品結論。

## Known Limitations / gate

- 使用既有單段手臂，沒有手指、IK、嘴部骨架；咀嚼是克制頭部動作，食物以局部縮放表示入口。
- 手持小碗是視覺演出，隨 Settle 淡入、Finish 淡出；未製作從桌上真正抓取／放回器皿的手部接觸動畫。桌面食物不耗盡；沒有庫存、需求或數值恢復。
- 固定站位、房間專用安全區及床腳轉角，不支援任意家具重排或通用尋路；測試只涵蓋已取樣路線與幾何，不證明全場景所有自碰撞不可能發生。
- PO 已接受本輪產品體驗及兩項 pose / prop 修正；獨立 Chrome background-tab、完整 resize 與 performance 仍 Pending。
- Build chunk warning 與歷史 Blender / GLB preview 保留，正式角色仍是 procedural fox。

目前無新的功能 blocker；**Slice C / PO Manual Acceptance = Accepted**。上述 Known Limitations 不阻擋 Slice C；明列的 Chrome 技術補驗保持 Pending，未進行 Overall Closeout。

## Changed Files / architecture observations

Runtime：`src/Character.ts`、`src/createFoxVisual.ts`、`src/scene.ts`、`src/main.ts`、`src/DebugPanel.ts`；新增 `src/eat.ts`、`src/EatInteraction.ts`。
Tests：新增 `tests/eat.test.mjs`。
文件：本文件、`V0_2_WEB_SPEC.md` 狀態、`ARCHITECTURE.md` observation，及 `evidence/v0.2-eat/`。

沿用 movement/facing、enterIdle、afterExit、priority、chooser、debug 慣例；Eat phase/timing/props/overlay/safe exit 保持專用。`afterExit` 仍只有一個退出後目的地，沒有 queue／callbacks／註冊表。多個 click binder 仍有真實重複，保留 review 中可選 helper 建議，本輪不抽象。Chooser 每個 eligible action 佔一格即 weight 1；不新增未被讀取的 `EAT.weight`，也未順便重構既有 Sleep/Read weight 欄位。
