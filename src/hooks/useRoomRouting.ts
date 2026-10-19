import { useEffect, useRef } from 'react';
import { useScene } from '../context/SceneContext';
import type { RoomId } from '../types';

const ROOM_PATHS: Record<RoomId | 'corridor', string> = {
    corridor: '/',
    about: '/about',
    gallery: '/gallery',
    contact: '/contact',
};

const PATH_ROOMS: Record<string, RoomId | null> = {
    '/': null,
    '/about': 'about',
    '/gallery': 'gallery',
    '/contact': 'contact',
};

export function getInitialRoomFromUrl(): RoomId | null {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return PATH_ROOMS[path] ?? null;
}

export function useRoomRouting(): void {
    const { currentRoom, teleportTo, hasEntered } = useScene();
    const handlingPopState = useRef(false);
    const lastPushedRoom = useRef<RoomId | null | undefined>(undefined);

    useEffect(() => {
        const path = ROOM_PATHS[currentRoom ?? 'corridor'];
        if (!handlingPopState.current && lastPushedRoom.current !== currentRoom) {
            if (lastPushedRoom.current === undefined) {
                window.history.replaceState({ room: currentRoom }, '', path);
            } else {
                window.history.pushState({ room: currentRoom }, '', path);
            }
            lastPushedRoom.current = currentRoom;
        }

        handlingPopState.current = false;
    }, [currentRoom]);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            handlingPopState.current = true;
            const room = event.state?.room;
            const targetRoom: RoomId | null =
                typeof room === 'string' && room in ROOM_PATHS ? room as RoomId : null;
            lastPushedRoom.current = targetRoom;

            if (targetRoom && hasEntered) {
                teleportTo(targetRoom);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [teleportTo, hasEntered]);
}
