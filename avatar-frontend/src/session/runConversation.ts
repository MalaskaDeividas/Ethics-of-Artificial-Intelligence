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
 *
 * The drawing request goes out the moment the words exist, rather than after
 * the duck has finished saying them. Image generation is the slowest step in
 * the whole relay, and this way most of it happens while the duck is talking.
 */
async function prepareTurn(picture: Picture, signal: AbortSignal): Promise<PreparedTurn> {
    const line = await describePicture(picture.blob, signal);

    const drawing = drawPicture(line, signal);
    drawing.catch(() => {
    });

    const track = await synthesizeSpeech(line);
    return {line, track, drawing};
}

export async function runConversation(firstPicture: Picture, {
    signal,
    speak,
    report
}: ConversationHooks): Promise<void> {
    let nextTurn = prepareTurn(firstPicture, signal);

    for (; ;) {
        // 1. Looking: the backend describes the picture and the words are synthesized.
        //    From the second round on, most of this already happened while the
        //    previous drawing was on show, so it is usually just the minimum wait.
        const [{line, track, drawing}] = await Promise.all([nextTurn, delay(MIN_LOOKING_MS, signal)]);
        signal.throwIfAborted();

        // 2. Speaking: the duck talks and the rabbit listens, ears up
        report({type: "speaking", line});
        await speak(track);
        signal.throwIfAborted();

        // 3. Drawing: the duck is quiet, the rabbit's ears drop and it gets to work
        report({type: "drawing"});
        const [drawn] = await Promise.all([drawing, delay(MIN_DRAWING_MS, signal)]);
        signal.throwIfAborted();

        const newPicture = createPicture(drawn, "rabbit");
        report({type: "drawingFinished", picture: newPicture});

        // 4. Showing: the drawing sits next to the picture that inspired it,
        //    while the duck quietly starts studying it for the next round
        nextTurn = prepareTurn(newPicture, signal);
        nextTurn.catch(() => {
        });
        await delay(SHOWING_MS, signal);

        // 5. The duck takes the drawing, and round and round it goes
        report({type: "handedOver"});
    }
}
