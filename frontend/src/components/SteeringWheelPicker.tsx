import React, { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronRight, ChevronDown, Check, Upload, Zap } from 'lucide-react';
import { apiClient } from '../api/client';
import { handleGlassMouseMove } from '../utils/glassEffect';

interface Wheel {
    name: string;
    path: string;
}

interface SteeringWheelPickerProps {
    isAnimating: boolean;
    selectedWheel: string | null;
    onSelect: (path: string | null) => void;
    customWheels: { id: string, name: string, data: string }[];
    onUploadCustom: (file: File) => void;
    onDeleteCustom: (id: string) => void;
}

export const SteeringWheelPicker: React.FC<SteeringWheelPickerProps> = ({
    isAnimating,
    selectedWheel,
    onSelect,
    customWheels,
    onUploadCustom,
    onDeleteCustom
}) => {
    const [categories, setCategories] = useState<Record<string, Wheel[]>>({});
    const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadWheels = async () => {
            try {
                const data = await apiClient.getSteeringWheels();
                setCategories(data.categories);
            } catch (err) {
                console.error("Failed to load steering wheels", err);
            }
        };
        loadWheels();
    }, []);

    const toggleBrand = (brand: string) => {
        setExpandedBrand(expandedBrand === brand ? null : brand);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onUploadCustom(file);
    };

    return (
        <div className="w-full flex flex-col min-w-0 overflow-hidden bg-white/5 rounded-2xl border border-white/10 shadow-inner">
            <div className="max-h-[22rem] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1.5 min-w-0">
                {/* Upload Action */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-blue-400 border border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 rounded-lg transition-all mb-1 active:scale-[0.98] flex items-center gap-2"
                >
                    <Upload size={12} />
                    <span>Upload New Wheel</span>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                />

                {/* Brands Section (Nested) */}
                {Object.entries(categories).map(([category, wheels]) => {
                    const isCars = category === "Cars";
                    const isRoot = category === "Root";
                    if (isRoot) return null;

                    // Rename logic: handle both backslashes and forward slashes, and strip "Sim Hardware"
                    const cleanCategory = category.replace(/\\/g, '/');
                    const brandName = isCars 
                        ? "LMU Models" 
                        : cleanCategory.replace("Sim Hardware/", "").split('/').pop() || "";
                    
                    const isExpanded = expandedBrand === category;

                    return (
                        <div key={category} className="flex flex-col gap-1 font-mono">
                            <button
                                onClick={() => toggleBrand(category)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all glass-container-flat ${isExpanded ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                                onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
                            >
                                <div className="glass-content flex items-center">
                                    <span className="text-[11px] font-black uppercase tracking-[0.25em]">{brandName}</span>
                                </div>
                                <div className="glass-content">
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                            </button>

                            <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                                <div className="min-h-0 flex flex-col gap-1 pl-4 mt-1">
                                    {wheels.map((wheel) => (
                                        <button
                                            key={wheel.path}
                                            onClick={() => onSelect(wheel.path)}
                                            className={`w-full text-left px-3 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center gap-3 glass-container-flat ${selectedWheel === wheel.path ? 'text-blue-400 bg-blue-600/20 border-blue-500/30' : 'text-gray-500 hover:text-white hover:bg-white/5 border-transparent'}`}
                                            onMouseMove={(e) => handleGlassMouseMove(e, 0.25)}
                                        >
                                            <div className="glass-content size-full flex items-center gap-3">
                                                <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 border border-white/10 bg-black/40">
                                                    <img src={`/steering wheel/${wheel.path}`} className="w-full h-full object-contain" alt="" />
                                                </div>
                                                <span className="truncate flex-1 uppercase tracking-tight">{wheel.name}</span>
                                                {selectedWheel === wheel.path && <Check size={10} />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Root wheels handle similarly, simplified */}
                {categories["Root"] && (
                    <div className="flex flex-col gap-1 border-t border-white/5 pt-2 mt-1">
                        {categories["Root"].map((wheel) => (
                            <button
                                key={wheel.path}
                                onClick={() => onSelect(wheel.path)}
                                className={`w-full text-left px-3 py-2 text-[10px] font-bold rounded-xl transition-all flex items-center gap-3 glass-container-flat ${selectedWheel === wheel.path ? 'text-blue-400 bg-blue-600/20 border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                                onMouseMove={(e) => handleGlassMouseMove(e, 0.25)}
                            >
                                <div className="glass-content size-full flex items-center gap-3">
                                    <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 border border-white/10 bg-black/40">
                                        <img src={`/steering wheel/${wheel.path}`} className="w-full h-full object-contain" alt="" />
                                    </div>
                                    <span className="truncate flex-1 font-mono uppercase tracking-tighter">{wheel.name}</span>
                                    {selectedWheel === wheel.path && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)]" />}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Saved Custom Wheels Section */}
                {customWheels.length > 0 && (
                    <div className="flex flex-col gap-1 border-t border-white/5 pt-2 mt-1">
                        {customWheels.map(w => (
                            <div key={w.id} className="group/item relative">
                                <button
                                    onClick={() => onSelect(w.id)}
                                    className={`w-full text-left px-3 py-2 text-[10px] font-bold rounded-xl transition-all flex items-center gap-3 glass-container-flat ${selectedWheel === w.id ? 'text-blue-400 bg-blue-600/20 border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'}`}
                                    onMouseMove={(e) => handleGlassMouseMove(e, 0.25)}
                                >
                                    <div className="glass-content size-full flex items-center gap-3 font-mono">
                                        <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 border border-white/10 bg-black/40">
                                            <img src={w.data} className="w-full h-full object-contain" alt="" />
                                        </div>
                                        <span className="truncate flex-1 uppercase tracking-tighter italic">{w.name} (Custom)</span>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteCustom(w.id); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all z-20"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="h-px bg-white/5 mx-1 my-1" />

                {/* Auto-Match Section */}
                <div className="flex flex-col gap-1 pb-1">
                    <button
                        onClick={() => onSelect(null)}
                        className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all glass-container-flat flex items-center justify-between ${!selectedWheel ? 'text-blue-400 bg-blue-600/20 border-blue-500/30' : 'text-gray-500 hover:text-white hover:bg-white/5 border-transparent'}`}
                        onMouseMove={(e) => handleGlassMouseMove(e, 0.25)}
                    >
                        <div className="glass-content flex items-center gap-2.5">
                            <Zap size={14} className={!selectedWheel ? 'text-blue-400' : 'text-gray-500'} />
                            <span>Auto-Match (Default)</span>
                        </div>
                        {!selectedWheel && <Check size={10} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
