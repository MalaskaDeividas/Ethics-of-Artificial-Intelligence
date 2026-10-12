// Same as the response from SDK
export interface VisemeFrame {
    t: number;
    id: number;
}

export interface VisemeTrack {
    text: string;
    audio: { buffer: ArrayBuffer; durationMs: number };
    visemes: VisemeFrame[];
}