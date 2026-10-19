import { createContext, useContext, useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction, type ReactNode } from 'react';

interface AudioElementWithBaseVolume extends HTMLAudioElement {
    _baseVolume?: number;
}

interface SoundHandle {
    stop: () => void;
    fade: (duration?: number) => void;
}

interface AudioContextValue {
    isMuted: boolean;
    toggleMute: () => void;
    play: (soundName: string, options?: { loop?: boolean; volume?: number }) => SoundHandle;
    enableAudio: () => void;
    audioEnabled: boolean;
    globalVolume: number;
    setGlobalVolume: Dispatch<SetStateAction<number>>;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export const useAudio = (): AudioContextValue => {
    const context = useContext(AudioContext);
    if (!context) throw new Error('useAudio must be used within an AudioProvider');
    return context;
};

export const AudioProvider = ({ children }: { children: ReactNode }) => {
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('audio_muted');
        return saved === 'true';
    });

    const [globalVolume, setGlobalVolume] = useState(() => {
        const saved = localStorage.getItem('audio_volume');
        return saved !== null ? parseFloat(saved) : 0.5;
    });

    const [audioEnabled, setAudioEnabled] = useState(false);

    const activeSounds = useRef<Record<string, AudioElementWithBaseVolume>>({});

    useEffect(() => {
        localStorage.setItem('audio_muted', String(isMuted));
        localStorage.setItem('audio_volume', String(globalVolume));

        Object.values(activeSounds.current).forEach((audio) => {
            if (audio) {
                audio.muted = isMuted;
                const base = audio._baseVolume !== undefined ? audio._baseVolume : 1.0;
                let targetVol = base * globalVolume;
                audio.volume = Math.max(0, Math.min(1, targetVol));
            }
        });

    }, [isMuted, globalVolume]);

    const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);

    const enhancedSetGlobalVolume = useCallback<Dispatch<SetStateAction<number>>>((vol) => {
        if (typeof vol === 'function') {
            setGlobalVolume((prev) => {
                const newVol = vol(prev);
                if (newVol > 0) setIsMuted(false);
                return newVol;
            });
        } else {
            setGlobalVolume(vol);
            if (vol > 0) setIsMuted(false);
        }
    }, []);

    const enableAudio = useCallback(() => {
        if (!audioEnabled) {
            setAudioEnabled(true);
        }
    }, [audioEnabled]);

    const play = useCallback((soundName: string, { loop = false, volume = 1.0 }: { loop?: boolean; volume?: number } = {}): SoundHandle => {
        const soundPaths: Record<string, string> = {
            'szumwiatru': '/sounds/szumwiatru.mp3',
            'szummiasta': '/sounds/szummiasta.mp3',
            'uchyleniedrzwi': '/sounds/uchyleniedrzwi.mp3',
            'otwarciedrzwi': '/sounds/otwarciedrzwi.mp3',
            'zamknieciedrzwi': '/sounds/zamknieciedrzwi.mp3'
        };
        const path = soundPaths[soundName] || `/sounds/${soundName}.mp3`;

        const audio: AudioElementWithBaseVolume = new Audio(path);

        audio.loop = loop;
        audio._baseVolume = volume;

        audio.muted = isMuted;
        let targetVol = volume * globalVolume;
        audio.volume = Math.max(0, Math.min(1, targetVol));

        if (activeSounds.current[soundName]) {
            activeSounds.current[soundName].pause();
        }
        activeSounds.current[soundName] = audio;


        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.catch((error: DOMException) => {
                if (error.name === 'NotAllowedError') {
                } else if (error.name === 'NotSupportedError' || error.message.includes('404')) {
                } else {
                }
            });
        }

        return {
            stop: () => {
                audio.pause();
                audio.currentTime = 0;
                delete activeSounds.current[soundName];
            },
            fade: (duration = 1000) => {
                audio.pause();
                delete activeSounds.current[soundName];
            }
        };
    }, [isMuted, globalVolume]);

    return (
        <AudioContext.Provider value={{
            isMuted,
            toggleMute,
            globalVolume,
            setGlobalVolume: enhancedSetGlobalVolume,
            play,
            enableAudio,
            audioEnabled
        }}>
            {children}
        </AudioContext.Provider>
    );
};
