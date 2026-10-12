export interface Picture {
    id: number;             // React keys
    origin: "upload" | "rabbit";
    blob: Blob;
    url: string;            // useConversation revokes it once the picture is off-screen
    drawingNumber?: number; // For the rabbit's drawings
}

let lastPictureId = 0;

export function createPicture(blob: Blob, origin: Picture["origin"]): Picture {
    return {id: ++lastPictureId, origin, blob, url: URL.createObjectURL(blob)};
}