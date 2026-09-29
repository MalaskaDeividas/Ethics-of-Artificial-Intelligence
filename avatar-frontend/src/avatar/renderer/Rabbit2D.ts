import {drawRabbit, RABBIT_W, RABBIT_H, type RabbitState} from "../characters/rabbit.ts";
import type {RabbitRenderer} from "../types.ts";
import {BaseCanvasRenderer} from "./BaseCanvasRenderer.ts";

/**
 * Spring settings for the ears. Perking up is quick and bouncy, which is what
 * makes the rabbit look like it suddenly paid attention; drooping is slower
 * and heavier, with almost no bounce.
 */
const PERK_SPRING = {stiffness: 240, dampingRatio: 0.42};
const DROOP_SPRING = {stiffness: 60, dampingRatio: 0.7};

/** The right ear follows the left a beat later. Two ears moving in lockstep look mechanical. */
const SECOND_EAR_DELAY_SEC = 0.07;

/**
 * Frame-rate independent smoothing: closes the gap to the target at `rate`
 * per second, whether the display runs at 60 Hz or 120 Hz.
 */
const easeTowards = (current: number, target: number, rate: number, deltaSec: number): number =>
    current + (target - current) * (1 - Math.exp(-rate * deltaSec));

/** A damped spring driving how far one ear stands up. */
class EarSpring {
    lift = 0;
    velocity = 0;
    target = 0;
    readonly delaySec: number;

    constructor(delaySec: number) {
        this.delaySec = delaySec;
    }

    step(deltaSec: number): void {
        const {stiffness, dampingRatio} = this.target >= 0.5 ? PERK_SPRING : DROOP_SPRING;
        const damping = 2 * dampingRatio * Math.sqrt(stiffness);
        const acceleration = -stiffness * (this.lift - this.target) - damping * this.velocity;

        // Semi-implicit Euler: update velocity first, then position. Stable at these stiffnesses.
        this.velocity += acceleration * deltaSec;
        this.lift += this.velocity * deltaSec;
    }
}

export class Rabbit2D extends BaseCanvasRenderer implements RabbitRenderer {
    // private canvas!: HTMLCanvasElement;
    // private ctx!: CanvasRenderingContext2D;
    // private animationFrameId = 0;
    // private resizeObserver!: ResizeObserver;
    // private startTimeMs = performance.now();
    private lastFrameTimeMs = performance.now();

    private readonly leftEar = new EarSpring(0);
    private readonly rightEar = new EarSpring(SECOND_EAR_DELAY_SEC);

    private isListening = false;
    private isDrawing = false;
    /** When isListening last flipped, so the second ear can follow with a delay. */
    private listeningChangedAtSec = -Infinity;
    private nextTwitchTimeSec = 0;

    private blinkEndTime = 0;
    private nextBlinkTime = 1.5 + Math.random() * 3;

    /** Current visual state, eased towards its targets each frame */
    private currentState: RabbitState = {
        leftEarLift: 0,
        rightEarLift: 0,
        headTilt: 0,
        gaze: 0,
        blink: 0,
        breathe: 0,
        focus: 0,
        brushPhase: 0,
    };

    // async mount(host: HTMLElement): Promise<void> {
    //     this.canvas = document.createElement("canvas");
    //     this.canvas.style.width = "100%";
    //     this.canvas.style.height = "100%";
    //     this.canvas.style.display = "block";
    //     host.appendChild(this.canvas);
    //
    //     this.ctx = this.canvas.getContext("2d")!;
    //     this.resize();
    //
    //     this.resizeObserver = new ResizeObserver(() => this.resize());
    //     this.resizeObserver.observe(host);
    //
    //     this.loop();
    // }

    // private resize(): void {
    //     const pixelRatio = Math.min(window.devicePixelRatio, 2);
    //     const bounds = this.canvas.getBoundingClientRect();
    //     this.canvas.width = Math.round(bounds.width * pixelRatio);
    //     this.canvas.height = Math.round(bounds.height * pixelRatio);
    // }

    /** Ears up while someone is talking to the rabbit, down again when they stop. */
    setListening(listening: boolean): void {
        if (listening === this.isListening) return;
        this.isListening = listening;
        this.listeningChangedAtSec = this.elapsedSec();
        // Give the ears a moment to settle before the first twitch
        this.nextTwitchTimeSec = this.listeningChangedAtSec + 1.6 + Math.random() * 1.5;
    }

    /** Brush moving and tongue out in concentration, while the drawing is being made. */
    setDrawing(drawing: boolean): void {
        this.isDrawing = drawing;
    }

    private elapsedSec(): number {
        return (performance.now() - this.startTimeMs) / 1000;
    }

    loop = (): void => {
        const nowMs = performance.now();
        // Clamped so that returning to a background tab does not fling the ears
        const deltaSec = Math.min((nowMs - this.lastFrameTimeMs) / 1000, 1 / 30);
        this.lastFrameTimeMs = nowMs;
        const elapsedTimeSec = (nowMs - this.startTimeMs) / 1000;

        this.updateEars(elapsedTimeSec, deltaSec);
        this.updateFace(elapsedTimeSec, deltaSec);

        this.render();
        this.animationFrameId = requestAnimationFrame(this.loop);
    };

    private updateEars(elapsedTimeSec: number, deltaSec: number): void {
        const sinceChangeSec = elapsedTimeSec - this.listeningChangedAtSec;
        const wanted = this.isListening ? 1 : 0;

        for (const ear of [this.leftEar, this.rightEar]) {
            // Until its delay has passed, an ear keeps aiming where it was before
            ear.target = sinceChangeSec >= ear.delaySec ? wanted : 1 - wanted;
            ear.step(deltaSec);
        }

        // A listening rabbit flicks one ear now and then, as if catching a sound
        if (this.isListening && elapsedTimeSec > this.nextTwitchTimeSec) {
            const ear = Math.random() < 0.5 ? this.leftEar : this.rightEar;
            ear.velocity -= 2.2;
            this.nextTwitchTimeSec = elapsedTimeSec + 2 + Math.random() * 2.5;
        }

        this.currentState.leftEarLift = this.leftEar.lift;
        this.currentState.rightEarLift = this.rightEar.lift;
    }

    private updateFace(elapsedTimeSec: number, deltaSec: number): void {
        const state = this.currentState;

        // 1. Lean towards the duck and look at it while listening; look at the easel while drawing
        const targetTilt = this.isListening ? -0.07 : this.isDrawing ? -0.05 : 0;
        const targetGaze = this.isListening ? -5 : this.isDrawing ? -6 : 0;
        state.headTilt = easeTowards(state.headTilt, targetTilt, 5, deltaSec);
        state.gaze = easeTowards(state.gaze, targetGaze, 6, deltaSec);

        // 2. Drawing pose: the brush paw keeps circling, scaled by how focused the rabbit is
        state.focus = easeTowards(state.focus, this.isDrawing ? 1 : 0, 6, deltaSec);
        state.brushPhase += deltaSec * 7;

        // 3. Breathing, a touch slower than the duck's so the two never move in sync
        state.breathe = Math.sin(elapsedTimeSec * 1.45);

        // 4. Autonomous randomized blinking
        if (elapsedTimeSec > this.nextBlinkTime) {
            this.blinkEndTime = elapsedTimeSec + 0.13;
            this.nextBlinkTime = elapsedTimeSec + 2.5 + Math.random() * 3;
        }
        const targetBlink = elapsedTimeSec < this.blinkEndTime ? 1 : 0;
        state.blink = easeTowards(state.blink, targetBlink, 30, deltaSec);
    }

    private render(): void {
        const ctx = this.ctx;
        const {width: canvasWidth, height: canvasHeight} = this.canvas;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Uniform scale, centred horizontally and standing on the bottom edge,
        // so the rabbit shares a floor with the duck even if the box is off
        const scale = Math.min(canvasWidth / RABBIT_W, canvasHeight / RABBIT_H);
        ctx.save();
        ctx.translate((canvasWidth - RABBIT_W * scale) / 2, canvasHeight - RABBIT_H * scale);
        ctx.scale(scale, scale);

        drawRabbit(ctx, this.currentState);
        ctx.restore();
    }

    // dispose(): void {
    //     cancelAnimationFrame(this.animationFrameId);
    //     this.resizeObserver.disconnect();
    //     this.canvas.remove();
    // }
}
