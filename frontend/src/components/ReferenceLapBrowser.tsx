import React, { useState, useEffect, useMemo } from 'react';
import { useTelemetryStore, findMappedCarModel } from '../store/telemetryStore';
import { apiClient } from '../api/client';
import type { ReferenceLap } from '../types';
import { Search, History, MapPin, X, Loader2, Calendar, ChevronRight, ChevronDown, Globe, User, ArrowUpDown, Zap, Clock } from 'lucide-react';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { Tooltip } from './ui/Tooltip';
import { getBrandLogoPath } from '../utils/carHelpers';
import { getCountryFlagPath, getCountryFromTrackName } from '../utils/trackHelpers';
import { extractLapTimeSeconds } from './CommunitySharesPanel';

interface ReferenceLapBrowserProps {
    onClose: () => void;
}

export const ReferenceLapBrowser: React.FC<ReferenceLapBrowserProps> = ({ onClose }) => {
    const { sessionMetadata, activeProfileId, currentSessionId, selectedLapIdx, referenceLap, referenceLapIdx, selectReferenceLap, customCarMappings, sessions } = useTelemetryStore();
    const [laps, setLaps] = useState<ReferenceLap[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [expandedStint, setExpandedStint] = useState<string | null>(null);

    // Community Shares State
    const [tab, setTab] = useState<'local' | 'community'>('local');
    const [communityShares, setCommunityShares] = useState<any[]>([]);
    const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
    const [expandedCommunityShareId, setExpandedCommunityShareId] = useState<string | null>(null);
    const [communityLapsMap, setCommunityLapsMap] = useState<Record<string, any[]>>({});
    const [loadingLapsId, setLoadingLapsId] = useState<string | null>(null);

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

    const getDiscordChannel = (carClass: string) => {
        const cls = (carClass || '').toLowerCase();
        if (cls.includes('gt3') || cls.includes('lmgt3')) {
            return 'lmgt3-telemetry-sharing';
        } else if (cls.includes('hyper') || cls.includes('lmh') || cls.includes('lmdh')) {
            return 'hypercar-telemetry-sharing';
        } else if (cls.includes('lmp3')) {
            return 'lmp3-telemetry-sharing';
        } else if (cls.includes('lmp2')) {
            return 'lmp2-telemetry-sharing';
        } else if (cls.includes('gte')) {
            return 'gte-telemetry-sharing';
        }
        return 'lmgt3-telemetry-sharing';
    };

    const isTrackCompatible = (currentTrack: string, shareTitle: string) => {
        const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const t1 = clean(currentTrack);
        const t2 = clean(shareTitle);
        
        if (t2.includes(t1)) return true;
        
        const aliases: Record<string, string[]> = {
            'interlagos': ['josecarlospace', 'josécarlospace', 'pace', 'interlagos'],
            'autodromojosecarlospace': ['interlagos', 'josecarlospace', 'pace'],
            'monza': ['monza'],
            'spa': ['spa', 'francorchamps'],
            'lemans': ['sarthe', 'lemans', 'le-mans'],
            'sebring': ['sebring'],
            'fuji': ['fuji'],
            'bahrain': ['sakhir', 'bahrain']
        };
        
        for (const [key, list] of Object.entries(aliases)) {
            const currentMatchesKey = t1.includes(key) || list.some(l => t1.includes(l));
            if (currentMatchesKey) {
                const shareMatchesKey = t2.includes(key) || list.some(l => t2.includes(l));
                if (shareMatchesKey) return true;
            }
        }
        return false;
    };

    useEffect(() => {
        if (sessionMetadata) {
            setIsLoadingCommunity(true);
            const targetChannel = getDiscordChannel(sessionMetadata.carClass);
            apiClient.listDiscordShares(targetChannel)
                .then(res => {
                    const filtered = (res.shares || []).filter((s: any) => 
                        isTrackCompatible(sessionMetadata.trackName, s.title)
                    );
                    setCommunityShares(filtered);
                    setIsLoadingCommunity(false);
                })
                .catch(err => {
                    console.error("Failed to load community shares in browser:", err);
                    setIsLoadingCommunity(false);
                });
        }
    }, [sessionMetadata]);

    const handleExpandCommunityShare = async (share: any) => {
        const threadId = share.thread_id;
        if (expandedCommunityShareId === threadId) {
            setExpandedCommunityShareId(null);
            return;
        }
        
        setExpandedCommunityShareId(threadId);
        
        const virtualSessionId = `discord__${threadId}`;
        if (!communityLapsMap[virtualSessionId]) {
            setLoadingLapsId(threadId);
            try {
                const lapsData = await apiClient.getLaps(virtualSessionId, activeProfileId || 'guest');
                setCommunityLapsMap(prev => ({
                    ...prev,
                    [virtualSessionId]: lapsData.laps || []
                }));
            } catch (err) {
                console.error("Failed to load laps for community share:", err);
                alert("Failed to read laps from Discord telemetry file. The file might be corrupted or parsing failed.");
                setExpandedCommunityShareId(null);
            } finally {
                setLoadingLapsId(null);
            }
        }
    };

    const [communitySortBy, setCommunitySortBy] = useState<'newest' | 'fastest'>('fastest');

    const sortedAndFilteredCommunityShares = useMemo(() => {
        const list = communityShares.filter(s => 
            !s.locked && !s.thread_metadata?.locked && (
                s.title.toLowerCase().includes(search.toLowerCase()) ||
                s.author.display_name.toLowerCase().includes(search.toLowerCase()) ||
                (s.content || '').toLowerCase().includes(search.toLowerCase())
            )
        );

        if (communitySortBy === 'fastest') {
            list.sort((a, b) => {
                const timeA = extractLapTimeSeconds(a);
                const timeB = extractLapTimeSeconds(b);
                return timeA - timeB;
            });
        } else {
            list.sort((a, b) => (b.thread_id || '').localeCompare(a.thread_id || ''));
        }

        return list;
    }, [communityShares, search, communitySortBy]);

    const groupedData = useMemo(() => {
        const mappedLaps = laps.map(l => {
            // 透過 sessionId 回推原始車款名稱 (100% 前端防禦性即時連動)
            const matchedSession = sessions.find(s => s.id === l.sessionId);
            const rawCarName = matchedSession?.rawCarName || l.rawCarName;

            const key = rawCarName || l.carModel;
            const mappedCar = findMappedCarModel(key, customCarMappings);
            if (mappedCar) {
                return { ...l, carModel: mappedCar };
            }
            return l;
        });

        const filtered = mappedLaps.filter(l => 
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
    }, [laps, search, customCarMappings, sessions]);

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
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find session by name, driver or car..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex border-b border-white/5 px-6 gap-6 relative z-10">
                    <button
                        onClick={() => setTab('local')}
                        className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${tab === 'local' ? 'border-blue-400 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <History size={13} />
                        Local Laps ({groupedData.length})
                    </button>
                    <button
                        onClick={() => setTab('community')}
                        className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${tab === 'community' ? 'border-blue-400 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        <Globe size={13} />
                        Community Laps ({isLoadingCommunity && communityShares.length === 0 ? '...' : sortedAndFilteredCommunityShares.length})
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar relative z-10">
                    {tab === 'local' ? (
                        isLoading ? (
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
                                            <div className="min-h-0 flex flex-col gap-1.5 pl-6 mt-1.5 mb-2 border-l border-white/5 ml-4">
                                                {Object.entries(session.stints).sort((a, b) => Number(a[0]) - Number(b[0])).map(([stintNum, stintsLaps]) => {
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
                                                                    <span className="text-[10px] opacity-60 lowercase">({stintsLaps.length} laps)</span>
                                                                </div>
                                                                <div className="glass-content">
                                                                    {isStintExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                </div>
                                                            </button>

                                                            {/* Laps List */}
                                                            <div className={`grid transition-all duration-300 ease-in-out ${isStintExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                                                                <div className="min-h-0 grid grid-cols-2 gap-2 pl-4 mt-2 pb-2">
                                                                    {stintsLaps.sort((a, b) => a.lap - b.lap).map((lap) => {
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
                            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                                <History size={48} className="text-gray-600" />
                                <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">No compatible laps found</p>
                            </div>
                        )
                    ) : (
                        isLoadingCommunity ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-blue-400" size={32} />
                                <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Scanning Discord Forum...</p>
                            </div>
                        ) : sortedAndFilteredCommunityShares.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {/* Community Laps Sort Bar */}
                                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-xl mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                        <ArrowUpDown size={11} className="text-purple-400" /> Sort Community Laps
                                    </span>
                                    <div className="flex items-center gap-1 bg-[#16161c] p-1 rounded-lg border border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setCommunitySortBy('fastest')}
                                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all ${
                                                communitySortBy === 'fastest'
                                                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                                    : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            Fastest
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCommunitySortBy('newest')}
                                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                                                communitySortBy === 'newest'
                                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                    : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            Newest
                                        </button>
                                    </div>
                                </div>

                                {sortedAndFilteredCommunityShares.map((share) => {
                                const isExpanded = expandedCommunityShareId === share.thread_id;
                                const virtualSessionId = `discord__${share.thread_id}`;
                                const shareLaps = communityLapsMap[virtualSessionId] || [];
                                const isLoadingLaps = loadingLapsId === share.thread_id;

                                const fastestShareDuration = shareLaps.length > 0
                                    ? Math.min(...shareLaps.filter(l => l.isValid).map(l => l.duration))
                                    : Infinity;

                                return (
                                    <div key={share.thread_id} className="flex flex-col gap-1 mb-2">
                                        <button
                                            onClick={() => handleExpandCommunityShare(share)}
                                            className={`w-full flex flex-col p-4 rounded-2xl border transition-all glass-container-flat relative group ${isExpanded ? 'bg-blue-600/5 border-blue-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                                            onMouseMove={handleGlassMouseMove}
                                        >
                                            <div className="glass-content w-full">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        {share.author.avatar_url ? (
                                                            <img 
                                                                src={share.author.avatar_url} 
                                                                alt={share.author.display_name} 
                                                                className="w-4 h-4 rounded-full object-cover border border-white/10"
                                                            />
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                                <User size={8} className="text-gray-400" />
                                                            </div>
                                                        )}
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{share.author.display_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-gray-600" />}
                                                    </div>
                                                </div>
                                                {(() => {
                                                    const parts = (share.title || '').split('|').map((p: string) => p.trim()).filter(Boolean);
                                                    if (parts.length >= 2) {
                                                        const track = parts[0];
                                                        const car = parts[1];
                                                        const rest = parts.slice(2).join(' | ');

                                                        const country = getCountryFromTrackName(track) || getCountryFromTrackName(share.title);
                                                        const flagPath = getCountryFlagPath(country);
                                                        const brandLogo = getBrandLogoPath(car);

                                                        return (
                                                            <div className="flex flex-col gap-1 min-w-0 mt-1 text-left">
                                                                {/* Row 1: Track Name + Country Flag */}
                                                                <div className="flex items-start gap-2 min-w-0 flex-wrap">
                                                                    <span className="text-sm font-black text-white leading-tight tracking-tight break-words group-hover:text-blue-400 transition-colors">
                                                                        {track}
                                                                    </span>
                                                                    {flagPath && (
                                                                        <div className="w-4 h-2.5 rounded-[2px] overflow-hidden border border-black/40 shadow-sm flex-shrink-0 mt-1">
                                                                            <img src={flagPath} alt={country} className="w-full h-full object-cover" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Row 2: Car Model + Car Brand Logo */}
                                                                <div className="flex items-start gap-2 min-w-0 flex-wrap">
                                                                    <span className="text-xs font-bold text-gray-300 leading-tight tracking-tight break-words">
                                                                        {car}
                                                                    </span>
                                                                    {brandLogo && (
                                                                        <img src={brandLogo} alt={car} className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                                                                    )}
                                                                </div>

                                                                {/* Row 3: Duration | Version */}
                                                                {rest && (
                                                                    <div className="text-[11px] font-mono font-bold text-blue-400/90 leading-snug tracking-tight">
                                                                        {rest}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="text-sm font-black text-white truncate max-w-[90%] uppercase tracking-tight group-hover:text-blue-400 transition-colors text-left mt-1">
                                                            {share.title}
                                                        </div>
                                                    );
                                                })()}
                                                {share.content && (
                                                    <p className="text-[10px] text-gray-500 font-bold leading-normal text-left truncate mt-1 italic">
                                                        {share.content.replace(/🏎️|🏎|🏁|⏱️|⏱/g, '').trim()}
                                                    </p>
                                                )}
                                            </div>
                                        </button>

                                        {/* Expanded Laps List */}
                                        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                                            <div className="min-h-0 flex flex-col gap-2 pl-4 mt-2 pb-2 border-l border-white/5 ml-4">
                                                {isLoadingLaps ? (
                                                    <div className="flex items-center gap-2 py-4 text-gray-500">
                                                        <Loader2 className="animate-spin text-blue-400" size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Downloading telemetry database...</span>
                                                    </div>
                                                ) : shareLaps.length > 0 ? (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {shareLaps.sort((a, b) => a.lap - b.lap).map((lap) => {
                                                            const isReference = referenceLap && 
                                                                                referenceLap.sessionId === virtualSessionId && 
                                                                                referenceLap.lap === lap.lap;
                                                            
                                                            const isFastest = lap.isValid && lap.duration === fastestShareDuration;
                                                            const colorClass = !lap.isValid 
                                                                ? 'text-red-500' 
                                                                : isFastest 
                                                                    ? 'text-purple-400 font-black' 
                                                                    : 'text-gray-100 group-hover:text-white';
                                                            const borderClass = isReference 
                                                                ? 'border-orange-500/50 bg-orange-500/10' 
                                                                : 'border-white/10 hover:border-blue-500/30';

                                                            return (
                                                                <button
                                                                    key={`${virtualSessionId}-${lap.lap}`}
                                                                    onClick={() => {
                                                                            const refLapObj: ReferenceLap = {
                                                                                sessionId: virtualSessionId,
                                                                                sessionName: share.title,
                                                                                date: new Date(share.created_at).getTime() / 1000,
                                                                                lap: lap.lap,
                                                                                stint: lap.stint || 1,
                                                                                startTime: lap.startTime,
                                                                                endTime: lap.endTime,
                                                                                duration: lap.duration,
                                                                                isValid: lap.isValid,
                                                                                driver: share.author.display_name,
                                                                                sessionTime: share.title,
                                                                                carModel: share.title.split('|')[1]?.trim() || 'Community Car',
                                                                                rawCarName: share.title.split('|')[1]?.trim() || 'Community Car',
                                                                            };
                                                                        selectReferenceLap(refLapObj);
                                                                        onClose();
                                                                    }}
                                                                    className={`w-full group p-3 rounded-xl border transition-all flex items-center justify-between glass-container-flat ${borderClass}`}
                                                                    onMouseMove={handleGlassMouseMove}
                                                                >
                                                                    <div className="glass-content flex items-center gap-3">
                                                                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-[13px] font-black transition-all ${
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
                                                                            </span>
                                                                            <div className="flex gap-1.5 mt-0.5">
                                                                                {isReference && <span className="text-[7px] text-orange-300 bg-orange-900/40 px-1 py-0.5 rounded-sm font-black uppercase tracking-[0.1em]">Reference</span>}
                                                                                {isFastest && <span className="text-[7px] text-purple-400 font-black uppercase tracking-[0.1em]">Fastest</span>}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="py-2 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                                        No laps found in this telemetry file
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                                <Globe size={48} className="text-gray-600" />
                                <p className="text-gray-500 font-black uppercase tracking-[0.2em] text-[10px]">No compatible community shares found</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
