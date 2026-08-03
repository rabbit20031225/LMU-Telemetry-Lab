import React, { useState, useEffect } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { apiClient } from '../api/client';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { X, Send, AlertTriangle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';

const DiscordIcon = ({ size = 20, className = "" }) => (
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

interface DiscordShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    lapNumber: number;
}

export const DiscordShareModal: React.FC<DiscordShareModalProps> = ({ isOpen, onClose, lapNumber }) => {
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
    const laps = useTelemetryStore(state => state.laps);
    const customCarMappings = useTelemetryStore(state => state.customCarMappings);
    const shareToDiscord = useTelemetryStore(state => state.shareToDiscord);

    const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string>('https://discord.gg/your-invite-code');
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [carClass, setCarClass] = useState('lmgt3-telemetry-sharing');
    const [attachSetup, setAttachSetup] = useState(true);
    const [discordHandle, setDiscordHandle] = useState(() => localStorage.getItem('discord_username') || '');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // 1. Fetch Discord configuration on mount
    useEffect(() => {
        if (!isOpen) return;

        const loadConfig = async () => {
            try {
                setIsLoadingConfig(true);
                const config = await apiClient.getDiscordConfig();
                setIsConfigured(config.is_configured);
                if (config.invite_url) {
                    setInviteUrl(config.invite_url);
                }
            } catch (err) {
                console.error('Failed to load Discord config:', err);
                setIsConfigured(false);
            } finally {
                setIsLoadingConfig(false);
            }
        };

        loadConfig();
    }, [isOpen]);

    // 2. Pre-fill form when open
    useEffect(() => {
        if (!isOpen || !sessionMetadata) return;

        // A. Formulate Title
        const trackName = (sessionMetadata.trackName || 'Track').replace(/\s+/g, '-');
        
        // Find car model
        const rawCarName = sessionMetadata.rawCarName;
        const mappedCarModel = rawCarName && customCarMappings 
            ? Object.entries(customCarMappings).find(([k]) => k.toLowerCase() === rawCarName.toLowerCase())?.[1]
            : undefined;
        const carModelName = (mappedCarModel || sessionMetadata.modelName || 'Car').replace(/\s+/g, '-');

        // Lap duration
        const targetLap = laps.find(l => l.lap === lapNumber);
        let lapTimeStr = 'unknown';
        if (targetLap) {
            const t = targetLap.duration;
            const m = Math.floor(t / 60);
            const s = Math.floor(t % 60);
            const ms = Math.floor((t * 1000) % 1000);
            lapTimeStr = `${m}m${s.toString().padStart(2, '0')}s${ms.toString().padStart(3, '0')}`;
        }

        const gameVersionPlaceholder = 'v[GameVersion]'; // Prompt user to fill in their game version
        const formattedTitle = `${trackName} | ${carModelName} | ${lapTimeStr} | ${gameVersionPlaceholder}`;
        setTitle(formattedTitle);

        // B. Formulate Car Class
        const rawClass = (sessionMetadata.carClass || '').toLowerCase();
        if (rawClass.includes('gt3') || rawClass.includes('lmgt3')) {
            setCarClass('lmgt3-telemetry-sharing');
        } else if (rawClass.includes('hyper') || rawClass.includes('lmh') || rawClass.includes('lmdh')) {
            setCarClass('hypercar-telemetry-sharing');
        } else if (rawClass.includes('lmp3')) {
            setCarClass('lmp3-telemetry-sharing');
        } else if (rawClass.includes('lmp2')) {
            setCarClass('lmp2-telemetry-sharing');
        } else if (rawClass.includes('gte')) {
            setCarClass('gte-telemetry-sharing');
        } else {
            setCarClass('lmgt3-telemetry-sharing'); // fallback
        }

        // Reset state
        setContent('');
        setAttachSetup(true);
        setDiscordHandle(localStorage.getItem('discord_username') || '');
        setStatus('idle');
        setErrorMessage('');
    }, [isOpen, sessionMetadata, laps, lapNumber, customCarMappings]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !discordHandle.trim()) return;

        const versionPattern = /v\d+\.\d+/;
        if (!versionPattern.test(title) || title.includes('[GameVersion]') || title.includes('[') || title.includes(']')) {
            setStatus('error');
            setErrorMessage("Please edit the title and replace 'v[GameVersion]' with the actual game version (at least 'vX.X', e.g. v1.3 or v1.3.2.2) to proceed.");
            return;
        }

        try {
            setIsSubmitting(true);
            setStatus('idle');
            setErrorMessage('');

            await shareToDiscord(lapNumber, title, content, attachSetup, carClass, discordHandle.trim());
            localStorage.setItem('discord_username', discordHandle.trim());
            setStatus('success');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to share. Please verify that your Discord Bot Token and settings are correct.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div 
                className="w-full max-w-3xl bg-[#111115]/95 rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col glass-container"
                onMouseMove={handleGlassMouseMove}
            >
                <div className="glass-content p-6 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                            <DiscordIcon size={22} className="text-[#5865F2]" />
                            <h2 className="text-[17px] font-black uppercase tracking-wider text-white">Share Telemetry to Discord</h2>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all glass-container rounded-full border border-white/10 group/close"
                        >
                            <X size={18} className="group-hover/close:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>

                    {isLoadingConfig ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="animate-spin text-[#5865F2]" size={36} />
                            <span className="text-[14px] text-gray-400 font-bold uppercase tracking-wider">Connecting to Discord Module...</span>
                        </div>
                    ) : isConfigured === false ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
                            <AlertTriangle size={48} className="text-yellow-500" />
                            <div className="flex flex-col gap-1 max-w-md">
                                <h3 className="text-white font-bold text-[16px]">Discord Module Not Configured</h3>
                                <p className="text-[13px] text-gray-400 leading-relaxed">
                                    Please open <code className="bg-black/40 px-1 py-0.5 rounded border border-white/5 text-yellow-400 font-mono">discord_config.json</code> in the backend directory, and fill in your Bot Token, Guild ID, and Forum Channel IDs to enable the sharing feature.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="mt-2 px-5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[13px] font-black uppercase tracking-wider transition-all border border-white/10 active:scale-95"
                            >
                                Got It
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* Invite Link Promo */}
                            <div className="p-3.5 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 flex items-center justify-between gap-3">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[13px] font-black text-[#5865F2] uppercase tracking-wider">📢 Haven't joined our Discord server yet?</span>
                                    <span className="text-[12px] text-gray-400">Please click the button on the right to join so you can post and view telemetry in the forum channels.</span>
                                </div>
                                <a 
                                    href={inviteUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-black uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(88,101,242,0.4)] hover:scale-105 active:scale-95 shrink-0"
                                >
                                    Join Server
                                    <ExternalLink size={12} />
                                </a>
                            </div>

                            {/* Status Overlay */}
                            {status === 'success' && (
                                <div className="p-5 rounded-xl border border-green-500/20 bg-green-500/5 flex flex-col items-center gap-2 text-center">
                                    <CheckCircle size={32} className="text-green-400" />
                                    <span className="text-white font-bold text-[15px]">Share Successful!</span>
                                    <span className="text-gray-400 text-[12px]">A forum thread has been created on your Discord server with the telemetry and setup files.</span>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="mt-2 px-4 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-[12px] font-black uppercase tracking-wider transition-all border border-green-500/30 active:scale-95"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col gap-2 text-[13px] text-red-400">
                                    <span className="font-bold uppercase tracking-wider">Upload Failed:</span>
                                    <div className="leading-relaxed">
                                        {errorMessage.includes("not a member") || errorMessage.includes("not found") ? (
                                            <div className="flex flex-col items-start gap-2">
                                                <span>You must join our Discord community to share telemetry data.</span>
                                                <a 
                                                    href={inviteUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-black uppercase tracking-wider transition-all"
                                                >
                                                    Join Discord Server
                                                    <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        ) : (
                                            errorMessage
                                        )}
                                    </div>
                                </div>
                            )}

                            {status !== 'success' && (
                                <div className="flex flex-col gap-3.5">
                                    {/* Form Fields */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Post Title</label>
                                        <input
                                            type="text"
                                            required
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-[14px] font-mono text-white focus:outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2]/50 transition-all placeholder:text-gray-600"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Car Category</label>
                                            <select
                                                value={carClass}
                                                onChange={(e) => setCarClass(e.target.value)}
                                                className="w-full bg-[#16161c] border border-white/10 rounded-xl px-3.5 py-2.5 text-[14px] font-bold text-white focus:outline-none focus:border-[#5865F2] transition-all cursor-pointer"
                                            >
                                                <option value="lmgt3-telemetry-sharing">📁 lmgt3-telemetry-sharing</option>
                                                <option value="hypercar-telemetry-sharing">📁 hypercar-telemetry-sharing</option>
                                                <option value="lmp3-telemetry-sharing">📁 lmp3-telemetry-sharing</option>
                                                <option value="lmp2-telemetry-sharing">📁 lmp2-telemetry-sharing</option>
                                                <option value="gte-telemetry-sharing">📁 gte-telemetry-sharing</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Discord Username</label>
                                            <input
                                                type="text"
                                                required
                                                value={discordHandle}
                                                onChange={(e) => setDiscordHandle(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-[14px] text-white focus:outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2]/50 transition-all placeholder:text-gray-600"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={attachSetup}
                                                onChange={(e) => setAttachSetup(e.target.checked)}
                                                className="w-4 h-4 rounded border-white/10 bg-black/40 text-[#5865F2] focus:ring-0 cursor-pointer"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-white">Attach Car Setup (.svm)</span>
                                                <span className="text-[11px] text-gray-500">Include SVM setup file for this lap</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Description / Message</label>
                                        <textarea
                                            rows={5}
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            placeholder="Write about this lap, track tips, car setup notes, or thoughts... (Markdown supported)"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-3 text-[14px] text-white focus:outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2]/50 transition-all placeholder:text-gray-600 resize-none leading-relaxed"
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-2.5 border-t border-white/5 pt-3 mt-1">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={isSubmitting}
                                            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[13px] font-black uppercase tracking-wider transition-all border border-white/10 disabled:opacity-50 active:scale-95"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !title.trim()}
                                            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-[13px] font-black uppercase tracking-wider transition-all shadow-[0_4px_12px_rgba(88,101,242,0.3)] disabled:opacity-50 active:scale-95 cursor-pointer"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 size={15} className="animate-spin" />
                                                    Sharing...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={15} />
                                                    Share to Discord
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
