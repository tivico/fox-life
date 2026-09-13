# Fox Life — Blender low-poly stylized fox V0.1

此工具生成獨立靜態資產，不改動 Web 角色、State、Camera 或互動。已以 **Blender 5.2.1 LTS** 實際執行、輸出並渲染。未測其他 Blender 版本；5.2 的 use_nodes 有未來 6.0 棄用警告，目前執行成功。

## 執行

在 repository 根目錄 PowerShell 執行（另選 output 避免覆寫現有成果）：

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/blender/generate_fox_v01.py -- --output assets/fox-v01-new --render
```

已有成果位於 `assets/fox-v01/`。只生成模型可省略 `--render`。若明確要替換指定輸出目錄的同名產物，加 `--overwrite`；預設偵測已有成果會停止。

也可在 Blender 的 Scripting workspace 選 Open，開啟 `generate_fox_v01.py` 後 Run Script。這會新建並切換到 `Fox_Life_Asset_V01` 場景，保留既有場景；預設輸出在 script 旁的 `generated/`。執行會把目前 Blender 檔案另存到輸出目錄的 `fox_v01.blend`，原本檔案不覆寫；`.blend` 會包含原有場景，所以建議在新的空白 Blender 檔執行。GLB 僅匯出新場景的角色選取物件。若由 Text Editor 執行而檔案路徑不可寫，使用上述 CLI 指定 `--output`。

## 生成方式與外觀

- 約 **2.46 頭身**：依不含耳的腳底到頭冠／頭高設計，體積融合與平滑後為近似比例。
- 含耳總高統一 **1.30 m**，大頭、短肢、圓潤三角耳、向上延伸的蓬鬆大尾巴。
- 初始幾何只作體積草模，之後 voxel remesh 融合為**一個連通且封閉的頭／軀幹／頸／四肢／耳／尾網格**，不保留草模拼接面。
- 平滑接合後減面；身體約 8,000 三角形，全角色 **8,840 三角形／6 mesh／3 材質**。其餘五個小 mesh 為兩眼、鼻子、兩顆鈕扣。
- 橘紅、奶油白、綠色吊帶褲與深色掌部，採 GLB 可攜的 vertex color 及粗糙非金屬 Principled 材質；無真實毛髮、外部貼圖或外掛。
- 吊帶褲為貼合身體的表面色區，非獨立布料模擬；五官克制、不加入巨大高光或眉毛。

## 主要可調參數

script 頁首：`HEIGHT`（最終高度）、`VOXEL_SIZE`（融合解析度）、`BODY_TRIANGLE_BUDGET`（身體三角形上限）、五組色票。`build_body()` 內為头身及四肢比例，`tail()` 內為尾巴曲線控制點／截面寬度；`paint()` 定義臉部、耳內、尾尖與吊帶褲色區。

初次生成採固定參數，無隨機數。換 Blender 版本時減面輸出不保證逐位元一致。

## 產物與 Three.js 目標

- `fox_v01.blend`：可編輯角色及独立預覽場景，開檔後可用 Numpad 0 查看相機構圖。
- `fox_v01.glb`：靜態角色，無地板、灯光、相機或其他場景物件；約 **254 kB**。
- `fox_v01_preview.png`、`fox_v01_side.png`：實際 Cycles 渲染，不是概念生成圖。
- `fox_v01_report.json`：連通性、封閉性、尺寸與面數結果。
- `fox_v01_three_validation.json`：Three.js loader 的驗證及 GLB SHA-256。

Blender 為 Z-up／面向 -Y；匯出為 glTF Y-up／面向 +Z，原點在地面中央，符合現有 Character 的正面方向。模型變換已套用，沒有靠根節點縮放補尺寸。使用 Blender 官方 [glTF exporter API](https://docs.blender.org/api/main/bpy.ops.export_scene.html)，限定 active scene 和 selection；材質依 [glTF 材質支援](https://docs.blender.org/manual/en/dev/addons/scene_gltf2.html) 使用基本 PBR 與頂點色。

從 repository 根目錄可重跑實際 Three.js 0.186.0 載入驗證：

```powershell
node tools/blender/validate_fox_glb.mjs assets/fox-v01/fox_v01.glb
```

驗證包含：GLB header、解析成功、6 mesh、身高與地面原點、有限頂點數值、主體頂點色、沒有場景地板／相機／外部圖片／動畫。驗證器的身高檢查對應預設 HEIGHT=1.30；調參後需同步更新該條件。

## 範圍與限制

這是可重生成、可匯入 Three.js 的**靜態造型 V0.1**，未包含骨架、蒙皮、UV、Idle／Walk／Observe 動畫或網站接線。體積融合後的自動減面拓撲不是為關節變形設計；進一步做動畫前，需要重拓撲／骨架與權重處理。有限頂點色會使吊帶褲、口鼻及尾尖邊界帶柔化／鋸齒感，後續可精修色區或做自製 UV 材質。平滑輪廓不等於已完成動作的滑順感。

本輪沒有將模型替換進 production，也没有新增生活功能。
