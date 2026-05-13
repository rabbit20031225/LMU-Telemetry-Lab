# LMU Telemetry Lab - 遙測圖表清單 (Telemetry Charts List)

| 類別 (Category) | 顯示名稱 (Display Name) | 內部 ID (Internal ID) | 單位 (Unit) | 預設高度 | 顯示邏輯 / 備註 (Notes) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Driver** | Delta | Time Delta | s | 100 | 僅在有參考單圈時顯示 |
| **Driver** | Speed | Ground Speed | km/h | 180 | 支援公里/英哩切換 |
| **Driver** | Throttle | Throttle Pos | % | 140 | |
| **Driver** | Brake | Brake Pos | % | 140 | |
| **Driver** | Gear | Gear | - | 100 | |
| **Driver** | Steering | Steering Angle | deg | 140 | |
| **Driver** | Engine RPM | Engine RPM | rpm | 140 | |
| **Tyres** | FL Temp | TireHeat | °C | 140 | 獨立四輪胎溫 (WheelIndex 0) |
| **Tyres** | FR Temp | TireHeat | °C | 140 | 獨立四輪胎溫 (WheelIndex 1) |
| **Tyres** | RL Temp | TireHeat | °C | 140 | 獨立四輪胎溫 (WheelIndex 2) |
| **Tyres** | RR Temp | TireHeat | °C | 140 | 獨立四輪胎溫 (WheelIndex 3) |
| **Tyres** | Pressures (4-Wheel) | TyresPressure | kPa | 160 | 四輪壓力疊圖 |
| **Tyres** | Slip Ratio (All) | Slip Ratio | % | 160 | 四輪滑移率疊圖 |
| **Dynamics** | FL Susp | Susp Pos | mm | 120 | 懸吊行程 (WheelIndex 0) |
| **Dynamics** | FR Susp | Susp Pos | mm | 120 | 懸吊行程 (WheelIndex 1) |
| **Dynamics** | RL Susp | Susp Pos | mm | 120 | 懸吊行程 (WheelIndex 2) |
| **Dynamics** | RR Susp | Susp Pos | mm | 120 | 懸吊行程 (WheelIndex 3) |
| **Dynamics** | Ride Heights (F/R) | RideHeights | mm | 160 | 前後車高疊圖 |
| **Dynamics** | Front 3rd | Front3rdDeflection | mm | 100 | 第三支避震器位移 |
| **Dynamics** | Rear 3rd | Rear3rdDeflection | mm | 100 | 第三支避震器位移 |
| **Handling** | Yaw Rate | Yaw Rate | deg/s | 120 | 偏航角速度 |
| **Handling** | Lateral G | G Force Lat | G | 100 | 側向加速 |
| **Handling** | Longitudinal G | G Force Long | G | 100 | 縱向加速 |
| **Systems** | TC Active | TC | - | 120 | 循跡作動 |
| **Systems** | ABS Active | ABS | - | 120 | **限 GT3 組別顯示** |
| **Systems** | Hybrid SoC | SoC | MJ | 120 | **限 Hyper 組別顯示** (換算至 MJ) |
| **Systems** | Fuel Level | Fuel Level | L | 120 | 剩餘油量 |
