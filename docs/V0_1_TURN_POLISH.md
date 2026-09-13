# V0.1 Turn / Locomotion Polish

2026-09-13。程序狐狸限定 polish；沒有新增 State、尋路、骨架、家具或玩法，未修改 GLB。**最新狀態：PO 已接受轉向、起停、Window Observe 與整體動作體驗，Accepted。本輪 polish 結束，只有明確 regression 才再修改 motion。**

原文與範圍見 [PO 接受紀錄](evidence/v0.1-closeout/po-acceptance.md)。下方驗證與待辦保留交付時的歷史內容；Chrome background／performance 仍待補驗，不能由動作接受推定通過。

## Before / After

| Before | After |
| --- | --- |
| 朝向誤差超過 0.35 rad 約 20°，完全停止前進 | 正向對準程度連續控制速度，超過 20° 時也可逐步起步 |
| 原地轉完後沿目標直線前進 | 沿身體前向移動，對準時形成小弧線；不做 root 橫移 |
| 頭部隨 turnRate 向反方向滯後 | 頭部先看目標，局部 yaw 上限 0.48 rad 約 27.5°，身體跟上後自然回正 |
| 零位移時步相不前進，像整隻滑轉 | 大角度低速轉身加入交替抬腳、輕微脚掌轉向及重心變化 |
| 單靠移動速度驅動脚步 | 保留位移驅動步相，大角度 pivot 額外推進同一相位，走起來逐漸退出 pivot |

速度以 `max(0, cos(error))³` 調節，速度平滑後再以對準比例限制實際位移，避免舊速度把角色推向反方向。大於等於 90° 時先轉身踏步，進入前向半平面後連續起步；這不是保證任何角度都立即平移。

前向步長裁切於既有活動範圍加窗前站位的矩形內，避免靠邊時沿邊橫滑。這不是通用碰撞或導航。窗前到達容差、最後對正、0.18 秒收勢與完整四秒 Observe 保留。

轉身踏步同時受角速度、朝向誤差及 walk blend 控制；誤差 0.55～1.15 rad 漸入，30° 以下不額外引發 pivot。頭部只改旋轉，不移動頭部接點。沒有承諾 placeholder 任意角度完全無接合穿插。

## 驗證結果

| 角度 | 左右轉／20、60、144 Hz 模擬 | 房間四角出發 | 窗前對正 |
| --- | --- | --- | --- |
| 30° | 通過 | 通過 | 通過 |
| 60° | 通過 | 通過 | 通過 |
| 90° | 通過 | 通過 | 通過 |
| 135° | 通過 | 通過 | 通過 |
| 180° | 通過 | 通過 | 通過 |

以上 Hz 是模擬步長，不是 browser FPS。30 組中心轉向案例驗證只向前移動、20° 以外已有平移、頭部朝向及上限、可到達 Observe；40 組角落／雙向弧線案例每六幀抽查角色包圍盒與真實場景家具包圍盒，未發現碰撞。不是全空間連續碰撞證明。

另外驗證 5°／15°／30° 不加 pivot 抬腳，90°／135°／180° 左右腳交替抬起並可回穩。直走速度從 0.35 加倍至 0.7 時，脚步頻率約加倍。Idle→Walk、Walk→Idle、Walk→Window command、Walk→Observe、Observe→Idle 的逐幀局部位移與旋轉均在測試上限內，未發現數值跳姿；這不等於 PO 認定動作自然。

- Typecheck、15 tests／0 failed、build：全部 exit 0。[完整輸出](evidence/v0.1-turn/verification.json)、[來源 SHA256](evidence/v0.1-turn/manifest.json)。原有 11 項回歸全部保留，新增四項驗證。
- 最終 production smoke：<http://127.0.0.1:4182/>，In-app 1280×720。捕捉 Walk to window／Player Command、Observe 3.15 / 4.00、返回 Autonomous／None 及自主 Walk；環繞／重設／隱藏 Debug 可操作。[原始狀態](evidence/v0.1-turn/smoke.json)、[返回後畫面](evidence/v0.1-turn/after-observe.png)。原服務已停止，重新啟動後完成此輪驗證。
- 本次 smoke 沒有擷取 Console，不宣稱 runtime error／warning 為零；不替代 AC-01 Chrome console 驗收。
- build 仍有 shared chunk >500 kB 警告。未做正式 FPS 取樣；60.40 秒／1.19 FPS 僅舊受限環境紀錄。

## PO 手動檢查（正常 Chrome，1～2 分鐘後再獨立量測）

1. 開普通 `/`、隱藏 Debug，看數次自主起步／停步：是否仍有突然彈起、腳步快速但身體幾乎不動、停後持續踏步。
2. 狐狸面向不同方向時點窗，觀察約 30°／60°／90°／135°／180° 修正。正式 UI 無精確角度設定，人工僅近似觀察；精確角度由上述測試涵蓋。
3. 小轉向應輕微修正而非不停抬腳；大轉向應先看目標、交替換腳，接著漸進起步。檢查胸前／側面視角的頭頸是否過扭或露接縫。
4. 在自主 Walk 中點窗，檢查不瞬移、不明顯橫滑、不突然改腳姿；從靠床、另一側及靠窗位置各完成一次，確認尾巴與家具淨空。
5. 窗前停住後仍朝向窗戶、短暫收勢，再 Observe 四秒並返回自主。連點不能延長 Observe。
6. 依 [Chrome 人工補驗](V0_1_CHROME_MANUAL_ACCEPTANCE.md) 獨立做背景分頁與 `?measure=1` 前景取樣，保存環境、原始 JSON、操作與卡頓紀錄。不可把本次 In-app smoke 代填通過。

回填：日期／Chrome 版本；起停、各角度轉身、脚步、頭身、家具淨空、窗前收勢各填「接受／需調整／未完成」，有問題附發生位置或錄影。未收到結果前不代 PO 核准。

## Known Limitations / Blocker / Checkpoint

- 仍是 group 驅動程序脚步，沒有 IK／腳掌鎖地或骨架 root motion；支撐腳可能有微滑，近看接點仍可能露出。尾巴也不是多節彎曲。
- 靠活動邊緣時可能先轉到朝內才前進；只保證本房間既有配置的抽樣結果，沒有新增障礙物支援。
- 未发现此輪功能性 blocker；「明顯跳姿／舒適度」仍需 PO Chrome 視覺確認。V0.1 的 Chrome、真實 background、正式效能及完整 AC-11 待驗收事項仍存在，不能宣稱 V0.1 全部接受。
- 建議 PO 確认此輪轉身沒有需修問題、完成 Chrome 補驗後，整理目前 working tree 為穩定 V0.1 checkpoint。須審查既有大量未提交變更，不直接把全部檔案混作本輪修改。本輪未 commit／push／merge，不進入 V0.2。

## Changed Files（本輪範圍）

- `src/Character.ts`：連續速度、前向弧線、範圍限制、目標視線資訊。
- `src/createFoxVisual.ts`：頭部先行、大角度踏步與步相融合。
- `tests/behavior.test.mjs`：四項轉向／淨空／脚步／轉場回歸。
- 本文件、`V0_1_ACCEPTANCE.md` 後續記錄及 `evidence/v0.1-turn/`。其他 working tree 修改是既有進度，不歸入本輪 diff。
