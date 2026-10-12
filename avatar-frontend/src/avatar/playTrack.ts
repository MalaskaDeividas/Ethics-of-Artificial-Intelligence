import type {VisemeTrack} from "../types/viseme";
import type {DuckRenderer} from "./types";

let sharedAudioContext: AudioContext | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;

// Immediately stops the currently playing audio and cancels active speech playback.
export function stopSpeaking(): void {
    activeSourceNode?.stop();
    activeSourceNode = null;
}

export async function playTrack(track: VisemeTrack, renderer: DuckRenderer, signal?: AbortSignal): Promise<void> {
    sharedAudioContext ??= new AudioContext();
    const audioContext = sharedAudioContext;
    stopSpeaking();

    // Clone the underlying ArrayBuffer slice because decodeAudioData detaches the buffer it consumes
    const audioBuffer = await audioContext.decodeAudioData(track.audio.buffer.slice(0));

    // Stopped while decoding: do not start talking after the user said stop
    if (signal?.aborted) return;

    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);
    activeSourceNode = sourceNode;

    const stopOnAbort = () => sourceNode.stop();

    const finished = new Promise<void>((resolve) => {
        sourceNode.onended = () => {
            if (activeSourceNode === sourceNode) {
                renderer.setViseme(0, 1);
                renderer.setSpeaking(false);
                activeSourceNode = null;
            }
            // The signal lives for the whole conversation; do not let every
            // line leave a listener behind on it
            signal?.removeEventListener("abort", stopOnAbort);
            resolve();
        };
    });
    signal?.addEventListener("abort", stopOnAbort, {once: true});

    const playbackStartTime = audioContext.currentTime;
    sourceNode.start(playbackStartTime);
    renderer.setSpeaking(true);

    const totalDurationMs = audioBuffer.duration * 1000;
    let currentVisemeIndex = 0;
    let animationFrameId = 0;

    const syncVisemeFrame = () => {
        // Synchronize using AudioContext's hardware clock
        const elapsedTimeMs = (audioContext.currentTime - playbackStartTime) * 1000;

        // Catch up to the latest viseme frame corresponding to the current audio timestamp
        while (
            currentVisemeIndex + 1 < track.visemes.length &&
            track.visemes[currentVisemeIndex + 1].t <= elapsedTimeMs
            ) {
            currentVisemeIndex++;
        }
        renderer.setViseme(track.visemes[currentVisemeIndex].id, 1);

        if (elapsedTimeMs < totalDurationMs && activeSourceNode === sourceNode) {
            animationFrameId = requestAnimationFrame(syncVisemeFrame);
        } else {
            // Force reset to closed mouth at the end of track
            renderer.setViseme(0, 1);
            renderer.setSpeaking(false);
            cancelAnimationFrame(animationFrameId);
        }
    };
    animationFrameId = requestAnimationFrame(syncVisemeFrame);

    return finished;
}