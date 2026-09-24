export interface AvatarRenderer {
    mount(container: HTMLElement): Promise<void>;
    setViseme(id: number, weight: number): void;
    setSpeaking(on: boolean): void;
    dispose(): void;
}