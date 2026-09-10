# Fox Life Web — V0.1 Vertical Slice Spec

> 狀態：Approved  
> 日期：2026-09-10  
> Product Owner 已於 2026-09-10 核准本規格；本次僅更新核准紀錄，尚未授權開始 V0.1 Coding。實作須由後續獨立任務啟動。  
> 本文件中的要求與驗收項目均不代表已完成或已通過。

## 1. 依據與決策邊界

- [PRODUCT.md](PRODUCT.md)：產品方向的主要依據，尤其 §2.1、§10、§15、§24、§26、§30、§33。
- [TECHNICAL_SPIKE.md](TECHNICAL_SPIKE.md)：2026-09-10 已驗證的 Web 技術基線、測試證據與限制。
- [Project Handoff](../Fox_Life_Web_Project_Handoff.md)：§11–20、§21–25 的 V0.1 流程、微動畫、Camera、工程與驗收要求。
- [README](../README.md) 與現有 `src/`、`package.json`：核對現有模組與執行方式，不以程式碼取代產品決策。

本文件整理既有 PRODUCT V0.1 方向，不修改上游產品文件。PRODUCT 與 Handoff 頁首仍標示 Draft v0.1；本次依任務指定的已核准 V0.1 方向整理，本次核准僅適用於本 V0.1 規格，不據此宣稱整份長期願景已核准。PRODUCT 提到的視覺方向文件目前未見於專案，不假設其內容。

來源未明定的操作邊界，已隨本文件由 Product Owner 核准，在本文標為「V0.1 已核准執行規則」，供下一階段實作遵循。它們不增加新玩法。若後續 Review 改變範圍，先更新規格再實作。

## 2. Goal

證明一隻狐狸在小型 3D 房間中，即使玩家不操作，也能透過自主 Idle／Walk 與少量微動畫呈現生命感，讓玩家願意停下來觀看；玩家點窗後，狐狸能自然走到窗前觀察，再回到自己的日常。

唯一完整的產品切片：

```text
Autonomous Idle / Walk
→ Player Clicks Window
→ Character Walks to Window
→ Observe Environment
→ Return to Autonomous Idle / Walk
```

技術流程可運作是必要條件；角色是否有陪伴感、是否值得繼續觀看，仍需人工產品驗收。

## 3. Scope

| 項目 | V0.1 交付範圍 |
| --- | --- |
| 場景 | 一個暖色系微縮房間，地板、牆、單一互動窗戶與少量無互動的 placeholder 家具；保留清楚可走的區域 |
| 角色 | 一隻可辨識的程序化狐狸，約 2～3 頭身（以約 2.5 為方向）、大耳、短四肢、大尾巴、橘紅與奶油色、綠色吊帶褲 |
| 自主行為 | Idle／Walk，自主開始並持續交替，不需玩家啟動 |
| 玩家介入 | 僅點窗 → 走到窗前 → Observe → 恢復自主生活 |
| 生命感 | 至少兩種 Idle variation；呼吸、重心、視線、耳朵、尾巴的少量程序動畫 |
| 觀察工具 | 自由環繞、受限垂直角度、縮放、重設鏡頭與可隱藏 Debug |
| 平台 | Windows Desktop Browser，滑鼠操作，優先獨立 Chrome 驗收 |

不要求正式模型或資產管線。Handoff 的音效屬後段可選項，本切片不列為必要交付或驗收阻擋項，也不預設啟動音效開發。

## 4. Player Flow

1. 開啟頁面即看到房間與狐狸，預設為略高的三分之四構圖。
2. 不操作時，狐狸自行停留、微動、走動，再停留。
3. 玩家可拖曳環繞、滾輪縮放；這些操作不改變角色行為。
4. 玩家以滑鼠左鍵點擊可見的窗框或玻璃，觸發唯一的 Observe command。
5. 狐狸中斷當前自主意圖，從目前位置自然轉向並走到窗前站位。
6. 到達後面向窗外，停留並呈現可辨識的觀察動作。
7. 觀察結束，釋放玩家指令，返回自主 Idle，之後繼續自主 Walk。

關閉 Debug 後，仍應能從角色的移動、朝向與演出理解整個過程；不得只靠狀態文字表示 Observe 已發生。

## 5. Character State Flow

維持三個最小行為狀態：`Idle`、`Walk`、`Observe`。現有程式只有前兩者；新增 Observe 是下一階段工作。另以控制來源 `Autonomous / Player Command` 與目標區分自主走動與走向窗戶，無須建立大型行為框架。

| 當前狀態／來源 | 觸發條件 | 下一狀態／來源 | 必要結果 |
| --- | --- | --- | --- |
| Idle／Autonomous | 停留結束 | Walk／Autonomous | 選擇房內安全目標，步行前往 |
| Walk／Autonomous | 到達自主目標 | Idle／Autonomous | 停步並開始 Idle variation |
| Idle 或 Walk／Autonomous | 有效窗戶點擊 | Walk／Player Command | 清除舊自主目標，改以窗前站位為目標 |
| Walk／Player Command | 到達窗前站位並完成面向 | Observe／Player Command | 停止位移，開始觀察演出與計時 |
| Observe／Player Command | 觀察結束 | Idle／Autonomous | 清除 command／窗戶目標，恢復自主排程 |

V0.1 已核准執行規則：

- 若接收指令時已在窗前到達範圍內，可原地完成轉向後進入 Observe，不必先繞路。
- Observe 以 **4 秒**作為初始可調時長；從到達並面向窗戶後計算，不包含步行時間。演出與等待時間使用前景模擬時間。
- 到達使用小幅可調距離容差，不能靠瞬移一段距離完成；實作時依角色比例設定並記錄數值。
- 結束後先回 Idle，不強制退回起點或接續被取消的舊目標；下一次自主行走須能離開窗前。

## 6. Player Command Priority

玩家指令高於 Autonomous Action。不得因 Needs、Mood、Personality 或隨機判定拒絕；V0.1 也不建立這些系統。

- 在自主 Idle 時接受窗戶指令，不等待原停留時間耗盡。
- 在自主 Walk 時接受指令，取消原目標；不得先走完原路線才響應。
- 可有極短安全轉場，但不得瞬移、無故忽略或長時間無可見反應。
- 玩家指令從接受到 Observe 結束期間，自主排程不得覆寫目標或搶回控制權。

V0.1 已核准執行規則：接受後 **0.5 秒內**應開始可見的轉向或步行反應；行走與 Observe 中再次點同一窗戶視為同一個進行中指令，不排隊、不重啟、不延長 Observe 計時。完成後再次點擊可重新觸發。V0.1 不設指令佇列、取消按鈕或多目標仲裁。

## 7. Camera Requirements

- 沿用 OrbitControls；預設略高的三分之四、類等角構圖，不鎖成固定側視或正交視角。
- 左鍵拖曳旋轉，水平約 360°；滾輪縮放，設定最小／最大距離與垂直角度限制。
- 以房間中心為主要 orbit target，不持續追蹤角色；保留重設鏡頭能力。
- 在可操作角度與縮放範圍內避免鏡頭穿入牆體或地下；預設與主要觀察角度能辨識狐狸、窗戶與房間關係。
- 可採低牆、開放式屋頂或最小必要的場景配置調整維持可讀性。Spike 的低牆不是已完成的全角度遮擋策略；V0.1 必須實際檢查多個角度。
- 不要求任何角度下零遮擋，但不得讓主要觀察角度長時間失去角色，也不能隔著遮擋物點窗。
- Canvas 隨容器 resize，更新相機比例；以 1920×1080／16:9 為主要構圖，同時檢查縮小視窗，不寫死解析度。
- 拖曳窗戶是在操作鏡頭，不得誤發 Observe；Debug 操作不得穿透成場景指令。

## 8. Window Interaction

沿用 Raycaster 與 click／drag 區分。窗戶的玻璃與窗框共用一個 Observe 意圖，最近可見表面必須屬於窗戶；點空白、牆、角色或其他裝飾不發出指令。

窗戶需定義唯一的室內接近站位及觀察朝向。站位保留角色身體與尾巴空間，不在牆內；角色需朝向窗外，而非固定面向 Camera。Observe 可以透過頭部／視線輕移與身體停留表達，不要求新增窗外事件或模擬。

V0.1 可沿用直線移動，以場景配置保證所有自主活動位置到站位的線段可通行；家具不得擋在這些路徑上。若配置無法滿足，先調整位置或活動區域，不默默加入尋路／通用碰撞系統。不得穿牆、穿家具或卡在窗前完成假觀察。

Spike 的 hits 計數／玻璃換色只證明 raycast 命中，不能充當 Observe 完成條件。產品理解以狐狸實際反應為主；可保留命中計數供 Debug，不擴充通用互動 UI。

## 9. Life-feel / Micro-animation Requirements

- 程序化狐狸必須有清楚的頭、耳、四肢、臉部方向與大尾巴，不能只沿用難以辨識生命感的 capsule placeholder。
- Idle 至少兩種可辨識 variation，例如安靜呼吸與輕微重心／視線變化；它們是同一行為內的演出，不增加生活 Action。
- 呼吸、重心微移、視線微動、耳朵微動、尾巴微動都需可觀察，但幅度克制，避免所有部位同頻持續擺動。
- Walk 的腳步與身體動作需配合位移；起步、停步、轉向與狀態切換不得明顯跳姿或突然翻向。Spike 的直接設定角度需改善。
- Observe 需呈現「在看窗外」，有可辨識朝向與頭部／視線微動；不是把一般 Idle 改名。
- 自主停留時長與 Idle variation 應有有限變化，避免原本四點、固定兩秒的完全機械循環；仍只包含 Idle／Walk，不建立 Needs、Personality 或事件生成系統。
- 微動畫不得造成整隻角色逐漸滑移、腳底明顯離地或身體部件分離。

## 10. Debug Requirements

沿用可收合／隱藏的簡單 Debug panel，至少顯示：

| 欄位 | 要求 |
| --- | --- |
| Current State | Idle／Walk／Observe |
| Current Action | 能區分自主停留、自主走動、走向窗戶、觀察窗外 |
| Current Target | 無目標、自主目標位置或窗前站位；不得殘留已取消目標 |
| Control Source | Autonomous／Player Command |

保留既有位置、viewport、renderer 資訊與重設鏡頭；hits 可作輔助，不等於成功指令數。Debug 必須反映真正行為資料，不能自行推算假的狀態。關閉 Debug 不影響模擬；縮小視窗時仍能收合。無須建立 Debug console、時間控制器或大型監控框架。

## 11. Performance Target

Windows Desktop、1920×1080、滑鼠、**60 FPS target** 沿用 PRODUCT；這是目標，不是 Spike 已驗證結果，也不是任意硬體的保證。最低 CPU／GPU 尚未確立。

下一階段用 production build 在獨立 Chrome 前景分頁量測，記錄 CPU／GPU、OS、Chrome 版本、viewport、DPR／實際渲染尺寸、量測工具與結果。V0.1 已核准驗收取樣方式：暖機後至少連續 60 秒，涵蓋自主生活、完整 Observe 與 Camera 操作，記錄平均 FPS、frame-time 分布及明顯卡頓；若未接近 60 FPS 或有持續卡頓，列為未達目標並交由 PO Review，不以「有渲染」判定效能通過。

不為此導入效能框架。長時間記憶體穩定性、最低硬體與 context loss 恢復仍屬未驗證，未實測不得新增通過宣稱。

## 12. Technical Constraints

- 沿用 Vite + TypeScript + Three.js、ES Modules、npm、HTML／CSS，不重做引擎選型、不改用 React。
- 沿用 lockfile 與現有套件基線，不因規格整理升級依賴；版本差異與 bundle 警告見 §16。
- WebGL 2 為既有執行前提；保留初始化失敗提示、resize、背景分頁模擬暫停／delta cap、HMR 清理。
- 背景時間不累積生活進度，回到前景不得因大 delta 瞬移或跳過整段 Observe；這不構成 Offline Progress。
- 使用 primitive geometry、自建簡單材質；不下載來源不明模型，不要求 GLB、骨架或正式資產管線。
- 核心命名維持 Character／State／Movement，狐狸差異在外觀；不為未來多物種預建框架。
- 優先延伸現有 `src/Character.ts`、`src/WindowInteraction.ts`、`src/scene.ts`、`src/DebugPanel.ts`；`src/main.ts` 保持啟動與串接責任。只有在必要時拆分，不照 Handoff 建議目錄一次建立全部模組。
- 產物維持可純靜態建置；本任務不含發布、遠端服務、push 或 merge。

## 13. Explicit Non-goals

- V0.2 的 Eat／Sleep／Read，以及 Cook／Clean／Play 等其他生活行為。
- 完整 Furniture Interaction System、通用 Action Graph、ECS、Plugin／DI 框架或全面 Event Bus。
- Needs、Mood、Personality、Relationship、多角色、多物種與選角。
- Save／Load、遊戲時鐘、Offline Progress、回訪模擬、日夜／天氣系統。
- WASD、搖桿、逐步點地移動、玩家 Avatar、家具擺放／編輯、多房間或大地圖。
- Login、Backend、Database、Cloud Save、多人連線、社交、經濟、商店、任務、成就、戰鬥。
- 正式高品質模型、寫實毛髮、複雜 shader、Visual Asset Spike 或正式 Audio System。
- 手機／觸控支援、全瀏覽器相容性承諾、PWA、Steam／桌面包裝、平台發布。

## 14. Acceptance Criteria

下列項目全部是下一階段待驗收；不得沿用 Spike 的勾選結果直接宣告 V0.1 通過。

| ID | 驗收操作 | 通過條件 |
| --- | --- | --- |
| AC-01 | 安裝、啟動 dev、typecheck、build、preview | `npm install`、`npm run dev`、`npm run typecheck`、`npm run build`、`npm run preview` 成功；獨立 Chrome 能執行 production，無主要 Console Error；警告如實記錄 |
| AC-02 | 開啟後至少 60 秒不操作 | 狐狸自行 Idle／Walk；可辨識造型、兩種 Idle variation 與五類微動；不只原四點定時巡走演示 |
| AC-03 | 分別在自主 Idle 與 Walk 點窗 | 兩者皆接受；依 §6 時限開始反應，舊自主意圖被取代，無瞬移或等待整段舊動作 |
| AC-04 | 從不同自主位置點窗，完成至少三次完整流程 | 可通行路線走到室內站位、面向窗外、Observe，再回 Idle／Walk；無穿模、卡住或玩家指令殘留 |
| AC-05 | 走向窗戶與 Observe 期間連點窗戶 | 不排隊、不重啟、不延長計時、不被自主行為覆寫；完成後新點擊可再次執行 |
| AC-06 | 點空白／牆／角色、拖曳窗戶、點被遮擋窗戶、操作 Debug | 不誤觸 Observe；可見玻璃與窗框皆能觸發同一行為 |
| AC-07 | 水平完整環繞、測垂直與縮放邊界、重設、resize | Camera 限制有效，無穿牆／地下；主要角度保持可讀，Canvas 比例正確，重設可恢復構圖 |
| AC-08 | 觀察每次狀態轉換並切換 Debug | 狀態、動作、目標、來源一致且清除正確；隱藏後流程照常，畫面本身能表達 Observe |
| AC-09 | 在走向窗戶及 Observe 時切到背景再返回 | 回前景不中斷到錯誤狀態、不因背景時間瞬移／跳過觀察；可完成並回自主生活 |
| AC-10 | 依 §11 量測 production | 提供可追溯數據並評估 60 FPS 目標；未達或未測須標示，不可宣稱已通過 |
| AC-11 | Product Owner 依 §15 實際體驗 | 生命感、觀察舒適度與互動理解獲 PO 明確接受；技術通過不能替代 |

## 15. Manual Product Acceptance

由 Product Owner 在 Debug 隱藏下實際體驗，不以自動化、截圖或 Codex 自評取代。

1. **不操作觀察 1～2 分鐘**：狐狸是否像在自己的小家活動？是否有自然停頓與細節，而非機械循環？是否願意多看一會？
2. **自由環繞與縮放**：角色是否仍是焦點？主要角度是否舒適、可讀？是否適合持續觀看？
3. **在 Idle 與 Walk 各點一次窗戶**：是否能理解「我選擇一個生活行為，狐狸就去做」？轉向、步行與停步是否自然？
4. **觀看 Observe 到結束**：是否看得出牠在看窗外？節奏是否適當？返回自主生活是否連續？
5. **再次觸發**：是否會想再看一次或繼續等待下一段活動？此問題不授權新增其他事件。

記錄 review 日期、環境／版本、各項「接受／需調整／未驗收」及具體觀察。若生命感不成立，先在本切片的動作、時序、造型、鏡頭與構圖中調整，不以 V0.2 功能補救。

## 16. Known Technical Baseline inherited from TECHNICAL_SPIKE.md

本節是 **2026-09-10 Spike 的歷史驗證紀錄摘要**，不是本文件新增的測試結果。詳細證據以 [TECHNICAL_SPIKE.md](TECHNICAL_SPIKE.md) 為準。

| 項目 | 已有／已驗證基線 | 限制與 V0.1 差距 |
| --- | --- | --- |
| 工具與版本 | Node 24.19.0、npm 11.17.0；three 0.186.0、vite 8.2.2、typescript 7.0.2、@types/three 0.185.4 | runtime／types minor 未完全對齊；僅當時使用的 API 通過測試 |
| 建置 | npm install、dev、typecheck、build、preview 成功 | JS 562.40 kB（gzip 141.04 kB），單 chunk 超過 500 kB 警告仍在；載入成本未實測 |
| Browser | Codex In-app Browser 實際測過 dev／production，最終 production error／warn logs 為空 | 不是獨立 Chrome 或跨瀏覽器驗收；V0.1 需重新驗證 |
| 場景與外觀 | 地板、低牆、窗框／玻璃、光照／陰影、帶眼鼻雙腳的 primitive Character 可渲染 | 不是完成的狐狸造型；正式模型未做 |
| 自主行為 | Idle／Walk、固定四點、固定兩秒停留、1.1 單位／秒移動與基本呼吸／腳步 | 不代表生命感成立；沒有兩種 Idle variation 的產品驗收 |
| 移動與朝向 | 直線移動，路線保留角色半徑；local +Z 為正面，直接設定轉向角度 | 無尋路／通用碰撞，尚無自然轉場與窗前站位行為 |
| Camera | Orbit、zoom、reset 已實際操作 | 窗戶浮於低牆上；無完整牆體遮擋策略 |
| Window | 點框／玻璃命中，hits 增加、玻璃換色；拖曳／空白不增加 hits | 只有 hit，完全未實作 Observe command、Walk to Window 或 Observe |
| Resize／Debug | 531×587、1280×720、約 1920×1080 仍渲染；Debug 可收合，約每秒更新十次 | 窄視窗可能遮擋；尚需新增 action／control source 等切片資料；resize 成功不代表 1080p 效能達標 |
| 執行保護 | 初始化失敗提示、背景分頁暫停／delta cap、HMR 資源釋放已提供；需 WebGL 2 | 未做專門 soak test；未驗證 context loss 恢復 |
| 效能與平台 | 桌面優先，保存 1280×720 production 截圖 | 未量測 60 FPS、長時間記憶體或最低 GPU；未驗證手機、觸控、獨立 Chrome／Firefox／Safari |

Spike 必要項目已通過，只能支持延續目前技術主線；不能推出產品生命感、完整窗戶流程或效能目標已完成。

## 17. Review Gate 與後續執行交接

**Product Owner Review 已完成，規格已核准；本次不開始 Coding。**

### Product Owner Approval Record

- 核准日期：2026-09-10。
- 核准者：Product Owner（本次對話中的使用者）。
- 核准依據：Product Owner 於本次對話明確核准目前 V0.1 Vertical Slice Spec，並要求只更新文件核准紀錄。
- Review 結果：**Approved**，涵蓋本規格與下列執行規則：
  - Observe 初始時長 4 秒。
  - 玩家指令接受後 0.5 秒內產生可見反應。
  - 進行中的相同 Window Observe 指令不排隊、不重啟、不延長。
  - V0.1 不建立 command queue 或 cancel system。
  - V0.1 保留直線移動，以場景配置確保路徑可通行。
  - Performance 依 §11 進行至少連續 60 秒 production 測量；60 FPS 為 target，不視為未知硬體的絕對保證。

本次核准不修改其他產品 Scope，也不代表實作完成、技術驗收通過或 §15 Manual Product Acceptance 已完成。下一階段 Coding 仍待 Product Owner 另行下達實作指示。

Product Owner 另行啟動下一個獨立實作任務後，依序：

1. 重新檢查 repository、Git 狀態與相關模組，提出最小 plan、受影響檔案與風險。
2. 完成玩家 command → 窗前移動 → Observe → 自主恢復，補齊 Debug 真實資料。
3. 在相同範圍內完成狐狸程序造型、微動畫、自然轉場與 Camera／場景可讀性。
4. 執行 typecheck、build、production Chrome smoke test、§14 驗收與效能取樣。
5. 回報 Changed Files、Diff Summary、Build／Test Result、Known Limitations，交 Product Owner 依 §15 人工驗收；不自動 push／merge 或進入 V0.2。
