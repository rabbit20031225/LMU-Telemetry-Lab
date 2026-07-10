import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetryStore } from '../store/telemetryStore';
import { TelemetryChart } from './TelemetryChart';

export const DataChartsOverlay = React.memo(() => {
    const chartConfigs = useTelemetryStore(state => state.chartConfigs);
    const activeChartCategory = useTelemetryStore(state => state.activeChartCategory);
    const setActiveChartCategory = useTelemetryStore(state => state.setActiveChartCategory);
    const isPlaying = useTelemetryStore(state => state.isPlaying);
    const referenceLapIdx = useTelemetryStore(state => state.referenceLapIdx);
    const referenceLap = useTelemetryStore(state => state.referenceLap);
    const selectedSegIdx = useTelemetryStore(state => state.selectedSegIdx);
    const selectedSectorIdx = useTelemetryStore(state => state.selectedSectorIdx);

    React.useEffect(() => {
        setActiveChartCategory('Driver');
    }, [setActiveChartCategory]);

    const activeCharts = chartConfigs.filter(c => 
        c.visible && 
        (c.id !== 'Time Delta' || referenceLapIdx !== null || referenceLap !== null || (selectedSectorIdx === null && selectedSegIdx !== null)) &&
        // In this overlay (maximized HUD), we only show Driver charts per user request
        useTelemetryStore.getState().activeChartCategory === 'Driver'
    );

    return (
        <div 
            className="flex flex-col gap-1.5 w-[380px] h-full overflow-y-auto pointer-events-auto custom-scrollbar px-8 pt-4 pb-4 group"
            onWheelCapture={(e) => e.stopPropagation()}
        >

            <AnimatePresence mode="popLayout">
                {activeCharts.map((config) => (
                    <motion.div
                        key={`hud-chart-${config.id}-${config.wheelIndex ?? 'none'}`}
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
                            height={activeChartCategory === 'Driver' ? 110 : 130} // Slightly taller for complex charts
                            syncKey="telemetry" 
                            unit={config.unit}
                            wheelIndex={config.wheelIndex}
                            showLapTime={false}
                            isPlaying={isPlaying}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
});
