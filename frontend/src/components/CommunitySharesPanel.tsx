import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { apiClient } from '../api/client';
import { 
    Download, Check, AlertTriangle, Loader2, MessageSquare, 
    Calendar, User, HelpCircle, HardDrive, Cpu, Compass, Settings, Globe,
    MapPin, Car, SlidersHorizontal, ChevronDown, Clock, Zap, ArrowUpDown
} from 'lucide-react';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { getCountryFlagPath, getCountryFromTrackName } from '../utils/trackHelpers';
import { getBrandLogoPath } from '../utils/carHelpers';

export function parseLapTimeToSeconds(str?: string): number {
    if (!str) return Infinity;
    const s = str.trim();

    // 1. Format: 2m02s264 or 2m02s26
    const mSMatch = s.match(/^(\d+)m(\d+)s(\d+)$/i);
    if (mSMatch) {
        const min = parseInt(mSMatch[1], 10);
        const sec = parseInt(mSMatch[2], 10);
        const msStr = mSMatch[3].padEnd(3, '0').slice(0, 3);
        const ms = parseInt(msStr, 10);
        return min * 60 + sec + ms / 1000;
    }

    // 2. Format: 2:02.264 or 02:02.264
    const cMatch = s.match(/^(\d+):(\d+)(?:\.(\d+))?$/);
    if (cMatch) {
        const min = parseInt(cMatch[1], 10);
        const sec = parseInt(cMatch[2], 10);
        const msStr = (cMatch[3] || '0').padEnd(3, '0').slice(0, 3);
        const ms = parseInt(msStr, 10);
        return min * 60 + sec + ms / 1000;
    }

    // 3. Format: 2m02.264s
    const mDotMatch = s.match(/^(\d+)m(\d+)\.(\d+)s?$/i);
    if (mDotMatch) {
        const min = parseInt(mDotMatch[1], 10);
        const sec = parseInt(mDotMatch[2], 10);
        const msStr = mDotMatch[3].padEnd(3, '0').slice(0, 3);
        const ms = parseInt(msStr, 10);
        return min * 60 + sec + ms / 1000;
    }

    // 4. Format: 122.264s or 122.264
    const secOnlyMatch = s.match(/^(\d+)(?:\.(\d+))?s?$/);
    if (secOnlyMatch) {
        const sec = parseInt(secOnlyMatch[1], 10);
        const msStr = (secOnlyMatch[2] || '0').padEnd(3, '0').slice(0, 3);
        const ms = parseInt(msStr, 10);
        return sec + ms / 1000;
    }

    return Infinity;
}

export function extractLapTimeSeconds(share: any): number {
    const title = share.title || '';
    const parts = title.split('|').map((p: string) => p.trim());

    for (const part of parts) {
        const secs = parseLapTimeToSeconds(part);
        if (secs < Infinity) return secs;
    }

    const fileSecs = parseLapTimeToSeconds(share.telemetry?.filename || '');
    return fileSecs;
}

const DiscordIcon = ({ size = 16, className = "" }) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        fill="currentColor"
    >
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
    </svg>
);

interface CustomSelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
    image?: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: CustomSelectOption[];
    placeholder?: string;
    icon?: React.ReactNode;
    label?: string;
    accentColor?: 'blue' | 'emerald' | 'purple' | 'indigo';
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    icon,
    label,
    accentColor = 'blue'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    const borderFocusColor = accentColor === 'emerald'
        ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
        : accentColor === 'indigo'
        ? 'border-[#5865F2]/50 shadow-[0_0_15px_rgba(88,101,242,0.2)]'
        : 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]';

    return (
        <div ref={containerRef} className="relative w-full min-w-0 flex flex-col gap-1">
            {label && (
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                    {icon} {label}
                </label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-[#16161c] border border-white/10 hover:border-white/25 rounded-xl px-3 py-2 text-[11px] font-bold text-white flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isOpen ? borderFocusColor : ''
                }`}
            >
                <div className="flex items-center gap-2 min-w-0 truncate">
                    {selectedOption?.image ? (
                        <div className="w-4 h-2.5 rounded-[2px] overflow-hidden border border-black/40 shadow-sm flex-shrink-0">
                            <img src={selectedOption.image} alt="" className="w-full h-full object-cover" />
                        </div>
                    ) : selectedOption?.icon ? (
                        <div className="flex-shrink-0">{selectedOption.icon}</div>
                    ) : null}
                    <span className="truncate">{selectedOption?.label || placeholder}</span>
                </div>
                <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* Dropdown Menu Overlay */}
            {isOpen && (
                <div className="absolute top-[105%] left-0 right-0 z-50 bg-[#16161c]/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden py-1 max-h-56 overflow-y-auto custom-scrollbar">
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-[11px] font-bold flex items-center justify-between gap-2 transition-all ${
                                    isSelected 
                                        ? (accentColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 font-extrabold' : accentColor === 'indigo' ? 'bg-[#5865F2]/20 text-[#7289da] font-extrabold' : 'bg-blue-500/20 text-blue-300 font-extrabold')
                                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0 truncate">
                                    {option.image ? (
                                        <div className="w-4 h-2.5 rounded-[2px] overflow-hidden border border-black/40 shadow-sm flex-shrink-0">
                                            <img src={option.image} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ) : option.icon ? (
                                        <div className="flex-shrink-0">{option.icon}</div>
                                    ) : null}
                                    <span className="break-words leading-tight">{option.label}</span>
                                </div>
                                {isSelected && <Check size={12} className={accentColor === 'emerald' ? 'text-emerald-400' : accentColor === 'indigo' ? 'text-[#5865F2]' : 'text-blue-400'} />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

interface CommunitySharesPanelProps {
    onClose?: () => void;
    onDownloadSuccess?: (sessionId: string) => void;
}

export const CommunitySharesPanel: React.FC<CommunitySharesPanelProps> = ({ onClose, onDownloadSuccess }) => {
    const fetchSessions = useTelemetryStore(state => state.fetchSessions);
    const activeProfileId = useTelemetryStore(state => state.activeProfileId);
    
    const [carClass, setCarClass] = useState<string>('lmgt3-telemetry-sharing');
    const [selectedTrack, setSelectedTrack] = useState<string>('all');
    const [selectedCar, setSelectedCar] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'fastest'>('newest');

    const [shares, setShares] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

    const loadShares = async (targetClass: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiClient.listDiscordShares(targetClass);
            setShares(data.shares || []);
        } catch (err: any) {
            console.error('Failed to load shared laps:', err);
            setError(err.message || 'Failed to retrieve shared laps. Please ensure Discord is configured and active.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadShares(carClass);
    }, [carClass]);

    const handleDownload = async (share: any) => {
        const threadId = share.thread_id;
        if (downloadingIds.has(threadId) || completedIds.has(threadId)) return;

        setDownloadingIds(prev => {
            const next = new Set(prev);
            next.add(threadId);
            return next;
        });

        try {
            await apiClient.downloadDiscordShare(
                share.telemetry.url,
                share.telemetry.filename,
                share.setup?.url,
                share.setup?.filename,
                activeProfileId || 'guest'
            );
            
            // Refresh local session list so the downloaded file appears instantly
            await fetchSessions();
            
            setCompletedIds(prev => {
                const next = new Set(prev);
                next.add(threadId);
                return next;
            });

            // Trigger callback to go back to local laps and highlight
            if (onDownloadSuccess) {
                onDownloadSuccess(share.telemetry.filename);
            }
        } catch (err: any) {
            console.error('Download failed:', err);
            alert(`Failed to download shared lap: ${err.message || 'Unknown error'}`);
        } finally {
            setDownloadingIds(prev => {
                const next = new Set(prev);
                next.delete(threadId);
                return next;
            });
        }
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        return `(${(bytes / (1024 * 1024)).toFixed(2)} MB)`;
    };

    const formatDate = (isoStr: string) => {
        if (!isoStr) return '';
        try {
            const date = new Date(isoStr);
            return date.toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch {
            return '';
        }
    };

    const availableTracks = useMemo(() => {
        const set = new Set<string>();
        shares.forEach(s => {
            const parts = (s.title || '').split('|').map((p: string) => p.trim());
            const track = parts[0];
            if (track) set.add(track);
        });
        return Array.from(set).sort();
    }, [shares]);

    const availableCars = useMemo(() => {
        const set = new Set<string>();
        shares.forEach(s => {
            const parts = (s.title || '').split('|').map((p: string) => p.trim());
            const car = parts[1];
            if (car) set.add(car);
        });
        return Array.from(set).sort();
    }, [shares]);

    const sortedAndFilteredShares = useMemo(() => {
        const list = shares.filter(s => {
            if (s.locked || s.thread_metadata?.locked) return false;
            const parts = (s.title || '').split('|').map((p: string) => p.trim());
            const track = parts[0] || '';
            const car = parts[1] || '';

            if (selectedTrack !== 'all') {
                const cleanT = selectedTrack.toLowerCase();
                const trackMatch = track.toLowerCase() === cleanT;
                const titleMatch = (s.title || '').toLowerCase().includes(cleanT);
                const fileMatch = (s.telemetry?.filename || '').toLowerCase().includes(cleanT);
                if (!trackMatch && !titleMatch && !fileMatch) return false;
            }

            if (selectedCar !== 'all') {
                const cleanC = selectedCar.toLowerCase();
                const carMatch = car.toLowerCase() === cleanC;
                const titleMatch = (s.title || '').toLowerCase().includes(cleanC);
                const fileMatch = (s.telemetry?.filename || '').toLowerCase().includes(cleanC);
                if (!carMatch && !titleMatch && !fileMatch) return false;
            }

            return true;
        });

        if (sortBy === 'fastest') {
            list.sort((a, b) => {
                const timeA = extractLapTimeSeconds(a);
                const timeB = extractLapTimeSeconds(b);
                return timeA - timeB;
            });
        } else {
            // Newest first (default sort by ID or created_at descending)
            list.sort((a, b) => {
                const idA = a.thread_id || a.id || '';
                const idB = b.thread_id || b.id || '';
                return idB.localeCompare(idA);
            });
        }

        return list;
    }, [shares, selectedTrack, selectedCar, sortBy]);

    const trackOptions = useMemo(() => {
        const list: CustomSelectOption[] = [
            { value: 'all', label: `All Tracks (${shares.length})` }
        ];
        availableTracks.forEach(t => {
            const country = getCountryFromTrackName(t);
            const flagPath = getCountryFlagPath(country);
            list.push({
                value: t,
                label: t,
                image: flagPath || undefined,
                icon: !flagPath ? <Globe size={12} className="text-blue-400" /> : undefined
            });
        });
        return list;
    }, [availableTracks, shares.length]);

    const carOptions = useMemo(() => {
        const list: CustomSelectOption[] = [
            { value: 'all', label: `All Cars (${shares.length})` }
        ];
        availableCars.forEach(c => {
            const brandLogo = getBrandLogoPath(c);
            list.push({
                value: c,
                label: c,
                icon: brandLogo ? <img src={brandLogo} alt="" className="w-4 h-4 object-contain" /> : <Car size={12} className="text-emerald-400" />
            });
        });
        return list;
    }, [availableCars, shares.length]);

    const categoryOptions: CustomSelectOption[] = [
        { value: 'lmgt3-telemetry-sharing', label: 'LMGT3' },
        { value: 'hypercar-telemetry-sharing', label: 'Hypercar' },
        { value: 'lmp2-telemetry-sharing', label: 'LMP2' },
        { value: 'lmp3-telemetry-sharing', label: 'LMP3' },
        { value: 'gte-telemetry-sharing', label: 'GTE' }
    ];

    const sortOptions: CustomSelectOption[] = [
        { value: 'newest', label: 'Newest' },
        { value: 'fastest', label: 'Fastest' }
    ];

    return (
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden animate-in fade-in duration-200" style={{ minHeight: '0' }}>
            {/* Header / Category & Filter Switchers */}
            <div className="flex flex-col gap-2.5 bg-white/[0.02] p-3.5 rounded-2xl border border-white/5">
                {/* Row 1: Car Category & Sort By */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <CustomSelect
                        label="Car Category"
                        icon={<SlidersHorizontal size={12} className="text-[#5865F2]" />}
                        value={carClass}
                        onChange={(val) => {
                            setCarClass(val);
                            setSelectedTrack('all');
                            setSelectedCar('all');
                        }}
                        options={categoryOptions}
                        accentColor="indigo"
                    />

                    <CustomSelect
                        label="Sort Laps By"
                        icon={<ArrowUpDown size={12} className="text-purple-400" />}
                        value={sortBy}
                        onChange={(val) => setSortBy(val as 'newest' | 'fastest')}
                        options={sortOptions}
                        accentColor="purple"
                    />
                </div>

                {/* Track Tag & Car Model Filters (Stacked vertically in 2 rows) */}
                <div className="flex flex-col gap-2.5 pt-1.5 border-t border-white/5">
                    <CustomSelect
                        label="Track Tag"
                        icon={<MapPin size={11} className="text-blue-400" />}
                        value={selectedTrack}
                        onChange={(val) => setSelectedTrack(val)}
                        options={trackOptions}
                        accentColor="blue"
                    />

                    <CustomSelect
                        label="Car Model"
                        icon={<Car size={11} className="text-emerald-400" />}
                        value={selectedCar}
                        onChange={(val) => setSelectedCar(val)}
                        options={carOptions}
                        accentColor="emerald"
                    />
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col gap-2 items-center text-center">
                    <AlertTriangle size={24} className="text-red-400" />
                    <span className="text-[12px] text-gray-300 font-bold leading-normal">{error}</span>
                    <button 
                        onClick={() => loadShares(carClass)}
                        className="mt-1 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border border-red-500/30 active:scale-95"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Loading State */}
            {isLoading && !error && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12">
                    <Loader2 size={32} className="animate-spin text-[#5865F2]" />
                    <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest">Fetching shares...</span>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && sortedAndFilteredShares.length === 0 && (
                <div className="flex-grow flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-500">
                    <Compass size={32} className="opacity-30" />
                    <span className="text-[11px] font-black uppercase tracking-widest">
                        {shares.length === 0 ? "No shared laps found" : "No matching shares found"}
                    </span>
                    <span className="text-[10px] max-w-[200px]">
                        {shares.length === 0 ? "Be the first to share your telemetry in this category!" : "Try adjusting your track or car filters."}
                    </span>
                </div>
            )}

            {/* Shares List */}
            {!isLoading && !error && sortedAndFilteredShares.length > 0 && (
                <div className="flex-grow overflow-y-auto px-2 pt-2.5 pb-4 flex flex-col gap-3.5 custom-scrollbar" style={{ minHeight: '0' }}>
                    {sortedAndFilteredShares.map((share) => {
                        const isDownloading = downloadingIds.has(share.thread_id);
                        const isCompleted = completedIds.has(share.thread_id);
                        
                        return (
                            <div 
                                key={share.thread_id}
                                className="glass-container rounded-2xl border border-white/5 bg-[#111115]/40 hover:bg-white/[0.02] p-4 flex flex-col gap-3 transition-all relative overflow-hidden group"
                                style={{
                                    '--glass-hover-scale': '1.015',
                                    '--glass-content-scale': '1.008'
                                } as React.CSSProperties}
                                onMouseMove={handleGlassMouseMove}
                            >
                                <div className="glass-content flex flex-col gap-2.5">
                                    {/* Author & Timestamp */}
                                    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {share.author.avatar_url ? (
                                                <img 
                                                    src={share.author.avatar_url} 
                                                    alt={share.author.display_name} 
                                                    className="w-5 h-5 rounded-full object-cover border border-white/10"
                                                />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <User size={10} className="text-gray-400" />
                                                </div>
                                            )}
                                            <span className="text-[11px] font-black uppercase tracking-wider text-gray-300 truncate">
                                                {share.author.display_name}
                                            </span>
                                        </div>
                                        {share.created_at && (
                                            <div className="flex items-center gap-1 text-gray-500 flex-shrink-0">
                                                <Calendar size={10} />
                                                <span className="text-[9px] font-mono font-bold">
                                                    {formatDate(share.created_at)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Title / Description */}
                                    <div className="flex flex-col gap-1 min-w-0">
                                        {(() => {
                                            const parts = (share.title || '').split('|').map((p: string) => p.trim()).filter(Boolean);
                                            if (parts.length >= 2) {
                                                const track = parts[0];
                                                const car = parts[1];
                                                const rest = parts.slice(2).join(' | ');

                                                const country = getCountryFromTrackName(track) || getCountryFromTrackName(share.title);
                                                const flagPath = getCountryFlagPath(country);
                                                const brandLogo = getBrandLogoPath(car);

                                                return (
                                                    <div className="flex flex-col gap-1 min-w-0">
                                                        {/* Row 1: Track Name + Country Flag */}
                                                        <div className="flex items-start gap-2 min-w-0 flex-wrap">
                                                            <span className="text-[14px] font-black text-white leading-tight tracking-tight break-words">
                                                                {track}
                                                            </span>
                                                            {flagPath && (
                                                                <div className="w-4 h-2.5 rounded-[2px] overflow-hidden border border-black/40 shadow-sm flex-shrink-0 mt-1">
                                                                    <img src={flagPath} alt={country} className="w-full h-full object-cover" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Row 2: Car Model + Car Brand Logo */}
                                                        <div className="flex items-start gap-2 min-w-0 flex-wrap">
                                                            <span className="text-[12px] font-bold text-gray-200 leading-tight tracking-tight break-words">
                                                                {car}
                                                            </span>
                                                            {brandLogo && (
                                                                <img src={brandLogo} alt={car} className="w-4 h-4 object-contain flex-shrink-0 mt-0.5" />
                                                            )}
                                                        </div>

                                                        {/* Row 3: Duration | Version */}
                                                        {rest && (
                                                            <div className="text-[11px] font-mono font-bold text-blue-400/90 leading-snug tracking-tight">
                                                                {rest}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return (
                                                <span className="text-[13px] font-black text-white leading-snug tracking-tight">
                                                    {share.title}
                                                </span>
                                            );
                                        })()}
                                        {share.content && (
                                            <p className="text-[10px] text-gray-400 font-bold leading-normal line-clamp-2 italic mt-0.5">
                                                {share.content.replace(/🏎️|🏎|🏁|⏱️|⏱/g, '').trim()}
                                            </p>
                                        )}
                                    </div>

                                    {/* Attachments & Download Action */}
                                    <div className="flex items-end justify-between gap-3 mt-1.5 border-t border-white/5 pt-2.5">
                                        {/* Attachment Details */}
                                        <div className="flex flex-col gap-1 min-w-0">
                                            {(() => {
                                                const country = getCountryFromTrackName(share.title) || getCountryFromTrackName(share.telemetry?.filename);
                                                const flagPath = getCountryFlagPath(country);
                                                return (
                                                    <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
                                                        {flagPath ? (
                                                            <div className="w-4 h-2.5 rounded-[2px] overflow-hidden border border-black/40 shadow-sm flex-shrink-0">
                                                                <img src={flagPath} alt={country} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <Globe size={12} className="text-blue-400 flex-shrink-0" />
                                                        )}
                                                        <span className="text-[9px] font-mono font-bold truncate">
                                                            {share.telemetry.filename}
                                                        </span>
                                                        <span className="text-[8px] text-gray-500 font-mono flex-shrink-0">
                                                            {formatSize(share.telemetry.size)}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                            {share.setup && (
                                                <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
                                                    <Settings size={12} className="text-emerald-400 flex-shrink-0 animate-[spin_10s_linear_infinite]" />
                                                    <span className="text-[9px] font-mono font-bold truncate">
                                                        {share.setup.filename}
                                                    </span>
                                                    <span className="text-[8px] text-gray-500 font-mono flex-shrink-0">
                                                        {formatSize(share.setup.size)}
                                                    </span>
                                                    <span className="text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                                                        Setup
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            onClick={() => handleDownload(share)}
                                            disabled={isDownloading || isCompleted}
                                            className={`flex-shrink-0 p-2.5 rounded-xl border transition-all flex items-center justify-center active:scale-95 ${
                                                isCompleted
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                    : isDownloading
                                                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                                    : 'bg-[#5865F2] hover:bg-[#4752C4] text-white border-transparent shadow-[0_4px_12px_rgba(88,101,242,0.3)] cursor-pointer'
                                            }`}
                                        >
                                            {isCompleted ? (
                                                <Check size={14} strokeWidth={2.5} />
                                            ) : isDownloading ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Download size={14} strokeWidth={2.5} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
