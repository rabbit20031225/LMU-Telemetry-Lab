# PROJECT WALKTHROUGH HISTORY

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
