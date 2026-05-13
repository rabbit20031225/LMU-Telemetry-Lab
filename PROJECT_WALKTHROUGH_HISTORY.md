# PROJECT WALKTHROUGH HISTORY

## 2026-05-11 | 介面動態穩定性與 UI 佈局精修 (v1.4.0 Phase 13)

本次更新聚焦於極致的視覺穩定性與檔案管理介面的細節精修，解決了地圖切換時的閃爍問題，並強化了數據顯示的邏輯正確性。

### 1. 檔案管理員視覺精修 (File Manager Refinements)
- **智慧字型縮放 (Auto-Scaling Vehicle Names)**：針對「依車輛分組」的大字卡實作了動態字型縮放。當車名過長時，系統會自動縮小字體並支援雙行顯示，確保完整型號資訊（如賽事年份或特定車隊）立即可見而不被截斷。
- **下拉選單寬度對齊**：統一了「依組別分組」與「依車輛分組」模式下的子選項選單寬度，消除了介面切換時的視覺跳動感。

### 2. 遙測數據顯示優化 (Telemetry Logic Fixes)
- **換檔數據平滑化 (Gear Shift Ignoring Neutral)**：針對圖表中的換檔紀錄邏輯進行了修正。在偵測到換檔過程產生的瞬時 `0` 檔 (Neutral) 時，系統會自動忽略並延續前一檔位（如 `3-0-4` 會顯示為 `3-3-4`），避免圖表出現不自然的尖峰落差。

### 3. 地圖 HUD 與過渡動畫穩定化 (Map Transition Stability)
- **不透明 Loading 遮罩 (Opaque Transition Overlay)**：將地圖切換時的 Loading 背景調整為完全不透明 (`#0a0a0c`)。這能完美遮蔽 WebGL 在容器尺寸劇烈變動（如全螢幕還原）時產生的版面跳動與重繪過程。
- **即時觸發機制 (Instant Loading Trigger)**：將 `isMapTransitioning` 狀態提升至全域 Store。現在點擊最大化、縮小或展開地圖的瞬間，遮罩會立即出現，提供更專業、無延遲的響應感。
- **邊界強制裁切 (Overflow Containment)**：在所有地圖容器層級加入了 `overflow-hidden`。這徹底解決了賽道線條在切換瞬間偶爾會「噴出」地圖框邊界的視覺 Bug。
- **HUD 延遲進場**：優化了 HUD 的出現時機，確保地圖缩放動畫完全結束後才顯示懸浮資訊，避免座標計算在動態過程中產生偏移。

---

## 2026-05-10 | 單圈數據切片與匯出系統 (v1.4.0 Phase 12)

本次更新完成了 LMU Telemetry 的最後一塊核心拼圖：**單圈數據切片與匯出功能**。使用者現在可以將特定的單圈數據提取為獨立的 `.duckdb` 檔案，方便分享或存檔，且完全相容本系統的分析邏輯。

### 1. 智慧型數據切片引擎 (DuckDB Slicer Engine)
- **精準時間範圍過濾**：後端實作了 `export_lap` 服務。系統會自動識別目標單圈的 GPS 起迄時間，並對所有遙測通道進行精確切片。
- **多頻率同步對齊**：針對無時間戳 (ts) 的索引對齊資料表（如 100Hz, 50Hz, 10Hz 通道），實作了基於 `GPS Time` 主頻道的索引映射演算法，確保切片後的數據在各頻率間依然完美同步。
- **完整元數據保留**：匯出的檔案會全數保留原始檔案中的 Metadata（賽道、車輛、車手資訊）、Channel List 以及 Car Setup 配置，確保匯出檔是功能完整的獨立遙測資料庫。

### 2. 專業命名規範 (Professional Export Convention)
- **成績單風格檔名**：匯出檔案採用標準化命名格式：`[賽道簡稱]_[車型]_[第幾圈]_[單圈時間]_[車手姓名]_[時間戳].duckdb`。
- **檔案系統相容性**：自動將車型與車手名稱中的空格替換為連字號 (`-`)，並移除不合法字元，確保檔案在所有作業系統下皆能穩定排列與識別。

### 3. HUD 整合與交互體驗 (Frontend Integration)
- **一鍵式匯出按鈕**：在單圈選擇器 (HUD Lap Select) 下拉選單中為每一圈新增了「下載/匯出」圖示。
- **即時狀態回饋**：整合了 `Loader2` 旋轉動畫。當系統正在後端進行切片運算時，按鈕會自動切換為載入狀態，防止重複點擊。
- **自動化下載流程**：匯出完成後會自動觸發瀏覽器下載，並根據後端生成的專業檔名進行命名。

---

## 2026-05-07 | 旗艦級數據導航與設定系統優化 (v1.4.0 Phase 11)

本次更新對遙測導覽系統進行了視覺與功能上的雙重飛躍，將「懸浮膠囊」設計語言貫穿全系統，並實作了無死角的頻道配置介面。

### 1. 導航介面「懸浮膠囊」重構 (Floating Capsule Navigation)
- **視覺語言大一統**：將類別標籤進化為具備 `backdrop-blur-3xl` 與深色玻璃質感的 **「擴展膠囊 (Extended Capsule)」** 風格，與地圖控制中心達成完美視覺同步。
- **高保真動態效果**：整合 `framer-motion` 實作像素級精準的 **藍色發光滑塊 (Glow Indicator)**。滑塊具備物理彈簧動畫，並優化了溢出渲染，確保藍色 Glow 效果圓潤且不被切斷。
- **專業級排版**：標籤更換為完整單字全稱（GENERAL, TYRES...），字體放大至 **11px**，搭配 **h-10** 容器高度，顯著提升操作直覺性與易讀性。

### 2. 圖表視覺與數據強化 (Telemetry Chart Enhancements)
- **Y 軸刻度精確化**：強化了圖表 Y 軸標籤邏輯，確保每個通道至少顯示兩個以上的數值標籤，以便使用者精確判讀數據間距與範圍。
- **專業佈局優化**：根據駕駛觀測需求優化了各通道預設高度。例如將 **Speed** 提升至 **180px**，**Throttle/Brake/Steering/RPM** 統一調整至 **140px**，提供更清晰的線性控制觀測空間。
- **專業級數據通道全面擴充**：本次大規模新增並重新分類了針對賽車工程分析的專業圖表：
    - **DRIVER (駕駛輸入)**：包含 Speed, Throttle, Brake, Gear, Steering, Engine RPM。
    - **TYRES (輪胎專區)**：
        - **Individual Temps (FL/FR/RL/RR)**：獨立四輪胎溫監控。
        - **Pressures (4-Wheel)**：四輪胎壓疊圖分析。
        - **Slip Ratio (All)**：全車滑移率疊圖。
    - **DYNAMICS (車輛動態)**：
        - **Suspension Pos (FL/FR/RL/RR)**：四輪避震行程紀錄。
        - **Ride Heights (F/R)**：前後車底離地高度。
        - **3rd Elements (Front/Rear)**：前後第三減震器位移。
    - **HANDLING (操控與物理)**：包含 Yaw Rate (偏航率)、Lateral G (橫向力)、Longitudinal G (縱向力)。
    - **SYSTEMS (電子與能源)**：
        - **TC / ABS Active**：輔助系統作動紀錄（ABS 僅限 GT3）。
        - **Hybrid SoC / Fuel Level**：油電混合系統電量（僅限 Hypercar）與剩餘油量監控。

### 3. 設定視窗「全時管理」系統 (Omnipresent Settings)
- **跨分類編輯能力**：在設定視窗的「Chart Layout & Colors」區塊移植了同樣的導航系統。使用者不再需要預先切換主畫面，即可在設定內隨時調整任何分類（如 Electronics 或 Suspension）下的頻道顏色與開關。
- **模板數據驅動 (Master Template)**：設定介面改由 `CATEGORY_CHART_CONFIGS` 完整模板驅動，並即時合併 `localStorage` 的自定義設定，實現了「全時可見、全時可調」的管理體驗。
- **交互邏輯優化**：利用 `useMemo` 動態計算頻道清單，確保設定變更與主儀表板在數據層級 100% 同步。

### 3. UI 精修與強健性
- **邊界渲染校準**：優化了膠囊容器的 Padding 與滑塊計算比例，確保在極端分段（如最左/最右）時，滑塊的圓角形狀依然完美呈現。
- **語法與穩定性修補**：修復了開發過程中 JSX 標籤未閉合導致的編譯錯誤，確保設定視窗在複雜狀態切換下的穩定性。

---

## 2026-05-04 | 專業數據通道擴展與分類導航系統 (v1.4.0 Phase 10)

本次更新將遙測分析能力提升至工程級別，實作了自動化虛擬通道計算與高效的數據分類管理系統。

### 1. 後端虛擬通道實作 (Advanced Calculations)
- **解除數據封印**：更新 `telemetry_service.py` 釋放 `Susp Pos`, `3rdDeflection`, `Tyre Temps` 等 100Hz 關鍵數據。
- **滑移率 (Slip Ratio) 計算**：在數據融合階段自動根據 Wheel Speed 與 Ground Speed 計算四輪滑移率。
- **輪胎溫度映射 (I/C/O Mapping)**：根據輪胎位置（左/右）自動將原始數據映射為 Inside/Centre/Outside，支援精確的 Camber 分析。

### 2. 前端圖表分類系統 (Category Management)
- **數據導航標籤頁**：在圖表區新增 `GEN`, `TYRE`, `SUSP`, `HAND` 四大分類標籤，解決高密度數據下的 UI 堆疊問題。
- **一輪三點 Bundled 模式**：擴充 `TelemetryChart` 組件，支援單一圖表同時渲染 I/C/O 三條曲線，協助分析胎面熱量分佈。
- **四輪數據選取 (Wheel Index)**：實作 `wheelIndex` 提取機制，能從陣列型遙測通道中精準選取特定輪胎的數值進行繪圖。

### 3. 視覺與交互優化
- **專業級圖表配置**：為每個分類預設了最佳的顏色、單位與高度設定。
- **跨單圈對齊強化**：在多線並行顯示模式下，依然能與參考單圈 (Reference Lap) 保持完美的像素級對齊。

---

## 2026-05-04 | HUD 數據顯示精緻化與單圈佈局重構 (v1.4.0 Phase 9)

本次更新針對遙測 HUD 的即時顯示進行了深度優化，實作了更符合專業賽車邏輯的單圈數據佈局與視覺導引系統。

### 1. Lap Details 單圈字卡重構 (Single-Lap HUD Redesign)
- **橫向雙層佈局**：在僅有單圈數據時，字卡由垂直行改為水平雙層排列，大幅優化側邊欄空間利用率。
- **理論最快圈系統 (Theoretical Best)**：
    - **Session 級別最快區段**：自動計算整份檔案中 S1、S2、S3 的歷史最佳成績（BS），並標註來源圈數（如 `L12`）。
    - **理論成績計算**：即時加總最快區段，顯示該賽道與車輛組合的 Theoretical Best。
    - **紫色視覺標準**：所有最佳成績統一採用紫色（Purple）顯示，數值顯示位置優化至標籤右側。
- **當前單圈與動態顏色**：
    - **動態色彩回饋**：當前 Sector 若達到全場最快則顯示紫色，否則顯示黃色（Yellow）。
    - **智慧進位顯示**：修正時間格式，當 Sector 超過 60 秒時自動顯示分鐘位，否則維持簡潔的 `ss.ms` 格式。

### 2. Live Telemetry 與交互優化
- **圖標視覺強化**：將遙測圖標（Speed, Throttle 等）調亮並增加 `brightness-125` 濾鏡，顯著提升深色模式下的辨識度。
- **數據源徽章 (Data Source Badges)**：為所有 Lap 標記加上半透明背景徽章（Badge），強化數據來源（L{lap}）的視覺權重。
- **對照模式瞬時切換**：放寬 `hasRef` 觸發條件。現在只要一選中 Reference Lap，系統會立即展開側邊欄並切換至對照佈局，無需等待後端數據載入完成。

---

## 2026-05-03 | 賽車設定分析系統整合 (v1.4.0 Phase 8)

本次更新實作了完整的賽車設定 (Car Setup) 檢視與對比系統，透過全域覆蓋層與高保真的視覺設計，為使用者提供專業級的技術分析介面。

### 1. 全域覆蓋架構 (Global Setup Overlay)
- **頂層 Z-Index 遮蔽**：將 `CarSetupView` 提升至應用程式根層級 (`z-[9999]`)，確保在 2D/3D 地圖或全螢幕 HUD 模式下，都能完美覆蓋所有 UI 元素。
- **毛玻璃沉浸感**：採用 `backdrop-blur-3xl` 與 `bg-black/90` 背景，營造出離開賽道進入維修區 (Pit) 的沈浸式視覺轉換。
- **全方位入口**：除了在 Session Info 的 Car Card 加入入口，亦同步在 **全螢幕 HUD (Car Info Overlay)** 整合了快速連結，點擊 `EXIT` 後可無縫回到先前的監控狀態。

### 2. 智慧對比系統 (Comparative Analysis)
- **自動對比抓取**：切換 Reference Lap 時，系統會自動透過後端 API 抓取參考圈的設定數據，並將 `Current` (白色) 與 `Reference` (橘黃色) 數值並排顯示。
- **智慧差值顯示**：僅在數值不同時顯示參考值，減少資訊干擾；同時針對 3D Spring 等特殊組件實作了專屬的三欄式佈局。
- **專業級佈局**：所有數據表格採用靠右對齊 (Right-aligned)，符合賽車工程軟體的數據比較習慣，並加大了標題字體以提升辨識度。

### 3. 高保真視覺與動畫 (Premium UX/UI)
- **動態過渡動畫**：導入 `framer-motion` 實作了頁面「進場縮放 + 模糊」與「出場消散」動畫，以及分頁切換時的橫向滑動過渡。
- **互動式玻璃材質**：每個設定區塊皆具備 `handleGlassMouseMove` 的光源感應效果，並採用自定義的 `setup_icon.png` 維修圖示。
- **滑動指示器**：分頁標籤下方加入了具備 `layoutId` 的平滑移動指示條，提升導航的視覺流暢度。

---

## 2026-05-02 | 檔案管理員 UI/UX 深度重構與互動升級 (v1.4.0 Phase 7-1)

本次更新對 `FileManager` 組件進行了全面翻新，放棄了傳統的鑽取式 (Drill-down) 導航，改用高保真的多開手風琴 (Accordion) 介面，大幅提升了操作流暢度與資訊密度。

### 1. 互動架構升級 (Accordion Navigation)
- **多開模式支援**：實作了無狀態跳動的多選單展開邏輯，確保使用者在瀏覽下方賽道時，佈局不會因為上方選單自動收折而發生位移。
- **動態高度動畫**：導入 `grid-rows-[1fr]` 的平滑展開動畫，搭配 `glass-container` 毛玻璃材質，維持與 `ReferenceLapBrowser` 一致的高級設計語言。

### 2. 資訊層級與排序優化
- **三層智慧排序**：導入了精準的排序系統：第一層依 **賽道名稱 (A-Z)** 排列；第二層依 **Layout 名稱 (A-Z)** 排列；第三層依 **組別 (Car Class)** (A-Z) 排列；最後再依 **日期 (由新到舊)** 進行排序，確保大量檔案管理時井然有序。
- **最佳圈速解析**：在後端 `list_sessions` API 整合了 `TelemetryService.get_laps_header`，於檔案清單中直接顯示該 Session 的最佳圈速 (Best Lap)，並能以紅色 `[INVALID]` 標籤警示無效圈。
- **駕駛與車輛資訊**：修復了 `driverName` 在後端讀取遺漏的問題，並將字卡佈局調整為永遠保留「組別」與「駕駛員名稱」，避免被長檔名截斷。

---

## 2026-05-07 | 階層導航精煉與高保真動畫 (v1.4.0 Phase 7-2)

本次更新聚焦於檔案管理員的階層邏輯精煉與視覺動效升級，透過更智慧的分組模式與流暢的動畫回饋，打造極致的檔案庫瀏覽體驗。

### 1. 智慧階層分組 (Hierarchical Grouping)
- **組別子模式切換**：在「組別 (Class)」分組模式下，新增了「賽道/車輛」二級切換功能。使用者可自由決定展開後是要依 **Track -> Sessions** 還是 **Car -> Sessions** 進行二階排列。
- **獨立狀態記憶**：每個組別 (如 GT3, Hypercar) 現在皆具備獨立的切換狀態，互不連動，滿足不同類別檔案的整理習慣。

### 2. 視覺美化與品牌識別
- **國旗與品牌 Logo**：全面移除通用圖示。賽道階層現在會直接顯示該賽道所屬國家的 **國旗 (Country Flags)**；車輛階層則會根據車名自動匹配並顯示對應的 **品牌標誌 (Brand Logos)**，大幅提升辨識速度。
- **全域計數標籤**：在「檔案 (Files)」標題及所有分組資料夾上加入了場次計數標籤，即時顯示各分類下的檔案總量。
- **強健標題佈局**：重構了資料夾標題的雙區塊架構，確保長組別名稱 (如 LMP2_ELMS) 不會與功能按鍵重疊，並具備優雅的自動截斷機制。

### 3. 高保真流暢動效 (Premium Animations)
- **滑動背景指示器**：整合 Framer Motion `layoutId` 技術，為所有模式切換按鈕實作了平滑滑動的藍色背景指示條，提供極具質感的互動反饋。
- **佈局同步優化**：針對工作區縮放調整了 `layout` 動畫屬性與 Spring 彈簧參數，確保 UI 元素在容器變動時能更即時地跟隨到位。

### 3. 視覺一致性 (Design System)
- **全局色彩統一**：將 `carHelpers.ts` 中的 `getClassColor` 升級為全局標準的高保真調色盤（Hypercar: 琥珀金, LMP2: 天藍, LMP3: 靛藍, GT3: 翠綠），並同步更新了 `SessionInfo` 與 `CarInfoOverlay` 的視覺表現。
- **國旗與品牌標識**：全面導入各國國旗動態對應（替換了原本的 MapPin），並利用加深的 `bg-black/30` 背景區分賽道主卡片與檔案子卡片的層級。

---


---

## 2026-05-08 | 自動化導航與檔案交互系統升級 (v1.4.0 Phase 7-3)

本次更新極大化了檔案管理與導覽的自動化流程，透過智慧定位與持久化狀態管理，消除了一切不必要的點擊操作。

### 1. 智慧導航與自動定位 (Smart Navigation & Focus)
- **上傳自動展開**：實作了 `autoExpandNewestSession` 邏輯。當使用者上傳新檔案後，系統會自動在分類清單中展開該檔案所在的資料夾，並平滑捲動至該位置，確保新數據立即可見。
- **返回自動追蹤**：現在從儀表板返回 Data Sources 或重新整理網頁時，清單會自動展開並定位到目前開啟的檔案，讓使用者能接續之前的瀏覽位置。
- **置頂捲動優化**：優化了捲動偏移量 (`scroll-mt-20`)，確保目標檔案在捲動置頂後仍保有適當的視覺緩衝，不被頂部搜尋框遮擋。

### 2. 持久化狀態管理 (Persistent UX)
- **全域狀態記憶**：將「分類模式 (Grouping Mode)」與「分組子模式」持久化存入 `localStorage`。系統現在會精確記住使用者的整理習慣，重新整理後不會重置回預設模式。
- **介面狀態恢復**：實作了雙重旗標驗證，確保在「有活動 Session」或「之前正開啟清單」的情況下，重新整理會自動跳回 Data Sources，解決了重新整理後出現空白佔位畫面的問題。

### 3. 交互細節優化 (Interaction Refinement)
- **金色呼吸燈特效**：為新上傳或當前關注的檔案實作了 `new-upload-highlight` 特效。檔案外框會具備金色的呼吸發光效果，直到使用者點選任何檔案或上傳新檔為止。
- **自動視圖切換**：整合了 `onClose` 回調。現在點選任何檔案後，系統會自動從 Data Sources 跳回 Session Info (HUD)，省去手動關閉的操作。
- **智能按鈕顯示**：當系統處於無選取檔案的狀態時，會自動隱庫 FileManager 下方的返回按鈕，引導使用者完成檔案選取。

### 4. 全新「時間排序」模式 (Flat Chronological List)
- **一鍵時序排列**：在分組模式中新增了「時間排序 (Clock)」按鈕。該模式會打破所有資料夾層級，將所有檔案以扁平列表形式呈現，並按上傳/建立時間由新到舊排列。

🟢 2026-05-02 | File Manager UI/UX Overhaul & Interaction Upgrade (v1.4.0 Phase 7)

Overhauled the `FileManager` component, replacing the legacy drill-down navigation with a high-fidelity, multi-expansion accordion interface to improve usability and data density.

### Key Features
- **Multi-Expansion Accordion**: Implemented a stable accordion layout that allows multiple tracks to be expanded simultaneously, preventing jarring layout shifts during navigation.
- **Smart Triple-Tier Sorting**: Introduced a precise sorting logic: Track (A-Z) -> Layout (A-Z) -> Car Class (A-Z) -> Date (Newest First).
- **Session Best Lap Extraction**: Upgraded the backend `list_sessions` API to parse lap headers directly, surfacing the Best Lap time and validity (with red `[INVALID]` warning) directly on the session cards.
- **Unified Global Palette**: Centralized the car class color system (Hypercar: Amber, LMP2: Sky, LMP3: Indigo, GT3: Emerald) across the entire application, including `SessionInfo` and `CarInfoOverlay`, to ensure visual consistency.

---


## 2026-05-02 | 遙測數據正規化與分析精度優化 (v1.4.0 Phase 6)

本次更新實現了專業級的遙測距離正規化系統，並修復了採樣率限制導致的分析誤差，確保所有數據對齊與官方紀錄 100% 吻合。

### 1. 距離正規化與自動拉伸 (Distance Normalization)
- **官方賽道長度強制對齊**：實作 `Auto-Stretch` 邏輯，優先使用註冊表中的官方長度（Official Track Length）作為基準，自動縮放遙測 Lap Dist，強制所有圈數在圖表上具有一致的總長度。
- **模糊佈局匹配 (Fuzzy Layout Matching)**：進一步強化匹配邏輯。若遊戲輸出的 Layout 名稱（如 `"Bahrain Outer Circuit"`）包含或被包含於註冊表名稱（如 `"Outer Circuit"`），系統現在能自動識別並抓取正確的官方長度，解決了命名不統一導致的對齊失敗。
- **數據融合層保護**：在後端 `fuse_session_data` 加入 `skip_tables` 機制，防止原始資料庫中的 Lap Dist 覆寫正規化後的精確距離。

### 2. 分析精度與 Delta 校正
- **Delta 飄移校正 (Delta Drift Correction)**：解決了因數據採樣點（Discrete Samples）無法完美落在終點線上導致的 `0.03s` 誤差。透過線性分攤演算法，強制圖表 Delta 尾端與圈速 Metadata 完美匯聚。
- **快取系統升級 (v5)**：將遙測快取升級至 `v5` 並強制清理舊數據，確保所有分析結果皆為最新正規化邏輯產出。

### 3. 前端穩定化
- **Store 狀態鎖定**：修復了 `telemetryStore.ts` 中重複屬性導致的編譯錯誤，並優化了 `isUserInteractingWithCharts` 邏輯以防止操作圖表時的鼠標抖動。


## 2026-05-01 | 地圖精度對齊與 UI 渲染優化 (v1.4.0 Phase 4 & 5)

本次更新完成了地圖視覺精度的最後一哩路，並解決了長期困擾的 UI 渲染瑕疵，實現了 2D 與 3D 模式的完美同步。

### 1. 地圖精度與物理化對齊 (Map Precision)
- **終點線物理化加厚與對稱覆蓋**：將 2D 終點線厚度定為 **8.0 公尺**，並採置中對齊（0m 偏移）。這能在衝線點前後各提供 4 公尺的覆蓋範圍，完美隱藏行車線數據重疊同時保持視覺比例協調。
- **全分界線方頭化 (Butt Line Caps)**：將 S1、S2、S3 所有分界線的端點統一改為平頭（Butt），提升專業視覺質感並消除圓頭導致的「藥丸感」。
- **後端向量驅動 (Backend Baked Vectors)**：更新 `elevation_service.py`，採用「環狀窗口中心差分」預算邊界向量，確保終點線與賽道入點始終保持 100% 垂直。
- **行車線獨立化**：移除了行車線頭尾自動銜接邏輯，保持遙測數據的原始起點與終點，避免在終點線處產生不自然的連線。

### 2. UI 旗艦級渲染穩定化 (UI Polish)
- **渲染瑕疵修復 (Spotlight Artifact Fix)**：解決了播放鍵懸停時出現的「方形亮框」Bug。透過移除控制條外殼的複雜聚光燈效果，改用純淨的 `backdrop-blur-3xl` 與 `bg-zinc-900/80`，確保圓形按鈕在 Windows 渲染引擎下保持完美形狀。
- **UI 佈局歸一化**：將播放鍵的構造與樣式與最右側的縮放鍵（Maximize/Restore）完全對齊，確保全系統操作邏輯與視覺重量感統一。
- **小地圖微調**：同步小地圖視覺，將終點線維持為輕量化細線，保持 UI 清爽。

### 3. 驗證結果
- [x] 車輛標記在 100% 進度時與厚白終點線完美重疊。
- [x] 2D 與 3D 區段分界線在切換時無任何位移。
- [x] 播放控制列在所有解析度下皆能保持純淨的圓角磨砂效果，無任何方形渲染殘影。

---

## 2026-05-01 | 賽道區段識別與交互體驗升級 (v1.4.0 Phase 3)

本次更新大幅提升了 2D 與 3D 地圖的賽道標識系統與交互直覺性，實作了標準化的區段線與看板化標籤。

### 1. 視覺標識標準化 (Standardized Boundaries)
- **視覺規範**：
    - **分界線 (S2, S3)**：統一更換為高飽和度黃色 (#ffff00)，線條加粗並設定為左右各 12 公尺。
    - **終點線 (FINISH)**：統一更換為白色 (#ffffff)，規格與分界線一致。
- **幾何精準化**：
    - **3D 幾何修正**：3D 終點線改採賽道中心座標（Lateral Offset）搭配實際寬度繪製，確保分界線完美覆蓋賽道而不偏移。

### 2. 看板化標籤系統 (Billboard Label System)
- **2D/3D 同步轉正**：實作了 Billboard 邏輯，確保 S1、S2、S3 標籤不論地圖如何旋轉，在螢幕上永遠保持水平正向。
- **2D 矩陣定位**：利用 `getTransform` 矩陣捕捉技術，解決了 2D 標籤在座標變換下的定位偏差問題，實現像素級的穩定性。
- **細節調教**：移除黑框、加粗字體；側邊欄地圖 (Sidebar Map) 自動隱藏標籤，減少視覺雜訊。

### 3. 2D 地圖交互體驗重構
- **鍵位調換**：根據專業操作習慣，將地圖操作改為「左鍵旋轉、右鍵平移」。
- **螢幕中心旋轉**：優化了旋轉演算法，軸心從「賽道原點」改為「畫面中心」，旋轉時畫面焦點不再飄移。
- **操作隔離**：針對側邊欄地圖禁用左鍵旋轉功能，僅保留移動與縮放，避免誤觸影響觀察。

---
 
 ## 2026-05-01 | 車輛標記視覺自定義與 3D 模型優化 (v1.4.0 Phase 2)
 
 本次更新提升了地圖上的視覺表現力，為使用者提供了更多個性化選擇，並大幅優化了 3D 模式下的模型細節與 2D 控制列的效能。
 
 ### 1. 車輛標記視覺自定義 (Custom Map Markers)
 - **樣式切換**：在設定選單中新增了「車輛標記樣式」選項，支援在經典的「箭頭 (Arrow)」與現代感的「圓餅 (Disc)」之間自由切換。
 - **UI 優化**：重新設計了設定介面的選擇卡片，搭配專屬的西北向 (North-West) 指引圖示，提升操作直覺性。
 
 ### 2. 3D 模型精準化與避讓 (3D Model Refinement)
 - **3D 圓餅標記**：實作了具備厚度 (Disc) 的 3D 圓柱模型取代原有的球體，並確保其角度始終與賽道坡度平行。
 - **俯仰角 (Pitch) 平滑化**：優化了 3D 車輛的坡度感應演算法，將採樣窗口擴大以過濾數據雜訊，使賽車在起伏路面上的動態更為流暢。
 - **穿模防護**：統一提升標記的懸浮高度 (Z-offset: 1.0)，解決模型在極端坡度下與賽道表面產生閃爍 (Z-fighting) 或穿模的問題。
 
 ### 3. 效能與細節優化
 - **控制列重構**：將 2D 地圖控制列封裝為 Memoized 組件，並將動畫定義移至外部，徹底解決播放時滑鼠懸停控制列產生的微卡頓 (Stutter) 現象。
 - **佈局大一統**：修復了 2D 與 3D 模式下控制列高度不一致的問題，確保視覺體驗無縫銜接。
 
 ---
 
 

## 2026-05-01 | 最快有效圈預設開啟 (v1.4.0 Phase 1)
 
 本次更新優化了載入檔案後的初始體驗，將系統預設開啟的圈數由單調的 Lap 1 改為該場次/Stint 的「最快有效圈 (Personal Best)」。
 
 ### 1. 智慧型初始圈選取 (PB-First Selection)
 - **邏輯重構**：更新了 `selectSession` 與 `fetchStint` 的核心動作。現在載入數據後，系統會自動搜尋並選取 duration 最短且 `isValid` 為 true 的圈數。
 - **多層級回退機制**：
     - 優先：最快有效圈。
     - 次之：若無有效圈，選取該場次中最快的一圈（即使無效）。
     - 保底：選取清單中的第一圈，確保介面不留白。
 
 ### 2. 跨 Stint 同步優化
 - **Stint 智慧選取**：在多 Stint 的賽程中切換 Stint 時，系統也會同步套用最快圈優先邏輯，讓使用者在不同階段間切換時能立即看到最佳表現。
 
 ---
 

## 2026-04-29 | 官方形象首頁 (Landing Page) 建立與全自動部署

本次更新建立了專業的官方形象網頁，並整合了 GitHub Actions 自動化部署流程，正式將專案帶向對外發佈階段。

### 1. 專業品牌形象 (Brand Identity)
- **視覺風格**：採用深色科技背景、青色光暈與玻璃擬態設計，對齊專業遙測工具的定位。
- **英雄區塊 (Hero)**：整合了 GitHub API 自動獲取最新發佈版本號與下載路徑的功能。

### 2. 互動式展示系統 (Interactive Showcase)
- **2D/3D 賽道切換**：實作了平滑的動畫切換，讓使用者直觀感受不同維度的遙測展示成果。
- **動態滾動效果**：為功能區塊加入雙向淡入淡出動畫，提升頁面流動感與沉浸體驗。
- **版面優化**：針對參考圈比對、跨賽程分析、工作區管理與硬體同步等核心功能設計了 Z 字型視覺導引與專屬排版。

### 3. 多國語言支援 (i18n)
- **語言切換器**：實作了自定義毛玻璃風格的下拉選單，完整支援 **繁體中文、英文、西班牙文、義大利文**。

### 4. GitHub Actions CI/CD 全自動化
- **自動部署**：建立了 `.github/workflows/deploy-pages.yml`，實現 Push 程式碼後自動完成 Build 與 GitHub Pages 發佈。
- **修復佈署陷阱**：解決了根目錄 `.gitignore` 預設過濾 `.html` 檔案導致 `index.html` 遺失的關鍵問題。

---

## 2026-04-27 | 動態交互控制列與尺寸自動校準 (v1.3.2 Phase 10)

本次更新優化了 UI 動效，透過 Framer Motion 引擎重構了播放控制列。

### 1. 動態交互控制列 (Interactive Controls)
- **懸停顯示功能**：控制列預設為半透明且縮小，滑鼠進入後自動展開並恢復亮度。
- **彈性動畫曲線**：加入彈簧動畫 (Spring)，讓控制列在伸縮與避讓時動作更自然。
- **佈局自動調整 (Layout)**：利用動畫引擎的 Layout 功能，當控制列寬度改變時，內部按鈕會自動平滑移動。

### 2. 尺寸自動校準機制 (Dimension Auto-Calibration)
- **定時驗證校準**：在切換全螢幕動作後，分別於 100ms 與 600ms 強制觸發尺寸更新。
- **Bug 修復**：解決了因 CSS 轉換動畫期間讀取到不正確尺寸，導致控制列變形的舊問題。

---

## 2026-04-27 | 單圈圖表 X 軸模式與 HUD 穩定性 (v1.3.2 Phase 9)

本次更新解決了 HUD 座標穩定性問題，並為單圈數據分析導入了靈活的 X 軸切換功能。

### 1. 單圈 X 軸模式切換 (Single Lap X-Axis Mode)
- **獨立設定邏輯**：在設定選單中新增了「單圈圖表 X 軸模式」。此設定獨立於全域的 Dist/Time Sync，專門控制在**無參考圈**情況下的圖表顯示。
- **主介面動態切換**：在全螢幕模式下，若系統偵測到目前處於單圈模式，會自動將原有的 `Dist/Time Sync` 按鈕替換為 `Distance / Time` 切換鍵，並與設定選單同步，提供更直覺的操控體驗。
- **靈活分析**：使用者可根據需求，在單圈分析時自由選擇以「距離 (Distance)」或「時間 (Time)」作為 X 軸，滿足不同維度的數據審查需求。

### 2. HUD 座標穩定與切換校準機制
- **座標參考系大一統**：統一了 `TrackMap` 與 `TrackMap3D` 的 DOM 層級結構，消除了基準點偏移。
- **動態動畫鎖定機制**：引入 `isHudAnimating` 狀態鎖。在全螢幕展開或維度切換過程中暫停智慧避讓與碰撞檢查，待 600ms 動畫結束後才執行最終校準，解決了 HUD 座標彈飛的問題。

### 3. 維度切換穩定性
- **狀態監聽強化**：`useHudDraggable` 鉤子現在會同步監聽 `show3DLab` 的狀態變化，確保在維度切換後的掛載瞬間也能正確重啟校準流程。
- **防抖校準**：在 `setShow3DLab` 動作後主動注入佈局驗證請求，補足了舊版在維度切換時缺乏重新佈局觸發點的問題。

---

## 2026-04-26 | 自動更新通知系統：GitHub API 整合 (v1.3.2 Phase 8)

為了解決手動檢查更新的繁瑣，本次更新導入了自動化版本檢測機制，確保使用者能第一時間獲取性能優化與新功能。

### 1. GitHub API 靜默檢測
- **背景自動檢查**：App 啟動後會自動向 GitHub API (`/releases/latest`) 獲取最新標籤，並與 `package.json` 中的版本號進行比對。
- **異步延遲顯示**：設定了 2 秒的啟動緩衝，避開 App 開啟時的加載高峰，提升感官舒適度。

### 2. 智慧型彈窗處理邏輯 (Tri-State Dismissal)
- **Update Now (立即更新)**：一鍵跳轉至 GitHub Release 頁面。
- **Maybe Later (稍後提醒)**：僅關閉當前彈窗，下次啟動 App 時仍會再次提醒，適合「現在想先跑一圈」的使用者。
- **Skip This Version (跳過此版本)**：將該版本號紀錄於 `localStorage`。除非 GitHub 上發布了更高等級的新版本，否則 App 將不再騷擾使用者。這實現了版本級別的靜默控制。

### 3. 視覺與性能
- **旗艦級視覺**：採用 `framer-motion` 的彈簧曲線動畫與深色玻璃擬態效果，並加入動態流光背景。
- **零性能損耗**：檢測過程完全異步，且在確認「已跳過」或「已是最新」後即刻釋放資源。

---

## 2026-04-25 | 遙測圖表高度自定義：Y 軸自由拉伸 (v1.3.2 Phase 7)

根據社群回饋，本次更新為數據圖表導入了高度拉伸功能，允許使用者根據分析需求自由調整各個通道的垂直空間。

### 1. 交互式高度調整 (Interactive Resizing)
- **智慧拖曳手把**：在每個數據圖表底端新增了隱藏式拖曳區塊。懸停時會顯示淡藍色感應條，並帶有「DRAG TO RESIZE | DOUBLE-CLICK TO RESET」的懸停提示。
- **雙擊快速重設 (Double-Click to Reset)**：支援雙擊手把立即恢復該圖表的預設高度，解決手動調整後難以對齊的問題。
- **即時重繪優化**：透過 `ResizeObserver` 監控容器變動，並即時調用 uPlot 的 `setSize` 介面，確保拖曳過程中的波形顯示保持流暢且不失真。
- **性能優化機制**：在拖曳調整期間自動切換為 `duration-0` 模式（停用動畫），消除調整大小時的視覺延遲感。

### 2. 邏輯與持久化
- **高度持久化**：調整後的高度會即時寫入 `telemetryStore` 並同步至 `localStorage`。無論重新整理頁面或切換賽道，使用者定義的佈局高度都會被完美保留。
- **情境感應功能**：
    - **主儀表板專屬**：此功能僅在 2D 主介面啟用，提供深度分析時的空間彈性。
    - **全螢幕模式停用**：遵循簡約設計原則，全螢幕 HUD 模式下維持固定高度，確保視覺美感與穩定性。
- **安全邊界限制**：設定了最小 **60px** 的保護高度，避免圖表因過度壓縮而無法操作。

---

## 2026-04-25 | 響應式佈局動態避讓與平滑動畫 (v1.3.2 Phase 6)

本次更新實現了全系統 HUD 與控制中心的「智慧感應避讓」，解決了不同組件在全螢幕模式下的空間競爭問題，並大幅提升了視覺切換的平滑度。

### 1. HUD 智慧感應避讓系統 (Dynamic Avoidance)
- **側邊欄狀態感應**：`overlap` HUD 現在會主動偵測左右側邊欄（Session Info / Data Charts）的開啟狀態。
- **動態邊界校準**：
    - 當側邊欄**開啟**時：自動將 `overlap` HUD 的最小邊距限縮至 **340px**（較之前的 380px 更精悍）。
    - 當側邊欄**關閉**時：自動釋放限制，允許 HUD 貼齊螢幕邊緣（僅保留 0.5% 安全邊距）。
- **平滑推開動畫**：導入 `cubic-bezier(0.34, 1.56, 0.64, 1)` 動畫曲線。當使用者切換 HUD 顯示時，`overlap` HUD 會像被物理推動一樣順滑地滑移至安全區，而非瞬間跳變。

### 2. 控制中心智慧寬度適配 (Dynamic Control Center)
- **對稱式避讓邏輯**：2D 與 3D 模式下的控制中心現在具備「全域避讓感應」。
- **觸發機制**：只要 `Analysis Laps` (左) 或 `Data Charts` (右) 其中一個開啟，控制中心即自動收縮並預留對稱的 **680px** 空間，確保佈局始終對稱且不與 HUD 重疊。
- **2D/3D 全方位同步**：在 `TrackMap3D` 中引入 `ResizeObserver` 監控機制，確保 3D 模式的避讓行為與 2D 模式完全一致。

### 3. 佈局精修與穩定性
- **間距優化**：將全系統避讓基準由 380px 下調至 **340px**，最大化利用高解析度螢幕的中央可視區域。
- **操作反饋優化**：智慧動畫系統會自動偵測使用者操作。在**手動拖拽**或**調整大小**時會暫時停用動畫以確保零延遲，僅在系統自動校正位置時啟用平滑過渡。

---

## 2026-04-24 | 佈局穩定性修復與視覺細節微調 (v1.3.2 Phase 5)

本次更新解決了地圖切換時的佈局跳動 Bug，並針對資訊顯示的易讀性進行了多項 UI 優化。

### 1. HUD 佈局穩定性方案
- **雙重尺寸安全鎖**：在 `telemetryStore` 與 `useHudDraggable` 中同步實作了「維度守門員」機制。
    - **觸發門檻**：當容器寬度 `< 450px` 或高度 `< 200px` 時（如側邊欄小地圖或正在收合中的動畫過程），自動凍結座標驗證邏輯。
    - **效果**：徹底根治了 HUD 在地圖收合動畫過程中因容器塌陷而被「擠到」角落或越界的座標污染問題。
- **動態解除渲染邏輯**：修正中間地圖的 `isExpanded` 狀態連結，確保 HUD 在收合動畫開始前即刻消失，避免影子競爭。

### 2. React 穩定性修復
- **Hook 規則規整**：修復了 `TrackMap.tsx` 中 `followZoom` Hook 的條件呼叫違規，解決了切換視圖時偶發的 `Should have a queue` 崩潰報錯。

### 3. UI 視覺與交互體驗強化
- **數據源 (FileManager) 視覺大改版**：
    - **動態品牌與國旗**：捨棄單調的 LMU 圖示，現在檔案清單會根據遙測數據自動顯示 **車輛品牌 Logo** (彩色) 與 **賽道所屬國旗**。
    - **同步邏輯**：整合 `carHelpers` 與 `trackHelpers` 邏輯，支援包括 Genesis, Ginetta, Isotta Fraschini 等全系列品牌辨識。
    - **文字易讀性**：提升車型與 Metadata 字體亮度（`gray-500` -> `gray-400`），並修正組別標籤在深色玻璃下的辨識度。
- **身分系統轉型「數據分類空間」**：
    - **語義化更新**：將 Profile Switcher 標籤改為 `IDENTITY / CATEGORY`，引導使用者利用此功能按賽道、組別或賽事進行數據分類。
    - **交互導引**：新增設定齒輪、刷新與身分切換的 Tooltip 懸停提示。
    - **排版優化**：縮小登入彈窗描述文字間距，讓佈局更加緊湊專業。

---

## 2026-04-24 | 全螢幕遙測同步與 UI 佈局精修 (v1.3.2 Phase 4)

本次更新聚焦於全螢幕最大化視圖下的 HUD 交互體驗，實現了跨 2D/3D 模式的視覺大一統與動態佈局自動化。

### 1. 全螢幕 Sync 切換系統
- **動態 Sync 切換鍵**：在全螢幕 HUD 中新增了 Dist/Time Sync 切換組件，採用旗艦級玻璃特效外框。
- **動態位移演算法**：實作了「智慧避位邏輯」，切換鍵會根據小地圖的顯示狀態自動在 `top-4` 與地圖下方之間平滑位移。
- **全域同步切換**：透過 `telemetryStore` 實現 2D 與 3D 模式的切換狀態即時同步。

### 2. HUD 佈局歸一化與空間優化
- **Minimap 尺寸統一**：將 2D 全螢幕小地圖加大至 `14rem` (224px)，並與 3D 模式統一為 5:3 固定比例，確保佈局基準一致。
- **專業級間距對齊**：
    - 統一所有右側 HUD 組件間距為 `16px`。
    - 調整切換鍵右側邊距，確保與數據圖表（Data Charts）內容完美對齊。
- **數據圖表範圍優化**：移除了圖表容器的內部填充（Padding），使數據顯示區域向上提升，在不壓縮圖表高度的情況下最大化利用垂直空間。

### 3. 操作便利性提升
- **全域快捷鍵**：新增 **'M'** 鍵作為全螢幕模式下的小地圖切換熱鍵。
- **狀態持久化**：小地圖的顯示狀態現在會紀錄於 `localStorage`，確保使用者偏好在重新整理後依然保留。

---

## 2026-04-22 | 智慧型車輛識別系統：自定義塗裝支援 (v1.3.2 Phase 3)

針對 LMU RaceControl 產生的非標準車輛名稱，實作了智慧型啟發式對照系統，確保所有自定義塗裝都能正確對應到原始車模。

### 1. 雙層比對機制 (Two-Tier Lookup)
- **優先級策略**：系統優先執行標準 CSV 對照邏輯，確保官方車隊的 100% 準確度。
- **自動降級觸發**：當車名中出現 `custom team` 關鍵字，或標準比對信心度不足時，自動觸發「智慧搜尋」引擎。

### 2. 智慧搜尋引擎優化
- **別名映射系統 (MODEL_ALIASES)**：建立常見型號縮寫的關聯表（如 `911gt3r` -> `Porsche 911 GT3 R`），解決字串擠壓問題。
- **子字串評分加權**：改進評分演算法，除了關鍵字交集外，新增了子字串包含（Substring Match）的權重，大幅提升模糊匹配成功率。
- **擴展關鍵字庫**：將對照表中的 `ModelName` 也納入檢索範圍，確保即使車隊名稱完全陌生，也能透過型號名稱抓到正確資訊。

### 3. 實測驗證
- 成功解決 `911GT3R custom team 2025 #397` 無法識別的問題。
- 驗證通過案例：`499P`、`296 GT3`、`V-Series.R`、`720S` 等自定義命名皆能正確對應並顯示對應 Logo。

---

## 2026-04-22 | 遙測路徑自定義與原生選取器整合：專業級交互 (v1.3.2 Phase 2)

本次更新解決了長期以來瀏覽器無法指定上傳路徑的痛點，透過後端原生選取器的整合，實現了「一鍵即達」的專業級遙測匯入流程。

### 1. 遙測路徑自定義與持久化
- **交互式路徑編輯**：將原本靜態的路徑提示重構為可編輯的設定組件，支援使用者自定義 LMU 遙測資料夾。
- **持久化儲存**：使用 `localStorage` 紀錄使用者設定，確保下次啟動時自動載入。
- **自動化清理 (Auto-Trim)**：實作了引號自動過濾功能（`"` 與 `'`），相容 Windows 「複製為路徑」的剪貼簿內容。
- **智能提示系統**：新增後端路徑驗證 API，僅在路徑無效時顯示設定提示，減少對已設定完成使用者的干擾。

### 2. 後端原生選取器整合 (Native Integration)
- **原生對話框接口**：在後端新增 `/system/pick-and-upload` 接口，繞過瀏覽器安全性限制，直接呼叫 Windows 原生檔案選取視窗。
- **高解析度優化 (High DPI)**：整合 `ctypes` 指令開啟 DPI 感知模式，確保原生選取視窗在 4K/高縮放螢幕下清晰不模糊。
- **視窗自動居中**：實作了前後端座標同步，讓檔案選取器能根據 App 目前的位置自動居中彈出。
- **一鍵式匯入流程**：點擊「Upload Telemetry」區塊時會自動觸發定位正確的原生選取器，雙擊檔案即可完成匯入與列表重新整理。

### 3. UI/UX 視覺細節
- **統一 Tooltip 語義**：針對路徑操作按鈕（編輯、儲存、開啟資料夾）統一應用了 v1.3.2 標準的玻璃質感提示框。
- **靜默失敗保護**：實作了靜默錯誤處理，當自定義路徑無效或原生選取器無法啟動時，會無縫回退至標準瀏覽器選取器，確保功能穩定性。

---

## 2026-04-22 | 動態國旗系統與 UI 旗艦進化：全球化視野 (v1.3.2 Phase 1)

本次更新完成了從硬編碼國旗對照表到「動態元數據驅動」架構的全面遷移，並針對國旗展示進行了旗艦級的視覺重定義。

### 變更內容
- **動態賽道國旗系統 (Dynamic Track Flags)**：
    - **後端元數據整合**：在 `TRACK_REGISTRY` 中導入 `country` 欄位，並透過 API 即時傳遞，徹底告別手動維護查找表的時代。
    - **資源路徑自動化**：建立 `trackHelpers.ts` 工具，自動根據國家名稱解析 `/country_flag/` 圖檔路徑。
- **UI/UX 旗艦級設計進化**：
    - **玻璃外框美學 (Premium Box Styling)**：參考車輛 Logo 設計，為國旗新增了具備 `bg-white/10` 與 `rounded-xl` 的玻璃質感外框，並實作了懸停感應邊框色切換。
    - **視覺層級優化**：放大了國旗尺寸，並將其與賽道名稱進行了更合理的空間佈局。
- **系統清理與重構**：
    - **遺留資源刪除**：正式移除舊有的 `/tracks/` 賽道圖示與相關硬編碼邏輯，實現代碼與資源的雙重瘦身。
    - **全系統同步**：確保側邊欄、地圖 HUD 與 3D 實驗室中的國旗風格完全統一。

### 驗證結果
- [x] 切換不同國家的賽道時，國旗能精確動態載入且不留黑邊。
- [x] 國旗外框在懸停時會同步變色（藍色/琥珀色），與整體設計語言一致。
- [x] 已確認 `/tracks/` 資料夾刪除後，系統無報錯且載入效能提升。

🟢 2026-04-22 | Dynamic Flag System & UI Flagship Evolution (v1.3.2 Phase 1)

This update completes the migration from hardcoded flag lookups to a "Dynamic Metadata-Driven" architecture, featuring a flagship-level visual redesign for national flag presentation.

### Key Changes
- **Dynamic Track Flags**:
    - **Metadata Integration**: Introduced the `country` field into `TRACK_REGISTRY` and propagated it via API, eliminating the need for manual lookup tables.
    - **Automated Path Resolution**: Created `trackHelpers.ts` to automatically resolve flag assets from the `/country_flag/` directory based on real-time metadata.
- **Flagship UI/UX Redesign**:
    - **Premium Glass Styling**: Applied a `rounded-xl` glass-box aesthetic (inspired by car logos) with `bg-white/10` textures and mouse-sentient border highlights.
    - **Visual Hierarchy Optimization**: Increased flag dimensions and refined the spatial relationship between flags and track labels.
- **System Cleanup & Refactoring**:
    - **Legacy Asset Removal**: Deleted the old `/tracks/` icon folder and associated hardcoded logic to streamline code and reduce bundle size.
    - **Cross-Platform Sync**: Unified flag styles across the sidebar, map HUDs, and 3D Elevation Lab.

### Verification Results
- [x] National flags resolve accurately across different tracks without broken image placeholders.
- [x] Flag containers respond to hover states with dynamic accent colors (Blue/Amber).
- [x] System stability confirmed after deletion of legacy `/tracks/` assets.

---

## 2026-04-20 | 自適應時間軸與動畫交響曲：同步之巔 (v1.3.1)

本次更新聚焦於提升「非對稱單圈對齊」的強健性，實作了自適應主時間軸與全域時間同步邏輯，並針對 UI 交響感進行了深度精修。

### 變更內容
- **自適應主時間軸 (Adaptive Master Timeline)**：
    - **邏輯重構**：播放引擎現在會自動偵測 Current 與 Reference 的長度，並動態選擇較長者作為 Master Timeline。
    - **邊界緩衝**：解決了當較短單圈結束時，地圖車標「瞬移」至終點的問題。游標現在能平滑跨越數據終點，直至 Master Timeline 跑完。
- **手動拖拽全域同步修復 (Manual Scrubbing Sync)**：
    - **動作解耦**：新增 `setPlaybackTime` 動作，允許手動拖拽圖表時，2D/3D 地圖、HUD 疊加層與 3D Ghost Car 能根據精確時間進行同步位移。
    - **無限渲染循環修復**：解決了 `TelemetryChart.tsx` 中因雙向 Store 更新導致的死循環問題。
- **視覺交響感精修 (UI/UX Symphony)**：
    - **同步切換動畫 (Animated Sync Toggle)**：添加了與 2D/3D 切換一致的滑動指示器動效。
    - **全螢幕 HUD 消失修補**：修復了因 Fragment 導致的消失動畫失效問題。
- **3D 響應式佈局優化**：分流全螢幕與標準模式下的佈局，優化空間利用率。

### 驗證結果
- [x] 無論哪個單圈較長，播放器都能完整跑完全程，且圖表 X 軸會自動延展。
- [x] 在 Time Sync 模式下拖拽圖表，地圖上的箭頭能精確跟隨時間點移動。
- [x] 切換 Sync 模式時，滑動動畫流暢且陰影效果細膩。
- [x] 全螢幕下關閉 HUD 組件，動畫不再「閃退」，而是平滑滑出。

🟢 2026-04-20 | Adaptive Timeline & Animation Symphony: The Sync Mastery (v1.3.1)

This update focuses on enhancing the robustness of "Asymmetric Lap Alignment" by implementing an adaptive master timeline and global time-sync logic, while performing deep refinements on the UI's aesthetic symphony.

### Key Changes
- **Adaptive Master Timeline**:
    - **Logic Refactoring**: The playback engine now automatically detects the length of Current and Reference laps, dynamically selecting the longer one as the Master Timeline.
    - **Boundary Buffer**: Resolved the issue where map markers would "snap" to the finish line when a shorter lap ends. The cursor now slides smoothly past the data boundary until the Master Timeline finishes.
- **Manual Scrubbing Sync**:
    - **Action Decoupling**: Introduced the `setPlaybackTime` action, allowing manual scrubbing on charts to update 2D/3D maps and all HUD overlays based on precise elapsed time.
    - **Infinite Render Loop Fix**: Resolved the circular update bug in `TelemetryChart.tsx`.
- **UI/UX Symphony Refinement**:
    - **Animated Sync Toggle**: Added a sliding indicator pill animation consistent with the 2D/3D toggle.
    - **HUD Exit Animation Patch**: Fixed the "missing exit animation" bug caused by React Fragments.
- **3D Responsive Layout**: Differentiated layouts for fullscreen and normal modes to optimize space efficiency.

### Verification Results
- [x] Playback completes for the full duration regardless of which lap is longer.
- [x] Map markers follow precisely during chart scrubbing in Time Sync mode.
- [x] Sync toggle animations are smooth with refined glow effects.
- [x] HUD components glide out smoothly in maximized mode.

---

## 2026-04-19 | Maximized Analytics Masterpiece: Data Sources & Visual Polish (v1.3.0)

本次更新完成了全螢幕分析儀表板的最終整合，將 Data Sources (FileManager) 完美移植至最大化視圖，並實現了全系統 HUD 的視覺設計大一統，標誌著 v1.3.0 系列功能的完美收官。

### 變更內容
- **Data Sources 側邊欄移植 (Integrated Data Sources)**：將檔案管理與上傳系統正式嵌入全螢幕地圖左側。支援自動佈局適配，確保與右側圖表欄高度對稱。實作了流暢的 2D/3D 模式切換邏輯。
- **全系統玻璃設計大一統 (Unified Glassmorphism UI)**：設計了專屬的 `glass-container-static` 規範，徹底修復 WebGL 磨砂失效 Bug。將所有 HUD 面板更換為統一風格，並同步補全了滑鼠感應高光。
- **Minimap 邏輯與效能優化**：統一固定 5:3 佈局，並微調基底色分量確保在 2D 黑色畫布上依然保有透明感。
- **3D 渲染精準化**：修正跨 Session 時 3D 參考線的位移問題。
- **性能優化 (HUD Performance)**：實作 `will-change` 屬性並在拖拽期間禁用昂貴函數，恢復 60FPS 流暢手感。

🟢 2026-04-19 | Maximized Analytics Masterpiece: Data Sources & Visual Polish (v1.3.0)

This update completes the final integration of the full-screen analytics dashboard, migrating Data Sources (FileManager) to the maximized view and unifying the visual design of the entire HUD system.

### Key Changes
- **Integrated Data Sources**: Embedded the file management and upload system into the left side of the full-screen map. Supports auto-layout and seamless 2D/3D mode switching.
- **Unified Glassmorphism UI**: Established the `glass-container-static` standard to fix WebGL backdrop-filter bugs. Unified all HUD panels with refined glass textures and mouse-sentient highlights.
- **Minimap Optimization**: Standardized a fixed 5:3 layout and calibrated glass transparency for 2D black canvases.
- **3D Precision**: Fixed coordinate displacement for 3D reference lines across different sessions.
- **Performance**: Implemented `will-change` and optimized dragging logic to maintain a consistent 60FPS interaction speed.

---

## 2026-04-19 | Horizon Value Labels Evolution (v1.3.0 - UI Update)

本次更新將圖表右上角的數值顯示由垂直堆疊優化為「動態水平排列」，顯著提升了介面的專業感與空間利用率。

### 變更內容
- **水平數值標籤系統 (Dynamic Horizon Labels)**：
    - **動態空間分配**：預設 Current 數值靠右顯示；開啟 Reference 後 Current 會左移避位。
    - **專業視覺設計**：引入垂直分割線與 `REF` 輔助文字，確保數值讀取準確。

🟢 2026-04-19 | Horizon Value Labels Evolution (v1.3.0 - UI Update)

Optimized the telemetry value display in the top-right of charts from vertical stacking to a dynamic horizontal layout, enhancing professional feel and space efficiency.

### Key Changes
- **Dynamic Horizon Labels**:
    - **Auto-Spacing**: Current values are right-aligned by default and automatically shift left when a Reference lap is enabled.
    - **Professional Design**: Introduced vertical dividers and `REF` labels for clarity.

---

## 2026-04-19 | Data Charts HUD & Interaction Logic Mastery (v1.3.0)

本次更新完成了全螢幕分析介面的最後一塊拼圖：右側數據圖表 HUD，並優化了底部控制中心的交互邏輯。

### 變更內容
- **右側數據圖表 HUD (Data Charts Overlay)**：實作滑入/滑出動畫，並導入 `onWheelCapture` 攔截技術防止地圖縮放干擾滾動。
- **控制中心優化**：修復了選單對側邊欄的 Z-index 遮擋問題。

🟢 2026-04-19 | Data Charts HUD & Interaction Logic Mastery (v1.3.0)

Completed the final piece of the full-screen analytics interface: the right-side Data Charts HUD, while optimizing control center interaction logic.

### Key Changes
- **Data Charts Overlay**: Implemented slide animations and `onWheelCapture` interception to prevent map zoom conflicts during chart scrolling.
- **Control Center Fix**: Resolved Z-index layering issues between HUD menus and the sidebar.

---

## 2026-04-19 | Smart Sidebar & Premium Animation Symphony (v1.3.0)

本次更新完成了 Dashboard 的核心架構進化，將資訊面板轉型為「智能側邊欄 (Smart Sidebar)」，並導入了頂級動畫系統。

### 變更內容
- **智能側邊欄架構 (Smart Sidebar Architecture)**：將固定資訊組件抽離為固定於左側的縱向堆疊側邊欄。
- **頂級動畫系統 (Framer Motion)**：導入 `layout` 感知位移，當組件關閉時，其餘組件會以平滑彈力曲線自動遞補空間。
- **2D/3D 模式全方位同步**：重構 3D 代碼以對標 2D 的全螢幕側邊欄位置與動畫效果。

🟢 2026-04-19 | Smart Sidebar & Premium Animation Symphony (v1.3.0)

Evolved the dashboard architecture into a "Smart Sidebar" system combined with a high-end animation engine for fluid interaction.

### Key Changes
- **Smart Sidebar Architecture**: Transitioned static info panels into a vertically-stacked, fixed-position sidebar.
- **Premium Animations**: Integrated Framer Motion's layout engine for smooth component reordering and elastic entrance/exit effects.
- **Cross-Mode Synchronization**: Refactored 3D view logic to align with 2D sidebar behavior and animations.

---

## 2026-04-18 | Laps Analysis HUD & Interactive Selection (v1.3.0)

本次更新實作了「Analysis Laps」HUD，讓使用者能直接在 2D/3D 地圖介面中進行深度的單圈數據對比。

### 變更內容
- **Analysis Laps HUD 實作**：支援航段化分組 (Stint Grouping) 與紫金色 PB 標記。
- **交互快捷按鍵**：提供 「C」(Current) 與 「R」(Reference) 點擊即時更新邏輯。

🟢 2026-04-18 | Laps Analysis HUD & Interactive Selection (v1.3.0)

Implemented the "Analysis Laps" HUD, enabling deep lap comparison and selection directly within the map interfaces.

### Key Changes
- **Analysis Laps HUD**: Supports stint-based grouping and PB (Personal Best) highlighting.
- **Interactive Controls**: Added "C" and "R" shortcuts for instantaneous telemetry updates.

---

## 2026-04-18 | HUD Performance & Interaction Overhaul (v1.3.0)

本次更新徹底重構了 HUD 的交互底層，實現了極致流暢的拖拽體驗。

### 變更內容
- **極致流暢拖拽**：引入 `rAF` 節流機制，解決了高頻率事件導致的 UI 卡頓。
- **智能重疊校正**：實作優先權驗證陣列，當視窗變動時自動「推開」周圍組件。

🟢 2026-04-18 | HUD Performance & Interaction Overhaul (v1.3.0)

Overhauled the HUD interaction layer for ultra-smooth dragging and intelligent collision management.

### Key Changes
- **rAF Throttling**: Decoupled dragging calculations from the rendering loop to ensure fluid 60FPS movement.
- **Intelligent Correction**: Implemented priority-based layout validation to automatically reorganize HUDs upon resizing.

---

## 2026-04-18 | Track Info HUD & 3D Lab UI Evolution (v1.3.0)

本次更新完成了「Track Info」HUD 的實作，並統一了全系統的操作邏輯。

### 變更內容
- **Track Info HUD 正式登場**：整合賽道名稱、佈局與即時天氣數據。
- **3D Elevation Lab 介面重構**：Z-Scale 滑桿改為橫向佈局並整合至標題列旁，解決事件冒泡問題。

🟢 2026-04-18 | Track Info HUD & 3D Lab UI Evolution (v1.3.0)

Finished the Track Info HUD implementation and unified interaction logic across the 3D and 2D systems.

### Key Changes
- **Track Info HUD**: Integrated track layout data and real-time session weather.
- **3D Elevation Lab Refinement**: Modernized the Z-Scale slider into a horizontal layout and fixed event bubbling issues.

---

## 2026-04-18 | HUD State & Persistence Stabilization (v1.3.0)

本次更新針對 HUD 的定位同步與全域干擾問題進行了深度底層排查。

### 變更內容
- **全域座標覆寫保護**：移除小地圖對 HUD 座標的寫入權限，防止「座標劫持」。
- **彈性路徑競爭修復**：修正全螢幕切換動畫與 ResizeObserver 之間的競態衝突。

🟢 2026-04-18 | HUD State & Persistence Stabilization (v1.3.0)

Conducted a deep-dive into HUD positioning stability and cross-view synchronization.

### Key Changes
- **Coordinate Isolation**: Revoked HUD calibration permissions for mini-maps to prevent "coordinate hijacking."
- **Race Condition Fixes**: Resolved conflicts between fullscreen transitions and layout validation logic.

---

## 2026-04-18 | Telemetry UI/UX Flagship Refresh (v1.3.0)

本次更新啟動了旗艦級動畫與視覺重定義工作，實現了極致的操作層次感。

### 變更內容
- **旗艦級玻璃 UI 規範**：建立 `glass-container` 標準化架構，具備細膩的邊框發光感。
- **HUD Setup 選單重構**：導入彈性縮放動畫，改用亮框標註已啟動組件。

🟢 2026-04-18 | Telemetry UI/UX Flagship Refresh (v1.3.0)

Initiated the flagship visual refresh, defining the interaction hierarchy and glassmorphism standards.

### Key Changes
- **Standardized Glass UI**: Established a dual-layered glass effect with sophisticated rim highlights.
- **HUD Setup Revamp**: Integrated elastic entrance animations and improved state indicators.

---

## 2026-04-15 | Telemetry v1.2.2 - Hardened Stability & Playback Fix

本次會話專注於系統強健性，特別是針對非典型檔案的載入邏輯進行了加固。

### 變更內容
- **系統穩定性防禦**：針對特殊檔案實作「零容忍」取值檢查與安全降級。
- **平滑播放修復**：透過強制索引取整確保播放時間顯示精確同步。

🟢 2026-04-15 | Telemetry v1.2.2 - Hardened Stability & Playback Fix

Focused on system resilience, specifically stabilizing ingestion and playback for malformed session files.

### Key Changes
- **System Hardening**: Implemented safety locks and graceful degradation for missing data channels.
- **Playback Calibration**: Enforced index flooring to fix time-sync issues during smooth playback.

---

## 2026-04-15 | Telemetry v1.2.1 - 賽道數據同步 (LMU v1.3.1.2)

本次更新同步了最新的賽道資料庫，擴展了賽道佈局支援。

### 變更內容
- **賽道庫擴展**：全面對標 LMU 最新遊戲數據，補全多個賽道高程參考點與長度精確校準。

🟢 2026-04-15 | Telemetry v1.2.1 - Track Data Sync (LMU v1.3.1.2)

Updated the track database to support more layouts and improved measurement accuracy.

### Key Changes
- **Track DB Expansion**: Aligned with LMU v1.3.1.2. Added elevation reference points and optimized track length measurements.

---

## 2026-04-14 | Telemetry v1.2.0 - 座標歸一化與數據 Self-Healing 重磅更新

解決了跨視圖座標位移與 HUD 邊界超界問題。

### 變更內容
- **座標基準統一**：場景元素強制同步至地理中心，解決跨會話偏移問題。
- **數據自我修復**：實現對非零起點數據的自動定位修補。

🟢 2026-04-14 | Telemetry v1.2.0 - Coordinate Normalization & Self-Healing

Addressed cross-session coordinate displacement and HUD container boundary issues.

### Key Changes
- **Unified Coordinates**: Enforced a shared geographic origin for both current and reference data.
- **Data Self-Healing**: Automated skip-to-data logic for sessions with delayed start times.

---

## 2026-04-11 | Steering Calibration - 使用者自訂轉向比例

實作方向盤轉向鎖角度的手動校準與持久化功能。

### 核心功能
- **手動覆寫**：支援使用者自訂度數，並提供 Per-Profile 的本地端持久化配置。

🟢 2026-04-11 | Steering Calibration - Steering Lock Overrides

Implemented manual steering lock calibration and persistence.

### Key Features
- **Manual Overrides**: Enables users to set custom steering degrees with per-profile local persistence.

---

## 2026-04-09 | 3D Lab 功能大對標 & 引擎穩定化

完成了 3D Lab 的高級分析功能，並解決了初始開發時的報錯問題。

### 核心突破
- **熱圖與對比**：實作行車線熱圖同步與雙圈幽靈車渲染。
- **數據安全性**：建立 NaN/Inf Filter 機制確保數據渲染穩定。

🟢 2026-04-09 | 3D Lab Feature Parity & Engine Stabilization

Implemented advanced 3D analytics and resolved early-stage ingestion bugs.

### Key Breakthroughs
- **Visualization**: Added heatmaps and ghost car rendering for reference comparisons.
- **Engine Stability**: Built data sanitization filters to prevent rendering crashes.

---

## 🌑 2026-04-05 | 3D 軌跡渲染上線 (Initial Alpha)

*   實現基礎 3D 賽道模型渲染與 DuckDB 數據對接。

🌑 2026-04-05 | 3D Trajectory Rendering (Initial Alpha)

*   Implemented basic 3D track modeling and DuckDB data integration.
