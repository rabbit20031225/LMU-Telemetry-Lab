
import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useTelemetryStore } from '../store/telemetryStore';
import { Layout, LayoutGrid, Rows2, Layers, Split } from 'lucide-react';
import type { TelemetryData } from '../types';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { Tooltip } from './ui/Tooltip';

interface TelemetryChartProps {
    channel: string;
    alias?: string;
    color: string;
    height?: number;
    syncKey: string;
    unit?: string;
    showLapTime?: boolean;
    isPlaying?: boolean;
    wheelIndex?: number; // 0:FL, 1:FR, 2:RL, 3:RR
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
    channel, alias, color, height = 200, syncKey, unit = "", showLapTime = false, isPlaying = false, wheelIndex
}) => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);


    const telemetryData = useTelemetryStore(state => state.telemetryData);
    const selectedLapIdx = useTelemetryStore(state => state.selectedLapIdx);
    const referenceLapIdx = useTelemetryStore(state => state.referenceLapIdx);
    const referenceTelemetryData = useTelemetryStore(state => state.referenceTelemetryData);
    const referenceLap = useTelemetryStore(state => state.referenceLap);
    const laps = useTelemetryStore(state => state.laps);
    const cursorIndex = useTelemetryStore(state => state.cursorIndex);
    const setCursorIndex = useTelemetryStore(state => state.setCursorIndex);
    const setZoomRange = useTelemetryStore(state => state.setZoomRange);
    const speedUnit = useTelemetryStore(state => state.speedUnit);
    const invertSuspensionTravel = useTelemetryStore(state => state.invertSuspensionTravel);
    const suspensionTravelMode = useTelemetryStore(state => state.suspensionTravelMode);
    const userWheelRotation = useTelemetryStore(state => state.userWheelRotation);
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
    const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);
    const dashboardSyncMode = useTelemetryStore(state => state.dashboardSyncMode);
    const singleLapXAxisMode = useTelemetryStore(state => state.singleLapXAxisMode);
    const playbackElapsed = useTelemetryStore(state => state.playbackElapsed);
    const updateChartHeight = useTelemetryStore(state => state.updateChartHeight);
    const resetChartHeight = useTelemetryStore(state => state.resetChartHeight);
    const setPlaybackTime = useTelemetryStore(state => state.setPlaybackTime);
    const activeChartCategory = useTelemetryStore(state => state.activeChartCategory);

    const isNoABS = React.useMemo(() => {
        if (channel !== 'ABS') return false;
        // Explicitly hide ABS if not GT3 class
        return sessionMetadata?.carClass !== 'GT3';
    }, [channel, sessionMetadata?.carClass]);

    const isNoSoC = React.useMemo(() => {
        if (channel !== 'SoC') return false;
        if (sessionMetadata?.carClass !== 'Hyper') return true;
        const socData = telemetryData?.['SoC'];
        if (!socData) return true;
        return !socData.some(v => v > 0 && v !== null && !Number.isNaN(v));
    }, [channel, telemetryData, sessionMetadata?.carClass]);

    if (isNoABS || isNoSoC) return null;

    React.useEffect(() => {
        // Just a fallback
        if (isNoABS || isNoSoC) {
            setIsCollapsed(true);
        }
    }, [isNoABS, isNoSoC]);

    const isUserInteractingWithCharts = useTelemetryStore(state => state.isUserInteractingWithCharts);
    const setIsUserInteractingWithCharts = useTelemetryStore(state => state.setIsUserInteractingWithCharts);
    const isMapMaximized = useTelemetryStore(state => state.isMapMaximized);
    const suspensionViewMode = useTelemetryStore(state => state.suspensionViewMode);
    const thirdDeflectionViewMode = useTelemetryStore(state => state.thirdDeflectionViewMode);
    const tyresPressureViewMode = useTelemetryStore(state => state.tyresPressureViewMode);
    const rideHeightViewMode = useTelemetryStore(state => state.rideHeightViewMode);
    const slipRatioViewMode = useTelemetryStore(state => state.slipRatioViewMode);
    const handlingViewMode = useTelemetryStore(state => state.handlingViewMode);

    const [isResizing, setIsResizing] = React.useState(false);
    const [isResetting, setIsResetting] = React.useState(false);

    const hasReferenceData = (referenceLapIdx !== null || (referenceTelemetryData && referenceLap)) && referenceLapIdx !== selectedLapIdx;

    const reliesOnExternalData = !!(referenceTelemetryData && referenceLap);
    const targetRefLapIdx = reliesOnExternalData ? referenceLap?.lap : referenceLapIdx;
    
    const isXAxisTime = (targetRefLapIdx === null || (targetRefLapIdx == selectedLapIdx && !reliesOnExternalData))
        ? (singleLapXAxisMode === 'time')
        : (dashboardSyncMode === 'time' && channel !== 'Time Delta');

    const chartRef = useRef<HTMLDivElement>(null);
    const uplotRef = useRef<uPlot | null>(null);
    const valueRef = useRef<HTMLSpanElement>(null);
    const refValueRef = useRef<HTMLSpanElement>(null);
    const multiValueContainerRef = useRef<HTMLDivElement>(null);
    const multiRefValueContainerRef = useRef<HTMLDivElement>(null);
    const timeRef = useRef<HTMLDivElement>(null);
    
    const isTireHeat = channel === 'TireHeat';
    const isBundled = isTireHeat || 
                      (channel === 'TyresPressure' && tyresPressureViewMode === 'merged') || 
                      (channel === 'Slip Ratio' && slipRatioViewMode === 'merged') || 
                      (channel === 'RideHeights' && rideHeightViewMode === 'merged') ||
                      channel === 'SuspPosFront' || channel === 'SuspPosRear' ||
                      channel === 'ThirdDeflectionMerged' || channel === 'HandlingMerged';

    // Helper for bundled labels/colors
    const getBundledInfo = (idx: number) => {
        // When split, wheelIndex tells us which wheel/channel this specific chart represents
        const effectiveIdx = (wheelIndex !== undefined && wheelIndex !== null && !isBundled) ? wheelIndex : idx;

        if (isTireHeat) {
            const labels = ['CARCASS', 'INS', 'MID', 'OUT'];
            const colors = ['rgba(168, 85, 247, 0.4)', '#3b82f6', '#10b981', '#ef4444'];
            return { label: labels[idx], stroke: colors[idx] };
        }
        if (channel === 'RideHeights') {
            const labels = ['Front', 'Rear'];
            const colors = ['#00aaff', '#fb923c'];
            return { label: labels[effectiveIdx] || alias, stroke: colors[effectiveIdx] || color };
        }
        if (channel === 'SuspPosFront') {
            const labels = ['FL', 'FR'];
            const colors = ['#3b82f6', '#ef4444'];
            return { label: labels[idx], stroke: colors[idx] };
        }
        if (channel === 'SuspPosRear') {
            const labels = ['RL', 'RR'];
            const colors = ['#3b82f6', '#ef4444'];
            return { label: labels[idx], stroke: colors[idx] };
        }
        if (channel === 'TyresPressure' || channel === 'Slip Ratio') {
            const labels = ['FL', 'FR', 'RL', 'RR'];
            const colors = ['#3b82f6', '#ef4444', '#60a5fa', '#f87171'];
            return { label: labels[effectiveIdx] || alias, stroke: colors[effectiveIdx] || color };
        }
        if (isBundled && channel === 'ThirdDeflectionMerged') {
            const labels = ['FRONT', 'REAR'];
            const colors = ['#22d3ee', '#fb923c'];
            return { label: labels[idx], stroke: colors[idx] };
        }
        if (isBundled && channel === 'HandlingMerged') {
            const labels = ['YAW', 'STEER'];
            const colors = ['#f43f5e', '#ff00ff'];
            return { label: labels[idx], stroke: colors[idx] };
        }
        return { label: alias, stroke: color };
    };
    const startIdxRef = useRef<number>(0);
    const currentDistRef = useRef<Float64Array | null>(null);
    const currentXDataRef = useRef<Float64Array | null>(null); // NEW: Points to either elapsed or dist
    const currentTimeRef = useRef<Float64Array | null>(null);
    const refTimeAlignedRef = useRef<Float64Array | null>(null);
    const cursorIndexRef = useRef<number | null>(null);
    const isPlayingRef = useRef(isPlaying);
    const lapStartTimeRef = useRef(0);
    const isHoveringRef = useRef(false);

    // Keep the ref updated so hooks always see the latest state
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        cursorIndexRef.current = cursorIndex;
    }, [cursorIndex]);

    // Helper: Linear Interpolation with Boundary Termination (returns NaN if outside source range)
    const interp = (xTarget: any, xSource: any, ySource: any) => {
        const yResult = new Float64Array(xTarget.length);
        if (xSource.length === 0 || ySource.length === 0) {
            yResult.fill(Number.NaN);
            return yResult;
        }
        
        const srcMin = xSource[0];
        const srcMax = xSource[xSource.length - 1];
        
        let srcIdx = 0;
        for (let i = 0; i < xTarget.length; i++) {
            const x = xTarget[i];
            
            // Boundary check: if target is outside source range, use NaN to break the line
            if (x < srcMin - 0.001 || x > srcMax + 0.001) {
                yResult[i] = Number.NaN;
                continue;
            }

            while (srcIdx < xSource.length - 1 && (xSource[srcIdx + 1] ?? -Infinity) < x - 1e-9) {
                srcIdx++;
            }
            const x0 = xSource[srcIdx];
            const x1 = xSource[srcIdx + 1];
            const y0 = ySource[srcIdx];
            const y1 = ySource[srcIdx + 1];
            
            if (x1 === undefined || x0 === undefined || Math.abs(x1 - x0) < 1e-12) {
                yResult[i] = y0 ?? 0;
            } else {
                const t = (x - x0) / (x1 - x0);
                yResult[i] = (y0 ?? 0) + t * ((y1 ?? y0 ?? 0) - (y0 ?? 0));
            }
        }
        return yResult;
    };

    const getRGBA = (hexColor: string, opacity: number) => {
        let hex = hexColor.replace('#', '');
        if (hex.length === 8) hex = hex.substring(0, 6); // Strip alpha if present
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length >= 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        return `rgba(200, 200, 200, ${opacity})`;
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        if (isMapMaximized) return;
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        
        const startY = e.clientY;
        const startHeight = height;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = moveEvent.clientY - startY;
            updateChartHeight(channel, startHeight + deltaY, wheelIndex);
        };

        const onMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Filter Data and Initialize Chart
    useEffect(() => {
        // Always cleanup previous instance if it exists
        if (uplotRef.current) {
            uplotRef.current.destroy();
            uplotRef.current = null;
        }

        if (!telemetryData || selectedLapIdx === null || !chartRef.current) return;

        const lap = laps.find(l => l.lap === selectedLapIdx);
        if (!lap) return;

        const getChan = (src: any, ...names: string[]) => {
            if (!src) return null;
            for (const name of names) if (src[name]) return src[name];
            return null;
        };

        const timeArray = getChan(telemetryData, 'Time');
        const distArray = getChan(telemetryData, 'Lap Dist', 'Distance');
        const lapArray = getChan(telemetryData, 'Lap', 'lap');
        
        const isMillimeters = unit === 'mm';
        const isPercentage = unit === '%';

        let currentSeries: Float64Array[] = [];
        let refSeries: Float64Array[] = [];

        const extractChannelData = (src: TelemetryData | null, chan: string, wIdx?: number): Float64Array | null => {
            if (!src || !src[chan]) return null;
            const raw = src[chan];
            if (!Array.isArray(raw)) return null;

            const mode = useTelemetryStore.getState().suspensionTravelMode;
            const rawBaselines = src.suspension_baselines || [0, 0, 0, 0];
            const wBase = wIdx !== undefined ? rawBaselines[wIdx] : 0;

            // Handle 4-wheel array data
            if (Array.isArray(raw[0]) && wIdx !== undefined) {
                const out = new Float64Array(raw.length);
                for (let i = 0; i < raw.length; i++) {
                    let val = raw[i][wIdx] ?? Number.NaN;
                    if (chan === 'Susp Pos' && !Number.isNaN(val)) {
                        if (mode === 'raw') {
                            val = Math.abs(val);
                        } else {
                            let diff = val - wBase;
                            if (!invertSuspensionTravel) {
                                diff = -diff;
                            }
                            val = diff;
                        }
                    }
                    out[i] = val;
                }
                return out;
            }
            // Handle standard single-value data
            const out = new Float64Array(raw);
            if (chan === 'Susp Pos') {
                for (let i = 0; i < out.length; i++) {
                    let val = out[i];
                    if (!Number.isNaN(val)) {
                        if (mode === 'raw') {
                            val = Math.abs(val);
                        } else {
                            let diff = val - wBase;
                            if (!invertSuspensionTravel) {
                                diff = -diff;
                            }
                            val = diff;
                        }
                        out[i] = val;
                    }
                }
            }
            return out;
        };

        if (!timeArray || !distArray || !lapArray) return;

        // --- 1. Get Current Lap Data ---
        let startIdx = -1, endIdx = -1;
        for (let i = 0; i < lapArray.length; i++) {
            if (lapArray[i] == selectedLapIdx) { // LOOSE EQUALITY
                if (startIdx === -1) startIdx = i;
                endIdx = i;
            }
        }
        if (startIdx === -1 || endIdx === -1) return;

        const rawCurrentDist = distArray.slice(startIdx, endIdx + 1);
        const currentDist = new Float64Array(rawCurrentDist.length);
        const currentDistStart = rawCurrentDist[0] || 0;
        for (let i = 0; i < rawCurrentDist.length; i++) currentDist[i] = rawCurrentDist[i] - currentDistStart;

        const currentTime = timeArray.slice(startIdx, endIdx + 1);
        const lapStartTime = lap.startTime;
        const currentElapsed = new Float64Array(currentTime.length);
        for (let i = 0; i < currentTime.length; i++) currentElapsed[i] = Math.max(0, currentTime[i] - lapStartTime);
        
        let currentVal: Float64Array;
        const smartScale = (arr: Float64Array, multiplier: number) => {
            let alreadyScaled = false;
            for (let i = 0; i < arr.length; i++) {
                if (arr[i] > 1.1 || arr[i] < -1.1) {
                    alreadyScaled = true;
                    break;
                }
            }
            if (!alreadyScaled) {
                for (let i = 0; i < arr.length; i++) arr[i] *= multiplier;
            }
        };

        if (channel === 'Time Delta') {
            currentVal = new Float64Array(currentElapsed.length);
            currentSeries.push(currentVal);
        } else if (isTireHeat) {
            const iData = extractChannelData(telemetryData, 'TyresTempInside', wheelIndex);
            const cData = extractChannelData(telemetryData, 'TyresTempCentre', wheelIndex);
            const oData = extractChannelData(telemetryData, 'TyresTempOutside', wheelIndex);
            const carcData = extractChannelData(telemetryData, 'TyresCarcassTemp', wheelIndex);
            
            if (!iData || !cData || !oData) return;
            
            if (carcData) currentSeries.push(carcData.slice(startIdx, endIdx + 1));
            currentSeries.push(iData.slice(startIdx, endIdx + 1));
            currentSeries.push(cData.slice(startIdx, endIdx + 1));
            currentSeries.push(oData.slice(startIdx, endIdx + 1));
            currentVal = currentSeries[2]; // Center is now at index 2 (Carc=0, Ins=1, Mid=2)
        } else if (isBundled) {
            if (channel === 'RideHeights') {
                const fRaw = extractChannelData(telemetryData, 'FrontRideHeight', 0);
                const rRaw = extractChannelData(telemetryData, 'RearRideHeight', 0);
                if (fRaw) {
                    const fSliced = fRaw.slice(startIdx, endIdx + 1);
                    smartScale(fSliced, 1000);
                    currentSeries.push(fSliced);
                }
                if (rRaw) {
                    const rSliced = rRaw.slice(startIdx, endIdx + 1);
                    smartScale(rSliced, 1000);
                    currentSeries.push(rSliced);
                }
            } else if (channel === 'SuspPosFront' || channel === 'SuspPosRear') {
                const wheelIndices = channel === 'SuspPosFront' ? [0, 1] : [2, 3];
                wheelIndices.forEach(idx => {
                    const raw = extractChannelData(telemetryData, 'Susp Pos', idx);
                    if (raw) {
                        const sliced = raw.slice(startIdx, endIdx + 1);
                        smartScale(sliced, 1000);
                        currentSeries.push(sliced);
                    }
                });
            } else if (channel === 'ThirdDeflectionMerged') {
                const fRaw = extractChannelData(telemetryData, 'Front3rdDeflection');
                const rRaw = extractChannelData(telemetryData, 'Rear3rdDeflection');
                if (fRaw) {
                    const fSliced = fRaw.slice(startIdx, endIdx + 1);
                    smartScale(fSliced, 1000);
                    currentSeries.push(fSliced);
                }
                if (rRaw) {
                    const rSliced = rRaw.slice(startIdx, endIdx + 1);
                    smartScale(rSliced, 1000);
                    currentSeries.push(rSliced);
                }
            } else if (channel === 'HandlingMerged') {
                const gLat = extractChannelData(telemetryData, 'G Force Lat');
                const speed = extractChannelData(telemetryData, 'Ground Speed');
                const steer = extractChannelData(telemetryData, 'Steering Angle');
                
                if (gLat && speed) {
                    const yaw = new Float64Array(gLat.length);
                    for (let i = 0; i < gLat.length; i++) {
                        const v = speed[i] / 3.6;
                        yaw[i] = v > 1.0 ? (gLat[i] * 9.81 / v) * (180 / Math.PI) : 0;
                    }
                    currentSeries.push(yaw.slice(startIdx, endIdx + 1));
                }
                if (steer) {
                    currentSeries.push(steer.slice(startIdx, endIdx + 1));
                }
            } else {
                for (let i = 0; i < 4; i++) {
                    const raw = extractChannelData(telemetryData, channel, i);
                    if (raw) {
                        const sliced = raw.slice(startIdx, endIdx + 1);
                        if (isPercentage) smartScale(sliced, 100);
                        currentSeries.push(sliced);
                    }
                }
            }
            currentVal = currentSeries[0] || new Float64Array(0);
        } else if (channel === 'Yaw Rate') {
            const gLat = extractChannelData(telemetryData, 'G Force Lat');
            const speed = extractChannelData(telemetryData, 'Ground Speed');
            if (gLat && speed) {
                const yaw = new Float64Array(gLat.length);
                for (let i = 0; i < gLat.length; i++) {
                    const v = speed[i] / 3.6;
                    yaw[i] = v > 1.0 ? (gLat[i] * 9.81 / v) * (180 / Math.PI) : 0;
                }
                currentSeries.push(yaw.slice(startIdx, endIdx + 1));
            }
            currentVal = currentSeries[0] || new Float64Array(0);
        } else {
            const raw = extractChannelData(telemetryData, channel, wheelIndex);
            if (!raw) return;
            
            const sliced = raw.slice(startIdx, endIdx + 1);
            if ((channel === 'Speed' || channel === 'Ground Speed') && speedUnit === 'mph') {
                currentVal = new Float64Array(sliced.length);
                for (let i = 0; i < sliced.length; i++) currentVal[i] = sliced[i] * 0.621371;
            } else {
                currentVal = sliced;
                if (channel === 'Steering Angle' && userWheelRotation !== null && sessionMetadata?.steeringLock) {
                    const factor = userWheelRotation / sessionMetadata.steeringLock;
                    for (let i = 0; i < currentVal.length; i++) currentVal[i] *= factor;
                }
                if (isMillimeters) smartScale(currentVal, 1000);
                if (isPercentage) smartScale(currentVal, 100);
                if (channel === 'SoC' || channel === 'Virtual Energy') {
                    for (let i = 0; i < currentVal.length; i++) currentVal[i] /= 100000000;
                }
            }
            currentSeries.push(currentVal);
        }

        if (channel.toLowerCase() === 'gear') {
            const out = new Float64Array(currentVal);
            for (let i = 1; i < out.length - 1; i++) {
                if (out[i] === 0) {
                    let prevNonZero = 0;
                    for (let j = i - 1; j >= Math.max(0, i - 30); j--) { 
                        if (out[j] !== 0 && !Number.isNaN(out[j])) { prevNonZero = out[j]; break; } 
                    }
                    let nextNonZero = 0;
                    for (let j = i + 1; j < Math.min(i + 30, out.length); j++) { 
                        if (out[j] !== 0 && !Number.isNaN(out[j])) { nextNonZero = out[j]; break; } 
                    }
                    
                    // If it's a transient 0 between two non-zero gears, hold the previous gear
                    if (prevNonZero !== 0 && nextNonZero !== 0) {
                        out[i] = prevNonZero;
                    }
                }
            }
            currentVal = out;
            // Update the series since we already pushed the raw version
            if (currentSeries.length > 0) currentSeries[currentSeries.length - 1] = currentVal;
        }

        let refValAligned: Float64Array | null = null;
        let refTimeAligned: Float64Array | null = null;
        let xAxisData: Float64Array = currentDist;
        const isTimeSync = dashboardSyncMode === 'time' && channel !== 'Time Delta';

        const refSource = reliesOnExternalData ? referenceTelemetryData : telemetryData;

        if (targetRefLapIdx !== null && (targetRefLapIdx != selectedLapIdx || reliesOnExternalData)) {
            const refTimeArray = getChan(refSource, 'Time');
            const refDistArray = getChan(refSource, 'Lap Dist', 'Distance');
            const refLapArray = getChan(refSource, 'Lap', 'lap');

            if (refTimeArray && refDistArray && refLapArray) {
                let refStart = -1, refEnd = -1;
                for (let i = 0; i < refLapArray.length; i++) {
                    if (refLapArray[i] == targetRefLapIdx) {
                        if (refStart === -1) refStart = i;
                        refEnd = i;
                    }
                }

                if (refStart !== -1 && refEnd !== -1) {
                    const rTime = refTimeArray.slice(refStart, refEnd + 1);
                    const rStartTime = rTime[0];
                    const rElapsedTime = new Float64Array(rTime.length);
                    for (let k = 0; k < rTime.length; k++) rElapsedTime[k] = Math.max(0, rTime[k] - rStartTime);

                    const rawRefDist = refDistArray.slice(refStart, refEnd + 1);
                    const refDist = new Float64Array(rawRefDist.length);
                    const refDistStart = rawRefDist[0];
                    for (let i = 0; i < rawRefDist.length; i++) refDist[i] = rawRefDist[i] - refDistStart;

                    const alignAndExtract = (chan: string, wheelIdx?: number) => {
                        if (chan === 'Yaw Rate') {
                            const gLat = extractChannelData(refSource as TelemetryData, 'G Force Lat');
                            const speed = extractChannelData(refSource as TelemetryData, 'Ground Speed');
                            if (!gLat || !speed) return null;
                            const yaw = new Float64Array(gLat.length);
                            for (let i = 0; i < gLat.length; i++) {
                                const v = speed[i] / 3.6;
                                yaw[i] = v > 1.0 ? (gLat[i] * 9.81 / v) * (180 / Math.PI) : 0;
                            }
                            const processed = yaw;
                            if (isTimeSync) {
                                if (rElapsedTime[rElapsedTime.length - 1] > (currentElapsed[currentElapsed.length - 1] || 0) + 0.001) {
                                    return processed;
                                }
                                return interp(currentElapsed, rElapsedTime, processed);
                            }
                            return interp(currentDist, refDist, processed);
                        }

                        const raw = extractChannelData(refSource as TelemetryData, chan, wheelIdx !== undefined ? wheelIdx : wheelIndex);
                        if (!raw) return null;
                        const sliced = raw.slice(refStart, refEnd + 1);
                        
                        let processed = sliced;
                        if ((chan === 'Speed' || chan === 'Ground Speed') && speedUnit === 'mph') {
                            processed = new Float64Array(sliced.length);
                            for (let i = 0; i < sliced.length; i++) processed[i] = sliced[i] * 0.621371;
                        } else if (unit === 'mm') {
                            smartScale(sliced, 1000);
                            processed = sliced;
                        } else if (unit === '%') {
                            smartScale(sliced, 100);
                            processed = sliced;
                        } else if (chan === 'SoC' || chan === 'Virtual Energy') {
                            for (let i = 0; i < sliced.length; i++) sliced[i] /= 100000000;
                            processed = sliced;
                        }

                        if (chan.toLowerCase() === 'gear') {
                            const out = new Float64Array(processed);
                            for (let i = 1; i < out.length - 1; i++) {
                                if (out[i] === 0) {
                                    let prevNonZero = 0;
                                    for (let j = i - 1; j >= Math.max(0, i - 30); j--) { 
                                        if (out[j] !== 0 && !Number.isNaN(out[j])) { prevNonZero = out[j]; break; } 
                                    }
                                    let nextNonZero = 0;
                                    for (let j = i + 1; j < Math.min(i + 30, out.length); j++) { 
                                        if (out[j] !== 0 && !Number.isNaN(out[j])) { nextNonZero = out[j]; break; } 
                                    }
                                    if (prevNonZero !== 0 && nextNonZero !== 0) out[i] = prevNonZero;
                                }
                            }
                            processed = out;
                        }

                        if (isTimeSync) {
                            if (rElapsedTime[rElapsedTime.length - 1] > (currentElapsed[currentElapsed.length - 1] || 0) + 0.001) {
                                return processed;
                            }
                            return interp(currentElapsed, rElapsedTime, processed);
                        }
                        return interp(currentDist, refDist, processed);
                    };

                    if (isTimeSync) {
                        const curDur = currentElapsed[currentElapsed.length - 1] || 0;
                        const refDur = rElapsedTime[rElapsedTime.length - 1] || 0;

                        if (refDur > curDur + 0.001) {
                            xAxisData = rElapsedTime;
                            currentSeries = currentSeries.map(s => interp(xAxisData, currentElapsed, s));
                            const mappedCurrentTime = interp(xAxisData, currentElapsed, currentTime);
                            currentTimeRef.current = mappedCurrentTime as any;
                            
                            if (isTireHeat) {
                                const carcRef = alignAndExtract('TyresCarcassTemp');
                                if (carcRef) refSeries.push(carcRef);
                                refSeries.push(alignAndExtract('TyresTempInside')!);
                                refSeries.push(alignAndExtract('TyresTempCentre')!);
                                refSeries.push(alignAndExtract('TyresTempOutside')!);
                            } else if (isBundled) {
                                if (channel === 'RideHeights') {
                                    const f = alignAndExtract('FrontRideHeight', 0);
                                    const r = alignAndExtract('RearRideHeight', 0);
                                    if (f) refSeries.push(f);
                                    if (r) refSeries.push(r);
                                } else if (channel === 'SuspPosFront' || channel === 'SuspPosRear') {
                                    const wheelIndices = channel === 'SuspPosFront' ? [0, 1] : [2, 3];
                                    wheelIndices.forEach(idx => {
                                        const aligned = alignAndExtract('Susp Pos', idx);
                                        if (aligned) refSeries.push(aligned);
                                    });
                                } else if (channel === 'ThirdDeflectionMerged') {
                                    const f = alignAndExtract('Front3rdDeflection');
                                    const r = alignAndExtract('Rear3rdDeflection');
                                    if (f) refSeries.push(f);
                                    if (r) refSeries.push(r);
                                } else {
                                    for (let i = 0; i < 4; i++) {
                                        const aligned = alignAndExtract(channel, i);
                                        if (aligned) refSeries.push(aligned);
                                    }
                                }
                            } else if (channel !== 'Time Delta') {
                                refSeries.push(alignAndExtract(channel)!);
                            }
                            refTimeAligned = rElapsedTime;
                        } else {
                            xAxisData = currentElapsed;
                            if (isTireHeat) {
                                const carcRef = alignAndExtract('TyresCarcassTemp');
                                if (carcRef) refSeries.push(carcRef);
                                refSeries.push(alignAndExtract('TyresTempInside')!);
                                refSeries.push(alignAndExtract('TyresTempCentre')!);
                                refSeries.push(alignAndExtract('TyresTempOutside')!);
                            } else if (isBundled) {
                                if (channel === 'RideHeights') {
                                    const f = alignAndExtract('FrontRideHeight', 0);
                                    const r = alignAndExtract('RearRideHeight', 0);
                                    if (f) refSeries.push(f);
                                    if (r) refSeries.push(r);
                                } else if (channel === 'SuspPosFront' || channel === 'SuspPosRear') {
                                    const wheelIndices = channel === 'SuspPosFront' ? [0, 1] : [2, 3];
                                    wheelIndices.forEach(idx => {
                                        const aligned = alignAndExtract('Susp Pos', idx);
                                        if (aligned) refSeries.push(aligned);
                                    });
                                } else if (channel === 'ThirdDeflectionMerged') {
                                    const f = alignAndExtract('Front3rdDeflection');
                                    const r = alignAndExtract('Rear3rdDeflection');
                                    if (f) refSeries.push(f);
                                    if (r) refSeries.push(r);
                                } else {
                                    for (let i = 0; i < 4; i++) {
                                        const aligned = alignAndExtract(channel, i);
                                        if (aligned) refSeries.push(aligned);
                                    }
                                }
                            } else if (channel !== 'Time Delta') {
                                refSeries.push(alignAndExtract(channel)!);
                            }
                            refTimeAligned = interp(xAxisData, rElapsedTime, rElapsedTime);
                        }
                    } else {
                        xAxisData = currentDist;
                        if (isTireHeat) {
                            const carcRef = alignAndExtract('TyresCarcassTemp');
                            if (carcRef) refSeries.push(carcRef);
                            refSeries.push(alignAndExtract('TyresTempInside')!);
                            refSeries.push(alignAndExtract('TyresTempCentre')!);
                            refSeries.push(alignAndExtract('TyresTempOutside')!);
                        } else if (isBundled) {
                            if (channel === 'RideHeights') {
                                const f = alignAndExtract('FrontRideHeight', 0);
                                const r = alignAndExtract('RearRideHeight', 0);
                                if (f) refSeries.push(f);
                                if (r) refSeries.push(r);
                            } else if (channel === 'SuspPosFront' || channel === 'SuspPosRear') {
                                const wheelIndices = channel === 'SuspPosFront' ? [0, 1] : [2, 3];
                                wheelIndices.forEach(idx => {
                                    const aligned = alignAndExtract('Susp Pos', idx);
                                    if (aligned) refSeries.push(aligned);
                                });
                            } else if (channel === 'ThirdDeflectionMerged') {
                                const f = alignAndExtract('Front3rdDeflection');
                                const r = alignAndExtract('Rear3rdDeflection');
                                if (f) refSeries.push(f);
                                if (r) refSeries.push(r);
                            } else if (channel === 'HandlingMerged') {
                                // Extract Yaw Rate for ref
                                const gLat = extractChannelData(refSource as TelemetryData, 'G Force Lat');
                                const speed = extractChannelData(refSource as TelemetryData, 'Ground Speed');
                                if (gLat && speed) {
                                    const yaw = new Float64Array(gLat.length);
                                    for (let i = 0; i < gLat.length; i++) {
                                        const v = speed[i] / 3.6;
                                        yaw[i] = v > 1.0 ? (gLat[i] * 9.81 / v) * (180 / Math.PI) : 0;
                                    }
                                    const alignedYaw = isTimeSync 
                                        ? (rElapsedTime[rElapsedTime.length - 1] > (currentElapsed[currentElapsed.length - 1] || 0) + 0.001 ? yaw : interp(currentElapsed, rElapsedTime, yaw as any))
                                        : interp(currentDist, refDist, yaw as any);
                                    refSeries.push(alignedYaw);
                                }
                                const alignedSteer = alignAndExtract('Steering Angle');
                                if (alignedSteer) refSeries.push(alignedSteer);
                            } else {
                                for (let i = 0; i < 4; i++) {
                                    const aligned = alignAndExtract(channel, i);
                                    if (aligned) refSeries.push(aligned);
                                }
                            }
                        } else if (channel !== 'Time Delta') {
                            const aligned = alignAndExtract(channel);
                            if (aligned) refSeries.push(aligned);
                        }
                        refTimeAligned = interp(xAxisData, refDist, rElapsedTime);
                    }
                    if (refSeries.length > 0) refValAligned = refSeries[0];
                }
            }
        } else {
            xAxisData = (singleLapXAxisMode === 'time') ? currentElapsed : currentDist;
        }

        if (refValAligned && channel === 'Steering Angle' && userWheelRotation !== null) {
            const refMeta = referenceSessionMetadata || sessionMetadata;
            if (refMeta?.steeringLock) {
                const factor = userWheelRotation / refMeta.steeringLock;
                for (let i = 0; i < refValAligned.length; i++) refValAligned[i] *= factor;
            }
        }
        
        startIdxRef.current = startIdx;
        currentDistRef.current = currentDist as any;
        currentXDataRef.current = xAxisData as any;
        refTimeAlignedRef.current = refTimeAligned as any;

        if (channel === 'Time Delta') {
            let lastValidIdx = -1;
            if (refTimeAligned) {
                const curElapsedForDelta = isTimeSync ? xAxisData : currentElapsed;
                    
                for (let i = 0; i < currentVal.length; i++) {
                    const cT = curElapsedForDelta[i];
                    const rT = refTimeAligned[i];
                    if (!Number.isNaN(cT) && !Number.isNaN(rT)) {
                        currentVal[i] = cT - rT;
                        lastValidIdx = i;
                    } else {
                        currentVal[i] = Number.NaN;
                    }
                }
                
                const curLapDuration = (laps.find(l => l.lap === selectedLapIdx) || {}).duration || 0;
                const refMeta = referenceLap || (referenceLapIdx !== null ? laps.find(l => l.lap === referenceLapIdx) : null);
                const refLapDuration = refMeta ? refMeta.duration : 0;
                
                if (curLapDuration > 0 && refLapDuration > 0 && lastValidIdx > 0) {
                    const finalTrueDelta = curLapDuration - refLapDuration;
                    const uncorrectedFinalDelta = currentVal[lastValidIdx];
                    const driftError = finalTrueDelta - uncorrectedFinalDelta;
                    
                    for (let i = 0; i <= lastValidIdx; i++) {
                        if (!Number.isNaN(currentVal[i])) {
                            currentVal[i] += (i / lastValidIdx) * driftError;
                        }
                    }
                }
            } else {
                currentVal.fill(0);
            }
        }

        for (let i = 0; i < currentVal.length; i++) if (!Number.isFinite(currentVal[i])) currentVal[i] = Number.NaN;

        let maxXBound = xAxisData.length > 0 ? xAxisData[xAxisData.length - 1] : 0;
        if (!isXAxisTime && sessionMetadata?.officialTrackLength) {
            maxXBound = sessionMetadata.officialTrackLength;
        }


    const syncUI = (idx: number | null | undefined) => {
            if (idx === undefined || idx === null) {
                if (multiValueContainerRef.current) multiValueContainerRef.current.innerHTML = "";
                if (multiRefValueContainerRef.current) multiRefValueContainerRef.current.innerHTML = "";
                if (timeRef.current) timeRef.current.textContent = "";
                return;
            }

            const formatVal = (v: number | null | undefined) => {
                if (v == null || Number.isNaN(v)) return { text: "-", color: "text-white" };
                if (channel === 'Time Delta') {
                    const text = (v > 0 ? "+" : "") + v.toFixed(3);
                    const color = v > 0 ? "#f87171" : v < 0 ? "#4ade80" : "white";
                    return { text, color };
                }
                if (unit === 'G') {
                    return { text: v.toFixed(2), color: null };
                }
                if (unit === 'MJ') {
                    return { text: v.toFixed(2), color: null };
                }
                const text = (unit === 'mm' || unit === '%') ? v.toFixed(1) : Math.round(v).toFixed(0);
                return { text, color: null };
            };

            // Update Current Values
            if (multiValueContainerRef.current) {
                let html = "";
                currentSeries.forEach((s, i) => {
                    const info = getBundledInfo(i);
                    const { text, color: valColor } = formatVal(s[idx]);
                    const finalColor = valColor || info.stroke;
                    
                    let unitSuffix = "";
                    if (channel === 'HandlingMerged') {
                        unitSuffix = i === 0 ? " deg/s" : " deg";
                    }

                    html += `<span style="color: ${finalColor}; display: inline-flex; align-items: center; height: 24px; line-height: 1;" class="font-mono font-black">${text}${unitSuffix}</span>`;
                    if (i < currentSeries.length - 1) html += `<span style="display: inline-flex; align-items: center; height: 24px; line-height: 1; transform: translateY(-1px);" class="text-gray-600 mx-1 text-[10px]">|</span>`;
                });
                multiValueContainerRef.current.innerHTML = html;
            }

            // Update Reference Values
            if (multiRefValueContainerRef.current) {
                let html = "";
                refSeries.forEach((s, i) => {
                    const { text } = formatVal(s[idx]);
                    
                    let unitSuffix = "";
                    if (channel === 'HandlingMerged') {
                        unitSuffix = i === 0 ? " deg/s" : " deg";
                    }

                    html += `<span style="display: inline-flex; align-items: center; height: 24px; line-height: 1; color: #ffb300;" class="font-mono opacity-80">${text}${unitSuffix}</span>`;
                    if (i < refSeries.length - 1) html += `<span style="display: inline-flex; align-items: center; height: 24px; line-height: 1; transform: translateY(-1px);" class="text-gray-600 mx-1 text-[10px]">|</span>`;
                });
                multiRefValueContainerRef.current.innerHTML = html;
            }

            if (showLapTime && timeRef.current && currentTimeRef.current) {
                const baseIdx = Math.floor(idx);
                const t = currentTimeRef.current[baseIdx];
                let refT = 0, delta = 0, hasRef = false;
                if (refTimeAligned && refTimeAligned.length > baseIdx) {
                    refT = refTimeAligned[baseIdx] ?? 0;
                    if (!Number.isNaN(t) && !Number.isNaN(refT)) { delta = t - refT; hasRef = true; }
                }
                const fmt = (sec: number) => {
                    if (Number.isNaN(sec)) return "--:--.---";
                    const m = Math.floor(sec / 60);
                    const s = (sec % 60).toFixed(3).padStart(6, '0');
                    return `${m}:${s}`;
                };
                const currentStr = fmt(t);
                const refStr = hasRef ? fmt(refT) : "--:--.---";
                const deltaStr = hasRef ? (delta > 0 ? "+" : "-") + fmt(Math.abs(delta)) : "--:--.---";
                let deltaColor = "text-gray-500";
                if (hasRef) { deltaColor = delta > 0 ? "text-red-500" : "text-green-500"; }
                timeRef.current.innerHTML = `
                    <span class="text-[#3b82f6] mr-1 text-[10px]">CUR :</span><span class="text-white mr-3 text-[10px]">${currentStr}</span>
                `;
            }
        };

        const setCursorHook = (u: uPlot) => {
            const idx = u.cursor.idx;
            syncUI(idx);
            // ONLY update the global store if the user is actually hovering/interacting with THIS chart
            // This prevents infinite update loops when programmatically moving the cursor during sync.
            if (idx !== undefined && idx !== null && xAxisData && !isPlayingRef.current && isHoveringRef.current) {
                const xVal = xAxisData[idx];
                const time = telemetryData['Time'];
                if (time && sessionMetadata) {
                    if (isXAxisTime) {
                        // In Time Sync, update the absolute playback time. 
                        // This allows maps/overlays to show cars beyond the current lap's end.
                        const { setPlaybackTime } = useTelemetryStore.getState();
                        setPlaybackTime(xVal);
                    } else {
                        // In Distance Sync, update the physical cursor index.
                        const targetIdx = startIdx + idx;
                        if (targetIdx !== null && targetIdx !== cursorIndex) setCursorIndex(targetIdx);
                    }
                }
            }
        };

        const setScaleHook = (u: uPlot) => {
            const minX = u.scales.x.min || 0, maxX = u.scales.x.max || maxXBound;
            if (minX <= (isXAxisTime ? 0.01 : 1) && maxX >= maxXBound - (isXAxisTime ? 0.01 : 1)) { setZoomRange(null); return; }
            let sIdx = -1, eIdx = -1;
            for (let i = 0; i < xAxisData.length; i++) {
                if (xAxisData[i] >= minX && sIdx === -1) sIdx = i;
                if (xAxisData[i] <= maxX) eIdx = i;
            }
            if (sIdx !== -1 && eIdx !== -1) setZoomRange([startIdx + sIdx, startIdx + eIdx]);
        };

        // --- 3. Dynamic Series Config for uPlot ---
        const uSeries: uPlot.Series[] = [{}]; // X-Axis
        

        // Current Lap Series
        currentSeries.forEach((s, i) => {
            const info = getBundledInfo(i);
            const isElectronics = activeChartCategory === 'Systems' && (channel === 'TC' || channel === 'ABS');
            uSeries.push({
                label: info.label,
                stroke: info.stroke,
                width: isElectronics ? 2 : 2,
                ...(isElectronics ? {
                    points: { 
                        show: true,
                        filter: (u: uPlot, seriesIdx: number) => {
                            const data = u.data[seriesIdx];
                            const res = [];
                            for (let i = 0; i < (data?.length || 0); i++) {
                                const v = data[i];
                                if (v != null && v > 0) res.push(i);
                            }
                            return res;
                        },
                        space: 20,
                        size: 4,
                        stroke: info.stroke,
                        fill: info.stroke
                    }
                } : {}),
                spanGaps: true,
                ...({ shadowBlur: (isTireHeat && i === 0) ? 0 : 10, shadowColor: info.stroke } as any)
            });
        });

        // Reference Lap Series
        refSeries.forEach((s, i) => {
            const info = getBundledInfo(i);
            const isElectronics = activeChartCategory === 'Systems' && (channel === 'TC' || channel === 'ABS');
            uSeries.push({
                label: `Ref ${info.label}`,
                stroke: 'rgba(218, 165, 32, 0.6)', // Golden with opacity
                width: isElectronics ? 2 : 2,
                dash: [5, 5],
                ...(isElectronics ? {
                    points: { 
                        show: true,
                        filter: (u: uPlot, seriesIdx: number) => {
                            const data = u.data[seriesIdx];
                            const res = [];
                            for (let i = 0; i < (data?.length || 0); i++) {
                                const v = data[i];
                                if (v != null && v > 0) res.push(i);
                            }
                            return res;
                        },
                        space: 20,
                        size: 4,
                        stroke: 'rgba(218, 165, 32, 0.8)',
                        fill: 'rgba(218, 165, 32, 0.8)'
                    }
                } : {}),
                spanGaps: true
            });
        });

        const data = [xAxisData, ...currentSeries, ...refSeries];

        // Auto-scale with padding
        let minY = Infinity;
        let maxY = -Infinity;

        const isSplitChannel = channel === 'TireHeat' || channel === 'Susp Pos' || 
                              channel.includes('3rdDeflection') || channel.includes('RideHeight') ||
                              channel === 'SuspPosFront' || channel === 'SuspPosRear';

        if (isSplitChannel) {
            // Determine the group of channels to scan together
            let targetGroup: string[] = [];
            if (channel === 'TireHeat') targetGroup = ['TyresTempInside', 'TyresTempCentre', 'TyresTempOutside', 'TyresCarcassTemp'];
            else if (channel === 'Susp Pos' || channel === 'SuspPosFront' || channel === 'SuspPosRear') targetGroup = ['Susp Pos'];
            else if (channel.includes('3rdDeflection') || channel === 'ThirdDeflectionMerged') targetGroup = ['Front3rdDeflection', 'Rear3rdDeflection'];
            else if (channel.includes('RideHeight') || channel === 'RideHeights') targetGroup = ['FrontRideHeight', 'RearRideHeight'];

            const scanSource = (src: TelemetryData | null, sIdx: number, eIdx: number) => {
                if (!src) return;
                targetGroup.forEach(chan => {
                    // For wheel-split channels, scan 4 wheels. For others, scan wheelIndex 0.
                    const wheelsToScan = (chan === 'Susp Pos' || chan.startsWith('TyresTemp')) ? 4 : 1;
                    
                    for (let w = 0; w < wheelsToScan; w++) {
                        const raw = extractChannelData(src, chan, w);
                        if (raw) {
                            const sliced = raw.slice(sIdx, eIdx + 1);
                            // Apply scaling if needed
                            if ((chan === 'Susp Pos' || chan.includes('3rdDeflection') || chan.includes('RideHeight')) && unit === 'mm') {
                                smartScale(sliced, 1000);
                            }
                            if (chan === 'TireHeat' && unit === '%') smartScale(sliced, 100);

                            for (let i = 0; i < sliced.length; i++) {
                                const v = sliced[i];
                                if (v != null && !Number.isNaN(v)) {
                                    if (v < minY) minY = v;
                                    if (v > maxY) maxY = v;
                                }
                            }
                        }
                    }
                });
            };

            // Scan Current Session
            scanSource(telemetryData, startIdx, endIdx);
            // Scan Reference Session
            if (refSource && targetRefLapIdx !== null) {
                let rStart = -1, rEnd = -1;
                const refLapArray = getChan(refSource, 'Lap', 'lap');
                if (refLapArray) {
                    for (let i = 0; i < refLapArray.length; i++) {
                        if (refLapArray[i] == targetRefLapIdx) {
                            if (rStart === -1) rStart = i;
                            rEnd = i;
                        }
                    }
                    if (rStart !== -1) scanSource(refSource as TelemetryData, rStart, rEnd);
                }
            }
        } else {
            // Single-chart scaling
            const allData = [...currentSeries, ...refSeries];
            let minV = Infinity, maxV = -Infinity;
            allData.forEach(s => {
                for (let i = 0; i < s.length; i++) {
                    const v = s[i];
                    if (v != null && !Number.isNaN(v)) {
                        if (v < minV) minV = v;
                        if (v > maxV) maxV = v;
                    }
                }
            });

            // Symmetric Scale for Yaw, Steering, G-Forces, HandlingMerged, Time Delta
            if (channel === 'Yaw Rate' || channel === 'Steering Angle' || channel === 'HandlingMerged' || channel === 'G Force Lat' || channel === 'G Force Long' || channel === 'Time Delta' ||
                ((channel === 'Susp Pos' || channel === 'SuspPosFront' || channel === 'SuspPosRear') && suspensionTravelMode === 'relative')) {
                const absMax = Math.max(Math.abs(minV), Math.abs(maxV));
                // Add 10% padding
                const paddedMax = absMax * 1.1 || (channel === 'Time Delta' ? 1 : 10);
                minY = -paddedMax;
                maxY = paddedMax;
            } else {
                minY = minV;
                maxY = maxV;
                const range = maxY - minY;
                minY -= range * 0.05;
                maxY += range * 0.05;
            }
        }

        if (minY === Infinity) { minY = 0; maxY = 100; }
        else {
            if (minY !== maxY && ! (channel === 'Yaw Rate' || channel === 'Steering Angle' || channel === 'HandlingMerged' || channel === 'G Force Lat' || channel === 'G Force Long' || channel === 'Time Delta' ||
                ((channel === 'Susp Pos' || channel === 'SuspPosFront' || channel === 'SuspPosRear') && suspensionTravelMode === 'relative'))) {
                const range = maxY - minY;
                const pad = Math.max(0.1, range * 0.15); // 15% padding
                minY -= pad;
                maxY += pad;
                
                // For pedals, ensure we always see at least 0-100 if data is within that
                const isPedal = channel.includes('Throttle') || channel.includes('Brake');
                if (isPercentage && isPedal && minY > -5 && maxY < 105) {
                    minY = Math.min(minY, -2);
                    maxY = Math.max(maxY, 102);
                }

                if (maxY === minY) { minY -= 1; maxY += 1; }
            }
        }

        // Special ranges for trigger-based channels
        if (channel === 'TC' || channel === 'ABS') {
            minY = 0;
            maxY = 1.2;
        }

        const opts: uPlot.Options = {
            width: chartRef.current.clientWidth, 
            height: height, 
            legend: { show: false },
            series: uSeries,
            scales: { 
                x: { time: false, auto: false, min: 0, max: maxXBound }, 
                y: { auto: false, range: [minY, maxY] } 
            },
            axes: [
                { 
                    grid: { show: false }, stroke: "#888", ticks: { stroke: "#555" }, space: 100,
                    values: (_u: uPlot, splits: number[]) => splits.map(v => isXAxisTime ? `${v.toFixed(1)}s` : (v > 1000 ? `${(v/1000).toFixed(2)}km` : `${v.toFixed(0)}m`))
                },
                { 
                    size: 50, 
                    grid: { show: true, stroke: 'rgba(255,255,255,0.05)', width: 1 }, 
                    ticks: { show: false }, 
                    stroke: getRGBA(color, 0.8),
                    space: 25
                }
            ],
            cursor: { sync: { key: syncKey }, drag: { x: true, y: false } },
            hooks: { 
                setCursor: [setCursorHook], 
                setScale: [setScaleHook],
                draw: [
                    (u: uPlot) => {
                        const isElectronics = (activeChartCategory === 'Systems' && (channel === 'TC' || channel === 'ABS'));
                        const isSuspRelative = (channel === 'Susp Pos' || channel === 'SuspPosFront' || channel === 'SuspPosRear') && suspensionTravelMode === 'relative';
                        if (channel === 'Yaw Rate' || channel === 'Steering Angle' || channel === 'HandlingMerged' || channel === 'G Force Lat' || channel === 'G Force Long' || channel === 'Time Delta' || isElectronics || isSuspRelative) {
                            const { ctx, bbox } = u;
                            const zeroY = u.valToPos(0, 'y', true);
                            if (zeroY >= bbox.top && zeroY <= bbox.top + bbox.height) {
                                ctx.save();
                                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                                ctx.lineWidth = 2;
                                ctx.setLineDash([5, 5]); // Dashed zero line
                                ctx.beginPath();
                                ctx.moveTo(bbox.left, zeroY);
                                ctx.lineTo(bbox.left + bbox.width, zeroY);
                                ctx.stroke();
                                ctx.restore();
                            }
                        }
                        
                        if (suspensionTravelMode === 'raw' && !hasReferenceData && (channel === 'Susp Pos' || channel === 'SuspPosFront' || channel === 'SuspPosRear')) {
                            const { ctx, bbox } = u;
                            const wheelIndices = channel === 'SuspPosFront' ? [0, 1] :
                                                 channel === 'SuspPosRear' ? [2, 3] :
                                                 [wheelIndex !== undefined ? wheelIndex : 0];
                            
                            wheelIndices.forEach((wIdx) => {
                                const info = getBundledInfo(channel === 'Susp Pos' ? 0 : (channel === 'SuspPosFront' ? wIdx : wIdx - 2));
                                
                                // Current Session Baseline
                                if (telemetryData?.suspension_baselines) {
                                    const baseVal = Math.abs((telemetryData.suspension_baselines[wIdx] || 0) * 1000);
                                    const yPos = u.valToPos(baseVal, 'y', true);
                                    if (yPos >= bbox.top && yPos <= bbox.top + bbox.height) {
                                        ctx.save();
                                        ctx.strokeStyle = getRGBA(info.stroke, 0.6);
                                        ctx.lineWidth = 1.5;
                                        ctx.setLineDash([6, 4]);
                                        ctx.beginPath();
                                        ctx.moveTo(bbox.left, yPos);
                                        ctx.lineTo(bbox.left + bbox.width, yPos);
                                        ctx.stroke();
                                        ctx.restore();
                                    }
                                }

                                // Reference Session Baseline
                                if (hasReferenceData && refSource?.suspension_baselines) {
                                    const baseVal = Math.abs((refSource.suspension_baselines[wIdx] || 0) * 1000);
                                    const yPos = u.valToPos(baseVal, 'y', true);
                                    if (yPos >= bbox.top && yPos <= bbox.top + bbox.height) {
                                        ctx.save();
                                        ctx.strokeStyle = 'rgba(218, 165, 32, 0.4)';
                                        ctx.lineWidth = 1.5;
                                        ctx.setLineDash([4, 4]);
                                        ctx.beginPath();
                                        ctx.moveTo(bbox.left, yPos);
                                        ctx.lineTo(bbox.left + bbox.width, yPos);
                                        ctx.stroke();
                                        ctx.restore();
                                    }
                                }
                            });
                        }
                    }
                ]
            }
        };

        uplotRef.current = new uPlot(opts, data as any, chartRef.current);

        // Add click listener to jump playback on chart click (ignoring drag and double-click)
        const over = uplotRef.current.over;
        let startX = 0, startY = 0;
        let clickTimer: any = null;

        const onMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            startX = e.clientX;
            startY = e.clientY;
        };

        const onMouseUp = (e: MouseEvent) => {
            if (e.button !== 0) return;
            
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            
            // 1. Skip if moved (likely a drag/zoom)
            if (dx > 5 || dy > 5) return;

            // 2. Handle double-click prevention
            if (clickTimer) {
                clearTimeout(clickTimer);
                clickTimer = null;
                return; // Double click detected, cancel jump
            }

            const u = uplotRef.current;
            if (!u || !currentXDataRef.current) return;
            
            // Calculate index directly from mouse position to avoid snapping to the "playback point"
            const rect = over.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const idx = u.posToIdx(mouseX);

            if (idx !== undefined && idx !== null && idx >= 0 && idx < currentXDataRef.current.length) {
                const xVal = currentXDataRef.current[idx];
                const targetCursorIdx = startIdxRef.current + idx;
                
                clickTimer = setTimeout(() => {
                    if (isXAxisTime) {
                        setPlaybackTime(xVal);
                    } else {
                        setCursorIndex(targetCursorIdx);
                    }
                    clickTimer = null;
                }, 250); // 250ms threshold for double-click
            }
        };

        const onMouseEnter = () => {
            isHoveringRef.current = true;
            setIsUserInteractingWithCharts(true);
        };
        const onMouseLeave = () => {
            isHoveringRef.current = false;
            setIsUserInteractingWithCharts(false);
        };

        over.addEventListener('mousedown', onMouseDown);
        over.addEventListener('mouseup', onMouseUp);
        over.addEventListener('mouseenter', onMouseEnter);
        over.addEventListener('mouseleave', onMouseLeave);

        return () => {
            if (uplotRef.current) { 
                over.removeEventListener('mousedown', onMouseDown);
                over.removeEventListener('mouseup', onMouseUp);
                over.removeEventListener('mouseenter', onMouseEnter);
                over.removeEventListener('mouseleave', onMouseLeave);
                if (clickTimer) clearTimeout(clickTimer);
                uplotRef.current.destroy(); 
                uplotRef.current = null; 
            }
        };
    }, [telemetryData, referenceTelemetryData, referenceLap, selectedLapIdx, referenceLapIdx, laps, channel, showLapTime, color, syncKey, setCursorIndex, setZoomRange, speedUnit, invertSuspensionTravel, userWheelRotation, sessionMetadata, referenceSessionMetadata, dashboardSyncMode, singleLapXAxisMode, suspensionTravelMode]);

    useEffect(() => {
        if (!chartRef.current) return;
        const observer = new ResizeObserver(entries => {
            if (!uplotRef.current) return;
            for (const entry of entries) {
                // Use the actual current content height for smooth animation sync
                uplotRef.current.setSize({ 
                    width: entry.contentRect.width, 
                    height: entry.contentRect.height 
                });
            }
        });
        observer.observe(chartRef.current);
        return () => observer.disconnect();
    }, []); // Empty dependency array: we want the observer to live as long as the component

    // Cursor Index Sync: Programmatically update uPlot cursor to match store index/time
    useEffect(() => {
        if (!uplotRef.current || cursorIndex === null || !currentXDataRef.current) return;
        const u = uplotRef.current;
        // Pause sync if user is hovering, zooming, or interacting with ANY chart globally
        if (isHoveringRef.current || u.select.width > 0 || isUserInteractingWithCharts) return;

        if (isXAxisTime) {
            // In Time Sync, use playbackElapsed to allow mapping significantly beyond the current lap's duration
            u.setCursor({
                left: u.valToPos(playbackElapsed, 'x'),
                top: u.cursor.top || 0
            });
        } else {
            // In Distance Sync, stick to the current lap's distance-mapped index
            const localIdx = Math.min(cursorIndex - startIdxRef.current, currentXDataRef.current.length - 1);
            if (localIdx >= 0) {
                u.setCursor({
                    left: u.valToPos(currentXDataRef.current[localIdx], 'x'),
                    top: u.cursor.top || 0
                });
            }
        }
    }, [cursorIndex, playbackElapsed, dashboardSyncMode, channel, isXAxisTime]);


    return (
        <div className={`mb-0.5 rounded-2xl flex flex-col items-stretch glass-container-flat glass-expand-pixel transition-all duration-300 group min-w-0 relative ${isResizing ? 'select-none' : ''}`}
            onMouseEnter={() => { 
                isHoveringRef.current = true; 
                setIsUserInteractingWithCharts(true);
            }}
            onMouseLeave={() => { 
                isHoveringRef.current = false; 
                setIsUserInteractingWithCharts(false);
                if (uplotRef.current && cursorIndex !== null && currentXDataRef.current) {
                    const localIdx = cursorIndex - startIdxRef.current;
                    if (localIdx >= 0 && localIdx < currentXDataRef.current.length) {
                        uplotRef.current.setCursor({
                            left: uplotRef.current.valToPos(currentXDataRef.current[localIdx], 'x'),
                            top: uplotRef.current.cursor.top || 0
                        });
                    }
                }
            }}
            onMouseMove={handleGlassMouseMove}>
            <div className="glass-content h-full flex flex-col relative z-10 px-1 py-1">
                <div
                    className="glass-sync-bg rounded-2xl opacity-[0.05] z-0"
                    style={{ backgroundColor: getRGBA(color, 1) }}
                />

                <div className={`flex items-center justify-between px-3 h-10 flex-shrink-0 cursor-default select-none relative z-10`}>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-[0.2em]"
                                style={{ borderColor: getRGBA(color, 0.3), color: color, backgroundColor: getRGBA(color, 0.15) }}>
                                {isNoABS ? "NO ABS DATA" : (alias || channel)}
                            </span>

                            {/* View Mode Toggle for Suspension */}
                            {((channel === 'Susp Pos' && wheelIndex === 0) || channel === 'SuspPosFront') && (
                                <Tooltip text={`Switch to ${suspensionViewMode === 'split' ? '2-Panel Merged' : '4-Panel Split'} View`}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            useTelemetryStore.getState().toggleSuspensionViewMode();
                                        }}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white ml-1"
                                    >
                                    {suspensionViewMode === 'merged' ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                            {/* Split Icon: Branching Right */}
                                            <path d="M2 12h4c4 0 4-7 8-7h7m0 0l-3.5-3.5M21 5l-3.5 3.5" />
                                            <path d="M6 12c4 0 4 7 8 7h7m0 0l-3.5-3.5M21 19l-3.5 3.5" />
                                        </svg>
                                    ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                            {/* Merge Icon: Converging Right */}
                                            <path d="M2 5h7c4 0 4 7 8 7h5m0 0l-3.5-3.5M22 12l-3.5 3.5" />
                                            <path d="M2 19h7c4 0 4-7 8-7" />
                                        </svg>
                                    )}
                                    </button>
                                </Tooltip>
                            )}

                            {/* View Mode Toggle for 3rd Deflection */}
                            {(channel === 'Front3rdDeflection' || channel === 'ThirdDeflectionMerged') && (
                                <Tooltip text={`Switch to ${thirdDeflectionViewMode === 'split' ? 'Merged F/R' : 'Split'} View`}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            useTelemetryStore.getState().toggleThirdDeflectionViewMode();
                                        }}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white ml-1"
                                    >
                                        {thirdDeflectionViewMode === 'merged' ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                                <path d="M2 12h4c4 0 4-7 8-7h7m0 0l-3.5-3.5M21 5l-3.5 3.5" />
                                                <path d="M6 12c4 0 4 7 8 7h7m0 0l-3.5-3.5M21 19l-3.5 3.5" />
                                            </svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                                <path d="M2 5h7c4 0 4 7 8 7h5m0 0l-3.5-3.5M22 12l-3.5 3.5" />
                                                <path d="M2 19h7c4 0 4-7 8-7" />
                                            </svg>
                                        )}
                                    </button>
                                </Tooltip>
                            )}

                            {/* View Mode Toggle for Handling */}
                            {(channel === 'Yaw Rate' || channel === 'HandlingMerged') && (
                                <Tooltip text={`Switch to ${handlingViewMode === 'split' ? 'Merged' : 'Split'} View`}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            useTelemetryStore.getState().toggleHandlingViewMode();
                                        }}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white ml-1"
                                    >
                                        {handlingViewMode === 'merged' ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                                <path d="M2 12h4c4 0 4-7 8-7h7m0 0l-3.5-3.5M21 5l-3.5 3.5" />
                                                <path d="M6 12c4 0 4 7 8 7h7m0 0l-3.5-3.5M21 19l-3.5 3.5" />
                                            </svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                                <path d="M2 5h7c4 0 4 7 8 7h5m0 0l-3.5-3.5M22 12l-3.5 3.5" />
                                                <path d="M2 19h7c4 0 4-7 8-7" />
                                            </svg>
                                        )}
                                    </button>
                                </Tooltip>
                            )}

                            {/* View Mode Toggle for Tyres Pressure */}
                            {channel === 'TyresPressure' && (wheelIndex === undefined || wheelIndex === null || wheelIndex === 0) && (
                                <Tooltip text={`Switch to ${tyresPressureViewMode === 'split' ? 'Merged' : 'Split'} View`}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            useTelemetryStore.getState().toggleTyresPressureViewMode();
                                        }}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white ml-1"
                                    >
                                        {tyresPressureViewMode === 'merged' ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                                <path d="M2 12h4c4 0 4-7 8-7h7m0 0l-3.5-3.5M21 5l-3.5 3.5" />
                                                <path d="M6 12c4 0 4 7 8 7h7m0 0l-3.5-3.5M21 19l-3.5 3.5" />
                                            </svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                                <path d="M2 5h7c4 0 4 7 8 7h5m0 0l-3.5-3.5M22 12l-3.5 3.5" />
                                                <path d="M2 19h7c4 0 4-7 8-7" />
                                            </svg>
                                        )}
                                    </button>
                                </Tooltip>
                            )}

                            {/* View Mode Toggle for Ride Heights */}
                            {channel === 'RideHeights' && (wheelIndex === undefined || wheelIndex === null || wheelIndex === 0) && (
                                <Tooltip text={`Switch to ${rideHeightViewMode === 'split' ? 'Merged' : 'Split'} View`}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            useTelemetryStore.getState().toggleRideHeightViewMode();
                                        }}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white ml-1"
                                    >
                                        {rideHeightViewMode === 'merged' ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                                <path d="M2 12h4c4 0 4-7 8-7h7m0 0l-3.5-3.5M21 5l-3.5 3.5" />
                                                <path d="M6 12c4 0 4 7 8 7h7m0 0l-3.5-3.5M21 19l-3.5 3.5" />
                                            </svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                                <path d="M2 5h7c4 0 4 7 8 7h5m0 0l-3.5-3.5M22 12l-3.5 3.5" />
                                                <path d="M2 19h7c4 0 4-7 8-7" />
                                            </svg>
                                        )}
                                    </button>
                                </Tooltip>
                            )}

                            {/* View Mode Toggle for Slip Ratio */}
                            {channel === 'Slip Ratio' && (wheelIndex === undefined || wheelIndex === null || wheelIndex === 0) && (
                                <Tooltip text={`Switch to ${slipRatioViewMode === 'split' ? 'Merged' : 'Split'} View`}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            useTelemetryStore.getState().toggleSlipRatioViewMode();
                                        }}
                                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-white ml-1"
                                    >
                                        {slipRatioViewMode === 'merged' ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                                <path d="M2 12h4c4 0 4-7 8-7h7m0 0l-3.5-3.5M21 5l-3.5 3.5" />
                                                <path d="M6 12c4 0 4 7 8 7h7m0 0l-3.5-3.5M21 19l-3.5 3.5" />
                                            </svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
                                                <path d="M2 5h7c4 0 4 7 8 7h5m0 0l-3.5-3.5M22 12l-3.5 3.5" />
                                                <path d="M2 19h7c4 0 4-7 8-7" />
                                            </svg>
                                        )}
                                    </button>
                                </Tooltip>
                            )}
                            
                            {/* Legend for Bundled Charts */}
                            {isBundled && !isCollapsed && (
                                <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 ml-1">
                                    {(channel === 'RideHeights' || channel === 'SuspPosFront' || channel === 'SuspPosRear' || channel === 'ThirdDeflectionMerged' || channel === 'HandlingMerged' ? [0, 1] : [0, 1, 2, 3]).map((idx) => {
                                        const info = getBundledInfo(idx);
                                        // For SuspPosFront: idx 0→wIdx 0(FL), idx 1→wIdx 1(FR)
                                        // For SuspPosRear:  idx 0→wIdx 2(RL), idx 1→wIdx 3(RR)
                                        const isSuspBundled = channel === 'SuspPosFront' || channel === 'SuspPosRear';
                                        const wIdx = channel === 'SuspPosFront' ? idx : channel === 'SuspPosRear' ? idx + 2 : -1;
                                        const showBase = isSuspBundled && suspensionTravelMode === 'raw' && !hasReferenceData && wIdx >= 0;
                                        const baseLabel = showBase && telemetryData?.suspension_baselines
                                            ? Math.abs((telemetryData.suspension_baselines[wIdx] || 0) * 1000).toFixed(0)
                                            : null;
                                        return (
                                            <div key={idx} className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.stroke }} />
                                                <span className="text-[8px] font-black text-gray-200 uppercase tracking-wider">{info.label}</span>
                                                {baseLabel && (
                                                    <span
                                                        className="text-[9px] font-mono font-bold px-0.5 rounded"
                                                        style={{ color: info.stroke, opacity: 0.9 }}
                                                    >({baseLabel}mm)</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {isPlaying && (
                                <div className="flex items-center gap-1 px-1.5 py-0.25 rounded-md bg-red-500/20 border border-red-500/30 animate-pulse">
                                    <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                    <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Live</span>
                                </div>
                            )}
                        </div>
                        {showLapTime && <span ref={timeRef} className="text-[11px] font-mono font-bold text-yellow-500/80"></span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            {/* Multi-Value Container */}
                            <div ref={multiValueContainerRef} className="flex items-center text-lg font-mono font-black tracking-tighter leading-none" />
                            
                            {hasReferenceData && !isCollapsed && channel !== 'Time Delta' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-700 font-bold opacity-60 mx-[-2px] text-xs">|</span>
                                    <div ref={multiRefValueContainerRef} className="flex items-center opacity-70 leading-none" />
                                </div>
                            )}
                        </div>

                        {/* Unit Label */}
                        {channel === 'Speed' || channel === 'Ground Speed' ? (
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter ml-1 h-6 inline-flex items-center" style={{ height: '24px', display: 'inline-flex', alignItems: 'center' }}>
                                {speedUnit === 'kmh' ? 'km/h' : 'mph'}
                            </span>
                        ) : (
                            unit && <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter ml-1" style={{ height: '24px', display: 'inline-flex', alignItems: 'center', transform: 'translateY(0.5px)' }}>{unit}</span>
                        )}
                        
                        <button 
                            className={`p-1.5 rounded-lg border transition-all active:scale-90 flex items-center justify-center glass-container-flat hover:scale-110 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 group/collapse ml-2`}
                            onMouseMove={(e) => handleGlassMouseMove(e, 0.15)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCollapsed(!isCollapsed);
                            }}
                        >
                            <div className="glass-content flex items-center justify-center">
                                {isCollapsed ? (
                                    <svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" className="w-3.5 h-3.5"><path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                ) : (
                                    <svg fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" className="w-3.5 h-3.5"><path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                )}
                            </div>
                        </button>
                    </div>
                </div>

                <div
                    className={`grid transition-all ${isResizing ? 'duration-0' : 'duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]'} w-full overflow-hidden min-w-0 ${isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100 mt-2'}`}
                >
                    <div className="min-h-0 min-w-0 relative z-10 transition-all duration-300">
                        <div 
                            ref={chartRef} 
                            className={`w-full h-full min-w-0 transition-opacity duration-300 ${isResetting ? 'transition-[height] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]' : ''} ${isPlaying ? 'opacity-90' : ''}`} 
                            style={{ height: height }} 
                        />
                    </div>
                </div>

                {/* Y-Axis Resize Handle (Main Dashboard Only) */}
                {!isMapMaximized && !isCollapsed && (
                    <Tooltip text="DRAG TO RESIZE | DOUBLE-CLICK TO RESET" position="top" delay={300}>
                        <div 
                            className={`absolute bottom-0 left-4 right-4 h-3 flex justify-center items-center cursor-row-resize group/resize-handle z-[60]`}
                            onMouseDown={handleResizeStart}
                            onDoubleClick={() => {
                                setIsResetting(true);
                                resetChartHeight(channel, wheelIndex);
                                setTimeout(() => setIsResetting(false), 600);
                            }}
                        >
                            <div className={`h-1.5 bg-white/10 backdrop-blur-3xl rounded-full transition-all duration-300 border border-white/20 group-hover/resize-handle:bg-blue-500 group-hover/resize-handle:scale-110 relative overflow-hidden ${isResizing ? 'w-48 bg-blue-500/80' : 'w-24 group-hover/resize-handle:w-36'}`}>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover/resize-handle:translate-x-[100%] transition-transform duration-1000" />
                            </div>
                        </div>
                    </Tooltip>
                )}
            </div>
        </div>
    );
};
