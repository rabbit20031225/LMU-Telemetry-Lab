
export interface Session {
    id: string;
    path: string;
    size: number;
    created: number; // Unix timestamp
    trackName?: string;
    trackLayout?: string;
    commonTrackName?: string;
    trackAliases?: string[];
    carModel?: string;
    carClass?: string;
    country?: string;
}

export interface SessionMetadata {
    trackName: string;
    trackLayout: string;
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
    [key: string]: number[];
}


export interface TelemetryResponse {
    // Usually mapping of channel name -> array of values
    [key: string]: number[];
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
    stintCount?: number;
    totalLaps?: number;
    fuelUsed?: number;
}
