import * as THREE from 'three';
import { extend } from '@react-three/fiber';

interface PaintRevealMaterialParameters extends THREE.MeshBasicMaterialParameters {
    uMapPainted?: THREE.Texture | null;
}

class PaintRevealMaterial extends THREE.MeshBasicMaterial {
    private _uProgress = 0;
    private _uMapPainted: THREE.Texture | null = null;
    private _shader: THREE.WebGLProgramParametersWithUniforms | null = null;

    constructor(params: PaintRevealMaterialParameters = {}) {
        const { uMapPainted, ...standardParams } = params;
        super(standardParams);
        this._uProgress = 0.0;
        this._uMapPainted = uMapPainted || null;
        this._shader = null;
    }

    get uProgress() { return this._uProgress; }
    set uProgress(v) {
        this._uProgress = v;
        if (this._shader) {
            this._shader.uniforms.uProgress.value = v;
        }
    }

    get uMapPainted() { return this._uMapPainted; }
    set uMapPainted(v) {
        this._uMapPainted = v;
        if (this._shader) {
            this._shader.uniforms.uMapPainted.value = v;
        }
    }

    customProgramCacheKey() {
        return 'PaintRevealMaterial_v1';
    }

    onBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) {
        super.onBeforeCompile(shader, renderer);
        this._shader = shader;
        shader.uniforms.uProgress = { value: this._uProgress };
        shader.uniforms.uMapPainted = { value: this._uMapPainted };

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
`#include <common>
            uniform float uProgress;
            uniform sampler2D uMapPainted;

            float paintRand(vec2 n) { 
                return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
            }

            float paintNoise(vec2 p){
                vec2 ip = floor(p);
                vec2 u = fract(p);
                u = u*u*(3.0-2.0*u);
                float res = mix(
                    mix(paintRand(ip),paintRand(ip+vec2(1.0,0.0)),u.x),
                    mix(paintRand(ip+vec2(0.0,1.0)),paintRand(ip+vec2(1.0,1.0)),u.x),u.y);
                return res*res;
            }
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
`#include <map_fragment>

            // Brush-stroke blend: progressively swap sketch→painted
            if (uProgress > 0.001) {
                vec4 paintedColor = texture2D(uMapPainted, vMapUv);
                float rn = paintNoise(vMapUv * 15.0) * 0.15;
                // Reveal from bottom-left to top-right for organic feel
                float maskValue = (1.0 - vMapUv.y) + rn;
                float threshold = uProgress * 1.5;
                if (maskValue < threshold) {
                    // Replace the diffuseColor with painted version
                    diffuseColor = vec4(paintedColor.rgb, 1.0);
                }
            }
            `
        );
    }
}

extend({ PaintRevealMaterial });

export { PaintRevealMaterial };
