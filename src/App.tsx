import { Component, useState, Suspense, useEffect, useCallback, useLayoutEffect, lazy, type ErrorInfo, type ReactNode } from 'react';
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import { Html, Preload, Text, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';

import Preloader from './components/dom/Preloader';
import PaperTransition from './components/dom/PaperTransition';
import { AudioProvider, useAudio } from './context/AudioManager';
import { initAudio } from './utils/audioManager';
import { PerformanceProvider, usePerformance } from './context/PerformanceContext';
import { SceneProvider, useScene } from './context/SceneContext';
import NavigationUI from './components/ui/NavigationUI';
import ScreenReaderOverlay from './components/ui/ScreenReaderOverlay';
import { TutorialToastProvider } from './context/TutorialToastContext';
import { useRoomRouting } from './hooks/useRoomRouting';
import { useIsMobile } from './hooks/useIsMobile';
const Experience = lazy(() => import('./components/canvas/Experience'));

import { 
  ENTRANCE_TEXTURES, 
  CORRIDOR_TEXTURES, 
  UI_TEXTURES,
  PRELOAD_ALL, 
  PRELOAD_LOADER,
  ABOUT_TEXTURES,
  IMAGE_ASSETS,
  filterTexturesByDevice
} from './config/texturePreloadList';
import { SafeTextureLoader, useSafeTexture } from './utils/safeTextureLoader';

const preloadBrowserImage = (path: string) => {
  if (typeof window === 'undefined') return;
  const img = new Image();
  img.src = path;
};

const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
const isWeakCPU = typeof navigator.hardwareConcurrency !== 'undefined' && navigator.hardwareConcurrency <= 4;
const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
const isLowRAM = typeof deviceMemory !== 'undefined' && deviceMemory <= 4;
const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 450;
const isLowEnd = isMobileDevice || isWeakCPU || isLowRAM || isSmallScreen;

const supportsHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

if (isLowEnd) {
  const CORE_TEXTURES = [...ENTRANCE_TEXTURES, ...CORRIDOR_TEXTURES, ...UI_TEXTURES, ...IMAGE_ASSETS];
  const filteredCore = filterTexturesByDevice(CORE_TEXTURES, supportsHover);
  const filteredAbout = filterTexturesByDevice(ABOUT_TEXTURES, supportsHover);

  filteredCore.forEach((path) => useLoader.preload(SafeTextureLoader, [path]));
  filteredAbout.forEach((path) => useLoader.preload(SafeTextureLoader, [path]));
} else {
  const filteredAll = filterTexturesByDevice(PRELOAD_ALL, supportsHover);
  const filteredLoader = filterTexturesByDevice(PRELOAD_LOADER, supportsHover);
  
  filteredAll.forEach((path) => useLoader.preload(SafeTextureLoader, [path]));
  filteredLoader.forEach((path) => useLoader.preload(SafeTextureLoader, [path]));
}

const FONT_URL = 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff';

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The 3D scene failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html fullscreen>
          <div
            role="alert"
            style={{
              alignItems: 'center',
              background: '#fafafa',
              color: '#222',
              display: 'flex',
              fontFamily: 'sans-serif',
              height: '100%',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              width: '100%',
            }}
          >
            The 3D scene could not be displayed. Please reload the page.
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}

const GlobalAudioEnabler = () => {
  const { enableAudio } = useAudio();
  useEffect(() => {
    const handleInteraction = () => enableAudio();
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [enableAudio]);
  return null;
};

const PaperSceneBackground = () => {
  const { scene } = useThree();
  const texture = useSafeTexture('/textures/paper-texture.webp');

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;

    return () => {
      scene.background = null;
    };
  }, [scene, texture]);

  return null;
};

function RoomRoutingBridge() {
  useRoomRouting();

  const { initialRoom, deeplinkHandled, hasEntered, teleportTo, markEntered } = useScene();

  useEffect(() => {
    if (initialRoom && hasEntered && !deeplinkHandled.current) {
      deeplinkHandled.current = true;
      setTimeout(() => teleportTo(initialRoom), 300);
    }
  }, [initialRoom, hasEntered, teleportTo, deeplinkHandled]);

  return null;
}

function AppContent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  const { settings, downgradeTier, tier } = usePerformance();
  const isMobile = useIsMobile();

  useEffect(() => {
    initAudio();
  }, []);

  const handleSceneReady = useCallback(() => {
    requestAnimationFrame(() => {
      setSceneReady(true);
    });
  }, []);

  return (
    <AudioProvider>
      <SceneProvider>
        <RoomRoutingBridge />
        <GlobalAudioEnabler />
        <div className="relative h-screen h-dvh w-full overflow-hidden">
          <div className="absolute inset-0 z-1">
            <Canvas
              camera={{
                position: [0, 0.2, 28],
                fov: isMobile && window.innerHeight > window.innerWidth ? 72 : 60,
                near: 0.1,
                far: 150
              }}
              gl={{
                antialias: isMobile ? false : settings.antialias,
                alpha: false,
                powerPreference: settings.powerPreference,
                localClippingEnabled: true,
                failIfMajorPerformanceCaveat: !isMobile
              }}
              dpr={isMobile ? [1, 1.5] : settings.dpr}
              shadows={isMobile ? false : settings.shadows}
              fallback={
                <div role="alert" className="flex h-full items-center justify-center bg-[#fafafa] p-6 text-center text-[#222]">
                  3D graphics are unavailable in this browser.
                </div>
              }
            >
              <color attach="background" args={['#fafafa']} />
              <fog attach="fog" args={['#fafafa', 15, 50]} />

              <PerformanceMonitor
                onDecline={() => downgradeTier()}
                flipflops={3}
                onFallback={() => downgradeTier()}
              />


              <CanvasErrorBoundary>
                <Suspense fallback={null}>
                  <ResponsiveCamera isMobile={isMobile} />
                  <Experience
                    isLoaded={isLoaded}
                    onSceneReady={handleSceneReady}
                    performanceTier={tier}
                  />
                  <Preload all />
                </Suspense>
              </CanvasErrorBoundary>
            </Canvas>
          </div>

          {isLoaded && (
            <>
              <NavigationUI />
              <PaperTransition />
              <ScreenReaderOverlay />
            </>
          )}

          <Preloader
            ready={sceneReady}
            onComplete={() => setIsLoaded(true)}
          />
        </div>
      </SceneProvider>
    </AudioProvider>
  );
}

const ResponsiveCamera = ({ isMobile }: { isMobile: boolean }) => {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    camera.aspect = size.width / size.height;
    camera.fov = isMobile && size.height > size.width ? 72 : 60;
    camera.updateProjectionMatrix();
  }, [camera, isMobile, size.height, size.width]);

  return null;
};

export default function App() {
  useEffect(() => {
    const filteredImages = filterTexturesByDevice(IMAGE_ASSETS, supportsHover);
    filteredImages.forEach(path => preloadBrowserImage(path));
  }, []);

  return (
    <PerformanceProvider>
      <TutorialToastProvider>
        <AppContent />
      </TutorialToastProvider>
    </PerformanceProvider>
  );
}
