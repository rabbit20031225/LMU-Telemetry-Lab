import React, { useRef } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { GForceRadar } from './GForceRadar';
import { F1Dashboard } from './F1Dashboard';
import { SteeringWheelView } from './SteeringWheelView';
import { handleGlassMouseMove } from '../utils/glassEffect';

// ── inline helpers (previously in App.tsx) ────────────────────────────────────

const formatTime = (sec: number | undefined | null) => {
  if (sec === undefined || sec === null) return '--:--.---';
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(3).padStart(6, '0');
  return `${m}:${s}`;
};

const ComparisonRow = ({
  label, val, refVal, valColorClass, compact = false, highlighted = false
}: {
  label: React.ReactNode;
  val: number | undefined | null;
  refVal: number | undefined | null;
  valColorClass?: string;
  compact?: boolean;
  highlighted?: boolean;
}) => {
  const diff = val != null && refVal != null ? val - refVal : null;
  const sign = diff && diff > 0 ? '+' : '-';
  const color = diff && diff > 0 ? 'text-red-500' : diff && diff < 0 ? 'text-green-500' : 'text-gray-500';
  const valColor = valColorClass || 'text-white';
  return (
    <div
      className={`glass-container-flat rounded-xl hover:bg-white/5 transition-all duration-300 ${compact ? 'ring-1 ring-white/5' : ''} ${highlighted ? 'bg-purple-500/10 ring-2 ring-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)] border border-purple-500/20' : ''}`}
      onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}
    >
      <div className={`glass-content grid ${compact ? 'grid-cols-[20px_1fr_45px_1fr] gap-1 py-1.5 px-2' : 'grid-cols-[30px_1fr_50px_1fr] gap-2 py-2.5 px-4'} items-center whitespace-nowrap cursor-default`}>
        <span className={`text-gray-500 ${compact ? 'text-[8px]' : 'text-[9px]'} font-black uppercase flex justify-center group-hover/row:text-gray-300 transition-colors`}>{label}</span>
        <span className={`${valColor} font-mono font-black ${compact ? 'text-[11px]' : 'text-[13px]'} text-left drop-shadow-sm`}>{formatTime(val)}</span>
        <span className={`${color} font-mono ${compact ? 'text-[9px]' : 'text-[11px]'} font-bold text-left`}>
          {diff != null ? `${sign}${Math.abs(diff).toFixed(3)}` : ''}
        </span>
        <span className={`text-amber-500/80 font-mono font-black ${compact ? 'text-[11px]' : 'text-[13px]'} text-left drop-shadow-sm`}>{formatTime(refVal)}</span>
      </div>
    </div>
  );
};

const LiveTelemetryRow = ({
  icon: Icon, label, val, refVal, color, unit = '', max: customMax, compact = false
}: {
  icon: any; label: string; val: number | null; refVal: number | null; color: string; unit?: string; max?: number; compact?: boolean;
}) => {
  const format = (v: number | null | undefined) => {
    if (v == null || isNaN(v)) return '--';
    if (label === 'Gear') return Math.round(v).toString();
    return v.toFixed(1);
  };
  const maxValues: Record<string, number> = { Speed: 350, Throttle: 100, Brake: 100, Gear: 8, Steering: 180 };
  const max = customMax || maxValues[label] || 100;
  const percent = val !== null ? Math.min(100, Math.max(0, (val / max) * 100)) : 0;
  const refPercent = refVal !== null ? Math.min(100, Math.max(0, (refVal / max) * 100)) : 0;
  return (
    <div className="glass-container-flat rounded-xl hover:bg-white/5 transition-all duration-300 group/teleRow" onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}>
      <div className={`glass-content grid ${compact ? 'grid-cols-[14px_1fr_1fr] gap-2 py-1.5 px-2' : 'grid-cols-[18px_1fr_110px] gap-2 py-2.5 px-4'} items-center cursor-default`}>
        <Icon size={compact ? 10 : 12} className="text-gray-300 brightness-125 group-hover/teleRow:text-blue-400 transition-colors" />
        {!compact && <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight group-hover/teleRow:text-gray-200 transition-colors">{label}</span>}
        <div className={`relative ${compact ? 'h-5' : 'h-6'} rounded-md bg-gray-800/40 overflow-hidden flex items-center justify-center border border-white/5`}>
          <div className="absolute left-0 top-0 h-full transition-all duration-75 rounded-r-md" style={{ width: `${percent}%`, backgroundColor: color, opacity: 0.8 }} />
          <span className={`relative z-10 font-mono font-bold ${compact ? 'text-[10px]' : 'text-xs'} text-white pointer-events-none drop-shadow-md`}>{format(val)}{unit}</span>
        </div>
        {compact && (
          <div className={`relative ${compact ? 'h-5' : 'h-6'} rounded-md bg-gray-900/40 overflow-hidden flex items-center justify-center border border-white/5`}>
            <div className="absolute left-0 top-0 h-full transition-all duration-75 rounded-r-md" style={{ width: `${refPercent}%`, backgroundColor: color, opacity: 0.3 }} />
            <span className={`relative z-10 font-mono font-bold ${compact ? 'text-[9px]' : 'text-[11px]'} text-gray-500 pointer-events-none`}>{format(refVal)}{unit}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── TyreDashboard (self-contained) ────────────────────────────────────────────

const TyreDashboard = React.memo(({ data, cursorIndex, carClass, tyreCompoundMax, theme = 'current', compact = false, className = '' }: { data: any; cursorIndex: number | null; carClass?: string; tyreCompoundMax?: number; theme?: 'current' | 'reference'; compact?: boolean; className?: string }) => {
  const tempUnit = useTelemetryStore(state => state.tempUnit);

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

  const WheelInfo = ({ wheelIdx, label: wLabel, className: wClassName = '' }: { wheelIdx: number; label: string; className?: string }) => {
    const pressure = getVal('TyresPressure', cursorIndex, wheelIdx);
    const wear = getVal('Tyres Wear', cursorIndex, wheelIdx);
    const temp = getVal('TyresTempCentre', cursorIndex, wheelIdx);
    const brakeTemp = getVal('Brakes Temp', cursorIndex, wheelIdx);
    const compoundIdx = getVal('TyresCompound', cursorIndex, wheelIdx);
    const isDetached = getVal('WheelsDetached', cursorIndex, wheelIdx) === 1;
    const compound = getCompoundInfo(compoundIdx);
    const wearPercent = wear ? Math.round(wear) : 0;
    const wearColor = `hsl(${(wearPercent / 100) * 120}, 80%, 50%)`;
    return (
      <div className={`relative flex flex-col items-center ${compact ? 'p-1.5' : 'p-2.5'} rounded-xl transition-all duration-300 group/wheel glass-container-flat hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] ring-1 ring-inset ring-white/5 min-w-0 ${wClassName}`} onMouseMove={(e) => handleGlassMouseMove(e, 0.2)}>
        <div className="glass-content w-full flex flex-col items-center">
          {isDetached && (
            <div className={`absolute inset-0 z-20 bg-red-900/80 rounded-xl flex items-center justify-center border-2 border-red-500 animate-pulse box-content -m-0.5`}>
              <span className={`${compact ? 'text-[7px]' : 'text-[10px]'} font-black uppercase text-white drop-shadow-md`}>DETACHED</span>
            </div>
          )}
          <div className={`${compact ? 'text-[9px]' : 'text-[11px]'} font-mono font-bold text-gray-300 mb-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>
            {pressure ? pressure.toFixed(1) : '--'} <span className={`${compact ? 'text-[7px]' : 'text-[9px]'} text-gray-500 font-black`}>kPa</span>
          </div>
          <div className={`relative ${compact ? 'w-10 h-10' : 'w-16 h-16'} flex items-center justify-center mb-1`}>
            <svg className="absolute inset-0 w-full h-full rotate-90 scale-x-[-1]" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-white/5" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3.5" className="transition-all duration-300" style={{ color: wearColor }} strokeDasharray={`${wearPercent} 100`} strokeLinecap="round" />
            </svg>
            <div className="flex flex-col items-center z-10">
              <span className={`${compact ? 'text-[10px]' : 'text-sm'} font-black leading-none ${compound.color} drop-shadow-md`}>{compound.label}</span>
              <span className={`${compact ? 'text-[7px]' : 'text-[9px]'} font-black text-white mt-0.5`}>{wearPercent ? `${wearPercent}%` : '--%'}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5 w-full border-t border-white/10 pt-1.5">
            <div className={`${compact ? 'text-[11px]' : 'text-sm'} font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] tracking-tight`}>
              {temp ? (tempUnit === 'f' ? temp * 1.8 + 32 : temp).toFixed(compact ? 0 : 1) : '--'}°{tempUnit === 'c' ? 'C' : 'F'}
            </div>
            {!compact && (
              <div className="flex items-center gap-1 opacity-80">
                <img src="/brake.png" width={10} height={10} alt="Brake" className="opacity-70 brightness-125" />
                <span className="text-[9px] font-bold text-gray-400 font-mono">{brakeTemp ? (tempUnit === 'f' ? brakeTemp * 1.8 + 32 : brakeTemp).toFixed(0) : '--'}°</span>
              </div>
            )}
          </div>
          <div className={`absolute -top-1 -left-1 bg-gray-800/90 text-gray-400 ${compact ? 'text-[6px] px-1' : 'text-[8px] px-1.5'} font-black py-0.5 rounded border border-white/10 uppercase tracking-tighter backdrop-blur-md`}>{wLabel}</div>
        </div>
      </div>
    );
  };

  const isRef = theme === 'reference';
  const glowColor = isRef ? 'rgba(218, 165, 32, 0.4)' : undefined;
  return (
    <div className={`bg-white/10 glass-container-flat ${compact ? 'p-2 pt-6 rounded-xl' : 'p-4 pt-10 rounded-2xl'} border border-white/25 shadow-xl transition-all duration-300 relative group/tyres overflow-hidden ${className}`} style={{ boxShadow: isRef ? `0 10px 25px rgba(0,0,0,0.4), inset 0 0 20px ${glowColor}` : undefined, borderColor: isRef ? 'rgba(218, 165, 32, 0.3)' : undefined }} onMouseMove={(e) => handleGlassMouseMove(e, 0.15)}>
      <div className={`absolute top-0 left-0 flex items-center gap-1.5 ${compact ? 'p-2' : 'p-3'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isRef ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'}`} />
        <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] ${isRef ? 'text-amber-500' : 'text-gray-500'} group-hover/tyres:text-white transition-colors`}>{isRef ? 'Ref Tyres' : 'Tyres State'}</span>
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

const FuelDashboard = React.memo(({ data, cursorIndex, fuelCapacity, theme = 'current', compact = false, className = '' }: { data: any; cursorIndex: number | null; fuelCapacity?: number; theme?: 'current' | 'reference'; compact?: boolean; className?: string }) => {
  const getFuel = () => {
    if (!data || cursorIndex === null || !data['Fuel Level']) return null;
    const channel = data['Fuel Level'];
    const baseIdx = Math.floor(cursorIndex);
    const nextIdx = Math.min(channel.length - 1, baseIdx + 1);
    const frac = cursorIndex - baseIdx;
    const v1Raw = Array.isArray(channel) ? channel[baseIdx] : undefined;
    const v1 = typeof v1Raw === 'number' ? v1Raw : Array.isArray(v1Raw) ? v1Raw[0] : 0;
    const v2Raw = Array.isArray(channel) ? channel[nextIdx] : undefined;
    const v2 = typeof v2Raw === 'number' ? v2Raw : Array.isArray(v2Raw) ? v2Raw[0] : v1;
    return v1 + (v2 - v1) * frac;
  };
  const fuelVal = getFuel();
  const allFuel: number[] = data?.['Fuel Level'] || [];
  let maxFuelInData = 0;
  for (let i = 0; i < allFuel.length; i++) { if (allFuel[i] > maxFuelInData) maxFuelInData = allFuel[i]; }
  const effectiveCapacity = fuelCapacity && fuelCapacity > 0 ? fuelCapacity : maxFuelInData;
  const percentage = fuelVal && effectiveCapacity ? Math.min(100, (fuelVal / effectiveCapacity) * 100) : 0;
  const isRef = theme === 'reference';
  const fuelColor = isRef ? `hsl(${40 + percentage * 0.1}, 100%, 45%)` : `hsl(${percentage * 1.2}, 100%, 45%)`;
  const glowColor = isRef ? 'rgba(218, 165, 32, 0.4)' : undefined;
  return (
    <div className={`bg-white/10 glass-container-flat ${compact ? 'p-1.5 pt-6 rounded-xl' : 'p-4 pt-10 rounded-2xl'} border border-white/25 shadow-xl transition-all duration-300 relative group/fuel overflow-hidden ${className}`} style={{ boxShadow: isRef ? `0 10px 25px rgba(0,0,0,0.4), inset 0 0 20px ${glowColor}` : undefined, borderColor: isRef ? 'rgba(218, 165, 32, 0.3)' : undefined }} onMouseMove={(e) => handleGlassMouseMove(e, 0.15)}>
      <div className={`absolute top-0 left-0 flex items-center gap-1.5 ${compact ? 'p-2' : 'p-3'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isRef ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'}`} />
        <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] ${isRef ? 'text-amber-500' : 'text-gray-500'} group-hover/fuel:text-white transition-colors`}>{isRef ? 'Ref Fuel' : 'Fuel'}</span>
      </div>
      <div className={`glass-content w-full flex items-center ${compact ? 'gap-2' : 'gap-5'}`}>
        {!compact && (
          <div className="p-2 bg-white/5 rounded-xl border border-white/10 group-hover:border-blue-500/40 group-hover:bg-white/10 transition-all">
            <img src="/fuel.png" width={22} height={22} className={`opacity-90 object-contain w-4 h-4 shrink-0 pointer-events-none ${isRef ? 'sepia hue-rotate-[320deg]' : 'brightness-110'}`} alt="Fuel" />
          </div>
        )}
        <div className="flex-1 flex flex-col gap-1">
          <div className={`${compact ? 'h-2' : 'h-3'} bg-black/40 rounded-full overflow-hidden border border-white/10`}>
            <div className="h-full transition-all duration-700 ease-out" style={{ width: `${percentage}%`, backgroundColor: isRef ? '#daa520' : fuelColor, boxShadow: `0 0 15px ${isRef ? '#daa520' : fuelColor}44` }} />
          </div>
          <div className={`${compact ? 'text-[7px]' : 'text-[9px]'} font-black text-gray-500 font-mono flex justify-between tracking-tighter uppercase`}>
            <span>0.0 L</span>
            <span>MAX: {effectiveCapacity.toFixed(0)}L</span>
          </div>
        </div>
        <div className={`flex items-baseline gap-1 ${compact ? 'min-w-[50px]' : 'min-w-[80px]'} justify-end`}>
          <span className={`${compact ? 'text-lg' : 'text-2xl'} font-black text-white font-mono drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] tracking-tighter`}>{fuelVal !== null ? fuelVal.toFixed(compact ? 1 : 2) : '--'}</span>
        </div>
      </div>
    </div>
  );
});

// ── Main export ───────────────────────────────────────────────────────────────

interface LapDetailsPanelProps {
  telemetryMaxStats: { maxSpeed: number; maxGear: number };
  lineBounds: { curLineS: number; refLineS: number; refLineE: number };
  miniSectors: any[];
  currentLapMiniSectorTimes: Array<{ duration: number; startIdx: number; endIdx: number }> | null | undefined;
  refLapMiniSectorTimes: Array<{ duration: number; startIdx: number; endIdx: number }> | null | undefined;
  sessionMiniSectorBests: any;
  allLapsMiniSectorTimes: any;
  sessionBests: any;
}

export const LapDetailsPanel = React.memo(({
  telemetryMaxStats,
  lineBounds,
  miniSectors,
  currentLapMiniSectorTimes,
  refLapMiniSectorTimes,
  sessionMiniSectorBests,
  allLapsMiniSectorTimes,
  sessionBests,
}: LapDetailsPanelProps) => {
  // ── High-frequency subscriptions with rAF throttle ──────────────────────
  // Use a ref + rAF to throttle cursor re-renders to 60fps max
  const rafRef = useRef<number>(0);
  const cursorRef = useRef<{ cursor: number | null; smooth: number | null; refCursor: number | null; refDelta: number | null }>({
    cursor: null, smooth: null, refCursor: null, refDelta: null
  });
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    return useTelemetryStore.subscribe(state => {
      const changed =
        state.cursorIndex !== cursorRef.current.cursor ||
        state.smoothCursorIndex !== cursorRef.current.smooth ||
        state.referenceCursorIndex !== cursorRef.current.refCursor ||
        state.referenceDeltaIndex !== cursorRef.current.refDelta;
      if (!changed) return;
      cursorRef.current = {
        cursor: state.cursorIndex,
        smooth: state.smoothCursorIndex,
        refCursor: state.referenceCursorIndex,
        refDelta: state.referenceDeltaIndex,
      };
      if (rafRef.current) return; // already scheduled
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        forceUpdate();
      });
    });
  }, []);

  const cursorIndex = cursorRef.current.cursor;
  const smoothCursorIndex = cursorRef.current.smooth;
  const referenceCursorIndex = cursorRef.current.refCursor;
  const referenceDeltaIndex = cursorRef.current.refDelta;
  const isPlaying = useTelemetryStore(state => state.isPlaying);

  // ── Low-frequency subscriptions ────────────────────────────────────────────
  const telemetryData = useTelemetryStore(state => state.telemetryData);
  const referenceTelemetryData = useTelemetryStore(state => state.referenceTelemetryData);
  const referenceLap = useTelemetryStore(state => state.referenceLap);
  const laps = useTelemetryStore(state => state.laps);
  const selectedLapIdx = useTelemetryStore(state => state.selectedLapIdx);
  const referenceLapIdx = useTelemetryStore(state => state.referenceLapIdx);
  const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
  const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);
  const dashboardSyncMode = useTelemetryStore(state => state.dashboardSyncMode);
  const setDashboardSyncMode = useTelemetryStore(state => state.setDashboardSyncMode);
  const selectedSegIdx = useTelemetryStore(state => state.selectedSegIdx);
  const selectedSectorIdx = useTelemetryStore(state => state.selectedSectorIdx);
  const showMiniSectors = useTelemetryStore(state => state.showMiniSectors);
  const chartConfigs = useTelemetryStore(state => state.chartConfigs);
  const speedUnit = useTelemetryStore(state => state.speedUnit);

  if (selectedLapIdx === null || !telemetryData) return null;

  const currentLap = laps.find(l => l.lap === selectedLapIdx);
  const isCrossSession = !!referenceLap && !!referenceTelemetryData;
  const refLap = isCrossSession ? referenceLap : referenceLapIdx !== null ? laps.find(l => l.lap === referenceLapIdx) : null;

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

  const { maxSpeed, maxGear } = telemetryMaxStats;
  const activeCursorIdx = isPlaying ? (smoothCursorIndex ?? cursorIndex) : cursorIndex;
  const refIdx = dashboardSyncMode === 'time' ? referenceCursorIndex : referenceDeltaIndex;
  const hasRef = referenceLapIdx !== null || !!referenceTelemetryData;
  const refData = referenceTelemetryData || telemetryData;
  const refMeta = referenceSessionMetadata || sessionMetadata;
  const radarInRightColumn = !hasRef || showMiniSectors;

  const findIndexInChannelRange = (channel: number[] | Float64Array, start: number, end: number, targetVal: number): number => {
    if (start >= end) return start;
    if (targetVal <= channel[start]) return start;
    if (targetVal >= channel[end]) return end;
    let low = start;
    let high = end;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (channel[mid] < targetVal) { low = mid; } else { high = mid; }
    }
    const valLow = channel[low];
    const valHigh = channel[high];
    if (valLow === undefined || valHigh === undefined || Math.abs(valHigh - valLow) < 1e-9) return low;
    return low + (targetVal - valLow) / (valHigh - valLow);
  };

  let autoCompareIdx: number | null = null;
  if (!hasRef && selectedSegIdx !== null && sessionMiniSectorBests) {
    const best = sessionMiniSectorBests.bests[selectedSegIdx];
    if (best && telemetryData) {
      const bestLapNum = best.lap;
      const bestLapTimes = allLapsMiniSectorTimes?.[bestLapNum];
      const bestLapSegTime = bestLapTimes?.[selectedSegIdx];
      if (bestLapSegTime) {
        const currentLapIdx = selectedLapIdx !== null ? selectedLapIdx : (laps.find(l => l.isValid)?.lap ?? laps[0].lap);
        const curLap = laps.find(l => l.lap === currentLapIdx);
        const bestLapObj = laps.find(l => l.lap === bestLapNum);
        if (curLap && bestLapObj) {
          const times = telemetryData['Time'] || telemetryData['GPS Time'];
          const lapChan = telemetryData['Lap'];
          if (activeCursorIdx !== null && times && lapChan) {
            const getInterpolatedVal = (arr: number[] | Float64Array) => {
              const base = Math.floor(activeCursorIdx);
              const frac = activeCursorIdx - base;
              const v1 = arr[base];
              if (v1 === undefined) return 0;
              const v2 = arr[base + 1] ?? v1;
              return v1 + (v2 - v1) * frac;
            };
            const { curLineS, refLineS, refLineE } = lineBounds;
            if (curLineS !== -1 && refLineS !== -1) {
              const currentLapSegTime = currentLapMiniSectorTimes?.[selectedSegIdx];
              const curTime = getInterpolatedVal(times);
              if (currentLapSegTime && bestLapSegTime) {
                const curSegStartTime = times[currentLapSegTime.startIdx] || 0;
                const curSegPassedTime = curTime - curSegStartTime;
                const refSegStartTime = times[bestLapSegTime.startIdx] || 0;
                const targetRefTime = refSegStartTime + curSegPassedTime;
                autoCompareIdx = findIndexInChannelRange(times, bestLapSegTime.startIdx, bestLapSegTime.endIdx, targetRefTime);
              } else {
                const curTimeOffset = curTime - times[curLineS];
                const targetRefTime = times[refLineS] + curTimeOffset;
                autoCompareIdx = findIndexInChannelRange(times, refLineS, refLineE, targetRefTime);
              }
            }
          }
        }
      }
    }
  }

  const showLiveTelemetryRef = hasRef || autoCompareIdx !== null;
  const isComparingToTheoreticalBest = !hasRef && autoCompareIdx !== null;

  return (
    <div className="min-w-max flex flex-col gap-3">
      <div className={hasRef ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
        {/* Lap Time Card */}
        <div className={`bg-white/10 glass-container-flat ${hasRef ? 'p-2 pt-6' : 'p-4 pt-10'} rounded-2xl border border-white/25 shadow-xl hover:bg-white/15 transition-all relative group/laptime`} onMouseMove={handleGlassMouseMove}>
          <div className={`absolute top-0 left-0 flex items-center gap-2 ${hasRef ? 'p-2' : 'p-4'}`}>
            <span className={`${hasRef ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] text-gray-500 group-hover/laptime:text-white transition-colors`}>Lap Time</span>
          </div>
          <div className="glass-content">
            {hasRef ? (
              showMiniSectors ? (
                <div className="flex flex-col gap-1.5">
                  <ComparisonRow label={<img src="/finish-flag.png" width={12} height={12} className="opacity-70" alt="Flag" />} val={currentLap?.duration} refVal={(refLap as any)?.duration} compact={true} />
                  {miniSectors.map((seg: any, idx: number) => {
                    const val = currentLapMiniSectorTimes?.[idx]?.duration;
                    const refVal = refLapMiniSectorTimes?.[idx]?.duration;
                    return <ComparisonRow key={idx} label={seg.name} val={val} refVal={refVal} valColorClass="text-gray-300" compact={true} highlighted={selectedSegIdx === idx} />;
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <ComparisonRow label={<img src="/finish-flag.png" width={12} height={12} className="opacity-70" alt="Flag" />} val={currentLap?.duration} refVal={(refLap as any)?.duration} compact={true} />
                  {[0, 1, 2].map((idx) => {
                    const sectorTimes = [currentLap?.s1, currentLap?.s2, currentLap?.s3];
                    const refSectorTimes = hasRef && refLap ? [refLap.s1, refLap.s2, refLap.s3] : [sessionBests?.bestS1?.val, sessionBests?.bestS2?.val, sessionBests?.bestS3?.val];
                    return <ComparisonRow key={idx} label={`S${idx + 1}`} val={sectorTimes[idx]} refVal={refSectorTimes[idx]} valColorClass="text-gray-300" compact={true} highlighted={selectedSectorIdx === idx} />;
                  })}
                </div>
              )
            ) : (
              <div className="flex flex-col gap-3 min-w-[260px]">
                {(laps.length > 1 || !!refLap) && (
                  <>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-baseline border-b border-white/5 pb-1.5 px-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${refLap ? 'text-yellow-500' : 'text-gray-300'}`}>
                            {refLap ? (selectedSegIdx !== null ? `Reference Lap (SEG ${selectedSegIdx + 1})` : selectedSectorIdx !== null ? `Reference Lap (S${selectedSectorIdx + 1})` : 'Reference Lap') : (selectedSegIdx !== null ? `Theoretical Best (SEG ${selectedSegIdx + 1})` : selectedSectorIdx !== null ? `Session Best (S${selectedSectorIdx + 1})` : 'Theoretical Best')}
                          </span>
                          {refLap && <span className="px-1.5 py-0.5 rounded-sm bg-yellow-500/20 text-white text-[7px] font-black border border-yellow-500/20 leading-none">L{refLap.lap}</span>}
                        </div>
                        <span className={`text-[17px] font-black font-mono tracking-tighter ${refLap ? 'text-yellow-500' : 'text-purple-400'}`}>
                          {formatTime(refLap ? (selectedSegIdx !== null ? refLapMiniSectorTimes?.[selectedSegIdx]?.duration || 0 : selectedSectorIdx !== null ? [refLap.s1, refLap.s2, refLap.s3][selectedSectorIdx] || 0 : refLap.duration || 0) : (selectedSegIdx !== null ? sessionMiniSectorBests?.bests[selectedSegIdx]?.val || 0 : selectedSectorIdx !== null ? [sessionBests?.bestS1, sessionBests?.bestS2, sessionBests?.bestS3][selectedSectorIdx]?.val || 0 : showMiniSectors ? sessionMiniSectorBests?.theoreticalBest || 0 : sessionBests?.theoreticalBest || 0))}
                        </span>
                      </div>
                      {selectedSegIdx === null && selectedSectorIdx === null && (
                        <div className="grid grid-cols-3 gap-2 px-1">
                          {refLap ? (
                            showMiniSectors ? (
                              refLapMiniSectorTimes?.map((item, idx) => {
                                const formatted = formatTime(item.duration);
                                const displayTime = formatted.startsWith('0:') ? formatted.slice(2) : formatted;
                                return (<div key={idx} className="flex flex-col p-1 transition-all rounded-lg duration-300"><span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-0.5">R{idx + 1}</span><div className="flex items-baseline gap-1.5"><span className="text-[12px] font-black text-white font-mono tracking-tighter">{displayTime}</span></div></div>);
                              })
                            ) : (
                              <div className="grid grid-cols-3 gap-2 px-1">
                                {[
                                  { label: 'RS1', val: refLap?.s1, isBest: refLap?.s1 > 0 && refLap?.s1 <= (sessionBests?.bestS1.val || 0), lap: sessionBests?.bestS1.lap || 0 },
                                  { label: 'RS2', val: refLap?.s2, isBest: refLap?.s2 > 0 && refLap?.s2 <= (sessionBests?.bestS2.val || 0), lap: sessionBests?.bestS2.lap || 0 },
                                  { label: 'RS3', val: refLap?.s3, isBest: refLap?.s3 > 0 && refLap?.s3 <= (sessionBests?.bestS3.val || 0), lap: sessionBests?.bestS3.lap || 0 }
                                ].map((item, idx) => {
                                  const formatted = formatTime(item.val);
                                  const displayTime = formatted.startsWith('0:') ? formatted.slice(2) : formatted;
                                  return (<div key={idx} className={`flex flex-col p-1 transition-all rounded-lg duration-300 ${selectedSectorIdx === idx ? 'bg-purple-500/10 ring-1 ring-purple-500/30' : ''}`}><span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-0.5">{item.label}</span><div className="flex items-baseline gap-1.5"><span className="text-[12px] font-black text-white font-mono tracking-tighter">{displayTime}</span>{item.lap > 0 && <span className="px-1.5 py-0.5 rounded-sm bg-purple-500/20 text-white text-[7px] font-black border border-purple-500/20 leading-none">L{item.lap}</span>}</div></div>);
                                })}
                              </div>
                            )
                          ) : (
                            showMiniSectors ? (
                              sessionMiniSectorBests?.bests.map((item: any, idx: number) => {
                                const formatted = formatTime(item.val);
                                const displayTime = formatted.startsWith('0:') ? formatted.slice(2) : formatted;
                                return (<div key={idx} className={`flex flex-col p-1 transition-all rounded-lg duration-300 ${selectedSegIdx === idx ? 'bg-purple-500/10 ring-1 ring-purple-500/30' : ''}`}><span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-0.5">{item.label}</span><div className="flex items-baseline gap-1.5"><span className="text-[12px] font-black text-white font-mono tracking-tighter">{displayTime}</span>{item.lap > 0 && <span className="px-1.5 py-0.5 rounded-sm bg-purple-500/20 text-white text-[7px] font-black border border-purple-500/20 leading-none">L{item.lap}</span>}</div></div>);
                              })
                            ) : (
                              [{ label: 'BS1', val: sessionBests?.bestS1.val, lap: sessionBests?.bestS1.lap }, { label: 'BS2', val: sessionBests?.bestS2.val, lap: sessionBests?.bestS2.lap }, { label: 'BS3', val: sessionBests?.bestS3.val, lap: sessionBests?.bestS3.lap }].map((item, i) => {
                                const formatted = formatTime(item.val);
                                const displayTime = formatted.startsWith('0:') ? formatted.slice(2) : formatted;
                                return (<div key={i} className={`flex flex-col p-1 transition-all rounded-lg duration-300 ${selectedSectorIdx === i ? 'bg-purple-500/10 ring-1 ring-purple-500/30' : ''}`}><span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.15em] mb-0.5">{item.label}</span><div className="flex items-baseline gap-1.5"><span className="text-[12px] font-black text-white font-mono tracking-tighter">{displayTime}</span>{item.lap && <span className="px-1.5 py-0.5 rounded-sm bg-purple-500/20 text-white text-[7px] font-black border border-purple-500/20 leading-none">L{item.lap}</span>}</div></div>);
                              })
                            )
                          )}
                        </div>
                      )}
                    </div>
                    <div className="h-px bg-white/10 w-full" />
                  </>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-baseline border-b border-white/5 pb-1.5 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{selectedSegIdx !== null ? `Current Lap (SEG ${selectedSegIdx + 1})` : selectedSectorIdx !== null ? `Current Lap (S${selectedSectorIdx + 1})` : 'Current Lap'}</span>
                      {currentLap && <span className="px-1.5 py-0.5 rounded-sm bg-blue-500/20 text-white text-[7px] font-black border border-blue-500/20 leading-none">L{currentLap.lap}</span>}
                    </div>
                    <span className="text-[20px] font-black text-white font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{formatTime(selectedSegIdx !== null ? currentLapMiniSectorTimes?.[selectedSegIdx]?.duration || 0 : selectedSectorIdx !== null ? [currentLap?.s1, currentLap?.s2, currentLap?.s3][selectedSectorIdx] || 0 : currentLap?.duration)}</span>
                  </div>
                  {selectedSegIdx === null && selectedSectorIdx === null && (
                    showMiniSectors ? (
                      <div className="grid grid-cols-3 gap-2 px-1">
                        {miniSectors.map((seg: any, idx: number) => {
                          const val = currentLapMiniSectorTimes?.[idx]?.duration;
                          const bestVal = sessionMiniSectorBests?.bests[idx]?.val || 0;
                          const isBest = val > 0 && bestVal > 0 && val <= bestVal;
                          const formatted = formatTime(val);
                          const displayTime = formatted.startsWith('0:') ? formatted.slice(2) : formatted;
                          return (<div key={idx} className={`flex flex-col p-1 transition-all rounded-lg duration-300 ${selectedSegIdx === idx ? 'bg-purple-500/10 ring-1 ring-purple-500/30' : ''}`}><span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">{seg.name}</span><span className={`text-[13px] font-black font-mono tracking-tighter ${isBest ? 'text-purple-400' : 'text-yellow-500'}`}>{displayTime}</span></div>);
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 px-1">
                        {[
                          { label: 'S1', val: currentLap?.s1, isBest: currentLap?.s1 > 0 && currentLap?.s1 <= (sessionBests?.bestS1.val || 0) },
                          { label: 'S2', val: currentLap?.s2, isBest: currentLap?.s2 > 0 && currentLap?.s2 <= (sessionBests?.bestS2.val || 0) },
                          { label: 'S3', val: currentLap?.s3, isBest: currentLap?.s3 > 0 && currentLap?.s3 <= (sessionBests?.bestS3.val || 0) },
                        ].map((item, i) => {
                          const formatted = formatTime(item.val);
                          const displayTime = formatted.startsWith('0:') ? formatted.slice(2) : formatted;
                          return (<div key={i} className={`flex flex-col p-1 transition-all rounded-lg duration-300 ${selectedSectorIdx === i ? 'bg-purple-500/10 ring-1 ring-purple-500/30' : ''}`}><span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">{item.label}</span><span className={`text-[13px] font-black font-mono tracking-tighter ${item.isBest ? 'text-purple-400' : 'text-yellow-500'}`}>{displayTime}</span></div>);
                        })}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Telemetry Card */}
        <div className="flex flex-col gap-3">
          <div className={`bg-white/10 glass-container-flat ${showLiveTelemetryRef ? 'p-2 pt-6' : 'p-4 pt-10'} rounded-2xl border border-white/25 shadow-xl hover:bg-white/15 transition-all relative group/telemetry`} onMouseMove={handleGlassMouseMove}>
            <div className={`absolute top-0 left-0 w-full flex items-center justify-between ${showLiveTelemetryRef ? 'p-2' : 'p-4'} mix-blend-screen`}>
              <span className={`${showLiveTelemetryRef ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] text-gray-500 group-hover/telemetry:text-white transition-colors`}>{isComparingToTheoreticalBest ? 'Live Telemetry (vs Best)' : 'Live Telemetry'}</span>
            </div>
            <div className="glass-content">
              <div className="flex flex-col gap-1.5">
                <LiveTelemetryRow icon={({ size, className }: any) => <img src="/speed.png" width={showLiveTelemetryRef ? 10 : size} height={showLiveTelemetryRef ? 10 : size} className={className} alt="S" />} label="Speed" color={chartConfigs.find((c: any) => c.id === 'Ground Speed' || c.id === 'Speed')?.color || '#00aaff'} unit={speedUnit === 'kmh' ? 'kmh' : 'mph'} max={speedUnit === 'kmh' ? maxSpeed : maxSpeed * 0.621371} val={getVal('Ground Speed', activeCursorIdx)} refVal={hasRef ? getVal('Ground Speed', refIdx, true) : getVal('Ground Speed', autoCompareIdx, false)} compact={showLiveTelemetryRef} />
                <LiveTelemetryRow icon={({ size, className }: any) => <img src="/throttle.png" width={showLiveTelemetryRef ? 10 : size} height={showLiveTelemetryRef ? 10 : size} className={className} alt="T" />} label="Throttle" color={chartConfigs.find((c: any) => c.id === 'Throttle Pos' || c.id === 'Throttle')?.color || '#00ff00'} unit="%" val={getVal('Throttle Pos', activeCursorIdx)} refVal={hasRef ? getVal('Throttle Pos', refIdx, true) : getVal('Throttle Pos', autoCompareIdx, false)} compact={showLiveTelemetryRef} />
                <LiveTelemetryRow icon={({ size, className }: any) => <img src="/brake.png" width={showLiveTelemetryRef ? 10 : size} height={showLiveTelemetryRef ? 10 : size} className={className} alt="B" />} label="Brake" color={chartConfigs.find((c: any) => c.id === 'Brake Pos' || c.id === 'Brake')?.color || '#ff0000'} unit="%" val={getVal('Brake Pos', activeCursorIdx)} refVal={hasRef ? getVal('Brake Pos', refIdx, true) : getVal('Brake Pos', autoCompareIdx, false)} compact={showLiveTelemetryRef} />
                <LiveTelemetryRow icon={({ size, className }: any) => <img src="/gear.png" width={showLiveTelemetryRef ? 10 : size} height={showLiveTelemetryRef ? 10 : size} className={className} alt="G" />} label="Gear" color={chartConfigs.find((c: any) => c.id === 'Gear')?.color || '#ffaa00'} max={maxGear} val={getVal('Gear', activeCursorIdx)} refVal={hasRef ? getVal('Gear', refIdx, true) : getVal('Gear', autoCompareIdx, false)} compact={showLiveTelemetryRef} />
              </div>
            </div>
          </div>

          {radarInRightColumn && (
            <div className={`bg-white/10 glass-container-flat ${hasRef ? 'p-2 pt-6' : 'p-4 pt-10'} rounded-2xl border border-white/25 shadow-xl hover:bg-white/15 transition-all relative group/gforce`} onMouseMove={handleGlassMouseMove}>
              <div className={`absolute top-0 left-0 w-full flex items-center justify-between ${hasRef ? 'p-2' : 'p-4'} mix-blend-screen`}>
                <span className={`${hasRef ? 'text-[8px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] text-gray-500 group-hover/gforce:text-white transition-colors`}>G-Force Radar</span>
              </div>
              <div className="glass-content">
                <GForceRadar data={telemetryData} refData={refData} cursorIndex={activeCursorIdx} refIdx={refIdx} hasRef={hasRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {!radarInRightColumn && (
        <div className="flex justify-center mt-1">
          <div className="bg-white/10 glass-container-flat p-2 pt-6 rounded-2xl border border-white/25 shadow-xl hover:bg-white/15 transition-all relative group/gforce w-[280px]" onMouseMove={handleGlassMouseMove}>
            <div className="absolute top-0 left-0 w-full flex items-center justify-between p-2 mix-blend-screen">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover/gforce:text-white transition-colors">G-Force Radar</span>
            </div>
            <div className="glass-content">
              <GForceRadar data={telemetryData} refData={refData} cursorIndex={activeCursorIdx} refIdx={refIdx} hasRef={hasRef} />
            </div>
          </div>
        </div>
      )}

      {hasRef && (
        <div className="relative flex items-center p-1 bg-black/30 rounded-xl border border-white/10 self-center w-48 h-8 overflow-hidden group/sync-toggle" onMouseMove={handleGlassMouseMove}>
          <div className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0" style={{ left: dashboardSyncMode === 'distance' ? '4px' : 'calc(50%)' }} />
          <button onClick={() => setDashboardSyncMode('distance')} className={`relative z-10 flex-1 h-full flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${dashboardSyncMode === 'distance' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>Distance Sync</button>
          <button onClick={() => setDashboardSyncMode('time')} className={`relative z-10 flex-1 h-full flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${dashboardSyncMode === 'time' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>Time Sync</button>
        </div>
      )}

      <div className={hasRef ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
        <F1Dashboard data={telemetryData} cursorIndex={activeCursorIdx} theme="current" compact={hasRef} />
        {hasRef && <F1Dashboard data={refData} cursorIndex={refIdx} theme="reference" compact={hasRef} />}
      </div>

      <div className={hasRef ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
        <SteeringWheelView data={telemetryData} cursorIndex={activeCursorIdx} carModel={sessionMetadata?.modelName} theme="current" compact={hasRef} />
        {hasRef && <SteeringWheelView data={refData} cursorIndex={refIdx} carModel={refMeta?.modelName} theme="reference" compact={hasRef} />}
      </div>

      <div className={hasRef ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
        <TyreDashboard data={telemetryData} cursorIndex={activeCursorIdx} carClass={sessionMetadata?.carClass} tyreCompoundMax={sessionMetadata?.tyreCompoundMax} theme="current" compact={hasRef} />
        {hasRef && <TyreDashboard data={refData} cursorIndex={refIdx} carClass={refMeta?.carClass} tyreCompoundMax={refMeta?.tyreCompoundMax} theme="reference" compact={hasRef} />}
      </div>

      <div className={hasRef ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
        <FuelDashboard data={telemetryData} cursorIndex={activeCursorIdx} fuelCapacity={sessionMetadata?.fuelCapacity} theme="current" compact={hasRef} />
        {hasRef && <FuelDashboard data={refData} cursorIndex={refIdx} fuelCapacity={refMeta?.fuelCapacity} theme="reference" compact={hasRef} />}
      </div>
    </div>
  );
});
