import {useCallback, useEffect, useReducer, useRef, type RefObject} from "react";
import type {AvatarRenderer} from "../avatar/types.ts";
import type {SessionState, SessionEvent} from "./types.ts"
import type {UserAction} from "../api/interface.ts"
import {stopSpeaking, ensureAudio, playTrack} from "../avatar/playTrack.ts";
import {synthesizeSpeech} from "../speech/synthesize.ts";
import {requestAvatarReply} from "../api/backendClient.ts";

const INITIAL_STATE: SessionState = {
    stage: "idle",
    previewUrl: null,
    reply: null,
    errorMessage: null,
};

// A State Machine
function sessionStateTransition(state: SessionState, event: SessionEvent): SessionState {
    switch (event.type) {
        case "actionStarted":
            return {
                stage: "thinking",
                previewUrl: event.previewUrl ?? state.previewUrl,
                reply: null,
                errorMessage: null,
            };
        case "replyReceived":
            return {...state, stage: "synthesizing", reply: event.reply};
        case "speechStarted":
            return {...state, stage: "speaking"};
        case "speechFinished":
            return {...state, stage: "ready"};
        case "failed":
            return {...state, stage: "failed", errorMessage: event.message};
        case "reset":
            return INITIAL_STATE;
    }
}

export function useAvatarSession(renderer: RefObject<AvatarRenderer | null>) {
    const [state, dispatch] = useReducer(sessionStateTransition, INITIAL_STATE);
    const previewUrlRef = useRef<string | null>(null);

    // cleanup
    useEffect(() => {
        return () => {
            stopSpeaking();
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        };
    }, []);

    const runTurn = useCallback(async (action: UserAction) => {
        // Anything still playing belongs to the previous turn
        stopSpeaking();

        let previewUrl: string | undefined;
        if (action.kind === "image") {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
            previewUrl = URL.createObjectURL(action.file);
            previewUrlRef.current = previewUrl;
        }
        dispatch({type: "actionStarted", previewUrl});

        try {
            const reply = await requestAvatarReply(action);
            dispatch({type: "replyReceived", reply});

            const track = await synthesizeSpeech(reply.text, reply.language);
            dispatch({type: "speechStarted"});

            if (renderer.current) {
                await playTrack(track, renderer.current);
            }
            dispatch({type: "speechFinished"});
        } catch (error) {
            dispatch({type: "failed", message: error instanceof Error ? error.message : String(error)});
        }
    }, [renderer]);

    // User submit an image
    const submitImage = useCallback(async (file: File) => {
        await ensureAudio();
        void runTurn({kind: "image", file});
    }, [runTurn]);

    const reset = useCallback(() => {
        stopSpeaking();
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        dispatch({type: "reset"});
    }, []);

    const isBusy = state.stage === "thinking" || state.stage === "synthesizing" || state.stage === "speaking";

    return {...state, submitImage, reset, isBusy};
}