import {describePicture, drawPicture} from "../api/backendClient";
import {synthesizeSpeech} from "../speech/synthesizeSpeech";
import type {VisemeTrack} from "../types/viseme";
import {delay} from "../utils/helper";
import {createPicture, type Picture} from "./picture";

/** Minimum time the duck studies a picture before talking, so the handover lands first. */
const MIN_LOOKING_MS = 1000;
/** However fast the drawing comes back, the rabbit visibly draws for at least this long. */
const MIN_DRAWING_MS = 1800;
/** How long a finished drawing stays on the easel, next to the picture that inspired it. */
const SHOWING_MS = 3000;

/** What the loop tells the UI. The stage names in useConversation follow these one to one. */
export type ConversationEvent =
    | { type: "speaking"; line: string }
    | { type: "drawing" }
    | { type: "drawingFinished"; picture: Picture }
    | { type: "handedOver" };

export interface ConversationHooks {
    signal: AbortSignal;
    speak(track: VisemeTrack): Promise<void>;
    report(event: ConversationEvent): void;
}

/** Everything the duck needs before it can open its beak about a picture. */
interface PreparedTurn {
    line: string;
    track: VisemeTrack;
    drawing: Promise<Blob>; // The rabbit's drawing of `line`, already in progress.
}

/**
 * Ask the backend what the picture looks like, then get the words ready to say.
 * The drawing request fires immediately so the rabbit paints while the duck
 * speaks and continues working until generation completes.
 */
async function prepareTurn(picture: Picture, signal: AbortSignal): Promise<PreparedTurn> {
    const line = await describePicture(picture.blob, signal);

    // Rabbit begins painting immediately in the background
    const drawing = drawPicture(line, signal);
    drawing.catch((err) => {
        console.error("[Rabbit Draw Error]:", err);
    });

    let track: VisemeTrack = {
        text: line,
        visemes: [],
        audio: {buffer: new ArrayBuffer(0), durationMs: 2500},
    };

    try {
        track = await synthesizeSpeech(line);
    } catch (err) {
        console.warn("Speech synthesis skipped or failed, using fallback:", err);
    }

    return {line, track, drawing};
}

export async function runConversation(
    firstPicture: Picture,
    {signal, speak, report}: ConversationHooks,
): Promise<void> {
    let nextTurn = prepareTurn(firstPicture, signal);

    for (;;) {
        // 1. Looking: backend describes picture and duck gets ready
        const [{line, track, drawing}] = await Promise.all([
            nextTurn,
            delay(MIN_LOOKING_MS, signal),
        ]);
        signal.throwIfAborted();

        // 2. Speaking: duck talks, rabbit listens with ears perked
        report({type: "speaking", line});
        try {
            await speak(track);
        } catch (e) {
            console.warn("Audio playback failed, proceeding:", e);
            await delay(1500, signal);
        }
        signal.throwIfAborted();

        // 3. Drawing: duck goes quiet, rabbit stays drawing until the image finishes
        report({type: "drawing"});
        const [drawn] = await Promise.all([drawing, delay(MIN_DRAWING_MS, signal)]);
        signal.throwIfAborted();

        const newPicture = createPicture(drawn, "rabbit");
        report({type: "drawingFinished", picture: newPicture});

        // 4. Showing: display the finished drawing on the easel
        nextTurn = prepareTurn(newPicture, signal);
        nextTurn.catch(() => {});
        await delay(SHOWING_MS, signal);

        // 5. Handover: duck takes the rabbit's drawing as the input for the next round
        report({type: "handedOver"});
    }
}