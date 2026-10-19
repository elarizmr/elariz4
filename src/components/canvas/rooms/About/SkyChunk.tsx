import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSafeTexture } from '../../../../utils/safeTextureLoader';

const CHUNK_LENGTH = 40;
const CHUNK_WIDTH = 20;
const CHUNK_HEIGHT = 12;

const CORRIDOR_CLIP_Z = -8.0;

const ROOM_Z = -25;

const CLOUD_TEXTURES = [
    '/textures/clouds/1131c3eb-dfae-423f-924b-ff39d8ccd6dc.webp',
    '/textures/clouds/254b8ec8-d6f7-4275-956f-7bab65b2ce2d.webp',
    '/textures/clouds/2cc88dd1-483c-466d-b07e-f8308c61ccbe.webp',
    '/textures/clouds/5606fcc0-3252-447d-a58a-7bcbac73229a.webp',
    '/textures/clouds/7882dc72-3d01-41fb-ac0e-d07b0184ebc1.webp',
    '/textures/clouds/9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35.webp',
    '/textures/clouds/c83293c6-d90c-4a32-8d9d-5ac9af7e2296.webp',
    '/textures/clouds/f6e358bc-d27c-41dd-95f4-6787a835c41e.webp',
];

type Vec3 = [number, number, number];
type ScrollProgressRef = { current: number };
interface CloudConfig {
    id: string;
    position: Vec3;
    scale: number;
    baseOpacity: number;
    textureIndex: number;
    driftSpeed: number;
    driftAmount: number;
    bobAmount: number;
    timeOffset: number;
}
interface SkyChunkProps {
    chunkIndex?: number;
    seed?: number;
    scrollProgressRef: ScrollProgressRef;
}

const SkyChunk = ({ chunkIndex = 0, seed = 0, scrollProgressRef }: SkyChunkProps) => {
    const zOffset = -(chunkIndex * CHUNK_LENGTH) - 15;

    const clouds = useMemo(() => {
        const items: CloudConfig[] = [];
        const random = seededRandom(seed + chunkIndex * 1000);
        const cloudCount = 15 + Math.floor(random() * 8);

        for (let i = 0; i < cloudCount; i++) {
            const x = (random() - 0.5) * CHUNK_WIDTH;
            const y = (random() - 0.5) * CHUNK_HEIGHT;
            const z = zOffset - (random() * CHUNK_LENGTH);

            items.push({
                id: `${chunkIndex}-${i}`,
                position: [x, y, z],
                scale: 0.8 + random() * 1.5,
                baseOpacity: 0.5 + random() * 0.4,
                textureIndex: Math.floor(random() * CLOUD_TEXTURES.length),
                driftSpeed: 0.3 + random() * 0.4,
                driftAmount: 0.5 + random() * 1.0,
                bobAmount: 0.1 + random() * 0.2,
                timeOffset: random() * Math.PI * 2,
            });
        }

        return items;
    }, [chunkIndex, seed, zOffset]);

    return (
        <group>
            {clouds.map((cloud) => (
                <Cloud
                    key={cloud.id}
                    position={cloud.position}
                    scale={cloud.scale}
                    baseOpacity={cloud.baseOpacity}
                    textureIndex={cloud.textureIndex}
                    driftSpeed={cloud.driftSpeed}
                    driftAmount={cloud.driftAmount}
                    bobAmount={cloud.bobAmount}
                    timeOffset={cloud.timeOffset}
                    scrollProgressRef={scrollProgressRef}
                />
            ))}
        </group>
    );
};

const Cloud = ({
    position,
    scale,
    baseOpacity,
    textureIndex,
    driftSpeed = 0.5,
    driftAmount = 0.8,
    bobAmount = 0.15,
    timeOffset = 0,
    scrollProgressRef
}: Omit<CloudConfig, 'id'> & { scrollProgressRef: ScrollProgressRef }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);
    const { camera } = useThree();

    const basePosition = useRef(position);

    const texture = useSafeTexture(CLOUD_TEXTURES[textureIndex]);

    const legacyCloudAspects: Record<string, number> = {
        '1131c3eb-dfae-423f-924b-ff39d8ccd6dc.webp': 1.894,
        '254b8ec8-d6f7-4275-956f-7bab65b2ce2d.webp': 2.459,
        '2cc88dd1-483c-466d-b07e-f8308c61ccbe.webp': 3.577,
        '5606fcc0-3252-447d-a58a-7bcbac73229a.webp': 1.794,
        '7882dc72-3d01-41fb-ac0e-d07b0184ebc1.webp': 1.997,
        '9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35.webp': 1.905,
        'c83293c6-d90c-4a32-8d9d-5ac9af7e2296.webp': 3,
        'f6e358bc-d27c-41dd-95f4-6787a835c41e.webp': 1.875
    };

    const cloudFile = CLOUD_TEXTURES[textureIndex].split('/').pop() ?? '';
    const aspectRatio = legacyCloudAspects[cloudFile] || 1.8;
    const width = 3 * scale;
    const height = width / aspectRatio;

    useFrame((state) => {
        if (!meshRef.current) return;

        const time = state.clock.elapsedTime;

        const scrollProgress = scrollProgressRef?.current || 0;
        const cloudLocalZ = basePosition.current[2];
        const worldZ = ROOM_Z + scrollProgress + cloudLocalZ;

        // As clouds get closer to the camera, they move aside to keep the center clear
        const evasionStart = -60;
        const evasionEnd = -10;
        let evasionFactor = 0;

        if (worldZ > evasionStart && worldZ < evasionEnd) {
            evasionFactor = (worldZ - evasionStart) / (evasionEnd - evasionStart);
            evasionFactor = evasionFactor * evasionFactor * (3 - 2 * evasionFactor);
        } else if (worldZ >= evasionEnd) {
            evasionFactor = 1;
        }

        const dirX = basePosition.current[0] >= 0 ? 1 : -1;
        const maxEvasion = 15;
        const evasionX = evasionFactor * maxEvasion * dirX;

        const driftX = Math.sin(time * driftSpeed + timeOffset) * driftAmount;
        const driftY = Math.sin(time * driftSpeed * 0.7 + timeOffset + 1.5) * bobAmount;

        meshRef.current.position.x = basePosition.current[0] + driftX + evasionX;
        meshRef.current.position.y = basePosition.current[1] + driftY;
        meshRef.current.position.z = basePosition.current[2];

        if (materialRef.current) {
            materialRef.current.opacity = worldZ > CORRIDOR_CLIP_Z ? 0 : baseOpacity;
        }

        const offsetRotation = new THREE.Euler(0, -Math.PI / 3, 0);
        const offsetQuaternion = new THREE.Quaternion().setFromEuler(offsetRotation);
        meshRef.current.quaternion.copy(camera.quaternion).multiply(offsetQuaternion);
    });

    return (
        <mesh ref={meshRef} position={position}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial color="#e0e0e0"
                ref={materialRef}
                map={texture}
                transparent
                opacity={baseOpacity}
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

function seededRandom(seed: number) {
    let s = seed;
    return function () {
        s = Math.sin(s * 9999) * 10000;
        return s - Math.floor(s);
    };
}

export { CHUNK_LENGTH, CORRIDOR_CLIP_Z, ROOM_Z };
export default SkyChunk;
