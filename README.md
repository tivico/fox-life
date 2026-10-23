# Fox Life Web — 小狐狸的慢日子

一隅小屋，一隻狐狸。以 Three.js 製作的療癒型生活模擬網頁：狐狸在相連的小家裡自己生活，玩家偶爾送一個小邀請。

- 線上版：<https://tivico.github.io/fox-life/>
- 程式碼：<https://github.com/tivico/fox-life>
- 過去的里程碑：[變更紀錄](docs/CHANGELOG.md)

## 目前狀態（2026-10-23）

最新發布為陽台小花園、廚房與雙人床（`310103d`）。

### 小家與生活邀請

四個空間由門口與玻璃門相連，狐狸會自主往返。下方動作欄跟著狐狸**實際所在的房間**切換，數字鍵依序對應；也可以直接點家具、花圃或料理檯邀請牠。

| 房間 | 邀請 |
| --- | --- |
| 臥室 | 看風景、睡個覺、讀本書、吃點心、掃掃地 |
| 客廳 | 看電視、窩沙發、喝杯茶、做運動、聽音樂、整理沙發 |
| 陽台花園 | 澆澆花、看蝴蝶、坐著吹風 |
| 廚房 | 切切蔬菜、煮鍋暖湯、烤餅乾 |

除了「看風景」只在邀請時發生，其他動作狐狸都會自己去做。另有閱讀時打瞌睡、睡醒或散步後伸懶腰等小插曲。

### 介面

- **鏡頭**：預設跟隨狐狸，也能固定查看全屋或單一房間；拖曳環繞、滾輪縮放、「重設視角」復原。手動選房間只改鏡頭，「邀請牠來」或「去○○ →」才會讓狐狸移動。
- **近況與日記**：中文近況、生活片段進度，以及收到邀請／忙碌中的回饋。右上「生活日記」保存最近 40 則實際發生的片段，存在此瀏覽器的 localStorage。
- **靜靜陪伴**：隱藏介面，按 `Esc` 或右下按鈕返回；「？」開啟玩法說明。
- **小屋聲音**：原創輕鋼琴配樂、環境音與動作音效，三者音量分開調整，預設關閉。
- **其他**：小螢幕會調整構圖；支援減少動態效果（`prefers-reduced-motion`）；切到背景時暫停，回來不累積離線進度。

### 驗證與待辦

- 2026-10-23：typecheck、115 項測試與正式建置全部通過。
- 推送到 `main` 後，GitHub Actions 會先跑測試再部署，測試或建置失敗就不部署。
- 尚待人工驗收：獨立 Chrome 的背景與效能量測（[V0.1 Chrome 人工補驗](docs/V0_1_CHROME_MANUAL_ACCEPTANCE.md)），以及 V0.2 整體的 PO 驗收（[V0.2 整體驗收](docs/V0_2_OVERALL_ACCEPTANCE.md)）。
- 尚未實作：需求值（Needs）、存檔／時間／離線模擬、多角色、居家布置。產品方向見 [PRODUCT](docs/PRODUCT.md)。

## 怎麼執行

需要 Node.js 24 以上（CI 使用 24）。測試直接用 Node 執行 `.ts` 原始碼，較舊的 Node 版本無法執行。

```sh
npm install
npm run dev -- --port 5173 --strictPort
```

開啟 <http://127.0.0.1:5173/>。伺服器只監聽 127.0.0.1，終端按 Ctrl+C 停止。

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發伺服器 |
| `npm run typecheck` | TypeScript 檢查 |
| `npm test` | Node 內建測試（`tests/*.test.mjs`），約需 1 分鐘 |
| `npm run build` | typecheck＋正式建置，輸出到 `dist/` |
| `npm run preview -- --port 4173 --strictPort` | 預覽正式建置，開啟 <http://127.0.0.1:4173/> |
| `npm run build -- --base=/fox-life/` | 以 GitHub Pages 的資源路徑建置 |

### 開發用頁面與參數

| 網址 | 用途 |
| --- | --- |
| 右上「顯示 Debug」 | 顯示 State／Action／Target／Source 等即時狀態 |
| `/?measure=1` | 5 秒暖機＋60 秒 rAF 取樣，結束後右下輸出 JSON |
| `/tools/living-arm-review.html` | 客廳動作逐格檢查（只在開發伺服器提供） |
| `/tools/garden-review.html` | 陽台動作逐格檢查（只在開發伺服器提供） |
| `/tools/kitchen-review.html` | 廚房動作逐格檢查（只在開發伺服器提供） |
| `/?preview=fox`、`/?preview=fox-v02` | 程序狐狸與 Blender GLB 的造型比較（歷史實驗，目前未採用） |

其他工具：`node tools/render-home-music.mjs` 重新渲染配樂（見 [音訊來源](assets/audio/README.md)）；Blender 狐狸生成腳本見 [tools/blender](tools/blender/README.md)。

### 目錄

| 路徑 | 內容 |
| --- | --- |
| `src/entry.ts` | 依 query 分流到主場景或造型預覽 |
| `src/main.ts` | 啟動、渲染迴圈、事件綁定與資源清理 |
| `src/Character.ts` | 狐狸的行為狀態機：自主生活、邀請、安全退出與移動 |
| `src/scene.ts`、`src/*Visual.ts` | 房間、家具與道具幾何 |
| `src/createFoxVisual.ts` | 程序化狐狸模型與動畫 |
| `src/life.ts`、`src/LifePanel.ts`、`src/RoomPanel.ts` | 近況、日記、動作欄與房間面板 |
| `src/HomeAudio.ts` | 配樂、環境音與動作音效 |
| `tests/` | 行為、路徑、穿模、日記與音訊測試 |
| `tools/` | 動作檢查頁、配樂渲染與 Blender 腳本 |
| `assets/` | 音訊與造型實驗用的 GLB |
| `docs/` | 產品、架構、各輪紀錄與驗證證據 |

### 部署

GitHub Pages 的 Source 設為 **GitHub Actions**（Settings → Pages）。推送到 `main` 後，工作流程會先執行測試，再以 `/fox-life/` 資源路徑建置並部署 `dist/`；也能在 Actions 手動執行 **Test and deploy Fox Life**。

不提交 `node_modules/`、`dist/` 或環境機密檔案。

## 文件索引

### 產品與架構

- [PRODUCT](docs/PRODUCT.md)：產品方向與核心體驗
- [ARCHITECTURE](docs/ARCHITECTURE.md)：架構與模組邊界
- [Project Handoff](Fox_Life_Web_Project_Handoff.md)：最初的專案交接文件
- [變更紀錄](docs/CHANGELOG.md)：各輪里程碑

### 目前功能（新到舊）

| 文件 | 內容 | 日期 |
| --- | --- | --- |
| [廚房與雙人床](docs/KITCHEN_EXPANSION.md) | 廚房三個料理動作、雙人床 | 2026-10-23 |
| [陽台小花園](docs/GARDEN_EXPANSION.md) | 陽台三個動作、後續擴建方向 | 2026-10-23 |
| [客廳生活動作](docs/LIVING_ROOM_ACTIONS.md) | 客廳六個動作、手臂接合修正 | 2026-10-18 |
| [房間擴建](docs/ROOM_EXPANSION.md) | 臥室＋客廳、跨房鏡頭 | 2026-10-18 |
| [背景音樂與音效修訂](docs/MUSIC_AND_AUDIO_REFINEMENT.md) | 原創配樂、腳步與微風 | 2026-10-17 |
| [美術與聲音](docs/ART_AND_SOUND.md) | 小屋擺設、角色表演、音效 | 2026-10-17 |
| [小屋居家細節](docs/ROOM_REFINEMENT.md) | 睡眠角、閱讀角、餐桌與收藏角 | 2026-10-17 |
| [更多生活細節](docs/DAILY_LIFE.md) | 打掃、玩耍、打瞌睡、伸懶腰 | 2026-10-17 |
| [互動體驗預覽](docs/INTERACTION_PREVIEW.md) | 動作欄、日記、靜靜陪伴 | 2026-10-17 |

### V0.2 基本生活

- [V0.2 Web Spec](docs/V0_2_WEB_SPEC.md)：規格
- 驗收紀錄：[Sleep](docs/V0_2_SLEEP_ACCEPTANCE.md)、[Read](docs/V0_2_READ_ACCEPTANCE.md)、[Eat](docs/V0_2_EAT_ACCEPTANCE.md)、[整體驗收](docs/V0_2_OVERALL_ACCEPTANCE.md)

### V0.1 垂直切片與技術驗證

- [V0.1 Web Spec](docs/V0_1_WEB_SPEC.md)、[實作與驗收紀錄](docs/V0_1_ACCEPTANCE.md)、[Chrome 人工補驗](docs/V0_1_CHROME_MANUAL_ACCEPTANCE.md)、[Closeout](docs/V0_1_CLOSEOUT.md)
- 動作與造型 polish：[Turn Polish](docs/V0_1_TURN_POLISH.md)、[Character Polish](docs/V0_1_CHARACTER_POLISH.md)、[Visual Refinement](docs/V0_1_VISUAL_REFINEMENT.md)
- [fox_v02_static 視覺審核](docs/FOX_V02_STATIC_REVIEW.md)：GLB 造型實驗
- [Technical Spike](docs/TECHNICAL_SPIKE.md)：最初的 Three.js 技術驗證

### 資產與證據

- [音訊來源](assets/audio/README.md)：配樂、錄音素材與授權
- [Blender 狐狸](tools/blender/README.md)：GLB 生成與驗證
- `docs/evidence/`：各輪驗證的截圖與原始紀錄
