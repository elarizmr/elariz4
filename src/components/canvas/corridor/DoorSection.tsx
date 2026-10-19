import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import PositionalAudio from '../ConfiguredPositionalAudio';
import * as THREE from 'three';
import gsap from 'gsap';
import RoomInterior from './RoomInterior';
import '../shaders/RevealMaterial';
import { useScene } from '../../../context/SceneContext';
import { useAudio } from '../../../context/AudioManager';
import { useSafeTexture } from '../../../utils/safeTextureLoader';
import { isTouchDevice } from '../../../utils/deviceDetect';
import type { RoomId } from '../../../types';
import type { RevealMaterial } from '../shaders/RevealMaterial';

const WALL_X_OUTER = 3.5;
const WALL_X_INNER = 1.7;
const DOOR_Z_SPAN = 4;
const CORRIDOR_HEIGHT = 3.5;

const DOOR_AUDIO_SETTINGS = {
    hoverVolume: 0.8,
    openVolume: 0.2,
    closeVolume: 0.2,
    distance: 3,
    rolloff: 2,
    closeDelay: 0.5
};

const WALL_DX = WALL_X_OUTER - WALL_X_INNER;
const WALL_DZ = DOOR_Z_SPAN;
const WALL_LENGTH = Math.sqrt(WALL_DX * WALL_DX + WALL_DZ * WALL_DZ);
const BASE_WALL_ANGLE = Math.atan2(WALL_DX, WALL_DZ);

const DOOR_LOOK_ANGLE = Math.PI * 0.334;

const DOOR_ALIGN_X = 1.2;

const DOOR_TEXTURES: Record<string, string> = {
    'THE GALLERY': '/textures/corridor/doors/gallery-door.webp',
    'THE ABOUT': '/textures/corridor/doors/about-door.webp',
    "LET'S CONNECT": '/textures/corridor/doors/contact-door.webp',
};

const DOOR_PAINTED_TEXTURES: Record<string, string> = {
    'THE GALLERY': '/textures/corridor/doors/gallery-door_painted.webp',
    'THE ABOUT': '/textures/corridor/doors/about-door_painted.webp',
    "LET'S CONNECT": '/textures/corridor/doors/contact-door_painted.webp',
};


interface DoorSectionProps {
    position: [number, number, number];
    side?: 'left' | 'right';
    label: string;
    roomId?: RoomId;
    icon?: string;
    onEnter?: () => void;
    autoCloseDelay?: number;
    enterDistance?: number;
    setCameraOverride?: (enabled: boolean) => void;
    segmentIndex?: number;
}

const DoorSection = ({
    position,
    side = 'left',
    label,
    roomId,
    icon,
    onEnter,
    autoCloseDelay = 3000,
    enterDistance = 8,
    setCameraOverride,
    segmentIndex
}: DoorSectionProps) => {
    type DoorClickPayload = { stopPropagation?: () => void; isTeleport?: boolean };
    const groupRef = useRef<THREE.Group>(null);
    const doorRef = useRef<THREE.Group>(null);
    const handleRef = useRef<THREE.Group>(null);
    const doorMaterialRef = useRef<RevealMaterial>(null);
    const handleMaterialRef = useRef<RevealMaterial>(null);
    const handlePaintedRef = useRef<THREE.Mesh>(null);
    const doorPaintedRef = useRef<THREE.Mesh>(null);
    const handleHideDelayRef = useRef<gsap.core.Tween | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const isNearRef = useRef(false);
    const [isInsideRoom, setIsInsideRoom] = useState(false);
    const [isTiltLocked, setIsTiltLocked] = useState(false);
    const [shouldRenderRoom, setShouldRenderRoom] = useState(false);
    const [roomReady, setRoomReady] = useState(false);
    const { camera } = useThree();
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {
        currentRoom,
        exitRequested,
        clearExitRequest,
        exitRoom: contextExitRoom,
        enterRoom,
        pendingDoorClick,
        isTeleporting,
        isFastTeleport,
        signalRoomReady,
        teleportPhase
    } = useScene();

    const { globalVolume, isMuted } = useAudio();

    const hoverAudioRef = useRef<THREE.PositionalAudio>(null);
    const openAudioRef = useRef<THREE.PositionalAudio>(null);
    const closeAudioRef = useRef<THREE.PositionalAudio>(null);

    const doorId = useMemo(() => {
        if (roomId) return roomId;

        if (label === 'THE GALLERY') return 'gallery';
        if (label === 'THE ABOUT') return 'about';
        if (label === "LET'S CONNECT") return 'contact';
        return null;
    }, [label, roomId]);

    useEffect(() => {
        const isSegment0 = segmentIndex === 0;

        if (pendingDoorClick && pendingDoorClick === doorId && isSegment0 && !isOpen && !isAnimating) {
            handleClick({ stopPropagation: () => { }, isTeleport: true });
        }
    }, [pendingDoorClick, doorId, segmentIndex, isOpen, isAnimating]);

    useEffect(() => {
        if (isTeleporting && teleportPhase === 'teleporting' && isInsideRoom && currentRoom === doorId) {

            setIsOpen(false);
            setIsInsideRoom(false);
            setIsAnimating(false);
            setShouldRenderRoom(false);
            setIsTiltLocked(false);
            setRoomReady(false);
            roomReadyRef.current = false;

            if (doorRef.current) doorRef.current.rotation.y = 0;
            if (handleRef.current) handleRef.current.rotation.z = 0;


            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        }
    }, [isTeleporting, teleportPhase, isInsideRoom, currentRoom, doorId, label, setCameraOverride]);

    const savedCameraState = useRef({ x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0 });
    const doorAlignedState = useRef({ x: 0, y: 0, z: 0, rotationY: 0 });
    const roomEntryState = useRef({ x: 0, y: 0, z: 0, rotationY: 0 });

    const currentTilt = useRef(0);

    const originalWallTexture = useSafeTexture('/textures/corridor/wall_texture.webp');

    const wallTexture = useMemo(() => {
        const tex = originalWallTexture.clone();
        tex.needsUpdate = true;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

        tex.repeat.set(0.5, 0.5);

        tex.offset.set(0.5, 0.5);

        return tex;
    }, [originalWallTexture]);

    const doorTexturePath = DOOR_TEXTURES[label] || DOOR_TEXTURES['THE GALLERY'];
    const doorTexture = useSafeTexture(doorTexturePath);

    const isTouch = isTouchDevice();
    const dummyTex = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    const doorPaintedTexturePath = DOOR_PAINTED_TEXTURES[label] || DOOR_PAINTED_TEXTURES['THE GALLERY'];
    const doorPaintedTexture = useSafeTexture(isTouch ? dummyTex : doorPaintedTexturePath);
    const frameTexture = useSafeTexture('/textures/corridor/doors/ramkasingledoors.webp');
    const handleTexture = useSafeTexture('/textures/corridor/doors/klamkadodrzwi.webp');
    const handlePaintedTexture = useSafeTexture(isTouch ? dummyTex : '/textures/corridor/doors/klamkadodrzwi_painted.webp');
    const doorBackTexture = useSafeTexture('/textures/corridor/doors/backsingledoors.webp');
    const arrowTexture = useSafeTexture('/textures/corridor/strzalka.webp');

    const baseboardTexture = useSafeTexture('/textures/corridor/texturadoprogow.webp');
    baseboardTexture.wrapS = baseboardTexture.wrapT = THREE.RepeatWrapping;
    baseboardTexture.colorSpace = THREE.SRGBColorSpace;

    const doorBoardWidth = (WALL_LENGTH - 1.1) / 2;
    const NATURAL_TILE_W = (1582 / 94) * 0.15;
    const doorBbTexLeft = useMemo(() => {
        const tex = baseboardTexture.clone();
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.rotation = 0;
        tex.offset.set(0, 0);
        tex.needsUpdate = true;
        tex.repeat.set(doorBoardWidth / NATURAL_TILE_W, 1);
        return tex;
    }, [baseboardTexture]);

    const doorBbTexRight = useMemo(() => {
        const tex = baseboardTexture.clone();
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.rotation = 0;
        tex.offset.set(0, 0);
        tex.needsUpdate = true;
        tex.repeat.set(doorBoardWidth / NATURAL_TILE_W, 1);
        return tex;
    }, [baseboardTexture]);

    const doorRatio = 0.376;
    const doorHeight = 2.5;
    const doorWidth = doorHeight * doorRatio * 1.12;

    const frameHeight = 2.5;
    const frameWidth = frameHeight * 0.5;

    const holeWidth = doorWidth - 0.03;
    const holeHeight = doorHeight - 0.1;
    const holeOffsetY = -0.55;

    const wallWithHoleGeometry = useMemo(() => {
        const wallShape = new THREE.Shape();
        const halfW = WALL_LENGTH / 2;
        const halfH = CORRIDOR_HEIGHT / 2;

        wallShape.moveTo(-halfW, -halfH);
        wallShape.lineTo(halfW, -halfH);
        wallShape.lineTo(halfW, halfH);
        wallShape.lineTo(-halfW, halfH);
        wallShape.lineTo(-halfW, -halfH);

        const holePath = new THREE.Path();
        const holeHalfW = holeWidth / 2;
        const holeHalfH = holeHeight / 2;
        const holeY = holeOffsetY;

        holePath.moveTo(-holeHalfW, holeY - holeHalfH);
        holePath.lineTo(holeHalfW, holeY - holeHalfH);
        holePath.lineTo(holeHalfW, holeY + holeHalfH);
        holePath.lineTo(-holeHalfW, holeY + holeHalfH);
        holePath.lineTo(-holeHalfW, holeY + holeHalfH);
        holePath.lineTo(-holeHalfW, holeY - holeHalfH);

        wallShape.holes.push(holePath);

        return new THREE.ShapeGeometry(wallShape);
    }, [holeWidth, holeHeight, holeOffsetY]);

    const BASE_ROTATION = Math.PI / 2;
    const BASE_TILT = 0.02;
    const MAX_TILT = BASE_WALL_ANGLE + 0.1;
    const TILT_START = 15;
    const TILT_PEAK = 3;

    const pivotX = side === 'left' ? -WALL_X_OUTER : WALL_X_OUTER;

    const wallOffsetX = side === 'left'
        ? WALL_LENGTH / 2
        : -WALL_LENGTH / 2;

    const compileFramesRef = useRef(0);
    useFrame(() => {
        if (compileFramesRef.current < 2) {
            compileFramesRef.current++;
            if (compileFramesRef.current === 2) {
                if (!isHovered && !isOpen) {
                    if (doorPaintedRef.current) doorPaintedRef.current.visible = false;
                    if (handlePaintedRef.current) handlePaintedRef.current.visible = false;
                }
            }
        }

        if (!groupRef.current) return;

        let targetTilt = BASE_TILT;

        if (isTiltLocked) {
            targetTilt = MAX_TILT;
        } else {
            const distance = Math.abs(camera.position.z - position[2]);
            isNearRef.current = distance < 8;

            if (distance < TILT_START && distance > TILT_PEAK) {
                const t = (TILT_START - distance) / (TILT_START - TILT_PEAK);
                const easedT = t * (2 - t);
                targetTilt = BASE_TILT + (MAX_TILT - BASE_TILT) * easedT;
            } else if (distance <= TILT_PEAK) {
                targetTilt = MAX_TILT;
            }
        }

        currentTilt.current = THREE.MathUtils.lerp(currentTilt.current, targetTilt, 0.06);

        const baseDir = side === 'left' ? 1 : -1;
        const tiltDir = side === 'left' ? -1 : 1;

        const currentRotation = (BASE_ROTATION * baseDir) + (currentTilt.current * tiltDir);
        groupRef.current.rotation.y = currentRotation;


        const absSinAngle = Math.abs(Math.sin(currentRotation));

        let exactScale = 1.0;
        if (absSinAngle > 0.1) {
            exactScale = (DOOR_Z_SPAN - 0.01) / (WALL_LENGTH * absSinAngle);
        }

        const currentScale = THREE.MathUtils.clamp(exactScale, 0.8, 1.1);

        groupRef.current.scale.set(currentScale, 1, 1);
    });

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        };
    }, []);

    const handleClick = useCallback((e?: DoorClickPayload) => {
        e?.stopPropagation?.();
        const isTeleport = e?.isTeleport || false;
        if (isAnimating) return;

        if (isOpen) {
            closeDoor();
            return;
        }

        document.body.style.cursor = "auto";

        setIsAnimating(true);

        setCameraOverride?.(true);

        setIsTiltLocked(true);

        savedCameraState.current = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
            rotationX: camera.rotation.x,
            rotationY: camera.rotation.y,
            rotationZ: camera.rotation.z
        };

        // This prevents the camera from jumping back to the OLD room position on exit.
        if (e && e.isTeleport) {
            const corridorGlanceY = side === 'left' ? 0.15 : -0.15;

            savedCameraState.current = {
                x: 0,
                y: 0.2,
                z: position[2] + 4,
                rotationX: 0,
                rotationY: corridorGlanceY,
                rotationZ: 0
            };
        }

        const useFastMode = isTeleport && isFastTeleport;
        const alignDuration = useFastMode ? 0.01 : 1.0;

        const doorWorldPos = new THREE.Vector3();
        if (!groupRef.current) return;
        groupRef.current.getWorldPosition(doorWorldPos);

        const cameraTargetZ = doorWorldPos.z;
        const cameraTargetX = side === 'left' ? DOOR_ALIGN_X : -DOOR_ALIGN_X;


        let parentRotationY = 0;
        if (camera.parent) {
            const parentWorldQuat = new THREE.Quaternion();
            camera.parent.getWorldQuaternion(parentWorldQuat);
            const parentEuler = new THREE.Euler().setFromQuaternion(parentWorldQuat, 'YXZ');
            parentRotationY = parentEuler.y;
        }

        const worldTargetRotationY = side === 'left'
            ? DOOR_LOOK_ANGLE
            : -DOOR_LOOK_ANGLE;

        const targetRotationY = worldTargetRotationY - parentRotationY;

        const startRotationY = camera.rotation.y;

        const rotationProxy = { y: startRotationY };

        gsap.to(camera.position, {
            x: cameraTargetX,
            z: cameraTargetZ,
            duration: alignDuration,
            ease: useFastMode ? 'none' : 'power2.inOut'
        });

        gsap.to(rotationProxy, {
            y: targetRotationY,
            duration: alignDuration,
            ease: useFastMode ? 'none' : 'power2.inOut',
            onUpdate: () => {
                camera.rotation.y = rotationProxy.y;
            },
            onComplete: () => {
                doorAlignedState.current = {
                    x: camera.position.x,
                    y: camera.position.y,
                    z: camera.position.z,
                    rotationY: camera.rotation.y
                };

                setShouldRenderRoom(true);


                loadTimeoutRef.current = setTimeout(() => {
                    if (!roomReadyRef.current) {
                        console.warn(`[DoorSection ${label}] Room load timeout - forcing open`);
                        roomReadyRef.current = true;
                        setRoomReady(true);
                        openDoor(useFastMode);
                    }
                }, 8000);
            }
        });
    }, [camera, side, isOpen, isAnimating, setCameraOverride, isFastTeleport]);

    const openDoor = useCallback((fastMode = false) => {
        if (!doorRef.current) return;

        setIsOpen(true);
        const openAngle = side === 'left' ? Math.PI * 0.6 : -Math.PI * 0.6;

        if (!fastMode && openAudioRef.current) {
            const vol = isMuted ? 0 : DOOR_AUDIO_SETTINGS.openVolume * globalVolume;
            openAudioRef.current.setVolume(vol);
            if (openAudioRef.current.isPlaying) openAudioRef.current.stop();
            openAudioRef.current.play();
        }

        const handleDuration = fastMode ? 0.01 : 0.15;
        const doorDuration = fastMode ? 0.01 : 0.7;
        const flyDuration = fastMode ? 0.01 : 1.5;

        if (handleRef.current) {
            gsap.to(handleRef.current.rotation, {
                z: side === 'left' ? 0.4 : -0.4,
                duration: handleDuration,
                ease: fastMode ? 'none' : 'power2.out'
            });
        }

        gsap.to(doorRef.current.rotation, {
            y: openAngle,
            duration: doorDuration,
            ease: fastMode ? 'none' : 'power2.out',
            onComplete: () => {
                const direction = new THREE.Vector3();
                camera.getWorldDirection(direction);

                const flyDistance = enterDistance;

                const targetX = camera.position.x + direction.x * flyDistance;
                const targetZ = camera.position.z + direction.z * flyDistance;

                gsap.to(camera.position, {
                    x: targetX,
                    z: targetZ,
                    duration: flyDuration,
                    ease: fastMode ? 'none' : 'power2.inOut',
                    onComplete: () => {
                        roomEntryState.current = {
                            x: camera.position.x,
                            y: camera.position.y,
                            z: camera.position.z,
                            rotationY: camera.rotation.y
                        };

                        setIsAnimating(false);
                        setIsInsideRoom(true);

                        setTimeout(() => {
                            if (doorId) enterRoom(doorId);
                            onEnter?.();

                            if (fastMode) {
                                signalRoomReady();
                            }
                        }, 250);
                    }
                });
            }
        });
    }, [side, onEnter, camera, enterRoom, doorId, signalRoomReady]);

    const roomReadyRef = useRef(false);

    const handleRoomReady = useCallback(() => {
        if (roomReadyRef.current) return;

        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

        roomReadyRef.current = true;
        setRoomReady(true);
        openDoor(isFastTeleport);
    }, [openDoor, isFastTeleport]);

    const exitRoom = useCallback(() => {
        if (!isInsideRoom || isAnimating) return;

        setIsAnimating(true);

        const saved = savedCameraState.current;
        const aligned = doorAlignedState.current;

        const startRotation = {
            x: camera.rotation.x,
            y: camera.rotation.y,
            z: camera.rotation.z
        };


        const step1RotationProxy = { ...startRotation };


        gsap.to(camera.position, {
            x: aligned.x,
            y: aligned.y,
            z: aligned.z,
            duration: 1.5,
            ease: 'power2.inOut'
        });

        gsap.to(step1RotationProxy, {
            x: 0,
            y: aligned.rotationY,
            z: 0,
            duration: 1.5,
            ease: 'power2.inOut',
            onUpdate: () => {
                camera.rotation.set(step1RotationProxy.x, step1RotationProxy.y, step1RotationProxy.z);
            },
            onComplete: () => {

                gsap.to(camera.position, {
                    x: saved.x,
                    y: saved.y,
                    z: saved.z,
                    duration: 1.0,
                    ease: 'power2.inOut'
                });

                const step2RotationProxy = {
                    x: camera.rotation.x,
                    y: camera.rotation.y,
                    z: camera.rotation.z
                };

                gsap.to(step2RotationProxy, {
                    x: saved.rotationX,
                    y: saved.rotationY,
                    z: saved.rotationZ,
                    duration: 1.0,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                        camera.rotation.set(step2RotationProxy.x, step2RotationProxy.y, step2RotationProxy.z);
                    },
                    onComplete: () => {
                        camera.rotation.set(saved.rotationX, saved.rotationY, saved.rotationZ);

                        // Frame 1: ANIMATION FINISHED BUT STATE STILL "INSIDE" TO PREVENT ROOM WAKEUP

                        requestAnimationFrame(() => {

                            closeDoor(() => {
                                setIsInsideRoom(false);
                                setIsAnimating(false);
                                setIsTiltLocked(false);
                                setRoomReady(false);
                                roomReadyRef.current = false;

                                setShouldRenderRoom(false);
                                contextExitRoom();
                                setCameraOverride?.(false);
                            });
                        });
                    }
                });
            }
        });
    }, [isInsideRoom, isAnimating, camera, setCameraOverride, contextExitRoom]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isInsideRoom && !isAnimating) {
                exitRoom();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isInsideRoom, isAnimating, exitRoom]);

    useEffect(() => {
        if (exitRequested && isInsideRoom && !isAnimating) {
            exitRoom();
        }
    }, [exitRequested, isInsideRoom, isAnimating, exitRoom]);

    const closeDoor = useCallback((onDoorClosed?: () => void) => {
        if (!doorRef.current || !isOpen) return;
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

        setIsAnimating(true);

        if (closeAudioRef.current) {
            setTimeout(() => {
                const vol = isMuted ? 0 : DOOR_AUDIO_SETTINGS.closeVolume * globalVolume;
                if (closeAudioRef.current) {
                    closeAudioRef.current.setVolume(vol);
                    if (closeAudioRef.current.isPlaying) closeAudioRef.current.stop();
                    closeAudioRef.current.play();
                }
            }, DOOR_AUDIO_SETTINGS.closeDelay * 1000);
        }

        if (handleRef.current) {
            gsap.to(handleRef.current.rotation, {
                z: 0,
                duration: 0.2,
                ease: 'power2.out'
            });
        }

        if (doorMaterialRef.current) {
            gsap.to(doorMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.6,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (handleMaterialRef.current) {
            gsap.to(handleMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.6,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (handleHideDelayRef.current) handleHideDelayRef.current.kill();
        handleHideDelayRef.current = gsap.delayedCall(0.65, () => {
            if (handlePaintedRef.current) handlePaintedRef.current.visible = false;
            if (doorPaintedRef.current) doorPaintedRef.current.visible = false;
        });

        gsap.to(doorRef.current.rotation, {
            y: 0,
            duration: 0.6,
            ease: 'power2.in',
            onComplete: () => {
                setIsOpen(false);
                setIsAnimating(false);
                onDoorClosed?.();
            }
        });
    }, [isOpen]);

    const handlePointerEnter = () => {
        if (isOpen || isAnimating) return;
        setIsHovered(true);
        document.body.style.cursor = "pointer";

        if (hoverAudioRef.current && !isHovered) {
            const vol = isMuted ? 0 : DOOR_AUDIO_SETTINGS.hoverVolume * globalVolume;
            hoverAudioRef.current.setVolume(vol);
            
            if (hoverAudioRef.current.isPlaying) hoverAudioRef.current.stop();
            if (hoverAudioRef.current.context.state === 'running') {
                hoverAudioRef.current.play();
            }
        }

        if (doorRef.current) {
            gsap.to(doorRef.current.rotation, {
                y: side === 'left' ? 0.15 : -0.15,
                duration: 0.3,
                ease: 'power2.out'
            });
        }

        if (handleRef.current) {
            gsap.to(handleRef.current.rotation, {
                z: side === 'left' ? 0.1 : -0.1,
                duration: 0.2,
                ease: 'power2.out'
            });
        }

        if (doorMaterialRef.current) {
            gsap.to(doorMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (handleMaterialRef.current) {
            gsap.to(handleMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (handleHideDelayRef.current) handleHideDelayRef.current.kill();
        if (handlePaintedRef.current) handlePaintedRef.current.visible = true;
        if (doorPaintedRef.current) doorPaintedRef.current.visible = true;
    };

    const handlePointerLeave = () => {
        if (isOpen || isAnimating) return;
        setIsHovered(false);
        document.body.style.cursor = "auto";

        if (hoverAudioRef.current && hoverAudioRef.current.isPlaying) {
            hoverAudioRef.current.stop();
        }

        if (doorRef.current) {
            gsap.to(doorRef.current.rotation, {
                y: 0,
                duration: 0.3,
                ease: 'power2.out'
            });
        }

        if (handleRef.current) {
            gsap.to(handleRef.current.rotation, {
                z: 0,
                duration: 0.2,
                ease: 'power2.out'
            });
        }

        if (doorMaterialRef.current) {
            gsap.to(doorMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (handleMaterialRef.current) {
            gsap.to(handleMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }

        handleHideDelayRef.current = gsap.delayedCall(0.55, () => {
            if (handlePaintedRef.current) handlePaintedRef.current.visible = false;
            if (doorPaintedRef.current) doorPaintedRef.current.visible = false;
        });
    };

    const doorPivotX = side === 'left' ? -doorWidth / 2 : doorWidth / 2;
    const doorMeshX = side === 'left' ? doorWidth / 2 : -doorWidth / 2;

    const handlePivotX = side === 'left' ? doorWidth * 0.25 : -doorWidth * 0.25;

    const signTextureUrl = '/textures/corridor/pustatabliczka.webp';
    const signLegacyRatio = 1.792;
    const signHeight = 0.55;
    const signWidth = signHeight * signLegacyRatio;
    const signTexture = useSafeTexture(signTextureUrl);

    return (
        <group position={[pivotX, position[1], position[2]]}>
            <group ref={groupRef}>
                <mesh position={[wallOffsetX, 0, 0]} geometry={wallWithHoleGeometry}>
                    <meshBasicMaterial color="#e0e0e0" map={wallTexture} side={THREE.DoubleSide} />
                </mesh>

                <mesh
                    position={[wallOffsetX - 1.1, 0, 0.02]}
                    rotation={[0, 0, 0]}
                    scale={[0.5, 0.5, 1]}
                >
                    <planeGeometry args={[1, 0.5]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={arrowTexture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                <mesh
                    position={[wallOffsetX + 1.1, -0.3, 0.02]}
                    rotation={[0, 0, 0]}
                    scale={[-0.5, 0.5, 1]}
                >
                    <planeGeometry args={[1, 0.5]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={arrowTexture}
                        transparent={true}
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                <mesh position={[wallOffsetX - 1.4, -CORRIDOR_HEIGHT / 2 + 0.075, 0.02]}>
                    <planeGeometry args={[doorBoardWidth, 0.15]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={doorBbTexLeft}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                <mesh position={[wallOffsetX + 1.4, -CORRIDOR_HEIGHT / 2 + 0.075, 0.02]}>
                    <planeGeometry args={[doorBoardWidth, 0.15]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={doorBbTexRight}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                {(() => {
                    const THRESH_W = 1.1;
                    const THRESH_D = 0.15;
                    const threshTex = baseboardTexture.clone();
                    threshTex.needsUpdate = true;
                    threshTex.wrapS = threshTex.wrapT = THREE.RepeatWrapping;
                    threshTex.rotation = 0;
                    threshTex.offset.set(0, 0);
                    threshTex.repeat.set(THRESH_W / NATURAL_TILE_W, 1);
                    return (
                        <mesh
                            position={[wallOffsetX, -CORRIDOR_HEIGHT / 2 + 0.005, 0.02]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            <planeGeometry args={[THRESH_W, THRESH_D]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={threshTex}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    );
                })()}

                <group position={[wallOffsetX, -0.4, 0]}>
                    <group position={[0, doorHeight / 2 + 0.45, 0.08]}>
                        <mesh>
                            <planeGeometry args={[1.3, 0.65]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={signTexture}
                                transparent={true}
                                alphaTest={0.1}
                            />
                        </mesh>

                        {label === 'THE GALLERY' && (
                            <group position={[0, 0, 0.01]}>
                                <Text
                                    font="/fonts/CabinSketch-Bold.ttf"
                                    fontSize={0.25}
                                    color="#111111"
                                    anchorX="center"
                                    anchorY="bottom"
                                    position={[0, -0.02, 0]}
                                >
                                    THE
                                </Text>
                                <Text
                                    font="/fonts/CabinSketch-Bold.ttf"
                                    fontSize={0.25}
                                    color="#111111"
                                    anchorX="center"
                                    anchorY="top"
                                    position={[0, +0.02, 0]}
                                >
                                    GALLERY
                                </Text>
                            </group>
                        )}
                        {label === 'THE ABOUT' && (
                            <Text
                                font="/fonts/CabinSketch-Bold.ttf"
                                fontSize={0.30}
                                color="#111111"
                                anchorX="center"
                                anchorY="middle"
                                position={[0, 0, 0.01]}
                            >
                                ABOUT
                            </Text>
                        )}
                        {label === "LET'S CONNECT" && (
                            <Text
                                font="/fonts/CabinSketch-Bold.ttf"
                                fontSize={0.25}
                                color="#111111"
                                anchorX="center"
                                anchorY="middle"
                                position={[0, 0, 0.01]}
                            >
                                CONTACT
                            </Text>
                        )}
                    </group>

                    <mesh position={[0, -0.1, 0.04]} scale={[side === 'right' ? -1 : 1, 1, 1]}>
                        <planeGeometry args={[frameWidth, frameHeight]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={frameTexture}
                            transparent={true}
                            alphaTest={0.1}
                        />
                    </mesh>

                    <RoomInterior
                        label={label}
                        showRoom={shouldRenderRoom}
                        onReady={handleRoomReady}
                        isExiting={isInsideRoom && isAnimating}
                    />

                    <group ref={doorRef} position={[doorPivotX, 0, 0.01]}>
                        <mesh
                            position={[doorMeshX, -0.2, 0.005]}
                            onClick={handleClick}
                            onPointerEnter={handlePointerEnter}
                            onPointerLeave={handlePointerLeave}
                        >
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <meshBasicMaterial color="#e0e0e0" transparent={true} opacity={0} depthWrite={false} />
                        </mesh>

                        <mesh
                            ref={doorPaintedRef}
                            position={[doorMeshX, -0.2, -0.001]}
                            scale={[side === 'right' ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={doorPaintedTexture}
                                transparent={true}
                                alphaTest={0.5}
                            />
                        </mesh>

                        <mesh
                            position={[doorMeshX, -0.2, 0]}
                            scale={[side === 'right' ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <revealMaterial color="#e0e0e0"
                                ref={doorMaterialRef}
                                map={doorTexture}
                                transparent={true}
                                alphaTest={0.1}
                                uProgress={0.0}
                            />
                        </mesh>

                        <mesh
                            position={[doorMeshX, -0.2, -0.01]}
                            rotation={[0, Math.PI, 0]}
                            scale={[side === 'right' ? -1 : 1, 1, 1]}
                        >
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={doorBackTexture}
                                transparent={true}
                                alphaTest={0.1}
                                side={THREE.DoubleSide}
                            />
                        </mesh>

                        <group ref={handleRef} position={[doorMeshX + (side === 'left' ? 0.45 : -0.45), -0.29, 0.03]}>
                            <mesh ref={handlePaintedRef} position={[side === 'left' ? -0.50 : 0.50, 0.14, -0.001]} scale={[side === 'right' ? -1 : 1, 1, 1]}>
                                <planeGeometry args={[doorWidth, doorHeight]} />
                                <meshBasicMaterial color="#e0e0e0"
                                    map={handlePaintedTexture}
                                    transparent={true}
                                    alphaTest={0.5}
                                    depthWrite={false}
                                />
                            </mesh>
                            <mesh position={[side === 'left' ? -0.50 : 0.50, 0.14, 0]} scale={[side === 'right' ? -1 : 1, 1, 1]}>
                                <planeGeometry args={[doorWidth, doorHeight]} />
                                <revealMaterial color="#e0e0e0"
                                    ref={handleMaterialRef}
                                    map={handleTexture}
                                    transparent={true}
                                    alphaTest={0.1}
                                    depthWrite={false}
                                    uProgress={0.0}
                                />
                            </mesh>
                        </group>
                    </group>
                </group>

                <PositionalAudio
                    ref={hoverAudioRef}
                    url="/sounds/uchyleniedrzwi.mp3"
                    distanceModel="exponential"
                    rolloffFactor={DOOR_AUDIO_SETTINGS.rolloff}
                    refDistance={DOOR_AUDIO_SETTINGS.distance}
                    loop={false}
                />
                <PositionalAudio
                    ref={openAudioRef}
                    url="/sounds/otwarciedrzwi.mp3"
                    distanceModel="exponential"
                    rolloffFactor={DOOR_AUDIO_SETTINGS.rolloff}
                    refDistance={DOOR_AUDIO_SETTINGS.distance}
                    loop={false}
                />
                <PositionalAudio
                    ref={closeAudioRef}
                    url="/sounds/zamknieciedrzwi.mp3"
                    distanceModel="exponential"
                    rolloffFactor={DOOR_AUDIO_SETTINGS.rolloff}
                    refDistance={DOOR_AUDIO_SETTINGS.distance}
                    loop={false}
                />
            </group>
        </group >
    );
};

export default DoorSection;
