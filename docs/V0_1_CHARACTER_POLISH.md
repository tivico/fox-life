# V0.1 — 角色一體感與動作滑順度 Polish

2026-09-10；`feature/v0.1-vertical-slice` 未提交 working tree。接續 visual refinement 的 0.76 倍外觀與约 2.4 頭身，沒有再縮小角色；房間、Camera、窗戶與站位保持原值。

## 造型一體感

- 頭部改為同一低密度球面頂點塑形出的口鼻，奶油色臉頰直接使用 vertex color 色區。移除獨立左右腮球與口鼻球，小鼻與薄眼睛仍是獨立幾何，保留無眉毛、無高光零件。
- 原先分離的胸／腹改為單一梨形旋轉曲面，往上延伸成藏於頭部下方的頸部，降低頭身切斷感；綠色吊帶褲保留。
- 手臂支點內移、肩部嵌入軀幹，手掌與手臂合為同一曲面上的漸變色區；褲管至腳掌改為連續輪廓，減少球狀拼接。
- 尾根向軀幹內移 0.08 局部單位、根部半徑由 0.085 增至 0.14，讓根部接合藏入臀部；保留一體漸尖大尾巴。
- 使用現有 Three.js 旋轉曲面、頂點塑形和色區；沒有外部模型／貼圖、高模細節或新依賴。

## 動作與時序

- 起步：線速度 damping 由 9 改 6；約 0.22 秒、低幅度的身體壓低／前傾預備動作與步伐淡入同步進行，不阻擋玩家 command。
- 停步：接近站位的減速係數由 3 改 2.6；步態依實際速度而非「有位移就全幅」混合，軀幹、頭、手臂與前後腳位逐漸回穩。
- 轉向：由固定角速度裁切改為角速度 damping，仍保持最高 3.6 rad/s；目標接近時降低角速度、避免越過目標方向。頭部／身體有輕微反向滯後。
- Observe 前：到達容差內並完成面向後，在原 Walk／Player Command 狀態收勢 **0.18 秒**；隨後才開始完整 **4 秒** Observe。這是既有 approach 的姿勢過渡，沒有第四個 State、queue 或新玩法；重複點擊不重置收勢。
- Observe：接近窗前就逐步進入穩定姿勢；觀察中頭部／視線使用「轉向—短暫停留—回正」的克制動作，替代連續正弦掃視。
- Tail／ears：尾巴 yaw／pitch 與耳朵採小幅阻尼彈簧，受到加減速及轉向影響，有延遲、跟隨與回穩；以小時間步進維持低更新率下穩定，不影響世界座標。
- Idle：保留柔和呼吸、眨眼與小幅視線；降低持續耳／尾擺幅。腳底保持在地面以上，視覺 root 不累積位置偏移。

核心 State、命令優先權、到達容差、四秒 Observe、背景前景時間政策、房間／互動／Camera 與原有測試架構保持；本輪有意調整 Character 的轉向／速度過渡與到站收勢，並非宣稱所有行為程式碼未變。

## 驗證與證據

- Typecheck、build：exit 0。11 tests passed、0 failed（原有 9 項＋2 項新回歸測試），240.1518 ms。
- 新測試：收勢保持 Walk、重複指令不延長、後續仍完整四秒；20／60／144 Hz 模擬下角速度限幅、所有 transform 有限、腳底不入地、尾巴有延遲且能回穩。這些 Hz 是模擬步長，不是 browser FPS 數據。
- Production：`index-XemZZTn5.js`，600.00 kB／gzip 153.60 kB；build 146 ms。>500 kB 警告保留；相對上一版 596.34／152.24 kB 小幅增加。
- In-app Browser production smoke（1280×720、127.0.0.1:4178）：自主 Walk 接受窗戶 command，後續捕捉 Observe／Player Command 與 Idle／Autonomous／None，回到房內自主活動。Console error／warning 擷取結果為空。第一次等待未捕捉 Observe，未當作成功證據；後續指令實際捕捉並保存。
- [命令輸出](evidence/v0.1-polish/verification.json)、[Smoke 原始紀錄](evidence/v0.1-polish/smoke.json)、[Observe 截圖](evidence/v0.1-polish/observe-entry.png)、[尺寸／mesh／來源 hashes](evidence/v0.1-polish/manifest.json)。
- [造型對照](evidence/v0.1-polish/before-after.png)：同鏡頭、同光照、中立姿勢；[QA 頁](evidence/v0.1-polish/comparison.html) 由 dev 提供，不加入 production 玩家頁面。
- 本輪沒有量測產品 FPS；In-app smoke 與靜態截图不能證明 PO 主觀滑順感、獨立 Chrome 效能或 background-tab 驗收通過。歷史 60.40 秒／1.19 FPS 僅為受限測試環境記錄。

## Placeholder 的剩餘限制與下一步建議

目前仍不是連續拓撲、骨架蒙皮角色：頭／耳／肩／腿／尾巴仍以 group 旋轉與局部重疊遮藏接合。大幅轉頭、擺臂時可能看出穿插；尾巴是整段延遲旋轉，沒有多節骨骼沿長度傳遞的彎曲。步行仍是程序擺腳，沒有腳掌鎖定、IK 或動畫 root motion；色區受有限頂點密度影響，近看可能有插值／輪廓不夠精細的地方。這些限制不宜靠無限增加球體或 damping 參數持續堆疊。

**建議 PO 實際體驗本版後，下一個獨立任務可進行有限 low-poly fox asset spike。** 用一隻具連續身體拓撲、基本骨架與簡單色區的狐狸，驗證頭身／肩臀接合、可彎曲尾巴、Idle／Walk／Observe 的自然過渡，沿用現有行為接口。先比較同房間中的輪廓、轉場、載入與渲染成本，再決定是否替換 placeholder；不伴隨 V0.2 玩法或正式高品質資產管線。本輪僅提出建議，未啟動資產製作。

## Changed files

產品：`src/createFoxVisual.ts`（造型／動畫）、`src/Character.ts`（速度／轉向／到站收勢）。測試：`tests/behavior.test.mjs` 追加兩項。文件：本文件、驗收後續註記及 `evidence/v0.1-polish/` 的前版來源快照、對照頁與驗證檔。上一輪證據原樣保留。不 push、不 merge、不進入 V0.2。
