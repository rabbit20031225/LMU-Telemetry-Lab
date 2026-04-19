import React, { useRef } from 'react';
import { MoveDiagonal2 } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useHudDraggable } from '../hooks/useHudDraggable';
import { handleGlassMouseMove } from '../utils/glassEffect';
import type { SessionMetadata } from '../types';

interface TrackInfoOverlayProps {
    sessionMetadata: SessionMetadata;
    referenceMetadata?: SessionMetadata | null;
    isMiniMap?: boolean;
}

const getTrackFlagPath = (trackName: string) => {
    const lower = trackName.toLowerCase();
    if (lower.includes('fuji')) return '/tracks/fuji_international_speedway.png';
    if (lower.includes('monza')) return '/tracks/autodromo_nazionale_monza.png';
    if (lower.includes('imola')) return '/tracks/autodromo_internazionale_enzo_e_dino_ferrari.png';
    if (lower.includes('le mans') || lower.includes('sarthe')) return '/tracks/circuit_de_la_sarthe.png';
    if (lower.includes('sebring')) return '/tracks/sebring_international_raceway.png';
    if (lower.includes('bahrain')) return '/tracks/bahrain_international_circuit.png';
    if (lower.includes('spa')) return '/tracks/circuit_de_spa_francorchamps.png';
    if (lower.includes('portimao') || lower.includes('algarve')) return '/tracks/algarve_international_circuit.png';
    if (lower.includes('cota') || lower.includes('austin') || lower.includes('americas')) return '/tracks/circuit_of_the_americas.png';
    if (lower.includes('interlagos') || lower.includes('carlos pace')) return '/tracks/autodromo_jose_carlos_pace.png';
    return `/tracks/${lower.replace(/[^a-z0-9]/g, '_')}.png`;
};

export const TrackInfoOverlay = React.memo(({ sessionMetadata, referenceMetadata }: TrackInfoOverlayProps) => {
    return (
        <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl glass-container-static group/trackInfo transition-all duration-500 select-none min-w-[220px]" onMouseMove={handleGlassMouseMove}>
            {/* Top Area: Track Name & Layout */}
            <div className="flex items-center gap-3 p-3 pb-2.5 border-b border-white/10 bg-white/5">
                <div className="p-1 bg-black/40 rounded-lg border border-white/20 shadow-inner">
                    <img
                        src={getTrackFlagPath(sessionMetadata.trackName)}
                        alt="Track Flag"
                        className="w-8 h-auto max-h-6 object-contain rounded-[2px]"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.insertAdjacentHTML('beforeend', '<div class="w-8 h-5 bg-gray-800 rounded-[2px] border border-gray-700"></div>');
                        }}
                    />
                </div>
                <div className="flex flex-col w-full pr-2">
                    <h2 className="text-sm font-black italic tracking-widest text-[#f0f0f0] uppercase font-sans leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
                        {sessionMetadata.trackName}
                    </h2>
                    {sessionMetadata.trackLayout && (
                        <span className="text-[11px] text-gray-400 font-mono tracking-tight uppercase block mt-1 opacity-80 leading-none">
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
