# Fox Life Web — V0.2 Basic Life Spec

> 狀態：Approved — Product Owner Review Completed  
> 日期：2026-09-13  
> Slice A — Sleep：**Accepted（PO Manual Acceptance，2026-09-15）**；checkpoint `fb9ad1f`，保留 [驗收紀錄](V0_2_SLEEP_ACCEPTANCE.md)。
>
> Slice B — Read：**Accepted（PO Manual Acceptance；2026-09-17 closeout 確認）**；見 [驗收與 checkpoint 紀錄](V0_2_READ_ACCEPTANCE.md)。無新的功能 blocker；獨立 Chrome background / 完整 resize / performance 補驗保持 Pending，不因 PO 體驗接受而誤標通過。
>
> Slice C — Eat：**Accepted（PO Manual Acceptance，2026-09-19）**；PO 已解除 bowl/body clipping 與 hand-to-mouth readability blocker，見 [Eat 驗收與 checkpoint 紀錄](V0_2_EAT_ACCEPTANCE.md)。44/44 tests / typecheck / build 通過；Known Limitations 不阻擋 Slice C。獨立 Chrome background-tab / 完整 resize / performance 保持 Pending。規格內容與 Scope 不變，未進行 V0.2 Overall Closeout。
>
> 實作順序固定為 **Sleep → Read → Eat**；每個 Slice 完成並由 Product Owner 驗收後，才能進入下一個 Slice。

## 1. 依據、現況與決策邊界

本規格已核對：

- [PRODUCT.md](PRODUCT.md)：核心幻想、Autonomous Life、Player-directed Actions、Furniture as Gameplay，以及 V0.2 Basic Life 的 Sleep／Read／Eat 範圍。
- [V0.1 Web Spec](V0_1_WEB_SPEC.md)：玩家指令優先權、角色轉向／移動、Camera、Debug、背景時間與驗收原則。
- [V0.1 Acceptance](V0_1_ACCEPTANCE.md)、[V0.1 Turn Polish](V0_1_TURN_POLISH.md) 與 [V0.1 Closeout](V0_1_CLOSEOUT.md)：程序狐狸的 Idle／Walk／Turn／Window Observe 動作體驗已獲 Product Owner 接受，並保留程序腳步無 IK、無通用尋路等已知限制。
- [Project Handoff](../Fox_Life_Web_Project_Handoff.md)：Vite + TypeScript + Three.js 技術主線、最小狀態、玩家介入、工程流程與「不提前建大型 Framework」原則。
- [README](../README.md)、[Technical Spike](TECHNICAL_SPIKE.md)、現行 `src/` 與 `tests/`：現有執行、測試、建置、production preview、背景時間與模組邊界。

架構紀錄與最小演進方向見同次獲 Product Owner 核准的 [ARCHITECTURE.md](ARCHITECTURE.md)；現況仍以 Handoff 與實際程式核對。

V0.1 的主要產品體驗已獲 Product Owner 接受，因此可開始 V0.2 規劃。V0.1 Closeout 中尚未完整補驗的獨立 Chrome background／performance 記錄仍保留為技術證據缺口；本規格不將它們改寫為已通過，也不將它們擴張為 V0.2 新功能。

## 2. V0.2 產品目標

讓狐狸從只有 Idle／Walk／Observe，開始具有三種可辨識的基礎日常生活：

- Sleep
- Read
- Eat

成功條件：

> **玩家不看 Debug，仍能清楚理解狐狸正在進行不同生活行為，並開始感覺「牙真的住在這裡生活」。**

V0.2 不以「新增三個狀態名稱」當作成功。每個行為都必須有可辨識的空間目標、接近過程、特有姿勢與結束過渡，並能回到自主生活。

## 3. 交付策略與 Review Gates

| 順序 | Vertical Slice | 此 Slice 要單獨證明的問題 | 開始下一 Slice 的條件 |
| --- | --- | --- | --- |
| A | Sleep | 程序狐狸能否自然接近床、上床睡覺、醒來並回到日常 | Sleep 的 Technical Acceptance 完成，且 PO 明確記錄 Accepted |
| B | Read | 第二種家具生活行為能否不靠文字 UI，和 Sleep／Observe 清楚區分 | Read 的 Technical Acceptance 完成，且 PO 明確記錄 Accepted |
| C | Eat | 第三種日常行為能否形成有節奏、不像單純播狀態的 Basic Life | Eat 的 Technical Acceptance 與 PO Acceptance 完成，再進行 V0.2 Overall Review |

規則：

1. 不並行開發三個 Slice，不在 Slice A 預先建好 Read／Eat 的系統。
2. 每個 Slice 的實作都是獨立任務，開始前要再次 inspect repository、列出最小變更與風險。
3. 每個 Slice 必須完成 typecheck、tests、build、production smoke，並交 PO 在 Debug 隱藏下手動驗收。
4. 只有 PO 明確回覆「Accepted／接受」才開啟下一 Slice；技術測試不代替產品驗收。
5. Slice 通過後先建立可追溯 checkpoint，不把下一 Slice 的變更混入同一次 review。

## 4. V0.1 必須保留的基線

V0.2 必須保留：

- 程序狐狸是 V0.2 Character Visual Baseline；沒有明確 regression 不重開 Blender／GLB／Rig／正式動畫工作。
- 已接受的 Idle／Walk／Turn／Window Observe 輪廓、起停、窗前收勢與四秒 Observe。
- 玩家不直接 WASD／搖桿／點地控制角色；玩家是透過家具或環境選擇行為。
- OrbitControls、Camera 限制、重設鏡頭、responsive canvas 與以房間中心為 target 的觀察方式。
- 最近可見表面 raycast、點擊／拖曳區分、被遮擋物不可隔空點中目標的原則。
- Debug 顯示真實 State／Action／Target／Source，隱藏 Debug 不改變模擬。
- `FrameClock` 的前景時間、背景暫停、回前景 delta cap；不把背景時間計入行為 duration／cooldown。
- 純靜態 build、WebGL 2 前提、Vite + TypeScript + Three.js、現有 HMR 清理與資源釋放。

V0.2 可以為新家具重新檢查房間配置與可走範圍，但不得粗暴重寫已接受的 V0.1 locomotion 來配合新家具。

## 5. 共用行為語意

### 5.1 最小 State 與 Phase

V0.2 完成後的最小產品 State：

```text
Idle
Walk
Observe
Sleep
Read
Eat
```

`Bed Approach`、`Settle`、`Wake`、`Open / Put Away Book`、`Finish Eating` 是特定 Action 的 phase，不要每個都變成全域 `CharacterState`。

- 移動與進入姿勢完成前，State 維持 `Walk`，Current Action 可顯示 `Walk to bed`／`Settle into bed` 等真實 phase。
- 特有姿勢已建立才開始 `Sleep`／`Read`／`Eat` State 與主 duration。
- 結束過渡可保留在當前生活 State，Current Action 改為 `Waking up`／`Putting book away`／`Finishing meal`；過渡完成後再進 `Idle`。
- Phase 是局部資料與演出步驟，不是 Generic Action Graph。

### 5.2 單一進行中意圖

任何時候只有一個進行中行為意圖。

- `Control Source` 保留 `Autonomous` 與 `Player Command`。
- 玩家指令優先於任何 Autonomous Intent，不受 weight／cooldown 影響，不會被拒絕或被新自主選擇覆寫。
- 玩家點擊後 **0.5 秒內**要出現可見反應：轉頭、收姿、轉身、醒來或開始移動任一即可；不可瞬移。
- 玩家指令可立即取代 Autonomous Idle／Walk 與尚未錨定姿勢的 Autonomous Intent。
- 若角色已在 Autonomous Sleep／Read／Eat 的錨定姿勢，不可直接彈回站姿；先執行該行為的最短安全退出 phase，再走向玩家目標。這是一個取代中的玩家意圖，不是可排列多個指令的 queue。
- 同一玩家指令進行中，重複點擊相同目標不排隊、不重啟、不延長 duration。
- 一個 `Player Command` 已進行時，點其他家具或窗戶不覆寫、不排隊；完成後才可接受新指令。跨目標指令仲裁屬 V0.3。
- 若玩家點擊和當前 Autonomous Action 相同的目標，視為重複意圖；不重開 duration，不為了改變 Source 而製造跳姿。

### 5.3 專用家具點擊

V0.2 只新增三個明確互動：Bed、Bookshelf／Reading Area、Food／Dining Area。

- 每個 Slice 可先以該家具的專用 parts 清單、專用 callback 與專用 Character request 實作。
- 最近可見 raycast 表面必須屬於目標 parts；被牆、狐狸或其他家具遮擋時不可隔空觸發。
- 點空白、其他物件、Debug，或在家具上進行 Camera drag，都不可發出生活指令。
- 家具命中計數可作 Debug 證據，但命中不等於 Action 已完成。
- V0.2 不新增家具選單、Action UI、Inventory 或通用家具編輯器。

### 5.4 自主行為的最小規則

自主選擇只在 Idle 停留結束後發生；不在 Walk 或生活 Action 中間重抽。

1. 開啟頁面後，至少先完成一次 Idle → Walk → Idle，才讓生活 Action 進入自主候選。
2. `Walk` 權重初始值為 `3`；每個已完成 Slice 且 cooldown 結束的生活 Action 權重為 `1`。
3. 在至少一個生活 Action 可用時，若已連續選中 `Walk` 三次，下一次從可用生活 Action 中依權重選擇。這只是避免長時間看不到新行為，不是固定循環。
4. 一個生活 Action 完成後重設連續 Walk 計數，開始該 Action 的 cooldown，並回到 Idle；不直接從 Sleep 串接 Read 或 Eat。
5. 玩家指令不受 cooldown 影響；玩家行為完成後仍重設同一 Action 的 autonomous cooldown，避免立即自主重複。
6. Weight、cooldown、duration 是集中的可調整常數，可注入可預測 random 侜測試；不建立可視化排程器或設定 UI。
7. 所有選擇、duration 與 cooldown 只使用前景模擬時間。

V0.2 不新增 Autonomous Window Observe。現行 Observe 沒有既有自主規則，為避免擴大 Slice，Window Observe 在 V0.2 繼續是 Player Command；若 PO 後續要求自主看窗，先修訂規格。

## 6. Slice A — Sleep

**狀態：Accepted — 2026-09-15。** PO 已接受 Sleep pose、Settle、Wake、Window interrupt 與整體可愛度。Scope 與 Acceptance Criteria 不變；獨立 Chrome 技術補驗的既有證據邊界詳見驗收紀錄。下一步準備建立 Sleep checkpoint。

### 6.1 Slice Goal

證明狐狸能從房內日常自然走到床邊，在程序模型限制下建立清楚的睡眠輪廓，醒來後回到 Autonomous Life。

```text
Autonomous Life
→ Sleep Intent / Player Bed Command
→ Walk to Bed
→ Bed Approach / Settle
→ Sleep
→ Wake
→ Return to Autonomous Idle
```

Slice A 只完成 Sleep，不預建 Read／Eat 的 prop、state 或 UI。

### 6.2 Bed Target、Approach 與 Facing

- 以現有房間左側床作為唯一 `Bed` interaction target。可見床架、床墊與枕頭可納入同一 Bed parts 清單；最近可見表面必須真的屬於 Bed。
- 優先採床尾接近：初始 approach root 為世界約 `(-3.40, 0, 1.85)`，面向床頭，heading 約 `Math.PI`（世界 `-Z`）。
- 睡眠姿勢的視覺 anchor 在床墊中央，頭部靠近枕頭，身體沿床的長軸放置。Behavior root 保留在床尾安全站位；程序狐狸的 visual child 在 settle 內受限地移入床上，醒來後回到 root 中性姿勢。
- 上述數值是實作起始目標。為配合實際狐狸 envelope、床尾與 Camera 構圖，approach／anchor 可在單軸 `0.25` 世界單位內調整；最終數值必須在 Slice Acceptance 記錄，不可用未記錄的大幅移位解決碰撞。

### 6.3 Sleep Pose 與 Timing

- `Settle into bed`：初始 **0.65 秒**，使用 easing 將 visual child 從站姿過渡到床墊；不可單幀平移、翻轉或縮放。
- `Sleep`：初始 **8 秒**，從睡眠姿勢完成後起算，不包含 Walk／Settle／Wake。
- 姿勢必須明顯離開 Idle：身體躺在床墊、眼睛長時閉合、較慢的呼吸，耳與尾巴大幅降低活動；可有一次克制的耳或腳抽動，但不做內容隨機系統。
- 不依賴 `Zzz`、文字提示、視覺特效或音效才能讀懂 Sleep；本 Slice 不建立 Audio System。
- `Wake`：初始 **0.75 秒**，先小幅伸展／抬頭，再將 visual child 回復為床尾站姿。完成後清除 Bed target 與 intent，進入 Idle，下一次自主 Walk 必須能離開床邊。
- 時間是初始可調值；若 PO Review 要求調整，在 Slice A 內收旂並記錄最終值，不留給 Read Slice 代為修補。

### 6.4 Autonomous Sleep

- Slice A 完成時，自主候選為 `Walk: 3`、`Sleep: 1`。
- Sleep 完成後的 autonomous cooldown 初始為 **45 秒前景時間**。
- Autonomous Sleep 和 Player Bed Command 使用同一個 approach、pose、duration 與 wake 產品流程；差別只在 intent 來源與優先權。
- Autonomous Sleep 中接收不同玩家指令時，應在 0.5 秒內開始可見 Wake／退出，完成安全站姿後改走玩家目標。

### 6.5 Sleep Camera、Interaction 與 Debug

- Camera 在 approach、Sleep 與 Wake 中繼續可環繞、縮放、重設；不自動切鏡、不鎖鏡頭、不強制跟隨狐狸。
- Camera drag 經過床面不發指令。睡眠中重複點 Bed 不醒來、不重啟、不延長。
- 床上狐狸必須在預設與主要 Camera 角度可辨識；床架、左牆或尾巴不可讓整個睡姿長時間不可見。

Debug 最少要真實呈現：

| Phase | Current State | Current Action | Current Target | Control Source |
| --- | --- | --- | --- | --- |
| 走向床 | Walk | Walk to bed | Bed + approach coordinates | Autonomous 或 Player Command |
| 上床收勢 | Walk | Settle into bed | Bed | Autonomous 或 Player Command |
| 睡眠 | Sleep | Sleeping | Bed | Autonomous 或 Player Command |
| 醒來 | Sleep | Waking up | Bed | Autonomous 或 Player Command |
| 完成 | Idle | Autonomous idle | None | Autonomous |

Debug 可加入當前 Action elapsed／remaining、cooldown 或各 furniture hit count 作驗證資料，但不得成為理解睡覺的必要 UI。

### 6.6 Sleep 空間與程序模型限制

- Behavior root 不進入床架；只有 visual child 依明確 Sleep pose 與床墊接觸。
- 床墊表面是有意接觸，不可把所有 mattress intersection 都當碰撞錯誤；但頭、腳、身體或尾巴不可明顯穿過床板、床頭或牆。
- 上床、睡眠、醒來全程 transform 必須 finite，腳不卡在床尾，狐狸不悬浮於床面上。
- Sleep／Wake 完成後，visual root 的位置、旋轉、縮放要回到方便 Idle／Walk 重用的中性值，不累積偏移。
- 允許程序 hierarchy／transform／easing 的已知局限；若只剩局部腳掌微滑或接點細縫，記錄 limitation，不為 Sleep 重開 Rig 管線。

## 7. Slice B — Read

### 7.1 Entry Gate 與 Goal

Slice B 只在 Slice A 的 Technical Acceptance 與 PO Manual Acceptance 已明確通過後開始。

目標是讓玩家從狐狸的姿勢、道具與動作節奏理解「正在閱讀」，不依賴書名、文字內容、Inventory 或閱讀 UI。

```text
Autonomous Life
→ Read Intent / Player Bookshelf Command
→ Walk to Reading Position
→ Settle / Open Book
→ Read
→ Put Book Away
→ Return to Autonomous Idle
```

### 7.2 Reading Target、Position 與 Facing

- 右側現有家具區可調整為簡化 Bookshelf／Reading Area；必須有清楚書本或書架輪廓，不只是一塊無法辨識用途的柜子。
- 點可見書本與指定書架 parts 都發出同一 Read command；其他旁邊桌面或裝飾不默認視為 Bookshelf。
- 初始 reading root 站位約為 `(2.35, 0, -0.30)`，面向右側書架，heading 約 `Math.PI / 2`（世界 `+X`）。
- 可在該站位放一個無互動的薄墊／閱讀區視覺提示；不建立家具擺放功能。數值可因狐狸 envelope 在單軸 `0.25` 世界單位內調整，最終值記錄於 Slice B Acceptance。

### 7.3 Read Pose、Prop 與 Timing

- `Settle / Open Book`：初始 **0.35 秒**，狐狸穩定站位或坐低，手臂接住一本展開的程序書。
- `Read`：初始 **7 秒**，從書已打開、閱讀姿勢建立後起算。
- 可辨識演出至少包含：雙手／前腳持書、頭與視線向下跟隨書頁、一次克制的翻頁或換邊動作、期間有短暫靜止；不可只是 Idle 時手上多一個方塊。
- 書是 Read 演出專用的簡單 prop，只在適當 phase 顯示；不代表建立 Inventory、書籍內容或可收集物系統。
- `Put Book Away`：初始 **0.35 秒**，收回手臂與視線、隱藏／归位演出 prop，回到站姿後進 Idle。
- Read 完成後不保留書在手上，不累積手臂、頭或 visual root transform。

### 7.4 Autonomous Read、Debug 與空間

- Slice B 的自主候選為 `Walk: 3`、`Sleep: 1`、`Read: 1`，各自只在 cooldown 結束時加入候選。
- Read autonomous cooldown 初始為 **30 秒前景時間**。
- Autonomous 與 Player Read 使用同一動作流程；玩家 Bookshelf Command 忽略 cooldown。
- Debug 依序顯示 `Walk / Walk to reading area / Bookshelf`、`Walk / Opening book / Reading Area`、`Read / Reading / Reading Area`、`Read / Putting book away / Reading Area`，最後清為 `Idle / Autonomous idle / None`。
- 路徑、站位與角色 envelope 不得穿過右牆、書架、床或新增閱讀道具。持書後的包圍空間也要納入檢查。
- Camera 全程繼續可操作；主要角度下書、狐狸頭部與手臂的閱讀關係必須可讀。

## 8. Slice C — Eat

### 8.1 Entry Gate 與 Goal

Slice C 只在 Slice B 的 Technical Acceptance 與 PO Manual Acceptance 已明確通過後開始。

目標是讓玩家從接近食物、低頭取食、咀嚼／停頓與離開的節奏理解「正在吃東西」，不依賴 Hunger 數值或食物 UI。

```text
Autonomous Life
→ Eat Intent / Player Food Command
→ Walk to Dining Position
→ Settle / Smell Food
→ Eat
→ Finish Meal
→ Return to Autonomous Idle
```

### 8.2 Food Target、Position 與 Facing

- 新增或明確整理一個與 Reading Area 可視覺區分的小型 Food／Dining Area。初始位置以房間右前側為方向，不放在中央主通道。
- 初始 dining root 站位約為 `(1.85, 0, 1.45)`，食物表面在其右側，角色 heading 約 `Math.PI / 2`（世界 `+X`）。餐區實際尺寸與站位可在單軸 `0.25` 世界單位內調整，最終數值記錄於 Slice C Acceptance。
- 點指定食物容器／碗／盤與餐區互動表面發出同一 Eat command；點書、床或無關桌面不可誤觸 Eat。
- 食物與容器可用 primitive geometry 與專用材質建立，不建立食物品項、份量、補貨、Inventory 或 Economy。

### 8.3 Eat Pose 與 Timing

- `Settle / Smell Food`：初始 **0.40 秒**，停穩後頭部向食物靠近，保留一個很短的聞食物停頓，讓行為有起點而不是立即循環點頭。
- `Eat`：初始 **6 秒**，至少包含三次有間隔的取食／低頭、回到稍高位置咀嚼與短暫停頓。
- 動作必須影響頭部、上身與前腳／手臂的關係，不可只快速反複旋轉頭部或把 Idle 改名為 Eat。
- `Finish Meal`：初始 **0.35 秒**，最後一次抬頭／吞嚥，前腳與身體回到中性姿勢，進 Idle。
- 食物數量不必真正減少；若有一個低成本視覺變化，只能作此次演出的局部效果，完成後回復，不成為資源系統。

### 8.4 Autonomous Eat、Debug 與空間

- Slice C 的自主候選為 `Walk: 3`、`Sleep: 1`、`Read: 1`、`Eat: 1`，各自只在 cooldown 結束時加入候選。
- Eat autonomous cooldown 初始為 **30 秒前景時間**。Eat 沒有 Hunger、Needs 或早午晚用餐條件。
- Autonomous 與 Player Eat 使用同一流程；玩家 Food Command 忽略 cooldown。
- Debug 依序顯示 `Walk / Walk to dining area / Food`、`Walk / Smelling food / Dining Area`、`Eat / Eating / Dining Area`、`Eat / Finishing meal / Dining Area`，最後清為 `Idle / Autonomous idle / None`。
- 狐狸身體、頭、手臂與尾巴不可穿餐桌／食物表面、右牆或 Reading Area。取食時靠近食物是有意演出，但頭不可穿過桌面。
- Camera 全程繼續可操作，預設與主要環繞角度必須看得出狐狸與食物的空間關係。

## 9. Architecture Guardrail

### 9.1 Slice A：不預建框架

Sleep 先以現有 Window Observe 與 Character 結構延伸：

- 專用 Bed parts、approach／heading、Sleep timing、Sleep pose 與 `requestSleep` 等最小資料／方法即可。
- 不為未存在的 Read／Eat 建 registry、factory、節點圖或多層 interface。
- Slice A 驗收報告必須列出 Sleep 與 Window Observe 真正重複的程式責任，不因「未來可能」就抽象。

### 9.2 Slice B：第二次評估

Read 加入後，才檢查 Window、Bed、Bookshelf／Reading Area 中是否有兩個以上已實作案例穩定重複以下責任：

- 家具 id／raycast parts／approach position／heading 的資料表達。
- 單一玩家指令的取代、去重、清理。
- Walk 到明確站位、對正、settle 後才開始 duration。
- autonomous weight／cooldown 候選篩選。

只有實際 diff 顯示至少兩個案例造成相同錯誤風險或重複邏輯，才可提出最小 abstraction。可接受的上限例如：

- 一個有限 union（如 `Window | Bed | Read | Food`）。
- 一個只含 `id / parts / approach / heading` 的小型 target record。
- 一個共用「最近表面 + drag 排除」的 click binder。
- 一個局部 weighted-choice／cooldown helper。

每個 Action 的姿勢、duration、phase 與退出動作仍可保持明確專用。不要把 Sleep／Read／Eat 強塞成一張通用配置表而丟失可辨識演出。

### 9.3 禁止預建

V0.2 不建立：

- ECS
- Generic Action Graph／Behavior Tree 平台
- Plugin System
- DI Framework／DI Container
- 全域 Event Bus
- 複雜 Furniture Framework／Furniture Editor
- Command Queue／多目標仲裁系統
- Needs／Mood／Personality 架構
- Save／Offline Progress 架構

任何實作任務若提議 abstraction，必須在 plan 先回答：

1. 是哪兩個以上已存在案例？
2. 哪一段責任已實際重複？
3. 不抽象會造成什麼具體錯誤或維護成本？
4. 為什麼提案是能解決這個重複的最小形式？

## 10. Technical Constraints

- 沿用 Vite + TypeScript + Three.js、ES Modules、npm、HTML／CSS；不改用 React，不更換引擎。
- 不因 V0.2 升級套件；保留 lockfile 與當前 Three.js／Vite／TypeScript 基線，除非獨立任務以實際 blocker 核准變更。
- 新家具、書、食物以 primitive geometry／自建材質為主；不下載授權不明資產。
- 角色行為核心繼續命名為 Character／State／Movement，狐狸專屬姿勢留在 visual 邊界；不預建多物種。
- 保留前景 delta cap、visibility pause、resize、renderer 錯誤提示、HMR cleanup 與 Three.js 資源 dispose。
- 每個新 prop／geometry／material／event listener 都必須可在 HMR／dispose 路徑釋放，不留下重複 listener 或隱藏物件。
- 保留 Windows Desktop、1920×1080、滑鼠操作與 60 FPS target。最低硬體仍未定，不得把未測結果寫成保證。
- V0.1 已有 shared chunk >500 kB warning 屬已知基線。V0.2 每 Slice 要記錄 build 產物大小與 warning；沒有載入／執行證據時不自行建拆包框架。

## 11. Scope Protection / Explicit Non-goals

V0.2 不做：

- Needs、Hunger、Energy
- Mood、Preferences、Personality
- Save／Load、Offline Progress、Game Clock
- 多角色、Relationship、多 Species、選角
- Inventory、書籍內容、食物數量／補貨
- Economy、Shop、Currency、Achievement、Quest
- Furniture placement／編輯／解鎖
- Cook、Clean、Play／其他生活 Action
- 正式動畫資產、Blender／GLB／Rig／角色資產管線
- Backend、Login、Database、Cloud Save／Multiplayer
- 音效或複雜 Audio System（可另案評估，不是本規格驗收要求）
- 通用尋路、navmesh、物理引擎或全房間通用碰撞系統
- 手機／觸控支援、PWA、Steam／桌面包裝或發布

新家具導致現有小弧線路徑不安全時，優先調整家具、approach anchor 或自主範圍。只有這些手段無法滿足已核准的 Slice，才回報 blocker；不默默擴建尋路系統。

## 12. Acceptance 共通規則

- Technical Acceptance 必須有可追溯命令輸出、測試範圍、production URL／環境、smoke 操作與已知限制。
- Product Owner Manual Acceptance 必須在 Debug 隱藏下實際觀看連續流程；測試、戴圖與 Agent 自評不代替 PO。
- In-app Browser 可作開發 smoke，但若更新驗收記錄為 Desktop Chrome／performance 通過，必須使用獨立 Chrome 並保存環境資料。
- 每個 Slice 的測試都要保留所有 V0.1 回歸，並新增該 Slice 的指令、自主選擇、state transition、timing、去重、背景時間與空間安全驗證。
- 每個 Slice 都要在至少三個不同房內起點測試玩家指令的完整流程。
- 如果 production smoke 未實際看到 Autonomous Action 與 Player Command 各完成一次，不得將對應 smoke 標為通過。
- 每個 Slice 完成後回報 Changed Files、Diff Summary、Typecheck／Test／Build／Smoke Result、產物大小、Known Limitations 與是否建議交 PO Review；不自動 push／merge／開始下一 Slice。

## 13. Slice A — Sleep Acceptance Criteria

### 13.1 Technical Acceptance

| ID | 驗收操作 | 通過條件 |
| --- | --- | --- |
| SA-T01 | 執行 `npm run typecheck`、`npm test`、`npm run build` | 全部 exit 0；保留 V0.1 測試且新增 Sleep 測試；build warning 如實記錄 |
| SA-T02 | 分別在 Autonomous Idle 與 Walk 點 Bed | 0.5 秒內有可見反應，舊自主 target 被取代，從三個起點都完成 Walk → Settle → Sleep → Wake → Idle，無瞬移 |
| SA-T03 | 以可預測 random 與 production 觀察 Autonomous Sleep | 初始自主 Walk 基線後才可選 Sleep；weight、45 秒 cooldown、三次 Walk 上限與回 Idle 規則符合規格；至少實際完成一次 |
| SA-T04 | 檢查 state／phase／target／source／timing | Debug 與 Character 真實流程一致；8 秒 Sleep 不含 settle／wake；完成後 target 清除、source 回 Autonomous |
| SA-T05 | Approach、Sleep、Wake 期間反覆點 Bed，並在玩家 Sleep command 中點 Window | 不排隊、不重啟、不延長、不覆寫；完成後新指令可再接受 |
| SA-T06 | Autonomous Sleep 中點 Window | 0.5 秒內開始 Wake／退出，無跳姿；回站姿後完成玩家 Window Observe，不建立多指令 queue |
| SA-T07 | 對多幀率、全 approach／sleep／wake 取樣 transform 與空間 | Transform finite；無單幀跳姿、穿床板／床頭／牆、漂浮、腳卡床尾或累積 visual offset；醒後可正常走開 |
| SA-T08 | 點床、空白、其他物件、被遮床與拖曳床面 | 只有未遮擋的有效 Bed click 發出 command，Camera drag 不誤觸 |
| SA-T09 | Sleep 全程環繞、縮放、重設與 resize | Camera 繼續可用，不改變 Action，主要角度睡姿可辨識，無穿牆／地下 |
| SA-T10 | 回歸 V0.1 Window Observe | 自主 Idle／Walk／Turn、Window raycast、指令去重、窗前收勢、4 秒 Observe、回自主、Debug 與 background-time 測試仍通過 |
| SA-T11 | Production preview smoke | 實際完成一次 Autonomous Sleep、一次 Player Bed Command、一次 Window Observe，操作 Camera、隱藏 Debug，無主要 Console Error；記錄 browser／viewport／URL 與限制 |
| SA-T12 | Approach 與 Sleep 時切到背景再返回 | 不因背景時間瞬移、跳過 Sleep／Wake 或消耗 cooldown；回前景可完成流程 |

### 13.2 Product Owner Manual Acceptance

| ID | PO 核心問題 | 結果 |
| --- | --- | --- |
| SA-P01 | 隱藏 Debug 時，是否一看就知道狐狸是睡覺，而不是倒下、卡在床上或播慢版 Idle？ | Accepted — PO，2026-09-15 |
| SA-P02 | 走向床、上床、睡眠、醒來與走開是否連續、可愛、節奏適合？ | Accepted — PO，2026-09-15 |
| SA-P03 | 不同 Camera 角度是否仍能舒服觀看睡姿，沒有明顯穿模／漂浮破壞感？ | Accepted — PO，2026-09-15 |
| SA-P04 | Autonomous Sleep 出現時，是否讓狐狸更像在這間房子生活，而不是多一段測試動畫？ | Accepted — PO，2026-09-15 |

## 14. Slice B — Read Acceptance Criteria

### 14.1 Technical Acceptance

| ID | 驗收操作 | 通過條件 |
| --- | --- | --- |
| SB-T01 | 執行 `npm run typecheck`、`npm test`、`npm run build` | 全部 exit 0；V0.1 與 Sleep 測試保留，新增 Read 測試；warning 如實記錄 |
| SB-T02 | 分別在 Autonomous Idle 與 Walk 點 Bookshelf | 0.5 秒內可見反應；三個起點皆完成 Walk → Open Book → Read → Put Away → Idle，無瞬移 |
| SB-T03 | 可預測 random 與 production 觀察 Autonomous Read | `Walk:3 / Sleep:1 / Read:1`、30 秒 Read cooldown、三次 Walk 上限與回 Idle 規則符合規格；至少完成一次 |
| SB-T04 | 檢查 Read state／phase／target／source／7 秒 timing | Debug 與真實資料一致；duration 不含開／收書；完成後 target、prop 與 pose 清理 |
| SB-T05 | Approach、Read、Put Away 期間重複點 Bookshelf，並在 Player Read 中點 Bed／Window | 不排隊、不重啟、不延長、不覆寫；完成後新指令可接受 |
| SB-T06 | Autonomous Read 中點 Bed 或 Window | 0.5 秒內開始收書／退出，回站姿後執行玩家指令，無跳姿或多指令 queue |
| SB-T07 | 檢查持書 pose、翻頁、多幀率 transform 與空間 | 書與手／視線關係穩定；transform finite；無穿書架／牆／床、prop 殘留、腳沉地或 visual offset 累積 |
| SB-T08 | 點書／指定書架、無關桌面、遮擋物、其他家具與拖曳 | 只有未遮擋的有效 Reading target 命中，不誤觸其他 Action |
| SB-T09 | Read 全程環繞、縮放、重設與 resize | Camera 繼續可用，主要角度可辨識持書、低頭與翻頁，Action 不受影響 |
| SB-T10 | 回歸 Window Observe 與 Sleep | V0.1 全流程與 SA-T02～T12 仍通過；Sleep 不出現書 prop，Read 不殘留 Sleep pose |
| SB-T11 | Production preview smoke | 實際完成 Autonomous Read、Player Read、Sleep 與 Window Observe，操作 Camera、隱藏 Debug，無主要 Console Error，保存環境與操作記錄 |
| SB-T12 | Approach 與 Read 時切背景再返回 | 不瞬移、不跳過 Read／Put Away、不消耗 cooldown，回前景可完成 |

### 14.2 Product Owner Manual Acceptance

| ID | PO 核心問題 | 結果 |
| --- | --- | --- |
| SB-P01 | 隱藏 Debug 時，是否一看就知道狐狸在閱讀，而不是抱著方塊發呆？ | Accepted — PO 整體人工驗收，2026-09-17 closeout 確認 |
| SB-P02 | 取書／開書、閱讀停頓、翻頁、收書與回日常的節奏是否自然？ | Accepted — 同上 |
| SB-P03 | Camera 主要角度是否看得懂書、頭部與手的關係，並且不和 Sleep／Observe 混淆？ | Accepted — 同上；獨立 Chrome resize 技術補驗仍 Pending |
| SB-P04 | Autonomous Read 是否像狐狸自己選擇一段居家時間，而不是到點播另一個循環？ | Accepted — 同上 |

## 15. Slice C — Eat Acceptance Criteria

### 15.1 Technical Acceptance

| ID | 驗收操作 | 通過條件 |
| --- | --- | --- |
| SC-T01 | 執行 `npm run typecheck`、`npm test`、`npm run build` | 全部 exit 0；V0.1、Sleep、Read 測試保留，新增 Eat 測試；warning 如實記錄 |
| SC-T02 | 分別在 Autonomous Idle 與 Walk 點 Food／Dining Area | 0.5 秒內可見反應；三個起點皆完成 Walk → Smell → Eat → Finish → Idle，無瞬移 |
| SC-T03 | 可預測 random 與 production 觀察 Autonomous Eat | `Walk:3 / Sleep:1 / Read:1 / Eat:1`、30 秒 Eat cooldown、三次 Walk 上限與回 Idle 規則符合規格；至少完成一次 |
| SC-T04 | 檢查 Eat state／phase／target／source／6 秒 timing | Debug 真實一致；Smell／Finish 不計入 Eat duration；完成後 target、pose 與局部 prop 狀態回復 |
| SC-T05 | Approach、Eat、Finish 期間重複點 Food，並在 Player Eat 中點 Bed／Bookshelf／Window | 不排隊、不重啟、不延長、不覆寫；完成後新指令可接受 |
| SC-T06 | Autonomous Eat 中點其他有效目標 | 0.5 秒內開始 Finish／退出，回站姿後執行玩家指令，無跳姿或多指令 queue |
| SC-T07 | 檢查聞食物、三次取食／咀嚼、多幀率 transform 與空間 | 動作節奏可追溯；transform finite；無頭穿桌、手臂／尾穿家具、腳沉地或 visual offset 累積 |
| SC-T08 | 點 Food、Bookshelf、Bed、無關桌面、遮擋物與拖曳 | 只有未遮擋的有效 Dining target 命中 Eat，不誤觸其他 Action |
| SC-T09 | Eat 全程環繞、縮放、重設與 resize | Camera 繼續可用，主要角度可辨識食物與狐狸動作，Action 不受影響 |
| SC-T10 | 回歸 Window Observe、Sleep、Read | 全部既有流程、時間、指令去重、pose／prop 清理、Camera 與背景測試仍通過，各 Action 不殘留對方姿勢 |
| SC-T11 | Production preview smoke | 實際完成 Autonomous Eat、Player Eat，並回歸 Sleep、Read、Window Observe；操作 Camera、隱藏 Debug，無主要 Console Error，保存環境與操作記錄 |
| SC-T12 | Approach 與 Eat 時切背景再返回 | 不瞬移、不跳過 Eat／Finish、不消耗 cooldown，回前景可完成 |

### 15.2 Product Owner Manual Acceptance

| ID | PO 核心問題 | 結果 |
| --- | --- | --- |
| SC-P01 | 隱藏 Debug 時，是否一看就知道狐狸在吃東西，而不是對桌面重複點頭？ | 待 PO 填 Accepted／Needs Adjustment／Not Reviewed |
| SC-P02 | 聞、取食、咀嚼／停頓、收尾與回日常的節奏是否自然可愛？ | 待 PO 填 |
| SC-P03 | Camera 主要角度是否能看清狐狸與食物，餐區是否和 Reading Area 清楚區隔？ | 待 PO 填 |
| SC-P04 | Autonomous Eat 是否像日常生活，而不是因為新增 State 而播一段無原因動畫？ | 待 PO 填 |

## 16. V0.2 Overall Acceptance Criteria

### 16.1 Technical Acceptance

| ID | 驗收操作 | 通過條件 |
| --- | --- | --- |
| V02-T01 | 從清潔 install／checkout 執行 install、dev、typecheck、tests、build、preview | 所有命令成功；production 可在獨立 Chrome 執行；主要 Console Error 為零，warning 如實記錄 |
| V02-T02 | 長時間自主觀察與可預測模擬 | Idle／Walk／Sleep／Read／Eat 皆可出現；權重、cooldown、三次 Walk 上限生效；不是固定 Sleep → Read → Eat 循環；Window Observe 維持玩家觸發 |
| V02-T03 | 分別從 Idle／Walk／Autonomous anchored Action 點四個目標 | Bed／Bookshelf／Food／Window 玩家指令優先於自主意圖；需退出姿勢時先安全退出，完成後再執行新目標；無瞬移、無多指令 queue |
| V02-T04 | 快速重複點同一與不同家具 | 同一 Player Command 進行時不重啟、延長、覆寫或排隊；完成後各目標可再次觸發 |
| V02-T05 | 檢查全狀態、phase、Debug 與 cleanup | State／Action／Target／Source 真實一致；Idle／Walk／Observe／Sleep／Read／Eat 無不可達或殘留狀態；prop／pose／timer／cooldown 清理正確 |
| V02-T06 | 從活動區與各家具站位互相檢查路徑／角色 envelope | 現有房間配置中無穿牆、穿家具、卡死、沉地或靠瞬移到站位；有意姿勢接觸與錯誤碰撞分開驗證 |
| V02-T07 | 全流程 Camera／resize／interaction regression | Camera 可環繞、縮放、重設，不誤觸；主要角度能讀懂三個新 Action；Canvas 與 Debug 正確 resize |
| V02-T08 | 在 Walk／Observe／Sleep／Read／Eat 各自的移動或計時中切背景 | 所有位置、duration、phase 與 cooldown 都不消耗背景時間；回前景無大 delta 跳轉，可繼續完成 |
| V02-T09 | Production 完整 smoke | 隱藏 Debug 完成 Sleep／Read／Eat／Window 玩家流程，另實際捕捉三個 Autonomous Action，包含 Camera 操作、錯誤記錄與返回 Autonomous Life |
| V02-T10 | Production performance 取樣 | 在 1920×1080 目標條件、獨立 Chrome 前景暖機後至少 60 秒，期間完成 Sleep／Read／Eat／Window 中至少三種不同 Action 且操作 Camera；保存 FPS／frame-time／GPU／viewport 與操作記錄，未測或未接近 60 FPS 如實交 PO Review |
| V02-T11 | 架構與 diff review | 沒有禁止架構；任何新 abstraction 都列出至少兩個真實案例與具體重複；`main.ts` 不接手所有行為與姿勢邏輯 |
| V02-T12 | 重複 HMR／重載後操作所有家具 | 沒有重複 listener、重疊 prop、殘留 timer 或未釋放的專案資源；每次命中只產生一個指令 |

### 16.2 Product Owner Manual Acceptance

Product Owner 在 Debug 隱藏下進行至少 5 分鐘連續體驗，包含不操作觀察、四個玩家目標各至少一次、Camera 環繞／縮放，並回填：

| ID | PO 核心問題 | 結果 |
| --- | --- | --- |
| V02-P01 | Sleep、Read、Eat 是否只靠畫面就能彼此區分，也能與 Idle／Observe 區分？ | 待 PO 填 Accepted／Needs Adjustment／Not Reviewed |
| V02-P02 | 走向家具、轉向、收勢、特有姿勢、結束與回日常是否像連續生活，而不是到點後切換 clip？ | 待 PO 填 |
| V02-P03 | 自主行為的出現頻率、cooldown 與停留節奏是否有變化但不忙亂，沒有明顯固定輪播？ | 待 PO 填 |
| V02-P04 | 點 Bed／Bookshelf／Food／Window 時，是否能理解自己是在選擇狐狸接下來的生活行為，而不是直接操作狐狸？ | 待 PO 填 |
| V02-P05 | 新家具與行為是否讓房間更像住宅，並且在 Camera 主要角度下仍舒服、可讀、以狐狸為焦點？ | 待 PO 填 |
| V02-P06 | **狐狸現在是否開始讓人感覺真的在家裡生活，而不只是走路加播放不同狀態？** | 待 PO 填；這是 V0.2 最終產品 Gate |
| V02-P07 | 看完一段生活後，是否會想繼續看下一個行為，或主動點另一個家具？ | 待 PO 填 |

V0.2 只有在 V02-P06 由 PO 明確 Accepted，且 Sleep／Read／Eat 三個 Slice 各自的 Manual Acceptance 已完成時，才可紀錄為產品驗收通過。

## 17. Implementation Handoff（待本規格核准後才適用）

Product Owner 已核准本規格，授權範圍僅 Slice A — Sleep；本輪依指示只更新文件，不開始 Coding。後續啟動 Slice A 實作時依序：

1. Inspect 當下 repository／Git 狀態，確認 V0.1 checkpoint 與本規格版本。
2. 只提出 Slice A 的最小 plan、影響檔案、碰撞／姿勢／指令風險與驗證方式。
3. 實作 Sleep，完成 SA-T01～SA-T12，建立獲得證據的 Acceptance Record。
4. 停止 Coding，交 Product Owner 完成 SA-P01～SA-P04。
5. 只有 Sleep Accepted，才整理 Slice A checkpoint 並等待 Read Coding 指示。

## 18. Review Gate

**Approved：Product Owner Review 已完成。本次只更新文件核准狀態，不開始 V0.2 Coding。**

### Product Owner Approval Record

- 核准日期：2026-09-13。
- 核准者：Product Owner（本次對話中的使用者）。
- 核准文件：`docs/V0_2_WEB_SPEC.md` 與 `docs/ARCHITECTURE.md`。
- 核准依據：PO 明確表示「Product Owner Review 完成。我核准」上述兩份文件。
- 執行順序固定：**Sleep → Read → Eat**。
- 每個 Slice 必須個別實作、測試，並經 Product Owner 明確驗收後，才能開始下一個 Slice。
- 目前僅授權 **Slice A — Sleep**；Read／Eat 尚未授權開始。
- 本輪只更新文件狀態與 approval record，不修改產品 Scope，不開始 Coding。
- 文件 Approved 不代表 Slice 已實作、測試通過或獲得產品驗收。

本次核准涵蓋既有 Review 項目，內容維持：

- 是否接受 Sleep → Read → Eat 三個串行 Vertical Slices。
- 是否接受各 Action 的初始 approach anchor、facing、duration、transition 與 cooldown。
- 是否接受玩家指令在一個 Player Command 期間不覆寫／不排隊的最小仲裁規則。
- 是否接受 Autonomous Window Observe 不納入 V0.2。
- 是否接受只在兩個以上真實案例重複後才提最小 abstraction。

本文件建立後停止；不修改 runtime／tests／assets，不開始 Sleep Coding，不自動進入 Read 或 Eat。
