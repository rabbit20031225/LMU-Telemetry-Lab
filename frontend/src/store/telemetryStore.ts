import { create } from 'zustand';
import type { Session, Lap, TelemetryData, SessionMetadata, Profile, ChartConfig } from '../types';
import { apiClient } from '../api/client';

// Helper for finding fractional index in a mapped channel array (Time, Distance)
// Uses binary search for performance
const findIndexInChannelRange = (arr: Float64Array | number[], target: number, start: number, end: number): number => {
    if (target <= arr[start]) return start;
    if (target >= arr[end]) return end;
    
    let low = start;
    let high = end;
    
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (arr[mid] === target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    
    // Target is between high and low
    const p1 = high;
    const p2 = low;
    const v1 = arr[p1];
    const v2 = arr[p2];
    
    if (v2 === v1) return p1;
    return p1 + (target - v1) / (v2 - v1);
};

export interface TelemetryState {
    sessions: Session[];
    currentSessionId: string | null;
    sessionMetadata: SessionMetadata | null; // NEW
    referenceSessionMetadata: SessionMetadata | null; // NEW
    laps: Lap[];
    selectedLapIdx: number | null;     // Index in laps array
    telemetryData: TelemetryData | null;
    referenceTelemetryData: TelemetryData | null;
    referenceLapIdx: number | null;    // Index in laps array (null if cross-session or no ref)
    referenceLap: import('../types').ReferenceLap | null; // For cross-session/stint ref
    selectedStint: number | null;
    cursorIndex: number | null;
    referenceCursorIndex: number | null; // NEW: Synced index for reference values (Time-based)
    referenceDeltaIndex: number | null;  // NEW: Synced index for delta calculation (Distance-based)
    liveDelta: number | null;            // NEW: Standardized time delta (current - ref)
    playbackElapsed: number;             // NEW: Single source of truth for playback time offset in seconds
    zoomRange: [number, number] | null;
    track3DData: {
        baseMap: any[];
        racingLine: any[];
        center?: {
            lat: number;
            lon: number;
            lonScale: number;
        };
        fastestLap?: number;
        selectedLapInfo?: any;
        zBase?: number;
    } | null;
    referenceTrack3DData: {
        baseMap: any[];
        racingLine: any[];
        center?: {
            lat: number;
            lon: number;
            lonScale: number;
        };
        fastestLap?: number;
        selectedLapInfo?: any;
        zBase?: number;
    } | null;
    staticTrackBaseData: { baseMap: any[]; racingLine: any[]; center?: any } | null; // NEW: Static base map from fastest lap
    isProcessingTrack: boolean; // NEW: Loading state for track calculation
    show3DLab: boolean;
    isLoading: boolean;
    loadingCount: number; // For Semaphore-based concurrent loading management
    loadingProgress: number | null;
    isListLoading: boolean;
    error: string | null;
    isPlaying: boolean;
    playbackSpeed: number;
    smoothCursorIndex: number | null; // Float for interpolation
    cameraMode: 'static' | 'follow' | 'heading-up';
    followZoom: number;

    // Profile Management
    profiles: Profile[];
    activeProfileId: string | null;

    // Settings
    speedUnit: 'kmh' | 'mph';
    tempUnit: 'c' | 'f';
    showSettings: boolean;
    chartConfigs: ChartConfig[];
    chartPresets: ChartPreset[];
    userWheelRotation: number | null;

    isLeftSidebarCollapsed: boolean;
    isRightPanelCollapsed: boolean;
    dashboardSyncMode: 'distance' | 'time';

    showTelemetryOverlay: boolean; // NEW
    selectedWheel: string | null;  // NEW
    customWheels: { id: string, name: string, data: string }[];
    telemetryHistorySeconds: number; // NEW
    zScale: number; // For 3D Map elevation scaling
    editHudMode: boolean;
    isMapMaximized: boolean; // NEW
    overlapConfig: {
        current: { x: number; y: number };
        reference: { x: number; y: number };
        scale: number;
    };
    overlapConfigMaximized: {
        current: { x: number; y: number };
        reference: { x: number; y: number };
        scale: number;
    };
    hudRects: Record<string, {
        id: string;
        left: number;   // %
        right: number;  // %
        top: number;    // %
        bottom: number; // %
        active: boolean;
    }>;
    hudVisibility: {
        overlap: boolean;
        vehicleInfo: boolean;
        trackInfo: boolean;
        analysisLaps: boolean;
        dataCharts: boolean;
    };
    parentDimensions: { width: number; height: number }; // NEW: For absolute pixel math
    showReferenceBrowser: boolean;
    maximizedSidebarMode: 'hud' | 'data_sources'; // NEW: For navigating within maximized sidebar

    // Actions
    setSpeedUnit: (unit: 'kmh' | 'mph') => void;
    setTempUnit: (unit: 'c' | 'f') => void;
    setShowSettings: (show: boolean) => void;
    setCameraMode: (mode: 'static' | 'follow' | 'heading-up') => void;
    setFollowZoom: (zoom: number) => void;
    setShow3DLab: (show: boolean) => void; // NEW
    setShowReferenceBrowser: (show: boolean) => void;
    setLeftSidebarCollapsed: (collapsed: boolean) => void;
    setRightPanelCollapsed: (collapsed: boolean) => void;
    setChartConfigs: (configs: ChartConfig[]) => void;
    updateChartConfig: (id: string, updates: Partial<ChartConfig>) => void;
    saveChartPreset: (name: string) => void;
    loadChartPreset: (id: string) => void;
    deleteChartPreset: (id: string) => void;
    resetChartColors: () => void;
    resetChartConfigs: () => void;
    setUserWheelRotation: (rotation: number | null) => void;
    setShowTelemetryOverlay: (show: boolean) => void; // NEW
    setSelectedWheel: (wheel: string | null) => void;  // NEW
    setCustomWheels: (wheels: { id: string, name: string, data: string }[]) => void;
    setTelemetryHistorySeconds: (seconds: number) => void; // NEW
    setZScale: (scale: number) => void; // NEW
    setEditHudMode: (is: boolean) => void;
    updateOverlapConfig: (config: Partial<{ current: { x: number; y: number }; reference: { x: number; y: number }; scale: number }>) => void;
    updateHudRect: (id: string, rect: { left: number; right: number; top: number; bottom: number; active: boolean }, dims?: { width: number; height: number }) => void;
    validateHudLayout: () => void;
    resetHudConfigs: () => void;
    setHudVisibility: (key: keyof TelemetryState['hudVisibility'], visible: boolean) => void;
    setIsMapMaximized: (is: boolean) => void;
    setMaximizedSidebarMode: (mode: 'hud' | 'data_sources') => void; // NEW

    fetchSessions: () => Promise<void>;
    selectSession: (sessionId: string) => Promise<void>;
    selectLap: (lapIdx: number | null) => void;
    fetchStint: (stintId: number) => Promise<void>;
    setReferenceLap: (lapIdx: number | null) => void;
    selectReferenceLap: (lap: import('../types').ReferenceLap | null) => Promise<void>;
    fetchReferenceTelemetry: (lap: import('../types').ReferenceLap) => Promise<void>;
    setCursorIndex: (idx: number | null) => void;
    setZoomRange: (range: [number, number] | null) => void;
    fetch3DTrack: (lapIdx: number, stintId?: number | null) => Promise<void>;
    fetchReference3DTrack: (lapIdx: number, stintId?: number | null) => Promise<void>;
    setTrackBaseData: (data: any) => void; // NEW
    setIsProcessingTrack: (isProcessing: boolean) => void; // NEW
    clearSession: () => void;

    // File Management
    uploadSession: (file: File) => Promise<void>;
    renameSession: (sessionId: string, newName: string) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    togglePlayback: () => void;
    setPlaybackSpeed: (speed: number) => void;
    updatePlayback: (deltaTimeMs: number) => void;
    setPlaybackProgress: (progress: number) => void;

    // Profile Actions
    fetchProfiles: () => Promise<void>;
    setProfile: (profileId: string) => Promise<void>;
    createProfile: (name: string) => Promise<void>;
    updateProfile: (profileId: string, name: string) => Promise<void>;
    deleteProfile: (profileId: string) => Promise<void>;
    setPlaybackTime: (time: number) => void;
    uploadAvatar: (profileId: string, file: File) => Promise<void>;
    syncReferenceIndex: () => void;
    syncFromElapsed: (elapsed: number) => void; // NEW: Decoupled time synchronization
    setDashboardSyncMode: (mode: 'distance' | 'time') => void;
}

const DEFAULT_CHARTS: ChartConfig[] = [
    { id: 'Time Delta', alias: 'Delta', color: '#bf00ff', visible: true, order: 0, height: 100, unit: 's' },
    { id: 'Ground Speed', alias: 'Speed', color: '#00aaff', visible: true, order: 1, height: 180, unit: 'km/h' },
    { id: 'Throttle Pos', alias: 'Throttle', color: '#00ff00', visible: true, order: 2, height: 120, unit: '%' },
    { id: 'Brake Pos', alias: 'Brake', color: '#ff0000', visible: true, order: 3, height: 150, unit: '%' },
    { id: 'Gear', alias: 'Gear', color: '#ffaa00', visible: true, order: 4, height: 100 },
    { id: 'Steering Angle', alias: 'Steering', color: '#ff00ff', visible: true, order: 5, height: 150, unit: 'deg' },
    { id: 'Engine RPM', alias: 'Engine RPM', color: '#ffff00', visible: true, order: 6, height: 150, unit: 'rpm' },
];

export interface ChartPreset {
    id: string;
    name: string;
    isBuiltIn?: boolean;
    configs: ChartConfig[];
}

const BUILT_IN_PRESETS: ChartPreset[] = [
    {
        id: 'builtin_default',
        name: 'Default',
        isBuiltIn: true,
        configs: DEFAULT_CHARTS,
    },
    {
        id: 'builtin_endurance',
        name: 'Endurance Focus',
        isBuiltIn: true,
        configs: [
            { id: 'Ground Speed', alias: 'Speed', color: '#00aaff', visible: true, order: 0, height: 150, unit: 'km/h' },
            { id: 'Throttle Pos', alias: 'Throttle', color: '#00c844', visible: true, order: 1, height: 100, unit: '%' },
            { id: 'Brake Pos', alias: 'Brake', color: '#ff3333', visible: true, order: 2, height: 100, unit: '%' },
            { id: 'Gear', alias: 'Gear', color: '#ffaa00', visible: true, order: 3, height: 80 },
            { id: 'Engine RPM', alias: 'RPM', color: '#ffff00', visible: true, order: 4, height: 120, unit: 'rpm' },
            { id: 'Time Delta', alias: 'Delta', color: '#bf00ff', visible: false, order: 5, height: 100, unit: 's' },
            { id: 'Steering Angle', alias: 'Steering', color: '#ff00ff', visible: false, order: 6, height: 100, unit: 'deg' },
        ],
    },
    {
        id: 'builtin_sprint',
        name: 'Sprint / Pace',
        isBuiltIn: true,
        configs: [
            { id: 'Time Delta', alias: 'Delta', color: '#bf00ff', visible: true, order: 0, height: 120, unit: 's' },
            { id: 'Ground Speed', alias: 'Speed', color: '#00aaff', visible: true, order: 1, height: 150, unit: 'km/h' },
            { id: 'Throttle Pos', alias: 'Throttle', color: '#00ff88', visible: true, order: 2, height: 100, unit: '%' },
            { id: 'Brake Pos', alias: 'Brake', color: '#ff4444', visible: true, order: 3, height: 100, unit: '%' },
            { id: 'Steering Angle', alias: 'Steering', color: '#ff66ff', visible: true, order: 4, height: 120, unit: 'deg' },
            { id: 'Gear', alias: 'Gear', color: '#ffaa00', visible: false, order: 5, height: 80 },
            { id: 'Engine RPM', alias: 'RPM', color: '#ffff00', visible: false, order: 6, height: 100, unit: 'rpm' },
        ],
    },
];


// Default HUD Configs (Only Overlap remains configurable)
const DEFAULT_OVERLAP_CONFIG = {
    current: { x: 15, y: 70 },
    reference: { x: 85, y: 70 },
    scale: 0.8
};

const DEFAULT_OVERLAP_CONFIG_MAXIMIZED = {
    current: { x: 38, y: 85 },
    reference: { x: 62, y: 85 },
    scale: 1.0
};

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
    sessions: [],
    currentSessionId: null,
    sessionMetadata: null, // NEW
    referenceSessionMetadata: null, // NEW
    laps: [],
    selectedLapIdx: null,
    telemetryData: null,
    referenceTelemetryData: null,
    selectedStint: null,
    cursorIndex: null,
    referenceCursorIndex: null,
    referenceDeltaIndex: null,
    liveDelta: null,
    playbackElapsed: 0,
    referenceLapIdx: null,
    referenceLap: null,
    zoomRange: null,
    track3DData: null,
    referenceTrack3DData: null,
    staticTrackBaseData: null,
    isProcessingTrack: false,
    show3DLab: false,
    isLoading: false, // Unified loading state (derived from loadingCount > 0)
    loadingCount: 0,
    loadingProgress: null,
    isListLoading: false, // For Non-Blocking Operations (Session List)
    error: null,
    showReferenceBrowser: false,
    isPlaying: false,
    playbackSpeed: 1,
    smoothCursorIndex: null,
    cameraMode: 'static',
    followZoom: 50, // Default for the 1-100 range

    profiles: [],
    activeProfileId: null,

    // Settings Defaults
    speedUnit: (localStorage.getItem('speed_unit') as 'kmh' | 'mph') || 'kmh',
    tempUnit: (localStorage.getItem('temp_unit') as 'c' | 'f') || 'c',
    showSettings: false,
    chartConfigs: JSON.parse(localStorage.getItem('chart_configs') || 'null') || DEFAULT_CHARTS,
    chartPresets: [
        ...BUILT_IN_PRESETS,
        ...(JSON.parse(localStorage.getItem('chart_presets') || '[]') as ChartPreset[]),
    ],

    isLeftSidebarCollapsed: localStorage.getItem('left_sidebar_collapsed') === 'true',
    isRightPanelCollapsed: localStorage.getItem('right_panel_collapsed') === 'true',
    dashboardSyncMode: (localStorage.getItem('dashboard_sync_mode') as 'distance' | 'time') || 'distance',
    userWheelRotation: null, // Initialized in setProfile/fetchProfiles
    showTelemetryOverlay: true,
    selectedWheel: localStorage.getItem('selected_steering_wheel') || null,
    customWheels: JSON.parse(localStorage.getItem('custom_steering_wheels') || '[]'),
    telemetryHistorySeconds: parseFloat(localStorage.getItem('telemetry_history_seconds') || '1.0'),
    zScale: 1.0,
    editHudMode: false,
    isMapMaximized: false,
    overlapConfig: JSON.parse(localStorage.getItem('overlap_config') || JSON.stringify(DEFAULT_OVERLAP_CONFIG)),
    overlapConfigMaximized: JSON.parse(localStorage.getItem('overlap_config_maximized') || JSON.stringify(DEFAULT_OVERLAP_CONFIG_MAXIMIZED)),
    hudRects: {},
    hudVisibility: JSON.parse(localStorage.getItem('hud_visibility') || JSON.stringify({
        overlap: true,
        vehicleInfo: false,
        trackInfo: true,
        analysisLaps: false,
        dataCharts: false
    })),
    parentDimensions: { width: 1920, height: 1080 },
    maximizedSidebarMode: 'hud',

    setSpeedUnit: (unit) => {
        localStorage.setItem('speed_unit', unit);
        set({ speedUnit: unit });
    },
    setTempUnit: (unit) => {
        localStorage.setItem('temp_unit', unit);
        set({ tempUnit: unit });
    },
    setShowSettings: (show) => set({ showSettings: show }),
    setCameraMode: (mode) => set({ cameraMode: mode }),
    setFollowZoom: (zoom) => set({ followZoom: zoom }),
    setTrackBaseData: (data) => set({ staticTrackBaseData: data }),
    setShowTelemetryOverlay: (show) => set({ showTelemetryOverlay: show }),
    setSelectedWheel: (wheel) => {
        if (wheel) localStorage.setItem('selected_steering_wheel', wheel);
        else localStorage.removeItem('selected_steering_wheel');
        set({ selectedWheel: wheel });
    },
    setCustomWheels: (customWheels) => {
        localStorage.setItem('custom_steering_wheels', JSON.stringify(customWheels));
        set({ customWheels });
    },
    setTelemetryHistorySeconds: (seconds) => {
        const rounded = Math.round(seconds * 10) / 10;
        localStorage.setItem('telemetry_history_seconds', rounded.toString());
        set({ telemetryHistorySeconds: rounded });
    },
    setZScale: (scale) => set({ zScale: scale }),
    setEditHudMode: (is) => set({ editHudMode: is }),
    updateOverlapConfig: (config) => set((state) => {
        const isMax = state.isMapMaximized;
        const targetConfigKey = isMax ? 'overlapConfigMaximized' : 'overlapConfig';
        const storageKey = isMax ? 'overlap_config_maximized' : 'overlap_config';

        const currentConfig = state[targetConfigKey];
        const newConfig = {
            ...currentConfig,
            current: config.current ? { ...currentConfig.current, ...config.current } : currentConfig.current,
            reference: config.reference ? { ...currentConfig.reference, ...config.reference } : currentConfig.reference,
            scale: config.scale !== undefined ? config.scale : currentConfig.scale,
        };
        localStorage.setItem(storageKey, JSON.stringify(newConfig));
        return { [targetConfigKey]: newConfig };
    }),
    updateHudRect: (id, rect, dims) => set((state) => {
        const nextState: any = {
            hudRects: { ...state.hudRects, [id]: { ...rect, id } }
        };
        if (dims) {
            nextState.parentDimensions = dims;
        }
        return nextState;
    }),
    validateHudLayout: () => {
        const state = get();
        const rects = state.hudRects;
        const isMax = state.isMapMaximized;
        const vis = state.hudVisibility;

        // Authoritative cx/cy always comes from the STORE CONFIG
        const getConfigCenter = (id: string): { x: number; y: number } | null => {
            switch (id) {
                case 'overlap': return isMax ? state.overlapConfigMaximized.current : state.overlapConfig.current;
                case 'overlapRef': return isMax ? state.overlapConfigMaximized.reference : state.overlapConfig.reference;
                default: return null;
            }
        };

        const PRIORITY: { id: string; active: boolean }[] = [
            { id: 'overlap', active: vis.overlap },
            { id: 'overlapRef', active: vis.overlap },
        ];

        const settled: Record<string, { left: number; right: number; top: number; bottom: number }> = {};
        const updates: Partial<typeof state> = {};
        const parentW = state.parentDimensions.width;
        const parentH = state.parentDimensions.height;

        for (const { id, active } of PRIORITY) {
            const rect = rects[id];
            const center = getConfigCenter(id);
            if (!rect || !rect.active || !active || !center) continue;

            const halfWPct = (rect.right - rect.left) / 2;
            const halfHPct = (rect.bottom - rect.top) / 2;

            const cx = center.x;
            const cy = center.y;

            let newX = cx;
            let newY = cy;

            const EDGE_MARGIN = 0.8; // % gap between HUD and screen edge
            const HUD_GAP = 0.4; // % gap between adjacent HUDs

            // SIDEBAR AVOIDANCE (Maximized Mode Only)
            const MIN_LEFT_PCT = isMax ? (380 / parentW) * 100 : EDGE_MARGIN;

            // 1. Boundary clamp
            newX = Math.max(halfWPct + MIN_LEFT_PCT, Math.min(100 - halfWPct - EDGE_MARGIN, cx));
            newY = Math.max(halfHPct + EDGE_MARGIN, Math.min(100 - halfHPct - EDGE_MARGIN, cy));

            // 2. Collision avoidance with other settled HUDs
            for (const vRect of Object.values(settled)) {
                const candidate = {
                    left: newX - halfWPct, right: newX + halfWPct,
                    top: newY - halfHPct, bottom: newY + halfHPct,
                };
                const overlapping = !(
                    candidate.right < vRect.left || candidate.left > vRect.right ||
                    candidate.bottom < vRect.top || candidate.top > vRect.bottom
                );
                if (overlapping) {
                    const downY = vRect.bottom + halfHPct + HUD_GAP;
                    if (downY <= 100 - halfHPct - EDGE_MARGIN) { newY = downY; break; }
                }
            }

            settled[id] = { left: newX - halfWPct, right: newX + halfWPct, top: newY - halfHPct, bottom: newY + halfHPct };
            if (Math.abs(newX - cx) < 0.05 && Math.abs(newY - cy) < 0.05) continue;

            const base = isMax ? state.overlapConfigMaximized : state.overlapConfig;
            const key = isMax ? 'overlapConfigMaximized' : 'overlapConfig';
            const sk = isMax ? 'overlap_config_maximized' : 'overlap_config';
            const existing = (updates as any)[key] || base;
            const posKey = id === 'overlap' ? 'current' : 'reference';
            const updated = { ...existing, [posKey]: { x: newX, y: newY } };
            localStorage.setItem(sk, JSON.stringify(updated));
            (updates as any)[key] = updated;
        }

        if (Object.keys(updates).length > 0) set(updates as any);
    },
    resetHudConfigs: () => set((state) => {
        const isMax = state.isMapMaximized;
        const overlapStorage = isMax ? 'overlap_config_maximized' : 'overlap_config';

        localStorage.setItem(overlapStorage, JSON.stringify(isMax ? DEFAULT_OVERLAP_CONFIG_MAXIMIZED : DEFAULT_OVERLAP_CONFIG));

        return {
            [isMax ? 'overlapConfigMaximized' : 'overlapConfig']: isMax ? DEFAULT_OVERLAP_CONFIG_MAXIMIZED : DEFAULT_OVERLAP_CONFIG
        };
    }),
    setHudVisibility: (key, visible) => {
        const newVisibility = { ...get().hudVisibility, [key]: visible };
        localStorage.setItem('hud_visibility', JSON.stringify(newVisibility));

        // Legacy support mapping for showTelemetryOverlay
        if (key === 'overlap') {
            set({ showTelemetryOverlay: visible });
        }

        set({ hudVisibility: newVisibility });
    },
    setIsMapMaximized: (is) => set({ isMapMaximized: is }),
    setMaximizedSidebarMode: (mode) => set({ maximizedSidebarMode: mode }),
    setIsProcessingTrack: (is: boolean) => set({ isProcessingTrack: is }),
    setShowReferenceBrowser: (show: boolean) => set({ showReferenceBrowser: show }),
    setShow3DLab: (show) => {
        const { track3DData, selectedLapIdx, selectedStint, fetch3DTrack, laps, telemetryData } = get();

        // Pause and Reset main progress
        let startIdx = null;
        if (selectedLapIdx !== null && telemetryData && telemetryData['Time']) {
            const lap = laps.find(l => l.lap === selectedLapIdx);
            if (lap) {
                const found = telemetryData['Time'].findIndex((t: number) => t >= lap.startTime);
                if (found !== -1) startIdx = found;
            }
        }

        set({
            show3DLab: show,
            isPlaying: false,
            cursorIndex: startIdx !== null ? startIdx : get().cursorIndex,
            smoothCursorIndex: startIdx !== null ? startIdx : get().cursorIndex
        });

        // Proactive load: if switching to 3D and data is missing, trigger fetch immediately
        if (show) {
            if (!track3DData && selectedLapIdx !== null) {
                set({ isLoading: true });
                fetch3DTrack(selectedLapIdx, selectedStint);
            }

            // NEW: Also check for reference track if already selected
            const { referenceLapIdx, referenceLap, fetchReference3DTrack, referenceTrack3DData } = get();
            if (!referenceTrack3DData && (referenceLapIdx !== null || referenceLap)) {
                if (referenceLapIdx !== null) {
                    fetchReference3DTrack(referenceLapIdx, null);
                } else if (referenceLap) {
                    fetchReference3DTrack(referenceLap.lap, referenceLap.stint);
                }
            }
        }
    },
    setLeftSidebarCollapsed: (collapsed) => {
        localStorage.setItem('left_sidebar_collapsed', String(collapsed));
        set({ isLeftSidebarCollapsed: collapsed });
    },
    setRightPanelCollapsed: (collapsed) => {
        localStorage.setItem('right_panel_collapsed', String(collapsed));
        set({ isRightPanelCollapsed: collapsed });
    },
    setDashboardSyncMode: (mode) => {
        localStorage.setItem('dashboard_sync_mode', mode);
        set({ dashboardSyncMode: mode });
        get().syncReferenceIndex();
    },

    setUserWheelRotation: (rotation) => {
        const { activeProfileId } = get();
        if (!activeProfileId) return;

        const key = `user_wheel_rotation_${activeProfileId}`;
        if (rotation === null) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, String(rotation));
        }
        set({ userWheelRotation: rotation });
    },

    syncReferenceIndex: () => {
        const { cursorIndex, smoothCursorIndex, telemetryData, laps, selectedLapIdx } = get();
        const mainTime = telemetryData?.['Time'];
        const lap = laps.find(l => l.lap === selectedLapIdx);
        if (!mainTime || !lap || cursorIndex === null) return;
        
        const currentIdx = smoothCursorIndex ?? cursorIndex;
        
        const mainLapChan = telemetryData['Lap'];
        let curLineS = -1;
        if (mainLapChan) {
            for (let i = 0; i < mainLapChan.length; i++) {
                if (mainLapChan[i] === selectedLapIdx) { curLineS = i; break; }
            }
        }
        if (curLineS === -1) return;
        
        const baseIdx = Math.floor(currentIdx);
        const nextIdx = Math.min(mainTime.length - 1, baseIdx + 1);
        const frac = currentIdx - baseIdx;
        const t1 = mainTime[baseIdx];
        const t2 = mainTime[nextIdx];
        if (t1 === undefined) return;
        const curAbsTime = t1 + ((t2 !== undefined) ? (t2 - t1) * frac : 0);
        const elapsed = curAbsTime - mainTime[curLineS];
        
        get().syncFromElapsed(Math.max(0, elapsed));
    },

    syncFromElapsed: (elapsed: number) => {
        const { telemetryData, referenceTelemetryData, laps, selectedLapIdx, referenceLap, referenceLapIdx } = get();
        if (!telemetryData) {
            set({ referenceCursorIndex: null, referenceDeltaIndex: null, liveDelta: null, playbackElapsed: elapsed });
            return;
        }

        const mainTime = telemetryData['Time'];
        const mainDist = telemetryData['Lap Dist'];
        const mainLapChan = telemetryData['Lap'];
        const currentLap = laps.find(l => l.lap === selectedLapIdx);

        if (!mainTime || !currentLap || !mainLapChan) {
            set({ referenceCursorIndex: null, referenceDeltaIndex: null, liveDelta: null, playbackElapsed: elapsed });
            return;
        }

        // 1. Reference Source
        const refData = referenceTelemetryData || telemetryData;
        const refTime = refData['Time'];
        const refDist = refData['Lap Dist'];
        const refLapChan = refData['Lap'];
        const refMeta = referenceLap || (referenceLapIdx !== null ? laps.find(l => l.lap === referenceLapIdx) : null);

        // 2. Find Boundaries (Start/End indices) for both laps using Lap Channel
        let curLineS = -1, curLineE = -1;
        for (let i = 0; i < mainLapChan.length; i++) {
            if (mainLapChan[i] === selectedLapIdx) { if (curLineS === -1) curLineS = i; curLineE = i; }
            else if (curLineS !== -1 && mainLapChan[i] > selectedLapIdx) break;
        }
        if (curLineS === -1) {
            set({ referenceCursorIndex: null, referenceDeltaIndex: null, liveDelta: null, playbackElapsed: elapsed });
            return;
        }
        let refLineS = -1, refLineE = -1;
        if (refMeta && refLapChan) {
            for (let i = 0; i < refLapChan.length; i++) {
                if (refLapChan[i] === refMeta.lap) { if (refLineS === -1) refLineS = i; refLineE = i; }
                else if (refLineS !== -1 && refLapChan[i] > refMeta.lap) break;
            }
        }

        const targetMainTime = mainTime[curLineS] + elapsed;
        const clampedMainTime = Math.min(targetMainTime, mainTime[curLineE]);
        const mainIdx = findIndexInChannelRange(mainTime, clampedMainTime, curLineS, curLineE);

        // Delta variables
        let refIdx = null;
        let deltaIdx = null;
        let delta = null;

        if (refLineS !== -1 && refTime && refDist) {
            const targetRefTime = refTime[refLineS] + elapsed;
            const clampedRefTime = Math.min(targetRefTime, refTime[refLineE]);
            refIdx = findIndexInChannelRange(refTime, clampedRefTime, refLineS, refLineE);

            // DISTANCE SYNC (For Delta Calculation)
            // We use the clampedMainTime to find the distance
            const baseM = Math.floor(mainIdx);
            const nextM = Math.min(curLineE, baseM + 1);
            const fracM = mainIdx - baseM;
            const d1 = mainDist[baseM] ?? 0;
            const d2 = mainDist[nextM] ?? d1;
            const currentTotalDist = d1 + (d2 - d1) * fracM;
            const relDist = currentTotalDist - (mainDist[curLineS] ?? 0);

            const targetRefDist = refDist[refLineS] + relDist;
            deltaIdx = findIndexInChannelRange(refDist, targetRefDist, refLineS, refLineE);

            const baseD = Math.floor(deltaIdx);
            const nextD = Math.min(refLineE, baseD + 1);
            const fracD = deltaIdx - baseD;

            const rt1 = refTime[baseD], rt2 = refTime[nextD];
            if (rt1 !== undefined && rt2 !== undefined) {
                const refAbsTimeAtSameDist = rt1 + fracD * (rt2 - rt1);
                const refElapsedD = refAbsTimeAtSameDist - refTime[refLineS];
                const mainElapsedAtD = clampedMainTime - mainTime[curLineS];
                delta = mainElapsedAtD - refElapsedD;
            }
        }

        set({
            smoothCursorIndex: mainIdx,
            cursorIndex: Math.floor(mainIdx),
            referenceCursorIndex: refIdx,
            referenceDeltaIndex: deltaIdx,
            liveDelta: delta,
            playbackElapsed: elapsed
        });
    },

    setChartConfigs: (configs) => {
        localStorage.setItem('chart_configs', JSON.stringify(configs));
        set({ chartConfigs: configs });
    },

    updateChartConfig: (id, updates) => {
        const { chartConfigs } = get();
        const newConfigs = chartConfigs.map(c => c.id === id ? { ...c, ...updates } : c);
        localStorage.setItem('chart_configs', JSON.stringify(newConfigs));
        set({ chartConfigs: newConfigs });
    },

    saveChartPreset: (name) => {
        const { chartConfigs, chartPresets } = get();
        const userPresets = chartPresets.filter(p => !p.isBuiltIn);
        const newPreset: ChartPreset = { id: `user_${Date.now()}`, name, configs: [...chartConfigs] };
        const updated = [...userPresets, newPreset];
        localStorage.setItem('chart_presets', JSON.stringify(updated));
        set({ chartPresets: [...BUILT_IN_PRESETS, ...updated] });
    },

    loadChartPreset: (id) => {
        const { chartPresets } = get();
        const preset = chartPresets.find(p => p.id === id);
        if (!preset) return;
        localStorage.setItem('chart_configs', JSON.stringify(preset.configs));
        set({ chartConfigs: preset.configs });
    },

    deleteChartPreset: (id) => {
        const { chartPresets } = get();
        const updated = chartPresets.filter(p => !p.isBuiltIn && p.id !== id);
        localStorage.setItem('chart_presets', JSON.stringify(updated));
        set({ chartPresets: [...BUILT_IN_PRESETS, ...updated] });
    },

    resetChartColors: () => {
        const { chartConfigs } = get();
        const newConfigs = chartConfigs.map(c => {
            const defaultVer = DEFAULT_CHARTS.find(dc => dc.id === c.id);
            return defaultVer ? { ...c, color: defaultVer.color } : c;
        });
        localStorage.setItem('chart_configs', JSON.stringify(newConfigs));
        set({ chartConfigs: newConfigs });
    },

    resetChartConfigs: () => {
        localStorage.setItem('chart_configs', JSON.stringify(DEFAULT_CHARTS));
        set({ chartConfigs: DEFAULT_CHARTS });
    },

    fetchSessions: async () => {
        const { activeProfileId } = get();
        if (!activeProfileId) return;

        set({ isListLoading: true, error: null });
        try {
            const data = await apiClient.getSessions(activeProfileId);
            set({ sessions: data.sessions, isListLoading: false });
        } catch (err) {
            set({ error: (err as Error).message, isListLoading: false });
        }
    },

    // Eager Loading Logic
    selectSession: async (sessionId: string) => {
        const { activeProfileId } = get();
        if (!activeProfileId) return;

        set(state => ({
            isLoading: true,
            loadingCount: state.loadingCount + 1,
            loadingProgress: null,
            error: null,
            isPlaying: false, // PAUSE ON SESSION SWITCH
            currentSessionId: sessionId,
            sessionMetadata: null,
            referenceSessionMetadata: null,
            laps: [],
            telemetryData: null,
            selectedStint: null,
            selectedLapIdx: null,
            referenceLapIdx: null,
            referenceLap: null,
            referenceTelemetryData: null,
            playbackElapsed: 0,
            zoomRange: null,
            staticTrackBaseData: null
        }));
        try {
            // 1. Get Laps & Metadata
            const data = await apiClient.getLaps(sessionId, activeProfileId);

            // 2. Determine default lap
            const defaultLap = data.laps.find(l => l.lap === 1) || data.laps.find(l => l.isValid) || data.laps[0];
            const defaultLapIdx = defaultLap ? defaultLap.lap : null;
            const defaultStint = defaultLap?.stint ?? 1;

            set({ laps: data.laps, sessionMetadata: data.metadata });

            // 3. Eager load Telemetry for the first stint at 10Hz
            const telData = await apiClient.getTelemetry(sessionId, defaultStint, 10, undefined, activeProfileId);

            // 4. Find start index for the default lap
            let startIdx = null;
            if (defaultLap && telData && telData['Time']) {
                const found = telData['Time'].findIndex((t: number) => t >= defaultLap.startTime);
                if (found !== -1) startIdx = found;
            }

            set({
                telemetryData: telData,
                selectedLapIdx: defaultLapIdx,
                selectedStint: defaultStint,
                referenceLapIdx: null,
                cursorIndex: startIdx,
                smoothCursorIndex: startIdx,
            });

            // 5. Fetch Reference 3D Track (Fastest Valid Lap)
            const validLaps = data.laps.filter((l: Lap) => l.isValid);
            const fastestLap = validLaps.length > 0
                ? [...validLaps].sort((a, b) => a.duration - b.duration)[0]
                : data.laps[0];

            if (fastestLap) {
                try {
                    const baseData = await (apiClient as any).get3DTrack(sessionId, fastestLap.lap, activeProfileId);
                    set({ staticTrackBaseData: baseData });
                } catch (e) {
                    console.error("Failed to fetch static track base:", e);
                }
            }
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set(state => {
                const newCount = Math.max(0, state.loadingCount - 1);
                return {
                    loadingCount: newCount,
                    isLoading: newCount > 0,
                    loadingProgress: newCount === 0 ? null : state.loadingProgress
                };
            });
        }
    },

    fetchStint: async (stintId: number) => {
        const { currentSessionId, selectedStint, isLoading, activeProfileId } = get();
        if (!currentSessionId || selectedStint === stintId || isLoading || !activeProfileId) return;

        set(state => ({
            isLoading: true,
            loadingCount: state.loadingCount + 1,
            error: null,
            telemetryData: null, // Clear old data to prevent stale rendering
            selectedLapIdx: null,
            referenceLapIdx: null,
            referenceLap: null,
            referenceSessionMetadata: null,
            referenceTelemetryData: null,
            cursorIndex: null,
            smoothCursorIndex: null,
            zoomRange: null
        }));

        try {
            const telData = await apiClient.getTelemetry(currentSessionId, stintId, 10, undefined, activeProfileId);

            // Find best default lap in this new stint
            const { laps, isPlaying: wasPlaying } = get();
            const stintLaps = laps.filter(l => l.stint === stintId);
            const defaultLap = stintLaps.find(l => l.isValid) || stintLaps[0];

            let startIdx = null;
            if (defaultLap && telData && telData['Time']) {
                const found = telData['Time'].findIndex((t: number) => t >= defaultLap.startTime);
                if (found !== -1) startIdx = found;
            }

            // If playing, toggle it to reset animation frame timers in App.tsx
            if (wasPlaying) set({ isPlaying: false });

            set({
                telemetryData: telData,
                selectedStint: stintId,
                selectedLapIdx: defaultLap ? defaultLap.lap : null,
                cursorIndex: startIdx,
                smoothCursorIndex: startIdx,
            });

            // 3D SYNC: If in 3D mode, fetch new stint track data before finishing load
            const currentSelectedLap = defaultLap ? defaultLap.lap : null;
            if (get().show3DLab && currentSelectedLap !== null) {
                await get().fetch3DTrack(currentSelectedLap, stintId);
            }

            if (wasPlaying) set({ isPlaying: true });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set(state => {
                const newCount = Math.max(0, state.loadingCount - 1);
                return {
                    loadingCount: newCount,
                    isLoading: newCount > 0
                };
            });
        }
    },

    selectLap: async (lapIdx: number | null) => {
        const { telemetryData, laps, isPlaying: wasPlaying, show3DLab, selectedStint, fetch3DTrack } = get();
        let startIdx = null;
        if (lapIdx !== null && telemetryData && telemetryData['Time']) {
            const lap = laps.find(l => l.lap === lapIdx);
            if (lap) {
                const found = telemetryData['Time'].findIndex((t: number) => t >= lap.startTime);
                if (found !== -1) startIdx = found;
            }
        }

        // Ensure playback is PAUSED on lap switch
        set({
            isPlaying: false,
            selectedLapIdx: lapIdx,
            zoomRange: null,
            cursorIndex: startIdx,
            smoothCursorIndex: startIdx,
            playbackElapsed: 0
        });

        // 3D SYNC: If in 3D mode, we must fetch new track data AND wait for it
        if (show3DLab && lapIdx !== null) {
            // selectLap doesn't increment loadingCount itself as it defers to fetch3DTrack
            await fetch3DTrack(lapIdx, selectedStint);
        }

        get().syncReferenceIndex();
    },

    setReferenceLap: (lapIdx: number | null) => {
        const { laps, selectedLapIdx, telemetryData } = get();

        // Pause and reset main progress
        let startIdx = null;
        if (selectedLapIdx !== null && telemetryData && telemetryData['Time']) {
            const lap = laps.find(l => l.lap === selectedLapIdx);
            if (lap) {
                const found = telemetryData['Time'].findIndex((t: number) => t >= lap.startTime);
                if (found !== -1) startIdx = found;
            }
        }

        set({
            referenceLapIdx: lapIdx,
            referenceTelemetryData: null,
            referenceLap: null,
            referenceSessionMetadata: null,
            isPlaying: false,
            cursorIndex: startIdx !== null ? startIdx : get().cursorIndex,
            smoothCursorIndex: startIdx !== null ? startIdx : get().cursorIndex,
            playbackElapsed: 0
        });
    },

    selectReferenceLap: async (lap) => {
        const { currentSessionId, selectedStint, activeProfileId, laps, selectedLapIdx, telemetryData } = get();

        // Pause and reset main progress
        let startIdx = null;
        if (selectedLapIdx !== null && telemetryData && telemetryData['Time']) {
            const currentLap = laps.find(l => l.lap === selectedLapIdx);
            if (currentLap) {
                const found = telemetryData['Time'].findIndex((t: number) => t >= currentLap.startTime);
                if (found !== -1) startIdx = found;
            }
        }

        if (!lap) {
            set({
                referenceLap: null,
                referenceTelemetryData: null,
                referenceLapIdx: null,
                referenceSessionMetadata: null,
                isPlaying: false,
                cursorIndex: startIdx !== null ? startIdx : get().cursorIndex,
                smoothCursorIndex: startIdx !== null ? startIdx : get().cursorIndex
            });
            return;
        }

        // if it's the same session and same stint, just treat as internal ref
        if (lap.sessionId === currentSessionId && lap.stint === selectedStint) {
            set({
                referenceLapIdx: lap.lap,
                referenceLap: null,
                referenceTelemetryData: null,
                referenceSessionMetadata: null,
                isPlaying: false,
                cursorIndex: startIdx !== null ? startIdx : get().cursorIndex,
                smoothCursorIndex: startIdx !== null ? startIdx : get().cursorIndex
            });
            return;
        }

        // Otherwise, fetch separate telemetry & metadata
        set(state => ({
            isLoading: true,
            loadingCount: state.loadingCount + 1,
            referenceLapIdx: null,
            referenceLap: lap,
            referenceSessionMetadata: null,
            isPlaying: false,
            cursorIndex: startIdx !== null ? startIdx : get().cursorIndex,
            smoothCursorIndex: startIdx !== null ? startIdx : get().cursorIndex,
            playbackElapsed: 0
        }));
        try {
            const [data, sessionData] = await Promise.all([
                apiClient.getTelemetry(lap.sessionId, lap.stint, 10, undefined, activeProfileId || "guest"),
                apiClient.getLaps(lap.sessionId, activeProfileId || "guest")
            ]);

            set({ referenceTelemetryData: data, referenceSessionMetadata: sessionData.metadata });

            // 3D SYNC: Fetch reference 3D track if in lab mode
            if (get().show3DLab) {
                await get().fetchReference3DTrack(lap.lap, lap.stint);
            }
        } catch (err) {
            set({ error: `Failed to load reference lap: ${(err as Error).message}` });
        } finally {
            set(state => {
                const newCount = Math.max(0, state.loadingCount - 1);
                return { loadingCount: newCount, isLoading: newCount > 0 };
            });
        }
    },

    fetchReferenceTelemetry: async (lap) => {
        const { activeProfileId } = get();
        try {
            const [data, sessionData] = await Promise.all([
                apiClient.getTelemetry(lap.sessionId, lap.stint, 10, undefined, activeProfileId || "guest"),
                apiClient.getLaps(lap.sessionId, activeProfileId || "guest")
            ]);
            set({ referenceTelemetryData: data, referenceSessionMetadata: sessionData.metadata, referenceLap: lap, referenceLapIdx: null });
        } catch (err) {
            set({ error: `Failed to load reference: ${(err as Error).message}` });
        }
    },

    setCursorIndex: (idx: number | null) => {
        set({ cursorIndex: idx, smoothCursorIndex: idx });
        get().syncReferenceIndex();
    },
    setZoomRange: (range: [number, number] | null) => {
        set({ zoomRange: range });
    },

    fetch3DTrack: async (lapIdx: number, stintId?: number | null) => {
        const { currentSessionId, activeProfileId } = get();
        if (!currentSessionId || !activeProfileId) return;

        // Clear previous track data to avoid visual ghosting during loading
        set(state => ({ track3DData: null, isLoading: true, loadingCount: state.loadingCount + 1, error: null }));
        try {
            const result = await (apiClient as any).get3DTrack(currentSessionId, lapIdx, activeProfileId, stintId);
            set({ track3DData: result }); // Directly store the result object
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set(state => {
                const newCount = Math.max(0, state.loadingCount - 1);
                return { loadingCount: newCount, isLoading: newCount > 0 };
            });
        }
    },

    fetchReference3DTrack: async (lapIdx: number, stintId?: number | null) => {
        const { currentSessionId, activeProfileId, referenceLap } = get();

        // If it's a cross-session reference, we need the reference session id
        const targetSessionId = referenceLap ? referenceLap.sessionId : currentSessionId;
        if (!targetSessionId || !activeProfileId) return;

        set(state => ({ referenceTrack3DData: null, isLoading: true, loadingCount: state.loadingCount + 1 }));
        try {
            const result = await (apiClient as any).get3DTrack(targetSessionId, lapIdx, activeProfileId, stintId);
            set({ referenceTrack3DData: result });
        } catch (err) {
            set({ error: (err as Error).message });
        } finally {
            set(state => {
                const newCount = Math.max(0, state.loadingCount - 1);
                return { loadingCount: newCount, isLoading: newCount > 0 };
            });
        }
    },

    clearSession: () => {
        set({
            currentSessionId: null,
            sessionMetadata: null,
            laps: [],
            selectedLapIdx: null,
            referenceLapIdx: null,
            referenceLap: null,
            referenceSessionMetadata: null,
            referenceTelemetryData: null,
            telemetryData: null,
            track3DData: null,
            referenceTrack3DData: null,
            staticTrackBaseData: null,
            cursorIndex: null,
            zoomRange: null
        });
    },

    uploadSession: async (file: File) => {
        const { activeProfileId } = get();
        if (!activeProfileId) return;

        set({ isListLoading: true, error: null });
        try {
            await apiClient.uploadSession(file, activeProfileId);
            await get().fetchSessions(); // Refresh list
            set({ isListLoading: false });
        } catch (err) {
            set({ error: (err as Error).message, isListLoading: false });
        }
    },

    renameSession: async (sessionId: string, newName: string) => {
        const { activeProfileId } = get();
        if (!activeProfileId) return;

        set({ isListLoading: true, error: null });
        try {
            await apiClient.renameSession(sessionId, newName, activeProfileId);
            await get().fetchSessions(); // Refresh list

            set({
                currentSessionId: null,
                laps: [],
                telemetryData: null,
                sessionMetadata: null,
                referenceLap: null,
                referenceLapIdx: null,
                referenceSessionMetadata: null,
                referenceTelemetryData: null
            });
            set({ isListLoading: false });
        } catch (err) {
            set({ error: (err as Error).message, isListLoading: false });
        }
    },

    deleteSession: async (sessionId: string) => {
        const { activeProfileId } = get();
        if (!activeProfileId) return;

        set({ isListLoading: true, error: null });
        try {
            await apiClient.deleteSession(sessionId, activeProfileId);
            await get().fetchSessions(); // Refresh list

            const state = get();
            if (state.currentSessionId === sessionId) {
                set({
                    currentSessionId: null,
                    laps: [],
                    telemetryData: null,
                    sessionMetadata: null,
                    referenceLap: null,
                    referenceLapIdx: null,
                    referenceSessionMetadata: null,
                    referenceTelemetryData: null
                });
            }
            set({ isListLoading: false });
        } catch (err) {
            set({ error: (err as Error).message, isListLoading: false });
        }
    },

    // --- Profile Actions ---
    fetchProfiles: async () => {
        try {
            const data = await apiClient.getProfiles();
            set({ profiles: data.profiles });

            // Auto-select first profile if none selected
            if (!get().activeProfileId && data.profiles.length > 0) {
                const defaultProfile = data.profiles.find(p => p.is_default) || data.profiles[0];
                const savedRotation = localStorage.getItem(`user_wheel_rotation_${defaultProfile.id}`);
                set({
                    activeProfileId: defaultProfile.id,
                    userWheelRotation: savedRotation ? parseFloat(savedRotation) : null
                });
            }
        } catch (err) {
            set({ error: (err as Error).message });
        }
    },

    setProfile: async (profileId: string) => {
        set({
            activeProfileId: profileId,
            currentSessionId: null,
            sessionMetadata: null,
            laps: [],
            selectedLapIdx: null,
            referenceLapIdx: null,
            referenceLap: null,
            referenceTelemetryData: null,
            telemetryData: null,
            cursorIndex: null,
            zoomRange: null,
            userWheelRotation: localStorage.getItem(`user_wheel_rotation_${profileId}`) ? parseFloat(localStorage.getItem(`user_wheel_rotation_${profileId}`)!) : null
        });
        await get().fetchSessions();
    },

    createProfile: async (name: string) => {
        try {
            const profile = await apiClient.createProfile(name);
            set(state => ({ profiles: [...state.profiles, profile] }));
            await get().setProfile(profile.id);
        } catch (err) {
            set({ error: (err as Error).message });
        }
    },

    updateProfile: async (profileId: string, name: string) => {
        try {
            await apiClient.updateProfile(profileId, name);
            set(state => ({
                profiles: state.profiles.map(p =>
                    p.id === profileId ? { ...p, name } : p
                )
            }));
        } catch (err) {
            set({ error: (err as Error).message });
        }
    },

    deleteProfile: async (profileId: string) => {
        const { activeProfileId, profiles } = get();
        try {
            await apiClient.deleteProfile(profileId);
            const newProfiles = profiles.filter(p => p.id !== profileId);
            set({ profiles: newProfiles });

            // If we deleted the active profile, switch to the first available or guest
            if (activeProfileId === profileId) {
                const fallback = newProfiles[0]?.id || 'guest';
                await get().setProfile(fallback);
            }
        } catch (err) {
            set({ error: (err as Error).message });
        }
    },

    uploadAvatar: async (profileId: string, file: File) => {
        try {
            const avatarUrl = await apiClient.uploadAvatar(profileId, file);
            set(state => ({
                profiles: state.profiles.map(p =>
                    p.id === profileId ? { ...p, avatar_url: avatarUrl } : p
                )
            }));
        } catch (err) {
            set({ error: (err as Error).message });
        }
    },

    togglePlayback: () => {
        const { isPlaying, cursorIndex, telemetryData, laps, selectedLapIdx } = get();

        // RECOVERY: If we're about to play but cursor is missing (common with race conditions)
        if (!isPlaying && telemetryData && selectedLapIdx !== null && cursorIndex === null) {
            const time = telemetryData['Time'];
            const currentLap = laps.find(l => l.lap === selectedLapIdx);
            if (time && currentLap) {
                const startIdx = time.findIndex(t => t >= currentLap.startTime);
                if (startIdx !== -1) {
                    set({ cursorIndex: startIdx, smoothCursorIndex: startIdx });
                }
            }
        }

        // Standard Reset logic if at end
        if (!isPlaying && telemetryData && selectedLapIdx !== null) {
            const currentLap = laps.find(l => l.lap === selectedLapIdx);
            const refMeta = get().referenceLap || (get().referenceLapIdx !== null ? laps.find(l => l.lap === get().referenceLapIdx) : null);
            const curDur = currentLap?.duration || 0;
            const hasRefData = get().referenceTelemetryData || (telemetryData && get().referenceLapIdx !== null);
            const refDur = hasRefData && refMeta ? (refMeta.duration || 0) : 0;
            const maxDur = Math.max(curDur, refDur);
            
            if (get().playbackElapsed >= maxDur - 0.1) {
                set({ playbackElapsed: 0 });
                get().syncFromElapsed(0);
                // Slight delay to ensure state propagates before playing
                setTimeout(() => set({ isPlaying: true }), 10);
                return;
            }
        }
        set(state => ({ isPlaying: !state.isPlaying }));
    },

    setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),

    updatePlayback: (deltaTimeMs: number) => {
        const { playbackElapsed, playbackSpeed, isPlaying, laps, selectedLapIdx, referenceLap, referenceLapIdx, telemetryData, referenceTelemetryData } = get();
        if (!isPlaying || !telemetryData || selectedLapIdx === null) return;

        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        const refMeta = referenceLap || (referenceLapIdx !== null ? laps.find(l => l.lap === referenceLapIdx) : null);
        
        const curDur = currentLap?.duration || 0;
        const hasRefData = referenceTelemetryData || (telemetryData && referenceLapIdx !== null);
        const refDur = hasRefData && refMeta ? (refMeta.duration || 0) : 0;
        
        const maxDur = Math.max(curDur, refDur);

        let newElapsed = playbackElapsed + (deltaTimeMs / 1000 * playbackSpeed);

        if (newElapsed >= maxDur) {
            newElapsed = maxDur;
            set({ isPlaying: false, playbackElapsed: newElapsed });
        } else {
            set({ playbackElapsed: newElapsed });
        }

        get().syncFromElapsed(newElapsed);
    },

    setPlaybackProgress: (progress: number) => {
        const { laps, selectedLapIdx, referenceLap, referenceLapIdx, telemetryData, referenceTelemetryData } = get();
        if (!telemetryData || selectedLapIdx === null) return;

        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        const refMeta = referenceLap || (referenceLapIdx !== null ? laps.find(l => l.lap === referenceLapIdx) : null);
        
        const curDur = currentLap?.duration || 0;
        const hasRefData = referenceTelemetryData || (telemetryData && referenceLapIdx !== null);
        const refDur = hasRefData && refMeta ? (refMeta.duration || 0) : 0;
        
        const maxDur = Math.max(curDur, refDur);
        const targetElapsed = progress * maxDur;
        
        set({ playbackElapsed: targetElapsed });
        get().syncFromElapsed(targetElapsed);
    },
    setPlaybackTime: (time: number) => {
        set({ playbackElapsed: time });
        get().syncFromElapsed(time);
    }
}));
