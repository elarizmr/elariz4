import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";

export const TIERS = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;
export type PerformanceTier = keyof typeof TIERS;

interface TierSettings {
  dpr: [number, number];
  shadows: boolean;
  antialias: boolean;
  powerPreference: WebGLPowerPreference;
  physicsStep: number;
  textureQuality: "high" | "medium" | "low";
  particleCount: number;
}

interface PerformanceContextValue {
  tier: PerformanceTier;
  settings: TierSettings;
  isDetecting: boolean;
  downgradeTier: () => void;
}

const SETTINGS: Record<PerformanceTier, TierSettings> = {
  [TIERS.HIGH]: {
    dpr: [1, 2],
    shadows: true,
    antialias: true,
    powerPreference: "high-performance",
    physicsStep: 1 / 60,
    textureQuality: "high",
    particleCount: 1.0,
  },
  [TIERS.MEDIUM]: {
    dpr: [1, 1.5],
    shadows: false,
    antialias: true,
    powerPreference: "default",
    physicsStep: 1 / 60,
    textureQuality: "medium",
    particleCount: 0.6,
  },
  [TIERS.LOW]: {
    dpr: [0.8, 1], // Minimum 0.8x pixel density to avoid extreme pixelation
    shadows: false,
    antialias: false,
    powerPreference: "low-power",
    physicsStep: 1 / 45,
    textureQuality: "low",
    particleCount: 0.3,
  },
};

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

export const usePerformance = (): PerformanceContextValue => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error("usePerformance must be used within a PerformanceProvider");
  }
  return context;
};

export const PerformanceProvider = ({ children }: { children: ReactNode }) => {
  const [tier, setTier] = useState<PerformanceTier>(TIERS.HIGH);
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    const detectTier = () => {
      let detectedTier: PerformanceTier = TIERS.HIGH;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        detectedTier = TIERS.MEDIUM;
      }

      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
        detectedTier = isMobile ? TIERS.LOW : TIERS.MEDIUM;
      }

      const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      if (deviceMemory && deviceMemory <= 4) {
        detectedTier = TIERS.LOW;
      }
      

      setTier(detectedTier);
      setIsDetecting(false);
    };

    detectTier();
  }, []);

  const downgradeTier = () => {
    setTier((current) => {
      if (current === TIERS.HIGH) return TIERS.MEDIUM;
      if (current === TIERS.MEDIUM) return TIERS.LOW;
      return TIERS.LOW;
    });
  };

  const value = {
    tier,
    settings: SETTINGS[tier],
    isDetecting,
    downgradeTier,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};
