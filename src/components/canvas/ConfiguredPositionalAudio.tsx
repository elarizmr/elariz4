import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { PositionalAudio as DreiPositionalAudio, type PositionalAudioProps } from '@react-three/drei';
import type { PositionalAudio as ThreePositionalAudio } from 'three';

type DistanceModel = 'linear' | 'inverse' | 'exponential';

interface ConfiguredPositionalAudioProps extends Omit<PositionalAudioProps, 'distance'> {
    distance?: number;
    distanceModel?: DistanceModel;
    refDistance?: number;
    rolloffFactor?: number;
    volume?: number;
}

const ConfiguredPositionalAudio = forwardRef<ThreePositionalAudio, ConfiguredPositionalAudioProps>(
    function ConfiguredPositionalAudio({ distance, distanceModel, refDistance, rolloffFactor, volume, ...props }, forwardedRef) {
        const audioRef = useRef<ThreePositionalAudio>(null);

        useImperativeHandle(forwardedRef, () => {
            if (!audioRef.current) {
                throw new Error('Positional audio has not mounted');
            }
            return audioRef.current;
        }, []);

        useEffect(() => {
            const audio = audioRef.current;
            if (!audio) return;
            if (distanceModel) audio.setDistanceModel(distanceModel);
            if (refDistance !== undefined) audio.setRefDistance(refDistance);
            if (rolloffFactor !== undefined) audio.setRolloffFactor(rolloffFactor);
            if (volume !== undefined) audio.setVolume(volume);
        }, [distanceModel, refDistance, rolloffFactor, volume]);

        return <DreiPositionalAudio ref={audioRef} distance={refDistance ?? distance} {...props} />;
    },
);

export default ConfiguredPositionalAudio;
