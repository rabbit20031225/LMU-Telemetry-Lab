
import type { Session, Lap, TelemetryData, Profile } from '../types';

const API_BASE = '/api/v1';

export const apiClient = {
    // --- Profile Management ---
    async getProfiles(): Promise<{ profiles: Profile[] }> {
        const res = await fetch(`${API_BASE}/profiles`);
        if (!res.ok) throw new Error('Failed to fetch profiles');
        return res.json();
    },

    async createProfile(name: string): Promise<Profile> {
        const res = await fetch(`${API_BASE}/profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Failed to create profile');
        return res.json();
    },

    async deleteProfile(profileId: string): Promise<void> {
        const res = await fetch(`${API_BASE}/profiles/${profileId}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete profile');
    },

    async updateProfile(profileId: string, name: string): Promise<void> {
        const res = await fetch(`${API_BASE}/profiles/${profileId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error('Failed to update profile');
    },

    async uploadAvatar(profileId: string, file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/profiles/${profileId}/avatar`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload avatar');
        const data = await res.json();
        return data.avatar_url;
    },

    // --- Session/Telemetry Management ---
    async getSessions(profileId: string = 'guest'): Promise<{ sessions: Session[] }> {
        const res = await fetch(`${API_BASE}/sessions?profile_id=${profileId}`);
        if (!res.ok) throw new Error('Failed to fetch sessions');
        return res.json();
    },

    async getLaps(sessionId: string, profileId: string = 'guest'): Promise<{ laps: Lap[], metadata: import('../types').SessionMetadata }> {
        const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/laps?profile_id=${profileId}`);
        if (!res.ok) throw new Error('Failed to fetch laps');
        return res.json();
    },

    async getReferenceLaps(trackName: string, trackLayout: string, carClass: string, profileId: string = 'guest'): Promise<{ laps: import('../types').ReferenceLap[] }> {
        const params = new URLSearchParams({
            track_name: trackName,
            track_layout: trackLayout,
            car_class: carClass,
            profile_id: profileId
        });
        const res = await fetch(`${API_BASE}/reference-laps?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch reference laps');
        return res.json();
    },

    async getTelemetry(sessionId: string, stintId?: number, freq: number = 10, onProgress?: (progress: number) => void, profileId: string = 'guest'): Promise<TelemetryData> {
        let url = `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/telemetry?freq=${freq}&profile_id=${profileId}`;
        if (stintId !== undefined) {
            url += `&stint_id=${stintId}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch telemetry');

        const contentLength = res.headers.get('content-length');
        if (!contentLength || !onProgress) {
            return res.json();
        }

        const total = parseInt(contentLength, 10);
        let loaded = 0;

        const reader = res.body?.getReader();
        if (!reader) return res.json();

        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (value) {
                chunks.push(value);
                loaded += value.length;
                onProgress(Math.round((loaded / total) * 100));
            }
        }

        // Reconstruct JSON from chunks
        const blob = new Blob(chunks as any[]);
        const text = await blob.text();
        return JSON.parse(text);
    },

    async uploadSession(file: File, profileId: string = 'guest'): Promise<void> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/sessions/upload?profile_id=${profileId}`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to upload session');
        }
    },

    async renameSession(sessionId: string, newName: string, profileId: string = 'guest'): Promise<void> {
        const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/rename?profile_id=${profileId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_name: newName }),
        });
    },

    async deleteSession(sessionId: string, profileId: string = 'guest'): Promise<void> {
        await this._fetchJson(`/sessions/${encodeURIComponent(sessionId)}?profile_id=${profileId}`, {
            method: 'DELETE',
        });
    },

    async get3DTrack(sessionId: string, lap: number, profile_id: string = "guest", stint?: number | null): Promise<any> {
        let url = `/sessions/${encodeURIComponent(sessionId)}/3d-track?lap=${lap}&profile_id=${profile_id}`;
        if (stint !== undefined && stint !== null) {
            url += `&stint=${stint}`;
        }
        return this._fetchJson(url);
    },

    async getSteeringWheels(): Promise<{ categories: Record<string, {name: string, path: string}[]> }> {
        const res = await fetch(`${API_BASE}/steering-wheels`);
        if (!res.ok) throw new Error('Failed to fetch steering wheels');
        return res.json();
    },

    async validatePath(path: string): Promise<boolean> {
        const res = await fetch(`${API_BASE}/system/validate-path?path=${encodeURIComponent(path)}`);
        if (!res.ok) return false;
        const data = await res.json();
        return data.exists;
    },

    async openInExplorer(path: string): Promise<void> {
        await fetch(`${API_BASE}/system/open-path`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
        });
    },

    async pickAndUpload(
        path: string, 
        profileId: string = 'guest',
        bounds?: { x: number, y: number, width: number, height: number }
    ): Promise<{ status: string, id?: string }> {
        const res = await fetch(`${API_BASE}/system/pick-and-upload?profile_id=${profileId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, ...bounds }),
        });
        if (!res.ok) throw new Error('Native picker failed');
        return res.json();
    },

    async _fetchJson(path: string, options: RequestInit = {}): Promise<any> {
        const res = await fetch(`${API_BASE}${path}`, options);
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Direct Response Error' }));
            const msg = error.detail || `HTTP ${res.status}`;
            throw new Error(`[${res.status}] ${path} -> ${msg}`);
        }
        if (res.status === 204) return null;
        return res.json();
    }
};
