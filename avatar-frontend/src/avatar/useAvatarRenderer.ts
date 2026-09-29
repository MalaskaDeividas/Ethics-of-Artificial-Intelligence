import {useEffect, useRef, useState} from "react";
import type {MountableRenderer} from "./types";

export function useAvatarRenderer<Renderer extends MountableRenderer>(factory: () => Renderer) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<Renderer | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const renderer = factory();

        renderer.mount(containerRef.current!).then(() => {
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

    return {containerRef, rendererRef, ready};
}
