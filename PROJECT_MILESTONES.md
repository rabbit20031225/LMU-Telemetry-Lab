## 🟢 [2026-04-19] Maximized Analytics Dashboard - Master Release (v1.3.0 Final)

### 🌟 核心突破 / Key Breakthroughs
*   **全螢幕垂直整合分析引擎 (Maximized Analytics Engine)**:
    - **中文**: 實作了 2D 與 3D 模式的全螢幕視圖切換，整合了地圖導航、遙測分析與檔案管理。解決了跨維度 UI 狀態同步的難題，讓分析流程不再受限於單一視角。
    - **English**: Implemented a full-screen analysis engine for both 2D and 3D modes, integrating map navigation, telemetry analytics, and file management. Resolved cross-view state synchronization, ensuring a seamless flow across dimensions.
*   **模組化 HUD 系統與智能側邊欄 (Modular HUD & Smart Sidebar)**:
    - **中文**: 開發了具備自定義位置、縮放與持久化的 HUD 系統（Track/Car Info, Analysis Laps, Data Charts）。導入智能側邊欄架構與 Framer Motion 動畫，實現介面重組時的物理級平滑感。
    - **English**: Developed a modular HUD system (Track/Car Info, Analysis Laps, Data Charts) with custom positioning, scaling, and persistence. Introduced a Smart Sidebar architecture with Framer Motion for buttery-smooth layout transitions.
*   **旗艦級玻璃視覺與性能優化 (Flagship Glass UI & performance)**:
    - **中文**: 建立了 `glass-container-static` 規範，解決了 WebGL 環境下磨砂濾鏡的渲染 Bug。並透過 `will-change` 與佈局攔截技術，在複雜的玻璃疊加環境下依然達成 60FPS 的流暢操作手感。
    - **English**: Established the `glass-container-static` standard, fixing backdrop-filter rendering bugs in WebGL contexts. Achieved 60FPS fluid interaction through will-change and layout-capture optimizations, even with complex glass layering.
*   **數據與地圖深度鏈路 (Deep Data-Map Linkage)**:
    - **中文**: 將 Data Sources (FileManager) 完整移植至最大化儀表板，優化了地圖 Minimap 規格與對稱佈局，實現了「一站式」的遙測分析體驗。
    - **English**: Migrated Data Sources (FileManager) directly into the maximized dashboard, refined Minimap specifications and symmetrical layouts, delivering a true "one-stop" telemetry analytics experience.

### 🚀 專案影響 / Impact
*   **中文**: v1.3.0 的完成代表著 LMU Telemetry Lab 從基礎原型正式進化為具備高度自定義能力、極致視覺美感與穩定性能的專業級遙測分析工具。
*   **English**: The completion of v1.3.0 marks the evolution of LMU Telemetry Lab from a prototype into a professional-grade telemetry tool featuring high customizability, premium aesthetics, and rock-solid performance.

---

## 🟢 [2026-04-15] Telemetry v1.2.2 - Hardened Stability & Playback Fix (穩定性加固與平滑播放修復)

### 🌟 核心突破 / Key Breakthroughs
*   **系統穩定性防禦 (System Hardening Defense)**:
    *   **中文**: 針對 COTA 等特殊 Session 檔案進行全域審計，實作「零容忍」檢查機制。針對缺失的數據渠道實作安全取值鎖，介面現在能優雅降級顯示為 "--" 而非崩潰。
    *   **English**: Performed a global audit for sparse session files (like COTA) and implemented a "zero-tolerance" safety mechanism. Added defensive locks for missing channels, allowing components to gracefully degrade to "--" instead of crashing.
*   **平滑播放修復 (Smooth Playback Calibration)**:
    *   **中文**: 修復了 v1.2.0 平滑播放導致的時間軸數字卡在 `0:00.000` 的 Bug。透過強制索引取整 (Math.floor)，確保播放時的時間顯示精確同步。
    *   **English**: Resolved the "zero-time freeze" bug introduced by smooth playback in v1.2.0. By enforcing index floor-ing (Math.floor), playback time in the HUD and charts now correctly syncs during live playback.

### 🚀 專案影響 / Impact
*   **中文**: v1.2.2 顯著提升了在極端數據場景下的強健性，確保分析流程不因數據殘缺而中斷。
*   **English**: v1.2.2 significantly boosts application resilience in edge-case data scenarios, ensuring analytics workflows remain uninterrupted despite malformed telemetry.

---

## 🟢 [2026-04-15] Telemetry v1.2.1 - 賽道數據同步 (LMU v1.3.1.2)
*   **賽道庫大更新 (Track DB Expansion)**：
    *   **資料同步**：全面對標 Le Mans Ultimate v1.3.1.2 遊戲數據。
    *   **佈局補全**：新增 Paul Ricard (Layout 1A, 1A-V2, 1A-V2-Short, 3A)、Silverstone (International, National) 以及 Spa (Endurance) 的高程參考點。
    *   **長度校準**：精確校準 Monza、Interlagos、Bahrain、Sebring 等賽道的佈局長度，誤差縮距至 1m 以內，顯著提升 Delta 計算穩定性。
*   **文件同步**：新增 `lmu_track_list.md` 作為使用者查詢手冊。

---

## 🟢 [2026-04-14] Telemetry v1.2.0 - 座標歸一化與數據 Self-Healing 重磅更新
1. 
2. ### 🌟 核心突破
3. *   **3D 渲染精準對位 (Unified Origin)**：
4.     *   **全域投影基準 (Unified Center)**：重構 `TrackMap3D.tsx` 的座標轉換引擎。所有數據來源（當前與參考）強制同步至「當前工作階段」的地理中心，徹底解決了跨 Session 參考單圈的渲染位移問題。
5.     *   **主動式數據同步 (Proactive Sync)**：優化 2D/3D 切換邏輯，進入實體 Lab 前自動完成參考數據預熱，確保視角切換零斷層。
6. *   **HUD 邊界韌性強化 (Persistent Boundary Clamping)**：
7.     *   **自適應監控 (ResizeObserver)**：整合現代 DOM 監控，HUD 現在會隨父容器尺寸變動實時校準位置，解決側邊欄切換或視窗縮放導致的 UI 脫域。
8.     *   **美學緩衝 (Safety Margin)**：加入 8px 邊界防撞邊距，並將編輯模式 z-index 提升至 1200，解決與控制中心的互動爭搶衝突。
9. *   **播放彈性與容錯 (Self-Healing Playback)**：
10.     *   **自動啟動修復 (Auto-Kickstart)**：在 `togglePlayback` 中實作偵測與補償邏輯。針對非零起始點的數據（如 COTA 檔案），系統會自動掃描並跳轉至首筆有效點。
11.     *   **邊界保護鎖 (Playback Guardrails)**：強化索引邊界檢測，防止播放座標進入邊緣「 N/A 黑洞」，確保播放流暢度。
12. 
13. ### 🚀 專案影響
14. *   v1.2.0 顯著提升了系統在高負載與跨 Session 場景下的精確度。不僅解決了視覺上的偏差，更進一步增強了「數據載入」與「UI 呈現」之間的異步強健性。
15. 
16. ---
17: 
18: ## 🟢 [2026-04-13] Interactive Telemetry HUD - 全方位自定義系統上線

### 🌟 核心突破
*   **互動式編輯模式 (Interactive Layout System)**：
    *   **雙擊觸發**：實作 `Double-Click to Edit` 全域狀態，允許使用者隨時解鎖介面佈局。
    *   **獨立座標體系**：支援 `Current` 與 `Reference` 遙測框獨立拖拽，座標採用百分比 (%) 定位，確保跨解析度的一致性。
    *   **同步縮放邏輯**：實作比例聯動功能，調整任一框體大小時自動同步全域 `scale`。
*   **視覺回饋與 UX 強化 (Premium UX)**：
    *   **環境呼吸燈 (Ambient Pulse)**：於全域 CSS 定義 `20s` (或極慢) 的超平滑邊界發光動畫，防止組件重繪導致的閃爍。
    *   **狀態引導提示**：新增全英文 Hover 提示字 (`Double Click to Edit/Lock`)，提升功能可發現性。
    *   **邊界保護 (Safe Clipping)**：實作父容器感知攔截，防止框體被拖出地圖區域。
*   **持久化與標準化 (Standardization)**：
    *   **配置持久化**：所有自定義位置與縮放比例均自動儲存於 `localStorage`。
    *   **全域重置功能 (One-Click Reset)**：於地圖左上角實作「Reset HUD」，一鍵還原至官方標準對稱佈局。

### 🚀 專案影響
*   使用者現在可以根據個人駕駛習慣（如避開特定 UI 或針對超寬螢幕配置）自由調整遙測看板，大幅提升了儀表板的工具屬性與專業視覺質感。

---

## 🟢 [2026-04-12] 3D Dashboard - UX 精緻化與效能「零延遲」優化

### 🌟 核心突破
*   **智能視角系統 (Intelligent Viewport)**：
    *   **動態構圖**：實作賽道感知的自動對焦功能，確保重置視角後賽道主體避開 HUD，位於畫面黃金位置。
    *   **非對稱追焦**：自動識別賽道方向 (CW/CCW)，動態切換至左後/右後斜方位視角，優化入彎點分析視野。
*   **介面對位標準化 (UX Cohesion)**：
    *   **Pixel-Perfect HUD**：實踐毛玻璃數據面版 (Alt/Dist)，優化單位基準線對法。
    *   **Minimap 規格化**：固定 5:3 寬螢幕比例並實作 Auto-fit 邏輯，與 2D 版完全對齊。
*   **效能架構重定義 (Zero-Lag Sync)**：
    *   **訊號式導航 (Signal-based Nav)**：引入 `resetKey` 機制，解決模式切換時的競態問題，實現精確的「一鍵切換」。
    *   **零延遲時間軸**：透過移除動畫干涉與導入 O(1) 邊界快取，徹底消除大數據量下的拖拽延遲，實現「指哪打哪」的操作感。

### 🚀 專案影響
*   3D 遙測模組正式具備專業級的操作順滑度與直覺性，使用者不再因視角調整或操控 Lag 而中斷分析流程。

---

## 🟢 [2026-04-11] 3D Telemetry Dashboard - Data Union 整合

### 🌟 核心突破
*   **數據聯集 (Data Union)**：
    *   後端融合引擎 (`telemetry_service.py`) 現在會自動注入 `WorldPosZ` 頻道。
    *   3D 組件直接訂閱全域遙測游標，與 2D 圖表完全同步。
*   **介面整合 (UI Cohesion)**：
    *   在 Dashboard 地圖疊加層加入 `[ 2D | 3D ]` 切換按鈕。
    *   實現 3D 高度圖作為標準 Dashboard 的一個 View，而不是分離的 Lab。
*   **效能優化 (Performance)**：
    *   移除 3D 組件中的冗餘點位搜尋邏輯，改由封裝好的遙測數據流直接驅動位置與高度。

---

## 🟢 2026-04-09 | 3D Lab 功能大對標 (Phase 3)

### 🌟 核心突破
*   **3D 行車線熱圖 (Heatmap Synchronization)**：
    *   實作頂點著色 logic，將 3D 軌跡與 2D 的「煞車/油門/滑行」色彩映射完全同步。
*   **雙圈 3D 對比 (Reference Lap comparison)**：
    *   支援同時渲染主單圈與參考單圈的 3D 軌跡（Dash-Golden 虛線樣式）。
    *   同步實作 3D 幽靈車 (Ghost Car) 渲染，實現空間位置的直觀對位。
*   **UI 區域模組化**：
    - 移除備註框，移動單圈選取器至左下角，加入 MAIN/REF 選取切換模式。

### 🚀 專案影響
*   3D Lab 具備完整的專業分析能力，可進行跨圈、跨 Session 的高度數據對位。

---

## 🟢 2026-04-09 | 3D 軌跡引擎全方位穩定化 (Phase 1 & 2)

### 🌟 核心突破
*   **航段感知數據融合 (Stint-Aware Fusion)**：
    *   成功實現 3D 引擎與 2D 遙測鏈路的邏輯對標。
    *   解決了長期存在的 Lap 0、銜接圈行車線消失問題。
    *   實作「航段錨點法 (Stint-Anchor)」，確保邊界數據捕捉成功率。
*   **JSON 二進制安全與穩定性**：
    *   建立三重數據清洗機制（NaN/Inf Filter），徹底消除 API 500 報課。
    *   實現了前端 3D 請求攔截器，防止殘缺數據造成的地圖座標偏移。

### 🚀 專案影響
*   3D Lab 正式從「實驗性功能」轉化為「高可用性分析工具」。
*   數據準確度與穩定性達到生產環境標準。

---

## 🌑 2026-04-05 | 3D 軌跡渲染與高度映射功能上線 (Initial Alpha)
*   實現基礎 3D 賽道模型渲染。
*   初步對接 DuckDB 數據源。

---
