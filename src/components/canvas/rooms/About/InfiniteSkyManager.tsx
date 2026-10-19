import { useState, useRef, useMemo, useEffect } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import PositionalAudio from '../../ConfiguredPositionalAudio';
import * as THREE from 'three';
import gsap from 'gsap';
import SkyChunk, { CHUNK_LENGTH, ROOM_Z } from './SkyChunk';
import '../../shaders/RevealBasicMaterial';
import { isTouchDevice } from '../../../../utils/deviceDetect';
import type { RevealBasicMaterial } from '../../shaders/RevealBasicMaterial';
import { useSafeTexture } from '../../../../utils/safeTextureLoader';

type Vec3 = [number, number, number];
type ScrollProgressRef = { current: number };
type TextMesh = THREE.Mesh & { fillOpacity: number; outlineOpacity: number };

// Reusable Vector3 to avoid allocations in event handlers
const _tempVec3 = new THREE.Vector3();


import { useAudio } from '../../../../context/AudioManager';

export const BALLOON_AUDIO_SETTINGS = {
    volume: 1.0,
    distance: 2,
    rolloff: 2
};


const STORY_CYCLE_LENGTH = 120;

const MILESTONE_CORRIDOR_CLIP_Z = -8.0;

const InfiniteSkyManager = ({ scrollProgressRef }: { scrollProgressRef: ScrollProgressRef }) => {
    const [activeChunks, setActiveChunks] = useState([-1, 0, 1, 2]);
    const [activeStoryCycles, setActiveStoryCycles] = useState([-1, 0, 1]);
    const worldRef = useRef<THREE.Group>(null);

    const getCurrentChunk = (worldZ: number) => {
        return Math.floor(worldZ / CHUNK_LENGTH);
    };

    const getCurrentStoryCycle = (worldZ: number) => {
        return Math.floor(worldZ / STORY_CYCLE_LENGTH);
    };

    useFrame(() => {
        if (!worldRef.current) return;

        const scrollProgress = scrollProgressRef?.current || 0;

        worldRef.current.position.z = scrollProgress;

        const currentChunk = getCurrentChunk(scrollProgress);
        const shouldBeActiveChunks = [
            currentChunk - 1,
            currentChunk,
            currentChunk + 1,
            currentChunk + 2,
        ];

        const chunksNeedUpdate = shouldBeActiveChunks.some(c => !activeChunks.includes(c)) ||
            activeChunks.some(c => !shouldBeActiveChunks.includes(c));

        if (chunksNeedUpdate) {
            setActiveChunks(shouldBeActiveChunks);
        }

        const currentStoryCycle = getCurrentStoryCycle(scrollProgress);
        const shouldBeActiveCycles = [
            currentStoryCycle - 1,
            currentStoryCycle,
            currentStoryCycle + 1,
        ];

        const cyclesNeedUpdate = shouldBeActiveCycles.some(c => !activeStoryCycles.includes(c)) ||
            activeStoryCycles.some(c => !shouldBeActiveCycles.includes(c));

        if (cyclesNeedUpdate) {
            setActiveStoryCycles(shouldBeActiveCycles);
        }
    });

    return (
        <group ref={worldRef}>
            {activeChunks.map((chunkIndex) => (
                <SkyChunk
                    key={`sky-chunk-${chunkIndex}`}
                    chunkIndex={chunkIndex}
                    seed={42}
                    scrollProgressRef={scrollProgressRef}
                />
            ))}

            {activeStoryCycles.map((cycleIndex) => (
                <group key={`story-cycle-${cycleIndex}`}>
                    <IntroMilestone
                        z={-(cycleIndex * STORY_CYCLE_LENGTH + 15)}
                        scrollProgressRef={scrollProgressRef}
                    />


                    <JourneyMilestone
                        z={-(cycleIndex * STORY_CYCLE_LENGTH + 55)}
                        scrollProgressRef={scrollProgressRef}
                    />


                    <SkillsMilestone
                        z={-(cycleIndex * STORY_CYCLE_LENGTH + 95)}
                        scrollProgressRef={scrollProgressRef}
                    />
                </group>
            ))}
        </group>
    );
};

const IntroMilestone = ({ z, scrollProgressRef }: { z: number; scrollProgressRef: ScrollProgressRef }) => {
    const avatarTexture = useSafeTexture('/textures/about/awatarnachmurce.webp');

    const groupRef = useRef<THREE.Group>(null);
    const titleRef = useRef<THREE.Mesh>(null);
    const avatarRef = useRef<THREE.Mesh>(null);
    const motto1Ref = useRef<THREE.Mesh>(null);

    const baseY = 2;

    const legacyAspectRatio = 2816 / 1536; 
    const avatarWidth = 6;
    const avatarHeight = avatarWidth / legacyAspectRatio;

    useFrame((state) => {
        if (!groupRef.current) return;

        const time = state.clock.elapsedTime;

        const scrollProgress = scrollProgressRef?.current || 0;
        const worldZ = ROOM_Z + scrollProgress + z;
        groupRef.current.visible = worldZ < MILESTONE_CORRIDOR_CLIP_Z;

        if (!groupRef.current.visible) return;

        // This ensures animations work IDENTICALLY regardless of chunk/camera position
        const distanceZ = z + scrollProgress - 55;

        const spreadStart = -70;
        const spreadEnd = -50;
        let spreadFactor = 0;

        if (distanceZ > spreadStart && distanceZ < spreadEnd) {
            spreadFactor = (distanceZ - spreadStart) / (spreadEnd - spreadStart);
            spreadFactor = Math.min(1, Math.max(0, spreadFactor));
            spreadFactor = spreadFactor * spreadFactor;
        } else if (distanceZ >= spreadEnd) {
            spreadFactor = 1;
        }

        const maxSpread = 15;

        if (titleRef.current) {
            titleRef.current.position.x = -spreadFactor * maxSpread * 0.8;
        }
        if (avatarRef.current) {
            avatarRef.current.position.y = baseY + Math.sin(time * 0.8) * 0.15 + spreadFactor * 3;
            avatarRef.current.position.x = -spreadFactor * maxSpread * 0.3;
        }
        if (motto1Ref.current) {
            motto1Ref.current.position.x = spreadFactor * maxSpread * 0.7;
        }
    });

    return (
        <group ref={groupRef} position={[0, 0, z]}>
            <Text
                ref={titleRef}
                position={[0, 5, 0.1]}
                fontSize={0.8}
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/fonts/RubikScribble-Regular.ttf"
            >
                ELARIZ RECEBOV
            </Text>

            <mesh ref={avatarRef} position={[0, baseY, 0]}>
                <planeGeometry args={[avatarWidth, avatarHeight]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={avatarTexture}
                    transparent
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            <Text
                ref={motto1Ref}
                position={[0, -0.25, 0.1]}
                fontSize={0.32}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/fonts/CabinSketch-Regular.ttf"
                fontStyle="italic"
            >
                Front End Developer
            </Text>
        </group>
    );
};


const JourneyMilestone = ({ z, scrollProgressRef }: { z: number; scrollProgressRef: ScrollProgressRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    const freelanceRef = useRef<THREE.Group>(null);

    const freelanceTexture = useSafeTexture('/textures/about/freelancewyspa.webp');

    freelanceTexture.colorSpace = THREE.SRGBColorSpace;

    const islandLegacyAspect = 2816 / 1536;
    const freelanceAspect = islandLegacyAspect;

    const islandHeight = 4.5;

    useFrame((state) => {
        if (!groupRef.current) return;

        const scrollProgress = scrollProgressRef?.current || 0;
        const worldZ = ROOM_Z + scrollProgress + z;
        groupRef.current.visible = worldZ < MILESTONE_CORRIDOR_CLIP_Z;
        if (!groupRef.current.visible) return;

        const time = state.clock.elapsedTime;

        const distanceZ = z + scrollProgress - 55;

        const revealStart = -100;
        const revealEnd = -20;
        let revealFactor = 0;

        if (distanceZ > revealStart && distanceZ < revealEnd) {
            revealFactor = (distanceZ - revealStart) / (revealEnd - revealStart);
            revealFactor = Math.min(1, Math.max(0, revealFactor));
            revealFactor = 1 - Math.pow(1 - revealFactor, 2);
        } else if (distanceZ >= revealEnd) {
            revealFactor = 1;
        }

        if (freelanceRef.current) {
            const startY = -1;
            const endY = 2.5;

            const currentBaseY = startY + revealFactor * (endY - startY);
            freelanceRef.current.position.y = currentBaseY + Math.sin(time * 0.4 + 2) * 0.25;
            freelanceRef.current.rotation.z = Math.sin(time * 0.2 + 1) * -0.05;
        }
    });

    return (
        <group ref={groupRef} position={[0, 0, z]}>
            <Text
                position={[0, 5, 0.3]}
                fontSize={1.2}
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/fonts/RubikScribble-Regular.ttf"
            >
                JOURNEY
            </Text>

            <Text
                position={[0, 4.2, 0.3]}
                fontSize={0.35}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/fonts/CabinSketch-Regular.ttf"
            >
                My path so far...
            </Text>

            <group ref={freelanceRef} position={[0, -2, 0.5]}>
                <mesh>
                    <planeGeometry args={[islandHeight * freelanceAspect, islandHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={freelanceTexture}
                        transparent
                        side={THREE.DoubleSide}
                    />
                </mesh>
                <Text
                    position={[0, -0.65, 0.1]}
                    fontSize={0.5}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/CabinSketch-Bold.ttf"
                >
                    2026-NOW
                </Text>
            </group>
        </group>
    );
};


const BALLOON_CONFIG = [
    { texture: '/textures/about/reactduzybalon.webp', paintedTexture: '/textures/about/reactduzybalon_painted.webp', label: 'React', size: 'large', x: -2.5, y: 2, z: 0.3, phase: 0 },
    { texture: '/textures/about/JSSREDNIBALON.webp', paintedTexture: '/textures/about/JSSREDNIBALON_painted.webp', label: 'JavaScript', size: 'medium', x: -4, y: 1, z: -0.3, phase: 0.8 },
    { texture: '/textures/about/csssrednibalon.webp', paintedTexture: '/textures/about/csssrednibalon_painted.webp', label: 'CSS', size: 'medium', x: 4, y: 1.5, z: -0.2, phase: 2.2 },
    { texture: '/textures/about/nextjssrednibalon.webp', paintedTexture: '/textures/about/nextjssrednibalon_painted.webp', label: 'Next.js', size: 'medium', x: 0, y: 0.5, z: -0.4, phase: 4 },

    { texture: '/textures/about/htmlmalybalon.webp', paintedTexture: '/textures/about/htmlmalybalon_painted.webp', label: 'HTML', size: 'small', x: -5.5, y: 2.5, z: -0.8, phase: 1.2 },
    { texture: '/textures/about/gitmalybalon.webp', paintedTexture: '/textures/about/gitmalybalon_painted.webp', label: 'Git', size: 'small', x: 5.5, y: 3, z: -0.7, phase: 2.8 },
    { texture: '/textures/about/figmamalybalon.webp', paintedTexture: '/textures/about/figmamalybalon_painted.webp', label: 'Figma', size: 'small', x: -3, y: 4.5, z: -0.5, phase: 3.5 },
    { texture: '/textures/about/firebasemalybalon.webp', paintedTexture: '/textures/about/firebasemalybalon_painted.webp', label: 'Firebase', size: 'small', x: 3.5, y: 4, z: -0.6, phase: 4.5 },
] satisfies SkillBalloonConfig[];

const SIZE_MULTIPLIERS = {
    large: 3.0,
    medium: 2.2,
    small: 1.6,
};

interface SkillBalloonConfig {
    texture: string;
    paintedTexture: string;
    label: string;
    size: 'small' | 'medium' | 'large';
    x: number;
    y: number;
    z: number;
    phase: number;
}

const SkillBalloon = ({ config, revealFactorRef, spreadFactorRef, timeRef }: {
    config: SkillBalloonConfig;
    revealFactorRef: { current: number };
    spreadFactorRef: { current: number };
    timeRef: { current: number };
}) => {
    const isTouch = isTouchDevice();
    const texture = useSafeTexture(config.texture);
    const paintedTextureUrl = isTouch ? config.texture : config.paintedTexture;
    const paintedTexture = useSafeTexture(paintedTextureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    paintedTexture.colorSpace = THREE.SRGBColorSpace;

    const [isPopping, setIsPopping] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [isFadingOutText, setIsFadingOutText] = useState(false);
    const popRef = useRef(0);
    const textFadeRef = useRef(1);
    const respawnOffsetRef = useRef(0);
    const balloonRevealRef = useRef<RevealBasicMaterial>(null);
    const paintedMeshRef = useRef<THREE.Mesh>(null);
    const paintedMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const hideDelayRef = useRef<gsap.core.Tween | null>(null);
    const textRef = useRef<TextMesh>(null);

    const balloonAudioRef = useRef<THREE.PositionalAudio>(null);
    const { globalVolume, isMuted } = useAudio();

    const playBalloonSound = () => {
        if (balloonAudioRef.current) {
            const vol = isMuted ? 0 : BALLOON_AUDIO_SETTINGS.volume * globalVolume;
            balloonAudioRef.current.setVolume(vol);
            if (balloonAudioRef.current.isPlaying) balloonAudioRef.current.stop();
            balloonAudioRef.current.play();
        }
    };

    const legacyAspects: Record<string, number> = {
        'reactduzybalon.webp': 736 / 1447,
        'default_small_medium': 631 / 1482
    };
    
    const filename = config.texture.split('/').pop();
    const aspect = (filename && legacyAspects[filename]) || legacyAspects['default_small_medium'];
    const baseHeight = SIZE_MULTIPLIERS[config.size];

    const outerGroupRef = useRef<THREE.Group>(null);
    const innerGroupRef = useRef<THREE.Group>(null);
    const targetScale = useRef(1.0);
    const currentScale = useRef(1.0);
    const targetMagnet = useRef({ x: 0, y: 0 });
    const currentMagnet = useRef({ x: 0, y: 0 });

    const positionScale = isTouch ? 0.5 : 1;
    const spreadScale = isTouch ? 0.4 : 1;
    const sizeScale = isTouch ? 0.85 : 1;

    useEffect(() => {
        if (hovered && !isPopping) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'auto';
        }
    }, [hovered, isPopping]);

    useEffect(() => {
        if (isPopping) {
            const timer = setTimeout(() => {
                setIsFadingOutText(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isPopping]);

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        if (isTouch) return;
        e.stopPropagation();
        if (!isPopping) setHovered(true);

        if (balloonRevealRef.current) {
            gsap.to(balloonRevealRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (hideDelayRef.current) hideDelayRef.current.kill();
        if (paintedMeshRef.current) paintedMeshRef.current.visible = true;
        if (paintedMatRef.current) paintedMatRef.current.opacity = 1;
    };

    const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
        if (isTouch) return;
        e.stopPropagation();
        setHovered(false);

        if (balloonRevealRef.current) {
            gsap.to(balloonRevealRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        hideDelayRef.current = gsap.delayedCall(0.55, () => {
            if (paintedMatRef.current) paintedMatRef.current.opacity = 0;
        });
    };

    useFrame((state, delta) => {
        if (hovered && !isPopping) {
            targetScale.current = 1.05;
        } else {
            targetScale.current = 1.0;
            targetMagnet.current.x = 0;
            targetMagnet.current.y = 0;
        }

        currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale.current, 8 * delta);
        currentMagnet.current.x = THREE.MathUtils.lerp(currentMagnet.current.x, targetMagnet.current.x, 8 * delta);
        currentMagnet.current.y = THREE.MathUtils.lerp(currentMagnet.current.y, targetMagnet.current.y, 8 * delta);

        if (isPopping) {
            popRef.current = THREE.MathUtils.lerp(popRef.current, 1, 2.5 * delta);

            if (hideDelayRef.current) hideDelayRef.current.kill();
            if (balloonRevealRef.current) {
                balloonRevealRef.current.uProgress = 0;
            }
        }

        if (isFadingOutText) {
            textFadeRef.current = THREE.MathUtils.lerp(textFadeRef.current, 0, 2 * delta);

            if (textFadeRef.current < 0.05) {
                setIsPopping(false);
                setHovered(false);
                setIsFadingOutText(false);
                popRef.current = 0;
                textFadeRef.current = 1;
                respawnOffsetRef.current = -12;

                // Immediately teleport the mesh to prevent pointer events at the old location
                if (outerGroupRef.current) {
                    outerGroupRef.current.position.y -= 12;
                }

                if (balloonRevealRef.current) balloonRevealRef.current.opacity = 1;
                if (textRef.current) textRef.current.fillOpacity = 0;
                if (balloonRevealRef.current) balloonRevealRef.current.uProgress = 0;
                if (paintedMatRef.current) paintedMatRef.current.opacity = 0;
                if (paintedMeshRef.current) paintedMeshRef.current.visible = false;
            }
        }

        if (respawnOffsetRef.current < -0.01) {
            respawnOffsetRef.current = THREE.MathUtils.lerp(respawnOffsetRef.current, 0, 1.5 * delta);
        }

        if (balloonRevealRef.current && isPopping) {
            balloonRevealRef.current.opacity = 1 - popRef.current;
        }
        if (paintedMatRef.current && isPopping) {
            paintedMatRef.current.opacity = 1 - popRef.current;
        }
        if (textRef.current && isPopping) {
            textRef.current.fillOpacity = popRef.current * textFadeRef.current;
            textRef.current.outlineOpacity = popRef.current * textFadeRef.current;
        }
    });


    const baseX = config.x * positionScale;

    useFrame(() => {
        if (!outerGroupRef.current) return;

        const time = timeRef.current;
        const revealFactor = revealFactorRef.current;
        const spreadFactor = spreadFactorRef.current;

        const floatY = Math.sin(time * 0.6 + config.phase) * 0.3;
        const floatX = Math.sin(time * 0.4 + config.phase * 0.7) * 0.15;
        const rotation = Math.sin(time * 0.3 + config.phase) * 0.08;

        const startY = config.y - 8;
        const endY = config.y;
        const currentY = startY + revealFactor * (endY - startY) + floatY + respawnOffsetRef.current;

        let scale = revealFactor * sizeScale;
        const popScaleEffect = currentScale.current + popRef.current * 0.4;
        scale *= popScaleEffect;

        const maxSpread = 15 * spreadScale;
        let spreadX = 0;

        if (config.x < -0.5) {
            spreadX = -spreadFactor * maxSpread * (0.5 + Math.abs(config.x) / 6);
        } else if (config.x > 0.5) {
            spreadX = spreadFactor * maxSpread * (0.5 + Math.abs(config.x) / 6);
        } else {
            spreadX = config.phase > 3.5
                ? spreadFactor * maxSpread * 0.8
                : -spreadFactor * maxSpread * 0.8;
        }

        outerGroupRef.current.position.set(baseX + floatX + spreadX, currentY, config.z);
        outerGroupRef.current.rotation.z = rotation;
        const s = Math.max(0.001, scale);
        outerGroupRef.current.scale.set(s, s, s);

        if (innerGroupRef.current) {
            innerGroupRef.current.position.set(currentMagnet.current.x, currentMagnet.current.y, 0);
        }
    });

    return (
        <group
            ref={outerGroupRef}
            position={[baseX, config.y - 8, config.z]}
        >
            <group ref={innerGroupRef}>
                <mesh ref={paintedMeshRef} visible={true}>
                    <planeGeometry args={[baseHeight * aspect, baseHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        ref={paintedMatRef}
                        map={paintedTexture}
                        transparent
                        opacity={0}
                        side={THREE.DoubleSide}
                        alphaTest={0.5}
                        depthWrite={false}
                    />
                </mesh>

                <mesh
                    position={[0, 0, 0.001]}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isPopping) {
                            setIsPopping(true);
                            playBalloonSound();
                        }
                    }}
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                    onPointerMove={(e) => {
                        if (hovered && !isPopping && outerGroupRef.current) {
                            outerGroupRef.current.getWorldPosition(_tempVec3);
                            targetMagnet.current.x = (e.point.x - _tempVec3.x) * 0.15;
                            targetMagnet.current.y = (e.point.y - _tempVec3.y) * 0.15;
                        }
                    }}
                    visible={popRef.current < 0.99}
                >
                    <planeGeometry args={[baseHeight * aspect, baseHeight]} />
                    <revealBasicMaterial
                        ref={balloonRevealRef}
                        map={texture}
                        transparent
                        side={THREE.DoubleSide}
                        depthWrite={false}
                        uProgress={0.0}
                    />
                </mesh>

                {isPopping && textFadeRef.current > 0.01 && (
                    <Text
                        ref={textRef}
                        position={[0, 0, 0.1]}
                        fontSize={baseHeight * 0.4}
                        color="#1a1a1a"
                        anchorX="center"
                        anchorY="middle"
                        font="/fonts/RubikScribble-Regular.ttf"
                        fillOpacity={0}
                        outlineWidth={0.02}
                        outlineColor="#fff"
                        outlineOpacity={0}
                    >
                        {config.label}
                    </Text>
                )}

                <PositionalAudio
                    ref={balloonAudioRef}
                    url="/sounds/baloonpoop.mp3"
                    distanceModel="exponential"
                    rolloffFactor={BALLOON_AUDIO_SETTINGS.rolloff}
                    refDistance={BALLOON_AUDIO_SETTINGS.distance}
                    loop={false}
                />
            </group>
        </group>
    );
};

const SkillsMilestone = ({ z, scrollProgressRef }: { z: number; scrollProgressRef: ScrollProgressRef }) => {
    const groupRef = useRef<THREE.Group>(null);
    // P2: Use refs instead of state to avoid 60 re-renders/sec inside useFrame
    const revealFactorRef = useRef(0);
    const spreadFactorRef = useRef(0);
    const timeRef = useRef(0);

    useFrame((state) => {
        if (!groupRef.current) return;

        const scrollProgress = scrollProgressRef?.current || 0;
        const worldZ = ROOM_Z + scrollProgress + z;
        groupRef.current.visible = worldZ < MILESTONE_CORRIDOR_CLIP_Z;
        if (!groupRef.current.visible) return;

        timeRef.current = state.clock.elapsedTime;

        const distanceZ = z + scrollProgress - 55;

        const revealStart = -100;
        const revealEnd = -25;
        let newRevealFactor = 0;

        if (distanceZ > revealStart && distanceZ < revealEnd) {
            newRevealFactor = (distanceZ - revealStart) / (revealEnd - revealStart);
            newRevealFactor = Math.min(1, Math.max(0, newRevealFactor));
            newRevealFactor = 1 - Math.pow(1 - newRevealFactor, 3);
        } else if (distanceZ >= revealEnd) {
            newRevealFactor = 1;
        }

        revealFactorRef.current = newRevealFactor;

        const spreadStart = -70;
        const spreadEnd = -40;
        let newSpreadFactor = 0;

        if (distanceZ > spreadStart && distanceZ < spreadEnd) {
            newSpreadFactor = (distanceZ - spreadStart) / (spreadEnd - spreadStart);
            newSpreadFactor = Math.min(1, Math.max(0, newSpreadFactor));
            newSpreadFactor = newSpreadFactor * newSpreadFactor;
        } else if (distanceZ >= spreadEnd) {
            newSpreadFactor = 1;
        }

        spreadFactorRef.current = newSpreadFactor;
    });

    return (
        <group ref={groupRef} position={[0, 0, z]}>
            <Text
                position={[0, 6, 0.5]}
                fontSize={1.2}
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/fonts/RubikScribble-Regular.ttf"
            >
                SKILLS
            </Text>

            <Text
                position={[0, 5.2, 0.5]}
                fontSize={0.35}
                color="#555555"
                anchorX="center"
                anchorY="middle"
                font="/fonts/CabinSketch-Regular.ttf"
            >
                Technologies I love working with
            </Text>

            {BALLOON_CONFIG.map((config, index) => (
                <SkillBalloon
                    key={index}
                    config={config}
                    revealFactorRef={revealFactorRef}
                    spreadFactorRef={spreadFactorRef}
                    timeRef={timeRef}
                />
            ))}
        </group>
    );
};


export default InfiniteSkyManager;
