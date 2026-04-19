# PROJECT WALKTHROUGH HISTORY

---

## 2026-04-19 | Maximized Analytics Masterpiece: Data Sources & Visual Polish (v1.3.0 - Final Phase)

本次更新完成了全螢幕分析儀表板的最終整合，將 Data Sources (FileManager) 完美移植至最大化視圖，並實現了全系統 HUD 的視覺設計大一統，標誌著 v1.3.0 系列功能的完美收官。

### 變更內容
- **Data Sources 側邊欄移植 (Integrated Data Sources)**：
    - **深度整合**：將檔案管理與上傳系統正式嵌入全螢幕地圖左側。支援自動佈局適配，確保與右側圖表欄高度對稱。
    - **2D/3D 切換同步**：實作了流暢的 2D/3D 模式切換邏輯，Data Sources 狀態與交互在不同維度間無縫銜接。
- **全系統玻璃設計大一統 (Unified Glassmorphism UI)**：
    - **靜態玻璃規範 (`glass-container-static`)**：設計了專屬的靜態玻璃材質，徹底修復了 WebGL 環境下 `backdrop-filter` 磨砂感失效的瀏覽器渲染 Bug。
    - **全 HUD 族群封裝**：將 `Data Sources`、`Track Info`、`Car Info`、`Analysis Laps` 以及 `Compact Telemetry` 全部更換為統一細膩的磨砂穿透風格。
    - **交互細節強化**：為所有靜態面板同步補全了滑鼠感應的「邊框高光 (Rim Highlight)」與「動態聚光 (Glow Search)」效果，大幅提升了操作的回饋感與高級感。
- **Minimap 邏輯與效能優化**：
    - **簡約化重構**：將 2D Minimap 複雜的動態比例計算改為與 3D 版一致的固定 5:3 佈局，減少 2D 畫布重繪負擔並統一視覺語言。
    - **玻璃質感校準**：針對 2D 模式純黑背景導致的磨砂感缺失，透過微調基底色分量，確保在 2D 黑色畫布上依然能保有明顯的透明玻璃感。
- **排版與空間精算**：
    - **對稱式設計**：精確校準 Data Sources 最下方的「Return to Active Session」按鍵位置，使其與右側 Data Charts 的底緣完美對齊，達成橫向視覺平衡。
    - **緊湊化處理**：優化了上傳區域與標題間距，提升了左側空間的資訊密度。
- **3D 渲染精準化 (v1.3.0 Final Polish)**：
    - **對位補正 (Coordinate Alignment)**：修正了跨 Session/Stint 時 3D 參考行車線的位移問題，確保行車線與車輛位置完美閉合。
    - **播放控制同步**：統一了 2D 與 3D 的播放倍數 (`[4, 2, 1, 0.5]`) 與下拉選單 UI，並加寬倍率按鈕提升操作手感。
- **性能優化 (HUD Performance)**：
    - **硬體加速與屏蔽**：針對 Overlap HUD 實作 `will-change` 屬性，並在拖拽期間動態禁用 CSS Transitions 與 Layout-thrashing 函式 (`getBoundingClientRect`)，解決了玻璃材質帶來的移動延遲，恢復至 60FPS 的流暢手感。

### 驗證結果
- [x] Data Sources 在 2D/3D 模式下皆具備完美的磨砂穿透效果，且滑鼠高光跟隨流暢。
- [x] 左右側邊欄在不同解析度下皆能維持底緣水平對齊，視覺重心極其穩定。
- [x] Minimap 在切換時縮放平滑，且不再產生背景閃爍或比例扭曲。
- [x] 所有 HUD 面板在 3D 場景中皆不再出現「死黑」遮擋，呈現透亮的高級感。

---

## 2026-04-19 | Horizon Value Labels Evolution (v1.3.0 - Small UI update)

本次更新將圖表右上角的數值顯示由垂直堆疊優化為「動態水平排列」，顯著提升了介面的專業感與空間利用率。

### 變更內容
- **水平數值標籤系統 (Dynamic Horizon Labels)**：
    - **動態空間分配**：預設情況下 Current 數值靠右顯示；一旦開啟 Reference Lap，Current 會自動左移並在右側插入 Reference 數值區塊。
    - **專業視覺設計**：在兩組數值間引入了垂直分割線 (`border-l`) 與 `REF` 輔助文字，確保高強度分析時數值讀取的準確性。
    - **全域同步更新**：此邏輯直接作用於核心 `TelemetryChart.tsx`，主儀表板與各類 HUD 圖表皆同步升級。

### 驗證結果
- [x] 在窄屏或側邊欄 HUD 模式下，水平排列的數據依然整齊且不發生重疊。
- [x] Reference 数据的顯示與隱藏轉場平滑，單位顯示清晰。

---

## 2026-04-19 | Data Charts HUD & Interaction Logic Mastery (v1.3.0 - Phase 8)

本次更新完成了全螢幕分析介面的最後一塊拼圖：右側數據圖表 HUD，並優化了底部控制中心的交互邏輯，解決了 UI 遮擋問題。

### 變更內容
- **右側數據圖表 HUD (Data Charts Overlay)**：
    - **位置與佈局適配**：固定於介面右側 `top-[185px] right-[-12px]`，調整為具備最高優先權的層級 (`z-[2000]`)。
    - **進場與消失動畫**：實作 `AnimatePresence` 容器與 `motion.div` 動畫，實現流暢的右側滑入/滑出效果。
    - **交互邏輯優化**：導入 `onWheelCapture` 捕捉階段攔截技術，徹底封死 2D 模式下地圖縮放對圖表捲動的干擾。
    - **極致緊湊化**：將組件間距 (`gap`) 與圖表外邊距 (`mb`) 降至最低，實現專業監控牆感的堆疊。
- **控制中心與系統優化**：
    - 修復了控制中心對側邊欄選單的 Z-index 遮擋。

### 驗證結果
- [x] 成功修復 Analysis Laps 列表下方選項無法點擊的 Bug。
- [x] Data Charts 在 2D/3D 模式下的位置、動畫與同步邏輯完全一致。
- [x] 多圖表堆疊時，右側側邊欄的滾動與佈局更新表現穩定。

---

## 2026-04-19 | Smart Sidebar & Premium Animation Symphony (v1.3.0 - Phase 7)

本次更新完成了 Dashboard 的核心架構進化，將資訊面板轉型為「智能側邊欄 (Smart Sidebar)」，並導入了頂級的 Framer Motion 動畫系統，實現了極致流暢的 UI 交互體驗。

### 變更內容
- **智能側邊欄架構 (Smart Sidebar Architecture)**：
    - **架構解耦**：將 `Track Info`、`Car Info` 與 `Analysis Laps` 從原本的可拖拽 HUD 系統中抽離，轉型為固定於左側 (`top-12 left-4`) 的非交互式側邊欄。
    - **Flex 佈局優化**：改用 CSS Flexbox 垂直堆疊，並將組件間距調整為 `gap-3`，大幅提升資訊整合度與佈局穩定性。
- **頂級動畫系統整合 (Framer Motion)**：
    - **佈局感知位移 (Layout Transitions)**：引進 `framer-motion` 的 `layout` 特性。當任一側邊欄組件被關閉時，其下方的組件會以平滑的物理曲線向上遞補空缺，徹底消除「閃現」感。
    - **分層進出場動畫**：
        - **進入**：空間先平滑展開同步內容從左側滑入。
        - **退出**：內容先左滑淡出同步空間平滑收縮。
    - **物理彈性調優**：設定 `stiffness: 120` 與 `damping: 20` 的彈簧物理模型，賦予 UI 更具高級感的軟彈手感。
- **2D/3D 模式全方位同步**：
    - **全螢幕 UI 統一**：重構 `TrackMap3D.tsx` 以完全對標 2D 模式的全螢幕側邊欄位置與動畫效果。
    - **3D 視角細節微調**：
        - 將 3D 側邊欄頂部距離微調至 `top-14` 以避開控制項。
        - 將「ELEVATION SCALE」統一更名為「Z SCALE」並縮短滑桿長度，讓左上角介面更精簡。
- **控制中心 UX 重新定義**：
    - **選單分類**：在 **HUD SETUP** 選單中加入物理分割線，將「Telemetry Overlap」與固定側邊欄組件區分開來。
    - **順序優化**：依據操作頻率重新排列：Track Info > Car Info > Analysis Laps > Data Charts。
- **Store 瘦身與邏輯簡化**：
    - 移除了 3 個組件的 Config 狀態與 `localStorage` 冗餘讀寫。
    - 簡化 `validateHudLayout` 邏輯，現在僅需處理 Overlap HUD 與側邊欄的避讓關係。
- **Car Info 細節強化**：
    - **動態寬度適配**：移除固定寬度限制，改為 `w-fit` 結合 `whitespace-nowrap`，讓面板能根據車名長度自動伸展。
    - **資訊層次豐富化**：在 Model Name 下方新增了 `rawCarName` (Car/Team Name)，提供更完整的車輛背景資訊。

### 驗證結果
- [x] 無論 2D 或 3D 模式，全螢幕下的側邊欄動畫皆表現出一致的滑順感。
- [x] 快速切換多個 HUD 開關時，排版會自動平滑重組，無任何重疊或錯誤閃爍。
- [x] 重整頁面後，側邊欄的顯示狀態與 Overlap 的自定義位置皆能完美復原。

---

## 2026-04-18 | Laps Analysis HUD & Interactive Selection (v1.3.0 - Phase 6)

本次更新實作了功能豐富的「Analysis Laps」HUD，讓使用者能直接在 2D/3D 地圖介面中進行深度的單圈數據對比與切換，大幅提升了分析效率。

### 變更內容
- **Analysis Laps HUD 正式實作**：
    - **航段化分組 (Stint Grouping)**：自動將單圈按 Stint 分組，並支援獨立摺疊/展開，解決了長距離測試時單圈列表過長的問題。
    - **多維度矩陣顯示**：除了單圈時間，還整合了 S1、S2、S3 分段時間，並以紫金色標記該 Session 的 PB（個人最快）。
    - **交互快捷按鍵**：每圈皆提供「C」(Current) 與「R」(Reference) 快捷按鍵，實作點擊即時更新遙測圖表。
- **智能優先權佈局整合**：
    - **高權重穩定性**：在 `validateHudLayout` 中將其設為高優先權 HUD（次於 Track/Car Info），確保其在右側穩定展開，不輕易被其他組件推移。
    - **動態高度感知**：當 Stint 展開導致 HUD 高度大幅變化時，系統會自動重新計算與下方遙測框的垂直間距。
- **跨模式一致性**：
    - 同步於 `TrackMap.tsx` 與 `TrackMap3D.tsx` 注入，確保在 2D 與 3D 模式下擁有完全相同的分析體驗。

### 驗證結果
- [x] 成功將 50+ 圈數據按 Stint 分組顯示，且滾動流暢。
- [x] 點擊「C」按鈕，主遙測圖表即時跳轉至該圈起點；點擊「R」按鈕，參考線同步更新。
- [x] 在編輯模式下調整位置與縮放，刷新頁面後皆能正確復原。
- [x] 展開/摺疊 Stint 時，下方的 HUD 能自動平滑下移/上移，無重疊現象。

---

## 2026-04-18 | HUD Performance & Interaction Overhaul (v1.3.0 - Phase 5)

本次更新徹底重構了 HUD 的交互底層，實現了極致流暢的拖拽體驗，並導入了具備優先權感知的智能重疊校正系統。

### 變更內容
- **極致流暢拖拽 (rAF Throttling)**：
    - 引入 `requestAnimationFrame` 節流機制，將拖拽運算與 React 渲染循環分離，解決了高頻率滑鼠事件導致的 UI 卡頓。
    - **推遲驗證策略**：拖拽過程中僅執行邊界限制 (Boundary Clamp)，將昂貴的碰撞檢查推遲至放開滑鼠與尺寸變化後執行。
- **智能重疊校正系統 (Smart HUD Constraints)**：
    - **優先權驗證陣列**：實作 `validateHudLayout` 集中管理 Action，按 `Track Info` (錨點) → `Car Info` → `Telemetry Overlap` 順序進行漸進式校準。
    - **非侵入式修正**：當 HUD 因為內容增加（如 Car Info 加入參考車輛區塊）或全螢幕切換導致尺寸變動時，系統自動尋找最近的空位並平滑「推開」其他 HUD。
- **全螢幕/動畫同步優化**：
    - **過渡感應器**：針對全螢幕切換動畫實作了 400ms 的延遲驗證機制，配合「權威 Config 座標法」，徹底解決了動畫期間 `DOMRect` 測量過期導致的座標偏移疊加問題。
- **品牌語義化調整**：
    - 將全系統的 `Vehicle Info` 標籤統一更名為 `Car Info`，提升專業感。
- **間距配置微調**：
    - 定義了 `EDGE_MARGIN` (0.8%) 與 `HUD_GAP` (0.4%)，在確保不重疊的同時，讓 HUD 展現出更有層次感的佈局。

### 驗證結果
- [x] 在 120Hz 螢幕下拖拽 HUD 依然保持滑順，無明顯掉幀。
- [x] 進入/退出全螢幕後，HUD 之間能自動重新排隊，且不會無限向角落縮進。
- [x] 當 `Car Info` 高度大幅度變化時，下方的遙測框能正確自動下移避讓。

---

## 2026-04-18 | Track Info HUD & 3D Lab UI Evolution (v1.3.0 - Phase 4)

本次更新完成了「Track Info」HUD 的實作，並針對 3D 客製化控制介面進行了重大的體驗升級，統一了全系統的 HUD 操作邏輯。

### 變更內容
- **Track Info HUD 正式登場**：
    - **綜合數據面板**：新增 `TrackInfoOverlay` 組件，整合賽道名稱、佈局資訊，以及目前與參考圈的即時天氣狀態。
    - **字體清晰與優化**：透過硬體加速 (`translate3d`) 與 CSS 濾鏡優化解決了縮放時的字體模糊問題；放大佈局字體並調整字距增加可讀性。
- **3D Elevation Lab 介面重構**：
    - **Z-Scale 橫向化**：將原本垂直手感的 Z-Scale 滑桿改為橫向佈局，並優雅地整合進 3D 視圖左上角的標題列旁。
    - **狀態全域化**：將 Z-Scale 狀態移入全域 Store，確保 3D 主視圖與 3D Lab 間的數據高度同步。
    - **交互攔截機制**：大幅提升控制 UI 的 Z-Index 並實作事件冒泡攔截，解決了調整 Z-Scale 時會誤觸底層 3D 地圖旋轉的問題。
- **HUD 交互系統一致化**：
    - **感官體驗升級**：將所有 HUD (Overlap, Track Info) 的縮放圖示換成簡約的「對角雙向箭頭」，並修正了反向縮放的邏輯 Bug。
    - **佈局預設分流**：針對 `Overlap` HUD 實作了「標準模式」與「全螢幕模式」的獨立預設位置，確保在不同容器尺寸下皆能維持最佳視角。

### 驗證結果
- [x] Track Info 在進入/退出全螢幕時能精確保持獨立的縮放比例與位置。
- [x] 3D 模式下的 Z-Scale 調整流暢，且不再導致地圖視角意外偏轉。
- [x] 所有 HUD 組件縮放手感一致，預設位置不再覆蓋賽道主體。

---

## 2026-04-18 | HUD State & Persistence Stabilization (v1.3.0 - Phase 3)

本次更新針對 HUD (Telemetry Overlap) 的定位同步與全域干擾問題進行了深度底層排查，確保跨視圖、跨模式間座標的高度穩定與完美對齊。

### 變更內容
- **全域座標覆寫保護 (Minimap Isolation)**：
    - 移除了所有輔助地圖（2D 側邊欄 Sidebar Map、2D 右上角 Minimap、3D 右下角 Minimap）執行背景 HUD 校準的權限。
    - 結合 `isExpanded` 屬性條件渲染，徹底防止小地圖因為容器過小，而強制將全域儲存的 HUD 座標拉回中心點的「座標劫持」災難。
- **解決過渡期回彈干擾 (Elastic Race Condition Fix)**：
    - 移除了原有的 `ResizeObserver` 與自動掛載的防越界 `checkAndClamp` 機制。
    - 發現並阻斷了全螢幕切換回標準模式時，`App.tsx` 彈性動畫 (`cubic-bezier`) 導致的地圖「瞬間擠壓」，從而引發自動校準誤判並永久更改使用者設定的問題。
- **UI 顯示與邏輯完美剝離**：
    - 精確切分 Sidebar Map 與 Minimap 的邏輯。Sidebar Map 恢復原始設定 (`isMiniMap=false`)，重新顯示「Track Map」標題與控制列，並透過 `isExpanded=false` 來禁用其 HUD 的干擾。

### 驗證結果
- [x] 無論拖拽或點擊切換，2D 主地圖與 3D 主地圖間的 HUD 位置 100% 同步且一致。
- [x] HUD 位置移至邊緣角落後，進入與退出全螢幕皆能死死鎖在該座標，不再向中心飄移。
- [x] Sidebar 地圖面板保留原生控制台與標題，不影響全域座標系統。

---

## 2026-04-18 | Telemetry UI/UX Flagship Refresh (v1.3.0 - Phase 2)

本次更新完成了遙測儀表板控制中心與 HUD 組件的旗艦級動畫與視覺重定義工作，實現了極致的操作層次感與視覺一致性。

### 變更內容
- **旗艦級玻璃 UI 規範 (Glass UI Standardization)**：
    - **雙層玻璃結構**：所有 2D/3D 按鍵統一使用 `glass-container` + `glass-content` 架構，具備細膩的邊框發光與背景磨砂感。
    - **形狀語義化**：功能性開關（如 HUD Setup, Minimap）統一為 `rounded-lg`；系統動作（如 Play, Maximize）統一為 `rounded-full` 圓形。
- **HUD Setup 選單重構**：
    - **高級交互動畫**：導入 `cubic-bezier(0.34, 1.56, 0.64, 1)` 彈性縮放動畫，手感更具質感。
    - **選取視覺優化**：捨棄傳統勾選，改用「藍色高亮光框」標註已啟動的 HUD 組件，完美對標播放倍速選單。
- **組件登場動畫同步 (HUD Entry Animations)**：
    - 為 Overlap 與其他 HUD 組件補全了「Minimap 規格」的登場動畫（位移 + 縮放 + 透明度漸變）。
- **3D 模式數據鏈路修復**：
    - 修復了 3D 模式下 Overlap 開關與渲染樹斷鏈的 Bug，現在已能正確在 3D 視圖中開關遙測圖表。
- **設計去雜訊 (Minimalist Polish)**：
    - 移除 HUD 下拉選單標題，收窄寬度至 `w-40`，減少全螢幕下的視覺遮擋。

### 驗證結果
- [x] 2D 與 3D 地圖控制按鍵視覺、高度與垂直軸線 100% 對齊。
- [x] HUD 下拉選單與組件登場動畫流暢且不干擾拖放邏輯。
- [x] 已移除所有測試開發期間產生的殘留隱含字元。

---

---

## 2026-04-17 | 2D Track Map Fullscreen Foundation (v1.3.0)

本次更新實作了 2D 地圖的全螢幕基礎設施，並優化了控制中心（Control Center）的佈局與互動邏輯。

### 變更內容
- **2D 全螢幕模式 (Maximize Mode)**：實作 2D 地圖的全螢幕切換功能，進入全螢幕時自動隱藏導航與側邊欄。
- **控制中心優化 (UI Tweak)**：
    - 將 **Maximize** 按鍵設置於最右側。
    - **Sidebar Map (ChevronRight)**：將原本的縮小按鍵更換為向右箭頭，提示字改為 "sidebar map"。
    - **動態顯示邏輯**：全螢幕模式下自動隱藏 "sidebar map" 按鍵；3D 模式下移除該按鍵。
- **跨維度 UI 同步**：同步 3D 模式的控制中心按鍵佈局。

### 驗證結果
- [x] 2D 地圖全螢幕順暢展開，UI 自動隱藏。
- [x] 全螢幕下 "sidebar map" 按鍵自動消失，避免誤觸。
- [x] 3D 模式控制列保持簡潔，僅保留必要功能（Maximize/Restore）。

---

## 2026-04-15 | Telemetry v1.2.2 - Hardened Stability & Playback Fix

本次會話專注於系統強健性，特別是針對非典型遙測檔案的載入與播放邏輯進行了加固。

### 變更內容
- **系統穩定性防禦 (System Hardening)**：
    - 針對 COTA 等特殊 Session 檔案實作「零容忍」檢查機制。
    - 針對缺失的數據渠道實作安全取值鎖，介面現在能優雅降級顯示為 "--" 而非崩潰。
- **平滑播放修復 (Smooth Playback Calibration)**：
    - 修復了 v1.2.0 平滑播放導致的時間軸數字卡在 `0:00.000` 的 Bug。
    - 透過強制索引取整 (Math.floor)，確保播放時的時間顯示精確同步。

---

## 2026-04-15 | Telemetry v1.2.1 - 賽道數據同步 (LMU v1.3.1.2)

本次更新同步了最新的賽道資料庫，擴展了佈局支援。

### 變更內容
- **賽道庫大更新 (Track DB Expansion)**：
    - **資料同步**：全面對標 Le Mans Ultimate v1.3.1.2 遊戲數據。
    - **佈局補全**：新增 Paul Ricard、Silverstone、Spa 等賽道的高程參考點。
    - **長度校準**：精確校準 Monza、Interlagos、Bahrain、Sebring 等賽道的佈局長度，誤差縮距至 1m 以內。
- **文件同步**：新增 `lmu_track_list.md` 作為使用者查詢手冊。

---

## 2026-04-14 | Telemetry v1.2.0 - 座標歸一化與數據 Self-Healing 重磅更新

本次會話解決了跨會話參考單圈位移與 HUD 邊界超界的問題。

### 變更內容
- **3D 渲染精準對位 (Unified Origin)**：重構了 `TrackMap3D.tsx` 的座標投影邏輯。場景中所有元素統一使用「當前工作階段」的地理中心作為座標原點，解決跨 Session 位移。
- **HUD 邊界韌性強化 (Persistent Boundary Clamping)**：整合 `ResizeObserver`，HUD 會偵測容器尺寸變動即時校準位置。
- **播放啟動異常與數據「Self-Healing」修復**：修復了某些檔案（如 COTA）初始載入會卡在 0:00.000 的問題，點擊播放時會自動跳轉至首筆有效點。

---

## 2026-04-13 | Interactive Telemetry HUD - 全方位自定義系統上線

本次更新實作了遙測疊加層 (HUD) 的拖拽、縮放與持久化儲存功能。

### 變更內容
- **互動式編輯模式**：實作 `Double-Click to Edit`，支援 `Current` 與 `Reference` 遙測框獨立拖拽。
- **配置持久化**：所有自定義位置與縮放比例均自動儲存於 `localStorage`。
- **全域重置功能 (One-Click Reset)**：一鍵還原至官方標準對稱佈局。
- **視覺回饋**：定義平滑的邊界發光動畫與狀態引導提示字。

---

## 2026-04-12 | 3D Dashboard - UX 精緻化與效能「零延遲」優化

本次會話專注於 3D 遙測模組的操作順暢度。

### 變更內容
- **智能視角系統 (Intelligent Viewport)**：實作賽道感知自動對焦，確保視角避開 HUD。
- **非對稱追焦**：根據賽道方向 (CW/CCW) 自動調整後視角度。
- **效能架構重定義 (Zero-Lag Sync)**：引入 `resetKey` 機制，移除動畫干涉，實現點擊時間軸「指哪打哪」的操作感。

---

## 2026-04-11 | Steering Calibration - 使用者自訂轉向比例

本次更新實作了方向盤轉向鎖角 (Steering Lock) 的手動校準功能。

### 核心功能
- **手動覆寫 (Manual Override)**：允許使用者自訂實體方向盤度數（如 900度）。
- **Per-Profile 持久化**：設定自動根據登入帳號儲存於 `localStorage`。
- **動態視覺回饋**：當手動校準啟動時，UI 會顯示橘色提示文字與目前的 `manual_lock` 度數。

---

## 2026-04-09 | 3D Lab 功能大對標 (Phase 3)

實作了 3D Lab 的高級分析功能，包含熱圖與參考單圈渲染。

### 核心功能
- **3D 行車線熱圖 (Heatmap Sync)**：將 3D 軌跡與 2D 的「煞車/油門/滑行」熱圖色彩完全同步。
- **雙圈 3D 對比 (Reference Comparison)**：支援同時渲染主單圈與參考單圈的 3D 軌跡與幽靈車 (Ghost Car)。

---

## 2026-04-09 | 3D 軌跡引擎全方位穩定化 (Phase 1 & 2)

本次會話解決了 3D 引擎初始開發時的座標偏差與 API 報錯問題。

### 核心突破
- **航段感知數據融合 (Stint-Aware Fusion)**：解決 Lap 0 銜接圈數據遺失問題，實作「航段錨點法 (Stint-Anchor)」。
- **數據清洗機制 (NaN/Inf Filter)**：徹底消除 API 傳回殘缺 JSON 導致的 500 報錯。

---

## 2026-04-05 | 3D 軌跡渲染與高度映射功能上線 (Initial Alpha)

### 核心功能
- 實現基礎 3D 賽道模型渲染。
- 初步對接 DuckDB 數據源。

---
