# LMU 更新內容檢查清單 (LMU Update Checklist)

當 Le Mans Ultimate (LMU) 進行版本更新並加入新的賽道、 layout 或車輛時，請務必檢查並更新以下位置，以確保系統能正確識別資料並顯示對應的視覺效果。

## 1. 資料庫與對應表 (Backend)

### [ ] 車輛 mapping
- **檔案**: `lmu_carname_to_modelname.csv` (位於專案根目錄)
- **動作**: 增加新的 `carname` (從 LMU metadata 取得的原始名稱), `modelname` (顯示用的漂亮名稱), `steeringLock` (轉向打死角度) 以及 `category`。
- **後援檔案**: `backend/app/services/car_lookup.py` 裡的 `STANDARD_MAPPING` 段落（若 CSV 沒抓到時的備份）。

### [ ] 賽道定義與海拔資料
- **檔案**: `backend/app/utils/track_db.py`
- **動作**: 在 `TRACK_REGISTRY` 加入新賽道：
    - `aliases`: 增加 LMU 可能使用的名稱變體（如 "Spa", "Spa-Francorchamps"）。
    - `layouts`: 定義 Layout 名稱（如 "Default", "Short Circuit"）。
    - `ref_points`: **關鍵！** 若要正確顯示 3D 賽道圖與海拔曲線，需填入 `dist` (距離) 與 `alt` (海拔) 的基準點。

---

## 2. 前端靜態資源 (Frontend Public)

### [ ] 品牌與車隊 Logo
- **路徑**: `frontend/public/logos`
- **檔案**: 新增 `.png` 檔案（建議背景透明）。

### [ ] 方向盤圖示
- **路徑**: `frontend/public/steering wheel`
- **動作**: 依照車輛分類存入對應資料夾。系統會自動掃描此目錄供 UI 選擇。

### [ ] 賽道地圖
- **路徑**: `frontend/public/tracks`
- **檔案**: 新增賽道的平面圖（`.png`），名稱需與 `App.tsx` 裡的邏輯對應。

---

## 3. 前端代碼邏輯 (Frontend Logic - App.tsx)

### [ ] 賽道與地圖對應
- **位置**: `frontend/src/App.tsx` 中的 `getTrackFlagPath` 函數。
- **動作**: 增加新的 track 關鍵字並指向對應的圖片路徑。

### [ ] 國家旗幟對應
- **位置**: `frontend/src/App.tsx` 中的 `getCountryFlagPath` 函數。
- **動作**: 增加新賽道對應的國家代碼（ISO 兩碼，如 `be`, `fr`, `it`）。

### [ ] 品牌 Logo 自動匹配
- **位置**: `frontend/src/App.tsx` 中的 `getBrandLogoPath` 函數。
- **動作**: 若新增了上述提到的品牌，需在此加入關鍵字過濾邏輯。

### [ ] 賽事級別顏色 (Car Class Colors)
- **位置**: `frontend/src/App.tsx` 中的 `getClassColor` 函數。
- **動作**: 若有新的類別（例如未來的 LMGT2 或其他），需定義其標籤顏色。

### [ ] 輪胎配方顯示
- **位置**: `frontend/src/App.tsx` 中的 `getCompoundInfo` 函數。
- **動作**: 若新賽事級別的輪胎配方數量不同（如 3 種或 4 種），需更新判斷邏輯。
