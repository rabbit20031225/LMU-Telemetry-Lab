import React, { useRef, useState } from 'react';
import { MoveDiagonal2, Trophy } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useHudDraggable } from '../hooks/useHudDraggable';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { AnalysisLapsWidget } from './AnalysisLapsWidget';

export const LapsSelectorOverlay: React.FC = () => {
    return (
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl glass-container-static group/analysisHUD select-none w-[320px] min-h-[120px]" onMouseMove={handleGlassMouseMove}>
            {/* Header Area */}
            <div className="flex items-center gap-2 p-3 pb-2.5 border-b border-white/10 bg-white/5 relative z-10">
                <Trophy size={14} className="text-amber-500" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f0f0f0] font-sans leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
                    Analysis Laps
                </h2>
            </div>

            {/* Content Area */}
            <div className={`p-4 overflow-y-auto custom-scrollbar flex-1 relative z-0`}>
                <AnalysisLapsWidget />
            </div>
        </div>
    );
};
