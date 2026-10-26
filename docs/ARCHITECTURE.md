# Fox Life Web — Architecture

## 現行架構（2026-10-26）

本節描述目前程式。下方折疊區保留 2026-09 的設計與核准紀錄，其中的 Current、Proposed 和授權範圍只代表當時狀態。功能與操作總覽見 [README](../README.md)，歷史里程碑見 [CHANGELOG](CHANGELOG.md)。

目前是純前端、單頁的 Three.js 生活模擬：小橘與小白共住臥室、客廳、陽台與廚房。Sleep、Read、Eat、日常、客廳、花園、料理、摸頭與雙人動作皆已實作。本機新版本加入輕量飢餓／精神需求、偏好與雙人看電視。沒有後端、完整存檔或離線模擬；日記與介面偏好使用 localStorage，需求不持久化。新功能的瀏覽器驗收狀態見 [本輪驗證](NEEDS_AND_SHARED_TV.md)。

### 啟動與更新

```text
entry.ts → main.ts
  ├─ scene.ts：房間、家具、光照與活動位置
  ├─ Household：共用位置的占用與預留
  ├─ Character × 2：自主行為、邀請、移動與活動切換
  ├─ PairPlanner：雙人邀請與自主配對
  ├─ ClickInteraction / LifePanel / RoomPanel：玩家輸入與回饋
  └─ 每幀：FrameClock → 兩隻 Character → PairPlanner → 鏡頭、道具、介面、音訊 → render
```

`FrameClock` 只推進前景時間，單幀最多 0.05 秒；背景分頁不累積生活進度。`main.ts` 負責組裝與清理，行為和姿態分別在 Character 與 visual 模組。

### 模組責任

| 模組 | 目前責任 |
| --- | --- |
| `Character.ts` | 持有單一 `Activity`、各活動冷卻時間、移動路徑與一個收尾後目的地；選擇自主活動，仲裁玩家邀請 |
| `Needs.ts` | 前景時間推進飢餓／精神，依正在執行的階段恢復需求；以需求與偏好加權自主選擇，不參與玩家邀請的接受判定 |
| `sleep.ts`、`read.ts`、`eat.ts`、`daily.ts`、`LivingActivity.ts`、`GardenActivity.ts`、`KitchenActivity.ts` | 各自擁有活動階段、時間、姿勢與安全退出規則；透過共同 Activity 契約由 Character 呼叫 |
| `Household.ts` | 以活動群組管理共用位置；書架、餐桌、掃帚，以及客廳／花園／廚房活動互斥，雙人床不互斥 |
| `Pair.ts` | `PairPlanner` 建立共享 `PairPlan`；兩個 `PairActivity` 協調站位、到達、等待、開始與退出；先到者最多等 30 秒 |
| `HomeNavigation.ts` | 四房間分類與固定門口路徑；沒有通用尋路或完整角色碰撞系統，小白會讓小橘先過 |
| `createFoxVisual.ts`、`*Visual.ts` | 程序模型、活動姿態與道具；`PetVisual`、`PairVisual` 疊加摸頭與雙人演出，不決定行為目的地 |
| `ClickInteraction.ts` | 共用點擊／拖曳區分、最近表面 raycast 與事件清理；命中後由 Character 決定是否接受邀請 |
| `HomeView.ts`、`RoomPanel.ts` | 跟拍目前選中的狐狸，或固定看全屋／房間；房間按鈕只改鏡頭，前往按鈕才發出移動邀請 |
| `LifePanel.ts`、`life.ts` | 依目前狐狸所在房間顯示動作、邀請結果、進度與最近 40 則日記；日記分別追蹤兩隻，雙人活動記一則 |
| `HomeAudio.ts` | 配樂、環境音與動作音效；動作音效跟著目前選中的狐狸 |

### 單人邀請與位置預留

1. 已有玩家邀請，或目的地被另一隻占用／預留時，拒絕新邀請；不打斷現有流程。
2. 接受邀請後，若當前自主活動需要收尾，保留現有位置，並立即預留下一個目的地。例如小橘起床準備讀書時，小白不能先占走書架。
3. 收尾完成後，在同一次同步呼叫中釋放舊占用並啟動下一個活動；另一隻的更新不會插在兩者之間。
4. `occupies()` 同時反映占用與預留，讓介面能指出是哪隻狐狸持有位置。活動結束或角色 dispose 時釋放位置。

這仍是一個收尾後目的地，沒有新增邀請佇列。碰碰鼻子與一起看窗外不占單人家具群組；一起看電視以共享 `PairPlan` 預留 `living` 群組，允許計畫中的兩隻使用座位，直到兩隻都退出才釋放。若其中一隻仍在還茶杯，客廳會讀取兩隻的快照，避免複製道具。其他客廳活動暫時維持整組互斥，未建立通用座位系統。

### 需求與偏好的接入

主入口為兩隻 Character 傳入 `life` 選項：小橘 `reader`、小白 `gardener`。Character 每幀用實際活動種類與階段更新 `LifeNeeds`，從原本可用且已過冷卻的候選中加權選擇；原有安全退出、位置占用與最多連續散步次數仍生效。基礎動作與歷史造型工具未傳入 `life` 時保留原有選擇器，需求測試另覆蓋實際雙角色設定。沒有離線補算、存檔、需求拒絕或顯示數值的介面。

### 角色選擇與鏡頭

點名字與直接摸狐狸共用 `main.ts` 的選擇流程，切換動作欄、目前角色與跟拍鏡頭。固定房間／全屋視角下，點目前同一隻狐狸也會恢復跟拍。已在跟拍同一隻時，連續摸頭保留使用者轉過的角度與縮放。

### 驗證邊界

- `npm test`：Node 直接執行 TypeScript 的模擬測試，涵蓋活動中斷、路徑、姿態／家具淨空、點擊、日記、音訊與雙角色協調；`tests/companion.test.mjs` 另檢查收尾期間的預留、競爭拒絕與釋放。
- `npm run build`：先執行 TypeScript 檢查，再產生 Vite 正式建置。
- 模擬測試不能代替瀏覽器畫面、真實效能與人工體感驗收；尚待項目見 [Chrome 人工補驗](V0_1_CHROME_MANUAL_ACCEPTANCE.md) 與 [V0.2 整體驗收](V0_2_OVERALL_ACCEPTANCE.md)。

## 歷史設計與核准紀錄（2026-09）

<details>
<summary>展開 V0.1 與 Sleep → Read → Eat 的歷史架構紀錄</summary>

> 歷史 review：2026-09-17，見 §23 Pre-Eat Architecture Review。當時 Sleep `fb9ad1f`、Read `2e18ed3` 均已 PO Accepted；Eat 尚未開始。其後 Eat 實作記於 §24；下方內容不代表現行程式與工作授權。

> 2026-09-14 implementation update：後續 PO 已授權 Slice A Coding。Sleep 已在 `feature/v0.2-sleep` 延伸既有模組，技術驗證與人工待驗項目見 [Slice A acceptance](V0_2_SLEEP_ACCEPTANCE.md)。以下 2026-09-13 approval 與 Current / Proposed 內容保留為核准時快照；文件核准不等於 Slice A Accepted。

> 狀態：Approved — Product Owner Review Completed  
> 日期：2026-09-13  
> 本文件記錄現在真正存在的架構，並分開標示 V0.2 建議演進。  
> **目前僅授權 Slice A — Sleep；本輪只更新核准紀錄，不開始 Coding。Proposed 結構仍未實作。**

## Product Owner Approval Record

- 核准日期：2026-09-13。
- 核准者：Product Owner（本次對話中的使用者）。
- 核准文件：`docs/ARCHITECTURE.md` 與 `docs/V0_2_WEB_SPEC.md`。
- 核准依據：PO 明確表示「Product Owner Review 完成。我核准」上述兩份文件。
- 核准範圍：既有 Current V0.1 架構紀錄與 Proposed V0.2 最小演進方向；不修改產品 Scope 或架構責任邊界。
- 執行順序固定：**Sleep → Read → Eat**。每個 Slice 必須個別實作、測試，並經 Product Owner 明確驗收後，才能開始下一個 Slice。
- 目前僅授權 **Slice A — Sleep**；Read／Eat 尚未授權開始。
- 本輪只更新文件狀態與 approval record，不開始 Coding；文件 Approved 不代表 Proposed 結構已實作或 Slice 已通過驗收。

## 1. 目的與閱讀規則

本文件的目的不是重新設計整個遊戲，而是：

1. 建立 V0.1 checkpoint 的架構紀錄。
2. 說明現行模組、資料流與責任邊界。
3. 指出 V0.2 Sleep 在現有架構上的最小延伸方向。
4. 定義 Read／Eat 後什麼情況才值得抽出最小共用結構。
5. 防止因為 V0.2 有三個新 Action，就預先建立大型 Furniture／Action Framework。

本文件使用三種標記：

- **Current**：目前 repository 中已存在且可從程式或測試驗證。
- **Proposed for V0.2**：符合 [V0.2 Web Spec](V0_2_WEB_SPEC.md) 的最小演進方向，尚未實作。
- **Deferred / Prohibited**：不屬於 V0.2，或沒有真實重複案例支持的架構。

## 2. 依據與 Source of Truth

- [PRODUCT.md](PRODUCT.md)：產品願景、Autonomous Life、Player-directed Actions、Furniture as Gameplay 與 V0.2 Basic Life 目標。
- [V0.1 Web Spec](V0_1_WEB_SPEC.md)：V0.1 的已核准行為、指令、Camera、Debug、技術與驗收邊界。
- [V0.1 Acceptance](V0_1_ACCEPTANCE.md)、[V0.1 Turn Polish](V0_1_TURN_POLISH.md)：目前實作、測試、限制與 PO 已接受的動作基線。
- [V0.2 Web Spec](V0_2_WEB_SPEC.md)：Sleep → Read → Eat 三個串行 Vertical Slices 與 Architecture Guardrail。
- [Project Handoff](../Fox_Life_Web_Project_Handoff.md)：技術主線、架構原則、工程流程與不提前建 Framework 的約束。
- 現有 `src/`、`tests/behavior.test.mjs`、`package.json` 與 `tsconfig.json`：Current Architecture 的最後依據。文件與程式不一致時，Current 以實際程式為準，產品範圍則以已核准規格為準。

## 3. Current Architecture Overview

Current 是一個小型、單頁、單角色的 Three.js runtime。沒有 application framework、ECS、DI container 或獨立 game engine layer。

```text
index.html
  ↓
entry.ts
  ├─ normal route → main.ts
  ├─ ?preview=fox → FoxAssetPreview.ts
  └─ ?preview=fox-v02 → FoxV02Review.ts

main.ts
  ├─ createScene() → Scene + Camera + windowParts
  ├─ Character(characterLayout) → behavior root + procedural visual child
  ├─ bindWindowInteraction() → Window click callback
  ├─ OrbitControls + ResizeObserver
  ├─ DebugPanel + optional PerformanceSample
  └─ animation loop
       ├─ FrameClock.tick()
       ├─ Character.update(dt)
       ├─ OrbitControls.update()
       ├─ renderer.render()
       └─ DebugPanel.update()
```

正式玩家流程只走 `entry.ts → main.ts`。兩個 preview route 是過去的角色資產比較工具，不具有 Character behavior／Window command，也不是 V0.2 Character Asset Pipeline。

## 4. Runtime / Tech Stack

| 項目 | Current | 邊界 |
| --- | --- | --- |
| Runtime | Desktop browser，WebGL 2 | Windows Desktop 優先；手機、PWA、desktop wrapper 未納入 |
| Build tool | Vite 8.2.2 | Dev server、production build、preview、dynamic import |
| Language | TypeScript 7.0.2，strict，ES2022，ES Modules | `noEmit`；由 Vite 負責 bundle |
| 3D | Three.js 0.186.0 | Scene、Camera、Renderer、Geometry、Material、Raycaster、OrbitControls |
| Types | `@types/three` 0.185.4 | Runtime／types minor 不完全相同，是已知基線 |
| UI | 原生 DOM + CSS | 無 React／UI framework |
| Test | Node built-in test runner + `node:assert` | 直接 import TypeScript source，不是 browser E2E framework |
| Assets | 正式流程使用程序 geometry／material | GLB／Blender 僅保留為歷史 review 資產 |
| Hosting shape | 純靜態 `dist/` | 無 backend、login、database |

Current npm quality commands：

```text
npm run typecheck
npm test
npm run build
npm run preview
```

## 5. Current Modules and Responsibilities

| 模組 | Current 責任 | 不負責 |
| --- | --- | --- |
| `src/entry.ts` | 根據 `preview` query 以 dynamic import 選擇玩家 runtime 或資產 review page | 不建立 Scene／Character，不決定行為 |
| `src/main.ts` | Composition root：建 renderer、取 scene／character、串接 interaction、controls、debug、clock、performance、resize、loop 與 cleanup | 不定義狐狸 geometry／pose，不應成為所有 Action 邏輯的容器 |
| `src/scene.ts` | 建立 Scene、PerspectiveCamera、光照、房間、非互動家具與 Window geometry；輸出 `scene`、`camera`、`windowParts`、`characterLayout` | 不處理指標事件、Character state 或 Camera controls |
| `src/Character.ts` | 持有 Idle／Walk／Observe state、自主目標、Window command、移動／轉向／到達／計時、真實 debug getters；擁有 world behavior root | 不處理 DOM／raycast／renderer／camera／家具 geometry |
| `src/createFoxVisual.ts` | 建立狐狸專屬 geometry／material／hierarchy，根據 Character 輸入播放 Idle／Walk／Turn／Observe 的程序 pose 與次級動作 | 不選行為、不改 world destination、不接收玩家點擊 |
| `src/WindowInteraction.ts` | 窗戶專用 pointer down／move／up／cancel、5px drag 排除、raycast 最近表面與 window parts 命中 callback | 不知道 Character state，不保證 command 被接受，不是通用 Furniture System |
| `src/DebugPanel.ts` | 建立／收合 DOM debug panel，讀 Character getters、顯示 viewport／renderer／hits，提供 Camera reset button | 不推導或改變模擬狀態，不是玩家 Action UI |
| `src/FrameClock.ts` | 只讓前景 delta 進模擬，在 visibility 邊緣重設，單幀 delta cap 0.05 秒 | 不是 Game Clock／Offline Progress |
| `src/PerformanceSample.ts` | `?measure=1` 時暖機 5 秒、取樣 rAF 至少 60 秒並輸出環境／幀間隔統計 | 不是 GPU profiler，不改變 simulation |
| `src/FoxAssetPreview.ts` | v01 GLB 與程序狐狸靜態比較 | 不是玩家 runtime，不執行行為 |
| `src/FoxV02Review.ts` | v02 static GLB 與程序狐狸雙視區靜態比較 | 不是 V0.2 Basic Life 實作 |
| `src/*.css` | 玩家 runtime 與 review routes 的 DOM／Canvas 版面 | 不控制 3D behavior |
| `tests/behavior.test.mjs` | Character、movement、visual transform、interaction、FrameClock 與房間淨空的模擬回歸 | 不取代真實 browser／PO 觀感驗收 |

## 6. Current Character Architecture

### 6.1 Behavior Root 與 Visual Child

`Character` 建立一個 world-space `THREE.Group` 作為 `root`，再把 `createFoxVisual().root` 加入其下：

```text
Character.root                    world behavior transform
└─ createFoxVisual().root         fox-only scale and pose
   ├─ body
   │  ├─ torso / bib / straps
   │  ├─ FoxHead / eyes / ears
   │  ├─ arms
   │  └─ FoxTail
   └─ FoxLegL / FoxLegR
```

Current 邊界：

- `Character.root.position` 是真實房間位置；`Character.root.rotation.y` 是真實行進朝向。
- visual child 以 `0.76` 縮放，不改變 destination、arrival tolerance 與移動單位。
- Character 決定「去哪裡、現在做什麼、持續多久」；visual 只決定「如何看起來像在做」。
- visual 的呼吸、頭、耳、尾、手腳位移都是 local transform，不得累積成 world-space 漂移。

### 6.2 Current State and Data

`CharacterState` 目前只有：

```text
Idle | Walk | Observe
```

Character 內部目前同時持有：

- `currentState`
- `commandActive`（一個 Window Player Command 是否進行中）
- `destination`（`Vector3 | null`）
- `idleRemaining`、`observeTime`、`arrivalSettle`
- `variation`（`Breathe | Look around`）
- `speed`、`turnVelocity`、`elapsed`
- 可注入 `random`，讓自主行為可測試
- `CharacterLayout`：window approach、window heading 與矩形 activity bounds

`source` 不是獨立狀態機，而是由 `commandActive` 推導：

```text
commandActive = false → Autonomous
commandActive = true  → Player Command
```

`action` 也由 `state + commandActive` 推導。Current 沒有 Action object、Intent interface、command queue 或 behavior tree。

### 6.3 Current Movement

- local `+Z` 是角色正面。
- `turnTo()` 以最短角差、角速度 damping 與上限 `3.6 rad/s` 旋轉，接近目標時減速。
- Walk 以 `max(0, cos(headingError))³` 連續調整前向速度，不橫移／倒退，轉向時形成小弧線。
- 實際位移沿 `Character.root` 當前正前方，並以 activity bounds 與 window position 形成的矩形裁切步長。
- 這是本房間專用的輕量 locomotion，不是 navigation、pathfinding 或通用 collision system。
- `ARRIVAL_DISTANCE = 0.035`。Window approach 到達後完成 facing，收勢 `0.18s`，才進入四秒 Observe。

### 6.4 Behavior-to-Visual Contract

Character 每幀傳入 visual：

```text
dt
time
distance
state
idle variation
observeTime
turnRate
headingError
preparingObserve
```

Visual 由這些輸入建立：

- 依實際移動距離推進步相，避免就地滑步。
- 大角度轉向時的交替抬腳、重心與頭部先行。
- Idle variation、呼吸、眨眼、視線與小幅耳／尾動作。
- Observe 的預備、視線／頭部演出與動作淡入淡出。
- 受限 spring 用於尾／耳次級動作，以 substep 保持低更新率下 finite。

Visual 不回傳事件，Character 也不等待 animation event。目前狀態時間完全由 Character 計時。

## 7. Current Autonomous Behavior and Player Command

### 7.1 Autonomous

Current autonomous behavior 只有 Idle／Walk：

```text
Idle 2.5–5.2 seconds
  ↓
choose a random destination inside bounds
  ↓
Walk with turn / acceleration / arrival damping
  ↓
Idle; alternate idle variation
```

- 目標至少離目前位置 `1.1` 單位；最多嘗試八次，再用有界 fallback。
- 目前沒有 Autonomous Observe、Sleep、Read、Eat、weight、cooldown 或 Needs。
- Idle variation 是交替，不是生活 Action scheduler。

### 7.2 Player Window Command

`requestWindowObserve()` 是目前唯一玩家指令入口：

- 若 `commandActive` 已為 true，回傳 false，不重開或排隊。
- 接受時設 `commandActive = true`、將 destination 替換為 window approach、State 設為 Walk，並重設收勢／Observe timer。
- Player Command 進行時，Idle autonomous scheduler 不會改寫 target。
- Observe 完成後 `enterIdle()` 清除 command、target、timers，source 回 Autonomous。
- Current 只有「無 Player Command」與「Window Player Command 進行中」兩種仲裁情況，尚無跨家具優先權問題。

## 8. Current Window Observe Data Flow

```text
Pointer input on renderer canvas
  ↓
WindowInteraction records pointerdown
  ├─ non-primary / non-left → reject
  ├─ movement > 5 px       → treat as Camera drag; reject command
  └─ pointerup candidate
       ↓
Raycaster intersects scene descendants
  ↓
take nearest visible hit only
  ├─ hit.object ∈ windowParts → onHit()
  └─ anything else           → no command
       ↓
main.ts callback
  ├─ increment windowHits
  ├─ Character.requestWindowObserve()
  └─ refresh Debug immediately
       ↓
Character update loop
  ├─ Walk to windowPosition
  ├─ face windowHeading
  ├─ settle 0.18 s
  ├─ Observe 4 s
  └─ enterIdle() / clear command and target
```

重要現況：

- `windowHits` 是 raycast 命中次數，不是被 Character 接受的 command 次數。進行中重複點窗仍會加 hits，但 Character 回傳 false。
- `WindowInteraction` 不讀 Character，Character 不讀 pointer，兩者由 `main.ts` callback 串接。
- Raycast 使用整個 scene 的最近 hit，因此墙、家具或角色可正確遮擋窗戶。

## 9. Current Scene / Camera / Debug Boundaries

### 9.1 Scene

`createScene()` 建立視覺層級與光照，並回傳互動所需的精確 object references。床與右側家具目前只是 decorative geometry，沒有 id、parts list、approach anchor 或 action semantics。

`characterLayout` 也在 `scene.ts`，因為 window approach／heading 與 activity bounds 是房間佈局資料。Character constructor 會 clone layout，避免外部在 runtime 直接改寫。

### 9.2 Camera

`main.ts` 擁有 OrbitControls 與 resize：

- target `(0, 0.8, 0)`
- pan disabled
- distance `10–24`
- polar angle `PI/8 – PI/2.5`
- damping enabled
- controls state 可重設
- pixel ratio 上限 2

Camera 不跟隨 Character，Character action 不會移動或鎖定 Camera。Camera drag 與 click 的區分由 interaction layer 處理。

### 9.3 Debug

DebugPanel 每幀從 Character public getters 讀真實資料，自己不有 simulation state。

Current 有一個明確限制：`Current Target` 的顯示用 `source === Player Command ? Window : Room` 推導 target label。在只有 Window command 的 V0.1 這是正確的；V0.2 Bed 加入後就不再成立。因此 target identity 必須由 Character 真實暴露，不能讓 Debug 繼續猜測。

Debug 仍是開發／驗證工具，不是玩家理解 Sleep／Read／Eat 的主要方式。

## 10. Current Time, Loop, Performance and Cleanup

- `renderer.setAnimationLoop()` 是唯一 runtime loop。
- `FrameClock.tick(now, document.hidden)` 先算 delta；背景時回傳 0 並重設。
- `main.ts` 在背景時不執行 Character、controls 或 render update。
- PerformanceSample 只在 query 開啟，與正常玩家 UI 分離。
- HMR dispose 停止 loop、disconnect observer、移除 visibility／pointer／debug listeners，dispose controls、geometry、material、shadow 與 renderer。
- Preview routes 有自己的 renderer／controls／scene cleanup，不與正式 runtime 共用活的 Character instance。

## 11. Current Test Boundary

`tests/behavior.test.mjs` 目前有 15 個 Node simulation tests，主要邊界為：

### 11.1 已測

- 30／60／90／135／180 度雙向轉身，20／60／144 Hz 模擬下可前進並到達。
- 轉向時只沿 root forward 位移、無 lateral slide、頭部先行上限與大轉向交替抬腳。
- 從 activity corners 到窗前的弧線路徑與角色 envelope 家具淨空抽樣。
- 步頻跟隨實際距離，Idle／Walk／Window／Observe 轉場無超過當前測試的單幀位移／旋轉上限。
- 60 秒自主模擬的多目標、兩種 Idle variation 與 debug invariants。
- 在 Idle／Walk 接受 Window command，0.5 秒內可觀察位移或轉向。
- 三個起點完成 Walk to Window／facing／settle／完整四秒 Observe／清理／離開窗前。
- 重複 Window command 不排隊、覆寫、重啟或延長，完成後可重新接受。
- 已在 window station 時原地對正，不繞路或瞬移。
- 真實 scene geometry 下的站位／路徑包圍盒抽樣與腳底高度。
- FrameClock 的 background／resume 計時邊界。
- Window frame／glass hit、occluder、drag、cancel、其他表面與 listener cleanup。
- Observe 前 0.18 秒收勢、去重與完整四秒 Observe。
- 尾巴次級動作有延遲並回穩，所有受測 transform finite。

### 11.2 沒有被 Node tests 證明

- Product Owner 的生命感、可愛度、Camera 舒適與動作辨識度。
- 獨立 Chrome 的真實 rendering、Console、pointer timing、background-tab 與 performance。
- 所有連續位置／角度的完整碰撞證明；現有測試是針對房間的有限抽樣。
- 長時間 memory soak、WebGL context loss、最低 GPU、跨瀏覽器或手機。
- V0.2 Sleep／Read／Eat；這些目前不存在於 runtime 或 tests。

## 12. Current Architectural Constraints and Pressure Points

Current 架構對 V0.1 是合理的，但 V0.2 會有以下真實壓力：

1. `CharacterState` 與 visual input 只認得 Idle／Walk／Observe。
2. `commandActive: boolean` 只能表示「沒有指令／Window 指令」，無法告訴 Debug 或行為邏輯目前是 Bed／Read／Food。
3. `destination: Vector3 | null` 沒有 target identity／heading／action semantics；window heading 只存在 layout 的單一欄位。
4. `arrivalSettle` 與 `observeTime` 是 Window Observe 專用，目前無 Sleep settle／sleep／wake phase。
5. `DebugPanel` 假設所有 Player Command target 都是 Window。
6. `scene.ts` 不回傳 bed parts 或 bed approach／heading；床目前只是四個無名 box。
7. `WindowInteraction.ts` 的 pointer／raycast 機制實際上可用於別的 object parts，但模組名稱、參數與測試還是 Window-specific。
8. `main.ts` 目前直接串一個 interaction callback。新增三個相同大小 callback 尚可接受，但不應把每個 action 的 phase／timer／pose 搬進 main。
9. 現有 movement bounds 是「activity rectangle + window point」的專案裁切；床尾與新家具 anchor 可能位於當前 bounds 外，需重做房間專用淨空驗證。

這些壓力是後續最小變更的依據，不是建立通用引擎的理由。

## 13. Proposed for V0.2 — Slice A Sleep

### 13.1 Minimum Data Extension

Sleep 只需先增加：

- `Sleep` Character state。
- Bed 的專用 approach position、facing heading 與可點 parts。
- 一個明確的 current target identity，至少能區分 `Room | Window | Bed`。
- 一個 Sleep intent 入口，能標示 `Autonomous | Player Command`。
- Sleep-specific phase：approach／settle／sleep／wake。
- Sleep duration、cooldown、連續 Walk 計數與可預測 random 選擇。
- visual 的 Sleep pose／transition progress，以及完成後復位的明確契約。

`Room | Window | Bed` 是在 Sleep 加入後由兩個真實互動目標（Window 與 Bed）加上現有 Room destination 產生的有限辨識需求。它可是小型 union／getter，不是 Furniture Framework。

### 13.2 Minimum Responsibility Changes

| 模組 | Proposed for Slice A | 邊界 |
| --- | --- | --- |
| `scene.ts` | 為現有床建立明確 group／parts references，輸出床尾 approach／heading；依角色 envelope 微調 geometry／anchor | 不建 furniture registry，不賦予床自主 behavior |
| `Character.ts` | 增 Sleep state、專用 intent／phase／timers／autonomous eligibility／cooldown；重用現有 movement 走到 Bed approach；提供真實 target identity | 不建 generic action graph，不把 pose geometry 放進 Character |
| `createFoxVisual.ts` | 增 Sleep-specific local pose、settle／wake easing、閉眼／慢呼吸；完成後復位 | 不更換程序狐狸，不建 skeleton／clip player |
| Interaction | 先保留 Window binder；Bed 可以專用 binder／callback 接入，具體變更以 Slice A inspect 為準 | 允許局部重複被看見，不在 Sleep 前預先設計多家具 API |
| `main.ts` | 取 bed parts，串接 Bed click 到 Character Sleep request，納入 cleanup | 不處理 Sleep phase／timer／pose |
| `DebugPanel.ts` | 改讀 Character 的真實 target label／phase／timer，顯示 Bed 而不猜 Window | 不用 Debug 自己推導 behavior |
| `tests/behavior.test.mjs` | 保留 15 個回歸，新增 Sleep 指令、自主、時序、中斷、空間、pose／cleanup、background 與 raycast 測試 | 不用 Node transform 斷言睡姿有生命感 |

是否新增檔案不在架構文件預先強制。如果 `Character.ts` 或 `createFoxVisual.ts` 因 Sleep 的真實實作變得無法審查，可在 Slice A plan 提出一個單一責任的局部拆分；不據此一次建立 Handoff 裡的全部建議目錄。

### 13.3 Proposed Sleep Data Flow

```text
Player Bed click
  → Bed-specific nearest-hit validation
  → main composition callback
  → Character sleep request (Player Command)

Idle autonomous decision
  → Sleep eligibility / weight / cooldown
  → Character sleep intent (Autonomous)

Both sources converge inside Character
  → set Bed target + Walk
  → reuse turn / forward movement / arrival
  → settle phase
  → Sleep state and duration
  → wake phase
  → clear target / timers / source
  → Idle

Character each frame
  → passes explicit sleep phase / progress to Fox visual
  → visual changes local pose only
```

Player 與 Autonomous 來源共用同一個 Sleep lifecycle 是同一產品行為的內部重用，不是跨行為 Action Framework。

## 14. Proposed for V0.2 — Read / Eat Reuse Candidates

Read／Eat 尚未實作。下列是將來需觀察的真實模式，不是現在就必須建立的 class／interface：

| 可能重用模式 | 已存在／將來案例 | 什麼可能共用 | 什麼必須保持專用 |
| --- | --- | --- | --- |
| 明確家具目標 | Current Window + Slice A Bed；之後有 Bookshelf／Food | id、clickable parts、approach position、heading 的小型 record | 家具 geometry、目標可點範圍、站位數值 |
| 玩家指令仲裁 | Window + Sleep；之後有 Read／Eat | 取代 Autonomous intent、同指令去重、單一 Player Command 的 invariant | 每個 Action 的安全退出動作 |
| Approach lifecycle | Window approach + Bed approach；之後有 Reading／Dining | 使用現有 destination／turn／movement／arrival 的最小路徑 | 各家具的 facing、settle 與觸碰語意 |
| Action timing | Observe + Sleep；之後有 Read／Eat | 前景 dt、duration 計時、完成後 cleanup 的 invariant | Sleep／Wake、Open／Put Away Book、Smell／Finish Meal 的 phase 順序與時長 |
| Autonomous selection | Slice A Sleep + Slice B Read | 當兩個生活 Action 都已實作後，eligibility／weight／cooldown 的局部 helper | 每個 Action 的 cooldown 與產品演出 |
| Visual pose contract | Current Observe + Slice A Sleep；之後有 Read／Eat | 可能共用 phase progress／neutral reset 的輸入形式 | 睡姿、持書／翻頁、取食／咀嚼必須是獨立程序演出 |
| Interaction hit testing | Window + Bed／Bookshelf／Food | 若兩個以上 binder 真實重複 pointer tracking、nearest-hit 與 cleanup，可抽出最小 hit binder | 哪些 parts 對應哪個 command，仍是明確清單 |

Read 加入後是第一個正式 abstraction review 點，因為當時才有兩個 V0.2 生活 Action（Sleep 與 Read）可比較。Eat 不應在 Sleep 尚未被 PO 接受時就反向影響 Slice A 設計。

## 15. Abstraction Decision Rule

新 abstraction 只能在下列條件全部成立時提出：

1. **至少兩個已實作案例**：例如 Window + Bed，或 Sleep + Read；不接受只列未來 Eat 當第二個案例。
2. **相同的責任真的重複**：不是只因為都叫 Action／Furniture，而是已出現相同資料、branch、cleanup 或測試 invariant。
3. **有具體風險**：重複已造成或高機率造成 target 殘留、timer 重開、listener 重疊、debug 誤報或優先權不一致。
4. **可以用更小的形式解決**：優先 finite union、小型 record、純函式或局部 helper，不用 registry／graph／framework。
5. **抽象本身可測**：每個現有案例與原本回歸都能保留，不強迫用 Debug 或 config 才能知道執行了什麼。
6. **不抹平產品差異**：Sleep、Read、Eat 的姿勢、節奏、prop、settle 與 exit 仍保持明確。

每個 abstraction proposal 在 Coding plan 必須列出：

```text
Existing case A:
Existing case B:
Repeated responsibility:
Observed bug / maintenance risk:
Smallest proposed abstraction:
Tests preserving both cases:
Why a simpler local change is insufficient:
```

沒有這份對照就不抽象。

## 16. What Must Stay Explicit for Now

即使 Read／Eat 完成，下列部分也默認保持專用，除非另有兩個以上實作案例證明同一責任：

- Sleep 的上床／躺姿／醒來。
- Read 的持書／視線／翻頁／收書。
- Eat 的聞食物／取食／咀嚼／收尾。
- 各家具的 geometry、clickable parts、approach anchor、heading 與碰撞允許範圍。
- 各 Action 的 duration、cooldown 與人工節奏調整值。
- Window Observe 的四秒計時、窗前 facing 與已接受演出。
- 房間目前依實際 geometry 檢查的有限路徑淨空。
- Product Owner Manual Acceptance；不能被自動化狀態測試抽掉。

## 17. Deferred / Prohibited Architecture

V0.2 不建立：

- ECS
- Plugin framework
- DI container
- 全域 Event Bus
- Generic Action Graph／通用 Behavior Tree 平台
- 大型 Furniture Framework／Furniture Registry／Furniture Editor
- Needs／Hunger／Energy／Mood／Personality architecture
- Save／Load／Offline Progress／Game Clock architecture
- 多角色／Relationship／多 Species framework
- Inventory／Economy／Backend／Login architecture
- 通用 navmesh／pathfinding／physics engine
- 正式 animation state machine／GLB clip pipeline／Rig pipeline

這些未來是否需要，要由後續產品 Slice 與實際重複決定；不從 V0.2 的三個 Action 數量直接推導。

## 18. Proposed Test Evolution for V0.2

每個 Slice 先延伸現有 Node simulation 測試，不立即建一整套 test framework。

### Slice A Sleep

- Sleep request 從 Autonomous Idle／Walk 取代目標，0.5 秒內可見反應。
- 三個起點到 Bed approach／facing／settle／Sleep／Wake／Idle。
- Autonomous weight／cooldown／連續 Walk 上限與可預測 random。
- Player command 去重，以及取代 Autonomous Sleep 時的安全 Wake。
- Bed raycast、drag／occlusion／other surface／cleanup。
- Bed approach 與 Sleep pose 的包圍空間，transform finite 與 neutral reset。
- Sleep／cooldown 不消耗背景時間。
- 所有 V0.1 Window／locomotion／visual／time 回歸保留。

### Slice B Read / Slice C Eat

在各自 Slice 依序加入同等層級的 request、autonomous、transition、repeated command、interaction、space、pose cleanup、background 與 production smoke 驗證。Read 要回歸 Sleep + Window；Eat 要回歸 Read + Sleep + Window。

如果測試檔實際變得難以審查，可依「共用測試 fixture 已被兩個以上案例重複」的證據抽出局部 test helper；不因未來可能有更多 Action 就預建 test DSL。

Browser production smoke、獨立 Chrome background／performance 與 Product Owner Manual Acceptance 仍是 Node tests 之外的必要邊界。

## 19. Architecture Review Checklist

每個 V0.2 Slice 實作 review 時檢查：

- [ ] Current 與 Proposed 的說明是否仍符合實際 repository？
- [ ] `main.ts` 是否仍主要負責組合，而不是 Action state machine？
- [ ] Character 是否仍擁有 state／intent／movement／timing，visual 只擁有姿勢／演出？
- [ ] Scene 是否輸出實際 geometry references／anchors，而不開始自己選行為？
- [ ] Debug 是否只讀真實 Character data，沒有猜測 target 或建第二套 state？
- [ ] 每個玩家指令是否仍可去重，且 Autonomous 不會覆寫？
- [ ] 新家具是否以本房間實際路徑／包圍空間驗證，沒有偷加通用尋路？
- [ ] 新 pose／prop／listener／resource 是否能復位並 dispose？
- [ ] 任何 abstraction 是否明確列出至少兩個已實作案例、重複責任與具體風險？
- [ ] 是否保留既有 tests、production smoke 與 PO manual review？
- [ ] 這個 Slice 是否在開始下一 Slice 前已獲 PO Accepted？

## 20. Stop Boundary

本文件完成後：

- 不修改 `src/`、`tests/`、assets 或 package dependencies。
- 不建立 Proposed 檔案／class／interface。
- 不開始 Sleep、Read 或 Eat Coding。
- 不自動 push／merge。
- Product Owner 已核准本架構紀錄與 V0.2 最小演進方向；本輪停在核准紀錄更新，後續實作授權範圍僅 Slice A — Sleep。

## 21. Slice A 實作觀察（2026-09-14）

- `Character` 延伸單一 Sleep intent、本地 approach / settle / sleep / wake、cooldown 與安全 Window 退出；`sleep.ts` 只存 timing / weight 與 phase type。
- `scene.ts` 輸出 Bed parts、允許範圍內調整的 anchor 與本房間床尾轉角；`main.ts` 維持組合與 cleanup，visual 只接收 pose / phase / time。
- 原 V0.1 motion / Observe / FrameClock 測試保留，新增 7 項 Sleep 測試。未建立 FurnitureInteraction、ActionManager、Action queue、Needs 或通用 navigation。
- Bed / Window 的 pointer / raycast / dispose，以及 Character 的 request / approach / timed return 已有可觀察的重複。Sleep 安全 Wake 與床尾路徑仍是特例；此時只記錄，等未來已授權 Slice 的實際重複再評估小型抽取。
- Slice A 仍待 PO 睡姿與體驗驗收、Chrome 補驗；Read / Eat 尚未開始。

## 22. Slice B 實作與驗證觀察（2026-09-16）

本節更新目前實作狀態；上方規劃與 Slice A 觀察保留其當時日期。Sleep 已由 PO Accepted 並保存為 `fb9ad1f`；Read 在 `feature/v0.2-read` 實作，PO 已 Accepted（2026-09-17 closeout 確認），Chrome 技術補驗保持 Pending。Eat 未開始。

- Character 管 Read 的 approach / settle / read / finish、7 秒 duration、30 秒 cooldown 與 command priority；visual 管開收書、持書、低頭及一次翻頁。Scene 提供真正的 Bookshelf parts 和固定 reading anchor；main 只組合及 dispose。沒有改寫既有 locomotion 或 Sleep preset。
- Observe / Sleep / Read 真實重複：玩家指令去重、Walk 到 anchor、最後對正／0.18 秒收勢、完成清 target 回 Idle。Sleep / Read 額外重複 anchored action 的安全退出與「退出後再走向一個新目的地」。Observe 沒有 anchored pose，不強迫加入安全退出 phase。
- `afterExit: 'Window' | 'Bed' | 'Bookshelf' | null` 取代 Sleep 原本 `windowAfterWake` 的單目標 boolean；`exitFor` 與 `completeExit` 只涵蓋實際 Sleep / Read 退出案例。避免各處複製清理、重設與下一個 command dispatch，降低殘留 pose 或提前移動風險。
- afterExit 只有一個槽位；接受替代時立即成為 Player Command，後續 command 全拒絕，完成退出即清空。沒有 queue、callback registry、泛型 Action class、Action Graph、未使用 target 或 extension point。Wake / PutAway 的 duration、姿勢、phase 仍各自明確實作。
- Sleep / Read 的自主候選過濾、各自 cooldown 與 Walk:3 / life action:1 由 Idle 的短局部選擇碼管理，不新增 chooser framework。
- Window / Bed / Read 的 pointer down/up、5px drag、nearest raycast、listener cleanup 是三個實際重複 binder；未在驗證 polish 任務進行重構。未來若需修相同事件處理問題，可評估抽成一個小 click helper；不等於需要 Furniture Framework。
- Read overlay 每幀先移除前一幀偏移再計算 baseline，避免 damping 把閱讀頭／手臂姿勢帶到走路。書本只在 Read pose 可見，隱藏時 raycast 不命中；prop meshes 留在 scene hierarchy，沿用 HMR 的 geometry/material Set 去重 dispose。
- 原 15 項 V0.1 與 9 項 Sleep 測試未改；新增 9 項 Read 測試，合計 33 項通過。完整驗證與尚待人工邊界見 [Read Acceptance](V0_2_READ_ACCEPTANCE.md)。

## 23. Pre-Eat Architecture Review（2026-09-17）

### 23.1 結論與檢查基準

**保持現狀，Eat 先用專用實作。** 這是未來獲得 Eat Coding 授權後的建議，本次只 review，不代表開始 Eat。

檢查分支 `feature/v0.2-read`，HEAD `2e18ed3`，parent 為 Sleep checkpoint `fb9ad1f`；review 開始時 working tree 乾淨。已核對 PRODUCT、V0_2_WEB_SPEC、Architecture、Sleep / Read Acceptance，以及 Character、scene、visual、三個 interaction binder、main、Debug 與測試責任。Sleep / Read 的 PO Accepted 不改變獨立 Chrome background、完整 resize 與 performance 的 Pending 狀態。

目前責任仍清楚：Character 管意圖／時間／world movement，visual 管 local pose，scene 提供 parts／站位，main 組合 callback，Debug 只讀真實 getters。沒有需要先重寫架構才能承接下一個專用 Action 的證據。共用語意多已集中；少量 request／phase branch 的重複成本低，保留可讀性更重要。

### 23.2 十項實際重複分類

分類以責任為單位：**A**＝已形成穩定重複，可能值得最小共用（包括已共用且不需再抽）；**B**＝外形相似但語意／演出仍應專用；**C**＝跨 Action 目前只有單一案例，不應推廣。同一項含不同責任時分別標記，不把整個 Action 歸為同一類。

| 檢查項目 | 分類 | Observe / Sleep / Read 的實際證據與決定 |
| --- | --- | --- |
| 1. Intent / command entry | A：入口 invariant；B：初始化 | `Character.requestWindowObserve / requestSleep / requestRead` 都先拒絕 `commandActive`、再呼叫 `exitFor`。Sleep / Read 額外檢查 layout 與自主同目標去重，並由 `beginSleep / beginRead(player)` 合併兩種來源；Observe 只有玩家來源。短 guard 可保留，不能把不同初始化硬塞成通用 request config。 |
| 2. Target / approach position | A：destination / identity；B：站位；C：床尾路徑 | 三者共用 `destination`、`targetKind`、Walk；scene 各自定義 position / heading。Window (0,-1.4)、Bed (-3.15,1.85)、Read (2.10,-0.30) 的淨空條件不同。`routePastBed` 可供不同出發／目的地使用，但繞床 corner 只有一個家具案例，不能據此建 waypoint framework。 |
| 3. Facing / settle | A：已共用對正；B：進入姿勢 | `Character.update` 到點分支共用 0.035 容差、`turnTo`、0.025 朝向誤差門檻與 0.18 秒收勢。之後 Observe 直接開始，Sleep 再用 0.65 秒進床、Read 再用 0.35 秒開書；後兩者不是同一個 arrival settle。維持共用 approach + 明確分支。 |
| 4. Active action phase | B | Observe 是 4 秒計時後 Idle；Sleep 是 settle / sleep / wake（0.65 / 8 / 0.75）；Read 是 settle / read / finish（0.35 / 7 / 0.35）。雖然 Sleep / Read 的 timer branch 結構相似，姿態建立、prop 與退出都不同；短顯式分支比 phase executor／通用 state machine 更易審查。前景 dt 已共用，不另抽 timer framework。 |
| 5. Safe exit | A：已共用協調；B：退出姿勢 | Sleep / Read 真實使用 `exitFor / completeExit / afterExit`；`beginWake` 保存 bedPose 到 wakeFrom，`beginFinish` 保存 readingPose 到 finishFrom，已在退出時不重啟。Pose 必須各自演出；Observe 沒有需要解除的 anchored pose，不新增空 exit phase。 |
| 6. Player command interruption | A：共用規則；B：當前動作退出 | 三個 request 都尊重單一 Player Command；已接受替代就鎖定 source，後續點擊拒絕。自主 Sleep / Read 可安全退出到另一目標；Observe 本身只有 Player Command，不能假設它有 Autonomous interruption 案例。既有有限 dispatch 足夠，不引入 queue 或 command object。 |
| 7. Return to autonomous life | A：已共用 reset；B：完成副作用 | 三者最終經 `enterIdle` 清 target／source／phase／pose／移動狀態並設定 Idle。Sleep / Read 先設各自 cooldown，再由 `completeExit` 重設 Walk 計數；有 afterExit 才同幀清理後啟動新 request，下個 update 才能移動。Observe 直接 `enterIdle`，沒有 life cooldown；保留差別。 |
| 8. Debug state/action reporting | A：已共用讀取；B：標籤與資料 | Character getters 統一 state / source / targetLabel / action；DebugPanel 的 `set` 共用 DOM 更新。`action` 明確依 Read / Sleep phase 再看 state，Observe seconds 與兩種 phase／cooldown 各有欄位。重複是幾行格式化，尚不值得建 action metadata registry；hit count 仍不等於 accepted command。 |
| 9. Cooldown / autonomous selection | A：兩種 life action 已共用選擇；B：資格與值 | Sleep / Read 都在 Idle 的 `eligible` 陣列判斷初始 Walk 完成、layout、cooldown，再用單一選擇式處理 Walk:3、每個 eligible life action:1、三 Walk 上限。45 / 30 秒各自遞減／重設；Observe 不入候選。短局部邏輯足夠，不需 Needs、scheduler 或通用 weighted registry。 |
| 10. Visual pose overlay / reset | B：reset 方法不同；C：專用機制 | Observe 用 damp 的 observeBlend／glance；Sleep 用 root 抬升側轉、腿／尾 morph 及顯式復位；Read 每幀撤除 readOffsets，再算 baseline／疊加並清 book。共同的是「完成後不能殘留」契約，不是同一套 pose algorithm。Read 的可撤除持書 overlay／隱藏 prop raycast 與 Sleep 的床面 morph 各只有一種 Action，不能先建立 pose layer stack、prop manager 或 rig。 |

程式定位（以本 review 的 HEAD 為準）：`Character.ts` 43（afterExit）、74（action）、87～171（request／safe exit／begin／床尾路徑）、173（enterIdle）、214～315（timing／selection／arrival／Observe）；`createFoxVisual.ts` 284（readOffsets）、318（Observe blend）、351（Sleep morph）、399（Read overlay）。

### 23.3 既有共用程式是否適量

- **保留 `afterExit`。** 它把原 Sleep 的 windowAfterWake 特例擴為三個已存在目的地，真實涵蓋 Sleep→Window／Read、Read→Window／Bed；所有 union 成員都有使用。它只保留一個取代中的目的地，不儲存一串意圖，不接受 action callbacks／plugin hooks，也沒有未用 extension point。
- **保留 `exitFor / completeExit`。** 前者只判斷現有兩種 pose 再交給專用退出；後者把「取出並清 afterExit → reset Walk count → enterIdle → dispatch」集中。少了重複清理與提前走動的風險。`enterIdle` 本身不清 afterExit，現有安全退出順序由 completeExit 保證；未來修改必須保留此順序，不能任意旁路呼叫。
- **保留單一 Walk / turn / arrival 分支與 Idle chooser。** 已消除三份 locomotion 與兩份自主決策；沒有必要再包一層 ActionRunner。optional bed / reading layout 也實際用於 V0.1、Sleep 與完整 Read 的不同測試配置，不是預留家具插件。
- **保留視覺層內的有限 helper。** 例如 secondary spring 供耳／尾使用，sleepMorph 供腿／尾使用，確實降低 geometry／次級運動重複；這是同一模型內的共用，不是兩個 Action 支持通用 pose 系統的證據。
- **一個小型維護觀察，非 blocker：** `SLEEP.weight`、`READ.weight` 都宣告 1，但目前 chooser 以 eligible 個數實現等權，沒有讀取這兩個欄位；`walkWeight` 則仍掛在 SLEEP。現行數值符合規格，但只改 weight 常數不會改變選擇機率。這是常數與實際演算法表示的重複，不是已實作可擴充 weight API；未來若碰到該段應保持一致，不為此新增 framework。本輪不修改。

### 23.4 唯一可選的最小 abstraction 建議：click binder

這不是 Eat 的前置要求，也不在本輪實作。

- **已存在案例：** `WindowInteraction.ts`、`BedInteraction.ts`、`ReadInteraction.ts` 的 binder，除函式名、parts 變數與註解外，pointer / raycast / dispose 流程相同。
- **明確重複：** primary left press、pointer id、5px drag、cancel、螢幕座標轉換、scene 最近 raycast hit、parts membership 與四個 listener 的成對 cleanup。
- **Eat 很可能再複製的依據：** 已核准 Spec §8.2／§5.3 同樣要求指定 Food parts、遮擋拒絕與 drag 排除；這個預測有三份現存同型程式支持，不只因為 Eat 也叫 Action。
- **具體成本：** 任何 drag／取消／遮擋／cleanup 修正需同步三份，加入 Food 會變四份；目前未發現因此造成的 regression，故不當 blocker。
- **最小形式：** 一個 `bindTargetClick(canvas, camera, scene, parts, onHit) -> dispose` 函式，只搬現有機制；各家具 parts、callback、request、hit counter 與 priority 留在原本邊界。可保留薄的專用 binder 名稱以減少呼叫端改動。不要再加 target registry、Action id config、事件匯流排、policy hooks 或家具 class。
- **為何比其他方案小：** 不建立新資料模型，只消除重複的事件處理函式本體。若只改一份專用 binder，其餘兩份仍有同步成本；但目前沒有事件缺陷，保留三份直到未來實際變更也可接受。
- **若未來採用的驗證：** 保留三個現有真實 raycast 測試（Window / Bed / Read），驗證有效 parts、遮擋、非目標、drag／cancel、dispose；另驗證同一 click 不觸發多個 target callback，隱藏 ReadingBook 不擋 raycast。各 Character priority／safe exit 與 33 項既有回歸仍須保留。helper 不保證「命中即接受 command」。

### 23.5 Review 邊界與後續風險

未來 Eat 若獲授權，專用 phase／姿勢／餐區幾何先行；沿用現有共用責任即可，不在本輪預建 Eat 欄位、入口或檔案。要留意新增 phase 同時納入 action reporting、enterIdle 清理、afterExit dispatch、cooldown eligibility 與 visual neutral reset，並以跨 Action 中斷測試防止漏清；不要藉此把三種既有演出改寫成通用圖。

本 review 未發現需要大型重構的架構 blocker。既有 33 tests／typecheck／build 通過為 Read checkpoint 的歷史證據，本輪只檢查 source／docs 與 diff，沒有重跑驗證，也不把 Chrome Pending 改為 Pass。僅修改本文件；runtime、tests、assets、dependencies 與兩個 checkpoint 不變，不 commit／push／merge，不開始 Eat。

## 24. Slice C — Eat implementation observation（2026-09-19）

§23 為 Pre-Eat 歷史 review；其後 PO 授權提交為 `79d6427`，從乾淨 working tree 建立 `feature/v0.2-eat` 並開始 Slice C。Read `2e18ed3` / Sleep `fb9ad1f` 歷史不變。

- 維持「保持現狀，Eat 先用專用實作」。Eat 擁有 `EatPhase`、0.40 / 6 / 0.35 timing、30 秒 cooldown、獨立 pose / props / reset；沒有 generic phase system 或 Action / Furniture framework。
- `afterExit` 只新增實際 Food 目的地；`exitFor` 分派 Wake / PutAway / FinishMeal，`completeExit` 清空單一目的地並透過既有入口啟動下一個玩家命令。三種 anchored actions 的安全退出責任確實共用，不新增 queue 或未用 extension points。
- 食用期間 motion time 和 phase timer 分離，Finish 凍結入口／咀嚼位置，再從當前 pose 淡出，避免 partial settle 或進食中斷突然跳姿。這是 Eat 演出需求，沒有推廣成全域 phase abstraction。
- Read 與 Eat 都有每幀撤回 overlay 的真實重複；目前欄位、prop 和演出不同且程式短，仍保留專用清理，靠跨 action 測試防止偏移殘留。
- Chooser 延續 equal eligible slots + Walk 3。沒有加入未被使用的 `EAT.weight`；`SLEEP.weight` / `READ.weight` 既有 observation 不變，本輪不順便重構 chooser。
- EatInteraction 延續最近命中、drag threshold、dispose 慣例；四份 binder 的重複確實存在，§23.4 的最小 helper 仍可在後續獨立整理時考慮，並非本輪必要修改。
- 原 33 tests 未改；新增 10 Eat tests，43/43、typecheck、build 通過。Production smoke / 中斷與人工缺口見 [Eat Acceptance](V0_2_EAT_ACCEPTANCE.md)。Eat 等待 PO，未進行 Overall Closeout。

</details>
