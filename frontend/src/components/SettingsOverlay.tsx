import React, { useState } from 'react';
import { X, Gauge, Thermometer, Eye, EyeOff, Layout, GripVertical, RotateCcw, Move3d, Save, Compass, Activity, Settings as SettingsIcon } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';
import { handleGlassMouseMove } from '../utils/glassEffect';
import packageJson from '../../package.json';

const SteeringWheelIcon = ({ size = 16, className = "" }) => (
    <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 12v10" />
        <path d="M2 12h20" />
    </svg>
);

const SingleLapIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
        {/* Y-axis dots - Shifted up to create gap with X-axis line */}
        <rect x="2" y="1" width="3.5" height="4.5" rx="1.75" fill="currentColor" stroke="none" />
        <rect x="2" y="7.5" width="3.5" height="4.5" rx="1.75" fill="currentColor" stroke="none" />
        <rect x="2" y="14" width="3.5" height="4.5" rx="1.75" fill="currentColor" stroke="none" />
        {/* X-axis arrow - Clean, non-touching line */}
        <path d="M2.5 21.5h17" />
        <path d="M16 18.5l3.5 3-3.5 3" />
    </svg>
);

export const SettingsOverlay: React.FC = () => {
    const showSettings = useTelemetryStore(state => state.showSettings);
    const setShowSettings = useTelemetryStore(state => state.setShowSettings);
    const speedUnit = useTelemetryStore(state => state.speedUnit);
    const setSpeedUnit = useTelemetryStore(state => state.setSpeedUnit);
    const tempUnit = useTelemetryStore(state => state.tempUnit);
    const setTempUnit = useTelemetryStore(state => state.setTempUnit);
    const chartConfigs = useTelemetryStore(state => state.chartConfigs);
    const setChartConfigs = useTelemetryStore(state => state.setChartConfigs);
    const updateChartConfig = useTelemetryStore(state => state.updateChartConfig);
    const resetChartColors = useTelemetryStore(state => state.resetChartColors);
    const currentSessionId = useTelemetryStore(state => state.currentSessionId);
    const userWheelRotation = useTelemetryStore(state => state.userWheelRotation);
    const setUserWheelRotation = useTelemetryStore(state => state.setUserWheelRotation);
    const telemetryHistorySeconds = useTelemetryStore(state => state.telemetryHistorySeconds);
    const setTelemetryHistorySeconds = useTelemetryStore(state => state.setTelemetryHistorySeconds);
    const singleLapXAxisMode = useTelemetryStore(state => state.singleLapXAxisMode);
    const setSingleLapXAxisMode = useTelemetryStore(state => state.setSingleLapXAxisMode);

    const [tempRotation, setTempRotation] = useState<string>(userWheelRotation?.toString() ?? '');
    const [isSavingRotation, setIsSavingRotation] = useState(false);

    // Sync temp state with store whenever settings are opened
    React.useEffect(() => {
        if (showSettings) {
            setTempRotation(userWheelRotation?.toString() ?? '');
        }
    }, [showSettings, userWheelRotation]);

    // Drag-and-drop state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);

    const sorted = [...chartConfigs].sort((a, b) => a.order - b.order);

    const handleDragStart = (e: React.DragEvent, idx: number) => {
        setDraggedIndex(idx);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const pos = e.clientY < midY ? 'top' : 'bottom';
        
        setDragOverIndex(idx);
        setDropPosition(pos);
    };

    const handleDrop = (e: React.DragEvent, toIdx: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;

        const reordered = [...sorted];
        const [removed] = reordered.splice(draggedIndex, 1);
        
        let insertAt = toIdx;
        if (dropPosition === 'bottom' && draggedIndex > toIdx) insertAt = toIdx + 1;
        if (dropPosition === 'top' && draggedIndex < toIdx) insertAt = toIdx - 1;
        if (insertAt < 0) insertAt = 0;

        reordered.splice(insertAt, 0, removed);
        
        const newConfigs = reordered.map((c, i) => ({ ...c, order: i }));
        setChartConfigs(newConfigs);
        
        handleDragEnd();
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDropPosition(null);
    };

    // Helper to get dynamically displayed unit for a chart ID
    const getDisplayUnit = (config: any) => {
        if (config.id === 'Ground Speed') {
            return speedUnit === 'kmh' ? 'km/h' : 'mph';
        }
        if (config.id.toLowerCase().includes('temp')) {
            return tempUnit === 'c' ? '°C' : '°F';
        }
        return config.unit || 'No Unit';
    };

    if (!showSettings) return null;

    return (
        <div className="fixed inset-0 z-[3200] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-gray-950/40 backdrop-blur-xl animate-in fade-in duration-500"
                onClick={() => setShowSettings(false)}
            />

            <div
                className="glass-container w-full max-w-xl bg-gray-900/60 border border-white/20 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] animate-in zoom-in-95 fade-in duration-300 relative flex flex-col"
                onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
                style={{ height: '85vh', overflow: 'hidden' }}
            >
                {/* Fixed Header */}
                <div className="glass-content p-8 flex-shrink-0 flex items-center justify-between border-b border-white/5 relative z-20">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black italic uppercase tracking-wider text-white">Application Settings</h2>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Preferences & UI Tuning</span>
                    </div>
                    <button
                        onClick={() => setShowSettings(false)}
                        className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all glass-container rounded-full border border-white/10 group/close"
                    >
                        <X size={20} className="group-hover/close:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="glass-content p-10 pt-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8 relative z-10">
                    {/* Units Section */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Speed Unit */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Gauge size={16} className="text-blue-400" />
                                <span className="text-xs font-black uppercase tracking-widest">Speed</span>
                            </div>
                            <div className="glass-container-flat bg-black/30 p-1.5 rounded-2xl flex border border-white/5 relative">
                                {/* Sliding Indicator */}
                                <div 
                                    className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/10 backdrop-blur-md rounded-xl border border-white/10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-inner"
                                    style={{ left: speedUnit === 'kmh' ? '6px' : 'calc(50%)' }}
                                />
                                {(['kmh', 'mph'] as const).map(u => (
                                    <button
                                        key={u}
                                        onClick={() => setSpeedUnit(u)}
                                        className={`relative z-10 flex-1 py-3 text-[11px] font-black uppercase transition-all rounded-xl ${speedUnit === u ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {u === 'kmh' ? 'km/h' : 'mph'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Temp Unit */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Thermometer size={16} className="text-blue-400" />
                                <span className="text-xs font-black uppercase tracking-widest">Temperature</span>
                            </div>
                            <div className="glass-container-flat bg-black/30 p-1.5 rounded-2xl flex border border-white/5 relative">
                                {/* Sliding Indicator */}
                                <div 
                                    className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/10 backdrop-blur-md rounded-xl border border-white/10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-inner"
                                    style={{ left: tempUnit === 'c' ? '6px' : 'calc(50%)' }}
                                />
                                {(['c', 'f'] as const).map(u => (
                                    <button
                                        key={u}
                                        onClick={() => setTempUnit(u)}
                                        className={`relative z-10 flex-1 py-3 text-[11px] font-black uppercase transition-all rounded-xl ${tempUnit === u ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        °{u.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Analysis Preferences - Half Width & Vertical Layout */}
                    <div className="flex flex-col gap-4 w-1/2">
                        <div className="flex items-center gap-2 text-gray-400 px-2">
                            <SingleLapIcon size={16} className="text-blue-400" />
                            <span className="text-xs font-black uppercase tracking-widest">Chart X-Axis Mode</span>
                        </div>
                        
                        <div 
                            className="glass-container bg-black/30 rounded-[2rem] border border-white/5 p-4 flex flex-col items-center gap-1"
                            onMouseMove={(e) => handleGlassMouseMove(e, 0.1)}
                        >
                            <div className="glass-content glass-container-flat bg-black/50 p-1.5 rounded-2xl flex border border-white/5 relative w-full">
                                {/* Sliding Indicator */}
                                <div 
                                    className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-blue-500/20 backdrop-blur-md rounded-xl border border-blue-500/30 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                    style={{ left: singleLapXAxisMode === 'distance' ? '6px' : 'calc(50%)' }}
                                />
                                {(['distance', 'time'] as const).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setSingleLapXAxisMode(m)}
                                        className={`relative z-10 flex-1 py-3 text-[11px] font-black uppercase transition-all rounded-xl ${singleLapXAxisMode === m ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-2 opacity-40 w-full px-1">
                                <div className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-tight">
                                    Preferred axis when no reference lap is selected
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2 text-gray-400">
                                <SteeringWheelIcon size={17} className="text-blue-400" />
                                <span className="text-xs font-black uppercase tracking-widest">Wheel Base Rotation (Degrees)</span>
                            </div>
                            {userWheelRotation === null ? (
                                <span className="text-[8px] font-black bg-orange-500/10 text-orange-400/70 px-2 py-0.5 rounded-lg border border-orange-500/20 uppercase tracking-widest">Auto (Metadata)</span>
                            ) : (
                                <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg border border-blue-500/20 uppercase tracking-widest">Manual Override</span>
                            )}
                        </div>

                        <div 
                            className="glass-container bg-black/30 rounded-[2rem] border border-white/5 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] p-5"
                            onMouseMove={(e) => handleGlassMouseMove(e, 0.1)}
                            style={{ '--glass-hover-scale': '1.015', '--glass-content-scale': '1.01' } as any}
                        >
                            <div className="glass-content flex items-center gap-3 w-full">
                                <div className="relative flex-[2] w-0">
                                    <input
                                        type="number"
                                        value={tempRotation}
                                        onChange={(e) => setTempRotation(e.target.value)}
                                        placeholder={userWheelRotation?.toString() ?? "900"}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 px-5 text-white font-mono font-bold text-lg focus:outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-gray-700/30"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-600 uppercase tracking-widest pointer-events-none">DEG</div>
                                </div>

                                <button
                                    onClick={() => {
                                        const val = tempRotation === '' ? null : parseFloat(tempRotation);
                                        setIsSavingRotation(true);
                                        setUserWheelRotation(val);
                                        setTimeout(() => setIsSavingRotation(false), 800);
                                    }}
                                    className={`flex-1 h-[52px] flex items-center justify-center gap-2 rounded-2xl border transition-all ${isSavingRotation ? 'bg-green-500/40 border-green-500 text-white scale-95' : 'bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-600/40 hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-900/10'}`}
                                    onMouseMove={(e) => handleGlassMouseMove(e, 0.15)}
                                >
                                    <Save size={16} className={isSavingRotation ? 'animate-bounce' : ''} />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                                        {isSavingRotation ? 'Saved' : 'Save'}
                                    </span>
                                </button>

                                <button
                                    onClick={() => {
                                        setTempRotation('');
                                        setUserWheelRotation(null);
                                    }}
                                    className="flex-1 h-[52px] text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 border border-white/5 rounded-2xl transition-all glass-container-flat"
                                    onMouseMove={(e) => handleGlassMouseMove(e, 0.1)}
                                >
                                    Default
                                </button>
                            </div>
                            <div className="mt-3 px-2 flex items-center gap-2 opacity-40">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                    Forces 1:1 rotation synchronization with your physical hardware
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Telemetry History Section - Split Layout */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 px-2 text-gray-400">
                            <Activity size={16} className="text-blue-400" />
                            <span className="text-xs font-black uppercase tracking-widest">Telemetry Overlap</span>
                        </div>

                        <div 
                            className="glass-container bg-black/30 rounded-[2.5rem] border border-white/5 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] p-5 overflow-hidden"
                            onMouseMove={(e) => handleGlassMouseMove(e, 0.1)}
                            style={{ '--glass-hover-scale': '1.015', '--glass-content-scale': '1.01' } as any}
                        >
                            <div className="glass-content grid grid-cols-[1fr_1.2fr] gap-6 items-center">
                                {/* Left: Controls */}
                                <div className="flex flex-col gap-5 border-r border-white/5 pr-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Window Size</span>
                                        <span className="text-[13px] font-mono font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                            {Number(telemetryHistorySeconds).toFixed(1)}<span className="text-[9px] ml-0.5 opacity-60">s</span>
                                        </span>
                                    </div>
                                    
                                    <div className="relative h-6 flex items-center">
                                        <input
                                            type="range"
                                            min="1.0"
                                            max="5.0"
                                            step="0.1"
                                            value={telemetryHistorySeconds}
                                            onChange={(e) => setTelemetryHistorySeconds(parseFloat(e.target.value))}
                                            className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                                        />
                                    </div>
                                    
                                    <div className="flex justify-between px-1 opacity-40">
                                        <span className="text-[8px] font-black text-white uppercase tracking-tighter">1.0s</span>
                                        <span className="text-[8px] font-black text-white uppercase tracking-tighter">5.0s</span>
                                    </div>
                                </div>

                                {/* Right: Visual Hint */}
                                <div className="relative group/hint">
                                    <div className="absolute -inset-2 bg-blue-500/5 rounded-2xl blur-xl opacity-0 group-hover/hint:opacity-100 transition-opacity" />
                                    <div className="relative flex flex-col gap-3">
                                        <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-xl relative h-16 w-full">
                                            <img 
                                                src="/live_map_telemetry.png" 
                                                alt="Telemetry Hint" 
                                                className="w-full h-full object-contain opacity-60 grayscale group-hover/hint:grayscale-0 group-hover/hint:opacity-100 transition-all duration-500"
                                            />
                                            {/* Illustrative Overlay for Hint - Precision Aligned */}
                                            <div className="absolute inset-y-0 left-[11.5%] right-[46%] border-2 border-blue-500/50 bg-blue-500/10 rounded-lg animate-pulse" />
                                        </div>
                                        <div className="flex items-center gap-2 px-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-relaxed">
                                                Controls the history duration of sparklines shown above
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart Layout Section */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Layout size={16} className="text-blue-400" />
                                <span className="text-xs font-black uppercase tracking-widest">Chart Layout & Colors</span>
                            </div>
                            
                            <button
                                onClick={resetChartColors}
                                className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all rounded-xl flex items-center gap-2 px-3 border border-white/5 glass-container-flat"
                            >
                                <RotateCcw size={14} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Reset Colors</span>
                            </button>
                        </div>

                        {/* Chart List Container */}
                        <div 
                            className="glass-container bg-black/30 rounded-[2.5rem] border border-white/5 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] p-4"
                            onMouseMove={(e) => handleGlassMouseMove(e, 0.1)}
                            style={{ 
                                '--glass-hover-scale': '1.005',
                                overflow: 'visible' 
                            } as any}
                        >
                            <div className="glass-content flex flex-col gap-3">
                                {sorted.map((config, idx) => {
                                    const displayUnit = getDisplayUnit(config);
                                    return (
                                        <div 
                                            key={config.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, idx)}
                                            onDragOver={(e) => handleDragOver(e, idx)}
                                            onDrop={(e) => handleDrop(e, idx)}
                                            onDragEnd={handleDragEnd}
                                            className={`relative group/item glass-container rounded-[1.5rem] border flex flex-col transition-all duration-300
                                                ${draggedIndex === idx ? 'opacity-40 grayscale scale-95' : 'opacity-100'}
                                                ${dragOverIndex === idx ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                                            onMouseMove={handleGlassMouseMove}
                                            style={{ 
                                                backgroundColor: dragOverIndex === idx ? undefined : `${config.color}15`,
                                                borderColor: dragOverIndex === idx ? undefined : `${config.color}35`,
                                                boxShadow: dragOverIndex === idx ? undefined : `0 4px 15px -3px ${config.color}15`,
                                                '--glass-hover-scale': '1.015'
                                            } as any}
                                        >
                                            {dragOverIndex === idx && dropPosition === 'top' && (
                                                <div className="absolute top-[-6px] left-0 right-0 h-1 bg-blue-500 rounded-full animate-pulse z-[60]" />
                                            )}

                                            <div className="glass-content flex items-center p-4 gap-4">
                                                <div className="cursor-grab active:cursor-grabbing text-gray-500 transition-colors" style={{ color: `${config.color}80` }}>
                                                    <GripVertical size={20} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="font-black tracking-tight text-xs text-white uppercase truncate group-hover/item:translate-x-1 transition-transform">
                                                        {config.alias || config.id}
                                                    </div>
                                                    <div 
                                                        key={`${config.id}-${displayUnit}`}
                                                        className="text-[9px] font-bold uppercase tracking-widest mt-0.5 animate-in fade-in slide-in-from-left-1 duration-300"
                                                        style={{ color: `${config.color}cc` }}
                                                    >
                                                        {displayUnit}
                                                    </div>
                                                </div>

                                                <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/10 group-hover/item:border-white/30 transition-all flex-shrink-0 shadow-lg" style={{ boxShadow: `0 0 10px ${config.color}40` }}>
                                                    <input
                                                        type="color"
                                                        value={config.color}
                                                        onChange={(e) => updateChartConfig(config.id, { color: e.target.value })}
                                                        className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer bg-transparent border-none appearance-none"
                                                    />
                                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: config.color }} />
                                                </div>

                                                <button
                                                    onClick={() => updateChartConfig(config.id, { visible: !config.visible })}
                                                    className={`p-2.5 rounded-xl transition-all ${config.visible ? 'text-white' : 'text-gray-700 bg-white/5 border border-white/10'}`}
                                                    style={{ 
                                                        backgroundColor: config.visible ? `${config.color}40` : undefined,
                                                        border: config.visible ? `1px solid ${config.color}60` : undefined,
                                                        boxShadow: config.visible ? `0 0 15px ${config.color}20` : undefined
                                                    }}
                                                >
                                                    {config.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                                                </button>
                                            </div>

                                            {dragOverIndex === idx && dropPosition === 'bottom' && (
                                                <div className="absolute bottom-[-6px] left-0 right-0 h-1 bg-blue-500 rounded-full animate-pulse z-[60]" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pb-12 flex flex-col items-center gap-3">
                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em]">DuckDB Investigation Tool v{packageJson.version}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
