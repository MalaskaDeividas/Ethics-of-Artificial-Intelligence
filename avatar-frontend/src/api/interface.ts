/** Body of a successful POST /api/describe. */
export interface DescribeResponse {
    text: string;
}

/** Body of a successful POST /api/draw. */
export interface DrawRequest {
    /** Exactly what the duck just said. */
    text: string;
}

export class BackendError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = "BackendError";
        this.code = code;
    }
}
