import React, { useState, useRef, useEffect } from 'react';
import type { Lap } from '../types';
import { ChevronDown } from 'lucide-react';
import { handleGlassMouseMove } from '../utils/glassEffect';

interface LapSelectProps {
    label: string;
    value: number | null;
    onChange: (lap: number | null) => void;
    laps: Lap[];
    borderColor: string; // e.g., "border-blue-500"
    labelColor: string; // e.g., "text-blue-400"
    showNone?: boolean;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

export const LapSelect: React.FC<LapSelectProps> = ({
    label, value, onChange, laps, borderColor, labelColor, showNone = false, className, placeholder, disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Calculate fastest lap duration
    const validLaps = laps.filter(l => l.isValid);
    const minDuration = validLaps.length > 0 ? Math.min(...validLaps.map(l => l.duration)) : -1;

    // Handle animation lifecycle
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            // Small delay to ensure DOM is ready for transition
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimating(true);
                });
            });
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => setShouldRender(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Stop native wheel propagation to prevent parent map from hijacking scroll
    useEffect(() => {
        const scrollDiv = scrollRef.current;
        if (!scrollDiv) return;

        const handleWheel = (e: WheelEvent) => {
            e.stopPropagation();
        };

        scrollDiv.addEventListener('wheel', handleWheel, { passive: false });
        return () => scrollDiv.removeEventListener('wheel', handleWheel);
    }, [shouldRender]); // Re-attach when list is rendered

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatTime = (duration: number) => {
        const minutes = Math.floor(duration / 60);
        const seconds = (duration % 60).toFixed(3).padStart(6, '0');
        return `${minutes}:${seconds}`;
    };

    const getLapDisplay = (lap: Lap) => {
        const isFastest = lap.isValid && lap.duration === minDuration;
        const cleanTimeStr = formatTime(lap.duration);
        let timeStr = cleanTimeStr;
        if (lap.inPit) timeStr += " (IN PITS)";
        else if (lap.isOutLap) timeStr += " (OUT LAP)";

        return { isFastest, timeStr, cleanTimeStr, isInvalid: !lap.isValid, fuelUsed: lap.fuelUsed };
    };

    const selectedLap = laps.find(l => l.lap === value);
    let displayContent = <span className="text-gray-400 truncate">{placeholder || "Select Lap"}</span>;
    if (value === null && showNone) {
        if (placeholder) {
            displayContent = <span className="text-amber-500/80 font-mono text-[11px] truncate uppercase tracking-tighter">{placeholder}</span>;
        } else {
            displayContent = <span className="text-gray-500 font-mono">None</span>;
        }
    } else if (selectedLap) {
        const { isFastest, cleanTimeStr, isInvalid, fuelUsed } = getLapDisplay(selectedLap);
        displayContent = (
            <span className="flex items-center justify-between w-full">
                <span className="text-gray-300 font-mono whitespace-nowrap mr-2">Lap {selectedLap.lap}</span>
                <span className="flex flex-1 items-center justify-end gap-2">
                    <span className={`${isInvalid ? 'text-red-500 font-bold' : (isFastest ? 'text-purple-400 font-bold' : 'text-gray-300')} font-mono text-[11px] whitespace-nowrap text-right`}>
                        {cleanTimeStr}
                    </span>
                    {fuelUsed !== undefined && fuelUsed > 0.05 ? (
                        <span className="text-gray-500 font-mono text-[10px] flex items-center justify-end gap-1 w-12"><img src="/fuel.png" className="w-2.5 h-2.5 opacity-60" />{fuelUsed.toFixed(1)} L</span>
                    ) : (
                        <span className="w-12"></span>
                    )}
                </span>
            </span>
        );
    }

    return (
        <div className="flex flex-col w-full relative group/lapselect" ref={dropdownRef} onMouseMove={handleGlassMouseMove}>
            <div className={`flex flex-col w-full glass-container-static border transition-all duration-300 relative ${isOpen ? `rounded-xl shadow-2xl ${borderColor}` : `rounded-xl border-white/15 hover:border-white/30`}`}>
                <button
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`w-full px-3 py-1.5 flex items-center justify-between gap-2 focus:outline-none transition-all ${disabled ? 'cursor-default' : 'active:scale-[0.98]'} group/lapbtn ${isOpen ? 'border-b border-white/10' : ''}`}
                >
                    <div className={`glass-content flex items-center justify-between w-full transition-transform duration-300 ${!disabled ? 'group-hover/lapselect:scale-[1.02]' : ''} ${className === 'is-reference-none' || disabled ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                        <div className="flex flex-col items-start flex-1 min-w-0">
                            <span className={`text-[8px] ${labelColor} font-black uppercase tracking-[0.2em] mb-0.5 transition-all duration-300 origin-left ${!disabled ? 'group-hover/lapbtn:scale-110 group-hover/lapbtn:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`}>{label}</span>
                            {displayContent}
                        </div>
                        <ChevronDown size={14} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : (!disabled ? 'group-hover:text-blue-400' : '')}`} />
                    </div>
                </button>

                <div
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isAnimating ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                    <div className="overflow-hidden">
                        {shouldRender && (
                            <div
                                ref={scrollRef}
                                className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 space-y-1.5"
                                onWheel={(e) => e.stopPropagation()}
                            >
                                {showNone && (
                                    <button
                                        className="w-full text-left px-3 py-2 text-sm text-gray-500 glass-container hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10"
                                        onClick={() => { onChange(null); setIsOpen(false); }}
                                        onMouseMove={handleGlassMouseMove}
                                    >
                                        <div className="glass-content">
                                            None
                                        </div>
                                    </button>
                                )}
                                {laps.map(l => {
                                    const { isFastest, timeStr, isInvalid, fuelUsed } = getLapDisplay(l);
                                    return (
                                        <button
                                            key={l.lap}
                                            className={`w-full text-left px-3 py-2 text-[13px] glass-container border rounded-xl transition-all group/lapitem
                                                ${value === l.lap ? 'bg-blue-600/20 border-blue-400/50 text-blue-400' : 'border-white/5 text-gray-300 hover:border-white/20 hover:bg-white/5'}
                                            `}
                                            onClick={() => { onChange(l.lap); setIsOpen(false); }}
                                            onMouseMove={handleGlassMouseMove}
                                        >
                                            <div className="glass-content flex items-center justify-between w-full">
                                                <span className="font-mono pr-2 min-w-max">Lap {l.lap}</span>
                                                <span className="flex flex-1 items-center justify-end gap-2">
                                                    <span className={`${isInvalid ? 'text-red-500 font-bold' : (isFastest ? 'text-purple-400 font-bold' : (value === l.lap ? 'text-blue-400' : 'text-gray-400'))} font-mono text-[11px] whitespace-nowrap text-right group-hover/lapitem:scale-105 transition-transform`}>
                                                        {timeStr}
                                                    </span>
                                                    {fuelUsed !== undefined && fuelUsed > 0.05 ? (
                                                        <span className="text-gray-500 font-mono text-[10px] flex items-center justify-end gap-1 w-12"><img src="/fuel.png" className="w-2.5 h-2.5 opacity-60" />{fuelUsed.toFixed(1)} L</span>
                                                    ) : (
                                                        <span className="w-12"></span>
                                                    )}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
