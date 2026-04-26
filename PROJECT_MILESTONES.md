## 🟢 [2026-04-25] Telemetry v1.3.2 - UX 優化與系統整合

### 🌟 核心突破
*   **圖表 Y 軸自定義 (Chart Scaling)**: 支援手動調整遙測圖表高度、雙擊恢復預設與 `localStorage` 狀態持久化。
*   **智慧避讓佈局 (Avoidance System)**: 實作 HUD 自動避讓側邊欄邏輯。新增 `isHudAnimating` 狀態鎖，解決維度切換時的座標跳動。
*   **原生 OS 整合 (Native Integration)**: 整合 Windows 原生檔案選取器，支援自定義 LMU 遙測數據路徑。
*   **介面邏輯歸一化 (UI Unification)**: 對齊 2D/3D 容器座標系。新增「單圈圖表 X 軸」主介面/設定同步切換與更新通知系統。

### 🚀 專案影響
*   v1.3.2 提升了跨維度佈局的穩定性，並解決了瀏覽器環境下檔案路徑存取的限制。

🟢 [2026-04-25] Telemetry v1.3.2 - UX Optimization & System Integration

### 🌟 Key Breakthroughs
*   **Chart Resizing**: Manual Y-axis scaling with double-click reset and state persistence.
*   **Avoidance Logic**: HUD sidebar avoidance with `isHudAnimating` transition lock to prevent coordinate jumping.
*   **Native Integration**: Integrated Windows native file picker for custom telemetry paths.
*   **UI Unification**: Unified 2D/3D coordinate systems and GitHub API-based update notifications.

### 🚀 Project Impact
*   v1.3.2 improves layout stability during transitions and resolves browser file-access limitations.

---

## 🟢 [2026-04-20] Telemetry v1.3.1 - 自適應時間軸與動畫交響曲

### 🌟 核心突破
*   **自適應主時間軸引擎 (Adaptive Master Timeline)**: 重構了播放同步邏輯，實現「最長單圈基準」機制。當 Current 與 Reference 長度不一時，時間軸會自動以較長者為底色，短圈則以 `NaN` 優雅補全。游標現在能跨越數據邊界持續移動，解決了短圈先行結束導致的地圖同步「瞬移」問題。
*   **手動拖拽全域同步 (Global Scrubbing Decoupling)**: 實作 `setPlaybackTime` 動作，徹底脫離「索引依賴」的拖拽邏輯。現在在 Time Sync 模式下手動拖拽圖表，2D/3D 地圖與所有 HUD 疊加層都能根據精確時間進行同步更新。
*   **視覺質感與動畫精修 (Animation Polish & UI Refinement)**: 為 Distance/Time Sync 切換按鈕添加了滑動指示器動畫（Sliding Pill），並修復了全螢幕模式下 HUD 組件消失動畫失效的 Bug。同時優化了 3D 地圖的響應式佈局，讓 Z-Scale 控制項在端不同視窗尺寸下皆能保持最佳位置。

### 🚀 專案影響
*   v1.3.1 解決了「非對等單圈對比」時的最後一哩路，確保了分析過程在時間維度上的絕對連續性與視覺的高級感。

🟢 [2026-04-20] Telemetry v1.3.1 - Adaptive Timeline & Animation Symphony

### 🌟 Key Breakthroughs
*   **Adaptive Master Timeline Engine**: Refactored playback synchronization to use a "Longest Lap Master" mechanism. The timeline now adapts to the longer duration when Current and Reference laps differ, with shorter laps gracefully padded with `NaN`. The cursor tracks global `playbackElapsed`, resolving map "snapping" issues when a shorter lap ends early.
*   **Global Scrubbing Decoupling**: Implemented `setPlaybackTime`, decoupling manual scrubbing from index-based logic. Scrubbing charts in Time Sync mode now updates 2D/3D maps and all HUD overlays based on precise elapsed time, achieving true consistency.
*   **Animation Polish & UI Refinement**: Added a sliding indicator pill animation for the Distance/Time Sync toggle and fixed the "missing exit animation" bug for HUD components in maximized mode. Optimized 3D Map responsive layout, ensuring Z-Scale controls maintain optimal positioning across viewport sizes.

### 🚀 Project Impact
*   v1.3.1 completes the "Asymmetric Lap Comparison" analytics workflow, ensuring absolute temporal continuity and premium visual feedback during deep-dive analysis.

---

## 🟢 [2026-04-19] Maximized Analytics Dashboard - Master Release (v1.3.0)

### 🌟 核心突破
*   **全螢幕垂直整合分析引擎 (Maximized Analytics Engine)**: 實作了 2D 與 3D 模式的全螢幕視圖切換，整合了地圖導航、遙測分析與檔案管理。解決了跨維度 UI 狀態同步的難題，讓分析流程不再受限於單一視角。
*   **模組化 HUD 系統與智能側邊欄 (Modular HUD & Smart Sidebar)**: 開發了具備自定義位置、縮放與持久化的 HUD 系統（Track/Car Info, Analysis Laps, Data Charts）。導入智能側邊欄架構與 Framer Motion 動畫，實現介面重組時的物理級平滑感。
*   **旗艦級玻璃視覺與性能優化 (Flagship Glass UI & performance)**: 建立了 `glass-container-static` 規範，解決了 WebGL 環境下磨砂濾鏡的渲染 Bug。並透過 `will-change` 與佈局攔截技術，在複雜的玻璃疊加環境下依然達成 60FPS 的流暢操作手感。
*   **數據與地圖深度鏈路 (Deep Data-Map Linkage)**: 將 Data Sources (FileManager) 完整移植至最大化儀表板，優化了地圖 Minimap 規範與對稱佈局，實現了「一站式」的遙測分析體驗。

### 🚀 專案影響
*   v1.3.0 的完成代表著 LMU Telemetry Lab 從基礎原型正式進化為具備高度自定義能力、極致視覺美感與穩定性能的專業級遙測分析工具。

🟢 [2026-04-19] Maximized Analytics Dashboard - Master Release (v1.3.0)

### 🌟 Key Breakthroughs
*   **Maximized Analytics Engine**: Implemented full-screen view switching for 2D and 3D modes, integrating map navigation, telemetry analysis, and file management. Resolved cross-dimensional UI state synchronization issues.
*   **Modular HUD & Smart Sidebar**: Developed a HUD system with custom positioning, scaling, and persistence (Track/Car Info, Analysis Laps, Data Charts). Introduced a Smart Sidebar architecture with Framer Motion animations for physical-grade smoothness during interface reorganization.
*   **Flagship Glass UI & Performance**: Established the `glass-container-static` standard, resolving backdrop-filter rendering bugs in WebGL environments. Achieved 60FPS fluid interaction through `will-change` and layout interception techniques.
*   **Deep Data-Map Linkage**: Migrated Data Sources (FileManager) directly into the maximized dashboard, refined Minimap specifications and symmetrical layouts for a "one-stop" analytics experience.

### 🚀 Project Impact
*   The completion of v1.3.0 marks the evolution of LMU Telemetry Lab into a professional-grade telemetry tool featuring high customizability, premium aesthetics, and rock-solid performance.

---

## 🟢 [2026-04-15] Telemetry v1.2.2 - 穩定性加固與平滑播放修復

### 🌟 核心突破
*   **系統穩定性防禦 (System Hardening Defense)**: 針對 COTA 等特殊 Session 檔案進行全域審計，實作「零容忍」檢查機制。針對缺失的數據渠道實作安全取值鎖，介面現在能優雅降級顯示為 "--" 而非崩潰。
*   **平滑播放修復 (Smooth Playback Calibration)**: 修復了 v1.2.0 平滑播放導致的時間軸數字卡在 `0:00.000` 的 Bug。透過強制索引取整 (Math.floor)，確保播放時的時間顯示精確同步。

### 🚀 專案影響
*   v1.2.2 顯著提升了在極端數據場景下的強健性，確保分析流程不因數據殘缺而中斷。

🟢 [2026-04-15] Telemetry v1.2.2 - Hardened Stability & Playback Fix

### 🌟 Key Breakthroughs
*   **System Hardening Defense**: Conducted global audits for special session files (like COTA) and implemented a "zero-tolerance" check mechanism. Added safety locks for missing data channels, allowing the UI to gracefully degrade to "--" instead of crashing.
*   **Smooth Playback Calibration**: Fixed the bug in v1.2.0 where smooth playback caused timeline numbers to freeze at `0:00.000`. Ensured precise synchronization of time display during playback via index flooring (Math.floor).

### 🚀 Project Impact
*   v1.2.2 significantly enhances robustness in extreme data scenarios, ensuring the analysis workflow is not interrupted by missing data.

---

## 🟢 [2026-04-15] Telemetry v1.2.1 - 賽道數據同步 (LMU v1.3.1.2)

*   **賽道庫大更新 (Track DB Expansion)**：
    *   **資料同步**：全面對標 Le Mans Ultimate v1.3.1.2 遊戲數據。
    *   **佈局補全**：新增 Paul Ricard (Layout 1A, 1A-V2, 1A-V2-Short, 3A)、Silverstone (International, National) 以及 Spa (Endurance) 的高程參考點。
    *   **長度校準**：精確校準 Monza、Interlagos、Bahrain、Sebring 等賽道的佈局長度，誤差縮距至 1m 以內，顯著提升 Delta 計算穩定性。
*   **文件同步**：新增 `lmu_track_list.md` 作為使用者查詢手冊。

🟢 [2026-04-15] Telemetry v1.2.1 - Track Data Sync (LMU v1.3.1.2)

*   **Track DB Expansion**:
    *   **Data Sync**: Aligned with Le Mans Ultimate v1.3.1.2 game data.
    *   **Layout Completion**: Added elevation reference points for Paul Ricard (Layout 1A, 1A-V2, 1A-V2-Short, 3A), Silverstone (International, National), and Spa (Endurance).
    *   **Length Calibration**: Precisely calibrated layout lengths for Monza, Interlagos, Bahrain, and Sebring with sub-1m error margin, significantly improving Delta calculation stability.
*   **File Sync**: Added `lmu_track_list.md` as a user reference manual.

---

## 🟢 [2026-04-14] Telemetry v1.2.0 - 座標歸一化與數據 Self-Healing 重磅更新

### 🌟 核心突破
*   **3D 渲染精準對位 (Unified Origin)**：
    *   **全域投影基準 (Unified Center)**：重構 `TrackMap3D.tsx` 的座標轉換引擎。所有數據來源強制同步至「當前工作階段」的地理中心，徹底解決了參考單圈的渲染位移問題。
    *   **主動式數據同步 (Proactive Sync)**：優化 2D/3D 切換邏輯，進入實體 Lab 前自動完成參考數據預熱。
*   **HUD 邊界韌性強化 (Persistent Boundary Clamping)**：
    *   **自適應監控 (ResizeObserver)**：整合現代 DOM 監控，HUD 現在會隨父容器尺寸變動實時校準位置。
    *   **美學緩衝 (Safety Margin)**：加入 8px 邊界防撞邊距，解決與控制中心的交互爭搶衝突。
*   **播放彈性與容錯 (Self-Healing Playback)**：
    *   **自動啟動修復 (Auto-Kickstart)**：針對非零起始點的數據（如 COTA 檔案），系統會自動掃描並跳轉至首筆有效點。
    *   **邊界保護鎖 (Playback Guardrails)**：強化索引邊界檢測，確保播放流暢度。

### 🚀 專案影響
*   v1.2.0 顯著提升了系統在高負載與跨 Session 場景下的精確度。不僅解決了視覺上的偏差，更進一步增強了數據載入與 UI 呈現之間的強健性。

🟢 [2026-04-14] Telemetry v1.2.0 - Coordinate Normalization & Self-Healing Playback

### 🌟 Key Breakthroughs
*   **Unified Origin for 3D Rendering**:
    *   **Unified Center**: Rebuilt the coordinate transformation engine in `TrackMap3D.tsx`. All data sources are forced to sync with the geographic center of the active session, resolving rendering displacement issues for reference laps.
    *   **Proactive Sync**: Optimized 2D/3D switching logic to automatically pre-load reference data before entering the 3D Lab.
*   **Persistent HUD Boundary Clamping**:
    *   **Adaptive Monitoring (ResizeObserver)**: Integrated modern DOM monitoring; HUD positions now auto-calibrate with container size changes.
    *   **Safety Margin**: Added an 8px collision buffer to prevent UI overlap with the control center.
*   **Self-Healing Playback**:
    *   **Auto-Kickstart**: Implemented detection logic to automatically skip to the first valid data point for sessions with non-zero start times (like COTA).
    *   **Playback Guardrails**: Enforced index boundary detection to ensure continuous playback smoothness.

### 🚀 Project Impact
*   v1.2.0 delivers significant precision improvements for high-load and cross-session scenarios, strengthening the robustness between data ingestion and visual presentation.

---

## 🟢 [2026-04-13] Interactive Telemetry HUD - 全方位自定義系統上線

### 🌟 核心突破
*   **互動式編輯模式 (Interactive Layout System)**：
    *   **雙擊觸發**：實作 `Double-Click to Edit` 全域狀態。
    *   **獨立座標體系**：支援遙測框獨立拖拽，採用百分比 (%) 定位，確保跨解析度的一致性。
    *   **同步縮放邏輯**：實作比例聯動功能，調整任一框體時自動同步全域縮放。
*   **視覺回饋與 UX 強化 (Premium UX)**：
    *   **環境呼吸燈 (Ambient Pulse)**：定義超平滑邊界發光動畫，防止組件重繪閃爍。
    *   **狀態引導提示**：新增 Hover 提示字，提升功能可發現性。
*   **持久化與標準化 (Standardization)**：
    *   **配置持久化**：所有自定義設定自動儲存於 `localStorage`。
    *   **全域重置功能**：實作「Reset HUD」，一鍵還原至官方標準對稱佈局。

🟢 [2026-04-13] Interactive Telemetry HUD - Global Customization System

### 🌟 Key Breakthroughs
*   **Interactive Layout System**:
    *   **Double-Click to Edit**: Implemented global state unlocking via double-click.
    *   **Independent Coordinate System**: Supports independent dragging of telemetry boxes using percentage (%) positioning for cross-resolution consistency.
    *   **Synchronized Scaling**: Scaling one box automatically syncs the global HUD scale.
*   **Premium UX & Visual Feedback**:
    *   **Ambient Pulse**: Defined ultra-smooth boundary glow animations to prevent flicker during updates.
    *   **Contextual Tooltips**: Added hover indicators to improve feature discoverability.
*   **Standardization & Persistence**:
    *   **Persistence**: Auto-saves all customization to `localStorage`.
    *   **Reset HUD**: One-click restoration to the default symmetrical layout.

---

## 🟢 [2026-04-12] 3D Dashboard - UX 精緻化與效能「零延遲」優化

### 🌟 核心突破
*   **智能視角系統 (Intelligent Viewport)**：
    *   **動態構圖**：實作賽道感知自動對焦，確保賽道主體處於畫面黃金位置。
    *   **非對稱追焦**：自動識別賽道方向，優化入彎點分析視野。
*   **介面對位標準化 (UX Cohesion)**：實踐毛玻璃數據面版 (Alt/Dist)，優化單位基準線對法。
*   **效能架構重定義 (Zero-Lag Sync)**：引入 `resetKey` 機制解決模式切換競態問題，並透過邊界快取徹底消除數據拖拽延遲。

🟢 [2026-04-12] 3D Dashboard - UX Refinement & Zero-Lag Optimization

### 🌟 Key Breakthroughs
*   **Intelligent Viewport System**:
    *   **Dynamic Composition**: Implemented track-aware auto-focus to keep the track in the visual "golden ratio."
    *   **Asymmetric Tracking**: Automatically identifies track direction (CW/CCW) to optimize corner entry visibility.
*   **UX Cohesion**: Implemented glassmorphism telemetry panels (Alt/Dist) and standardized unit alignment.
*   **Zero-Lag Architecture**: Introduced the `resetKey` mechanism to resolve concurrency issues during mode switches and eliminated scrubbing lag via boundary caching.

---

## 🟢 [2026-04-11] 3D Telemetry Dashboard - Data Union 整合

*   **數據聯集 (Data Union)**：後端融合引擎自動注入 `WorldPosZ` 頻道，3D 組件與 2D 圖表完全同步。
*   **介面整合 (UI Cohesion)**：实现 3D 高度圖作為標準 Dashboard 的一個 View。
*   **效能優化 (Performance)**：由封裝好的遙測數據流直接驅動位置與高度。

🟢 [2026-04-11] 3D Telemetry Dashboard - Data Union Integration

*   **Data Union**: The backend fusion engine now injects the `WorldPosZ` channel. 3D components are fully synchronized with 2D charts.
*   **UI Cohesion**: Integrated the 3D elevation map as a standard view within the main Dashboard.
*   **Performance**: Position and altitude are now driven directly by the encapsulated telemetry stream.

---

## 🟢 2026-04-09 | 3D Lab 功能大對標 (Phase 3)

*   **3D 行車線熱圖 (Heatmap Synchronization)**：實現 3D 軌跡與 2D 遙測色彩映射同步。
*   **雙圈 3D 對比 (Reference Lap comparison)**：支援同時渲染主單圈與參考單圈的軌跡與幽靈車。
*   **UI 區域模組化**：優化單圈選取器區域與切換模式。

🟢 2026-04-09 | 3D Lab Feature Parity (Phase 3)

*   **Heatmap Synchronization**: Synchronized 3D trajectory colors with 2D telemetry telemetry (Brake/Throttle/Coast).
*   **Dual-Lap Comparison**: Supports simultaneous rendering of main and reference trajectories, including ghost cars.
*   **UI Modularization**: Optimized lap selector regions and toggle modes.

---

## 🟢 2026-04-09 | 3D 軌跡引擎全方位穩定化 (Phase 1 & 2)

*   **航段感知數據融合 (Stint-Aware Fusion)**：解決單圈銜接與行車線消失問題。
*   **JSON 二進制安全與穩定性**：建立三重數據清洗機制，徹底消除 API 報錯。

🟢 2026-04-09 | 3D Trajectory Engine Stabilization (Phase 1 & 2)

*   **Stint-Aware Fusion**: Resolved lap-connection gaps and disappearing line issues.
*   **Stability & Safety**: Implemented a triple data-cleaning mechanism to eliminate API errors caused by malformed data.

---

## 🌑 2026-04-05 | 3D 軌跡渲染與高度映射上線 (Initial Alpha)

*   實現基礎 3D 賽道模型渲染與 DuckDB 數據對接。

🌑 2026-04-05 | 3D Trajectory Rendering & Elevation Mapping (Initial Alpha)

*   Implemented basic 3D track modeling and DuckDB data integration.
