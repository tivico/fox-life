# 🦊 Fox Life — PRODUCT.md

> 狀態：Draft v0.1  
> 用途：產品方向與核心體驗的單一來源（Product Source of Truth）  
> 原則：本文件描述「要做什麼、為什麼做、做到什麼算成功」，不負責記錄詳細技術實作。  
> 技術選型、模組設計、測試策略請分別放在 `ARCHITECTURE.md`、`ENGINEERING_PLAYBOOK.md` 等文件中。

> 2026-10-17 實作增補：依繼續實作並體驗產品樣貌的需求，在既有 V0.2 上加入基本 UI Feedback、四種生活邀請、操作說明、靜靜陪伴與本機生活日記。此輪以 §17 的玩家互動體驗為方向，規格與界線見 [互動體驗預覽](INTERACTION_PREVIEW.md)。日記只保存實際觀察到的片段，不代表已完成 §19 的 Save／Time／Offline；既有 PO Acceptance 狀態維持 Pending。

> 同日生活細節增補：依使用者明確指定，加入自主／玩家邀請打掃、玩毛線，以及閱讀打瞌睡與離床後伸懶腰。此輪落實 §5.2 的可觀察小事件，界線與驗證見 [更多生活細節](DAILY_LIFE.md)，不預先引入 Needs 或情緒拒絕機制。

> 2026-10-18 房間擴建增補：依使用者指定，原場景定位為臥室，新增相連的客廳與跨房間聚焦鏡頭。此次明確擴充 §24 早期「多房間」限制；先實作臥室＋客廳、自主往返與客廳玩毛線。其他後續階段不因此提前完成，詳見 [房間擴建](ROOM_EXPANSION.md)。

> 同日客廳生活增補：依使用者確認，主入口的玩毛線改為做運動；新增看電視、窩沙發、喝茶、聽音樂與整理沙發。下方邀請依角色實際所在房間切換，客廳需要有自己的動作與家具互動。先做本機版本供確認，確認後才發布，見 [客廳生活動作](LIVING_ROOM_ACTIONS.md)。

> 2026-10-23 摸摸頭增補：依使用者指定，加入點狐狸本身的互動。狐狸依當下在做的事給一個不中斷生活的小反應（靠過來、看一眼、抖耳朵），摸太多次會害羞轉頭；寫進日記，不加需求值或拒絕機制。這是 §5.2 與 §27 Emotional Attachment 的延伸，見 [摸摸頭](PETTING.md)。使用者同時決定下一輪加入第二位角色：一隻白狐狸（§20 V0.6）；§29 的相關開放問題（稱呼、邀請對象、雙人動作、關係是否數值化）待使用者決定後再更新本文件。

> 同日第二位角色增補：依使用者看過雛形後確認，加入白狐狸「小白」，原本的狐狸稱「小橘」；此次明確擴充 §24 早期「多角色」限制，對應 §20 V0.6。使用者的決定：**兩隻都無性別感**，差異只來自比例與顏色，不用配件，也不用帶性別聯想的穿著；**點哪隻就是在跟誰說話**，摸頭的同時選中牠，動作欄、數字鍵、前往按鈕與跟隨鏡頭都切到牠，另一隻自己生活；第一個雙人動作是**一起睡覺**（雙人床的兩顆枕頭）；**沒有關係數值**，關係只以可觀察的片段與日記呈現（§5.5）。兩隻不搶同一個地方、小白會讓路、日記記名字，細節見 [第二位角色小白](COMPANION_PROTOTYPE.md)。§29 其餘開放問題（第二個雙人動作、伴侶是否由玩家設定、第二個物種）仍未決定。

> 同日雙人互動增補：依使用者要求，房間面板可以收合；有兩隻之後，跟隨鏡頭改成**切換狐狸**，點面板上的名字（或摸頭）就跟拍那隻，鏡頭從房間中央**偏向牠**；並新增兩隻一起做的動作。目前做了**碰碰鼻子**與**一起看窗外**，使用者指定一起看窗外時要**手牽手**。兩隻都空著又在同一個房間時，偶爾也會自己湊在一起做。這兩個動作的選擇與自己湊在一起的頻率是雛形預設，待使用者確認；仍沒有關係數值（§5.5）。細節見 [兩隻一起做的事](PAIR_ACTIONS.md)。§29 其餘開放問題（伴侶是否由玩家設定、第二個物種）仍未決定。

---

> 2026-10-26 輕量需求與雙人沙發增補：使用者同意先做瀏覽器驗收、輕量需求／個性偏好與一起坐沙發看電視。本機新增飢餓與精神兩項需求，只影響自主選擇；小橘偏閱讀與喝茶，小白偏花園，屬可調整的初始設定。沒有需求條、懲罰或以需求拒絕玩家邀請。雙人電視使用兩個座位、一個遙控器，關係仍不數值化。需求不持久化、不補算離線時間；瀏覽器驗收仍受工具連線／網址辨識限制而未完成，不能視為使用者已驗收新畫面。細節見 [需求與雙人電視](NEEDS_AND_SHARED_TV.md)。

# 1. Product Vision

**Fox Life** 是一款以小型 3D 箱庭為舞台的 **Cozy Idle Life Simulation（療癒型放置生活模擬遊戲）**。

玩家不需要持續操作角色。

角色會在自己的家中：

- 自主移動
- 吃飯
- 睡覺
- 閱讀
- 休息
- 打掃
- 玩耍
- 使用家具
- 與其他角色互動

玩家的主要樂趣不是「操控角色完成任務」，而是：

> **觀看角色自己生活，偶爾介入牠們的日常，並在每次回來時發現新的生活片段。**

---

# 2. Core Fantasy

Fox Life 想提供的核心幻想是：

> **「我有一個小小的家，裡面的角色即使我不操作，也會好好生活。」**

玩家像是在照看：

- 一個微縮世界
- 一個可愛的生活箱庭
- 一群有自己個性與關係的小角色

玩家可以遙控角色接下來要做的生活行為，但不需要用方向鍵控制每一步移動。

玩家更接近：

- 觀察者
- 陪伴者
- 居家布置者
- 事件觸發者
- 角色行為的遙控者

---

# 2.1 Player Role & Emotional Relationship

玩家位於世界之外，以自由環繞的上帝視角觀看角色，不在房間中擁有可操作的 Avatar。

玩家的主要行為是：

- 觀看角色自主生活
- 直接觸發事件或選擇角色接下來的生活行為
- 透過家具、物品與環境向角色下達行為指令
- 觀賞角色走向目標並完成對應行為

因此玩家是：

> **玩家是世界外的觀察者、事件觸發者，也是角色生活行為的遙控者。**

主角與玩家之間的情感關係刻意保持開放。玩家可以把角色感受為：

- 遊戲世界中的自己或自我投射
- 想照顧與陪伴的孩子
- 有自己個性的寵物或生活夥伴

產品不需要強迫玩家只能採用其中一種解讀。共同核心是：

> **角色是玩家在遊戲中的情感投射與陪伴對象；沒有收到指令時可以自行生活，收到玩家觸發的行為後則直接執行。**

玩家的遙控方式是「選擇行為或觸發事件」，而不是使用方向鍵、搖桿或逐步點地控制角色的移動路徑。Needs、Mood 與 Personality 可以影響角色平時的自發行為與演出差異，但不作為拒絕玩家指令的機制。

這項定位不代表玩家是故事中具名的神祇，也不要求建立神力、信仰或上帝模擬玩法。「上帝視角」描述的是觀察與介入位置。

---

# 3. Genre Positioning

Fox Life 的產品定位為：

```text
Cozy Idle Game
+
Life Simulation
+
Virtual Pet / Companion Game
+
Miniature Dollhouse
+
Light Sandbox Interaction
```

它不是：

- 傳統戰鬥遊戲
- 高壓經營模擬
- 重度數值放置遊戲
- 完全手動操控角色的冒險遊戲
- 純裝潢模擬器

---

# 4. Product Inspirations

## Adorable Home / 萌宅物語

主要參考：

- 放置節奏
- 回訪動機
- 居家生活感
- 伴侶系統
- 輕量互動
- 療癒氛圍

Fox Life 希望補強：

- 角色行為的「過程」
- 更連續的自主生活
- 更多可觀察互動
- 家具與角色行為的關聯
- 更豐富的伴侶小事件
- 玩家可以輕度介入生活，而不是只等待結果

---

## Animal Crossing 類型的生活模擬作品

主要參考：

- 動物角色的親和力
- 2～3 頭身的可愛比例
- 圓潤、簡化、易讀的角色設計
- 日常生活感
- 家具與場景的吸引力
- 低壓、療癒的玩家體驗

不追求：

> 複製任何既有角色、介面或美術設計。

---

## Woodo

主要參考：

- 微縮 Diorama / 箱庭式構圖
- 精緻小場景
- 舒服的視覺節奏
- 柔和光影
- 「想停下來多看幾秒」的畫面吸引力

不採用：

- 木製玩具作為核心視覺識別
- 直接模仿 Woodo 的材質語言

---

# 5. Core Product Pillars

Fox Life 的核心產品支柱目前定義為：

## 5.1 自主生活 — Autonomous Life

角色不是等待玩家命令。

即使玩家不操作，角色也會：

```text
Idle
↓
產生需求 / 意圖
↓
選擇行為
↓
移動到目標
↓
執行行為
↓
回到日常
```

核心目標：

> **角色要讓人感覺「牠正在生活」，而不是播放幾段動畫。**

---

## 5.2 可觀察的小細節 — Observable Micro-events

Fox Life 應優先透過小事件建立生命感。

例如：

- 吃飯前聞一下食物
- 看書看到睡著
- 尾巴掃到東西
- 打掃途中休息
- 吃到喜歡的東西露出特別反應
- 下雨時跑去看窗外
- 心情不好時自己待在角落
- 回家後先伸懶腰
- 坐著發呆
- 睡覺時翻身

這些稱為：

# **Micro-events / Micro-interactions**

---

## 5.3 玩家遙控介入 — Player-directed Actions

玩家可以影響生活，但不需要微操。

例如：

```text
點床
↓
觸發睡覺行為
↓
走向床
↓
Sleep
```

或：

```text
放置新家具
↓
開啟新的 Action / Micro-event
```

玩家的操作應該是：

> 「選擇接下來要發生的生活行為」

而不是：

> 「用方向鍵控制角色每一步」。

---

## 5.4 家具就是玩法 — Furniture as Gameplay

家具不只是裝飾品。

每個重要家具都應該思考：

- 可以做什麼？
- 可以觸發哪些行為？
- 單人 / 雙人？
- 是否能產生不同 Micro-events？

例如：

```text
雙人沙發
↓
Sit
Talk
Nap
Cuddle
Argue
Make Up
```

因此：

> **新增一個家具，最好同時增加新的生活可能性。**

---

## 5.5 伴侶生活 — Relationship Through Moments

後期加入第二位角色後，關係不應只是一個數值。

玩家應該能「看到」關係。

例如：

- 一起吃飯
- 一起睡覺
- 一起看窗外
- 一隻幫另一隻拿東西
- 靠肩
- 鬧脾氣
- 搶座位
- 安慰對方
- 帶小禮物回家
- 一起整理房間

關係系統的核心原則：

> **Relationship should be observable, not only numerical.**

---

## 5.6 回訪驚喜 — Return & Discover

玩家離開一段時間後再次開啟遊戲時，應該有：

> 「牠們剛剛發生什麼事？」

的感覺。

長期可包含：

- 世界狀態變化
- 心情變化
- 小事件
- 帶回家的物品
- 角色關係變化
- 新的生活片段
- 收藏紀錄

回訪動機不是只靠：

> 收資源。

而是：

> **回來看看生活發生了什麼。**

---

# 6. Core Design Principle

Fox Life 最重要的內容策略：

# **少量可組合系統 → 大量生活片段**

例如只有：

```text
2 Characters
8 Actions
10 Furniture Types
5 Mood States
```

也應能組合出很多不同情境。

因此新增 Feature 前應優先問：

> **「這個功能能不能產生更多自然、有趣、可觀察的生活片段？」**

如果答案只是：

> 「增加一個數值。」

但沒有帶來新的玩家體驗或角色行為，優先級應降低。

---

# 7. Character Direction

## 第一位角色

初期主角為：

# 🦊 Fox

角色方向：

- 2～3 頭身
- 大頭
- 短四肢
- 大耳朵
- 大而蓬鬆的尾巴
- 圓潤輪廓
- 表情清楚
- Stylized
- 非寫實毛髮
- Friendly
- Cozy

狐狸只是第一個角色。

V0.1～V0.6 固定以狐狸作為第一位角色，不在 Prototype 階段加入選角或多物種功能。V0.7 才加入第二種 Species，驗證產品擴充性與核心架構。

核心產品設計不要假設：

> 遊戲永遠只有狐狸。

---

# 8. Multi-character Vision

中期目標：

```text
Character A
+
Character B
```

允許：

- 自主行為
- 個別需求
- 個別偏好
- Pair Actions
- Relationship Moments

未來角色可以是：

- 伴侶
- 室友
- 好朋友

初期產品願景以：

> **伴侶型生活互動**

為主要方向。

---

# 9. Multi-species Vision

更後期可加入：

```text
🦊 Fox
🐰 Rabbit
🐱 Cat
🐶 Dog
...
```

不同物種可以具有：

- 不同外觀
- 不同動畫
- 不同性格傾向
- 不同行為偏好
- 少量 Species-specific Micro-events

但核心生活系統應保持共用。

---

# 10. World & Environment Direction

Fox Life 的世界採：

# **Cozy Miniature Life Sim**

視覺與空間核心：

- 小型 3D 箱庭
- Dollhouse / Diorama 構圖
- Cozy Home
- 微縮世界
- 柔和光影
- 清楚可讀的家具與角色
- 溫暖但不過度甜膩
- 預設採略高的三分之四、類等角構圖
- 玩家可自由環繞與縮放，不鎖死為正交或固定側視鏡頭
- 房間構圖需要在多個環繞角度下保持角色可見與空間可讀

---

# 11. Found-object Storytelling

Fox Life 可以保留：

> **森林撿拾物 + 人類遺失小物**

作為世界觀特色，但不要讓整體變成純樹洞或木製玩具世界。

推薦比例：

```text
70% Cozy Home
+
30% Found-object Storytelling
```

例如：

- 正常柔軟床鋪
- 布製沙發
- 陶瓷器皿
- 植物
- 地毯

搭配少量：

- 鈕扣小盤
- 人類遺失的小吊飾
- 小鐵盒
- 舊車票
- 瓶蓋
- 小玻璃瓶
- 撿回來的小物

核心作用：

> 讓玩家偶爾意識到「這是一個小小角色眼中的大世界」。

---

# 12. Visual Style Summary

目前視覺關鍵字：

```text
Cozy Stylized 3D
Miniature Diorama
Chibi Animal Characters
Rounded Shapes
Soft Matte Materials
Warm Natural Palette
Pastel Accents
Gentle Lighting
Soft Shadows
Tiny Cozy Home
Wholesome Life Sim
Cute Everyday Props
Forest Cottage Atmosphere
Small-scale World
Clean Readable Silhouettes
Cinematic Isometric-like Default View
Free-orbit Camera
Non-photorealistic
```

避免：

```text
Photorealistic Fur
Realistic Animal Anatomy
Wooden Toy Aesthetic
Plastic-looking Materials
Glossy Plastic Surfaces
Direct Visual Imitation of Existing Games
Overly Saturated Colors
Overly Detailed Environments
Wood-dominant Toy Look
```

詳細美術規範未來放入：

```text
ART_BIBLE.md
```

目前已確認的 V0.0 視覺基準與概念素材記錄於：

```text
V0_0_VISUAL_DIRECTION.md
```

---

# 13. Core Gameplay Loop — Early Version

最初的 Gameplay Loop：

```text
玩家開啟遊戲
↓
觀察角色現在正在做什麼
↓
角色自主生活
↓
玩家偶爾點擊家具 / 放置物品 / 影響環境
↓
產生新的 Action / Micro-event
↓
角色繼續自主生活
↓
玩家離開
↓
稍後回來查看新的生活狀態
```

---

# 14. Long-term Idle Loop

後期可發展：

```text
Play
↓
Interact
↓
Leave
↓
Offline Time Passes
↓
Characters Continue Life Simulation
↓
Return
↓
Discover New State / Events
↓
Interact Again
```

---

# 15. MVP — V0.1 Goal

V0.1 不追求完整放置遊戲。

目標只有：

# **證明角色「活著」這件事是否成立。**

最小內容：

- 一個小型房間 / 小屋
- 一隻狐狸
- Idle
- Walk
- 點擊窗戶後執行 Observe Environment
- 自由環繞與縮放 Camera
- 基礎環境
- 少量程序動畫

V0.1 包含一個刻意限制範圍的遙控事件：

```text
Click Window
↓
Fox Walks to Window
↓
Observe Environment
```

這個事件用來驗證玩家作為遙控者的體驗，不代表 V0.1 要建立完整 Furniture Interaction System。角色收到玩家觸發後直接執行，不依 Needs、Mood 或 Personality 拒絕。

V0.1 成功條件：

> **玩家不操作時，仍願意看角色在房間裡活動一會。**

---

# 16. V0.2 — Basic Life

加入：

- Eat
- Sleep
- Read

加入家具：

- Bed
- Food / Dining Area
- Bookshelf / Reading Area

成功條件：

> 玩家可以清楚辨認角色正在做不同的生活行為。

---

# 17. V0.3 — Interaction

加入：

- Furniture Interaction
- 玩家觸發 Action
- 基本 UI Feedback

V0.3 將 V0.1 單一、限定的窗戶觸發，擴充為可重用的 Furniture／Interaction 系統。

成功條件：

> 玩家可以透過環境遙控角色的生活行為，而不是使用方向鍵逐步控制移動。

---

# 18. V0.4 — Needs & Preference

初步加入：

- Hunger
- Energy
- Mood
- Preferences

讓角色行為：

> 從完全 Random，變成具有簡單理由。

---

# 19. V0.5 — Save / Time / Idle

加入：

- Game Clock
- Save
- Load
- Offline Progress

成功條件：

> 玩家離開遊戲後重新開啟，世界能合理延續。

---

# 20. V0.6 — Companion

加入第二位角色。

至少驗證：

- 兩個 Character 可獨立生活
- 可以共享空間
- 可以觸發 Pair Action
- 不需要重寫核心 Character System

---

# 21. V0.7 — Multi-species Validation

加入第二種 Species。

目的不是大量增加角色。

而是驗證：

> 核心架構是否真的沒有把狐狸寫死。

---

# 22. Target Player Experience

玩家打開 Fox Life 時，希望感受到：

- 放鬆
- 可愛
- 溫暖
- 有陪伴感
- 沒有壓力
- 有一點好奇
- 想觀察角色
- 想看看下一個小事件
- 想幫角色把家變得更舒服

不是：

- 怕漏掉 Daily
- 怕效率不夠
- 被大量紅點追著跑
- 需要一直 Grind
- 被迫長時間操作

---

# 23. Product Tone

Fox Life 應該：

- Gentle
- Warm
- Playful
- Quiet
- Cute
- Wholesome
- Slightly Humorous

可以有：

- 小失敗
- 小尷尬
- 小脾氣
- 可愛衝突

不需要所有角色永遠：

> 完美、快樂、沒有情緒。

適度的小摩擦反而能增加生命感。

---

# 24. Non-goals — Early Stage

Prototype 初期不做：

- Multiplayer
- Online Social
- Backend
- Login
- Cloud Save
- 商店系統
- 大型經濟系統
- 複雜 Crafting
- 大地圖
- 多房間
- 多角色
- 多 Species
- 完整 Relationship System
- 天氣系統
- 任務系統
- 成就
- Battle
- 高品質毛髮 Shader

理由：

> **先驗證核心陪伴與生活體驗。**

---

# 25. Monetization

目前：

# **未決定。**

現階段不以 Monetization 驅動產品設計。

未來如果進入商業化階段，應重新評估：

- Premium Game
- Steam 一次買斷
- Mobile Premium
- Cosmetic DLC
- Expansion

應避免在 Prototype 階段加入：

- 強迫 Daily
- Pay-to-Win
- 能量限制
- 過度廣告
- 為課金而設計的摩擦

---

# 26. Target Platforms

第一優先平台：

- Windows Desktop

Prototype 與第一階段體驗應先以 Windows Desktop 的操作、16:9 構圖與效能為基準。

V0.1 暫以 1920×1080、滑鼠操作與 60 FPS 為設計目標；最低硬體基準仍待實機測試後確認。

長期再考慮：

- Steam 發行
- macOS
- Android
- iOS / App Store

但：

> **平台發布不是 Prototype 階段的核心任務。**

---

# 27. Product Success Criteria

Prototype 階段不先用營收衡量。

優先觀察：

## Character Appeal

玩家是否：

> 喜歡看角色？

---

## Life Illusion

玩家是否覺得：

> 角色有自己的生活？

---

## Curiosity

玩家是否會想：

> 「牠接下來會做什麼？」

---

## Interaction Desire

玩家是否會：

> 想點家具看看會發生什麼？

---

## Return Desire

玩家是否會：

> 想過一段時間再回來看看？

---

## Emotional Attachment

中長期最重要：

> 玩家是否開始對角色產生陪伴與感情？

---

# 28. Product Decision Filter

任何新 Feature 都可以用以下問題判斷：

1. 它是否增加角色生命感？
2. 它是否增加新的 Micro-events？
3. 它是否讓玩家更想觀察角色？
4. 它是否增加合理的玩家介入方式？
5. 它是否強化伴侶 / 關係互動？
6. 它是否提供回訪理由？
7. 它是否可以和既有系統組合？
8. 它是否值得增加 Complexity？

如果大多數答案是「否」：

> 暫時不做。

---

# 29. Open Product Questions

目前仍需要逐步決策：

- 第二位角色如何加入？
- 「伴侶」是否由玩家設定？
- Relationship 是否需要明確數值？
- Offline Progress 要模擬到多細？
- 家具如何取得？
- 是否需要貨幣？
- 是否需要收藏圖鑑？
- Found Objects 是否成為正式玩法？
- 是否需要日夜循環？
- 是否需要季節？
- Mobile 與 Desktop UI 如何兼容？
- 是否存在故事 / Narrative？
- 是否需要角色對話系統？

這些目前全部視為：

# **Open Questions**

不應讓 AI 自行默認答案。

---

# 30. Product Governance

本文件是產品方向的主要依據。

當需求有重大改變時：

```text
新需求
↓
Product Discussion
↓
更新 PRODUCT.md
↓
必要時建立 ADR
↓
更新 Architecture
↓
才進入 Implementation
```

不要：

```text
聊天中想到
↓
直接叫 Agent 寫
↓
程式碼變成永久決策
```

---

# 31. One-sentence Product Definition

> **Fox Life 是一款 3D Cozy Idle Life Simulation，讓玩家觀看可愛動物角色在微縮小家中生活，透過家具與環境遙控角色的生活行為，並從細小、自然且可組合的生活事件中建立陪伴感、伴侶互動與持續回訪的期待。**

---

# 32. Core Product Principle

> **Fox Life 應優先透過少量可組合系統，產生大量細小、自然、可觀察的生活瞬間，而不是單純堆疊功能或數值。**

---

# 33. Current Priority

目前不是：

> 做完整放置遊戲。

目前真正要驗證：

```text
小型 3D 空間
+
一隻角色
+
自主 Idle / Walk
+
少量生命感動畫
↓
「我願不願意看牠繼續生活？」
```

只要這件事成立，Fox Life 才值得繼續往：

```text
Interaction
↓
Needs
↓
Idle
↓
Companion
↓
Relationship
↓
Multi-species
```

發展。
