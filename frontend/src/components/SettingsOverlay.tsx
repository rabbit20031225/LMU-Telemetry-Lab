import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Gauge, Thermometer, Eye, EyeOff, Layout, GripVertical, RotateCcw, Move3d, Save, Compass, Activity, Settings as SettingsIcon, ArrowUpDown } from 'lucide-react';
import { useTelemetryStore, CATEGORY_CHART_CONFIGS, getCategoryTemplateConfigs } from '../store/telemetryStore';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { Tooltip } from './ui/Tooltip';
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

const CarMarkerIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M5 5l14 6-7 2-2 7L5 5z" />
    </svg>
);

const SuspensionIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        {/* Top eyelet ring */}
        <circle cx="17.5" cy="6.5" r="2.5" />
        
        {/* Damper main shaft */}
        <line x1="15.7" y1="8.3" x2="6.7" y2="17.3" strokeWidth="2.5" />
        
        {/* Coil springs (perpendicular segments along the shaft) */}
        <line x1="16" y1="11.5" x2="12.5" y2="8" strokeWidth="2.5" />
        <line x1="14" y1="13.5" x2="10.5" y2="10" strokeWidth="2.5" />
        <line x1="12" y1="15.5" x2="8.5" y2="12" strokeWidth="2.5" />
        <line x1="10" y1="17.5" x2="6.5" y2="14" strokeWidth="2.5" />
        
        {/* Bottom eyelet ring */}
        <circle cx="5.5" cy="18.5" r="1.5" />
    </svg>
);

const DiscordIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
    <svg
        viewBox="0 0 127.14 96.36"
        width={size}
        height={size}
        className={className}
        fill="currentColor"
    >
        <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5A50.32,50.32,0,0,0,30.33,78,75.48,75.48,0,0,0,96.8,78a50.32,50.32,0,0,0,2.15,2.5,68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129.87,48.12,123.6,25.26,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
    </svg>
);

export const SettingsOverlay: React.FC = () => {
    const showSettings = useTelemetryStore(state => state.showSettings);
    const setShowSettings = useTelemetryStore(state => state.setShowSettings);
    const speedUnit = useTelemetryStore(state => state.speedUnit);
    const setSpeedUnit = useTelemetryStore(state => state.setSpeedUnit);
    const tempUnit = useTelemetryStore(state => state.tempUnit);
    const setTempUnit = useTelemetryStore(state => state.setTempUnit);
    const invertSuspensionTravel = useTelemetryStore(state => state.invertSuspensionTravel);
    const setInvertSuspensionTravel = useTelemetryStore(state => state.setInvertSuspensionTravel);
    const suspensionTravelMode = useTelemetryStore(state => state.suspensionTravelMode);
    const setSuspensionTravelMode = useTelemetryStore(state => state.setSuspensionTravelMode);
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
    const mapMarkerType = useTelemetryStore(state => state.mapMarkerType);
    const setMapMarkerType = useTelemetryStore(state => state.setMapMarkerType);
    const setActiveChartCategory = useTelemetryStore(state => state.setActiveChartCategory);
    const activeChartCategory = useTelemetryStore(state => state.activeChartCategory);
    const telemetryData = useTelemetryStore(state => state.telemetryData);

    // View Modes for dynamic templates
    const tyresPressureViewMode = useTelemetryStore(state => state.tyresPressureViewMode);
    const suspensionViewMode = useTelemetryStore(state => state.suspensionViewMode);
    const thirdDeflectionViewMode = useTelemetryStore(state => state.thirdDeflectionViewMode);
    const rideHeightViewMode = useTelemetryStore(state => state.rideHeightViewMode);
    const slipRatioViewMode = useTelemetryStore(state => state.slipRatioViewMode);
    const handlingViewMode = useTelemetryStore(state => state.handlingViewMode);

    const [activeSettingsCategory, setActiveSettingsCategory] = useState('Driver');

    const [tempRotation, setTempRotation] = useState<string>(userWheelRotation?.toString() ?? '');
    const [isSavingRotation, setIsSavingRotation] = useState(false);

    // Sync temp state with store whenever settings are opened
    React.useEffect(() => {
        if (showSettings) {
            setTempRotation(userWheelRotation?.toString() ?? '');
            // Also sync active category from dashboard
            if (activeChartCategory) {
                setActiveSettingsCategory(activeChartCategory);
            }
        }
    }, [showSettings, userWheelRotation, activeChartCategory]);

    // Drag-and-drop state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);

    // Filter and Sort charts based on CATEGORY_CHART_CONFIGS (Master List)
    const displayCharts = useMemo(() => {
        const templateConfigs = getCategoryTemplateConfigs(activeSettingsCategory as any, {
            tyresPressureViewMode,
            suspensionViewMode,
            thirdDeflectionViewMode,
            rideHeightViewMode,
            slipRatioViewMode,
            handlingViewMode
        });
        const custom = JSON.parse(localStorage.getItem('custom_chart_settings') || '{}');

        return templateConfigs.map(c => {
            const key = `${c.id}-${c.wheelIndex ?? 'all'}`;
            const activeMatch = chartConfigs.find(ac => ac.id === c.id && ac.wheelIndex === c.wheelIndex);
            return {
                ...c,
                ...custom[key],
                order: activeMatch ? activeMatch.order : c.order,
                visible: custom[key]?.visible !== undefined ? custom[key].visible : (activeMatch ? activeMatch.visible : c.visible)
            };
        }).sort((a, b) => a.order - b.order);
    }, [
        activeSettingsCategory, chartConfigs,
        tyresPressureViewMode, suspensionViewMode, thirdDeflectionViewMode,
        rideHeightViewMode, slipRatioViewMode, handlingViewMode
    ]);

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

        const reordered = [...displayCharts];
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

    return (
        <div className="absolute inset-0 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.05, opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="glass-container w-full max-w-xl bg-gray-900/60 border border-white/20 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.6)] relative flex flex-col"
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

                    {/* Analysis Preferences - Dual Row */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Chart X-Axis Mode */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-gray-400 px-2">
                                <SingleLapIcon size={16} className="text-blue-400" />
                                <span className="text-xs font-black uppercase tracking-widest">Chart X-Axis</span>
                            </div>

                            <div
                                className="glass-container bg-black/30 rounded-[2rem] border border-white/5 p-4 flex flex-col items-center gap-1"
                                onMouseMove={(e) => handleGlassMouseMove(e, 0.1)}
                            >
                                <div className="glass-content glass-container-flat bg-black/50 p-1.5 rounded-2xl flex border border-white/5 relative w-full">
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
                                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest leading-tight mt-1 opacity-60">Single Lap Only</p>
                            </div>
                        </div>

                        {/* Map Marker Type - Premium Card Selection */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-gray-400 px-2">
                                <CarMarkerIcon size={16} className="text-blue-400" />
                                <span className="text-xs font-black uppercase tracking-widest">Map Marker Style</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {(['arrow', 'dot'] as const).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setMapMarkerType(m)}
                                        className={`group relative flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all duration-300 overflow-hidden ${mapMarkerType === m ? 'bg-blue-600/20 border-blue-500 shadow-[0_10px_30px_rgba(59,130,246,0.15)] scale-[1.02]' : 'bg-black/40 border-white/5 hover:border-white/20 opacity-60 hover:opacity-100 hover:scale-[1.01]'}`}
                                        onMouseMove={(e) => handleGlassMouseMove(e, 0.1)}
                                    >
                                        {/* Background Glow for Active State */}
                                        {mapMarkerType === m && (
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none" />
                                        )}

                                        {/* Marker Preview */}
                                        <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 ${mapMarkerType === m ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] rotate-0' : 'bg-white/5 grayscale group-hover:grayscale-0'}`}>
                                            {m === 'arrow' ? (
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                                    <path d="M12 2l8 18-8-5-8 5L12 2z" />
                                                </svg>
                                            ) : (
                                                <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_10px_white]" />
                                            )}
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${mapMarkerType === m ? 'text-white' : 'text-gray-500'}`}>{m}</span>
                                        </div>

                                        {/* Checkmark for Active */}
                                        {mapMarkerType === m && (
                                            <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border border-white/20 animate-in zoom-in duration-300">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
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

                    {/* Suspension Travel Mode Setting */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 px-2 text-gray-400">
                            <SuspensionIcon size={18} className="text-blue-400" />
                            <span className="text-xs font-black uppercase tracking-widest">Suspension Travel Mode</span>
                        </div>

                        <div
                            className="glass-container bg-black/30 rounded-[2rem] border border-white/5 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] p-5"
                            onMouseMove={(e) => handleGlassMouseMove(e, 0.1)}
                            style={{ '--glass-hover-scale': '1.015', '--glass-content-scale': '1.01' } as any}
                        >
                            <div className="glass-content flex items-center justify-between gap-6">
                                {/* Left Side: Detailed Explanations */}
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-2">
                                        <span className="text-xs font-black text-white uppercase tracking-wider whitespace-nowrap">
                                            Travel Calculation
                                        </span>
                                        <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-500/20 uppercase tracking-wider whitespace-nowrap">
                                            Baseline Correction
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                                        Choose how suspension travel values are computed and represented.
                                        <br />
                                        <strong className="text-gray-300">Raw (Absolute):</strong> Shows raw positive travel from rest. Features a horizontal glowing line at the baseline.
                                        <br />
                                        <strong className="text-gray-300">Relative (Corrected):</strong> Subtracts session baseline. Standard or Inverted compression polarity can be configured below.
                                    </p>
                                </div>

                                {/* Right Side: Sliding Switch */}
                                <div className="glass-container-flat bg-black/50 p-1.5 rounded-2xl flex border border-white/5 relative w-[180px] h-[48px] shrink-0 items-center">
                                    {/* Sliding Indicator */}
                                    <div
                                        className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-blue-500/20 backdrop-blur-md rounded-xl border border-blue-500/30 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                        style={{ left: suspensionTravelMode === 'raw' ? '6px' : 'calc(50%)' }}
                                    />
                                    <button
                                        onClick={() => setSuspensionTravelMode('raw')}
                                        className={`relative z-10 flex-1 h-full text-[11px] font-black uppercase tracking-wider transition-all rounded-xl ${suspensionTravelMode === 'raw' ? 'text-blue-400 font-extrabold' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Raw
                                    </button>
                                    <button
                                        onClick={() => setSuspensionTravelMode('relative')}
                                        className={`relative z-10 flex-1 h-full text-[11px] font-black uppercase tracking-wider transition-all rounded-xl ${suspensionTravelMode === 'relative' ? 'text-blue-400 font-extrabold' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Relative
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Suspension Travel Polarity Setting */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 px-2 text-gray-400">
                            <SuspensionIcon size={18} className="text-blue-400" />
                            <span className="text-xs font-black uppercase tracking-widest">Suspension Travel Polarity</span>
                        </div>

                        <div
                            className={`glass-container bg-black/30 rounded-[2rem] border border-white/5 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] p-5 transition-all duration-300 ${suspensionTravelMode === 'raw' ? 'opacity-40 pointer-events-none filter blur-[0.5px]' : ''}`}
                            onMouseMove={(e) => handleGlassMouseMove(e, 0.1)}
                            style={{ '--glass-hover-scale': '1.015', '--glass-content-scale': '1.01' } as any}
                        >
                            <div className="glass-content flex items-center justify-between gap-6">
                                {/* Left Side: Detailed Explanations */}
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-2">
                                        <span className="text-xs font-black text-white uppercase tracking-wider whitespace-nowrap">
                                            Suspension Sign Convention
                                        </span>
                                        {suspensionTravelMode === 'raw' ? (
                                            <span className="text-[8px] font-black bg-red-500/20 text-red-400/90 px-1.5 py-0.5 rounded-md border border-red-500/30 uppercase tracking-wider animate-pulse whitespace-nowrap">
                                                Requires Relative Mode
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-500/20 uppercase tracking-wider whitespace-nowrap">
                                                Telemetry Alignment
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                                        Configure the sign convention for suspension travel data in telemetry charts.
                                        <br />
                                        <strong className="text-gray-300">Standard:</strong> Suspension compression is "+", extension is "-".
                                        <br />
                                        <strong className="text-gray-300">Inverted:</strong> Suspension compression is "-", extension is "+".
                                    </p>
                                </div>

                                {/* Right Side: Sliding Switch */}
                                <div className="glass-container-flat bg-black/50 p-1.5 rounded-2xl flex border border-white/5 relative w-[180px] h-[48px] shrink-0 items-center">
                                    {/* Sliding Indicator */}
                                    <div
                                        className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-blue-500/20 backdrop-blur-md rounded-xl border border-blue-500/30 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                        style={{ left: !invertSuspensionTravel ? '6px' : 'calc(50%)' }}
                                    />
                                    <button
                                        onClick={() => setInvertSuspensionTravel(false)}
                                        className={`relative z-10 flex-1 h-full text-[11px] font-black uppercase tracking-wider transition-all rounded-xl ${!invertSuspensionTravel ? 'text-blue-400 font-extrabold' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Standard
                                    </button>
                                    <button
                                        onClick={() => setInvertSuspensionTravel(true)}
                                        className={`relative z-10 flex-1 h-full text-[11px] font-black uppercase tracking-wider transition-all rounded-xl ${invertSuspensionTravel ? 'text-blue-400 font-extrabold' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Inverted
                                    </button>
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

                            <div className="flex items-center gap-2">
                                <Tooltip text="Reset colors for this category" position="bottom">
                                    <button
                                        onClick={() => resetChartColors(activeSettingsCategory)}
                                        className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-all rounded-xl flex items-center gap-2 px-3 border border-white/5 glass-container-flat"
                                    >
                                        <RotateCcw size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Reset Colors</span>
                                    </button>
                                </Tooltip>
                                <Tooltip text="Reset layout and visibility for this category" position="bottom">
                                    <button
                                        onClick={() => {
                                            const confirmReset = window.confirm(`Reset all ${activeSettingsCategory} charts to default layout and visibility?`);
                                            if (confirmReset) {
                                                // Logic to clear custom visibility/order for this category
                                                const custom = JSON.parse(localStorage.getItem('custom_chart_settings') || '{}');
                                                const targetIds = (CATEGORY_CHART_CONFIGS[activeSettingsCategory as keyof typeof CATEGORY_CHART_CONFIGS] || []).map(c => `${c.id}-${c.wheelIndex ?? 'all'}`);

                                                targetIds.forEach(key => {
                                                    if (custom[key]) {
                                                        delete custom[key].visible;
                                                        delete custom[key].order;
                                                        if (Object.keys(custom[key]).length === 0) delete custom[key];
                                                    }
                                                });
                                                localStorage.setItem('custom_chart_settings', JSON.stringify(custom));
                                                // Refresh current category
                                                setActiveChartCategory(activeSettingsCategory as any);
                                            }
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-xl flex items-center gap-2 px-3 border border-white/5 glass-container-flat"
                                    >
                                        <Layout size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">Reset Layout</span>
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Category Navigation for Settings */}
                        <div className="flex justify-center mb-2">
                            <div className="relative flex items-center p-1 bg-[#1a1a1e]/60 backdrop-blur-3xl rounded-full border border-white/5 h-9 overflow-hidden group/toggle shadow-lg pointer-events-auto" onMouseMove={handleGlassMouseMove}>
                                <div className="glass-content relative flex items-center h-full">
                                    {(() => {
                                        const availableTabs = [
                                            { id: 'Driver', label: 'DRIVER' },
                                            { id: 'Tyres', label: 'TYRES' },
                                            { id: 'Dynamics', label: 'DYNAMICS' },
                                            { id: 'Handling', label: 'HANDLING' },
                                            { id: 'Systems', label: 'SYSTEMS' },
                                        ];

                                        const activeIndex = availableTabs.findIndex(t => t.id === activeSettingsCategory);

                                        return (
                                            <>
                                                {/* Sliding Active Block */}
                                                <div
                                                    className="absolute bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                                                    style={{
                                                        height: 'calc(100% - 4px)',
                                                        width: `calc(${100 / availableTabs.length}% - 4px)`,
                                                        left: `calc(${(activeIndex / availableTabs.length) * 100}% + 2px)`,
                                                        top: '2px'
                                                    }}
                                                />

                                                {availableTabs.map((cat) => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => {
                                                            setActiveSettingsCategory(cat.id);
                                                            // Sync back to dashboard if it's a chart category
                                                            if (cat.id !== 'Driver') {
                                                                setActiveChartCategory(cat.id as any);
                                                            }
                                                        }}
                                                        className={`relative z-10 px-4 h-full flex items-center justify-center text-[9px] font-black uppercase tracking-[0.1em] transition-colors duration-300 flex-1 min-w-[85px] ${activeSettingsCategory === cat.id ? 'text-white' : 'text-gray-500 hover:text-white'
                                                            }`}
                                                    >
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Chart List Container */}
                        <div
                            className="glass-container bg-black/30 rounded-[2.5rem] border border-white/5 shadow-[inset_0_2px_20px_rgba(0,0,0,0.5)] p-4"
                        >
                            <div className="glass-content flex flex-col gap-3">
                                {displayCharts.map((config, idx) => {
                                    const displayUnit = getDisplayUnit(config);
                                    return (
                                        <div
                                            key={`${config.id}-${config.wheelIndex ?? 'no-wheel'}`}
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
                                                        onChange={(e) => updateChartConfig(config.id, { color: e.target.value }, config.wheelIndex)}
                                                        className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer bg-transparent border-none appearance-none"
                                                    />
                                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: config.color }} />
                                                </div>

                                                <button
                                                    onClick={() => updateChartConfig(config.id, { visible: !config.visible }, config.wheelIndex)}
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
                        
                        <a
                            href="https://discord.gg/zNPehXA3jK"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/discord flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-[#5865F2]/20 border border-white/5 hover:border-[#5865F2]/40 rounded-full transition-all duration-300 shadow-md hover:shadow-[0_0_15px_rgba(88,101,242,0.25)] hover:scale-[1.03] active:scale-95 cursor-pointer"
                            onMouseMove={handleGlassMouseMove}
                        >
                            <DiscordIcon size={14} className="text-gray-400 group-hover/discord:text-[#5865F2] transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 group-hover/discord:text-white transition-colors">Join Discord Community</span>
                        </a>

                        <span className="text-[9px] text-gray-600 font-black uppercase tracking-[0.3em] mt-1">DuckDB Investigation Tool v{packageJson.version}</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
