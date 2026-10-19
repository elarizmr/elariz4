import { useAudio } from '../../context/AudioManager';

const AudioControls = () => {
    const { isMuted, toggleMute, globalVolume, setGlobalVolume } = useAudio();

    const SoundOnIcon = () => (
        <svg viewBox="0 0 24 24">
            <path d="M11 5L6 9H2v6h4l5 4V5z" strokeWidth="2.5" />
            <path d="M15 9a5 5 0 0 1 0 6" />
            <path d="M18 5a9 9 0 0 1 0 14" />
        </svg>
    );

    const SoundOffIcon = () => (
        <svg viewBox="0 0 24 24">
            <path d="M11 5L6 9H2v6h4l5 4V5z" strokeWidth="2.5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
    );

    return (
        <div className="group fixed right-8 top-8 z-1000 flex items-center gap-[15px] px-[15px] py-[10px]">
            <div className="flex w-0 translate-x-[10px] items-center overflow-hidden opacity-0 transition-[all] duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:w-[100px] group-hover:translate-x-0 group-hover:opacity-100">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={globalVolume}
                    onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
                    aria-label="Volume"
                    className="w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:cursor-pointer [&::-webkit-slider-runnable-track]:rounded-[2px] [&::-webkit-slider-runnable-track]:border-t [&::-webkit-slider-runnable-track]:border-[#1a1a1a] [&::-webkit-slider-runnable-track]:bg-[#1a1a1a] [&::-webkit-slider-runnable-track]:shadow-[1px_1px_0_rgba(0,0,0,0.1)] [&::-moz-range-track]:h-[3px] [&::-moz-range-track]:cursor-pointer [&::-moz-range-track]:rounded-[2px] [&::-moz-range-track]:bg-[#1a1a1a] [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1a1a1a] [&::-webkit-slider-thumb]:shadow-[0_0_0_2px_#fafafa] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100 [&::-webkit-slider-thumb:hover]:scale-110 [&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#1a1a1a] [&::-moz-range-thumb]:shadow-[0_0_0_2px_#fafafa] [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-100 [&::-moz-range-thumb:hover]:scale-110"
                />
            </div>

            <button
                className="flex cursor-pointer items-center justify-center border-0 bg-none p-[5px] opacity-80 transition-[transform,opacity] duration-200 ease-in-out hover:rotate-[5deg] hover:scale-110 hover:opacity-100"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute" : "Mute"}
                type="button"
            >
                <span className="block h-7 w-7 [&>svg]:h-full [&>svg]:w-full [&>svg]:fill-none [&>svg]:stroke-[#1a1a1a] [&>svg]:stroke-2 [&>svg]:[stroke-linecap:round] [&>svg]:[stroke-linejoin:round]">
                    {isMuted || globalVolume === 0 ? <SoundOffIcon /> : <SoundOnIcon />}
                </span>
            </button>
        </div>
    );
};

export default AudioControls;
