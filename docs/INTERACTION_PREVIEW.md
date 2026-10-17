# 互動體驗預覽 — 2026-10-17

本輪依「繼續實作，想體會完整樣貌」的需求，把已存在的 V0.2 生活行為串成可探索的產品介面。範圍是觀看 → 邀請 → 回饋 → 生活片段 → 繼續觀看。保留既有程序狐狸、家具、動作時長、玩家指令鎖與安全退出；不把上一輪 Pending 的 PO Acceptance 或 Chrome 效能驗收自動改為通過。

## 體驗流程

1. 開啟 `/`，先不操作：狐狸自己散步、吃飯、睡覺或讀書；下方會用中文描述實際動作。
2. 點下方「看風景」或按 `1`，也可直接點窗戶。介面顯示收到邀請、目前目標與接近中的近況。
3. 進入 Observe 後顯示片段進度，記錄一則窗前日記。完成後回自主生活，按鈕恢復可用。
4. 試試床／`2`、書架／`3`、食物／`4`。既有玩家邀請執行期間不排隊、不覆寫；滑鼠重複點擊或快捷鍵會收到忙碌提示。
5. 自主行為期間可以邀請另一個行為，仍使用 Character 原有的 Wake／Put Away／Finish 安全退出。
6. 打開右上「生活日記」。記錄的是實際進入 Sleep／Read／Eat／Observe 的時刻，不宣稱每一段都已完整完成。日記標示自主或玩家邀請來源。
7. 「靜靜陪伴」隱藏介面並置中構圖；`Esc` 或返回按鈕恢復。玩法說明與日記使用原生 modal dialog，保留鍵盤焦點及 Esc 關閉。
8. 切到背景時沿用 FrameClock 暫停，回前景不追趕時間。

## 資料與實作

- `src/life.ts`：從 Character 公開狀態衍生近況與進度；LifeJournal 只觀察真正的 active phase，不改寫行為或路徑。
- `src/LifePanel.ts`：UI、快捷鍵、回饋、dialog、日記讀寫與 cleanup。
- `src/main.ts`：四個既有 raycast binder 與 UI 入口共用單一 request callback；相機依 aspect 適配，將房間向上留出介面空間。
- `src/DebugPanel.ts`：只保留技術資料，鏡頭重設移至生活介面。
- `src/life.css`：獨立的生活介面樣式；造型預覽沿用其專用樣式。
- localStorage key：`fox-life.moments.v1`。最多 40 則，包含 `kind`、`at`、`source`。載入時驗證 schema、時間範圍與行為名稱；壞 JSON 不阻止啟動，禁止儲存時退為當次記憶體日記並顯示說明。
- 沒有新增 dependencies、後端、帳號、Needs、世界時鐘、角色狀態存檔或離線模擬。重新開啟時狐狸從初始狀態開始，只有日記延續。

## 驗證

- `npm run build`：通過（含 TypeScript）。既有 Three.js shared chunk 633.58 kB / gzip 160.56 kB，仍有 >500 kB 提醒。
- `npm test`：47/47 通過。原有 44 項動作／接觸／路徑／raycast／背景計時回歸全部保留。
- 新增 3 項以真正 Character 驗證：四種玩家邀請從 approach 到 active 再回 Idle 的日記去重、進度與解鎖；自主 Read 被 Eat 安全打斷時的真實來源；損壞資料、型別異常與 40 則上限。
- In-app Browser：查看 1280×720 與 390×844 版面；驗證說明 dialog、日記空白狀態、閱讀／窗戶邀請、重複指令提示、Debug、靜靜陪伴與 Esc 返回。調整構圖後直接點窗仍命中；真正進入 Observe 後出現進度條並新增日記，手動重新整理後保留 1 則，內容與玩家邀請來源正確顯示。
- In-app 3D 執行非常緩慢，不能以此宣稱 60 FPS；完整四動作生命週期由自動測試覆蓋，未宣稱已在獨立 Chrome 重做全部人工流程。
- 畫面證據放在 `docs/evidence/interaction-preview/`。既有 `V0_2_OVERALL_ACCEPTANCE.md` 與 `evidence/v0.2-overall/` 為原先工作樹內容，本輪沒有改寫。

## 後續產品範圍

目前可直接感受單角色小屋的觀看與邀請循環。Needs／Preference、遊戲存檔／時間／離線進度，以及第二位角色仍依 PRODUCT.md 的後續階段逐項設計；不以介面中的顯示資料冒充已完成的系統。
