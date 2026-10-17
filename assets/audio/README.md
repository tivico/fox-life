# 小屋音樂與錄音來源

## 窗邊慢慢

`window-afternoon.ogg` 是為 Fox Life 原創的 66 BPM、24 小節、3/4 拍輕鋼琴小品，約 65.45 秒；沒有鼓點或聲樂。樂譜與音色合成在 `src/homeMusic.ts`，用 `node tools/render-home-music.mjs` 產生中間 WAV，再以 ffmpeg 加固定 13.71 dB 增益、Vorbis quality 5 編碼。尾韻和反射以循環時間包覆，避免重新開始時截斷音符。此原創檔案沿用本專案權利，不宣稱外部曲庫作品。

## 腳步

`step-wood-0..2.ogg` 與 `step-rug-0..2.ogg` 來自 Kenney **Impact Sounds 1.0**，原名 `footstep_wood_000..002.ogg`、`footstep_carpet_000..002.ogg`。

- 作者／來源：[Kenney](https://kenney.nl/assets/impact-sounds)
- 授權：CC0，隨包原始授權保留在 `Kenney-License.txt`。
- 修改：90 Hz high-pass、1600 Hz low-pass、7 ms attack fade、音量乘 0.16、轉 24 kHz Vorbis。輪替三種腳步，保留錄音質感，移除原本合成低頻鼓點。

## 葉片微風

`leaves-gentle.ogg` 來自 **large leaves rustle in the wind sound effect**，作者 **Garuda1982**。

- 作者頁：[Freesound 575645](https://freesound.org/people/Garuda1982/sounds/575645/)
- 公開音訊：[作者提供的高品質 MP3 預覽](https://cdn.freesound.org/previews/575/575645_2061858-hq.mp3)
- 授權：[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，作者頁確認可修改與再散布。
- 修改：取第 12–21 秒，180 Hz high-pass／2200 Hz low-pass、2 秒淡入與 3 秒淡出、音量乘 2.2 校正原始低錄音電平，轉 24 kHz Vorbis。只間歇播放，沒有持續風噪迴圈；環境音預設 30%，音樂預設 55%。

這些素材打包在專案內，播放時只從本站載入，不連到外部音訊網站。翻頁、掃地等其他短音效仍使用 `soundDesign.ts` 的原創合成。
