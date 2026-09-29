import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import type {VisemeTrack} from "../types/viseme";

const SPEECH_LANGUAGE = "en-US"
const DUCK_VOICE = "en-US-AnaNeural";
const DUCKLING_PROSODY = {pitch: "+22%", rate: "+8%"};
const SDK_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY
const SDK_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION

function buildSsml(text: string): string {
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${SPEECH_LANGUAGE}">
                <voice name="${DUCK_VOICE}">
                    <prosody pitch="${DUCKLING_PROSODY.pitch}" rate="${DUCKLING_PROSODY.rate}">${text}</prosody>
                </voice>
            </speak>`;
}

export async function synthesizeSpeech(text: string): Promise<VisemeTrack> {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(SDK_KEY, SDK_REGION);
    speechConfig.speechSynthesisVoiceName = DUCK_VOICE;
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
            buildSsml(text),
            (result) => {
                synthesizer.close();

                if (result.reason !== SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    reject(new Error(result.errorDetails || "Speech synthesis failed"));
                    return;
                }

                resolve({
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
