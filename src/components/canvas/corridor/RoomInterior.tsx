import { useMemo, memo, Suspense } from 'react';
import { useSafeTexture } from '../../../utils/safeTextureLoader';
import * as THREE from 'three';

import GalleryRoom from '../rooms/Gallery/GalleryRoom';
import AboutRoom from '../rooms/About/AboutRoom';
import ContactRoom from '../rooms/Contact/ContactRoom';

const ROOM_CONFIG = {
    corridorWidth: 2.2,
    corridorHeight: 2.4,
    corridorDepth: 2
};

const NATURAL_TILE_W = (1582 / 94) * 0.15;

interface RoomInteriorProps {
    label: string;
    showRoom: boolean;
    onReady: () => void;
    isExiting: boolean;
}

const RoomInterior = memo<RoomInteriorProps>(({ label, showRoom, onReady, isExiting }) => {
    const { corridorWidth, corridorHeight, corridorDepth } = ROOM_CONFIG;
    const halfDepth = corridorDepth / 2;

    const floorTexSrc = useSafeTexture('/textures/corridor/kawalekpodlogi.webp');
    const wallTexSrc = useSafeTexture('/textures/corridor/wall_texture.webp');
    const ceilingTexSrc = useSafeTexture('/textures/corridor/ceiling_texture.webp');
    const bbTexSrc = useSafeTexture('/textures/corridor/texturadoprogow.webp');

    const materials = useMemo(() => {
        const floorTex = floorTexSrc.clone();
        floorTex.needsUpdate = true;
        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(corridorDepth / 2.5, corridorWidth / 2.5);

        const wallTexL = wallTexSrc.clone();
        wallTexL.needsUpdate = true;
        wallTexL.wrapS = wallTexL.wrapT = THREE.RepeatWrapping;
        wallTexL.repeat.set(corridorDepth / 2, corridorHeight / 2);

        const wallTexR = wallTexSrc.clone();
        wallTexR.needsUpdate = true;
        wallTexR.wrapS = wallTexR.wrapT = THREE.RepeatWrapping;
        wallTexR.repeat.set(corridorDepth / 2, corridorHeight / 2);

        const ceilTex = ceilingTexSrc.clone();
        ceilTex.needsUpdate = true;
        ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
        ceilTex.repeat.set(corridorDepth / 2.5, corridorWidth / 2.5);

        const bbLeft = bbTexSrc.clone();
        bbLeft.needsUpdate = true;
        bbLeft.wrapS = bbLeft.wrapT = THREE.RepeatWrapping;
        bbLeft.repeat.set(corridorDepth / NATURAL_TILE_W, 1);

        const bbRight = bbTexSrc.clone();
        bbRight.needsUpdate = true;
        bbRight.wrapS = bbRight.wrapT = THREE.RepeatWrapping;
        bbRight.repeat.set(corridorDepth / NATURAL_TILE_W, 1);

        return {
            corridorFloor: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: floorTex, side: THREE.DoubleSide }),
            corridorWallL: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: wallTexL, side: THREE.DoubleSide }),
            corridorWallR: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: wallTexR, side: THREE.DoubleSide }),
            corridorCeiling: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: ceilTex, side: THREE.DoubleSide }),
            bbLeft: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: bbLeft, side: THREE.DoubleSide }),
            bbRight: new THREE.MeshBasicMaterial({ color: '#e0e0e0',  map: bbRight, side: THREE.DoubleSide }),
            threshold: new THREE.MeshBasicMaterial({ color: '#e0e0e0', 
                map: (() => {
                    const t = bbTexSrc.clone();
                    t.needsUpdate = true;
                    t.wrapS = t.wrapT = THREE.RepeatWrapping;
                    t.repeat.set(corridorWidth / NATURAL_TILE_W, 1);
                    return t; })(),

                side: THREE.DoubleSide
            }),
        };
    }, [floorTexSrc, wallTexSrc, ceilingTexSrc, bbTexSrc]);

    const geometries = useMemo(() => ({
        corridorSideWall: new THREE.PlaneGeometry(corridorDepth, corridorHeight),
        corridorFloorCeiling: new THREE.PlaneGeometry(corridorWidth, corridorDepth),
        corridorBaseboard: new THREE.PlaneGeometry(corridorDepth, 0.15),
        threshold: new THREE.PlaneGeometry(corridorWidth, 0.15),
    }), []);

    const isGallery = label === 'THE GALLERY';

    return (
        <group position={[0, -0.149, 0]}>
            <mesh
                position={[-corridorWidth / 2, 0, -halfDepth]}
                rotation={[0, Math.PI / 2, 0]}
                geometry={geometries.corridorSideWall}
                material={materials.corridorWallL}
            />

            <mesh
                position={[corridorWidth / 2, 0, -halfDepth]}
                rotation={[0, -Math.PI / 2, 0]}
                geometry={geometries.corridorSideWall}
                material={materials.corridorWallR}
            />

            <mesh
                position={[0, -corridorHeight / 2, -halfDepth]}
                rotation={[-Math.PI / 2, 0, 0]}
                geometry={geometries.corridorFloorCeiling}
                material={materials.corridorFloor}
            />

            <mesh
                position={[0, corridorHeight / 2, -halfDepth]}
                rotation={[Math.PI / 2, 0, 0]}
                geometry={geometries.corridorFloorCeiling}
                material={materials.corridorCeiling}
            />

            <mesh
                position={[-corridorWidth / 2 + 0.01, -corridorHeight / 2 + 0.075, -halfDepth]}
                rotation={[0, Math.PI / 2, 0]}
                geometry={geometries.corridorBaseboard}
                material={materials.bbLeft}
            />

            <mesh
                position={[corridorWidth / 2 - 0.01, -corridorHeight / 2 + 0.075, -halfDepth]}
                rotation={[0, -Math.PI / 2, 0]}
                geometry={geometries.corridorBaseboard}
                material={materials.bbRight}
            />

            <mesh
                position={[0, -corridorHeight / 2 + 0.005, -corridorDepth]}
                rotation={[-Math.PI / 2, 0, 0]}
                geometry={geometries.threshold}
                material={materials.threshold}
            />

            {showRoom && (
                <group>
                    {isGallery ? (
                        <group position={[0, -0.5, -corridorDepth]}>
                            <Suspense fallback={null}>
                                <GalleryRoom showRoom={showRoom} onReady={onReady} isExiting={isExiting} />
                            </Suspense>
                        </group>
                    ) : label === 'THE ABOUT' ? (
                        <group position={[0, -0.5, -corridorDepth]}>
                            <Suspense fallback={null}>
                                <AboutRoom showRoom={showRoom} onReady={onReady} isExiting={isExiting} />
                            </Suspense>
                        </group>
                    ) : label === "LET'S CONNECT" ? (
                        <group position={[0, -0.5, -corridorDepth]}>
                            <Suspense fallback={null}>
                                <ContactRoom showRoom={showRoom} onReady={onReady} isExiting={isExiting} />
                            </Suspense>
                        </group>
                    ) : null}
                </group>
            )}
        </group>
    );
});

RoomInterior.displayName = 'RoomInterior';

export default RoomInterior;
