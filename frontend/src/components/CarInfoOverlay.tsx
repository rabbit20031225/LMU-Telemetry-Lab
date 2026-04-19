import React, { useRef } from 'react';
import { MoveDiagonal2 } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useHudDraggable } from '../hooks/useHudDraggable';
import type { SessionMetadata } from '../types';
import { getBrandLogoPath, getClassColor } from '../utils/carHelpers';
import { handleGlassMouseMove } from '../utils/glassEffect';

interface CarInfoOverlayProps {
    sessionMetadata: SessionMetadata;
    referenceMetadata?: SessionMetadata | null;
    isMiniMap?: boolean;
}

export const CarInfoOverlay = React.memo(({ sessionMetadata, referenceMetadata }: CarInfoOverlayProps) => {
    const renderCarBlock = (meta: SessionMetadata, isRef: boolean) => {
        const accentColor = isRef ? 'text-amber-500' : 'text-blue-400';
        const dotColor = isRef ? 'bg-amber-500' : 'bg-blue-500';
        const shadowColor = isRef ? 'shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'shadow-[0_0_8px_rgba(59,130,246,0.5)]';

        return (
            <div className={`flex flex-col gap-2.5 p-3 ${isRef ? 'bg-amber-500/5' : 'bg-blue-500/5'}`}>
                {/* Identification Row */}
                <div className="flex items-center gap-2 mb-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${dotColor} ${shadowColor} animate-pulse`} />
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${accentColor}`}>
                        {isRef ? 'Reference' : 'Current'}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-black/40 rounded-xl border border-white/10 p-1.5 shadow-inner">
                        <img
                            src={getBrandLogoPath(meta.modelName)}
                            alt="Logo"
                            className="w-full h-full object-contain filter brightness-110"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.insertAdjacentHTML('beforeend', '<div class="w-6 h-6 bg-gray-800 rounded-full"></div>');
                            }}
                        />
                    </div>
                    <div className="flex flex-col whitespace-nowrap">
                        <h2 className="text-[13px] font-black italic tracking-widest text-[#f0f0f0] uppercase font-sans leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
                            {meta.modelName}
                        </h2>
                        <span className="text-[10px] font-bold text-gray-400/80 mt-1 uppercase tracking-tight">
                            {meta.rawCarName}
                        </span>
                        <div className="flex items-baseline gap-2 mt-1.5">
                            <div className={`px-2 py-0.5 rounded text-[8px] font-black border leading-none tracking-[0.1em] uppercase ${getClassColor(meta.carClass)}`}>
                                {meta.carClass || 'CLASS'}
                            </div>
                            <span className="text-[10px] text-gray-500 font-bold tracking-tight uppercase opacity-80">
                                {meta.driverName}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl glass-container-static group/carInfo transition-all duration-500 select-none w-fit" onMouseMove={handleGlassMouseMove}>
            <div className="flex flex-col divide-y divide-white/5">
                {renderCarBlock(sessionMetadata, false)}
                {referenceMetadata && renderCarBlock(referenceMetadata, true)}
            </div>
        </div>
    );
});
