import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';

interface ParallaxOptions {
    sensitivity?: number;
    smoothing?: number;
    enableDeviceOrientation?: boolean;
}

const useParallax = ({
    sensitivity = 0.5,
    smoothing = 0.1,
    enableDeviceOrientation = true
}: ParallaxOptions = {}) => {
    const [parallax, setParallax] = useState({ x: 0, y: 0 });
    const targetRef = useRef({ x: 0, y: 0 });
    const currentRef = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number | null>(null);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const x = ((e.clientX / window.innerWidth) * 2 - 1) * sensitivity;
        const y = ((e.clientY / window.innerHeight) * 2 - 1) * sensitivity;

        targetRef.current = { x, y };
    }, [sensitivity]);

    const handleDeviceOrientation = useCallback((e: DeviceOrientationEvent) => {
        if (!e.gamma || !e.beta) return;

        const x = THREE.MathUtils.clamp(e.gamma / 45, -1, 1) * sensitivity;
        const y = THREE.MathUtils.clamp((e.beta - 45) / 45, -1, 1) * sensitivity;

        targetRef.current = { x, y };
    }, [sensitivity]);

    useEffect(() => {
        const animate = () => {
            currentRef.current.x = THREE.MathUtils.lerp(
                currentRef.current.x,
                targetRef.current.x,
                smoothing
            );
            currentRef.current.y = THREE.MathUtils.lerp(
                currentRef.current.y,
                targetRef.current.y,
                smoothing
            );

            setParallax({
                x: currentRef.current.x,
                y: currentRef.current.y
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [smoothing]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);

        let orientationSupported = false;

        if (enableDeviceOrientation && window.DeviceOrientationEvent) {
            const orientationConstructor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
                requestPermission?: () => Promise<'granted' | 'denied'>;
            };
            if (typeof orientationConstructor.requestPermission === 'function') {
            } else {
                window.addEventListener('deviceorientation', handleDeviceOrientation);
                orientationSupported = true;
            }
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (orientationSupported) {
                window.removeEventListener('deviceorientation', handleDeviceOrientation);
            }
        };
    }, [handleMouseMove, handleDeviceOrientation, enableDeviceOrientation]);

    return parallax;
};

export default useParallax;
