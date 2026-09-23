import type {AvatarReply, Language} from "./interface.ts";

const SIMULATED_LATENCY_MS = 1100;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function askMockBackend(language: Language): Promise<AvatarReply> {
    await delay(SIMULATED_LATENCY_MS);
    return {
        text: DESCRIBE_IMAGE[language],
        language,
    };
}

const DESCRIBE_IMAGE: Record<Language, string> = {
    "en-US": "Ooh, such warm colours! It feels all cosy. So much green! Were you outside? I want to go too! All that blue — is it the sky, or the sea?",
    "sv-SE": "Oj, vilka varma färger! Det känns riktigt mysigt. Så mycket grönt! Var du ute? Jag vill också med! Allt det där blåa — är det himlen eller havet?",
    "zh-CN": "哇——好暖和的颜色呀，看着心里热乎乎的！好多绿色！是在外面拍的吗？我也想去！这么多蓝蓝的颜色，是天空，还是大海呀？"
}