import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSafeTexture } from '../../../utils/safeTextureLoader';
import * as THREE from 'three';

interface TunnelProps {
    parallax?: { x: number; y: number };
}

const Tunnel = ({ parallax = { x: 0, y: 0 } }: TunnelProps) => {
    const meshRef = useRef<THREE.Mesh>(null);

    const paperTexture = useSafeTexture('/textures/paper-texture.webp');

    useMemo(() => {
        paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set(3, 6);
        paperTexture.colorSpace = THREE.SRGBColorSpace;
    }, [paperTexture]);

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        const targetRotationZ = parallax.x * 0.08;
        const targetRotationX = Math.PI / 2 + parallax.y * 0.04;

        meshRef.current.rotation.z = THREE.MathUtils.lerp(
            meshRef.current.rotation.z,
            targetRotationZ,
            delta * 2
        );
        meshRef.current.rotation.x = THREE.MathUtils.lerp(
            meshRef.current.rotation.x,
            targetRotationX,
            delta * 2
        );
    });

    return (
        <mesh
            ref={meshRef}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, -15]}
        >
            <cylinderGeometry args={[10, 10, 40, 64, 1, true]} />
            <meshBasicMaterial
                map={paperTexture}
                side={THREE.BackSide}
                color="#e0e0e0"
            />
        </mesh>
    );
};

export default Tunnel;
