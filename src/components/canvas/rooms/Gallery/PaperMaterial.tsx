import { forwardRef, useMemo, useRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface PaperMaterialHandle {
    bend: number;
    windStrength: number;
    uProgress: number;
    material: THREE.MeshBasicMaterial | null;
}

interface PaperMaterialProps extends Omit<THREE.MeshBasicMaterialParameters, 'map' | 'side'> {
    roughness?: number;
    map?: THREE.Texture | null;
    mapBack?: THREE.Texture | null;
    mapPainted?: THREE.Texture | null;
    side?: THREE.Side;
    paintProgress?: { value: number };
    roomOrigin?: { value: THREE.Vector3 };
}

const PaperMaterial = forwardRef<PaperMaterialHandle, PaperMaterialProps>(function PaperMaterial(
    { color = '#e0e0e0', roughness = 0.6, map, side = THREE.DoubleSide, paintProgress, roomOrigin, ...props },
    ref,
) {
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);

    const onBeforeCompile = useMemo(() => (shader: THREE.WebGLProgramParametersWithUniforms) => {
        shader.uniforms.uBend = { value: 0 };
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uWindStrength = { value: 0 };
        shader.uniforms.mapBack = { value: null };
        shader.uniforms.mapPainted = { value: null };
        shader.uniforms.mapPainted = { value: null };
        shader.uniforms.uProgress = { value: 0.0 };
        shader.uniforms.uPaintProgress = paintProgress || { value: 1.0 };
        shader.uniforms.uRoomOrigin = roomOrigin || { value: new THREE.Vector3(0, 0, 0) };

        shader.vertexShader = `
            uniform float uBend;
            uniform float uTime;
            uniform float uWindStrength;
            varying vec3 vWorldPositionColor;
        ` + shader.vertexShader;

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            
            vWorldPositionColor = (modelMatrix * vec4(position, 1.0)).xyz;
            // Simple parabolic bend
            float bendAmount = pow(transformed.y, 2.0) * uBend;
            transformed.z += bendAmount;

            // Add subtle flutter inspired by wind
            // Base flutter + Extra Wind Strength on hover
            float totalWind = 0.02 + uWindStrength; 
            // SLOWER FLUTTER: Reduced speed (uTime * 2.0) and frequency (y * 2.0)
            float flutter = sin(uTime * 2.0 + transformed.y * 2.0) * totalWind * (1.0 + abs(uBend * 3.0));
            transformed.z += flutter;
            `
        );

        shader.fragmentShader = `
            uniform sampler2D mapBack;
            uniform sampler2D mapPainted;
            uniform float uProgress;
            uniform float uPaintProgress;
            uniform vec3 uRoomOrigin;
            varying vec3 vWorldPositionColor;

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
        ` + shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `
            #ifdef USE_MAP
                vec4 texColor = texture2D( map, vMapUv );

                // --- Added Brush Reveal Logic ---
                if (gl_FrontFacing && uProgress > 0.001) {
                    vec4 paintedColor = texture2D(mapPainted, vMapUv);
                    float rn = revealNoise(vMapUv * 15.0) * 0.15;
                    float maskValue = (1.0 - vMapUv.y) + rn;
                    float threshold = uProgress * 1.5;
                    if (maskValue < threshold) {
                        texColor = paintedColor;
                    }
                }
                
                // Flip Y UV to turn it upside down as requested
                // And keep X standard (vMapUv.x) to create a mirror effect (since back view naturally mirrors)
                vec2 backUv = vec2(vMapUv.x, 1.0 - vMapUv.y);
                vec4 backColor = texture2D( mapBack, backUv );
                
                vec4 sampledDiffuseColor = gl_FrontFacing ? texColor : backColor;
                
                diffuseColor *= sampledDiffuseColor;
                
                // Slight brightness boost for readability
                diffuseColor.rgb *= 1.4;
            #endif
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>

            // Compute position relative to room origin so the effect works
            // regardless of which corridor segment (chunk) the room is in
            vec3 localPos = vWorldPositionColor - uRoomOrigin;

            float dirX = -1.0;
            float dirZ = 0.1; 
            vec3 revealDir = normalize(vec3(dirX, 0.0, dirZ));

            float startDist = -5.0; 
            float endDist = 55.0;
            float targetDist = mix(startDist, endDist, uPaintProgress);
            
            float distFromPlane = targetDist - dot(localPos, revealDir);
            
            // Use localPos for noise too so the pattern is consistent
            float n = revealNoise(localPos.yz * 2.0) * 2.0;
            float n2 = revealNoise(localPos.yz * 8.0) * 0.5;
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

        if (materialRef.current) materialRef.current.userData.shader = shader;

        if (props.mapBack && shader.uniforms.mapBack) {
            shader.uniforms.mapBack.value = props.mapBack;
        }
        if (props.mapPainted && shader.uniforms.mapPainted) {
            shader.uniforms.mapPainted.value = props.mapPainted;
        }
    }, [props.mapBack, props.mapPainted]);

    useImperativeHandle(ref, () => ({
        set bend(value) {
            if (materialRef.current?.userData?.shader) {
                materialRef.current.userData.shader.uniforms.uBend.value = value;
            }
        },
        get bend() {
            return materialRef.current?.userData?.shader?.uniforms.uBend.value || 0;
        },
        set windStrength(value) {
            if (materialRef.current?.userData?.shader) {
                materialRef.current.userData.shader.uniforms.uWindStrength.value = value;
            }
        },
        get windStrength() {
            return materialRef.current?.userData?.shader?.uniforms.uWindStrength.value || 0;
        },
        set uProgress(value) {
            if (materialRef.current?.userData?.shader) {
                materialRef.current.userData.shader.uniforms.uProgress.value = value;
            }
        },
        get uProgress() {
            return materialRef.current?.userData?.shader?.uniforms.uProgress.value || 0;
        },
        material: materialRef.current
    }), []);

    useFrame((state) => {
        if (materialRef.current?.userData?.shader) {
            materialRef.current.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime();
            if (shaderHasUniform(materialRef.current.userData.shader, 'mapBack')) {
                materialRef.current.userData.shader.uniforms.mapBack.value = props.mapBack || null;
            }
            if (shaderHasUniform(materialRef.current.userData.shader, 'mapPainted')) {
                materialRef.current.userData.shader.uniforms.mapPainted.value = props.mapPainted || null;
            }
        }
    });

    const shaderHasUniform = (shader: THREE.WebGLProgramParametersWithUniforms, name: string) => shader.uniforms[name] !== undefined;

    return (
        <meshBasicMaterial
            ref={materialRef}
            map={map}
            color={color}
            side={side}
            onBeforeCompile={onBeforeCompile}
            needsUpdate={true}
            {...props}
        />
    );
});

export default PaperMaterial;
