import React from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import type { SessionMetadata } from '../types';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { Tooltip } from './ui/Tooltip';

interface CarInfoCardProps {
    metadata: SessionMetadata;
    getBrandLogoPath: (name: string) => string;
    getClassColor: (cls: string) => string;
    theme?: 'current' | 'reference';
}

const CarInfoCard: React.FC<CarInfoCardProps> = ({ metadata, getBrandLogoPath, getClassColor, theme = 'current' }) => {
    const isRef = theme === 'reference';
    const accentColor = isRef ? 'text-amber-500' : 'text-blue-400';
    const hoverAccentColor = isRef ? 'group-hover:text-amber-400' : 'group-hover:text-blue-400';
    const borderColor = isRef ? 'group-hover:border-amber-500/40' : 'group-hover:border-blue-500/40';
    const shadowColor = isRef ? 'shadow-[0_20px_40px_rgba(245,158,11,0.15)]' : 'shadow-[0_20px_40px_rgba(37,99,235,0.15)]';

    return (
        <div
            className={`flex flex-col bg-white/10 glass-container glass-expand-pixel p-4 pt-3 rounded-2xl border border-white/25 ${shadowColor} group hover:bg-white/15 transition-all duration-300 relative hover:scale-[1.02] hover:z-10`}
            onMouseMove={handleGlassMouseMove}
        >
            <div className="glass-content">
                {/* Dedicated Label Row */}
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isRef ? 'bg-amber-500' : 'bg-blue-500'} animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${accentColor} drop-shadow-sm`}>
                        {isRef ? 'Reference Car' : 'Current Car'}
                    </span>
                </div>

                <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl border border-white/20 ${borderColor} transition-all p-1.5`}>
                        <img
                            src={getBrandLogoPath(metadata.modelName)}
                            alt="Brand Logo"
                            className="w-full h-full object-contain filter brightness-125 grayscale group-hover:grayscale-0 transition-all drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.insertAdjacentHTML('beforeend', '<div class="w-6 h-6 bg-gray-800 rounded-full border border-gray-700"></div>');
                            }}
                        />
                    </div>
                    <div className="flex flex-col relative">
                        <h2 className={`text-sm font-black italic tracking-widest text-white uppercase font-sans leading-tight ${hoverAccentColor} transition-colors`}>
                            {metadata.modelName}
                        </h2>
                        {metadata.rawCarName && metadata.rawCarName.toLowerCase() !== metadata.modelName.toLowerCase() && (
                            <span className="text-[11px] text-gray-400 font-mono tracking-tighter uppercase block mt-0.5 opacity-80 group-hover:text-white transition-colors">
                                {metadata.rawCarName}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/5 relative">
                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black border leading-none tracking-[0.15em] shadow-sm uppercase ${getClassColor(metadata.carClass)}`}>
                        {metadata.carClass || 'CLASS'}
                    </div>
                    <div className="text-[11px] font-bold text-gray-400 capitalize flex items-center gap-1.5 group-hover:text-white transition-colors">
                        <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <svg className={`w-3 h-3 text-gray-500 ${hoverAccentColor} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        {metadata.driverName}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SessionInfoProps {
    sessionMetadata: SessionMetadata;
    referenceMetadata?: SessionMetadata | null;
    getTrackFlagPath: (name: string) => string;
    getCountryFlagPath?: (name: string) => string;
    getBrandLogoPath: (name: string) => string;
    getClassColor: (cls: string) => string;
}

export const SessionInfo: React.FC<SessionInfoProps> = ({ sessionMetadata, referenceMetadata, getTrackFlagPath, getCountryFlagPath, getBrandLogoPath, getClassColor }) => {
    const telemetryData = useTelemetryStore(state => state.telemetryData);
    const cursorIndex = useTelemetryStore(state => state.cursorIndex);
    const selectedLapIdx = useTelemetryStore(state => state.selectedLapIdx);
    const laps = useTelemetryStore(state => state.laps);
    const tempUnit = useTelemetryStore(state => state.tempUnit);

    // Safely get data at current cursor if available
    let trackTempDisplay = "--";
    const trackTimeDisplay = sessionMetadata.sessionTime || "--:--:--";

    let sessionDurationDisplay = "--:--:--";
    if (sessionMetadata.sessionDuration) {
        const sec = sessionMetadata.sessionDuration;
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        sessionDurationDisplay = h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
    }

    if (telemetryData && cursorIndex !== null && selectedLapIdx !== null) {
        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        if (currentLap) {
            const trackTempChannel = telemetryData['Track Temperature'];

            const baseIdx = Math.floor(cursorIndex);
            if (trackTempChannel && trackTempChannel.length > baseIdx) {
                const rawTemp = trackTempChannel[baseIdx];
                if (rawTemp !== undefined) {
                    const displayTemp = tempUnit === 'f' ? (rawTemp * 1.8 + 32) : rawTemp;
                    trackTempDisplay = Math.round(displayTemp).toString();
                }
            }
        }
    }

    return (
        <div className="flex flex-col bg-transparent">
            {/* Header Area */}
            <div className="px-1 pt-4 pb-2 flex items-center gap-3">
                <h3 className="text-gray-500 text-[12px] font-black uppercase tracking-[0.2em] px-1 whitespace-nowrap">Session Info</h3>
                <div className="h-[1px] flex-1 bg-white/10 relative overflow-hidden group/linkage">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[sweep_3s_infinite]" />
                </div>
            </div>

            <div className="flex flex-col gap-3 py-3">
                {/* 0. Session Type */}
                {sessionMetadata.sessionType && (
                    <div
                        className="bg-white/10 border border-white/25 glass-container glass-expand-pixel rounded-2xl p-4 text-center shadow-[0_15px_35px_rgba(0,0,0,0.4)] flex flex-col justify-center animate-in fade-in slide-in-from-top-2 duration-500 group transition-all"
                        onMouseMove={handleGlassMouseMove}
                    >
                        <div className="glass-content">
                            <span className="text-blue-400 font-black italic tracking-[0.25em] uppercase text-xl leading-none drop-shadow-[0_0_12px_rgba(59,130,246,0.3)] group-hover:text-blue-300 transition-colors">
                                {sessionMetadata.sessionType}
                            </span>
                        </div>
                    </div>
                )}

                {/* 1. Track Info */}
                <div
                    className="flex flex-col bg-white/10 glass-container glass-expand-pixel p-4 rounded-2xl border border-white/25 shadow-[0_20px_40px_rgba(0,0,0,0.4)] group hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:z-10"
                    onMouseMove={handleGlassMouseMove}
                >
                    <div className="glass-content flex items-center gap-3">
                        <div className="p-1 bg-white/10 rounded-lg border border-white/20 group-hover:border-blue-500/40 transition-all">
                            <img
                                src={getTrackFlagPath(sessionMetadata.trackName)}
                                alt="Track Flag"
                                className="w-7 h-auto max-h-5 object-contain rounded-sm"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.insertAdjacentHTML('beforeend', '<div class="w-6 h-4 bg-gray-800 rounded-sm border border-gray-700"></div>');
                                }}
                            />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-sm font-black italic tracking-widest text-white uppercase font-sans leading-tight group-hover:text-blue-400 transition-colors">
                                {sessionMetadata.trackName}
                            </h2>
                            {sessionMetadata.trackLayout && (
                                <span className="text-[11px] text-gray-400 font-mono tracking-tighter uppercase block mt-0.5 opacity-80 group-hover:text-white transition-colors">
                                    {sessionMetadata.trackLayout}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Car Info Cards */}
                <div className="flex flex-col gap-2">
                    <CarInfoCard
                        metadata={sessionMetadata}
                        getBrandLogoPath={getBrandLogoPath}
                        getClassColor={getClassColor}
                        theme="current"
                    />

                    {referenceMetadata && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                            <CarInfoCard
                                metadata={referenceMetadata}
                                getBrandLogoPath={getBrandLogoPath}
                                getClassColor={getClassColor}
                                theme="reference"
                            />
                        </div>
                    )}
                </div>

                {/* 3. Session Status indicators */}
                <div className="flex flex-col gap-2 font-mono text-gray-400 mt-1">
                    <div className="bg-white/10 glass-container glass-expand-pixel rounded-xl px-4 py-3 flex justify-between items-center border border-white/25 shadow-xl hover:bg-white/15 transition-all group" onMouseMove={handleGlassMouseMove}>
                        <div className="glass-content flex justify-between items-center w-full">
                            <span className="font-black tracking-[0.1em] uppercase text-[11px] text-gray-400 group-hover:text-white transition-colors">Weather</span>
                            <Tooltip text={sessionMetadata.weather || "CLEAR"} position="top">
                                <span className="text-blue-300 font-black text-xs uppercase tracking-tight drop-shadow-[0_0_8px_rgba(147,197,253,0.3)]">{sessionMetadata.weather || "--"}</span>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="bg-white/10 glass-container glass-expand-pixel rounded-xl px-4 py-3 flex justify-between items-center border border-white/25 shadow-xl hover:bg-white/15 transition-all group" onMouseMove={handleGlassMouseMove}>
                        <div className="glass-content flex justify-between items-center w-full">
                            <span className="font-black tracking-[0.1em] uppercase text-[11px] text-gray-400 group-hover:text-white transition-colors">Track Temp</span>
                            <span className="text-amber-500 font-black text-xs drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">{trackTempDisplay}°{tempUnit === 'c' ? 'C' : 'F'}</span>
                        </div>
                    </div>
                    <div className="bg-white/10 glass-container glass-expand-pixel rounded-xl px-4 py-3 flex justify-between items-center border border-white/25 shadow-xl hover:bg-white/15 transition-all group" onMouseMove={handleGlassMouseMove}>
                        <div className="glass-content flex justify-between items-center w-full">
                            <span className="font-black tracking-[0.1em] uppercase text-[11px] text-gray-400 group-hover:text-white transition-colors">Track Time</span>
                            <span className="text-blue-100 font-black text-xs drop-shadow-[0_0_8px_rgba(219,234,254,0.3)]">{trackTimeDisplay}</span>
                        </div>
                    </div>
                    <div className="bg-white/10 glass-container glass-expand-pixel rounded-xl px-4 py-3 flex justify-between items-center border border-white/25 shadow-xl hover:bg-white/15 transition-all group" onMouseMove={handleGlassMouseMove}>
                        <div className="glass-content flex justify-between items-center w-full">
                            <span className="font-black tracking-[0.1em] uppercase text-[11px] text-gray-400 group-hover:text-white transition-colors">Session Time</span>
                            <span className="text-indigo-400 font-black text-xs drop-shadow-[0_0_8px_rgba(129,140,248,0.3)]">{sessionDurationDisplay}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
