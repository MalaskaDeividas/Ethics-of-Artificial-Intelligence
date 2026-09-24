import {drawDuck, DUCK_W, DUCK_H, type DuckState} from "./characters/duck";
import {VISEME_OPENNESS} from "./visemeMap";
import type {AvatarRenderer} from "./types";

/**
 * Exponential smoothing: smoothly pulls current value towards the target each frame.
 */
const smoothTowards = (current: number, target: number, factor: number): number =>
    current + (target - current) * factor;

export class Avatar2D implements AvatarRenderer {
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private animationFrameId = 0;
    private startTimeMs = performance.now();
    private resizeObserver?: ResizeObserver;

    /** Current visual state, continuously smoothed towards target values each frame */
    private currentState: DuckState = {open: 0, blink: 0, tongue: 0, breathe: 0};

    /** Target mouth openness (0 to 1) */
    private targetMouthOpen = 0;
    private isSpeaking = false;
    private blinkEndTime = 0;
    private nextBlinkTime = 2 + Math.random() * 3;

    async mount(host: HTMLElement): Promise<void> {
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.display = "block";
        host.appendChild(this.canvas);

        this.ctx = this.canvas.getContext("2d")!;
        this.resize();

        // Keep canvas backing store responsive to host container resizing
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(host);

        this.loop();
    }

    private resize(): void {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const bounds = this.canvas.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) return;

        this.canvas.width = Math.round(bounds.width * pixelRatio);
        this.canvas.height = Math.round(bounds.height * pixelRatio);
    }

    /**
     * Updates target mouth openness based on the incoming viseme ID.
     */
    setViseme(id: number): void {
        this.targetMouthOpen = VISEME_OPENNESS[id] ?? 0;
    }

    /**
     * Toggles speaking state. Immediately forces mouth closed when stopping speech.
     */
    setSpeaking(speaking: boolean): void {
        this.isSpeaking = speaking;
        if (!speaking) {
            this.targetMouthOpen = 0;
        }
    }

    private loop = (): void => {
        const elapsedTimeSec = (performance.now() - this.startTimeMs) / 1000;

        // 1. Mouth openness smoothing for continuous lip-sync transitions
        this.currentState.open = smoothTowards(this.currentState.open, this.targetMouthOpen, 0.35);

        // Tongue becomes visible only when the mouth is sufficiently open
        const targetTongue = this.currentState.open > 0.45 ? 0.6 : 0;
        this.currentState.tongue = smoothTowards(this.currentState.tongue, targetTongue, 0.25);

        // 2. Harmonic breathing cycle
        this.currentState.breathe = Math.sin(elapsedTimeSec * 1.6);

        // 3. Autonomous randomized blinking
        if (elapsedTimeSec > this.nextBlinkTime) {
            this.blinkEndTime = elapsedTimeSec + 0.13;
            this.nextBlinkTime = elapsedTimeSec + 2.5 + Math.random() * 3;
        }
        const targetBlink = elapsedTimeSec < this.blinkEndTime ? 1 : 0;
        this.currentState.blink = smoothTowards(this.currentState.blink, targetBlink, 0.45);

        this.render(elapsedTimeSec);
        this.animationFrameId = requestAnimationFrame(this.loop);
    };

    private render(elapsedTimeSec: number): void {
        const ctx = this.ctx;
        const {width: canvasWidth, height: canvasHeight} = this.canvas;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Uniform scaling and centering to fit reference design dimensions within any container
        const scale = Math.min(canvasWidth / DUCK_W, canvasHeight / DUCK_H);
        ctx.save();
        ctx.translate((canvasWidth - DUCK_W * scale) / 2, (canvasHeight - DUCK_H * scale) / 2);
        ctx.scale(scale, scale);

        // Subtle rhythmic head nod while actively speaking
        if (this.isSpeaking) {
            const nodOffset = Math.sin(elapsedTimeSec * 9) * 5;
            ctx.translate(0, nodOffset);
        }

        drawDuck(ctx, this.currentState);
        ctx.restore();
    }

    dispose(): void {
        cancelAnimationFrame(this.animationFrameId);
        this.resizeObserver?.disconnect();
        this.canvas?.remove();
    }
}