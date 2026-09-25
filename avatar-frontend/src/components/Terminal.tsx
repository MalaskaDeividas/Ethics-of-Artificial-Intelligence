import {useState} from "react";

interface TerminalProps {
    logs: string[];
    onSend: (message: string) => void;
}

export default function Terminal({
    logs,
    onSend
}: TerminalProps) {

    const [input, setInput] = useState("");

    function submit() {
        if (!input.trim()) return;

        onSend(input);
        setInput("");
    }

    return (
        <div className="terminal">

            <div className="terminal-title">
                <span>QUACK TERMINAL</span>
                <span className="terminal-status">
                    ONLINE
                </span>
            </div>


            <div className="terminal-body">

                {logs.map((log, index) => (
                    <div 
                        key={index}
                        className="terminal-line"
                    >
                        {log}
                    </div>
                ))}

            </div>


            <div className="terminal-input">

                <span>&gt;</span>

                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            submit();
                        }
                    }}
                    placeholder="Talk to Quackie..."
                />

            </div>

        </div>
    );
}