# fox_v02_static 視覺審核

2026-09-13。狀態：技術檢查完成；**PO 選擇目前程序狐狸繼續，v02 保留為比較資產，未採用**。v02 是角色資產版本，不是產品 V0.2；沒有 Rig、動畫或行為整合。

PO 決策原文：「想要以目前進度選擇程序狐狸接著下一步」。此決策確認目前角色方案，不代表 AC-11 全流程人工驗收或 Chrome 效能驗收通過。後續回到程序狐狸的 V0.1 驗收；下方為本次資產交付時的歷史紀錄，不再等待 v02 採用核准。

PO 回饋：v01 技術載入成功，但衣服／毛色與腿／腳掌的混色不符合預期；目前程序模型的協調性與色塊可讀性較佳。這份紀錄不將技術成功視為美術接受。

## 交付與比較

- [Blender 原檔](../assets/fox-v02/fox_v02_static.blend)、[GLB](../assets/fox-v02/fox_v02_static.glb)、[生成報告](../assets/fox-v02/fox_v02_static_report.json)。
- [Blender Python script](../tools/blender/generate_fox_v02_static.py)。重用 v01 的幾何輔助函式，未修改 v01 script 或資產。
- 本機 production 並排預覽：<http://127.0.0.1:4182/?preview=fox-v02>。左程序模型／右 v02；相同房間、光線、模型原點及同步鏡頭。可拖曳、縮放或切換視角。一般 `/` 仍使用既有角色流程。

| 視角 | Blender render | Three.js 並排實拍 |
| --- | --- | --- |
| Front | [正面](../assets/fox-v02/fox_v02_static_front.png) | [正面比較](evidence/fox-v02/compare-front.png) |
| 3/4 | [3/4](../assets/fox-v02/fox_v02_static_three_quarter.png) | [3/4 比較](evidence/fox-v02/compare-three-quarter.png) |
| Side | [側面](../assets/fox-v02/fox_v02_static_side.png) | [側面比較](evidence/fox-v02/compare-side.png) |
| 房間 | — | [實際房間比較](evidence/fox-v02/compare-room.png) |

## 本輪修改

身體保留融合成單一連通、封閉表面的幾何，頭部略加寬、口鼻略收短，保留大耳與大尾巴。高度為 1.30 m，與程序模型約 1.292 m 的尺寸基準接近；沒有縮放房間或家具。維持 2～3 頭身的造型方向，是否協調仍由 PO 判斷。

原本頂點色混合改為面材質分區，邊界不跨面插值。衣服是獨立、有厚度的褲身、胸兜、背片與肩帶，略高於身體；褲管覆蓋腳掌交界，消除橘色細環。毛色、奶油白、深色手腳以明確輪廓分開。自然光影仍會使同一色塊明暗變化，並非材質混色。

| 材質 | sRGB 色碼 | Roughness |
| --- | --- | --- |
| Orange_Fur | #BC713F | 0.90 |
| Cream_Fur | #EEE1C5 | 0.90 |
| Green_Overalls | #647D57 | 0.95 |
| Dark_Paws | #493C32 | 0.90 |
| Eyes | #362E2B | 0.90 |
| Nose | #40322A | 0.90 |
| Buttons | #DFCEAA | 0.90 |

全部為簡單 Principled BSDF → glTF core PBR，metallic 0；沒有貼圖、頂點色或材質 extensions。保留柔和霧面，不依賴 Blender procedural shader。

## 驗證

- Blender 5.2.1 LTS 生成、儲存及三視角 Cycles render 成功。
- GLB 370,392 bytes、15,588 triangles、7 種材質；Three.js r186 GLTFLoader 實際解析成功。檢查 finite positions、normal、地面原點、高度、無 skin／animation／texture／COLOR_0。見 [GLB 驗證](evidence/fox-v02/glb-validation.json)。這是專案針對性驗證，不是 Khronos 全面認證。
- typecheck、11 tests／0 failed、production build 成功，見 [完整輸出](evidence/fox-v02/verification.json)。既有 Character 與程序模型來源雜湊未改，見 [修改前保存清單](evidence/fox-v02/preserved-before.json)。
- In-app Browser 在 production preview 載入成功並切換四視角，保存上述實拍及 [smoke 狀態](evidence/fox-v02/browser-smoke.json)。不視為獨立 Chrome、AC-10 效能或 PO 人工接受。
- v01 blend／GLB／generator 的 SHA256 與本輪開始前一致。沒有 push 或 merge。

重建（repo 根目錄，預設不覆寫；刻意重建 v02 才加入 `--overwrite`）：

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/blender/generate_fox_v02_static.py -- --output assets/fox-v02 --render
node tools/blender/validate_fox_v02.mjs
npm run typecheck
npm test
npm run build
npm run preview -- --port 4182 --strictPort
```

## Known Limitations 與 PO 待辦

- 靜態資產，沒有骨架、權重、變形拓樸或動作測試；尚未替換正式生活流程角色。不能据此推定日後動畫可用。
- 自動生成的低模面切割與衣服接縫仍可近看辨識；奶油白邊界較幾何化。衣服保留獨立表面，不是人工重拓樸的正式服裝資產。
- v02 仍比程序模型偏修長、大耳，並非完全複製程序模型；請 PO 在三視角與房間比較輪廓、五官協調性、色塊與床／窗比例，記錄「核准」或具體需修改處。
- 三視角 Blender 光影與 Three.js 房間光影不同，以實際 Three.js 預覽作為產品外觀比較依據。
- shared Three.js chunk 626.38 kB，既有 >500 kB build warning 保留；雙場景 review 不用來推定產品效能。本輪不重做完整 AC 驗收。

完成交付後停在此階段，等待 PO 核准，沒有開始 Rig 或動畫。
