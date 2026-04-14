import React, { useState, useEffect, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { SteeringWheelPicker } from './SteeringWheelPicker';
import { useTelemetryStore } from '../store/telemetryStore';

interface SteeringWheelViewProps {
    data: any;
    cursorIndex: number | null;
    carModel?: string;
    theme?: 'current' | 'reference';
    compact?: boolean;
}

export const SteeringWheelView = React.memo(({ 
    data, 
    cursorIndex, 
    carModel, 
    theme = 'current', 
    compact = false 
}: SteeringWheelViewProps) => {
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
    const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);
    const userWheelRotation = useTelemetryStore(state => state.userWheelRotation);
    const selectedWheel = useTelemetryStore(state => state.selectedWheel);
    const setSelectedWheel = useTelemetryStore(state => state.setSelectedWheel);
    const customWheels = useTelemetryStore(state => state.customWheels);
    const setCustomWheels = useTelemetryStore(state => state.setCustomWheels);
    
    const [showPicker, setShowPicker] = useState(false);
    const [shouldRenderPicker, setShouldRenderPicker] = useState(false);
    const [isAnimatingPicker, setIsAnimatingPicker] = useState(false);

    const DEFAULT_WHEEL = "Cars/PORSCHE 963_2024.png";

    // Animation lifecycle
    useEffect(() => {
        if (showPicker) {
            setShouldRenderPicker(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimatingPicker(true);
                });
            });
        } else {
            setIsAnimatingPicker(false);
            const timer = setTimeout(() => setShouldRenderPicker(false), 500);
            return () => clearTimeout(timer);
        }
    }, [showPicker]);

    const handleUploadCustom = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result as string;
            const newWheel = {
                id: `custom-${Date.now()}`,
                name: file.name.replace(/\.[^/.]+$/, ""),
                data: base64Data
            };
            setCustomWheels([...customWheels, newWheel]);
            setSelectedWheel(newWheel.id);
            setShowPicker(false);
        };
        reader.readAsDataURL(file);
    };

    const deleteCustomWheel = (id: string) => {
        setCustomWheels(customWheels.filter(w => w.id !== id));
        if (selectedWheel === id) setSelectedWheel(null);
    };

    const getCurrentWheelSource = () => {
        if (!selectedWheel) {
            if (carModel) return `/steering wheel/Cars/${carModel}.png`;
            return `/steering wheel/${DEFAULT_WHEEL}`;
        }
        const custom = customWheels.find(w => w.id === selectedWheel);
        if (custom) return custom.data;
        return `/steering wheel/${selectedWheel}`;
    };

    const isRef = theme === 'reference';
    const mainColor = isRef ? '#daa520' : '#3b82f6';
    const glowColor = isRef ? 'rgba(218, 165, 32, 0.4)' : 'rgba(59, 130, 246, 0.4)';


    // Interpolate steering angle if cursorIndex is fractional
    const angle = useMemo(() => {
        if (!data || cursorIndex === null || !data['Steering Angle']) return 0;
        
        const channelData = data['Steering Angle'];
        const baseIdx = Math.floor(cursorIndex);
        const nextIdx = Math.min(channelData.length - 1, baseIdx + 1);
        const frac = cursorIndex - baseIdx;
        const v1 = channelData[baseIdx] ?? 0;
        const v2 = channelData[nextIdx] ?? 0;
        const interpolatedAngle = v1 + (v2 - v1) * frac;

        // Apply ratio-based override if manual lock is set
        if (userWheelRotation !== null) {
            const effectiveMetadata = isRef ? (referenceSessionMetadata || sessionMetadata) : sessionMetadata;
            if (effectiveMetadata?.steeringLock) {
                return interpolatedAngle * (userWheelRotation / effectiveMetadata.steeringLock);
            }
        }
        
        return interpolatedAngle;
    }, [data, cursorIndex, userWheelRotation, sessionMetadata, referenceSessionMetadata, isRef]);
    
    const currentWheelSrc = getCurrentWheelSource();

    return (
        <div
            className={`bg-white/10 glass-container-flat ${compact ? 'p-2 pt-6 rounded-xl' : 'p-4 pt-10 rounded-3xl'} border border-white/20 shadow-xl flex flex-col items-center relative group/steering hover:bg-white/15 transition-all duration-300 overflow-hidden`}
            style={{ 
                boxShadow: isRef ? `0 10px 25px rgba(0,0,0,0.4), inset 0 0 20px ${glowColor}` : undefined,
                borderColor: isRef ? 'rgba(218, 165, 32, 0.3)' : undefined
            }}
            onMouseMove={(e: any) => handleGlassMouseMove(e, 0.12)}
        >
            <div className={`absolute top-0 left-0 w-full flex items-center justify-between ${compact ? 'p-2' : 'p-3'}`}>
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isRef ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'}`} />
                    <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] ${isRef ? 'text-amber-500' : 'text-gray-500'} group-hover/steering:text-white transition-colors`}>
                        {isRef ? 'Reference' : 'Steering'}
                    </span>
                </div>
                
                {!isRef && !compact && (
                    <button
                        onClick={() => setShowPicker(!showPicker)}
                        className={`p-1.5 rounded-lg border transition-all active:scale-90 flex items-center justify-center glass-container-flat hover:scale-110 group/strGear ${showPicker ? 'bg-blue-500/30 border-blue-400 text-blue-400' : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
                        onMouseMove={(e: any) => handleGlassMouseMove(e, 0.15)}
                    >
                        <Settings size={12} className="group-hover/strGear:rotate-180 transition-all duration-700" />
                    </button>
                )}
            </div>

            <div className="glass-content w-full flex flex-col items-center">
                {/* Expanding Flow Menu */}
                {!isRef && !compact && (
                    <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-full overflow-hidden ${isAnimatingPicker ? 'grid-rows-[1fr] opacity-100 mt-2 mb-2' : 'grid-rows-[0fr] opacity-0 mt-0 mb-0'}`}>
                        <div className="min-h-0">
                            {shouldRenderPicker && (
                                <div className="px-1">
                                    <SteeringWheelPicker 
                                        isAnimating={isAnimatingPicker}
                                        selectedWheel={selectedWheel}
                                        onSelect={(path) => { setSelectedWheel(path); setShowPicker(false); }}
                                        customWheels={customWheels}
                                        onUploadCustom={handleUploadCustom}
                                        onDeleteCustom={deleteCustomWheel}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div
                    className={`relative ${compact ? 'w-24 h-24 rounded-[1.5rem]' : 'w-36 h-36 rounded-[2.5rem]'} flex items-center justify-center py-2 bg-black/30 border border-white/10 mb-2 glass-container-flat group/wheelFrame hover:bg-white/10 transition-all duration-300`}
                >
                    <div className="glass-content size-full flex items-center justify-center p-3">
                        <div
                            className="w-full h-full transition-transform duration-75 linear"
                            style={{ transform: `rotateZ(${angle}deg)` }}
                        >
                            <img
                                src={currentWheelSrc}
                                alt="Steering Wheel"
                                className="w-full h-full object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)] filter brightness-110"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `/steering wheel/${DEFAULT_WHEEL}`;
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className={`${compact ? 'text-[12px]' : 'text-[16px]'} font-mono font-black text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] tracking-tight`}>
                    {angle ? angle.toFixed(1) : "0.0"}°
                </div>

                {(() => {
                    const meta = isRef ? referenceSessionMetadata : sessionMetadata;
                    const lockStr = userWheelRotation !== null && !isRef ? `${userWheelRotation}°` : meta?.steeringLockString;
                    if (!lockStr) return null;
                    
                    return (
                        <div className="flex flex-col items-center mt-1 pt-1 border-t border-white/5 w-full">
                            <span className={`text-[9px] font-mono tracking-tighter uppercase opacity-80 group-hover/steering:text-white transition-colors ${userWheelRotation !== null && !isRef ? 'text-orange-400' : 'text-gray-400'}`}>
                                {userWheelRotation !== null && !isRef ? 'manual_lock' : 'steer_lock'} : {lockStr}
                            </span>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
});
