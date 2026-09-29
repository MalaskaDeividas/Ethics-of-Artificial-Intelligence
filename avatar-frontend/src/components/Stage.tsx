import type {RefObject} from "react";
import type {Picture} from "../session/picture";
import type {ConversationStage} from "../session/useConversation";
import {Easel} from "./Easel";
import {PhotoPile} from "./PhotoPile";

interface StageProps {
    /** Attached to the elements the two renderers mount their canvases into. */
    duckContainerRef: RefObject<HTMLDivElement | null>;
    rabbitContainerRef: RefObject<HTMLDivElement | null>;
    stage: ConversationStage;
    duckPictures: Picture[];
    rabbitPicture: Picture | null;
}

/**
 * The duck on the left, the rabbit on the right, and between them the two
 * pictures that matter: what the duck is talking about, and what the rabbit
 * drew from it.
 */
export function Stage({duckContainerRef, rabbitContainerRef, stage, duckPictures, rabbitPicture}: StageProps) {
    const handedOver = rabbitPicture !== null && rabbitPicture.id === duckPictures[0].id;

    return (
        <div className="stage" data-stage={stage}>
            <div ref={duckContainerRef} className="stage__actor stage__actor--duck" aria-hidden="true"/>
            <PhotoPile pictures={duckPictures}/>
            <Easel stage={stage} picture={rabbitPicture} handedOver={handedOver}/>
            <div ref={rabbitContainerRef} className="stage__actor stage__actor--rabbit" aria-hidden="true"/>
        </div>
    );
}