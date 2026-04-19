import React, { Suspense, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, PerspectiveCamera, Float, Stars, Bounds, Center, Line, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useTelemetryStore } from '../store/telemetryStore';
import { Layers, MousePointer2, Move3d, RotateCcw, Play, Pause, Compass, Target, Navigation, Maximize2, Minimize2, Activity, ChevronRight, Check, ChevronDown } from 'lucide-react';
import { handleGlassMouseMove } from '../utils/glassEffect';
import { Tooltip } from './ui/Tooltip';
import { TrackMap } from './TrackMap';
import { CompactTelemetryOverlay } from './CompactTelemetryOverlay';
import { TrackInfoOverlay } from './TrackInfoOverlay';
import { CarInfoOverlay } from './CarInfoOverlay';
import { LapsSelectorOverlay } from './LapsSelectorOverlay';
import { DataChartsOverlay } from './DataChartsOverlay';
import { MaximizedDimensionToggle } from './MaximizedDimensionToggle';
import { FileManager } from './FileManager';

// Custom Icons matched with 2D TrackMap
const MapIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
        <path d="M9 3v15" />
        <path d="M15 6v15" />
    </svg>
);

const ViewfinderIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 8V3h5" />
        <path d="M16 3h5v5" />
        <path d="M21 16v5h-5" />
        <path d="M8 21H3v-5" />
    </svg>
);

const FollowIcon = ({ size = 18, className = "" }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 8V3h5" />
        <path d="M16 3h5v5" />
        <path d="M21 16v5h-5" />
        <path d="M8 21H3v-5" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 7V9" />
        <path d="M12 15V17" />
        <path d="M17 12H15" />
        <path d="M9 12H7" />
    </svg>
);

// Helper equivalent to TrackMap.tsx
const formatLapTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "00:00.000";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

// SHARED LOGIC: Calculate 3D position and orientation for both Car and CameraController
const getCarTransform = (telemetryData: any, cursorIndex: number | null, smoothCursorIndex: number | null, isPlaying: boolean, center: any, zScale: number, zBase: number, trackPoints: any[] | null) => {
    if (!telemetryData || cursorIndex === null || !center) return null;
    const lats = telemetryData['GPS Latitude'];
    const lons = telemetryData['GPS Longitude'];
    const alt = telemetryData['WorldPosZ'];
    if (!lats || !lons) return null;

    const idx = isPlaying ? (smoothCursorIndex ?? cursorIndex) : cursorIndex;
    const baseIdx = Math.floor(idx);
    const nextIdx = Math.min(lats.length - 1, baseIdx + 1);
    const frac = idx - baseIdx;

    const lat1 = lats[baseIdx];
    const lon1 = lons[baseIdx];
    const lat2 = lats[nextIdx];
    const lon2 = lons[nextIdx];

    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;

    const lat = lat1 + (lat2 - lat1) * frac;
    const lon = lon1 + (lon2 - lon1) * frac;

    const degM = 111320;
    const x = (lon - center.lon) * center.lonScale * degM;
    const y = (lat - center.lat) * degM;

    let targetZ = 0;
    let trackClosestIdx = -1;
    if (trackPoints && trackPoints.length > 0) {
        let minDSq = Infinity;
        for (let i = 0; i < trackPoints.length; i++) {
            const p = trackPoints[i];
            if (p.x === undefined || p.y === undefined) continue;
            const dSq = (p.x - x) ** 2 + (p.y - y) ** 2;
            if (dSq < minDSq) {
                minDSq = dSq;
                targetZ = (p.z || 0) * zScale;
                trackClosestIdx = i;
            }
        }
    } else {
        let z = 0;
        if (alt && Array.isArray(alt)) {
            const z1 = alt[baseIdx];
            const z2 = alt[nextIdx];
            if (z1 !== undefined) {
                z = ((z1 + (z2 !== undefined ? (z2 - z1) * frac : 0)) - zBase) * zScale;
            }
        }
        targetZ = z;
    }

    let heading = 0;
    let pitch = 0;

    if (lats && lons) {
        const window = 15;
        const i1 = Math.max(0, Math.floor(idx) - window);
        const i2 = Math.min(lats.length - 1, Math.floor(idx) + window);
        if (i1 !== i2) {
            const dLat = lats[i2] - lats[i1];
            const dLon = (lons[i2] - lons[i1]) * center.lonScale;
            heading = -Math.atan2(dLon, dLat);
        }
    }

    if (trackPoints && trackClosestIdx !== -1 && trackPoints.length > 1) {
        const p1 = trackPoints[trackClosestIdx];
        const lookAheadSteps = Math.min(5, Math.max(1, trackPoints.length - 1));
        const nextIdx = (trackClosestIdx + lookAheadSteps) % trackPoints.length;
        const p2 = trackPoints[nextIdx];
        if (p1 && p2 && p1.x !== undefined && p2.x !== undefined) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist2D = Math.sqrt(dx * dx + dy * dy);
            const dz = ((p2.z || 0) - (p1.z || 0)) * zScale;
            if (dist2D > 0.01) pitch = -Math.atan2(dz, dist2D);
        }
    }

    return { x, y, z: targetZ + 0.1, heading, pitch };
};

const TrackSurface = ({ points, center, zScale = 0, onHover, onHoverOut }: {
    points: any[],
    center: any,
    zScale: number,
    onHover?: (p: any, screenPos: { x: number, y: number }) => void,
    onHoverOut?: () => void
}) => {
    const { geometry, wallGeometry, leftEdges, rightEdges } = useMemo(() => {
        if (!points || points.length < 2) return { geometry: null, wallGeometry: null, leftEdges: [], rightEdges: [] };

        let projected = points.map(p => ({
            x: p.x,
            y: p.y,
            z: (p.z || 0) * (zScale || 1.0),
            width: p.width || 7.5,
            lat_offset: p.lat || 0
        })).filter(p => {
            // FILTER JUNK POINTS
            if (isNaN(p.x) || isNaN(p.y)) return false;
            if (Math.abs(p.x) < 1e-10 && Math.abs(p.y) < 1e-10) return false;

            return true;
        });

        if (projected.length < 3) return { geometry: null, wallGeometry: null, leftEdges: [], rightEdges: [] };

        // PRE-DEDUPLICATION: Remove potential overlapping end point
        // If the gap is too small, it causes normal "kinks" due to zero-length segments
        const pFirst = projected[0];
        const pLast = projected[projected.length - 1];
        const distStartEndSq = Math.pow(pFirst.x - pLast.x, 2) + Math.pow(pFirst.y - pLast.y, 2);

        // RELAXED CLOSURE: Use 50m threshold for robust circuit completion
        const isSelfClosing = distStartEndSq < 100 * 100;

        if (isSelfClosing) {
            // FORCE ALIGNMENT: Perfectly snap the last point to the first
            const lastIdx = projected.length - 1;
            projected[lastIdx].x = pFirst.x;
            projected[lastIdx].y = pFirst.y;
            projected[lastIdx].z = pFirst.z;
            projected[lastIdx].width = pFirst.width;

            // For 3D, we don't want overlapping geometry faces.
            // If the last point was just a "padding" point from 2D logic, removing it is cleaner.
            if (distStartEndSq < 20 * 20) {
                projected.pop();
            }
        }

        const rawNormals: { nx: number, ny: number }[] = [];
        for (let i = 0; i < projected.length; i++) {
            const nextIdx = (i + 1) % projected.length;
            const prevIdx = (i - 1 + projected.length) % projected.length;
            const next = projected[nextIdx];
            const prev = projected[prevIdx];

            // Tangent calculation using circular indexing
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            rawNormals.push(dist < 1e-6 ? { nx: 0, ny: 1 } : { nx: -dy / dist, ny: dx / dist });
        }

        const vertices: number[] = [];
        const indices: number[] = [];
        const lEdges: number[] = [];
        const rEdges: number[] = [];

        const N_SMOOTH = 10; // Slightly larger for elevation stability
        const W_SMOOTH = 25;

        for (let i = 0; i < projected.length; i++) {
            const p = projected[i];

            // 1. Smooth Normal Calculation
            let snx = 0, sny = 0, snc = 0;
            const refN = rawNormals[i];
            for (let w = -N_SMOOTH; w <= N_SMOOTH; w++) {
                const ni = (i + w + rawNormals.length) % rawNormals.length;
                const n = rawNormals[ni];
                if (n.nx * refN.nx + n.ny * refN.ny > 0) {
                    snx += n.nx; sny += n.ny; snc++;
                }
            }
            const nx = snx / (snc || 1);
            const ny = sny / (snc || 1);
            const nMag = Math.sqrt(nx * nx + ny * ny);
            const nnx = nx / (nMag || 1);
            const nny = ny / (nMag || 1);

            // 2. Smooth Width Calculation
            let sw = 0, swc = 0;
            for (let w = -W_SMOOTH; w <= W_SMOOTH; w++) {
                const wi = (i + w + projected.length) % projected.length;
                sw += Math.abs(projected[wi].width); swc++;
            }
            const curWidth = Math.max(4.0, sw / (swc || 1));
            const curLat = p.lat_offset;

            // Offset calculation
            const lOffset = curWidth + curLat;
            const rOffset = -curWidth + curLat;

            const lx = p.x + nnx * lOffset;
            const ly = p.y + nny * lOffset;
            const rx = p.x + nnx * rOffset;
            const ry = p.y + nny * rOffset;

            vertices.push(lx, ly, p.z, rx, ry, p.z);
            lEdges.push(lx, ly, p.z);
            rEdges.push(rx, ry, p.z);

            // 3. Generate Indices With Closure
            const base = i * 2;
            if (i < projected.length - 1) {
                indices.push(base, base + 1, base + 2);
                indices.push(base + 1, base + 3, base + 2);
            } else if (isSelfClosing) {
                // Perfect loop closure: connect back to vertex indices 0 and 1
                const nextBase = 0;
                indices.push(base, base + 1, nextBase);
                indices.push(base + 1, nextBase + 1, nextBase);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        // 5. Generate Side Walls (Curtains) with loop closure
        const wallV: number[] = [];
        const wallI: number[] = [];
        const bottomZ = 0;

        const nPoints = lEdges.length / 3;
        // Left Side
        for (let i = 0; i < nPoints; i++) {
            const x = lEdges[i * 3], y = lEdges[i * 3 + 1], z = lEdges[i * 3 + 2];
            wallV.push(x, y, z, x, y, bottomZ);

            const b = i * 2;
            if (i < nPoints - 1) {
                wallI.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
            } else {
                // Close Left Wall
                wallI.push(b, b + 1, 0, b + 1, 1, 0);
            }
        }
        // Right Side
        const rOffTotal = wallV.length / 3;
        for (let i = 0; i < nPoints; i++) {
            const x = rEdges[i * 3], y = rEdges[i * 3 + 1], z = rEdges[i * 3 + 2];
            wallV.push(x, y, z, x, y, bottomZ);

            const b = rOffTotal + i * 2;
            if (i < nPoints - 1) {
                wallI.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
            } else {
                // Close Right Wall
                wallI.push(b, rOffTotal, b + 1, b + 1, rOffTotal, rOffTotal + 1);
            }
        }

        const wGeo = new THREE.BufferGeometry();
        wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallV, 3));
        wGeo.setIndex(wallI);
        wGeo.computeVertexNormals();

        return { geometry: geo, wallGeometry: wGeo, leftEdges: lEdges, rightEdges: rEdges };
    }, [points, center, zScale]);

    if (!geometry) return null;

    return (
        <group>
            <mesh
                geometry={geometry}
                onPointerMove={(e) => {
                    e.stopPropagation();
                    if (onHover && points.length > 0) {
                        // CRITICAL: Convert World position back to Local mesh position
                        const localPoint = e.object.worldToLocal(e.point.clone());
                        const { x, y } = localPoint;

                        let minDSq = Infinity;
                        let nearest = points[0];
                        // Using a reasonably optimized search
                        const step = points.length > 5000 ? 5 : 1;
                        for (let i = 0; i < points.length; i += step) {
                            const p = points[i];
                            const dSq = Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2);
                            if (dSq < minDSq) {
                                minDSq = dSq;
                                nearest = p;
                            }
                        }
                        onHover(nearest, { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
                    }
                }}
                onPointerOut={onHoverOut}
            >
                <meshStandardMaterial color="#1a1a20" roughness={0.6} metalness={0.2} side={THREE.DoubleSide} />
            </mesh>
            {wallGeometry && (
                <mesh geometry={wallGeometry}>
                    <meshStandardMaterial color="#aaaaaa" roughness={0.8} metalness={0.1} side={THREE.DoubleSide} transparent opacity={0.3} depthWrite={false} />
                </mesh>
            )}
            <Line points={leftEdges as any} color="#bbbbbb" lineWidth={3} />
            <Line points={rightEdges as any} color="#bbbbbb" lineWidth={3} />
        </group>
    );
};

const RacingLine = ({ points, center, zScale = 0, isReference = false }: { points: any[], center: any, zScale: number, isReference?: boolean }) => {
    const { positions, colors } = useMemo(() => {
        if (!points || points.length === 0) return { positions: [], colors: [] };

        const pos: number[] = [];
        const col: number[] = [];

        points.forEach(p => {
            const x = p.x;
            const y = p.y;
            const z = (p.z || 0) * zScale + (isReference ? 0.1 : 0.05); // Minimal offset to prevent Z-fighting

            if (!isNaN(x) && !isNaN(y)) {
                pos.push(x, y, z);

                const color = new THREE.Color();
                if (isReference) {
                    // Golden Yellow for Reference
                    color.setHex(0xdaa520);
                } else {
                    const r = Math.min(255, Math.floor((p.brake || 0) * 2.55));
                    const g = Math.min(255, Math.floor((p.throttle || 0) * 2.55));

                    if (r < 15 && g < 15) {
                        // Coasting: White
                        color.setRGB(0.9, 0.9, 0.9);
                    } else {
                        color.setRGB(r / 255, g / 255, 20 / 255);
                    }
                }
                col.push(color.r, color.g, color.b);
            }
        });
        return { positions: pos, colors: col };
    }, [points, zScale, isReference]);

    if (positions.length === 0) return null;

    return (
        <Line
            points={positions as any}
            vertexColors={colors as any}
            lineWidth={isReference ? 2 : 5}
            dashed={isReference}
            dashSize={4}
            dashScale={1}
            gapSize={4}
            frustumCulled={false}
        />
    );
};

const Car = ({ telemetryData, cursorIndex, smoothCursorIndex, isPlaying, center, zScale = 1, zBase = 0, isReference = false, trackPoints = null }: any) => {
    const groupRef = useRef<THREE.Group>(null);

    const transform = useMemo(() => {
        return getCarTransform(telemetryData, cursorIndex, smoothCursorIndex, isPlaying, center, zScale, zBase, trackPoints);
    }, [telemetryData, cursorIndex, smoothCursorIndex, isPlaying, center, zScale, zBase, trackPoints]);

    const arrowShape = useMemo(() => {
        const shape = new THREE.Shape();
        // Shifted Y coordinates so the pivot origin (0,0) is halfway between the tip and the geometric center.
        // Original tip was 0, center was -11.5 (23/2). Midpoint is -5.75.
        // So we add 5.75 to all original Y values.
        shape.moveTo(0, 5.75);       // Tip
        shape.lineTo(8, -17.25);     // Bottom Right 
        shape.lineTo(0, -12.25);     // Inner Bottom Dip
        shape.lineTo(-8, -17.25);    // Bottom Left
        shape.lineTo(0, 5.75);
        return shape;
    }, []);

    const extrudeSettings = useMemo(() => ({
        depth: 5.0,
        bevelEnabled: true,
        bevelThickness: 1.2,
        bevelSize: 0.8,
        bevelSegments: 2
    }), []);

    if (!transform) return null;

    const carColor = isReference ? "#ffe600" : "#0072cb"; // Use pure intense hex without alpha channel

    return (
        <group
            ref={groupRef}
            position={[transform.x, transform.y, transform.z]}
            rotation={[transform.pitch, 0, transform.heading]}
            scale={[0.72, 0.72, 0.72]}
        >
            <mesh>
                <extrudeGeometry args={[arrowShape, extrudeSettings]} />
                {/* 
                    Use meshBasicMaterial instead of meshStandardMaterial.
                    Basic material renders raw base colors with ZERO physical lighting calculations,
                    meaning it will NEVER look "foggy", "glowing", or "washed out" by specular highlights.
                    It looks like a solid 2D vector object embedded in 3D space.
                */}
                <meshBasicMaterial
                    color={carColor}
                    transparent={isReference}
                    opacity={isReference ? 0.8 : 1}
                />
                <Edges linewidth={0.8} threshold={15} color="#ffffff" />
            </mesh>

            {/* Soft Ambient Halo: A slightly larger, faint version of the arrow for a glow effect */}
            <mesh scale={[1.15, 1.15, 1.15]} position={[0, 0, -0.5]}>
                <extrudeGeometry args={[arrowShape, extrudeSettings]} />
                <meshBasicMaterial
                    color={carColor}
                    transparent={true}
                    opacity={0.2}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
};

const CameraController = ({ viewMode, telemetryData, cursorIndex, smoothCursorIndex, isPlaying, center, zScale = 1, zBase = 0, trackPoints = null, trackCenterOffset, pcaRotation, resetKey }: any) => {
    const lastWorldPosRef = useRef<THREE.Vector3 | null>(null);
    const lastHeadingRef = useRef<number | null>(null);
    const orbitHeadingRef = useRef<number>(0);
    const activeModeRef = useRef<string | null>(null);
    const lastResetKeyRef = useRef<number>(resetKey);

    useFrame((state) => {
        const orbitControls = (state as any).controls;
        if (!orbitControls) return;

        if (viewMode === 'free') {
            orbitControls.enablePan = true;
            orbitControls.minAzimuthAngle = -Infinity;
            orbitControls.maxAzimuthAngle = Infinity;
            lastWorldPosRef.current = null;
            lastHeadingRef.current = null;
            // No early return here, let it pass through to the initialization/reset block below
        }

        const transform = getCarTransform(telemetryData, cursorIndex, smoothCursorIndex, isPlaying, center, zScale, zBase, trackPoints);
        if (!transform) return;

        // Calculate world position
        const worldPos = new THREE.Vector3(
            transform.x - trackCenterOffset.x,
            transform.y - trackCenterOffset.y,
            transform.z
        );
        if (!isNaN(pcaRotation)) {
            worldPos.applyAxisAngle(new THREE.Vector3(0, 0, 1), pcaRotation);
        }

        const carHeading = (transform.heading || 0) + (isNaN(pcaRotation) ? 0 : pcaRotation);

        // 1. MODE INITIALIZATION / FORCED RESET (SNAP TO CAR)
        const isModeTypeChanged = activeModeRef.current !== viewMode;
        const isResetRequested = lastResetKeyRef.current !== resetKey;

        if (isModeTypeChanged || isResetRequested) {
            // CRITICAL: Unlock all controls before snapping to avoid constraint interference
            orbitControls.minAzimuthAngle = -Infinity;
            orbitControls.maxAzimuthAngle = Infinity;
            orbitControls.minPolarAngle = 0;
            orbitControls.maxPolarAngle = Math.PI;
            orbitControls.enablePan = true;

            if (viewMode === 'headingUp') {
                const dist = 180;
                const pitchRad = 25 * (Math.PI / 180);
                const offset = new THREE.Vector3(0, -Math.cos(pitchRad), Math.sin(pitchRad)).multiplyScalar(dist);
                offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), carHeading);
                state.camera.position.copy(worldPos).add(offset);
                orbitControls.target.copy(worldPos);
                orbitHeadingRef.current = carHeading;
            } else if (viewMode === 'follow') {
                const dist = 180;
                const elevationRad = 25 * (Math.PI / 180);
                const sideShiftRad = (trackCenterOffset.isClockwise ? -35 : 35) * (Math.PI / 180);
                const offset = new THREE.Vector3(0, -Math.cos(elevationRad), Math.sin(elevationRad));
                offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), sideShiftRad);
                offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), carHeading);
                offset.multiplyScalar(dist);
                state.camera.position.copy(worldPos).add(offset);
                orbitControls.target.copy(worldPos);
            } else if (viewMode === 'free') {
                // INTEGRATED: Dynamic auto-framing logic moved here for single-tick stability
                const targetData = trackPoints ? { baseMap: trackPoints } : null;
                const d = trackCenterOffset.dist || 3000;

                if (targetData?.baseMap) {
                    const pts = targetData.baseMap;
                    const cx = trackCenterOffset.x;
                    const cy = trackCenterOffset.y;
                    const angle = pcaRotation;
                    const phi = 50 * (Math.PI / 180);

                    let rMinY = Infinity, rMaxY = -Infinity;
                    const cosA = Math.cos(angle);
                    const sinA = Math.sin(angle);

                    for (let i = 0; i < pts.length; i += 20) {
                        const p = pts[i];
                        if (p && !isNaN(p.x)) {
                            const ry = (p.x - cx) * sinA + (p.y - cy) * cosA;
                            if (ry < rMinY) rMinY = ry;
                            if (ry > rMaxY) rMaxY = ry;
                        }
                    }
                    const vHeight = isFinite(rMaxY - rMinY) ? (rMaxY - rMinY) : d;
                    const targetYOffset = -vHeight * 0.12;

                    orbitControls.target.set(0, targetYOffset, 0);
                    state.camera.position.set(0, -d * Math.cos(phi) + targetYOffset, d * Math.sin(phi));
                } else {
                    orbitControls.target.set(0, 0, 0);
                    state.camera.position.set(0, -d * 0.7, d * 0.7);
                }
            }

            orbitControls.update();
            activeModeRef.current = viewMode;
            lastResetKeyRef.current = resetKey;
        }

        if (viewMode === 'free') return;

        // 2. DELTA TRANSLATION (FOLLOW MOVEMENT)
        if (lastWorldPosRef.current) {
            const deltaPos = new THREE.Vector3().subVectors(worldPos, lastWorldPosRef.current);
            state.camera.position.add(deltaPos);
            orbitControls.target.copy(worldPos);
        }

        // 3. HEADING LOCK (FOR HEADING UP)
        if (viewMode === 'headingUp') {
            // Smoothly interpolate the orbit heading lock
            let diff = carHeading - orbitHeadingRef.current;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            orbitHeadingRef.current += diff * 0.15;

            orbitControls.minAzimuthAngle = orbitHeadingRef.current;
            orbitControls.maxAzimuthAngle = orbitHeadingRef.current;
        } else {
            orbitControls.minAzimuthAngle = -Infinity;
            orbitControls.maxAzimuthAngle = Infinity;
        }

        // 4. FINAL UPDATE
        orbitControls.update();
        lastWorldPosRef.current = worldPos.clone();
        lastHeadingRef.current = carHeading;
    });

    return null;
};

export const TrackMap3D = ({ onToggleExpand }: { onToggleExpand?: () => void }) => {
    const track3DData = useTelemetryStore(state => state.track3DData);
    const referenceTrack3DData = useTelemetryStore(state => state.referenceTrack3DData);
    const staticTrackBaseData = useTelemetryStore(state => state.staticTrackBaseData);
    const zScale = useTelemetryStore(state => state.zScale);
    const [hoverInfo, setHoverInfo] = useState<{ p: any, pos: { x: number, y: number } } | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [viewMode, setViewMode] = useState<'free' | 'follow' | 'headingUp'>('free');
    const [showMiniMap, setShowMiniMap] = useState(true);
    const [resetKey, setResetKey] = useState(0);
    const controlsRef = useRef<any>(null);

    const currentSessionId = useTelemetryStore(state => state.currentSessionId);
    const selectedStint = useTelemetryStore(state => state.selectedStint);
    const fetch3DTrack = useTelemetryStore(state => state.fetch3DTrack);
    const fetchReference3DTrack = useTelemetryStore(state => state.fetchReference3DTrack);
    const selectedLapIdx = useTelemetryStore(state => state.selectedLapIdx);
    const referenceLapIdx = useTelemetryStore(state => state.referenceLapIdx);
    const referenceLap = useTelemetryStore(state => state.referenceLap);
    const telemetryData = useTelemetryStore(state => state.telemetryData);
    const referenceTelemetryData = useTelemetryStore(state => state.referenceTelemetryData);
    const laps = useTelemetryStore(state => state.laps);
    const cursorIndex = useTelemetryStore(state => state.cursorIndex);
    const referenceCursorIndex = useTelemetryStore(state => state.referenceCursorIndex);
    const smoothCursorIndex = useTelemetryStore(state => state.smoothCursorIndex);
    const isPlaying = useTelemetryStore(state => state.isPlaying);
    const togglePlayback = useTelemetryStore(state => state.togglePlayback);
    const playbackSpeed = useTelemetryStore(state => state.playbackSpeed);
    const setPlaybackSpeed = useTelemetryStore(state => state.setPlaybackSpeed);
    const setPlaybackProgress = useTelemetryStore(state => state.setPlaybackProgress);
    const setZScale = useTelemetryStore(state => state.setZScale);
    const dashboardSyncMode = useTelemetryStore(state => state.dashboardSyncMode);
    const referenceDeltaIndex = useTelemetryStore(state => state.referenceDeltaIndex);
    const sessionMetadata = useTelemetryStore(state => state.sessionMetadata);
    const referenceSessionMetadata = useTelemetryStore(state => state.referenceSessionMetadata);
    const showTelemetryOverlay = useTelemetryStore(state => state.showTelemetryOverlay);
    const setShowTelemetryOverlay = useTelemetryStore(state => state.setShowTelemetryOverlay);
    const hudVisibility = useTelemetryStore(state => state.hudVisibility);
    const setHudVisibility = useTelemetryStore(state => state.setHudVisibility);
    const editHudMode = useTelemetryStore(state => state.editHudMode);
    const resetHudConfigs = useTelemetryStore(state => state.resetHudConfigs);
    const isMapMaximized = useTelemetryStore(state => state.isMapMaximized);
    const setIsMapMaximized = useTelemetryStore(state => state.setIsMapMaximized);
    const maximizedSidebarMode = useTelemetryStore(state => state.maximizedSidebarMode);
    const setMaximizedSidebarMode = useTelemetryStore(state => state.setMaximizedSidebarMode);

    const [isSpeedOpen, setIsSpeedOpen] = useState(false);
    const [showHudMenu, setShowHudMenu] = useState(false);
    const speedMenuRef = useRef<HTMLDivElement>(null);
    const hudMenuRef = useRef<HTMLDivElement>(null);

    // Handle Click Outside for Menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (speedMenuRef.current && !speedMenuRef.current.contains(event.target as Node)) {
                setIsSpeedOpen(false);
            }
            if (hudMenuRef.current && !hudMenuRef.current.contains(event.target as Node)) {
                setShowHudMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const lapBounds = useMemo(() => {
        if (!telemetryData || !laps || selectedLapIdx === null) return null;
        const time = telemetryData['Time'];
        if (!time) return null;
        const currentLap = laps.find(l => l.lap === selectedLapIdx);
        if (!currentLap) return null;

        const sIdx = time.findIndex(t => t >= currentLap.startTime);
        const eIdx = time.findIndex(t => t > currentLap.endTime) - 1;
        const validEIdx = eIdx < 0 ? time.length - 1 : eIdx;

        return { sIdx, validEIdx, startTime: currentLap.startTime };
    }, [telemetryData, laps, selectedLapIdx]);

    const playbackProgress = useMemo(() => {
        const fallback = { progress: 0, currentTime: "00:00.000" };
        if (!telemetryData || !lapBounds || cursorIndex === null) return fallback;
        const time = telemetryData['Time'];
        const { sIdx, validEIdx, startTime } = lapBounds;

        if (validEIdx === sIdx) return fallback;

        const currentIdx = smoothCursorIndex ?? cursorIndex;
        const progress = (currentIdx - sIdx) / (validEIdx - sIdx || 1);
        const elapsed = Math.max(0, (time[Math.floor(currentIdx)] || 0) - startTime);
        return { progress, currentTime: formatLapTime(elapsed) };
    }, [telemetryData, lapBounds, cursorIndex]);

    const trackCenterOffset = useMemo(() => {
        const targetData = staticTrackBaseData || track3DData;
        if (!targetData?.baseMap || targetData.baseMap.length === 0) return { x: 0, y: 0, dist: 4000 };
        const pts = targetData.baseMap;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        pts.forEach(p => {
            if (!isNaN(p.x) && !isNaN(p.y)) {
                minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
            }
        });

        const w = maxX - minX;
        const h = maxY - minY;
        const maxDim = isFinite(w) ? Math.max(w, h) : 4000;
        // fov=40, factor 0.9 for an even closer "zoom to fit"
        const autoDist = (maxDim / 2) / Math.tan(20 * Math.PI / 180) * 0.9;

        // PARITY: Detect track winding direction (CW vs CCW)
        let windingSum = 0;
        for (let i = 0; i < pts.length; i++) {
            const p1 = pts[i];
            const p2 = pts[(i + 1) % pts.length];
            if (!isNaN(p1.x) && !isNaN(p1.y) && !isNaN(p2.x) && !isNaN(p2.y)) {
                windingSum += (p2.x - p1.x) * (p2.y + p1.y);
            }
        }

        return {
            x: isFinite(minX) ? (minX + maxX) / 2 : 0,
            y: isFinite(minY) ? (minY + maxY) / 2 : 0,
            dist: isFinite(autoDist) ? Math.max(600, autoDist) : 8000,
            isClockwise: windingSum > 0
        };
    }, [track3DData, staticTrackBaseData]);

    const pcaRotation = useMemo(() => {
        const targetData = staticTrackBaseData || track3DData;
        if (!targetData?.baseMap || targetData.baseMap.length < 10) return 0;
        const pts = targetData.baseMap;
        let cxx = 0, cyy = 0, cxy = 0;

        // Use the pre-calculated centerX, centerY for rotation around its middle
        const cx = trackCenterOffset.x;
        const cy = trackCenterOffset.y;

        pts.forEach(p => {
            if (!isNaN(p.x) && !isNaN(p.y)) {
                const dx = p.x - cx;
                const dy = p.y - cy;
                cxx += dx * dx; cyy += dy * dy; cxy += dx * dy;
            }
        });

        const lambda1 = (cxx + cyy) / 2 + Math.sqrt(Math.pow((cxx - cyy) / 2, 2) + cxy * cxy);
        let angleRad = 0;
        if (Math.abs(cxy) > 1e-6) angleRad = Math.atan2(lambda1 - cxx, cxy);
        else angleRad = cxx > cyy ? 0 : Math.PI / 2;

        if (isNaN(angleRad)) return 0;
        // Flip 180 degrees as requested
        return -angleRad + Math.PI;
    }, [track3DData, staticTrackBaseData, trackCenterOffset]);

    const resetView = useCallback(() => {
        // Trigger reset signal globally
        setResetKey(prev => prev + 1);
        setZScale(1.0);
    }, [setZScale]);

    const unifiedCenter = useMemo(() => {
        return staticTrackBaseData?.center || track3DData?.center;
    }, [staticTrackBaseData, track3DData]);

    // DERIVE Racing Line points from API (Preferred) or local fusion (Fallback)
    const fusedRacingLinePoints = useMemo(() => {
        // COORDINATE ANCHOR: Use the height-corrected points from the API if available
        if (track3DData?.racingLine && track3DData.racingLine.length > 0 && track3DData.center && unifiedCenter) {
            const sourceCenter = track3DData.center;
            if (sourceCenter.lat !== unifiedCenter.lat || sourceCenter.lon !== unifiedCenter.lon) {
                const degM = 111320;
                const dx = (sourceCenter.lon - unifiedCenter.lon) * unifiedCenter.lonScale * degM;
                const dy = (sourceCenter.lat - unifiedCenter.lat) * degM;
                return track3DData.racingLine.map(p => ({
                    ...p,
                    x: p.x + dx,
                    y: p.y + dy
                }));
            }
            return track3DData.racingLine;
        }

        if (!telemetryData || !selectedLapIdx || !laps || !unifiedCenter) return null;
        const lap = laps.find(l => l.lap === selectedLapIdx);
        if (!lap) return null;

        const times = telemetryData['Time'];
        const lats = telemetryData['GPS Latitude'];
        const lons = telemetryData['GPS Longitude'];
        const alts = telemetryData['WorldPosZ'];

        const end_time = (lap as any).endTime || (lap as any).lap_end_time;
        const startIdx = times.findIndex(t => t >= lap.startTime);
        const endIdx = times.findIndex(t => t > end_time);
        const eIdx = endIdx === -1 ? times.length - 1 : endIdx;

        const pts = [];
        const step = Math.max(1, Math.floor((eIdx - startIdx) / 4000));
        const degM = 111320;

        for (let i = startIdx; i <= eIdx; i += step) {
            const x = (lons[i] - unifiedCenter.lon) * unifiedCenter.lonScale * degM;
            const y = (lats[i] - unifiedCenter.lat) * degM;
            pts.push({
                x, y,
                z: alts ? alts[i] : 0
            });
        }
        return pts;
    }, [telemetryData, selectedLapIdx, laps, track3DData, unifiedCenter]);

    const fusedReferenceRacingLinePoints = useMemo(() => {
        if (referenceTrack3DData?.racingLine && referenceTrack3DData.racingLine.length > 0 && referenceTrack3DData.center && unifiedCenter) {
            const sourceCenter = referenceTrack3DData.center;
            if (sourceCenter.lat !== unifiedCenter.lat || sourceCenter.lon !== unifiedCenter.lon) {
                const degM = 111320;
                const dx = (sourceCenter.lon - unifiedCenter.lon) * unifiedCenter.lonScale * degM;
                const dy = (sourceCenter.lat - unifiedCenter.lat) * degM;
                return referenceTrack3DData.racingLine.map(p => ({
                    ...p,
                    x: p.x + dx,
                    y: p.y + dy
                }));
            }
            return referenceTrack3DData.racingLine;
        }

        if (!referenceTelemetryData || !referenceLap || !unifiedCenter) return null;

        const times = referenceTelemetryData['Time'];
        const lats = referenceTelemetryData['GPS Latitude'];
        const lons = referenceTelemetryData['GPS Longitude'];
        const alts = referenceTelemetryData['WorldPosZ'];

        const ref_end_time = (referenceLap as any).endTime || (referenceLap as any).lap_end_time;
        const startIdx = times.findIndex(t => t >= (referenceLap as any).startTime);
        const endIdx = times.findIndex(t => t > ref_end_time);
        const eIdx = endIdx === -1 ? times.length - 1 : endIdx;

        const pts = [];
        const step = Math.max(1, Math.floor((eIdx - startIdx) / 4000));
        const degM = 111320;

        for (let i = startIdx; i <= eIdx; i += step) {
            const x = (lons[i] - unifiedCenter.lon) * unifiedCenter.lonScale * degM;
            const y = (lats[i] - unifiedCenter.lat) * degM;
            pts.push({
                x, y,
                z: alts ? alts[i] : 0
            });
        }
        return pts;
    }, [referenceTelemetryData, referenceLap, referenceTrack3DData, unifiedCenter]);

    useEffect(() => {
        if (selectedLapIdx !== null) {
            // 3D SYNC GUARD: If store is already loading, it means a proactive fetch was started by a store action.
            // Component-level fetch is now only a fallback for unexpected state mismatches.
            const currentState = useTelemetryStore.getState();
            if (currentState.isLoading) {
                console.log("3D: Skipping redundant component-level fetch (Store is already loading)");
                return;
            }

            // INTERCEPTION LOGIC: Skip fetching for invalid single-lap last stints
            const stintsList = Array.from(new Set(laps.map(l => l.stint || 1))).sort((a, b) => a - b);
            const isLastStint = stintsList.length > 0 && selectedStint === stintsList[stintsList.length - 1];

            const currentStintLaps = laps.filter(l => (l.stint || 1) === (selectedStint || 1));
            const isOnlyLap = currentStintLaps.length === 1;

            const selectedLap = laps.find(l => l.lap === selectedLapIdx && (l.stint || 1) === (selectedStint || 1));
            const isIncomplete = selectedLap && (!selectedLap.isValid || (selectedLap.duration > 0 && selectedLap.duration < 5.0));

            if (isLastStint && isOnlyLap && isIncomplete) {
                console.log("3D: Intercepted auto-fetch for N/A session end.");
                // We DON'T fetch, and we clear any previous data to avoid offsets
                useTelemetryStore.setState({ track3DData: null });
                return;
            }

            fetch3DTrack(selectedLapIdx, selectedStint);
        }
    }, [selectedLapIdx, selectedStint, fetch3DTrack, laps]);

    // NEW: Initialization check for session-wide static base data if missing
    useEffect(() => {
        if (!staticTrackBaseData && currentSessionId && selectedLapIdx !== null) {
            console.log("3D: Static base data missing, re-fetching...");
            fetch3DTrack(selectedLapIdx, selectedStint);
        }
    }, [staticTrackBaseData, currentSessionId, selectedLapIdx]);

    // Handle Reference Lap 3D fetching
    useEffect(() => {
        if (referenceLapIdx !== null || referenceLap) {
            const currentState = useTelemetryStore.getState();
            if (currentState.isLoading) return; // Prevent redundant load if selectReferenceLap already started it

            if (referenceLapIdx !== null) {
                fetchReference3DTrack(referenceLapIdx, null);
            } else if (referenceLap) {
                fetchReference3DTrack(referenceLap.lap, referenceLap.stint);
            }
        } else {
            useTelemetryStore.setState({ referenceTrack3DData: null });
        }
    }, [referenceLapIdx, referenceLap, fetchReference3DTrack]);

    useEffect(() => {
        if (staticTrackBaseData || track3DData) {
            // Force camera reset on any track data change or lap selection
            resetView();
        }
    }, [track3DData, staticTrackBaseData, trackCenterOffset]);

    const carStats = useMemo(() => {
        if (!telemetryData || cursorIndex === null) return { alt: null, dist: null };
        const idx = Math.floor(isPlaying ? (smoothCursorIndex ?? cursorIndex) : cursorIndex);

        let alt = null;
        if (telemetryData['WorldPosZ'] && telemetryData['WorldPosZ'][idx] !== undefined) {
            alt = telemetryData['WorldPosZ'][idx];
        }

        let dist = null;
        if (telemetryData['Lap Dist'] && telemetryData['Lap Dist'][idx] !== undefined) {
            dist = telemetryData['Lap Dist'][idx];
        } else if (telemetryData['Distance'] && telemetryData['Distance'][idx] !== undefined) {
            dist = telemetryData['Distance'][idx];
        }

        return { alt, dist };
    }, [telemetryData, cursorIndex, smoothCursorIndex, isPlaying]);

    if (!staticTrackBaseData && !track3DData) return null; // Let global loader handle this via store.isLoading

    return (
        <div
            className="relative h-full w-full rounded-2xl group glass-container-flat glass-expand-pixel min-h-0"
            onMouseMove={handleGlassMouseMove}
        >
            {/* Fills the 5px expansion gap when hovered out with the 3D map's identical dark carbon background */}
            <div className="glass-sync-bg bg-[#181a1d] rounded-2xl z-0" />

            <div className="glass-content relative h-full w-full z-10 overflow-hidden rounded-2xl">

                {/* Title & Z-Scale Overlay */}
                <div className="absolute top-5 left-5 z-[200] flex items-center gap-6 pointer-events-auto">
                    <h3 className="text-gray-500 text-[12px] font-black uppercase tracking-[0.2em] drop-shadow-md transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] cursor-default">
                        3D Track Map
                    </h3>

                    {/* Z-Scale Horizontal Slider (Integrated next to title) */}
                    <div className="flex items-center gap-3 pl-4 border-l border-white/10 h-4" onMouseDown={(e) => e.stopPropagation()}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Z Scale</span>
                        <div className="relative flex items-center h-4">
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.05"
                                value={zScale}
                                onChange={(e) => setZScale(parseFloat(e.target.value))}
                                className="w-16 accent-blue-500 bg-white/10 h-1.5 rounded-full appearance-none outline-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 ${(zScale / 2) * 100}%, rgba(255,255,255,0.05) ${(zScale / 2) * 100}%)`
                                }}
                            />
                        </div>
                        <span className="text-[10px] font-mono font-black text-blue-400 w-6 opacity-80">{zScale.toFixed(1)}x</span>
                    </div>
                </div>

                {/* HUD: Top Center Telemetry (Refined Alignment) */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto flex flex-col items-center gap-3">
                    <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center shadow-2xl glass-container overflow-hidden"
                        onMouseMove={handleGlassMouseMove}>
                        <div className="glass-content px-6 py-2.5 flex items-center gap-5">
                            <div className="flex items-baseline gap-2">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Alt</span>
                                <span className="text-[18px] font-black text-white tabular-nums tracking-tighter leading-none">
                                    {carStats.alt !== null ? carStats.alt.toFixed(1) : "--"}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">m</span>
                            </div>
                            <div className="w-px h-5 bg-white/20" />
                            <div className="flex items-baseline gap-2">
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Dist</span>
                                <span className="text-[18px] font-black text-blue-400 tabular-nums tracking-tighter leading-none">
                                    {carStats.dist !== null ? (carStats.dist / 1000).toFixed(2) : "--.--"}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">km</span>
                            </div>
                        </div>
                    </div>

                    {/* Maximized Dimension Toggle */}
                    {isMapMaximized && (
                        <MaximizedDimensionToggle />
                    )}
                </div>

                {/* HUD: Minimap (Top Right) - Fixed 5:3 Smaller */}
                <div className={`absolute top-4 right-4 z-[100] w-48 aspect-[5/3] transition-all duration-500 transform ${showMiniMap ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'}`}>
                    <div className="w-full h-full glass-container rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative transition-all duration-300 pointer-events-auto"
                        onMouseMove={handleGlassMouseMove}>
                        <div className="glass-content w-full h-full">
                            <TrackMap isMiniMap={true} />
                        </div>
                    </div>
                </div>

                {/* HUD OVERLAYS - MOVED TO END OF DOM */}

                {/* Reset HUD Button - Top Left */}
                <div className={`absolute top-4 left-4 z-[3000] transition-all duration-300 ease-out transform ${editHudMode ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
                    <button
                        onClick={resetHudConfigs}
                        className="flex items-center justify-center gap-2 w-40 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all animate-in fade-in slide-in-from-left-4 duration-300 pointer-events-auto"
                    >
                        <RotateCcw size={14} />
                        Reset HUD
                    </button>
                </div>

                {/* Floating Playback Controls (UNIFIED WITH 2D) */}
                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[1100] w-full pointer-events-none transition-all duration-500 transform origin-bottom scale-[0.85] group-hover:scale-100`}>
                    {/* Controls Bar - Centered with focus-driven opacity fade */}
                    <div className="max-w-4xl mx-auto px-8 transition-opacity duration-300 opacity-40 group-hover:opacity-100">
                        <div className="bg-black/60 px-6 py-2.5 rounded-full border border-white/10 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] glass-container w-full pointer-events-auto"
                            onMouseMove={handleGlassMouseMove}>
                            <div className="glass-content flex items-center w-full gap-4 h-10">
                                {/* Left: Playback Controls */}
                                <div className="flex items-center gap-2">
                                    <Tooltip text={isPlaying ? "PAUSE" : "PLAY"} position="top">
                                        <button
                                            onClick={togglePlayback}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${isPlaying ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                                        >
                                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-0.5" fill="currentColor" />}
                                        </button>
                                    </Tooltip>

                                    <div className="relative" ref={speedMenuRef}>
                                        <Tooltip text="SPEED" position="top">
                                            <button
                                                onClick={() => setIsSpeedOpen(!isSpeedOpen)}
                                                className={`h-7 px-3 min-w-[56px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-center group/speed ${isSpeedOpen ? 'text-blue-400 bg-white/10 border-white/20' : 'text-slate-500 hover:text-white'}`}
                                            >
                                                <span className={`text-[10px] font-black ${playbackSpeed !== 1 ? 'text-blue-400' : ''}`}>{playbackSpeed}x</span>
                                            </button>
                                        </Tooltip>

                                        <div
                                            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-16 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom ${isSpeedOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}
                                        >
                                            <div className="flex flex-col gap-1 p-1 bg-[#1a1a1e]/90 glass-container rounded-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                                                onMouseMove={handleGlassMouseMove}>
                                                <div className="glass-content w-full h-full flex flex-col">
                                                    {[4, 2, 1, 0.5].map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => { setPlaybackSpeed(s); setIsSpeedOpen(false); }}
                                                            className={`px-2 py-1.5 text-[10px] font-bold transition-all text-center rounded-lg ${playbackSpeed === s ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'} hover:scale-110 active:scale-90 z-10`}
                                                        >
                                                            {s}x
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Center: Timestamp & Progress (UNIFIED) */}
                                <div className="flex-1 flex items-center gap-2.5">
                                    <span className="text-[12px] font-mono text-blue-400 font-bold tracking-tighter drop-shadow-[0_0_8px_rgba(59,130,246,0.3)] select-none">
                                        {playbackProgress.currentTime}
                                    </span>
                                    <div className="relative flex-1 h-6 flex items-center group/timeline">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.0001"
                                            value={playbackProgress.progress}
                                            onChange={(e) => setPlaybackProgress(parseFloat(e.target.value))}
                                            className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer scale-y-75 group-hover/timeline:scale-y-125 transition-all outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0"
                                            style={{
                                                background: `linear-gradient(to right, #3b82f6 ${playbackProgress.progress * 100}%, rgba(255,255,255,0.02) ${playbackProgress.progress * 100}%)`
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="h-6 w-px bg-white/10 mx-1" />

                                {/* Right: Feature Icons */}
                                <div className="flex items-center gap-2">
                                    <Tooltip text={showMiniMap ? "HIDE MINIMAP" : "SHOW MINIMAP"} position="top">
                                        <button
                                            onClick={() => setShowMiniMap(!showMiniMap)}
                                            className={`p-2 rounded-full transition-all ${showMiniMap ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <MapIcon size={18} />
                                        </button>
                                    </Tooltip>

                                    <div className="relative" ref={hudMenuRef}>
                                        <Tooltip text={isMapMaximized ? "HUD SETUP" : "OVERLAP"} position="top">
                                            <button
                                                onClick={() => {
                                                    if (isMapMaximized) setShowHudMenu(!showHudMenu);
                                                    else setShowTelemetryOverlay(!showTelemetryOverlay);
                                                }}
                                                className={`h-7 px-2.5 rounded-lg transition-all border flex items-center gap-1.5 active:scale-95 ${showTelemetryOverlay ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'text-slate-500 hover:text-white bg-white/5 border-white/5 hover:bg-white/10'}`}
                                            >
                                                <Activity size={16} />
                                                {isMapMaximized && (
                                                    <ChevronDown size={12} className={`transition-transform duration-300 ${showHudMenu ? 'rotate-180' : ''}`} />
                                                )}
                                            </button>
                                        </Tooltip>

                                        {/* HUD Selection Dropdown (Fullscreen Only) */}
                                        <div
                                            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-40 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom z-[1100] ${isMapMaximized && showHudMenu ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}`}
                                        >
                                            <div className="flex flex-col gap-1 p-1 bg-[#1a1a1e]/90 glass-container rounded-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                                                onMouseMove={handleGlassMouseMove}>
                                                <div className="glass-content w-full h-full flex flex-col gap-0.5">
                                                    {/* 1. Primary HUD (Draggable) */}
                                                    <button
                                                        onClick={() => setHudVisibility('overlap', !hudVisibility.overlap)}
                                                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all border hover:scale-105 active:scale-90 group ${hudVisibility.overlap ?
                                                            'bg-blue-600/30 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' :
                                                            'text-slate-500 border-transparent hover:bg-white/5 hover:text-white'
                                                            }`}
                                                    >
                                                        <span className="text-[11px] font-bold">Telemetry Overlap</span>
                                                    </button>

                                                    {/* Divider */}
                                                    <div className="mx-2 my-1 border-t border-white/10" />

                                                    {/* 2. Sidebar HUDs (Fixed) */}
                                                    {[
                                                        { id: 'trackInfo', label: 'Track Info', active: true },
                                                        { id: 'vehicleInfo', label: 'Car Info', active: true },
                                                        { id: 'analysisLaps', label: 'Analysis Laps', active: true },
                                                        { id: 'dataCharts', label: 'Data Charts', active: true },
                                                    ].map((item) => (
                                                        <button
                                                            key={item.id}
                                                            disabled={!item.active}
                                                            onClick={() => setHudVisibility(item.id as any, !hudVisibility[item.id as keyof typeof hudVisibility])}
                                                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all border hover:scale-105 active:scale-90 group ${!item.active ? 'opacity-20 cursor-not-allowed border-transparent' :
                                                                hudVisibility[item.id as keyof typeof hudVisibility] ?
                                                                    'bg-blue-600/30 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' :
                                                                    'text-slate-500 border-transparent hover:bg-white/5 hover:text-white'
                                                                }`}
                                                        >
                                                            <span className="text-[11px] font-bold">
                                                                {item.label}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Tooltip text="RESET VIEW" position="top">
                                        <button
                                            onClick={resetView}
                                            className="p-2 rounded-full text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            <RotateCcw size={18} />
                                        </button>
                                    </Tooltip>

                                    {/* View Mode Switcher Group */}
                                    <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5 mx-1">
                                        <Tooltip text="FREE VIEW" position="top">
                                            <button
                                                onClick={() => { if (viewMode === 'free') resetView(); else setViewMode('free'); }}
                                                className={`p-1.5 px-3 rounded-lg transition-all ${viewMode === 'free' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <ViewfinderIcon size={16} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="FOLLOW" position="top">
                                            <button
                                                onClick={() => { if (viewMode === 'follow') resetView(); else setViewMode('follow'); }}
                                                className={`p-1.5 px-3 rounded-lg transition-all ${viewMode === 'follow' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <FollowIcon size={16} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="HEADING UP" position="top">
                                            <button
                                                onClick={() => { if (viewMode === 'headingUp') resetView(); else setViewMode('headingUp'); }}
                                                className={`p-1.5 px-3 rounded-lg transition-all ${viewMode === 'headingUp' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <Navigation size={16} />
                                            </button>
                                        </Tooltip>
                                    </div>

                                    <div className="h-6 w-px bg-white/10 mx-1" />


                                    <Tooltip text={isMapMaximized ? "RESTORE" : "MAXIMIZE"} position="top">
                                        <button
                                            onClick={() => setIsMapMaximized(!isMapMaximized)}
                                            className={`p-2 rounded-full transition-all ${isMapMaximized ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {isMapMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Canvas camera={{ position: [0, -4000, 2500], up: [0, 0, 1], fov: 40, near: 1, far: 200000 }}>
                    <color attach="background" args={['#181a1d']} />
                    <ambientLight intensity={1.2} />
                    <pointLight position={[0, 0, 10000]} intensity={0.5} />
                    <Suspense fallback={null}>
                        <CameraController
                            viewMode={viewMode}
                            telemetryData={telemetryData}
                            cursorIndex={cursorIndex}
                            smoothCursorIndex={smoothCursorIndex}
                            isPlaying={isPlaying}
                            center={unifiedCenter}
                            zScale={zScale}
                            zBase={track3DData?.zBase || 0}
                            trackPoints={fusedRacingLinePoints || track3DData?.baseMap}
                            trackCenterOffset={trackCenterOffset}
                            pcaRotation={isNaN(pcaRotation) ? 0 : pcaRotation}
                            resetKey={resetKey}
                        />
                        <group rotation={[0, 0, isNaN(pcaRotation) ? 0 : pcaRotation]}>
                            <group position={[-trackCenterOffset.x, -trackCenterOffset.y, 0]}>
                                {staticTrackBaseData && (
                                    <TrackSurface
                                        points={staticTrackBaseData.baseMap}
                                        center={staticTrackBaseData.center}
                                        zScale={zScale}
                                        onHover={(p, pos) => {
                                            setHoverInfo({ p, pos });
                                            setIsHovering(true);
                                        }}
                                        onHoverOut={() => setIsHovering(false)}
                                    />
                                )}
                                {fusedRacingLinePoints && (
                                    <RacingLine
                                        points={fusedRacingLinePoints}
                                        center={unifiedCenter}
                                        zScale={zScale}
                                    />
                                )}
                                {fusedReferenceRacingLinePoints && (
                                    <RacingLine points={fusedReferenceRacingLinePoints} center={unifiedCenter} zScale={zScale} isReference />
                                )}


                                <Car
                                    telemetryData={telemetryData}
                                    cursorIndex={cursorIndex}
                                    smoothCursorIndex={smoothCursorIndex}
                                    isPlaying={isPlaying}
                                    center={unifiedCenter}
                                    zScale={zScale}
                                    zBase={track3DData?.zBase || 0}
                                    trackPoints={fusedRacingLinePoints || track3DData?.baseMap}
                                />
                                {/* Ghost/Reference Car */}
                                {referenceTrack3DData && (
                                    <Car
                                        telemetryData={referenceTelemetryData || telemetryData}
                                        cursorIndex={referenceCursorIndex}
                                        isPlaying={isPlaying}
                                        center={unifiedCenter}
                                        zScale={zScale}
                                        zBase={referenceTrack3DData.zBase || 0}
                                        trackPoints={fusedReferenceRacingLinePoints || referenceTrack3DData.baseMap}
                                        isReference
                                    />
                                )}
                            </group>



                            <gridHelper args={[20000, 40, '#333335', '#222225']} rotation={[Math.PI / 2, 0, 0]} />
                        </group>
                    </Suspense>
                    <OrbitControls
                        ref={controlsRef}
                        makeDefault
                        maxPolarAngle={Math.PI / 2}
                        dampingFactor={0.05}
                        target={[0, 0, 0]}
                        enablePan={viewMode === 'free'}
                        enableRotate={true}
                    />
                </Canvas>

                {/* 1. Telemetry Overlap HUD */}
                <div
                    className={`absolute inset-0 pointer-events-none transition-all duration-500 transform z-[150] ${(isMapMaximized ? hudVisibility.overlap : showTelemetryOverlay)
                        ? 'opacity-100 scale-100 translate-y-0'
                        : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
                        }`}
                >
                    <CompactTelemetryOverlay
                        data={telemetryData}
                        cursorIndex={smoothCursorIndex}
                        theme="current"
                        carModel={sessionMetadata?.modelName}
                        isMiniMap={false}
                    />

                    {(referenceTelemetryData || referenceLapIdx !== null) && (
                        <CompactTelemetryOverlay
                            data={referenceTelemetryData || telemetryData}
                            cursorIndex={dashboardSyncMode === 'distance' ? referenceDeltaIndex : referenceCursorIndex}
                            theme="reference"
                            carModel={referenceSessionMetadata?.modelName || sessionMetadata?.modelName}
                            isMiniMap={false}
                        />
                    )}
                </div>

                {/* 2. Smart Sidebar */}
                {isMapMaximized && (
                    <div className={`absolute top-12 left-4 z-[200] w-[320px] flex flex-col gap-0 ${maximizedSidebarMode === 'data_sources' ? 'bottom-4' : 'pointer-events-none'}`}>
                        <AnimatePresence mode="popLayout">
                            {maximizedSidebarMode === 'data_sources' ? (
                                <motion.div
                                    key="data-sources-panel"
                                    initial={{ opacity: 0, x: -40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -40 }}
                                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                                    className="pointer-events-auto flex flex-col gap-2 h-full w-full"
                                >
                                    <div className="flex-1 flex flex-col overflow-hidden rounded-2xl glass-container-static">
                                        <FileManager />
                                    </div>
                                    <button
                                        onClick={() => setMaximizedSidebarMode('hud')}
                                        className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg backdrop-blur-md"
                                    >
                                        Return to Active Session
                                    </button>
                                </motion.div>
                            ) : (
                                <>
                                    {hudVisibility.trackInfo && sessionMetadata && (
                                        <motion.div
                                            key="track-info-3d"
                                            layout
                                            initial={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 12, scale: 1 }}
                                            exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 120,
                                                damping: 20,
                                                layout: { duration: 0.4 },
                                                opacity: { duration: 0.3 }
                                            }}
                                            className="origin-left pointer-events-auto"
                                        >
                                            <TrackInfoOverlay
                                                sessionMetadata={sessionMetadata}
                                                referenceMetadata={referenceSessionMetadata}
                                            />
                                        </motion.div>
                                    )}

                                    {hudVisibility.vehicleInfo && sessionMetadata && (
                                        <motion.div
                                            key="vehicle-info-3d"
                                            layout
                                            initial={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 12, scale: 1 }}
                                            exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 120,
                                                damping: 20,
                                                layout: { duration: 0.4 },
                                                opacity: { duration: 0.3 }
                                            }}
                                            className="origin-left pointer-events-auto"
                                        >
                                            <CarInfoOverlay
                                                sessionMetadata={sessionMetadata}
                                                referenceMetadata={referenceSessionMetadata}
                                            />
                                        </motion.div>
                                    )}

                                    {hudVisibility.analysisLaps && (
                                        <motion.div
                                            key="analysis-laps-3d"
                                            layout
                                            initial={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, x: 0, height: 'auto', marginBottom: 12, scale: 1 }}
                                            exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, scale: 0.9 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 120,
                                                damping: 20,
                                                layout: { duration: 0.4 },
                                                opacity: { duration: 0.3 }
                                            }}
                                            className="origin-left pointer-events-auto"
                                        >
                                            <LapsSelectorOverlay />
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* 3. Data Charts (Right Sidebar) */}
                <AnimatePresence>
                    {isMapMaximized && hudVisibility.dataCharts && (
                        <motion.div
                            key="data-charts-sidebar-3d"
                            initial={{ opacity: 0, x: 40, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 40, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                            className="absolute top-[170px] bottom-4 right-[-12px] z-[2000] pointer-events-none flex flex-col justify-end"
                        >
                            <DataChartsOverlay />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
