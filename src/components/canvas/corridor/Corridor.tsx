import { useMemo } from 'react';
import * as THREE from 'three';
import { useSafeTexture } from '../../../utils/safeTextureLoader';

interface CorridorProps {
    length?: number;
}

interface SketchDecorationsProps {
    corridorWidth: number;
    corridorHeight: number;
    length: number;
    zOffset: number;
}

interface SketchMarksProps {
    corridorWidth: number;
    zOffset: number;
    length: number;
}

const Corridor = ({ length = 100 }: CorridorProps) => {
    const corridorWidth = 4;
    const corridorHeight = 3.5;

    const paperTexture = useSafeTexture('/textures/paper-texture.webp');

    useMemo(() => {
        paperTexture.wrapS = paperTexture.wrapT = THREE.RepeatWrapping;
        paperTexture.colorSpace = THREE.SRGBColorSpace;
    }, [paperTexture]);

    const zOffset = -length / 2 + 5;

    return (
        <group>
            <mesh
                position={[0, -corridorHeight / 2, zOffset]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[corridorWidth, length]} />
                <meshBasicMaterial
                    color="#f5f2eb"
                />
            </mesh>

            <gridHelper
                args={[length, length * 2, '#d0d0d0', '#e5e5e5']}
                position={[0, -corridorHeight / 2 + 0.01, zOffset]}
                rotation={[0, Math.PI / 2, 0]}
            />

            <mesh
                position={[0, corridorHeight / 2, zOffset]}
                rotation={[Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[corridorWidth, length]} />
                <meshBasicMaterial
                    color="#fefefe"
                />
            </mesh>

            <mesh
                position={[-corridorWidth / 2, 0, zOffset]}
                rotation={[0, Math.PI / 2, 0]}
            >
                <planeGeometry args={[length, corridorHeight]} />
                <meshBasicMaterial
                    color="#faf8f5"
                />
            </mesh>

            <mesh
                position={[corridorWidth / 2, 0, zOffset]}
                rotation={[0, -Math.PI / 2, 0]}
            >
                <planeGeometry args={[length, corridorHeight]} />
                <meshBasicMaterial
                    color="#faf8f5"
                />
            </mesh>

            <SketchDecorations
                corridorWidth={corridorWidth}
                corridorHeight={corridorHeight}
                length={length}
                zOffset={zOffset}
            />

            <mesh position={[0, 0, zOffset - length / 2 + 0.5]}>
                <planeGeometry args={[corridorWidth, corridorHeight]} />
                <meshBasicMaterial color="#f0ede8" />
            </mesh>
        </group>
    );
};

const SketchDecorations = ({ corridorWidth, corridorHeight, length, zOffset }: SketchDecorationsProps) => {
    const wallLines = useMemo(() => {
        const lines = [];
        for (let z = -5; z > -length + 10; z -= 12) {
            lines.push(z + zOffset + length / 2);
        }
        return lines;
    }, [length, zOffset]);

    return (
        <group>
            <mesh position={[-corridorWidth / 2 + 0.01, -corridorHeight / 2 + 0.08, zOffset]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[length, 0.06]} />
                <meshBasicMaterial color="#ccc" side={2} />
            </mesh>
            <mesh position={[corridorWidth / 2 - 0.01, -corridorHeight / 2 + 0.08, zOffset]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[length, 0.06]} />
                <meshBasicMaterial color="#ccc" side={2} />
            </mesh>

            <mesh position={[-corridorWidth / 2 + 0.01, corridorHeight / 2 - 0.05, zOffset]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[length, 0.04]} />
                <meshBasicMaterial color="#ddd" side={2} />
            </mesh>
            <mesh position={[corridorWidth / 2 - 0.01, corridorHeight / 2 - 0.05, zOffset]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[length, 0.04]} />
                <meshBasicMaterial color="#ddd" side={2} />
            </mesh>

            {wallLines.map((z, i) => (
                <group key={i}>
                    <mesh position={[-corridorWidth / 2 + 0.01, 0, z]}>
                        <planeGeometry args={[0.015, corridorHeight * 0.6]} />
                        <meshBasicMaterial color="#e0e0e0" side={2} />
                    </mesh>
                    <mesh position={[corridorWidth / 2 - 0.01, 0, z]}>
                        <planeGeometry args={[0.015, corridorHeight * 0.6]} />
                        <meshBasicMaterial color="#e0e0e0" side={2} />
                    </mesh>
                </group>
            ))}

            <SketchMarks corridorWidth={corridorWidth} zOffset={zOffset} length={length} />
        </group>
    );
};

const SketchMarks = ({ corridorWidth, zOffset, length }: SketchMarksProps) => {
    const marks = useMemo(() => {
        const m = [];
        for (let i = 0; i < 15; i++) {
            m.push({
                x: Math.random() > 0.5 ? -corridorWidth / 2 + 0.02 : corridorWidth / 2 - 0.02,
                y: (Math.random() - 0.5) * 2,
                z: zOffset + length / 2 - Math.random() * (length - 10),
                rotation: (Math.random() - 0.5) * 0.5,
                width: 0.05 + Math.random() * 0.1,
                opacity: 0.1 + Math.random() * 0.15
            });
        }
        return m;
    }, [corridorWidth, zOffset, length]);

    return (
        <group>
            {marks.map((mark, i) => (
                <mesh
                    key={i}
                    position={[mark.x, mark.y, mark.z]}
                    rotation={[0, mark.x < 0 ? Math.PI / 2 : -Math.PI / 2, mark.rotation]}
                >
                    <planeGeometry args={[mark.width, 0.008]} />
                    <meshBasicMaterial color="#999" transparent opacity={mark.opacity} side={2} />
                </mesh>
            ))}
        </group>
    );
};

export default Corridor;
