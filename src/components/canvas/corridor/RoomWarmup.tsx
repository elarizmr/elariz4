import { useRef, useState, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import GalleryRoom from '../rooms/Gallery/GalleryRoom';
import AboutRoom from '../rooms/About/AboutRoom';
import ContactRoom from '../rooms/Contact/ContactRoom';

const RoomWarmup = ({
    onWarmupComplete,
    isLowTier,
}: {
    onWarmupComplete: () => void;
    isLowTier: boolean;
}) => {
    const [isDone, setIsDone] = useState(false);
    const frameCount = useRef(0);
    const completeFired = useRef(false);
    const { gl, scene, camera } = useThree();

    const warmupStart = useRef(performance.now());

    useFrame(() => {
        if (isDone || completeFired.current) return;

        frameCount.current++;

        const targetFrames = isLowTier ? 1 : 3;

        if (frameCount.current >= targetFrames) {
            completeFired.current = true;

            const finishWarmup = () => {
                const warmupDuration = ((performance.now() - warmupStart.current) / 1000).toFixed(2);
                
                requestAnimationFrame(() => {
                    setIsDone(true);
                    onWarmupComplete?.();
                });
            };

            // On low tier, bypass intense gl.compileAsync to save memory and avoid Context Lost
            if (isLowTier) {
                finishWarmup();
                return;
            }

            if (gl.compileAsync) {
                gl.compileAsync(scene, camera, scene)
                    .then(finishWarmup)
                    .catch((err) => {
                        console.error('Async compilation failed, falling back to sync', err);
                        gl.compile(scene, camera);
                        finishWarmup();
                    });
            } else {
                gl.compile(scene, camera);
                finishWarmup();
            }
        }
    });

    if (isDone) return null;

    // Do not mount rooms at all on low end devices to prevent WebGL Context Lost
    if (isLowTier) return null;

    const noop = () => {};

    return (
        <group position={[0, -500, 0]}>
            <Suspense fallback={null}>
                <group position={[-20, 0, 0]}>
                    <GalleryRoom showRoom={true} onReady={noop} isExiting={false} isWarmup={true} />
                </group>
            </Suspense>
            <Suspense fallback={null}>
                <group position={[-20, 0, -50]}>
                    <AboutRoom showRoom={true} onReady={noop} isExiting={false} isWarmup={true} />
                </group>
            </Suspense>
            <Suspense fallback={null}>
                <group position={[20, 0, -50]}>
                    <ContactRoom showRoom={true} onReady={noop} isExiting={false} isWarmup={true} />
                </group>
            </Suspense>
        </group>
    );
};

export default RoomWarmup;
