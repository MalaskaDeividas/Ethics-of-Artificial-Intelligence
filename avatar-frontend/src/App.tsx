import {useState} from 'react'
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

// API KEY
const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;

function App() {
    const [status, setStatus] = useState("待命");
    const [visemeCount, setVisemeCount] = useState(0);

    async function speak() {
        setStatus("合成中…");
        setVisemeCount(0);

        const cfg = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
        cfg.speechSynthesisVoiceName = "zh-CN-XiaoxiaoNeural";
        cfg.speechSynthesisOutputFormat =
            SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

        // null = 不让 SDK 自己播，我们要拿字节（原因见 frontend.md §7.4）
        const synth = new SpeechSDK.SpeechSynthesizer(cfg, null);

        const visemes: { t: number; id: number }[] = [];
        synth.visemeReceived = (_s, e) => {
            visemes.push({t: e.audioOffset / 10000, id: e.visemeId});
        };

        synth.speakTextAsync(
            "我是一只小鸭子，呱呱呱~",
            async (result) => {
                synth.close();
                if (result.reason !== SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                    setStatus("❌ " + result.errorDetails);
                    return;
                }

                console.log("viseme 时间轴：", visemes);   // ← 打开 DevTools 看这个
                setVisemeCount(visemes.length);

                // 用户点击触发的调用栈里创建/恢复 AudioContext，绕过自动播放限制
                const ctx = new AudioContext();
                if (ctx.state === "suspended") await ctx.resume();

                const buf = await ctx.decodeAudioData(result.audioData.slice(0));
                const src = ctx.createBufferSource();
                src.buffer = buf;
                src.connect(ctx.destination);
                src.start();

                setStatus(`✅ 播放中（${buf.duration.toFixed(2)} 秒）`);
            },
            (err) => {
                synth.close();
                setStatus("❌ " + err);
            },
        );
    }

    return (
        <div style={{padding: 24, fontFamily: "system-ui"}}>
            <button onClick={speak} style={{fontSize: 18, padding: "10px 20px"}}>
                🦆 让鸭子说话
            </button>
            <p>状态：{status}</p>
            <p>收到 viseme 关键帧：<b>{visemeCount}</b> 个</p>
        </div>
    );
}

export default App
