import type {AvatarReply} from "../api/interface.ts";

export type SessionStage =
    | "idle"          // nothing uploaded yet
    | "thinking"      // waiting for the backend to compose a reply
    | "synthesizing"  // reply is back; waiting for Azure to turn it into audio
    | "speaking"      // audio is playing and the beak is moving
    | "ready"         // finished speaking; follow-up choices are available
    | "failed";

export interface SessionState {
    stage: SessionStage;
    previewUrl: string | null;  //Object URL of the picture currently being discussed
    reply: AvatarReply | null;  //The most recent reply
    errorMessage: string | null;
}

export type SessionEvent =
    | { type: "actionStarted"; previewUrl?: string }
    | { type: "replyReceived"; reply: AvatarReply }
    | { type: "speechStarted" }
    | { type: "speechFinished" }
    | { type: "failed"; message: string }
    | { type: "reset" };