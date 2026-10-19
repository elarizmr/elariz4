import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import PositionalAudio from '../../ConfiguredPositionalAudio';
import * as THREE from 'three';
import gsap from 'gsap';
import MessagePaper from './MessagePaper';
import SocialBarrel from './SocialBarrel';
import { useScene } from '../../../../context/SceneContext';
import GalleryClouds from '../Gallery/GalleryClouds';
import { useTutorialToast } from '../../../../context/TutorialToastContext';
import { useAudio } from '../../../../context/AudioManager';

import { usePaintMaterial } from '../Gallery/usePaintMaterial';
import type { RoomLifecycleProps } from '../../../../types';
import { useSafeTexture } from '../../../../utils/safeTextureLoader';

const WAVE_LAYERS = 4;

export const AUDIO_SETTINGS = {
    volume: 2,
    distance: 2,
    rolloff: 1.2
};

export const LAMP_SETTINGS: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number];
} = {
    position: [-10, 5, -20],

    rotation: [0, 0.1, 0],

    scale: [4.49, 5]
};

export const SHIP_SETTINGS: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number];
} = {
    position: [0, 1.6, -15],

    rotation: [0, -0.2, 0],

    scale: [3.35, 1.3]
};

const CAMERA_SETTINGS = {
    lookDownAngle: -1.2,

    forceCenterY: -1.05,

    forceStraightZ: 0,

    lerpSpeed: 2.5
};

const PHASE = {
    ENTERING: 'entering',
    LOOKING_DOWN: 'looking_down',
    WRITING: 'writing',
    ROLLING: 'rolling',
    HOLDING: 'holding',
    THROWING: 'throwing',
    DONE: 'done'
};

const ContactRoom = ({ showRoom, onReady, isExiting, isWarmup = false }: RoomLifecycleProps) => {
    const { camera } = useThree();
    const { isTeleporting } = useScene();
    const { showTutorial, completeTutorial, hideTutorial } = useTutorialToast();
    const { globalVolume, isMuted } = useAudio();
    const effectiveVolume = isMuted ? 0 : AUDIO_SETTINGS.volume * globalVolume;

    const audioRef = useRef<THREE.PositionalAudio>(null);
    useEffect(() => {
        if (audioRef.current && audioRef.current.setVolume) {
            audioRef.current.setVolume(effectiveVolume);
        }
    }, [effectiveVolume]);

    useEffect(() => {
        if (isExiting || isTeleporting) {
            hideTutorial();
        }
    }, [isExiting, isTeleporting, hideTutorial]);

    const seaTexture = useSafeTexture("/textures/contact/top-down-waves.webp");
    const pierTexture = useSafeTexture("/textures/contact/pier.webp");
    const lampTexture = useSafeTexture("/textures/contact/lamp.webp");
    const shipTexture = useSafeTexture("/textures/contact/ship.webp");


    useEffect(() => {
        if (seaTexture) {
            seaTexture.wrapS = seaTexture.wrapT = THREE.MirroredRepeatWrapping;
            seaTexture.repeat.set(6, 4);
            seaTexture.needsUpdate = true;
        }

        if (pierTexture) {
            pierTexture.wrapS = pierTexture.wrapT = THREE.RepeatWrapping;
            pierTexture.center.set(0.5, 0.5);
            pierTexture.rotation = Math.PI / 2;
            pierTexture.repeat.set(1, 1);
            pierTexture.needsUpdate = true;
        }
    }, [seaTexture, pierTexture]);

    useEffect(() => {
        camera.rotation.reorder('YXZ');

        return () => {
            camera.rotation.reorder('XYZ');
        };
    }, [camera]);

    const groupRef = useRef<THREE.Group>(null);
    const { onBeforeCompile, animatePaint, resetPaint, uniformsData, updateRoomOrigin } = usePaintMaterial({
        dirX: 1.0,
        dirY: 0.0,
        dirZ: -0.1,
        startDist: -5.0,
        endDist: 55.0,
        noiseAxes: 'yz'
    });

    const [isTransitioning, setIsTransitioning] = useState(false);

    const wasTeleportedRef = useRef(false);
    useEffect(() => {
        if (isTeleporting) wasTeleportedRef.current = true;
    }, [isTeleporting]);

    useEffect(() => {
        if (showRoom && !isWarmup) {
            if (wasTeleportedRef.current || isTeleporting) {
                uniformsData.uPaintProgress.value = 1.0;
                setIsTransitioning(false);
            } else {
                setIsTransitioning(true);
                resetPaint();
                animatePaint(0.2, 2.5);
                setTimeout(() => {
                    setIsTransitioning(false);
                }, 2700);
            }
        } else {
            uniformsData.uPaintProgress.value = 1.0;
        }
    }, [showRoom, isWarmup, isTeleporting]);

    const hasSignaledReady = useRef(false);
    const frameCount = useRef(0);
    const FRAMES_TO_WAIT = 5;

    const [currentPhase, setCurrentPhase] = useState(PHASE.ENTERING);
    const [showSelection, setShowSelection] = useState(true);

    const hasAnimatedDown = useRef(false);
    const hasExitTriggered = useRef(false);
    if (isExiting && !hasExitTriggered.current) {
        hasExitTriggered.current = true;
    }

    const waveRefs = useRef<(THREE.Mesh | null)[]>([]);
    const shipRef = useRef<THREE.Group>(null);

    const targetRotX = useRef(0);
    const targetRotY = useRef(0);
    const targetRotZ = useRef(0);

    useEffect(() => {
        if (isTeleporting) {
            hasAnimatedDown.current = false;
            hasExitTriggered.current = false;
            targetRotX.current = 0;
            targetRotY.current = 0;
            targetRotZ.current = 0;
            setCurrentPhase(PHASE.ENTERING);
            setShowSelection(true);
        }
    }, [isTeleporting]);

    useEffect(() => {
        if (hasSignaledReady.current && !hasAnimatedDown.current && showRoom) {
        }

        if (!showRoom) {
            hasExitTriggered.current = false;
            if (hasAnimatedDown.current) {
                hasAnimatedDown.current = false;
                setCurrentPhase(PHASE.ENTERING);
                targetRotX.current = 0;
                targetRotZ.current = 0;
                setShowSelection(true);
            }
        }
    }, [hasSignaledReady.current, showRoom, camera]);

    useFrame((state, delta) => {
        updateRoomOrigin(groupRef);

        if (!hasSignaledReady.current) {
            frameCount.current++;
            if (frameCount.current >= FRAMES_TO_WAIT) {
                hasSignaledReady.current = true;
                onReady?.();
                if (!isWarmup) setTimeout(() => showTutorial('contact_choose'), 2000);
            }
        }

        if (hasAnimatedDown.current && !isExiting && !hasExitTriggered.current) {

            // Clamp delta to prevent massive jumps when React re-renders lag the frame rate
            const safeDelta = Math.min(delta, 0.033);
            const lerpSpeed = safeDelta * CAMERA_SETTINGS.lerpSpeed;

            camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetRotX.current, lerpSpeed);
            camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetRotY.current, lerpSpeed);
            camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, targetRotZ.current, lerpSpeed);
        }

        const time = state.clock.getElapsedTime();
        waveRefs.current.forEach((ref, i) => {
            if (ref) {
                const speed = 0.8 + i * 0.15;
                const amplitude = 0.15 - i * 0.02;
                const offset = i * 0.5;
                ref.position.y = Math.sin(time * speed + offset) * amplitude;
            }
        });

        if (shipRef.current) {
            const bobSpeed = 0.8;
            const bobAmplitude = 0.3;
            shipRef.current.position.y = SHIP_SETTINGS.position[1] + Math.sin(time * bobSpeed) * bobAmplitude;

            const sailSpeed = 0.04;
            const sailAmplitude = 12;
            shipRef.current.position.x = SHIP_SETTINGS.position[0] + Math.sin(time * sailSpeed) * sailAmplitude;

            const rollAmplitude = 0.05;
            shipRef.current.rotation.z = Math.sin(time * bobSpeed * 1.2) * rollAmplitude;
        }

    });

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1000);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <group ref={groupRef} position={[0, -0.7, -5]}>
            {!isWarmup && (
                <PositionalAudio
                    ref={audioRef}
                    url="/sounds/szummorza.mp3"
                    distanceModel="exponential"
                    refDistance={AUDIO_SETTINGS.distance}
                    rolloffFactor={AUDIO_SETTINGS.rolloff}
                    loop
                    autoplay
                    volume={effectiveVolume}
                />
            )}

            <GalleryClouds count={45} seed={88} rotationOffset={[0, 1, 0]} />

            <group position={[0, -1, -8]}>
                {Array.from({ length: WAVE_LAYERS }).map((_, i) => (
                    <mesh
                        key={i}
                        ref={(el) => { waveRefs.current[i] = el; }}
                        position={[0, -i * 0.1, -i * 8]}
                        rotation={[-Math.PI / 2.5, 0, 0]}
                    >
                        <planeGeometry args={[80, 30]} />
                        <meshBasicMaterial
                            map={seaTexture}
                            color="#ffffff"
                            transparent={true}
                            opacity={1 - i * 0.1}
                            side={THREE.DoubleSide}
                            toneMapped={false}
                            onBeforeCompile={onBeforeCompile}
                        />
                    </mesh>
                ))}
            </group>

            <SocialBarrel
                position={isMobile ? [-1.2, 0.5, -10] : [-3, 0.5, -10]}
                rotation={[0, 0.2, 0]}
                texturePath="/textures/contact/barrel.webp"
                label="LINKEDIN"
                onClick={() => window.open('https://www.linkedin.com/in/elariz-recebov/', '_blank')}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
            />
            <SocialBarrel
                position={isMobile ? [-1.5, -0.3, -7] : [-5, -0.3, -8]}
                rotation={[0, 0.3, 0]}
                texturePath="/textures/contact/barrel.webp"
                label="GITHUB"
                onClick={() => window.open('https://github.com/elarizmr/', '_blank')}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
            />
            <SocialBarrel
                position={isMobile ? [1.2, 0.5, -10] : [3, 0.5, -10]}
                rotation={[0, -0.2, 0]}
                texturePath="/textures/contact/barrel.webp"
                label="FACEBOOK"
                onClick={() => window.open('https://www.facebook.com/elariz.recebov.1', '_blank')}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
            />
            <SocialBarrel
                position={isMobile ? [1.5, -0.3, -7] : [5, -0.3, -8]}
                rotation={[0, -0.3, 0]}
                texturePath="/textures/contact/barrel.webp"
                label="INSTAGRAM"
                onClick={() => window.open('https://www.instagram.com/elarajabof/', '_blank')}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
            />


            <mesh
                position={[0, 0.05, 1.8]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[2.5, 7]} />
                <meshBasicMaterial
                    map={pierTexture}
                    color="#e0e0e0"
                    side={THREE.DoubleSide}
                    transparent
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            <mesh
                position={LAMP_SETTINGS.position}
                rotation={LAMP_SETTINGS.rotation}
            >
                <planeGeometry args={LAMP_SETTINGS.scale} />
                <meshBasicMaterial color="#e0e0e0"
                    map={lampTexture}
                    transparent
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            <mesh
                ref={shipRef}
                position={SHIP_SETTINGS.position}
                rotation={SHIP_SETTINGS.rotation}
            >
                <planeGeometry args={SHIP_SETTINGS.scale} />
                <meshBasicMaterial color="#e0e0e0"
                    map={shipTexture}
                    transparent
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            <group visible={!showSelection}>
                <MessagePaper
                    position={[0, 0.07, 2]}
                    onSend={() => completeTutorial('contact_choose')}
                />
            </group>


        </group>
    );
};

export default ContactRoom;
