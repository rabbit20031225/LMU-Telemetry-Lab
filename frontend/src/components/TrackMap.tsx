import React, { useEffect, useRef, useMemo, useState, useCallback, memo } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { Tooltip } from './ui/Tooltip';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { CompactTelemetryOverlay } from './CompactTelemetryOverlay';

import { Maximize2, Minimize2, Play, Pause, RotateCcw, Compass, Navigation, ZoomIn, ZoomOut, Activity } from 'lucide-react';

const STICKY_THRESHOLD = 0.05;

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

export const TrackMap = ({ isExpanded = false, onToggleExpand, isMiniMap = false, forcedRotation, isAnimating = false }: TrackMapProps) => {
    const telemetryData = useTelemetryStore(state => state.telemetryData);
    const referenceTelemetryData = useTelemetryStore(state => state.referenceTelemetryData);
    const selectedStint = useTelemetryStore(state => state.selectedStint);
    const selectedLapIdx = useTelemetryStore(state => state.selectedLapIdx);
    const referenceLapIdx = useTelemetryStore(state => state.referenceLapIdx);
    const referenceLap = useTelemetryStore(state => state.referenceLap);
    const laps = useTelemetryStore(state => state.laps);
    const cursorIndex = useTelemetryStore(state => state.cursorIndex);
    const smoothCursorIndex = useTelemetryStore(state => state.smoothCursorIndex);
    const setCursorIndex = useTelemetryStore(state => state.setCursorIndex);
    const zoomRange = useTelemetryStore(state => state.zoomRange);
    const isPlaying = useTelemetryStore(state => state.isPlaying);
    const playbackSpeed = useTelemetryStore(state => state.playbackSpeed);
    const togglePlayback = useTelemetryStore(state => state.togglePlayback);
    const setPlaybackSpeed = useTelemetryStore(state => state.setPlaybackSpeed);
    const setPlaybackProgress = useTelemetryStore(state => state.setPlaybackProgress);
    const cameraModeStore = useTelemetryStore(state => state.cameraMode);
    const cameraMode = (isMiniMap || !isExpanded) ? 'static' : cameraModeStore;
    const setCameraMode = useTelemetryStore(state => state.setCameraMode);
    const followZoom = (isMiniMap || !isExpanded) ? 50 : useTelemetryStore(state => state.followZoom);
    const setFollowZoom = useTelemetryStore(state => state.setFollowZoom);
    const dashboardSyncMode = useTelemetryStore(state => state.dashboardSyncMode);
    const referenceCursorIndex = useTelemetryStore(state => state.referenceCursorIndex);
    const referenceDeltaIndex = useTelemetryStore(state => state.referenceDeltaIndex);
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
    const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);
    const showTelemetryOverlay = useTelemetryStore(state => state.showTelemetryOverlay);
    const setShowTelemetryOverlay = useTelemetryStore(state => state.setShowTelemetryOverlay);

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
    const [flagImage, setFlagImage] = useState<HTMLImageElement | null>(null);
    const [showMiniMap, setShowMiniMap] = useState(true);

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
        for (let i = sIdx; i <= eIdx; i += step) {
            const p = project(sourceLat[i], sourceLon[i]);
            if (!isNaN(p.x) && !isNaN(p.y)) {
                tempPoints.push(p);
                tempOrigIdx.push(i);
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
            if (sourceInPits[idx] > 0.5) draw = false;
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
        const time = telemetryData['Time'];
        const inPits = telemetryData['In Pits'] || [];
        const pathLateral = telemetryData['Path Lateral'] || [];
        const trackEdge = telemetryData['Track Edge'] || [];

        const lapsInStint = laps.filter(l => l.stint === selectedStint);
        const fastestValidLap = lapsInStint.filter(l => l.isValid).sort((a, b) => a.duration - b.duration)[0] || lapsInStint[0] || laps[0];

        if (!fastestValidLap || !telemetryData['Time']) return null;

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
        const time = telemetryData['Time'];
        const inPits = telemetryData['In Pits'] || [];

        const currentLapIdx = selectedLapIdx !== null ? selectedLapIdx : (laps.find(l => l.isValid)?.lap ?? laps[0].lap);
        const currentLap = laps.find(l => l.lap === currentLapIdx) || laps[0];
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
            const refTime = referenceTelemetryData['Time'] || [];
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
                const time = telemetryData['Time'];
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

    // 1f. Consolidated Track Data
    const trackData = useMemo(() => {
        if (!baseTrack || !racingLineData) return null;
        return {
            ...baseTrack,
            racingLine: racingLineData,
            referenceRacingLine: referenceLineData,
            center: sessionBase!
        };
    }, [baseTrack, racingLineData, referenceLineData, sessionBase]);


    // 2. Calculate Car Heading from GPS (Smooth window)
    const carHeading = useMemo(() => {
        if (!trackData || cursorIndex === null || !telemetryData) return 0;

        const lat = telemetryData['GPS Latitude'];
        const lon = telemetryData['GPS Longitude'];
        if (!lat || !lon) return 0;

        const idx = Math.floor(isPlaying ? (smoothCursorIndex ?? cursorIndex) : cursorIndex);

        // Window for smoothing (e.g., +- 0.5s or 10-20 points)
        const window = 15;
        const i1 = Math.max(0, idx - window);
        const i2 = Math.min(lat.length - 1, idx + window);

        if (i1 === i2) return 0;

        const dLat = lat[i2] - lat[i1];
        const dLon = (lon[i2] - lon[i1]) * trackData.center.lonScale;

        // Heading in degrees (0 is Up/North)
        // Note: Canvas uses Y as down, so we atan2(lon, -lat) or adjust.
        // Actually, our projection is lat+ and lon+.
        return Math.atan2(dLon, dLat) * 180 / Math.PI;
    }, [trackData, cursorIndex, smoothCursorIndex, isPlaying, telemetryData]);

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

        const bW = (maxRX - minRX) * 1.05, bH = (maxRY - minRY) * 1.05; // 5% buffer
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

    // 3. Handle Sync Zoom from Telemetry Selection
    useEffect(() => {
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

        const w = (maxRX - minRX) * 1.04; // Add small buffer
        const h = (maxRY - minRY) * 1.04;
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
        const activeIdx = isPlaying ? (smoothCursorIndex ?? cursorIndex) : cursorIndex;

        if (isFollowMode && activeIdx !== null) {
            const baseIdx = Math.floor(activeIdx);
            const lats = telemetryData['GPS Latitude'];
            const lons = telemetryData['GPS Longitude'];

            if (lats && lons && lats[baseIdx] !== undefined) {
                const nextIdx = Math.min(lats.length - 1, baseIdx + 1);
                const frac = activeIdx - baseIdx;
                const clat = lats[baseIdx] + (lats[nextIdx] - lats[baseIdx]) * frac;
                const clon = lons[baseIdx] + (lons[nextIdx] - lons[baseIdx]) * frac;

                const worldX = (clon - trackData.center.lon) * trackData.center.lonScale;
                const worldY = (clat - trackData.center.lat);

                effK = 10000 + followZoom * 5000;

                // Rotation Smoothing (Lerp)
                const targetRot = cameraMode === 'heading-up' ? -carHeading : (forcedRotation ?? optimalRotation);
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
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; // Subtle borders
            ctx.lineWidth = 3 / k; // Thicker border

            for (let i = 0; i < referenceTrack.leftEdges.length - 1; i++) {
                if (!referenceTrack.drawFlags[i] || !referenceTrack.drawFlags[i + 1]) continue;

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
                ctx.fill();

                // Edge lines (Only if NOT minimap)
                if (!isMiniMap) {
                    ctx.beginPath();
                    ctx.moveTo(l1.x, l1.y); ctx.lineTo(l2.x, l2.y);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y);
                    ctx.stroke();
                }
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

            // Safety: Skip extreme teleportation jumps (> 200m)
            const d2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
            if (d2 > (200 / 111320) ** 2) continue;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);

            const b = brake[idx] || 0;
            const t = throttle[idx] || 0;

            if (isMiniMap) {
                ctx.strokeStyle = 'rgba(150, 150, 150, 0.8)'; // Solid gray for mini-map
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

            ctx.stroke();
        }

        // --- 3. Draw Reference Racing Line (Dashed Golden-Yellow) - ON TOP ---
        if (trackData.referenceRacingLine && !isMiniMap) {
            ctx.save();
            ctx.setLineDash([4 / k, 4 / k]);
            ctx.lineWidth = 2 / k;
            ctx.strokeStyle = '#daa520';
            ctx.shadowBlur = 6 / k;
            ctx.shadowColor = '#daa520';

            ctx.beginPath();
            let first = true;
            for (let i = 0; i < trackData.referenceRacingLine.points.length; i++) {
                const p = trackData.referenceRacingLine.points[i];
                if (first) { ctx.moveTo(p.x, p.y); first = false; }
                else { ctx.lineTo(p.x, p.y); }
            }
            ctx.stroke();
            ctx.restore();
        }

        // --- 4. Draw Start/Finish Flag ---
        if (racingLine.points.length > 2 && flagImage) {
            const pf = racingLine.points[racingLine.points.length - 1];
            const iconSize = (isMiniMap ? 10 : 16) / k;

            ctx.save();
            if (!isMiniMap) {
                ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
                ctx.shadowBlur = 10 / k;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.arc(pf.x, pf.y, 10 / k, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.translate(pf.x, pf.y);
            ctx.rotate(-rotation * Math.PI / 180);
            ctx.scale(1, -1);

            ctx.drawImage(flagImage, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
            ctx.restore();
        }

        // --- 5. Draw Dynamic Cursors ---
        const getHeadingAtIdx = (idx: number, sourceData: any) => {
            const lat = sourceData['GPS Latitude'];
            const lon = sourceData['GPS Longitude'];
            if (!lat || !lon) return 0;
            const window = 15;
            const i1 = Math.max(0, Math.floor(idx) - window);
            const i2 = Math.min(lat.length - 1, Math.floor(idx) + window);
            if (i1 === i2) return 0;
            const dLat = lat[i2] - lat[i1];
            const dLon = (lon[i2] - lon[i1]) * trackData.center.lonScale;
            return Math.atan2(dLon, dLat) * 180 / Math.PI;
        };

        const activeCursorIdx = isPlaying ? (smoothCursorIndex ?? cursorIndex) : cursorIndex;

        if (activeCursorIdx !== null && telemetryData) {
            const drawCursorAtIdx = (idx: number, color: string, radius: number, glow: boolean, sourceData: any, isArrow: boolean) => {
                const baseIdx = Math.floor(idx);
                const nextIdx = Math.min(sourceData['GPS Latitude']!.length - 1, baseIdx + 1);
                const frac = idx - baseIdx;

                const lat1 = sourceData['GPS Latitude']?.[baseIdx];
                const lon1 = sourceData['GPS Longitude']?.[baseIdx];
                const lat2 = sourceData['GPS Latitude']?.[nextIdx];
                const lon2 = sourceData['GPS Longitude']?.[nextIdx];

                if (lat1 === undefined || lon1 === undefined || lat1 === 0 || lon1 === 0) return;

                // Interpolate Coordinates
                const clat = lat1 + (lat2 - lat1) * frac;
                const clon = lon1 + (lon2 - lon1) * frac;

                // CRITICAL: Always use the MAIN session's projection center to ensure alignment
                const cpx = (clon - trackData.center.lon) * trackData.center.lonScale;
                const cpy = (clat - trackData.center.lat);

                if (isArrow) {
                    const heading = getHeadingAtIdx(idx, sourceData);
                    ctx.save();
                    ctx.translate(cpx, cpy);
                    // Adjust rotation: standard atan2 is CCW from X axis. 
                    // Our heading is 0=North, 90=East. 
                    // In flipped canvas (k, -k), rotate is CCW. 
                    // To make 90=East (Right), we rotate by -heading.
                    ctx.rotate(-heading * Math.PI / 180);
                    ctx.scale(1 / k, 1 / k);

                    const size = radius * 2.2;
                    ctx.beginPath();
                    ctx.moveTo(0, size); // Tip points North
                    ctx.lineTo(-size * 0.7, -size * 0.8);
                    ctx.lineTo(0, -size * 0.3);
                    ctx.lineTo(size * 0.7, -size * 0.8);
                    ctx.closePath();

                    // Transparency for overlapping (Reference is drawn last/on-top)
                    if (isArrow && glow === false) { // Simple heuristic for ghost car call
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
                    ctx.lineWidth = (isMiniMap ? 1 : 2) / k;
                    ctx.beginPath();
                    ctx.arc(cpx, cpy, (radius + (isMiniMap ? 0.5 : 1)) / k, 0, Math.PI * 2);
                    ctx.stroke();

                    if (glow) {
                        ctx.shadowColor = color;
                        ctx.shadowBlur = 20;
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(cpx, cpy, radius / k, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 40;
                        ctx.globalAlpha = 0.5;
                        ctx.fill();
                    } else {
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(cpx, cpy, radius / k, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                }
            };

            // 1. Draw Current Cursor
            const cursorColor = isMiniMap ? "#3b82f6" : "#3b82f6";
            const radius = isMiniMap ? 3.5 : 8; // Slightly larger for arrows
            drawCursorAtIdx(activeCursorIdx, cursorColor, radius, !isMiniMap, telemetryData, !isMiniMap);

            // 2. Draw Reference Ghost Car (Using Synced Store Index)
            const referenceCursorIndex = useTelemetryStore.getState().referenceCursorIndex;

            if (trackData.referenceRacingLine && referenceCursorIndex !== null) {
                const refData = referenceTelemetryData || telemetryData;
                const refCursorColor = isMiniMap ? "rgba(200, 200, 200, 1.0)" : "#ffc800ff"; // Rich orange
                const refRadius = isMiniMap ? 3.5 : 6.5;
                drawCursorAtIdx(referenceCursorIndex, refCursorColor, refRadius, false, refData, !isMiniMap);
            }
        }

        ctx.restore();

    }, [trackData, dimensions, view, telemetryData, flagImage, cursorIndex, referenceLapIdx, isMiniMap, cameraMode, followZoom, optimalRotation, smoothCursorIndex, carHeading, isPlaying, forcedRotation, isExpanded]);

    // 4. Cursor rendering in separate effect is no longer needed as we draw it in main loop for synchronization if desired, 
    // but better to keep it separate for performance if cursorIndex changes fast. 
    // Actually, drawing it in main loop is easier for Z-order. 
    // Just keep a minor cleanup effect.
    useEffect(() => {
        const canvas = cursorCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    }, [dimensions]);

    const handleWheel = (e: React.WheelEvent) => {
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

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isMiniMap) return; // Disable pan/rotate
        if (e.button === 2) { // Right Click
            setIsRotating(true);
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const dx = e.clientX - rect.left - centerX;
                const dy = e.clientY - rect.top - centerY;
                startAngle.current = Math.atan2(dy, dx) * 180 / Math.PI;
                startViewRotation.current = view.rotation;
            }
        } else {
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
                const delta = currentAngle - startAngle.current;
                setView(v => ({ ...v, rotation: startViewRotation.current + delta }));
            }
        } else if (isDragging) {
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            lastPos.current = { x: e.clientX, y: e.clientY };
            setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsRotating(false);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault(); // Disable default menu to allow right-click drag
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => e.preventDefault();
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const playbackProgress = useMemo(() => {
        const fallback = { progress: 0, currentTime: "00:00.000" };
        if (!telemetryData || !laps || selectedLapIdx === null || cursorIndex === null) return fallback;
        const time = telemetryData['Time'];
        if (!time) return fallback;
        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        if (!currentLap) return fallback;

        const sIdx = time.findIndex(t => t >= currentLap.startTime);
        const eIdx = time.findIndex(t => t > currentLap.endTime) - 1;
        const validEIdx = eIdx < 0 ? time.length - 1 : eIdx;

        if (validEIdx === sIdx) return fallback;

        const currentIdx = smoothCursorIndex ?? cursorIndex;
        const progress = (cursorIndex - sIdx) / (validEIdx - sIdx || 1);
        const elapsed = Math.max(0, time[cursorIndex] - currentLap.startTime);
        return { progress, currentTime: formatLapTime(elapsed) };
    }, [telemetryData, laps, selectedLapIdx, cursorIndex]);

    if (!telemetryData) {
        return (
            <div className="bg-gray-800 rounded p-4 h-full flex items-center justify-center text-gray-500 text-xs">
                No Telemetry Data
            </div>
        );
    }
    const editOverlapMode = useTelemetryStore(state => state.editOverlapMode);
    const resetOverlapConfig = useTelemetryStore(state => state.resetOverlapConfig);

    const carStats = useMemo(() => {
        if (!telemetryData || cursorIndex === null) return { dist: null };
        const idx = Math.floor(isPlaying ? (smoothCursorIndex ?? cursorIndex) : cursorIndex);

        let dist = null;
        if (telemetryData['Lap Dist'] && telemetryData['Lap Dist'][idx] !== undefined) {
            dist = telemetryData['Lap Dist'][idx];
        } else if (telemetryData['Distance'] && telemetryData['Distance'][idx] !== undefined) {
            dist = telemetryData['Distance'][idx];
        }

        return { dist };
    }, [telemetryData, cursorIndex, smoothCursorIndex, isPlaying]);

    return (
        <div ref={containerRef}
            onMouseMove={handleGlassMouseMove}
            className="h-full flex flex-col min-h-[inherit] relative group transition-all duration-300 glass-container-flat glass-expand-pixel rounded-2xl">
            <div className="glass-content flex-1 flex flex-col relative z-10 w-full h-full">
                {/* Title Overlay */}
                {!isMiniMap && (
                    <h3 className="text-gray-500 text-[12px] font-black uppercase tracking-[0.2em] m-4 absolute top-0 left-0 z-10 pointer-events-auto drop-shadow-md transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] cursor-default">Track Map</h3>
                )}
                
                {/* HUD: Top Center Telemetry (Parity with 3D) */}
                {isExpanded && !isMiniMap && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto">
                        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center shadow-2xl glass-container overflow-hidden" 
                            onMouseMove={handleGlassMouseMove}>
                            <div className="glass-content px-6 py-2.5 flex items-center">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Dist</span>
                                    <span className="text-[18px] font-black text-blue-400 tabular-nums tracking-tighter leading-none">
                                        {carStats.dist !== null ? (carStats.dist / 1000).toFixed(2) : "--.--"}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">km</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dynamic Telemetry Overlays */}
                {isExpanded && showTelemetryOverlay && (
                    <>
                        <CompactTelemetryOverlay 
                            data={telemetryData} 
                            cursorIndex={smoothCursorIndex} 
                            theme="current"
                            carModel={sessionMetadata?.modelName}
                        />

                        {(referenceTelemetryData || referenceLapIdx !== null) && (
                            <CompactTelemetryOverlay 
                                data={referenceTelemetryData || telemetryData} 
                                cursorIndex={dashboardSyncMode === 'distance' ? referenceDeltaIndex : referenceCursorIndex} 
                                theme="reference"
                                carModel={referenceSessionMetadata?.modelName || sessionMetadata?.modelName}
                            />
                        )}
                    </>
                )}

                {/* Reset HUD Button - Top Left */}
                <div className={`absolute top-4 left-4 z-[200] transition-all duration-300 ease-out transform ${editOverlapMode && !isMiniMap ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
                        <button
                        onClick={resetOverlapConfig}
                        className="flex items-center justify-center gap-2 w-40 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all animate-in fade-in slide-in-from-left-4 duration-300 pointer-events-auto"
                    >
                        <RotateCcw size={14} />
                        Reset HUD
                    </button>
                </div>

                {!isMiniMap && (
                    <div className={`absolute left-1/2 -translate-x-1/2 z-[1100] w-full transition-all duration-500 transform origin-bottom scale-[0.7] group-hover:scale-100 ${isExpanded ? 'bottom-6' : 'bottom-4'}`}>
                        {/* Controls Bar - Centered with independent opacity fade */}
                        <div className={`mx-auto transition-opacity duration-300 opacity-30 group-hover:opacity-100 ${isExpanded ? 'max-w-4xl px-4' : 'max-w-max'}`}>
                            <div className={`flex items-center bg-black/40 glass-container rounded-[2rem] shadow-[0_25px_50px_rgba(0,0,0,0.8)] ${isExpanded ? 'px-6 py-2.5 gap-4' : 'px-3 py-2 gap-2'}`}
                                onMouseMove={handleGlassMouseMove}>
                            <div className="glass-content flex items-center w-full gap-2">
                                {isExpanded ? (
                                    <>
                                        {/* Playback Controls */}
                                        <div className="flex items-center gap-2">
                                            <Tooltip text={isPlaying ? "PAUSE" : "PLAY"} position="top">
                                                <button
                                                    onClick={togglePlayback}
                                                    className={`rounded-full transition-all glass-container hover:scale-110 active:scale-95 ${isPlaying ? 'bg-blue-600 border border-blue-500/50 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
                                                    onMouseMove={handleGlassMouseMove}
                                                >
                                                    <div className="glass-content p-2.5 flex items-center justify-center">
                                                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
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
                                                            {playbackSpeed}x
                                                        </div>
                                                    </button>
                                                </Tooltip>

                                                <div
                                                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-16 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom ${isSpeedOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}
                                                >
                                                    <div className="flex flex-col gap-1 p-1 bg-[#1a1a1e]/90 glass-container rounded-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                                                        onMouseMove={handleGlassMouseMove}>
                                                        <div className="glass-content w-full h-full flex flex-col">
                                                            {[4, 2, 1, 0.5].map(s => (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => { setPlaybackSpeed(s); setIsSpeedOpen(false); }}
                                                                    className={`px-2 py-1.5 text-[10px] font-bold transition-all text-center rounded-lg ${playbackSpeed === s ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'} hover:scale-110 active:scale-90 z-10`}
                                                                >
                                                                    {s}x
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline Slider */}
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
                                                    className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer scale-y-75 group-hover/timeline:scale-y-125 transition-all outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0"
                                                    style={{
                                                        background: `linear-gradient(to right, #3b82f6 ${playbackProgress.progress * 100}%, rgba(255,255,255,0.02) ${playbackProgress.progress * 100}%)`
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* View Controls */}
                                        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                                            <Tooltip text="MINIMAP" position="top">
                                                <button
                                                    onClick={() => setShowMiniMap(!showMiniMap)}
                                                    className={`rounded-2xl transition-all border glass-container hover:scale-110 active:scale-95 ${showMiniMap ? 'text-blue-400 bg-blue-500/20 border-blue-500/30' : 'text-gray-500 hover:text-white border-transparent hover:bg-white/5'}`}
                                                    onMouseMove={handleGlassMouseMove}
                                                >
                                                    <div className="glass-content p-2">
                                                        <MapIcon size={18} />
                                                    </div>
                                                </button>
                                            </Tooltip>

                                            <Tooltip text="OVERLAP" position="top">
                                                <button
                                                    onClick={() => setShowTelemetryOverlay(!showTelemetryOverlay)}
                                                    className={`rounded-2xl transition-all border glass-container hover:scale-110 active:scale-95 ${showTelemetryOverlay ? 'text-blue-400 bg-blue-500/20 border-blue-500/30' : 'text-gray-500 hover:text-white border-transparent hover:bg-white/5'}`}
                                                    onMouseMove={handleGlassMouseMove}
                                                >
                                                    <div className="glass-content p-2">
                                                        <Activity size={18} />
                                                    </div>
                                                </button>
                                            </Tooltip>

                                            <Tooltip text="RESET VIEW" position="top">
                                                <button
                                                    onClick={fitTrack}
                                                    className="text-gray-400 hover:text-white rounded-2xl transition-all glass-container hover:scale-110 active:scale-95 border border-transparent hover:bg-white/5"
                                                    onMouseMove={handleGlassMouseMove}
                                                >
                                                    <div className="glass-content p-2">
                                                        <RotateCcw size={18} />
                                                    </div>
                                                </button>
                                            </Tooltip>

                                            {/* Camera Mode Toggles */}
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-2xl border border-white/10">
                                                <Tooltip text="STATIC" position="top">
                                                    <button
                                                        onClick={() => setCameraMode('static')}
                                                        className={`p-1.5 rounded-xl transition-all ${cameraMode === 'static' ? 'text-blue-400 bg-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        <ViewfinderIcon size={16} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="FOLLOW" position="top">
                                                    <button
                                                        onClick={() => setCameraMode('follow')}
                                                        className={`p-1.5 rounded-xl transition-all ${cameraMode === 'follow' ? 'text-blue-400 bg-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        <FollowIcon size={16} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="HEADING UP" position="top">
                                                    <button
                                                        onClick={() => setCameraMode('heading-up')}
                                                        className={`p-1.5 rounded-xl transition-all ${cameraMode === 'heading-up' ? 'text-blue-400 bg-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        <Navigation size={16} />
                                                    </button>
                                                </Tooltip>
                                            </div>

                                            {/* (Follow Zoom Slider Refactored to Wheel Interaction) */}

                                            {onToggleExpand && (
                                                <Tooltip text="MINIMIZE" position="top">
                                                    <button
                                                        onClick={onToggleExpand}
                                                        className="text-gray-500 hover:text-white transition-all rounded-full glass-container hover:scale-110 active:scale-95 border border-transparent hover:bg-white/5"
                                                        onMouseMove={handleGlassMouseMove}
                                                    >
                                                        <div className="glass-content p-2">
                                                            <Minimize2 size={18} />
                                                        </div>
                                                    </button>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    /* Simplified Sidebar View */
                                    <div className="flex items-center gap-2">
                                        <Tooltip text="RESET" position="top">
                                            <button
                                                onClick={fitTrack}
                                                className="text-gray-400 hover:text-white rounded-xl transition-all border border-transparent hover:bg-white/5 active:scale-90 glass-container"
                                                onMouseMove={handleGlassMouseMove}
                                            >
                                                <div className="glass-content p-1.5">
                                                    <RotateCcw size={14} />
                                                </div>
                                            </button>
                                        </Tooltip>
                                         <div className="w-px h-3 bg-white/5 mx-0.5" />
                                        {onToggleExpand && (
                                            <Tooltip text="EXPAND" position="top">
                                                <button
                                                    onClick={onToggleExpand}
                                                    className="text-gray-500 hover:text-white rounded-xl transition-all border border-transparent hover:bg-white/5 active:scale-90 glass-container"
                                                    onMouseMove={handleGlassMouseMove}
                                                >
                                                    <div className="glass-content p-1.5">
                                                        <Maximize2 size={14} />
                                                    </div>
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

                {/* Minimap Overlay (Expanded Only) */}
                {isExpanded && !isMiniMap && (
                    <div
                        className={`absolute top-4 right-4 z-50 pointer-events-none group/mini transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showMiniMap ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 -translate-y-4'}`}
                        style={{
                            width: 'min(15rem, 30%)',
                            aspectRatio: `${staticTrackAspectRatio}`
                        }}
                    >
                        <div className="w-full h-full glass-container rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative transition-all duration-300 group-hover/mini:bg-white/10 group-hover/mini:scale-[1.02] group-hover/mini:shadow-[0_30px_70px_rgba(0,0,0,0.7)]"
                            onMouseMove={handleGlassMouseMove}>
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
                    onMouseLeave={handleMouseUp}
                    onContextMenu={handleContextMenu}
                >
                    <canvas ref={trackCanvasRef} className="absolute inset-0 block" />
                    <canvas ref={cursorCanvasRef} className="absolute inset-0 block pointer-events-none" />
                    {!trackData && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-gray-600 text-xs">GPS Data Not Available</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
