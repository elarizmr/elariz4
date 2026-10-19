import { useMemo, memo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

import CorridorWalls from './CorridorWalls';
import DoorSection from './DoorSection';
import SegmentDoors from './SegmentDoors';
import Avatar from './Avatar';
import HeroText from './HeroText';
import Doodles from './Doodles';
import CorridorDecorations from './CorridorDecorations';
import type { RoomId } from '../../../types';

const SEGMENT_LENGTH = 80;

const WALL_X_OUTER = 3.5;
const WALL_X_INNER = 1.7;
const DOOR_Z_SPAN = 4;
const WALL_ANGLE = Math.atan2(WALL_X_OUTER - WALL_X_INNER, DOOR_Z_SPAN);


interface CorridorDoor {
    id: string;
    roomId: RoomId;
    relativeZ: number;
    side: 'left' | 'right';
    label: string;
    icon: string;
    color: string;
    enterDistance?: number;
    x: number;
    rotation: number;
}

interface CorridorSegmentProps {
    segmentIndex?: number;
    onDoorEnter?: (roomId: RoomId) => void;
    hideSegmentDoors?: boolean;
    zClip?: number;
    setCameraOverride: (active: boolean) => void;
}

const CorridorSegment = ({
    segmentIndex = 0,
    onDoorEnter,
    hideSegmentDoors = false,
    zClip = 100000,
    setCameraOverride
}: CorridorSegmentProps) => {

    const zOffset = 10 - (segmentIndex * SEGMENT_LENGTH);

    const doors = useMemo(() => {
        const doorDefs: Omit<CorridorDoor, 'x' | 'rotation'>[] = [
            {
                id: `gallery-${segmentIndex}`,
                roomId: 'gallery',
                relativeZ: -18,
                side: 'left',
                label: 'THE GALLERY',
                icon: '◈',
                color: '#f5efe6'
            },
            {
                id: `about-${segmentIndex}`,
                roomId: 'about',
                relativeZ: -48,
                side: 'left',
                label: 'THE ABOUT',
                icon: '★',
                color: '#efe6f5',
                enterDistance: 25
            },
            {
                id: `connect-${segmentIndex}`,
                roomId: 'contact',
                relativeZ: -62,
                side: 'right',
                label: "LET'S CONNECT",
                icon: '✉',
                color: '#f5e6e6'
            },
        ];

        return doorDefs.map(def => {
            const xBase = (WALL_X_OUTER + WALL_X_INNER) / 2;
            const xPos = def.side === 'left' ? -xBase : xBase;


            const baseRot = def.side === 'left' ? Math.PI / 2 : -Math.PI / 2;
            const rotOffset = def.side === 'left' ? -WALL_ANGLE : WALL_ANGLE;

            return {
                ...def,
                x: xPos,
                rotation: baseRot + rotOffset
            };
        });
    }, [segmentIndex]);

    return (
        <group position={[0, 0, 0]}>
            <CorridorWalls
                zStart={zOffset}
                length={SEGMENT_LENGTH}
                doorPositions={doors}
                zClip={zClip}
            />

            <group position={[0, 0, zOffset - 2]}>
                <HeroText position={[0, -0.1, -0.5]} />

                <Avatar position={[0, -0.61, -0.3]} />


                <Doodles />

                <Text
                    position={[1.7, 1.4, 0.3]}
                    fontSize={0.12}
                    color="#ccc"
                    anchorX="center"
                >
                    #{segmentIndex}
                </Text>
            </group>

            {!hideSegmentDoors && doors.map((door) => (
                <DoorSection
                    key={door.id}
                    position={[
                        door.x,
                        0,
                        zOffset + door.relativeZ + 2
                    ]}
                    side={door.side}
                    label={door.label}
                    roomId={door.roomId}
                    icon={door.icon}
                    enterDistance={door.enterDistance}
                    onEnter={() => onDoorEnter?.(door.roomId)}
                    setCameraOverride={setCameraOverride}
                    segmentIndex={segmentIndex}
                />
            ))}


            <CorridorDecorations
                segmentLength={SEGMENT_LENGTH}
                zOffset={zOffset}
                corridorWidth={WALL_X_OUTER * 2}
                corridorHeight={3.5}
                zClip={zClip}
                setCameraOverride={setCameraOverride}
            />

            {!hideSegmentDoors && (
                <SegmentDoors
                    position={[0, 0, zOffset - SEGMENT_LENGTH + 5]}
                    corridorHeight={3.5}
                />
            )}
        </group>
    );
};

const MemoizedCorridorSegment = memo(CorridorSegment);

export { SEGMENT_LENGTH, WALL_X_OUTER, WALL_X_INNER, DOOR_Z_SPAN };
export default MemoizedCorridorSegment;
