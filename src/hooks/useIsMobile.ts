import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px), (pointer: coarse)';

export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_QUERY);
        const update = () => setIsMobile(mediaQuery.matches);

        update();
        mediaQuery.addEventListener('change', update);
        window.addEventListener('resize', update);

        return () => {
            mediaQuery.removeEventListener('change', update);
            window.removeEventListener('resize', update);
        };
    }, []);

    return isMobile;
};
