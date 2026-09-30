import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import type {VisemeTrack} from "../types/viseme";

const SPEECH_LANGUAGE = "en-US";
const DUCK_VOICE = "en-US-AnaNeural";
const DUCKLING_PROSODY = {pitch: "+22%", rate: "+8%"};
const SDK_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const SDK_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION;

function buildSsml(text: string): string {
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${SPEECH_LANGUAGE}">
                <voice name="${DUCK_VOICE}">
                    <prosody pitch="${DUCKLING_PROSODY.pitch}" rate="${DUCKLING_PROSODY.rate}">${text}</prosody>
                </voice>
            </speak>`;
}

function safeFallbackTrack(text: string): VisemeTrack {
    const words = text.split(/\s+/).length;
    const durationMs = Math.max(2000, words * 300);
    const visemes: VisemeTrack["visemes"] = [];
    
    // Animate the duck's beak open/close while talking
    for (let t = 0; t < durationMs; t += 150) {
        visemes.push({t, id: (t / 150) % 2 === 0 ? 2 : 0});
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1.3;
        window.speechSynthesis.speak(utterance);
    }

    return {
        text,
        visemes,
        audio: {buffer: new ArrayBuffer(0), durationMs},
    };
}

export async function synthesizeSpeech(text: string): Promise<VisemeTrack> {
    if (!SDK_KEY || !SDK_REGION) {
        return safeFallbackTrack(text);
    }

    try {
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(SDK_KEY, SDK_REGION);
        speechConfig.speechSynthesisVoiceName = DUCK_VOICE;
        speechConfig.speechSynthesisOutputFormat =
            SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);
        const visemes: VisemeTrack["visemes"] = [];

        synthesizer.visemeReceived = (_sender, event) => {
            visemes.push({t: event.audioOffset / 10000, id: event.visemeId});
        };

        return await new Promise<VisemeTrack>((resolve) => {
            synthesizer.speakSsmlAsync(
                buildSsml(text),
                (result) => {
                    synthesizer.close();
                    if (result.reason !== SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                        resolve(safeFallbackTrack(text));
                        return;
                    }
                    resolve({
                        text,
                        visemes,
                        audio: {buffer: result.audioData, durationMs: result.audioDuration / 10000},
                    });
                },
                (_err) => {
                    synthesizer.close();
                    resolve(safeFallbackTrack(text));
                },
            );
        });
    } catch {
        return safeFallbackTrack(text);
    }
}