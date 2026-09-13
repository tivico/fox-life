# V0.1 Closeout — 2026-09-13

結論：PO 對目前程序狐狸的轉向、起停、Window Observe 與整體動作體驗 **Accepted**，本輪 polish 結束。最後技術檢查無新 blocker，可建立 V0.1 穩定實作 checkpoint；這不是全部驗收條件皆已通過的發布標記。

## 驗證與不變範圍

- 分支 `feature/v0.1-vertical-slice`；closeout 前 HEAD `2be3e717b1d1828f75f8b9435ff218d93849e18f`，working tree 包含自規格核准後累積的完整 V0.1 工作。
- 本次未改 `src/Character.ts`、`src/createFoxVisual.ts` 或其他 runtime／tests／資產。15 tests passed／0 failed，typecheck、build exit 0。[完整輸出](evidence/v0.1-closeout/verification.json)。
- 檢查最新 turn 證據的來源 SHA256 與目前來源一致，另保存 [closeout manifest](evidence/v0.1-closeout/manifest.json)。沒有發現需要再次修改 motion 的 regression。
- PO 原文：[Accepted 紀錄](evidence/v0.1-closeout/po-acceptance.md)。未重新執行 Browser smoke；沿用未改 motion 版本的 [production smoke](evidence/v0.1-turn/smoke.json)。
- 正式 `/` → `main` → `Character` → `createFoxVisual`；採用程序狐狸。`?preview=fox`、`?preview=fox-v02`、Blender scripts、blend／GLB／renders／驗證報告保留為獨立歷史比較，不代表採用 GLB，也沒有 Rig。

## AC-01～AC-11 當前狀態

| AC | 狀態 | 證據與範圍 |
| --- | --- | --- |
| 01 | 技術命令通過；Chrome Console 待補 | 最後 typecheck／15 tests／build 通過；install／dev／preview 與 In-app 為既有紀錄，尚無獨立 Chrome console 證據 |
| 02 | 部分完成 | 自主生活程式／In-app 證據、PO 整體動作 Accepted；五類微動與完整 60 秒逐項紀錄未單獨回填 |
| 03 | 程式通過；動作 Accepted | Idle／Walk 中斷與 0.5 秒模擬通過；實機延遲量測未提供 |
| 04 | 程式通過；Window Observe Accepted | 三起點完整流程、多角度對正、四秒計時通過；三個 Browser 完整流程原始證據未齊 |
| 05 | 通過（程式＋In-app） | 去重、不排隊、不延長、完成後再次接受 |
| 06 | 部分完成 | raycast 測試與既有 In-app 操作；獨立 Chrome 遮擋點擊仍待補 |
| 07 | 通過（In-app 抽查範圍） | Camera 環繞、限制、重設、resize；未推定 PO Camera 舒適度逐項接受 |
| 08 | 通過（程式＋In-app） | state／source／target 一致清除，Debug 隱藏後正常 |
| 09 | **待人工 Chrome 補驗** | FrameClock 測試通過，尚無真實 hidden=true→false 操作證據 |
| 10 | **待人工 Chrome 補驗，產品 FPS 未知** | 沒有合格的 production 60 秒前景數據；歷史 60.40 秒／1.19 FPS 僅受限 In-app 環境紀錄 |
| 11 | **本輪動作體驗 Accepted** | PO 明確接受轉向、起停、Window Observe 與整體動作；完整 §15 的其他項目未單獨回填，不推定全部通過 |

## Chrome 尚需補驗

依 [人工補驗步驟](V0_1_CHROME_MANUAL_ACCEPTANCE.md) 執行，不重做已接受的 motion polish。

1. **Background-tab（AC-09）**：走向窗戶及 Observe 各切到另一 Chrome tab 至少 10 秒，保存 hidden=true→false、前後位置／計時及返回自主結果。
2. **Performance（AC-10）**：production `?measure=1`，內容 viewport 1920×1080，5 秒暖機後至少 60 秒持續前景，包含自主生活、完整 Observe 與鏡頭操作；保存 JSON、硬體／Chrome 環境與操作紀錄。若切背景須重測。
3. 上表其他缺口可一併回填；未收到數據前維持原狀，尤其不從 PO 動作 Accepted 推定 Chrome console 或 FPS 通過。

## Changed Files / Diff Summary

本次 closeout 修改：README、Acceptance、Turn Review、Chrome Manual Acceptance、此 closeout 文件與新 evidence。沒有角色 motion 變更。

Checkpoint 同時保存先前未提交的 V0.1 實作，範圍如下；完整檔案列表可用 `git show --stat` 查看此 commit：

- Runtime：Character／程序造型動畫、Window command 串接、房間家具與 Camera、Debug、FrameClock、PerformanceSample、entry 及樣式。
- 驗證：Node 行為測試、各輪來源快照、production smoke、受限效能紀錄、人工補驗表。
- 歷史實驗：fox_v01／fox_v02_static Blender 原檔、GLB、生成／驗證工具、靜態比較頁與 renders。
- Build 設定：package.json 測試指令、index 入口、tsconfig；依賴 lockfile 未變。node_modules／dist／log 不入 commit。

## Known Limitations / Stop Boundary

- AC-09／10 等未完成項目是仍待補驗的條件，不是已證明的產品故障；checkpoint 不等於無条件發布核准。
- 程序腳步無 IK 鎖地、頭／肢／尾仍為 group 動畫，局部微滑與接縫限制保留；PO 已接受目前體驗，沒有明確 regression 不再調整。
- 沒有通用碰撞／尋路；只對既有房間配置做路徑淨空抽樣。無手機、全瀏覽器、長時間 soak 或 context-loss 驗證。
- shared JS chunk 626.67 kB，>500 kB build warning 保留；runtime／types minor 版本差異仍存在。
- 歷史 manifest 代表當時來源。`validate_fox_v02.mjs` 包含當時程序來源不變的 assertion，turn polish 後不再適合作整體現況 gate；歷史 GLB 驗證成功紀錄保留，不改歷史 hash 來假裝重驗成功。
- 本輪建立本機穩定 commit 後停止；不 push、不 merge、不開始 Eat／Sleep／Read 或其他 V0.2 工作。
