import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { getInitialRoomFromUrl } from '../hooks/useRoomRouting';
import type { RoomId } from '../types';

type TeleportPhase = 'closing' | 'teleporting' | 'opening' | null;

interface SceneContextValue {
    currentRoom: RoomId | null;
    hasEntered: boolean;
    exitRequested: boolean;
    enterRoom: (roomId: RoomId) => void;
    exitRoom: () => void;
    requestExit: () => void;
    clearExitRequest: () => void;
    markEntered: () => void;
    isInRoom: boolean;
    initialRoom: RoomId | null;
    deeplinkHandled: { current: boolean };
    teleportTarget: RoomId | null;
    isTeleporting: boolean;
    teleportPhase: TeleportPhase;
    pendingDoorClick: RoomId | null;
    isFastTeleport: boolean;
    teleportTo: (roomId: RoomId) => void;
    startTeleportTransition: () => void;
    openTeleportTransition: () => void;
    completeTeleport: () => void;
    signalRoomReady: () => void;
    finishPaperOpen: () => void;
    cancelTeleport: () => void;
}

const SceneContext = createContext<SceneContextValue | null>(null);

export const useScene = () => {
    const context = useContext(SceneContext);
    if (!context) {
        throw new Error('useScene must be used within a SceneProvider');
    }
    return context;
};

export const SceneProvider = ({ children }: { children: ReactNode }) => {
    const initialRoom = useRef<RoomId | null>(getInitialRoomFromUrl());
    const deeplinkHandled = useRef(false);

    const [currentRoom, setCurrentRoom] = useState<RoomId | null>(null);
    const [hasEntered, setHasEntered] = useState(false);
    const [exitRequested, setExitRequested] = useState(false);

    const [teleportTarget, setTeleportTarget] = useState<RoomId | null>(null);
    const [isTeleporting, setIsTeleporting] = useState(false);
    const [teleportPhase, setTeleportPhase] = useState<TeleportPhase>(null);
    const [pendingDoorClick, setPendingDoorClick] = useState<RoomId | null>(null);
    const [isFastTeleport, setIsFastTeleport] = useState(false);


    const enterRoom = useCallback((roomId: RoomId) => {
        setCurrentRoom(roomId);
        setExitRequested(false);

        setIsTeleporting(false);
        setPendingDoorClick(null);
    }, []);

    const exitRoom = useCallback(() => {
        setCurrentRoom(null);
        setExitRequested(false);
    }, []);

    const requestExit = useCallback(() => {
        setExitRequested(true);
    }, []);

    const clearExitRequest = useCallback(() => {
        setExitRequested(false);
    }, []);

    const markEntered = useCallback(() => {
        setHasEntered(true);
    }, []);

    const teleportTo = useCallback((roomId: RoomId) => {
        if (isTeleporting || roomId === currentRoom) return;

        setTeleportTarget(roomId);
        setIsTeleporting(true);
        setIsFastTeleport(true);
        setTeleportPhase('closing');
    }, [isTeleporting, currentRoom]);

    const startTeleportTransition = useCallback(() => {
        setTeleportPhase('teleporting');
    }, []);

    const openTeleportTransition = useCallback(() => {
        setTeleportPhase('opening');
    }, []);

    const completeTeleport = useCallback(() => {
        setPendingDoorClick(teleportTarget);

        setTeleportTarget(null);
    }, [teleportTarget]);

    const signalRoomReady = useCallback(() => {
        if (isFastTeleport) {
            setTeleportPhase('opening');
            setIsFastTeleport(false);
        }
    }, [isFastTeleport]);

    const finishPaperOpen = useCallback(() => {
        setTeleportPhase(null);
    }, []);


    const cancelTeleport = useCallback(() => {
        setTeleportTarget(null);
        setIsTeleporting(false);
        setTeleportPhase(null);
        setPendingDoorClick(null);
        setIsFastTeleport(false);
    }, []);

    const value = useMemo<SceneContextValue>(() => ({
        currentRoom,
        hasEntered,
        exitRequested,
        enterRoom,
        exitRoom,
        requestExit,
        clearExitRequest,
        markEntered,
        isInRoom: currentRoom !== null,
        initialRoom: initialRoom.current,
        deeplinkHandled,
        teleportTarget,
        isTeleporting,
        teleportPhase,
        pendingDoorClick,
        isFastTeleport,
        teleportTo,
        startTeleportTransition,
        openTeleportTransition,
        completeTeleport,
        signalRoomReady,
        finishPaperOpen,
        cancelTeleport,
    }), [
        currentRoom,
        hasEntered,
        exitRequested,
        enterRoom,
        exitRoom,
        requestExit,
        clearExitRequest,
        markEntered,
        teleportTarget,
        isTeleporting,
        teleportPhase,
        pendingDoorClick,
        isFastTeleport,
        teleportTo,
        startTeleportTransition,
        openTeleportTransition,
        completeTeleport,
        signalRoomReady,
        finishPaperOpen,
        cancelTeleport
    ]);

    return (
        <SceneContext.Provider value={value}>
            {children}
        </SceneContext.Provider>
    );
};

export default SceneContext;
