export type RoomId = 'about' | 'gallery' | 'contact';

export interface RoomLifecycleProps {
    showRoom: boolean;
    onReady: () => void;
    isExiting: boolean;
    isWarmup?: boolean;
}

export interface GalleryProject {
    title: string;
    id: string;
    url?: string | null;
    description?: string;
    front: string;
    painted: string | null;
    techStack: string[];
}
