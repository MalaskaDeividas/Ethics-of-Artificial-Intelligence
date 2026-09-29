export function delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(signal.reason);
            return;
        }

        const onAbort = () => {
            clearTimeout(timer);
            reject(signal.reason);
        };
        const timer = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, ms);

        signal.addEventListener("abort", onAbort, {once: true});
    });
}

export function configCanvasContext(ctx: CanvasRenderingContext2D) {
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Apply fill and stroke styles
    return (fillColor?: string | null, strokeColor?: string | null) => {
        if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.stroke();
        }
    };
}

export function handleCanvasMount() {

}