import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';

interface PaperAirplaneProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
    color?: THREE.ColorRepresentation;
}

const PaperAirplane = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, color = '#f5f5f5' }: PaperAirplaneProps) => {
    const meshRef = useRef<THREE.Mesh>(null);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();

        const vertices = new Float32Array([
            0, 0, -1.5,

            -1.2, 0.05, 0.3,
            1.2, 0.05, 0.3,

            0, 0.15, -0.5,
            0, 0.12, 0.5,

            -0.3, 0.08, 0.8,
            0.3, 0.08, 0.8,
            0, 0.1, 0.6,

            0, -0.02, -1.5,
            -1.2, -0.02, 0.3,
            1.2, -0.02, 0.3,
            0, 0, 0.5,
        ]);

        const indices = [
            0, 1, 3,
            1, 4, 3,
            1, 5, 4,
            5, 7, 4,

            0, 3, 2,
            3, 4, 2,
            4, 6, 2,
            4, 7, 6,

            8, 11, 9,

            8, 10, 11,

            0, 8, 1,
            8, 9, 1,
            1, 9, 5,

            0, 2, 8,
            8, 2, 10,
            2, 6, 10,

            5, 9, 11,
            5, 11, 7,
            6, 7, 11,
            6, 11, 10,
        ];

        geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        return geo;
    }, []);

    return (
        <group position={position} rotation={rotation} scale={scale}>
            <mesh ref={meshRef} geometry={geometry}>
                <meshBasicMaterial
                    color={color}
                    side={THREE.DoubleSide}
                />
                <Edges
                    linewidth={2}
                    threshold={15}
                    color="#888888"
                />
            </mesh>

            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[new Float32Array([
                            0, 0, -1.5,
                            0, 0.15, -0.5,
                            0, 0.12, 0.5,
                            0, 0.1, 0.6
                        ]), 3]}
                    />
                </bufferGeometry>
                <lineBasicMaterial color="#888888" linewidth={2} />
            </line>
        </group>
    );
};

export default PaperAirplane;
