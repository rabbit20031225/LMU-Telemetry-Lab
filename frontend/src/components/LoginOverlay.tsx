import React, { useState, useEffect } from 'react';
import { User, Plus, Trash2, X, RefreshCw, Edit2, Check } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';
import { handleGlassMouseMove } from '../utils/glassEffect';

interface LoginOverlayProps {
    onClose?: () => void;
}

export const LoginOverlay: React.FC<LoginOverlayProps> = ({ onClose }) => {
    const activeProfileId = useTelemetryStore(state => state.activeProfileId);
    const profiles = useTelemetryStore(state => state.profiles);
    const fetchProfiles = useTelemetryStore(state => state.fetchProfiles);
    const createProfile = useTelemetryStore(state => state.createProfile);
    const setProfile = useTelemetryStore(state => state.setProfile);
    const updateProfile = useTelemetryStore(state => state.updateProfile);
    const uploadAvatar = useTelemetryStore(state => state.uploadAvatar);
    const deleteProfile = useTelemetryStore(state => state.deleteProfile);
    const isLoading = useTelemetryStore(state => state.isLoading);
    const error = useTelemetryStore(state => state.error);

    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);



    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        await createProfile(newName);
        setIsCreating(false);
        setNewName('');
        // Don't auto-close if the user wants to see their new profile, 
        // but current logic auto-selects and closes in store usually.
        if (onClose) onClose();
    };

    const handleSelect = async (id: string) => {
        if (editingId) return; // Don't select while editing
        await setProfile(id);
        if (onClose) onClose();
    };

    const handleRename = (e: React.MouseEvent, id: string, currentName: string) => {
        e.stopPropagation();
        setEditingId(id);
        setEditValue(currentName);
    };

    const submitRename = async (e: React.FormEvent | React.MouseEvent) => {
        e.stopPropagation();
        if (editingId && editValue.trim()) {
            await updateProfile(editingId, editValue.trim());
        }
        setEditingId(null);
        setEditValue('');
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setConfirmDelete(id);
    };

    const executeDelete = async (id: string) => {
        const { deleteProfile } = useTelemetryStore.getState();
        await deleteProfile(id);
        setConfirmDelete(null);
    };



    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-500 overflow-hidden">
            {/* Background Ambient Glows */}
            <div className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[40rem] h-[40rem] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-700" />

            {/* Main Profile Selection UI */}
            <div
                className={`relative w-full max-w-md glass-container rounded-[2.5rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.6)] group border border-white/5 transition-all duration-500 ${confirmDelete ? 'scale-95 blur-md opacity-50 pointer-events-none' : 'scale-100 blur-0 opacity-100'}`}
                onMouseMove={(e) => handleGlassMouseMove(e)}
            >
                <div className="glass-content relative z-10 flex flex-col items-center">
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={() => fetchProfiles()}
                            disabled={isLoading}
                            title="Refresh Workspaces"
                            className="p-2.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all glass-container rounded-full border border-white/10 group/refresh active:scale-95 disabled:opacity-50"
                            onMouseMove={(e) => handleGlassMouseMove(e)}
                        >
                            <div className="glass-content">
                                <RefreshCw size={20} className={`${isLoading ? 'animate-spin' : 'group-hover/refresh:rotate-180'} transition-all duration-700`} />
                            </div>
                        </button>

                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all glass-container rounded-full border border-white/10 group/close"
                                onMouseMove={(e) => handleGlassMouseMove(e)}
                            >
                                <div className="glass-content">
                                    <X size={20} className="group-hover/close:rotate-90 transition-transform duration-300" />
                                </div>
                            </button>
                        )}
                    </div>

                    <h2 className="text-3xl font-black tracking-tighter mb-2 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent italic uppercase px-2 text-center leading-tight">
                        {isCreating ? 'CREATE NEW SPACE' : 'WORKSPACE SELECTOR'}
                    </h2>
                    <p className="text-gray-500 text-sm mb-2 text-center font-medium tracking-tight px-4 leading-normal">
                        {isCreating ? 'Organize by track, car class, or driver identity.' : 'Switch between your specialized telemetry environments.'}
                    </p>

                    {error && (
                        <div className="w-full mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold animate-shake">
                            {error}
                        </div>
                    )}

                    {/* Profile List with improved centering (scrollbar-gutter ensures stability) */}
                    <div className="w-full space-y-4 max-h-[360px] overflow-y-auto px-4 py-2 custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                        {!isCreating ? (
                            <>
                                {(profiles || []).map((p: any) => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleSelect(p.id)}
                                        className={`w-full group/item glass-container rounded-2xl transition-all duration-300 border ${activeProfileId === p.id ? 'bg-blue-600/20 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white/10 border-white/10 hover:bg-white/15 hover:border-white/20'}`}
                                        onMouseMove={handleGlassMouseMove}
                                        style={{ '--glass-hover-scale': '1.02' } as any}
                                    >
                                        <div className="glass-content flex items-center p-4 gap-4">
                                            {/* Avatar Section */}
                                            <div className="relative group/avatar">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all overflow-hidden ${activeProfileId === p.id ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 group-hover/item:text-white group-hover/item:bg-white/10'}`}>
                                                    {p.avatar_url ? (
                                                        <img
                                                            src={(p.avatar_url || "").startsWith('http') ? p.avatar_url : `${window.location.protocol}//${window.location.hostname}:8000${p.avatar_url}`}
                                                            alt={p.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).parentElement!.classList.add('bg-white/5');
                                                            }}
                                                        />
                                                    ) : (
                                                        <User size={24} />
                                                    )}
                                                </div>

                                                {/* Upload Trigger (Only visible on hover/active) */}
                                                <label
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity rounded-xl"
                                                >
                                                    <Plus size={16} className="text-white" />
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const { uploadAvatar } = useTelemetryStore.getState();
                                                                await uploadAvatar(p.id, file);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>

                                            <div className="flex-1 text-left min-w-0 overflow-hidden">
                                                {editingId === p.id ? (
                                                    <div className="flex items-center gap-2 pr-2" onClick={e => e.stopPropagation()}>
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') submitRename(e as any);
                                                                if (e.key === 'Escape') setEditingId(null);
                                                            }}
                                                            className="flex-1 bg-white/10 border border-blue-500/50 rounded-lg px-2 py-1 text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                        />
                                                        <button
                                                            onClick={submitRename}
                                                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-600/20"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="font-black tracking-tight text-lg text-white group-hover/item:translate-x-1 transition-transform truncate">
                                                        {p.name}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-gray-300 font-mono uppercase tracking-[0.05em] flex items-center gap-2 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
                                                    {p.id === 'guest' ? (
                                                        <span className="truncate">Initial Workspace</span>
                                                    ) : (
                                                        <span className="truncate">Created: {new Date(p.created_at).toLocaleDateString()}</span>
                                                    )}
                                                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                                                    <span className="text-blue-400 font-bold shrink-0">{p.session_count || 0} Files</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center min-w-fit">
                                                {!editingId && (
                                                    <div className="flex flex-col gap-1 opacity-0 group-hover/item:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] translate-x-4 group-hover/item:translate-x-0 overflow-hidden max-w-0 group-hover/item:max-w-px-100" style={{ '--max-w-target': '40px' } as any}>
                                                        <style dangerouslySetInnerHTML={{
                                                            __html: `
                                                            .group-hover\\/item\\:max-w-px-100 {
                                                                max-width: var(--max-w-target) !important;
                                                            }
                                                        `}} />
                                                        <button
                                                            onClick={(e) => handleRename(e, p.id, p.name)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all shrink-0"
                                                            title="Rename"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        {p.id !== 'guest' && (
                                                            <button
                                                                onClick={(e) => handleDelete(e, p.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {activeProfileId === p.id && !editingId && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,1)] shrink-0 ml-3" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}

                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full group/new glass-container rounded-2xl border border-dashed border-white/20 hover:border-blue-500/50 hover:bg-white/10 transition-all py-4"
                                    onMouseMove={handleGlassMouseMove}
                                    style={{ '--glass-hover-scale': '1.02' } as any}
                                >
                                    <div className="glass-content flex flex-col items-center gap-2">
                                        <Plus size={24} className="text-gray-500 group-hover/new:text-blue-400 transition-colors" />
                                        <span className="text-xs font-black uppercase tracking-widest text-gray-500 group-hover/new:text-white">New Category / Environment</span>
                                    </div>
                                </button>
                            </>
                        ) : (
                            <form onSubmit={handleCreate} className="w-full space-y-6 animate-in slide-in-from-right-4 duration-300 px-1">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-4">Environment Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. GT3 SPA / LEWIS HAMILTON / 2024 SEASON"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all text-lg font-bold"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 px-6 py-4 rounded-2xl border border-white/5 text-gray-500 font-bold hover:text-white hover:bg-white/5 transition-all text-sm uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] px-6 py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all shadow-[0_10px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-95 text-sm uppercase tracking-[0.2em] italic"
                                    >
                                        Establish
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Glass Polish Layers */}
                <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent pointer-events-none opacity-50" />
            </div>

            {/* Deletion Confirmation Modal (Screen Centered Overlay) */}
            {confirmDelete && (
                <div className="absolute inset-0 z-[3100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-sm glass-container rounded-[2rem] p-8 text-center animate-in zoom-in-95 duration-300 border border-red-500/30 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                        <div className="glass-content flex flex-col items-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Delete Workspace?</h3>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                This will permanently remove all telemetry data associated with <br />
                                <span className="text-white font-bold">"{(profiles || []).find((p: any) => p.id === confirmDelete)?.name || 'Unknown'}"</span>.
                            </p>
                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="flex-1 py-4 px-6 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 hover:text-white transition-all uppercase tracking-widest text-[10px]"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={() => executeDelete(confirmDelete)}
                                    className="flex-1 py-4 px-6 rounded-xl bg-red-600 text-white font-black hover:bg-red-500 transition-all uppercase tracking-widest text-[10px] shadow-[0_10px_20px_rgba(220,38,38,0.3)]"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


