import {useCallback, useEffect, useReducer, useRef, type RefObject} from "react";
import {playTrack, stopSpeaking} from "../avatar/playTrack";
import type {DuckRenderer, RabbitRenderer} from "../avatar/types";
import {createPicture, type Picture} from "./picture";
import {runConversation, type ConversationEvent} from "./runConversation";

export type ConversationStage =
    | "idle"       // no picture yet
    | "looking"    // the duck studies a picture: backend describing it, then speech synthesis
    | "speaking"   // the duck talks; the rabbit listens with its ears up
    | "drawing"    // the duck is done; waiting for the rabbit's drawing
    | "showing"    // the drawing is up next to its inspiration, before the duck takes it
    | "stopped"    // the user pressed stop
    | "failed";

const RUNNING_STAGES: ConversationStage[] = ["looking", "speaking", "drawing", "showing"];

/** size of the duck's pictures pile. */
const PILE_SIZE = 3;

interface ConversationState {
    stage: ConversationStage;
    duckPictures: Picture[];        //Pictures the duck has talked about, newest first. The first is the current one
    rabbitPicture: Picture | null;  // The rabbit's latest drawing
    line: string | null;            // The duck's latest line
    round: number;
    errorMessage: string | null;
}

type ConversationAction =
    | ConversationEvent
    | { type: "started"; picture: Picture }
    | { type: "stopped" }
    | { type: "failed"; message: string };

const INITIAL_STATE: ConversationState = {
    stage: "idle",
    duckPictures: [],
    rabbitPicture: null,
    line: null,
    round: 0,
    errorMessage: null,
};

function reduce(state: ConversationState, action: ConversationAction): ConversationState {
    switch (action.type) {
        case "started":
            return {...INITIAL_STATE, stage: "looking", duckPictures: [action.picture], round: 1};
        case "speaking":
            return {...state, stage: "speaking", line: action.line};
        case "drawing":
            return {...state, stage: "drawing"};
        case "drawingFinished":
            return {...state, stage: "showing", rabbitPicture: {...action.picture, drawingNumber: state.round}};
        case "handedOver":
            if (!state.rabbitPicture) return state;
            return {
                ...state,
                stage: "looking",
                duckPictures: [state.rabbitPicture, ...state.duckPictures].slice(0, PILE_SIZE),
                line: null,
                round: state.round + 1,
            };
        case "stopped":
            return {...state, stage: "stopped"};
        case "failed":
            return {...state, stage: "failed", errorMessage: action.message};
    }
}

export function useConversation(duck: RefObject<DuckRenderer | null>, rabbit: RefObject<RabbitRenderer | null>) {
    const [state, dispatch] = useReducer(reduce, INITIAL_STATE);

    /** Aborting this cancels every request, pause and line of speech in the running loop. */
    const controllerRef = useRef<AbortController | null>(null);

    // The rabbit simply mirrors the stage: ears up exactly while the duck talks
    useEffect(() => {
        rabbit.current?.setListening(state.stage === "speaking");
        rabbit.current?.setDrawing(state.stage === "drawing");
    }, [state.stage, rabbit]);

    useReleaseOffstagePictures(state.duckPictures, state.rabbitPicture);

    // Some clearing process
    useEffect(() => {
        return () => {
            if (controllerRef.current) {
                controllerRef.current.abort();
                controllerRef.current = null;
                dispatch({type: "stopped"});
            }
            stopSpeaking();
        };
    }, []);

    const start = useCallback(async (file: File) => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        const {signal} = controller;

        const firstPicture = createPicture(file, "upload");
        dispatch({type: "started", picture: firstPicture});

        try {
            await runConversation(firstPicture, {
                signal,
                speak: (track) => playTrack(track, duck.current!, signal),
                report: dispatch,
            });
        } catch (error) {
            // Stopping aborts whatever the loop was waiting on
            if (signal.aborted) return;

            // Cancel anything the loop had already set going, like a drawing in progress
            controller.abort();
            dispatch({type: "failed", message: (error as Error).message});
        }
    }, [duck]);

    const stop = useCallback(() => {
        controllerRef.current?.abort();
        controllerRef.current = null;
        dispatch({type: "stopped"});
    }, []);

    const isRunning = RUNNING_STAGES.includes(state.stage);

    return {...state, start, stop, isRunning};
}

/**
 * Revokes a picture's object URL once no part of the stage shows it any more.
 *
 * Right after a handover the same drawing is on the easel and on the pile, so
 * this compares ids across both rather than reacting to either slot alone.
 */
function useReleaseOffstagePictures(duckPictures: Picture[], rabbitPicture: Picture | null): void {
    const liveUrlsRef = useRef(new Map<number, string>());

    useEffect(() => {
        const onStage = rabbitPicture ? [...duckPictures, rabbitPicture] : duckPictures;
        const onStageIds = new Set(onStage.map((picture) => picture.id));

        for (const [id, url] of liveUrlsRef.current) {
            if (!onStageIds.has(id)) {
                URL.revokeObjectURL(url);
                liveUrlsRef.current.delete(id);
            }
        }
        for (const picture of onStage) {
            liveUrlsRef.current.set(picture.id, picture.url);
        }
    }, [duckPictures, rabbitPicture]);
}
