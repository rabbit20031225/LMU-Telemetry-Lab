import React, { useState, useEffect, useMemo } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { apiClient } from '../api/client';
import type { ReferenceLap } from '../types';
import { Search, History, MapPin, X, Loader2, Calendar, ChevronRight, ChevronDown } from 'lucide-react';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { Tooltip } from './ui/Tooltip';

const getBrandLogoPath = (modelName: string) => {
    const lower = (modelName || '').toLowerCase();
    if (lower.includes('mclaren')) return '/logos/mclaren.png';
    if (lower.includes('ferrari')) return '/logos/ferrari.png';
    if (lower.includes('porsche')) return '/logos/porsche.png';
    if (lower.includes('lamborghini')) return '/logos/lamborghini.png';
    if (lower.includes('bmw')) return '/logos/bmw.png';
    if (lower.includes('aston')) return '/logos/aston_martin.png';
    if (lower.includes('mercedes') || lower.includes('amg')) return '/logos/mercedes.png';
    if (lower.includes('corvette')) return '/logos/corvette.png';
    if (lower.includes('toyota')) return '/logos/toyota.png';
    if (lower.includes('cadillac')) return '/logos/cadillac.png';
    if (lower.includes('peugeot')) return '/logos/peugeot.png';
    if (lower.includes('alpine')) return '/logos/alpine.png';
    if (lower.includes('lexus')) return '/logos/lexus.png';
    if (lower.includes('genesis')) return '/logos/genesis.png';
    if (lower.includes('ford') || lower.includes('mustang')) return '/logos/ford.png';
    if (lower.includes('isotta')) return '/logos/isotta_fraschini.png';
    if (lower.includes('glickenhaus')) return '/logos/glickenhaus.png';
    if (lower.includes('vanwall')) return '/logos/vanwall.png';
    if (lower.includes('chevrolet')) return '/logos/corvette.png';
    if (lower.includes('oreca')) return '/logos/oreca.png';
    if (lower.includes('ginetta')) return '/logos/ginetta.png';
    if (lower.includes('ligier')) return '/logos/ligier.png';
    const brand = lower.split(' ')[0];
    return `/logos/${brand}.png`;
};

interface ReferenceLapBrowserProps {
    onClose: () => void;
}

export const ReferenceLapBrowser: React.FC<ReferenceLapBrowserProps> = ({ onClose }) => {
    const { sessionMetadata, activeProfileId, currentSessionId, selectedLapIdx, referenceLap, referenceLapIdx, selectReferenceLap } = useTelemetryStore();
    const [laps, setLaps] = useState<ReferenceLap[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [expandedStint, setExpandedStint] = useState<string | null>(null);

    useEffect(() => {
        if (sessionMetadata) {
            setIsLoading(true);
            
            apiClient.getReferenceLaps(
                sessionMetadata.trackName,
                sessionMetadata.trackLayout || '',
                sessionMetadata.carClass,
                activeProfileId || 'guest'
            ).then(res => {
                setLaps(res.laps);
                setIsLoading(false);
            }).catch(err => {
                console.error("ReferenceLapBrowser: Fetch failed", err);
                setIsLoading(false);
            });
        }
    }, [sessionMetadata, activeProfileId]);

    const groupedData = useMemo(() => {
        const filtered = laps.filter(l => 
            l.sessionName.toLowerCase().includes(search.toLowerCase()) ||
            l.driver.toLowerCase().includes(search.toLowerCase()) ||
            (l.carModel || '').toLowerCase().includes(search.toLowerCase())
        );

        const groups: Record<string, { 
            sessionId: string; 
            sessionName: string; 
            date: number; 
            driver: string; 
            carModel?: string;
            stintCount?: number;
            totalLaps?: number;
            fastestValidDuration: number;
            stints: Record<number, ReferenceLap[]> 
        }> = {};

        filtered.forEach(lap => {
            if (!groups[lap.sessionId]) {
                groups[lap.sessionId] = {
                    sessionId: lap.sessionId,
                    sessionName: lap.sessionName,
                    date: lap.date,
                    driver: lap.driver,
                    carModel: lap.carModel,
                    stintCount: lap.stintCount,
                    totalLaps: lap.totalLaps,
                    fastestValidDuration: Infinity,
                    stints: {}
                };
            }
            if (!groups[lap.sessionId].stints[lap.stint]) {
                groups[lap.sessionId].stints[lap.stint] = [];
            }
            groups[lap.sessionId].stints[lap.stint].push(lap);
            
            if (lap.isValid && lap.duration < groups[lap.sessionId].fastestValidDuration) {
                groups[lap.sessionId].fastestValidDuration = lap.duration;
            }
        });

        return Object.values(groups).sort((a, b) => b.date - a.date);
    }, [laps, search]);

    const toggleSession = (id: string) => {
        setExpandedSession(prev => prev === id ? null : id);
        setExpandedStint(null);
    };

    const toggleStint = (sessionId: string, stint: number) => {
        const key = `${sessionId}-${stint}`;
        setExpandedStint(prev => prev === key ? null : key);
    };

    const formatDuration = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = (s % 60).toFixed(3);
        return `${mins}:${secs.padStart(6, '0')}`;
    };

    const formatDate = (ts: number) => {
        return new Date(ts * 1000).toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 z-[3100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-gray-950 border border-white/10 rounded-3xl w-full max-w-2xl flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden glass-container ring-1 ring-white/10">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                            <History size={24} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-wider">Reference Lap Browser</h2>
                            <p className="text-[10px] text-blue-400/60 mt-1 uppercase tracking-[0.2em] font-black flex items-center gap-2">
                                <span className="text-blue-400">{sessionMetadata?.trackName}</span>
                                <span className="text-gray-700">/</span>
                                <span className="text-gray-400">{sessionMetadata?.carClass}</span>
                            </p>
                        </div>
                    </div>
                    <Tooltip text="CLOSE BROWSER" position="left">
                        <button
                            onClick={onClose}
                            className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all glass-container rounded-full border border-white/10 group/close"
                        >
                            <X size={20} className="group-hover/close:rotate-90 transition-transform duration-300" />
                        </button>
                    </Tooltip>
                </div>

                <div className="p-6 pb-2 relative z-10">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find session by name, driver or car..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Nested List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative z-10">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-blue-400" size={32} />
                            <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Scanning Cloud Storage...</p>
                        </div>
                    ) : groupedData.length > 0 ? (
                        groupedData.map((session) => {
                            const isExpanded = expandedSession === session.sessionId;
                            return (
                                <div key={session.sessionId} className="flex flex-col gap-1">
                                    {/* Session Header */}
                                    <button
                                        onClick={() => toggleSession(session.sessionId)}
                                        className={`w-full flex flex-col p-4 rounded-2xl border transition-all glass-container-flat relative group ${isExpanded ? 'bg-blue-600/5 border-blue-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                                        onMouseMove={handleGlassMouseMove}
                                    >
                                        <div className="glass-content w-full">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-3">
                                                    <Calendar size={14} className="text-gray-500" />
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{formatDate(session.date)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black py-0.5 px-2 bg-white/5 rounded border border-white/10 text-gray-400 uppercase tracking-tighter italic">{session.driver}</span>
                                                    {isExpanded ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-gray-600" />}
                                                </div>
                                            </div>
                                            <div className="text-sm font-black text-white truncate max-w-[90%] uppercase tracking-tight group-hover:text-blue-400 transition-colors text-left">
                                                {session.sessionName}
                                            </div>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center gap-2 py-0.5 px-2 bg-blue-500/5 rounded-lg border border-blue-500/20 group/car">
                                                    <img 
                                                        src={getBrandLogoPath(session.carModel || '')} 
                                                        className="w-5 h-5 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover/car:scale-110 transition-transform" 
                                                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                    />
                                                    <span className="text-[11px] font-black text-blue-400 uppercase tracking-tight">{session.carModel}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-gray-300">{session.stintCount} Stints</span>
                                                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-gray-300">{session.totalLaps} Laps</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Stints Container */}
                                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                                        <div className="min-h-0 flex flex-col gap-1.5 pl-6 mt-1.5 border-l border-white/5 ml-4">
                                            {Object.entries(session.stints).sort((a, b) => Number(a[0]) - Number(b[0])).map(([stintNum, laps]) => {
                                                const stintKey = `${session.sessionId}-${stintNum}`;
                                                const isStintExpanded = expandedStint === stintKey;
                                                return (
                                                    <div key={stintKey} className="flex flex-col gap-1">
                                                        <button
                                                            onClick={() => toggleStint(session.sessionId, Number(stintNum))}
                                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all text-sm font-black uppercase tracking-widest glass-container-flat ${isStintExpanded ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-gray-400 hover:text-gray-200 border-transparent hover:bg-white/5'}`}
                                                            onMouseMove={handleGlassMouseMove}
                                                        >
                                                            <div className="glass-content flex items-center gap-3">
                                                                <MapPin size={14} className={isStintExpanded ? 'text-blue-400' : 'text-gray-500'} />
                                                                <span>Stint {stintNum}</span>
                                                                <span className="text-[10px] opacity-60 lowercase">({laps.length} laps)</span>
                                                            </div>
                                                            <div className="glass-content">
                                                                {isStintExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                            </div>
                                                        </button>

                                                        {/* Laps List */}
                                                        <div className={`grid transition-all duration-300 ease-in-out ${isStintExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                                                            <div className="min-h-0 grid grid-cols-2 gap-2 pl-4 mt-2">
                                                                {laps.sort((a, b) => a.lap - b.lap).map((lap) => {
                                                                    const isCurrent = lap.sessionId === currentSessionId && lap.lap === selectedLapIdx;
                                                                    const isReference = (referenceLap && lap.sessionId === referenceLap.sessionId && lap.lap === referenceLap.lap) || 
                                                                                        (!referenceLap && lap.sessionId === currentSessionId && lap.lap === referenceLapIdx);
                                                                    
                                                                    const isFastest = lap.isValid && lap.duration === session.fastestValidDuration;
                                                                    const colorClass = !lap.isValid 
                                                                        ? 'text-red-500' 
                                                                        : isFastest 
                                                                            ? 'text-purple-400 font-black' 
                                                                            : 'text-gray-100 group-hover:text-white';

                                                                    const borderClass = isCurrent 
                                                                        ? 'border-blue-500/50 bg-blue-500/10' 
                                                                        : isReference 
                                                                            ? 'border-orange-500/50 bg-orange-500/10' 
                                                                            : 'border-white/10 hover:border-blue-500/30';

                                                                    return (
                                                                        <button
                                                                            key={`${lap.sessionId}-${lap.lap}`}
                                                                            onClick={() => {
                                                                                selectReferenceLap(lap);
                                                                                onClose();
                                                                            }}
                                                                            className={`w-full group p-3 rounded-xl border transition-all flex items-center justify-between glass-container-flat ${borderClass}`}
                                                                            onMouseMove={handleGlassMouseMove}
                                                                        >
                                                                            <div className="glass-content flex items-center gap-3">
                                                                                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-[13px] font-black transition-all ${
                                                                                    isCurrent ? 'bg-blue-500/30 border-blue-400 text-blue-200' :
                                                                                    isReference ? 'bg-orange-500/30 border-orange-400 text-orange-200' :
                                                                                    !lap.isValid ? 'bg-red-500/10 text-red-600 border-red-900/50' : 
                                                                                    isFastest ? 'bg-purple-500/10 text-purple-400 border-purple-400/50' : 
                                                                                    'bg-white/5 text-gray-300 border-white/20'
                                                                                }`}>
                                                                                    {lap.lap}
                                                                                </div>
                                                                                <div className="flex flex-col items-start">
                                                                                    <span className={`text-[13px] font-mono font-black transition-colors ${colorClass}`}>
                                                                                        {formatDuration(lap.duration)}
                                                                                        {lap.fuelUsed !== undefined && lap.fuelUsed > 0 && (
                                                                                            <span className="ml-2 text-[10px] text-gray-500 font-bold opacity-70">
                                                                                                [{lap.fuelUsed.toFixed(1)}L]
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                    <div className="flex gap-1.5 mt-0.5">
                                                                                        {isCurrent && <span className="text-[7px] text-blue-300 bg-blue-900/40 px-1 py-0.5 rounded-sm font-black uppercase tracking-[0.1em]">Current</span>}
                                                                                        {isReference && <span className="text-[7px] text-orange-300 bg-orange-900/40 px-1 py-0.5 rounded-sm font-black uppercase tracking-[0.1em]">Reference</span>}
                                                                                        {isFastest && <span className="text-[7px] text-purple-400 font-black uppercase tracking-[0.1em]">Fastest</span>}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                            <Search size={48} className="text-gray-700" />
                            <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px]">No compatible laps found</p>
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-white/5 border-t border-white/5 text-center relative z-10">
                    <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Global Telemetry Network &bull; Compatible Filters Applied</p>
                </div>
            </div>
        </div>
    );
};
