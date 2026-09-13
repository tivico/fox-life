# V0.1 Chrome 人工補驗與 PO 回填

狀態（2026-09-13）：**已收到 PO 對轉向、起停、Window Observe 與整體動作體驗的 Accepted；background-tab／performance 仍待人工 Chrome 補驗**。尚未提供測試環境與數據，不推定 Console 或完整 §15 逐項通過。依據 [Approved Spec](V0_1_WEB_SPEC.md) §11、§14、§15；最新結果见 [Closeout](V0_1_CLOSEOUT.md)。以下未回填部分仍為待執行步驟。

## 準備與版本辨識

在本機 PowerShell 進入 repository（含 package.json 的內層 Fox-Life-Web）：

```powershell
Set-Location 'C:\Users\tivic\桌面\Fox-Life-Web\Fox-Life-Web'
git branch --show-current
git rev-parse HEAD
git status --short
node --version
npm.cmd --version
npm.cmd install
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
```

保持 preview 終端運作；若 port 已占用，確認既有程序或以另一個空閒 port 啟動並記錄 URL。不要把舊服務的未知內容當作本次 build。另開 PowerShell 執行 `npm.cmd run dev -- --port 5174 --strictPort`，確認 ready 並用 Chrome 開啟 dev；確認後 Ctrl+C 停止 dev。正式驗收均回到 production preview。

记录日期／時區、測試者、branch、HEAD、working tree 狀態、Node／npm、CPU、GPU／driver、Windows 版本、Chrome 完整版本（Chrome「關於」）、硬體加速設定、production URL。未提交版本須搭配 [manifest](evidence/v0.1/manifest.json) 的來源與 build hashes 辨識，不能只記 HEAD。

## AC-01：獨立 Chrome production 與 Console

1. 從 Windows 開啟獨立 Google Chrome，進入 [production preview](http://127.0.0.1:4173/)，確認房間與狐狸渲染、自主生活和點窗流程可執行。
2. 開 DevTools Console，清除舊訊息後重新載入；檢查載入、點窗、Observe 返回、鏡頭操作期間的 Error／Warning。保存 Console 輸出或截圖；空白 Console 也記錄觀察時間與操作範圍。
3. 保存 install／dev／typecheck／tests／build／preview 結果。區分 Vite bundle 警告與 browser runtime error；任何錯誤保留完整訊息，不自行略過。
4. 回填通過／未通過／未完成，以及證據路徑。上輪 In-app 可執行不能替代本步驟。

## AC-09：真實 background-tab（兩個案例分開執行）

使用普通 production URL，不和 AC-10 效能取樣混測。顯示 Debug，另開一個 Chrome tab。可在測試頁 Console 安裝唯讀 visibility 紀錄，確認真的進入背景：

```javascript
window.__v01Visibility = [];
document.addEventListener('visibilitychange', () => {
  window.__v01Visibility.push({ at: new Date().toISOString(), hidden: document.hidden });
});
```

1. **走向窗戶**：點窗，在 Action=Walk to window、Source=Player Command 時記錄位置／target，立即切到另一 tab 至少 10 秒；回來確認仍接續原指令，沒有因這 10 秒瞬移到窗前或跳過 Observe。允許切換前後實際前景幀的小幅前進。
2. **Observe**：另次指令在 Observe 計時約 1 秒時記錄位置、elapsed、source、target，切另一 tab 至少 10 秒。回來不應因背景時間直接結束 4 秒 Observe；應繼續剩餘前景時間，再回 Idle／Autonomous、target=None，之後自主 Walk 離開。
3. 每案保存切換前後畫面／錄影、背景停留時間與 `window.__v01Visibility`。必須看到 hidden=true → false；若沒有則記「未完成」，不視為背景驗證成功。完成後重新載入即可移除暫時 listener。

## AC-10：獨立 Chrome 前景 production 效能

1. 確認 AC-01 能執行；使用獨立 Chrome，關閉 Device emulation 和 CPU／network throttling。設 **內容 viewport 1920×1080**，不是瀏覽器外框；可分離 DevTools，避免 dock 改變內容尺寸。若本機無法提供此尺寸，記下實際尺寸並標正式條件未完成。
2. 準備好後開啟 [量測頁](http://127.0.0.1:4173/?measure=1)。前 5 秒暖機，接著連續至少 60 秒前景；等右下角顯示 JSON 才結束，不能只用手錶到 65 秒即關閉。
3. 暖機後的取樣區間內：先觀察自主 Idle／Walk，接著點窗完成 Walk → Observe（完整 4 秒）→ Idle／Autonomous → 再次 Walk，並執行環繞與縮放。記錄各操作相對時間及卡頓發生時間。若流程未在區間內完成，重新載入重測。
4. 測量期間保持前景，不切 tab、不最小化；若進背景，該次作廢，重新載入開始新樣本。不要將受限 In-app 樣本拿來比較或代填本次結果。
5. 完成後保存原始 JSON；可選取右下文字，或在 Console 執行 `copy(document.querySelector('#performance-sample').textContent)`。保留 timestamp、UA、viewport、DPR、renderPixelRatio、drawingBuffer、GPU、warmupMs、elapsedMs、frames、averageFps、frameMs 的 p50／p95／p99／max、over33ms／over50ms、states、restartedAfterBackground。
6. 檢查 elapsedMs >=60000、viewport 符合要求、環境資料完整；states 有 Idle／Walk／Observe 仍不能單獨證明完整流程與鏡頭操作，必須附第 3 步操作記錄。這是 rAF interval 量測，沒有逐幀原始序列，也不是 GPU profiler。
7. 記錄平均 FPS、frame-time 分布、是否有持續卡頓，由 PO 依 60 FPS target 明確 Review。規格沒有定義「接近」的數值門檻，不自行新增。未接近 60 或持續卡頓列未達目標／交 PO Review；條件不足列未完成，不推定通過或失敗。

## AC-11：Product Owner Manual Acceptance

使用普通 production URL，隱藏 Debug 與測試工具，依序親自體驗：

| §15 | 操作／判斷 | PO 結果（接受／需調整／未驗收）與具體觀察 |
| --- | --- | --- |
| 1 | 不操作看 1～2 分鐘：自然停頓、細節、像在家生活、是否願意多看 | 待人工驗收 |
| 2 | 環繞與縮放：角色焦點、主要角度可讀、持續觀看舒適度 | 待人工驗收 |
| 3 | 自主 Idle／Walk 各點窗：意圖是否清楚、轉向／步行／停步自然 | 待人工驗收 |
| 4 | 看完 Observe：像在看窗外、節奏合宜、回到日常連續 | Window Observe 動作體驗 Accepted（2026-09-13）；原文見 closeout |
| 5 | 再次觸發：是否想再看或繼續等待 | 待人工驗收 |

只有 PO 明確接受才能記為接受；技術測試、截圖或代理自評皆不能代替。需調整的觀察先記錄，這份補驗不授權 V0.2。

## 其餘缺口與回填格式

AC-02：正常前景不操作至少 60 秒，核對兩種 Idle variation 及呼吸／重心／視線／耳／尾五類微動的連續可讀性。AC-03：Idle／Walk 各點窗，用包含滑鼠點擊時刻的錄影確認 0.5 秒內可見轉向／步行。AC-04：從三個不同自主位置各完成完整流程並記錄起點、Observe、回自主與離開窗前。AC-06：補牆／遮擋窗戶的不誤觸，複驗玻璃／框、空白／角色／拖曳／Debug。AC-05／07／08 可一併在 Chrome 複驗，既有通過範圍僅程式／In-app。

每案回報以下欄位，可直接貼回對話；不要只填「Chrome OK」。

| 欄位 | 待填 |
| --- | --- |
| 測試日期／時區、測試者 | 待提供 |
| HEAD／working tree／build 識別、production URL | 待提供 |
| CPU／GPU／driver／OS／Chrome、viewport／DPR／buffer | 待提供 |
| AC ID／案例、操作與起迄時間 | 待提供 |
| 實際結果、異常、Console、證據路徑／JSON | 待提供 |
| PO 明確判定（通過／未通過／未完成；AC-11 用接受／需調整／未驗收） | 待提供 |

收到人工結果後，將原文與證據保存至 evidence/v0.1，更新驗收表對應項目；缺環境、缺流程或未明確判定時仍標待補，不能推定全部 AC 通過。
