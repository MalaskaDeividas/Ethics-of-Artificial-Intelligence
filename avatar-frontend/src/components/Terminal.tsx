import {useState} from "react";

interface TerminalProps {
    logs: string[];
    onSend: (message:string)=>void;
}

export default function Terminal({
    logs,
    onSend
}: TerminalProps){

    const [input,setInput] = useState("");

    function send(){
        if(!input.trim()) return;

        onSend(input);
        setInput("");
    }

    return (
        <div className="terminal">

            <div className="terminal-output">
                {logs.map((line,i)=>(
                    <div key={i}>{line}</div>
                ))}
            </div>

            <input
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{
                    if(e.key==="Enter") send();
                }}
                placeholder="Talk to Gemma..."
            />

        </div>
    )
}