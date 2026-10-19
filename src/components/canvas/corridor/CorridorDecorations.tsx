import { useMemo, useState, useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { RevealMaterial } from '../shaders/RevealMaterial';
import { isTouchDevice } from '../../../utils/deviceDetect';
import { useSafeTexture } from '../../../utils/safeTextureLoader';

const tempPos = new THREE.Vector3();
const tempRot = new THREE.Quaternion();
const tempScale = new THREE.Vector3();
const tempCamDir = new THREE.Vector3();
const tempEuler = new THREE.Euler();
const tempQuat = new THREE.Quaternion();


const CABIN_SKETCH_URL = '/fonts/CabinSketch-Regular.ttf';

interface FrameData {
    id: string;
    side: 'left' | 'right';
    y: number;
    z: number;
    width: number;
    height: number;
    offsetFromWall?: number;
    signature?: string;
    signatureX?: number;
    signatureY?: number;
    signatureSize?: number;
    signatureColor?: string;
}

interface InspectableFrameProps {
    frame: FrameData;
    wallX: number;
    frameTexture: THREE.Texture;
    framePaintedTexture: THREE.Texture;
    CABIN_SKETCH_URL: string;
    setCameraOverride?: (active: boolean) => void;
}

interface CorridorDecorationsProps {
    segmentLength: number;
    zOffset: number;
    corridorWidth?: number;
    corridorHeight?: number;
    zClip?: number;
    setCameraOverride?: (active: boolean) => void;
}

const InspectableFrame = ({ frame, wallX, frameTexture, framePaintedTexture, CABIN_SKETCH_URL, setCameraOverride }: InspectableFrameProps) => {
    const { camera, viewport } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const frameMaterialRef = useRef<RevealMaterial>(null);
    const framePaintedRef = useRef<THREE.Mesh>(null);
    const compileFramesRef = useRef(0);
    const hideDelayRef = useRef<gsap.core.Tween | null>(null);

    const originalPos = useMemo(() => new THREE.Vector3(
        frame.side === 'left' ? -wallX + (frame.offsetFromWall || 0) : wallX - (frame.offsetFromWall || 0),
        frame.y,
        frame.z
    ), [frame, wallX]);

    const originalRot = useMemo(() => new THREE.Euler(
        0, frame.side === 'left' ? Math.PI / 2 : -Math.PI / 2, 0
    ), [frame.side]);

    const [isHovered, setIsHovered] = useState(false);
    const [isInspected, setIsInspected] = useState(false);

    const isTouch = useMemo(() => isTouchDevice(), []);
    const isMobile = viewport.width < 5 || viewport.aspect < 0.8 || isTouch;

    useEffect(() => {
        return () => {
            if (isInspected) {
                if (setCameraOverride) setCameraOverride(false);
                window.dispatchEvent(new CustomEvent('inspectChange', { detail: false }));
            }
        };
    }, [isInspected, setCameraOverride]);

    useEffect(() => {
        if (isHovered && !isMobile) document.body.style.cursor = 'pointer';
        else document.body.style.cursor = 'auto';
    }, [isHovered, isMobile]);

    useEffect(() => {
        if (!frameMaterialRef.current) return;

        const shouldBePainted = isHovered || isInspected;

        if (shouldBePainted) {
            if (hideDelayRef.current) hideDelayRef.current.kill();
            if (framePaintedRef.current) framePaintedRef.current.visible = true;

            gsap.to(frameMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        } else {
            gsap.to(frameMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });

            hideDelayRef.current = gsap.delayedCall(0.55, () => {
                if (framePaintedRef.current) framePaintedRef.current.visible = false;
            });
        }

        return () => {
            if (hideDelayRef.current) hideDelayRef.current.kill();
        };
    }, [isHovered, isInspected]);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        if (compileFramesRef.current < 2) {
            compileFramesRef.current++;
            if (compileFramesRef.current === 2) {
                if (!isHovered && !isInspected && framePaintedRef.current) {
                    framePaintedRef.current.visible = false;
                }
            }
        }

        if (isInspected) {
            camera.getWorldDirection(tempCamDir);

            const baseDistance = 1.3;
            const aspectOffset = Math.max(0, 1.8 - viewport.aspect) * 1.5;
            const distance = Math.min(2.8, Math.max(1.5, baseDistance + aspectOffset));

            tempPos.copy(camera.position).add(tempCamDir.multiplyScalar(distance));

            tempRot.copy(camera.quaternion);

            const tiltX = -state.pointer.y * 0.3;
            const tiltY = state.pointer.x * 0.3;
            tempEuler.set(tiltX, tiltY, 0);
            tempQuat.setFromEuler(tempEuler);

            tempRot.multiply(tempQuat);

            tempScale.set(1.2, 1.2, 1.2);
        } else {
            tempPos.copy(originalPos);
            tempRot.setFromEuler(originalRot);
            tempScale.set(1, 1, 1);
        }

        const factor = delta * 6;
        groupRef.current.position.lerp(tempPos, factor);
        groupRef.current.quaternion.slerp(tempRot, factor);
        groupRef.current.scale.lerp(tempScale, factor);
    });

    return (
        <group
            ref={groupRef}
            position={originalPos}
            rotation={originalRot}
        >
            <mesh
                position={[0, 0, 0.05]}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsInspected((prev) => {
                        const next = !prev;
                        if (setCameraOverride) setCameraOverride(next);
                        window.dispatchEvent(new CustomEvent('inspectChange', { detail: next }));
                        return next;
                    });
                    setIsHovered(false);
                }}
                onPointerEnter={(e) => {
                    e.stopPropagation();
                    if (!isInspected && !isMobile) setIsHovered(true);
                }}
                onPointerLeave={(e) => {
                    e.stopPropagation();
                    setIsHovered(false);
                }}
            >
                <planeGeometry args={[frame.width, frame.height]} />
                <meshBasicMaterial color="#e0e0e0" transparent opacity={0} depthWrite={false} />
            </mesh>

            {!isTouch && (
                <mesh ref={framePaintedRef} position={[0, 0, -0.001]} scale={[0.98, 0.98, 1]}>
                    <planeGeometry args={[frame.width, frame.height]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={framePaintedTexture}
                        transparent={true}
                        alphaTest={0.5}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

            <mesh position={[0, 0, 0]}>
                <planeGeometry args={[frame.width, frame.height]} />
                <revealMaterial color="#e0e0e0"
                    ref={frameMaterialRef}
                    map={frameTexture}
                    transparent={true}
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                    uProgress={0.0}
                />
            </mesh>

            {frame.signature && (
                <Text
                    position={[
                        frame.signatureX !== undefined ? frame.signatureX : (frame.width / 2 - 0.1),
                        frame.signatureY !== undefined ? frame.signatureY : (-frame.height / 2 + 0.15),
                        0.02
                    ]}
                    fontSize={isMobile ? Math.min(frame.signatureSize || 0.12, 0.08) : (frame.signatureSize || 0.12)}
                    font={CABIN_SKETCH_URL}
                    color={frame.signatureColor || "#333333"}
                    anchorX="center"
                    anchorY="middle"
                >
                    {frame.signature}
                </Text>
            )}
        </group>
    );
};

const CorridorDecorations = ({ segmentLength, zOffset, corridorWidth = 4, corridorHeight = 3.5, zClip = 100000, setCameraOverride }: CorridorDecorationsProps) => {

    const wallX = corridorWidth / 2 - 0.01;
    const floorY = -corridorHeight / 2;
    const ceilingY = corridorHeight / 2;

    const frameTexture = useSafeTexture('/textures/corridor/ramkanazdjecieduza.webp');
    const framePaintedTexture = useSafeTexture('/textures/corridor/ramkanazdjecieduza_painted.webp');
    const standingFrameTexture = useSafeTexture('/textures/corridor/ramkanazdjeciemala.webp');
    const grateTexture = useSafeTexture('/textures/corridor/kratkawentylacyjna.webp');

    const lampGrilleTexture = useSafeTexture('/textures/corridor/kratanalampy.webp');

    const lampSideTexture = useSafeTexture('/textures/corridor/bokilampy.webp');
    lampSideTexture.wrapS = lampSideTexture.wrapT = THREE.RepeatWrapping;
    lampSideTexture.repeat.set(1, 1);

    const lights = useMemo(() => {
        const items = [];
        const LIGHT_SPACING = 15;
        const LIGHT_START_OFFSET = -5;

        const startZ = zOffset + LIGHT_START_OFFSET;
        const endZ = zOffset - segmentLength + 10;

        for (let z = startZ; z > endZ; z -= LIGHT_SPACING) {
            items.push({ z });
        }
        return items;
    }, [segmentLength, zOffset]);

    const frames = useMemo<FrameData[]>(() => [
        {
            z: zOffset - 40,
            side: 'right',
            width: 2.5,
            height: 2.5 / 1.785,
            y: 0.25,
            id: 'frame-3',
            signature: "Hi, I'm Elariz.\nI build modern websites and web apps.\nWelcome to my 3D portfolio!",
            signatureX: 0,
            signatureY: 0,
            signatureSize: 0.10,
            signatureColor: '#333333'
        },
        {
            z: zOffset - 55,
            side: 'left',
            width: 2.5,
            height: 2.5 / 1.785,
            y: 0.35,
            id: 'frame-4',
            signature: "Hi, I'm Elariz.\nI build modern websites and web apps.\nWelcome to my 3D portfolio!",
            signatureX: 0,
            signatureY: 0,
            signatureSize: 0.10,
            signatureColor: '#333333'
        },
    ], [zOffset]);

    const cabinetFrontTexture = useSafeTexture('/textures/corridor/szafkaprzod.webp');
    const cabinetRestTexture = useSafeTexture('/textures/corridor/szafkaprzodgora.webp');

    return (
        <group>
            {lights.filter(light => light.z <= zClip).map((light, i) => {
                lampGrilleTexture.wrapS = lampGrilleTexture.wrapT = THREE.ClampToEdgeWrapping;
                lampSideTexture.wrapS = lampSideTexture.wrapT = THREE.ClampToEdgeWrapping;

                return (
                    <group key={`light-${i}`} position={[0, ceilingY, light.z]}>
                        <mesh position={[0, -0.03, 0]}>
                            <boxGeometry args={[2.0, 0.06, 0.5]} />

                            <meshBasicMaterial attach="material-0" color="#e8e8e8" />
                            <meshBasicMaterial attach="material-1" color="#e8e8e8" />

                            <meshBasicMaterial attach="material-2" color="#d0d0d0" />

                            <meshBasicMaterial
                                attach="material-3"
                                map={lampGrilleTexture}
                                transparent={true}
                                alphaTest={0.1}
                                side={THREE.DoubleSide}
                                color="#e0e0e0"
                            />

                            <meshBasicMaterial color="#e0e0e0" attach="material-4" map={lampSideTexture} />
                            <meshBasicMaterial color="#e0e0e0" attach="material-5" map={lampSideTexture} />
                        </mesh>

                        <mesh
                            position={[0, -0.059, 0]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            <planeGeometry args={[1.9, 0.4]} />
                            <meshBasicMaterial
                                color="#ffffff"
                                toneMapped={false}
                                side={THREE.DoubleSide}
                            />
                        </mesh>

                    </group>
                );
            })}

            {frames.map((frame) => (
                <InspectableFrame
                    key={frame.id}
                    frame={frame}
                    wallX={wallX}
                    frameTexture={frameTexture}
                    framePaintedTexture={framePaintedTexture}
                    CABIN_SKETCH_URL={CABIN_SKETCH_URL}
                    setCameraOverride={setCameraOverride}
                />
            ))}

            <mesh
                position={[wallX - 0.26, floorY + 0.5, zOffset - 51]}
            >
                <boxGeometry args={[0.5, 1.0, 1.0 * 0.8]} />
                <meshBasicMaterial color="#e0e0e0" attach="material-0" map={cabinetRestTexture} />
                <meshBasicMaterial color="#e0e0e0" attach="material-1" map={cabinetFrontTexture} />
                <meshBasicMaterial color="#e0e0e0" attach="material-2" map={cabinetRestTexture} />
                <meshBasicMaterial color="#e0e0e0" attach="material-3" map={cabinetRestTexture} />
                <meshBasicMaterial color="#e0e0e0" attach="material-4" map={cabinetRestTexture} />
                <meshBasicMaterial color="#e0e0e0" attach="material-5" map={cabinetRestTexture} />
            </mesh>

            <mesh
                position={[wallX - 0.26, floorY + 1.0 + 0.2, zOffset - 51]}
                rotation={[0, -Math.PI / 2 + 0.2, 0]}
            >
                <planeGeometry args={[0.3, 0.3 / 0.777]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={standingFrameTexture}
                    transparent={true}
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {frames.map((frame, i) => {
                const isFrameLeft = frame.side === 'left';
                const grateSide = isFrameLeft ? 'right' : 'left';

                return (
                    <mesh
                        key={`grate-${i}`}
                        position={[
                            grateSide === 'left' ? -wallX + 0.01 : wallX - 0.01,
                            ceilingY - 0.6,
                            frame.z
                        ]}
                        rotation={[0, grateSide === 'left' ? Math.PI / 2 : -Math.PI / 2, 0]}
                    >
                        <planeGeometry args={[0.8, 0.8 / 1.968]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={grateTexture}
                            transparent={true}
                            alphaTest={0.1}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                );
            })}

        </group >
    );
};

export default CorridorDecorations;
