/**
 * Interface copy, kept apart from the duck's own dialogue.
 *
 * What the duck says comes from the backend; what the buttons and hints say is
 * ours. Mixing the two in one place made it easy to forget which was which.
 * The app is English-only, so this is one flat object rather than a table per
 * language.
 */
export const UI_STRINGS = {
    title: "Duck & Rabbit",
    tagline: "a picture relay",
    round: (round: number) => `Round ${round}`,

    hintIdle: "Drop a picture here, or choose one below. The duck will describe it, and the rabbit will draw what it hears.",
    hintDragging: "Let go, and the duck will take a look!",
    statusLooking: "The duck is taking a good look…",
    statusStopped: "Stopped. Choose another picture to start again.",

    choosePicture: "Choose a picture",
    anotherPicture: "Another picture",
    stop: "Stop",

    pilePlaceholder: "Your picture goes here",
    easelIdle: "The rabbit's canvas",
    easelListening: "Listening…",
    easelDrawing: "Drawing…",
    yourPicture: "Your picture",
    drawingCaption: (drawingNumber: number) => `Drawing #${drawingNumber}`,

    rejectedNotImage: "I cannot read that one. Could you give me a picture?",
    rejectedTooLarge: "That picture is too big for me. A smaller one?",
};
