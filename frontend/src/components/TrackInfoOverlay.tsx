import React, { useRef } from 'react';
import { MoveDiagonal2 } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useHudDraggable } from '../hooks/useHudDraggable';
import { handleGlassMouseMove } from '../utils/glassEffect';
import type { SessionMetadata } from '../types';
import { getCountryFlagPath } from '../utils/trackHelpers';

interface TrackInfoOverlayProps {
    sessionMetadata: SessionMetadata;
    referenceMetadata?: SessionMetadata | null;
    isMiniMap?: boolean;
    getCountryFlagPath?: (country?: string) => string | null;
}

export const TrackInfoOverlay = React.memo(({ sessionMetadata, referenceMetadata, getCountryFlagPath: propGetCountryFlagPath }: TrackInfoOverlayProps) => {
    // Use prop if provided, otherwise fallback to utility
    const resolveCountryFlag = propGetCountryFlagPath || getCountryFlagPath;
    return (
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl glass-container-static group/trackInfo transition-all duration-500 select-none min-w-[220px]" onMouseMove={handleGlassMouseMove}>
            {/* Top Area: Track Name & Layout */}
            <div className="flex items-center gap-3 p-3 pb-2.5 border-b border-white/10 bg-white/5">
                <div className="flex flex-col gap-1 items-center">
                    {resolveCountryFlag && sessionMetadata.country && (
                        <div className="p-1 bg-black/40 rounded-xl border border-white/10 group-hover/trackInfo:border-blue-500/40 transition-all shadow-inner">
                            <img
                                src={resolveCountryFlag(sessionMetadata.country)}
                                alt="Country Flag"
                                className="w-8 h-auto object-contain rounded-[1px] opacity-90 group-hover/trackInfo:opacity-100 transition-opacity"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                    )}
                </div>
                <div className="flex flex-col w-full pr-2">
                    <h2 className="text-sm font-black italic tracking-widest text-[#f0f0f0] uppercase font-sans leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.8)] group-hover/trackInfo:text-blue-400 transition-colors">
                        {sessionMetadata.trackName}
                    </h2>
                    {sessionMetadata.trackLayout && (
                        <span className="text-[11px] text-gray-400 font-mono tracking-tight uppercase block mt-1 opacity-80 leading-none group-hover/trackInfo:text-white transition-colors">
                            {sessionMetadata.trackLayout}
                        </span>
                    )}
                </div>
            </div>

            {/* Bottom Area: Weather Info */}
            <div className={`p-3 pt-2.5 pb-2 flex items-center ${referenceMetadata ? 'justify-between' : 'justify-start'} gap-6 bg-black/20`}>
                {/* Current Session Weather */}
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]`} />
                    <span className="text-[11px] font-black text-gray-300 tracking-[0.15em] uppercase">
                        {sessionMetadata.weather || "CLEAR"}
                    </span>
                </div>

                {/* Reference Session Weather */}
                {referenceMetadata && (
                    <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                        <span className="text-[11px] font-black text-gray-300 tracking-[0.15em] uppercase">
                            {referenceMetadata.weather || "CLEAR"}
                        </span>
                        <div className={`w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]`} />
                    </div>
                )}
            </div>
        </div>
    );
});
