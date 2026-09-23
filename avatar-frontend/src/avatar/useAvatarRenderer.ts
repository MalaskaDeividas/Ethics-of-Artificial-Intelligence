import {useEffect, useRef, useState} from "react";
import type {AvatarRenderer} from "./types";


export function useAvatarRenderer(factory: () => AvatarRenderer) {
    const hostRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<AvatarRenderer | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const renderer = factory();

        renderer.mount(hostRef.current!).then(() => {
            if (cancelled) {
                renderer.dispose();
                return;
            }

            rendererRef.current = renderer;
            setReady(true);
        });

        return () => {
            cancelled = true;
            renderer.dispose();
            rendererRef.current = null;
            setReady(false);
        };
    }, []);

    return {hostRef, rendererRef, ready};
}