/**
 * The mock rabbit's paintbrush: turns a small scene plan into a PNG.
 *
 * Deliberately simple, children's-book shapes. This only exists so the relay
 * can be demoed before the real image model is wired in; it is not meant to be
 * good art, just clearly different from round to round.
 */

export type HueFamily = "warm" | "green" | "cool" | "purple" | "neutral";
export type Brightness = "dark" | "normal" | "bright";
export type Motif = "sun" | "moon" | "stars" | "clouds" | "flowers" | "rainbow" | "boat" | "balloons";

export const ALL_MOTIFS: Motif[] = ["sun", "moon", "stars", "clouds", "flowers", "rainbow", "boat", "balloons"];

export interface ScenePlan {
    hueFamily: HueFamily;
    brightness: Brightness;
    motifs: Motif[];
}

interface Palette {
    skyTop: string;
    skyBottom: string;
    ground: string;
    groundFar: string;
    accent: string;
}

const PALETTES: Record<HueFamily, Palette> = {
    warm: {skyTop: "#ff9d5c", skyBottom: "#ffe1a1", ground: "#e07a45", groundFar: "#f2a46a", accent: "#fff1c2"},
    green: {skyTop: "#8fd0ff", skyBottom: "#e2f6ff", ground: "#6cbf5f", groundFar: "#9fd98a", accent: "#fff7a8"},
    cool: {skyTop: "#4f9ef0", skyBottom: "#bde2ff", ground: "#3a78c9", groundFar: "#6fa4e0", accent: "#ffffff"},
    purple: {skyTop: "#9c7cea", skyBottom: "#f3c3e6", ground: "#7d5fc6", groundFar: "#a98ddf", accent: "#ffe0f3"},
    neutral: {skyTop: "#cfc8bd", skyBottom: "#f5f0e7", ground: "#b3aa9c", groundFar: "#cdc6ba", accent: "#ffffff"},
};

/** Night keeps the family's hue but sinks it towards deep blue. */
const NIGHT_INK = "#141a38";

const SIZE = 512;
const HORIZON_Y = 350;

export async function paintScene(plan: ScenePlan): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    const palette = paletteFor(plan);
    const isSeaScene = plan.motifs.includes("boat");
    const has = (motif: Motif) => plan.motifs.includes(motif);

    // Back to front: sky, things in the sky, the land or sea, things on it
    paintSky(ctx, palette);
    if (has("stars") || plan.brightness === "dark") paintStars(ctx, palette, has("stars") ? 16 : 6);
    if (has("sun")) paintSun(ctx);
    if (has("moon")) paintMoon(ctx);
    if (has("rainbow")) paintRainbow(ctx);
    if (has("clouds")) paintClouds(ctx, plan.brightness === "dark" ? 0.55 : 0.95);

    if (isSeaScene) paintSea(ctx, palette);
    else paintHills(ctx, palette);

    if (has("flowers")) paintFlowers(ctx, isSeaScene);
    if (has("boat")) paintBoat(ctx);
    if (has("balloons")) paintBalloons(ctx);

    paintPaperGrain(ctx);

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the drawing"))), "image/png");
    });
}

function paletteFor({hueFamily, brightness}: ScenePlan): Palette {
    const base = PALETTES[hueFamily];
    if (brightness === "normal") return base;

    const [towards, amount] = brightness === "dark" ? [NIGHT_INK, 0.62] : ["#ffffff", 0.25];
    return {
        skyTop: mixColours(base.skyTop, towards, amount),
        skyBottom: mixColours(base.skyBottom, towards, amount),
        ground: mixColours(base.ground, towards, amount * 0.8),
        groundFar: mixColours(base.groundFar, towards, amount * 0.8),
        accent: base.accent,
    };
}

// ── Scene pieces ───────────────────────────────────────────────────────────

function paintSky(ctx: CanvasRenderingContext2D, palette: Palette): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    gradient.addColorStop(0, palette.skyTop);
    gradient.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);
}

function paintSun(ctx: CanvasRenderingContext2D): void {
    const x = randomBetween(110, 400);
    const y = randomBetween(95, 150);

    const glow = ctx.createRadialGradient(x, y, 20, x, y, 120);
    glow.addColorStop(0, "rgba(255, 244, 190, 0.9)");
    glow.addColorStop(1, "rgba(255, 244, 190, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 120, y - 120, 240, 240);

    fillCircle(ctx, x, y, 46, "#ffd24a");
}

function paintMoon(ctx: CanvasRenderingContext2D): void {
    // Drawn on its own layer so the bite out of it is truly transparent
    const layer = document.createElement("canvas");
    layer.width = layer.height = 120;
    const moonCtx = layer.getContext("2d")!;
    fillCircle(moonCtx, 60, 60, 40, "#fff4c9");
    moonCtx.globalCompositeOperation = "destination-out";
    fillCircle(moonCtx, 80, 48, 36, "#000");

    ctx.drawImage(layer, randomBetween(60, 360), randomBetween(40, 110));
}

function paintStars(ctx: CanvasRenderingContext2D, palette: Palette, count: number): void {
    ctx.fillStyle = palette.accent;
    for (let index = 0; index < count; index++) {
        const x = randomBetween(20, SIZE - 20);
        const y = randomBetween(20, HORIZON_Y - 90);
        const radius = randomBetween(4, 9);

        // A four-pointed sparkle: two thin diamonds crossed
        ctx.beginPath();
        ctx.moveTo(x, y - radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.quadraticCurveTo(x, y, x, y + radius);
        ctx.quadraticCurveTo(x, y, x - radius, y);
        ctx.quadraticCurveTo(x, y, x, y - radius);
        ctx.fill();
    }
}

function paintRainbow(ctx: CanvasRenderingContext2D): void {
    const bands = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa"];
    const centerX = randomBetween(200, 312);

    ctx.lineWidth = 15;
    ctx.globalAlpha = 0.85;
    bands.forEach((colour, index) => {
        ctx.beginPath();
        ctx.arc(centerX, HORIZON_Y + 40, 250 - index * 15, Math.PI, Math.PI * 2);
        ctx.strokeStyle = colour;
        ctx.stroke();
    });
    ctx.globalAlpha = 1;
}

function paintClouds(ctx: CanvasRenderingContext2D, opacity: number): void {
    ctx.globalAlpha = opacity;
    for (let index = 0; index < 3; index++) {
        const x = randomBetween(60, SIZE - 60);
        const y = randomBetween(60, 220);
        const scale = randomBetween(0.7, 1.15);

        for (const [offsetX, offsetY, radius] of [[-34, 6, 24], [-8, -10, 32], [24, -2, 27], [46, 10, 18]]) {
            fillCircle(ctx, x + offsetX * scale, y + offsetY * scale, radius * scale, "#ffffff");
        }
    }
    ctx.globalAlpha = 1;
}

function paintHills(ctx: CanvasRenderingContext2D, palette: Palette): void {
    paintRidge(ctx, HORIZON_Y - 10, 34, palette.groundFar);
    paintRidge(ctx, HORIZON_Y + 45, 26, palette.ground);
}

function paintSea(ctx: CanvasRenderingContext2D, palette: Palette): void {
    // Tinted by the palette, but still recognisably water rather than a green field
    ctx.fillStyle = mixColours(palette.ground, "#3a78c9", 0.55);
    ctx.fillRect(0, HORIZON_Y, SIZE, SIZE - HORIZON_Y);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 4;
    for (let row = 0; row < 5; row++) {
        const y = HORIZON_Y + 22 + row * 30;
        ctx.beginPath();
        for (let x = -20; x <= SIZE + 20; x += 40) {
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + 10, y - 8, x + 20, y);
        }
        ctx.stroke();
    }
}

/** A band of rolling land whose top edge wobbles around `baseY`. */
function paintRidge(ctx: CanvasRenderingContext2D, baseY: number, wobble: number, colour: string): void {
    const phase = randomBetween(0, Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, SIZE);
    for (let x = 0; x <= SIZE; x += 16) {
        const y = baseY + Math.sin(x / 90 + phase) * wobble + Math.sin(x / 37 + phase * 2) * wobble * 0.25;
        ctx.lineTo(x, y);
    }
    ctx.lineTo(SIZE, SIZE);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
}

function paintFlowers(ctx: CanvasRenderingContext2D, isSeaScene: boolean): void {
    const petalColours = ["#ff8fab", "#ffffff", "#ffd43b", "#b197fc"];
    // Flowers in a sea scene float along the bottom edge like a shoreline
    const topY = isSeaScene ? SIZE - 50 : HORIZON_Y + 75;

    for (let index = 0; index < 9; index++) {
        const x = randomBetween(30, SIZE - 30);
        const y = randomBetween(topY, SIZE - 20);
        const petal = pickRandom(petalColours);

        for (let petalIndex = 0; petalIndex < 5; petalIndex++) {
            const angle = (petalIndex / 5) * Math.PI * 2;
            fillCircle(ctx, x + Math.cos(angle) * 9, y + Math.sin(angle) * 9, 7, petal);
        }
        fillCircle(ctx, x, y, 6, "#ffb703");
    }
}

function paintBoat(ctx: CanvasRenderingContext2D): void {
    const x = randomBetween(150, 360);
    const y = HORIZON_Y + 40;

    // Hull
    ctx.beginPath();
    ctx.moveTo(x - 62, y);
    ctx.lineTo(x + 62, y);
    ctx.lineTo(x + 42, y + 30);
    ctx.lineTo(x - 42, y + 30);
    ctx.closePath();
    ctx.fillStyle = "#b5653a";
    ctx.fill();

    // Mast and sail
    ctx.fillStyle = "#6b3f24";
    ctx.fillRect(x - 3, y - 110, 6, 110);
    ctx.beginPath();
    ctx.moveTo(x + 5, y - 104);
    ctx.lineTo(x + 70, y - 14);
    ctx.lineTo(x + 5, y - 14);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 86);
    ctx.lineTo(x - 50, y - 14);
    ctx.lineTo(x - 5, y - 14);
    ctx.closePath();
    ctx.fillStyle = "#ff6b6b";
    ctx.fill();
}

function paintBalloons(ctx: CanvasRenderingContext2D): void {
    const colours = ["#ff6b6b", "#ffd43b", "#4dabf7"];
    const anchorX = randomBetween(140, 370);

    colours.forEach((colour, index) => {
        const x = anchorX + (index - 1) * 42 + randomBetween(-8, 8);
        const y = randomBetween(110, 170) - (index === 1 ? 26 : 0);

        ctx.beginPath();
        ctx.moveTo(x, y + 36);
        ctx.quadraticCurveTo(x + 10, y + 90, anchorX, y + 150);
        ctx.strokeStyle = "rgba(60, 50, 40, 0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(x, y, 27, 34, 0, 0, Math.PI * 2);
        ctx.fillStyle = colour;
        ctx.fill();
        fillCircle(ctx, x - 9, y - 12, 6, "rgba(255, 255, 255, 0.5)");
    });
}

/** Faint specks over everything, so it reads as paint on paper rather than a vector graphic. */
function paintPaperGrain(ctx: CanvasRenderingContext2D): void {
    for (let index = 0; index < 1400; index++) {
        ctx.fillStyle = Math.random() < 0.5 ? "rgba(255, 255, 255, 0.07)" : "rgba(60, 40, 20, 0.05)";
        ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 2, 2);
    }
}

// ── Small helpers ──────────────────────────────────────────────────────────

function fillCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, colour: string): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
}

function randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

export function pickRandom<Item>(items: readonly Item[]): Item {
    return items[Math.floor(Math.random() * items.length)];
}

/** Linear blend of two #rrggbb colours; `amount` 0 keeps `from`, 1 gives `to`. */
function mixColours(from: string, to: string, amount: number): string {
    const parse = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
    const [fromChannels, toChannels] = [parse(from), parse(to)];
    const mixed = fromChannels.map((channel, index) => Math.round(channel + (toChannels[index] - channel) * amount));
    return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
