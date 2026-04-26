import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetryStore } from '../store/telemetryStore';
import { TelemetryChart } from './TelemetryChart';

export const DataChartsOverlay = React.memo(() => {
    const chartConfigs = useTelemetryStore(state => state.chartConfigs);
    const isPlaying = useTelemetryStore(state => state.isPlaying);
    const referenceLapIdx = useTelemetryStore(state => state.referenceLapIdx);
    const referenceLap = useTelemetryStore(state => state.referenceLap);

    const activeCharts = chartConfigs.filter(c => 
        c.visible && 
        (c.id !== 'Time Delta' || referenceLapIdx !== null || referenceLap !== null)
    );

    if (activeCharts.length === 0) return null;

    return (
        <div 
            className="flex flex-col gap-1.5 w-[380px] h-full overflow-y-auto pointer-events-auto custom-scrollbar px-8 pt-0 pb-0 group"
            onWheelCapture={(e) => e.stopPropagation()}
        >
            <AnimatePresence mode="popLayout">
                {activeCharts.map((config) => (
                    <motion.div
                        key={`hud-chart-${config.id}`}
                        layout
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        transition={{ 
                            type: 'spring', 
                            stiffness: 120,
                            damping: 20,
                            layout: { duration: 0.4 },
                            opacity: { duration: 0.3 }
                        }}
                        className="pointer-events-auto origin-right"
                    >
                        <TelemetryChart 
                            channel={config.id}
                            alias={config.alias}
                            color={config.color}
                            height={110} // Optimized height for HUD
                            syncKey="telemetry" 
                            unit={config.unit}
                            showLapTime={false}
                            isPlaying={isPlaying}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
});
