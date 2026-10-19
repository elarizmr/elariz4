import { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MouseParallaxOptions {
    intensity?: number;
    smoothing?: number;
}

const useMouseParallax = ({
    intensity = 0.5,
    smoothing = 0.05
}: MouseParallaxOptions = {}) => {
    const { camera } = useThree();
    const mouse = useRef({ x: 0, y: 0 });
    const target = useRef({ x: 0, y: 0 });
    const basePosition = useRef({ x: 0, y: 0.2 });

    useEffect(() => {
        basePosition.current = { x: camera.position.x, y: camera.position.y };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [camera]);

    useFrame(() => {
        target.current.x = THREE.MathUtils.lerp(
            target.current.x,
            mouse.current.x * intensity,
            smoothing
        );
        target.current.y = THREE.MathUtils.lerp(
            target.current.y,
            mouse.current.y * intensity * 0.6,
            smoothing
        );

        camera.position.x = basePosition.current.x + target.current.x;
        camera.position.y = basePosition.current.y + target.current.y;

        camera.lookAt(0, 0, 0);
    });

    return { mouse: mouse.current, target: target.current };
};

export default useMouseParallax;
