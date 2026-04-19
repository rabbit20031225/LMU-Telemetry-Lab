import React from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { LapSelect } from './LapSelect';
import { Tooltip } from './ui/Tooltip';
import { Search, ArrowLeft } from 'lucide-react';

interface AnalysisLapsWidgetProps {
    className?: string;
    disabled?: boolean;
}

export const AnalysisLapsWidget: React.FC<AnalysisLapsWidgetProps> = ({ className, disabled = false }) => {
    const {
        laps,
        currentSessionId,
        selectedStint,
        isLoading,
        selectedLapIdx,
        referenceLapIdx,
        referenceLap,
        selectLap,
        setReferenceLap,
        fetchStint,
        setShowReferenceBrowser,
        isMapMaximized,
        setMaximizedSidebarMode
    } = useTelemetryStore();

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = (s % 60).toFixed(3);
        return `${mins}:${secs.padStart(6, '0')}`;
    };

    if (!currentSessionId || laps.length === 0) return null;

    const uniqueStints = Array.from(new Set(laps.map(l => l.stint).filter(Boolean))) as number[];
    const displayLaps = selectedStint
        ? laps.filter(l => l.stint === selectedStint)
        : laps;

    return (
        <div className={`flex flex-col gap-3 h-full ${className}`}>
            {/* Navigation back to Data Sources (Maximized Mode Only) */}
            {isMapMaximized && (
                <button
                    onClick={() => setMaximizedSidebarMode('data_sources')}
                    className="flex items-center gap-2 px-1 py-1 text-gray-500 hover:text-blue-400 transition-all font-black text-[10px] uppercase tracking-widest group/back"
                >
                    <ArrowLeft size={14} className="group-hover/back:-translate-x-1 transition-transform" />
                    Data Sources
                </button>
            )}

            {/* Stint Selection (Multi-stint sessions) */}
            {uniqueStints.length > 1 && (
                <div className="flex flex-col gap-1.5 mb-2">
                    {uniqueStints.map(stint => {
                        const stintLaps = laps.filter(l => l.stint === stint);
                        const totalLaps = stintLaps.length;
                        const totalTime = stintLaps.reduce((acc, l) => acc + l.duration, 0);
                        const totalFuel = stintLaps.reduce((acc, l) => acc + (l.fuelUsed || 0), 0);

                        const hrs = Math.floor(totalTime / 3600);
                        const mins = Math.floor((totalTime % 3600) / 60);
                        const secs = (totalTime % 60).toFixed(0).padStart(2, '0');
                        const timeStr = hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs}` : `${mins}:${secs}`;

                        return (
                             <button
                                key={stint}
                                onClick={() => !disabled && fetchStint(stint)}
                                disabled={isLoading || disabled}
                                className={`flex flex-row items-center justify-between text-left px-3 py-2.5 rounded-xl border transition-all glass-container group/stint min-h-[44px] ${disabled ? 'opacity-50 cursor-default' : ''} ${selectedStint === stint
                                    ? 'bg-blue-600/30 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.2)]'
                                    : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5'
                                    }`}
                                onMouseMove={handleGlassMouseMove}
                            >
                                <div className="glass-content flex flex-row items-center justify-between w-full">
                                    <span className="font-bold text-[13px] w-14">Stint {stint}</span>
                                    <span className="font-mono text-[11px] text-gray-300 w-14 text-center bg-black/40 rounded px-1 py-0.5">{totalLaps} Laps</span>
                                    <span className="font-mono text-[11px] text-gray-300 w-[60px] flex items-center justify-center gap-1">
                                        <img src="/delta.png" className="w-2.5 h-2.5 opacity-60" />
                                        {timeStr}
                                    </span>
                                    <span className="font-mono text-[11px] text-gray-400 w-16 flex items-center justify-end gap-1">
                                        <img src="/fuel.png" className="w-2.5 h-2.5 opacity-60" />
                                        {totalFuel.toFixed(1)} L
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Lap Selection Dropdowns */}
            <div className="flex flex-col gap-3">
                <LapSelect
                    label="Current"
                    value={selectedLapIdx}
                    onChange={selectLap}
                    laps={displayLaps}
                    borderColor="border-[#3b82f6]"
                    labelColor="text-[#3b82f6]"
                    disabled={disabled}
                />
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <LapSelect
                            label="Reference"
                            value={referenceLapIdx}
                            onChange={setReferenceLap}
                            laps={displayLaps}
                            borderColor="border-[#daa520]"
                            labelColor="text-[#daa520]"
                            showNone={true}
                            className={referenceLapIdx === null && !referenceLap ? 'is-reference-none' : ''}
                            placeholder={referenceLap ? `Lap ${referenceLap.lap} - ${formatDuration(referenceLap.duration)} ${referenceLap.fuelUsed ? `[${referenceLap.fuelUsed.toFixed(1)}L]` : ''}` : undefined}
                            disabled={disabled}
                        />
                    </div>
                    <Tooltip text="BROWSE SESSIONS" position="top">
                        <button
                            onClick={() => !disabled && setShowReferenceBrowser(true)}
                            disabled={disabled}
                            className={`mb-1 p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 transition-all group/browser-btn h-[38px] w-[38px] flex items-center justify-center flex-shrink-0 ${disabled ? 'opacity-30 cursor-default' : 'hover:bg-white/10 hover:text-blue-400'}`}
                        >
                            <Search className={`w-4 h-4 opacity-50 ${!disabled ? 'group-hover/browser-btn:opacity-100 transition-opacity' : ''}`} />
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};
