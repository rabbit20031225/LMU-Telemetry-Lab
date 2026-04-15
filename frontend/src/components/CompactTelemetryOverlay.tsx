import React, { useMemo, useRef, useEffect, useState } from 'react';
import { MoveDiagonal2, RotateCcw } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';

interface CompactTelemetryOverlayProps {
    data: any;
    cursorIndex: number | null;
    theme?: 'current' | 'reference';
    carModel?: string;
}

export const CompactTelemetryOverlay = React.memo(({
    data,
    cursorIndex,
    theme = 'current',
    carModel
}: CompactTelemetryOverlayProps) => {
    const speedUnit = useTelemetryStore(state => state.speedUnit);
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
    const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);
    const userWheelRotation = useTelemetryStore(state => state.userWheelRotation);
    const selectedWheel = useTelemetryStore(state => state.selectedWheel);
    const customWheels = useTelemetryStore(state => state.customWheels);
    const telemetryHistorySeconds = useTelemetryStore(state => state.telemetryHistorySeconds);
    const editOverlapMode = useTelemetryStore(state => state.editOverlapMode);
    const setEditOverlapMode = useTelemetryStore(state => state.setEditOverlapMode);
    const overlapConfig = useTelemetryStore(state => state.overlapConfig);
    const updateOverlapConfig = useTelemetryStore(state => state.updateOverlapConfig);

    const isRef = theme === 'reference';
    const mainColor = isRef ? '#daa520' : '#3b82f6';
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Dynamic window calculation based on telemetryHistorySeconds
    const frequency = sessionMetadata?.frequency || 60;
    const historyPoints = Math.round(frequency * telemetryHistorySeconds);

    const telemetry = useMemo(() => {
        if (!data || cursorIndex === null) return { speed: 0, gear: 'N', throttle: 0, brake: 0, steer: 0, history: [] };

        const idx = Math.floor(cursorIndex);
        const nextIdx = Math.min(idx + 1, (data['Ground Speed'] || data['Speed'] || []).length - 1);
        const frac = cursorIndex - idx;

        const getVal = (chan: string, alt?: string) => {
            const d = data[chan] || data[alt || ''];
            if (!Array.isArray(d)) return 0;
            const v0 = d[idx] ?? 0;
            const v1 = d[nextIdx] ?? v0;
            return v0 + (v1 - v0) * frac;
        };

        const speedRaw = getVal('Ground Speed', 'Speed');
        const speed = speedUnit === 'mph' ? speedRaw * 0.621371 : speedRaw;

        let gear = (data['Gear'] && Array.isArray(data['Gear'])) ? (data['Gear'][idx] ?? 'N') : 'N';

        // --- Filter transient zeros (shift spikes) matching TelemetryChart logic ---
        if (gear === 0 && data['Gear']) {
            let prevNonZero = 0;
            // Look back up to 15 samples
            for (let j = idx - 1; j >= Math.max(0, idx - 15); j--) {
                if (data['Gear']?.[j] !== 0) { prevNonZero = data['Gear']?.[j] ?? 0; break; }
            }
            let nextNonZero = 0;
            // Look ahead up to 15 samples
            for (let j = idx + 1; j < Math.min(idx + 15, data['Gear'].length); j++) {
                if (data['Gear']?.[j] !== 0) { nextNonZero = data['Gear']?.[j] ?? 0; break; }
            }
            if (prevNonZero !== 0 && nextNonZero !== 0) {
                gear = prevNonZero;
            }
        }

        const throttle = getVal('Throttle Pos', 'Throttle');
        const brake = getVal('Brake Pos', 'Brake');
        const steer = getVal('Steering Angle');

        // Extract history for the sparkline
        const startIdx = Math.max(0, idx - historyPoints);
        const history: { t: number, b: number }[] = [];

        const throttleData = data['Throttle Pos'] || data['Throttle'];
        const brakeData = data['Brake Pos'] || data['Brake'];

        if (throttleData && brakeData) {
            for (let i = startIdx; i <= idx; i++) {
                history.push({
                    t: throttleData[i] || 0,
                    b: brakeData[i] || 0
                });
            }
        }

        return { speed, gear, throttle, brake, steer, history };
    }, [data, cursorIndex, speedUnit, historyPoints]);

    // Draw history curves
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { history } = telemetry;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (history.length < 2) return;

        const drawLine = (prop: 't' | 'b', color: string, lineWidth: number) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineJoin = 'round';

            const step = canvas.width / historyPoints;
            const startX = canvas.width - (history.length * step);

            history.forEach((point, i) => {
                const x = startX + (i * step);
                const y = canvas.height - (point[prop] / 100 * canvas.height);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        };

        // Draw Throttle (Green)
        drawLine('t', 'rgba(36, 197, 0, 0.8)', 2);
        // Draw Brake (Red)
        drawLine('b', 'rgba(255, 24, 1, 0.8)', 2);
    }, [telemetry.history, historyPoints]);

    const steerAngle = useMemo(() => {
        let angle = telemetry.steer;
        if (userWheelRotation !== null) {
            const meta = isRef ? (referenceSessionMetadata || sessionMetadata) : sessionMetadata;
            if (meta?.steeringLock) {
                angle = angle * (userWheelRotation / meta.steeringLock);
            }
        }
        return angle;
    }, [telemetry.steer, userWheelRotation, sessionMetadata, referenceSessionMetadata, isRef]);

    const wheelSrc = useMemo(() => {
        const DEFAULT_WHEEL = "Cars/PORSCHE 963_2024.png";
        if (selectedWheel) {
            if (selectedWheel.startsWith('data:image')) return selectedWheel;
            const custom = customWheels.find(w => w.id === selectedWheel);
            if (custom) return custom.data;
            return `/steering wheel/${selectedWheel}`;
        }
        if (carModel) return `/steering wheel/Cars/${carModel}.png`;
        return `/steering wheel/${DEFAULT_WHEEL}`;
    }, [selectedWheel, carModel, customWheels]);

    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
    const resizeStart = useRef({ initialScale: 1.0, initialY: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!editOverlapMode) return;
        e.preventDefault(); // Prevent text selection
        e.stopPropagation();

        setIsDragging(true);
        const config = isRef ? overlapConfig.reference : overlapConfig.current;
        dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            initialX: config.x,
            initialY: config.y
        };
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        if (!editOverlapMode) return;
        e.preventDefault(); // Prevent text selection
        e.stopPropagation();

        setIsResizing(true);
        resizeStart.current = {
            initialScale: overlapConfig.scale,
            initialY: e.clientY
        };
    };

    // Persistent Boundary Clamping: Check and fix position on mount and resize
    useEffect(() => {
        const parent = containerRef.current?.parentElement;
        const overlay = containerRef.current;
        if (!parent || !overlay) return;

        const checkAndClamp = () => {
            const parentRect = parent.getBoundingClientRect();
            const overlayRect = overlay.getBoundingClientRect();
            if (parentRect.width === 0 || parentRect.height === 0) return;

            const config = useTelemetryStore.getState().overlapConfig;
            const pos = isRef ? config.reference : config.current;
            const currentScale = config.scale;

            const BUFFER_PX = 8; // Small safety margin from edges
            const halfWidthPct = ((overlayRect.width / 2 + BUFFER_PX) / parentRect.width) * 100;
            const halfHeightPct = ((overlayRect.height / 2 + BUFFER_PX) / parentRect.height) * 100;

            const clampedX = Math.max(halfWidthPct, Math.min(100 - halfWidthPct, pos.x));
            const clampedY = Math.max(halfHeightPct, Math.min(100 - halfHeightPct, pos.y));

            if (Math.abs(clampedX - pos.x) > 0.01 || Math.abs(clampedY - pos.y) > 0.01) {
                const slot = isRef ? 'reference' : 'current';
                updateOverlapConfig({
                    [slot]: { x: clampedX, y: clampedY }
                });
            }
        };

        // 1. Initial Check
        checkAndClamp();

        // 2. Observe Parent Resize
        const observer = new ResizeObserver(() => {
            checkAndClamp();
        });
        observer.observe(parent);

        return () => observer.disconnect();
    }, [isRef, updateOverlapConfig]); // Scale changes also trigger re-renders and effects

    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const parent = containerRef.current?.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();

            if (isDragging) {
                // Calculate raw goal position as percentage
                const rawX = ((e.clientX - (dragStart.current.x - (dragStart.current.initialX / 100 * rect.width))) / rect.width) * 100;
                const rawY = ((e.clientY - (dragStart.current.y - (dragStart.current.initialY / 100 * rect.height))) / rect.height) * 100;

                // Dynamic bounds based on actual visual size (handles scale naturally)
                const overlay = containerRef.current;
                if (!overlay) return;
                const overlayRect = overlay.getBoundingClientRect();

                const BUFFER_PX = 8;
                const halfWidthPct = ((overlayRect.width / 2 + BUFFER_PX) / rect.width) * 100;
                const halfHeightPct = ((overlayRect.height / 2 + BUFFER_PX) / rect.height) * 100;

                const clampedX = Math.max(halfWidthPct, Math.min(100 - halfWidthPct, rawX));
                const clampedY = Math.max(halfHeightPct, Math.min(100 - halfHeightPct, rawY));

                const slot = isRef ? 'reference' : 'current';
                updateOverlapConfig({
                    [slot]: { x: clampedX, y: clampedY }
                });
            } else if (isResizing) {
                const dy = (resizeStart.current.initialY - e.clientY) / 100;
                const newScale = Math.max(0.4, Math.min(2.5, resizeStart.current.initialScale + (dy * -1)));
                
                // When resizing, we also need to re-clamp the current position because the box expanded
                const overlay = containerRef.current;
                if (!overlay) return;
                
                // We use a small trick: calculate what the rect *would be* with the new scale
                const currentRect = overlay.getBoundingClientRect();
                const scaleRatio = newScale / overlapConfig.scale;
                const projectedWidth = currentRect.width * scaleRatio;
                const projectedHeight = currentRect.height * scaleRatio;
                
                const BUFFER_PX = 8;
                const halfWidthPct = ((projectedWidth / 2 + BUFFER_PX) / rect.width) * 100;
                const halfHeightPct = ((projectedHeight / 2 + BUFFER_PX) / rect.height) * 100;

                const slot = isRef ? 'reference' : 'current';
                const pos = isRef ? overlapConfig.reference : overlapConfig.current;
                
                const clampedX = Math.max(halfWidthPct, Math.min(100 - halfWidthPct, pos.x));
                const clampedY = Math.max(halfHeightPct, Math.min(100 - halfHeightPct, pos.y));

                updateOverlapConfig({ 
                    scale: newScale,
                    [slot]: { x: clampedX, y: clampedY }
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, isRef, overlapConfig, updateOverlapConfig]);

    const currentPos = isRef ? overlapConfig.reference : overlapConfig.current;

    return (
        <div
            ref={containerRef}
            onDoubleClick={() => setEditOverlapMode(!editOverlapMode)}
            onMouseDown={handleMouseDown}
            style={{
                position: 'absolute',
                left: `${currentPos.x}%`,
                top: `${currentPos.y}%`,
                transform: `translate(-50%, -50%) scale(${overlapConfig.scale})`,
                zIndex: editOverlapMode ? 1200 : 110,
                cursor: editOverlapMode ? 'move' : 'default',
            }}
            className={`flex items-center gap-2.5 bg-black/70 backdrop-blur-2xl border ${editOverlapMode ? 'hud-edit-glow' : (isRef ? 'border-amber-500/30' : 'border-white/10')} rounded-xl px-2.5 py-1.5 h-14 shadow-2xl overflow-hidden glass-container-flat group/teleOverlay transition-shadow duration-500 select-none`}
        >
            {/* Sidebar label indicator */}
            <div className={`absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center ${isRef ? 'bg-amber-500/20' : 'bg-blue-500/20'} border-r border-white/5`}>
                <span className={`text-[8px] font-black uppercase tracking-[0.15em] ${isRef ? 'text-amber-500' : 'text-blue-500'}`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    {isRef ? 'Reference' : 'Current'}
                </span>
            </div>

            <div className="w-6" /> {/* Spacer for vertical label */}

            {/* Sparkline Canvas */}
            <div className="relative flex-1 h-full min-w-[120px] bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={160}
                    height={48}
                    className="w-full h-full"
                />
                {/* Visual Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-10">
                    <div className="w-full h-px bg-white mt-[25%]" />
                    <div className="w-full h-px bg-white mt-[25%]" />
                    <div className="w-full h-px bg-white mt-[25%]" />
                </div>
            </div>

            {/* Input Bars */}
            <div className="flex gap-1 h-full items-end pb-0.5">
                {/* Brake */}
                <div className="w-2 h-full bg-white/5 rounded-[1px] relative overflow-hidden">
                    <div
                        className="absolute bottom-0 w-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)] transition-all duration-75"
                        style={{ height: `${telemetry.brake}%` }}
                    />
                </div>
                {/* Throttle */}
                <div className="w-2 h-full bg-white/5 rounded-[1px] relative overflow-hidden">
                    <div
                        className="absolute bottom-0 w-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] transition-all duration-75"
                        style={{ height: `${telemetry.throttle}%` }}
                    />
                </div>
            </div>

            {/* Gear & Speed - Aligned horizontally/tightly */}
            <div className="flex items-baseline gap-2.5 px-1 min-w-max">
                <span className="text-[26px] font-black text-white leading-none tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    {telemetry.gear === 0 ? 'N' : (telemetry.gear === -1 ? 'R' : telemetry.gear)}
                </span>
                <div className="flex flex-col items-start">
                    <span className="text-[15px] font-black text-white leading-none tabular-nums">
                        {Math.round(telemetry.speed)}
                    </span>
                    <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mt-1">
                        {speedUnit}
                    </span>
                </div>
            </div>

            {/* Small Steering Wheel */}
            <div className="w-10 h-10 relative flex items-center justify-center bg-black/20 rounded-full border border-white/5 p-0.5">
                <div
                    className="w-full h-full transition-transform duration-75 linear"
                    style={{ transform: `rotateZ(${steerAngle}deg)` }}
                >
                    <img
                        src={wheelSrc}
                        alt="wheel"
                        className="w-full h-full object-contain filter brightness-125 drop-shadow-lg"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = '/steering wheel/Cars/PORSCHE 963_2024.png';
                        }}
                    />
                </div>
            </div>
            {/* Resize Handle */}
            {editOverlapMode && (
                <div
                    onMouseDown={handleResizeMouseDown}
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/40 rounded-tl-lg transition-colors"
                >
                    <MoveDiagonal2 size={8} className="text-blue-400" />
                </div>
            )}

            {/* Hint Overlay - Toggle text based on edit mode */}
            <div className={`absolute inset-0 flex items-center justify-center ${editOverlapMode ? 'bg-blue-600/20' : 'bg-black/40'} opacity-0 group-hover/teleOverlay:opacity-100 transition-opacity duration-300 pointer-events-none backdrop-blur-[1px]`}>
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] drop-shadow-lg scale-90 group-hover/teleOverlay:scale-100 transition-transform duration-300 ${editOverlapMode ? 'text-blue-200' : 'text-white/70'}`}>
                    {editOverlapMode ? 'Double Click to Lock' : 'Double Click to Edit'}
                </span>
            </div>
        </div>
    );
});
