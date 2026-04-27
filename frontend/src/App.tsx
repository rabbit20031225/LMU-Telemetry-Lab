import { useState, useEffect, useRef, memo } from 'react';
import { MapTransitionOverlay } from './components/MapTransitionOverlay';
import { useTelemetryStore } from './store/telemetryStore';
import { FileManager } from './components/FileManager';
import { TelemetryChart } from './components/TelemetryChart';
import { TrackMap } from './components/TrackMap';
import { getBrandLogoPath, getClassColor } from './utils/carHelpers';
import { ReferenceLapBrowser } from './components/ReferenceLapBrowser';
import { AnalysisLapsWidget } from './components/AnalysisLapsWidget';
import { Search } from 'lucide-react';
import { TrackMap3D } from './components/TrackMap3D';
import { LapSelect } from './components/LapSelect';
import { SessionInfo } from './components/SessionInfo';
import { LoginOverlay } from './components/LoginOverlay';
import { SteeringWheelView } from './components/SteeringWheelView';
import { SettingsOverlay } from './components/SettingsOverlay';
import { F1Dashboard } from './components/F1Dashboard';
import { Tooltip } from './components/ui/Tooltip';
import { Lab3DRoot } from './components/Lab3D/Lab3DRoot';
import { UpdateNotifier } from './components/UpdateNotifier';
import {
  ArrowLeft,
  Settings,
  Users,
  ChevronDown,
  RefreshCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  handleGlassMouseMove
} from './utils/glassEffect';




const TyreDashboard = memo(({ data, cursorIndex, carClass, tyreCompoundMax, theme = 'current', compact = false, className = "" }: { data: any, cursorIndex: number | null, carClass?: string, tyreCompoundMax?: number, theme?: 'current' | 'reference', compact?: boolean, className?: string }) => {
  const getVal = (chan: string, idx: number | null, wheelIdx: number) => {
    if (!data || idx === null || !data[chan]) return null;
    const channel = data[chan];
    if (!channel) return null;

    const baseIdx = Math.floor(idx);
    const nextIdx = Math.min(channel.length - 1, baseIdx + 1);
    const frac = idx - baseIdx;

    const v1 = channel[baseIdx]?.[wheelIdx];
    const v2 = channel[nextIdx]?.[wheelIdx];

    if (v1 === undefined) return null;
    if (v2 === undefined) return v1;
    return v1 + (v2 - v1) * frac;
  };

  const getCompoundInfo = (idx: number | null) => {
    if (idx === null || isNaN(idx)) return { label: '?', color: 'text-gray-500' };
    const roundIdx = Math.round(idx);

    if (tyreCompoundMax === 1) {
      if (roundIdx === 0) return { label: 'M', color: 'text-yellow-500' };
      if (roundIdx === 1) return { label: 'W', color: 'text-blue-500' };
    } else if (tyreCompoundMax === 2) {
      if (roundIdx === 0) return { label: 'M', color: 'text-yellow-500' };
      if (roundIdx === 1) return { label: 'H', color: 'text-white' };
      if (roundIdx === 2) return { label: 'W', color: 'text-blue-500' };
    } else if (tyreCompoundMax === 3) {
      if (roundIdx === 0) return { label: 'S', color: 'text-red-500' };
      if (roundIdx === 1) return { label: 'M', color: 'text-yellow-500' };
      if (roundIdx === 2) return { label: 'H', color: 'text-white' };
      if (roundIdx === 3) return { label: 'W', color: 'text-blue-500' };
    }

    const c = carClass?.toUpperCase() || '';
    const isHypercar = c.includes('HYPER') || c.includes('GTP') || c.includes('LMH') || c.includes('LMDH') || c.includes('LMP');

    if (isHypercar) {
      switch (roundIdx) {
        case 0: return { label: 'S', color: 'text-red-500' };
        case 1: return { label: 'M', color: 'text-yellow-500' };
        case 2: return { label: 'H', color: 'text-white' };
        case 3: return { label: 'W', color: 'text-blue-500' };
        default: return { label: '?', color: 'text-gray-500' };
      }
    } else {
      switch (roundIdx) {
        case 0: return { label: 'M', color: 'text-yellow-500' };
        case 1: return { label: 'W', color: 'text-blue-500' };
        default: return { label: 'M', color: 'text-yellow-500' };
      }
    }
  };

  const WheelInfo = ({ wheelIdx, label, className = "" }: { wheelIdx: number, label: string, className?: string }) => {
    const pressure = getVal('TyresPressure', cursorIndex, wheelIdx);
    const wear = getVal('Tyres Wear', cursorIndex, wheelIdx);
    const temp = getVal('TyresTempCentre', cursorIndex, wheelIdx);
    const brakeTemp = getVal('Brakes Temp', cursorIndex, wheelIdx);
    const tempUnit = useTelemetryStore(state => state.tempUnit);
    const compoundIdx = getVal('TyresCompound', cursorIndex, wheelIdx);
    const isDetached = getVal('WheelsDetached', cursorIndex, wheelIdx) === 1;

    const compound = getCompoundInfo(compoundIdx);
    const wearPercent = wear ? Math.round(wear) : 0;
    const wearColor = `hsl(${(wearPercent / 100) * 120}, 80%, 50%)`;

    return (
      <div
        className={`relative flex flex-col items-center ${compact ? 'p-1.5' : 'p-2.5'} rounded-xl transition-all duration-300 group/wheel glass-container-flat hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/5 min-w-0 ${className}`}
        onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
      >
        <div className="glass-content w-full flex flex-col items-center">
          {isDetached && (
            <div className={`absolute inset-0 z-20 bg-red-900/80 rounded-xl flex items-center justify-center border-2 border-red-500 animate-pulse box-content -m-0.5`}>
              <span className={`${compact ? 'text-[7px]' : 'text-[10px]'} font-black uppercase text-white drop-shadow-md`}>DETACHED</span>
            </div>
          )}

          <div className={`${compact ? 'text-[9px]' : 'text-[11px]'} font-mono font-bold text-gray-300 mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>
            {pressure ? pressure.toFixed(1) : "--"} <span className={`${compact ? 'text-[7px]' : 'text-[9px]'} text-gray-500 font-black`}>kPa</span>
          </div>

          <div className={`relative ${compact ? 'w-10 h-10' : 'w-16 h-16'} flex items-center justify-center mb-1`}>
            <svg className="absolute inset-0 w-full h-full rotate-90 scale-x-[-1]" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-white/5" />
              <circle
                cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3.5"
                className="transition-all duration-300"
                style={{ color: wearColor }}
                strokeDasharray={`${wearPercent} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center z-10">
              <span className={`${compact ? 'text-[10px]' : 'text-sm'} font-black leading-none ${compound.color} drop-shadow-md`}>{compound.label}</span>
              <span className={`${compact ? 'text-[7px]' : 'text-[9px]'} font-black text-white mt-0.5`}>{wearPercent ? `${wearPercent}%` : "--%"}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5 w-full border-t border-white/10 pt-1.5">
            <div className={`${compact ? 'text-[11px]' : 'text-sm'} font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] tracking-tight`}>
              {temp ? (tempUnit === 'f' ? temp * 1.8 + 32 : temp).toFixed(compact ? 0 : 1) : "--"}°{tempUnit === 'c' ? 'C' : 'F'}
            </div>
            {!compact && (
              <div className="flex items-center gap-1 opacity-80">
                <img src="/brake.png" width={10} height={10} alt="Brake" className="opacity-70 brightness-125" />
                <span className="text-[9px] font-bold text-gray-400 font-mono">{brakeTemp ? (tempUnit === 'f' ? brakeTemp * 1.8 + 32 : brakeTemp).toFixed(0) : "--"}°</span>
              </div>
            )}
          </div>

          <div className={`absolute -top-1 -left-1 bg-gray-800/90 text-gray-400 ${compact ? 'text-[6px] px-1' : 'text-[8px] px-1.5'} font-black py-0.5 rounded border border-white/10 uppercase tracking-tighter backdrop-blur-md`}>
            {label}
          </div>
        </div>
      </div>
    );
  };

  const isRef = theme === 'reference';
  const glowColor = isRef ? 'rgba(218, 165, 32, 0.4)' : undefined;

  return (
    <div
      className={`bg-white/10 glass-container-flat ${compact ? 'p-2 pt-6 rounded-xl' : 'p-4 pt-10 rounded-2xl'} border border-white/25 shadow-xl transition-all duration-300 relative group/tyres overflow-hidden ${className}`}
      style={{
        boxShadow: isRef ? `0 10px 25px rgba(0,0,0,0.4), inset 0 0 20px ${glowColor}` : undefined,
        borderColor: isRef ? 'rgba(218, 165, 32, 0.3)' : undefined
      }}
      onMouseMove={(e) => handleGlassMouseMove(e, 0.15)}
    >
      <div className={`absolute top-0 left-0 flex items-center gap-1.5 ${compact ? 'p-2' : 'p-3'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isRef ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'}`} />
        <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] ${isRef ? 'text-amber-500' : 'text-gray-500'} group-hover/tyres:text-white transition-colors`}>
          {isRef ? 'Ref Tyres' : 'Tyres State'}
        </span>
      </div>
      <div className="glass-content w-full">
        <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-4'}`}>
          <WheelInfo wheelIdx={0} label="FL" />
          <WheelInfo wheelIdx={1} label="FR" />
          <WheelInfo wheelIdx={2} label="RL" />
          <WheelInfo wheelIdx={3} label="RR" />
        </div>
      </div>
    </div>
  );
});

const FuelDashboard = memo(({ data, cursorIndex, fuelCapacity, theme = 'current', compact = false, className = "" }: { data: any, cursorIndex: number | null, fuelCapacity?: number, theme?: 'current' | 'reference', compact?: boolean, className?: string }) => {
  const getFuel = () => {
    if (!data || cursorIndex === null || !data['Fuel Level']) return null;
    const channel = data['Fuel Level'];
    const baseIdx = Math.floor(cursorIndex);
    const nextIdx = Math.min(channel.length - 1, baseIdx + 1);
    const frac = cursorIndex - baseIdx;

    const v1Raw = Array.isArray(channel) ? channel[baseIdx] : undefined;
    const v1 = (typeof v1Raw === 'number') ? v1Raw : (Array.isArray(v1Raw) ? v1Raw[0] : 0);
    const v2Raw = Array.isArray(channel) ? channel[nextIdx] : undefined;
    const v2 = (typeof v2Raw === 'number') ? v2Raw : (Array.isArray(v2Raw) ? v2Raw[0] : v1);

    return v1 + (v2 - v1) * frac;
  };

  const fuelVal = getFuel();
  const allFuel = data?.['Fuel Level'] || [];
  const maxFuelInData = allFuel.length > 0 ? Math.max(...allFuel) : 0;
  const effectiveCapacity = (fuelCapacity && fuelCapacity > 0) ? fuelCapacity : maxFuelInData;

  const percentage = (fuelVal && effectiveCapacity) ? Math.min(100, (fuelVal / effectiveCapacity) * 100) : 0;
  const isRef = theme === 'reference';
  const fuelColor = isRef ? `hsl(${40 + percentage * 0.1}, 100%, 45%)` : `hsl(${percentage * 1.2}, 100%, 45%)`; // Amber hue for ref
  const glowColor = isRef ? 'rgba(218, 165, 32, 0.4)' : undefined;

  return (
    <div
      className={`bg-white/10 glass-container-flat ${compact ? 'p-1.5 pt-6 rounded-xl' : 'p-4 pt-10 rounded-2xl'} border border-white/25 shadow-xl transition-all duration-300 relative group/fuel overflow-hidden ${className}`}
      style={{
        boxShadow: isRef ? `0 10px 25px rgba(0,0,0,0.4), inset 0 0 20px ${glowColor}` : undefined,
        borderColor: isRef ? 'rgba(218, 165, 32, 0.3)' : undefined
      }}
      onMouseMove={(e) => handleGlassMouseMove(e, 0.15)}
    >
      <div className={`absolute top-0 left-0 flex items-center gap-1.5 ${compact ? 'p-2' : 'p-3'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isRef ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'}`} />
        <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] ${isRef ? 'text-amber-500' : 'text-gray-500'} group-hover/fuel:text-white transition-colors`}>
          {isRef ? 'Ref Fuel' : 'Fuel'}
        </span>
      </div>
      <div className={`glass-content w-full flex items-center ${compact ? 'gap-2' : 'gap-5'}`}>
        {!compact && (
          <div className="p-2 bg-white/5 rounded-xl border border-white/10 group-hover:border-blue-500/40 group-hover:bg-white/10 transition-all">
            <img src="/fuel.png" width={22} height={22} className={`opacity-90 object-contain w-4 h-4 shrink-0 pointer-events-none ${isRef ? 'sepia hue-rotate-[320deg]' : 'brightness-110'}`} alt="Fuel" />
          </div>
        )}
        <div className="flex-1 flex flex-col gap-1">
          <div className={`${compact ? 'h-2' : 'h-3'} bg-black/40 rounded-full overflow-hidden border border-white/10`}>
            <div
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${percentage}%`,
                backgroundColor: isRef ? '#daa520' : fuelColor,
                boxShadow: `0 0 15px ${isRef ? '#daa520' : fuelColor}44`
              }}
            />
          </div>
          <div className={`${compact ? 'text-[7px]' : 'text-[9px]'} font-black text-gray-500 font-mono flex justify-between tracking-tighter uppercase`}>
            <span>0.0 L</span>
            <span>MAX: {effectiveCapacity.toFixed(0)}L</span>
          </div>
        </div>
        <div className={`flex items-baseline gap-1 ${compact ? 'min-w-[50px]' : 'min-w-[80px]'} justify-end`}>
          <span className={`${compact ? 'text-lg' : 'text-2xl'} font-black text-white font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tracking-tighter`}>
            {fuelVal !== null ? fuelVal.toFixed(compact ? 1 : 2) : "--"}
          </span>
        </div>
      </div>
    </div>
  );
});


function App() {
  const sessions = useTelemetryStore(state => state.sessions);
  const currentSessionId = useTelemetryStore(state => state.currentSessionId);
  const fetchSessions = useTelemetryStore(state => state.fetchSessions);
  const selectSession = useTelemetryStore(state => state.selectSession);
  const laps = useTelemetryStore(state => state.laps);
  const selectedLapIdx = useTelemetryStore(state => state.selectedLapIdx);
  const referenceLapIdx = useTelemetryStore(state => state.referenceLapIdx);
  const selectLap = useTelemetryStore(state => state.selectLap);
  const setReferenceLap = useTelemetryStore(state => state.setReferenceLap);
  const selectReferenceLap = useTelemetryStore(state => state.selectReferenceLap);
  const referenceLap = useTelemetryStore(state => state.referenceLap);
  const referenceTelemetryData = useTelemetryStore(state => state.referenceTelemetryData);
  const isLoading = useTelemetryStore(state => state.isLoading);
  const loadingProgress = useTelemetryStore(state => state.loadingProgress);
  const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
  const telemetryData = useTelemetryStore(state => state.telemetryData);
  const selectedStint = useTelemetryStore(state => state.selectedStint);
  const fetchStint = useTelemetryStore(state => state.fetchStint);
  const cursorIndex = useTelemetryStore(state => state.cursorIndex);
  const referenceCursorIndex = useTelemetryStore(state => state.referenceCursorIndex);
  const referenceDeltaIndex = useTelemetryStore(state => state.referenceDeltaIndex);
  const liveDeltaStore = useTelemetryStore(state => state.liveDelta);
  const isPlaying = useTelemetryStore(state => state.isPlaying);
  const updatePlayback = useTelemetryStore(state => state.updatePlayback);
  const error = useTelemetryStore(state => state.error);
  const activeProfileId = useTelemetryStore(state => state.activeProfileId);
  const profiles = useTelemetryStore(state => state.profiles);
  const fetchProfiles = useTelemetryStore(state => state.fetchProfiles);
  const showSettings = useTelemetryStore(state => state.showSettings);
  const setShowSettings = useTelemetryStore(state => state.setShowSettings);
  const dashboardSyncMode = useTelemetryStore(state => state.dashboardSyncMode);
  const setDashboardSyncMode = useTelemetryStore(state => state.setDashboardSyncMode);
  const smoothCursorIndex = useTelemetryStore(state => state.smoothCursorIndex);
  const speedUnit = useTelemetryStore(state => state.speedUnit);
  const tempUnit = useTelemetryStore(state => state.tempUnit);
  const chartConfigs = useTelemetryStore(state => state.chartConfigs);
  const isProcessingTrack = useTelemetryStore(state => state.isProcessingTrack);
  const show3DLab = useTelemetryStore(state => state.show3DLab);
  const setShow3DLab = useTelemetryStore(state => state.setShow3DLab);
  const isLeftSidebarCollapsed = useTelemetryStore(state => state.isLeftSidebarCollapsed);
  const isRightPanelCollapsed = useTelemetryStore(state => state.isRightPanelCollapsed);
  const setLeftSidebarCollapsed = useTelemetryStore(state => state.setLeftSidebarCollapsed);
  const setRightPanelCollapsed = useTelemetryStore(state => state.setRightPanelCollapsed);
  const isMapMaximized = useTelemetryStore(state => state.isMapMaximized);
  const setIsMapMaximized = useTelemetryStore(state => state.setIsMapMaximized);
  const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);

  const handleReload = () => {
    window.location.reload();
  };

    // Global Keyboard Shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // F5 / Ctrl+R for Reload
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
          e.preventDefault();
          handleReload();
        }
        
        // 'M' for Minimap Toggle (Only in maximized mode)
        if (e.key.toLowerCase() === 'm' && useTelemetryStore.getState().isMapMaximized) {
          const current = useTelemetryStore.getState().showMiniMap;
          useTelemetryStore.getState().setShowMiniMap(!current);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

  const [showLogin, setShowLogin] = useState(false);
  const activeProfile = (profiles || []).find((p: any) => p.id === activeProfileId);

  // NEW: 3D Lab Mode Detection
  const is3DLabMode = window.location.search.includes('mode=3dlab');

  // Playback loop (Smooth requestAnimationFrame)
  const lastTimeRef = useRef<number>(0);

  if (is3DLabMode) {
    return <Lab3DRoot />;
  }

  // NEW: Debug Route for Spa & Custom Sessions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debugSpa = params.get('debug') === 'spa';
    const directSessionId = params.get('session');

    if (sessions.length > 0 && !currentSessionId) {
      if (debugSpa) {
        /* 
        const spaSession = sessions.find(s => s.trackName?.toLowerCase().includes('spa') || s.id.toLowerCase().includes('spa'));
        if (spaSession) {
          selectSession(spaSession.id).then(() => {
            setShow3DLab(true);
          });
        }
        */
      } else if (directSessionId) {
        // Try to find exact match or partial match
        const target = sessions.find(s => s.id === directSessionId || s.id.includes(directSessionId));
        if (target) {
          selectSession(target.id).then(() => {
            setShow3DLab(true);
          });
        }
      }
    }
  }, [sessions, currentSessionId, selectSession, setShow3DLab]);

  useEffect(() => {
    let requestRef: number = 0;

    const animate = (time: number) => {
      if (!isPlaying) return;
      if (lastTimeRef.current !== 0) {
        const delta = time - lastTimeRef.current;
        updatePlayback(delta);
      }
      lastTimeRef.current = time;
      requestRef = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      lastTimeRef.current = performance.now();
      requestRef = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = 0;
    }

    return () => cancelAnimationFrame(requestRef);
  }, [isPlaying, updatePlayback]);

  const [showFileManager, setShowFileManager] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // States for coordinated map animations
  const [shouldRenderSidebarMap, setShouldRenderSidebarMap] = useState(true);
  const [isAnimatingSidebarMap, setIsAnimatingSidebarMap] = useState(true);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  // Remote showReferenceBrowser state moved to store
  const showReferenceBrowser = useTelemetryStore(state => state.showReferenceBrowser);
  const setShowReferenceBrowser = useTelemetryStore(state => state.setShowReferenceBrowser);
  const [shouldRenderExpandedMap, setShouldRenderExpandedMap] = useState(false);
  const [isAnimatingExpandedMap, setIsAnimatingExpandedMap] = useState(false);

  // Global Reset Effect: Synchronize all components to the lap start after major transitions
  // This mirrors the "Map Expansion" reset but applies it to lap and session switches too.
  useEffect(() => {
    if (selectedLapIdx !== null && telemetryData) {
      // Small deferred reset to ensure uPlot and charts have finished their initial render/sync cycles
      // This prevents "sync-poisoning" where new charts jump to the end of the previous lap.
      const timer = setTimeout(() => {
        selectLap(selectedLapIdx);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedLapIdx, telemetryData, isMapExpanded]);

  // Coordinated Map Transition Lifecycle
  useEffect(() => {
    if (isMapExpanded) {
      // SIDEBAR -> EXPANDED (Staggered: Resizer package starts first)
      setIsAnimatingSidebarMap(false);
      setShouldRenderExpandedMap(true);
      // Give the container/resizer a head start
      const startExpanded = setTimeout(() => setIsAnimatingExpandedMap(true), 50);
      const cleanSidebar = setTimeout(() => setShouldRenderSidebarMap(false), 450);
      return () => { clearTimeout(startExpanded); clearTimeout(cleanSidebar); };
    } else {
      // EXPANDED -> SIDEBAR
      setIsAnimatingExpandedMap(false);
      setShouldRenderSidebarMap(true);
      const startSidebar = setTimeout(() => setIsAnimatingSidebarMap(true), 50);
      const cleanExpanded = setTimeout(() => setShouldRenderExpandedMap(false), 450);
      return () => { clearTimeout(startSidebar); clearTimeout(cleanExpanded); };
    }
  }, [isMapExpanded]);

  // Auto-switch view when session changes
  useEffect(() => {
    if (currentSessionId) {
      setShowFileManager(false);
    } else {
      setShowFileManager(true);
    }
  }, [currentSessionId]);

  // Force map to expanded view when 3D mode is activated
  useEffect(() => {
    if (show3DLab && !isMapExpanded) {
      setIsMapExpanded(true);
    }
  }, [show3DLab, isMapExpanded]);

  const [isSwitchingDimension, setIsSwitchingDimension] = useState(false);
  const dimensionSwitchTimer = useRef<number | null>(null);

  // Trigger loading state for 2D/3D Dimension switching
  useEffect(() => {
    // Only trigger if we are already in expanded mode (to avoid double loading when first maximizing)
    if (isMapExpanded) {
      setIsSwitchingDimension(true);
      dimensionSwitchTimer.current = Date.now();
    }
  }, [show3DLab, isMapExpanded]); // Dependency on show3DLab

  // Dynamic clear loading state based on actual backend data completion
  useEffect(() => {
    let timer: any;
    if (isSwitchingDimension && !isLoading && !isProcessingTrack) {
      let elapsed = 0;
      if (dimensionSwitchTimer.current) {
        elapsed = Date.now() - dimensionSwitchTimer.current;
      }
      // Enforce at least 300ms display time to avoid flicker
      const remainingTime = Math.max(0, 300 - elapsed);
      timer = setTimeout(() => {
        setIsSwitchingDimension(false);
      }, remainingTime);
    }
    return () => clearTimeout(timer);
  }, [isSwitchingDimension, isLoading, isProcessingTrack]);

  // Escape key listener for Maximize Mode
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMapMaximized) {
        setIsMapMaximized(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isMapMaximized, setIsMapMaximized]);

  // Default Layout Constants
  const DEFAULT_SIDEBAR_WIDTH = 320;
  const DEFAULT_MAP_WIDTH = 350;
  const MAX_SIDEBAR_WIDTH = 500;
  const MAX_MAP_WIDTH = 600;
  const MIN_CHART_WIDTH = 520;
  const DEFAULT_TRACK_MAP_HEIGHT = 320;
  const DEFAULT_EXPANDED_MAP_HEIGHT = 400;

  // Sidebar / Map Resizing
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [mapWidth, setMapWidth] = useState(DEFAULT_MAP_WIDTH);
  const DUAL_MAP_WIDTH = 483;

  // Auto-expand/revert right panel based on reference selection
  useEffect(() => {
    const hasRef = (!!referenceTelemetryData || referenceLapIdx !== null) && (referenceCursorIndex !== null || referenceDeltaIndex !== null);
    if (!isRightPanelCollapsed) {
      if (hasRef && mapWidth < DUAL_MAP_WIDTH) {
        setMapWidth(DUAL_MAP_WIDTH);
      } else if (!hasRef && mapWidth === DUAL_MAP_WIDTH) {
        setMapWidth(DEFAULT_MAP_WIDTH);
      }
    }
  }, [referenceTelemetryData, referenceLapIdx, referenceCursorIndex, referenceDeltaIndex, isRightPanelCollapsed]);

  const [trackMapHeight, setTrackMapHeight] = useState(DEFAULT_TRACK_MAP_HEIGHT);

  const [expandedMapHeight, setExpandedMapHeight] = useState(DEFAULT_EXPANDED_MAP_HEIGHT);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [isResizingTrackMap, setIsResizingTrackMap] = useState(false);
  const [isDraggingExpandedMap, setIsDraggingExpandedMap] = useState(false);

  // Ref for uPlot instance not used yet
  // const uPlotInstance = useRef<any>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const MIN_LAP_DETAILS_HEIGHT = 310; // Header + Table ~300px
  const MIN_CHART_HEIGHT = 400; // Minimum height for chart area when expanded map is active

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Sync sessions when profile changes or on initial load
  useEffect(() => {
    if (activeProfileId) {
      fetchSessions();
    }
  }, [activeProfileId, fetchSessions]);

  // --- Pure Helper Functions ---

  const formatTime = (sec: number | undefined | null) => {
    if (sec === undefined || sec === null) return "--:--.---";
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(3).padStart(6, '0');
    return `${m}:${s}`;
  };

  const ComparisonRow = ({
    label, val, refVal, valColorClass, compact = false
  }: {
    label: React.ReactNode,
    val: number | undefined | null,
    refVal: number | undefined | null,
    valColorClass?: string,
    compact?: boolean
  }) => {
    const diff = (val != null && refVal != null) ? val - refVal : null;
    const sign = diff && diff > 0 ? "+" : "-";
    const color = diff && diff > 0 ? "text-red-500" : (diff && diff < 0 ? "text-green-500" : "text-gray-500");
    const valColor = valColorClass || "text-white";

    return (
      <div
        className={`glass-container-flat rounded-xl hover:bg-white/5 transition-all duration-300 ${compact ? 'ring-1 ring-white/5' : ''}`}
        onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
      >
        <div className={`glass-content grid ${compact ? 'grid-cols-[20px_1fr_45px_1fr] gap-1 py-1.5 px-2' : 'grid-cols-[30px_1fr_50px_1fr] gap-2 py-2.5 px-4'} items-center whitespace-nowrap cursor-default`}>
          <span className={`text-gray-500 ${compact ? 'text-[8px]' : 'text-[9px]'} font-black uppercase flex justify-center group-hover/row:text-gray-300 transition-colors`}>{label}</span>
          <span className={`${valColor} font-mono font-black ${compact ? 'text-[11px]' : 'text-[13px]'} text-left drop-shadow-sm`}>{formatTime(val)}</span>
          <span className={`${color} font-mono ${compact ? 'text-[9px]' : 'text-[11px]'} font-bold text-left`}>
            {diff != null ? `${sign}${Math.abs(diff).toFixed(3)}` : ""}
          </span>
          <span className={`text-amber-500/80 font-mono font-black ${compact ? 'text-[11px]' : 'text-[13px]'} text-left drop-shadow-sm`}>{formatTime(refVal)}</span>
        </div>
      </div>
    );
  };

  const LiveTelemetryRow = ({
    icon: Icon, label, val, refVal, color, unit = "", max: customMax, compact = false
  }: {
    icon: any, label: string, val: number | null, refVal: number | null, color: string, unit?: string, max?: number, compact?: boolean
  }) => {
    const format = (v: number | null | undefined) => {
      if (v == null || isNaN(v)) return "--";
      if (label === "Gear") return Math.round(v).toString();
      return v.toFixed(1);
    };

    const maxValues: Record<string, number> = {
      "Speed": 350,
      "Throttle": 100,
      "Brake": 100,
      "Gear": 8,
      "Steering": 180
    };

    const max = customMax || maxValues[label] || 100;
    const percent = val !== null ? Math.min(100, Math.max(0, (val / max) * 100)) : 0;
    const refPercent = refVal !== null ? Math.min(100, Math.max(0, (refVal / max) * 100)) : 0;

    return (
      <div
        className="glass-container-flat rounded-xl hover:bg-white/5 transition-all duration-300 group/teleRow"
        onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
      >
        <div className={`glass-content grid ${compact ? 'grid-cols-[14px_1fr_1fr] gap-2 py-1.5 px-2' : 'grid-cols-[18px_1fr_70px_70px] gap-2 py-2.5 px-4'} items-center cursor-default`}>
          <Icon size={compact ? 10 : 12} className="text-gray-500 group-hover/teleRow:text-blue-400 transition-colors" />
          {!compact && <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight group-hover/teleRow:text-gray-200 transition-colors">{label}</span>}

          {/* Current Value with Visualization */}
          <div className={`relative ${compact ? 'h-5' : 'h-6'} rounded-md bg-gray-800/40 overflow-hidden flex items-center justify-center border border-white/5`}>
            {label === "Steering" ? (
              <>
                <div className="absolute inset-x-1 flex items-center justify-center">
                  <div className="w-full h-[1px] bg-white/10" />
                  <div className="absolute left-1/2 w-[1px] h-2 bg-white/20 -translate-x-1/2" />
                  <div
                    className={`absolute ${compact ? 'w-[3px] h-[14px]' : 'w-[4px] h-[18px]'} shadow-sm rounded-full transition-all duration-75`}
                    style={{
                      backgroundColor: color,
                      left: `${50 + (Math.max(-1, Math.min(1, (val || 0) / max)) * 50)}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                </div>
                <span className={`relative z-10 font-mono font-bold ${compact ? 'text-[8px]' : 'text-[10px]'} text-white pointer-events-none drop-shadow-md`}>
                  {format(val)}{unit}
                </span>
              </>
            ) : (
              <>
                <div
                  className="absolute left-0 top-0 h-full transition-all duration-75 rounded-r-md"
                  style={{ width: `${percent}%`, backgroundColor: color, opacity: 0.8 }}
                />
                <span className={`relative z-10 font-mono font-bold ${compact ? 'text-[10px]' : 'text-xs'} text-white pointer-events-none drop-shadow-md`}>
                  {format(val)}{unit}
                </span>
              </>
            )}
          </div>

          {/* Reference Value */}
          <div className={`relative ${compact ? 'h-5' : 'h-6'} rounded-md bg-gray-900/40 overflow-hidden flex items-center justify-center border border-white/5`}>
            {label === "Steering" ? (
              <>
                <div className="absolute inset-x-1 flex items-center justify-center opacity-30">
                  <div className="w-full h-[1px] bg-white/10" />
                  <div className="absolute left-1/2 w-[1px] h-2 bg-white/20 -translate-x-1/2" />
                  <div
                    className="absolute w-[3px] h-[14px] shadow-sm rounded-full"
                    style={{
                      backgroundColor: color,
                      left: `${50 + (Math.max(-1, Math.min(1, (refVal || 0) / max)) * 50)}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                </div>
                <span className={`relative z-10 font-mono font-bold ${compact ? 'text-[8px]' : 'text-[9px]'} text-gray-400 pointer-events-none`}>
                  {format(refVal)}{unit}
                </span>
              </>
            ) : (
              <>
                <div
                  className="absolute left-0 top-0 h-full transition-all duration-75 rounded-r-md"
                  style={{ width: `${refPercent}%`, backgroundColor: color, opacity: 0.3 }}
                />
                <span className={`relative z-10 font-mono font-bold ${compact ? 'text-[9px]' : 'text-[11px]'} text-gray-500 pointer-events-none`}>
                  {format(refVal)}{unit}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Initial Size Calculation (Fit Lap Details)
  useEffect(() => {
    if (rightPanelRef.current) {
      const totalH = rightPanelRef.current.clientHeight;
      const optimalMapH = totalH - MIN_LAP_DETAILS_HEIGHT;
      // Ensure it's reasonable
      if (optimalMapH > 150) {
        setTrackMapHeight(optimalMapH);
      }
    }
  }, [rightPanelRef.current?.clientHeight, selectedLapIdx]); // Add selectedLapIdx to trigger when view appears

  // Auto-show file manager if no session is active
  useEffect(() => {
    if (!currentSessionId) {
      setShowFileManager(true);
    }
  }, [currentSessionId]);

  // Handle Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) { // Updated state name
        setSidebarWidth(Math.max(DEFAULT_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX))); // Adjusted min/max
      }
      if (isDraggingMap) {
        // Map is on the right, so width is windowWidth - clientX
        const newWidth = window.innerWidth - e.clientX;
        setMapWidth(Math.max(DEFAULT_MAP_WIDTH, Math.min(MAX_MAP_WIDTH, newWidth)));
      }
      if (isResizingTrackMap) { // NEW
        const totalH = rightPanelRef.current?.clientHeight || 800;
        const maxH = totalH - MIN_LAP_DETAILS_HEIGHT;
        setTrackMapHeight(prev => {
          const next = prev + e.movementY;
          return Math.max(150, Math.min(maxH, next));
        });
      }
      if (isDraggingExpandedMap) {
        setExpandedMapHeight(prev => {
          const next = prev + e.movementY;
          // Keep it between 150px and roughly 70vh
          return Math.max(150, Math.min(window.innerHeight * 0.7, next));
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false); // Updated state name
      setIsDraggingMap(false);
      setIsResizingTrackMap(false); // NEW
      setIsDraggingExpandedMap(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = ''; // Reset user-select
      document.body.style.webkitUserSelect = ''; // Reset webkit-user-select
    };

    if (isResizingSidebar || isDraggingMap || isResizingTrackMap || isDraggingExpandedMap) { // Updated condition
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = (isResizingTrackMap || isDraggingExpandedMap) ? 'row-resize' : 'col-resize'; // Conditional cursor
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none'; // For Safari compatibility if needed, though mostly standard now
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isResizingSidebar, isDraggingMap, isResizingTrackMap, isDraggingExpandedMap]);


  return (
    <div className="flex h-screen bg-black text-gray-100 overflow-hidden font-sans">
      {/* Sidebar - Data Controls */}
      <div
        className={`h-full bg-[#111115] border-r border-[#1f1f26] flex flex-col flex-shrink-0 relative overflow-hidden group/sidebar transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isMapMaximized ? 'hidden' : ''}`}
        style={{
          width: isLeftSidebarCollapsed ? 0 : sidebarWidth,
          minWidth: isLeftSidebarCollapsed ? 0 : DEFAULT_SIDEBAR_WIDTH,
          maxWidth: isLeftSidebarCollapsed ? 0 : MAX_SIDEBAR_WIDTH,
          opacity: isLeftSidebarCollapsed ? 0 : 1,
          borderRightWidth: isLeftSidebarCollapsed ? 0 : 1,
          transition: isResizingSidebar ? 'none' : undefined
        }}
      >
        {!showFileManager ? (
          <>
            {/* Scrollable Main Sidebar Content */}
            <div className="flex-1 overflow-y-scroll custom-scrollbar flex flex-col min-h-0 pb-2 pl-4 pr-[10px]">
              {/* Session Info (Top of Sidebar) */}
              {sessionMetadata && (
                <SessionInfo
                  sessionMetadata={sessionMetadata}
                  referenceMetadata={referenceSessionMetadata}
                />
              )}
              {/* Lap Controls (Middle of Sidebar) */}
              {currentSessionId && laps.length > 0 && (
                <div className="mb-3 p-4 glass-container glass-expand-pixel rounded-2xl border border-white/25 flex flex-col gap-3 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-300 group/analysis" onMouseMove={handleGlassMouseMove}>
                  <div className="glass-content size-full flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-gray-500 text-[12px] font-black uppercase tracking-[0.2em] px-1 group-hover/analysis:text-white transition-colors">Analysis Laps</h3>
                    </div>
                    
                    <AnalysisLapsWidget />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto p-4 border-t border-white/5 bg-transparent">
              <button
                onClick={() => setShowFileManager(true)}
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-gray-500 rounded-2xl border border-white/10 shadow-lg flex items-center justify-center gap-2 font-black text-[12px] uppercase tracking-[0.2em] transition-all hover:text-white ring-1 ring-inset ring-white/5 glass-container group"
                onMouseMove={handleGlassMouseMove}
              >
                <div className="glass-content flex items-center justify-center gap-2 w-full">
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  Data Sources
                </div>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <FileManager />
            </div>
            {currentSessionId && (
              <div className="mt-auto p-4 border-t border-white/5 bg-transparent">
                <button
                  onClick={() => setShowFileManager(false)}
                  className="w-full py-3 px-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.2)] flex items-center justify-center font-black text-[10px] uppercase tracking-[0.2em] transition-all ring-1 ring-inset ring-blue-400/20 glass-container group"
                  onMouseMove={handleGlassMouseMove}
                >
                  <div className="glass-content flex items-center justify-center w-full">
                    Return to Active Session
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Tooltip text={isLeftSidebarCollapsed ? "" : "DOUBLE-CLICK TO RESET"} position="right">
        <div
          className={`w-1.5 flex justify-center items-center group/sidebar-resizer relative z-50 h-full transition-all duration-300 ${isMapMaximized ? 'hidden' : ''} ${isLeftSidebarCollapsed ? 'cursor-default' : 'cursor-col-resize'}`}
          onMouseDown={() => !isLeftSidebarCollapsed && setIsResizingSidebar(true)}
          onDoubleClick={() => !isLeftSidebarCollapsed && setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
        >
          <div className={`w-1 h-[60%] bg-white/10 backdrop-blur-3xl rounded-full transition-all duration-300 border border-white/20 group-hover/sidebar-resizer:h-full group-hover/sidebar-resizer:bg-blue-500 group-hover/sidebar-resizer:w-1.5 relative overflow-hidden ${isLeftSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-transparent via-white/30 to-transparent translate-y-[-100%] group-hover/sidebar-resizer:translate-y-[100%] transition-transform duration-1000" />
          </div>

          {/* Left Collapse Button */}
          <button
            onClick={() => setLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
            className={`absolute top-20 z-[60] w-5 h-12 flex items-center justify-center bg-blue-600 border border-blue-400 group/collapse-btn shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-500 ${isLeftSidebarCollapsed ? 'left-0 rounded-r-xl scale-110 translate-x-0' : 'left-1/2 -translate-x-1/2 rounded-full opacity-0 group-hover/sidebar-resizer:opacity-100 hover:scale-110 hover:bg-blue-500'}`}
          >
            <Tooltip text={isLeftSidebarCollapsed ? "EXPAND" : "COLLAPSE"} position="right" delay={100}>
              <div className="w-full h-full flex items-center justify-center">
                {isLeftSidebarCollapsed ? (
                  <ChevronRight size={12} className="text-white animate-pulse" />
                ) : (
                  <ChevronLeft size={12} className="text-white" />
                )}
              </div>
            </Tooltip>
          </button>
        </div>
      </Tooltip>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-gray-900 min-w-0 relative">
        {/* Top Navbar */}
        <div className={`bg-[#111115] border-b border-[#1f1f26] flex items-center justify-between px-6 py-2 flex-shrink-0 h-14 ${isMapMaximized ? 'hidden' : ''}`}>
          {/* Logo / Title */}
          <div
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-300 hover:bg-white/5 glass-container group/logo cursor-pointer"
            onMouseMove={handleGlassMouseMove}
          >
            <div className="glass-content flex items-center gap-3">
              <img
                src="/lmu_logo.png"
                alt="Logo"
                className="h-8 object-contain select-none group-hover/logo:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all"
              />
              <span className="text-gray-500 font-bold text-sm select-none">|</span>
              <span className="text-gray-400 font-bold text-sm uppercase tracking-widest select-none group-hover/logo:text-white transition-colors">Telemetry View</span>
            </div>
          </div>

          {/* Right Side: Account / Profile Switcher */}
          <div className="flex items-center gap-3">
            {/* 2D/3D Dimension Toggle - NAVBAR INTEGRATION */}
            {selectedLapIdx !== null && (
              <div className="relative flex items-center p-1 bg-[#1a1a1e]/60 backdrop-blur-md rounded-xl border border-white/10 glass-container mr-3 h-8 w-28 overflow-hidden group/toggle" onMouseMove={handleGlassMouseMove}>
                {/* Sliding Indicator Pill */}
                <div 
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
                  style={{ left: !show3DLab ? '4px' : 'calc(50%)' }}
                />
                
                <button
                  onClick={() => setShow3DLab(false)}
                  className={`relative z-10 flex-1 h-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${!show3DLab ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  2D
                </button>
                <button
                  onClick={() => setShow3DLab(true)}
                  className={`relative z-10 flex-1 h-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${show3DLab ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  3D
                </button>
              </div>
            )}

            <Tooltip text="SWITCH IDENTITY OR DATA CATEGORY (E.G. TRACKS, CARS)" position="bottom">
              <div className="relative group/user">
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 glass-container rounded-2xl border border-white/10 transition-all duration-300"
                  onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
                >
                  <div className="glass-content flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden ${activeProfile?.avatar_url ? '' : 'bg-blue-500/20 border border-blue-500/40 text-blue-400'}`}>
                      {activeProfile?.avatar_url ? (
                        <img
                          src={activeProfile.avatar_url.startsWith('http') ? activeProfile.avatar_url : `${window.location.protocol}//${window.location.hostname}:8000${activeProfile.avatar_url}`}
                          alt={activeProfile?.name || 'Avatar'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.classList.add('bg-blue-500/20', 'border', 'border-blue-500/40', 'text-blue-400');
                          }}
                        />
                      ) : (
                        <Users size={14} />
                      )}
                    </div>
                    <div className="flex flex-col items-start leading-none pr-1">
                      <span className="text-[10px] font-black text-white/90 uppercase tracking-widest">{activeProfile?.name || 'IDENTITY / CATEGORY'}</span>
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Workspace Environment</span>
                    </div>
                    <ChevronDown size={11} className="text-gray-500 group-hover/user:text-blue-400 transition-colors" />
                  </div>
                </button>
              </div>
            </Tooltip>

            <Tooltip text="HARD RELOAD (F5)" position="bottom">
              <button
                className="text-gray-500 hover:text-blue-400 transition-all glass-container p-2 rounded-xl border border-transparent hover:bg-white/5 active:scale-95 group/reload"
                onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
                onClick={handleReload}
              >
                <div className="glass-content">
                  <RefreshCcw size={18} className="group-hover/reload:rotate-180 transition-all duration-700" />
                </div>
              </button>
            </Tooltip>

            <Tooltip text="SETTINGS" position="bottom">
              <button
                className="text-gray-500 hover:text-white transition-all glass-container p-2 rounded-xl border border-transparent hover:bg-white/5 active:scale-95 group/settings"
                onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
                onClick={() => setShowSettings(true)}
              >
                <div className="glass-content">
                  <Settings size={18} className="group-hover/settings:rotate-180 transition-all duration-700" />
                </div>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Main Content Area Body */}
        <div className="flex-1 flex flex-row min-h-0 relative">
          <div className="flex-1 flex flex-row min-h-0 min-w-0">
            {/* Telemetry Charts Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">
              {isLoading && (
                <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-[2px] z-[100] flex items-center justify-center transition-all duration-300">
                  <div className="flex flex-col items-center gap-4 bg-gray-900/80 p-8 rounded-2xl border border-gray-700/50 shadow-2xl scale-in-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full" />
                      <div className="absolute top-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-lg font-black text-white uppercase tracking-widest">Loading Telemetry</span>
                      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest opacity-60 text-center max-w-[200px] leading-tight">
                        Larger data files may take longer to initialize...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedLapIdx !== null ? (
                <div className="flex flex-col flex-1 h-full">
                  {shouldRenderExpandedMap && (
                    <div
                      className={`flex flex-col relative flex-shrink-0 origin-top overflow-hidden min-h-0 ${isMapMaximized ? 'fixed inset-0 z-[2000] p-0' : 'px-4 p-2'} ${isDraggingExpandedMap ? '' : 'transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]'}`}
                      style={{
                        height: isMapMaximized ? '100vh' : (isAnimatingExpandedMap ? expandedMapHeight + 52 : 0),
                        opacity: isAnimatingExpandedMap ? 1 : 0,
                        transform: isMapMaximized ? 'none' : (isAnimatingExpandedMap ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)'),
                        willChange: 'transform, height, opacity',
                        transition: isDraggingExpandedMap ? 'none' : undefined
                      }}
                    >
                      <div className="flex-1 relative min-h-0">
                        {/* Loading Overlay for Dimension Switching */}
                        <MapTransitionOverlay isVisible={isSwitchingDimension} />
                        {show3DLab ? (
                          <TrackMap3D 
                            key={`expanded-${currentSessionId}`}
                            onToggleExpand={() => setIsMapExpanded(false)} 
                          />
                        ) : (
                          <TrackMap
                            key={`expanded-${currentSessionId}`}
                            isExpanded={isMapExpanded}
                            onToggleExpand={() => setIsMapExpanded(false)}
                            isAnimating={!isAnimatingExpandedMap}
                          />
                        )}
                      </div>
                      <Tooltip text="DOUBLE-CLICK TO RESET" position="top">
                        <div
                          className={`w-full h-2 pt-3 pb-0 flex justify-center items-center cursor-row-resize group/resizer relative z-20 ${isMapMaximized ? 'hidden' : ''}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setIsDraggingExpandedMap(true);
                          }}
                          onDoubleClick={() => setExpandedMapHeight(DEFAULT_EXPANDED_MAP_HEIGHT)}
                        >
                          <div className="h-1.5 w-24 bg-white/10 backdrop-blur-3xl rounded-full transition-all duration-300 border border-white/20 group-hover/resizer:w-36 group-hover/resizer:bg-blue-500 group-hover/resizer:scale-110 relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover/resizer:translate-x-[100%] transition-transform duration-1000" />
                          </div>
                        </div>
                      </Tooltip>
                    </div>
                  )}

                  <div
                    className="flex-1 min-w-0 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar"
                    style={{ minWidth: MIN_CHART_WIDTH }}
                  >
                    <div className="flex flex-col gap-2 min-w-0">
                      {chartConfigs
                        .filter(c => c.visible && (c.id !== 'Time Delta' || referenceLapIdx !== null || referenceLap !== null))
                        .sort((a, b) => a.order - b.order)
                        .map(config => (
                          <TelemetryChart
                            key={config.id}
                            channel={config.id}
                            alias={config.alias}
                            color={config.color}
                            height={config.height}
                            syncKey="telemetry"
                            unit={config.unit}
                            isPlaying={isPlaying}
                            showLapTime={config.id === 'Ground Speed' || config.id === 'Speed'}
                          />
                        ))
                      }
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <p className="text-xl mb-2">No Lap Selected</p>
                  <p className="text-sm">Select a session from the sidebar to begin.</p>
                </div>
              )}
            </div>

            {/* Right: Map & Stats */}
            {selectedLapIdx !== null && (
              <>
                <Tooltip text={isRightPanelCollapsed ? "" : "DOUBLE-CLICK TO RESET"} position="left">
                  <div
                    className={`w-1.5 flex justify-center items-center group/right-resizer relative z-50 h-full transition-all duration-300 ${isMapMaximized ? 'hidden' : ''} ${isRightPanelCollapsed ? 'cursor-default' : 'cursor-col-resize'}`}
                    onMouseDown={() => !isRightPanelCollapsed && setIsDraggingMap(true)}
                    onDoubleClick={() => {
                      if (isRightPanelCollapsed) return;
                      const hasRef = (!!referenceTelemetryData || referenceLapIdx !== null) && (referenceCursorIndex !== null || referenceDeltaIndex !== null);
                      setMapWidth(hasRef ? DUAL_MAP_WIDTH : DEFAULT_MAP_WIDTH);
                    }}
                  >
                    <div className={`w-1 h-[60%] bg-white/10 backdrop-blur-3xl rounded-full transition-all duration-300 border border-white/20 group-hover/right-resizer:h-full group-hover/right-resizer:bg-blue-500 group-hover/right-resizer:w-1.5 relative overflow-hidden ${isRightPanelCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                      <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-transparent via-white/30 to-transparent translate-y-[-100%] group-hover/right-resizer:translate-y-[100%] transition-transform duration-1000" />
                    </div>

                    {/* Right Collapse Button */}
                    <button
                      onClick={() => setRightPanelCollapsed(!isRightPanelCollapsed)}
                      className={`absolute top-20 z-[60] w-5 h-12 flex items-center justify-center bg-blue-600 border border-blue-400 group/collapse-btn shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-500 ${isRightPanelCollapsed ? 'right-0 rounded-l-xl scale-110 translate-x-0' : 'left-1/2 -translate-x-1/2 rounded-full opacity-0 group-hover/right-resizer:opacity-100 hover:scale-110 hover:bg-blue-500'}`}
                    >
                      <Tooltip text={isRightPanelCollapsed ? "EXPAND" : "COLLAPSE"} position="left" delay={100}>
                        <div className="w-full h-full flex items-center justify-center">
                          {isRightPanelCollapsed ? (
                            <ChevronLeft size={12} className="text-white animate-pulse" />
                          ) : (
                            <ChevronRight size={12} className="text-white" />
                          )}
                        </div>
                      </Tooltip>
                    </button>
                  </div>
                </Tooltip>

                <div
                  ref={rightPanelRef}
                  className={`border-l border-gray-800 bg-gray-950 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isMapMaximized ? 'hidden' : ''}`}
                  style={{
                    width: isRightPanelCollapsed ? 0 : mapWidth,
                    minWidth: isRightPanelCollapsed ? 0 : DEFAULT_MAP_WIDTH,
                    maxWidth: isRightPanelCollapsed ? 0 : MAX_MAP_WIDTH,
                    opacity: isRightPanelCollapsed ? 0 : 1,
                    borderLeftWidth: isRightPanelCollapsed ? 0 : 1,
                    transition: isDraggingMap ? 'none' : undefined
                  }}
                >
                  <div
                    className={`flex flex-col relative flex-shrink-0 origin-top px-4 overflow-hidden p-2 min-h-0 ${shouldRenderSidebarMap ? 'my-3' : 'my-0'} ${isResizingTrackMap ? '' : 'transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]'}`}
                    style={{
                      height: isAnimatingSidebarMap ? trackMapHeight + 52 : 0,
                      opacity: isAnimatingSidebarMap ? 1 : 0,
                      transform: isAnimatingSidebarMap ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
                      willChange: 'transform, opacity, height',
                      transition: isResizingTrackMap ? 'none' : undefined
                    }}
                  >
                    {shouldRenderSidebarMap && (
                      <>
                        <div className="flex-1 relative min-h-0">
                          <TrackMap
                            key={`sidebar-${currentSessionId}`}
                            isExpanded={false}
                            onToggleExpand={() => setIsMapExpanded(true)}
                            isMiniMap={false}
                            isAnimating={!isAnimatingSidebarMap}
                          />
                        </div>
                        <Tooltip text="DOUBLE-CLICK TO RESET" position="top">
                          <div
                            className="w-full h-2 pt-4 pb-0 flex justify-center items-center cursor-row-resize group/sidebar-resizer relative z-50"
                            onMouseDown={() => setIsResizingTrackMap(true)}
                            onDoubleClick={() => setTrackMapHeight(DEFAULT_TRACK_MAP_HEIGHT)}
                          >
                            <div className="h-1.5 w-24 bg-white/10 backdrop-blur-3xl rounded-full transition-all duration-300 border border-white/20 group-hover/sidebar-resizer:w-36 group-hover/sidebar-resizer:bg-blue-500 group-hover/sidebar-resizer:scale-110 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover/sidebar-resizer:translate-x-[100%] transition-transform duration-1000" />
                            </div>
                          </div>
                        </Tooltip>
                      </>
                    )}
                  </div>

                  <div className="pl-4 pr-[10px] pt-4 pb-4 flex-1 overflow-y-auto custom-scrollbar min-h-0 bg-transparent flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-gray-500 text-[12px] font-black uppercase tracking-[0.2em] px-1 whitespace-nowrap">Lap Details</h3>
                      <div className="h-[1px] flex-1 bg-white/10 relative overflow-hidden group/linkage">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[sweep_3s_infinite]" />
                      </div>
                    </div>

                    {selectedLapIdx !== null ? (
                      (() => {
                        const currentLap = laps.find(l => l.lap === selectedLapIdx);
                        const isCrossSession = !!referenceLap && !!referenceTelemetryData;
                        const refLap = isCrossSession ? referenceLap : (referenceLapIdx !== null ? laps.find(l => l.lap === referenceLapIdx) : null);

                        const getVal = (chan: string, idx: number | null, isRefSource: boolean = false) => {
                          const source = isRefSource && referenceTelemetryData ? referenceTelemetryData : telemetryData;
                          if (!source || !source[chan] || idx === null) return null;

                          const channel = source[chan];
                          if (!Array.isArray(channel)) return null;
                          const baseIdx = Math.floor(idx);
                          const nextIdx = Math.min(channel.length - 1, baseIdx + 1);
                          const frac = idx - baseIdx;

                          const v1 = channel[baseIdx];
                          const v2 = channel[nextIdx];

                          if (v1 === undefined) return null;
                          if (v2 === undefined) return v1;
                          return v1 + (v2 - v1) * frac;
                        };

                        const getMax = (arr: any) => {
                          if (!arr || arr.length === 0) return 0;
                          let m = -Infinity;
                          for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
                          return m;
                        };

                        const maxSpeed = (telemetryData?.['Ground Speed'] && Array.isArray(telemetryData['Ground Speed'])) ? getMax(telemetryData['Ground Speed']) : 300;
                        const maxGear = (telemetryData?.['Gear'] && Array.isArray(telemetryData['Gear'])) ? getMax(telemetryData['Gear']) : 8;
                        const refIdx = dashboardSyncMode === 'time' ? referenceCursorIndex : referenceDeltaIndex;
                        const hasRef = (!!referenceTelemetryData || referenceLapIdx !== null) && refIdx !== null;
                        const refData = referenceTelemetryData || telemetryData;
                        const refMeta = referenceSessionMetadata || sessionMetadata;

                        return (
                          <div className="min-w-max flex flex-col gap-3">
                            <div className={hasRef ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
                              <div
                                className={`bg-white/10 glass-container-flat ${hasRef ? 'p-2 pt-6' : 'p-4 pt-10'} rounded-2xl border border-white/25 shadow-xl hover:bg-white/15 transition-all relative group/laptime`}
                                onMouseMove={handleGlassMouseMove}
                              >
                                <div className={`absolute top-0 left-0 flex items-center gap-2 ${hasRef ? 'p-2' : 'p-4'}`}>
                                  <span className={`${hasRef ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] text-gray-500 group-hover/laptime:text-white transition-colors`}>Lap Time</span>
                                </div>
                                <div className="glass-content flex flex-col gap-2">
                                  {!hasRef && (
                                    <div className="grid grid-cols-[30px_1fr_50px_1fr] gap-2 mb-2 border-b border-white/10 pb-2 px-4">
                                      <div />
                                      <div className="text-[11px] text-blue-400 font-black uppercase tracking-wider text-left">Current</div>
                                      <div className="text-[11px] text-gray-500 font-black uppercase tracking-wider text-left">Delta</div>
                                      <div className="text-[11px] text-amber-500 font-black uppercase tracking-wider text-left">Reference</div>
                                    </div>
                                  )}
                                  <div className="flex flex-col gap-1.5">
                                    <ComparisonRow label={<img src="/finish-flag.png" width={hasRef ? 12 : 16} height={hasRef ? 12 : 16} className="opacity-70" alt="Flag" />} val={currentLap?.duration} refVal={(refLap as any)?.duration} compact={hasRef} />
                                    <ComparisonRow label="S1" val={currentLap?.s1} refVal={(refLap as any)?.s1} valColorClass="text-gray-300" compact={hasRef} />
                                    <ComparisonRow label="S2" val={currentLap?.s2} refVal={(refLap as any)?.s2} valColorClass="text-gray-300" compact={hasRef} />
                                    <ComparisonRow label="S3" val={currentLap?.s3} refVal={(refLap as any)?.s3} valColorClass="text-gray-300" compact={hasRef} />
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`bg-white/10 glass-container-flat ${hasRef ? 'p-2 pt-6' : 'p-4 pt-10'} rounded-2xl border border-white/25 shadow-xl hover:bg-white/15 transition-all relative group/telemetry`}
                                onMouseMove={handleGlassMouseMove}
                              >
                                <div className={`absolute top-0 left-0 w-full flex items-center justify-between ${hasRef ? 'p-2' : 'p-4'} mix-blend-screen`}>
                                  <span className={`${hasRef ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] text-gray-500 group-hover/telemetry:text-white transition-colors`}>Live Telemetry</span>

                                  <div className={`${hasRef ? 'px-1.5 py-0.5 text-[8px]' : 'px-2.5 py-1 text-[10px]'} bg-black/40 rounded-lg font-mono font-black border border-white/10 flex items-center gap-1 backdrop-blur-md`}>
                                    <img src="/delta.png" width={hasRef ? 8 : 10} height={hasRef ? 8 : 10} className="opacity-60" alt="Delta" />
                                    <span className={liveDeltaStore !== null ? (liveDeltaStore > 0 ? 'text-red-400' : 'text-green-400') : 'text-gray-500'}>
                                      {liveDeltaStore !== null ? (liveDeltaStore >= 0 ? '+' : '-') + Math.abs(liveDeltaStore).toFixed(3) : "---"}
                                    </span>
                                  </div>
                                </div>
                                <div className="glass-content">
                                  <div className="flex flex-col gap-1.5">
                                    <LiveTelemetryRow icon={({ size, className }: any) => <img src="/speed.png" width={hasRef ? 10 : size} height={hasRef ? 10 : size} className={className} alt="S" />} label="Speed" color={chartConfigs.find(c => c.id === 'Ground Speed' || c.id === 'Speed')?.color || '#00aaff'} unit={speedUnit === 'kmh' ? "kmh" : "mph"} max={speedUnit === 'kmh' ? maxSpeed : maxSpeed * 0.621371} val={getVal('Ground Speed', cursorIndex)} refVal={getVal('Ground Speed', refIdx, true)} compact={hasRef} />
                                    <LiveTelemetryRow icon={({ size, className }: any) => <img src="/throttle.png" width={hasRef ? 10 : size} height={hasRef ? 10 : size} className={className} alt="T" />} label="Throttle" color={chartConfigs.find(c => c.id === 'Throttle Pos' || c.id === 'Throttle')?.color || '#00ff00'} unit="%" val={getVal('Throttle Pos', cursorIndex)} refVal={getVal('Throttle Pos', refIdx, true)} compact={hasRef} />
                                    <LiveTelemetryRow icon={({ size, className }: any) => <img src="/brake.png" width={hasRef ? 10 : size} height={hasRef ? 10 : size} className={className} alt="B" />} label="Brake" color={chartConfigs.find(c => c.id === 'Brake Pos' || c.id === 'Brake')?.color || '#ff0000'} unit="%" val={getVal('Brake Pos', cursorIndex)} refVal={getVal('Brake Pos', refIdx, true)} compact={hasRef} />
                                    <LiveTelemetryRow icon={({ size, className }: any) => <img src="/gear.png" width={hasRef ? 10 : size} height={hasRef ? 10 : size} className={className} alt="G" />} label="Gear" color={chartConfigs.find(c => c.id === 'Gear')?.color || '#ffaa00'} max={maxGear} val={getVal('Gear', cursorIndex)} refVal={getVal('Gear', refIdx, true)} compact={hasRef} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {hasRef && (
                              <div className="relative flex items-center p-1 bg-black/30 rounded-xl border border-white/10 self-center w-48 h-8 overflow-hidden group/sync-toggle" onMouseMove={handleGlassMouseMove}>
                                {/* Sliding Indicator Pill */}
                                <div 
                                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
                                  style={{ left: dashboardSyncMode === 'distance' ? '4px' : 'calc(50%)' }}
                                />
                                
                                <button
                                  onClick={() => setDashboardSyncMode('distance')}
                                  className={`relative z-10 flex-1 h-full flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${dashboardSyncMode === 'distance' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                  Distance Sync
                                </button>
                                <button
                                  onClick={() => setDashboardSyncMode('time')}
                                  className={`relative z-10 flex-1 h-full flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${dashboardSyncMode === 'time' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                  Time Sync
                                </button>
                              </div>
                            )}

                            <div className={hasRef ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
                              <F1Dashboard data={telemetryData} cursorIndex={smoothCursorIndex ?? cursorIndex} theme="current" compact={hasRef} />
                              {hasRef && <F1Dashboard data={refData} cursorIndex={refIdx} theme="reference" compact={hasRef} />}
                            </div>

                            <div className={hasRef ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
                              <SteeringWheelView data={telemetryData} cursorIndex={smoothCursorIndex ?? cursorIndex} carModel={sessionMetadata?.modelName} theme="current" compact={hasRef} />
                              {hasRef && <SteeringWheelView data={refData} cursorIndex={refIdx} carModel={refMeta?.modelName} theme="reference" compact={hasRef} />}
                            </div>

                            <div className={hasRef ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
                              <TyreDashboard data={telemetryData} cursorIndex={smoothCursorIndex ?? cursorIndex} carClass={sessionMetadata?.carClass} tyreCompoundMax={sessionMetadata?.tyreCompoundMax} theme="current" compact={hasRef} />
                              {hasRef && <TyreDashboard data={refData} cursorIndex={refIdx} carClass={refMeta?.carClass} tyreCompoundMax={refMeta?.tyreCompoundMax} theme="reference" compact={hasRef} />}
                            </div>

                            <div className={hasRef ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
                              <FuelDashboard data={telemetryData} cursorIndex={smoothCursorIndex ?? cursorIndex} fuelCapacity={sessionMetadata?.fuelCapacity} theme="current" compact={hasRef} />
                              {hasRef && <FuelDashboard data={refData} cursorIndex={refIdx} fuelCapacity={refMeta?.fuelCapacity} theme="reference" compact={hasRef} />}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-gray-500 text-sm italic border-t border-gray-800 pt-4">Select a lap to view details</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-red-500/20 border border-red-500/50 px-6 py-3 rounded-full shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-200 text-sm font-black tracking-tight uppercase">System Error:</span>
              <span className="text-white/90 text-sm font-bold">{error}</span>
              <button
                onClick={() => useTelemetryStore.setState({ error: null })}
                className="ml-4 text-white/40 hover:text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}
        {/* Profile/Login Overlay - Fullscreen Block if no profile selected */}
        {(showLogin || !activeProfileId) && (
          <LoginOverlay
            onClose={activeProfileId ? () => setShowLogin(false) : undefined}
          />
        )}
        <SettingsOverlay />
        {showReferenceBrowser && (
          <ReferenceLapBrowser onClose={() => setShowReferenceBrowser(false)} />
        )}
        <UpdateNotifier />
      </div>
    </div>
  );
}

export default App;
