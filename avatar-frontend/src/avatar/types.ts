// base canvas render
export interface MountableRenderer {
    mount(container: HTMLElement): Promise<void>;

    dispose(): void;
}

export interface DuckRenderer extends MountableRenderer {
    setViseme(id: number, weight: number): void;

    setSpeaking(on: boolean): void;
}

export interface RabbitRenderer extends MountableRenderer {
    setListening(on: boolean): void;

    setDrawing(on: boolean): void;
}