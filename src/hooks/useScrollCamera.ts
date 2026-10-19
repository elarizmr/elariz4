import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ScrollCameraOptions {
    minZ?: number;
    maxZ?: number;
    speed?: number;
    smoothing?: number;
}

const useScrollCamera = ({
    minZ = 8,
    maxZ = -15,
    speed = 0.03,
    smoothing = 0.08
}: ScrollCameraOptions = {}) => {
    const { camera } = useThree();
    const targetZ = useRef(minZ);
    const currentZ = useRef(minZ);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();

        const delta = e.deltaY * speed;
        targetZ.current = THREE.MathUtils.clamp(
            targetZ.current - delta,
            maxZ,
            minZ
        );
    }, [speed, minZ, maxZ]);

    useEffect(() => {
        window.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            window.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]);

    useFrame(() => {
        currentZ.current = THREE.MathUtils.lerp(
            currentZ.current,
            targetZ.current,
            smoothing
        );

        camera.position.z = currentZ.current;
    });

    const getProgress = useCallback(() => {
        return (minZ - currentZ.current) / (minZ - maxZ);
    }, [minZ, maxZ]);

    return { getProgress };
};

export default useScrollCamera;
