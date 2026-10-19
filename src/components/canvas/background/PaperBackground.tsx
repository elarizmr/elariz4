import { useMemo } from 'react';
import { useSafeTexture } from '../../../utils/safeTextureLoader';
import * as THREE from 'three';

const PaperBackground = () => {
    const paperTexture = useSafeTexture('/textures/paper-texture.webp');

    useMemo(() => {
        paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.repeat.set(2, 2);
        paperTexture.colorSpace = THREE.SRGBColorSpace;
    }, [paperTexture]);

    return (
        <group>
            <mesh position={[0, 0, -8]}>
                <planeGeometry args={[25, 18]} />
                <meshBasicMaterial
                    map={paperTexture}
                    color="#fafafa"
                />
            </mesh>

            <mesh position={[0, -2.5, -2]} rotation={[-Math.PI / 2.5, 0, 0]}>
                <planeGeometry args={[20, 15]} />
                <meshBasicMaterial
                    color="#f5f5f5"
                    transparent
                    opacity={0.9}
                />
            </mesh>

            <GridLines />

            <VignetteCorners />
        </group>
    );
};

const GridLines = () => {
    const lines = useMemo(() => {
        const result: { position: [number, number, number]; width: number; opacity: number }[] = [];
        for (let i = -5; i <= 5; i++) {
            result.push({
                position: [0, -2.5 + i * 0.02, -2 - i * 0.8],
                width: 15,
                opacity: 0.15 - Math.abs(i) * 0.01
            });
        }
        return result;
    }, []);

    return (
        <group>
            {lines.map((line, i) => (
                <mesh
                    key={i}
                    position={line.position}
                    rotation={[-Math.PI / 2.5, 0, 0]}
                >
                    <planeGeometry args={[line.width, 0.01]} />
                    <meshBasicMaterial
                        color="#cccccc"
                        transparent
                        opacity={line.opacity}
                    />
                </mesh>
            ))}
        </group>
    );
};

const VignetteCorners = () => {
    return (
        <group>
            <mesh position={[-6, 4, 0]}>
                <circleGeometry args={[3, 32]} />
                <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={0.03}
                />
            </mesh>
            <mesh position={[6, 4, 0]}>
                <circleGeometry args={[3, 32]} />
                <meshBasicMaterial
                    color="#000000"
                    transparent
                    opacity={0.03}
                />
            </mesh>
        </group>
    );
};

export default PaperBackground;
