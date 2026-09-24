import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import type {VisemeTrack} from "../types/viseme.ts";
import {type Language, VOICE_BY_LANGUAGE} from "../api/interface.ts";

const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY
const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION

export async function synthesizeSpeech(text: string, language: Language): Promise<VisemeTrack> {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisVoiceName = VOICE_BY_LANGUAGE[language];
    speechConfig.speechSynthesisOutputFormat =
        SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, null);

    const visemes: VisemeTrack["visemes"] = [];
    synthesizer.visemeReceived = (_sender, event) => {
        // audioOffset is in ticks of 100ns; divide by 10,000 to get milliseconds
        visemes.push({t: event.audioOffset / 10000, id: event.visemeId});
    };

    return new Promise<VisemeTrack>((resolve, reject) => {
        synthesizer.speakSsmlAsync(
            buildSsml(text, language),
            (result) => {
                synthesizer.close();
                if (result.reason !== SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    reject(new Error(result.errorDetails || "Speech synthesis failed"));
                    return;
                }
                resolve({
                    language,
                    text,
                    visemes,
                    audio: {buffer: result.audioData, durationMs: result.audioDuration / 10000},
                });
            },
            (error) => {
                synthesizer.close();
                reject(new Error(String(error)));
            },
        );
    });
}

function buildSsml(text: string, language: Language): string {
    const voiceName = VOICE_BY_LANGUAGE[language];
    return `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}">
            <voice name="${voiceName}">
                <prosody pitch="+22%" rate="+8%">${text}</prosody>
            </voice>
        </speak>
    `;
}