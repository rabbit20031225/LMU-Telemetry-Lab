import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetryStore } from '../store/telemetryStore';
import { Loader2 } from 'lucide-react';

interface MapTransitionOverlayProps {
    isVisible: boolean;
}

export const MapTransitionOverlay: React.FC<MapTransitionOverlayProps> = ({ isVisible }) => {
    const show3DLab = useTelemetryStore(state => state.show3DLab);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-[5000] flex flex-col items-center justify-center bg-black/60 backdrop-blur-3xl overflow-hidden pointer-events-auto"
                >
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        className="flex flex-col items-center gap-4"
                    >
                        {/* Animated Logo or Icon */}
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            <motion.div 
                                animate={{ 
                                    rotate: 360,
                                    boxShadow: ["0 0 15px rgba(59,130,246,0.3)", "0 0 30px rgba(59,130,246,0.5)", "0 0 15px rgba(59,130,246,0.3)"]
                                }}
                                transition={{ rotate: { duration: 1.5, repeat: Infinity, ease: "linear" }, boxShadow: { duration: 2, repeat: Infinity } }}
                                className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">
                                    {show3DLab ? '3D' : '2D'}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <h2 className="text-white text-[12px] font-black uppercase tracking-[0.3em] ml-1">
                                Switching Dimension
                            </h2>
                            <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">
                                Rendering Environment...
                            </p>
                        </div>
                    </motion.div>

                    {/* Background Detail */}
                    <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                </motion.div>
            )}
        </AnimatePresence>
    );
};
