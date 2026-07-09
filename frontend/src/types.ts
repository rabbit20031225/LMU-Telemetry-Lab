
export interface Session {
    id: string;
    path: string;
    size: number;
    created: number; // Unix timestamp
    trackName?: string;
    trackLayout?: string;
    layoutKey?: string;
    commonTrackName?: string;
    displayName?: string;
    trackAliases?: string[];
    carModel?: string;
    carClass?: string;
    rawCarName?: string;
    country?: string;
    officialTrackLength?: number;
    driverName?: string;
    bestLapTime?: number;
    bestLapValid?: boolean;
}

export interface SessionMetadata {
    trackName: string;
    trackLayout: string;
    layoutKey?: string;
    carClass: string;
    modelName: string;   // Real Name (e.g. McLaren 720S...)
    rawCarName: string;  // Raw ID (e.g. United Autosports...)
    driverName: string;
    sessionTime?: string; // e.g. "12:00:26"
    sessionDuration?: number; // Total length in seconds
    sessionType?: string;
    weather?: string;
    trackSectors?: { lat: number; lon: number; id: number; }[]; // Derived from fastest lap
    fuelCapacity?: number;
    tyreCompoundMax?: number;
    steeringLock?: number;
    steeringLockString?: string;
    frequency?: number;
    carModel?: string;
    country?: string;
    officialTrackLength?: number;
}

export interface Lap {
    lap: number;
    startTime: number;
    endTime: number;
    duration: number;
    isValid: boolean;
    isOutLap: boolean;
    // Optional metrics
    s1?: number;
    s2?: number;
    s3?: number;
    stint?: number;
    inPit?: boolean;
    fuelUsed?: number;
}

export interface TelemetryData {
    [key: string]: number[] | any; // Support multi-dim arrays like number[][]
}

export interface TelemetryResponse {
    [key: string]: number[] | any;
}

export interface Profile {
    id: string;
    name: string;
    created_at: string;
    last_used: string;
    is_default: boolean;
    session_count?: number;
    avatar_url?: string | null;
}
export interface ChartConfig {
    id: string;        // The telemetry channel name
    alias?: string;    // Display name
    color: string;     // Hex color
    visible: boolean;
    order: number;
    height: number;
    unit?: string;
    wheelIndex?: number; // 0:FL, 1:FR, 2:RL, 3:RR
}
export interface ReferenceLap {
    sessionId: string;
    sessionName: string;
    date: number;
    lap: number;
    stint: number;
    startTime: number;
    duration: number;
    isValid: boolean;
    s1?: number;
    s2?: number;
    s3?: number;
    driver: string;
    sessionTime: string;
    carModel?: string;
    rawCarName?: string;
    stintCount?: number;
    totalLaps?: number;
    fuelUsed?: number;
}

// ---- Car Setup ----
export interface SetupLREntry { L: string | null; R: string | null; }
export interface SetupLR3Entry { L: string | null; '3rd': string | null; R: string | null; }

export interface CarSetupData {
    powertrain: {
        engine: Record<string, string | null>;
        electronics: Record<string, string | null>;
        differential: Record<string, string | null>;
        gearing: Record<string, string | null>;
    };
    wheelsAndBrakes: {
        frontWheels: Record<string, SetupLREntry>;
        rearWheels: Record<string, SetupLREntry>;
        brakes: Record<string, string | null>;
    };
    suspension: {
        front: Record<string, SetupLR3Entry>;
        rear: Record<string, SetupLR3Entry>;
    };
    dampers: {
        front: Record<string, SetupLR3Entry>;
        rear: Record<string, SetupLR3Entry>;
    };
    chassisAndAero: {
        frontChassis: Record<string, string | null>;
        rearChassis: Record<string, string | null>;
        weight: Record<string, string | null>;
        advancedChassis: Record<string, string | null>;
    };
}
