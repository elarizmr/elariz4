import { memo, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useScene } from '../../../context/SceneContext';

const DOOR_POSITIONS_Z = {
    'gallery': -6,
    'about': -36,
    'contact': -50
};

const TeleportRoom = memo(() => {
    const {
        teleportTarget,
        teleportPhase,
        openTeleportTransition,
        completeTeleport,
        isFastTeleport,
        isTeleporting
    } = useScene();
    const { camera } = useThree();
    const hasPositioned = useRef(false);

    useEffect(() => {
        if (teleportPhase === 'teleporting' && teleportTarget && !hasPositioned.current) {
            const doorZ = DOOR_POSITIONS_Z[teleportTarget];

            if (doorZ !== undefined) {
                const targetZ = doorZ + 8;

                camera.position.set(0, 0.2, targetZ);

                camera.rotation.set(0, 0, 0);

                hasPositioned.current = true;

                // Small delay to ensure frame update
                setTimeout(() => {
                    if (isFastTeleport) {
                        completeTeleport();
                    } else {
                        openTeleportTransition();
                    }
                }, 50);
            }
        }

        if (!isTeleporting) {
            hasPositioned.current = false;
        }
    }, [teleportPhase, teleportTarget, isTeleporting, isFastTeleport, camera, openTeleportTransition, completeTeleport]);

    return null;
});

TeleportRoom.displayName = 'TeleportRoom';

export default TeleportRoom;
