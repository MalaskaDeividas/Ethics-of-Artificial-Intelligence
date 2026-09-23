import {useAvatarRenderer} from "./avatar/useAvatarRenderer.ts";
import {Avatar2D} from "./avatar/Avatar2D.ts";
import {playTrack, ensureAudio} from "./avatar/playTrack";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import {useState} from "react";

const VOICES = {
    "sv-SE": "sv-SE-SofieNeural",
    "en-US": "en-US-AnaNeural",      // 童声，配可爱角色
    "zh-CN": "zh-CN-XiaoxiaoNeural",
} as const;
type Locale = keyof typeof VOICES;

export function Demo() {
    const {hostRef, rendererRef, ready} = useAvatarRenderer(() => new Avatar2D());
    const [text, setText] = useState("Hej! Jag är en liten anka som kan prata.");
    const [locale, setLocale] = useState<Locale>("sv-SE");
    const [status, setStatus] = useState("Waiting");
    const [visemeCount, setVisemeCount] = useState(0);

    async function speak() {
        if (!rendererRef.current) return;
        await ensureAudio();                       // ★ 必须在点击的调用栈里
        setStatus("Synthesizing…");

        const cfg = SpeechSDK.SpeechConfig.fromSubscription(
            import.meta.env.VITE_AZURE_SPEECH_KEY,
            import.meta.env.VITE_AZURE_SPEECH_REGION,
        );
        cfg.speechSynthesisVoiceName = VOICES[locale];
        cfg.speechSynthesisOutputFormat =
            SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

        const synth = new SpeechSDK.SpeechSynthesizer(cfg, null);   // null = 我们自己播
        const visemes: { t: number; id: number }[] = [];
        synth.visemeReceived = (_s, e) => visemes.push({t: e.audioOffset / 10000, id: e.visemeId});

        const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">
      <voice name="${VOICES[locale]}">
        <prosody pitch="+22%" rate="+8%">${text.replace(/[<&]/g, "")}</prosody>
      </voice></speak>`;

        synth.speakSsmlAsync(ssml, async (r) => {
            synth.close();
            if (r.reason !== SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                setStatus("❌ " + r.errorDetails);
                return;
            }
            setVisemeCount(visemes.length);
            setStatus(`✅ Playing（${visemes.length} viseme）`);
            await playTrack(
                {
                    version: "1.0", locale, text, visemes,
                    audio: {buffer: r.audioData, durationMs: r.audioDuration / 10000}
                },
                rendererRef.current!,
            );
            setStatus("Done");
        }, (e) => {
            synth.close();
            setStatus("❌ " + e);
        });
    }

    return (
        <div style={{maxWidth: 480, margin: "40px auto", fontFamily: "system-ui"}}>
            <div style={{background: "#eaf6ff", borderRadius: 24, padding: 16}}>
                <div ref={hostRef} style={{width: "100%", aspectRatio: "1 / 1"}}/>
            </div>

            <textarea
                value={text} onChange={(e) => setText(e.target.value)} rows={3}
                style={{width: "100%", marginTop: 16, fontSize: 15, padding: 10}}
            />

            <div style={{display: "flex", gap: 10, marginTop: 10}}>
                <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
                    <option value="sv-SE">Swedish</option>
                    <option value="en-US">English</option>
                    <option value="zh-CN">Chinese</option>
                </select>
                <button onClick={speak} disabled={!ready} style={{flex: 1, fontSize: 16, padding: "8px 0"}}>
                    Speak
                </button>
            </div>

            <p style={{color: "#667", fontSize: 14}}>
                State：{status} | viseme：<b>{visemeCount}</b>
            </p>
        </div>
    )
}