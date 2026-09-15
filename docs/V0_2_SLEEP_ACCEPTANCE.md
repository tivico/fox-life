# V0.2 Slice A — Sleep Acceptance Record

建立日期：2026-09-14。最新驗收日期：2026-09-15。**V0.2 Slice A — Sleep：Accepted。PO Manual Acceptance：Accepted。**

## Product Owner Manual Acceptance Record（2026-09-15）

- 驗收者：Product Owner（本次對話中的使用者）。
- 依據：PO 明確表示「Sleep pose、Settle、Wake、Window interrupt 與整體可愛度皆接受」，並要求將 V0.2 Slice A — Sleep 標記為 Accepted。
- 結果：**PO Manual Acceptance = Accepted；無新的功能 blocker。** SA-P01～SA-P04 依本次 Slice A 整體人工驗收結論記錄為 Accepted；不是工具代替 PO 推定通過。
- 已知程序模型限制保留為 Known Limitation，依 PO 決定不阻擋 Slice A。先前 pose 的 Needs Adjustment／待複驗已由本次 Accepted 結果取代。
- 本次未提供獨立 Chrome background-tab、performance 或完整 resize 的新增測試資料；這些技術補驗紀錄保持原狀，不改寫為已實測通過，也不撤回 PO 的 Slice A Accepted 結論。
- 本輪僅更新驗收與規格文件，不修改 Sleep runtime 或 tests，不開始 Read／Eat。
- 最近一輪驗證結果沿用既有紀錄：typecheck、24/24 tests、build 與 production smoke 通過。本輪文件更新不重跑 runtime 測試。

## Sleep checkpoint 準備

- 分支：`feature/v0.2-sleep`；基準：V0.1 `5ddd49c`。現有未提交變更全部保留。
- Checkpoint 範圍：下方 Changed Files 的 Slice A implementation / tests、Approved 規格與 Architecture、驗收文件及 Sleep evidence；不含 Read／Eat 實作。
- 建議 commit message：`feat: establish accepted V0.2 Sleep checkpoint`。
- 狀態：**文件已更新，可進入 Sleep checkpoint 建立作業；本輪尚未 stage / commit / push / merge。**

下方帶日期的 polish／穿模修正與首輪技術驗證保留作歷史紀錄；其中當時的「待 PO」或「尚未 Accepted」不代表最新狀態，最新結論以上述 PO record 為準。

## Sleep Pose Polish 收尾（2026-09-15，最新結果）

Branch：`feature/v0.2-sleep`；原有 approved 文件、Sleep implementation 與 tests working tree 完整保留。無 commit、reset 或丟棄修改。本节 supersedes 下方兩輪的 pose 細節與驗證數量；歷史證據不覆寫。

### 專用 pose 與 Before / After

- Before：站姿側轉，直腿／腳掌維持站姿形狀，尾巴以整支旋轉安放；上一輪只調整了接觸高度。
- After：雙腿用既有連續 mesh 的 Sleep morph 做不同程度的蜷曲（0.55 / 0.43），腳掌分層錯開；不新增膝蓋零件或骨架。頭部略收向身體，手臂分別以 -0.95 / -0.65 弧度收在胸前。
- 雙耳依上下側安排：睡姿向後放鬆，上側 z=0.50、靠床側 z=1.10，避免靠床側耳尖直插枕頭。头部局部 x=-0.30、y=1.105，保持枕頭支撐。
- 尾巴以同拓撲的專用弧形 morph 沿臀部／腳邊安放，保留橘色與奶油尾尖；睡姿厚度收斂，避開腳掌與床框。修正環截面方向與 morph normals，避免表面內外翻轉造成暗洞。
- 全部 morph 以既有 sleepPose 的 smootherstep 混入／退出；醒後雙腿和尾巴 influence=0，頭、手臂、耳朵與尾巴局部位移復原。Settle 0.65、Sleep 8、Wake 0.75 秒與中斷規則不變。
- 修正 Three.js 預設把所有 morph endpoint 合併進 standing bounding box 的問題；包圍盒依當前權重混合保守端點 bounds，零權重恢復原站姿範圍，未修改 V0.1 行為測試來掩蓋失敗。

### 驗證與證據

- `npm run typecheck` 成功；`npm test` **24/24 Pass**，0 fail，16273.4659 ms；`npm run build` 成功，29 modules / 174 ms。仍有 >500 kB warning：共享 chunk 629.24 kB，gzip 159.14 kB。
- 原 15 項 Idle / Walk / Turn / Window Observe 回歸全通過。Sleep 三起點、多幀率流程、priority / cooldown、部分 Settle / Sleep / Wake 的 Window 中斷保持通過。
- 床面測試改用 `Mesh.getVertexPosition` 讀取實際 morph 後頂點，在 20 / 60 / 144 Hz 全 Settle / Sleep / Wake 及部分 Settle 中斷檢查床墊／枕頭；不只測未變形 geometry。
- 新增專用 preset 檢查：雙腿包圍盒不相交；尾巴遠端與 torso 分離；尾巴最低點靠近床面且在床框 footprint 內；正常醒後所有 morph 及手臂／尾巴 offset 復位。既有結構碰撞測試涵蓋床框、床頭及牆。
- Production：`http://127.0.0.1:4183/`，Codex In-app Browser，1280×720。重新啟動 preview 後載入本次 final build；完整玩家 Sleep、正常醒後自主行走、自主 Sleep→Window 安全 Wake→Observe 均實際操作。
- 多角度以房間 OrbitControls 觀察（不是正交攝影棚視角）：[room](evidence/v0.2-sleep/pose-final/room.png)、[3/4](evidence/v0.2-sleep/pose-final/three-quarter.png)、[床側](evidence/v0.2-sleep/pose-final/side.png)、[正面斜角](evidence/v0.2-sleep/pose-final/front.png)。在這些取樣未見明顯耳／腳／尾巴穿床；仍是 PO review 證據，不代表美感已接受。
- [玩家 Sleep Debug](evidence/v0.2-sleep/pose-final/side-dom.txt)、[正常醒後自主 Walk](evidence/v0.2-sleep/pose-final/normal-return.txt)、[自主 Sleep](evidence/v0.2-sleep/pose-final/autonomous-sleep.txt)、[Window 中斷 Wake](evidence/v0.2-sleep/pose-final/interrupt-wake.txt)、[中斷後 Observe](evidence/v0.2-sleep/pose-final/interrupt-observe.txt)、[Observe 截圖](evidence/v0.2-sleep/pose-final/interrupt-observe.png)、[console error/warn 空紀錄](evidence/v0.2-sleep/pose-final/console.json)。

### Changed Files / Limits / Gate

本輪 pose 工作只涉及 `src/createFoxVisual.ts`、`tests/sleep.test.mjs`、本 acceptance 文件及 `docs/evidence/v0.2-sleep/pose-final/`。Character / scene / Sleep priority / 自主規則 / Window timing 未改；其他 working tree 修改屬之前 Slice A 實作。

已無已知自動測試或流程 blocker。**SA-P02 / SA-P03 仍是 PO 回報後修正待複驗**，不是 Accepted，因此 Slice A 尚不能 close 或進入 Read。Chrome background / performance 等先前待驗項目仍保留。

限制：沒有骨架／IK／床墊變形；雙腿為單段連續 mesh 彎曲，不能表現真正上下腿關節。頭頸、耳根和尾根仍採 placeholder 的交疊接合；測試只保證已取樣的床面與部分自碰撞淨空，並非全模型 triangle self-collision 證明。上床／下床仍是原本的抬升側躺軌跡，完整動作是否自然、尾巴體積是否合適與接觸觀感仍由 PO 判定。

## PO 回報修正：躺下穿模（2026-09-14）

PO 提供側面截圖並回報「躺下去時會穿模」。此回報記為 SA-T07 / SA-P03 **Needs Adjustment**，不是 Accepted。以下修正已完成，等待 PO 再驗；本節取代下方首輪測試數量、床面排除與 Sleep offset 的舊描述，首輪證據仍保留作歷史。

- 原因：首輪空間測試排除了床墊／枕頭，只檢查結構障礙。側躺後頭部、下側手臂、耳朵及尾巴的高度未配合支撐面，頸部也延伸到枕頭範圍內。
- 僅修改 `createFoxVisual.ts` 的 Sleep pose：支撐高度 0.70 → 0.71、進床位移 0.90 → 0.82；抬起頭部以支撐在枕頭上，收攏下侧手臂／耳朵與尾巴。所有局部變換随 Sleep blend 進出，醒後歸零。未改 Character 行為、床 geometry、Window timing 或已接受 locomotion。
- `tests/sleep.test.mjs` 新增完整 settle / sleep / wake 與中途 Window 退出的頂點檢查：20 / 60 / 144 Hz，每幀確認床墊和枕頭平面範圍內的狐狸頂點不低於上表面（0.003 容差），並驗證 neutral reset。原結構障礙測試繼續保留。
- Typecheck / build 成功；**23/23 tests 通過**，原有 15 項不變。Build chunk 627.96 kB / gzip 158.72 kB，仍有 >500 kB warning。測試總時間 15164.4113 ms。
- Production 已重新載入最新 build，觀察自主 Sleep、醒後走開、玩家點床入睡；[修正後側面](evidence/v0.2-sleep/contact-fix-sleep.png)、[Debug](evidence/v0.2-sleep/contact-fix-sleep-dom.txt)、[console](evidence/v0.2-sleep/contact-fix-console.json)。console error / warn 為空。
- SA-T07 新增床面回歸檢查已通過；離散幀與頂點取樣不是通用 triangle collision solver，仍需 PO 確認完整躺下／醒來過程與多角度接觸觀感。SA-P03 狀態：**Needs Adjustment → 修正待複驗**。其他尚未完成的人工 gate 不變。

## Branch 與變更保全

- V0.1 baseline：`5ddd49c`。Sleep 最初誤在 `feature/v0.1-vertical-slice` 開始，尚未 commit。
- 依 PO 指示，以 `git switch -c feature/v0.2-sleep` 建立並切換分支；HEAD 保持上述 baseline。
- 切換前後比對 11 個檔案 SHA-256，全部相同：兩份 Approved 文件、5 個 modified source、3 個新增 implementation/test，以及原有 behavior tests。沒有 reset、stash、丟棄或覆寫既有修改。
- V0.1 acceptance、WindowInteraction、FrameClock、原 15 項 behavior tests 與 baseline 相同；檢查時未發現需另行保留的未記錄 V0.1 修改。
- 本次不 commit / push / merge。文件 Approved 與 Sleep 實作完成不代表 Slice A 已獲 PO Accepted。

## 完成的最小流程

Autonomous Idle → Sleep intent / Player Bed Command → Walk to bed → 最後對正與 0.18 秒收勢 → Settle 0.65 秒 → Sleep 8 秒 → Wake 0.75 秒 → Autonomous Idle → Walk。

- `Character` 擁有 intent、phase、時間與優先級。Approach / Settle 保持 Walk，Sleep / Wake 使用 Sleep；沒有新增 Needs、Energy、Mood 或 action queue。
- 玩家 Bed command 立即取代自主 Idle / Walk，忽略 Sleep cooldown；已執行玩家 command 時拒絕 Bed / Window 重複或跨目標覆寫。自主 Sleep 再點同一張床不重啟，也不改 source。
- 自主 Sleep 至少等一次完整自主 Walk 基線；Idle 選擇 Walk : Sleep = 3 : 1，最多三次連續 Walk 後選可用 Sleep。醒後 cooldown 為 45 個前景秒。
- 自主上床 / 睡眠中點 Window：先從當前 pose 進入安全 Wake，再站回床尾走向窗戶；保留單一 Window 目的，不排多指令 queue。Approach 尚未上床時直接轉向 Window。
- 沿用 V0.1 前進、轉向與步頻邏輯，沒有重做 PO Accepted locomotion。現有程序狐狸增加側躺、閉眼、低幅呼吸、尾巴收攏與醒來姿態，醒後 visual offset 歸零。
- Bed approach 最終為 `(-3.15, 0, 1.85)`、heading `π`：相對規格原 x=-3.4 移動 +0.25，符合允許範圍。沿用 0.035 到站容差。
- 本房間固定床尾轉角為 `(-1.65, 0, 1.85)`，避開床的右側邊角；不是通用尋路。行為 root 留在床尾，visual 以連續抬升及側躺軌跡進床；Sleep 局部 offset 為 `(0.25, 0.70, 0.90)`。
- 床框、床墊、枕頭、床頭位置與尺寸未改；Blender / GLB experiments 未改，正式角色仍為 procedural fox。

## 驗證結果

`npm run typecheck`、`npm test`、`npm run build` 全部成功，22/22 tests（原 15 + 新增 7）。執行摘要見 [verification.txt](evidence/v0.2-sleep/verification.txt)。

| AC | 狀態 | 證據與邊界 |
| --- | --- | --- |
| SA-T01 | Pass | Typecheck / tests / build 成功；build 的 >500 kB chunk warning 保留 |
| SA-T02 | Pass（技術） | Idle / Walk 優先級與 0.5 秒反應測試；三起點 × 20/60/144 Hz 全流程；production 玩家點床、入睡、回自主紀錄 |
| SA-T03 | Pass | 可預測 random 驗證基線、權重兩側、三 Walk 上限與 cooldown；production 實際自主 Sleep 後再次自主行走 |
| SA-T04 | Pass | 0.65 / 8 / 0.75 秒分段計時測試；Debug 顯示真實 phase、target、source；完成清除 target |
| SA-T05 | Pass（自動測試） | 玩家 command 每幀重複 Bed / Window 均不重啟、不延長、不改 target；完成後可再點；自主同 Bed 保持 source |
| SA-T06 | Pass（自動測試） | 自主 approach / 部分 settle / sleep / wake 中 Window request 均安全回站姿，再完成四秒 Observe；視覺轉場仍待 PO |
| SA-T07 | 部分通過，視覺待補驗 | 三起點 × 三幀率取樣全部 mesh transform 與精確頂點 AABB：未碰床框、床頭、牆或其他結構，未低於地板，visual 位移連續並能走開。床墊／枕頭允許接觸而不列為碰撞障礙，不能據此推定所有角度無沉入／漂浮或姿態美感合格 |
| SA-T08 | Pass（技術） | Bed binder 真實 raycast、拖曳／遮擋／空白／cleanup 測試；production 實際點床命中。可見床框、床墊、枕頭、床頭屬同 Bed |
| SA-T09 | 部分通過，Chrome 補驗 | Sleep 中環繞、縮放、重設仍維持 Sleeping；resize Debug 正確更新 1280×800，再還原 802×673。In-app 截圖大於宿主區域時有黑色截圖區，完整 resize 呈現與主要角度可讀性待 Chrome / PO |
| SA-T10 | Pass | 原 15 項測試不變且全通過；新增 Sleep→Window 測試；production Window hits 增加、窗前位置及 Observe，再回自主 |
| SA-T11 | Pass（In-app production smoke） | `vite preview` 實際自主 Sleep、Player Bed Command、Window Observe；Camera 操作與隱藏 Debug；捕捉的 console error / warn 為空。環境限制如下 |
| SA-T12 | 部分通過，Chrome 待人工 | FrameClock 測試涵蓋 approach / settle / sleep / wake / cooldown 不消耗背景時間；尚未以獨立 Chrome 完成實際分頁隱藏／回復驗收 |

## Production smoke 證據

使用已 build 的 `http://127.0.0.1:4183/`，Codex In-app Browser，預設 802×673；另測試 1280×800 resize 後還原。日期同上。這不是獨立 Chrome performance acceptance，未量測產品 FPS。

- [自主 Sleep DOM](evidence/v0.2-sleep/autonomous-sleep-dom.txt) 與 [另一側睡姿截圖](evidence/v0.2-sleep/autonomous-sleep.png)：source Autonomous、sleep / 0.02、root 約 -3.12 / 1.85；截圖在隱藏 Debug 後立即取得。
- [玩家 Approach](evidence/v0.2-sleep/player-approach-dom.txt)、[玩家 Sleep](evidence/v0.2-sleep/player-sleep-dom.txt)、[玩家睡姿](evidence/v0.2-sleep/player-sleep.png)、[回自主](evidence/v0.2-sleep/player-return-dom.txt)：Bed hits 5；Player Command → Sleeping → Autonomous Idle / None，cooldown 仍在遞減。
- [Window Observe DOM](evidence/v0.2-sleep/window-observe-dom.txt) 與 [截圖](evidence/v0.2-sleep/window-observe.png)：Window hits 2、Player Command、窗前位置約 (0.02,-1.37)、Observe 3.69 / 4.00（DOM 與截圖為相鄰時間點）。
- [Console](evidence/v0.2-sleep/console.json)：此次 tab 可取得的 error / warn 記錄為空。
- 截圖是離散取樣，不能取代完整動畫錄影或 PO 體驗。以前 V0.1 的 60.40 秒 / 1.19 FPS 僅為受限環境歷史記錄，不是產品 FPS 結論。

## Product Owner 本機 Chrome 補驗

在 repo 執行 `npm run build`，再 `npm run preview -- --port 4183 --strictPort`（若目前 server 還在運作直接使用），以正常 Chrome 開啟上述網址。

1. 先隱藏 Debug，保持前景，讓狐狸自主走動到第一次 Sleep 並醒來走開。檢查是否明確在睡覺，與生命感是否自然（SA-P01 / P04）。
2. 分別在 Idle、Walk 及三個不同房間位置點可見床面；看走到床尾、上床、側躺、醒來、離床是否連續。重複點床及玩家 Sleep 中點 Window 不應延長或插隊（SA-P02、T02 / T05）。
3. 自主 Sleep / Settle 時點 Window，確認先安全醒來再走向窗戶，沒有直接跳回站姿；到窗前對正、Observe 四秒、自然回自主（T06 / T10）。
4. Sleep 中環繞床的正面、側面與房間斜角，縮放、重設及調整視窗大小。特別看頭與枕頭、軀幹與床墊、尾巴及床緣是否沉入／浮起；不要只看 Debug 判斷（SA-P03、T07 / T09）。
5. 開 Debug，在 Walk to bed 與 Sleeping 分別切到另一 Chrome 分頁 10 秒，再切回。phase 不應直接跳過、Sleep / cooldown 不應消耗這 10 秒；接著可完成 Wake 並走開（T12）。
6. 沿用 V0.1 acceptance 的獨立 Chrome production performance 補驗步驟，記錄瀏覽器版本、硬體、viewport、取樣時間、FPS 與是否一直前景。不要用 In-app 數據替代。

| PO AC | 結果 |
| --- | --- |
| SA-P01 睡覺可讀性 | Accepted — PO 整體人工驗收，2026-09-15 |
| SA-P02 全流程連續與可愛節奏 | Accepted — PO 接受 Settle / Wake 與整體可愛度，2026-09-15 |
| SA-P03 多角度睡姿與空間關係 | Accepted — PO 接受修正後 Sleep pose，2026-09-15 |
| SA-P04 自主生活感 | Accepted — PO 整體人工驗收，2026-09-15 |

PO Manual Acceptance 已完成；獨立 Chrome 技術補驗仍待提供實測資料。下一個 Slice 不在本輪執行範圍。

## Known Limitations / Architecture observation

- 睡姿使用程序 group transform 與局部 morph，沒有骨架、IK、完整接觸解算或床墊變形；取樣測試只排除已測空間 regression。PO 已接受目前睡姿與轉場，這些程序模型限制不阻擋 Slice A。
- 床尾轉角與 visual offset 專為現有房間、床和程序狐狸尺寸設計；更換家具位置／模型必須重驗，未引入通用碰撞或 navigation。
- 小視窗的既有左側 UI 會遮住部分床與角色；可隱藏 Debug、環繞鏡頭，完整可讀性仍待人工。
- 最近 build 共享 Three.js chunk 約 629.24 kB（gzip 159.14 kB），出現 >500 kB warning；本 Slice 未改打包策略。
- 真實 Chrome background / performance 與完整 resize 的技術補驗資料仍未提供；不將 PO 的產品驗收當作這些項目的測量證據。SA-P 已 Accepted。
- 真實重複：Bed / Window binder 各自做 pointer down/up、5px drag、nearest-hit、dispose；Character 各自管理 request / arrival / timed return。Sleep 多了床尾 waypoint 與可中斷的安全 Wake，語意尚不相同，因此只記錄，不建立 Furniture / Action Framework。

## Changed Files / Diff Summary

- `src/Character.ts`：Sleep intent / local phases / priority / cooldown / room-specific bed route。
- `src/createFoxVisual.ts`：床上演出及 neutral reset；保留既有造型與 locomotion。
- `src/scene.ts`：Bed references、命名及 Sleep layout；既有 furniture geometry 不變。
- `src/main.ts`：Sleep layout / Bed binding / dispose 的組合。
- `src/DebugPanel.ts`：Bed hits、Sleep phase / seconds / cooldown、真實 target 與點床提示。
- 新增 `src/sleep.ts`、`src/BedInteraction.ts`、`tests/sleep.test.mjs`。
- 原有未提交的 Approved `docs/V0_2_WEB_SPEC.md` 完整保留；`docs/ARCHITECTURE.md` 保留 approval 並附本次 implementation observation。
- 新增本紀錄與 `docs/evidence/v0.2-sleep/`。原 `tests/behavior.test.mjs`、V0.1 驗收與資產歷史未改。

Slice A — Sleep 已由 PO Accepted，無新的功能 blocker。已知程序模型限制不阻擋 Slice A；技術補驗未實測的項目仍如實保留。下一步準備建立 Sleep checkpoint，不在本輪開始 Read／Eat。
