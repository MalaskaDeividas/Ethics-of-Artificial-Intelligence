import {useDropzone} from "react-dropzone";
import {useAvatarRenderer} from "./avatar/useAvatarRenderer.ts";
import {Avatar2D} from "./avatar/Avatar2D.ts";
import {useAvatarSession} from "./session/useAvatarSession.ts";
import {AvatarStage} from "./components/AvatarStage.tsx";
import {useState} from "react";
import Terminal from "./components/Terminal.tsx";
import {sendChatMessage} from "./api/backendClient.ts";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function App() {

    // Terminal chat
    const [logs, setLogs] = useState<string[]>([]);
    // Cartoon Avatar
    const {hostRef, rendererRef, ready} = useAvatarRenderer(
        () => new Avatar2D()
    );

    const session = useAvatarSession(rendererRef);
    async function handleTerminalMessage(message: string) {

        setLogs(prev => [
            ...prev,
            "> You: " + message
        ]);

        try {
            const reply = await sendChatMessage(message);

            setLogs(prev => [
                ...prev,
                "> Quackie: " + reply.text
            ]);

        } catch (error) {

            setLogs(prev => [
                ...prev,
                "> Error: " + String(error)
            ]);
        }
    }


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
        <main
            className="card"
            data-dragging={isDragActive}
            {...getRootProps()}
        >

            <input {...getInputProps()} />

            <AvatarStage
                hostRef={hostRef}
                previewUrl={session.previewUrl}
            />

            <Terminal
                logs={logs}
                onSend={handleTerminalMessage}
            />

        </main>
    );
}

export default App;