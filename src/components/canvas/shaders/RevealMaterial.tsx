import * as THREE from 'three';
import { extend } from '@react-three/fiber';

interface RevealPaintUniforms {
    uPaintProgress: { value: number };
    uRoomOrigin: { value: THREE.Vector3 };
}

interface RevealPaintConfig {
    dirX: number;
    dirY: number;
    dirZ: number;
    startDist: number;
    endDist: number;
    noiseAxes: 'xz' | 'xy' | 'yz';
}

interface RevealMaterialParameters extends THREE.MeshBasicMaterialParameters {
    paintUniforms?: RevealPaintUniforms;
    paintConfig?: Partial<RevealPaintConfig>;
    uProgress?: number;
}

class RevealMaterial extends THREE.MeshBasicMaterial {
    private _uProgress = 0;
    private _shader: THREE.WebGLProgramParametersWithUniforms | null = null;
    private _paintProgress: { value: number } | null = null;
    private _roomOrigin: { value: THREE.Vector3 } | null = null;
    private _paintConfig: RevealPaintConfig = {
        dirX: 0,
        dirY: -1,
        dirZ: 0,
        startDist: -25,
        endDist: 25,
        noiseAxes: 'xz',
    };

    constructor(params: RevealMaterialParameters = {}) {
        super(params);
        this._uProgress = 0.0;
        this._shader = null;
        this._paintProgress = null;
        this._roomOrigin = null;
        this._paintConfig = { ...this._paintConfig, ...params.paintConfig };
        if (params.paintUniforms) this.paintUniforms = params.paintUniforms;
        if (params.uProgress !== undefined) this.uProgress = params.uProgress;
    }

    get uProgress() { return this._uProgress; }
    set uProgress(v) {
        this._uProgress = v;
        if (this._shader) {
            this._shader.uniforms.uProgress.value = v;
        }
    }

    get paintUniforms() { return { uPaintProgress: this._paintProgress, uRoomOrigin: this._roomOrigin }; }
    set paintUniforms(v) {
        if (!v) return;
        this._paintProgress = v.uPaintProgress;
        this._roomOrigin = v.uRoomOrigin;
    }

    get paintConfig() { return this._paintConfig; }
    set paintConfig(v) {
        if (!v) return;
        this._paintConfig = { ...this._paintConfig, ...v };
    }

    // Ensure Three.js doesn't reuse a cached standard shader program
    customProgramCacheKey() {
        return this._paintProgress ? 'RevealMaterial_v3_paint' : 'RevealMaterial_v3';
    }

    onBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) {
        super.onBeforeCompile(shader, renderer);
        this._shader = shader;
        shader.uniforms.uProgress = { value: this._uProgress };

        const hasPaint = !!this._paintProgress;
        if (hasPaint) {
            shader.uniforms.uPaintProgress = this._paintProgress ?? { value: 0 };
            shader.uniforms.uRoomOrigin = this._roomOrigin ?? { value: new THREE.Vector3() };
        }

        if (hasPaint) {
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
        }

        const paintUniformsStr = hasPaint ? `
            uniform float uPaintProgress;
            uniform vec3 uRoomOrigin;
            varying vec3 vWorldPositionColor;
        ` : '';

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
`#include <common>
            uniform float uProgress;
            ${paintUniformsStr}

            float revealRand(vec2 n) { 
                return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
            }

            float revealNoise(vec2 p){
                vec2 ip = floor(p);
                vec2 u = fract(p);
                u = u*u*(3.0-2.0*u);
                float res = mix(
                    mix(revealRand(ip),revealRand(ip+vec2(1.0,0.0)),u.x),
                    mix(revealRand(ip+vec2(0.0,1.0)),revealRand(ip+vec2(1.0,1.0)),u.x),u.y);
                return res*res;
            }
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <alphatest_fragment>',
`#include <alphatest_fragment>

            // Brush-stroke reveal: progressively discard pixels from bottom to top
            if (uProgress > 0.001) {
                float rn = revealNoise(vMapUv * 15.0) * 0.15;
                float maskValue = (1.0 - vMapUv.y) + rn;
                float threshold = uProgress * 1.5;
                if (maskValue < threshold) discard;
            }
            `
        );

        if (hasPaint) {
            const noiseComp = this._paintConfig.noiseAxes === 'xz' ? 'localPos.xz' 
                : this._paintConfig.noiseAxes === 'xy' ? 'localPos.xy' : 'localPos.yz';

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
`#include <dithering_fragment>

                // === PAINT TRANSITION ===
                vec3 localPos = vWorldPositionColor - uRoomOrigin;
                vec3 revealDir = normalize(vec3(${this._paintConfig.dirX.toFixed(1)}, ${this._paintConfig.dirY.toFixed(1)}, ${this._paintConfig.dirZ.toFixed(1)}));
                
                float pStartDist = ${this._paintConfig.startDist.toFixed(1)};
                float pEndDist = ${this._paintConfig.endDist.toFixed(1)};
                float pTargetDist = mix(pStartDist, pEndDist, uPaintProgress);
                float pDistFromPlane = pTargetDist - dot(localPos, revealDir);
                
                float pn = revealNoise(${noiseComp} * 2.0) * 2.0;
                float pn2 = revealNoise(${noiseComp} * 8.0) * 0.5;
                float pBoundary = pDistFromPlane + pn + pn2;
                
                if (pBoundary < 0.0) {
                    discard;
                }
                
                if (uPaintProgress < 0.999 && pBoundary < 2.0) {
                    float pGlow = smoothstep(2.0, 0.0, pBoundary);
                    gl_FragColor.rgb += vec3(pGlow * 0.4, pGlow * 0.5, pGlow * 0.7);
                }
                `
            );
        }
    }
}

extend({ RevealMaterial });

export { RevealMaterial };
