import {useDropzone} from "react-dropzone"
import {useAvatarRenderer} from "./avatar/useAvatarRenderer.ts";
import {Avatar2D} from "./avatar/Avatar2D.ts";
import {useAvatarSession} from "./session/useAvatarSession.ts";
import {AvatarStage} from "./components/AvatarStage.tsx";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function App() {
    // Cartoon Avatar
    const {hostRef, rendererRef, ready} = useAvatarRenderer(() => new Avatar2D());
    const session = useAvatarSession(rendererRef);

    // Drop Zone
    const {getRootProps, getInputProps, isDragActive} = useDropzone({
        accept: {"image/*": []},
        maxSize: MAX_IMAGE_BYTES,
        multiple: false,
        noClick: true,
        noKeyboard: true,
        disabled: !ready || session.isBusy,
        onDropAccepted: ([file]) => {
            void session.submitImage(file);
        },
    });

    return (
        <main className="card" data-dragging={isDragActive} {...getRootProps()}>
            <input {...getInputProps()} />

            <AvatarStage hostRef={hostRef} previewUrl={session.previewUrl}/>
        </main>
    )
}

export default App
