import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePerformance } from '../../../context/PerformanceContext';
import { useSafeTexture } from '../../../utils/safeTextureLoader';

const Doodles = () => {
    const groupRef = useRef<THREE.Group>(null);
    const { tier } = usePerformance();
    const isLowTier = tier === 'LOW';

    const textures = useSafeTexture({
        paperBall: '/textures/corridor/decorations/paper_ball.webp',
        paperAirplane: '/textures/corridor/decorations/paper_airplane.webp',
        pencil: '/textures/corridor/decorations/pencil.webp',
        coffeeCup: '/textures/corridor/decorations/coffee_cup.webp',
    });

    Object.values(textures).forEach(tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
    });

    return (
        <group ref={groupRef}>
            <SketchElement
                texture={textures.paperAirplane}
                position={[0.5, 0.8, 0.3]}
                scale={0.55}
                rotationSpeed={0.15}
                floatSpeed={0.7}
                floatAmount={0.04}
            />

            <SketchElement
                texture={textures.paperBall}
                position={[-0.9, -0.7, 0.4]}
                scale={0.4}
                rotationSpeed={0.4}
                floatSpeed={0.5}
                floatAmount={0.02}
            />

            <SketchElement
                texture={textures.paperBall}
                position={[-1.3, 0.5, -0.2]}
                scale={0.3}
                rotationSpeed={-0.3}
                floatSpeed={0.6}
                floatAmount={0.03}
            />

            <SketchElement
                texture={textures.pencil}
                position={[0.7, -0.8, 0.5]}
                scale={0.5}
                rotationSpeed={0.1}
                floatSpeed={0.4}
                floatAmount={0.02}
                initialRotation={-0.4}
            />

            <SketchElement
                texture={textures.coffeeCup}
                position={[1.2, 0.6, -0.1]}
                scale={0.35}
                rotationSpeed={0.05}
                floatSpeed={0.35}
                floatAmount={0.025}
            />

            {!isLowTier && (
                <>
                    <AnimatedStar position={[-1.5, 1.2, 0]} scale={0.1} speed={0.4} />
                    <AnimatedStar position={[1.6, 0.8, -0.5]} scale={0.08} speed={0.5} />
                    <AnimatedStar position={[-1.2, 0.1, 0.5]} scale={0.06} speed={0.3} />
                    <AnimatedStar position={[1.3, 1.4, -1]} scale={0.07} speed={0.6} />

                    <DoodleCircle position={[1.2, -0.2, 0.2]} scale={0.05} />
                    <DoodleCircle position={[-1.3, 1.0, 0.3]} scale={0.04} />

                    <Squiggle position={[-1.6, 0.5, -0.3]} rotation={0.2} />
                    <Squiggle position={[1.4, 0.3, 0.2]} rotation={-0.3} />

                    <ThoughtBubble position={[0.9, 0.7, 0.5]} />
                </>
            )}
        </group>
    );
};

interface PositionedDoodleProps {
    position: [number, number, number];
}

interface SketchElementProps extends PositionedDoodleProps {
    texture: THREE.Texture;
    scale?: number;
    rotationSpeed?: number;
    floatSpeed?: number;
    floatAmount?: number;
    initialRotation?: number;
}

const SketchElement = ({
    texture,
    position,
    scale = 0.3,
    rotationSpeed = 0.1,
    floatSpeed = 0.5,
    floatAmount = 0.03,
    initialRotation = 0
}: SketchElementProps) => {
    const ref = useRef<THREE.Group>(null);
    const [dimensions, setDimensions] = useState({ width: 1, height: 1 });

    useEffect(() => {
        const image = texture.image;
        if (image && typeof image === 'object' && 'width' in image && 'height' in image
            && typeof image.width === 'number' && typeof image.height === 'number') {
            const aspectRatio = image.width / image.height;
            setDimensions({
                width: scale * aspectRatio,
                height: scale
            });
        }
    }, [texture, scale]);

    useFrame((state) => {
        if (!ref.current) return;

        const time = state.clock.elapsedTime;

        ref.current.position.y = position[1] + Math.sin(time * floatSpeed + position[0]) * floatAmount;

        ref.current.rotation.z = initialRotation + Math.sin(time * rotationSpeed) * 0.1;

        const pulse = 1 + Math.sin(time * 1.5 + position[0] * 2) * 0.03;
        ref.current.scale.setScalar(pulse);
    });

    return (
        <group ref={ref} position={position}>
            <mesh position={[0.01, -0.01, -0.01]}>
                <planeGeometry args={[dimensions.width, dimensions.height]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={texture}
                    transparent={true}
                    opacity={0.15}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    alphaTest={0.5}
                />
            </mesh>
            <mesh>
                <planeGeometry args={[dimensions.width, dimensions.height]} />
                <meshBasicMaterial color="#e0e0e0"
                    map={texture}
                    transparent={true}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    alphaTest={0.5}
                />
            </mesh>
        </group>
    );
};


const AnimatedStar = ({ position, scale = 0.1, speed = 0.5 }: PositionedDoodleProps & { scale?: number; speed?: number }) => {
    const ref = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (ref.current) {
            const time = state.clock.elapsedTime;
            ref.current.rotation.z = time * speed;
            ref.current.position.y = position[1] + Math.sin(time * 0.8 + position[0]) * 0.03;
            ref.current.scale.setScalar(scale * (1 + Math.sin(time * 2) * 0.15));
        }
    });

    return (
        <group ref={ref} position={position} scale={scale}>
            {[0, 1, 2, 3].map((i) => (
                <mesh key={i} rotation={[0, 0, (i * Math.PI) / 4]}>
                    <planeGeometry args={[1, 0.12]} />
                    <meshBasicMaterial color="#2a2a2a" transparent opacity={0.7} side={2} />
                </mesh>
            ))}
        </group>
    );
};

const Squiggle = ({ position, rotation = 0 }: PositionedDoodleProps & { rotation?: number }) => {
    const ref = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (ref.current) {
            const time = state.clock.elapsedTime;
            ref.current.position.x = position[0] + Math.sin(time * 0.5) * 0.02;
        }
    });

    return (
        <group ref={ref} position={position} rotation={[0, 0, rotation]}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <mesh key={i} position={[i * 0.07, Math.sin(i * 1.5) * 0.035, 0]}>
                    <circleGeometry args={[0.015, 8]} />
                    <meshBasicMaterial color="#444" transparent opacity={0.5} />
                </mesh>
            ))}
        </group>
    );
};

const DoodleCircle = ({ position, scale = 0.08 }: PositionedDoodleProps & { scale?: number }) => {
    const ref = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (ref.current) {
            const time = state.clock.elapsedTime;
            const pulse = 1 + Math.sin(time * 2) * 0.1;
            ref.current.scale.setScalar(scale * pulse);
        }
    });

    return (
        <mesh ref={ref} position={position}>
            <ringGeometry args={[0.6, 1, 12]} />
            <meshBasicMaterial color="#333" transparent opacity={0.4} side={2} />
        </mesh>
    );
};

const ThoughtBubble = ({ position }: PositionedDoodleProps) => {
    const ref = useRef<THREE.Group>(null);
    const contentRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null);

    useFrame((state) => {
        if (ref.current) {
            const time = state.clock.elapsedTime;
            ref.current.position.y = position[1] + Math.sin(time * 0.6) * 0.02;
        }

        if (contentRef.current) {
            const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
            contentRef.current.material.opacity = pulse;
        }
    });

    return (
        <group ref={ref} position={position}>
            <mesh>
                <circleGeometry args={[0.12, 16]} />
                <meshBasicMaterial color="#fff" />
            </mesh>
            <mesh>
                <ringGeometry args={[0.11, 0.13, 16]} />
                <meshBasicMaterial color="#333" />
            </mesh>

            <mesh position={[-0.1, -0.1, 0]}>
                <circleGeometry args={[0.035, 8]} />
                <meshBasicMaterial color="#fff" />
            </mesh>
            <mesh position={[-0.1, -0.1, 0]}>
                <ringGeometry args={[0.03, 0.04, 8]} />
                <meshBasicMaterial color="#333" />
            </mesh>

            <mesh ref={contentRef} position={[0, 0, 0.01]}>
                <planeGeometry args={[0.05, 0.06]} />
                <meshBasicMaterial color="#111111" transparent opacity={0.9} />
            </mesh>
        </group>
    );
};

export default Doodles;
