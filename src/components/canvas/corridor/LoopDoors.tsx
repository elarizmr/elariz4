import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

const LoopDoors = ({
    position = [0, 0, -70],
    corridorHeight = 3.5,
    onLoopTriggered
}: {
    position?: [number, number, number];
    corridorHeight?: number;
    onLoopTriggered?: () => void;
}) => {
    const leftDoorRef = useRef<THREE.Group>(null);
    const rightDoorRef = useRef<THREE.Group>(null);
    const isOpenRef = useRef(false);
    const hasTriggeredRef = useRef(false);
    const { camera } = useThree();

    const doorWidth = 1.2;
    const doorHeight = corridorHeight - 0.4;
    const triggerDistance = 8;
    const loopDistance = 3;

    useFrame(() => {
        if (!leftDoorRef.current || !rightDoorRef.current) return;

        const distance = camera.position.z - position[2];

        if (distance < triggerDistance && distance > loopDistance && !isOpenRef.current) {
            isOpenRef.current = true;

            gsap.to(leftDoorRef.current.rotation, {
                y: -Math.PI * 0.6,
                duration: 1.2,
                ease: 'power2.out'
            });
            gsap.to(rightDoorRef.current.rotation, {
                y: Math.PI * 0.6,
                duration: 1.2,
                ease: 'power2.out'
            });
        }

        if (distance < loopDistance && !hasTriggeredRef.current && isOpenRef.current) {
            hasTriggeredRef.current = true;
            onLoopTriggered?.();

            setTimeout(() => {
                hasTriggeredRef.current = false;
                isOpenRef.current = false;

                if (leftDoorRef.current && rightDoorRef.current) {
                    leftDoorRef.current.rotation.y = 0;
                    rightDoorRef.current.rotation.y = 0;
                }
            }, 500);
        }
    });

    return (
        <group position={position}>
            <mesh position={[0, doorHeight / 2 + 0.15, 0]}>
                <boxGeometry args={[doorWidth * 2 + 0.3, 0.15, 0.15]} />
                <meshBasicMaterial color="#2a2a2a" />
            </mesh>

            <mesh position={[-doorWidth - 0.08, 0, 0]}>
                <boxGeometry args={[0.12, doorHeight + 0.3, 0.15]} />
                <meshBasicMaterial color="#2a2a2a" />
            </mesh>

            <mesh position={[doorWidth + 0.08, 0, 0]}>
                <boxGeometry args={[0.12, doorHeight + 0.3, 0.15]} />
                <meshBasicMaterial color="#2a2a2a" />
            </mesh>

            <group
                ref={leftDoorRef}
                position={[-doorWidth, 0, 0]}
            >
                <mesh position={[doorWidth / 2, 0, 0.05]}>
                    <boxGeometry args={[doorWidth, doorHeight, 0.08]} />
                    <meshBasicMaterial color="#f0ebe0" />
                </mesh>

                <mesh position={[doorWidth / 2, 0.3, 0.1]}>
                    <planeGeometry args={[doorWidth * 0.7, doorHeight * 0.35]} />
                    <meshBasicMaterial color="#e8e3d8" />
                </mesh>
                <mesh position={[doorWidth / 2, -0.4, 0.1]}>
                    <planeGeometry args={[doorWidth * 0.7, doorHeight * 0.35]} />
                    <meshBasicMaterial color="#e8e3d8" />
                </mesh>

                <mesh position={[doorWidth - 0.15, 0, 0.12]}>
                    <sphereGeometry args={[0.05, 12, 12]} />
                    <meshBasicMaterial color="#333" />
                </mesh>
            </group>

            <group
                ref={rightDoorRef}
                position={[doorWidth, 0, 0]}
            >
                <mesh position={[-doorWidth / 2, 0, 0.05]}>
                    <boxGeometry args={[doorWidth, doorHeight, 0.08]} />
                    <meshBasicMaterial color="#f0ebe0" />
                </mesh>

                <mesh position={[-doorWidth / 2, 0.3, 0.1]}>
                    <planeGeometry args={[doorWidth * 0.7, doorHeight * 0.35]} />
                    <meshBasicMaterial color="#e8e3d8" />
                </mesh>
                <mesh position={[-doorWidth / 2, -0.4, 0.1]}>
                    <planeGeometry args={[doorWidth * 0.7, doorHeight * 0.35]} />
                    <meshBasicMaterial color="#e8e3d8" />
                </mesh>

                <mesh position={[-doorWidth + 0.15, 0, 0.12]}>
                    <sphereGeometry args={[0.05, 12, 12]} />
                    <meshBasicMaterial color="#333" />
                </mesh>
            </group>

        </group>
    );
};

export default LoopDoors;
