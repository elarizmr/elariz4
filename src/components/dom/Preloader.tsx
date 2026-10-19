import { useState, useEffect, useRef, useMemo, type RefObject } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useAudio } from '../../context/AudioManager';

interface TearLineSVGProps {
  svgPathData: string;
  pathLength: number;
  strokeDashoffset: number;
  pathRef: RefObject<SVGPathElement | null>;
}

const TearLineSVG = ({ svgPathData, pathLength, strokeDashoffset, pathRef }: TearLineSVGProps) => (
  <svg
    className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    <path
      ref={pathRef}
      d={svgPathData}
      fill="none"
      stroke="#1a1a1a"
      strokeWidth="0.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        strokeDasharray: pathLength,
        strokeDashoffset: strokeDashoffset,
      }}
    />
  </svg>
);

const RingLoader = () => (
  <div className="pointer-events-none absolute left-1/2 top-1/2 z-5 h-[120px] w-[120px] animate-[ring-spin_10s_linear_infinite]">
    <svg className="[overflow:visible]" width="120" height="120" viewBox="0 0 100 100">
      <circle
        cx="50" cy="50" r="45"
        fill="none"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="10 15"
        opacity="0.8"
      />
      <circle
        cx="50" cy="50" r="35"
        fill="none"
        stroke="#000"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="5 10"
        opacity="0.5"
        className="animate-[ring-spin-reverse_4s_linear_infinite] [transform-origin:50%_50%]"
      />
    </svg>
  </div>
);

interface PreloaderProps {
  onComplete?: () => void;
  ready: boolean;
}

const Preloader = ({ onComplete, ready }: PreloaderProps) => {
  const [isDone, setIsDone] = useState(false);

  const [realProgress, setRealProgress] = useState(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    let t = 0;
    const origOnStart = THREE.DefaultLoadingManager.onStart;
    const origOnProgress = THREE.DefaultLoadingManager.onProgress;
    const origOnLoad = THREE.DefaultLoadingManager.onLoad;

    THREE.DefaultLoadingManager.onStart = (url, loaded, total) => {
      setActive(true);
      origOnStart?.(url, loaded, total);
    };

    THREE.DefaultLoadingManager.onProgress = (url, loaded, total) => {
      cancelAnimationFrame(t);
      t = requestAnimationFrame(() => {
        setRealProgress((loaded / total) * 100);
      });
      origOnProgress?.(url, loaded, total);
    };

    THREE.DefaultLoadingManager.onLoad = () => {
      cancelAnimationFrame(t);
      setRealProgress(100);
      setActive(false);
      
      const loadEnd = performance.now();
      const loadDuration = ((loadEnd - loadStartTime.current) / 1000).toFixed(2);
      
      origOnLoad?.();
    };

    return () => {
      THREE.DefaultLoadingManager.onStart = origOnStart;
      THREE.DefaultLoadingManager.onProgress = origOnProgress;
      THREE.DefaultLoadingManager.onLoad = origOnLoad;
    };
  }, []);

  const { play } = useAudio();
  const pencilSoundRef = useRef<ReturnType<typeof play> | null>(null);

  const loadStartTime = useRef(performance.now());

  const containerRef = useRef<HTMLDivElement>(null);
  const leftHalfRef = useRef<HTMLDivElement>(null);
  const rightHalfRef = useRef<HTMLDivElement>(null);
  const pathLeftRef = useRef<SVGPathElement>(null);
  const pathRightRef = useRef<SVGPathElement>(null);
  const textLeftRef = useRef<HTMLSpanElement>(null);
  const textRightRef = useRef<HTMLSpanElement>(null);

  const [targetProgress, setTargetProgress] = useState(0);
  const displayProgressRef = useRef(0);
  const trackerRef = useRef({ val: 0 });
  const readyRef = useRef(ready);

  useEffect(() => { readyRef.current = ready; }, [ready]);

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
    tearPoints.forEach((p) => { poly += `${p[0]}% ${p[1]}%, `; });
    poly += '0% 100%';
    return `polygon(${poly})`;
  }, [tearPoints]);

  const rightClipPoly = useMemo(() => {
    let poly = '100% 0%, ';
    poly += '100% 100%, ';
    [...tearPoints].reverse().forEach((p) => { poly += `${p[0]}% ${p[1]}%, `; });
    return `polygon(${poly.slice(0, -2)})`;
  }, [tearPoints]);


  useEffect(() => {
    let newTarget = 0;
    if (active) {
      newTarget = (realProgress / 100) * 85;
    } else {
      if (ready) {
        newTarget = 100;
      } else {
        newTarget = 90;
      }
    }

    setTargetProgress((prev) => Math.max(prev, newTarget));
  }, [realProgress, active, ready]);

  const checkProgressTriggers = (val: number) => {
    if (val < 99 && !pencilSoundRef.current) {
      pencilSoundRef.current = play('pencil', { loop: true, volume: 0.5 });
    }
    else if (val >= 99 && pencilSoundRef.current) {
      pencilSoundRef.current.stop();
      pencilSoundRef.current = null;
    }

    if (val >= 99.5 && readyRef.current && !exitStarted.current) {
      exitStarted.current = true;
      startExit();
    }
  };

  useEffect(() => {
    return () => {
      if (pencilSoundRef.current) {
        pencilSoundRef.current.stop();
        pencilSoundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const distance = targetProgress - displayProgressRef.current;
    let duration = 0.5;

    if (distance > 60) {
      duration = 1.5;
    } else if (distance > 30) {
      duration = 1.0;
    } else if (distance > 10) {
      duration = 0.6;
    } else if (distance > 0) {
      duration = 0.4;
    }

    gsap.to(trackerRef.current, {
      val: targetProgress,
      duration: duration,
      ease: "power2.out",
      overwrite: true,
      onUpdate: () => {
        const val = trackerRef.current.val;
        displayProgressRef.current = val;

        const safeProgress = Math.min(100, Math.max(0, val));
        const strokeDashoffset = 120 - (120 * safeProgress) / 100;
        const percentageText = `${Math.round(safeProgress)}%`;

        if (textLeftRef.current) textLeftRef.current.innerText = percentageText;
        if (textRightRef.current) textRightRef.current.innerText = percentageText;
        if (pathLeftRef.current) pathLeftRef.current.style.strokeDashoffset = String(strokeDashoffset);
        if (pathRightRef.current) pathRightRef.current.style.strokeDashoffset = String(strokeDashoffset);

        checkProgressTriggers(val);
      }
    });

  }, [targetProgress]);


  const exitStarted = useRef(false);

  useEffect(() => {
    if (displayProgressRef.current >= 99.5 && ready && !exitStarted.current) {
      exitStarted.current = true;
      startExit();
    }
  }, [ready]);

  const startExit = () => {
    exitStarted.current = true;

    if (pencilSoundRef.current) {
      pencilSoundRef.current.stop();
      pencilSoundRef.current = null;
    }
    play('tear', { volume: 0.8 });

    const tl = gsap.timeline({
      onComplete: () => {
        setIsDone(true);
        
        const exitEnd = performance.now();
        const totalDuration = ((exitEnd - loadStartTime.current) / 1000).toFixed(2);
        
        onComplete?.();
      }
    });

    tl.to({}, { duration: 0.1 });

    tl.to(leftHalfRef.current, {
      xPercent: -100,
      rotation: -2,
      duration: 1.8,
      ease: "power3.inOut"
    }, 'tear');

    tl.to(rightHalfRef.current, {
      xPercent: 100,
      rotation: 2,
      duration: 1.8,
      ease: "power3.inOut"
    }, 'tear');

    tl.to(containerRef.current, {
      opacity: 0,
      duration: 0.5
    }, '-=0.5');
  };

  if (isDone) return null;

  const pathLength = 120;
  const safeProgress = Math.min(100, Math.max(0, displayProgressRef.current));
  const strokeDashoffset = pathLength - (pathLength * safeProgress) / 100;
  const percentageText = `${Math.round(safeProgress)}%`;

  return (
    <div className="pointer-events-auto fixed inset-0 z-100 cursor-auto" ref={containerRef}>
      <div
        className="absolute bottom-0 left-0 top-0 h-full w-full bg-white [background-image:url('/textures/paper-texture.webp')] bg-cover bg-center [filter:drop-shadow(0_0_10px_rgba(0,0,0,0.1))] will-change-transform"
        ref={leftHalfRef}
        style={{ clipPath: leftClipPoly }}
      >
        <div className="absolute left-0 top-1/2 z-20 flex w-full -translate-y-1/2 items-center justify-center overflow-visible text-center font-handwritten text-[2rem] font-bold text-ink mix-blend-multiply">
          <span ref={textLeftRef}>{percentageText}</span>
          <RingLoader />
        </div>

        <TearLineSVG pathRef={pathLeftRef} svgPathData={svgPathData} pathLength={pathLength} strokeDashoffset={strokeDashoffset} />
      </div>

      <div
        className="absolute bottom-0 right-0 top-0 h-full w-full bg-white [background-image:url('/textures/paper-texture.webp')] bg-cover bg-center [filter:drop-shadow(0_0_10px_rgba(0,0,0,0.1))] will-change-transform"
        ref={rightHalfRef}
        style={{ clipPath: rightClipPoly }}
      >
        <div className="absolute left-0 top-1/2 z-20 flex w-full -translate-y-1/2 items-center justify-center overflow-visible text-center font-handwritten text-[2rem] font-bold text-ink mix-blend-multiply">
          <span ref={textRightRef}>{percentageText}</span>
          <RingLoader />
        </div>

        <TearLineSVG pathRef={pathRightRef} svgPathData={svgPathData} pathLength={pathLength} strokeDashoffset={strokeDashoffset} />
      </div>
    </div>
  );
};

export default Preloader;
