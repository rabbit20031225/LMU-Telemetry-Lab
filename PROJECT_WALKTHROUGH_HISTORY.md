# PROJECT WALKTHROUGH HISTORY

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
