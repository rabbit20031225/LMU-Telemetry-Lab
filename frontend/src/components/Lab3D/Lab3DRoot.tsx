import React, { useState, useEffect } from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { TrackMap3D } from '../TrackMap3D';
import { FileManager } from '../FileManager';
import {
    ChevronLeft,
    Layers,
    Box,
    Activity,
    Database,
    Maximize2,
    Settings as SettingsIcon,
    ArrowLeft,
    FolderOpen,
    Loader2
} from 'lucide-react';
import { handleGlassMouseMove } from '../../utils/glassEffect';

export const Lab3DRoot = () => {
    const currentSessionId = useTelemetryStore(state => state.currentSessionId);
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
    const laps = useTelemetryStore(state => state.laps);
    const selectedLapIdx = useTelemetryStore(state => state.selectedLapIdx);
    const selectedStint = useTelemetryStore(state => state.selectedStint);
    const selectLap = useTelemetryStore(state => state.selectLap);
    const fetchStint = useTelemetryStore(state => state.fetchStint);
    const fetchSessions = useTelemetryStore(state => state.fetchSessions);
    const fetchProfiles = useTelemetryStore(state => state.fetchProfiles);
    const activeProfileId = useTelemetryStore(state => state.activeProfileId);
    const isLoading = useTelemetryStore(state => state.isLoading);

    const referenceLapIdx = useTelemetryStore(state => state.referenceLapIdx);
    const setReferenceLap = useTelemetryStore(state => state.setReferenceLap);

    const [showOverlay, setShowOverlay] = useState(true);
    const [showFileManager, setShowFileManager] = useState(false);
    const [selectionMode, setSelectionMode] = useState<'main' | 'reference'>('main');

    // Get unique stints for the current session
    const stints = Array.from(new Set(laps.map(l => l.stint || 1))).sort((a, b) => a - b);
    const currentStintLaps = laps.filter(l => (l.stint || 1) === (selectedStint || 1));

    // 1. Initial fetch of profiles
    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    // 2. Fetch sessions once activeProfileId is available
    useEffect(() => {
        if (activeProfileId) {
            fetchSessions();
        }
    }, [activeProfileId, fetchSessions]);

    // 回到主導覽或是重整頁面（移除 mode 參數）
    const exitLab = () => {
        window.location.search = '';
    };

    return (
        <div className="fixed inset-0 bg-[#050507] text-white flex flex-col font-sans overflow-hidden">
            {/* Header / Navigation */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={exitLab}
                        className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="h-4 w-[1px] bg-white/10 mx-2" />
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Box size={18} className="text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest text-white">3D Elevation Lab</h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Experimental Environment • v1.0 Alpha</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {sessionMetadata && (
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-[10px] font-black text-blue-500 uppercase">{sessionMetadata.trackName}</span>
                            <span className="text-[9px] font-bold text-gray-500 uppercase">{sessionMetadata.modelName}</span>
                        </div>
                    )}
                    <button
                        onClick={() => setShowFileManager(!showFileManager)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${showFileManager ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                    >
                        <FolderOpen size={14} />
                        <span>{currentSessionId ? 'Change Session' : 'Select Session'}</span>
                    </button>
                    <button
                        onClick={() => setShowOverlay(!showOverlay)}
                        className={`p-2 rounded-xl transition-all ${showOverlay ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        <SettingsIcon size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative">
                {/* The 3D Component itself */}
                <div className="absolute inset-0 z-0">
                    <TrackMap3D />
                </div>

                {/* Selective Overlay UI */}
                {showOverlay && (
                    <div className="absolute left-6 top-6 bottom-6 w-80 flex flex-col gap-4 pointer-events-none z-10">
                        {/* Status Card - Now at Bottom Left */}
                        <div
                            className="pointer-events-auto glass-container-flat p-5 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-left-4 duration-500 mt-auto"
                            onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Database size={12} className="text-gray-500" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Selector</span>
                                </div>
                                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                                    <button 
                                        onClick={() => setSelectionMode('main')}
                                        className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${selectionMode === 'main' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        MAIN
                                    </button>
                                    <button 
                                        onClick={() => setSelectionMode('reference')}
                                        className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${selectionMode === 'reference' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        REF
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-gray-500 uppercase mb-1 block">Active Session</label>
                                    <div className="text-xs font-bold text-white truncate">
                                        {currentSessionId || 'No active session'}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[9px] font-black text-gray-500 uppercase block">
                                            {selectionMode === 'main' ? 'Quick Lap Select' : 'Reference Lap Select'}
                                        </label>
                                        <div className={`text-[9px] font-black uppercase ${selectionMode === 'main' ? 'text-blue-500' : 'text-amber-500'}`}>
                                            Stint {selectedStint || 1}
                                        </div>
                                    </div>

                                    {/* Stint Selector - Only show if > 1 stint */}
                                    {stints.length > 1 && (
                                        <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-white/5">
                                            {stints.map(s => {
                                                const stintLaps = laps.filter(l => (l.stint || 1) === s);
                                                const isLast = stints.length > 0 && s === stints[stints.length - 1];
                                                const isSingleInvalid = stintLaps.length === 1 && (!stintLaps[0].isValid || (stintLaps[0].duration > 0 && stintLaps[0].duration < 5.0));
                                                const isNA = isLast && isSingleInvalid;

                                                return (
                                                    <button
                                                        key={s}
                                                        onClick={() => fetchStint(s)}
                                                        className={`px-2 py-1 rounded-md text-[9px] font-black transition-all ${selectedStint === s
                                                            ? (isNA ? 'bg-red-900/40 text-red-500 border border-red-500/30' : 'bg-white/10 text-white ring-1 ring-white/20')
                                                            : (isNA ? 'bg-white/5 text-gray-700 cursor-not-allowed opacity-40' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300')
                                                            }`}
                                                        title={isNA ? "This stint contains only incomplete end-session data" : `Stint ${s}`}
                                                    >
                                                        STINT {s} {isNA && '(N/A)'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-5 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                        {currentStintLaps.map((l) => {
                                            // Robust filtering for incomplete late-session stints as requested
                                            const isLastStint = stints.length > 0 && selectedStint === stints[stints.length - 1];
                                            const isOnlyLap = currentStintLaps.length === 1;
                                            const isIncomplete = !l.isValid || (l.duration > 0 && l.duration < 5.0);
                                            const isUnavailable = isLastStint && isOnlyLap && isIncomplete;

                                            const isSelected = selectedLapIdx === l.lap;
                                            const isRef = referenceLapIdx === l.lap;

                                            return (
                                                <button
                                                    key={l.lap}
                                                    disabled={isUnavailable}
                                                    onClick={() => !isUnavailable && (
                                                        selectionMode === 'main' ? selectLap(l.lap) : setReferenceLap(isRef ? null : l.lap)
                                                    )}
                                                    className={`h-8 flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${isUnavailable
                                                            ? 'bg-transparent border border-white/5 text-gray-700 cursor-not-allowed'
                                                            : (selectionMode === 'main'
                                                                ? (isSelected ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : (isRef ? 'ring-1 ring-amber-500 text-amber-500' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'))
                                                                : (isRef ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]' : (isSelected ? 'ring-1 ring-blue-500 text-blue-500' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'))
                                                              )
                                                        }`}
                                                    title={isUnavailable ? "Incomplete stint data - Rendering unavailable" : `Lap ${l.lap}`}
                                                >
                                                    {isUnavailable ? 'N/A' : l.lap}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Processing/Loading Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-auto animate-in fade-in duration-300">
                        <div className="glass-container-flat px-8 py-6 rounded-3xl border border-white/10 flex flex-col items-center gap-4 shadow-2xl">
                            <div className="relative">
                                <Loader2 size={32} className="text-blue-500 animate-spin" />
                                <div className="absolute inset-0 blur-lg bg-blue-500/20 animate-pulse" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Generating 3D Mesh</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Processing Elevation Data</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* File Manager Overlay */}
                {(showFileManager || !currentSessionId) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-40 animate-in fade-in duration-300">
                        <div className="w-full max-w-xl bg-[#111115] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative" style={{ height: '80vh', maxHeight: '80vh' }}>
                            {currentSessionId && (
                                <button
                                    onClick={() => setShowFileManager(false)}
                                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-xl text-gray-500 hover:text-white z-50 transition-all"
                                >
                                    <ChevronLeft size={20} className="rotate-90" />
                                </button>
                            )}
                            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                                <FileManager />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
