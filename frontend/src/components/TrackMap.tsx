import React, { useEffect, useRef, useMemo, useState, useCallback, memo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useTelemetryStore, type TelemetryState } from '../store/telemetryStore';
import type { Lap, ReferenceLap } from '../types';
import { Tooltip } from './ui/Tooltip';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { CompactTelemetryOverlay } from './CompactTelemetryOverlay';
import { TrackInfoOverlay } from './TrackInfoOverlay';
import { CarInfoOverlay } from './CarInfoOverlay';
import { LapsSelectorOverlay } from './LapsSelectorOverlay';
import { DataChartsOverlay } from './DataChartsOverlay';
import { MaximizedDimensionToggle } from './MaximizedDimensionToggle';
import { FileManager } from './FileManager';
import trackCorners from '../assets/track_corners.json';
import trackSegments from '../assets/track_segments.json';

import { Maximize2, Minimize2, Play, Pause, RotateCcw, Compass, Navigation, ZoomIn, ZoomOut, Activity, ChevronRight, ChevronLeft, Check, ChevronDown, ArrowLeft } from 'lucide-react';

const STICKY_THRESHOLD = 0.05;

// Helper for binary searching channel index (e.g. distance/time) returning fractional index for smooth rendering
const findIndexInChannelRange = (
    channel: number[] | Float64Array,
    startIdx: number,
    endIdx: number,
    targetValue: number
): number => {
    if (startIdx >= endIdx) return startIdx;
    if (targetValue <= channel[startIdx]) return startIdx;
    if (targetValue >= channel[endIdx]) return endIdx;

    let low = startIdx;
    let high = endIdx;
    
    while (low <= high) {
        const mid = (low + high) >> 1;
        const val = channel[mid];
        if (val === targetValue) return mid;
        if (val < targetValue) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    
    const p1 = high;
    const p2 = low;
    const v1 = channel[p1];
    const v2 = channel[p2];
    
    if (v2 === v1 || v1 === undefined || v2 === undefined) return p1;
    return p1 + (targetValue - v1) / (v2 - v1);
};

// Performance: Move variants outside to avoid recreation on every render
const controlBarVariants: Variants = {
    hidden: { scale: 0.7, opacity: 0 },
    visible: {
        scale: 0.7,
        opacity: 0.3,
        transition: { staggerChildren: 0.05, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
    },
    hovered: {
        scale: 1,
        opacity: 1,
        transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] } // Snappier
    }
};

const innerContainerVariants: Variants = {
    visible: { transition: { staggerChildren: 0.05 } },
    hidden: {}
};

// Custom Icons for Map Controls
const MapIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
        <path d="M9 3v15" />
        <path d="M15 6v15" />
    </svg>
);

const ViewfinderIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 8V3h5" />
        <path d="M16 3h5v5" />
        <path d="M21 16v5h-5" />
        <path d="M8 21H3v-5" />
    </svg>
);

const FollowIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 8V3h5" />
        <path d="M16 3h5v5" />
        <path d="M21 16v5h-5" />
        <path d="M8 21H3v-5" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 7V9" />
        <path d="M12 15V17" />
        <path d="M17 12H15" />
        <path d="M9 12H7" />
    </svg>
);

interface TrackMapProps {
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    isMiniMap?: boolean;
    allowRotation?: boolean; // NEW
    forcedRotation?: number; // Prop to sync rotation
    isAnimating?: boolean;   // Prop to skip rotation recalibration
}

const formatLapTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "00:00.000";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

const TopCenterTelemetryHUD = React.memo(() => {
    const telemetryData = useTelemetryStore(state => state.telemetryData);
    const cursorIndex = useTelemetryStore(state => state.cursorIndex);
    const smoothCursorIndex = useTelemetryStore(state => state.smoothCursorIndex);
    const isPlaying = useTelemetryStore(state => state.isPlaying);
    const laps = useTelemetryStore(state => state.laps);
    const selectedLapIdx = useTelemetryStore(state => state.selectedLapIdx);
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);

    const carDist = useMemo(() => {
        if (!telemetryData || cursorIndex === null || !laps.length) return null;
        const idx = Math.floor(isPlaying ? (smoothCursorIndex ?? cursorIndex) : cursorIndex);

        const dists = telemetryData['Lap Dist'] || telemetryData['Distance'];
        if (!dists || dists[idx] === undefined) return null;
        let dist = dists[idx];

        const lapsChan = telemetryData['Lap'] || telemetryData['lap'];
        const currentLapIdx = (lapsChan && lapsChan[idx] !== undefined)
            ? lapsChan[idx]
            : (selectedLapIdx !== null ? selectedLapIdx : (laps.find(l => l.isValid)?.lap ?? laps[0].lap));
        
        if (currentLapIdx !== undefined && lapsChan) {
            let sIdx = -1;
            let eIdx = -1;
            for (let i = 0; i < lapsChan.length; i++) {
                if (lapsChan[i] == currentLapIdx) {
                    if (sIdx === -1) sIdx = i;
                    eIdx = i;
                }
            }
            if (sIdx !== -1 && eIdx !== -1 && dists[sIdx] !== undefined && dists[eIdx] !== undefined) {
                const actualLen = dists[eIdx] - dists[sIdx];
                const refLen = sessionMetadata?.officialTrackLength || actualLen;
                const stretchRatio = actualLen > 0 ? refLen / actualLen : 1;
                
                if (idx === eIdx) {
                    dist = refLen;
                } else {
                    const relDist = dist - dists[sIdx];
                    dist = Math.max(0, relDist * stretchRatio);
                }
            }
        }
        if (dist !== null && dist < 8) {
            dist = 0;
        }
        return dist;
    }, [telemetryData, cursorIndex, smoothCursorIndex, isPlaying, laps, selectedLapIdx, sessionMetadata?.officialTrackLength]);

    return (
        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center shadow-2xl glass-container overflow-hidden"
            onMouseMove={handleGlassMouseMove}>
            <div className="glass-content px-6 py-2.5 flex items-center">
                <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Dist</span>
                    <span className="text-[18px] font-black text-blue-400 tabular-nums tracking-tighter leading-none">
                        {carDist !== null ? Math.round(carDist) : "---"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">m</span>
                </div>
            </div>
        </div>
    );
});
TopCenterTelemetryHUD.displayName = 'TopCenterTelemetryHUD';

export const TrackMap = React.memo(({ isExpanded = false, onToggleExpand, isMiniMap = false, allowRotation = true, forcedRotation, isAnimating = false }: TrackMapProps) => {
    const telemetryData = useTelemetryStore(state => state.telemetryData);
    const referenceTelemetryData = useTelemetryStore(state => state.referenceTelemetryData);
    const selectedStint = useTelemetryStore(state => state.selectedStint);
    const selectedLapIdx = useTelemetryStore(state => state.selectedLapIdx);
    const referenceLapIdx = useTelemetryStore(state => state.referenceLapIdx);
    const referenceLap = useTelemetryStore(state => state.referenceLap);
    const laps = useTelemetryStore(state => state.laps);
    const setCursorIndex = useTelemetryStore(state => state.setCursorIndex);
    const zoomRange = useTelemetryStore(state => state.zoomRange);
    const isPlaying = useTelemetryStore(state => state.isPlaying);
    const playbackElapsed = useTelemetryStore(state => state.playbackElapsed);
    const playbackSpeed = useTelemetryStore(state => state.playbackSpeed);
    const togglePlayback = useTelemetryStore(state => state.togglePlayback);
    const setPlaybackSpeed = useTelemetryStore(state => state.setPlaybackSpeed);
    const setPlaybackProgress = useTelemetryStore(state => state.setPlaybackProgress);
    const setPlaybackTime = useTelemetryStore(state => state.setPlaybackTime);
    const cameraModeStore = useTelemetryStore(state => state.cameraMode);
    const cameraMode = (isMiniMap || !isExpanded) ? 'static' : cameraModeStore;
    const setCameraMode = useTelemetryStore(state => state.setCameraMode);
    const storeFollowZoom = useTelemetryStore(state => state.followZoom);
    const followZoom = (isMiniMap || !isExpanded) ? 50 : storeFollowZoom;
    const setFollowZoom = useTelemetryStore(state => state.setFollowZoom);
    const dashboardSyncMode = useTelemetryStore(state => state.dashboardSyncMode);
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
    const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);
    const showTelemetryOverlay = useTelemetryStore(state => state.showTelemetryOverlay);
    const setShowTelemetryOverlay = useTelemetryStore(state => state.setShowTelemetryOverlay);
    const hudVisibility = useTelemetryStore(state => state.hudVisibility);
    const setHudVisibility = useTelemetryStore(state => state.setHudVisibility);
    const isMapMaximized = useTelemetryStore(state => state.isMapMaximized);
    const setIsMapMaximized = useTelemetryStore(state => state.setIsMapMaximized);
    const maximizedSidebarMode = useTelemetryStore(state => state.maximizedSidebarMode);
    const setMaximizedSidebarMode = useTelemetryStore(state => state.setMaximizedSidebarMode);
    const singleLapXAxisMode = useTelemetryStore(state => state.singleLapXAxisMode);
    const setSingleLapXAxisMode = useTelemetryStore(state => state.setSingleLapXAxisMode);
    const setDashboardSyncMode = useTelemetryStore(state => state.setDashboardSyncMode);
    const mapMarkerType = useTelemetryStore(state => state.mapMarkerType);
    const track3DData = useTelemetryStore(state => state.track3DData);
    const staticTrackBaseData = useTelemetryStore(state => state.staticTrackBaseData);
    const selectedSegIdx = useTelemetryStore(state => state.selectedSegIdx);
    const setSelectedSegIdx = useTelemetryStore(state => state.setSelectedSegIdx);
    const miniSectorState = useTelemetryStore(state => state.miniSectorState);
    const setZoomRange = useTelemetryStore(state => state.setZoomRange);
    const setReferenceLap = useTelemetryStore(state => state.setReferenceLap);

    // Render-less state updates for high-frequency cursor rendering
    const cursorIndexRef = useRef<number | null>(useTelemetryStore.getState().cursorIndex);
    const smoothCursorIndexRef = useRef<number | null>(useTelemetryStore.getState().smoothCursorIndex);
    const playbackElapsedRef = useRef<number>(useTelemetryStore.getState().playbackElapsed);
    const isPlayingRef = useRef<boolean>(useTelemetryStore.getState().isPlaying);
    const cursorRafRef = useRef<number>(0); // rAF handle for cursor throttle

    const containerRef = useRef<HTMLDivElement>(null);
    const trackCanvasRef = useRef<HTMLCanvasElement>(null);
    const cursorCanvasRef = useRef<HTMLCanvasElement>(null);

    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [view, setView] = useState({ x: 0, y: 0, k: 1, rotation: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [isSpeedOpen, setIsSpeedOpen] = useState(false);
    const speedMenuRef = useRef<HTMLDivElement>(null);
    const lastPos = useRef({ x: 0, y: 0 });
    const startAngle = useRef(0);
    const startViewRotation = useRef(0);
    const startViewPos = useRef({ x: 0, y: 0 });
    const badgeClickRegionsRef = useRef<{ index: number; x: number; y: number; r: number }[]>([]);
    const clickStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const [flagImage, setFlagImage] = useState<HTMLImageElement | null>(null);
    const [isBarHovered, setIsBarHovered] = useState(false);
    const [isSegmentLoading, setIsSegmentLoading] = useState(false);
    const showMiniMap = useTelemetryStore(state => state.showMiniMap);
    const setShowMiniMap = useTelemetryStore(state => state.setShowMiniMap);
    const showMiniSectors = useTelemetryStore(state => state.showMiniSectors);
    const setShowMiniSectors = useTelemetryStore(state => state.setShowMiniSectors);

    // Load Checkered Flag Icon
    useEffect(() => {
        const img = new Image();
        img.src = '/finish_flag.png';
        img.onload = () => setFlagImage(img);
    }, []);

    // Handle Click Outside for Speed Menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
                setIsSpeedOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle Resize with ResizeObserver
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(() => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    // 1a. Helper: Common projection center (session wide)
    const sessionBase = useMemo(() => {
        if (!telemetryData) return null;
        const lat = telemetryData['GPS Latitude'] || [];
        const lon = telemetryData['GPS Longitude'] || [];
        if (lat.length < 2) return null;

        let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
        let validPoints = 0;
        const boundsStep = Math.max(1, Math.floor(lat.length / 200));
        for (let i = 0; i < lat.length; i += boundsStep) {
            const la = lat[i]; const lo = lon[i];
            if (la !== undefined && lo !== undefined && la !== 0 && lo !== 0 && !isNaN(la) && !isNaN(lo)) {
                if (la < minLat) minLat = la; if (la > maxLat) maxLat = la;
                if (lo < minLon) minLon = lo; if (lo > maxLon) maxLon = lo;
                validPoints++;
            }
        }

        const centerLat = (minLat + maxLat) / 2;
        const centerLon = (minLon + maxLon) / 2;
        const latRad = centerLat * Math.PI / 180;
        const lonScale = Math.cos(latRad) || 0.7;

        return { lat: centerLat, lon: centerLon, lonScale };
    }, [telemetryData]);

    const project = useCallback((la: number, lo: number) => {
        if (!sessionBase) return { x: 0, y: 0 };
        return {
            x: (lo - sessionBase.lon) * sessionBase.lonScale,
            y: (la - sessionBase.lat)
        };
    }, [sessionBase]);

    // 1b. Helper: Geometry Processor
    const processGeometry = useCallback((sIdx: number, eIdx: number, isReference: boolean,
        sourceLat: number[], sourceLon: number[], sourceInPits: number[],
        sourcePathLat: number[] = [], sourceTrackEdge: number[] = []) => {
        const pointCount = eIdx - sIdx + 1;
        if (pointCount < 2) return null;

        const targetPoints = 4000;
        const step = Math.max(1, Math.ceil(pointCount / targetPoints));

        const tempPoints = [];
        const tempOrigIdx = [];
        for (let i = sIdx; i < eIdx; i += step) {
            const p = project(sourceLat[i], sourceLon[i]);
            if (!isNaN(p.x) && !isNaN(p.y)) {
                tempPoints.push(p);
                tempOrigIdx.push(i);
            }
        }

        // CRITICAL: Always include the very last sample to ensure the line 'reaches' the finish
        if (tempOrigIdx[tempOrigIdx.length - 1] !== eIdx) {
            const lastP = project(sourceLat[eIdx], sourceLon[eIdx]);
            if (!isNaN(lastP.x) && !isNaN(lastP.y)) {
                tempPoints.push(lastP);
                tempOrigIdx.push(eIdx);
            }
        }

        if (tempPoints.length < 2) return null;

        const rawNormals: { nx: number, ny: number }[] = [];
        for (let i = 0; i < tempPoints.length; i++) {
            const p = tempPoints[i];
            let dx = 0, dy = 0;
            if (i === 0) { dx = tempPoints[1].x - p.x; dy = tempPoints[1].y - p.y; }
            else if (i === tempPoints.length - 1) { dx = p.x - tempPoints[i - 1].x; dy = p.y - tempPoints[i - 1].y; }
            else { dx = tempPoints[i + 1].x - tempPoints[i - 1].x; dy = tempPoints[i + 1].y - tempPoints[i - 1].y; }
            const dist = Math.sqrt(dx * dx + dy * dy);
            rawNormals.push(dist < 1e-12 ? { nx: 0, ny: 1 } : { nx: -dy / dist, ny: dx / dist });
        }

        const normalSmoothWin = 8;
        const edgeSearchRange = Math.max(2, Math.floor(step * 1.5));
        const rawWidths = new Float32Array(tempPoints.length);
        for (let i = 0; i < tempPoints.length; i++) {
            const idx = tempOrigIdx[i];
            let sW = 0, cW = 0;
            for (let j = Math.max(0, idx - edgeSearchRange); j <= Math.min(sourceTrackEdge.length - 1, idx + edgeSearchRange); j++) {
                const w = Math.abs(sourceTrackEdge[j] || 0);
                if (w > 1) { sW += w; cW++; }
            }
            rawWidths[i] = cW > 0 ? (sW / cW) : 7.5;
        }

        if (isReference) {
            const smoothedWidths = new Float32Array(tempPoints.length);
            const win = 25;
            for (let i = 0; i < tempPoints.length; i++) {
                let s = 0, c = 0;
                for (let j = i - win; j <= i + win; j++) {
                    if (j >= 0 && j < tempPoints.length) { s += rawWidths[j]; c++; }
                }
                smoothedWidths[i] = s / (c || 1);
            }
            rawWidths.set(smoothedWidths);
        }

        const points = [];
        const leftEdges = [];
        const rightEdges = [];
        const originalIndices = [];
        const drawFlags = [];
        let lastValidLat = 0;

        for (let i = 0; i < tempPoints.length; i++) {
            const p = tempPoints[i];
            const idx = tempOrigIdx[i];
            let snx = 0, sny = 0, snc = 0;
            for (let w = -normalSmoothWin; w <= normalSmoothWin; w++) {
                const ni = i + w;
                if (ni >= 0 && ni < rawNormals.length) { snx += rawNormals[ni].nx; sny += rawNormals[ni].ny; snc++; }
            }
            const nMag = Math.sqrt(snx * snx + sny * sny);
            const nx = snx / (nMag || 1);
            const ny = sny / (nMag || 1);

            let sl = 0, cl = 0;
            for (let j = Math.max(0, idx - edgeSearchRange); j <= Math.min(sourcePathLat.length - 1, idx + edgeSearchRange); j++) {
                const l = sourcePathLat[j];
                if (l !== undefined && !isNaN(l)) { sl += l; cl++; }
            }
            const curLat = cl > 0 ? (sl / cl) : lastValidLat;
            lastValidLat = curLat;
            const curWidth = rawWidths[i];
            let draw = true;
            const sourceInPitsSafe = sourceInPits;
            if (sourceInPitsSafe && Array.isArray(sourceInPitsSafe) && sourceInPitsSafe[idx] > 0.5) draw = false;
            if (Math.abs(curLat) > curWidth * 2.5) draw = false;

            const degM = 111320;
            const lScale = (curWidth + curLat) / degM;
            const rScale = (-curWidth + curLat) / degM;

            points.push(p);
            leftEdges.push({ x: p.x + nx * lScale, y: p.y + ny * lScale });
            rightEdges.push({ x: p.x + nx * rScale, y: p.y + ny * rScale });
            originalIndices.push(idx);
            drawFlags.push(draw);
        }

        return { points, leftEdges, rightEdges, originalIndices, drawFlags };
    }, [project]);

    // 1c. Track Surface Geometry (Static per session)
    const baseTrack = useMemo(() => {
        if (!telemetryData || !laps.length || !sessionBase) return null;
        const lat = telemetryData['GPS Latitude'] || [];
        const lon = telemetryData['GPS Longitude'] || [];
        const time = telemetryData['Time'] || telemetryData['GPS Time'];
        const inPits = telemetryData['In Pits'] || [];
        const pathLateral = telemetryData['Path Lateral'] || [];
        const trackEdge = telemetryData['Track Edge'] || [];

        const lapsInStint = laps.filter(l => l.stint === selectedStint);
        const fastestValidLap = lapsInStint.filter(l => l.isValid).sort((a, b) => a.duration - b.duration)[0] || lapsInStint[0] || laps[0];

        if (!fastestValidLap || !(telemetryData['Time'] || telemetryData['GPS Time'])) return null;

        const stintTimeArr = time;
        const sIdx = stintTimeArr.findIndex(t => t >= fastestValidLap.startTime);
        const eIdx = stintTimeArr.findIndex(t => t > fastestValidLap.endTime);
        const refTrackIndices = { sIdx: Math.max(0, sIdx), eIdx: eIdx === -1 ? stintTimeArr.length - 1 : eIdx };

        if (refTrackIndices.sIdx >= refTrackIndices.eIdx) return null;

        const referenceTrack = processGeometry(refTrackIndices.sIdx, refTrackIndices.eIdx, true, lat, lon, inPits, pathLateral, trackEdge);
        if (!referenceTrack) return null;

        // Bounding Box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        referenceTrack.points.forEach(p => {
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        });

        // PCA for orientation
        let sumX = 0, sumY = 0;
        const pts = referenceTrack.points;
        const nPts = pts.length;
        for (let i = 0; i < nPts; i++) { sumX += pts[i].x; sumY += pts[i].y; }
        const meanX = sumX / (nPts || 1); const meanY = sumY / (nPts || 1);
        let cxx = 0, cyy = 0, cxy = 0;
        for (let i = 0; i < nPts; i++) {
            const dx = pts[i].x - meanX; const dy = pts[i].y - meanY;
            cxx += dx * dx; cyy += dy * dy; cxy += dx * dy;
        }
        const lambda1 = (cxx + cyy) / 2 + Math.sqrt(Math.pow((cxx - cyy) / 2, 2) + cxy * cxy);
        const principalAngleRad = Math.abs(cxy) > 1e-6 ? Math.atan2(lambda1 - cxx, cxy) : (cxx > cyy ? 0 : Math.PI / 2);

        const w = maxX - minX, h = maxY - minY;
        return {
            referenceTrack,
            pcaAngle: principalAngleRad * 180 / Math.PI,
            bounds: {
                minX: minX - w * 0.02, maxX: maxX + w * 0.02,
                minY: minY - h * 0.02, maxY: maxY + h * 0.02,
                width: w * 1.04, height: h * 1.04
            }
        };
    }, [telemetryData, laps, sessionBase, processGeometry]);

    // 1d. Racing Line Geometry (Dynamic per selection)
    const racingLineData = useMemo(() => {
        if (!telemetryData || !sessionBase || !baseTrack) return null;
        const lat = telemetryData['GPS Latitude'] || [];
        const lon = telemetryData['GPS Longitude'] || [];
        const time = telemetryData['Time'] || telemetryData['GPS Time'];
        const inPits = telemetryData['In Pits'] || [];

        const currentLapIdx = selectedLapIdx !== null ? selectedLapIdx : (laps.find(l => l.isValid)?.lap ?? laps[0].lap);
        const currentLap = laps.find(l => l.lap === currentLapIdx) || laps[0];
        if (!time) return null;
        const sIdx = time.findIndex(t => t >= currentLap.startTime);
        const eIdx = time.findIndex(t => t > currentLap.endTime);

        return processGeometry(Math.max(0, sIdx), eIdx === -1 ? time.length - 1 : eIdx, false, lat, lon, inPits);
    }, [telemetryData, selectedLapIdx, laps, sessionBase, baseTrack, processGeometry]);

    // 1e. Reference Line Geometry (Dynamic per reference)
    const referenceLineData = useMemo(() => {
        if (!sessionBase || !baseTrack) return null;

        if (referenceTelemetryData && referenceLap) {
            const refLat = referenceTelemetryData['GPS Latitude'] || [];
            const refLon = referenceTelemetryData['GPS Longitude'] || [];
            const refTime = referenceTelemetryData['Time'] || referenceTelemetryData['GPS Time'] || [];
            const refInPits = referenceTelemetryData['In Pits'] || [];
            const sIdx = refTime.findIndex(t => t >= referenceLap.startTime);
            const eIdx = refTime.findIndex(t => t > referenceLap.startTime + referenceLap.duration);
            const startIdx = Math.max(0, sIdx);
            const endIdx = eIdx === -1 ? refTime.length - 1 : eIdx;

            if (startIdx >= endIdx || endIdx < 0) return null;
            return processGeometry(startIdx, endIdx, false, refLat, refLon, refInPits);
        } else if (referenceLapIdx !== null) {
            const refLap = laps.find(l => l.lap === referenceLapIdx);
            if (refLap && telemetryData) {
                const time = telemetryData['Time'] || telemetryData['GPS Time'];
                if (!time) return null;
                const sIdx = time.findIndex(t => t >= refLap.startTime);
                const eIdx = time.findIndex(t => t > refLap.endTime);
                const startIdx = Math.max(0, sIdx);
                const endIdx = eIdx === -1 ? time.length - 1 : eIdx;

                if (startIdx >= endIdx || endIdx < 0) return null;
                return processGeometry(startIdx, endIdx, false, telemetryData['GPS Latitude'], telemetryData['GPS Longitude'], telemetryData['In Pits']);
            }
        }
        return null;
    }, [telemetryData, referenceTelemetryData, referenceLap, referenceLapIdx, laps, sessionBase, baseTrack, processGeometry]);

    // 1e2. Auto Compare Line Geometry for Implicit Mini-sector Comparison when Ref is None
    const autoCompareLineData = useMemo(() => {
        if (!sessionBase || !baseTrack || !telemetryData || !miniSectorState?.sessionMiniSectorBests || selectedSegIdx === null || (referenceTelemetryData && referenceLap) || referenceLapIdx !== null) {
            return null;
        }

        const best = miniSectorState.sessionMiniSectorBests.bests[selectedSegIdx];
        if (!best) return null;

        const bestLapNum = best.lap;
        const bestLapTimes = miniSectorState.allLapsMiniSectorTimes?.[bestLapNum];
        const bestLapSegTime = bestLapTimes?.[selectedSegIdx];
        if (!bestLapSegTime) return null;

        const startIdx = Math.max(0, bestLapSegTime.startIdx);
        const time = telemetryData['Time'] || telemetryData['GPS Time'];
        const endIdx = Math.min((time?.length || 1) - 1, bestLapSegTime.endIdx);

        if (startIdx >= endIdx || endIdx < 0) return null;

        return processGeometry(
            startIdx,
            endIdx,
            false,
            telemetryData['GPS Latitude'],
            telemetryData['GPS Longitude'],
            telemetryData['In Pits']
        );
    }, [telemetryData, miniSectorState, selectedSegIdx, referenceTelemetryData, referenceLap, referenceLapIdx, sessionBase, baseTrack, processGeometry]);

    // 1e3. Synchronized index for autoCompare ghost car (Implicit comparison when reference is None)
    const getAutoCompareSyncIdx = useCallback(() => {
        if (!telemetryData || selectedSegIdx === null || !miniSectorState?.sessionMiniSectorBests) return null;
        const best = miniSectorState.sessionMiniSectorBests.bests[selectedSegIdx];
        if (!best) return null;

        const bestLapNum = best.lap;
        const bestLapTimes = miniSectorState.allLapsMiniSectorTimes?.[bestLapNum];
        const bestLapSegTime = bestLapTimes?.[selectedSegIdx];
        if (!bestLapSegTime) return null;

        const currentLapIdx = selectedLapIdx !== null ? selectedLapIdx : (laps.find(l => l.isValid)?.lap ?? laps[0].lap);
        const currentLap = laps.find(l => l.lap === currentLapIdx);
        const bestLap = laps.find(l => l.lap === bestLapNum);
        if (!currentLap || !bestLap) return null;

        const times = telemetryData['Time'] || telemetryData['GPS Time'];
        const lapChan = telemetryData['Lap'];
        const activeCursorIdx = isPlayingRef.current ? (smoothCursorIndexRef.current ?? cursorIndexRef.current) : cursorIndexRef.current;
        if (activeCursorIdx === null || !times || !lapChan) return null;

        // Helper for fractional array interpolation
        const getInterpolatedVal = (arr: number[] | Float64Array) => {
            const base = Math.floor(activeCursorIdx);
            const frac = activeCursorIdx - base;
            const v1 = arr[base];
            if (v1 === undefined) return 0;
            const v2 = arr[base + 1] ?? v1;
            return v1 + (v2 - v1) * frac;
        };

        // Find curLineS and refLineS from Lap channel to align times precisely
        let curLineS = -1;
        for (let i = 0; i < lapChan.length; i++) {
            if (lapChan[i] === currentLapIdx) { curLineS = i; break; }
        }
        if (curLineS === -1) return null;

        let refLineS = -1;
        let refLineE = -1;
        for (let i = 0; i < lapChan.length; i++) {
            if (lapChan[i] === bestLapNum) {
                if (refLineS === -1) refLineS = i;
                refLineE = i;
            } else if (refLineS !== -1 && lapChan[i] > bestLapNum) {
                break;
            }
        }
        if (refLineS === -1) return null;
        if (refLineE === -1) refLineE = times.length - 1;

        const currentLapTimes = miniSectorState.currentLapMiniSectorTimes;
        const currentLapSegTime = currentLapTimes?.[selectedSegIdx];

        const curTime = getInterpolatedVal(times);

        if (currentLapSegTime && bestLapSegTime) {
            const curSegStartTime = times[currentLapSegTime.startIdx] || 0;
            const curSegPassedTime = curTime - curSegStartTime;

            const refSegStartTime = times[bestLapSegTime.startIdx] || 0;
            const targetRefTime = refSegStartTime + curSegPassedTime;
            return findIndexInChannelRange(times, bestLapSegTime.startIdx, bestLapSegTime.endIdx, targetRefTime);
        } else {
            const curTimeOffset = curTime - times[curLineS];
            const targetRefTime = times[refLineS] + curTimeOffset;
            return findIndexInChannelRange(times, refLineS, refLineE, targetRefTime);
        }
    }, [telemetryData, selectedSegIdx, miniSectorState, selectedLapIdx, laps]);

    // 1f. Consolidated Track Data
    const trackData = useMemo(() => {
        if (!baseTrack || !racingLineData) return null;
        return {
            ...baseTrack,
            racingLine: racingLineData,
            referenceRacingLine: referenceLineData || autoCompareLineData,
            center: sessionBase!
        };
    }, [baseTrack, racingLineData, referenceLineData, autoCompareLineData, sessionBase]);

    const getHeadingAtIdx = useCallback((idx: number, sourceData: any) => {
        if (!trackData) return 0;
        const lat = sourceData['GPS Latitude'];
        const lon = sourceData['GPS Longitude'];
        if (!lat || !lon) return 0;
        const windowVal = 15;
        const i1 = Math.max(0, Math.floor(idx) - windowVal);
        const i2 = Math.min(lat.length - 1, Math.floor(idx) + windowVal);
        if (i1 === i2) return 0;
        const dLat = lat[i2] - lat[i1];
        const dLon = (lon[i2] - lon[i1]) * trackData.center.lonScale;
        let heading = Math.atan2(dLon, dLat) * 180 / Math.PI;

        const speed = sourceData['Ground Speed'];
        const gLat = sourceData['G Force Lat'];
        if (speed && gLat) {
            const curSpeedKmh = speed[Math.floor(idx)];
            const curGLat = gLat[Math.floor(idx)];
            if (curSpeedKmh >= 3.0) {
                const v_mps = curSpeedKmh / 3.6;
                const slipOffset = (curGLat * 9.81 / (v_mps * v_mps)) * (180 / Math.PI) * 0.5;
                heading += Math.max(-15, Math.min(15, slipOffset));
            }
        }
        return heading;
    }, [trackData]);

    // --- Dynamic Sizing and View Management ---
    const trackName = sessionMetadata?.trackName;
    const layoutName = sessionMetadata?.layoutKey || sessionMetadata?.trackLayout || 'Default';

    const corners = useMemo(() => {
        if (!trackName || !trackCorners) {
            console.log("[TrackMap] No trackName or trackCorners available");
            return [];
        }
        
        // Helper to normalize and strip accents & punctuation from track names for comparison
        const cleanTrackName = (name: string) => {
            return name
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Strip accents (convert Autódromo to Autodromo, José to Jose)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, ' ') // Punctuation to space
                .trim();
        };

        const targetTrackClean = cleanTrackName(trackName);

        // Find track by exact match, normalized match, or fuzzy word overlap match
        let trackKey = Object.keys(trackCorners).find(
            key => key.toLowerCase() === trackName.toLowerCase()
        );

        if (!trackKey) {
            trackKey = Object.keys(trackCorners).find(
                key => cleanTrackName(key) === targetTrackClean
            );
        }

        if (!trackKey) {
            // Fuzzy match: check if key and trackName share a high percentage of words
            trackKey = Object.keys(trackCorners).find(key => {
                const keyClean = cleanTrackName(key);
                const keyWords = keyClean.split(/\s+/).filter(w => w.length > 2);
                const targetWords = targetTrackClean.split(/\s+/).filter(w => w.length > 2);
                const overlap = keyWords.filter(w => targetWords.includes(w));
                const threshold = Math.min(keyWords.length, targetWords.length) * 0.7; // 70% word overlap
                return overlap.length >= threshold;
            });
        }

        console.log(`[TrackMap] Matching trackName: "${trackName}" -> Key: "${trackKey}"`);

        if (!trackKey) return [];
        
        const layouts = (trackCorners as any)[trackKey];
        if (!layouts) return [];
        
        // Helper to normalize layout names by stripping track name words and non-alphanumeric characters
        const normalize = (lName: string) => {
            let clean = cleanTrackName(lName);
            // Split trackName into words and remove them
            const trackWords = cleanTrackName(trackName).split(/\s+/);
            trackWords.forEach(word => {
                if (word.length > 2) { // only filter out meaningful words
                    const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    clean = clean.replace(new RegExp(`\\b${escaped}\\b`, 'g'), '');
                }
            });
            return clean.replace(/[^a-z0-9]/g, '').trim();
        };

        const targetNormalized = normalize(layoutName);

        // Try exact match first
        let layoutKey = Object.keys(layouts).find(
            key => key.toLowerCase() === layoutName.toLowerCase()
        );

        // Try normalized match next
        if (!layoutKey) {
            layoutKey = Object.keys(layouts).find(
                key => normalize(key) === targetNormalized
            );
        }

        // Fallback to layout containing the layoutName or contained by it
        if (!layoutKey) {
            layoutKey = Object.keys(layouts).find(
                key => {
                    const kClean = cleanTrackName(key);
                    const lClean = cleanTrackName(layoutName);
                    return kClean.includes(lClean) || lClean.includes(kClean);
                }
            );
        }

        // Fallback to first layout
        const fallbackUsed = !layoutKey;
        layoutKey = layoutKey || Object.keys(layouts)[0];
        
        console.log(`[TrackMap] Matching layoutName: "${layoutName}" -> Key: "${layoutKey}" (Fallback used: ${fallbackUsed})`);
        
        const resultCorners = layouts[layoutKey] || [];
        console.log(`[TrackMap] Found ${resultCorners.length} corners for ${trackKey} [${layoutKey}]`);
        return resultCorners;
    }, [trackName, layoutName]);

    const miniSectors = useMemo(() => {
        if (!trackName || !trackSegments) {
            console.log("[TrackMap] No trackName or trackSegments available");
            return [];
        }
        
        const cleanTrackName = (name: string) => {
            return name
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]/g, ' ')
                .trim();
        };

        const targetTrackClean = cleanTrackName(trackName);

        let trackKey = Object.keys(trackSegments).find(
            key => key.toLowerCase() === trackName.toLowerCase()
        );

        if (!trackKey) {
            trackKey = Object.keys(trackSegments).find(
                key => cleanTrackName(key) === targetTrackClean
            );
        }

        if (!trackKey) {
            trackKey = Object.keys(trackSegments).find(key => {
                const keyClean = cleanTrackName(key);
                const keyWords = keyClean.split(/\s+/).filter(w => w.length > 2);
                const targetWords = targetTrackClean.split(/\s+/).filter(w => w.length > 2);
                const overlap = keyWords.filter(w => targetWords.includes(w));
                const threshold = Math.min(keyWords.length, targetWords.length) * 0.7;
                return overlap.length >= threshold;
            });
        }

        console.log(`[TrackMap] Matching trackName for segments: "${trackName}" -> Key: "${trackKey}"`);

        if (!trackKey) return [];
        
        const layouts = (trackSegments as any)[trackKey];
        if (!layouts) return [];
        
        const normalize = (lName: string) => {
            let clean = cleanTrackName(lName);
            const trackWords = cleanTrackName(trackName).split(/\s+/);
            trackWords.forEach(word => {
                if (word.length > 2) {
                    const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    clean = clean.replace(new RegExp(`\\b${escaped}\\b`, 'g'), '');
                }
            });
            return clean.replace(/[^a-z0-9]/g, '').trim();
        };

        const targetNormalized = normalize(layoutName);

        let layoutKey = Object.keys(layouts).find(
            key => key.toLowerCase() === layoutName.toLowerCase()
        );

        if (!layoutKey) {
            layoutKey = Object.keys(layouts).find(
                key => normalize(key) === targetNormalized
            );
        }

        if (!layoutKey) {
            layoutKey = Object.keys(layouts).find(
                key => {
                    const kClean = cleanTrackName(key);
                    const lClean = cleanTrackName(layoutName);
                    return kClean.includes(lClean) || lClean.includes(kClean);
                }
            );
        }

        const fallbackUsed = !layoutKey;
        layoutKey = layoutKey || Object.keys(layouts)[0];
        
        console.log(`[TrackMap] Matching layoutName for segments: "${layoutName}" -> Key: "${layoutKey}" (Fallback used: ${fallbackUsed})`);
        
        const layoutData = layouts[layoutKey];
        const resultSegments = layoutData ? (layoutData.segments || []) : [];
        console.log(`[TrackMap] Found ${resultSegments.length} segments for ${trackKey} [${layoutKey}]`);
        return resultSegments;
    }, [trackName, layoutName]);

    // 1g. Sector-based performance coloring for Minimap
    const sectorsSource = (track3DData || staticTrackBaseData)?.trackSectors;

    const sectorColors = useMemo(() => {
        // Must have both a selected lap and a reference lap (either cross-session or same-session)
        const hasReference = referenceLap !== null || referenceLapIdx !== null;
        if (!hasReference || selectedLapIdx === null || !laps) return null;

        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        if (!currentLap) return null;

        // Determine reference lap object
        const refLapObj = referenceLap || laps.find(l => l.lap === referenceLapIdx);
        if (!refLapObj) return null;

        const colors: Record<number, string> = {};
        [1, 2, 3].forEach(s => {
            const cur = currentLap[`s${s}` as keyof Lap] as number;
            const ref = refLapObj[`s${s}` as keyof Lap] as number;
            
            if (typeof cur === 'number' && typeof ref === 'number' && cur > 0 && ref > 0) {
                if (cur < ref - 0.001) colors[s - 1] = '#3b82f6'; // Blue
                else if (cur > ref + 0.001) colors[s - 1] = '#fbbf24'; // Orange
                else colors[s - 1] = '#ffffff'; // White
            } else {
                colors[s - 1] = 'rgba(150, 150, 150, 0.8)';
            }
        });
        return colors;
    }, [laps, selectedLapIdx, referenceLap, referenceLapIdx]);

    const sectorBreakpoints = useMemo(() => {
        if (!trackData?.racingLine || !sectorsSource || sectorsSource.length === 0) return null;

        const racingLine = trackData.racingLine;
        const points = racingLine.points;

        // Find closest racing line index for each sector boundary
        return sectorsSource.map(s => {
            const proj = project(s.lat, s.lon);
            let bestIdx = 0;
            let minDist = Infinity;

            for (let i = 0; i < points.length; i++) {
                const d = (points[i].x - proj.x) ** 2 + (points[i].y - proj.y) ** 2;
                if (d < minDist) {
                    minDist = d;
                    bestIdx = i;
                }
            }
            return { id: s.id, index: bestIdx };
        }).sort((a, b) => a.id - b.id);
    }, [trackData?.racingLine, sectorsSource, project]);


    // 2. Car Heading is calculated locally within render loops now to save React lifecycle overhead

    const isSingleLap = useMemo(() => {
        const reliesOnExternalData = !!(referenceTelemetryData && referenceLap);
        const targetRefLapIdx = reliesOnExternalData ? referenceLap?.lap : referenceLapIdx;
        return targetRefLapIdx === null || (targetRefLapIdx == selectedLapIdx && !reliesOnExternalData);
    }, [referenceTelemetryData, referenceLap, referenceLapIdx, selectedLapIdx]);

    // 3. Optimal Rotation Calculation (Brute-force aspect ratio matching)
    const lastStableRotation = useRef(0);
    const optimalRotation = useMemo(() => {
        if (!trackData || dimensions.width === 0) return lastStableRotation.current;

        // If animating, return the previous stable rotation to avoid laggy recalibration
        if (isAnimating) return lastStableRotation.current;

        const { width, height } = dimensions;
        let padLeft = 10, padRight = 50, padTop = 10;
        let padBottom = isExpanded ? 100 : 10;
        if (isMiniMap) {
            padLeft = padRight = padTop = padBottom = 12;
        }
        const availW = Math.max(10, width - (padLeft + padRight));
        const availH = Math.max(10, height - (padTop + padBottom));

        let bestK = -1;
        let bestRot = 0;
        const pts = trackData.referenceTrack.points;
        const sampleStep = Math.max(1, Math.floor(pts.length / 50)); // Optimization: Use every 50th point

        if (pts.length < 2) return lastStableRotation.current;

        for (let angle = 0; angle > -180; angle -= 2) {
            const rad = (angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            let minRX = Infinity, maxRX = -Infinity, minRY = Infinity, maxRY = -Infinity;
            for (let i = 0; i < pts.length; i += sampleStep) {
                const rx = pts[i].x * cos + pts[i].y * sin;
                const ry = pts[i].x * sin - pts[i].y * cos;
                if (rx < minRX) minRX = rx; if (rx > maxRX) maxRX = rx;
                if (ry < minRY) minRY = ry; if (ry > maxRY) maxRY = ry;
            }

            const bW = (maxRX - minRX) * 1.04;
            const bH = (maxRY - minRY) * 1.04;
            const k = Math.min(availW / Math.max(1e-10, bW), availH / Math.max(1e-10, bH));

            if (k > bestK) {
                bestK = k;
                bestRot = angle;
            }
        }

        if (bestK <= 0) return lastStableRotation.current;

        const result = (bestRot || 0) % 360;
        lastStableRotation.current = result;
        return result;
    }, [trackData, dimensions.width, dimensions.height, isExpanded, isMiniMap, isAnimating]);

    // 3. Track Aspect Ratio for Minimap (Rotated)
    const trackAspectRatio = useMemo(() => {
        if (!trackData) return 1;
        const rad = (view.rotation * Math.PI) / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const pts = trackData.referenceTrack.points;

        let minRX = Infinity, maxRX = -Infinity, minRY = Infinity, maxRY = -Infinity;
        for (let i = 0; i < pts.length; i++) {
            const rx = pts[i].x * cos + pts[i].y * sin;
            const ry = pts[i].x * sin - pts[i].y * cos;
            if (rx < minRX) minRX = rx; if (rx > maxRX) maxRX = rx;
            if (ry < minRY) minRY = ry; if (ry > maxRY) maxRY = ry;
        }
        const bW = maxRX - minRX, bH = maxRY - minRY;
        const ratio = bW / Math.max(1e-10, bH);
        return Math.max(0.6, Math.min(1.6, ratio));
    }, [trackData, view.rotation]);

    const staticTrackAspectRatio = useMemo(() => {
        if (!trackData) return 1;
        const rad = (optimalRotation * Math.PI) / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const pts = trackData.referenceTrack.points;

        let minRX = Infinity, maxRX = -Infinity, minRY = Infinity, maxRY = -Infinity;
        for (let i = 0; i < pts.length; i++) {
            const rx = pts[i].x * cos + pts[i].y * sin;
            const ry = pts[i].x * sin - pts[i].y * cos;
            if (rx < minRX) minRX = rx; if (rx > maxRX) maxRX = rx;
            if (ry < minRY) minRY = ry; if (ry > maxRY) maxRY = ry;
        }
        const bW = maxRX - minRX, bH = maxRY - minRY;
        const ratio = bW / Math.max(1e-10, bH);
        return Math.max(0.6, Math.min(1.6, ratio));
    }, [trackData, optimalRotation]);

    const fitTrack = useCallback(() => {
        if (!trackData || dimensions.width === 0) return;

        // Reset follow zoom if in follow modes
        if (cameraMode !== 'static') {
            setFollowZoom(50);
        }

        const { width, height } = dimensions;

        // Unified Padding Logic
        const pLeft = isMiniMap ? 12 : 30;
        const pRight = isMiniMap ? 12 : 30;
        const pTop = isMiniMap ? 12 : 10;
        const pBottom = isMiniMap ? 12 : (isExpanded ? 100 : 10);

        const availW = Math.max(10, width - (pLeft + pRight));
        const availH = Math.max(10, height - (pTop + pBottom));

        const activeRotation = forcedRotation ?? optimalRotation;
        const rad = (activeRotation * Math.PI) / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const pts = trackData.referenceTrack.points;

        let minRX = Infinity, maxRX = -Infinity, minRY = Infinity, maxRY = -Infinity;
        for (let i = 0; i < pts.length; i++) {
            const rx = pts[i].x * cos + pts[i].y * sin;
            const ry = pts[i].x * sin - pts[i].y * cos;
            if (rx < minRX) minRX = rx; if (rx > maxRX) maxRX = rx;
            if (ry < minRY) minRY = ry; if (ry > maxRY) maxRY = ry;
        }

        // Increase buffer to 22% to prevent segment badges from being cut off at the map edges
        const bW = (maxRX - minRX) * 1.22, bH = (maxRY - minRY) * 1.22;
        const finalK = Math.min(Math.min(availW / Math.max(1e-10, bW), availH / Math.max(1e-10, bH)), 1000000);

        const offsetX = (pLeft - pRight) / 2;
        const offsetY = (pTop - pBottom) / 2;

        setView(v => ({
            ...v,
            x: -(((minRX + maxRX) / 2) * finalK) + offsetX,
            y: -(((minRY + maxRY) / 2) * finalK) + offsetY,
            k: finalK,
            rotation: activeRotation
        }));
    }, [trackData, dimensions, optimalRotation, forcedRotation, isExpanded, isMiniMap]);

    useEffect(() => {
        if (isAnimating) return; // Skip fitting during animation
        fitTrack();
    }, [fitTrack, selectedLapIdx, dimensions.width, dimensions.height, isExpanded, isMiniMap, forcedRotation, isAnimating]); // Re-fit on resize, mode, or forced rotation change

    // 3. Main Track Rendering (Render-heavy, cached to canvas)
    const drawTrack = useCallback(() => {
        if (isMiniMap) return; // Disable zoom sync for mini map

        if (!zoomRange || !trackData || dimensions.width === 0) {
            // If zoom is cleared, we might want to return to fitTrack
            // But if user is manually panned/zoomed, we should be careful.
            // Usually, if zoomRange becomes null, it means the user double-clicked to reset.
            if (zoomRange === null) {
                fitTrack();
            }
            return;
        }

        const [startIdx, endIdx] = zoomRange;
        const pts = trackData.racingLine.points;
        const indices = trackData.racingLine.originalIndices;

        // Find relevant points in the projection taking current rotation into account
        const rad = (view.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        let minRX = Infinity, maxRX = -Infinity, minRY = Infinity, maxRY = -Infinity;
        let found = false;

        for (let i = 0; i < indices.length; i++) {
            if (indices[i] >= startIdx && indices[i] <= endIdx) {
                const p = pts[i];
                const rx = p.x * cos + p.y * sin;
                const ry = p.x * sin - p.y * cos;
                if (rx < minRX) minRX = rx; if (rx > maxRX) maxRX = rx;
                if (ry < minRY) minRY = ry; if (ry > maxRY) maxRY = ry;
                found = true;
            } else if (indices[i] > endIdx) {
                break;
            }
        }

        if (!found) return;

        // Increase buffer to 20% to prevent segment badges from being cut off during local zoom
        const w = (maxRX - minRX) * 1.20;
        const h = (maxRY - minRY) * 1.20;
        const centerRX = (minRX + maxRX) / 2;
        const centerRY = (minRY + maxRY) / 2;

        const { width, height } = dimensions;
        const padding = 20; // Extra padding for the zoomed view
        // Force rotation for minimaps to be strictly static
        const rotation = isMiniMap ? optimalRotation : view.rotation;
        const availW = Math.max(10, width - padding * 2);
        const availH = Math.max(10, height - padding * 2 - (isExpanded ? 100 : 0)); // Room for bottom controls

        const bW = Math.max(1e-10, w);
        const bH = Math.max(1e-10, h);

        const pLeft = isMiniMap ? 12 : 30;
        const pRight = isMiniMap ? 12 : 30;
        const pTop = isMiniMap ? 12 : 10;
        const pBottom = isMiniMap ? 12 : (isExpanded ? 100 : 10);

        const k = Math.min(availW / bW, availH / bH, 1000000); // Safety cap

        const nextX = -(centerRX * k) + (pLeft - pRight) / 2;
        const nextY = -(centerRY * k) + (pTop - pBottom) / 2;

        setView(v => ({ ...v, x: nextX, y: nextY, k }));

    }, [zoomRange, trackData, dimensions, fitTrack]);

    // 4. Smooth Rotation Reference
    const smoothRotation = useRef(optimalRotation);

    // 5. Drawing Loop (Optimized for High-Frequency Animation)
    useEffect(() => {
        const canvas = trackCanvasRef.current;
        if (!canvas || !trackData || isAnimating) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear click regions at start of render frame
        badgeClickRegionsRef.current = [];

        const { width, height } = dimensions;
        if (width === 0 || height === 0) return;

        // --- A. Calculate "Effective View" for this Frame ---
        // We bypass the slow 'view' state (which re-renders the whole component) 
        // to achieve buttery smooth Follow/Heading-Up motion.
        let effX = view.x;
        let effY = view.y;
        let effK = view.k;
        let effRot = view.rotation;

        const isFollowMode = !isMiniMap && cameraMode !== 'static';
        const activeIdx = isPlayingRef.current ? (smoothCursorIndexRef.current ?? cursorIndexRef.current) : cursorIndexRef.current;

        if (isFollowMode && activeIdx !== null) {
            const baseIdx = Math.floor(activeIdx);
            const lats = telemetryData['GPS Latitude'];
            const lons = telemetryData['GPS Longitude'];

            if (lats && lons && lats[baseIdx] !== undefined) {
                // Wrap around at the end of the lap/stint to connect back to the start
                const nextIdx = (baseIdx + 1) % lats.length;
                const frac = activeIdx - baseIdx;
                const clat = lats[baseIdx] + (lats[nextIdx] - lats[baseIdx]) * frac;
                const clon = lons[baseIdx] + (lons[nextIdx] - lons[baseIdx]) * frac;

                const worldX = (clon - trackData.center.lon) * trackData.center.lonScale;
                const worldY = (clat - trackData.center.lat);

                effK = 10000 + followZoom * 5000;

                // Rotation Smoothing (Lerp)
                const heading = getHeadingAtIdx(activeIdx, telemetryData);
                const targetRot = cameraMode === 'heading-up' ? -heading : (forcedRotation ?? optimalRotation);
                // Simple circular lerp for rotation
                let diff = (targetRot - smoothRotation.current) % 360;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                smoothRotation.current += diff * 0.15; // Smoothing factor
                effRot = smoothRotation.current;

                const rad = effRot * Math.PI / 180;
                const cos = Math.cos(rad), sin = Math.sin(rad);
                effX = -effK * (worldX * cos + worldY * sin);
                effY = -effK * (worldX * sin - worldY * cos);
            }
        } else if (isMiniMap || !isExpanded) {
            effRot = optimalRotation;
        }

        // --- B. Begin Canvas Drawing ---
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        // Local projection using track-specific center to ensure car and lines align perfectly
        const project = (lat: number, lon: number) => {
            if (!trackData?.center) return { x: 0, y: 0 };
            return {
                x: (lon - trackData.center.lon) * trackData.center.lonScale,
                y: (lat - trackData.center.lat)
            };
        };

        const { referenceTrack, racingLine } = trackData;
        const x = effX, y = effY, k = effK, rotation = effRot;

        const throttle = telemetryData!['Throttle Pos'] || telemetryData!['Throttle'] || [];
        const brake = telemetryData!['Brake Pos'] || telemetryData!['Brake'] || [];

        ctx.save();

        // Final Transform: Centering + Scale + Rotate + Offset
        // If cameraMode is NOT static, we handled the "centering" by setting view.x/y such that the car is at origin.
        // But to be more robust with rotation, we can apply the rotation at screen center.
        ctx.translate(width / 2 + x, height / 2 + y);
        // Force rotation for minimaps and sidebar to be strictly static/North-Up
        const activeRotation = (isMiniMap || !isExpanded) ? optimalRotation : rotation;
        ctx.rotate(activeRotation * Math.PI / 180);
        ctx.scale(k, -k);

        // --- 1. Draw Reference Track Surface (Filled Area) ---
        if (referenceTrack.leftEdges.length > 1) {
            ctx.fillStyle = '#0a0a0c'; // Much darker track surface
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // Brighter borders for better visibility
            ctx.lineWidth = 3 / k; // Thicker border

            for (let i = 0; i < referenceTrack.leftEdges.length - 1; i++) {
                if (!referenceTrack.drawFlags[i] || !referenceTrack.drawFlags[i + 1]) continue;

                let isFaded = false;
                if (selectedSegIdx !== null) {
                    const lapsInStint = laps.filter(l => l.stint === selectedStint);
                    const fastestValidLap = lapsInStint.filter(l => l.isValid).sort((a, b) => a.duration - b.duration)[0] || lapsInStint[0] || laps[0];
                    const baseTrackLapTimes = miniSectorState?.allLapsMiniSectorTimes?.[fastestValidLap?.lap];
                    const baseTrackSegTime = baseTrackLapTimes?.[selectedSegIdx];
                    if (baseTrackSegTime) {
                        const idx = referenceTrack.originalIndices[i];
                        if (idx < baseTrackSegTime.startIdx || idx > baseTrackSegTime.endIdx) {
                            isFaded = true;
                        }
                    }
                }

                if (isFaded) {
                    ctx.globalAlpha = 0.015;
                } else {
                    ctx.globalAlpha = 1.0;
                }

                const l1 = referenceTrack.leftEdges[i];
                const l2 = referenceTrack.leftEdges[i + 1];
                const r1 = referenceTrack.rightEdges[i];
                const r2 = referenceTrack.rightEdges[i + 1];

                ctx.beginPath();
                ctx.moveTo(l1.x, l1.y);
                ctx.lineTo(l2.x, l2.y);
                ctx.lineTo(r2.x, r2.y);
                ctx.lineTo(r1.x, r1.y);
                ctx.closePath();

                ctx.fillStyle = '#0a0a0c';
                ctx.fill();

                // Edge lines (Only if NOT minimap)
                if (!isMiniMap) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.beginPath();
                    ctx.moveTo(l1.x, l1.y); ctx.lineTo(l2.x, l2.y);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1.0; // Reset
            }
        }

        // --- 2. Draw Current Racing Line with Heatmap ---
        ctx.lineWidth = 3 / k;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < racingLine.points.length - 1; i++) {
            const p1 = racingLine.points[i];
            const p2 = racingLine.points[i + 1];
            const idx = racingLine.originalIndices[i];

            let isFaded = false;
            if (selectedSegIdx !== null) {
                const curTimes = miniSectorState?.currentLapMiniSectorTimes;
                const segTime = curTimes?.[selectedSegIdx];
                if (segTime) {
                    if (idx < segTime.startIdx || idx > segTime.endIdx) {
                        isFaded = true;
                    }
                }
            }

            // Safety: Skip extreme teleportation jumps (> 200m)
            const d2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
            if (d2 > (200 / 111320) ** 2) continue;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);

            const b = (brake && Array.isArray(brake)) ? (brake[idx] || 0) : 0;
            const t = (throttle && Array.isArray(throttle)) ? (throttle[idx] || 0) : 0;

            if (isMiniMap) {
                let color = 'rgba(150, 150, 150, 0.8)'; // Default gray
                if (showMiniSectors) {
                    const curTimes = miniSectorState?.currentLapMiniSectorTimes;
                    const refTimes = miniSectorState?.refLapMiniSectorTimes;
                    const hasReference = referenceLapIdx !== null || referenceLap !== null;
                    
                    if (curTimes && curTimes.length > 0) {
                        let miniSectorId = -1;
                        for (let s = 0; s < curTimes.length; s++) {
                            const seg = curTimes[s];
                            if (idx >= seg.startIdx && idx <= seg.endIdx) {
                                miniSectorId = s;
                                break;
                            }
                        }
                        
                        if (miniSectorId !== -1) {
                            if (hasReference && refTimes && refTimes[miniSectorId]) {
                                const curDur = curTimes[miniSectorId].duration;
                                const refDur = refTimes[miniSectorId].duration;
                                if (curDur > 0 && refDur > 0) {
                                    if (curDur < refDur - 0.001) color = '#3b82f6';
                                    else if (curDur > refDur + 0.001) color = '#fbbf24';
                                    else color = '#ffffff';
                                }
                            } else {
                                const bests = miniSectorState?.sessionMiniSectorBests?.bests;
                                if (bests && bests[miniSectorId]) {
                                    const curDur = curTimes[miniSectorId].duration;
                                    const bestDur = bests[miniSectorId].val;
                                    if (curDur > 0 && bestDur > 0) {
                                        if (curDur <= bestDur + 0.001) color = '#ffffff';
                                        else color = '#fb923c';
                                    }
                                }
                            }
                        }
                    }
                } else {
                    if (sectorColors && sectorBreakpoints) {
                        let sectorId = 0;
                        for (let b = 0; b < sectorBreakpoints.length; b++) {
                            if (i <= sectorBreakpoints[b].index) {
                                sectorId = sectorBreakpoints[b].id;
                                break;
                            }
                            if (b === sectorBreakpoints.length - 1) {
                                sectorId = sectorBreakpoints[b].id;
                            }
                        }
                        color = sectorColors[sectorId] || color;
                    }
                }
                ctx.strokeStyle = color;
            } else {
                const r = Math.min(255, Math.floor(b * 2.55));
                const g = Math.min(255, Math.floor(t * 2.55));

                // Coasting: White if both throttle and brake are near zero
                if (r < 15 && g < 15) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                } else {
                    const bVal = 20;
                    ctx.strokeStyle = `rgb(${r}, ${g}, ${bVal})`;
                }
            }

            if (isFaded) {
                ctx.globalAlpha = 0.02;
            } else {
                ctx.globalAlpha = 1.0;
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0; // Reset
        }

        // --- 3. Draw Reference Racing Line (Dashed Golden-Yellow) - ON TOP ---
        if (trackData.referenceRacingLine && !isMiniMap) {
            ctx.save();
            ctx.setLineDash([4 / k, 4 / k]);
            ctx.lineWidth = 2 / k;
            ctx.strokeStyle = '#daa520';
            ctx.shadowBlur = 6 / k;
            ctx.shadowColor = '#daa520';

            const hasRealRef = referenceLapIdx !== null || referenceLap !== null;

            let first = true;
            let currentFaded: boolean | null = null;

            for (let i = 0; i < trackData.referenceRacingLine.points.length; i++) {
                const p = trackData.referenceRacingLine.points[i];
                const idx = trackData.referenceRacingLine.originalIndices[i];
                
                let draw = true;
                let isFaded = false;

                if (selectedSegIdx !== null) {
                    if (hasRealRef) {
                        const refTimes = miniSectorState?.refLapMiniSectorTimes;
                        const refSegTime = refTimes?.[selectedSegIdx];
                        if (refSegTime) {
                            if (idx < refSegTime.startIdx || idx > refSegTime.endIdx) {
                                isFaded = true;
                            }
                        }
                    } else {
                        // 隱式比較 (選中區間的最速圈)
                        const best = miniSectorState?.sessionMiniSectorBests?.bests[selectedSegIdx];
                        if (best) {
                            const bestLapTimes = miniSectorState?.allLapsMiniSectorTimes?.[best.lap];
                            const bestLapSegTime = bestLapTimes?.[selectedSegIdx];
                            if (bestLapSegTime) {
                                if (idx < bestLapSegTime.startIdx || idx > bestLapSegTime.endIdx) {
                                    draw = false;
                                }
                            }
                        }
                    }
                }

                if (draw) {
                    if (currentFaded !== isFaded) {
                        if (!first) {
                            ctx.stroke();
                        }
                        ctx.beginPath();
                        ctx.globalAlpha = isFaded ? 0.02 : 1.0;
                        ctx.moveTo(p.x, p.y);
                        first = false;
                        currentFaded = isFaded;
                    } else {
                        if (first) {
                            ctx.beginPath();
                            ctx.globalAlpha = isFaded ? 0.02 : 1.0;
                            ctx.moveTo(p.x, p.y);
                            first = false;
                            currentFaded = isFaded;
                        } else {
                            ctx.lineTo(p.x, p.y);
                        }
                    }
                } else {
                    if (!first) {
                        ctx.stroke();
                        first = true;
                        currentFaded = null;
                    }
                }
            }
            if (!first) {
                ctx.stroke();
            }
            ctx.restore();
        }

        // --- 3.5 Draw Sector and Finish Boundaries ---
        const sectorsSource = (track3DData || staticTrackBaseData)?.trackSectors;
        if (trackData) {
            ctx.save();
            // Scale thickness based on mode and zoom to maintain visibility
            const baseThickness = isMiniMap ? 3.0 : 6.0;
            ctx.lineWidth = baseThickness / k;
            ctx.strokeStyle = '#ffff00'; // Yellow
            ctx.fillStyle = '#ffff00';

            const degM = 111320;

            const drawBoundary = (
                leftPt: { x: number; y: number },
                rightPt: { x: number; y: number },
                dx: number,
                dy: number,
                nx: number,
                ny: number,
                label: string,
                isFinishOverride?: boolean
            ) => {
                const isFinish = isFinishOverride !== undefined ? isFinishOverride : (label === 'S1');

                ctx.strokeStyle = isFinish ? '#ffffff' : '#ffff00';
                ctx.fillStyle = isFinish ? '#ffffff' : '#ffff00';

                // Determine how much to protrude beyond the track edges on both sides
                const extraLen = isMiniMap ? 25.0 : (isFinish ? 6.0 : 4.0);

                ctx.lineCap = 'butt';

                // Use physical meters for thickness in main map (e.g., 8.0 meters thick)
                // Minimap: Use a thinner line (e.g., 2.5 / k)
                ctx.lineWidth = isMiniMap ? (2.5 / k) : ((isFinish && !isMiniMap) ? (8.0 / degM) : (4 / k));
                const forwardShift = (isFinish && !isMiniMap) ? (2 / degM) : 0;

                // Calculate protruding coordinates beyond track boundaries
                const pLeftX = leftPt.x + nx * (extraLen / degM) + dx * forwardShift;
                const pLeftY = leftPt.y + ny * (extraLen / degM) + dy * forwardShift;
                const pRightX = rightPt.x - nx * (extraLen / degM) + dx * forwardShift;
                const pRightY = rightPt.y - ny * (extraLen / degM) + dy * forwardShift;

                // Draw perpendicular line
                ctx.beginPath();
                ctx.moveTo(pLeftX, pLeftY);
                ctx.lineTo(pRightX, pRightY);
                ctx.stroke();

                // 2. Labels - Only in main map
                if (!isMiniMap) {
                    const forwardOffset = 30 / effK;
                    const labelExtra = 12 / effK;

                    // Place label slightly further out from the left edge line
                    const textX = leftPt.x + nx * ((extraLen / degM) + labelExtra) + dx * forwardOffset;
                    const textY = leftPt.y + ny * ((extraLen / degM) + labelExtra) + dy * forwardOffset;

                    ctx.save();
                    // First move to the location in map degrees (within the current k/-k/rotate transform)
                    ctx.translate(textX, textY);

                    // Capture the resulting screen-pixel coordinates using the context matrix
                    const matrix = ctx.getTransform();

                    // Reset to identity but keep the screen position
                    ctx.setTransform(1, 0, 0, 1, matrix.e, matrix.f);

                    ctx.font = `bold 18px Inter, "Segoe UI", sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = isFinish ? '#ffffff' : '#ffff00';
                    ctx.fillText(label, 0, 0);
                    ctx.restore();
                }
            };

            const drawSegmentBadge = (leftPt: { x: number; y: number }, nx: number, ny: number, label: string, isLast?: boolean, color?: string, diffText?: string, isSelected?: boolean) => {
                if (isMiniMap) return;

                const labelColor = color || '#ffffff';
                const labelBg = 'rgba(26, 26, 30, 0.95)';
                
                const baseRadius = isMapMaximized ? 15 : 11;
                const radius = isSelected ? baseRadius * 1.5 : baseRadius;
                
                const baseFontSize = isMapMaximized ? 14 : 11;
                const fontSize = isSelected ? baseFontSize * 1.5 : baseFontSize;
                
                const offsetInDeg = ((isMapMaximized ? 24 : 18) * (isSelected ? 1.5 : 1)) / effK;

                const bx = leftPt.x + nx * offsetInDeg;
                const by = leftPt.y + ny * offsetInDeg;

                ctx.save();
                ctx.translate(bx, by);

                const matrix = ctx.getTransform();
                
                // Record the click region
                badgeClickRegionsRef.current.push({
                    index: parseInt(label, 10) - 1,
                    x: matrix.e,
                    y: matrix.f,
                    r: radius
                });

                ctx.setTransform(1, 0, 0, 1, matrix.e, matrix.f);

                const radiusVal = radius;

                ctx.beginPath();
                ctx.arc(0, 0, radiusVal, 0, 2 * Math.PI);
                ctx.fillStyle = labelBg;
                ctx.fill();

                ctx.lineWidth = isSelected ? 2.25 : 1.5;
                ctx.strokeStyle = labelColor;
                ctx.shadowBlur = isSelected ? 6 : 4;
                ctx.shadowColor = labelColor;
                ctx.stroke();

                ctx.shadowBlur = 0;
                ctx.font = `bold ${fontSize}px Inter, "Segoe UI", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = labelColor;
                ctx.fillText(label, 0, 0);

                if (diffText) {
                    ctx.font = `bold ${fontSize - 1}px Inter, "Segoe UI", sans-serif`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    
                    const textWidth = ctx.measureText(diffText).width;
                    const capHeight = radiusVal * 1.5;
                    const capPadding = isSelected ? 16 : 12;
                    const capWidth = textWidth + capPadding;

                    // Calculate screen-space normal vector to determine which side is away from the track
                    const screenNx = matrix.a * nx + matrix.c * ny;
                    const screenNy = matrix.b * nx + matrix.d * ny;
                    const len = Math.sqrt(screenNx * screenNx + screenNy * screenNy) || 1;
                    const normalX = screenNx / len;

                    const placeOnRight = normalX >= 0;
                    
                    const capX = placeOnRight 
                        ? radiusVal + (isSelected ? 8 : 6)
                        : -(radiusVal + (isSelected ? 8 : 6) + capWidth);
                        
                    const capY = -capHeight / 2;
                    
                    ctx.beginPath();
                    const r = 4;
                    ctx.moveTo(capX + r, capY);
                    ctx.lineTo(capX + capWidth - r, capY);
                    ctx.quadraticCurveTo(capX + capWidth, capY, capX + capWidth, capY + r);
                    ctx.lineTo(capX + capWidth, capY + capHeight - r);
                    ctx.quadraticCurveTo(capX + capWidth, capY + capHeight, capX + capWidth - r, capY + capHeight);
                    ctx.lineTo(capX + r, capY + capHeight);
                    ctx.quadraticCurveTo(capX, capY + capHeight, capX, capY + capHeight - r);
                    ctx.lineTo(capX, capY + r);
                    ctx.quadraticCurveTo(capX, capY, capX + r, capY);
                    ctx.closePath();
                    
                    ctx.fillStyle = 'rgba(26, 26, 30, 0.95)';
                    ctx.fill();
                    
                    ctx.lineWidth = isSelected ? 1.5 : 1;
                    ctx.strokeStyle = labelColor;
                    ctx.stroke();
                    
                    ctx.fillStyle = labelColor;
                    ctx.fillText(diffText, capX + (isSelected ? 8 : 6), 0);
                }

                ctx.restore();
            };

            // Draw All Boundaries (Finish Line + Sectors or Mini Sectors)
            if (showMiniSectors) {
                const referenceTrack = trackData.referenceTrack;
                const dists = telemetryData ? (telemetryData['Lap Dist'] || telemetryData['Distance']) : null;
                
                if (miniSectors && miniSectors.length > 0 && dists && referenceTrack.points.length > 0) {
                    const len = referenceTrack.points.length;
                    const distStart = dists[referenceTrack.originalIndices[0]] || 0;
                    const distEnd = dists[referenceTrack.originalIndices[len - 1]] || distStart;
                    const actualLen = distEnd - distStart;
                    
                    const refLen = miniSectors[miniSectors.length - 1].end;
                    const stretchRatio = actualLen > 0 ? refLen / actualLen : 1;
                    
                    // 1. Draw segment boundary splitting lines (without text label on line)
                    miniSectors.forEach((seg: any, idx: number) => {
                        if (selectedSegIdx !== null) {
                            const startBoundaryIdx = (selectedSegIdx - 1 + miniSectors.length) % miniSectors.length;
                            if (idx !== selectedSegIdx && idx !== startBoundaryIdx) return;
                        }

                        const targetDist = seg.end;
                        
                        let bestI = 0;
                        let minDist = Infinity;
                        
                        for (let i = 0; i < len; i++) {
                            const rawDist = dists[referenceTrack.originalIndices[i]];
                            if (rawDist === undefined) continue;
                            const curDist = (rawDist - distStart) * stretchRatio;
                            const d = Math.abs(curDist - targetDist);
                            if (d < minDist) {
                                minDist = d;
                                bestI = i;
                            }
                        }
                        
                        const leftPt = referenceTrack.leftEdges[bestI];
                        const rightPt = referenceTrack.rightEdges[bestI];
                        
                        const sampleRange = 20;
                        const p1 = referenceTrack.points[Math.max(0, bestI - sampleRange)];
                        const p2 = referenceTrack.points[Math.min(len - 1, bestI + sampleRange)];
                        const lineLen = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) || 1;
                        const dx = (p2.x - p1.x) / lineLen;
                        const dy = (p2.y - p1.y) / lineLen;
                        const nx = -dy, ny = dx;
                        
                        const isFinish = idx === miniSectors.length - 1;
                        drawBoundary(leftPt, rightPt, dx, dy, nx, ny, "", isFinish);
                    });

                    // 2. Draw badges at the center of each segment
                    miniSectors.forEach((seg: any, idx: number) => {
                        if (selectedSegIdx !== null && selectedSegIdx !== idx) return;

                        const startDist = idx === 0 ? 0 : miniSectors[idx - 1].end;
                        const endDist = seg.end;
                        const midDist = (startDist + endDist) / 2;

                        let midI = 0;
                        let minDist = Infinity;
                        for (let i = 0; i < len; i++) {
                            const rawDist = dists[referenceTrack.originalIndices[i]];
                            if (rawDist === undefined) continue;
                            const curDist = (rawDist - distStart) * stretchRatio;
                            const d = Math.abs(curDist - midDist);
                            if (d < minDist) {
                                minDist = d;
                                midI = i;
                            }
                        }

                        const isRightSide = seg.badgeSide === 'right';
                        const edgePt = isRightSide ? referenceTrack.rightEdges[midI] : referenceTrack.leftEdges[midI];

                        const sampleRange = 20;
                        const p1 = referenceTrack.points[Math.max(0, midI - sampleRange)];
                        const p2 = referenceTrack.points[Math.min(len - 1, midI + sampleRange)];
                        const lineLen = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) || 1;
                        const dx = (p2.x - p1.x) / lineLen;
                        const dy = (p2.y - p1.y) / lineLen;
                        let nx = -dy, ny = dx;
                        if (isRightSide) {
                            nx = dy;
                            ny = -dx;
                        }

                        const badgeNumber = seg.name.replace(/[^\d]/g, '') || String(idx + 1);
                        const isLast = idx === miniSectors.length - 1;

                        let badgeColor = '#ffffff';
                        const hasReference = referenceLapIdx !== null || referenceLap !== null;
                        if (hasReference && miniSectorState) {
                            const val = miniSectorState.currentLapMiniSectorTimes?.[idx]?.duration;
                            const refVal = miniSectorState.refLapMiniSectorTimes?.[idx]?.duration;
                            if (val !== undefined && val > 0 && refVal !== undefined && refVal > 0) {
                                const isFaster = val <= refVal;
                                badgeColor = isFaster ? '#3b82f6' : '#fb923c'; // 快用藍色，慢用橘黃色
                            }
                        } else if (!hasReference && miniSectorState) {
                            const val = miniSectorState.currentLapMiniSectorTimes?.[idx]?.duration;
                            const bestVal = miniSectorState.sessionMiniSectorBests?.bests[idx]?.val || 0;
                            if (val !== undefined && val > 0 && bestVal > 0) {
                                const isBest = val <= bestVal;
                                if (!isBest) {
                                    badgeColor = '#fb923c'; // 慢了就用橘黃色
                                }
                            }
                        }

                        // Calculate diff text if this is the selected segment
                        let diffText: string | undefined = undefined;
                        const isSelected = selectedSegIdx === idx;
                        if (isSelected && miniSectorState) {
                            const val = miniSectorState.currentLapMiniSectorTimes?.[idx]?.duration;
                            const hasReference = referenceLapIdx !== null || referenceLap !== null;
                            if (hasReference) {
                                const refVal = miniSectorState.refLapMiniSectorTimes?.[idx]?.duration;
                                if (val !== undefined && val > 0 && refVal !== undefined && refVal > 0) {
                                    const diff = val - refVal;
                                    diffText = diff >= 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3);
                                }
                            } else {
                                const bestVal = miniSectorState.sessionMiniSectorBests?.bests[idx]?.val || 0;
                                if (val !== undefined && val > 0 && bestVal > 0) {
                                    const diff = Math.max(0, val - bestVal);
                                    diffText = `+${diff.toFixed(3)}`;
                                }
                            }
                        }

                        drawSegmentBadge(edgePt, nx, ny, badgeNumber, isLast, badgeColor, diffText, isSelected);
                    });
                }
            } else if (sectorsSource) {
                sectorsSource.forEach(sector => {
                    const proj = project(sector.lat, sector.lon);
                    const px = proj.x, py = proj.y;

                    let dx = sector.dx, dy = sector.dy;
                    const n = trackData.referenceTrack.points.length;
                    let bestIdx = 0, minDist = Infinity;
                    for (let i = 0; i < n; i++) {
                        const p = trackData.referenceTrack.points[i];
                        const d = (p.x - px) ** 2 + (p.y - py) ** 2;
                        if (d < minDist) { minDist = d; bestIdx = i; }
                    }

                    // Fallback to search if backend didn't provide vectors (backwards compatibility)
                    if (dx === undefined || dy === undefined || sector.id === 0) {
                        const isFinish = sector.id === 0;

                        if (isFinish && n > 5) {
                            // MATCH 3D LOGIC: For finish line, use strictly points 0 and 5 for a straight start
                            const p1 = trackData.referenceTrack.points[0];
                            const p2 = trackData.referenceTrack.points[5];
                            const len = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) || 1;
                            dx = (p2.x - p1.x) / len; dy = (p2.y - p1.y) / len;
                        } else {
                            const sampleRange = 20;
                            const p1 = trackData.referenceTrack.points[(bestIdx - sampleRange + n) % n];
                            const p2 = trackData.referenceTrack.points[(bestIdx + sampleRange) % n];
                            const len = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) || 1;
                            dx = (p2.x - p1.x) / len; dy = (p2.y - p1.y) / len;
                        }
                    }
                    const nx = -dy, ny = dx;

                    const leftPt = trackData.referenceTrack.leftEdges[bestIdx];
                    const rightPt = trackData.referenceTrack.rightEdges[bestIdx];

                    drawBoundary(leftPt, rightPt, dx, dy, nx, ny, `S${sector.id + 1}`);
                });
            }

            ctx.restore();
        }

        // --- 4. Draw Start/Finish Flag (Removed, replaced by line above) ---


        // --- 5. Draw Dynamic Cursors ---

        ctx.restore();

    }, [trackData, dimensions, view, telemetryData, flagImage, referenceLapIdx, isMiniMap, cameraMode, followZoom, optimalRotation, forcedRotation, isExpanded, dashboardSyncMode, mapMarkerType, staticTrackBaseData, track3DData, sectorColors, sectorBreakpoints, showMiniSectors, miniSectors, selectedSegIdx, miniSectorState, laps, selectedStint, getHeadingAtIdx, isAnimating]);

    useEffect(() => {
        drawTrack();
    }, [drawTrack]);

    const drawCursors = useCallback(() => {
        const canvas = cursorCanvasRef.current;
        if (!canvas || !trackData || isAnimating) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = dimensions;
        if (width === 0 || height === 0) return;

        // A. Calculate Effective View for this frame
        let effX = view.x;
        let effY = view.y;
        let effK = view.k;
        let effRot = view.rotation;

        const isFollowMode = !isMiniMap && cameraMode !== 'static';
        const activeCursorIdx = isPlayingRef.current ? (smoothCursorIndexRef.current ?? cursorIndexRef.current) : cursorIndexRef.current;

        if (isFollowMode && activeCursorIdx !== null) {
            const baseIdx = Math.floor(activeCursorIdx);
            const lats = telemetryData['GPS Latitude'];
            const lons = telemetryData['GPS Longitude'];

            if (lats && lons && lats[baseIdx] !== undefined) {
                const nextIdx = (baseIdx + 1) % lats.length;
                const frac = activeCursorIdx - baseIdx;
                const clat = lats[baseIdx] + (lats[nextIdx] - lats[baseIdx]) * frac;
                const clon = lons[baseIdx] + (lons[nextIdx] - lons[baseIdx]) * frac;

                const worldX = (clon - trackData.center.lon) * trackData.center.lonScale;
                const worldY = (clat - trackData.center.lat);

                effK = 10000 + followZoom * 5000;

                const heading = getHeadingAtIdx(activeCursorIdx, telemetryData);
                const targetRot = cameraMode === 'heading-up' ? -heading : (forcedRotation ?? optimalRotation);
                let diff = (targetRot - smoothRotation.current) % 360;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                smoothRotation.current += diff * 0.15;
                effRot = smoothRotation.current;

                const rad = effRot * Math.PI / 180;
                const cos = Math.cos(rad), sin = Math.sin(rad);
                effX = -effK * (worldX * cos + worldY * sin);
                effY = -effK * (worldX * sin - worldY * cos);
            }
        } else if (isMiniMap || !isExpanded) {
            effRot = optimalRotation;
        }

        // B. Begin Cursor Drawing
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2 + effX, height / 2 + effY);
        const activeRotation = (isMiniMap || !isExpanded) ? optimalRotation : effRot;
        ctx.rotate(activeRotation * Math.PI / 180);
        ctx.scale(effK, -effK);

        const drawCursorAtIdx = (idx: number, color: string, radius: number, glow: boolean, sourceData: any, isArrow: boolean) => {
            const baseIdx = Math.floor(idx);
            const latitudeArray = sourceData['GPS Latitude'];
            if (!latitudeArray || latitudeArray.length === 0) return;
            const nextIdx = (baseIdx + 1) % latitudeArray.length;
            const frac = idx - baseIdx;

            const lat1 = sourceData['GPS Latitude']?.[baseIdx];
            const lon1 = sourceData['GPS Longitude']?.[baseIdx];
            const lat2 = sourceData['GPS Latitude']?.[nextIdx];
            const lon2 = sourceData['GPS Longitude']?.[nextIdx];

            if (lat1 === undefined || lon1 === undefined || lat1 === 0 || lon1 === 0) return;

            const clat = lat1 + (lat2 - lat1) * frac;
            const clon = lon1 + (lon2 - lon1) * frac;

            const cpx = (clon - trackData.center.lon) * trackData.center.lonScale;
            const cpy = (clat - trackData.center.lat);

            if (isArrow) {
                const heading = getHeadingAtIdx(idx, sourceData);
                ctx.save();
                ctx.translate(cpx, cpy);
                ctx.rotate(-heading * Math.PI / 180);
                ctx.scale(1 / effK, 1 / effK);

                const size = radius * 2.2;
                ctx.beginPath();
                ctx.moveTo(0, size);
                ctx.lineTo(-size * 0.7, -size * 0.8);
                ctx.lineTo(0, -size * 0.3);
                ctx.lineTo(size * 0.7, -size * 0.8);
                ctx.closePath();

                if (glow === false) {
                    ctx.globalAlpha = 0.85;
                }

                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2.5;
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.save();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = (isMiniMap ? 1 : 2) / effK;
                ctx.beginPath();
                ctx.arc(cpx, cpy, (radius + (isMiniMap ? 0.5 : 1)) / effK, 0, Math.PI * 2);
                ctx.stroke();

                if (glow) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 20;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(cpx, cpy, radius / effK, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 40;
                    ctx.globalAlpha = 0.5;
                    ctx.fill();
                } else {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(cpx, cpy, radius / effK, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        };

        if (activeCursorIdx !== null && telemetryData) {
            const cursorColor = "#3b82f6";
            const radius = isMiniMap ? 3.5 : 8;
            const currentMarkerType = isMiniMap ? 'dot' : mapMarkerType;
            drawCursorAtIdx(activeCursorIdx, cursorColor, radius, !isMiniMap, telemetryData, currentMarkerType === 'arrow');

            const storeState = useTelemetryStore.getState();
            const activeRefIdx = (dashboardSyncMode === 'distance' && selectedSegIdx === null) ? storeState.referenceDeltaIndex : storeState.referenceCursorIndex;
            const hasRealRef = referenceLapIdx !== null || referenceLap !== null;

            if (hasRealRef && trackData.referenceRacingLine && activeRefIdx !== null) {
                const refData = referenceTelemetryData || telemetryData;
                const refCursorColor = isMiniMap ? "rgba(200, 200, 200, 1.0)" : "#ffc800ff";
                const refRadius = isMiniMap ? 3.5 : 6.5;
                drawCursorAtIdx(activeRefIdx, refCursorColor, refRadius, false, refData, currentMarkerType === 'arrow');
            } else if (!hasRealRef && selectedSegIdx !== null && miniSectorState?.sessionMiniSectorBests) {
                const autoCompareIdx = getAutoCompareSyncIdx();
                if (autoCompareIdx !== null) {
                    const best = miniSectorState.sessionMiniSectorBests.bests[selectedSegIdx];
                    if (best) {
                        const bestLapTimes = miniSectorState.allLapsMiniSectorTimes?.[best.lap];
                        const bestLapSegTime = bestLapTimes?.[selectedSegIdx];
                        if (bestLapSegTime && autoCompareIdx >= bestLapSegTime.startIdx && autoCompareIdx <= bestLapSegTime.endIdx) {
                            const refCursorColor = isMiniMap ? "rgba(200, 200, 200, 1.0)" : "#ffc800ff";
                            const refRadius = isMiniMap ? 3.5 : 6.5;
                            drawCursorAtIdx(autoCompareIdx, refCursorColor, refRadius, false, telemetryData, currentMarkerType === 'arrow');
                        }
                    }
                }
            }
        }

        ctx.restore();
    }, [trackData, dimensions, view, telemetryData, referenceLapIdx, referenceLap, referenceTelemetryData, dashboardSyncMode, mapMarkerType, isMiniMap, cameraMode, followZoom, forcedRotation, isExpanded, selectedSegIdx, miniSectorState, getAutoCompareSyncIdx, getHeadingAtIdx, isAnimating]);

    useEffect(() => {
        drawCursors();
    }, [drawCursors]);

    useEffect(() => {
        const unsubscribe = useTelemetryStore.subscribe((state) => {
            const prevCursor = cursorIndexRef.current;
            const prevSmooth = smoothCursorIndexRef.current;
            cursorIndexRef.current = state.cursorIndex;
            smoothCursorIndexRef.current = state.smoothCursorIndex;
            playbackElapsedRef.current = state.playbackElapsed;
            isPlayingRef.current = state.isPlaying;

            // Only schedule a rAF draw if cursor actually changed
            const cursorChanged = state.cursorIndex !== prevCursor || state.smoothCursorIndex !== prevSmooth;
            if (!cursorChanged) return;

            if (cursorRafRef.current) return; // already scheduled this frame
            cursorRafRef.current = requestAnimationFrame(() => {
                cursorRafRef.current = 0;
                const currentCameraMode = useTelemetryStore.getState().cameraMode;
                const isFollowMode = !isMiniMap && (isMiniMap || !isExpanded ? 'static' : currentCameraMode) !== 'static';
                if (isFollowMode) {
                    drawTrack();
                }
                drawCursors();
            });
        });
        return () => {
            unsubscribe();
            if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
        };
    }, [drawCursors, drawTrack, isMiniMap, isExpanded]);

    const handleWheel = (e: React.WheelEvent) => {
        // Allow scroll events on UI panels
        if (e.target instanceof Element && e.target.closest('.pointer-events-auto')) return;

        e.preventDefault();
        if (isMiniMap) return;

        // If in follow/heading-up mode, wheel controls followZoom instead of static map zoom
        if (cameraMode !== 'static') {
            const step = 2;
            const direction = e.deltaY > 0 ? -step : step;
            const nextZoom = Math.max(1, Math.min(100, followZoom + direction));
            setFollowZoom(nextZoom);
            return;
        }

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // 1. Mouse position relative to center of canvas
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;

        const scaleFactor = 1.1;
        const direction = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor;
        const newK = view.k * direction;

        const nextX = mouseX - (mouseX - view.x) * direction;
        const nextY = mouseY - (mouseY - view.y) * direction;

        setView(v => ({
            ...v,
            k: newK,
            x: nextX,
            y: nextY
        }));
    };

    const handleBadgeClick = (clickX: number, clickY: number) => {
        if (!miniSectorState || !miniSectorState.currentLapMiniSectorTimes) return;
        const region = badgeClickRegionsRef.current.find(r => {
            const dx = clickX - r.x;
            const dy = clickY - r.y;
            return dx * dx + dy * dy <= r.r * r.r;
        });

        if (!region) return;

        const idx = region.index;
        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        const timeChan = telemetryData?.['Time'];

        if (selectedSegIdx === idx) {
            // Deselecting: pause and reset to start of lap
            setIsSegmentLoading(true);
            if (isPlaying) {
                togglePlayback();
            }
            setTimeout(() => {
                setSelectedSegIdx(null);
                setZoomRange(null);
                setPlaybackTime(0);
                setIsSegmentLoading(false);
            }, 500);
            return;
        }

        const curTimes = miniSectorState.currentLapMiniSectorTimes;
        const segTime = curTimes[idx];
        if (!segTime || !currentLap || !timeChan) return;

        setIsSegmentLoading(true);
        if (isPlaying) {
            togglePlayback();
        }

        // Calculate absolute start and offset
        const absStart = timeChan[segTime.startIdx];
        const segStartElapsed = absStart !== undefined ? Math.max(0, absStart - currentLap.startTime) : 0;

        setTimeout(() => {
            setSelectedSegIdx(idx);
            setZoomRange([segTime.startIdx, segTime.endIdx]);
            setPlaybackTime(segStartElapsed);
            setIsSegmentLoading(false);
        }, 500);
    };

    const handleSegmentNavigation = (idx: number) => {
        if (!miniSectorState || !miniSectorState.currentLapMiniSectorTimes) return;
        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        const timeChan = telemetryData?.['Time'] || telemetryData['GPS Time'];
        const curTimes = miniSectorState.currentLapMiniSectorTimes;
        const segTime = curTimes[idx];
        if (!segTime || !currentLap || !timeChan) return;

        setIsSegmentLoading(true);
        if (isPlaying) {
            togglePlayback();
        }

        const absStart = timeChan[segTime.startIdx];
        const segStartElapsed = absStart !== undefined ? Math.max(0, absStart - currentLap.startTime) : 0;

        setTimeout(() => {
            setSelectedSegIdx(idx);
            setZoomRange([segTime.startIdx, segTime.endIdx]);
            setPlaybackTime(segStartElapsed);
            setIsSegmentLoading(false);
        }, 500);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // Left Click -> Rotate/Click
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                clickStartRef.current = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    time: Date.now()
                };
            }
            if (isMiniMap || !allowRotation) return; // Disable rotation if mini-map or explicitly disallowed
            setIsRotating(true);
            if (rect) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const dx = e.clientX - rect.left - centerX;
                const dy = e.clientY - rect.top - centerY;
                startAngle.current = Math.atan2(dy, dx) * 180 / Math.PI;
                startViewRotation.current = view.rotation;
                // Store initial offsets to rotate them around screen center
                startViewPos.current = { x: view.x, y: view.y };
            }
        } else if (e.button === 2) { // Right Click -> Drag (Pan)
            setIsDragging(true);
            lastPos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isRotating) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const dx = e.clientX - rect.left - centerX;
                const dy = e.clientY - rect.top - centerY;
                const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
                const deltaDeg = currentAngle - startAngle.current;
                const deltaRad = deltaDeg * Math.PI / 180;

                // Rotate the offset vector around (0,0) which is screen center in this context
                const cosA = Math.cos(deltaRad);
                const sinA = Math.sin(deltaRad);
                const startX = startViewPos.current.x;
                const startY = startViewPos.current.y;

                const nextX = startX * cosA - startY * sinA;
                const nextY = startX * sinA + startY * cosA;

                setView(v => ({
                    ...v,
                    rotation: startViewRotation.current + deltaDeg,
                    x: nextX,
                    y: nextY
                }));
            }
        } else if (isDragging) {
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            lastPos.current = { x: e.clientX, y: e.clientY };
            setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
        } else {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const insideBadge = badgeClickRegionsRef.current.some(r => {
                    const dx = mouseX - r.x;
                    const dy = mouseY - r.y;
                    return dx * dx + dy * dy <= r.r * r.r;
                });

                const target = e.currentTarget as HTMLElement;
                if (target) {
                    if (insideBadge) {
                        target.style.cursor = 'pointer';
                    } else {
                        target.style.cursor = '';
                    }
                }
            }
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        setIsDragging(false);
        setIsRotating(false);

        if (e.button === 0 && clickStartRef.current) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                const dx = clickX - clickStartRef.current.x;
                const dy = clickY - clickStartRef.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const dt = Date.now() - clickStartRef.current.time;

                if (dist < 5 && dt < 250) {
                    handleBadgeClick(clickX, clickY);
                }
            }
        }
        clickStartRef.current = null;
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
        setIsRotating(false);
        clickStartRef.current = null;
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault(); // Disable default menu to allow right-click drag
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (e.target instanceof Element && e.target.closest('.pointer-events-auto')) return;
            e.preventDefault();
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const playbackProgress = useMemo(() => {
        const fallback = { progress: 0, currentTime: "00:00.000" };
        if (!telemetryData || !laps || selectedLapIdx === null) return fallback;

        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        if (!currentLap) return fallback;

        // Check if a mini-sector segment is selected
        let minPlayTime = 0;
        let maxPlayTime = 0;
        let isSegmentActive = false;

        if (selectedSegIdx !== null && miniSectorState?.currentLapMiniSectorTimes) {
            const segTime = miniSectorState.currentLapMiniSectorTimes[selectedSegIdx];
            const timeChan = telemetryData['Time'] || telemetryData['GPS Time'];
            if (segTime && timeChan) {
                const absStart = timeChan[segTime.startIdx];
                const absEnd = timeChan[segTime.endIdx];
                if (absStart !== undefined && absEnd !== undefined) {
                    minPlayTime = Math.max(0, absStart - currentLap.startTime);
                    maxPlayTime = Math.max(0, absEnd - currentLap.startTime);
                    isSegmentActive = true;
                }
            }
        }

        if (isSegmentActive) {
            const range = maxPlayTime - minPlayTime;
            if (range <= 0) return fallback;
            const progress = Math.min(1, Math.max(0, (playbackElapsed - minPlayTime) / range));
            return { progress, currentTime: formatLapTime(playbackElapsed) };
        } else {
            const refMeta = referenceLap || (referenceLapIdx !== null ? laps.find(l => l.lap === referenceLapIdx) : null);
            const curDur = currentLap?.duration || 0;
            const hasRefData = referenceTelemetryData || (telemetryData && referenceLapIdx !== null);
            const refDur = hasRefData && refMeta ? (refMeta.duration || 0) : 0;
            const maxDur = Math.max(curDur, refDur);

            if (maxDur === 0) return fallback;

            const progress = Math.min(1, Math.max(0, playbackElapsed / maxDur));
            return { progress, currentTime: formatLapTime(playbackElapsed) };
        }
    }, [telemetryData, referenceTelemetryData, referenceLap, referenceLapIdx, laps, selectedLapIdx, playbackElapsed, selectedSegIdx, miniSectorState]);

    if (!telemetryData) {
        return (
            <div className="bg-gray-800 rounded p-4 h-full flex items-center justify-center text-gray-500 text-xs">
                No Telemetry Data
            </div>
        );
    }
    const editHudMode = useTelemetryStore(state => state.editHudMode);
    const resetHudConfigs = useTelemetryStore(state => state.resetHudConfigs);

    // 3. carStats calculations moved to independent subcomponent TopCenterTelemetryHUD

    const [showHudMenu, setShowHudMenu] = useState(false);
    const hudMenuRef = useRef<HTMLDivElement>(null);

    // Handle Click Outside for HUD Menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (hudMenuRef.current && !hudMenuRef.current.contains(event.target as Node)) {
                setShowHudMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const PlaybackControlBar = useMemo(() => {
        if (isMiniMap || !telemetryData) return null;

        return (
            <div className={`absolute left-1/2 -translate-x-1/2 z-[1100] w-full pointer-events-none ${isExpanded ? 'bottom-6' : 'bottom-4'} ${isMapMaximized && maximizedSidebarMode === 'data_sources' ? 'opacity-80' : ''}`}>
                <motion.div
                    className={`mx-auto pointer-events-auto ${isExpanded ? 'px-4 w-fit' : 'max-w-max'}`}
                    onMouseEnter={() => setIsBarHovered(true)}
                    onMouseLeave={() => setIsBarHovered(false)}
                    initial="hidden"
                    animate={isBarHovered ? "hovered" : "visible"}
                    variants={controlBarVariants}
                    style={{
                        originY: "bottom",
                        willChange: "transform, opacity",
                        transform: "translateZ(0)"
                    }}
                >
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={innerContainerVariants}
                        className={`flex items-center bg-black/60 backdrop-blur-2xl glass-container pointer-events-auto mx-auto border border-white/10 ${isExpanded ? 'px-6 py-2.5 gap-4 rounded-full' : 'px-3 py-2 gap-2 rounded-[2rem]'}`}
                        style={{
                            isolation: 'isolate',
                            width: (() => {
                                const baseWidth = dimensions.width;
                                const maxPadding = Math.min(380, baseWidth * 0.28);
                                const leftPadding = isMapMaximized
                                    ? ((hudVisibility.analysisLaps || maximizedSidebarMode === 'data_sources') ? maxPadding : 20)
                                    : 20;
                                const rightPadding = (isMapMaximized && hudVisibility.dataCharts) ? maxPadding : 20;
                                const effectiveWidth = baseWidth - (leftPadding + rightPadding);
                                return isExpanded ? Math.min(896, Math.max(320, effectiveWidth)) : undefined;
                            })()
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 40 }}
                        onMouseMove={handleGlassMouseMove}
                    >
                        <div className="glass-content flex items-center w-full gap-2">
                            {isExpanded ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Tooltip text={isPlaying ? "PAUSE" : "PLAY"} position="top" className="rounded-full">
                                            <button
                                                onClick={togglePlayback}
                                                className={`transition-all rounded-full glass-container hover:scale-110 active:scale-95 border ${isPlaying ? 'bg-blue-600/20 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 border-transparent'}`}
                                                onMouseMove={handleGlassMouseMove}
                                            >
                                                <div className="glass-content p-2.5 flex items-center justify-center">
                                                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                                                </div>
                                            </button>
                                        </Tooltip>
                                        <div className="relative" ref={speedMenuRef}>
                                            <Tooltip text="SPEED" position="top">
                                                <button
                                                    onClick={() => setIsSpeedOpen(!isSpeedOpen)}
                                                    className={`bg-transparent border border-white/10 text-[10px] font-black rounded-lg transition-all min-w-[48px] glass-container hover:scale-110 active:scale-90 ${isSpeedOpen ? 'text-blue-400 bg-white/10 border-white/20' : 'text-gray-500 hover:text-white'}`}
                                                    onMouseMove={handleGlassMouseMove}
                                                >
                                                    <div className="glass-content px-2.5 py-1.5 flex flex-col items-center justify-center">
                                                        <span className="select-none">{playbackSpeed}x</span>
                                                    </div>
                                                </button>
                                            </Tooltip>
                                            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-16 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom ${isSpeedOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}>
                                                <div className="flex flex-col gap-1 p-1 bg-[#1a1a1e]/90 glass-container rounded-xl border border-white/10" onMouseMove={handleGlassMouseMove}>
                                                    <div className="glass-content w-full h-full flex flex-col">
                                                        {[4, 2, 1, 0.5].map(s => (
                                                            <button
                                                                key={s}
                                                                onClick={() => { setPlaybackSpeed(s); setIsSpeedOpen(false); }}
                                                                className={`px-2 py-1.5 text-[10px] font-bold transition-all text-center rounded-lg select-none ${playbackSpeed === s ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'} hover:scale-110 active:scale-90 z-10`}
                                                            >
                                                                {s}x
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex items-center gap-2.5">
                                        <span className="text-[12px] font-mono text-blue-400 font-bold tracking-tighter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] select-none">
                                            {playbackProgress.currentTime}
                                        </span>
                                        <div className="relative flex-1 h-6 flex items-center group/timeline">
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.0001"
                                                value={playbackProgress.progress}
                                                onChange={(e) => setPlaybackProgress(parseFloat(e.target.value))}
                                                className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer scale-y-75 group-hover/timeline:scale-y-125 transition-all outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0"
                                                style={{ background: `linear-gradient(to right, #3b82f6 ${playbackProgress.progress * 100}%, rgba(255,255,255,0.02) ${playbackProgress.progress * 100}%)` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                                        {(dimensions.width - (isMapMaximized ? 680 : 40)) > 600 && (
                                            <>
                                                <Tooltip text="MINIMAP" position="top">
                                                    <button onClick={() => setShowMiniMap(!showMiniMap)} className={`transition-all rounded-lg glass-container hover:scale-110 active:scale-95 border border-transparent ${showMiniMap ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} onMouseMove={handleGlassMouseMove}>
                                                        <div className="glass-content px-2.5 py-1.5 flex items-center justify-center"><MapIcon size={16} /></div>
                                                    </button>
                                                </Tooltip>
                                                <div className="relative" ref={hudMenuRef}>
                                                    <Tooltip text={isMapMaximized ? "HUD SETUP" : "OVERLAP"} position="top">
                                                        <button onClick={() => isMapMaximized ? setShowHudMenu(!showHudMenu) : setShowTelemetryOverlay(!showTelemetryOverlay)} className={`transition-all rounded-lg glass-container hover:scale-110 active:scale-95 border border-transparent ${showTelemetryOverlay ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} onMouseMove={handleGlassMouseMove}>
                                                            <div className="glass-content px-2.5 py-1.5 flex items-center justify-center gap-1.5"><Activity size={16} />{isMapMaximized && <ChevronDown size={12} className={`transition-transform duration-300 ${showHudMenu ? 'rotate-180' : ''}`} />}</div>
                                                        </button>
                                                    </Tooltip>
                                                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-40 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom z-[1100] ${isMapMaximized && showHudMenu ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}>
                                                        <div className="flex flex-col gap-1 p-1 bg-[#1a1a1e]/90 glass-container rounded-xl border border-white/10" onMouseMove={handleGlassMouseMove}>
                                                            <div className="glass-content w-full h-full flex flex-col gap-0.5">
                                                                <button onClick={() => setHudVisibility('overlap', !hudVisibility.overlap)} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all border hover:scale-105 active:scale-90 group ${hudVisibility.overlap ? 'bg-blue-600/30 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-500 border-transparent hover:bg-white/5 hover:text-white'}`}><span className="text-[11px] font-bold">Telemetry Overlap</span></button>
                                                                <div className="mx-2 my-1 border-t border-white/10" />
                                                                {['trackInfo', 'vehicleInfo', 'analysisLaps', 'dataCharts'].map((id) => (
                                                                    <button key={id} onClick={() => setHudVisibility(id as any, !hudVisibility[id as keyof typeof hudVisibility])} className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all border hover:scale-105 active:scale-90 group ${hudVisibility[id as keyof typeof hudVisibility] ? 'bg-blue-600/30 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-500 border-transparent hover:bg-white/5 hover:text-white'}`}><span className="text-[11px] font-bold">{id}</span></button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Tooltip text="RESET VIEW" position="top">
                                                    <button onClick={fitTrack} className="transition-all rounded-lg glass-container hover:scale-110 active:scale-90 text-slate-500 hover:text-white border border-transparent hover:bg-white/5" onMouseMove={handleGlassMouseMove}><div className="glass-content px-2.5 py-1.5 flex items-center justify-center"><RotateCcw size={16} /></div></button>
                                                </Tooltip>
                                                <div className="glass-container rounded-lg border border-transparent hover:bg-white/5 transition-all">
                                                    <div className="glass-content h-7 px-1 gap-0.5 flex items-center">
                                                        <Tooltip text="FIXED VIEW" position="top">
                                                            <button onClick={() => setCameraMode('static')} className={`p-1 px-2 rounded-md transition-all ${cameraMode === 'static' ? 'text-blue-400 bg-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}><ViewfinderIcon size={14} /></button>
                                                        </Tooltip>
                                                        <Tooltip text="FOLLOW MODE" position="top">
                                                            <button onClick={() => setCameraMode('follow')} className={`p-1 px-2 rounded-md transition-all ${cameraMode === 'follow' ? 'text-blue-400 bg-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}><FollowIcon size={14} /></button>
                                                        </Tooltip>
                                                        <Tooltip text="HEADING UP" position="top">
                                                            <button onClick={() => setCameraMode('heading-up')} className={`p-1 px-2 rounded-md transition-all ${cameraMode === 'heading-up' ? 'text-blue-400 bg-blue-500/20' : 'text-slate-500 hover:text-slate-300'}`}><Navigation size={14} /></button>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        {onToggleExpand && !isMapMaximized && (
                                            <Tooltip text="BACK TO SIDEBAR MAP" position="top">
                                                <button onClick={onToggleExpand} className="transition-all rounded-lg glass-container hover:scale-110 active:scale-95 text-slate-500 hover:text-white border border-transparent hover:bg-white/5" onMouseMove={handleGlassMouseMove}><div className="glass-content px-2.5 py-1.5 flex items-center justify-center"><ChevronRight size={16} /></div></button>
                                            </Tooltip>
                                        )}
                                        <Tooltip text={isMapMaximized ? "RESTORE" : "MAXIMIZE"} position="top">
                                            <button onClick={() => setIsMapMaximized(!isMapMaximized)} className={`transition-all rounded-full glass-container hover:scale-110 active:scale-95 border border-transparent ml-1 ${isMapMaximized ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} onMouseMove={handleGlassMouseMove}><div className="glass-content p-2.5 flex items-center justify-center">{isMapMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</div></button>
                                        </Tooltip>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button onClick={fitTrack} className="text-gray-400 hover:text-white rounded-xl transition-all border border-transparent hover:bg-white/5 active:scale-90 glass-container" onMouseMove={handleGlassMouseMove}><div className="glass-content p-1.5"><RotateCcw size={14} /></div></button>
                                    <div className="w-px h-3 bg-white/5 mx-0.5" />
                                    {onToggleExpand && (
                                        <button onClick={onToggleExpand} className="text-gray-500 hover:text-white rounded-xl transition-all border border-transparent hover:bg-white/5 active:scale-90 glass-container" onMouseMove={handleGlassMouseMove}><div className="glass-content p-1.5"><Maximize2 size={14} /></div></button>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        );
    }, [isExpanded, isBarHovered, isPlaying, playbackSpeed, playbackProgress, showMiniMap, showHudMenu, showTelemetryOverlay, isMapMaximized, hudVisibility, maximizedSidebarMode, dimensions.width, telemetryData, isMiniMap, togglePlayback, setPlaybackSpeed, setPlaybackProgress, setShowMiniMap, setShowHudMenu, setShowTelemetryOverlay, setHudVisibility, fitTrack, cameraMode, setCameraMode, setIsMapMaximized, onToggleExpand, isSingleLap, singleLapXAxisMode, dashboardSyncMode]);

    return (
        <div ref={containerRef}
            onMouseMove={handleGlassMouseMove}
            className={`h-full flex flex-col min-h-[inherit] relative group/map transition-all duration-300 ${isMiniMap ? '' : 'glass-container-flat map-bg-unified'} hover:scale-100 overflow-hidden ${isMiniMap ? 'rounded-xl' : (isMapMaximized ? 'rounded-none glass-no-blur' : 'rounded-2xl')}`}
            style={{ 
                '--glass-hover-scale': '1', 
                '--glass-content-scale': '1'
            } as any}>
            <div className="glass-content flex-1 flex flex-col relative z-10 w-full h-full">
                {/* Segment Navigation Buttons */}
                {!isMiniMap && !isAnimating && selectedSegIdx !== null && (
                    <>
                        {selectedSegIdx > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSegmentNavigation(selectedSegIdx - 1);
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-[2000] pointer-events-auto w-10 h-10 rounded-full bg-black/50 hover:bg-black/75 border border-white/10 hover:border-white/20 active:scale-95 transition-all text-gray-300 hover:text-white shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 group/nav-left"
                            >
                                <ChevronLeft size={22} className="transition-transform group-hover/nav-left:-translate-x-0.5" />
                            </button>
                        )}
                        {selectedSegIdx < miniSectors.length - 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSegmentNavigation(selectedSegIdx + 1);
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-[2000] pointer-events-auto w-10 h-10 rounded-full bg-black/50 hover:bg-black/75 border border-white/10 hover:border-white/20 active:scale-95 transition-all text-gray-300 hover:text-white shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 group/nav-right"
                            >
                                <ChevronRight size={22} className="transition-transform group-hover/nav-right:translate-x-0.5" />
                            </button>
                        )}
                    </>
                )}

                {/* Title Overlay */}
                {!isMiniMap && !isAnimating && (
                    <div className="absolute top-4 left-4 z-20 pointer-events-auto flex flex-col items-start gap-2 select-none">
                        <h3 className="text-gray-500 text-[12px] font-black uppercase tracking-[0.2em] drop-shadow-md transition-all duration-300 group-hover/map:text-white group-hover/map:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] cursor-default">Track Map</h3>
                        {selectedSegIdx !== null && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSegmentLoading(true);
                                    if (isPlaying) {
                                        togglePlayback();
                                    }
                                    setTimeout(() => {
                                        setSelectedSegIdx(null);
                                        setZoomRange(null);
                                        setPlaybackTime(0);
                                        setIsSegmentLoading(false);
                                    }, 500);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-black/40 hover:bg-black/60 text-blue-400 hover:text-blue-300 transition-all duration-300 backdrop-blur-md cursor-pointer text-[10px] font-black uppercase tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 group/back-btn"
                            >
                                <ArrowLeft size={11} className="transition-transform group-hover/back-btn:-translate-x-0.5" />
                                Full Track
                            </button>
                        )}
                    </div>
                )}

                {/* HUD: Top Center Telemetry (Refined Alignment) */}
                {isExpanded && !isMiniMap && !isAnimating && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto flex flex-col items-center gap-1">
                        <TopCenterTelemetryHUD />

                        {/* Maximized Dimension Toggle */}
                        {isMapMaximized && (
                            <MaximizedDimensionToggle />
                        )}
                    </div>
                )}





                {/* Reset HUD Button - Top Left */}
                <div className={`absolute top-4 left-4 z-[3000] transition-all duration-300 ease-out transform ${editHudMode && !isMiniMap && !isAnimating ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
                    <button
                        onClick={resetHudConfigs}
                        className="flex items-center justify-center gap-2 w-40 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all animate-in fade-in slide-in-from-left-4 duration-300 pointer-events-auto"
                    >
                        <RotateCcw size={14} />
                        Reset HUD
                    </button>
                </div>

                {!isMiniMap && !isAnimating && PlaybackControlBar}

                {/* Minimap Overlay (Expanded or Maximized) */}
                {(isExpanded || isMapMaximized) && !isMiniMap && !isAnimating && (
                    <div
                        className={`absolute ${isMapMaximized ? 'top-6 right-8' : 'top-4 right-4'} z-50 pointer-events-none group/mini transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showMiniMap ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 -translate-y-4'}`}
                        style={{
                            width: '14rem', // Increased size
                            aspectRatio: '5/3'
                        }}
                    >
                        <div className={`w-full h-full glass-container rounded-xl overflow-hidden relative transition-all duration-300 ${showMiniMap ? 'pointer-events-auto' : 'pointer-events-none'}`}
                            onMouseMove={handleGlassMouseMove}
                            style={{ '--glass-hover-scale': '1', '--glass-content-scale': '1' } as any}>
                            <div className="glass-content w-full h-full">
                                {/* We render a non-expanded version for the minimap, forcing rotation to match main map */}
                                <TrackMap key="minimap-overlay" isMiniMap={true} />
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={`flex-1 relative ${isMiniMap ? 'overflow-hidden' : 'cursor-move'}`}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onContextMenu={handleContextMenu}
                >
                    <canvas ref={trackCanvasRef} className="absolute inset-0 block" />
                    <canvas ref={cursorCanvasRef} className="absolute inset-0 block pointer-events-none" />
                    <AnimatePresence>
                        {isSegmentLoading && !isMiniMap && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-[250] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto"
                            >
                                <div className="flex flex-col items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                                    <div className="text-center">
                                        <h3 className="text-white text-xs font-black uppercase tracking-[0.2em]">Analyzing Segment Telemetry</h3>
                                        <p className="text-gray-400 text-[10px] mt-1 font-medium font-mono uppercase tracking-[0.1em]">Comparing Best Mini-Sector Performances</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {!trackData && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-gray-600 text-xs">GPS Data Not Available</span>
                        </div>
                    )}
                </div>

                {/* HUD OVERLAYS - Moved to end of DOM for consistent event capturing in 2D mode */}
                {isExpanded && !isMiniMap && !isAnimating && (
                    <>
                        {/* 1. Telemetry Overlap */}
                        <div
                            className={`absolute inset-0 pointer-events-none transition-all duration-500 transform z-[150] ${(isMapMaximized ? hudVisibility.overlap : showTelemetryOverlay)
                                ? 'opacity-100 scale-100 translate-y-0'
                                : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
                                }`}
                        >
                            <CompactTelemetryOverlay
                                data={telemetryData}
                                theme="current"
                                carModel={sessionMetadata?.modelName}
                                isMiniMap={isMiniMap}
                            />

                            {(referenceTelemetryData || referenceLapIdx !== null) && (
                                <CompactTelemetryOverlay
                                    data={referenceTelemetryData || telemetryData}
                                    theme="reference"
                                    carModel={referenceSessionMetadata?.modelName || sessionMetadata?.modelName}
                                    isMiniMap={isMiniMap}
                                />
                            )}
                        </div>

                        {/* 2. Smart Sidebar */}
                        {isMapMaximized && (
                            <div 
                                className={`absolute top-10 left-4 z-[200] w-[320px] flex flex-col gap-0 isolate ${maximizedSidebarMode === 'data_sources' ? 'bottom-4' : 'pointer-events-none'}`}
                                onMouseMove={(e) => e.stopPropagation()}
                                onMouseEnter={(e) => e.stopPropagation()}
                            >
                                <AnimatePresence mode="popLayout">
                                    {maximizedSidebarMode === 'data_sources' && (
                                        <motion.div
                                            key="data-sources-panel"
                                            initial={{ opacity: 0, x: -40 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -40 }}
                                            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                                            className="pointer-events-auto flex flex-col gap-2 h-full w-full"
                                        >
                                            <div 
                                                className="flex-1 flex flex-col overflow-hidden rounded-2xl glass-container-static"
                                                onMouseMove={(e) => {
                                                    e.stopPropagation();
                                                    handleGlassMouseMove(e);
                                                }}
                                            >
                                                <FileManager />
                                            </div>
                                            <button
                                                onClick={() => setMaximizedSidebarMode('hud')}
                                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg backdrop-blur-md"
                                            >
                                                Return to Active Session
                                            </button>
                                        </motion.div>
                                    )}

                                    {maximizedSidebarMode !== 'data_sources' && hudVisibility.trackInfo && sessionMetadata && (
                                        <motion.div
                                            key="track-info"
                                            layout
                                            initial={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 12, scale: 1 }}
                                            exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 120,
                                                damping: 20,
                                                layout: { duration: 0.4 },
                                                opacity: { duration: 0.3 }
                                            }}
                                            className="origin-left pointer-events-auto"
                                        >
                                            <TrackInfoOverlay
                                                sessionMetadata={sessionMetadata}
                                                referenceMetadata={referenceSessionMetadata}
                                            />
                                        </motion.div>
                                    )}

                                    {maximizedSidebarMode !== 'data_sources' && hudVisibility.vehicleInfo && sessionMetadata && (
                                        <motion.div
                                            key="vehicle-info"
                                            layout
                                            initial={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 12, scale: 1 }}
                                            exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 120,
                                                damping: 20,
                                                layout: { duration: 0.4 },
                                                opacity: { duration: 0.3 }
                                            }}
                                            className="origin-left pointer-events-auto"
                                        >
                                            <CarInfoOverlay
                                                sessionMetadata={sessionMetadata}
                                                referenceMetadata={referenceSessionMetadata}
                                            />
                                        </motion.div>
                                    )}

                                    {maximizedSidebarMode !== 'data_sources' && hudVisibility.analysisLaps && (
                                        <motion.div
                                            key="analysis-laps"
                                            layout
                                            initial={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 12, scale: 1 }}
                                            exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 120,
                                                damping: 20,
                                                layout: { duration: 0.4 },
                                                opacity: { duration: 0.3 }
                                            }}
                                            className="origin-left pointer-events-auto"
                                        >
                                            <LapsSelectorOverlay />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}


                        {/* 3. Distance/Time Sync Toggle (Dynamic Positioning) */}
                        <AnimatePresence>
                            {isMapMaximized && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        top: showMiniMap ? 166 : 16 // Aligned above charts
                                    }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    className="absolute right-[20px] z-[2001] pointer-events-auto"
                                >
                                    <div className="glass-container rounded-xl shadow-xl overflow-hidden pointer-events-auto" onMouseMove={handleGlassMouseMove}>
                                        <div className="glass-content relative flex items-center p-1 w-44 h-8 bg-black/20">
                                            <div
                                                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
                                                style={{ left: (isSingleLap ? singleLapXAxisMode === 'distance' : dashboardSyncMode === 'distance') ? '4px' : 'calc(50%)' }}
                                            />
                                            <button
                                                onClick={() => isSingleLap ? setSingleLapXAxisMode('distance') : setDashboardSyncMode('distance')}
                                                className={`relative z-10 flex-1 h-full flex items-center justify-center text-[8px] font-black uppercase tracking-widest transition-colors duration-300 ${(isSingleLap ? singleLapXAxisMode === 'distance' : dashboardSyncMode === 'distance') ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                {isSingleLap ? 'Distance' : 'Dist Sync'}
                                            </button>
                                            <button
                                                onClick={() => isSingleLap ? setSingleLapXAxisMode('time') : setDashboardSyncMode('time')}
                                                className={`relative z-10 flex-1 h-full flex items-center justify-center text-[8px] font-black uppercase tracking-widest transition-colors duration-300 ${(isSingleLap ? singleLapXAxisMode === 'time' : dashboardSyncMode === 'time') ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                {isSingleLap ? 'Time' : 'Time Sync'}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 4. Data Charts (Right Sidebar) */}
                        <AnimatePresence>
                            {isMapMaximized && hudVisibility.dataCharts && (
                                <motion.div
                                    key="data-charts-sidebar"
                                    initial={{ opacity: 0, x: 40 }}
                                    animate={{
                                        opacity: 1,
                                        x: 0,
                                        top: showMiniMap ? 198 : 48 // Perfectly aligned with bottom of toggle
                                    }}
                                    exit={{ opacity: 0, x: 40 }}
                                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                                    className="absolute bottom-4 right-[-12px] z-[2000] pointer-events-none flex flex-col justify-end"
                                >
                                    <DataChartsOverlay />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </div>
    );
});
