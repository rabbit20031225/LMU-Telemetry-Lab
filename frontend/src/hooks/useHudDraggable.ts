import { useState, useRef, useEffect } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';

interface Config {
    current: { x: number; y: number };
    scale: number;
}

interface UseHudDraggableProps {
    id: string;
    config: Config;
    updateConfig: (config: Partial<Config>) => void;
    containerRef: React.RefObject<HTMLDivElement>;
    isDraggable?: boolean;
    isResizable?: boolean;
}

export const useHudDraggable = ({ 
    id, 
    config, 
    updateConfig, 
    containerRef,
    isDraggable = true,
    isResizable = true
}: UseHudDraggableProps) => {
    const editHudMode       = useTelemetryStore(state => state.editHudMode);
    const updateHudRect     = useTelemetryStore(state => state.updateHudRect);
    const validateHudLayout  = useTelemetryStore(state => state.validateHudLayout);
    const isMapMaximized     = useTelemetryStore(state => state.isMapMaximized);
    const show3DLab          = useTelemetryStore(state => state.show3DLab);

    const [isDragging,  setIsDragging]  = useState(false);
    const [isResizing,  setIsResizing]  = useState(false);

    // Stable refs
    const configRef           = useRef(config);
    const updateCfgRef        = useRef(updateConfig);
    const validateRef         = useRef(validateHudLayout);
    const resizeStart         = useRef({ initialScale: 1.0, initialY: 0 });
    const dragOffset          = useRef({ dx: 0, dy: 0 });
    const rafRef              = useRef<number | null>(null);
    const pendingMouse        = useRef<{ clientX: number; clientY: number } | null>(null);
    const lastKnownSize       = useRef({ w: 0, h: 0 });
    const lastKnownParentSize = useRef({ w: 0, h: 0 });
    const modeChangeTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

    configRef.current    = config;
    updateCfgRef.current = updateConfig;
    validateRef.current  = validateHudLayout;

    // ── Registry Sync Helpers ─────────────────────────────────────────────────
    const syncRegistry = (el: HTMLElement, parent: HTMLElement) => {
        const eR = el.getBoundingClientRect();
        const pR = parent.getBoundingClientRect();
        if (pR.width === 0 || pR.height === 0) return;
        
        // Safety guard: If parent dimensions are too small (e.g. sidebar or collapsing),
        // skip registry sync and validation to prevent "running away" bug.
        if (!isMapMaximized && (pR.width < 450 || pR.height < 200)) return;

        updateHudRect(id, {
            left:   ((eR.left   - pR.left) / pR.width)  * 100,
            right:  ((eR.right  - pR.left) / pR.width)  * 100,
            top:    ((eR.top    - pR.top)  / pR.height) * 100,
            bottom: ((eR.bottom - pR.top)  / pR.height) * 100,
            active: true,
        }, { width: pR.width, height: pR.height });
    };

    // ── ResizeObserver: sync registry & trigger centralized validation ─────────
    useEffect(() => {
        const el     = containerRef.current;
        const parent = el?.parentElement;
        if (!el || !parent) return;

        // Watch element size (catches scale change, content change like adding reference car)
        const onElResize = () => {
            const eR = el.getBoundingClientRect();
            const w  = Math.round(eR.width);
            const h  = Math.round(eR.height);

            syncRegistry(el, parent);

            if (w === lastKnownSize.current.w && h === lastKnownSize.current.h) return;
            lastKnownSize.current = { w, h };

            // Element size changed → delay to let DOM settle, then validate all HUDs
            setTimeout(() => validateRef.current(), 60);
        };

        // Watch parent size (catches fullscreen toggle — registry sync only, validation via isMapMaximized effect)
        const onParentResize = () => {
            const pR = parent.getBoundingClientRect();
            const pw = Math.round(pR.width);
            const ph = Math.round(pR.height);
            if (pw === lastKnownParentSize.current.w && ph === lastKnownParentSize.current.h) return;
            // Sync registry first, then trigger centralized validation to clamp HUDs back into view
            syncRegistry(el, parent);
            setTimeout(() => validateRef.current(), 100);
        };

        const elObserver     = new ResizeObserver(onElResize);
        const parentObserver = new ResizeObserver(onParentResize);
        elObserver.observe(el);
        parentObserver.observe(parent);

        // Initial mount: sync + validate after DOM is ready
        setTimeout(() => {
            const eR = el.getBoundingClientRect();
            const pR = parent.getBoundingClientRect();
            lastKnownSize.current       = { w: Math.round(eR.width),  h: Math.round(eR.height) };
            lastKnownParentSize.current = { w: Math.round(pR.width),  h: Math.round(pR.height) };
            syncRegistry(el, parent);
            // Small extra delay so all HUDs can register before validateHudLayout runs
            setTimeout(() => validateRef.current(), 120);
        }, 80);

        return () => {
            elObserver.disconnect();
            parentObserver.disconnect();
            if (modeChangeTimer.current) clearTimeout(modeChangeTimer.current);
            updateHudRect(id, { left: 0, right: 0, top: 0, bottom: 0, active: false });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, containerRef, updateHudRect]);

    // ── isMapMaximized change: sync & validate after animation settles (400ms) ─
    useEffect(() => {
        if (modeChangeTimer.current) clearTimeout(modeChangeTimer.current);
        modeChangeTimer.current = setTimeout(() => {
            const el     = containerRef.current;
            const parent = el?.parentElement;
            if (el && parent) {
                syncRegistry(el, parent);
                // Extra tick so ALL HUDs can sync their registry before validation runs
                setTimeout(() => validateRef.current(), 50);
            }
        }, 400); // wait for fullscreen animation to complete
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMapMaximized, show3DLab]);

    // ── Pointer Handlers ──────────────────────────────────────────────────────
    const handlePointerDown = (e: React.PointerEvent) => {
        if (!editHudMode || !isDraggable) return;
        
        // Target specifically for dragging should capture
        const target = e.currentTarget as HTMLElement;
        try {
            target.setPointerCapture(e.pointerId);
        } catch (err) {
            console.warn("Failed to set pointer capture:", err);
        }

        e.preventDefault();
        e.stopPropagation();

        // Calculate initial offset between mouse and HUD center (in percentage units)
        const el     = containerRef.current;
        const parent = el?.parentElement;
        if (el && parent) {
            const pRect = parent.getBoundingClientRect();
            const mousePctX = ((e.clientX - pRect.left) / pRect.width) * 100;
            const mousePctY = ((e.clientY - pRect.top) / pRect.height) * 100;
            dragOffset.current = {
                dx: mousePctX - configRef.current.current.x,
                dy: mousePctY - configRef.current.current.y
            };
        }

        setIsDragging(true);
    };

    const handleResizePointerDown = (e: React.PointerEvent) => {
        if (!editHudMode || !isResizable) return;
        
        // Target specifically for resizing should also capture
        const target = e.currentTarget as HTMLElement;
        try {
            target.setPointerCapture(e.pointerId);
        } catch (err) {
            console.warn("Failed to set pointer capture:", err);
        }

        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        resizeStart.current = { initialScale: configRef.current.scale, initialY: e.clientY };
    };

    // ── Drag / Resize Loop: boundary clamp only (rAF throttled) ──────────────
    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const onMove = (e: PointerEvent) => {
            pendingMouse.current = { clientX: e.clientX, clientY: e.clientY };
            if (rafRef.current !== null) return;

            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                const mouse  = pendingMouse.current;
                if (!mouse) return;

                const el     = containerRef.current;
                const parent = el?.parentElement;
                if (!el || !parent) return;

                const pRect = parent.getBoundingClientRect();
                const oRect = el.getBoundingClientRect();
                const cfg   = configRef.current;

                if (isResizing) {
                    const dy          = mouse.clientY - resizeStart.current.initialY;
                    const newScale    = resizeStart.current.initialScale + dy * 0.005;
                    const sf          = newScale / cfg.scale;
                    const halfWPct    = (oRect.width  * sf / 2 / pRect.width)  * 100;
                    const halfHPct    = (oRect.height * sf / 2 / pRect.height) * 100;
                    const { x, y }    = cfg.current;

                    if (x - halfWPct >= 0 && x + halfWPct <= 100 &&
                        y - halfHPct >= 0 && y + halfHPct <= 100) {
                        updateCfgRef.current({ scale: Math.min(2.5, Math.max(0.5, newScale)) });
                    }
                    return;
                }

                if (isDragging) {
                    const BUFFER = 8; // px safety margin during drag
                    const halfWPct = ((oRect.width  / 2 + BUFFER) / pRect.width)  * 100;
                    const halfHPct = ((oRect.height / 2 + BUFFER) / pRect.height) * 100;

                    // Apply captured offset to keep grab point consistent
                    const rawX = ((mouse.clientX - pRect.left) / pRect.width) * 100;
                    const rawY = ((mouse.clientY - pRect.top)  / pRect.height) * 100;
                    
                    const x = Math.max(halfWPct, Math.min(100 - halfWPct, rawX - dragOffset.current.dx));
                    const y = Math.max(halfHPct, Math.min(100 - halfHPct, rawY - dragOffset.current.dy));

                    updateCfgRef.current({ current: { x, y } });
                }
            });
        };

        const onUp = (e: PointerEvent) => {
            // Release the pointer capture when mouse is released
            const target = e.target as HTMLElement;
            if (target && target.releasePointerCapture) {
                try {
                    target.releasePointerCapture(e.pointerId);
                } catch (err) {}
            }

            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            setIsDragging(false);
            setIsResizing(false);

            // Position confirmed → sync registry, then run centralized layout validation
            setTimeout(() => {
                const el     = containerRef.current;
                const parent = el?.parentElement;
                if (el && parent) {
                    syncRegistry(el, parent);
                    setTimeout(() => validateRef.current(), 30);
                }
            }, 20);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup',   onUp);
        document.addEventListener('pointercancel', onUp); // Fixed: handle interruptions
        return () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup',   onUp);
            document.removeEventListener('pointercancel', onUp);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging, isResizing]);

    return { 
        isDragging, 
        isResizing, 
        handleMouseDown: handlePointerDown, // Alias for backward compatibility if needed
        handleResizeMouseDown: handleResizePointerDown,
        handlePointerDown, 
        handleResizePointerDown 
    };
};
