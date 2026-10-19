import type { ThreeElements } from '@react-three/fiber';
import type { Vector3 } from 'three';

interface PaintUniforms {
    uPaintProgress: { value: number };
    uRoomOrigin: { value: Vector3 };
}

interface PaintConfig {
    dirX: number;
    dirY: number;
    dirZ: number;
    startDist: number;
    endDist: number;
    noiseAxes: 'xz' | 'xy' | 'yz';
}

declare module '@react-three/fiber' {
    interface ThreeElements {
        revealMaterial: ThreeElements['meshBasicMaterial'] & {
            uProgress?: number;
            paintUniforms?: PaintUniforms;
            paintConfig?: Partial<PaintConfig>;
        };
        revealBasicMaterial: ThreeElements['meshBasicMaterial'] & {
            uProgress?: number;
        };
    }
}
