import React, { useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetryStore } from '../store/telemetryStore';
import type { Session } from '../types';
import {
    Database, Search, Upload, Link, Trash2, Settings2, Check, X, Info, Loader2,
    ChevronRight, ChevronDown, MapPin, History as HistoryIcon, Timer, Package, Car, Trophy, LayoutGrid, Clock
} from 'lucide-react';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { Tooltip } from './ui/Tooltip';
import { apiClient } from '../api/client';
import { getBrandLogoPath, getClassColor } from '../utils/carHelpers';
import { getCountryFlagPath } from '../utils/trackHelpers';

const DEFAULT_LMU_PATH = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Le Mans Ultimate\\UserData\\Telemetry';

interface FileManagerProps {
    onClose?: () => void;
}

export const FileManager: React.FC<FileManagerProps> = ({ onClose }) => {
    const sessions = useTelemetryStore(state => state.sessions);
    const currentSessionId = useTelemetryStore(state => state.currentSessionId);
    const selectSession = useTelemetryStore(state => state.selectSession);
    const uploadSession = useTelemetryStore(state => state.uploadSession);
    const deleteSession = useTelemetryStore(state => state.deleteSession);
    const isListLoading = useTelemetryStore(state => state.isListLoading);
    const fetchSessions = useTelemetryStore(state => state.fetchSessions);
    const activeProfileId = useTelemetryStore(state => state.activeProfileId);
    const error = useTelemetryStore(state => state.error);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropzoneRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDragActive, setIsDragActive] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [shouldRenderHint, setShouldRenderHint] = useState(false);
    const [isAnimatingHint, setIsAnimatingHint] = useState(false);
    const [telemetryPath, setTelemetryPath] = useState(() => localStorage.getItem('lmu_telemetry_path') || DEFAULT_LMU_PATH);
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [tempPath, setTempPath] = useState(telemetryPath);
    const [pathExists, setPathExists] = useState(true);
    const [newlyUploadedIds, setNewlyUploadedIds] = useState<Set<string>>(new Set());
    const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [groupingMode, setGroupingMode] = useState<'track' | 'class' | 'car' | 'all'>(() => (localStorage.getItem('file_manager_grouping') as any) || 'track');
    const [classSubModes, setClassSubModes] = useState<Record<string, 'track' | 'car'>>(() => JSON.parse(localStorage.getItem('file_manager_class_submodes') || '{}'));
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    React.useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const dynamicMaxTrack = useMemo(() => {
        const base = 120;
        const extra = Math.max(0, containerWidth - 300);
        return base + extra;
    }, [containerWidth]);

    const dynamicMaxCar = useMemo(() => {
        const base = 150;
        const extra = Math.max(0, containerWidth - 300);
        return base + extra;
    }, [containerWidth]);

    React.useEffect(() => {
        localStorage.setItem('file_manager_grouping', groupingMode);
    }, [groupingMode]);

    React.useEffect(() => {
        localStorage.setItem('file_manager_class_submodes', JSON.stringify(classSubModes));
    }, [classSubModes]);

    React.useEffect(() => {
        const checkPath = async () => {
            const exists = await apiClient.validatePath(telemetryPath);
            setPathExists(exists);
        };
        checkPath();
    }, [telemetryPath]);

    // Prevent default drag/drop behaviors on global window and handle global drops
    React.useEffect(() => {
        const handleWindowDragOver = (e: DragEvent) => {
            e.preventDefault();

            let isOverDropzone = false;
            if (dropzoneRef.current) {
                const rect = dropzoneRef.current.getBoundingClientRect();
                isOverDropzone = (
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                );
            }

            // Check if dragging files, and filter non-.duckdb files if files list is available (e.g. Electron)
            let hasValidFile = true;
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const filesArray = Array.from(e.dataTransfer.files);
                hasValidFile = filesArray.some(file => file.name.toLowerCase().endsWith(".duckdb"));
            }

            // Only allow copy (upload) when dragging valid files over the dropzone container
            if (isOverDropzone && hasValidFile) {
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'copy';
                }
                setIsDragActive(true);
            } else {
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'none';
                }
                setIsDragActive(false);
            }
        };

        const handleWindowDragEnter = (e: DragEvent) => {
            e.preventDefault();
            if (dropzoneRef.current) {
                const rect = dropzoneRef.current.getBoundingClientRect();
                const isOverDropzone = (
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                );
                setIsDragActive(isOverDropzone);
            }
        };

        const handleWindowDragLeave = (e: DragEvent) => {
            e.preventDefault();
            if (e.clientX === 0 && e.clientY === 0) {
                setIsDragActive(false);
            } else if (dropzoneRef.current) {
                const rect = dropzoneRef.current.getBoundingClientRect();
                const isOverDropzone = (
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                );
                if (!isOverDropzone) {
                    setIsDragActive(false);
                }
            }
        };

        const handleWindowDrop = async (e: DragEvent) => {
            e.preventDefault();
            setIsDragActive(false);

            console.log("[DEBUG] global window drop triggered!");
            
            // Check if dropped inside the dropzone container using bounding rect
            let isInsideDropzone = false;
            if (dropzoneRef.current) {
                const rect = dropzoneRef.current.getBoundingClientRect();
                isInsideDropzone = (
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                );
            }

            if (!isInsideDropzone) {
                console.warn("[DEBUG] Dropped outside upload dropzone.");
                return;
            }

            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                console.log("[DEBUG] global window drop files count:", e.dataTransfer.files.length);
                const rawFiles = Array.from(e.dataTransfer.files);
                const files = rawFiles.filter(file => 
                    file.name.toLowerCase().endsWith(".duckdb")
                );

                if (files.length === 0) {
                    console.warn("[DEBUG] No valid .duckdb files in drop.");
                    useTelemetryStore.setState({ error: "Only .duckdb files are supported for upload." });
                    return;
                }

                useTelemetryStore.setState({ error: null });
                const uploadedIds: string[] = [];

                for (const file of files) {
                    try {
                        console.log("[DEBUG] Global drop starting upload for file:", file.name);
                        const id = await uploadSession(file);
                        console.log("[DEBUG] Global drop upload success, returned ID:", id);
                        if (id) {
                            uploadedIds.push(id);
                        }
                    } catch (err) {
                        console.error("[DEBUG] Global drop upload failed for:", file.name, err);
                        useTelemetryStore.setState({ error: `Upload failed: ${(err as Error).message}` });
                    }
                }

                if (uploadedIds.length > 0) {
                    console.log("[DEBUG] Drag and Drop uploadedIds:", uploadedIds);
                    setNewlyUploadedIds(prev => {
                        const next = new Set(prev);
                        uploadedIds.forEach(id => next.add(id));
                        return next;
                    });

                    const freshSessions = useTelemetryStore.getState().sessions;
                    
                    // Find the newest session among the uploaded ones based on created time
                    let newestId = uploadedIds[uploadedIds.length - 1];
                    let maxCreated = 0;
                    for (const id of uploadedIds) {
                        const s = freshSessions.find(x => x.id === id);
                        if (s && (s.created || 0) > maxCreated) {
                            maxCreated = s.created || 0;
                            newestId = id;
                        }
                    }
                    const newestIdx = uploadedIds.indexOf(newestId);
                    const scrollIdx = newestIdx >= 0 ? newestIdx : 0;

                    expandSessions(uploadedIds, freshSessions, scrollIdx, false);

                    const currentlyOpenId = useTelemetryStore.getState().currentSessionId;
                    if (!currentlyOpenId) {
                        const firstId = uploadedIds[0];
                        selectSession(firstId);
                        
                        const isSingleFile = files.length === 1;
                        if (isSingleFile && onClose) {
                            onClose();
                        } else {
                            setTimeout(() => {
                                const finalSessions = useTelemetryStore.getState().sessions;
                                expandSessions(uploadedIds, finalSessions, scrollIdx, true);
                            }, 200);
                        }
                    } else {
                        setTimeout(() => {
                            const finalSessions = useTelemetryStore.getState().sessions;
                            expandSessions(uploadedIds, finalSessions, scrollIdx, true);
                        }, 200);
                    }
                }

            } else {
                console.warn("[DEBUG] No dataTransfer or files found in global drop.");
            }
        };

        window.addEventListener('dragover', handleWindowDragOver);
        window.addEventListener('dragenter', handleWindowDragEnter);
        window.addEventListener('dragleave', handleWindowDragLeave);
        window.addEventListener('drop', handleWindowDrop);

        return () => {
            window.removeEventListener('dragover', handleWindowDragOver);
            window.removeEventListener('dragenter', handleWindowDragEnter);
            window.removeEventListener('dragleave', handleWindowDragLeave);
            window.removeEventListener('drop', handleWindowDrop);
        };
    }, [onClose]);

    React.useEffect(() => {
        if (showHint) {
            setShouldRenderHint(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setIsAnimatingHint(true));
            });
        } else {
            setIsAnimatingHint(false);
            const timer = setTimeout(() => setShouldRenderHint(false), 500);
            return () => clearTimeout(timer);
        }
    }, [showHint]);

    const parseMetadata = (filename: string) => {
        // Standard LMU format: Circuit_Type_Timestamp
        const standardRegex = /^(.*)_([^_]+)_(\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}Z)\.duckdb$/;
        // Simple format (used for exports): Name_Timestamp
        const simpleRegex = /^(.*)_(\d{4}-\d{2}-\d{2}T\d{2}_\d{2}_\d{2}Z)\.duckdb$/;

        let match = filename.match(standardRegex);
        if (match) {
            const rawTimestamp = match[3];
            const isoTimestamp = rawTimestamp.replace(/_/g, ':');
            const dateObj = new Date(isoTimestamp);
            return {
                circuit: match[1],
                type: match[2],
                dateObj: dateObj,
                dateStr: dateObj.toLocaleDateString(),
                timeStr: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        }

        match = filename.match(simpleRegex);
        if (match) {
            const rawTimestamp = match[2];
            const isoTimestamp = rawTimestamp.replace(/_/g, ':');
            const dateObj = new Date(isoTimestamp);
            return {
                circuit: match[1],
                type: 'Export',
                dateObj: dateObj,
                dateStr: dateObj.toLocaleDateString(),
                timeStr: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        }
        return null;
    };

    const expandSessions = (sessionIds: string[], currentSessions: Session[], scrollToIndex = 0, smooth = true) => {
        const newExpanded: string[] = [];
        for (const sessionId of sessionIds) {
            const session = currentSessions.find(s => s.id === sessionId);
            if (!session) continue;

            const trackName = session.displayName || session.commonTrackName || session.trackName || parseMetadata(session.id)?.circuit || 'Unknown Track';
            if (groupingMode === 'track') {
                newExpanded.push(trackName);
            } else if (groupingMode === 'class') {
                const classKey = session.carClass || 'Unknown Class';
                const currentSubMode = classSubModes[classKey] || 'track';
                const secondaryKey = currentSubMode === 'track' ? trackName : (session.carModel || 'Unknown Car');
                newExpanded.push(classKey);
                newExpanded.push(`${classKey}-${secondaryKey}`);
            } else if (groupingMode === 'car') {
                const carKey = session.carModel || 'Unknown Car';
                newExpanded.push(carKey);
                newExpanded.push(`${carKey}-${trackName}`);
            }
        }

        setExpandedFolders(prev => {
            const unique = new Set([...prev, ...newExpanded]);
            return Array.from(unique);
        });

        if (sessionIds.length > 0 && scrollToIndex >= 0 && scrollToIndex < sessionIds.length) {
            const targetId = sessionIds[scrollToIndex];
            console.log("[DEBUG] expandSessions scrolling to targetId:", targetId, "smooth:", smooth);
            setTimeout(() => {
                const element = document.querySelector(`[data-session-id="${targetId}"]`) as HTMLElement;
                if (element) {
                    const container = element.closest('.overflow-y-scroll, .overflow-y-auto') as HTMLElement;
                    if (container) {
                        const elementTop = element.getBoundingClientRect().top;
                        const containerTop = container.getBoundingClientRect().top;
                        const targetScrollTop = (elementTop - containerTop + container.scrollTop) - 24;
                        container.scrollTo({
                            top: Math.max(0, targetScrollTop),
                            behavior: smooth ? 'smooth' : 'auto'
                        });
                    } else {
                        element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' });
                    }
                } else {
                    console.warn("[DEBUG] scroll element not found for ID:", targetId);
                }
            }, 400);
        }
    };

    const expandAndScrollToSession = (sessionId: string, currentSessions: Session[], smooth = true) => {
        expandSessions([sessionId], currentSessions, 0, smooth);
    };

    const autoExpandNewestSession = (currentSessions: Session[]) => {
        if (currentSessions.length === 0) return;
        const newest = [...currentSessions].sort((a, b) => (b.created || 0) - (a.created || 0))[0];
        if (!newest) return;
        setNewlyUploadedIds(prev => {
            const next = new Set(prev);
            next.add(newest.id);
            return next;
        });
        expandSessions([newest.id], currentSessions);
    };

    // Auto-expand and scroll to current session on mount
    React.useEffect(() => {
        if (currentSessionId && sessions.length > 0) {
            // Short delay to ensure grouping calculation is done
            setTimeout(() => {
                expandAndScrollToSession(currentSessionId, sessions, true);
            }, 100);
        }
    }, []); // Only on mount

    const handleUploadClick = async () => {
        try {
            const bounds = { x: window.screenX, y: window.screenY, width: window.innerWidth, height: window.innerHeight };
            const result = await apiClient.pickAndUpload(telemetryPath, activeProfileId, bounds);
            if (result.status === 'success') {
                await fetchSessions();
                setTimeout(() => {
                    const freshSessions = useTelemetryStore.getState().sessions;
                    const uploadedIds: string[] = result.ids || (result.id ? [result.id] : []);
                    console.log("[DEBUG] Native picker success. result.ids:", result.ids, "result.id:", result.id, "final uploadedIds:", uploadedIds);
                    if (uploadedIds.length === 0) {
                        const newest = [...freshSessions].sort((a, b) => (b.created || 0) - (a.created || 0))[0];
                        if (newest) {
                            uploadedIds.push(newest.id);
                        }
                    }

                    if (uploadedIds.length > 0) {
                        setNewlyUploadedIds(prev => {
                            const next = new Set(prev);
                            uploadedIds.forEach(id => next.add(id));
                            return next;
                        });
                        
                        // Find the newest session among the uploaded ones based on created time
                        let newestId = uploadedIds[uploadedIds.length - 1];
                        let maxCreated = 0;
                        for (const id of uploadedIds) {
                            const s = freshSessions.find(x => x.id === id);
                            if (s && (s.created || 0) > maxCreated) {
                                maxCreated = s.created || 0;
                                newestId = id;
                            }
                        }
                        const newestIdx = uploadedIds.indexOf(newestId);
                        const scrollIdx = newestIdx >= 0 ? newestIdx : 0;

                        expandSessions(uploadedIds, freshSessions, scrollIdx, false);

                        const currentlyOpenId = useTelemetryStore.getState().currentSessionId;
                        if (!currentlyOpenId) {
                            selectSession(uploadedIds[0]);
                            if (onClose) onClose();
                        } else {
                            setTimeout(() => {
                                const finalSessions = useTelemetryStore.getState().sessions;
                                expandSessions(uploadedIds, finalSessions, scrollIdx, true);
                            }, 200);
                        }
                    }
                }, 100);
                return;
            }
            if (result.status === 'cancelled') return;
        } catch (err) { console.warn("Native picker failed", err); }
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const rawFiles = Array.from(e.target.files);
            const files = rawFiles.filter(file => 
                file.name.toLowerCase().endsWith(".duckdb")
            );
            
            if (files.length === 0) return;

            useTelemetryStore.setState({ error: null });
            const uploadedIds: string[] = [];
            
            for (const file of files) {
                try {
                    console.log("[DEBUG] Click-upload starting for file:", file.name);
                    const id = await uploadSession(file);
                    if (id) {
                        uploadedIds.push(id);
                    }
                } catch (err) {
                    console.error("Click-upload failed for:", file.name, err);
                    useTelemetryStore.setState({ error: `Upload failed: ${(err as Error).message}` });
                }
            }

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            if (uploadedIds.length > 0) {
                console.log("[DEBUG] Click-upload uploadedIds:", uploadedIds);
                setNewlyUploadedIds(prev => {
                    const next = new Set(prev);
                    uploadedIds.forEach(id => next.add(id));
                    return next;
                });

                const freshSessions = useTelemetryStore.getState().sessions;
                
                // Find the newest session among the uploaded ones based on created time
                let newestId = uploadedIds[uploadedIds.length - 1];
                let maxCreated = 0;
                for (const id of uploadedIds) {
                    const s = freshSessions.find(x => x.id === id);
                    if (s && (s.created || 0) > maxCreated) {
                        maxCreated = s.created || 0;
                        newestId = id;
                    }
                }
                const newestIdx = uploadedIds.indexOf(newestId);
                const scrollIdx = newestIdx >= 0 ? newestIdx : 0;

                expandSessions(uploadedIds, freshSessions, scrollIdx, false);

                const currentlyOpenId = useTelemetryStore.getState().currentSessionId;
                if (!currentlyOpenId) {
                    const firstId = uploadedIds[0];
                    selectSession(firstId);
                    
                    const isSingleFile = files.length === 1;
                    if (isSingleFile && onClose) {
                        onClose();
                    } else {
                        setTimeout(() => {
                            const finalSessions = useTelemetryStore.getState().sessions;
                            expandSessions(uploadedIds, finalSessions, scrollIdx, true);
                        }, 200);
                    }
                } else {
                    setTimeout(() => {
                        const finalSessions = useTelemetryStore.getState().sessions;
                        expandSessions(uploadedIds, finalSessions, scrollIdx, true);
                    }, 200);
                }
            }
        }
    };

    const handleDelete = async (sessionId: string) => {
        setDeleteTarget(sessionId);
    };

    const saveCustomPath = () => {
        const cleanedPath = tempPath.trim().replace(/^["']|["']$/g, '');
        setTelemetryPath(cleanedPath);
        localStorage.setItem('lmu_telemetry_path', cleanedPath);
        setIsEditingPath(false);
    };

    const formatLapTime = (sec?: number) => {
        if (sec === undefined || isNaN(sec)) return '--:--.---';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec % 1) * 1000);
        return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    const groupedData = useMemo(() => {
        let filtered = sessions;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = sessions.filter(s => {
                const meta = parseMetadata(s.id);
                const trackFromId = meta?.circuit || "";
                return (
                    s.id.toLowerCase().includes(query) ||
                    (s.carModel || "").toLowerCase().includes(query) ||
                    (s.trackName || "").toLowerCase().includes(query) ||
                    (s.displayName || "").toLowerCase().includes(query) ||
                    (s.commonTrackName || "").toLowerCase().includes(query) ||
                    (trackFromId || "").toLowerCase().includes(query) ||
                    (s.carClass || "").toLowerCase().includes(query) ||
                    (s.driverName || "").toLowerCase().includes(query)
                );
            });
        }

        if (groupingMode === 'all') {
            return [{
                id: 'all_sessions',
                name: 'All Sessions',
                type: 'all',
                sessions: [...filtered].sort((a, b) => (b.created || 0) - (a.created || 0)),
                isFlat: true
            }];
        }

        // Hierarchy logic
        const hierarchy: any = {};

        filtered.forEach(s => {
            const trackName = s.displayName || s.commonTrackName || s.trackName || parseMetadata(s.id)?.circuit || 'Unknown Track';
            let primaryKey = '';
            let secondaryKey = trackName;

            if (groupingMode === 'track') {
                primaryKey = trackName;
                if (!hierarchy[primaryKey]) hierarchy[primaryKey] = { id: primaryKey, name: primaryKey, type: 'track', sessions: [], country: s.country };
                hierarchy[primaryKey].sessions.push(s);
            } else if (groupingMode === 'class') {
                primaryKey = s.carClass || 'Unknown Class';
                const currentSubMode = classSubModes[primaryKey] || 'track';
                secondaryKey = currentSubMode === 'track'
                    ? trackName
                    : (s.carModel || 'Unknown Car');

                if (!hierarchy[primaryKey]) hierarchy[primaryKey] = { id: primaryKey, name: primaryKey, type: 'class', children: {} };
                if (!hierarchy[primaryKey].children[secondaryKey]) {
                    hierarchy[primaryKey].children[secondaryKey] = {
                        id: `${primaryKey}-${secondaryKey}`,
                        name: secondaryKey,
                        type: currentSubMode === 'track' ? 'track' : 'car',
                        sessions: [],
                        country: s.country
                    };
                }
                hierarchy[primaryKey].children[secondaryKey].sessions.push(s);
            } else if (groupingMode === 'car') {
                primaryKey = s.carModel || 'Unknown Car';
                if (!hierarchy[primaryKey]) hierarchy[primaryKey] = { id: primaryKey, name: primaryKey, type: 'car', children: {} };
                if (!hierarchy[primaryKey].children[secondaryKey]) {
                    hierarchy[primaryKey].children[secondaryKey] = { id: `${primaryKey}-${secondaryKey}`, name: secondaryKey, type: 'track', sessions: [], country: s.country };
                }
                hierarchy[primaryKey].children[secondaryKey].sessions.push(s);
            }
        });

        // Convert and sort
        const result = Object.values(hierarchy).map((group: any) => {
            if (groupingMode === 'track') {
                group.sessions.sort((a: any, b: any) => {
                    const timeA = parseMetadata(a.id)?.dateObj.getTime() || (a.created ? a.created * 1000 : 0);
                    const timeB = parseMetadata(b.id)?.dateObj.getTime() || (b.created ? b.created * 1000 : 0);
                    return timeB - timeA;
                });
                group.totalSessions = group.sessions.length;
                return group;
            } else {
                let total = 0;
                const children = Object.values(group.children).map((child: any) => {
                    total += child.sessions.length;
                    child.sessions.sort((a: any, b: any) => {
                        const timeA = parseMetadata(a.id)?.dateObj.getTime() || (a.created ? a.created * 1000 : 0);
                        const timeB = parseMetadata(b.id)?.dateObj.getTime() || (b.created ? b.created * 1000 : 0);
                        return timeB - timeA;
                    });
                    return child;
                }).sort((a: any, b: any) => a.name.localeCompare(b.name));
                return { ...group, children, totalSessions: total };
            }
        }).sort((a: any, b: any) => a.name.localeCompare(b.name));

        return result;
    }, [sessions, searchQuery, groupingMode, classSubModes]);

    return (
        <div 
            ref={containerRef} 
            className="flex flex-col h-full bg-transparent text-gray-300 font-sans relative"
            onMouseMove={handleGlassMouseMove}
            style={{ 
                '--mouse-x': '-9999px',
                '--mouse-y': '-9999px',
                '--mouse-x-inv': '-9999px',
                '--mouse-y-inv': '-9999px'
            } as any}
        >
            <div className="pl-4 pr-[10px] pt-4 pb-0 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20"><Database size={16} className="text-blue-400" /></div>
                    <div className="flex-1">
                        <h3 className="text-white text-[14px] font-black uppercase tracking-[0.2em]">Data Sources</h3>
                        <p className="text-gray-400 text-[9px] uppercase tracking-widest font-bold mt-0.5">Manage DuckDB Telemetry</p>
                    </div>
                    <Tooltip text="SHOW PATH HINT" position="left">
                        <button onClick={() => setShowHint(!showHint)} className={`transition-all p-2 rounded-xl border active:scale-95 glass-container group ${showHint ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10 hover:border-white/20'}`} onMouseMove={handleGlassMouseMove}><div className="glass-content flex items-center justify-center"><Info size={16} /></div></button>
                    </Tooltip>
                </div>
                <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isAnimatingHint ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden p-1">
                        {shouldRenderHint && (
                            <div className="text-[10px] text-gray-400 leading-relaxed my-3 mx-1 p-3 bg-white/5 glass-container rounded-xl border border-white/10 shadow-inner origin-top transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group/hintbox" onMouseMove={handleGlassMouseMove} style={{ transform: isAnimatingHint ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(-10px)' }}>
                                <div className="glass-content">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 text-gray-500 font-black uppercase tracking-tighter"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />Telemetry Path:</div>
                                        <div className="flex items-center gap-1">
                                            {!isEditingPath ? (
                                                <Tooltip text="EDIT PATH" position="bottom"><button onClick={() => { setIsEditingPath(true); setTempPath(telemetryPath); }} className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"><Settings2 size={12} /></button></Tooltip>
                                            ) : (
                                                <><Tooltip text="SAVE" position="bottom"><button onClick={saveCustomPath} className="p-1 text-green-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all"><Check size={12} /></button></Tooltip><Tooltip text="CANCEL" position="bottom"><button onClick={() => setIsEditingPath(false)} className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><X size={12} /></button></Tooltip></>
                                            )}
                                        </div>
                                    </div>
                                    {isEditingPath ? <input type="text" value={tempPath} onChange={(e) => setTempPath(e.target.value)} className="w-full bg-black/40 border border-blue-500/30 rounded-lg px-2 py-1.5 text-[10px] text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50" autoFocus onKeyDown={(e) => e.key === 'Enter' && saveCustomPath()} /> : <div className="flex items-center gap-2 group/path"><span className="select-all hover:text-blue-400 transition-colors break-all font-mono opacity-80 cursor-text flex-1">{telemetryPath}</span></div>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 pt-1 pb-1">
                <div 
                    ref={dropzoneRef} 
                    className={`group relative glass-container telemetry-dropzone p-6 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ring-1 ring-inset border ${
                        isDragActive 
                            ? 'drag-active ring-blue-500 border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.2)] scale-[1.01]' 
                            : 'bg-white/5 border-white/10 ring-white/5 hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]'
                    }`} 
                    onClick={handleUploadClick} 
                    onMouseMove={handleGlassMouseMove}
                >
                    <div className="glass-content flex flex-col items-center justify-center w-full pointer-events-none">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".duckdb" multiple onChange={handleFileChange} />
                        <div className={`p-3 rounded-full border mb-3 transition-all duration-500 ${
                            isDragActive 
                                ? 'bg-blue-500/30 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110' 
                                : 'bg-white/5 border-white/10 group-hover:bg-blue-600/20 group-hover:border-blue-500/30'
                        }`}>
                            <Upload size={24} className={`transition-colors duration-500 ${
                                isDragActive 
                                    ? 'text-blue-300 animate-bounce' 
                                    : 'text-gray-400 group-hover:text-blue-400'
                            }`} />
                        </div>
                        <span className="text-[12px] text-white font-black uppercase tracking-[0.15em] mb-1">Upload Telemetry</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${
                            isDragActive ? 'text-blue-400 animate-pulse' : 'text-gray-400'
                        }`}>Drop .duckdb file here</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mx-4 my-1.5 p-3 bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl text-[10px] uppercase tracking-wider font-bold">
                    Error: {error}
                </div>
            )}

            <div className="px-4 pt-2 pb-2">
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-black text-white uppercase tracking-[0.2em]">Files</span>
                        <span className="text-[11px] font-bold text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 shadow-inner">{sessions.length}</span>
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 ml-2 relative">
                            {['track', 'class', 'car', 'all'].map((mode) => (
                                <Tooltip key={mode} text={mode === 'all' ? "List all files by time" : `Group by ${mode.charAt(0).toUpperCase() + mode.slice(1)}`} position="bottom">
                                    <button
                                        onClick={() => setGroupingMode(mode as any)}
                                        className={`relative p-1.5 rounded-lg transition-colors z-10 ${groupingMode === mode ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        {groupingMode === mode && (
                                            <motion.div
                                                layout
                                                layoutId="activeGroupingTab"
                                                className="absolute inset-0 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                                transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                                            />
                                        )}
                                        <div className="relative z-20">
                                            {mode === 'track' && <MapPin size={12} />}
                                            {mode === 'class' && <Trophy size={12} />}
                                            {mode === 'car' && <Car size={12} />}
                                            {mode === 'all' && <Clock size={12} />}
                                        </div>
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {expandedFolders.length > 0 && (
                            <Tooltip text="Collapse All" position="left">
                                <button
                                    onClick={() => setExpandedFolders([])}
                                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </Tooltip>
                        )}
                        {isListLoading && <div className="flex items-center gap-2 text-blue-400"><Loader2 size={12} className="animate-spin" /></div>}
                    </div>
                </div>
                <div className="relative group"><div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Search size={14} className="text-gray-400 group-focus-within:text-blue-400 transition-colors" /></div><input type="text" placeholder="Search by name, track, car, or driver..." className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            </div>

            <div className="flex-1 overflow-y-scroll pl-4 pr-[10px] pb-2 pt-2 custom-scrollbar">
                <div className="space-y-1">
                    {groupedData.map((item: any) => {
                        const isExpanded = expandedFolders.includes(item.id);

                        const renderSessionList = (sessionList: Session[]) => (
                            <div className="flex flex-col gap-2 mt-1">
                                {sessionList.map(s => {
                                    const isSelected = s.id === currentSessionId;
                                    const fileSizeMB = (s.size / (1024 * 1024)).toFixed(1);
                                    const metadata = parseMetadata(s.id);
                                    const isExport = metadata?.type === 'Export';
                                    let dateDisplay = metadata ? `${metadata.dateStr} ${metadata.timeStr}` : (s.created ? new Date(s.created * 1000).toLocaleString() : 'Unknown');

                                    return (
                                        <div
                                            key={s.id}
                                            data-session-id={s.id}
                                            className={`group relative rounded-xl p-3 flex items-center justify-between transition-[transform,background-color,border-color] duration-300 border ring-1 ring-inset glass-container scroll-mt-20 min-w-0 w-full overflow-hidden ${isSelected
                                                ? (isExport ? 'bg-cyan-600/20 border-cyan-500/40 ring-cyan-500/20' : 'bg-blue-600/20 border-blue-500/30 ring-blue-500/20')
                                                : (newlyUploadedIds.has(s.id)
                                                    ? 'new-upload-highlight'
                                                    : isExport
                                                        ? 'bg-cyan-950/40 border-cyan-500/15 ring-cyan-500/10 hover:bg-cyan-950/60 hover:border-cyan-500/30'
                                                        : 'bg-black/30 border-white/5 ring-white/5 hover:bg-black/50 hover:border-white/10')
                                                }`}
                                            onMouseMove={handleGlassMouseMove}
                                        >
                                            <div className="glass-content w-full flex items-center justify-between min-w-0">
                                                <div
                                                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                                    onClick={() => {
                                                        selectSession(s.id);
                                                        setNewlyUploadedIds(prev => {
                                                            const next = new Set(prev);
                                                            next.delete(s.id);
                                                            return next;
                                                        });
                                                        if (onClose) onClose();
                                                    }}
                                                >
                                                    <div className="relative flex-shrink-0 w-8 h-8 flex items-center justify-center">
                                                        {getBrandLogoPath(s.carModel || "") ? <img src={getBrandLogoPath(s.carModel || "")} className="w-7 h-7 object-contain" /> : <div className="p-1.5 rounded-lg bg-white/5"><img src="/LeMansUltimateLogo.png" className="w-4 h-4 object-contain opacity-20" /></div>}
                                                        {getCountryFlagPath(s.country) && <div className="absolute -bottom-1 -right-1 w-4 h-2.5 rounded-sm overflow-hidden border border-black/40 shadow-lg"><img src={getCountryFlagPath(s.country)!} className="w-full h-full object-cover" /></div>}
                                                    </div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                                                            <span
                                                                className={`text-[13px] font-black truncate tracking-tight ${isSelected ? 'text-white' : isExport ? 'text-cyan-50/90' : 'text-gray-300 group-hover:text-white'}`}
                                                                style={{ maxWidth: isExport ? `${dynamicMaxTrack}px` : `${dynamicMaxTrack + 40}px` }}
                                                            >
                                                                {s.trackLayout || 'Standard Layout'}
                                                            </span>
                                                            {isExport && <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 flex-shrink-0">Export</span>}
                                                        </div>
                                                        {s.carModel && (
                                                            <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0 w-full">
                                                                <span
                                                                    className={`text-[10px] font-bold truncate ${isSelected ? (isExport ? 'text-cyan-400' : 'text-blue-400/80') : isExport ? 'text-cyan-50/70' : 'text-gray-400'}`}
                                                                    style={{ maxWidth: s.carClass ? `${dynamicMaxCar}px` : `${dynamicMaxCar + 40}px` }}
                                                                >
                                                                    {s.carModel}
                                                                </span>
                                                                {s.carClass && <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${getClassColor(s.carClass)}`}>{s.carClass}</span>}
                                                            </div>
                                                        )}
                                                        {s.bestLapTime && (
                                                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                                                <Timer size={11} className={s.bestLapValid ? (isExport ? 'text-cyan-400' : 'text-blue-400') : 'text-red-400/80'} />
                                                                <span className={`text-[11px] font-mono font-bold tracking-tight ${s.bestLapValid ? (isExport ? 'text-cyan-400' : 'text-blue-400') : 'text-red-400/80'}`}>
                                                                    {formatLapTime(s.bestLapTime)}
                                                                </span>
                                                                {!s.bestLapValid && <span className="text-[7px] uppercase font-black tracking-widest text-red-500/60 border border-red-500/20 px-1 rounded">Invalid</span>}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between mt-1 text-[8px] font-mono font-bold min-w-0 text-gray-400/90">
                                                            <span>{dateDisplay} | {fileSizeMB}MB</span>
                                                            {s.driverName && (
                                                                <span className="flex-shrink-0 ml-3 text-[10px] text-blue-400/70 uppercase tracking-widest font-sans">{s.driverName}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"><button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="p-1 text-gray-400 hover:text-red-400 rounded-md"><Trash2 size={12} /></button></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );

                        if (item.isFlat) {
                            return (
                                <div key={item.id} className="pb-4">
                                    {renderSessionList(item.sessions)}
                                </div>
                            );
                        }

                        return (
                            <div key={item.id} className="flex flex-col gap-1">
                                <button
                                    onClick={() => {
                                        setExpandedFolders(prev =>
                                            prev.includes(item.id)
                                                ? prev.filter(t => t !== item.id)
                                                : [...prev, item.id]
                                        );
                                    }}
                                    className={`w-full group relative rounded-2xl p-4 flex items-center justify-between transition-all border ring-1 ring-inset glass-container-flat ${isExpanded ? 'bg-blue-600/10 border-blue-500/30 ring-blue-500/20' : 'bg-white/[0.02] border-white/5 ring-white/5 hover:border-white/20'}`}
                                    onMouseMove={handleGlassMouseMove}
                                >
                                    <div className="glass-content flex items-center justify-between w-full text-left gap-4">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {item.type !== 'class' && (
                                                <div className={`p-1 rounded-xl transition-all duration-500 flex-shrink-0 flex items-center justify-center w-12 h-8 overflow-hidden border ${isExpanded ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/10 bg-white/5'}`}>
                                                    {item.type === 'track' && getCountryFlagPath(item.country) ? (
                                                        <img src={getCountryFlagPath(item.country)!} alt={item.country} className="w-full h-full object-cover" />
                                                    ) : item.type === 'car' ? (
                                                        <img src={getBrandLogoPath(item.name)} alt={item.name} className="w-8 h-8 object-contain filter brightness-125 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                    ) : (
                                                        <MapPin size={18} className={isExpanded ? 'text-blue-300' : 'text-blue-400'} />
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                                                {item.type === 'class' ? (
                                                    <span className={`px-4 py-1.5 rounded-xl text-[14px] font-black border leading-none tracking-[0.2em] shadow-lg uppercase truncate ${getClassColor(item.name)}`}>
                                                        {item.name}
                                                    </span>
                                                ) : (
                                                    <h4 className={`font-black uppercase tracking-wider transition-colors line-clamp-2 ${item.name.length > 22 ? 'text-[12px] leading-[1.1]' : 'text-[15px] leading-tight'} ${isExpanded ? 'text-blue-400' : 'text-white group-hover:text-blue-400'}`}>{item.name}</h4>
                                                )}
                                                <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 flex-shrink-0">{item.totalSessions}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            {item.type === 'class' && (
                                                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 relative" onClick={(e) => e.stopPropagation()}>
                                                    {['track', 'car'].map((m) => {
                                                        const currentSubMode = classSubModes[item.name] || 'track';
                                                        return (
                                                            <button
                                                                key={m}
                                                                onClick={() => setClassSubModes(prev => ({ ...prev, [item.name]: m as any }))}
                                                                className={`relative p-1.5 rounded-lg transition-colors z-10 flex items-center justify-center min-w-[28px] ${currentSubMode === m ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                                                            >
                                                                {currentSubMode === m && (
                                                                    <motion.div
                                                                        layout
                                                                        layoutId={`activeSubMode-${item.id}`}
                                                                        className="absolute inset-0 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                                                        transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                                                                    />
                                                                )}
                                                                <div className="relative z-20">
                                                                    {m === 'track' ? <MapPin size={14} /> : <Car size={14} />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <ChevronRight size={18} className={`text-gray-700 transition-all duration-300 flex-shrink-0 ${isExpanded ? 'rotate-90 text-blue-400' : 'group-hover:text-blue-400 group-hover:translate-x-1'}`} />
                                        </div>
                                    </div>
                                </button>
                                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mb-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                                    <div className="min-h-0 flex flex-col gap-1 mt-1">
                                        {groupingMode === 'track' ? (
                                            renderSessionList(item.sessions)
                                        ) : (
                                            item.children.map((child: any) => {
                                                const isChildExpanded = expandedFolders.includes(child.id);
                                                return (
                                                    <div key={child.id} className="flex flex-col gap-1">
                                                        <button
                                                            onClick={() => {
                                                                setExpandedFolders(prev =>
                                                                    prev.includes(child.id)
                                                                        ? prev.filter(t => t !== child.id)
                                                                        : [...prev, child.id]
                                                                );
                                                            }}
                                                            className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${isChildExpanded ? 'text-blue-400 bg-white/5' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}
                                                        >
                                                            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-tight">
                                                                {child.type === 'track' ? (
                                                                    getCountryFlagPath(child.country) ? (
                                                                        <div className="w-5 h-3 rounded-sm overflow-hidden border border-white/10 flex-shrink-0">
                                                                            <img src={getCountryFlagPath(child.country)!} alt={child.country} className="w-full h-full object-cover" />
                                                                        </div>
                                                                    ) : (
                                                                        <MapPin size={12} className={isChildExpanded ? 'text-blue-400' : 'text-gray-600'} />
                                                                    )
                                                                ) : (
                                                                    <div className="w-5 h-5 flex items-center justify-center">
                                                                        <img src={getBrandLogoPath(child.name)} className="w-full h-full object-contain filter brightness-125" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                                    </div>
                                                                )}
                                                                {child.name}
                                                            </div>
                                                            {isChildExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        </button>
                                                        <div className={`grid transition-all duration-300 ease-in-out ${isChildExpanded ? 'grid-rows-[1fr] opacity-100 mb-2' : 'grid-rows-[0fr] opacity-0 overflow-hidden'}`}>
                                                            <div className="min-h-0">
                                                                {renderSessionList(child.sessions)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => !isDeleting && setDeleteTarget(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: "spring", duration: 0.3 }}
                            className="bg-black/40 border border-red-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden glass-container group/deleteModal"
                            onClick={(e) => e.stopPropagation()}
                            onMouseMove={(e) => handleGlassMouseMove(e, 0.15)}
                        >
                            <div className="glass-content flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex-shrink-0 animate-pulse">
                                        <Trash2 size={20} />
                                    </div>
                                    <h3 className="text-base font-black text-white uppercase tracking-wider">Confirm Delete</h3>
                                </div>

                                <div className="text-xs text-gray-400 leading-relaxed font-semibold">
                                    Are you sure you want to delete this file? This action is permanent and cannot be undone.<br/>
                                    <span className="font-mono bg-black/40 px-2.5 py-1.5 rounded border border-white/5 text-red-400 block mt-3 text-[10px] break-all">
                                        {deleteTarget}
                                    </span>
                                </div>

                                <div className="flex gap-3 mt-2">
                                    <button
                                        disabled={isDeleting}
                                        onClick={() => setDeleteTarget(null)}
                                        className="flex-1 py-2 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isDeleting}
                                        onClick={async () => {
                                            if (deleteTarget && !isDeleting) {
                                                setIsDeleting(true);
                                                try {
                                                    await deleteSession(deleteTarget);
                                                    setDeleteTarget(null);
                                                } catch (err) {
                                                    console.error("[DEBUG] Delete session failed:", err);
                                                } finally {
                                                    setIsDeleting(false);
                                                }
                                            }
                                        }}
                                        className="flex-1 py-2 px-4 rounded-xl border border-red-500/30 hover:border-red-500 bg-red-600/20 hover:bg-red-600/80 text-white text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 size={12} className="animate-spin" />
                                                <span>Deleting...</span>
                                            </>
                                        ) : (
                                            <span>Delete File</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    </div>
    );
};
