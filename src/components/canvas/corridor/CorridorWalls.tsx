import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSafeTexture } from '../../../utils/safeTextureLoader';

const WALL_X_OUTER = 3.5;
const WALL_X_INNER = 1.7;

interface DoorWallSegmentProps {
    position: [number, number, number];
    baseRotationY: number;
    width: number;
    corridorHeight: number;
    wallTexture: THREE.Texture;
    side: 'left' | 'right';
}

interface CorridorDoorPosition {
    relativeZ: number;
    side: 'left' | 'right';
}

interface WallSegment {
    type: 'filler' | 'door' | 'connector';
    position: [number, number, number];
    rotation?: [number, number, number];
    rotationY?: number;
    width: number;
    isLeft?: boolean;
    trimHighZ?: boolean;
    trimLowZ?: boolean;
    side?: 'left' | 'right';
}

interface CorridorWallsProps {
    zStart?: number;
    length?: number;
    doorPositions?: CorridorDoorPosition[];
    zClip?: number;
}

const DoorWallSegment = ({ position, baseRotationY, width, corridorHeight, wallTexture, side }: DoorWallSegmentProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();

    const currentTilt = useRef(0);

    const BASE_TILT = 0.02;
    const MAX_TILT = 0.20;
    const TILT_START = 12;
    const TILT_PEAK = 2;

    useFrame(() => {
        if (!meshRef.current) return;

        const distance = Math.abs(camera.position.z - position[2]);
        let targetTilt = BASE_TILT;

        if (distance < TILT_START && distance > TILT_PEAK) {
            const t = (TILT_START - distance) / (TILT_START - TILT_PEAK);
            const easedT = t * (2 - t);
            targetTilt = BASE_TILT + (MAX_TILT - BASE_TILT) * easedT;
        } else if (distance <= TILT_PEAK) {
            targetTilt = MAX_TILT;
        }

        currentTilt.current = THREE.MathUtils.lerp(currentTilt.current, targetTilt, 0.06);

        const tiltDirection = side === 'left' ? -1 : 1;
        meshRef.current.rotation.y = baseRotationY + (currentTilt.current * tiltDirection);
    });

    const segTexture = useMemo(() => {
        const tex = wallTexture.clone();
        tex.needsUpdate = true;
        tex.repeat.set(width / 2, corridorHeight / 2);
        return tex;
    }, [wallTexture, width, corridorHeight]);

    return (
        <mesh ref={meshRef} position={position}>
            <planeGeometry args={[width, corridorHeight]} />
            <meshBasicMaterial color="#e0e0e0" map={segTexture} />
        </mesh>
    );
};

const CorridorWalls = ({ zStart = 10, length = 80, doorPositions = [], zClip = 100000 }: CorridorWallsProps) => {
    const corridorHeight = 3.5;

    const floorTexture = useSafeTexture('/textures/corridor/kawalekpodlogi.webp');
    floorTexture.wrapS = floorTexture.wrapT = THREE.ClampToEdgeWrapping;

    const baseboardTexture = useSafeTexture('/textures/corridor/texturadoprogow.webp');
    baseboardTexture.wrapS = baseboardTexture.wrapT = THREE.RepeatWrapping;
    baseboardTexture.colorSpace = THREE.SRGBColorSpace;

    const wallTexture = useSafeTexture('/textures/corridor/wall_texture.webp');
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;

    const ceilingTexture = useSafeTexture('/textures/corridor/ceiling_texture.webp');
    ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;

    const effectiveStart = Math.min(zStart, zClip);
    const effectiveLength = effectiveStart - (zStart - length);
    const zCenter = effectiveStart - effectiveLength / 2;

    if (effectiveLength <= 0) return null;

    const BASEBOARD_DOOR_MARGIN = 0.5;

    const generateWallSegments = (side: 'left' | 'right'): WallSegment[] => {
        const segments: WallSegment[] = [];
        const isLeft = side === 'left';
        const baseX = isLeft ? -WALL_X_OUTER : WALL_X_OUTER;
        const innerX = isLeft ? -WALL_X_INNER : WALL_X_INNER;

        let currentZ = effectiveStart;
        const endZ = effectiveStart - effectiveLength;

        const sideDoors = doorPositions
            .filter(d => d.side === side)
            .sort((a, b) => b.relativeZ - a.relativeZ);

        sideDoors.forEach(door => {
            const doorZ = zStart + door.relativeZ;
            const doorStartZ = doorZ + 2.0;
            const doorEndZ = doorZ - 2.0;

            if (doorStartZ > currentZ) return;
            if (doorEndZ < endZ) return;

            if (currentZ > doorStartZ) {
                const segLength = currentZ - doorStartZ;
                const segCenterZ = currentZ - segLength / 2;
                segments.push({
                    type: 'filler',
                    position: [baseX, 0, segCenterZ],
                    rotation: [0, isLeft ? Math.PI / 2 : -Math.PI / 2, 0],
                    width: segLength,
                    isLeft,
                    trimLowZ: true
                });
            }


            const dx = innerX - baseX;
            const dz = doorEndZ - doorStartZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dx, dz);
            const midX = (baseX + innerX) / 2;
            const midZ = (doorStartZ + doorEndZ) / 2;


            const baseRotation = -Math.atan2(dz, dx);
            const finalRotation = isLeft ? baseRotation : baseRotation + Math.PI;

            segments.push({
                type: 'door',
                position: [midX, 0, midZ],
                rotationY: finalRotation,
                width: dist,
                side: side
            });

            const connWidth = Math.abs(baseX - innerX);
            const connX = (innerX + baseX) / 2;

            segments.push({
                type: 'connector',
                position: [connX, 0, doorEndZ],
                rotation: [0, 0, 0],
                rotationY: Math.PI,
                width: connWidth
            });

            currentZ = doorEndZ;
        });

        if (currentZ > endZ) {
            const segLength = currentZ - endZ;
            const segCenterZ = currentZ - segLength / 2;
            segments.push({
                type: 'filler',
                position: [baseX, 0, segCenterZ],
                rotation: [0, isLeft ? Math.PI / 2 : -Math.PI / 2, 0],
                width: segLength,
                isLeft,
                trimHighZ: currentZ !== effectiveStart
            });
        }

        return segments;
    };

    const leftSegments = useMemo(() => generateWallSegments('left'), [effectiveStart, effectiveLength, doorPositions]);
    const rightSegments = useMemo(() => generateWallSegments('right'), [effectiveStart, effectiveLength, doorPositions]);

    return (
        <group>
            {(() => {
                const TILE_LENGTH = 10;
                const CENTER_WIDTH = 5;
                const SIDE_WIDTH = 1;
                const FLOOR_START_OFFSET = 2;

                const uvFraction = SIDE_WIDTH / CENTER_WIDTH;

                const leftSideTexture = floorTexture.clone();
                leftSideTexture.needsUpdate = true;
                leftSideTexture.repeat.set(1, uvFraction);
                leftSideTexture.offset.set(0, 0);

                const rightSideTexture = floorTexture.clone();
                rightSideTexture.needsUpdate = true;
                rightSideTexture.repeat.set(1, uvFraction);
                rightSideTexture.offset.set(0, 1 - uvFraction);

                const tiles = [];
                const floorY = -corridorHeight / 2;
                const segmentEndZ = effectiveStart - effectiveLength;

                const firstTileIndex = Math.floor(effectiveStart / TILE_LENGTH);
                let tileZ = firstTileIndex * TILE_LENGTH - TILE_LENGTH / 2 + FLOOR_START_OFFSET;

                while (tileZ + TILE_LENGTH / 2 > segmentEndZ) {
                    const globalTileIndex = Math.round(tileZ / TILE_LENGTH);
                    const isMirrored = Math.abs(globalTileIndex) % 2 === 1;

                    tiles.push(
                        <mesh
                            key={`floor-center-${tileZ.toFixed(1)}`}
                            position={[0, floorY, tileZ]}
                            rotation={[-Math.PI / 2, 0, Math.PI / 2 + (isMirrored ? Math.PI : 0)]}
                            scale={[isMirrored ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[TILE_LENGTH, CENTER_WIDTH]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={floorTexture}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    );

                    tiles.push(
                        <mesh
                            key={`floor-left-${tileZ.toFixed(1)}`}
                            position={[-(CENTER_WIDTH / 2 + SIDE_WIDTH / 2), floorY, tileZ]}
                            rotation={[-Math.PI / 2, 0, Math.PI / 2 + (isMirrored ? Math.PI : 0)]}
                            scale={[isMirrored ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[TILE_LENGTH, SIDE_WIDTH]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={leftSideTexture}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    );

                    tiles.push(
                        <mesh
                            key={`floor-right-${tileZ.toFixed(1)}`}
                            position={[(CENTER_WIDTH / 2 + SIDE_WIDTH / 2), floorY, tileZ]}
                            rotation={[-Math.PI / 2, 0, Math.PI / 2 + (isMirrored ? Math.PI : 0)]}
                            scale={[isMirrored ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[TILE_LENGTH, SIDE_WIDTH]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={rightSideTexture}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    );

                    tileZ -= TILE_LENGTH;
                }
                return tiles;
            })()}


            {(() => {
                const tileLength = 10;
                const tileWidth = 7;
                const tiles = [];
                const ceilingY = corridorHeight / 2;

                const segmentEndZ = effectiveStart - effectiveLength;

                const CEILING_START_OFFSET = 2;
                const firstTileIndex = Math.floor(effectiveStart / tileLength);
                let tileZ = firstTileIndex * tileLength - tileLength / 2 + CEILING_START_OFFSET;

                while (tileZ + tileLength / 2 > segmentEndZ) {
                    const globalTileIndex = Math.round(tileZ / tileLength);
                    const isMirrored = Math.abs(globalTileIndex) % 2 === 1;

                    tiles.push(
                        <mesh
                            key={`ceiling-tile-${tileZ.toFixed(1)}`}
                            position={[0, ceilingY, tileZ]}
                            rotation={[Math.PI / 2, 0, isMirrored ? Math.PI : 0]}
                            scale={[isMirrored ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[tileWidth, tileLength]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={ceilingTexture}
                                map-repeat={[tileWidth / 2, tileLength / 2]}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    );
                    tileZ -= tileLength;
                }
                return tiles;
            })()}

            {[...leftSegments, ...rightSegments]
                .filter(seg => seg.type === 'filler')
                .map((seg, i) => {
                    const segTexture = wallTexture.clone();
                    segTexture.needsUpdate = true;
                    segTexture.repeat.set(seg.width / 2, corridorHeight / 2);

                    const bbTexture = baseboardTexture.clone();
                    bbTexture.needsUpdate = true;
                    bbTexture.wrapS = bbTexture.wrapT = THREE.RepeatWrapping;
                    bbTexture.rotation = 0;
                    bbTexture.offset.set(0, 0);
                    const NATURAL_TILE_W = (1582 / 94) * 0.15;
                    bbTexture.repeat.set(seg.width / NATURAL_TILE_W, 1);

                    const bbMarginHighZ = seg.trimHighZ ? BASEBOARD_DOOR_MARGIN : 0;
                    const bbMarginLowZ = seg.trimLowZ ? BASEBOARD_DOOR_MARGIN : 0;
                    const bbWidth = seg.width - bbMarginHighZ - bbMarginLowZ;

                    let bbOffsetX;
                    if (seg.isLeft) {
                        bbOffsetX = (bbMarginLowZ - bbMarginHighZ) / 2;
                    } else {
                        bbOffsetX = (bbMarginHighZ - bbMarginLowZ) / 2;
                    }

                    return (
                        <group key={i} position={seg.position} rotation={seg.rotation || [0, seg.rotationY ?? 0, 0]}>
                            <mesh>
                                <planeGeometry args={[seg.width, corridorHeight]} />
                                <meshBasicMaterial color="#e0e0e0"
                                    map={segTexture}
                                />
                            </mesh>

                            <mesh position={[bbOffsetX, -corridorHeight / 2 + 0.075, 0.01]}>
                                <planeGeometry args={[bbWidth, 0.15]} />
                                <meshBasicMaterial color="#e0e0e0"
                                    map={bbTexture}
                                    side={THREE.DoubleSide}
                                />
                            </mesh>
                        </group>
                    );
                })}



        </group>
    );
};

export default CorridorWalls;
