import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import gsap from 'gsap';
import { useScene } from '../../context/SceneContext';
import { useAudio } from '../../context/AudioManager';
import { setMusicVolume, getMusicVolume } from '../../utils/audioManager';
import { useTutorialToast } from '../../context/TutorialToastContext';
import type { RoomId } from '../../types';
import TutorialToast from './TutorialToast';

const ROOMS = [
    { id: 'about', label: 'About', x: 43, y: 38 },
    { id: 'gallery', label: 'Gallery', x: 43, y: 72 },
    { id: 'contact', label: 'Contact', x: 57, y: 25 },
] as const;

const PIN_START_POSITION = { x: 50.5, y: 97 };

const navButtonClassName =
    "relative flex h-[55px] w-[50px] items-center justify-center overflow-visible border-0 bg-transparent pt-2 transition-transform duration-200 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:bg-[image:linear-gradient(rgba(255,255,255,0.45),rgba(255,255,255,0.45)),url('/textures/paper-texture.webp')] before:bg-cover before:bg-center before:content-[''] before:[clip-path:polygon(0%_0%,100%_0%,100%_0%,98%_10%,100%_20%,97%_35%,100%_50%,98%_65%,100%_80%,97%_90%,100%_100%,90%_97%,80%_100%,70%_96%,60%_100%,50%_97%,40%_100%,30%_96%,20%_100%,10%_97%,0%_100%,0%_100%,2%_90%,0%_80%,3%_65%,0%_50%,2%_35%,0%_20%,3%_10%,0%_0%)] [box-shadow:0_3px_10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:translate-y-px max-md:h-[50px] max-md:w-[45px] [&>svg:not(.paper-button-border)]:relative [&>svg:not(.paper-button-border)]:z-1 [&>svg:not(.paper-button-border)]:h-[22px] [&>svg:not(.paper-button-border)]:w-[22px] [&>svg:not(.paper-button-border)]:fill-none [&>svg:not(.paper-button-border)]:stroke-[#1a1a1a] [&>svg:not(.paper-button-border)]:stroke-2 [&>svg:not(.paper-button-border)]:[stroke-linecap:round] [&>svg:not(.paper-button-border)]:[stroke-linejoin:round]";

const PaperButtonBorder = () => (
    <svg className="paper-button-border pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 50 55" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0 L50 0 L49 5.5 L50 11 L48.5 19 L50 27.5 L49 36 L50 44 L48.5 49.5 L50 55 L45 54 L40 55 L35 53 L30 55 L25 54 L20 55 L15 53 L10 55 L5 54 L0 55 L1 49.5 L0 44 L1.5 36 L0 27.5 L1 19 L0 11 L1.5 5.5 L0 0 Z" fill="none" stroke="#1a1a1a" strokeWidth="1.5" />
    </svg>
);

const NavigationUI = () => {
    const { currentRoom, isInRoom, requestExit, hasEntered, teleportTo, isTeleporting } = useScene();
    const { isMuted, toggleMute, globalVolume, setGlobalVolume } = useAudio();
    const { showTutorial } = useTutorialToast();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [hoveredRoom, setHoveredRoom] = useState<RoomId | null>(null);
    const [isExiting, setIsExiting] = useState(false);

    const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
    const [bgmVol, setBgmVol] = useState(0.3);
    const [isUIHidden, setIsUIHidden] = useState(false);

    const mapPanelRef = useRef<HTMLDivElement>(null);
    const mapCloseRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleInspectChange = (e: Event) => {
            const isInspecting = (e as CustomEvent<boolean>).detail;
            setIsUIHidden(isInspecting);
            if (isInspecting) {
                setIsMenuOpen(false);
                setIsAudioMenuOpen(false);
            }
        };
        window.addEventListener('inspectChange', handleInspectChange);
        return () => window.removeEventListener('inspectChange', handleInspectChange);
    }, []);

    const paintedMapsRefs = {
        about: useRef<HTMLImageElement>(null),
        gallery: useRef<HTMLImageElement>(null),
        contact: useRef<HTMLImageElement>(null)
    };

    useEffect(() => {
        if (paintedMapsRefs.about.current) {
            gsap.to(paintedMapsRefs.about.current, {
                clipPath: (hoveredRoom === 'about' || currentRoom === 'about')
                    ? 'polygon(10% 20%, 40% 20%, 40% 55%, 10% 55%)'
                    : 'polygon(10% 20%, 10% 20%, 10% 55%, 10% 55%)',
                duration: 0.5,
                ease: "power2.out"
            });
        }

        if (paintedMapsRefs.gallery.current) {
            gsap.to(paintedMapsRefs.gallery.current, {
                clipPath: (hoveredRoom === 'gallery' || currentRoom === 'gallery')
                    ? 'polygon(10% 57%, 40% 57%, 40% 92%, 10% 92%)'
                    : 'polygon(10% 57%, 10% 57%, 10% 92%, 10% 92%)',
                duration: 0.5,
                ease: "power2.out"
            });
        }

        if (paintedMapsRefs.contact.current) {
            gsap.to(paintedMapsRefs.contact.current, {
                clipPath: (hoveredRoom === 'contact' || currentRoom === 'contact')
                    ? 'polygon(60% 10%, 95% 10%, 95% 35%, 60% 35%)'
                    : 'polygon(95% 10%, 95% 10%, 95% 35%, 95% 35%)',
                duration: 0.5,
                ease: "power2.out"
            });
        }

    }, [hoveredRoom, currentRoom]);

    useEffect(() => {
        setBgmVol(getMusicVolume());

        const handleMusicVolumeChange = (e: Event) => {
            setBgmVol((e as CustomEvent<number>).detail);
        };
        window.addEventListener('musicVolumeChanged', handleMusicVolumeChange);

        return () => window.removeEventListener('musicVolumeChanged', handleMusicVolumeChange);
    }, []);

    const handleBgmChange = (val: number) => {
        setBgmVol(val);
        setMusicVolume(val);
    };

    useEffect(() => {
        if (!hasEntered && !isTeleporting) {
            showTutorial('corridor_enter');
        } else if (hasEntered && !isTeleporting && !isInRoom) {
            showTutorial('corridor_explore');
        }
    }, [hasEntered, isTeleporting, isInRoom, showTutorial]);

    useEffect(() => {
        if (isInRoom || isTeleporting) {
            setIsMenuOpen(false);
            setIsAudioMenuOpen(false);
            setIsExiting(false);
        }
    }, [isInRoom, isTeleporting]);

    useEffect(() => {
        if (!isInRoom) {
            setIsExiting(false);
        }
    }, [isInRoom]);

    useEffect(() => {
        if (isMenuOpen) {
            setTimeout(() => mapCloseRef.current?.focus(), 100);
        }
    }, [isMenuOpen]);

    useEffect(() => {
        const handleEscape = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isMenuOpen) setIsMenuOpen(false);
                if (isAudioMenuOpen) setIsAudioMenuOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isMenuOpen, isAudioMenuOpen]);

    const handleMapKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Tab' || !mapPanelRef.current) return;

        const focusable = mapPanelRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };

    const handleRoomClick = (roomId: RoomId) => {
        if (roomId === currentRoom || isTeleporting) return;

        setIsMenuOpen(false);
        setIsAudioMenuOpen(false);
        teleportTo(roomId);
    };

    const handleBackClick = () => {
        setIsExiting(true);
        requestExit();
    };

    return (
        <div className="pointer-events-none fixed inset-0 z-100 [&_button]:pointer-events-auto [&_.map-panel]:pointer-events-auto [&_.audio-panel]:pointer-events-auto [&_.menu-overlay]:pointer-events-auto">
            <TutorialToast />

            {hasEntered && isInRoom && (
                <button
                    className={`${navButtonClassName} fixed left-6 top-0 z-10 transition-[transform,opacity] duration-300 ease-in-out max-md:left-4 max-md:top-[env(safe-area-inset-top)] ${isExiting ? 'pointer-events-none -translate-y-full opacity-0' : 'animate-[fadeSlideDown_0.3s_ease-out]'}`}
                    onClick={handleBackClick}
                    aria-label="Back to corridor"
                >
                    <svg viewBox="0 0 24 24" className="relative z-1 h-[22px] w-[22px] fill-none stroke-[#1a1a1a] stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    <PaperButtonBorder />
                </button>
            )}

            {hasEntered && (
                <div className={`fixed right-6 top-0 flex gap-3 transition-[transform,opacity] duration-300 ease-in-out animate-[slideDownEntrance_0.4s_ease-out] max-md:right-4 max-md:top-[env(safe-area-inset-top)] max-md:gap-2 ${isMenuOpen || isAudioMenuOpen ? 'pointer-events-none -translate-y-full opacity-0' : ''} ${isUIHidden ? 'pointer-events-none -translate-y-[120%] opacity-0 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]' : ''}`}>
                    <button
                        className={navButtonClassName}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                    >
                        <div className="relative z-1 flex w-5 flex-col gap-[5px]">
                            <span className="block h-0.5 w-full rounded-sm bg-[#1a1a1a]"></span>
                            <span className="block h-0.5 w-full rounded-sm bg-[#1a1a1a]"></span>
                            <span className="block h-0.5 w-full rounded-sm bg-[#1a1a1a]"></span>
                        </div>
                        <PaperButtonBorder />
                    </button>
                    <button
                        className={navButtonClassName}
                        onClick={() => setIsAudioMenuOpen(!isAudioMenuOpen)}
                        aria-label="Audio Settings"
                        aria-expanded={isAudioMenuOpen}
                    >
                        {isMuted ? (
                            <svg viewBox="0 0 24 24">
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                <line x1="23" y1="9" x2="17" y2="15" />
                                <line x1="17" y1="9" x2="23" y2="15" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24">
                                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                                <path d="M15 9a5 5 0 0 1 0 6" />
                                <path d="M18 5a9 9 0 0 1 0 14" />
                            </svg>
                        )}
                        <PaperButtonBorder />
                    </button>
                </div>
            )}

            {hasEntered && (
                <div className={`fixed left-1/2 top-0 z-95 w-[90%] max-w-[500px] -translate-x-1/2 -translate-y-full border-0 rounded-none opacity-0 drop-shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] max-md:top-[env(safe-area-inset-top)] max-md:w-[95%] max-md:max-w-none max-[480px]:w-full ${isMenuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none'}`} inert={!isMenuOpen ? true : undefined} ref={mapPanelRef} onKeyDown={handleMapKeyDown} role="dialog" aria-label="Map">
                    <svg
                        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                    >
                        <path
                            d="M 0 0 L 100 0 L 100 0 L 99 3 L 100 6 L 98 10 L 100 14 L 99 18 L 100 22 L 98 26 L 100 30 L 99 35 L 100 40 L 98 45 L 100 50 L 99 55 L 100 60 L 98 65 L 100 70 L 99 75 L 100 80 L 98 85 L 100 90 L 99 95 L 100 100 L 96 99 L 92 100 L 88 98 L 84 100 L 80 99 L 76 100 L 72 98 L 68 100 L 64 99 L 60 100 L 56 98 L 52 100 L 48 99 L 44 100 L 40 98 L 36 100 L 32 99 L 28 100 L 24 98 L 20 100 L 16 99 L 12 100 L 8 98 L 4 100 L 0 99 L 0.5 99.5 L 1 95 L 0 90 L 2 85 L 0 80 L 1 75 L 0 70 L 2 65 L 0 60 L 1 55 L 0 50 L 2 45 L 0 40 L 1 35 L 0 30 L 2 26 L 0 22 L 1 18 L 0 14 L 2 10 L 0 6 L 1 3 L 0 0 Z"
                            fill="none"
                            stroke="#1a1a1a"
                            strokeWidth="0.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>

                    <div className="relative h-full w-full bg-white px-5 pb-[30px] pt-5 [clip-path:polygon(0%_0%,100%_0%,100%_0%,99%_3%,100%_6%,98%_10%,100%_14%,99%_18%,100%_22%,98%_26%,100%_30%,99%_35%,100%_40%,98%_45%,100%_50%,99%_55%,100%_60%,98%_65%,100%_70%,99%_75%,100%_80%,98%_85%,100%_90%,99%_95%,100%_100%,96%_99%,92%_100%,88%_98%,84%_100%,80%_99%,76%_100%,72%_98%,68%_100%,64%_99%,60%_100%,56%_98%,52%_100%,48%_99%,44%_100%,40%_98%,36%_100%,32%_99%,28%_100%,24%_98%,20%_100%,16%_99%,12%_100%,8%_98%,4%_100%,0%_99%,0.5%_99.5%,1%_95%,0%_90%,2%_85%,0%_80%,1%_75%,0%_70%,2%_65%,0%_60%,1%_55%,0%_50%,2%_45%,0%_40%,1%_35%,0%_30%,2%_26%,0%_22%,1%_18%,0%_14%,2%_10%,0%_6%,1%_3%,0%_0%)] before:pointer-events-none before:absolute before:-left-1/2 before:-top-1/2 before:-z-1 before:h-[200%] before:w-[200%] before:rotate-90 before:bg-[url('/textures/paper-texture.webp')] before:bg-cover before:bg-center before:content-['']">
                        <div className="mb-4 flex items-center justify-between border-b-2 border-dashed border-[#ccc] pb-3">
                            <h3 className="m-0 font-['Patrick_Hand',cursive,sans-serif] text-base font-bold uppercase tracking-[2px] text-[#1a1a1a] max-md:text-sm">MAP</h3>
                            <button
                                ref={mapCloseRef}
                                className="mobile-tap-target flex h-7 w-7 cursor-pointer items-center justify-center border-0 bg-transparent opacity-60 transition-[transform,opacity] duration-200 hover:scale-110 hover:opacity-100 active:scale-95 max-md:h-11 max-md:w-11"
                                onClick={() => setIsMenuOpen(false)}
                                aria-label="Close map"
                                type="button"
                            >
                                <svg className="h-[18px] w-[18px] fill-none stroke-[#1a1a1a] stroke-[2.5] [stroke-linecap:round]" viewBox="0 0 24 24">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="relative w-full overflow-hidden rounded-lg">
                            <img src="/images/map.webp" alt="Portfolio Map" className="pointer-events-none block h-auto w-full" />

                            <img ref={paintedMapsRefs.about} src="/images/map_about_painted.webp" alt="" className="pointer-events-none absolute left-0 top-0 z-1 h-full w-full" style={{ clipPath: 'polygon(10% 20%, 10% 20%, 10% 55%, 10% 55%)' }} />
                            <img ref={paintedMapsRefs.gallery} src="/images/map_gallery_painted.webp" alt="" className="pointer-events-none absolute left-0 top-0 z-1 h-full w-full" style={{ clipPath: 'polygon(10% 57%, 10% 57%, 10% 92%, 10% 92%)' }} />
                            <img ref={paintedMapsRefs.contact} src="/images/map_contact_painted.webp" alt="" className="pointer-events-none absolute left-0 top-0 z-1 h-full w-full" style={{ clipPath: 'polygon(95% 10%, 95% 10%, 95% 35%, 95% 35%)' }} />
                            <button
                                type="button"
                                className="absolute z-2 m-0 cursor-pointer appearance-none border-0 bg-transparent p-0 font-inherit text-inherit outline-none top-0 left-0 mt-[20%] ml-[10%] h-[35%] w-[30%]"
                                onMouseEnter={() => setHoveredRoom('about')}
                                onMouseLeave={() => setHoveredRoom(null)}
                                onFocus={() => setHoveredRoom('about')}
                                onBlur={() => setHoveredRoom(null)}
                                onClick={() => handleRoomClick('about')}
                                aria-label="Teleport to About room"
                            />
                            <button
                                type="button"
                                className="absolute z-2 m-0 cursor-pointer appearance-none border-0 bg-transparent p-0 font-inherit text-inherit outline-none bottom-0 left-0 mb-[8%] ml-[10%] h-[35%] w-[30%]"
                                onMouseEnter={() => setHoveredRoom('gallery')}
                                onMouseLeave={() => setHoveredRoom(null)}
                                onFocus={() => setHoveredRoom('gallery')}
                                onBlur={() => setHoveredRoom(null)}
                                onClick={() => handleRoomClick('gallery')}
                                aria-label="Teleport to Gallery room"
                            />
                            <button
                                type="button"
                                className="absolute z-2 m-0 cursor-pointer appearance-none border-0 bg-transparent p-0 font-inherit text-inherit outline-none top-0 right-0 mr-[5%] mt-[10%] h-[25%] w-[35%]"
                                onMouseEnter={() => setHoveredRoom('contact')}
                                onMouseLeave={() => setHoveredRoom(null)}
                                onFocus={() => setHoveredRoom('contact')}
                                onBlur={() => setHoveredRoom(null)}
                                onClick={() => handleRoomClick('contact')}
                                aria-label="Teleport to Contact room"
                            />
                            <div className="pointer-events-none absolute z-4 -translate-x-1/2 -translate-y-1/2 text-center font-['Cabin_Sketch',cursive,sans-serif] text-[1.2rem] font-bold uppercase tracking-[2px] text-[#1a1a1a] [text-shadow:-1px_-1px_0_#fff,1px_-1px_0_#fff,-1px_1px_0_#fff,1px_1px_0_#fff] left-[26%] top-[28%]">ABOUT</div>
                            <div className="pointer-events-none absolute z-4 -translate-x-1/2 -translate-y-1/2 text-center font-['Cabin_Sketch',cursive,sans-serif] text-[1.2rem] font-bold uppercase tracking-[2px] text-[#1a1a1a] [text-shadow:-1px_-1px_0_#fff,1px_-1px_0_#fff,-1px_1px_0_#fff,1px_1px_0_#fff] left-[26%] top-[94%]">THE<br />GALLERY</div>
                            <div className="pointer-events-none absolute z-4 -translate-x-1/2 -translate-y-1/2 text-center font-['Cabin_Sketch',cursive,sans-serif] text-[1.2rem] font-bold uppercase tracking-[2px] text-[#1a1a1a] [text-shadow:-1px_-1px_0_#fff,1px_-1px_0_#fff,-1px_1px_0_#fff,1px_1px_0_#fff] left-[76%] top-[14%]">CONTACT</div>
                            {ROOMS.map((room) => (
                                <button
                                    key={room.id}
                                    className={`mobile-tap-target absolute z-2 h-[35px] w-[35px] max-md:h-11 max-md:w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-none p-0 transition-transform duration-200 hover:scale-[1.15] ${currentRoom === room.id ? 'drop-shadow-[0_0_4px_rgba(200,50,50,0.5)]' : ''}`}
                                    style={{ left: `${room.x}%`, top: `${room.y}%` }}
                                    onClick={() => handleRoomClick(room.id)}
                                    onMouseEnter={() => setHoveredRoom(room.id)}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                    title={room.label}
                                >
                                    <img src="/images/pin-slot.webp" alt="" className="h-full w-full object-contain" />
                                </button>
                            ))}

                            <div
                                className="pointer-events-none absolute z-3 w-5 -translate-x-1/2 -translate-y-[90%] transition-[left,top] duration-[400ms] ease-in-out"
                                style={{
                                    left: `${hoveredRoom
                                        ? ROOMS.find(r => r.id === hoveredRoom)?.x || PIN_START_POSITION.x
                                        : currentRoom && isInRoom
                                            ? ROOMS.find(r => r.id === currentRoom)?.x || PIN_START_POSITION.x
                                            : PIN_START_POSITION.x
                                        }%`,
                                    top: `${hoveredRoom
                                        ? ROOMS.find(r => r.id === hoveredRoom)?.y || PIN_START_POSITION.y
                                        : currentRoom && isInRoom
                                            ? ROOMS.find(r => r.id === currentRoom)?.y || PIN_START_POSITION.y
                                            : PIN_START_POSITION.y
                                        }%`
                                }}
                            >
                                <img src="/images/pin.webp" alt="You are here" className="h-auto w-full drop-shadow-[2px_2px_2px_rgba(0,0,0,0.3)]" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {hasEntered && (
                <div className={`pointer-events-none fixed right-6 top-0 z-95 w-[220px] -translate-y-full opacity-0 drop-shadow-[0_4px_15px_rgba(0,0,0,0.15)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] max-md:right-4 max-md:top-[env(safe-area-inset-top)] ${isAudioMenuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : ''}`} inert={!isAudioMenuOpen ? true : undefined}>
                    <div className="relative w-full overflow-hidden bg-white px-4 pb-5 pt-[18px] [clip-path:polygon(0%_0%,100%_0%,100%_0%,98%_10%,100%_20%,97%_35%,100%_50%,98%_65%,100%_80%,97%_90%,100%_100%,90%_97%,80%_100%,70%_96%,60%_100%,50%_97%,40%_100%,30%_96%,20%_100%,10%_97%,0%_100%,0%_100%,2%_90%,0%_80%,3%_65%,0%_50%,2%_35%,0%_20%,3%_10%,0%_0%)] before:pointer-events-none before:absolute before:-left-[20%] before:-top-[20%] before:-z-1 before:h-[140%] before:w-[140%] before:bg-[url('/textures/paper-texture.webp')] before:bg-cover before:bg-center before:content-['']">
                        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                            <path d="M0 0 L100 0 L98 10 L100 20 L97 35 L100 50 L98 65 L100 80 L97 90 L100 100 L90 97 L80 100 L70 96 L60 100 L50 97 L40 100 L30 96 L20 100 L10 97 L0 100 L2 90 L0 80 L3 65 L0 50 L2 35 L0 20 L3 10 L0 0 Z" fill="none" stroke="#1a1a1a" strokeWidth="0.5" />
                        </svg>
                        <div className="relative z-1 mb-3 flex items-center justify-between border-b-2 border-dashed border-[#bbb] pb-2">
                            <h3 className="m-0 font-['Patrick_Hand',cursive,sans-serif] text-sm font-bold tracking-[1.5px] text-[#1a1a1a]">AUDIO SETTINGS</h3>
                            <button
                                className="mobile-tap-target flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent opacity-60 transition-[transform,opacity] duration-200 hover:scale-110 hover:opacity-100 active:scale-95 max-md:h-11 max-md:w-11"
                                onClick={() => setIsAudioMenuOpen(false)}
                                aria-label="Close audio settings"
                                type="button"
                            >
                                <svg className="h-[14px] w-[14px] fill-none stroke-[#1a1a1a] stroke-[2.5] [stroke-linecap:round]" viewBox="0 0 24 24">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="relative z-1 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between font-['Patrick_Hand',cursive,sans-serif] text-sm font-semibold text-[#1a1a1a]">
                                    <span>Music</span>
                                    <span>{Math.round(bgmVol * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={bgmVol}
                                    onChange={(e) => handleBgmChange(parseFloat(e.target.value))}
                                    className="audio-slider h-1 w-full cursor-pointer appearance-none rounded-sm bg-[#ccc] outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1a1a1a] [&::-webkit-slider-thumb]:shadow-[1px_1px_2px_rgba(0,0,0,0.3)] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#1a1a1a] [&::-moz-range-thumb]:shadow-[1px_1px_2px_rgba(0,0,0,0.3)]"
                                    aria-label="Music volume"
                                    aria-valuetext={`${Math.round(bgmVol * 100)} percent`}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between font-['Patrick_Hand',cursive,sans-serif] text-sm font-semibold text-[#1a1a1a]">
                                    <span>SFX</span>
                                    <span>{Math.round(globalVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={globalVolume}
                                    onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
                                    className="audio-slider h-1 w-full cursor-pointer appearance-none rounded-sm bg-[#ccc] outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1a1a1a] [&::-webkit-slider-thumb]:shadow-[1px_1px_2px_rgba(0,0,0,0.3)] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#1a1a1a] [&::-moz-range-thumb]:shadow-[1px_1px_2px_rgba(0,0,0,0.3)]"
                                    aria-label="SFX volume"
                                    aria-valuetext={`${Math.round(globalVolume * 100)} percent`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(isMenuOpen || isAudioMenuOpen) && (
                <div
                    className="pointer-events-auto fixed inset-0 -z-1 bg-transparent"
                    onClick={() => {
                        setIsMenuOpen(false);
                        setIsAudioMenuOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default NavigationUI;
