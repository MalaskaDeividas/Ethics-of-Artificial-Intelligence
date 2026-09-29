import type {MountableRenderer} from "../types.ts";

export abstract class BaseCanvasRenderer implements MountableRenderer {
    canvas!: HTMLCanvasElement;
    ctx!: CanvasRenderingContext2D;
    resizeObserver!: ResizeObserver;
    animationFrameId = 0;
    startTimeMs = performance.now();

    async mount(container: HTMLElement): Promise<void> {
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.display = "block";
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext("2d")!;
        this.resize();

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);

        this.loop();
    }

    dispose(): void {
        cancelAnimationFrame(this.animationFrameId);
        this.resizeObserver.disconnect();
        this.canvas.remove();
    }

    resize(): void {
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        const bounds = this.canvas.getBoundingClientRect();
        this.canvas.width = Math.round(bounds.width * pixelRatio);
        this.canvas.height = Math.round(bounds.height * pixelRatio);
    }

    abstract loop(): void;
}