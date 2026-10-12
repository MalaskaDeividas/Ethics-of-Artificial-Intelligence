interface SubtitleBarProps {
    text: string;
    /** Drives the colour of the dot and the text. */
    tone: "speech" | "hint" | "error";
    /** Makes the leading dot pulse while a turn is in progress. */
    busy: boolean;
}

export function SubtitleBar({text, tone, busy}: SubtitleBarProps) {
    return (
        <div className="subtitle" data-tone={tone} data-busy={busy} aria-live="polite">
            <span className="subtitle__dot" aria-hidden="true"/>
            <p className="subtitle__text" key={text}>{text}</p>
        </div>
    );
}