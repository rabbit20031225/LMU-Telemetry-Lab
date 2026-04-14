import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { handleGlassMouseMove } from '../utils/glassEffect';

interface F1DashboardProps {
    data: any;
    cursorIndex: number | null;
    theme?: 'current' | 'reference';
    compact?: boolean;
}

export const F1Dashboard = React.memo(({ data, cursorIndex, theme = 'current', compact = false }: F1DashboardProps) => {
    const speedUnit = useTelemetryStore(state => state.speedUnit);
 
    const { speed, rpm, throttle, brake, gear } = useMemo(() => {
        const activeIdx = cursorIndex ?? 0;
        const baseIdx = Math.floor(activeIdx);
        const dataLength = data?.['Ground Speed']?.length ?? 1;
        const nextIdx = Math.min(dataLength - 1, baseIdx + 1);
        const frac = activeIdx - baseIdx;
 
        const interp = (channel: string, fallback?: string) => {
            const chanData = data?.[channel] || (fallback ? data?.[fallback] : null);
            if (!chanData) return 0;
            const v1 = chanData[baseIdx] ?? 0;
            const v2 = chanData[nextIdx] ?? 0;
            return v1 + (v2 - v1) * frac;
        };
 
        const sRaw = interp('Ground Speed', 'Speed');
        const s = speedUnit === 'mph' ? sRaw * 0.621371 : sRaw;
        
        return {
            speed: s,
            rpm: interp('Engine RPM', 'RPM'),
            throttle: interp('Throttle Pos', 'Throttle'),
            brake: interp('Brake Pos', 'Brake'),
            gear: data?.['Gear']?.[baseIdx] ?? 0
        };
    }, [data, cursorIndex, speedUnit]);

    const isRef = theme === 'reference';
    const mainColor = isRef ? '#daa520' : '#0666f8';
    const glowColor = isRef ? 'rgba(218, 165, 32, 0.4)' : 'rgba(6, 102, 248, 0.4)';

    const size = compact ? 200 : 260;
    const center = size / 2;
    const outerRadius = compact ? 70 : 100;
    const innerRadius = compact ? 55 : 80;

    const speedRef = useRef<SVGPathElement>(null);
    const throttleRef = useRef<SVGPathElement>(null);
    const brakeRef = useRef<SVGPathElement>(null);
    const [pathLengths, setPathLengths] = useState({ speed: 1, throttle: 1, brake: 1 });

    useEffect(() => {
        if (speedRef.current && throttleRef.current && brakeRef.current) {
            setPathLengths({
                speed: speedRef.current.getTotalLength(),
                throttle: throttleRef.current.getTotalLength(),
                brake: brakeRef.current.getTotalLength()
            });
        }
    }, [data, compact]);

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    };

    const getArcPath = (startAngle: number, endAngle: number, radius: number) => {
        const start = polarToCartesian(center, center, radius, startAngle);
        const end = polarToCartesian(center, center, radius, endAngle);
        const delta = Math.abs(endAngle - startAngle);
        const largeArcFlag = delta > 180 ? "1" : "0";
        const sweepFlag = endAngle > startAngle ? "1" : "0";
        return [ "M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, sweepFlag, end.x, end.y ].join(" ");
    };

    return (
        <div className={`bg-white/10 glass-container-flat ${compact ? 'p-1 pt-6 rounded-xl' : 'p-4 pt-10 rounded-2xl'} border border-white/20 shadow-xl overflow-hidden hover:bg-white/15 transition-all w-full flex flex-col items-center relative group/f1dashv2`} 
            style={{ 
                boxShadow: isRef ? `0 10px 25px rgba(0,0,0,0.4), inset 0 0 20px ${glowColor}` : undefined,
                borderColor: isRef ? 'rgba(218, 165, 32, 0.3)' : undefined
            }}
            onMouseMove={(e: any) => handleGlassMouseMove(e, 0.12)}>
            
            <div className={`absolute top-0 left-0 flex items-center gap-1.5 ${compact ? 'p-2' : 'p-3'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isRef ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'}`} />
                <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] ${isRef ? 'text-amber-500' : 'text-gray-500'} group-hover/f1dashv2:text-white transition-colors`}>
                    {isRef ? 'Reference' : 'Live Dashboard'}
                </span>
            </div>

            <div className="glass-content w-full flex flex-col items-center">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <defs>
                        <path id={`speedPath-${theme}`} d={getArcPath(-140, 140, outerRadius)} />
                        <path id={`throttlePath-${theme}`} d={getArcPath(-130, -10, innerRadius)} />
                        <path id={`brakePath-${theme}`} d={getArcPath(10, 130, innerRadius)} />
                    </defs>

                    <path d={getArcPath(-140, 140, outerRadius)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={compact ? "10" : "14"} />
                    <path d={getArcPath(-130, -10, innerRadius)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={compact ? "14" : "20"} />
                    <path d={getArcPath(130, 10, innerRadius)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={compact ? "14" : "20"} />

                    <path
                        ref={speedRef}
                        d={getArcPath(-140, 140, outerRadius)}
                        fill="none"
                        stroke={mainColor}
                        strokeWidth={compact ? "10" : "14"}
                        strokeDasharray={pathLengths.speed}
                        strokeDashoffset={pathLengths.speed * (1 - Math.min(speed, 360) / 360)}
                    />

                    <path
                        ref={throttleRef}
                        d={getArcPath(-130, -10, innerRadius)}
                        fill="none"
                        stroke="#24c500ff"
                        strokeWidth={compact ? "12" : "20"}
                        strokeDasharray={pathLengths.throttle}
                        strokeDashoffset={pathLengths.throttle * (1 - throttle / 100)}
                    />

                    <path
                        ref={brakeRef}
                        d={getArcPath(130, 10, innerRadius)}
                        fill="none"
                        stroke="#FF1801"
                        strokeWidth={compact ? "12" : "20"}
                        strokeDasharray={pathLengths.brake}
                        strokeDashoffset={pathLengths.brake * (1 - brake / 100)}
                    />

                    <text fill="white" fontSize={compact ? "6" : "9"} fontWeight="bold" dominantBaseline="central" className="font-black uppercase tracking-[0.15em]">
                        <textPath href={`#speedPath-${theme}`} startOffset="50%" textAnchor="middle">SPEED</textPath>
                    </text>
                    
                    {!compact && (
                        <>
                            <text fill="white" fontSize="9" fontWeight="bold" dominantBaseline="central" className="font-black uppercase tracking-[0.1em]">
                                <textPath href={`#throttlePath-${theme}`} startOffset="50%" textAnchor="middle">THROTTLE • {throttle.toFixed(1)}%</textPath>
                            </text>
                            <text fill="white" fontSize="9" fontWeight="bold" dominantBaseline="central" className="font-black uppercase tracking-[0.1em]">
                                <textPath href={`#brakePath-${theme}`} startOffset="50%" textAnchor="middle">BRAKE • {brake.toFixed(1)}%</textPath>
                            </text>
                        </>
                    )}

                    <text x={center} y={center - (compact ? 5 : 8)} textAnchor="middle" fill="white" className={`${compact ? 'text-3xl' : 'text-5xl'} font-black tracking-tighter`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        {Math.round(speed)}
                    </text>
                    <text x={center} y={center + (compact ? 8 : 12)} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={compact ? "8" : "10"} className="font-black uppercase tracking-[0.3em]">
                        {speedUnit === 'kmh' ? 'KMH' : 'MPH'}
                    </text>

                    <text x={center} y={center + (compact ? 35 : 45)} textAnchor="middle" fill="white" className={`${compact ? 'text-lg' : 'text-2xl'} font-black tracking-tighter opacity-80`}>
                        {Math.round(rpm)}
                    </text>
                    <text x={center} y={center + (compact ? 44 : 58)} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={compact ? "7" : "9"} className="font-black uppercase tracking-[0.2em]">
                        RPM
                    </text>

                </svg>

                <div className={`absolute ${compact ? 'bottom-2' : 'bottom-4'} left-1/2 -translate-x-1/2 flex flex-col items-center`}>
                    <span className={`${compact ? 'text-[7px]' : 'text-[9px]'} font-black text-white/30 uppercase tracking-[0.4em] mb-[-2px]`}>Gear</span>
                    <span className={`${compact ? 'text-2xl' : 'text-4xl'} font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
                        {gear || 'N'}
                    </span>
                </div>
            </div>
        </div>
    );
});
