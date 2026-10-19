import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSafeTexture } from '../../../utils/safeTextureLoader';

interface AvatarProps {
    position?: [number, number, number];
}

const Avatar = ({ position = [10, -20, 30] }: AvatarProps) => {
    const meshRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null);
    const groupRef = useRef<THREE.Group>(null);
    const [dimensions, setDimensions] = useState({ width: 1.2, height: 2.4 });
    const { camera } = useThree();

    const dodgeX = useRef(0);
    const targetDodgeX = useRef(0);
    const worldPosVec = useRef(new THREE.Vector3());

    const TOTAL_FRAMES = 9;
    const framePaths = Array.from({ length: TOTAL_FRAMES }, (_, i) => `/textures/corridor/avatar_anim/${i + 1}.webp`);

    const textures = useSafeTexture(framePaths);

    const currentFrame = useRef(0);
    const isReversing = useRef(false);
    const frameTimer = useRef(0);

    useEffect(() => {
        textures.forEach((tex) => tex.colorSpace = THREE.SRGBColorSpace);

        const image = textures[0]?.image;
        if (image && typeof image === 'object' && 'width' in image && 'height' in image
            && typeof image.width === 'number' && typeof image.height === 'number') {
            const aspectRatio = image.width / image.height;
            const baseHeight = 2.3;
            setDimensions({
                width: baseHeight * aspectRatio,
                height: baseHeight
            });
        }

        // Set initial texture to avoid white flash, but don't bind it declaratively
        // to prevent React from overwriting our useFrame mutations
        if (meshRef.current && textures[currentFrame.current]) {
            meshRef.current.material.map = textures[currentFrame.current];
            meshRef.current.material.needsUpdate = true;
        }
    }, [textures]);

    useFrame((state, delta) => {
        if (!groupRef.current || !meshRef.current) return;

        groupRef.current.getWorldPosition(worldPosVec.current);
        const distance = camera.position.z - worldPosVec.current.z;

        const DODGE_START = 3;
        const DODGE_PEAK = 0;
        const DODGE_END = -2;
        const DODGE_AMOUNT = -1.5;

        if (distance > DODGE_PEAK && distance < DODGE_START) {
            const t = (DODGE_START - distance) / (DODGE_START - DODGE_PEAK);
            targetDodgeX.current = DODGE_AMOUNT * easeOutQuad(t);
        } else if (distance <= DODGE_PEAK && distance > DODGE_END) {
            const t = (distance - DODGE_END) / (DODGE_PEAK - DODGE_END);
            targetDodgeX.current = DODGE_AMOUNT * easeOutQuad(t);
        } else {
            targetDodgeX.current = 0;
        }

        dodgeX.current = THREE.MathUtils.lerp(dodgeX.current, targetDodgeX.current, 0.08);

        groupRef.current.position.x = position[0] + dodgeX.current;
        groupRef.current.position.y = position[1];

        const FPS = 20;
        const frameDuration = 1 / FPS;

        frameTimer.current += delta;

        if (frameTimer.current >= frameDuration) {
            frameTimer.current = 0;

            if (currentFrame.current >= TOTAL_FRAMES - 1) {
                isReversing.current = true;
            }
            else if (currentFrame.current <= 0) {
                isReversing.current = false;
            }

            if (isReversing.current) {
                currentFrame.current -= 1;
            } else {
                currentFrame.current += 1;
            }

            const safeIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, currentFrame.current));

            meshRef.current.material.map = textures[safeIndex];
            meshRef.current.material.needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef} position={position}>
            <mesh ref={meshRef}>
                <planeGeometry args={[dimensions.width, dimensions.height]} />
                <meshBasicMaterial color="#ffffff"
                    transparent={true}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
};

const easeOutQuad = (t: number) => t * (2 - t);

export default Avatar;
