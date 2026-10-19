import { TUTORIALS, useTutorialToast } from '../../context/TutorialToastContext';
import { useAudio } from '../../context/AudioManager';
import { toggleMute as toggleBgmMute, getIsMuted as getBgmMuted, setMusicVolume } from '../../utils/audioManager';

const TutorialToast = () => {
    const { activeTutorial } = useTutorialToast();
    const { isMuted, toggleMute, setGlobalVolume } = useAudio();

    if (!activeTutorial) return null;

    const data = TUTORIALS[activeTutorial.id];
    const isCompleted = activeTutorial.status === 'completed';
    const isHiding = activeTutorial.status === 'hiding';
    const isSoundPrompt = activeTutorial.id === 'corridor_enter';

    return (
        <div
            className={`fixed bottom-8 left-1/2 z-110 flex max-w-[90vw] items-center gap-4 bg-white px-6 py-3 [clip-path:polygon(0%_0%,100%_0%,100%_0%,98%_10%,100%_20%,97%_35%,100%_50%,98%_65%,100%_80%,97%_90%,100%_100%,90%_97%,80%_100%,70%_96%,60%_100%,50%_97%,40%_100%,30%_96%,20%_100%,10%_97%,0%_100%,0%_100%,2%_90%,0%_80%,3%_65%,0%_50%,2%_35%,0%_20%,3%_10%,0%_0%)] before:pointer-events-none before:absolute before:-left-[20%] before:-top-[20%] before:-z-1 before:h-[140%] before:w-[140%] before:bg-[url('/textures/paper-texture.webp')] before:bg-cover before:bg-center before:content-[''] ${isSoundPrompt ? 'pointer-events-auto' : 'pointer-events-none'} ${isHiding ? 'animate-[popupExit_0.4s_ease_forwards]' : 'animate-[popupEnter_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]'} drop-shadow-[0_4px_10px_rgba(0,0,0,0.15)] max-md:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] max-md:px-4`}
        >
            <svg
                className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                <path
                    d="M 0 0 L 100 0 L 100 0 L 98 10 L 100 20 L 97 35 L 100 50 L 98 65 L 100 80 L 97 90 L 100 100 L 90 97 L 80 100 L 70 96 L 60 100 L 50 97 L 40 100 L 30 96 L 20 100 L 10 97 L 0 100 L 0 100 L 2 90 L 0 80 L 3 65 L 0 50 L 2 35 L 0 20 L 3 10 L 0 0 Z"
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            <div className="relative z-1 flex items-center gap-4">
                {!isSoundPrompt && (
                    <div className={`flex h-6 w-6 items-center justify-center rounded border-2 border-[#1a1a1a] bg-transparent ${isCompleted ? 'animate-[bounceCheck_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)]' : ''}`}>
                        {isCompleted && (
                            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] animate-[drawCheck_0.3s_ease_forwards_0.1s] [stroke-dasharray:24] [stroke-dashoffset:24]">
                                <path d="M5 13l4 4L19 7" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>
                )}
                <div className={`flex flex-col ${isSoundPrompt ? 'items-center text-center' : ''}`}>
                    <span className="mb-0.5 font-['Patrick_Hand',cursive,sans-serif] text-sm font-bold uppercase tracking-[1px] text-[#1a1a1a] max-md:text-[13px]">{data.title}</span>
                    {!isSoundPrompt ? (
                        <span className="text-[13px] leading-[1.4] text-[#444] max-md:text-xs">{data.label}</span>
                    ) : (
                        <span className="text-[13px] leading-[1.4] text-[#444] max-md:text-xs">
                            Click a door to enter. Audio is currently
                            <button
                                className={`ml-1 inline-flex cursor-pointer items-center border-0 bg-transparent p-0 font-['Patrick_Hand',cursive,sans-serif] text-[13px] font-bold underline decoration-dashed underline-offset-[3px] transition-[opacity,transform] duration-200 hover:scale-105 hover:opacity-70 max-md:text-xs ${!isMuted ? 'text-[#1a1a1a]' : 'text-[#888]'}`}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const willMute = !isMuted;
                                    if (isMuted !== willMute) toggleMute();
                                    if (getBgmMuted() !== willMute) toggleBgmMute();
                                    if (willMute) {
                                        setGlobalVolume(0);
                                        setMusicVolume(0);
                                    } else {
                                        setGlobalVolume(1.0);
                                        setMusicVolume(0.3);
                                    }
                                }}
                            >
                                {!isMuted ? ' [🔊 ON]' : ' [🔇 OFF]'}
                            </button>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TutorialToast;
