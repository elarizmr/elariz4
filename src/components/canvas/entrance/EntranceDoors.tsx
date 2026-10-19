import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSafeTexture } from '../../../utils/safeTextureLoader';
import gsap from 'gsap';
import '../shaders/RevealMaterial';
import { playBackgroundMusic } from '../../../utils/audioManager';
import { useTutorialToast } from '../../../context/TutorialToastContext';
import { isTouchDevice } from '../../../utils/deviceDetect';
import type { RevealMaterial } from '../shaders/RevealMaterial';

const EntranceDoors = ({
    position = [0, 0, 22],
    onComplete,
    corridorHeight = 8,
    corridorWidth = 15
}: {
    position?: [number, number, number];
    onComplete?: () => void;
    corridorHeight?: number;
    corridorWidth?: number;
}) => {
    const leftDoorRef = useRef<THREE.Group>(null);
    const rightDoorRef = useRef<THREE.Group>(null);
    const leftHandleRef = useRef<THREE.Group>(null);
    const rightHandleRef = useRef<THREE.Group>(null);
    const rightDoorMaterialRef = useRef<RevealMaterial>(null);
    const leftDoorMaterialRef = useRef<RevealMaterial>(null);
    const leftHandleMaterialRef = useRef<RevealMaterial>(null);
    const rightHandleMaterialRef = useRef<RevealMaterial>(null);
    const leftHandlePaintedRef = useRef<THREE.Mesh>(null);
    const rightHandlePaintedRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isWindowHovered, setIsWindowHovered] = useState(false);
    const windowAvatarRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();
    const { completeTutorial } = useTutorialToast();

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMobile(isTouchDevice() || window.innerWidth < 1000);
    }, []);

    const isMobileDevice = typeof window !== 'undefined' && (isTouchDevice() || window.innerWidth < 1000);
    const dummyTex = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    const frameTexture = useSafeTexture('/textures/doors/frame_sketch.webp');
    const doorLeftTexture = useSafeTexture('/textures/doors/door_left_sketch.webp');
    const doorRightTexture = useSafeTexture('/textures/doors/door_right_sketch.webp');

    const doorRightPaintedTexture = useSafeTexture(isMobileDevice ? dummyTex : '/textures/doors/door_right_painted.webp');
    const doorLeftPaintedTexture = useSafeTexture(isMobileDevice ? dummyTex : '/textures/doors/door_left_painted.webp');
    const handleLeftTexture = useSafeTexture('/textures/doors/handle_left_sketch.webp');
    const handleLeftPaintedTexture = useSafeTexture(isMobileDevice ? dummyTex : '/textures/doors/handle_left_painted.webp');
    const handleRightTexture = useSafeTexture('/textures/doors/handle_right_sketch.webp');
    const handleRightPaintedTexture = useSafeTexture(isMobileDevice ? dummyTex : '/textures/doors/handle_right_painted.webp');

    const doorBackTexture = useSafeTexture(isMobileDevice ? '/textures/doors/door_back.webp' : '/textures/doors/door_back_left_sketch.webp');
    const edgeTexture = useSafeTexture(isMobileDevice ? '/textures/doors/pien_sketch.webp' : '/textures/doors/pien.webp');

    const bricksTexture = useSafeTexture('/textures/entrance/wall_bricks_2.webp');
    const stonePathTexture = useSafeTexture('/textures/entrance/stone-path.webp');
    const catFrontBodyTexture = useSafeTexture('/textures/entrance/cat_front_body.webp');
    const windowSketchTexture = useSafeTexture('/textures/entrance/window_sketch.webp');
    const avatarWindowTexture = useSafeTexture('/textures/entrance/avatar_window.webp');
    const treeTexture = useSafeTexture('/textures/entrance/tree_sketch.webp');
    const mouseTexture = useSafeTexture('/textures/entrance/mouse_hanging.webp');
    const bugTexture = useSafeTexture('/textures/entrance/bug_sketch.webp');
    const inkSplashTexture = useSafeTexture('/images/ink-splash.webp');

    const leftPupilRef = useRef<THREE.Mesh>(null);
    const rightPupilRef = useRef<THREE.Mesh>(null);
    const catGroupRef = useRef<THREE.Group>(null);
    const bugRef = useRef<THREE.Mesh>(null);

    const [isBugClicked, setIsBugClicked] = useState(false);
    const [textVisible, setTextVisible] = useState(false);
    const [clipProgress, setClipProgress] = useState(0);
    const inkSplashRef = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null);
    const handleHideDelayRef = useRef<gsap.core.Tween | null>(null);
    const bugFixedTextRef = useRef<THREE.Mesh>(null);
    const bugClickPos = useRef({ x: 0, y: 0 });

    const handleBugClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (isBugClicked) return;

        if (bugRef.current) {
            bugClickPos.current = {
                x: bugRef.current.position.x,
                y: bugRef.current.position.y
            };
        }

        setIsBugClicked(true);
        document.body.style.cursor = "auto";

        if (inkSplashRef.current) {
            inkSplashRef.current.position.x = bugClickPos.current.x;
            inkSplashRef.current.position.y = bugClickPos.current.y;
            inkSplashRef.current.scale.set(0, 0, 0);
            inkSplashRef.current.material.opacity = 1;

            gsap.to(inkSplashRef.current.scale, {
                x: 0.8,
                y: 0.8,
                z: 1,
                duration: 0.4,
                ease: 'back.out(1.7)'
            });
        }

        setTextVisible(true);
        setClipProgress(0);

        if (bugFixedTextRef.current) {
            bugFixedTextRef.current.position.x = bugClickPos.current.x;
            bugFixedTextRef.current.position.y = bugClickPos.current.y;
        }

        gsap.to({ progress: 0 }, {
            progress: 1,
            duration: 0.8,
            ease: 'power1.inOut',
            onUpdate: function () {
                setClipProgress(this.targets()[0].progress);
            },
            onComplete: () => {
                setTimeout(() => {
                    if (inkSplashRef.current) {
                        gsap.to(inkSplashRef.current.material, {
                            opacity: 0,
                            duration: 1,
                            ease: 'power2.out'
                        });
                    }
                }, 1500);
            }
        });
    };

    const doorWidth = 0.94;
    const doorHeight = 2.4;
    const doorOpeningWidth = doorWidth * 2;
    const wallThickness = 0.07;

    const frameWidth = doorOpeningWidth + 0.16;
    const frameHeight = frameWidth * (877 / 718);

    const floorY = -1.75;
    const doorBottomY = floorY;
    const doorCenterY = doorBottomY + doorHeight / 2;
    const wallCenterY = floorY + corridorHeight / 2;
    const topWallHeight = corridorHeight - doorHeight;
    const topWallCenterY = doorBottomY + doorHeight + topWallHeight / 2;
    const sideWallWidth = (corridorWidth - doorOpeningWidth) / 2;





    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const leftDoor = leftDoorRef.current;
        const rightDoor = rightDoorRef.current;
        if (isOpen || isAnimating || !leftDoor || !rightDoor) return;

        document.body.style.cursor = "auto";

        setIsOpen(true);
        setIsAnimating(true);
        playBackgroundMusic();
        completeTutorial('corridor_enter');

        const tl = gsap.timeline({
            onComplete: () => {
                onComplete?.();
            }
        });

        if (leftHandleRef.current) {
            tl.to(leftHandleRef.current.rotation, {
                z: 0.4,
                duration: 0.15,
                ease: 'power2.out'
            }, 0);
        }
        if (rightHandleRef.current) {
            tl.to(rightHandleRef.current.rotation, {
                z: -0.4,
                duration: 0.15,
                ease: 'power2.out'
            }, 0);
        }

        tl.to(leftDoor.rotation, {
            y: -Math.PI * 0.55,
            duration: 0.9,
            ease: 'power2.out'
        }, 0.1);

        tl.to(rightDoor.rotation, {
            y: Math.PI * 0.55,
            duration: 0.9,
            ease: 'power2.out'
        }, 0.1);

        tl.to(camera.position, {
            z: 11,
            y: 0.2,
            duration: 1.8,
            ease: 'power2.inOut'
        }, 0.3);
    };

    const handlePointerEnter = () => {
        const leftDoor = leftDoorRef.current;
        const rightDoor = rightDoorRef.current;
        if (isOpen || isAnimating || isMobile || !leftDoor || !rightDoor) return;
        setIsHovered(true);
        document.body.style.cursor = "pointer";

        gsap.to(leftDoor.rotation, {
            y: -0.08,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: true
        });
        gsap.to(rightDoor.rotation, {
            y: 0.08,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: true
        });

        if (leftHandleRef.current) {
            gsap.to(leftHandleRef.current.rotation, {
                z: 0.1,
                duration: 0.2,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (rightHandleRef.current) {
            gsap.to(rightHandleRef.current.rotation, {
                z: -0.1,
                duration: 0.2,
                ease: 'power2.out',
                overwrite: true
            });
        }

        if (rightDoorMaterialRef.current) {
            gsap.to(rightDoorMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (leftDoorMaterialRef.current) {
            gsap.to(leftDoorMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (leftHandleMaterialRef.current) {
            gsap.to(leftHandleMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (rightHandleMaterialRef.current) {
            gsap.to(rightHandleMaterialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (handleHideDelayRef.current) handleHideDelayRef.current.kill();
        if (leftHandlePaintedRef.current) leftHandlePaintedRef.current.visible = true;
        if (rightHandlePaintedRef.current) rightHandlePaintedRef.current.visible = true;
    };

    const handlePointerLeave = () => {
        const leftDoor = leftDoorRef.current;
        const rightDoor = rightDoorRef.current;
        if (isOpen || isAnimating || isMobile || !leftDoor || !rightDoor) return;
        setIsHovered(false);
        document.body.style.cursor = "auto";

        gsap.to(leftDoor.rotation, {
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: true
        });
        gsap.to(rightDoor.rotation, {
            y: 0,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: true
        });

        if (leftHandleRef.current) {
            gsap.to(leftHandleRef.current.rotation, {
                z: 0,
                duration: 0.2,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (rightHandleRef.current) {
            gsap.to(rightHandleRef.current.rotation, {
                z: 0,
                duration: 0.2,
                ease: 'power2.out',
                overwrite: true
            });
        }

        if (rightDoorMaterialRef.current) {
            gsap.to(rightDoorMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (leftDoorMaterialRef.current) {
            gsap.to(leftDoorMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (leftHandleMaterialRef.current) {
            gsap.to(leftHandleMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
        if (rightHandleMaterialRef.current) {
            gsap.to(rightHandleMaterialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }

        handleHideDelayRef.current = gsap.delayedCall(0.55, () => {
            if (leftHandlePaintedRef.current) leftHandlePaintedRef.current.visible = false;
            if (rightHandlePaintedRef.current) rightHandlePaintedRef.current.visible = false;
        });
    };



    useFrame((state) => {
        if (!leftPupilRef.current || !rightPupilRef.current) return;

        const { x, y } = state.pointer;

        const MAX_EYE_MOVEMENT = 0.015;

        const targetX = x * MAX_EYE_MOVEMENT * 2;
        const targetY = y * MAX_EYE_MOVEMENT * 2;

        leftPupilRef.current.position.x = THREE.MathUtils.lerp(leftPupilRef.current.position.x, -0.075 + targetX, 0.1);
        leftPupilRef.current.position.y = THREE.MathUtils.lerp(leftPupilRef.current.position.y, 0.28 + targetY, 0.1);

        rightPupilRef.current.position.x = THREE.MathUtils.lerp(rightPupilRef.current.position.x, 0.043 + targetX, 0.1);
        rightPupilRef.current.position.y = THREE.MathUtils.lerp(rightPupilRef.current.position.y, 0.28 + targetY, 0.1);
    });

    const mousePivotRef = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (mousePivotRef.current) {
            mousePivotRef.current.rotation.x = Math.sin(clock.elapsedTime * 1.5) * 0.05;
        }

        if (bugRef.current) {
            const time = clock.elapsedTime;

            const xOffset = Math.sin(time * 0.8) * 0.3 + Math.sin(time * 1.5) * 0.1;
            const yOffset = Math.cos(time * 0.6) * 0.2 + Math.cos(time * 1.1) * 0.1;

            bugRef.current.position.x = 3 + xOffset;
            bugRef.current.position.y = (floorY + 3.8) + yOffset;

            bugRef.current.rotation.z = Math.sin(time * 5) * 0.1 + Math.atan2(yOffset, xOffset) * 0.2;
        }
    });



    const handleWindowEnter = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setIsWindowHovered(true);
        document.body.style.cursor = "pointer";

        if (windowAvatarRef.current) {
            gsap.to(windowAvatarRef.current.position, {
                x: 2.5,
                duration: 0.5,
                ease: 'back.out(1.7)',
                overwrite: true
            });
            gsap.to(windowAvatarRef.current.rotation, {
                z: 0.1,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }
    };

    const handleWindowLeave = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setIsWindowHovered(false);
        document.body.style.cursor = "auto";

        if (windowAvatarRef.current) {
            gsap.to(windowAvatarRef.current.position, {
                x: 3.5,
                duration: 0.4,
                ease: 'power2.in',
                overwrite: true
            });
            gsap.to(windowAvatarRef.current.rotation, {
                z: 0,
                duration: 0.4,
                ease: 'power2.in',
                overwrite: true
            });
        }
    };

    const frameCenterY = doorBottomY + frameHeight / 2;

    const facadeYOffset = -1.65;


    const pathWidth = frameWidth + 0.4;
    const pathLength = 5.62;

    return (
        <group ref={groupRef} position={[position[0], 0, position[2]]}>

            <mesh
                position={[0, floorY + 0.02, pathLength / 2]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[pathWidth, pathLength]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={stonePathTexture}
                    transparent={true}
                />
            </mesh>


            <mesh position={[-(doorOpeningWidth / 2 + sideWallWidth / 2), wallCenterY, 0]}>
                <boxGeometry args={[sideWallWidth, corridorHeight, wallThickness]} />
                <meshBasicMaterial color="#e0e0e0" />
            </mesh>

            <mesh position={[(doorOpeningWidth / 2 + sideWallWidth / 2), wallCenterY, 0]}>
                <boxGeometry args={[sideWallWidth, corridorHeight, wallThickness]} />
                <meshBasicMaterial color="#e0e0e0" />
            </mesh>

            <mesh position={[0, topWallCenterY, 0]}>
                <boxGeometry args={[doorOpeningWidth, topWallHeight, wallThickness]} />
                <meshBasicMaterial color="#e0e0e0" />
            </mesh>

            <mesh position={[0, wallCenterY + facadeYOffset + 1.65, 0.15]}>
                <planeGeometry args={[16., 8]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={bricksTexture}
                    transparent={true}
                    alphaTest={0.01}
                />
            </mesh>

            <mesh position={[0, frameCenterY, 0.12]}>
                <planeGeometry args={[frameWidth, frameHeight]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={frameTexture}
                    transparent={true}
                    alphaTest={0.1}
                    depthWrite={false}
                />
            </mesh>

            <group ref={leftDoorRef} position={[-doorWidth, doorCenterY, 0]}>
                <mesh
                    position={[doorWidth / 2, 0, 0.06]}
                    onClick={handleClick}
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                >
                    <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
                    <meshBasicMaterial color="#e0e0e0" map={edgeTexture} />
                </mesh>

                {!isMobile && (
                    <mesh position={[doorWidth / 2, 0, 0.088]}>
                        <planeGeometry args={[doorWidth, doorHeight]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={doorLeftPaintedTexture}
                            transparent={true}
                            alphaTest={0.5}
                        />
                    </mesh>
                )}

                <mesh position={[doorWidth / 2, 0, 0.09]}>
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    <revealMaterial color="#e0e0e0"
                        ref={leftDoorMaterialRef}
                        map={doorLeftTexture}
                        transparent={true}
                        alphaTest={0.5}
                        depthWrite={false}
                        uProgress={0.0}
                    />
                </mesh>

                <mesh position={[doorWidth / 2, 0, 0.03]} rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]}>
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={doorBackTexture}
                        transparent={true}
                        alphaTest={0.5}
                        side={2}
                    />
                </mesh>

                <group ref={leftHandleRef} position={[doorWidth / 2 + 0.357, -0.099, 0.10]}>
                    {!isMobile && (
                        <mesh ref={leftHandlePaintedRef} position={[-0.357, 0.09, -0.001]} visible={false}>
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={handleLeftPaintedTexture}
                                transparent={true}
                                alphaTest={0.5}
                                depthWrite={false}
                            />
                        </mesh>
                    )}
                    <mesh position={[-0.357, 0.099, 0]}>
                        <planeGeometry args={[doorWidth, doorHeight]} />
                        <revealMaterial color="#e0e0e0"
                            ref={leftHandleMaterialRef}
                            map={handleLeftTexture}
                            transparent={true}
                            alphaTest={0.5}
                            depthWrite={false}
                            uProgress={0.0}
                        />
                    </mesh>
                </group>
            </group>

            <group ref={rightDoorRef} position={[doorWidth, doorCenterY, 0]}>
                <mesh
                    position={[-doorWidth / 2, 0, 0.06]}
                    onClick={handleClick}
                    onPointerEnter={handlePointerEnter}
                    onPointerLeave={handlePointerLeave}
                >
                    <boxGeometry args={[doorWidth, doorHeight, 0.04]} />
                    <meshBasicMaterial color="#e0e0e0" map={edgeTexture} />
                </mesh>

                {!isMobile && (
                    <mesh position={[-doorWidth / 2, 0, 0.088]}>
                        <planeGeometry args={[doorWidth, doorHeight]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={doorRightPaintedTexture}
                            transparent={true}
                            alphaTest={0.5}
                        />
                    </mesh>
                )}

                <mesh position={[-doorWidth / 2, 0, 0.09]}>
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    <revealMaterial color="#e0e0e0"
                        ref={rightDoorMaterialRef}
                        map={doorRightTexture}
                        transparent={true}
                        alphaTest={0.5}
                        depthWrite={false}
                        uProgress={0.0}
                    />
                </mesh>

                <mesh position={[-doorWidth / 2, 0, 0.03]} rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[doorWidth, doorHeight]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={doorBackTexture}
                        transparent={true}
                        alphaTest={0.5}
                    />
                </mesh>

                <group ref={rightHandleRef} position={[-doorWidth / 2 - 0.357, -0.099, 0.10]}>
                    {!isMobile && (
                        <mesh ref={rightHandlePaintedRef} position={[0.357, 0.09, -0.001]} visible={false}>
                            <planeGeometry args={[doorWidth, doorHeight]} />
                            <meshBasicMaterial color="#e0e0e0"
                                map={handleRightPaintedTexture}
                                transparent={true}
                                alphaTest={0.5}
                                depthWrite={false}
                            />
                        </mesh>
                    )}
                    <mesh position={[0.357, 0.099, 0]}>
                        <planeGeometry args={[doorWidth, doorHeight]} />
                        <revealMaterial color="#e0e0e0"
                            ref={rightHandleMaterialRef}
                            map={handleRightTexture}
                            transparent={true}
                            alphaTest={0.5}
                            depthWrite={false}
                            uProgress={0.0}
                        />
                    </mesh>
                </group>
            </group>

            <mesh
                ref={windowAvatarRef}
                position={[3.5, 0, 0.04]}
                rotation={[0, 0, 0]}
            >
                <planeGeometry args={[1.5, 1.5]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={avatarWindowTexture}
                    transparent={true}
                />
            </mesh>

            <group
                position={[2.5, 0, 0.1]}
                onPointerEnter={handleWindowEnter}
                onPointerLeave={handleWindowLeave}
            >
                <mesh position={[0, 0, 0.2]}>
                    <planeGeometry args={[1.5, 1.5]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={windowSketchTexture}
                        transparent={true}
                    />
                </mesh>
            </group>

            {!isBugClicked && (
                <mesh
                    ref={bugRef}
                    position={[2.5, floorY + 2.8, 0.16]}
                    onClick={handleBugClick}
                    onPointerEnter={() => { document.body.style.cursor = "pointer"; }}
                    onPointerLeave={() => { document.body.style.cursor = "auto"; }}
                >
                    <planeGeometry args={[0.4, 0.4]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={bugTexture}
                        transparent={true}
                        alphaTest={0.01}
                        depthWrite={false}
                    />
                </mesh>
            )}

            <mesh
                ref={inkSplashRef}
                position={[2.5, floorY + 2.8, 0.17]}
                scale={[0, 0, 0]}
            >
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={inkSplashTexture}
                    transparent={true}
                    alphaTest={0.01}
                    depthWrite={false}
                />
            </mesh>

            <Text
                ref={bugFixedTextRef}
                position={[2.5, floorY + 2.8, 0.35]}
                fontSize={0.25}
                color="#1a1a1a"
                anchorX="center"
                anchorY="middle"
                font="/fonts/CabinSketch-Bold.ttf"
                outlineWidth={0.015}
                outlineColor="#ffffff"
                clipRect={[-1, -0.5, -1 + (clipProgress * 2.5), 0.5]}
            >
                BUG FIXED!
            </Text>





            <group position={[-2.9, floorY + 2.7, 1]}>
                <mesh position={[0, 0, 0]}>
                    <planeGeometry args={[6, 8]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={treeTexture}
                        transparent={true}
                        alphaTest={0.01}
                        depthWrite={false}
                    />
                </mesh>
                <group ref={mousePivotRef} position={[0.341, 0.02 - 0.456, 0]}>
                    <mesh position={[-0.351, 0.456, 0]}>
                        <planeGeometry args={[6, 8]} />
                        <meshBasicMaterial color="#e0e0e0"
                            map={mouseTexture}
                            transparent={true}
                            alphaTest={0.01}
                            depthWrite={false}
                        />
                    </mesh>
                </group>
            </group>

            <group position={[-1.5, floorY + 0.6, 0.8]} ref={catGroupRef}>
                <mesh>
                    <planeGeometry args={[1.5, 1.5]} />
                    <meshBasicMaterial color="#e0e0e0"
                        map={catFrontBodyTexture}
                        transparent={true}
                        alphaTest={0.01}
                        depthWrite={false}
                    />
                </mesh>

                <mesh
                    ref={leftPupilRef}
                    position={[-0.063, 0.27, -0.02]}
                >
                    <circleGeometry args={[0.020, 32]} />
                    <meshBasicMaterial color="black" />
                    <group scale={[0.8, 1.2, 1]} />
                </mesh>

                <mesh
                    ref={rightPupilRef}
                    position={[0.0615, 0.27, -0.02]}
                >
                    <circleGeometry args={[0.020, 32]} />
                    <meshBasicMaterial color="black" />
                </mesh>
            </group>

        </group>
    );
};

export default EntranceDoors;
