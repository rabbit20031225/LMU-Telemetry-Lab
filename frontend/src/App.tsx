import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapTransitionOverlay } from './components/MapTransitionOverlay';
import { useTelemetryStore, CATEGORY_CHART_CONFIGS } from './store/telemetryStore';
import { FileManager } from './components/FileManager';
import { TelemetryChart } from './components/TelemetryChart';
import { TrackMap } from './components/TrackMap';
import { LapDetailsPanel } from './components/LapDetailsPanel';
import { getBrandLogoPath, getClassColor } from './utils/carHelpers';
import { ReferenceLapBrowser } from './components/ReferenceLapBrowser';
import packageJson from '../package.json';
import { AnalysisLapsWidget } from './components/AnalysisLapsWidget';
import trackSegments from './assets/track_segments.json';
import { Search } from 'lucide-react';
import { TrackMap3D } from './components/TrackMap3D';
import { LapSelect } from './components/LapSelect';
import { SessionInfo } from './components/SessionInfo';
import { LoginOverlay } from './components/LoginOverlay';
import { SteeringWheelView } from './components/SteeringWheelView';
import { SettingsOverlay } from './components/SettingsOverlay';
import { CarSelectionOverlay } from './components/CarSelectionOverlay';
import { F1Dashboard } from './components/F1Dashboard';
import { Tooltip } from './components/ui/Tooltip';
import { GForceRadar } from './components/GForceRadar';
import { Lab3DRoot } from './components/Lab3D/Lab3DRoot';
import { UpdateNotifier } from './components/UpdateNotifier';
import { CarSetupView } from './components/CarSetupView';
import {
  ArrowLeft,
  Settings,
  Users,
  Database,
  ChevronDown,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  PackageCheck,
  Loader2
} from 'lucide-react';
import {
  handleGlassMouseMove
} from './utils/glassEffect';





const CategoryTab = memo(({ id, label, isActive }: { id: any, label: string, isActive: boolean }) => {
    const setActiveChartCategory = useTelemetryStore(state => state.setActiveChartCategory);

    return (
        <button
            onClick={() => setActiveChartCategory(id)}
            className={`relative z-10 px-8 h-full flex items-center justify-center text-[11px] font-black uppercase tracking-[0.1em] transition-colors duration-300 flex-1 min-w-[120px] ${
                isActive ? 'text-white' : 'text-gray-500 hover:text-white'
            }`}
        >
            {label}
        </button>
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
  const setActiveChartCategory = useTelemetryStore(state => state.setActiveChartCategory);
  const activeChartCategory = useTelemetryStore(state => state.activeChartCategory);
  const liveDeltaStore = useTelemetryStore(state => state.liveDelta);
  const isPlaying = useTelemetryStore(state => state.isPlaying);
  const updatePlayback = useTelemetryStore(state => state.updatePlayback);
  const error = useTelemetryStore(state => state.error);
  const activeProfileId = useTelemetryStore(state => state.activeProfileId);
  const profiles = useTelemetryStore(state => state.profiles);
  const fetchProfiles = useTelemetryStore(state => state.fetchProfiles);
  const showSettings = useTelemetryStore(state => state.showSettings);
  const setShowSettings = useTelemetryStore(state => state.setShowSettings);
  const showCarSelection = useTelemetryStore(state => state.showCarSelection);
  const dashboardSyncMode = useTelemetryStore(state => state.dashboardSyncMode);
  const setDashboardSyncMode = useTelemetryStore(state => state.setDashboardSyncMode);
  const speedUnit = useTelemetryStore(state => state.speedUnit);
  const tempUnit = useTelemetryStore(state => state.tempUnit);
  const chartConfigs = useTelemetryStore(state => state.chartConfigs);
  const isProcessingTrack = useTelemetryStore(state => state.isProcessingTrack);
  const show3DLab = useTelemetryStore(state => state.show3DLab);
  const setShow3DLab = useTelemetryStore(state => state.setShow3DLab);
  const showMiniSectors = useTelemetryStore(state => state.showMiniSectors);
  const setShowMiniSectors = useTelemetryStore(state => state.setShowMiniSectors);
  const isLeftSidebarCollapsed = useTelemetryStore(state => state.isLeftSidebarCollapsed);
  const isRightPanelCollapsed = useTelemetryStore(state => state.isRightPanelCollapsed);
  const setLeftSidebarCollapsed = useTelemetryStore(state => state.setLeftSidebarCollapsed);
  const setRightPanelCollapsed = useTelemetryStore(state => state.setRightPanelCollapsed);
  const isMapMaximized = useTelemetryStore(state => state.isMapMaximized);
  const setIsMapMaximized = useTelemetryStore(state => state.setIsMapMaximized);
  const isMapTransitioning = useTelemetryStore(state => state.isMapTransitioning);
  const isGlobalTransitioning = useTelemetryStore(state => state.isGlobalTransitioning);
  const setIsMapTransitioning = useTelemetryStore(state => state.setIsMapTransitioning);
  const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);
  const showSetupView = useTelemetryStore(state => state.showSetupView);
  const fetchSetup = useTelemetryStore(state => state.fetchSetup);
  const exportLap = useTelemetryStore(state => state.exportLap);
  const exportLapWithSetup = useTelemetryStore(state => state.exportLapWithSetup);
  const setMiniSectorState = useTelemetryStore(state => state.setMiniSectorState);
  const isListLoading = useTelemetryStore(state => state.isListLoading);
  const selectedSegIdx = useTelemetryStore(state => state.selectedSegIdx);
  const selectedSectorIdx = useTelemetryStore(state => state.selectedSectorIdx);

  const trackName = sessionMetadata?.trackName;
  const layoutName = sessionMetadata?.layoutKey || sessionMetadata?.trackLayout || 'Default';

  const isCrossSession = !!referenceLap && !!referenceTelemetryData;
  const refLap = isCrossSession ? referenceLap : (referenceLapIdx !== null ? laps.find(l => l.lap === referenceLapIdx) : null);

  const miniSectors = useMemo(() => {
    if (!trackName || !trackSegments) {
      return [];
    }

    const cleanTrackName = (name: string) => {
      return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .trim();
    };

    const targetTrackClean = cleanTrackName(trackName);

    let trackKey = Object.keys(trackSegments).find(
      key => key.toLowerCase() === trackName.toLowerCase()
    );

    if (!trackKey) {
      trackKey = Object.keys(trackSegments).find(
        key => cleanTrackName(key) === targetTrackClean
      );
    }

    if (!trackKey) {
      trackKey = Object.keys(trackSegments).find(key => {
        const keyClean = cleanTrackName(key);
        const keyWords = keyClean.split(/\s+/).filter(w => w.length > 2);
        const targetWords = targetTrackClean.split(/\s+/).filter(w => w.length > 2);
        const overlap = keyWords.filter(w => targetWords.includes(w));
        const threshold = Math.min(keyWords.length, targetWords.length) * 0.7;
        return overlap.length >= threshold;
      });
    }

    if (!trackKey) return [];

    const layouts = (trackSegments as any)[trackKey];
    if (!layouts) return [];

    const normalize = (lName: string) => {
      let clean = cleanTrackName(lName);
      const trackWords = cleanTrackName(trackName).split(/\s+/);
      trackWords.forEach(word => {
        if (word.length > 2) {
          const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          clean = clean.replace(new RegExp(`\\b${escaped}\\b`, 'g'), '');
        }
      });
      return clean.replace(/[^a-z0-9]/g, '').trim();
    };

    const targetNormalized = normalize(layoutName);

    let layoutKey = Object.keys(layouts).find(
      key => key.toLowerCase() === layoutName.toLowerCase()
    );

    if (!layoutKey) {
      layoutKey = Object.keys(layouts).find(
        key => normalize(key) === targetNormalized
      );
    }

    if (!layoutKey) {
      layoutKey = Object.keys(layouts).find(
        key => {
          const kClean = cleanTrackName(key);
          const lClean = cleanTrackName(layoutName);
          return kClean.includes(lClean) || lClean.includes(kClean);
        }
      );
    }

    layoutKey = layoutKey || Object.keys(layouts)[0];

    const layoutData = layouts[layoutKey];
    return layoutData ? (layoutData.segments || []) : [];
  }, [trackName, layoutName]);

  const currentLapMemo = useMemo(() => {
    return laps.find(l => l.lap === selectedLapIdx) || null;
  }, [laps, selectedLapIdx]);

  // Helper to calculate segment times using linear interpolation for high-fidelity accuracy
  const calculateMiniSectorTimes = (
    times: number[],
    dists: number[],
    startTime: number,
    endTime: number,
    sectors: any[]
  ) => {
    const sIdx = times.findIndex(t => t >= startTime);
    if (sIdx === -1) return null;
    if (times[0] !== undefined && times[0] > endTime) return null;

    const eIdx = times.findIndex(t => t > endTime);
    const startIdx = sIdx;
    const endIdx = eIdx === -1 ? times.length - 1 : eIdx;
    
    if (startIdx >= endIdx) return null;
    
    const distStart = dists[startIdx] || 0;
    const distEnd = dists[endIdx] || distStart;
    const actualLen = distEnd - distStart;
    
    const refLen = sectors[sectors.length - 1].end;
    const stretchRatio = actualLen > 0 ? refLen / actualLen : 1;
    
    let lastTime = times[startIdx];
    let lastTelemetryIdx = startIdx;
    const segments: Array<{ duration: number; startIdx: number; endIdx: number }> = [];
    
    sectors.forEach((seg: any, idx: number) => {
      const targetDist = seg.end;
      
      let currentTime = times[endIdx];
      let bestI = endIdx;
      let found = false;
      
      for (let i = startIdx + 1; i <= endIdx; i++) {
        const rawDistPrev = dists[i - 1];
        const rawDistCurr = dists[i];
        if (rawDistPrev === undefined || rawDistCurr === undefined) continue;
        
        const dPrev = (rawDistPrev - distStart) * stretchRatio;
        const dCurr = (rawDistCurr - distStart) * stretchRatio;
        
        if (dPrev <= targetDist && dCurr >= targetDist) {
          if (dCurr !== dPrev) {
            const frac = (targetDist - dPrev) / (dCurr - dPrev);
            const tPrev = times[i - 1] || 0;
            const tCurr = times[i] || 0;
            currentTime = tPrev + frac * (tCurr - tPrev);
            bestI = frac < 0.5 ? i - 1 : i;
          } else {
            currentTime = times[i] || 0;
            bestI = i;
          }
          found = true;
          break;
        }
      }
      
      if (!found) {
        let bestI_closest = startIdx;
        let minDist = Infinity;
        for (let i = startIdx; i <= endIdx; i++) {
          const rawDist = dists[i];
          if (rawDist === undefined) continue;
          const curDist = (rawDist - distStart) * stretchRatio;
          const d = Math.abs(curDist - targetDist);
          if (d < minDist) {
            minDist = d;
            bestI_closest = i;
          }
        }
        currentTime = times[bestI_closest];
        bestI = bestI_closest;
      }
      
      const duration = Math.max(0, currentTime - lastTime);
      segments.push({
        duration,
        startIdx: lastTelemetryIdx,
        endIdx: bestI
      });
      lastTime = currentTime;
      lastTelemetryIdx = bestI;
    });
    
    return segments;
  };

  const currentLapMiniSectorTimes = useMemo(() => {
    if (!telemetryData || !currentLapMemo || !miniSectors || miniSectors.length === 0) return null;
    
    const times = telemetryData['Time'] || [];
    const dists = telemetryData['Lap Dist'] || telemetryData['Distance'] || [];
    if (times.length === 0 || dists.length === 0) return null;
    
    return calculateMiniSectorTimes(times, dists, currentLapMemo.startTime, currentLapMemo.endTime, miniSectors);
  }, [telemetryData, currentLapMemo, miniSectors]);

  const refLapMiniSectorTimes = useMemo(() => {
    const isCrossSession = !!referenceLap && !!referenceTelemetryData;
    const refLapObj = isCrossSession ? referenceLap : (referenceLapIdx !== null ? laps.find(l => l.lap === referenceLapIdx) : null);
    const refTelemetry = referenceTelemetryData || telemetryData;
    
    if (!refTelemetry || !refLapObj || !miniSectors || miniSectors.length === 0) return null;
    
    const times = refTelemetry['Time'] || [];
    const dists = refTelemetry['Lap Dist'] || refTelemetry['Distance'] || [];
    if (times.length === 0 || dists.length === 0) return null;
    
    return calculateMiniSectorTimes(times, dists, refLapObj.startTime, refLapObj.startTime + (refLapObj.duration || 0), miniSectors);
  }, [telemetryData, referenceTelemetryData, referenceLap, referenceLapIdx, laps, miniSectors]);

  // Calculate segment times for all valid laps in this stint
  const allLapsMiniSectorTimes = useMemo(() => {
    if (!telemetryData || !laps || laps.length === 0 || !miniSectors || miniSectors.length === 0) return {};
    
    const times = telemetryData['Time'] || [];
    const dists = telemetryData['Lap Dist'] || telemetryData['Distance'] || [];
    if (times.length === 0 || dists.length === 0) return {};

    const results: Record<number, any[]> = {};

    laps.forEach(lap => {
      // Discard invalid, out-lap, in-pit, or abnormally short laps (< 30s)
      const lapDur = lap.duration !== undefined ? lap.duration : (lap.endTime - (lap.startTime || 0));
      if (
        !lap.isValid || 
        lap.isOutLap || 
        lap.inPit || 
        lapDur < 30 ||
        lap.startTime === undefined || 
        lap.endTime === undefined
      ) return;

      const sectorTimes = calculateMiniSectorTimes(times, dists, lap.startTime, lap.endTime, miniSectors);
      if (sectorTimes) {
        // Enforce that every mini-sector must be of a reasonable duration (> 1.0s) to filter out telemetry glitches
        const hasGlitchedSector = sectorTimes.some(s => s.duration < 1.0);
        if (hasGlitchedSector) {
          return;
        }

        // Validation: The sum of mini-sector durations must match the actual lap duration close enough
        const totalSectorDuration = sectorTimes.reduce((sum, s) => sum + s.duration, 0);
        const lapDuration = lap.duration || (lap.endTime - lap.startTime);

        if (Math.abs(totalSectorDuration - lapDuration) > 2.0) {
          return;
        }

        results[lap.lap] = sectorTimes;
      }
    });
    
    return results;
  }, [telemetryData, laps, miniSectors]);

  // Find the best time for each mini sector in the session
  const sessionMiniSectorBests = useMemo(() => {
    if (!miniSectors || miniSectors.length === 0 || !allLapsMiniSectorTimes || Object.keys(allLapsMiniSectorTimes).length === 0) return null;

    const bests = miniSectors.map((seg: any, idx: number) => {
      let minVal = Infinity;
      let minLap = 0;
      
      Object.entries(allLapsMiniSectorTimes).forEach(([lapStr, times]) => {
        const lapNum = parseInt(lapStr, 10);
        const val = times[idx]?.duration;
        if (val !== undefined && val > 0 && val < minVal) {
          minVal = val;
          minLap = lapNum;
        }
      });
      
      const badgeNumber = seg.name.replace(/[^\d]/g, '') || String(idx + 1);
      return {
        label: `B${badgeNumber}`,
        val: minVal === Infinity ? 0 : minVal,
        lap: minLap
      };
    });

    const theoreticalBest = bests.reduce((sum, item) => sum + item.val, 0);

    return {
      bests,
      theoreticalBest
    };
  }, [miniSectors, allLapsMiniSectorTimes]);

  const currentLapIdxForBounds = selectedLapIdx !== null ? selectedLapIdx : (laps.find(l => l.isValid)?.lap ?? laps[0]?.lap);
  const bestLapNumForBounds = useMemo(() => {
    const hasRef = referenceLapIdx !== null || !!referenceTelemetryData;
    if (hasRef || selectedSegIdx === null || !sessionMiniSectorBests) return null;
    const best = sessionMiniSectorBests.bests[selectedSegIdx];
    return best ? best.lap : null;
  }, [referenceLapIdx, referenceTelemetryData, selectedSegIdx, sessionMiniSectorBests]);

  const lineBounds = useMemo(() => {
    const lapChan = telemetryData?.['Lap'] || telemetryData?.['lap'];
    const times = telemetryData?.['Time'] || telemetryData?.['GPS Time'];
    if (!lapChan) return { curLineS: -1, refLineS: -1, refLineE: -1 };

    let curLineS = -1;
    for (let i = 0; i < lapChan.length; i++) {
      if (lapChan[i] === currentLapIdxForBounds) { curLineS = i; break; }
    }

    let refLineS = -1;
    let refLineE = -1;
    if (bestLapNumForBounds !== null) {
      for (let i = 0; i < lapChan.length; i++) {
        if (lapChan[i] === bestLapNumForBounds) {
          if (refLineS === -1) refLineS = i;
          refLineE = i;
        } else if (refLineS !== -1 && lapChan[i] > bestLapNumForBounds) {
          break;
        }
      }
      if (refLineS !== -1 && refLineE === -1 && times) {
        refLineE = times.length - 1;
      }
    }

    return { curLineS, refLineS, refLineE };
  }, [telemetryData, currentLapIdxForBounds, bestLapNumForBounds]);

  const telemetryMaxStats = useMemo(() => {
    const speedArr = telemetryData?.['Ground Speed'];
    const gearArr = telemetryData?.['Gear'];
    
    let maxSpeed = 300;
    if (speedArr && Array.isArray(speedArr) && speedArr.length > 0) {
      let m = -Infinity;
      for (let i = 0; i < speedArr.length; i++) if (speedArr[i] > m) m = speedArr[i];
      maxSpeed = m === -Infinity ? 300 : m;
    }
    
    let maxGear = 8;
    if (gearArr && Array.isArray(gearArr) && gearArr.length > 0) {
      let m = -Infinity;
      for (let i = 0; i < gearArr.length; i++) if (gearArr[i] > m) m = gearArr[i];
      maxGear = m === -Infinity ? 8 : m;
    }
    
    return { maxSpeed, maxGear };
  }, [telemetryData]);

  useEffect(() => {
    setMiniSectorState({
      miniSectors,
      currentLapMiniSectorTimes,
      refLapMiniSectorTimes,
      allLapsMiniSectorTimes,
      sessionMiniSectorBests
    });
  }, [miniSectors, currentLapMiniSectorTimes, refLapMiniSectorTimes, allLapsMiniSectorTimes, sessionMiniSectorBests, setMiniSectorState]);

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
          return;
        }

        // Avoid triggering shortcuts when typing in inputs
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA' ||
          document.activeElement?.getAttribute('contenteditable') === 'true'
        ) {
          return;
        }

        const state = useTelemetryStore.getState();

        // 'M' for Minimap Toggle (Only in maximized mode)
        if (e.key.toLowerCase() === 'm' && state.isMapMaximized) {
          state.setShowMiniMap(!state.showMiniMap);
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
  
  // NEW: Calculate Session Bests for Theoretical Lap
  const sessionBests = useMemo(() => {
    if (!laps || laps.length === 0) return null;
    let bestS1 = { val: Infinity, lap: 0 };
    let bestS2 = { val: Infinity, lap: 0 };
    let bestS3 = { val: Infinity, lap: 0 };

    laps.forEach(l => {
      const lapDur = l.duration !== undefined ? l.duration : (l.endTime - (l.startTime || 0));
      // Discard invalid, out-lap, in-pit, or abnormally short laps (< 30s)
      if (l.isValid && !l.isOutLap && !l.inPit && lapDur > 30) {
        // Enforce a reasonable minimum time for standard sectors to prevent glitch values
        if (l.s1 > 1.0 && l.s1 < bestS1.val) { bestS1 = { val: l.s1, lap: l.lap }; }
        if (l.s2 > 1.0 && l.s2 < bestS2.val) { bestS2 = { val: l.s2, lap: l.lap }; }
        if (l.s3 > 1.0 && l.s3 < bestS3.val) { bestS3 = { val: l.s3, lap: l.lap }; }
      }
    });

    if (bestS1.val === Infinity) return null;

    const theoreticalBest = bestS1.val + bestS2.val + bestS3.val;
    return { bestS1, bestS2, bestS3, theoreticalBest };
  }, [laps]);

  const [showFileManager, setShowFileManager] = useState(() => {
    const wasOpen = localStorage.getItem('file_manager_open') === 'true';
    const hadActive = localStorage.getItem('had_active_session') === 'true';
    return wasOpen || hadActive;
  });

  useEffect(() => {
    localStorage.setItem('file_manager_open', showFileManager.toString());
  }, [showFileManager]);
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
    setIsMapTransitioning(true);
    if (isMapExpanded) {
      // SIDEBAR -> EXPANDED (Staggered: Resizer package starts first)
      setIsAnimatingSidebarMap(false);
      setShouldRenderExpandedMap(true);
      // Give the container/resizer a head start
      const startExpanded = setTimeout(() => setIsAnimatingExpandedMap(true), 50);
      const cleanSidebar = setTimeout(() => setShouldRenderSidebarMap(false), 450);
      const settle = setTimeout(() => setIsMapTransitioning(false), 600);
      return () => { clearTimeout(startExpanded); clearTimeout(cleanSidebar); clearTimeout(settle); };
    } else {
      // EXPANDED -> SIDEBAR
      setIsAnimatingExpandedMap(false);
      setShouldRenderSidebarMap(true);
      const startSidebar = setTimeout(() => setIsAnimatingSidebarMap(true), 50);
      const cleanExpanded = setTimeout(() => setShouldRenderExpandedMap(false), 450);
      const settle = setTimeout(() => setIsMapTransitioning(false), 600);
      return () => { clearTimeout(startSidebar); clearTimeout(cleanExpanded); clearTimeout(settle); };
    }
  }, [isMapExpanded]);



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
    const hasRefSelection = referenceLapIdx !== null || referenceLap !== null;
    if (!isRightPanelCollapsed) {
      if (hasRefSelection && mapWidth < DUAL_MAP_WIDTH) {
        setMapWidth(DUAL_MAP_WIDTH);
      } else if (!hasRefSelection && mapWidth === DUAL_MAP_WIDTH) {
        setMapWidth(DEFAULT_MAP_WIDTH);
      }
    }
  }, [referenceLapIdx, referenceLap, isRightPanelCollapsed]);

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

  // NEW: State to track if mouse is within window to stabilize hover effects in fullscreen
  const [isMouseInWindow, setIsMouseInWindow] = useState(true);



  // --- Pure Helper Functions ---

  const formatTime = (sec: number | undefined | null) => {
    if (sec === undefined || sec === null) return "--:--.---";
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(3).padStart(6, '0');
    return `${m}:${s}`;
  };

  const ComparisonRow = ({
    label, val, refVal, valColorClass, compact = false, highlighted = false
  }: {
    label: React.ReactNode,
    val: number | undefined | null,
    refVal: number | undefined | null,
    valColorClass?: string,
    compact?: boolean,
    highlighted?: boolean
  }) => {
    const diff = (val != null && refVal != null) ? val - refVal : null;
    const sign = diff && diff > 0 ? "+" : "-";
    const color = diff && diff > 0 ? "text-red-500" : (diff && diff < 0 ? "text-green-500" : "text-gray-500");
    const valColor = valColorClass || "text-white";

    return (
      <div
        className={`glass-container-flat rounded-xl hover:bg-white/5 transition-all duration-300 ${compact ? 'ring-1 ring-white/5' : ''} ${highlighted ? 'bg-purple-500/10 ring-2 ring-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)] border border-purple-500/20' : ''}`}
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
        <div className={`glass-content grid ${compact ? 'grid-cols-[14px_1fr_1fr] gap-2 py-1.5 px-2' : 'grid-cols-[18px_1fr_110px] gap-2 py-2.5 px-4'} items-center cursor-default`}>
          <Icon size={compact ? 10 : 12} className="text-gray-300 brightness-125 group-hover/teleRow:text-blue-400 transition-colors" />
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

          {/* Reference Value (Only shown if compact/hasRef) */}
          {compact && (
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
          )}
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
    <div 
      className={`flex h-screen bg-black text-gray-100 overflow-hidden font-sans relative ${!isMouseInWindow ? 'mouse-outside' : ''}`}
      onMouseEnter={() => setIsMouseInWindow(true)}
      onMouseLeave={(e) => {
        setIsMouseInWindow(false);
        // Reset mouse coordinates to far away to prevent glow artifacts on re-entry
        const root = e.currentTarget;
        root.style.setProperty('--mouse-x', '-9999px');
        root.style.setProperty('--mouse-y', '-9999px');
        root.style.setProperty('--mouse-x-inv', '-9999px');
        root.style.setProperty('--mouse-y-inv', '-9999px');
      }}
      style={{ 
        isolation: 'isolate',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}
    >
      {/* Car Setup Full-Screen Overlay ??covers entire app */}
      {showSetupView && (
        <div className="absolute inset-0 z-[100]">
          <CarSetupView />
        </div>
      )}
      {/* Sidebar - Data Controls */}
      {!isMapMaximized && (
        <div
          className={`h-full bg-[#111115] border-r border-[#1f1f26] flex flex-col flex-shrink-0 relative overflow-hidden group/sidebar transition-[width,opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]`}
          style={{
            width: isLeftSidebarCollapsed ? 0 : sidebarWidth,
            minWidth: isLeftSidebarCollapsed ? 0 : DEFAULT_SIDEBAR_WIDTH,
            maxWidth: isLeftSidebarCollapsed ? 0 : MAX_SIDEBAR_WIDTH,
            opacity: isLeftSidebarCollapsed ? 0 : 1,
            borderRightWidth: isLeftSidebarCollapsed ? 0 : 1,
            transition: isResizingSidebar ? 'none' : 'width 0.5s ease, opacity 0.5s ease'
          }}
        >
          {(showFileManager || !currentSessionId) ? (
            <div className="flex-1 overflow-hidden flex flex-col" style={{ transform: 'translateZ(0)', isolation: 'isolate' }}>
              <div className="flex-1 overflow-y-scroll">
                <FileManager onClose={() => setShowFileManager(false)} />
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
          ) : (
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
                {laps.length > 0 && (
                  <div className="mb-3 p-4 glass-container glass-expand-pixel rounded-2xl border border-white/25 flex flex-col gap-3 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-300 group/analysis" onMouseMove={handleGlassMouseMove}>
                    <div className="glass-content size-full flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-gray-500 text-[12px] font-black uppercase tracking-[0.2em] px-1 group-hover/analysis:text-white transition-colors">Analysis Laps</h3>
                        {selectedLapIdx !== null && (
                          <div className="flex items-center gap-1">
                            <Tooltip text="EXPORT LAP + SETUP (.DUCKDB + .SVM)" position="bottom">
                              <button
                                onClick={() => { if (!isListLoading) exportLapWithSetup(selectedLapIdx!); }}
                                disabled={isListLoading}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-white/10 border border-transparent hover:border-white/15 transition-all active:scale-90 glass-container"
                                onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
                              >
                                <div className="glass-content">
                                  {isListLoading ? <Loader2 size={13} className="animate-spin" /> : <PackageCheck size={13} />}
                                </div>
                              </button>
                            </Tooltip>
                            <Tooltip text="EXPORT CURRENT LAP AS .DUCKDB" position="bottom">
                              <button
                                onClick={() => { if (!isListLoading) exportLap(selectedLapIdx!); }}
                                disabled={isListLoading}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-white/10 border border-transparent hover:border-white/15 transition-all active:scale-90 glass-container"
                                onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
                              >
                                <div className="glass-content">
                                  {isListLoading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                </div>
                              </button>
                            </Tooltip>
                          </div>
                        )}
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
          )}
        </div>
      )}

      {!isMapMaximized && (
        <Tooltip text={isLeftSidebarCollapsed ? "" : "DOUBLE-CLICK TO RESET"} position="right">
          <div
            className={`w-1.5 flex justify-center items-center group/sidebar-resizer relative z-50 h-full transition-all duration-300 ${isLeftSidebarCollapsed ? 'cursor-default' : 'cursor-col-resize'}`}
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
      )}
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-gray-900 min-w-0 relative">
        {/* Top Navbar */}
        {!isMapMaximized && (
          <div className={`bg-[#111115] border-b border-[#1f1f26] flex items-center justify-between px-6 py-2 flex-shrink-0 h-14`}>
            {/* Logo / Title */}
            <div
              className="flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-300 hover:bg-white/5 glass-container group/logo cursor-pointer"
              onMouseMove={handleGlassMouseMove}
              style={{ '--glass-hover-scale': '1', '--glass-content-scale': '1' } as any}
            >
              <div className="glass-content flex items-center gap-3">
                <img
                  src="/lmu_logo.png"
                  alt="Logo"
                  className="h-8 object-contain select-none group-hover/logo:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all"
                />
                <span className="text-gray-500 font-bold text-sm select-none">|</span>
                <span className="text-gray-400 font-black text-xs uppercase tracking-[0.15em] select-none group-hover/logo:text-white transition-colors">v{packageJson.version}</span>
              </div>
            </div>

            {/* Right Side: Account / Profile Switcher */}
            <div className="flex items-center gap-3">
              {/* Toggles Group - Mini Sector and 2D/3D */}
              {selectedLapIdx !== null && (
                <div className="flex items-center gap-1.5 mr-3">
                  {/* Mini Sector Quick Toggle - NAVBAR INTEGRATION */}
                  <div className="relative flex items-center p-1 bg-[#1a1a1e]/60 backdrop-blur-md rounded-xl border border-white/10 glass-container h-8 w-28 overflow-hidden group/mini-toggle" onMouseMove={handleGlassMouseMove}>
                    {/* Sliding Indicator Pill */}
                    <div 
                      className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
                      style={{ left: !showMiniSectors ? '4px' : 'calc(50%)' }}
                    />
                    
                    <button
                      onClick={() => setShowMiniSectors(false)}
                      className={`relative z-10 flex-1 h-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${!showMiniSectors ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      SEC
                    </button>
                    <button
                      onClick={() => setShowMiniSectors(true)}
                      className={`relative z-10 flex-1 h-full flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${showMiniSectors ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      SEG
                    </button>
                  </div>

                  {/* 2D/3D Dimension Toggle - NAVBAR INTEGRATION */}
                  <div className="relative flex items-center p-1 bg-[#1a1a1e]/60 backdrop-blur-md rounded-xl border border-white/10 glass-container h-8 w-28 overflow-hidden group/toggle" onMouseMove={handleGlassMouseMove}>
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
        )}

        {/* Main Content Area Body */}
        <div className="flex-1 flex flex-row min-h-0 relative">
          <div className="flex-1 flex flex-row min-h-0 min-w-0">
            {/* Telemetry Charts Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">
              {isLoading && (
                <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-[4px] z-[5000] flex items-center justify-center transition-all duration-300 pointer-events-auto">
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
                      className={`flex flex-col relative flex-shrink-0 origin-top overflow-hidden min-h-0 ${isMapMaximized ? 'fixed inset-0 z-[2000] p-0' : 'px-4 p-2'} ${(isDraggingExpandedMap || isMapMaximized) ? '' : 'transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]'}`}
                      style={{
                        height: isMapMaximized ? '100vh' : (isAnimatingExpandedMap ? expandedMapHeight + 52 : 0),
                        opacity: isAnimatingExpandedMap ? 1 : 0,
                        transform: isMapMaximized ? 'none' : (isAnimatingExpandedMap ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)'),
                        willChange: 'transform, height, opacity',
                        transition: (isDraggingExpandedMap || isMapMaximized) ? 'none' : undefined
                      }}
                    >
                      <div className="flex-1 relative min-h-0 overflow-hidden">
                        {/* Loading Overlay for Dimension Switching & Layout Transitions */}
                        <MapTransitionOverlay isVisible={isSwitchingDimension || isMapTransitioning} />
                        {show3DLab ? (
                          <TrackMap3D 
                            key={`expanded-${currentSessionId}`}
                            onToggleExpand={() => {
                              setIsMapTransitioning(true);
                              setIsMapExpanded(false);
                            }} 
                            isAnimating={isMapTransitioning}
                          />
                        ) : (
                          <TrackMap
                            key={`expanded-${currentSessionId}`}
                            isExpanded={isMapExpanded}
                            onToggleExpand={() => {
                              setIsMapTransitioning(true);
                              setIsMapExpanded(false);
                            }}
                            isAnimating={isMapTransitioning}
                          />
                        )}
                      </div>
                      {!isMapMaximized && (
                        <Tooltip text="DOUBLE-CLICK TO RESET" position="top">
                          <div
                            className={`w-full h-2 pt-3 pb-0 flex justify-center items-center cursor-row-resize group/resizer relative z-20`}
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
                      )}
                    </div>
                  )}

                  {!isMapMaximized && (
                    <div
                      className="flex-1 min-w-0 flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar"
                      style={{ minWidth: MIN_CHART_WIDTH }}
                    >
                      {/* Category Navigation Tabs - Extended Capsule Style */}
                      <div className="sticky top-0 z-[100] flex justify-center pt-2 pb-1 -mx-4">
                        <div className="relative flex items-center px-2 py-1 bg-[#1a1a1e]/80 backdrop-blur-3xl rounded-full border border-white/10 h-10 group/toggle shadow-[0_8px_20px_rgba(0,0,0,0.5)] pointer-events-auto" onMouseMove={handleGlassMouseMove}>
                          <div className="relative flex items-center h-full">
                            {(() => {
                              const availableTabs = [
                                { id: 'Driver', label: 'DRIVER' },
                                { id: 'Tyres', label: 'TYRES' },
                                { id: 'Dynamics', label: 'DYNAMICS' },
                                { id: 'Handling', label: 'HANDLING' },
                                { id: 'Systems', label: 'SYSTEMS' },
                              ].filter(cat => {
                                if (cat.id === 'Driver') return true;
                                if (!telemetryData) return false;
                                const configs = CATEGORY_CHART_CONFIGS[cat.id as any];
                                return configs?.some(c => telemetryData[c.id] !== undefined);
                              });

                              const activeIndex = availableTabs.findIndex(t => t.id === activeChartCategory);

                              return (
                                <>
                                  {/* Sliding Active Block with Layout Transition */}
                                  <AnimatePresence>
                                    <motion.div 
                                      layoutId="activeCategoryBlock"
                                      className="absolute bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.5)]"
                                      style={{ 
                                        height: 'calc(100% - 2px)',
                                        width: `calc(${100 / availableTabs.length}% - 4px)`,
                                        left: `calc(${(activeIndex / availableTabs.length) * 100}% + 2px)`,
                                        top: '1px'
                                      }}
                                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                  </AnimatePresence>

                                  {availableTabs.map((cat) => (
                                    <CategoryTab 
                                      key={cat.id} 
                                      id={cat.id as any} 
                                      label={cat.label}
                                      isActive={activeChartCategory === cat.id}
                                    />
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 min-w-0">
                        {chartConfigs
                          .filter(c => {
                            if (!c.visible) return false;
                            if (c.id === 'Time Delta') {
                              const hasRef = referenceLapIdx !== null || referenceLap !== null;
                              if (!hasRef) {
                                if (selectedSectorIdx !== null) return false;
                                if (selectedSegIdx === null) return false;
                              }
                            }
                            
                            // Class-based visibility
                            if (c.id === 'SoC' && sessionMetadata?.carClass !== 'Hyper') return false;
                            if (c.id === 'ABS' && sessionMetadata?.carClass !== 'GT3') return false;
                            
                            return true;
                          })
                          .sort((a, b) => a.order - b.order)
                          .map(config => (
                            <TelemetryChart
                              key={`${config.id}-${config.wheelIndex ?? 'none'}`}
                              channel={config.id}
                              alias={config.alias}
                              color={config.color}
                              height={config.height}
                              syncKey="telemetry"
                              unit={config.unit}
                              wheelIndex={config.wheelIndex}
                              isPlaying={isPlaying}
                              showLapTime={false}
                            />
                          ))
                        }
                      </div>
                    </div>
                  )}
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
                  {!isMapMaximized && (
                    <Tooltip text={isRightPanelCollapsed ? "" : "DOUBLE-CLICK TO RESET"} position="left">
                      <div
                        className={`w-1.5 flex justify-center items-center group/right-resizer relative z-50 h-full transition-all duration-300 ${isRightPanelCollapsed ? 'cursor-default' : 'cursor-col-resize'}`}
                        onMouseDown={() => !isRightPanelCollapsed && setIsDraggingMap(true)}
                        onDoubleClick={() => {
                          if (isRightPanelCollapsed) return;
                          const { referenceCursorIndex: rci, referenceDeltaIndex: rdi } = useTelemetryStore.getState();
                          const hasRef = (!!referenceTelemetryData || referenceLapIdx !== null) && (rci !== null || rdi !== null);
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
                  )}

                  {!isMapMaximized && (
                    <div
                      ref={rightPanelRef}
                      className={`border-l border-gray-800 bg-gray-950 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden`}
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
                            <div className="flex-1 relative min-h-0 overflow-hidden">
                              {/* Loading Overlay for Sidebar Map Transitions */}
                              <MapTransitionOverlay isVisible={isSwitchingDimension || isMapTransitioning} />
                              <TrackMap
                                key={`sidebar-${currentSessionId}`}
                                isExpanded={false}
                                onToggleExpand={() => {
                                  setIsMapTransitioning(true);
                                  setIsMapExpanded(true);
                                }}
                                isMiniMap={false}
                                allowRotation={false}
                                isAnimating={!isAnimatingSidebarMap || isMapTransitioning}
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
                          <LapDetailsPanel
                            telemetryMaxStats={telemetryMaxStats}
                            lineBounds={lineBounds}
                            miniSectors={miniSectors}
                            currentLapMiniSectorTimes={currentLapMiniSectorTimes}
                            refLapMiniSectorTimes={refLapMiniSectorTimes}
                            sessionMiniSectorBests={sessionMiniSectorBests}
                            allLapsMiniSectorTimes={allLapsMiniSectorTimes}
                            sessionBests={sessionBests}
                          />
                        ) : (
                          <div className="text-gray-500 text-sm italic border-t border-gray-800 pt-4">Select a lap to view details</div>
                        )}
                      </div>
                    </div>
                )}
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
        <AnimatePresence>
          {(showLogin || !activeProfileId) && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="fixed inset-0 z-[3000] bg-black/40"
            >
              <LoginOverlay
                onClose={activeProfileId ? () => setShowLogin(false) : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="fixed inset-0 z-[3200] bg-black/40"
            >
              <SettingsOverlay />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCarSelection && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="fixed inset-0 z-[3200] bg-black/40"
            >
              <CarSelectionOverlay />
            </motion.div>
          )}
        </AnimatePresence>

        {showReferenceBrowser && (
          <ReferenceLapBrowser onClose={() => setShowReferenceBrowser(false)} />
        )}
        <UpdateNotifier />
        <AnimatePresence>
          {showSetupView && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, scale: 1, backdropFilter: 'blur(24px)' }}
              exit={{ opacity: 0, scale: 1.02, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[9999] bg-black/90 flex flex-col overflow-hidden"
            >
              <CarSetupView />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Transition Overlay for major events (e.g. Account Switch) */}
        <div className="fixed inset-0 z-[10000] pointer-events-none">
          <MapTransitionOverlay 
            isVisible={isGlobalTransitioning} 
            message="INITIALIZING IDENTITY..." 
            subMessage={activeProfileId ? `Switching to ${profiles.find(p => p.id === activeProfileId)?.name || 'User'}...` : undefined}
            avatarUrl={activeProfileId ? profiles.find(p => p.id === activeProfileId)?.avatar_url : null}
          />
        </div>
      </div>
    </div>
  );
}

export default App;