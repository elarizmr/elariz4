import { useEffect, useRef, useMemo, type CSSProperties } from 'react';
import gsap from 'gsap';
import { useScene } from '../../context/SceneContext';
import { useAudio } from '../../context/AudioManager';


interface TearLineSVGProps {
    svgPathData: string;
}

const TearLineSVG = ({ svgPathData }: TearLineSVGProps) => (
    <svg
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ pointerEvents: 'none' }}
    >
        <path
            d={svgPathData}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="0.1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const PaperTransition = () => {
    const {
        teleportPhase,
        startTeleportTransition,
        finishPaperOpen,
        teleportTarget
    } = useScene();
    const { play } = useAudio();

    const containerRef = useRef<HTMLDivElement>(null);
    const leftHalfRef = useRef<HTMLDivElement>(null);
    const rightHalfRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<gsap.core.Timeline | null>(null);

    const tearPoints = useMemo(() => {
        const points: [number, number][] = [];
        const segments = 12;

        points.push([50, 0]);

        for (let i = 1; i < segments; i++) {
            const y = (i / segments) * 100;
            const xOffset = (Math.random() - 0.5) * 6;
            const x = 50 + xOffset;
            points.push([x, y]);
        }

        points.push([50, 100]);
        return points;
    }, []);

    const svgPathData = useMemo(() => {
        return tearPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]} `).join(' ');
    }, [tearPoints]);

    const leftClipPoly = useMemo(() => {
        let poly = '0% 0%, ';
        tearPoints.forEach(p => { poly += `${p[0]}% ${p[1]}%, `; });
        poly += '0% 100%';
        return `polygon(${poly})`;
    }, [tearPoints]);

    const rightClipPoly = useMemo(() => {
        let poly = '100% 0%, ';
        poly += '100% 100%, ';
        [...tearPoints].reverse().forEach(p => { poly += `${p[0]}% ${p[1]}%, `; });
        return `polygon(${poly.slice(0, -2)})`;
    }, [tearPoints]);

    useEffect(() => {
        if (!leftHalfRef.current || !rightHalfRef.current || !containerRef.current) return;

        if (timelineRef.current) {
            timelineRef.current.kill();
        }

        if (teleportPhase === 'closing') {
            gsap.set(containerRef.current, { opacity: 1, display: 'block' });

            gsap.set(leftHalfRef.current, { xPercent: -100, rotation: -2 });
            gsap.set(rightHalfRef.current, { xPercent: 100, rotation: 2 });

            timelineRef.current = gsap.timeline({
                onComplete: () => {
                    startTeleportTransition();
                }
            });

            play('tear', { volume: 0.6 });

            timelineRef.current.to(leftHalfRef.current, {
                xPercent: 0,
                rotation: 0,
                duration: 0.8,
                ease: "power2.inOut"
            }, 'close');

            timelineRef.current.to(rightHalfRef.current, {
                xPercent: 0,
                rotation: 0,
                duration: 0.8,
                ease: "power2.inOut"
            }, 'close');
        }

        if (teleportPhase === 'teleporting') {
        }

        if (teleportPhase === 'opening') {
            timelineRef.current = gsap.timeline({
                onComplete: () => {
                    finishPaperOpen();
                }
            });

            play('tear', { volume: 0.8 });

            timelineRef.current.to(leftHalfRef.current, {
                xPercent: -100,
                rotation: -2,
                duration: 1.2,
                ease: "power3.inOut"
            }, 'tear');

            timelineRef.current.to(rightHalfRef.current, {
                xPercent: 100,
                rotation: 2,
                duration: 1.2,
                ease: "power3.inOut"
            }, 'tear');

            timelineRef.current.to(containerRef.current, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    gsap.set(containerRef.current, { display: 'none' });
                }
            }, '-=0.3');
        }

        return () => {
            if (timelineRef.current) {
                timelineRef.current.kill();
            }
        };
    }, [teleportPhase, startTeleportTransition, finishPaperOpen, play]);


    return (
        <div
        className="pointer-events-none fixed inset-0 z-100 cursor-auto"
            ref={containerRef}
            style={{ pointerEvents: 'none', display: 'none' }}
        >
            <div
            className="absolute bottom-0 left-0 top-0 h-full w-full bg-white bg-[url('/textures/paper-texture.webp')] bg-cover bg-center [filter:drop-shadow(0_0_10px_rgba(0,0,0,0.1))] [will-change:transform]"
                ref={leftHalfRef}
            style={{ clipPath: leftClipPoly } as CSSProperties}
            >
                <TearLineSVG svgPathData={svgPathData} />
            </div>

            <div
                className="absolute bottom-0 right-0 top-0 h-full w-full bg-white bg-[url('/textures/paper-texture.webp')] bg-cover bg-center [filter:drop-shadow(0_0_10px_rgba(0,0,0,0.1))] [will-change:transform]"
                ref={rightHalfRef}
                style={{ clipPath: rightClipPoly } as CSSProperties}
            >
                <TearLineSVG svgPathData={svgPathData} />
            </div>
        </div>
    );
};

export default PaperTransition;
