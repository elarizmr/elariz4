import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export const TUTORIALS = {
    corridor_enter: { id: 'corridor_enter', label: 'Click a door to enter', title: 'Explorer' },
    corridor_explore: { id: 'corridor_explore', label: 'Scroll to explore the corridor', title: 'Wanderer' },
    about_fly: { id: 'about_fly', label: 'Scroll to fly through my story', title: 'Sky Walker' },
    gallery_inspect: { id: 'gallery_inspect', label: 'Click project to inspect', title: 'Art Critic' },
    contact_choose: { id: 'contact_choose', label: 'Find a contact method', title: 'Sociable' }
} as const;

export type TutorialId = keyof typeof TUTORIALS;
type ToastStatus = 'pending' | 'completed' | 'hiding';

interface ActiveTutorial {
    id: TutorialId;
    status: ToastStatus;
}

interface TutorialToastContextValue {
    activeTutorial: ActiveTutorial | null;
    showTutorial: (id: TutorialId) => void;
    completeTutorial: (id: TutorialId) => void;
    hideTutorial: () => void;
}

const TutorialToastContext = createContext<TutorialToastContextValue | null>(null);

export const TutorialToastProvider = ({ children }: { children: ReactNode }) => {
    const completedRef = useRef<TutorialId[]>([]);
    const [activeTutorial, setActiveTutorial] = useState<ActiveTutorial | null>(null);

    const showTutorial = useCallback((id: TutorialId) => {
        if (!completedRef.current.includes(id)) {
            setActiveTutorial((active) => !active || active.status === 'hiding'
                ? { id, status: 'pending' }
                : active);
        }
    }, []);

    const completeTutorial = useCallback((id: TutorialId) => {
        if (completedRef.current.includes(id)) return;
        completedRef.current.push(id);
        setActiveTutorial({ id, status: 'completed' });
        setTimeout(() => {
            setActiveTutorial((active) => active?.id === id ? { ...active, status: 'hiding' } : active);
            setTimeout(() => {
                setActiveTutorial((active) => active?.id === id ? null : active);
            }, 500);
        }, 3000);
    }, []);

    const hideTutorial = useCallback(() => {
        setActiveTutorial((active) => active && active.status !== 'hiding'
            ? { ...active, status: 'hiding' }
            : active);
        setTimeout(() => {
            setActiveTutorial((active) => active?.status === 'hiding' ? null : active);
        }, 500);
    }, []);

    return (
        <TutorialToastContext.Provider value={{ activeTutorial, showTutorial, completeTutorial, hideTutorial }}>
            {children}
        </TutorialToastContext.Provider>
    );
};

export const useTutorialToast = (): TutorialToastContextValue => {
    const context = useContext(TutorialToastContext);
    if (!context) throw new Error('useTutorialToast must be used within a TutorialToastProvider');
    return context;
};
