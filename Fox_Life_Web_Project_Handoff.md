# 🦊 Fox Life Web — Project Handoff

> 狀態：Draft v0.1  
> 專案類型：3D Web App / Cozy Idle Life Simulation Prototype  
> 主要技術候選：Vite + Three.js + TypeScript  
> 開發模式：GPT / Work 負責產品、規格與審查；Codex 負責 Repository 實作  
>
> **重要：本文件屬於獨立 Web 專案，不沿用 Godot 專案的技術架構。**

---

# 1. 專案目標

Fox Life Web 是一款以小型 3D 箱庭為舞台的：

# **Cozy Idle Life Simulation**

玩家不是直接操作角色走路，而是：

- 觀看角色自主生活
- 偶爾透過家具或環境下達行為指令
- 回來查看角色目前正在做什麼
- 觀察角色之間逐漸產生的小互動與生活片段

核心不是：

> 掛機等數值。

而是：

> **掛著看生活自己發生。**

---

# 2. 核心產品幻想

> **「我有一個小小的家，裡面的角色即使我不操作，也會自己好好生活。」**

玩家的角色比較接近：

- 觀察者
- 陪伴者
- 事件觸發者
- 輕度生活引導者
- 居家布置者

而不是：

- 直接用 WASD 控制角色
- 高壓任務玩家
- 數值效率管理者

---

# 3. 玩法靈感來源

## 萌宅物語 / Adorable Home

主要參考：

- 放置節奏
- 回訪動機
- 居家生活感
- 伴侶系統
- 療癒氛圍

Fox Life 希望補強：

- 角色行為的連續過程
- 3D 空間中的自主走動
- 更多 Micro-events
- 家具與行為的直接關聯
- 玩家可以主動觸發下一段生活事件
- 更豐富的雙角色互動

---

## Animal Crossing 類型的生活模擬風格

主要參考：

- 動物角色親和力
- 2～3 頭身比例
- 圓潤、簡化、好讀
- 舒服的生活模擬氣氛
- 家具與空間的吸引力

不直接模仿：

- 角色造型
- UI
- 世界設定
- 商標性視覺元素

---

## Woodo

只參考：

- 微縮 Diorama 感
- 箱庭式構圖
- 舒服的場景比例
- 柔和光影
- 精緻的小型世界感

不採用：

- 木製玩具材質作為主要視覺識別
- 直接模仿 Woodo 的材質語言

---

# 4. Fox Life 自己的世界觀方向

核心比例：

```text
70% Cozy Home
+
30% Found-object Storytelling
```

房間本身是舒服、可居住的 Cozy Home。

但會混入：

- 森林撿拾物
- 人類遺失的小物
- 小尺度角色重新利用的生活用品

例如：

- 鈕扣 → 小盤子
- 小鐵盒 → 收納盒
- 瓶蓋 → 桌面或杯墊
- 小玻璃瓶 → 花器
- 舊車票 → 書籤或牆面裝飾
- 布料碎片 → 小毯子
- 橡實殼 → 小容器

目的不是把整個家變成樹洞。

而是讓玩家偶爾感覺：

> **「這是一個小角色眼中的巨大世界。」**

---

# 5. 視覺方向

核心關鍵字：

```text
Cozy Stylized 3D
Miniature Diorama
Chibi Animal Character
Rounded Shapes
Soft Matte Materials
Warm Natural Palette
Pastel Accents
Gentle Lighting
Soft Shadows
Tiny Cozy Home
Wholesome Life Sim
Small-scale World
Clean Readable Silhouette
Non-photorealistic
```

避免：

```text
Photorealistic Fur
Realistic Animal Anatomy
Wooden Toy Aesthetic
Plastic-looking Materials
Overly Saturated Colors
Direct Imitation of Existing Games
Overly Detailed Environment
```

---

# 6. 第一位角色

初期角色：

# 🦊 Fox

方向：

- 約 2.5 頭身
- 大頭
- 大三角耳
- 短四肢
- 大而蓬鬆的尾巴
- 橘紅色
- 奶油色臉部 / 胸口 / 尾巴尖
- 綠色吊帶褲
- 圓潤
- Stylized
- Friendly
- 非寫實毛髮

重要：

> 狐狸只是第一個 Character Definition。

核心系統不要假設遊戲永遠只有狐狸。

---

# 7. 長期產品願景

## Stage A — 單一角色

```text
Idle
Walk
Observe
Eat
Sleep
Read
Cook
Clean
Play
```

---

## Stage B — 玩家介入

玩家透過：

- 點家具
- 點環境
- 放置物件

觸發：

```text
Player Intent
↓
Character Walks
↓
Character Performs Action
↓
Returns to Autonomous Life
```

---

## Stage C — Micro-events

例如：

- 看書看到睡著
- 吃東西前先聞一下
- 尾巴掃到小物
- 打掃做到一半休息
- 看窗外發呆
- 心情不好時坐角落
- 回家後伸懶腰
- 坐著發呆
- 窗外下雨時跑去看

核心：

> **少量系統 → 大量生活片段。**

---

## Stage D — 雙角色 / 伴侶

未來加入：

```text
Character A
+
Character B
```

可發展：

- Talk
- Sit Together
- Eat Together
- Cuddle
- Sleep Together
- Small Arguments
- Make Up
- Gift
- Help Each Other

關係應：

> **看得見，而不只是數值。**

---

## Stage E — 多物種

未來可以加入：

```text
Fox
Rabbit
Cat
Dog
...
```

不同 Species 可以擁有：

- 不同外觀
- 不同動畫
- 不同行為偏好
- 少量 Species-specific Micro-events

---

# 8. Web 技術主線

本專案技術主線：

# **Vite + Three.js + TypeScript**

建議使用：

- Vite
- TypeScript
- Three.js
- ES Modules
- npm
- HTML / CSS
- Web Audio API 或 Three.js Audio
- GLTFLoader（未來正式模型）
- OrbitControls
- Raycaster

目前不使用 React。

理由：

- Prototype 階段不需要 React UI 架構
- 減少不必要複雜度
- Codex 更容易直接理解 3D Game Loop
- Three.js 本身已經涵蓋主要 3D Rendering 需求

---

# 9. 為什麼使用 TypeScript

相較純 JavaScript：

TypeScript 可以提供：

- State 型別
- Action 型別
- Character interface
- Interaction contract
- 編譯期錯誤檢查
- 更安全的 Refactor
- AI 修改程式碼時更容易發現型別錯誤

例如：

```ts
type CharacterState =
  | "idle"
  | "walking"
  | "observing";
```

避免：

```js
state = "walkng";
```

之類的 typo 靜默存在。

---

# 10. Web Prototype 的主要優勢

Fox Life Web 最主要驗證：

- Browser 即開即玩
- Hot Reload
- 非常短的 AI 修改回饋循環
- 不需要安裝遊戲
- 容易分享網址
- 容易部署
- Codex 可以幾乎完全透過 Code 操作
- 很適合快速做視覺 / 行為 Prototype

典型循環：

```text
Codex 修改
↓
Vite HMR
↓
Browser
↓
立即看到結果
```

---

# 11. V0.1 核心產品問題

V0.1 只回答幾個問題：

1. 狐狸沒有玩家操作時，看起來有沒有生命感？
2. Idle / Walk / 微動作是否自然？
3. 玩家能不能舒服地環繞、縮放觀察房間？
4. 點擊窗戶後，狐狸能不能自然完成：

```text
Walk to Window
↓
Observe Environment
```

5. Observe 完成後能不能自然回到自主生活？
6. 玩家會不會想再觸發下一個事件？

---

# 12. V0.1 Vertical Slice

第一個真正產品切片：

```text
Autonomous Idle / Walk
↓
Player Clicks Window
↓
Character Receives Observe Command
↓
Walk to Window
↓
Observe Environment
↓
Return to Autonomous Idle / Walk
```

這是 V0.1 最重要的流程。

---

# 13. V0.1 功能範圍

## Scene

- 一個簡化暖色系微縮房間
- 地板
- 牆面
- 窗戶
- 少量 Placeholder Furniture
- 近側牆 / 屋頂避免阻擋主要視角

---

## Character

- 一隻約 2.5 頭身狐狸
- 綠色吊帶褲
- 清楚頭部
- 耳朵
- 四肢
- 大尾巴
- Idle
- Walk
- Observe

Prototype 可以先使用程序化 Mesh。

但：

> 不要只是完全無法判斷生命感的方塊。

---

## Micro-animation

至少：

- 呼吸
- 重心微移
- 視線微動
- 耳朵微動
- 尾巴微動

Idle 至少兩種 Variation。

---

## Camera

使用 OrbitControls 或自訂限制。

要求：

- 滑鼠拖曳旋轉
- 滾輪縮放
- 水平約 360°
- 垂直角度受限
- Min / Max Zoom
- Camera 以房間中心為主要 Orbit Target
- Camera 不持續追蹤角色
- 避免鏡頭穿牆

---

## Interaction

V0.1 只有：

# Window Observe

流程：

```text
Raycaster
↓
Window Click
↓
Observe Command
↓
Character Walk
↓
Observe
↓
Autonomous State
```

不要提前做通用 Furniture Interaction Framework。

---

## Debug

需要簡單 Debug UI：

顯示：

- Current State
- Current Action
- Current Target
- Autonomous / Player Command

可切換顯示 / 隱藏。

---

## Audio

V0.1 後段可加入：

- 輕量環境音
- 腳步聲
- Observe 事件反應音

不要建立複雜 Audio System。

---

# 14. 初步畫面目標

Desktop Browser 優先：

```text
1920 × 1080
16:9
60 FPS target
```

但應考慮：

- Responsive Canvas
- Browser Resize
- 不寫死單一解析度

---

# 15. 建議程式結構

初期可採：

```text
src/
│
├── main.ts
│
├── styles.css
│
├── app/
│   └── Game.ts
│
├── scene/
│   ├── createScene.ts
│   ├── createCamera.ts
│   ├── createLights.ts
│   └── createRoom.ts
│
├── character/
│   ├── Character.ts
│   ├── CharacterState.ts
│   └── createPlaceholderCharacter.ts
│
├── systems/
│   ├── CharacterBrain.ts
│   ├── MovementSystem.ts
│   └── InteractionSystem.ts
│
├── interaction/
│   └── WindowInteraction.ts
│
├── ui/
│   └── DebugPanel.ts
│
└── audio/
    └── AudioController.ts
```

重要：

> 這只是方向，不要求第一天一次全部建立。

隨功能逐步建立。

---

# 16. 核心架構原則

## 不要寫死 Fox

避免：

```text
FoxAI
FoxMovement
FoxState
```

核心優先：

```text
Character
CharacterBrain
CharacterState
```

Fox 是 Character Definition / Visual。

---

## 不要把所有程式塞進 main.ts

`main.ts` 應主要負責：

- bootstrap
- renderer setup
- game startup

不要負責所有 Game Logic。

---

## 不要提前做大型 Framework

Prototype 不要先建立：

- Generic Furniture System
- Full ECS
- Generic Action Graph
- Plugin Architecture
- DI Container
- Event Bus Everywhere
- Save Framework
- Backend Architecture

只在真正需要時抽象。

---

# 17. State Direction

V0.1 最小狀態：

```text
IDLE
WALKING
OBSERVING
```

基本流程：

```text
IDLE
↓
Autonomous Walk
↓
WALKING
↓
IDLE
```

玩家事件：

```text
IDLE / WALKING
↓
Window Command
↓
WALKING
↓
OBSERVING
↓
IDLE
```

玩家指令優先於 Autonomous Action。

---

# 18. Player Command 規則

玩家：

- 不直接 WASD 控制 Character
- 不逐步控制移動
- 不使用搖桿控制

玩家點窗戶後：

- Character 應執行 Observe
- 不因 Needs / Mood / Personality 拒絕
- 可以等待極短安全轉場
- 不可以瞬移
- 不可以無故忽略指令

完成後：

```text
Return to Autonomous Life
```

---

# 19. V0.1 不做

不要加入：

- Eat
- Sleep
- Read
- Cook
- Clean
- Needs
- Mood
- Personality
- Relationship
- 多角色
- 多 Species
- Save
- Offline Progress
- Login
- Backend
- Database
- Cloud Save
- Economy
- Shop
- Achievement
- Multiplayer
- 正式大型 Asset Pipeline
- 正式高品質角色模型
- 複雜 Shader Pipeline
- 通用 Furniture Framework

---

# 20. Asset Strategy

V0.1：

优先使用：

- Three.js Primitive Geometry
- 自建簡單材質
- 專案內自有概念素材

不要：

- 隨便下載網路 GLB
- 使用授權不清楚素材
- 用第三方模型只是為了讓 Prototype 看起來漂亮

後續另開：

# Visual Asset Spike

再測：

- Blender Character
- GLB / glTF
- Skeleton
- Animation
- PBR Material

---

# 21. Engineering Workflow

每次 Feature：

```text
Goal
↓
Constraints
↓
Acceptance Criteria
↓
Codex Inspect
↓
Think First
↓
Plan
↓
Implementation
↓
Type Check
↓
Build
↓
Smoke Test
↓
Diff Review
↓
Human Acceptance
```

---

# 22. Think First

大型修改前：

Codex 必須先：

- Inspect Repository
- 查看現有模組
- 找出受影響檔案
- 說明風險
- 提出最小 Plan

不要：

> 一看到需求就大量改檔案。

---

# 23. Git 原則

專案一開始即使用 Git。

初期：

- main branch
- Feature / Spike branch
- 小 Commit
- 可 rollback
- 不自動 push
- 不自動 merge
- Product Owner Review 後再接受

Codex 完成任務後必須回報：

- Changed Files
- Diff Summary
- Build Result
- Test Result
- Known Limitations

---

# 24. Quality Gate

Prototype 初期至少：

```text
npm run typecheck
npm run build
```

建議 scripts：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

後續才逐步加入：

- ESLint
- Unit Test
- Playwright
- CI
- Security Scan

不要第一天建立整間品質工廠。

---

# 25. V0.1 Acceptance Criteria

## Technical

- [ ] `npm install` 正常
- [ ] `npm run dev` 正常
- [ ] `npm run typecheck` 通過
- [ ] `npm run build` 通過
- [ ] 無主要 Console Error
- [ ] Canvas 正確 Resize
- [ ] Desktop Chrome 正常執行

---

## Scene

- [ ] 可看到完整小房間
- [ ] 狐狸是主要視覺焦點
- [ ] Camera 可 Rotate
- [ ] Camera 可 Zoom
- [ ] 主要 Camera Angle 不被牆擋住

---

## Character

- [ ] 狐狸可辨識
- [ ] 有清楚 Head / Ears / Limbs / Tail
- [ ] Idle 狀態存在
- [ ] Walk 狀態存在
- [ ] 至少兩種 Idle Variation
- [ ] 有基本生命感微動

---

## Interaction

- [ ] Window 可被 Raycaster 點擊
- [ ] Click Window 觸發 Observe Command
- [ ] Character 走向指定位置
- [ ] 不瞬移
- [ ] Observe 正常執行
- [ ] 完成後回到 Autonomous Idle / Walk

---

## Product

- [ ] 不操作時角色仍有活動
- [ ] 角色行為不是完全機械循環
- [ ] Camera 適合長時間觀察
- [ ] 玩家能理解 Window Interaction
- [ ] 玩家願意多看角色一會
- [ ] 玩家會想觸發下一個生活事件

最後三項需要 Product Owner 人工判斷。

---

# 26. Web Deployment

Prototype 成功後可考慮：

```text
npm run build
↓
dist/
↓
Static Hosting
```

候選：

- GitHub Pages
- Vercel
- Netlify

第一階段不需要：

- Backend
- Server Runtime
- Database

Fox Life V0.1 應能：

> 純靜態部署。

---

# 27. 未來平台方向

如果 Web Prototype 成功：

短期：

```text
Browser
Desktop Web
PWA（可評估）
```

未來若要 Steam：

可以再評估：

- Tauri
- Electron
- 其他 Desktop Wrapper
- 或重新評估 Game Engine

如果未來 App Store 成為正式核心平台：

應重新做 Architecture / Platform ADR。

不要因為「未來可能上 Steam / App」，
就在 V0.1 提前建立複雜包裝層。

---

# 28. Codex 與 GPT / Work 分工

## GPT / Work

負責：

- Product
- Spec
- Acceptance Criteria
- Architecture
- Art Direction
- ADR
- Scope
- Review
- Codex Task Design

---

## Codex

負責：

- Repository
- npm
- Vite
- TypeScript
- Three.js
- Implementation
- Build
- Test
- Debug
- Diff

---

## Product Owner

負責：

- 核准需求
- 看 Plan
- 看 Diff
- 實際玩 Prototype
- 判斷生命感
- 決定下一 Phase
- 決定是否接受重大技術決策

---

# 29. 第一個 Codex 技術任務

第一個任務只做：

# Web Technical Spike

驗證：

1. Vite + TypeScript 建立成功
2. Three.js 正常 Render
3. 3D Scene 正常
4. Placeholder Character 正常
5. Idle / Walk State 可切換
6. Character 可移動
7. Orbit Camera 正常
8. Raycaster 可以點擊一個 Window Placeholder
9. `npm run typecheck` 通過
10. `npm run build` 通過

完成後：

> **先停止，不直接一路做完整 V0.1。**

Product Owner Review 後再進 Vertical Slice。

---

# 30. 第一個 Codex Prompt

```text
請在目前 Fox Life Web Repository 開始 Web Technical Spike。

請先完整閱讀：

1. docs/PRODUCT.md
2. docs/V0_1_WEB_SPEC.md
3. docs/VISUAL_DIRECTION.md（若存在）
4. 本 Project Handoff

本次只進行 Technical Spike。

技術：

- Vite
- TypeScript
- Three.js
- ES Modules
- npm
- 不使用 React

請先 Inspect 與 Think First。

先回報：

1. Repository 現況
2. Git 狀態
3. Node / npm 狀態
4. 預計建立的最小檔案
5. Spike Plan
6. 主要風險
7. 驗證方式

若環境正常，可以在精簡 Plan 後直接開始 Spike。

Spike 至少驗證：

- Vite Dev Server
- Three.js Scene
- Camera
- Renderer
- Lighting
- Placeholder Character
- Idle / Walk State
- Character Movement
- OrbitControls
- Window Placeholder
- Raycaster Click
- Type Check
- Production Build

不要：

- 做完整 V0.1
- 做正式角色模型
- 做 Eat / Sleep / Read
- 做 Needs
- 做 Save
- 做多角色
- 做大型 Framework
- 使用來源不明的外部 Asset

Spike 完成後請停止。

完成時回報：

1. 實際完成內容
2. 修改檔案
3. Type Check 結果
4. Build 結果
5. Smoke Test 結果
6. Browser 實際執行結果
7. 已知限制
8. Git Diff 摘要
9. 是否建議進入 V0.1 Vertical Slice

不要只宣稱完成，必須實際驗證。
```

---

# 31. 核心產品原則

> **Fox Life 應優先透過少量可組合系統，產生大量細小、自然、可觀察的生活瞬間，而不是單純堆疊功能或數值。**

---

# 32. Web Prototype 成功標準

最重要的不是：

- 有多少檔案
- 有多少 Class
- Shader 多厲害
- 架構多漂亮

而是：

```text
打開 Browser
↓
看到小房間
↓
看到狐狸自己生活
↓
點一下窗戶
↓
狐狸自然走過去觀察
↓
我想再看牠做下一件事
```

如果這件事情成立：

> Fox Life Web Prototype 就有繼續做下去的價值。
