# V0.1 production 證據索引

本輪收尾保存上一輪四份原始檔，未修改內容。SHA-256／大小見 [manifest.json](manifest.json)；hash 在收尾時計算，不假稱原始擷取時已有簽章。所有瀏覽器證據均來自 **In-app Browser**，不是獨立 Chrome。

| 檔案 | 可核對的內容 | 不能證明 |
| --- | --- | --- |
| [browser-events.json](browser-events.json) | 原始 label、epoch ms、Debug 讀值、部分巢狀 samples | 完整操作錄影、可見動畫延遲、全角度碰撞、Chrome Console |
| [observe.jpg](observe.jpg) | 狐狸位於窗前；Debug Observe、Player Command、3.69/4.00、位置 0.01/-1.37 | 4 秒連續演出、完整流程、生命感 |
| [observe-hidden-debug.jpg](observe-hidden-debug.jpg) | Debug 隱藏後的窗前狐狸與房間構圖 | 單張圖不能確認隱藏期間整段模擬是否持續 |
| [performance-in-app.json](performance-in-app.json) | 2026-09-10T06:15:07.906Z；60395.3 ms、72 frames、1.1921 FPS；states 僅 Idle | AC-10；產品實際 FPS；60 FPS 目標通過或失敗 |
| [verification-rerun.json](verification-rerun.json) | 本輪 typecheck／9 tests／build 命令、開始時間、exit code、完整輸出 | 瀏覽器／PO 驗收 |
| [manifest.json](manifest.json) | 原始檔、重跑輸出、目前來源／測試／lockfile 與 dist 的識別 | 未提交 working tree 不能只以 HEAD 當實作版本 |

## 原始事件整理（按實際欄位，不按 label 推定成功）

- AC-02：no-input-start（1789020232294）→ no-input-end（1789020312150），79.856 秒；hits=0，Breathe→Look around，位置 0/0→1.08/0.89。中間未保存 Walk 畫面，不能用此補足五類微動的連續驗收。
- AC-03／04 第一轮：cycle1-window-click（1789020364541）Walk／Player Command → cycle1-repeat-during-walk（1789020431910）實際已為 Observe → cycle1-complete（1789020523147）Idle／Autonomous／None → character-and-empty-clicks（1789020573734）自主 Walk。這一輪可追溯完整状态流程。cycle1-command 雖名為 command，但 hits=0／Idle，不能當成功點擊。
- AC-05：observe-before-repeat 的 1.51 秒／hits=3 → observe-valid-repeats 的 3.85 秒／hits=5，無重置跡象。cycle2-command→cycle2-repeat 为 Walk／同一 Window target，hits 6→7。完整去重、不延長與再次接受另有程式測試。
- AC-04 第二輪：cycle2-before 位於 -0.02/-0.08 → cycle2-command → cycle2-observe；最後 cycle2-complete-check（1789020753198）實際仍為 Observe 3.63/4.00，不能當完成。沒有第三輪完整原始事件；仍待人工三個不同起點補驗。
- AC-09：background-attempt 的 hidden=false；沒有真實背景證據。
- AC-07／08：orbit-side、reset-camera 及 viewport 變化可作輔助；兩張截圖可見 Debug 開／關。連續環繞、縮放边界和隱藏中流程主要依上一輪文字觀察，非完整錄影。

上一輪文字中的自主 Walk 中斷約 0.21 秒（位置 -1.42/-0.14）、框點擊 hits 1→2、部分拖曳／Debug 操作與 Camera 邊界，沒有在這份事件 JSON 中完整對應的原始快照；保留為上一輪觀察紀錄，不新造事件或提升為独立 Chrome 證據。沒有保存本輪 production Console 原始檔，不能宣告 Chrome Console 無錯誤。

本輪沒有重新跑 In-app 效能；60.40 秒／1.19 FPS 僅是受限測試環境的歷史記錄。正式補驗見 [Chrome 人工步驟](../../V0_1_CHROME_MANUAL_ACCEPTANCE.md)。
