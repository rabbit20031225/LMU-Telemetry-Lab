import React, { useRef, useState, useMemo } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import type { Session } from '../types';
import { Upload, Database, Search, Trash2, Link, Info, Folder, Settings2, Check, X, ExternalLink } from 'lucide-react';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { Tooltip } from './ui/Tooltip';
import { apiClient } from '../api/client';
import { getBrandLogoPath } from '../utils/carHelpers';
import { getCountryFlagPath } from '../utils/trackHelpers';

const DEFAULT_LMU_PATH = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Le Mans Ultimate\\UserData\\Telemetry';

export const FileManager: React.FC = () => {
    const sessions = useTelemetryStore(state => state.sessions);
  const currentSessionId = useTelemetryStore(state => state.currentSessionId);
  const selectSession = useTelemetryStore(state => state.selectSession);
  const uploadSession = useTelemetryStore(state => state.uploadSession);
  const renameSession = useTelemetryStore(state => state.renameSession);
  const deleteSession = useTelemetryStore(state => state.deleteSession);
  const isListLoading = useTelemetryStore(state => state.isListLoading);
  const fetchSessions = useTelemetryStore(state => state.fetchSessions);
  const activeProfileId = useTelemetryStore(state => state.activeProfileId);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [renameTarget, setRenameTarget] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [shouldRenderHint, setShouldRenderHint] = useState(false);
    const [isAnimatingHint, setIsAnimatingHint] = useState(false);
    const [telemetryPath, setTelemetryPath] = useState(() => localStorage.getItem('lmu_telemetry_path') || DEFAULT_LMU_PATH);
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [tempPath, setTempPath] = useState(telemetryPath);
    const [pathExists, setPathExists] = useState(true);

    React.useEffect(() => {
        const checkPath = async () => {
            const exists = await apiClient.validatePath(telemetryPath);
            setPathExists(exists);
        };
        checkPath();
    }, [telemetryPath]);

    // Handle animation lifecycle for hint
    React.useEffect(() => {
        if (showHint) {
            setShouldRenderHint(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimatingHint(true);
                });
            });
        } else {
            setIsAnimatingHint(false);
            const timer = setTimeout(() => setShouldRenderHint(false), 500);
            return () => clearTimeout(timer);
        }
    }, [showHint]);

    // Parse filename metadata
    // Format: CircuitName_SessionType_YYYY-MM-DDTHH_MM_SSZ.duckdb
    const parseMetadata = (filename: string) => {
        // Regex to capture: Circuit (group 1), Type (group 2), Timestamp (group 3)
        // Timestamp format in filename: 2026-02-06T02_02_52Z
        const regex = /^(.*)_([^_]+)_(\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}Z)\.duckdb$/;
        const match = filename.match(regex);

        if (match) {
            const rawTimestamp = match[3]; // 2026-02-06T02_02_52Z
            // Convert to valid ISO string for parsing: 2026-02-06T02:02:52Z
            const isoTimestamp = rawTimestamp.replace(/_/g, ':');
            const dateObj = new Date(isoTimestamp);

            return {
                circuit: match[1],
                type: match[2],
                dateObj: dateObj, // For sorting
                dateStr: dateObj.toLocaleDateString(), // For display
                timeStr: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // For display
            };
        }
        return null;
    };

    // Filter AND Sort sessions
    const sortedFilteredSessions = useMemo(() => {
        let result = sessions;

        // 1. Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s => {
                const idMatch = s.id.toLowerCase().includes(query);
                const trackMatch = s.trackName?.toLowerCase().includes(query);
                const layoutMatch = s.trackLayout?.toLowerCase().includes(query);
                const commonMatch = s.commonTrackName?.toLowerCase().includes(query);
                const aliasMatch = s.trackAliases?.some(alias => alias.toLowerCase().includes(query));
                const carMatch = s.carModel?.toLowerCase().includes(query) || s.carClass?.toLowerCase().includes(query);
                
                return idMatch || trackMatch || layoutMatch || commonMatch || aliasMatch || carMatch;
            });
        }

        // 2. Sort by Date (Newest first)
        return [...result].sort((a, b) => {
            const metaA = parseMetadata(a.id);
            const metaB = parseMetadata(b.id);

            const timeA = metaA ? metaA.dateObj.getTime() : (a.created ? a.created * 1000 : 0);
            const timeB = metaB ? metaB.dateObj.getTime() : (b.created ? b.created * 1000 : 0);

            return timeB - timeA;
        });
    }, [sessions, searchQuery]);

    const handleUploadClick = async () => {
        try {
            // Calculate current window bounds to center the picker
            const bounds = {
                x: window.screenX,
                y: window.screenY,
                width: window.innerWidth,
                height: window.innerHeight
            };

            // Use the native backend picker to bypass browser path restrictions
            const result = await apiClient.pickAndUpload(telemetryPath, activeProfileId, bounds);
            if (result.status === 'success') {
                // Refresh list if a file was actually imported
                await fetchSessions();
                return;
            }
            if (result.status === 'cancelled') return;
        } catch (err) {
            console.warn("Native picker failed, falling back to browser picker:", err);
        }
        
        // Fallback to standard browser picker if native fails
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadSession(e.target.files[0]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Drag & Drop Handlers
    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith(".duckdb")) {
                await uploadSession(file);
            } else {
                alert("Please upload a valid .duckdb file");
            }
        }
    };

    // Rename/Delete Handlers (Keep simplistic for now, update style)
    const startRename = (session: Session) => {
        setRenameTarget(session.id);
        setNewName(session.id.replace(".duckdb", ""));
    };

    const confirmRename = async () => {
        if (renameTarget && newName) {
            await renameSession(renameTarget, newName);
            setRenameTarget(null);
        }
    };

    const cancelRename = () => {
        setRenameTarget(null);
    };

    const handleDelete = async (sessionId: string) => {
        if (confirm(`Are you sure you want to delete ${sessionId}?`)) {
            await deleteSession(sessionId);
        }
    };

    const saveCustomPath = () => {
        // Automatically trim quotes if the user copied as path
        const cleanedPath = tempPath.trim().replace(/^["']|["']$/g, '');
        setTelemetryPath(cleanedPath);
        localStorage.setItem('lmu_telemetry_path', cleanedPath);
        setIsEditingPath(false);
    };

    const handleOpenFolder = () => {
        apiClient.openInExplorer(telemetryPath).catch(err => {
            // Silent fail if path doesn't exist (user "don't care" mode)
            console.warn("Could not open folder:", err);
        });
    };

    return (
        <div className="flex flex-col h-full bg-transparent text-gray-300 font-sans">
            {/* Header */}
            <div className="pl-4 pr-[10px] pt-4 pb-0 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Database size={16} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white text-[14px] font-black uppercase tracking-[0.2em]">Data Sources</h3>
                        <p className="text-gray-500 text-[9px] uppercase tracking-widest font-bold mt-0.5">Manage DuckDB Telemetry</p>
                    </div>
                    <Tooltip text="SHOW PATH HINT" position="left">
                        <button
                            onClick={() => setShowHint(!showHint)}
                            className={`transition-all p-2 rounded-xl border active:scale-95 glass-container group ${showHint ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10 hover:border-white/20'}`}
                            onMouseMove={handleGlassMouseMove}
                        >
                            <div className="glass-content flex items-center justify-center">
                                <Info size={16} />
                            </div>
                        </button>
                    </Tooltip>
                </div>
                <div
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isAnimatingHint ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                    <div className="overflow-hidden p-1">
                        {shouldRenderHint && (
                            <div className="text-[10px] text-gray-400 leading-relaxed my-3 mx-1 p-3 bg-white/5 glass-container rounded-xl border border-white/10 shadow-inner origin-top transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group/hintbox"
                                onMouseMove={handleGlassMouseMove}
                                style={{
                                    transform: isAnimatingHint ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(-10px)',
                                }}
                            >
                                <div className="glass-content">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 text-gray-500 font-black uppercase tracking-tighter">
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                            Telemetry Path:
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {!isEditingPath ? (
                                                <>
                                                    <Tooltip text="EDIT PATH" position="bottom">
                                                        <button 
                                                            onClick={() => { setIsEditingPath(true); setTempPath(telemetryPath); }}
                                                            className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                        >
                                                            <Settings2 size={12} />
                                                        </button>
                                                    </Tooltip>
                                                </>
                                            ) : (
                                                <>
                                                    <Tooltip text="SAVE" position="bottom">
                                                        <button 
                                                            onClick={saveCustomPath}
                                                            className="p-1 text-green-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all"
                                                        >
                                                            <Check size={12} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip text="CANCEL" position="bottom">
                                                        <button 
                                                            onClick={() => setIsEditingPath(false)}
                                                            className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {telemetryPath === DEFAULT_LMU_PATH && !pathExists && !isEditingPath && (
                                        <div className="text-[9px] text-blue-400 font-bold uppercase tracking-wider mb-2 animate-pulse flex items-center gap-1.5">
                                            <Info size={10} />
                                            Please set your telemetry path and save
                                        </div>
                                    )}

                                    {isEditingPath ? (
                                        <input
                                            type="text"
                                            value={tempPath}
                                            onChange={(e) => setTempPath(e.target.value)}
                                            className="w-full bg-black/40 border border-blue-500/30 rounded-lg px-2 py-1.5 text-[10px] text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && saveCustomPath()}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 group/path">
                                            <span 
                                                className="select-all hover:text-blue-400 transition-colors break-all font-mono opacity-80 cursor-text flex-1"
                                            >
                                                {telemetryPath}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 pt-1 pb-1">
                <div
                    className={`group relative glass-container p-6 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ring-1 ring-inset 
                        ${isDragging
                            ? 'bg-blue-600/20 border-blue-500/50 ring-blue-500/30'
                            : 'bg-white/5 border-white/10 ring-white/5 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]'}
                        border
                    `}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={handleUploadClick}
                    onMouseMove={handleGlassMouseMove}
                >
                    <div className="glass-content flex flex-col items-center justify-center w-full">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".duckdb"
                            onChange={handleFileChange}
                        />
                        <div className="p-3 bg-white/5 rounded-full border border-white/10 mb-3 group-hover:bg-blue-600/20 group-hover:border-blue-500/30 transition-all duration-500">
                            <Upload size={24} className={`transition-colors duration-500 ${isDragging ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />
                        </div>
                        <span className="text-[12px] text-white font-black uppercase tracking-[0.15em] mb-1">Upload Telemetry</span>
                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Drop .duckdb file here</span>
                    </div>

                    {/* Animated background glow */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-blue-600/0 via-blue-600/0 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
                </div>
            </div>

            {/* List Header & Search */}
            <div className="px-4 pt-2 pb-2">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Stored Sessions</span>
                        <span className="bg-white/10 text-gray-400 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white/5">{sessions.length}</span>
                    </div>
                    {isListLoading && (
                        <div className="w-4 h-4 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
                    )}
                </div>
                <div className="relative glass-container group/search transition-all duration-300 rounded-2xl" onMouseMove={handleGlassMouseMove}>
                    <div className="glass-content">
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg border border-white/5 bg-white/5 text-gray-500 group-hover/search:text-blue-400 group-hover/search:border-blue-500/30 group-hover/search:shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all duration-300 z-10 flex items-center justify-center">
                            <Search size={12} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search session or track..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent rounded-2xl pl-11 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-all font-bold tracking-tight"
                        />
                    </div>
                </div>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto pl-4 pr-[10px] pb-2 pt-2 space-y-1">
                {sortedFilteredSessions.map(s => {
                    const isSelected = s.id === currentSessionId;
                    const isRenaming = renameTarget === s.id;
                    const displayName = s.id.replace(".duckdb", "");
                    const fileSizeMB = (s.size / (1024 * 1024)).toFixed(1);
                    const metadata = parseMetadata(s.id);

                    // Fallback to creation date if metadata parse fails
                    let dateDisplay = 'Unknown Date';
                    if (metadata) {
                        dateDisplay = `${metadata.dateStr} ${metadata.timeStr}`;
                    } else if (s.created) {
                        const d = new Date(s.created * 1000);
                        dateDisplay = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    }

                    return (
                        <div
                            key={s.id}
                            className={`group relative rounded-2xl p-4 flex items-center justify-between transition-all border ring-1 ring-inset glass-container
                                ${isSelected
                                    ? 'bg-blue-600/25 border-blue-500/40 ring-blue-500/20 shadow-[0_10px_30px_rgba(37,99,235,0.15)]'
                                    : 'bg-white/5 border-white/5 ring-white/5 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_25px_rgba(255,255,255,0.05)]'}
                            `}
                            onMouseMove={handleGlassMouseMove}
                        >

                            <div className="glass-content w-full flex items-center justify-between">
                                {isRenaming ? (
                                    <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-left-2 duration-300">
                                        <div className="flex items-center gap-2 px-1">
                                            <Link size={12} className="text-blue-400" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rename Session</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            className="bg-black/50 border border-blue-500/50 rounded-xl px-3 py-2 text-white w-full text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            autoFocus
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button onClick={cancelRename} className="px-3 py-1 text-gray-500 hover:text-white text-[10px] uppercase font-black tracking-widest transition-colors">Cancel</button>
                                            <button onClick={confirmRename} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-black tracking-widest rounded-lg transition-all shadow-lg active:scale-95">Save Changes</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                                            onClick={() => selectSession(s.id)}
                                        >
                                            <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                                {getBrandLogoPath(s.carModel || "") ? (
                                                    <img
                                                        src={getBrandLogoPath(s.carModel || "")}
                                                        alt="Brand"
                                                        className={`w-9 h-9 object-contain transition-all duration-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] ${!isSelected && 'opacity-80 group-hover:opacity-100'}`}
                                                    />
                                                ) : (
                                                    <div className={`p-2 rounded-xl transition-all duration-500 flex-shrink-0 ${isSelected ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-white/5 border border-white/5 group-hover:bg-white/10 group-hover:border-white/20'}`}>
                                                        <img
                                                            src="/LeMansUltimateLogo.png"
                                                            alt="LMU"
                                                            className={`w-5 h-5 object-contain transition-all duration-500 ${!isSelected && 'opacity-30 group-hover:opacity-80'}`}
                                                        />
                                                    </div>
                                                )}
                                                
                                                {getCountryFlagPath(s.country) && (
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-3.5 rounded-sm overflow-hidden border border-black/40 shadow-[0_2px_4px_rgba(0,0,0,0.3)] z-20">
                                                        <img
                                                            src={getCountryFlagPath(s.country)!}
                                                            alt="Flag"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1 transition-all duration-300 group-hover:mr-2">
                                                {/* Row 1: Track Name + Layout (Corrected Priority) */}
                                                <div className="flex items-baseline gap-2 min-w-0">
                                                    <span className={`text-[15px] font-black truncate tracking-tight transition-colors flex-shrink-0 max-w-[85%] ${isSelected ? 'text-white' : 'text-gray-200 group-hover:text-white'}`}>
                                                        {s.trackName || (metadata ? metadata.circuit : displayName)}
                                                    </span>
                                                    {s.trackLayout && (
                                                        <span className={`text-[8px] font-bold tracking-widest uppercase truncate min-w-0 ${isSelected ? 'text-blue-300 opacity-60' : 'text-gray-400 opacity-50'}`}>
                                                            {s.trackLayout}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Row 2: Car Model + Class */}
                                                {s.carModel && (
                                                    <div className="flex items-baseline gap-2 mt-0.5 min-w-0">
                                                        <span className={`text-[11px] font-bold truncate tracking-tight ${isSelected ? 'text-blue-400/80' : 'text-gray-400'}`}>
                                                            {s.carModel}
                                                        </span>
                                                        {s.carClass && (
                                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-gray-400 opacity-80'}`}>
                                                                {s.carClass}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Row 3: Session Date, Type, Size */}
                                                <div className={`flex items-center gap-1.5 mt-1.5 text-[9px] font-mono font-bold tracking-tight whitespace-nowrap overflow-hidden ${isSelected ? 'text-blue-300/60' : 'text-gray-400/80'}`}>
                                                    <span>{dateDisplay}</span>
                                                    {metadata && (
                                                        <>
                                                            <span className="w-1 h-1 bg-current rounded-full opacity-30" />
                                                            <span className="uppercase">{metadata.type}</span>
                                                        </>
                                                    )}
                                                    <span className="w-1 h-1 bg-current rounded-full opacity-30" />
                                                    <span>{fileSizeMB}MB</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions - Vertical Stack */}
                                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 ml-1 flex-shrink-0">
                                            <Tooltip text="RENAME" position="left">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startRename(s); }}
                                                    className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                >
                                                    <Link size={14} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip text="DELETE" position="left">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
