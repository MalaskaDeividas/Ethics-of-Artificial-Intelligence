import type {RefObject} from "react";

interface AvatarStageProps {
    /** Attached to the element the renderer mounts its canvas into. */
    hostRef: RefObject<HTMLDivElement | null>;
    /** Object URL of the picture being discussed, or null before the first upload. */
    previewUrl: string | null;
}

/**
 * The duck's stage, plus the uploaded picture tucked into the corner.
 */
export function AvatarStage({hostRef, previewUrl}: AvatarStageProps) {
    return (
        <div className="stage">
            <div ref={hostRef} className="stage__canvas"/>

            {previewUrl && (
                <div className="snapshot">
                    <img src={previewUrl} alt="The picture you uploaded"/>
                </div>
            )}
        </div>
    );
}
