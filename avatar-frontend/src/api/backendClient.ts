import {type AvatarReply, BackendError, type UserAction} from "./interface.ts";
import {askMockBackend} from "./mockBackend.ts";

const endpoint = import.meta.env.VITE_BACKEND_ENDPOINT
const mock = import.meta.env.VITE_USE_MOCK_BACKEND === "true";

export async function requestAvatarReply(action: UserAction): Promise<AvatarReply> {
    if (mock) {
        return askMockBackend("sv-SE");
    }

    const body = new FormData();
    body.append("kind", action.kind);
    if (action.kind === "image") {
        body.append("image", action.file);
    }

    const response = await fetch(endpoint, {method: "POST", body});

    if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw new BackendError(
            failure?.error ?? `HTTP_${response.status}`,
            failure?.message ?? response.statusText,
        );
    }

    return await response.json() as Promise<AvatarReply>;
}

export async function sendChatMessage(message: string) {
    const response = await fetch(
        `${endpoint}/api/chat`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message,
            }),
        }
    );

    if (!response.ok) {
        throw new Error("Chat failed");
    }

    return await response.json() as {
        text: string;
    };
}