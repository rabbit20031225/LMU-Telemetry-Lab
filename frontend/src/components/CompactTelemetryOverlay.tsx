import React, { useMemo, useRef, useEffect } from 'react';
import { MoveDiagonal2, RotateCcw } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useHudDraggable } from '../hooks/useHudDraggable';
import { handleGlassMouseMove } from '../utils/glassEffect';

interface CompactTelemetryOverlayProps {
    data: any;
    cursorIndex: number | null;
    theme?: 'current' | 'reference';
    carModel?: string;
    isMiniMap?: boolean;
}

export const CompactTelemetryOverlay = React.memo(({
    data,
    cursorIndex,
    theme = 'current',
    carModel,
    isMiniMap = false
}: CompactTelemetryOverlayProps) => {
    const speedUnit = useTelemetryStore(state => state.speedUnit);
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
    const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);
    const userWheelRotation = useTelemetryStore(state => state.userWheelRotation);
    const selectedWheel = useTelemetryStore(state => state.selectedWheel);
    const customWheels = useTelemetryStore(state => state.customWheels);
    const telemetryHistorySeconds = useTelemetryStore(state => state.telemetryHistorySeconds);
    const editHudMode = useTelemetryStore(state => state.editHudMode);
    const setEditHudMode = useTelemetryStore(state => state.setEditHudMode);
    const isMapMaximized = useTelemetryStore(state => state.isMapMaximized);
    const overlapConfig = useTelemetryStore(state => 
        state.isMapMaximized ? state.overlapConfigMaximized : state.overlapConfig
    );
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

    const { isDragging, isResizing, handlePointerDown, handleResizePointerDown } = useHudDraggable({
        id: isRef ? 'overlapRef' : 'overlap',
        config: {
            current: isRef ? overlapConfig.reference : overlapConfig.current,
            scale: overlapConfig.scale
        },
        updateConfig: (newCfg) => {
            const update: any = {};
            if (newCfg.current) update[isRef ? 'reference' : 'current'] = newCfg.current;
            if (newCfg.scale !== undefined) update.scale = newCfg.scale;
            updateOverlapConfig(update);
        },
        containerRef
    });


    // Do not render anything if this overlay is inside a MiniMap
    if (isMiniMap) return null;

    return (
        <div 
            ref={containerRef}
            onDoubleClick={() => setEditHudMode(!editHudMode)}
            onPointerDown={handlePointerDown}
            onMouseMove={(e) => !isDragging && handleGlassMouseMove(e)}
            style={{
                position: 'absolute',
                left: `${(isRef ? overlapConfig.reference.x : overlapConfig.current.x)}%`,
                top: `${(isRef ? overlapConfig.reference.y : overlapConfig.current.y)}%`,
                transform: `translate3d(-50%, -50%, 0) scale(${overlapConfig.scale})`,
                transformOrigin: 'center center',
                zIndex: editHudMode ? 1200 : 100,
                cursor: editHudMode ? 'move' : 'default',
                backfaceVisibility: 'hidden',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                willChange: 'transform, left, top',
            }}
            className={`pointer-events-auto flex items-center border ${editHudMode ? 'hud-edit-glow' : 'border-transparent'} rounded-2xl p-2 px-3 gap-3 overflow-hidden glass-container-static group/teleOverlay ${isDragging || isResizing ? 'transition-none' : 'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]'} select-none min-w-[280px] h-14`}
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
            {editHudMode && (
                <div
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        handleResizePointerDown(e);
                    }}
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/40 rounded-tl-lg transition-colors"
                >
                    <MoveDiagonal2 size={8} className="text-blue-400" />
                </div>
            )}

            {/* Hint Overlay - Toggle text based on edit mode */}
            <div className={`absolute inset-0 flex items-center justify-center ${editHudMode ? 'bg-blue-600/20' : 'bg-black/40'} opacity-0 group-hover/teleOverlay:opacity-100 transition-opacity duration-300 pointer-events-none backdrop-blur-[1px]`}>
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] drop-shadow-lg scale-90 group-hover/teleOverlay:scale-100 transition-transform duration-300 ${editHudMode ? 'text-blue-200' : 'text-white/70'}`}>
                    {editHudMode ? 'Double Click to Lock' : 'Double Click to Edit'}
                </span>
            </div>
        </div>
    );
});
