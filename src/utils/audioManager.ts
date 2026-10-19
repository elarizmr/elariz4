
let bgMusicAudio: HTMLAudioElement | null = null;
let isMuted = false;
let bgMusicStarted = false;

export const initAudio = () => {
    if (typeof window === 'undefined') return;

    const savedMuted = localStorage.getItem('audio_muted');
    isMuted = savedMuted === 'true';

    if (!bgMusicAudio) {
        bgMusicAudio = new Audio('/sounds/cfl_turningpages-belem-breeze-487596.ogg');
        bgMusicAudio.preload = 'auto';
        bgMusicAudio.loop = true;
        bgMusicAudio.volume = 0.3;
        bgMusicAudio.muted = isMuted;

        bgMusicAudio.load();
    }
};

export const playBackgroundMusic = () => {
    initAudio();
    bgMusicStarted = true;
    if (bgMusicAudio && bgMusicAudio.paused) {
        bgMusicAudio.play().catch((err: unknown) => {
            console.warn('Audio play failed/blocked by browser:', err);
        });
    }
};

export const pauseBackgroundMusic = () => {
    if (bgMusicAudio && !bgMusicAudio.paused) {
        bgMusicAudio.pause();
    }
};

export const toggleMute = () => {
    isMuted = !isMuted;
    if (bgMusicAudio) {
        bgMusicAudio.muted = isMuted;
    }
    return isMuted;
};

export const getIsMuted = () => isMuted;

export const setMusicVolume = (vol: number) => {
    if (bgMusicAudio) {
        bgMusicAudio.volume = Math.max(0, Math.min(1, vol));
        if (vol > 0 && isMuted) {
            isMuted = false;
            bgMusicAudio.muted = false;
        }

        if (vol > 0 && bgMusicAudio.paused && bgMusicStarted) {
            bgMusicAudio.play().catch((error: unknown) => console.warn(error));
        }
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('musicVolumeChanged', { detail: vol }));
    }
};

export const getMusicVolume = () => {
    return bgMusicAudio ? bgMusicAudio.volume : 0.3;
};
