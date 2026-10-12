import type {Picture} from "../session/picture";
import type {ConversationStage} from "../session/useConversation";
import {UI_STRINGS} from "../strings";
import {pictureCaption} from "./pictureCaption";

interface EaselProps {
    stage: ConversationStage;
    picture: Picture | null; // The rabbit's latest drawing
    handedOver: boolean;
}

// The rabbit's easel
export function Easel({stage, picture, handedOver}: EaselProps) {
    const showsDrawing = picture !== null && !handedOver;

    let caption = UI_STRINGS.easelIdle;
    if (showsDrawing) caption = pictureCaption(picture);
    else if (stage === "drawing") caption = UI_STRINGS.easelDrawing;
    else if (stage === "speaking") caption = UI_STRINGS.easelListening;

    return (
        <figure className="easel" data-stage={stage}>
            <div className="easel__canvas">
                {picture && (
                    <img
                        key={picture.id}
                        className="easel__drawing"
                        data-handed-over={handedOver}
                        src={picture.url}
                        alt={showsDrawing ? caption : ""}
                    />
                )}
                {stage === "drawing" && <Scribble/>}
            </div>
            <figcaption className="easel__caption">{caption}</figcaption>
        </figure>
    );
}

/** Pencil lines that keep sketching themselves while the real drawing is on its way. */
function Scribble() {
    return (
        <svg className="easel__scribble" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M14 72 C 22 48, 34 50, 40 64 S 54 84, 62 58 S 76 28, 86 46"/>
            <path d="M20 34 C 30 24, 40 32, 48 24 S 64 16, 74 26"/>
            <path d="M26 88 C 44 84, 60 90, 78 85"/>
        </svg>
    );
}