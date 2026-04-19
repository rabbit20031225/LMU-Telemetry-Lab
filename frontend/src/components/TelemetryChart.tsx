
import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useTelemetryStore } from '../store/telemetryStore';
import { handleGlassMouseMove } from '../utils/glassEffect';

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

    const hasReferenceData = (referenceLapIdx !== null || (referenceTelemetryData && referenceLap)) && referenceLapIdx !== selectedLapIdx;

    const chartRef = useRef<HTMLDivElement>(null);
    const uplotRef = useRef<uPlot | null>(null);
    const valueRef = useRef<HTMLSpanElement>(null);
    const refValueRef = useRef<HTMLSpanElement>(null);
    const timeRef = useRef<HTMLDivElement>(null);
    const startIdxRef = useRef<number>(0);
    const currentDistRef = useRef<Float64Array | null>(null);
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

    // Helper: Linear Interpolation
    const interp = (xTarget: Float64Array | number[], xSource: Float64Array | number[], ySource: Float64Array | number[]) => {
        const yResult = new Float64Array(xTarget.length);
        if (xSource.length === 0 || ySource.length === 0) return yResult;
        let srcIdx = 0;
        for (let i = 0; i < xTarget.length; i++) {
            const x = xTarget[i];
            while (srcIdx < xSource.length - 1 && (xSource[srcIdx + 1] ?? -Infinity) < x) {
                srcIdx++;
            }
            const x0 = xSource[srcIdx];
            const x1 = xSource[srcIdx + 1];
            const y0 = ySource[srcIdx];
            const y1 = ySource[srcIdx + 1];
            if (x1 === undefined || x0 === undefined || x1 - x0 === 0) {
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
            // Removed break to be defensive against data gaps
        }
        if (startIdx === -1 || endIdx === -1) return;

        const rawCurrentDist = distArray.slice(startIdx, endIdx + 1);
        const currentDist = new Float64Array(rawCurrentDist.length);
        const currentDistStart = rawCurrentDist[0] || 0;
        for (let i = 0; i < rawCurrentDist.length; i++) currentDist[i] = rawCurrentDist[i] - currentDistStart;
        
        startIdxRef.current = startIdx;
        currentDistRef.current = currentDist as any;
        const currentTime = timeArray.slice(startIdx, endIdx + 1);
        const lapStartTime = lap.startTime;
        
        // Populate refs for syncUI access
        currentTimeRef.current = currentTime as any;
        lapStartTimeRef.current = lapStartTime;

        let currentVal: Float64Array;
        if (channel === 'Time Delta') {
            currentVal = new Float64Array(currentDist.length);
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
                    for (let j = i - 1; j >= 0; j--) {
                        if (out[j] !== 0) { prevNonZero = out[j]; break; }
                    }
                    let nextNonZero = 0;
                    // Look ahead 15 samples (~0.15s at 100Hz) to find the next gear
                    for (let j = i + 1; j < Math.min(i + 15, out.length); j++) {
                        if (out[j] !== 0) { nextNonZero = out[j]; break; }
                    }
                    if (prevNonZero !== 0 && nextNonZero !== 0) {
                        out[i] = prevNonZero;
                    }
                }
            }
            currentVal = out;
        }

        // --- 2. Get Reference Lap Data ---
        let refValAligned: Float64Array | null = null;
        let refTimeAligned: Float64Array | null = null;

        // The reference source is 'referenceTelemetryData' if it belongs to a different stint/session (referenceLap exists),
        // otherwise it defaults back to 'telemetryData' (same stint comparison).
        const reliesOnExternalData = !!(referenceTelemetryData && referenceLap);
        const targetRefLapIdx = reliesOnExternalData ? referenceLap?.lap : referenceLapIdx;
        const refSource = reliesOnExternalData ? referenceTelemetryData : telemetryData;

        // Show reference if we have an ID AND (it is a different lap OR it is from a different stint/session source)
        if (targetRefLapIdx !== null && (targetRefLapIdx != selectedLapIdx || reliesOnExternalData)) {
            const refTimeArray = getChan(refSource, 'Time');
            const refDistArray = getChan(refSource, 'Lap Dist', 'Distance');
            const refLapArray = getChan(refSource, 'Lap', 'lap');
            const refDataArray = channel === 'Time Delta' ? null : (refSource![channel] || getChan(refSource, channel.toLowerCase(), channel.toUpperCase()));

            if (refTimeArray && refDistArray && refLapArray) {
                let refStart = -1, refEnd = -1;
                for (let i = 0; i < refLapArray.length; i++) {
                    if (refLapArray[i] == targetRefLapIdx) { // LOOSE EQUALITY
                        if (refStart === -1) refStart = i;
                        refEnd = i;
                    }
                }

                if (refStart !== -1 && refEnd !== -1) {
                    const rawRefDist = refDistArray.slice(refStart, refEnd + 1);
                    const refDist = new Float64Array(rawRefDist.length);
                    const refDistStart = rawRefDist[0];
                    for (let i = 0; i < rawRefDist.length; i++) refDist[i] = rawRefDist[i] - refDistStart;
                    
                    if (refDataArray) {
                        const rawRef = refDataArray.slice(refStart, refEnd + 1);
                        let refVal;
                        if ((channel === 'Speed' || channel === 'Ground Speed') && speedUnit === 'mph') {
                            refVal = new Float64Array(rawRef.length);
                            for (let i = 0; i < rawRef.length; i++) refVal[i] = rawRef[i] * 0.621371;
                        } else {
                            refVal = new Float64Array(rawRef);
                            const refMeta = referenceSessionMetadata || sessionMetadata;
                            if (channel === 'Steering Angle' && userWheelRotation !== null && refMeta?.steeringLock) {
                                const factor = userWheelRotation / refMeta.steeringLock;
                                for (let i = 0; i < refVal.length; i++) refVal[i] *= factor;
                            }
                        }

                        // Filter transient zeros for reference Gear too
                        if (channel.toLowerCase() === 'gear') {
                            for (let i = 1; i < refVal.length - 1; i++) {
                                if (refVal[i] === 0) {
                                    let prevNZ = 0;
                                    for (let j = i - 1; j >= 0; j--) { if (refVal[j] !== 0) { prevNZ = refVal[j]; break; } }
                                    let nextNZ = 0;
                                    for (let j = i + 1; j < Math.min(i + 15, refVal.length); j++) { if (refVal[j] !== 0) { nextNZ = refVal[j]; break; } }
                                    if (prevNZ !== 0 && nextNZ !== 0) refVal[i] = prevNZ;
                                }
                            }
                        }

                        refValAligned = interp(currentDist, refDist, refVal);
                    }

                    const rTime = refTimeArray.slice(refStart, refEnd + 1);
                    const rStartTime = rTime[0];
                    const rElapsedTime = new Float64Array(rTime.length);
                    for (let k = 0; k < rTime.length; k++) rElapsedTime[k] = rTime[k] - rStartTime;
                    refTimeAligned = interp(currentDist, refDist, rElapsedTime);
                }
            }
        }
        
        refTimeAlignedRef.current = refTimeAligned as any;

        // --- 2.5 Calculate Delta if Virtual ---
        if (channel === 'Time Delta') {
            if (refTimeAligned) {
                for (let i = 0; i < currentVal.length; i++) {
                    currentVal[i] = (currentTime[i] - lapStartTime) - refTimeAligned[i];
                }
            } else {
                currentVal.fill(0);
            }
        }

        // Sanitize currentVal for uPlot stability (No NaN/Infinity)
        for (let i = 0; i < currentVal.length; i++) {
            if (!Number.isFinite(currentVal[i])) currentVal[i] = 0;
        }

        // For Delta chart, we don't want to draw a second "reference" line, 
        // the primary line IS the comparison.
        if (channel === 'Time Delta') {
            refValAligned = null;
        }

        const data = [
            currentDist,
            currentVal,
            ...(refValAligned ? [refValAligned] : [])
        ];

        let maxLapDist = currentDist.length > 0 ? currentDist[currentDist.length - 1] : 0;
        let minY = Infinity, maxY = -Infinity;
        const arraysToCheck = [currentVal, ...(refValAligned ? [refValAligned] : [])];
        for (const arr of arraysToCheck) {
            for (let i = 0; i < arr.length; i++) {
                const v = arr[i];
                if (v < minY) minY = v;
                if (v > maxY) maxY = v;
            }
        }
        if (minY === Infinity) { minY = 0; maxY = 100; }
        const rangeY = maxY - minY;
        if (rangeY === 0) {
            minY -= 1; maxY += 1;
        } else {
            minY -= rangeY * 0.1;
            maxY += rangeY * 0.1;
        }


        const syncUI = (idx: number | null | undefined) => {
            if (idx === undefined || idx === null) {
                if (valueRef.current) valueRef.current.textContent = "-";
                if (refValueRef.current) refValueRef.current.textContent = "";
                if (timeRef.current) timeRef.current.textContent = "";
                return;
            }

            const val = uplotRef.current?.data[1]?.[idx];
            if (valueRef.current) {
                const displayVal = val != null ? (channel === 'Time Delta' ? (val > 0 ? "+" : "") + val.toFixed(3) : Math.round(val).toFixed(0)) : "-";
                valueRef.current.textContent = `${displayVal}`;

                if (channel === 'Time Delta' && val != null) {
                    if (val > 0) {
                        valueRef.current.classList.remove('text-white', 'text-green-400');
                        valueRef.current.classList.add('text-red-400');
                    } else if (val < 0) {
                        valueRef.current.classList.remove('text-white', 'text-red-400');
                        valueRef.current.classList.add('text-green-400');
                    } else {
                        valueRef.current.classList.remove('text-red-400', 'text-green-400');
                        valueRef.current.classList.add('text-white');
                    }
                }
            }

            if (uplotRef.current && uplotRef.current.data.length > 2 && channel !== 'Time Delta') {
                const refVal = uplotRef.current.data[2]?.[idx];
                if (refValueRef.current) {
                    const displayVal = refVal != null ? Math.round(refVal).toFixed(0) : "-";
                    refValueRef.current.textContent = `${displayVal}`;
                }
            }

            if (showLapTime && timeRef.current && currentTime) {
                const baseIdx = Math.floor(idx);
                const t = (currentTime[baseIdx] ?? 0) - lapStartTime;
                let refT = 0, delta = 0, hasRef = false;
                if (refTimeAligned && refTimeAligned.length > baseIdx) {
                    refT = refTimeAligned[baseIdx] ?? 0;
                    delta = t - refT;
                    hasRef = true;
                }
                const fmt = (sec: number) => {
                    const m = Math.floor(sec / 60);
                    const s = (sec % 60).toFixed(3).padStart(6, '0');
                    return `${m}:${s}`;
                };
                const currentStr = fmt(t);
                const refStr = hasRef ? fmt(refT) : "--:--.---";
                const deltaAbs = Math.abs(delta);
                const deltaStr = hasRef ? (delta > 0 ? "+" : "-") + fmt(deltaAbs) : "--:--.---";
                let deltaColor = "text-gray-500";
                if (hasRef) {
                    if (delta > 0) deltaColor = "text-red-500";
                    else if (delta < 0) deltaColor = "text-green-500";
                }
                timeRef.current.innerHTML = `
                    <span class="text-[#3b82f6] mr-1">CURRENT :</span><span class="text-white mr-4">${currentStr}</span>
                    <span class="text-[#daa520] opacity-70 mr-1">REFERENCE :</span><span class="text-gray-400 mr-4">${refStr}</span>
                    <span class="text-gray-500 mr-1">DELTA :</span><span class="${deltaColor}">${deltaStr}</span>
                `;
            }
        };

        const setCursorHook = (u: uPlot) => {
            const idx = u.cursor.idx;
            syncUI(idx);
            if (idx !== undefined && idx !== null) {
                const globalIdx = startIdx + idx;
                // Only update global store if NOT playing
                if (!isPlayingRef.current && globalIdx !== cursorIndex) {
                    setCursorIndex(globalIdx);
                }
            }
        };

        const setSelectHook = () => {};

        const setScaleHook = (u: uPlot) => {
            const minX = u.scales.x.min || 0;
            const maxX = u.scales.x.max || maxLapDist;

            if (minX <= 1 && maxX >= maxLapDist - 1) {
                setZoomRange(null);
                return;
            }

            let sIdx = -1, eIdx = -1;
            for (let i = 0; i < currentDist.length; i++) {
                if (currentDist[i] >= minX && sIdx === -1) sIdx = i;
                if (currentDist[i] <= maxX) eIdx = i;
            }

            if (sIdx !== -1 && eIdx !== -1) {
                setZoomRange([startIdx + sIdx, startIdx + eIdx]);
            }
        };

        const opts: uPlot.Options = {
            title: "",
            width: chartRef.current.clientWidth,
            height: height,
            legend: { show: false },
            series: [
                {},
                {
                    stroke: color,
                    width: 2,
                    ...({
                        shadowBlur: 10,
                        shadowColor: color
                    } as any)
                },
            ],
            scales: {
                x: { time: false, auto: false, min: 0, max: maxLapDist },
                y: { auto: false, range: [minY, maxY] }
            },
            axes: [
                { grid: { show: false }, stroke: "#888", ticks: { stroke: "#555" }, space: 100 },
                {
                    size: 50,
                    grid: { stroke: "#333" },
                    ticks: { stroke: getRGBA(color, 0.8) },
                    stroke: getRGBA(color, 0.8),
                    filter: (_u: uPlot, splits: number[]) => {
                        return splits;
                    }
                }
            ],
            cursor: { sync: { key: syncKey }, drag: { x: true, y: false }, focus: { prox: 30 } },
            hooks: {
                setCursor: [setCursorHook],
                setSelect: [setSelectHook],
                setScale: [setScaleHook],
            }
        };
        if (refValAligned) {
            opts.series.push({
                stroke: "#daa520",
                width: 2,
                dash: [3, 2],
                ...({
                    shadowBlur: 6,
                    shadowColor: "#daa520"
                } as any)
            });
        }

        uplotRef.current = new uPlot(opts, data as any, chartRef.current);

        return () => {
            if (uplotRef.current) {
                uplotRef.current.destroy();
                uplotRef.current = null;
            }
        };
    }, [telemetryData, referenceTelemetryData, referenceLap, selectedLapIdx, referenceLapIdx, laps, channel, showLapTime, color, height, syncKey, setCursorIndex, setZoomRange, speedUnit, userWheelRotation, sessionMetadata]);

    useEffect(() => {
        if (!chartRef.current) return;
        const observer = new ResizeObserver(entries => {
            if (!uplotRef.current) return;
            for (const entry of entries) {
                uplotRef.current.setSize({ width: entry.contentRect.width, height: height });
            }
        });
        observer.observe(chartRef.current);
        return () => observer.disconnect();
    }, [height]);

    // Cursor Index Sync: Programmatically update uPlot cursor to match store index
    useEffect(() => {
        if (!uplotRef.current || cursorIndex === null || !currentDistRef.current) return;

        // SKIP programmatic cursor update if user is currently hovering this chart
        if (isHoveringRef.current) return;

        const localIdx = cursorIndex - startIdxRef.current;
        if (localIdx >= 0 && localIdx < currentDistRef.current.length) {
            uplotRef.current.setCursor({
                left: uplotRef.current.valToPos(currentDistRef.current[localIdx], 'x'),
                top: uplotRef.current.cursor.top || 0
            });
        }
    }, [cursorIndex]);


    return (
        <div className="mb-0.5 rounded-2xl flex flex-col items-stretch glass-container-flat glass-expand-pixel transition-all duration-300 group min-w-0"
            onMouseEnter={() => { isHoveringRef.current = true; }}
            onMouseLeave={() => { 
                isHoveringRef.current = false; 
                if (uplotRef.current && cursorIndex !== null && currentDistRef.current) {
                    const localIdx = cursorIndex - startIdxRef.current;
                    if (localIdx >= 0 && localIdx < currentDistRef.current.length) {
                        uplotRef.current.setCursor({
                            left: uplotRef.current.valToPos(currentDistRef.current[localIdx], 'x'),
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
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-full overflow-hidden min-w-0 ${isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100 mt-2'}`}
                >
                    <div className="min-h-0 min-w-0 relative z-10 transition-all duration-300">
                        <div 
                            ref={chartRef} 
                            className={`w-full h-full min-w-0 transition-opacity duration-300 ${isPlaying ? 'opacity-90' : ''}`} 
                            style={{ height: height }} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
