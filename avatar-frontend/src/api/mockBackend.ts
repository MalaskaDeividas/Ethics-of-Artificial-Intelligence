import {BackendError} from "./interface.ts";
import {
    ALL_MOTIFS,
    paintScene,
    pickRandom,
    type Brightness,
    type HueFamily,
    type Motif,
    type ScenePlan,
} from "./mockPainter";
import {delay} from "../utils/helper.ts";

/** Simulated round trips, so the loading states are actually exercised. */
const DESCRIBE_LATENCY_MS = 1100;
/** Image models are slow; this keeps the rabbit's wait visible in demos. */
const DRAW_LATENCY_MS = 2600;

export async function describeWithMock(picture: Blob, signal: AbortSignal): Promise<string> {
    // Read the picture first, then wait, so the delay feels like the server
    // is thinking rather than like the file is slow to open
    const {hueFamily, brightness} = await readImageImpression(picture);
    await delay(DESCRIBE_LATENCY_MS, signal);

    return [
        pickRandom(COLOUR_LINES[hueFamily]),
        pickRandom(LIGHT_LINES[brightness]),
        WISH_LINES[pickRandom(ALL_MOTIFS)],
    ].join(" ");
}

export async function drawWithMock(description: string, signal: AbortSignal): Promise<Blob> {
    const drawing = await paintScene(planFromWords(description));
    await delay(DRAW_LATENCY_MS, signal);
    return drawing;
}

// ── The duck's eyes ────────────────────────────────────────────────────────

/** What the mock duck manages to notice about a picture. */
interface ImageImpression {
    hueFamily: HueFamily;
    brightness: Brightness;
}

/**
 * Downscale the picture to a tiny canvas and average its pixels.
 *
 * 32x32 is plenty: we only want the overall impression, and shrinking first
 * means we read ~1k pixels instead of several million.
 */
async function readImageImpression(picture: Blob): Promise<ImageImpression> {
    const objectUrl = URL.createObjectURL(picture);
    try {
        const image = await loadImage(objectUrl);

        const SAMPLE_SIZE = 32;
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;

        const ctx = canvas.getContext("2d", {willReadFrequently: true})!;
        ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const {data} = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

        let totalRed = 0;
        let totalGreen = 0;
        let totalBlue = 0;
        const pixelCount = data.length / 4;

        for (let offset = 0; offset < data.length; offset += 4) {
            totalRed += data[offset];
            totalGreen += data[offset + 1];
            totalBlue += data[offset + 2];
        }

        const {hue, saturation, lightness} = rgbToHsl(
            totalRed / pixelCount,
            totalGreen / pixelCount,
            totalBlue / pixelCount,
        );

        return {
            // A washed-out average has no meaningful hue, so do not pretend it does
            hueFamily: saturation < 0.16 ? "neutral" : classifyHue(hue),
            brightness: lightness < 0.34 ? "dark" : lightness > 0.72 ? "bright" : "normal",
        };
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new BackendError("IMAGE_DECODE_FAILED", "I could not open that picture."));
        image.src = url;
    });
}

function classifyHue(hue: number): HueFamily {
    if (hue < 45 || hue >= 330) return "warm";    // reds and pinks
    if (hue < 70) return "warm";                  // yellows and oranges
    if (hue < 165) return "green";
    if (hue < 255) return "cool";                 // cyan through blue
    return "purple";
}

/** Standard RGB (0-255) to HSL, with hue in degrees and the rest in 0-1. */
function rgbToHsl(red: number, green: number, blue: number) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const lightness = (max + min) / 2;

    if (delta === 0) return {hue: 0, saturation: 0, lightness};

    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    let hue: number;

    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);

    return {hue: (hue + 360) % 360, saturation, lightness};
}

// ── What the duck says ─────────────────────────────────────────────────────
// Whole sentences rather than slot-filled fragments: stitched fragments read
// like a robot. Two variants each, so consecutive rounds do not repeat.

const COLOUR_LINES: Record<HueFamily, string[]> = {
    warm: [
        "Ooh, such warm colours! It feels all cosy, like a sunset.",
        "So much orange and red! It looks warm enough to toast bread.",
    ],
    green: [
        "So much green! It looks like a meadow after the rain.",
        "Green everywhere, like a big quiet forest.",
    ],
    cool: [
        "All that blue! Is it the sky, or the sea?",
        "Cool blue colours, like a calm lake in the morning.",
    ],
    purple: [
        "Purple everywhere. It looks like a dream.",
        "Lovely purple and pink, like the sky just before bedtime.",
    ],
    neutral: [
        "Soft, quiet colours. It feels very peaceful.",
        "Gentle grey and cream, calm like a sleepy morning.",
    ],
};

const LIGHT_LINES: Record<Brightness, string[]> = {
    dark: [
        "It is a bit dark, like the middle of the night.",
        "Everything is dim and sleepy, as if the lights went out.",
    ],
    normal: [
        "The light is just right.",
        "Not too bright, and not too dark.",
    ],
    bright: [
        "And so bright! It must be a lovely day.",
        "It is so bright that I want to squint.",
    ],
};

/** Each wish names one thing the rabbit knows how to paint. */
const WISH_LINES: Record<Motif, string> = {
    sun: "I wish there was a big round sun in it.",
    moon: "Maybe a sleepy moon could hang up there.",
    stars: "It would look even better with some twinkly stars.",
    clouds: "A few fluffy clouds would make it perfect.",
    flowers: "I think it needs some little flowers.",
    rainbow: "What if a rainbow went right across it?",
    boat: "A little boat would be fun, sailing along.",
    balloons: "I would add some balloons, floating away!",
};

// ── What the rabbit hears ──────────────────────────────────────────────────

/** Checked in order, so "pink" wins over "sky" when both are in one sentence. */
const HUE_WORDS: [HueFamily, RegExp][] = [
    ["purple", /\b(purple|violet|lilac|pink|dream)/i],
    ["warm", /\b(warm|orange|red|sunset|cosy|golden|toast)/i],
    ["green", /\b(green|meadow|forest|grass)/i],
    ["cool", /\b(blue|sea|lake|ocean|cool)/i],
];

const MOTIF_WORDS: Record<Motif, RegExp> = {
    sun: /\bsun\b/i,
    moon: /\bmoon\b/i,
    stars: /\bstars?\b/i,
    clouds: /\bclouds?\b/i,
    flowers: /\bflowers?\b/i,
    rainbow: /\brainbow\b/i,
    boat: /\bboats?\b/i,
    balloons: /\bballoons?\b/i,
};

/** Where the rabbit wanders when it decides to use its own colours. */
const HUE_NEIGHBOURS: Record<HueFamily, HueFamily[]> = {
    warm: ["purple", "green"],
    green: ["warm", "cool"],
    cool: ["green", "purple"],
    purple: ["cool", "warm"],
    neutral: ["warm", "green", "cool", "purple"],
};

/**
 * Turn the duck's words into something to paint.
 *
 * The rabbit is an artist, not a photocopier: it follows what it heard most of
 * the time, but not always. Without these twists the relay would settle on
 * one colour and repeat the same picture forever.
 */
function planFromWords(description: string): ScenePlan {
    const heardHue = HUE_WORDS.find(([, pattern]) => pattern.test(description))?.[0] ?? "neutral";
    const heardBrightness: Brightness =
        /\b(dark|night|dim)/i.test(description) ? "dark"
            : /\b(bright|sunny)/i.test(description) ? "bright"
                : "normal";
    const heardMotifs = ALL_MOTIFS.filter((motif) => MOTIF_WORDS[motif].test(description));

    // 1. Sometimes its own colours
    const hueFamily = Math.random() < 0.4 ? pickRandom(HUE_NEIGHBOURS[heardHue]) : heardHue;

    // 2. Now and then, day turns to night or night to day
    const otherBrightness = (["dark", "normal", "bright"] as const).filter((level) => level !== heardBrightness);
    const brightness = Math.random() < 0.2 ? pickRandom(otherBrightness) : heardBrightness;

    // 3. Often one extra thing nobody asked for
    const motifs = Math.random() < 0.6
        ? [...new Set([...heardMotifs, pickRandom(ALL_MOTIFS)])]
        : heardMotifs;

    return {hueFamily, brightness, motifs};
}
