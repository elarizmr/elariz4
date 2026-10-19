import { useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/all';

gsap.registerPlugin(Observer);
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTutorialToast } from '../context/TutorialToastContext';

const DOOR_POSITIONS = [
    { z: -18, side: 'left' },
    { z: -32, side: 'right' },
    { z: -48, side: 'left' },
    { z: -62, side: 'right' },
] as const;

interface InfiniteCameraOptions {
    segmentLength?: number;
    scrollSpeed?: number;
    parallaxIntensity?: number;
    smoothing?: number;
    glanceIntensity?: number;
    scrollEnabled?: boolean;
    parallaxEnabled?: boolean;
}

const getTouchPoint = (event: TouchEvent | PointerEvent) => {
    if (event instanceof TouchEvent) return event.touches[0];
    return event.pointerType === 'touch' ? event : undefined;
};

const useInfiniteCamera = ({
    segmentLength = 80,
    scrollSpeed = 0.02,
    parallaxIntensity = 0.3,
    smoothing = 0.035,
    glanceIntensity = 0.15,
    scrollEnabled = true,
    parallaxEnabled = true
}: InfiniteCameraOptions = {}) => {
    const { camera, gl } = useThree();

    const targetZ = useRef(28);
    const currentZ = useRef(28);
    const parallax = useRef({ x: 0, y: 0 });
    const targetParallax = useRef({ x: 0, y: 0 });
    const glanceOffset = useRef(0);
    const targetGlance = useRef(0);
    const currentSegment = useRef(0);
    const scrollEnabledRef = useRef(scrollEnabled);
    const parallaxEnabledRef = useRef(parallaxEnabled);
    const justEnabled = useRef(false);
    const { completeTutorial } = useTutorialToast();

    const touchStart = useRef({ x: 0, y: 0 });
    const touchLastTime = useRef(0);
    const touchDragging = useRef(false);
    const touchMomentum = useRef(0);
    const swipeGlance = useRef(0);
    const targetSwipeGlance = useRef(0);
    const useGyroscope = useRef(false);

    const cameraOverride = useRef(false);
    // Skip first frame after re-enabling to prevent camera jump
    const skipFrameAfterEnable = useRef(false);
    const blendInFrames = useRef(0);
    const savedRotation = useRef({ x: 0, y: 0, z: 0 });

    const MAX_SWIPE_GLANCE = 0.26;

    const lastMousePos = useRef({ x: 0, y: 0 });

    useLayoutEffect(() => {
        const wasScrollEnabled = scrollEnabledRef.current;
        scrollEnabledRef.current = scrollEnabled;
        parallaxEnabledRef.current = parallaxEnabled;

        if (scrollEnabled && !wasScrollEnabled) {
            // KILL GSAP TWEENS: Ensure no lingering entrance animations interfere
            gsap.killTweensOf(camera.position);
            gsap.killTweensOf(camera.rotation);

            justEnabled.current = true;

            // This prevents the instant lookAt() from snapping the camera
            savedRotation.current = {
                x: camera.rotation.x,
                y: camera.rotation.y,
                z: camera.rotation.z
            };

            blendInFrames.current = 30;

            targetZ.current = camera.position.z;
            currentZ.current = camera.position.z;

            if (!wasScrollEnabled) {
                parallax.current = { x: camera.position.x, y: camera.position.y - 0.2 };
                targetParallax.current = { x: camera.position.x, y: camera.position.y - 0.2 };
            }

            const initialGlance = calculateGlance(currentZ.current, Math.floor((10 - currentZ.current) / segmentLength));
            glanceOffset.current = initialGlance;
            targetGlance.current = initialGlance;

            swipeGlance.current = 0;
            targetSwipeGlance.current = 0;

            currentSegment.current = Math.floor((10 - currentZ.current) / segmentLength);
        }
    }, [scrollEnabled, parallaxEnabled, camera, parallaxIntensity]);

    const handleWheel = useCallback((e: WheelEvent) => {
        if (!scrollEnabledRef.current) return;

        e.preventDefault();
        const delta = e.deltaY * scrollSpeed;
        targetZ.current -= delta;
        completeTutorial('corridor_explore');
    }, [scrollSpeed, completeTutorial]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!scrollEnabledRef.current) return;

        const tag = e.target instanceof HTMLElement ? e.target.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        const keyScrollMap: Record<string, number> = {
            'ArrowDown': 100,
            'ArrowUp': -100,
            'PageDown': 400,
            'PageUp': -400,
            ' ': 200,
        };

        const delta = keyScrollMap[e.key];
        if (delta !== undefined) {
            e.preventDefault();
            targetZ.current -= delta * scrollSpeed;
            completeTutorial('corridor_explore');
        }

        if (parallaxEnabledRef.current) {
            if (e.key === 'ArrowLeft') {
                targetSwipeGlance.current = Math.max(-MAX_SWIPE_GLANCE, targetSwipeGlance.current - 0.08);
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                targetSwipeGlance.current = Math.min(MAX_SWIPE_GLANCE, targetSwipeGlance.current + 0.08);
                e.preventDefault();
            }
        }
    }, [scrollSpeed, MAX_SWIPE_GLANCE, completeTutorial]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
        const normalizedY = (e.clientY / window.innerHeight) * 2 - 1;
        lastMousePos.current = { x: normalizedX, y: normalizedY };

        if (!parallaxEnabledRef.current) return;

        targetParallax.current.x = normalizedX * parallaxIntensity;
        targetParallax.current.y = -normalizedY * parallaxIntensity * 0.5;
    }, [parallaxIntensity]);

    const handleTouchStart = useCallback((e: TouchEvent | PointerEvent) => {
        const touch = getTouchPoint(e);
        if (!touch || e.target !== gl.domElement) return;

        touchStart.current.x = touch.clientX;
        touchStart.current.y = touch.clientY;
        touchLastTime.current = performance.now();
        touchDragging.current = false;
        touchMomentum.current = 0;
    }, [gl.domElement]);

    const handleTouchMove = useCallback((e: TouchEvent | PointerEvent) => {
        const touch = getTouchPoint(e);
        if (!touch || e.target !== gl.domElement) return;
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        const distanceX = currentX - touchStart.current.x;
        const distanceY = currentY - touchStart.current.y;

        if (!touchDragging.current && Math.hypot(distanceX, distanceY) < 8) return;
        touchDragging.current = true;

        const deltaX = touchStart.current.x - currentX;
        const deltaY = touchStart.current.y - currentY;
        const now = performance.now();
        const elapsed = Math.max(8, now - touchLastTime.current);

        if (scrollEnabledRef.current) {
            const movement = deltaY * scrollSpeed * 1.5;
            targetZ.current -= movement;
            touchMomentum.current = THREE.MathUtils.clamp(
                movement * 16.67 / elapsed,
                -0.5,
                0.5
            );
            completeTutorial('corridor_explore');
        }

        if (parallaxEnabledRef.current) {
            targetSwipeGlance.current += deltaX * 0.003;

            targetSwipeGlance.current = Math.max(-MAX_SWIPE_GLANCE, Math.min(MAX_SWIPE_GLANCE, targetSwipeGlance.current));
        }

        touchStart.current.x = currentX;
        touchStart.current.y = currentY;
        touchLastTime.current = now;
    }, [gl.domElement, scrollSpeed, MAX_SWIPE_GLANCE, completeTutorial]);

    const handleDeviceOrientation = useCallback((e: DeviceOrientationEvent) => {
        if (!parallaxEnabledRef.current || !useGyroscope.current) return;

        if (e.gamma === null && e.beta === null) return;

        const gamma = e.gamma || 0;
        const beta = e.beta || 0;

        const clampedGamma = Math.max(-45, Math.min(45, gamma));
        const clampedBeta = Math.max(0, Math.min(90, beta)) - 45;

        targetParallax.current.x = (clampedGamma / 45) * parallaxIntensity;
        targetParallax.current.y = -(clampedBeta / 45) * parallaxIntensity * 0.5;
    }, [parallaxIntensity]);

    const requestGyroscopePermission = useCallback(async () => {
        const orientationConstructor = typeof DeviceOrientationEvent !== 'undefined'
            ? DeviceOrientationEvent as typeof DeviceOrientationEvent & {
            requestPermission?: () => Promise<'granted' | 'denied'>;
            }
            : null;
        if (orientationConstructor?.requestPermission) {
            try {
                const permission = await orientationConstructor.requestPermission();
                if (permission === 'granted') {
                    useGyroscope.current = true;
                    window.addEventListener('deviceorientation', handleDeviceOrientation);
                }
            } catch (error) {
            }
        } else {
            useGyroscope.current = true;
            window.addEventListener('deviceorientation', handleDeviceOrientation);
        }
    }, [handleDeviceOrientation]);


    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('keydown', handleKeyDown);

        const scrollObserver = Observer.create({
            target: window,
            type: "wheel,touch,pointer",
            dragMinimum: 8,
            onWheel: (e) => {
                if (e.event instanceof WheelEvent) handleWheel(e.event);
            },
            onPress: (e) => {
                if (e.event instanceof TouchEvent || (e.event instanceof PointerEvent && e.event.pointerType === 'touch')) {
                    handleTouchStart(e.event);
                }
            },
            onDrag: (e) => {
                if (e.event instanceof TouchEvent || (e.event instanceof PointerEvent && e.event.pointerType === 'touch')) {
                    handleTouchMove(e.event);
                }
            },
            onRelease: () => {
                touchDragging.current = false;
            }
        });

        requestGyroscopePermission();

        return () => {
            scrollObserver.kill();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('deviceorientation', handleDeviceOrientation);
        };
    }, [handleWheel, handleMouseMove, handleKeyDown, handleTouchStart, handleTouchMove, handleDeviceOrientation, requestGyroscopePermission]);

    useFrame((_, delta) => {
        if (cameraOverride.current) {
            return;
        }

        // Skip first frame after re-enabling to prevent camera jump
        if (skipFrameAfterEnable.current) {
            skipFrameAfterEnable.current = false;
            return;
        }

        const scrollActive = scrollEnabledRef.current;
        const parallaxActive = parallaxEnabledRef.current;

        if (!scrollActive && !parallaxActive) {
            return;
        }

        if (parallaxActive) {
            const parallaxSmoothing = justEnabled.current ? 0.02 : smoothing * 0.8;
            parallax.current.x = THREE.MathUtils.lerp(parallax.current.x, targetParallax.current.x, parallaxSmoothing);
            parallax.current.y = THREE.MathUtils.lerp(parallax.current.y, targetParallax.current.y, parallaxSmoothing);

            swipeGlance.current = THREE.MathUtils.lerp(swipeGlance.current, targetSwipeGlance.current, 0.08);
        }

        if (justEnabled.current && Math.abs(parallax.current.x - targetParallax.current.x) < 0.01) {
            justEnabled.current = false;
        }

        if (scrollActive) {
            if (Math.abs(touchMomentum.current) > 0.001) {
                targetZ.current -= touchMomentum.current * delta * 60;
                touchMomentum.current *= Math.exp(-5 * delta);
            } else {
                touchMomentum.current = 0;
            }

            currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ.current, smoothing);

            targetGlance.current = calculateGlance(currentZ.current, currentSegment.current);

            const isReleasing = Math.abs(targetGlance.current) < Math.abs(glanceOffset.current);
            const lerpSpeed = isReleasing ? 0.08 : 0.03;

            glanceOffset.current = THREE.MathUtils.lerp(glanceOffset.current, targetGlance.current, lerpSpeed);

            camera.position.z = currentZ.current;
            camera.position.x = parallax.current.x;
            camera.position.y = 0.2 + parallax.current.y;

            const lookX = parallax.current.x * 0.3 + glanceOffset.current * 3 + swipeGlance.current * 4;

            if (blendInFrames.current > 0) {
                camera.lookAt(lookX, 0.13 + parallax.current.y, currentZ.current - 10);
                const targetRotation = {
                    x: camera.rotation.x,
                    y: camera.rotation.y,
                    z: camera.rotation.z
                };

                const blendFactor = 1 - (blendInFrames.current / 30);

                camera.rotation.x = THREE.MathUtils.lerp(savedRotation.current.x, targetRotation.x, blendFactor);
                camera.rotation.y = THREE.MathUtils.lerp(savedRotation.current.y, targetRotation.y, blendFactor);
                camera.rotation.z = THREE.MathUtils.lerp(savedRotation.current.z, targetRotation.z, blendFactor);

                blendInFrames.current--;
            } else {
                camera.lookAt(lookX, 0.13 + parallax.current.y, currentZ.current - 10);
            }

            const segment = Math.floor((10 - currentZ.current) / segmentLength);
            if (segment !== currentSegment.current) {
                currentSegment.current = segment;
            }
        } else if (parallaxActive) {
            camera.position.x = parallax.current.x;
            camera.position.y = 0.2 + parallax.current.y;

            const lookX = parallax.current.x * 0.3 + swipeGlance.current * 4;
            camera.lookAt(lookX, 0.13 + parallax.current.y, camera.position.z - 10);
        }
    });

    const calculateGlance = useCallback((z: number, segment: number) => {
        const zOffset = 10 - (segment * segmentLength);
        let bestStrength = 0;
        let bestDir = 0;

        const START_DIST = 15;
        const PEAK_DIST = 8;
        const END_DIST = -2;

        for (const door of DOOR_POSITIONS) {
            const doorGlobalZ = zOffset + door.z;
            const dist = z - doorGlobalZ;

            let strength = 0;
            if (dist > PEAK_DIST && dist < START_DIST) {
                strength = (START_DIST - dist) / (START_DIST - PEAK_DIST);
            } else if (dist <= PEAK_DIST && dist > END_DIST) {
                strength = (dist - END_DIST) / (PEAK_DIST - END_DIST);
            }

            if (strength > 0) {
                const easedStrength = strength * (2 - strength);
                const dir = door.side === 'left' ? -1 : 1;
                if (easedStrength > bestStrength) {
                    bestStrength = easedStrength;
                    bestDir = dir;
                }
            }
        }

        return bestDir * bestStrength * glanceIntensity * 3.5;
    }, [segmentLength, glanceIntensity]);

    const setCameraOverride = useCallback((active: boolean) => {
        cameraOverride.current = active;
        if (active) touchMomentum.current = 0;
        if (!active) {
            const z = camera.position.z;
            targetZ.current = z;
            currentZ.current = z;

            const initSegment = Math.floor((10 - z) / segmentLength);
            currentSegment.current = initSegment;

            parallax.current = { x: camera.position.x, y: camera.position.y - 0.2 };
            targetParallax.current = { x: camera.position.x, y: camera.position.y - 0.2 };

            const initialGlance = calculateGlance(z, initSegment);



            const currentRotationY = camera.rotation.y;
            const parallaxContribution = parallax.current.x * 0.3;
            const derivedGlance = (currentRotationY - parallaxContribution) / 3;

            const diff = Math.abs(derivedGlance - initialGlance);

            if (diff > 0.02) {
                glanceOffset.current = derivedGlance;
                targetGlance.current = initialGlance;
            } else {
                glanceOffset.current = initialGlance;
                targetGlance.current = initialGlance;
            }

            // Skip the first frame to prevent camera jump
            // This ensures useFrame doesn't immediately override exit animation position
            skipFrameAfterEnable.current = true;

            swipeGlance.current = 0;
            targetSwipeGlance.current = 0;
        }
    }, [camera, calculateGlance, segmentLength]);

    return {
        getCurrentSegment: () => currentSegment.current,
        getCameraZ: () => currentZ.current,
        setCameraOverride,
        requestGyroscopePermission
    };
};

export default useInfiniteCamera;
