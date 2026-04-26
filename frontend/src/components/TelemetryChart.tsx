
import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useTelemetryStore } from '../store/telemetryStore';
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
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
    channel, alias, color, height = 200, syncKey, unit = "", showLapTime = false, isPlaying = false
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
    const userWheelRotation = useTelemetryStore(state => state.userWheelRotation);
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
    const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);
    const dashboardSyncMode = useTelemetryStore(state => state.dashboardSyncMode);
    const singleLapXAxisMode = useTelemetryStore(state => state.singleLapXAxisMode);
    const playbackElapsed = useTelemetryStore(state => state.playbackElapsed);
    const updateChartHeight = useTelemetryStore(state => state.updateChartHeight);
    const resetChartHeight = useTelemetryStore(state => state.resetChartHeight);
    const isMapMaximized = useTelemetryStore(state => state.isMapMaximized);

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
    const timeRef = useRef<HTMLDivElement>(null);
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
    const interp = (xTarget: Float64Array | number[], xSource: Float64Array | number[], ySource: Float64Array | number[]) => {
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
            updateChartHeight(channel, startHeight + deltaY);
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
        const dataArray = channel === 'Time Delta' ? null : (telemetryData[channel] || getChan(telemetryData, channel.toLowerCase(), channel.toUpperCase()));

        if (!timeArray || !distArray || !lapArray || (channel !== 'Time Delta' && !dataArray)) return;

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
        if (channel === 'Time Delta') {
            currentVal = new Float64Array(currentElapsed.length);
        } else {
            const raw = dataArray!.slice(startIdx, endIdx + 1);
            if ((channel === 'Speed' || channel === 'Ground Speed') && speedUnit === 'mph') {
                currentVal = new Float64Array(raw.length);
                for (let i = 0; i < raw.length; i++) currentVal[i] = raw[i] * 0.621371;
            } else {
                currentVal = new Float64Array(raw);
                if (channel === 'Steering Angle' && userWheelRotation !== null && sessionMetadata?.steeringLock) {
                    const factor = userWheelRotation / sessionMetadata.steeringLock;
                    for (let i = 0; i < currentVal.length; i++) currentVal[i] *= factor;
                }
            }
        }

        // --- 1.1 Special Logic for Gear: Filter out transient zeros (shift spikes) ---
        if (channel.toLowerCase() === 'gear') {
            const out = new Float64Array(currentVal);
            for (let i = 1; i < out.length - 1; i++) {
                if (out[i] === 0) {
                    let prevNonZero = 0;
                    for (let j = i - 1; j >= 0; j--) { if (out[j] !== 0) { prevNonZero = out[j]; break; } }
                    let nextNonZero = 0;
                    for (let j = i + 1; j < Math.min(i + 15, out.length); j++) { if (out[j] !== 0) { nextNonZero = out[j]; break; } }
                    if (prevNonZero !== 0 && nextNonZero !== 0) out[i] = prevNonZero;
                }
            }
            currentVal = out;
        }

        // --- 2. Get Reference Lap Data & Alignment ---
        let refValAligned: Float64Array | null = null;
        let refTimeAligned: Float64Array | null = null;
        let xAxisData: Float64Array = currentDist; // Default to current lap distance
        const isTimeSync = dashboardSyncMode === 'time' && channel !== 'Time Delta';

        const refSource = reliesOnExternalData ? referenceTelemetryData : telemetryData;

        if (targetRefLapIdx !== null && (targetRefLapIdx != selectedLapIdx || reliesOnExternalData)) {
            const refTimeArray = getChan(refSource, 'Time');
            const refDistArray = getChan(refSource, 'Lap Dist', 'Distance');
            const refLapArray = getChan(refSource, 'Lap', 'lap');
            const refDataArray = channel === 'Time Delta' ? null : (refSource![channel] || getChan(refSource, channel.toLowerCase(), channel.toUpperCase()));

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

                    if (isTimeSync) {
                        const curDur = currentElapsed[currentElapsed.length - 1] || 0;
                        const refDur = rElapsedTime[rElapsedTime.length - 1] || 0;

                        if (refDur > curDur + 0.001) {
                            // Reference is longer - make it master
                            xAxisData = rElapsedTime;
                            currentVal = interp(xAxisData, currentElapsed, currentVal);
                            const mappedCurrentTime = interp(xAxisData, currentElapsed, currentTime);
                            currentTimeRef.current = mappedCurrentTime as any;
                            
                            if (refDataArray) {
                                const rawRef = refDataArray.slice(refStart, refEnd + 1);
                                if ((channel === 'Speed' || channel === 'Ground Speed') && speedUnit === 'mph') {
                                    refValAligned = new Float64Array(rawRef.length);
                                    for (let i = 0; i < rawRef.length; i++) refValAligned[i] = rawRef[i] * 0.621371;
                                } else {
                                    refValAligned = new Float64Array(rawRef);
                                }
                            }
                            refTimeAligned = rElapsedTime;
                        } else {
                            // Current is longer or equal
                            xAxisData = currentElapsed;
                            if (refDataArray) {
                                const rawRef = refDataArray.slice(refStart, refEnd + 1);
                                let refVal;
                                if ((channel === 'Speed' || channel === 'Ground Speed') && speedUnit === 'mph') {
                                    refVal = new Float64Array(rawRef.length);
                                    for (let i = 0; i < rawRef.length; i++) refVal[i] = rawRef[i] * 0.621371;
                                } else {
                                    refVal = new Float64Array(rawRef);
                                }
                                refValAligned = interp(xAxisData, rElapsedTime, refVal);
                            }
                            refTimeAligned = interp(xAxisData, rElapsedTime, rElapsedTime);
                        }
                    } else {
                        // Distance sync
                        xAxisData = currentDist;
                        if (refDataArray) {
                            const rawRef = refDataArray.slice(refStart, refEnd + 1);
                            let refVal;
                            if ((channel === 'Speed' || channel === 'Ground Speed') && speedUnit === 'mph') {
                                refVal = new Float64Array(rawRef.length);
                                for (let i = 0; i < rawRef.length; i++) refVal[i] = rawRef[i] * 0.621371;
                            } else {
                                refVal = new Float64Array(rawRef);
                            }
                            refValAligned = interp(xAxisData, refDist, refVal);
                        }
                        refTimeAligned = interp(xAxisData, refDist, rElapsedTime);
                    }
                }
            }
        } else {
            // No reference - use current lap as master
            xAxisData = (singleLapXAxisMode === 'time') ? currentElapsed : currentDist;
        }

        // Steering Angle post-processing for reference if it was aligned
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

        // --- 2.5 Calculate Delta if Virtual ---
        if (channel === 'Time Delta') {
            if (refTimeAligned) {
                // Determine source elapsed for current based on master X-Axis
                const curElapsedForDelta = isTimeSync 
                    ? xAxisData // If time sync, X-axis is the elapsed time
                    : currentElapsed; // If dist sync, currentElapsed matches xAxisData indices
                    
                for (let i = 0; i < currentVal.length; i++) {
                    const cT = curElapsedForDelta[i];
                    const rT = refTimeAligned[i];
                    if (!Number.isNaN(cT) && !Number.isNaN(rT)) {
                        currentVal[i] = cT - rT;
                    } else {
                        currentVal[i] = Number.NaN;
                    }
                }
            } else {
                currentVal.fill(0);
            }
        }

        // Sanitize currentVal for uPlot stability (No Infinity)
        for (let i = 0; i < currentVal.length; i++) if (!Number.isFinite(currentVal[i])) currentVal[i] = Number.NaN;

        // Data array for uPlot
        const data = [
            xAxisData,
            currentVal,
            ...(refValAligned ? [refValAligned] : [])
        ];

        let maxXBound = xAxisData.length > 0 ? xAxisData[xAxisData.length - 1] : 0;
        let minY = Infinity, maxY = -Infinity;
        const arraysToCheck = [currentVal, ...(refValAligned ? [refValAligned] : [])];
        for (const arr of arraysToCheck) {
            for (let i = 0; i < arr.length; i++) {
                const v = arr[i];
                if (!Number.isNaN(v)) {
                    if (v < minY) minY = v;
                    if (v > maxY) maxY = v;
                }
            }
        }
        if (minY === Infinity) { minY = 0; maxY = 100; }
        const rangeY = maxY - minY;
        if (rangeY === 0) { minY -= 1; maxY += 1; }
        else { minY -= rangeY * 0.1; maxY += rangeY * 0.1; }

        const syncUI = (idx: number | null | undefined) => {
            if (idx === undefined || idx === null) {
                if (valueRef.current) valueRef.current.textContent = "-";
                if (refValueRef.current) refValueRef.current.textContent = "";
                if (timeRef.current) timeRef.current.textContent = "";
                return;
            }

            const val = uplotRef.current?.data[1]?.[idx];
            if (valueRef.current) {
                const displayVal = val != null && !Number.isNaN(val) ? (channel === 'Time Delta' ? (val > 0 ? "+" : "") + val.toFixed(3) : Math.round(val).toFixed(0)) : "-";
                valueRef.current.textContent = `${displayVal}`;
                if (channel === 'Time Delta' && val != null && !Number.isNaN(val)) {
                    if (val > 0) { valueRef.current.className = "text-lg font-mono font-black text-red-400"; }
                    else if (val < 0) { valueRef.current.className = "text-lg font-mono font-black text-green-400"; }
                    else { valueRef.current.className = "text-lg font-mono font-black text-white"; }
                } else if (valueRef.current.className.includes('text-red-400') || valueRef.current.className.includes('text-green-400')) {
                    valueRef.current.className = "text-lg font-mono font-black text-white";
                }
            }

            if (uplotRef.current && uplotRef.current.data.length > 2 && channel !== 'Time Delta') {
                const refVal = uplotRef.current.data[2]?.[idx];
                if (refValueRef.current) refValueRef.current.textContent = (refVal != null && !Number.isNaN(refVal)) ? Math.round(refVal).toFixed(0) : "-";
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
                    <span class="text-[#3b82f6] mr-1">CURRENT :</span><span class="text-white mr-4">${currentStr}</span>
                    <span class="text-[#daa520] opacity-70 mr-1">REFERENCE :</span><span class="text-gray-400 mr-4">${refStr}</span>
                    <span class="${deltaColor}">${deltaStr}</span>
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

        const opts: uPlot.Options = {
            width: chartRef.current.clientWidth, height: height, legend: { show: false },
            series: [{}, { stroke: color, width: 2, ...({ shadowBlur: 10, shadowColor: color } as any) }],
            scales: { x: { time: false, auto: false, min: 0, max: maxXBound }, y: { auto: false, range: [minY, maxY] } },
            axes: [
                { 
                    grid: { show: false }, stroke: "#888", ticks: { stroke: "#555" }, space: 100,
                    values: (_u: uPlot, splits: number[]) => splits.map(v => isXAxisTime ? `${v.toFixed(1)}s` : (v > 1000 ? `${(v/1000).toFixed(2)}km` : `${v.toFixed(0)}m`))
                },
                { size: 50, grid: { stroke: "#333" }, ticks: { stroke: getRGBA(color, 0.8) }, stroke: getRGBA(color, 0.8) }
            ],
            cursor: { sync: { key: syncKey }, drag: { x: true, y: false } },
            hooks: { setCursor: [setCursorHook], setScale: [setScaleHook] }
        };
        if (refValAligned) {
            opts.series.push({ stroke: "#daa520", width: 2, dash: [3, 2], ...({ shadowBlur: 6, shadowColor: "#daa520" } as any) });
        }

        uplotRef.current = new uPlot(opts, data as any, chartRef.current);
        return () => {
            if (uplotRef.current) { uplotRef.current.destroy(); uplotRef.current = null; }
        };
    }, [telemetryData, referenceTelemetryData, referenceLap, selectedLapIdx, referenceLapIdx, laps, channel, showLapTime, color, syncKey, setCursorIndex, setZoomRange, speedUnit, userWheelRotation, sessionMetadata, referenceSessionMetadata, dashboardSyncMode, singleLapXAxisMode]);

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
        if (isHoveringRef.current) return;

        const u = uplotRef.current;

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
            onMouseEnter={() => { isHoveringRef.current = true; }}
            onMouseLeave={() => { 
                isHoveringRef.current = false; 
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

                <div className={`flex items-center justify-between px-3 flex-shrink-0 cursor-pointer select-none relative z-10 ${isCollapsed ? 'h-full' : 'h-8'}`}
                    onClick={() => setIsCollapsed(!isCollapsed)}>
                    <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-[0.2em]"
                            style={{ borderColor: getRGBA(color, 0.3), color: color, backgroundColor: getRGBA(color, 0.15) }}>
                            {alias || channel}
                        </span>
                        {isPlaying && (
                            <div className="flex items-center gap-1 px-1.5 py-0.25 rounded-md bg-red-500/20 border border-red-500/30 animate-pulse">
                                <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Live</span>
                            </div>
                        )}
                        {showLapTime && <span ref={timeRef} className="text-[11px] font-mono font-bold text-yellow-500/80"></span>}
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="flex items-baseline gap-2">
                            {/* Consolidated Values Stream: CURRENT | REFERENCE UNIT */}
                            <span ref={valueRef} className="text-lg font-mono font-black text-white leading-none drop-shadow-md">-</span>
                            
                            {hasReferenceData && !isCollapsed && channel !== 'Time Delta' && (
                                <>
                                    <span className="text-gray-700 font-bold opacity-60 mx-[-2px]">|</span>
                                    <span ref={refValueRef} className="text-lg font-mono font-black text-amber-500/70 leading-none drop-shadow-md"></span>
                                </>
                            )}

                            {/* Prominent Unit Label */}
                            {channel === 'Speed' || channel === 'Ground Speed' ? (
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                                    {speedUnit === 'kmh' ? 'km/h' : 'mph'}
                                </span>
                            ) : (
                                unit && <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{unit}</span>
                            )}
                        </div>
                        <button 
                            className={`p-1.5 rounded-lg border transition-all active:scale-90 flex items-center justify-center glass-container-flat hover:scale-110 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 group/collapse`}
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
                                resetChartHeight(channel);
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
