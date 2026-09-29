import {useState} from "react";
import {ErrorCode, useDropzone, type FileRejection} from "react-dropzone";
import {Duck2D} from "./avatar/renderer/Duck2D";
import {Rabbit2D} from "./avatar/renderer/Rabbit2D";
import {useAvatarRenderer} from "./avatar/useAvatarRenderer";
import {useConversation} from "./session/useConversation";
import {Stage} from "./components/Stage";
import {SubtitleBar} from "./components/SubtitleBar";
import {UI_STRINGS} from "./strings";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function App() {
    const duck = useAvatarRenderer(() => new Duck2D());
    const rabbit = useAvatarRenderer(() => new Rabbit2D());
    const conversation = useConversation(duck.rendererRef, rabbit.rendererRef);
    const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

    const ready = duck.ready && rabbit.ready;

    const {getRootProps, getInputProps, isDragActive, open} = useDropzone({
        accept: {"image/*": []},
        maxSize: MAX_IMAGE_BYTES,
        multiple: false,
        noClick: true,
        noKeyboard: true,
        disabled: !ready || conversation.isRunning,
        onDropAccepted: ([file]) => {
            setRejectionMessage(null);
            void conversation.start(file);
        },
        onDropRejected: ([rejection]: FileRejection[]) => {
            const tooLarge =
                rejection.errors.some((error) => error.code === ErrorCode.FileTooLarge);
            setRejectionMessage(tooLarge ? UI_STRINGS.rejectedTooLarge : UI_STRINGS.rejectedNotImage);
        },
    });

    function describeCurrentState(): { text: string; tone: "speech" | "hint" | "error" } {
        if (isDragActive) return {text: UI_STRINGS.hintDragging, tone: "hint"};
        if (rejectionMessage) return {text: rejectionMessage, tone: "error"};

        switch (conversation.stage) {
            case "idle":
                return {text: UI_STRINGS.hintIdle, tone: "hint"};
            case "looking":
                return {text: UI_STRINGS.statusLooking, tone: "hint"};
            case "speaking":
            case "drawing":
            case "showing":
                return {text: conversation.line!, tone: "speech"};
            case "stopped":
                return {text: UI_STRINGS.statusStopped, tone: "hint"};
            case "failed":
                return {text: conversation.errorMessage!, tone: "error"};
        }
    }

    const {text: subtitleText, tone} = describeCurrentState();
    const isWaiting = conversation.stage === "looking" || conversation.stage === "drawing";

    return (
        <main className="card" data-dragging={isDragActive} {...getRootProps()}>
            <input {...getInputProps()} />

            <header className="card__header">
                <h1 className="card__title">
                    {UI_STRINGS.tagline}
                </h1>

                {conversation.round > 0 && (
                    <span className="card__round">{UI_STRINGS.round(conversation.round)}</span>
                )}
            </header>

            <Stage
                duckContainerRef={duck.containerRef}
                rabbitContainerRef={rabbit.containerRef}
                stage={conversation.stage}
                duckPictures={conversation.duckPictures}
                rabbitPicture={conversation.rabbitPicture}
            />

            <SubtitleBar text={subtitleText} tone={tone} busy={isWaiting}/>

            <div className="actions">
                {conversation.isRunning ? (
                    <button type="button" className="actions__stop" onClick={conversation.stop}>
                        {UI_STRINGS.stop}
                    </button>
                ) : (
                    <button type="button" className="actions__primary" disabled={!ready} onClick={open}>
                        {conversation.duckPictures.length > 0 ? UI_STRINGS.anotherPicture : UI_STRINGS.choosePicture}
                    </button>
                )}
            </div>
        </main>
    );
}