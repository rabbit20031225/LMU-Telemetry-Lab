import React, { useState, useEffect } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { ArrowLeft, Loader2, Settings2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CarSetupData } from '../types';
import { getClassColor } from '../utils/carHelpers';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { apiClient } from '../api/client';

type TabId = 'powertrain' | 'wheelsAndBrakes' | 'suspension' | 'dampers' | 'chassisAndAero';

const TABS: { id: TabId; label: string }[] = [
    { id: 'powertrain', label: 'POWERTRAIN' },
    { id: 'wheelsAndBrakes', label: 'WHEELS & BRAKES' },
    { id: 'suspension', label: 'SUSPENSION' },
    { id: 'dampers', label: 'DAMPERS' },
    { id: 'chassisAndAero', label: 'CHASSIS & AERO' },
];

// ─── Value Cell: Styled for high-fidelity ─────────────────────────────────────
const ValCell: React.FC<{ cur: string | null; ref?: string | null; align?: 'start' | 'end' }> = ({ cur, ref, align = 'end' }) => (
    <div className={`flex items-center ${align === 'start' ? 'justify-start' : 'justify-end'} gap-3`}>
        <span className="font-mono font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] text-[13px]">{cur ?? '—'}</span>
        {ref !== undefined && ref !== null && ref !== cur && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">
                <span className="font-mono font-bold text-amber-400 text-[11px]">{ref}</span>
            </div>
        )}
    </div>
);

// ─── Glass Card for Sections ──────────────────────────────────────────────────
const SetupSection: React.FC<{
    title: string;
    children: React.ReactNode;
}> = ({ title, children }) => (
    <div 
        className="glass-container glass-expand-pixel p-5 rounded-2xl border border-white/10 mb-5 hover:bg-white/5 transition-all duration-300 group/section"
        onMouseMove={(e) => handleGlassMouseMove(e, 0.1)}
    >
        <div className="glass-content">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                <div className="w-1 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-400 group-hover/section:text-white transition-colors">
                    {title}
                </h3>
            </div>
            {children}
        </div>
    </div>
);

// ─── Simple Table (key-value) ─────────────────────────────────────────────────
const SimpleTable: React.FC<{
    title: string;
    rows: Record<string, string | null>;
    refRows?: Record<string, string | null>;
}> = ({ title, rows, refRows }) => {
    const visibleEntries = Object.entries(rows).filter(([k, v]) => v !== null || (refRows?.[k] ?? null) !== null);
    if (visibleEntries.length === 0) return null;
    return (
        <SetupSection title={title}>
            <table className="w-full">
                <tbody>
                    {Object.entries(rows).map(([k, v]) => {
                        const refV = refRows?.[k] ?? undefined;
                        if (v === null && (refV === undefined || refV === null)) return null;
                        return (
                            <tr key={k} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                <td className="py-2 pr-4 text-gray-500 font-bold uppercase text-[10px] tracking-wider">{k}</td>
                                <td className="py-2 text-right">
                                    <ValCell cur={v} ref={refV} align="end" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </SetupSection>
    );
};

// ─── LR Table ────────────────────────────────────────────────────────────────
const LRTable: React.FC<{
    title: string;
    rows: Record<string, { L: string | null; R: string | null }>;
    refRows?: Record<string, { L: string | null; R: string | null }>;
}> = ({ title, rows, refRows }) => (
    <SetupSection title={title}>
        <table className="w-full">
            <thead>
                <tr>
                    <th className="text-left py-1 text-[10px] font-black uppercase tracking-widest text-gray-600 w-[40%]"></th>
                    <th className="text-right py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 w-[30%]">LEFT</th>
                    <th className="text-right py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 w-[30%]">RIGHT</th>
                </tr>
            </thead>
            <tbody>
                {Object.entries(rows).map(([k, v]) => (
                    <tr key={k} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="py-2 text-gray-500 font-bold uppercase text-[10px] tracking-wider">{k}</td>
                        <td className="py-2 text-right">
                            <ValCell cur={v.L} ref={refRows?.[k]?.L} align="end" />
                        </td>
                        <td className="py-2 text-right">
                            <ValCell cur={v.R} ref={refRows?.[k]?.R} align="end" />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </SetupSection>
);

// ─── LR3 Table ───────────────────────────────────────────────────────────────
const LR3Table: React.FC<{
    title: string;
    rows: Record<string, { L: string | null; '3rd': string | null; R: string | null }>;
    refRows?: Record<string, { L: string | null; '3rd': string | null; R: string | null }>;
}> = ({ title, rows, refRows }) => (
    <SetupSection title={title}>
        <table className="w-full">
            <thead>
                <tr>
                    <th className="text-left py-1 text-[10px] font-black uppercase tracking-widest text-gray-600 w-[34%]"></th>
                    <th className="text-right py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 w-[22%]">LEFT</th>
                    <th className="text-right py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/60 w-[22%]">3RD SPR.</th>
                    <th className="text-right py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 w-[22%]">RIGHT</th>
                </tr>
            </thead>
            <tbody>
                {Object.entries(rows).map(([k, v]) => (
                    <tr key={k} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                        <td className="py-2 text-gray-500 font-bold uppercase text-[10px] tracking-wider">{k}</td>
                        <td className="py-2 text-right">
                            <ValCell cur={v.L} ref={refRows?.[k]?.L} align="end" />
                        </td>
                        <td className="py-2 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                                <span className="font-mono font-black text-blue-300 text-[13px] drop-shadow-[0_0_8px_rgba(147,197,253,0.3)]">{v['3rd'] ?? '—'}</span>
                                {refRows?.[k]?.['3rd'] !== undefined && refRows?.[k]?.['3rd'] !== null && refRows?.[k]?.['3rd'] !== v['3rd'] && (
                                    <span className="font-mono font-bold text-amber-500/80 text-[11px]">{refRows?.[k]?.['3rd']}</span>
                                )}
                            </div>
                        </td>
                        <td className="py-2 text-right">
                            <ValCell cur={v.R} ref={refRows?.[k]?.R} align="end" />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </SetupSection>
);

// ─── Tab Content Renderers ────────────────────────────────────────────────────
const PowertrainTab: React.FC<{ data: CarSetupData['powertrain']; ref?: CarSetupData['powertrain'] }> = ({ data, ref }) => (
    <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-2">
            <SimpleTable title="Engine" rows={data.engine} refRows={ref?.engine} />
            <SimpleTable title="Electronics" rows={data.electronics} refRows={ref?.electronics} />
        </div>
        <div className="flex flex-col gap-2">
            <SimpleTable title="Differential" rows={data.differential} refRows={ref?.differential} />
            <SimpleTable title="Gearing" rows={data.gearing} refRows={ref?.gearing} />
        </div>
    </div>
);

const WheelsBrakesTab: React.FC<{ data: CarSetupData['wheelsAndBrakes']; ref?: CarSetupData['wheelsAndBrakes'] }> = ({ data, ref }) => (
    <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-2">
            <LRTable title="Front Wheels" rows={data.frontWheels} refRows={ref?.frontWheels} />
            <LRTable title="Rear Wheels" rows={data.rearWheels} refRows={ref?.rearWheels} />
        </div>
        <div className="flex flex-col gap-2">
            <SimpleTable title="Brakes" rows={data.brakes} refRows={ref?.brakes} />
        </div>
    </div>
);

const SuspensionTab: React.FC<{ data: CarSetupData['suspension']; ref?: CarSetupData['suspension'] }> = ({ data, ref }) => (
    <div className="grid grid-cols-2 gap-8">
        <LR3Table title="Front Suspension" rows={data.front} refRows={ref?.front} />
        <LR3Table title="Rear Suspension" rows={data.rear} refRows={ref?.rear} />
    </div>
);

const DampersTab: React.FC<{ data: CarSetupData['dampers']; ref?: CarSetupData['dampers'] }> = ({ data, ref }) => (
    <div className="grid grid-cols-2 gap-8">
        <LR3Table title="Front Suspension" rows={data.front} refRows={ref?.front} />
        <LR3Table title="Rear Suspension" rows={data.rear} refRows={ref?.rear} />
    </div>
);

const ChassisAeroTab: React.FC<{ data: CarSetupData['chassisAndAero']; ref?: CarSetupData['chassisAndAero'] }> = ({ data, ref }) => (
    <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-2">
            <SimpleTable title="Front Chassis" rows={data.frontChassis} refRows={ref?.frontChassis} />
            <SimpleTable title="Rear Chassis" rows={data.rearChassis} refRows={ref?.rearChassis} />
        </div>
        <div className="flex flex-col gap-2">
            <SimpleTable title="Weight" rows={data.weight} refRows={ref?.weight} />
            <SimpleTable title="Advanced Chassis" rows={data.advancedChassis} refRows={ref?.advancedChassis} />
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const CarSetupView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('powertrain');
    const setShowSetupView = useTelemetryStore(s => s.setShowSetupView);
    const carSetupData = useTelemetryStore(s => s.carSetupData);
    const referenceCarSetupData = useTelemetryStore(s => s.referenceCarSetupData);
    const setupLoading = useTelemetryStore(s => s.setupLoading);
    const sessionMetadata = useTelemetryStore(s => s.sessionMetadata);
    const referenceLap = useTelemetryStore(s => s.referenceLap);
    const referenceSessionMetadata = useTelemetryStore(s => s.referenceSessionMetadata);
    const currentSessionId = useTelemetryStore(s => s.currentSessionId);
    const fetchReferenceSetup = useTelemetryStore(s => s.fetchReferenceSetup);
    const clearReferenceSetup = useTelemetryStore(s => s.clearReferenceSetup);

    useEffect(() => {
        if (referenceLap?.sessionId) {
            fetchReferenceSetup(referenceLap.sessionId);
        } else {
            clearReferenceSetup();
        }
    }, [referenceLap?.sessionId]);

    const carClass = sessionMetadata?.carClass;
    const carModel = sessionMetadata?.modelName;
    const refCarModel = referenceSessionMetadata?.modelName || referenceLap?.carModel;
    const hasReference = referenceCarSetupData !== null;

    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!currentSessionId) return;
        try {
            setIsExporting(true);
            await apiClient.exportSessionSetup(currentSessionId);
        } catch (error) {
            console.error('Failed to export setup:', error);
            // Optionally could add a toast here
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/60 backdrop-blur-3xl text-white select-none overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            {/* Top bar */}
            <div className="flex items-center gap-4 px-8 py-5 border-b border-white/5 bg-white/5 flex-shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                
                <button
                    onClick={() => setShowSetupView(false)}
                    className="flex items-center gap-2 text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all group px-4 py-2 bg-white/5 rounded-xl border border-white/10 hover:border-red-500/30"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Exit</span>
                </button>

                <div className="w-px h-6 bg-white/10" />

                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-600/20 rounded-lg border border-blue-500/30">
                        <img 
                            src="/setup_icon.png" 
                            alt="Setup" 
                            className="w-5 h-5 object-contain brightness-125 transition-all drop-shadow-[0_0_8px_rgba(96,165,250,0.4)] invert-[0.3] sepia(1) saturate(5) hue-rotate(190deg)"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[14px] font-black uppercase tracking-[0.2em] text-white leading-none">Car Setup</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Setup Analysis & Comparison</span>
                    </div>
                </div>

                {(carModel || carClass) && (
                    <div className="flex items-center gap-3 ml-8 px-5 py-2.5 bg-white/5 rounded-2xl border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">{carModel}</span>
                            <span className="text-[8px] font-black text-gray-400 uppercase mt-0.5 tracking-widest">
                                Current Vehicle
                            </span>
                        </div>
                    </div>
                )}

                {hasReference && refCarModel && (
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-500/10 rounded-2xl border border-amber-500/20 ml-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">{refCarModel}</span>
                            <span className="text-[8px] font-black text-amber-500/60 uppercase mt-0.5 tracking-widest">Reference Vehicle</span>
                        </div>
                    </div>
                )}

                <div className="ml-auto flex items-center gap-4">
                    {/* Export Button */}
                    {currentSessionId && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isExporting ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                {isExporting ? 'Exporting...' : 'Export .svm'}
                            </span>
                        </button>
                    )}

                    {/* Legend */}
                    {hasReference && (
                        <div className="flex items-center gap-6 px-6 py-2 bg-black/30 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">Reference</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center justify-center gap-2 px-8 pt-4 bg-white/2 flex-shrink-0">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative px-8 py-3.5 text-[13px] font-black uppercase tracking-[0.2em] transition-all rounded-t-xl border-t border-x ${
                            activeTab === tab.id
                                ? 'text-blue-400 bg-white/5 border-white/10'
                                : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/2'
                        }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div 
                                layoutId="activeTabUnderline"
                                className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
                {setupLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-500">
                        <Loader2 size={32} className="animate-spin text-blue-500" />
                        <span className="text-[12px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Telemetry Data...</span>
                    </div>
                ) : !carSetupData ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-600">
                        <Settings2 size={40} className="opacity-20" />
                        <span className="text-[12px] font-black uppercase tracking-[0.2em]">No configuration data found for this session</span>
                    </div>
                ) : (
                    <div className="max-w-[1400px] mx-auto overflow-visible px-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                            >
                                {activeTab === 'powertrain' && (
                                    <PowertrainTab data={carSetupData.powertrain} ref={referenceCarSetupData?.powertrain} />
                                )}
                                {activeTab === 'wheelsAndBrakes' && (
                                    <WheelsBrakesTab data={carSetupData.wheelsAndBrakes} ref={referenceCarSetupData?.wheelsAndBrakes} />
                                )}
                                {activeTab === 'suspension' && (
                                    <SuspensionTab data={carSetupData.suspension} ref={referenceCarSetupData?.suspension} />
                                )}
                                {activeTab === 'dampers' && (
                                    <DampersTab data={carSetupData.dampers} ref={referenceCarSetupData?.dampers} />
                                )}
                                {activeTab === 'chassisAndAero' && (
                                    <ChassisAeroTab data={carSetupData.chassisAndAero} ref={referenceCarSetupData?.chassisAndAero} />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};
