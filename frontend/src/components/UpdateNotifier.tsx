import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Info, ChevronRight, Bell } from 'lucide-react';
import pkg from '../../package.json';
import { handleGlassMouseMove } from '../utils/glassEffect';

const CURRENT_VERSION = `v${pkg.version}`;
const GITHUB_REPO = 'rabbit20031225/LMU-Telemetry-Lab';

const MovingWheelIcon = ({ size = 20, className = "" }) => (
  <div className={`relative ${className}`} style={{ width: size, height: size, transform: 'translateX(-4px)' }}>
    {/* Speed Lines (On the Right, tighter) */}
    <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 flex flex-col gap-[2px]">
      <motion.div 
        animate={{ x: [1, -1, 1], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 0.7, repeat: Infinity }}
        className="w-2 h-[1.2px] bg-blue-400/40 rounded-full ml-auto" 
      />
      <motion.div 
        animate={{ x: [2, -2, 2], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
        className="w-4 h-[1.2px] bg-blue-400/70 rounded-full ml-auto" 
      />
      <motion.div 
        animate={{ x: [4, -3, 4], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 0.4, repeat: Infinity, delay: 0.2 }}
        className="w-6 h-[1.5px] bg-blue-400 rounded-full ml-auto" 
      />
      <motion.div 
        animate={{ x: [2, -2, 2], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }}
        className="w-4 h-[1.2px] bg-blue-400/70 rounded-full ml-auto" 
      />
      <motion.div 
        animate={{ x: [1, -1, 1], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 0.7, repeat: Infinity, delay: 0.4 }}
        className="w-2 h-[1.2px] bg-blue-400/40 rounded-full ml-auto" 
      />
    </div>
    
    {/* Wheel */}
    <motion.svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="text-blue-400"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
    >
      {/* Outer Tire */}
      <circle cx="12" cy="12" r="9.5" strokeWidth="2" />
      {/* Rim Edge */}
      <circle cx="12" cy="12" r="7" strokeWidth="1" opacity="0.5" />
      {/* Inner Hub (The 3 circles) */}
      <circle cx="12" cy="12" r="3.5" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="0.8" fill="white" />
      
      {/* Spokes */}
      <path d="M12 3.5v3.5M12 17v3.5M3.5 12h3.5M17 12h3.5" opacity="0.8" />
      <path d="M6 6l2.5 2.5M15.5 15.5l2.5 2.5M18 6l-2.5 2.5M8.5 15.5l-2.5 2.5" opacity="0.8" />
    </motion.svg>
  </div>
);

export const UpdateNotifier = () => {
  const [latestRelease, setLatestRelease] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
        if (!response.ok) throw new Error('Failed to fetch release');
        
        const data = await response.json();
        const latestVersion = data.tag_name;

        // Check if user has already skipped this specific version
        const skippedVersion = localStorage.getItem('skipped_update_version');
        
        if (latestVersion !== CURRENT_VERSION && latestVersion !== skippedVersion) {
          setLatestRelease(data);
          // Small delay before showing for better feel
          setTimeout(() => setShowPopup(true), 2000);
        }
      } catch (err) {
        console.error('Update check failed:', err);
      } finally {
        setIsChecking(false);
      }
    };

    checkUpdate();
  }, []);

  const handleDismiss = () => {
    setShowPopup(false);
  };

  const handleSkip = () => {
    if (latestRelease) {
      localStorage.setItem('skipped_update_version', latestRelease.tag_name);
    }
    setShowPopup(false);
  };

  const handleUpdate = () => {
    if (latestRelease?.html_url) {
      window.open(latestRelease.html_url, '_blank');
    }
    setShowPopup(false);
  };

  return (
    <AnimatePresence>
      {showPopup && latestRelease && (
        <motion.div
          initial={{ opacity: 0, x: 100, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, y: 100, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="fixed bottom-8 right-8 z-[10000] w-[380px] pointer-events-auto"
        >
          <div 
            className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-[#0f0f13]/95 backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_40px_rgba(59,130,246,0.15)] glass-container"
            onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
          >
            {/* Animated Glow Background */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 blur-[80px] rounded-full animate-pulse" />

            <div className="glass-content p-6 flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                    <MovingWheelIcon size={22} className="ml-1" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80">New Version Available</span>
                    <h3 className="text-lg font-black text-white tracking-tight leading-none mt-1">
                      {latestRelease.name || latestRelease.tag_name}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={handleDismiss}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all glass-container rounded-full border border-white/10 group/close"
                >
                  <X size={18} className="group-hover/close:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              {/* Release Info Content */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 w-fit">
                  <Info size={12} className="text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {CURRENT_VERSION} <ChevronRight size={10} className="inline mx-1 opacity-50" /> {latestRelease.tag_name}
                  </span>
                </div>
                
                {/* Minimalist Release Body */}
                <div className="max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                  <p className="text-[11px] leading-relaxed text-gray-400 font-medium whitespace-pre-wrap">
                    {latestRelease.body?.split('---')[0] || "Discover the latest performance optimizations and features in this release."}
                  </p>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={handleUpdate}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-[0_15px_30px_rgba(59,130,246,0.3)] transition-all active:scale-95 group"
                >
                  <Download size={14} className="group-hover:animate-bounce" />
                  Update Now
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSkip}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 font-bold text-[10px] uppercase tracking-wider transition-all border border-transparent hover:border-red-500/20"
                  >
                    Skip Version
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white font-bold text-[10px] uppercase tracking-wider transition-all border border-transparent hover:border-white/10"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
