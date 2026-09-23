import type {VisemeTrack} from "../types/viseme";
import type {AvatarRenderer} from "./types";

let sharedAudioContext: AudioContext | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;

/**
 * Ensures an active AudioContext instance is available and running.
 * Must be invoked within a user gesture (e.g., click/touch event handler)
 * to comply with browser autoplay security policies.
 */
export async function ensureAudio(): Promise<AudioContext> {
    sharedAudioContext ??= new AudioContext();
    if (sharedAudioContext.state === "suspended") {
        await sharedAudioContext.resume();
    }
    return sharedAudioContext;
}

/**
 * Immediately stops the currently playing audio and cancels active speech playback.
 */
export function stopSpeaking(): void {
    try {
        activeSourceNode?.stop();
    } catch {
        // Node has already ended or stopped; safe to ignore
    }
    activeSourceNode = null;
}

export async function playTrack(track: VisemeTrack, renderer: AvatarRenderer): Promise<void> {
    const audioContext = await ensureAudio();
    stopSpeaking();

    // Clone the underlying ArrayBuffer slice because decodeAudioData detaches the buffer it consumes
    const audioBuffer = await audioContext.decodeAudioData(track.audio.buffer.slice(0));

    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);
    activeSourceNode = sourceNode;

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

    sourceNode.onended = () => {
        if (activeSourceNode === sourceNode) {
            renderer.setViseme(0, 1);
            renderer.setSpeaking(false);
            activeSourceNode = null;
        }
    };
}