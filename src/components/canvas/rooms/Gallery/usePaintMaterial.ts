import { useMemo, type RefObject } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

interface PaintMaterialOptions {
    dirX?: number;
    dirY?: number;
    dirZ?: number;
    startDist?: number;
    endDist?: number;
    noiseAxes?: 'xz' | 'xy' | 'yz';
}

export const usePaintMaterial = (options: PaintMaterialOptions = {}) => {
    const {
        dirX = -1.0,
        dirY = 0.0,
        dirZ = 0.1,
        startDist = -5.0,
        endDist = 55.0,
        noiseAxes = 'yz'
    } = options;

    const uniformsData = useMemo(() => ({
        uPaintProgress: { value: 0.0 },
        uRoomOrigin: { value: new THREE.Vector3(0, 0, 0) }
    }), []);

    const noiseComponent1 = noiseAxes === 'xz' ? 'localPos.xz' : noiseAxes === 'xy' ? 'localPos.xy' : 'localPos.yz';
    const noiseComponent2 = noiseComponent1;

    const onBeforeCompile = useMemo(() => (shader: THREE.WebGLProgramParametersWithUniforms) => {
        shader.uniforms.uPaintProgress = uniformsData.uPaintProgress;
        shader.uniforms.uRoomOrigin = uniformsData.uRoomOrigin;

        shader.vertexShader = `
            varying vec3 vWorldPositionColor;
            ${shader.vertexShader}
        `;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <worldpos_vertex>',
            `
            #include <worldpos_vertex>
            vWorldPositionColor = (modelMatrix * vec4(position, 1.0)).xyz;
            `
        );

        shader.fragmentShader = `
            uniform float uPaintProgress;
            uniform vec3 uRoomOrigin;
            varying vec3 vWorldPositionColor;
            ${shader.fragmentShader}
        `;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>

            // Simple 2D noise
            float paintHash(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            float paintNoise(vec2 x) {
                vec2 i = floor(x); vec2 f = fract(x);
                float a = paintHash(i);
                float b = paintHash(i + vec2(1.0, 0.0));
                float c = paintHash(i + vec2(0.0, 1.0));
                float d = paintHash(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>

            // Compute position relative to room origin so the effect works
            // regardless of which corridor segment (chunk) the room is in
            vec3 localPos = vWorldPositionColor - uRoomOrigin;

            vec3 revealDir = normalize(vec3(${dirX.toFixed(1)}, ${dirY.toFixed(1)}, ${dirZ.toFixed(1)}));

            float startDist = ${startDist.toFixed(1)}; 
            float endDist = ${endDist.toFixed(1)};
            float targetDist = mix(startDist, endDist, uPaintProgress);
            
            float distFromPlane = targetDist - dot(localPos, revealDir);
            
            float n = paintNoise(${noiseComponent1} * 2.0) * 2.0;
            float n2 = paintNoise(${noiseComponent2} * 8.0) * 0.5;
            float combinedNoise = n + n2;

            float boundary = distFromPlane + combinedNoise;

            // Give a generous margin before discarding to allow a ragged edge
            if (boundary < 0.0) {
                discard;
            }

            // Create a glowing "wet paint" edge
            float glow = smoothstep(2.0, 0.0, boundary);
            
            // Brighten edge to look like fresh digital paint
            if (uPaintProgress < 0.999 && boundary < 2.0) {
                gl_FragColor.rgb += vec3(glow * 0.4, glow * 0.5, glow * 0.7);
            }
            `
        );
    }, [uniformsData, dirX, dirY, dirZ, startDist, endDist, noiseComponent1, noiseComponent2]);

    const animatePaint = (delay = 0, duration = 2.5) => {
        gsap.to(uniformsData.uPaintProgress, {
            value: 1.0,
            duration: duration,
            delay: delay,
            ease: 'power2.inOut',
            overwrite: 'auto'
        });
    };

    const resetPaint = () => {
        uniformsData.uPaintProgress.value = 0.0;
    };

    const updateRoomOrigin = (groupRef: RefObject<THREE.Group | null>) => {
        if (groupRef?.current) {
            groupRef.current.getWorldPosition(uniformsData.uRoomOrigin.value);
        }
    };

    return {
        onBeforeCompile,
        uniformsData,
        animatePaint,
        resetPaint,
        updateRoomOrigin,
        transparent: true,
        needsUpdate: true
    };
};
