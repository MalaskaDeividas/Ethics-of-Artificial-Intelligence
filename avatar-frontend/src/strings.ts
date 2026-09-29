export const UI_STRINGS = {
    tagline: "A picture relay",
    round: (round: number) => `Round ${round}`,

    hintIdle: "Drop a picture here, or choose one below.",
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
