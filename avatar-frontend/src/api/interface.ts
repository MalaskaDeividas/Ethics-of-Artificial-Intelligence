export const SUPPORTED_LANGUAGES = ["en-US", "sv-SE", "zh-CN"] as const;
export type Language = typeof SUPPORTED_LANGUAGES[number];

export const VOICE_BY_LANGUAGE: Record<Language, string> = {
    "zh-CN": "zh-CN-XiaoxiaoNeural",
    "en-US": "en-US-AnaNeural",
    "sv-SE": "sv-SE-SofieNeural",
};

export interface AvatarReply {
    /** The sentence the avatar should speak. */
    text: string;
    /** Language of `text`, which decides the voice used for synthesis. */
    language: Language;
}

export type UserAction = { kind: "image"; file: File }

export class BackendError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = "BackendError";
        this.code = code;
    }
}