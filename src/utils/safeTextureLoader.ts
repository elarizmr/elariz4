import { useLoader } from '@react-three/fiber';
import { SRGBColorSpace, Texture, TextureLoader } from 'three';

export class SafeTextureLoader extends TextureLoader {
    override load(
        url: string,
        onLoad?: (texture: Texture<HTMLImageElement>) => void,
        onProgress?: (event: ProgressEvent<EventTarget>) => void,
        _onError?: (error: unknown) => void
    ): Texture<HTMLImageElement> {
        return super.load(url, onLoad, onProgress, (error: unknown) => {
            console.warn(`Texture failed to load; using a plain fallback: ${url}`, error);

            const fallback = new Texture(new Image());
            fallback.image.onload = () => {
                fallback.needsUpdate = true;
            };
            fallback.image.src = `data:image/svg+xml,${encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#dcd8cd"/></svg>'
            )}`;
            fallback.colorSpace = SRGBColorSpace;
            onLoad?.(fallback);
        });
    }
}

type TextureInput = string | string[] | Record<string, string>;

export function useSafeTexture(url: string): Texture;
export function useSafeTexture(urls: string[]): Texture[];
export function useSafeTexture<T extends Record<string, string>>(urls: T): { [K in keyof T]: Texture };
export function useSafeTexture(input: TextureInput): Texture | Texture[] | Record<string, Texture> {
    const urls = typeof input === 'string'
        ? [input]
        : Array.isArray(input)
            ? input
            : Object.values(input);
    const textures = useLoader(SafeTextureLoader, urls);

    if (typeof input === 'string') return textures[0];
    if (Array.isArray(input)) return textures;
    return Object.fromEntries(Object.keys(input).map((key, index) => [key, textures[index]]));
}
