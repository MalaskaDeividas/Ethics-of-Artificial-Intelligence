// Same as the response from SDK
export interface VisemeFrame {
    t: number;
    id: number;
}

export interface VisemeTrack {
    version: "1.0";
    locale: string;
    text: string;
    audio: { buffer: ArrayBuffer; durationMs: number };
    visemes: VisemeFrame[];
}