
import { create } from 'zustand';
import type { Session, Lap, TelemetryData, SessionMetadata, Profile, ChartConfig } from '../types';
import { apiClient } from '../api/client';

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
    editOverlapMode: boolean;
    overlapConfig: {
        current: { x: number; y: number };
        reference: { x: number; y: number };
        scale: number;
    };
    isMapMaximized: boolean; // NEW

    // Actions
    setSpeedUnit: (unit: 'kmh' | 'mph') => void;
    setTempUnit: (unit: 'c' | 'f') => void;
    setShowSettings: (show: boolean) => void;
    setCameraMode: (mode: 'static' | 'follow' | 'heading-up') => void;
    setFollowZoom: (zoom: number) => void;
    setShow3DLab: (show: boolean) => void; // NEW
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
    setEditOverlapMode: (is: boolean) => void;
    updateOverlapConfig: (config: Partial<TelemetryState['overlapConfig']>) => void;
    resetOverlapConfig: () => void;
    setIsMapMaximized: (is: boolean) => void;

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
    uploadAvatar: (profileId: string, file: File) => Promise<void>;
    syncReferenceIndex: () => void;
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


const DEFAULT_OVERLAP_CONFIG = {
    current: { x: 15, y: 70 },
    reference: { x: 85, y: 70 },
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
    editOverlapMode: false,
    isMapMaximized: false,
    overlapConfig: JSON.parse(localStorage.getItem('overlap_config') || JSON.stringify(DEFAULT_OVERLAP_CONFIG)),

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
    setEditOverlapMode: (is) => set({ editOverlapMode: is }),
    updateOverlapConfig: (config) => {
        const current = get().overlapConfig;
        const newConfig = { ...current, ...config };
        localStorage.setItem('overlap_config', JSON.stringify(newConfig));
        set({ overlapConfig: newConfig });
    },
    resetOverlapConfig: () => {
        localStorage.setItem('overlap_config', JSON.stringify(DEFAULT_OVERLAP_CONFIG));
        set({ overlapConfig: DEFAULT_OVERLAP_CONFIG });
    },
    setIsMapMaximized: (is) => set({ isMapMaximized: is }),
    setIsProcessingTrack: (is: boolean) => set({ isProcessingTrack: is }),
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
        const { cursorIndex, smoothCursorIndex, isPlaying, telemetryData, referenceTelemetryData, laps, selectedLapIdx, referenceLap, referenceLapIdx } = get();
        const currentIdx = isPlaying ? (smoothCursorIndex ?? cursorIndex) : cursorIndex;
        if (currentIdx === null || !telemetryData) {
            set({ referenceCursorIndex: null, referenceDeltaIndex: null, liveDelta: null });
            return;
        }

        const mainTime = telemetryData['Time'];
        const mainDist = telemetryData['Lap Dist'];
        const mainLapChan = telemetryData['Lap'];
        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        if (!mainTime || !currentLap || !mainLapChan) {
            set({ referenceCursorIndex: null, referenceDeltaIndex: null, liveDelta: null });
            return;
        }

        // 1. Reference Source
        const refData = referenceTelemetryData || telemetryData;
        const refTime = refData['Time'];
        const refDist = refData['Lap Dist'];
        const refLapChan = refData['Lap'];
        const refMeta = referenceLap || (referenceLapIdx !== null ? laps.find(l => l.lap === referenceLapIdx) : null);

        if (!refTime || !refDist || !refLapChan || !refMeta) {
            set({ referenceCursorIndex: null, referenceDeltaIndex: null, liveDelta: null });
            return;
        }

        // 2. Find Boundaries (Start/End indices) for both laps using Lap Channel
        let curLineS = -1, curLineE = -1;
        for (let i = 0; i < mainLapChan.length; i++) {
            if (mainLapChan[i] === selectedLapIdx) { if (curLineS === -1) curLineS = i; curLineE = i; }
            else if (curLineS !== -1 && mainLapChan[i] > selectedLapIdx) break;
        }
        let refLineS = -1, refLineE = -1;
        for (let i = 0; i < refLapChan.length; i++) {
            if (refLapChan[i] === refMeta.lap) { if (refLineS === -1) refLineS = i; refLineE = i; }
            else if (refLineS !== -1 && refLapChan[i] > refMeta.lap) break;
        }

        if (curLineS === -1 || refLineS === -1) {
            set({ referenceCursorIndex: null, referenceDeltaIndex: null, liveDelta: null });
            return;
        }

        const findIndexInChannelRange = (channel: number[], target: number, s: number, e: number) => {
            let low = s, high = e;
            while (low <= high) {
                const mid = (low + high) >>> 1;
                if (channel[mid] < target) low = mid + 1;
                else high = mid - 1;
            }
            const idxA = Math.max(s, Math.min(e, low - 1));
            const idxB = Math.max(s, Math.min(e, low));
            if (idxA === idxB) return idxA;
            const vA = channel[idxA], vB = channel[idxB];
            const span = vB - vA;
            return idxA + (span > 0 ? (target - vA) / span : 0);
        };

        const baseIdx = Math.floor(currentIdx);
        const nextIdx = Math.min(mainTime.length - 1, baseIdx + 1);
        const frac = currentIdx - baseIdx;

        // TIME SYNC (For Ghost Car Position & Telemetry Values)
        const t1 = mainTime[baseIdx];
        const t2 = mainTime[nextIdx];
        const curAbsTime = t1 + (t2 - t1) * frac;
        const mainElapsed = curAbsTime - mainTime[curLineS];

        const targetRefTime = refTime[refLineS] + mainElapsed;
        const finalTimeIdx = findIndexInChannelRange(refTime, targetRefTime, refLineS, refLineE);

        // DISTANCE SYNC (For Delta Calculation)
        const d1 = mainDist[baseIdx] || 0;
        const d2 = mainDist[nextIdx] || 0;
        const currentTotalDist = d1 + (d2 - d1) * frac;
        const relDist = currentTotalDist - mainDist[curLineS];

        const targetRefDist = refDist[refLineS] + relDist;
        const finalDeltaIdx = findIndexInChannelRange(refDist, targetRefDist, refLineS, refLineE);

        // Calculate Standardized Delta (Mirroring TelemetryChart.tsx interp logic)
        const baseD = Math.floor(finalDeltaIdx);
        const nextD = Math.min(refLineE, baseD + 1);
        const fracD = finalDeltaIdx - baseD;

        const rt1 = refTime[baseD], rt2 = refTime[nextD];
        const refAbsTimeAtSameDist = rt1 + fracD * (rt2 - rt1);
        const refElapsed = refAbsTimeAtSameDist - refTime[refLineS];

        const delta = mainElapsed - refElapsed;

        set({
            referenceCursorIndex: finalTimeIdx,
            referenceDeltaIndex: finalDeltaIdx,
            liveDelta: delta
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
            smoothCursorIndex: startIdx
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
            smoothCursorIndex: startIdx !== null ? startIdx : get().cursorIndex
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
            smoothCursorIndex: startIdx !== null ? startIdx : get().cursorIndex
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
        if (!isPlaying && telemetryData && cursorIndex !== null && selectedLapIdx !== null) {
            const time = telemetryData['Time'];
            const currentLap = laps.find(l => l.lap === selectedLapIdx);
            if (time && currentLap && time[cursorIndex] >= currentLap.endTime - 0.1) {
                // If at end, reset to start
                const startIdx = time.findIndex(t => t >= currentLap.startTime);
                if (startIdx !== -1) {
                    set({ cursorIndex: startIdx, smoothCursorIndex: startIdx });
                }
            }
        }
        set(state => ({ isPlaying: !state.isPlaying }));
    },

    setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),

    updatePlayback: (deltaTimeMs: number) => {
        const { cursorIndex, smoothCursorIndex, telemetryData, playbackSpeed, isPlaying, laps, selectedLapIdx } = get();
        if (!isPlaying || !telemetryData || cursorIndex === null) return;

        const time = telemetryData['Time'];
        if (!time) return;

        // Current lap boundary (if any)
        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        const endTime = currentLap?.endTime ?? Infinity;

        // Advance smooth index
        let currentSmooth = (smoothCursorIndex ?? cursorIndex) as number;

        // RECOVERY: If currentSmooth is STILL null even after togglePlayback, try one more time
        if (currentSmooth === null && telemetryData && selectedLapIdx !== null) {
            const currentLap = laps.find(l => l.lap === selectedLapIdx);
            if (currentLap) {
                const found = time.findIndex(t => t >= currentLap.startTime);
                if (found !== -1) {
                    currentSmooth = found;
                }
            }
        }

        if (currentSmooth === null) return; // Still failed to recover

        // CRITICAL: Safety check for data transition. 
        if (currentSmooth < 0 || currentSmooth >= time.length - 1) {
            currentSmooth = 0;
        }

        // Find current frequency (avg delta T in playback area)
        const idx = Math.floor(currentSmooth);
        const nextIdx = Math.min(time.length - 1, idx + 1);
        const dt = Math.max(0.001, time[nextIdx] - time[idx]); // seconds per index

        const frameStep = (deltaTimeMs / 1000 * playbackSpeed) / dt;
        const newSmooth = currentSmooth + frameStep;

        set({
            smoothCursorIndex: newSmooth,
            cursorIndex: Math.floor(newSmooth)
        });

        get().syncReferenceIndex();

        const isEndOfData = newSmooth >= time.length - 1;
        const isEndOfLap = time[Math.floor(newSmooth)] >= endTime;

        if (isEndOfData || isEndOfLap) {
            const finalIdx = isEndOfData ? time.length - 1 : time.findIndex(t => t > endTime) - 1;
            const cappedIdx = Math.max(0, finalIdx === -2 ? time.length - 1 : finalIdx);

            set({
                cursorIndex: cappedIdx,
                smoothCursorIndex: cappedIdx,
                isPlaying: false
            });
        } else {
            set({
                smoothCursorIndex: newSmooth,
                cursorIndex: Math.floor(newSmooth)
            });
        }
    },

    setPlaybackProgress: (progress: number) => {
        const { telemetryData, laps, selectedLapIdx } = get();
        if (!telemetryData || !laps || selectedLapIdx === null) return;

        const time = telemetryData['Time'];
        if (!time) return;

        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        if (!currentLap) return;

        // Find start/end indices for this lap
        const sIdx = time.findIndex(t => t >= currentLap.startTime);
        const eIdx = time.findIndex(t => t > currentLap.endTime) - 1;
        const validEIdx = eIdx < 0 ? time.length - 1 : eIdx;

        const targetIdx = Math.round(sIdx + (validEIdx - sIdx) * progress);
        const cappedIdx = Math.max(0, Math.min(time.length - 1, targetIdx));

        set({
            cursorIndex: cappedIdx,
            smoothCursorIndex: cappedIdx
        });
    }
}));
