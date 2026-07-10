import React from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { handleGlassMouseMove } from '../utils/glassEffect';

export const MaximizedSectorToggle: React.FC = () => {
    const showMiniSectors = useTelemetryStore(state => state.showMiniSectors);
    const setShowMiniSectors = useTelemetryStore(state => state.setShowMiniSectors);
    const selectedLapIdx = useTelemetryStore(state => state.selectedLapIdx);

    if (selectedLapIdx === null) return null;

    return (
        <div 
            className="relative flex items-center p-1 bg-[#1a1a1e]/80 backdrop-blur-3xl rounded-lg border border-white/10 glass-container w-24 h-8 overflow-hidden group/sector-toggle shadow-[0_8px_20px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-500 pointer-events-auto" 
            onMouseMove={handleGlassMouseMove}
        >
            {/* Sliding Indicator Pill */}
            <div 
                className="absolute top-1 bottom-1 w-[calc(50%-3px)] bg-blue-600 rounded-md shadow-[0_0_12px_rgba(37,99,235,0.5)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
                style={{ left: !showMiniSectors ? '3px' : 'calc(50%)' }}
            />
            
            <button
                onClick={() => setShowMiniSectors(false)}
                className={`relative z-10 flex-1 h-full flex items-center justify-center text-[9px] font-black uppercase tracking-[0.1em] transition-colors duration-300 ${!showMiniSectors ? 'text-white' : 'text-gray-500 hover:text-white'}`}
            >
                SEC
            </button>
            <button
                onClick={() => setShowMiniSectors(true)}
                className={`relative z-10 flex-1 h-full flex items-center justify-center text-[9px] font-black uppercase tracking-[0.1em] transition-colors duration-300 ${showMiniSectors ? 'text-white' : 'text-gray-500 hover:text-white'}`}
            >
                SEG
            </button>
        </div>
    );
};
